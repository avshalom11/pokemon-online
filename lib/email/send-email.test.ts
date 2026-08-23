// RESEND PASSWORD RESET — direct coverage for send-email.ts's own error
// behavior. Importable directly: this module never touches next/headers,
// and constructs the Resend client lazily (only on an actual send), so
// importing it doesn't require RESEND_API_KEY at all — only calling
// sendEmail() without it does, which is exactly what's tested here (no
// real network call is ever made).
import assert from "node:assert/strict";
import { test } from "node:test";

import { sendEmail } from "@/lib/email/send-email";

test("sendEmail throws a clear, actionable error when RESEND_API_KEY is not set, instead of a raw SDK error", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    await assert.rejects(
      () => sendEmail({ to: "trainer1@example.com", subject: "test", html: "<p>test</p>" }),
      /RESEND_API_KEY is not set/
    );
  } finally {
    if (original !== undefined) process.env.RESEND_API_KEY = original;
  }
});
