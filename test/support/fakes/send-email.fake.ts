// Test fake for lib/email/send-email.ts's sendEmail — redirected in by
// alias-loader.mjs for the whole test run, same "swap the real I/O for an
// in-memory fake" pattern as prisma.fake.ts. The real function talks to
// Resend over the network and throws if RESEND_API_KEY isn't set (true in
// every test environment) — this fake lets account-deletion tests exercise
// the SUCCESS path (a real send that "works") in addition to the failure
// path, without needing real network access or a real API key.
export interface SentEmail {
  to: string;
  subject: string;
  html: string;
}

let sentEmails: SentEmail[] = [];
let shouldFail = false;

export async function sendEmail(input: SentEmail): Promise<void> {
  if (shouldFail) {
    throw new Error("fake sendEmail: configured to fail");
  }
  sentEmails.push(input);
}

export function getSentEmails(): SentEmail[] {
  return [...sentEmails];
}

export function setSendEmailShouldFail(value: boolean): void {
  shouldFail = value;
}

export function resetSendEmailFake(): void {
  sentEmails = [];
  shouldFail = false;
}
