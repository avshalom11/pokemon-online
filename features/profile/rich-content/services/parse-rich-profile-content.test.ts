// RICH PROFILE EDITOR (PHASE A) — direct coverage for
// parse-rich-profile-content.ts's "invalid -> safe null fallback" contract.
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseRichProfileContent } from "@/features/profile/rich-content/services/parse-rich-profile-content";

test("1: a real, valid doc value parses through unchanged", () => {
  const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "שלום" }] }] };
  assert.deepEqual(parseRichProfileContent(doc), doc);
});

test("2: null (the column's own 'never saved yet' value) parses to null", () => {
  assert.equal(parseRichProfileContent(null), null);
});

test("3: a corrupt/invalid value (e.g. hand-edited row, wrong shape) falls back to null instead of throwing", () => {
  assert.equal(parseRichProfileContent({ not: "a valid doc" }), null);
  assert.equal(parseRichProfileContent("just a string"), null);
  assert.equal(parseRichProfileContent(42), null);
});

test("4: a doc containing a disallowed node type falls back to null on read, same as any other invalid value", () => {
  assert.equal(parseRichProfileContent({ type: "doc", content: [{ type: "codeBlock" }] }), null);
});
