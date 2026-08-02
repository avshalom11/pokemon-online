import { SpriteImage } from "@/components/media/SpriteImage";
import { getProfileImageUrl } from "../themes/profile-images";
import {
  getProfileAlignmentClassName,
  getProfileBackgroundColorClassName,
  getProfileFontClassName,
  getProfileFontSizeClassName,
  getProfileImageWidthClassName,
  getProfileSpacerSizeClassName,
  getProfileTextColorClassName,
} from "../themes/profile-content-styles";
import type {
  ProfileContentBlock,
  ProfileHeadingBlock,
  ProfileImageBlock,
  ProfileTextBlock,
} from "../types/profile-content.types";

interface ProfileContentBlocksSectionProps {
  blocks: ProfileContentBlock[];
}

// Renders the owner's structured showcase content — an ADDITIONAL section
// alongside the existing header/about-me/party/stats/badges sections, never
// a replacement for them (see this feature's own spec). Owner and every
// other visitor render from this exact same `blocks` array (it's never
// gated by any privacy toggle) via getPublicProfileView/
// getProfileEditViewModel's shared contentBlocks field — so what the owner
// sees here while editing IS what everyone else sees.
//
// An empty array renders nothing at all (no heading, no empty box) — this
// is what keeps an untouched profile from showing a broken/empty section.
// Every block's styling is applied purely via className lookups
// (features/profile/themes/profile-content-styles.ts) — never inline CSS,
// never a class name that came from the block data itself.
export function ProfileContentBlocksSection({ blocks }: ProfileContentBlocksSectionProps) {
  if (blocks.length === 0) return null;

  return (
    <section dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">התוכן שלי</h2>
      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <ProfileContentBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}

function ProfileContentBlockRenderer({ block }: { block: ProfileContentBlock }) {
  switch (block.type) {
    case "text":
      return <TextLikeBlockRenderer block={block} as="p" />;
    case "heading":
      return <TextLikeBlockRenderer block={block} as="h3" />;
    case "image":
      return <ImageBlockRenderer block={block} />;
    case "divider":
      return <hr className="border-white/10" />;
    case "spacer":
      return <div className={getProfileSpacerSizeClassName(block.size)} aria-hidden="true" />;
  }
}

function TextLikeBlockRenderer({ block, as: Tag }: { block: ProfileTextBlock | ProfileHeadingBlock; as: "p" | "h3" }) {
  // whitespace-pre-wrap + break-words is what keeps long/unbroken owner
  // text readable on mobile instead of overflowing the card horizontally.
  const classNames = [
    getProfileFontClassName(block.fontId),
    getProfileFontSizeClassName(block.fontSize),
    getProfileTextColorClassName(block.colorId),
    getProfileAlignmentClassName(block.alignment),
    block.bold ? "font-bold" : "",
    block.italic ? "italic" : "",
    block.underline ? "underline" : "",
    "whitespace-pre-wrap break-words rounded-lg p-2 flex flex-col",
    block.backgroundColorId ? getProfileBackgroundColorClassName(block.backgroundColorId) : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!block.text.trim()) return null;

  return <Tag className={classNames}>{block.text}</Tag>;
}

function ImageBlockRenderer({ block }: { block: ProfileImageBlock }) {
  const imageUrl = getProfileImageUrl(block.imageId);
  if (!imageUrl) return null;

  const alignmentClassName =
    block.alignment === "center" ? "justify-center" : block.alignment === "right" ? "justify-end" : "justify-start";

  return (
    <div className={`flex ${alignmentClassName}`}>
      <SpriteImage
        src={imageUrl}
        alt={block.altText || "תמונה"}
        className={`w-full object-contain ${getProfileImageWidthClassName(block.width)}`}
        fallbackClassName={`flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 ${getProfileImageWidthClassName(block.width)}`}
      />
    </div>
  );
}
