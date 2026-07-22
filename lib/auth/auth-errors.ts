import { isAPIError } from "better-auth/api";

const USERNAME_TAKEN_MESSAGE = "שם המשתמש כבר תפוס. נסה שם אחר.";
const GENERIC_LOGIN_ERROR_MESSAGE = "שם המשתמש, האימייל או הסיסמה שגויים.";
const GENERIC_REGISTRATION_ERROR_MESSAGE = "לא ניתן להשלים את ההרשמה עם הפרטים שסופקו. נסה שוב.";
const UNEXPECTED_ERROR_MESSAGE = "משהו השתבש. נסה שוב מאוחר יותר.";

const PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE
  );
}

// Maps every registration failure to a Hebrew message. Username conflicts
// get a specific, clear message — usernames are meant to be claimed/checked,
// so confirming one is taken isn't a privacy concern. Everything else, most
// importantly an already-registered email, gets the same generic message,
// so registration never confirms which specific email is already in use.
export function getRegistrationErrorMessage(error: unknown): string {
  // Race-condition backstop: verified from the installed better-auth source
  // (plugins/username/index.mjs's validateUsername, db/with-hooks.mjs) that
  // Better Auth's own check-then-insert has a TOCTOU window, and confirmed
  // (grepped the installed better-auth/@better-auth packages) that it does
  // not itself catch a raw Prisma unique-constraint violation. The DB-level
  // @@unique([username]) constraint (prisma/schema.prisma) is the real
  // backstop for that race; this turns *its* failure into the same clear
  // message the app-level pre-check already produces for the non-race case.
  if (isPrismaUniqueConstraintError(error)) {
    return USERNAME_TAKEN_MESSAGE;
  }

  if (isAPIError(error)) {
    const code = (error.body as { code?: string } | undefined)?.code;

    if (code === "USERNAME_IS_ALREADY_TAKEN") {
      return USERNAME_TAKEN_MESSAGE;
    }

    // Any other registration failure — including an already-registered
    // email — is deliberately generic.
    return GENERIC_REGISTRATION_ERROR_MESSAGE;
  }

  return UNEXPECTED_ERROR_MESSAGE;
}

// Any login failure at all — unknown identifier, wrong password, anything
// else — maps to this exact same message, so the UI never reveals whether a
// given username/email exists.
export function getLoginErrorMessage(): string {
  return GENERIC_LOGIN_ERROR_MESSAGE;
}

export const AUTH_MESSAGES = {
  unexpected: UNEXPECTED_ERROR_MESSAGE,
} as const;
