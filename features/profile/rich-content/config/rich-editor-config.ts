import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import type { AnyExtension } from "@tiptap/core";

import { PROFILE_ALIGNMENT_IDS } from "@/features/profile/themes/profile-content-styles";
import { isSafeHttpUrl } from "@/features/profile/rich-content/validation/rich-profile-content.schema";
import { ProfileTextStyleExtension } from "@/features/profile/rich-content/extensions/profile-text-style.extension";

// RICH PROFILE EDITOR (PHASE A/B) — the ONE place the editor's extension
// list is built, shared by RichProfileEditor.tsx (the live editing canvas)
// so there is never a second, independently-drifting extension list. Every
// node/mark type enabled here has a matching entry in
// rich-profile-content.schema.ts's allowlist — StarterKit's own strike/
// code/codeBlock/blockquote/horizontalRule sub-extensions are explicitly
// disabled below so the EDITOR ITSELF can never produce a node/mark type
// the server would reject on save, not just relying on the server-side
// schema to silently refuse it after the fact.
export function createRichProfileEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      // Disabled — not in this feature's required formatting list, and
      // enabling them would let the editor produce nodes the server-side
      // schema (rich-profile-content.schema.ts) doesn't allowlist.
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https"],
        validate: (href: string) => isSafeHttpUrl(href),
      },
    }),
    ProfileTextStyleExtension,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: [...PROFILE_ALIGNMENT_IDS],
      defaultAlignment: "right",
    }),
    Placeholder.configure({ placeholder: "התחל לכתוב את הפרופיל שלך..." }),
  ];
}
