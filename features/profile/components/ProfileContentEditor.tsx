"use client";

import { useState } from "react";

import {
  MAX_PROFILE_CONTENT_BLOCKS,
  MAX_TEXT_BLOCK_CHARACTERS,
  MAX_TOTAL_TEXT_CHARACTERS,
} from "../validation/profile-content.schema";
import {
  PROFILE_ALIGNMENT_IDS,
  PROFILE_COLOR_OPTIONS,
  PROFILE_FONT_OPTIONS,
  PROFILE_IMAGE_WIDTH_IDS,
  PROFILE_SPACER_SIZE_IDS,
  PROFILE_TEXT_SIZE_IDS,
} from "../themes/profile-content-styles";
import { PROFILE_IMAGE_OPTIONS } from "../themes/profile-images";
import { ProfileContentBlocksSection } from "./ProfileContentBlocksSection";
import type {
  ProfileAlignment,
  ProfileColorId,
  ProfileContentBlock,
  ProfileFontId,
  ProfileHeadingBlock,
  ProfileImageBlock,
  ProfileImageWidth,
  ProfileSpacerBlock,
  ProfileSpacerSize,
  ProfileTextBlock,
  ProfileTextSize,
} from "../types/profile-content.types";

interface ProfileContentEditorProps {
  blocks: ProfileContentBlock[];
  onChange: (blocks: ProfileContentBlock[]) => void;
}

const ALIGNMENT_LABELS: Record<ProfileAlignment, string> = { left: "שמאל", center: "מרכז", right: "ימין" };
const TEXT_SIZE_LABELS: Record<ProfileTextSize, string> = { small: "קטן", medium: "בינוני", large: "גדול", xl: "ענק" };
const IMAGE_WIDTH_LABELS: Record<ProfileImageWidth, string> = { small: "קטן", medium: "בינוני", large: "גדול", full: "מלא" };
const SPACER_SIZE_LABELS: Record<ProfileSpacerSize, string> = { small: "קטן", medium: "בינוני", large: "גדול" };

function createBlockId(): string {
  // Client-side id generation is fine here: it's only ever a React key +
  // the value profile-content.schema.ts's blockIdSchema bounds to
  // 1-64 chars — never trusted as anything more meaningful, and never
  // used to look anything up server-side.
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultTextBlock(type: "text" | "heading"): ProfileTextBlock | ProfileHeadingBlock {
  return {
    id: createBlockId(),
    type,
    text: "",
    fontId: "default",
    fontSize: type === "heading" ? "large" : "medium",
    alignment: "right",
    colorId: "white",
    bold: false,
    italic: false,
    underline: false,
  };
}

function createDefaultImageBlock(): ProfileImageBlock {
  return {
    id: createBlockId(),
    type: "image",
    imageId: PROFILE_IMAGE_OPTIONS[0]?.id ?? "",
    altText: "",
    width: "medium",
    alignment: "center",
  };
}

function createDefaultSpacerBlock(): ProfileSpacerBlock {
  return { id: createBlockId(), type: "spacer", size: "medium" };
}

// The full block editor rendered inside EditProfileModal — every control
// here only ever sets one of the closed-set ids the server itself validates
// (features/profile/validation/profile-content.schema.ts); there is no free
// text entry point other than the bounded block `text`/`altText` fields, and
// no way to set a raw color/URL/class name. Add/reorder/delete are all pure
// client-side array edits on `blocks`; nothing is persisted until the
// surrounding EditProfileModal's own Save button runs updateProfileAction.
export function ProfileContentEditor({ blocks, onChange }: ProfileContentEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  const totalTextLength = blocks.reduce(
    (sum, block) => (block.type === "text" || block.type === "heading" ? sum + block.text.length : sum),
    0
  );
  const canAddBlock = blocks.length < MAX_PROFILE_CONTENT_BLOCKS;

  function updateBlock(id: string, updater: (block: ProfileContentBlock) => ProfileContentBlock) {
    onChange(blocks.map((block) => (block.id === id ? updater(block) : block)));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((block) => block.id !== id));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function addBlock(block: ProfileContentBlock) {
    if (!canAddBlock) return;
    onChange([...blocks, block]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {blocks.length}/{MAX_PROFILE_CONTENT_BLOCKS} בלוקים · {totalTextLength}/{MAX_TOTAL_TEXT_CHARACTERS} תווים
        </span>
        <button
          type="button"
          onClick={() => setIsPreview((value) => !value)}
          className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/20"
        >
          {isPreview ? "חזרה לעריכה" : "תצוגה מקדימה"}
        </button>
      </div>

      {isPreview ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <ProfileContentBlocksSection blocks={blocks} />
          {blocks.length === 0 ? <p className="text-center text-xs text-slate-500">אין עדיין תוכן להצגה.</p> : null}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {blocks.map((block, index) => (
              <BlockEditorRow
                key={block.id}
                block={block}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                onUpdate={(updater) => updateBlock(block.id, updater)}
                onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <AddBlockButton label="+ טקסט" disabled={!canAddBlock} onClick={() => addBlock(createDefaultTextBlock("text"))} />
            <AddBlockButton
              label="+ כותרת"
              disabled={!canAddBlock}
              onClick={() => addBlock(createDefaultTextBlock("heading"))}
            />
            <AddBlockButton label="+ תמונה" disabled={!canAddBlock} onClick={() => addBlock(createDefaultImageBlock())} />
            <AddBlockButton
              label="+ קו מפריד"
              disabled={!canAddBlock}
              onClick={() => addBlock({ id: createBlockId(), type: "divider" })}
            />
            <AddBlockButton label="+ רווח" disabled={!canAddBlock} onClick={() => addBlock(createDefaultSpacerBlock())} />
          </div>
        </>
      )}
    </div>
  );
}

function AddBlockButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

interface BlockEditorRowProps {
  block: ProfileContentBlock;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updater: (block: ProfileContentBlock) => ProfileContentBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const BLOCK_TYPE_LABELS: Record<ProfileContentBlock["type"], string> = {
  text: "טקסט",
  heading: "כותרת",
  image: "תמונה",
  divider: "קו מפריד",
  spacer: "רווח",
};

function BlockEditorRow({ block, isFirst, isLast, onUpdate, onRemove, onMoveUp, onMoveDown }: BlockEditorRowProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{BLOCK_TYPE_LABELS[block.type]}</span>
        <div className="flex gap-1">
          <RowButton label="↑" disabled={isFirst} onClick={onMoveUp} />
          <RowButton label="↓" disabled={isLast} onClick={onMoveDown} />
          <RowButton label="✕" onClick={onRemove} />
        </div>
      </div>

      {block.type === "text" || block.type === "heading" ? (
        <TextLikeBlockEditor
          block={block}
          onUpdate={(updater) => onUpdate((current) => updater(current as ProfileTextBlock | ProfileHeadingBlock))}
        />
      ) : null}

      {block.type === "image" ? (
        <ImageBlockEditor block={block} onUpdate={(updater) => onUpdate((current) => updater(current as ProfileImageBlock))} />
      ) : null}

      {block.type === "spacer" ? (
        <SpacerBlockEditor
          block={block}
          onUpdate={(updater) => onUpdate((current) => updater(current as ProfileSpacerBlock))}
        />
      ) : null}
    </div>
  );
}

function RowButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-slate-900/60 text-xs text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}

function TextLikeBlockEditor({
  block,
  onUpdate,
}: {
  block: ProfileTextBlock | ProfileHeadingBlock;
  onUpdate: (updater: (block: ProfileTextBlock | ProfileHeadingBlock) => ProfileTextBlock | ProfileHeadingBlock) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        dir="rtl"
        value={block.text}
        maxLength={MAX_TEXT_BLOCK_CHARACTERS}
        onChange={(event) => {
          const text = event.target.value;
          onUpdate((current) => ({ ...current, text }));
        }}
        rows={block.type === "heading" ? 1 : 3}
        placeholder={block.type === "heading" ? "כותרת" : "טקסט חופשי"}
        className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
      />
      <span className="text-[10px] text-slate-500">
        {block.text.length}/{MAX_TEXT_BLOCK_CHARACTERS}
      </span>

      <div className="flex flex-wrap gap-2">
        <select
          value={block.fontId}
          onChange={(event) => {
            const fontId = event.target.value as ProfileFontId;
            onUpdate((current) => ({ ...current, fontId }));
          }}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
        >
          {PROFILE_FONT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={block.fontSize}
          onChange={(event) => {
            const fontSize = event.target.value as ProfileTextSize;
            onUpdate((current) => ({ ...current, fontSize }));
          }}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
        >
          {PROFILE_TEXT_SIZE_IDS.map((id) => (
            <option key={id} value={id}>
              {TEXT_SIZE_LABELS[id]}
            </option>
          ))}
        </select>

        <select
          value={block.alignment}
          onChange={(event) => {
            const alignment = event.target.value as ProfileAlignment;
            onUpdate((current) => ({ ...current, alignment }));
          }}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
        >
          {PROFILE_ALIGNMENT_IDS.map((id) => (
            <option key={id} value={id}>
              {ALIGNMENT_LABELS[id]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500">צבע:</span>
        {PROFILE_COLOR_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            onClick={() => {
              const colorId = option.id as ProfileColorId;
              onUpdate((current) => ({ ...current, colorId }));
            }}
            className={`h-6 w-6 rounded-full border-2 ${option.swatchClassName} ${
              block.colorId === option.id ? "border-white" : "border-transparent"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500">רקע:</span>
        <button
          type="button"
          title="ללא"
          onClick={() => onUpdate((current) => ({ ...current, backgroundColorId: undefined }))}
          className={`h-6 w-6 rounded-full border-2 bg-transparent ${
            block.backgroundColorId === undefined ? "border-white" : "border-white/20"
          }`}
        />
        {PROFILE_COLOR_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            onClick={() => {
              const backgroundColorId = option.id as ProfileColorId;
              onUpdate((current) => ({ ...current, backgroundColorId }));
            }}
            className={`h-6 w-6 rounded-full border-2 ${option.swatchClassName} ${
              block.backgroundColorId === option.id ? "border-white" : "border-transparent"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3 text-xs text-slate-300">
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={block.bold}
            onChange={(event) => {
              const bold = event.target.checked;
              onUpdate((current) => ({ ...current, bold }));
            }}
          />
          <span className="font-bold">B</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={block.italic}
            onChange={(event) => {
              const italic = event.target.checked;
              onUpdate((current) => ({ ...current, italic }));
            }}
          />
          <span className="italic">I</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={block.underline}
            onChange={(event) => {
              const underline = event.target.checked;
              onUpdate((current) => ({ ...current, underline }));
            }}
          />
          <span className="underline">U</span>
        </label>
      </div>
    </div>
  );
}

function ImageBlockEditor({
  block,
  onUpdate,
}: {
  block: ProfileImageBlock;
  onUpdate: (updater: (block: ProfileImageBlock) => ProfileImageBlock) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {PROFILE_IMAGE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            onClick={() => onUpdate((current) => ({ ...current, imageId: option.id }))}
            className={`rounded-lg border px-2 py-1 text-xs ${
              block.imageId === option.id
                ? "border-indigo-400/70 bg-indigo-500/20 text-indigo-200"
                : "border-white/10 bg-slate-900/60 text-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        dir="rtl"
        value={block.altText}
        maxLength={150}
        placeholder="תיאור התמונה (לנגישות)"
        onChange={(event) => {
          const altText = event.target.value;
          onUpdate((current) => ({ ...current, altText }));
        }}
        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={block.width}
          onChange={(event) => {
            const width = event.target.value as ProfileImageWidth;
            onUpdate((current) => ({ ...current, width }));
          }}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
        >
          {PROFILE_IMAGE_WIDTH_IDS.map((id) => (
            <option key={id} value={id}>
              {IMAGE_WIDTH_LABELS[id]}
            </option>
          ))}
        </select>

        <select
          value={block.alignment}
          onChange={(event) => {
            const alignment = event.target.value as ProfileAlignment;
            onUpdate((current) => ({ ...current, alignment }));
          }}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
        >
          {PROFILE_ALIGNMENT_IDS.map((id) => (
            <option key={id} value={id}>
              {ALIGNMENT_LABELS[id]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SpacerBlockEditor({
  block,
  onUpdate,
}: {
  block: ProfileSpacerBlock;
  onUpdate: (updater: (block: ProfileSpacerBlock) => ProfileSpacerBlock) => void;
}) {
  return (
    <select
      value={block.size}
      onChange={(event) => {
        const size = event.target.value as ProfileSpacerSize;
        onUpdate((current) => ({ ...current, size }));
      }}
      className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-200"
    >
      {PROFILE_SPACER_SIZE_IDS.map((id) => (
        <option key={id} value={id}>
          {SPACER_SIZE_LABELS[id]}
        </option>
      ))}
    </select>
  );
}
