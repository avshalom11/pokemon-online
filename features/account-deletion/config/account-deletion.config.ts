// ACCOUNT DELETION — tuning. Kept separate from the services so the
// expiry window is a one-line change, same convention as every other
// config.ts in this codebase.

// 45 minutes — within the task's own "preferably 30-60 min" window.
export const DELETION_TOKEN_EXPIRES_IN_MS = 45 * 60 * 1000;

// The confirmation page's route — used both to build the emailed link and
// (implicitly) documents where app/delete-account/confirm/page.tsx lives.
export const DELETE_ACCOUNT_CONFIRM_PATH = "/delete-account/confirm";
