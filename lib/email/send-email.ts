import "server-only";

import { Resend } from "resend";

// The ONE place any outgoing transactional email (password reset today;
// anything else later) actually gets handed to a provider. Every caller
// (e.g. lib/email/password-reset-email.ts) goes through this single
// function, so swapping providers/domains later is a one-file change —
// nothing else in the codebase ever imports `resend` directly.
//
// The client is constructed lazily (on first real send), not at module
// load: this file is imported from lib/auth/auth.ts, which itself loads at
// build time and in every test run. Throwing at import time just because
// RESEND_API_KEY isn't set in a given environment (CI, `tsc --noEmit`, a
// test run that never actually triggers a password reset) would break
// those unrelated paths for no reason. The key itself is never logged.
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env to enable outgoing email (see .env.example)."
    );
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

// Falls back to Resend's own shared sandbox sender when RESEND_FROM_EMAIL
// isn't configured, so password-reset email works in local development
// against a real Resend account with zero domain setup. Resend restricts
// onboarding@resend.dev to the API key's OWN account email as the
// recipient — real delivery to arbitrary players' addresses requires a
// verified sending domain and RESEND_FROM_EMAIL pointed at it. See this
// project's own auth report for the exact restriction.
const DEFAULT_FROM_EMAIL = "Monster Online <onboarding@resend.dev>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  const { error } = await client.emails.send({ from, to, subject, html });
  if (error) {
    // Never include `to`/`html` in the thrown message — this can end up in
    // server logs, and the recipient address is exactly the kind of detail
    // this project's auth code otherwise takes care never to leak.
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}
