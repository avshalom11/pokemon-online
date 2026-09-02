"use client";

import { useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";

import { PROFILE_ALIGNMENT_IDS, PROFILE_COLOR_OPTIONS } from "@/features/profile/themes/profile-content-styles";
import { createRichProfileEditorExtensions } from "../config/rich-editor-config";
import {
  RICH_TEXT_EFFECT_OPTIONS,
  RICH_TEXT_FONT_FAMILY_OPTIONS,
  RICH_TEXT_FONT_SIZE_IDS,
} from "../config/rich-text-style-options";
import { isSafeHttpUrl, MAX_RICH_CONTENT_TEXT_CHARACTERS } from "../validation/rich-profile-content.schema";
import type { ProfileAlignment, ProfileColorId } from "@/features/profile/types/profile-content.types";
import type { RichTextEffectId, RichTextFontFamilyId, RichTextFontSizeId } from "../config/rich-text-style-options";
import type { RichProfileContentDoc } from "../types/rich-profile-content.types";

interface RichProfileEditorProps {
  initialContent: RichProfileContentDoc | null;
  onChange: (doc: RichProfileContentDoc) => void;
}

const ALIGNMENT_LABELS: Record<ProfileAlignment, string> = { right: "ימין", center: "מרכז", left: "שמאל" };
// A word-like default: shown in the size control whenever the cursor isn't
// inside an explicitly-sized run — purely a DISPLAY default (never applies
// a mark on its own), so "click and type immediately" never requires
// touching this control first.
const DEFAULT_DISPLAYED_SIZE: RichTextFontSizeId = "16";

// A small curated set — plain Unicode characters, never a picker library
// dependency. Inserted as ordinary text content (the SAME leaf `text` node
// type every other typed character produces), so this needs no dedicated
// node/mark type of its own in rich-profile-content.schema.ts.
const EMOJI_OPTIONS = [
  "😀", "😂", "😍", "😎", "🤔", "😢", "😡", "👍", "👎", "👏",
  "🙌", "🔥", "⭐", "💯", "❤️", "🎉", "🏆", "⚡", "🎮", "🐉",
];

// RICH PROFILE EDITOR (PHASE B, STABILIZATION) — the WYSIWYG editing
// canvas + toolbar mounted inside EditProfileModal.tsx, ADDITIONAL to
// (never replacing) ProfileContentEditor's own form-based block editor
// during this DEV transition — see EditProfileModal.tsx's own doc comment.
// Deliberately uncontrolled in the React sense: `initialContent` seeds the
// editor once at mount (Tiptap owns its own internal state after that,
// same as every other Tiptap-in-React integration — re-feeding `content`
// into the editor on every parent re-render would fight the user's own
// cursor position), and every edit calls `onChange(editor.getJSON())` so
// the parent always holds the latest snapshot for its own Save button to
// send, exactly the same "controlled at the save boundary, not on every
// keystroke render" contract ProfileContentEditor's blocks/onChange pair
// already establishes.
//
// LIVE TOOLBAR STATE (STABILIZATION FIX — root-caused live across several
// iterations, not guessed):
//   1. A plain onSelectionUpdate/onTransaction + force-render counter, with
//      isActive()/getAttributes() called inline during render, looked
//      broken on a plain cursor move — actually masked by a SEPARATE bug
//      (the extensions array being recreated every render, tearing down
//      and rebuilding the whole Editor instance — now fixed via the
//      memoized `extensions` below).
//   2. Switched to useEditorState (Tiptap v3's own purpose-built hook for
//      this). Its EditorStateManager.getSnapshot() only refreshes its
//      cached snapshot once the editor's FIRST transaction/update event
//      fires, so a freshly-mounted editor stayed blank indefinitely.
//   3. Fixing the selector to read the outer `editor` closure (not the
//      snapshot's own field) resolved the blank-forever issue, but a plain
//      cursor click STILL didn't visibly update the toolbar — verified
//      directly against the DOM (button className, not just a screenshot):
//      Tiptap fires the transaction and editor.isActive() reads the
//      correct fresh value, but useSyncExternalStoreWithSelector (which
//      useEditorState is built on) skips recomputing its selector whenever
//      its own getSnapshot() still returns the SAME cached object
//      reference — which happens whenever THAT internal subscription's own
//      transactionNumber bookkeeping doesn't advance for a given
//      transaction, independent of whether the surrounding component
//      re-renders for some other reason. Typed edits/toolbar-driven mark
//      toggles only ever looked correct because those also fire onUpdate,
//      which calls onChange -> the parent's own setState -> an ordinary
//      prop-driven re-render that happens to recompute everything fresh
//      anyway, masking the underlying staleness.
// Final fix: no useEditorState at all. `editor` itself (from useEditor) is
// a stable, reliably-updating reference; calling isActive()/getAttributes()
// on it directly in the render body (below, after the early-return) always
// reflects the true current ProseMirror state at render time — the only
// remaining piece needed is a GUARANTEED trigger to make React actually
// re-render on every transaction, which is exactly what the plain
// onSelectionUpdate/onTransaction handlers below do (independently
// verified via raw debug logging to fire reliably on every click/keystroke,
// unlike useEditorState's own internal subscription). Verified correct via
// keyboard-driven selection (Home/End/Shift+Home + Ctrl+B) and via
// double-click word selection + toolbar actions — both update the toolbar
// live and correctly, confirming this mechanism itself is sound.
//
// KNOWN OPEN ISSUE (not caused by the above, confirmed by disabling these
// exact handlers and reproducing the identical symptom) — a single click
// that only repositions an already-collapsed cursor into existing text
// intermittently redirects DOM focus to the toolbar's first <select>
// immediately after (observed via instrumented focus/blur listeners:
// FOCUS:ProseMirror -> BLUR:ProseMirror -> FOCUS:select, all within the
// same click). Double-click text selection and keyboard navigation do not
// exhibit this. Needs live human-mouse verification in a real browser
// (outside this automation tooling) to confirm whether it reproduces
// there too before treating it as a shippable bug.
export function RichProfileEditor({ initialContent, onChange }: RichProfileEditorProps) {
  const [, setForceUpdateTick] = useState(0);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);

  // STABILIZATION FIX — extensions must be a STABLE array reference, not a
  // fresh one from calling createRichProfileEditorExtensions() inline on
  // every render: useEditor treats a changed `extensions` reference as "the
  // config changed" and tears down/recreates the whole Editor instance,
  // which starved useEditorState's own subscription effect below (verified
  // live: the editor never settled into a stable, renderable state — the
  // toolbar/canvas area stayed blank indefinitely). useMemo(..., []) builds
  // the extension list exactly once per mount, matching this editor's own
  // "seed once at mount" contract for `content` (see this component's own
  // top doc comment).
  const extensions = useMemo(() => createRichProfileEditorExtensions(), []);

  const editor = useEditor(
    {
      // NEXT.JS SSR — Tiptap's own documented requirement for App Router:
      // without this, the editor tries to render during SSR and produces a
      // hydration mismatch the moment the client takes over.
      immediatelyRender: false,
      extensions,
      content: initialContent ?? { type: "doc", content: [] },
      editorProps: {
        attributes: {
          dir: "rtl",
          class:
            "min-h-[160px] max-h-[320px] overflow-y-auto rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_a]:text-indigo-300 [&_a]:underline",
        },
      },
      onUpdate: ({ editor }) => onChange(editor.getJSON() as RichProfileContentDoc),
      onSelectionUpdate: () => setForceUpdateTick((tick) => tick + 1),
      onTransaction: () => setForceUpdateTick((tick) => tick + 1),
    },
    // Explicit empty deps — this editor instance is created once and never
    // recreated for the lifetime of this component (same reasoning as the
    // memoized `extensions` above).
    []
  );

  if (!editor) return null;

  // No useEditorState, no cached selector snapshot — every value below is
  // read directly off the live `editor` instance, fresh on every render
  // (see this component's own top doc comment for why). The
  // onSelectionUpdate/onTransaction handlers above are what make React
  // actually re-run this render on every cursor move/edit; once it does,
  // these calls always reflect the true current state.
  const totalTextLength = editor.getText().length;
  const activeTextStyle = editor.getAttributes("textStyle") as {
    colorId?: ProfileColorId | null;
    fontId?: RichTextFontFamilyId | null;
    sizeId?: RichTextFontSizeId | null;
    effectId?: RichTextEffectId | null;
  };
  const activeHeading = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";
  const state = {
    isBold: editor.isActive("bold"),
    isItalic: editor.isActive("italic"),
    isUnderline: editor.isActive("underline"),
    isBulletList: editor.isActive("bulletList"),
    isOrderedList: editor.isActive("orderedList"),
    isLink: editor.isActive("link"),
    alignment: PROFILE_ALIGNMENT_IDS.find((id) => editor.isActive({ textAlign: id })),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };

  function setColor(colorId: ProfileColorId) {
    editor?.chain().focus().setMark("textStyle", { colorId }).run();
  }

  function unsetColor() {
    editor?.chain().focus().setMark("textStyle", { colorId: null }).run();
  }

  function setFont(fontId: RichTextFontFamilyId) {
    editor?.chain().focus().setMark("textStyle", { fontId }).run();
  }

  function setSize(sizeId: RichTextFontSizeId) {
    editor?.chain().focus().setMark("textStyle", { sizeId }).run();
  }

  function setEffect(effectId: RichTextEffectId) {
    editor?.chain().focus().setMark("textStyle", { effectId: effectId === "normal" ? null : effectId }).run();
    setEmojiPopoverOpen(false);
  }

  function applyLink() {
    const href = linkUrlDraft.trim();
    if (!href || !isSafeHttpUrl(href)) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkUrlDraft("");
    setLinkPopoverOpen(false);
  }

  function removeLink() {
    editor?.chain().focus().unsetLink().run();
    setLinkPopoverOpen(false);
  }

  function insertEmoji(emoji: string) {
    editor?.chain().focus().insertContent(emoji).run();
    setEmojiPopoverOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div dir="rtl" className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/60 p-2">
        {/* HEADINGS / PARAGRAPH — value IS the live block type under the
            cursor (forceUpdateTick above is what keeps this correct as the
            cursor moves, not just when typing). */}
        <ToolbarSelect
          value={activeHeading}
          onChange={(value) => {
            if (value === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
          }}
          options={[
            { value: "p", label: "טקסט רגיל" },
            { value: "h1", label: "כותרת 1" },
            { value: "h2", label: "כותרת 2" },
            { value: "h3", label: "כותרת 3" },
          ]}
        />

        {/* FONT FAMILY — value reflects the cursor's own current fontId
            (or the placeholder when unset — an unset font is a completely
            valid, normal state, never a requirement to fill in). */}
        <ToolbarSelect
          value={activeTextStyle.fontId ?? ""}
          placeholder="גופן"
          onChange={(value) => setFont(value as RichTextFontFamilyId)}
          options={RICH_TEXT_FONT_FAMILY_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
        />

        {/* FONT SIZE (Word-like numeric) — always shows a real number:
            the cursor's own explicit sizeId, or DEFAULT_DISPLAYED_SIZE as
            a pure display fallback (never itself applies a mark). */}
        <ToolbarSelect
          value={activeTextStyle.sizeId ?? DEFAULT_DISPLAYED_SIZE}
          onChange={(value) => setSize(value as RichTextFontSizeId)}
          options={RICH_TEXT_FONT_SIZE_IDS.map((id) => ({ value: id, label: id }))}
        />

        <ToolbarDivider />

        <ToolbarButton label="B" title="מודגש" active={state.isBold} onClick={() => editor.chain().focus().toggleBold().run()} bold />
        <ToolbarButton label="I" title="נטוי" active={state.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} italic />
        <ToolbarButton label="U" title="קו תחתון" active={state.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} underline />

        <ToolbarDivider />

        {/* COLOR PICKER — the active swatch gets a visible ring; "ללא"
            (none) is its own explicit option and is itself the active one
            whenever no colorId is set — the normal, default, no-choice-
            required state, matching every other optional control here. */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="ללא (ברירת מחדל)"
            // STABILIZATION FIX — see ToolbarButton's own onMouseDown
            // comment below; this swatch row needs the identical fix for
            // the identical reason.
            onMouseDown={(event) => event.preventDefault()}
            onClick={unsetColor}
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 bg-transparent text-[8px] text-slate-400 ${
              !activeTextStyle.colorId ? "border-indigo-400" : "border-white/20"
            }`}
          >
            ✕
          </button>
          {PROFILE_COLOR_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setColor(option.id)}
              className={`h-5 w-5 rounded-full border-2 ${option.swatchClassName} ${
                activeTextStyle.colorId === option.id ? "border-indigo-400" : "border-transparent hover:border-white/60"
              }`}
            />
          ))}
        </div>

        <ToolbarDivider />

        {/* SPECIAL TEXT STYLES */}
        <ToolbarSelect
          value={activeTextStyle.effectId ?? "normal"}
          onChange={(value) => setEffect(value as RichTextEffectId)}
          options={RICH_TEXT_EFFECT_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
        />

        <ToolbarDivider />

        {PROFILE_ALIGNMENT_IDS.map((id) => (
          <ToolbarButton
            key={id}
            label={ALIGNMENT_ICON[id]}
            title={ALIGNMENT_LABELS[id]}
            active={state.alignment === id}
            onClick={() => editor.chain().focus().setTextAlign(id).run()}
          />
        ))}

        <ToolbarDivider />

        <ToolbarButton label="•" title="רשימה" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton label="1." title="רשימה ממוספרת" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />

        <ToolbarDivider />

        <div className="relative">
          <ToolbarButton label="🔗" title="קישור" active={state.isLink} onClick={() => setLinkPopoverOpen((value) => !value)} />
          {linkPopoverOpen ? (
            <div className="absolute top-full z-10 mt-1 flex w-56 flex-col gap-1.5 rounded-lg border border-white/10 bg-slate-900 p-2 shadow-xl">
              <input
                type="text"
                dir="ltr"
                value={linkUrlDraft}
                onChange={(event) => setLinkUrlDraft(event.target.value)}
                placeholder="https://..."
                className="w-full rounded border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 focus:border-indigo-400/50 focus:outline-none"
              />
              <div className="flex gap-1.5">
                <button type="button" onClick={applyLink} className="flex-1 rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500">
                  הוסף
                </button>
                {state.isLink ? (
                  <button type="button" onClick={removeLink} className="flex-1 rounded border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-white/30">
                    הסר
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <ToolbarButton label="😊" title="אימוג'י" onClick={() => setEmojiPopoverOpen((value) => !value)} />
          {emojiPopoverOpen ? (
            <div className="absolute top-full z-10 grid w-56 grid-cols-8 gap-1 rounded-lg border border-white/10 bg-slate-900 p-2 shadow-xl">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <ToolbarDivider />

        <ToolbarButton label="↶" title="בטל" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="↷" title="בצע שוב" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
      </div>

      <EditorContent editor={editor} />

      <span className="text-[10px] text-slate-500">
        {totalTextLength}/{MAX_RICH_CONTENT_TEXT_CHARACTERS} תווים
      </span>
    </div>
  );
}

const ALIGNMENT_ICON: Record<ProfileAlignment, string> = { right: "⇥", center: "≡", left: "⇤" };

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-white/10" />;
}

function ToolbarButton({
  label,
  title,
  active,
  disabled,
  bold,
  italic,
  underline,
  onClick,
}: {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // STABILIZATION FIX — without this, the browser's own default
      // mousedown behavior runs before onClick: clicking a toolbar button
      // (outside the contentEditable) blurs the editor and collapses its
      // selection first, so by the time onClick's own editor.chain()
      // .focus() call runs, it restores whatever stale selection
      // ProseMirror had BEFORE this click — not the word the user just
      // selected. Root-caused live: a double-click on one word followed
      // immediately by a toolbar click reproducibly applied the mark to a
      // DIFFERENT, previously-selected word instead, even though
      // window.getSelection() already showed the correct word at click
      // time. preventDefault on mousedown is the standard ProseMirror/
      // Tiptap fix — it stops the browser from touching focus/selection
      // at all, so onClick's chain().focus() sees the true current
      // selection.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/60" : "text-slate-300 hover:bg-white/10"
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""} ${underline ? "underline" : ""}`}
    >
      {label}
    </button>
  );
}

function ToolbarSelect({
  value,
  placeholder,
  onChange,
  options,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded border border-white/10 bg-slate-950/60 px-1.5 py-1 text-xs text-slate-200"
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
