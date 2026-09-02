import type { ReactNode } from "react";

import { getProfileAlignmentClassName, getProfileTextColorClassName } from "@/features/profile/themes/profile-content-styles";
import {
  getRichTextEffectClassName,
  getRichTextFontFamilyStack,
  getRichTextFontSizePx,
} from "@/features/profile/rich-content/config/rich-text-style-options";
import { isSafeHttpUrl } from "../validation/rich-profile-content.schema";
import type {
  RichBlockNode,
  RichInlineNode,
  RichProfileContentDoc,
  RichTextListItemNode,
  RichTextMark,
} from "../types/rich-profile-content.types";

interface RichProfileContentRendererProps {
  content: RichProfileContentDoc | null;
}

// RICH PROFILE EDITOR (PHASE A/C) — the ONE safe JSON -> React renderer for
// PlayerProfile.richProfileContent, mirroring exactly what
// ProfileContentBlocksSection.tsx already does for profileContentBlocks:
// every node/mark type is handled through an explicit switch against the
// allowlist (never a generic/recursive "just trust the JSON" walk), every
// style-ish attribute goes through the SAME id -> className lookups the
// older block system already uses (features/profile/themes/
// profile-content-styles.ts), and there is NO dangerouslySetInnerHTML
// anywhere in this file — text always renders as React children, so it can
// never execute as markup regardless of what characters it contains. Owner
// and every other visitor render from this exact same `content` (never
// gated by a privacy toggle, same as the older block section) via
// getPublicProfileView/getProfileEditViewModel's shared richProfileContent
// field, so what the owner sees while editing IS what everyone else sees.
//
// `content === null` (never saved yet, or failed re-validation on read —
// see parse-rich-profile-content.ts) and an empty document both render
// nothing at all — no heading, no empty box — same "untouched profile
// shows nothing broken" rule the older block section already follows.
export function RichProfileContentRenderer({ content }: RichProfileContentRendererProps) {
  if (!content || content.content.length === 0) return null;

  return (
    <section dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">התוכן שלי</h2>
      <div className="flex flex-col gap-2">
        {content.content.map((node, index) => (
          <BlockNodeRenderer key={index} node={node} />
        ))}
      </div>
    </section>
  );
}

function BlockNodeRenderer({ node }: { node: RichBlockNode }) {
  switch (node.type) {
    case "paragraph": {
      const inline = renderInlineNodes(node.content ?? []);
      if (inline.length === 0) return null;
      return <p className={paragraphClassName(node.attrs?.textAlign)}>{inline}</p>;
    }
    case "heading": {
      const inline = renderInlineNodes(node.content ?? []);
      if (inline.length === 0) return null;
      const className = `font-bold ${paragraphClassName(node.attrs.textAlign)}`;
      switch (node.attrs.level) {
        case 1:
          return <h3 className={`text-lg ${className}`}>{inline}</h3>;
        case 2:
          return <h4 className={`text-base ${className}`}>{inline}</h4>;
        case 3:
          return <h5 className={`text-sm ${className}`}>{inline}</h5>;
      }
      return null;
    }
    case "bulletList":
      return (
        <ul className="list-inside list-disc pr-4 text-sm text-slate-200">
          {(node.content ?? []).map((item, index) => (
            <ListItemRenderer key={index} item={item} />
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol className="list-inside list-decimal pr-4 text-sm text-slate-200" start={node.attrs?.start}>
          {(node.content ?? []).map((item, index) => (
            <ListItemRenderer key={index} item={item} />
          ))}
        </ol>
      );
  }
}

function ListItemRenderer({ item }: { item: RichTextListItemNode }) {
  return (
    <li>
      {(item.content ?? []).map((node, index) => (
        <BlockNodeRenderer key={index} node={node} />
      ))}
    </li>
  );
}

function paragraphClassName(textAlign: string | undefined): string {
  const base = "whitespace-pre-wrap break-words text-sm text-slate-200";
  if (!textAlign) return base;
  return `${base} ${getProfileAlignmentClassName(textAlign as Parameters<typeof getProfileAlignmentClassName>[0])}`;
}

function renderInlineNodes(nodes: RichInlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "hardBreak") return <br key={index} />;
    return <TextRunRenderer key={index} text={node.text} marks={node.marks ?? []} />;
  });
}

function TextRunRenderer({ text, marks }: { text: string; marks: RichTextMark[] }) {
  const classNames: string[] = [];
  // fontId/sizeId resolve to real CSS (a font-family stack / an exact
  // pixel value) rather than a Tailwind class — see
  // profile-text-style.extension.ts's own doc comment for why; every
  // value written here still only ever comes from the fixed
  // rich-text-style-options.ts lookups, never from the JSON itself.
  const style: { fontFamily?: string; fontSize?: string } = {};
  let bold = false;
  let italic = false;
  let underline = false;
  let href: string | null = null;

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        bold = true;
        break;
      case "italic":
        italic = true;
        break;
      case "underline":
        underline = true;
        break;
      case "link":
        // Re-checked here even though the write-side schema already
        // enforces this — a render path must never trust a value it reads
        // back as still-safe without re-verifying it itself.
        if (isSafeHttpUrl(mark.attrs.href)) href = mark.attrs.href;
        break;
      case "textStyle":
        if (mark.attrs.colorId) classNames.push(getProfileTextColorClassName(mark.attrs.colorId));
        if (mark.attrs.fontId) style.fontFamily = getRichTextFontFamilyStack(mark.attrs.fontId);
        if (mark.attrs.sizeId) style.fontSize = getRichTextFontSizePx(mark.attrs.sizeId);
        if (mark.attrs.effectId && mark.attrs.effectId !== "normal") classNames.push(getRichTextEffectClassName(mark.attrs.effectId));
        break;
    }
  }

  if (bold) classNames.push("font-bold");
  if (italic) classNames.push("italic");
  if (underline) classNames.push("underline");

  const className = classNames.length > 0 ? classNames.join(" ") : undefined;
  const styleProp = Object.keys(style).length > 0 ? style : undefined;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`text-indigo-300 underline hover:text-indigo-200 ${className ?? ""}`}
        style={styleProp}
      >
        {text}
      </a>
    );
  }

  if (!className && !styleProp) return <>{text}</>;
  return (
    <span className={className} style={styleProp}>
      {text}
    </span>
  );
}
