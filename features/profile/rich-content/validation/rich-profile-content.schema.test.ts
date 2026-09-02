// RICH PROFILE EDITOR (PHASE A) — direct coverage for
// rich-profile-content.schema.ts. Plain Zod, no next/headers dependency, so
// (like profile.schema.test.ts) this file is importable directly.
import assert from "node:assert/strict";
import { test } from "node:test";

import { isSafeHttpUrl, MAX_RICH_CONTENT_NODES, MAX_RICH_CONTENT_TEXT_CHARACTERS, richProfileContentDocSchema } from "@/features/profile/rich-content/validation/rich-profile-content.schema";

// 1 — the empty document (a freshly-opened, untouched editor) is valid.
test("1: an empty doc ({ type: doc, content: [] }) is valid", () => {
  assert.ok(richProfileContentDocSchema.safeParse({ type: "doc", content: [] }).success);
});

// 2 — a plain paragraph with bold/italic/underline/textStyle marks.
test("2: a paragraph with bold, italic, underline, and a textStyle mark (color+font+size) is valid", () => {
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { textAlign: "right" },
        content: [
          {
            type: "text",
            text: "שלום",
            marks: [
              { type: "bold" },
              { type: "italic" },
              { type: "underline" },
              { type: "textStyle", attrs: { colorId: "red", fontId: "serif", sizeId: "24", effectId: "glow" } },
            ],
          },
        ],
      },
    ],
  });
  assert.ok(result.success, JSON.stringify(!result.success ? result.error.issues : null));
});

// 3 — heading levels 1-3 are valid; an out-of-range level is rejected.
test("3: heading levels 1/2/3 are valid; level 4 is rejected", () => {
  for (const level of [1, 2, 3]) {
    const result = richProfileContentDocSchema.safeParse({
      type: "doc",
      content: [{ type: "heading", attrs: { level }, content: [{ type: "text", text: "כותרת" }] }],
    });
    assert.ok(result.success, `level ${level} should be valid`);
  }

  const invalid = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "כותרת" }] }],
  });
  assert.ok(!invalid.success, "level 4 must be rejected — only 1/2/3 are ever allowed");
});

// 4 — links: http/https accepted, javascript:/data: rejected.
test("4: a link mark with an https href is valid; javascript:/data: hrefs are rejected", () => {
  const validHttps = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "קישור", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] },
    ],
  });
  assert.ok(validHttps.success);

  for (const href of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "not a url"]) {
    const result = richProfileContentDocSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "קישור", marks: [{ type: "link", attrs: { href } }] }] }],
    });
    assert.ok(!result.success, `href "${href}" must be rejected`);
  }
});

// 5 — isSafeHttpUrl direct coverage (the same helper the schema/renderer both reuse).
test("5: isSafeHttpUrl accepts http/https only", () => {
  assert.ok(isSafeHttpUrl("https://example.com"));
  assert.ok(isSafeHttpUrl("http://example.com"));
  assert.ok(!isSafeHttpUrl("javascript:alert(1)"));
  assert.ok(!isSafeHttpUrl("data:text/html,x"));
  assert.ok(!isSafeHttpUrl("ftp://example.com"));
  assert.ok(!isSafeHttpUrl("not a url"));
});

// 6 — an invalid colorId on a textStyle mark is rejected.
test("6: a textStyle mark with an unknown colorId is rejected", () => {
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "טקסט", marks: [{ type: "textStyle", attrs: { colorId: "neon-pink" } }] }] }],
  });
  assert.ok(!result.success);
});

// 7 — bulletList/orderedList/listItem nesting is valid.
test("7: a bulletList and an orderedList, each with listItem > paragraph nesting, are valid", () => {
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "פריט 1" }] }] }] },
      {
        type: "orderedList",
        attrs: { start: 2 },
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "פריט 2" }] }] }],
      },
    ],
  });
  assert.ok(result.success, JSON.stringify(!result.success ? result.error.issues : null));
});

// 8 — an unlisted node type (e.g. codeBlock/image — never allowlisted here)
// is rejected outright, never silently passed through.
test("8: an unlisted node type (codeBlock) is rejected", () => {
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "codeBlock", content: [{ type: "text", text: "code" }] }],
  });
  assert.ok(!result.success);
});

// 9 — an unlisted mark type (e.g. strike) is rejected outright.
test("9: an unlisted mark type (strike) is rejected", () => {
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "טקסט", marks: [{ type: "strike" }] }] }],
  });
  assert.ok(!result.success);
});

// 10 — total text length across every text node combined is capped.
test("10: total text length over MAX_RICH_CONTENT_TEXT_CHARACTERS is rejected", () => {
  const longText = "א".repeat(MAX_RICH_CONTENT_TEXT_CHARACTERS + 1);
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: longText }] }],
  });
  assert.ok(!result.success);
});

// 11 — total node count across the whole tree is capped.
test("11: total node count over MAX_RICH_CONTENT_NODES is rejected", () => {
  const content = Array.from({ length: MAX_RICH_CONTENT_NODES + 1 }, () => ({
    type: "paragraph" as const,
    content: [{ type: "text" as const, text: "x" }],
  }));
  const result = richProfileContentDocSchema.safeParse({ type: "doc", content });
  assert.ok(!result.success);
});

// 13 — sizeId only accepts the exact allowlisted numeric-string ids —
// never a raw CSS value like "18px" or an arbitrary number outside the set.
test("13: sizeId only accepts the exact allowlisted numeric ids, never a raw CSS size value", () => {
  const validSizes = ["8", "16", "72"];
  for (const sizeId of validSizes) {
    const result = richProfileContentDocSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "טקסט", marks: [{ type: "textStyle", attrs: { sizeId } }] }] }],
    });
    assert.ok(result.success, `sizeId "${sizeId}" should be valid`);
  }

  for (const sizeId of ["18px", "100", "0", "abc"]) {
    const result = richProfileContentDocSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "טקסט", marks: [{ type: "textStyle", attrs: { sizeId } }] }] }],
    });
    assert.ok(!result.success, `sizeId "${sizeId}" must be rejected`);
  }
});

// 14 — effectId only accepts the six allowlisted style ids.
test("14: effectId only accepts the allowlisted special-style ids", () => {
  for (const effectId of ["normal", "glow", "neon", "shimmer", "shadow", "gradient"]) {
    const result = richProfileContentDocSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "טקסט", marks: [{ type: "textStyle", attrs: { effectId } }] }] }],
    });
    assert.ok(result.success, `effectId "${effectId}" should be valid`);
  }

  const invalid = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "טקסט", marks: [{ type: "textStyle", attrs: { effectId: "rainbow-blink" } }] }] }],
  });
  assert.ok(!invalid.success);
});

// 12 — a raw HTML-ish string sneaking in as `type` is rejected — this schema
// has no node type that could ever hold arbitrary HTML/CSS/JS to begin with.
test("12: a node with an arbitrary/unknown type is always rejected, never passed through", () => {
  const result = richProfileContentDocSchema.safeParse({
    type: "doc",
    content: [{ type: "script", content: "alert(1)" }],
  });
  assert.ok(!result.success);
});
