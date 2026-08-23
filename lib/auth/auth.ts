import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { ensurePlayerProfile } from "@/lib/auth/player-profile";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/auth/validation";
import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";

// FORGOT PASSWORD — how long a reset link stays valid before Better Auth's
// own single-use Verification row (see resetPassword in
// node_modules/better-auth/dist/api/routes/password.mjs) expires and can no
// longer be consumed. One hour: long enough that a real email delayed a few
// minutes still works, short enough that a leaked/old email is a narrow
// window.
const RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
    // Keep Better Auth's own multi-model writes (e.g. user + account
    // created together on sign-up) atomic relative to each other.
    transaction: true,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,

    // FORGOT PASSWORD — Better Auth's own built-in flow end to end
    // (POST /request-password-reset, POST /reset-password): it already
    // generates a single-use, expiring token in the Verification table
    // (never a custom implementation here), never reveals whether a given
    // email is registered (see requestPasswordReset in the installed
    // better-auth source — a nonexistent email gets the exact same
    // response, after a dummy token-generation + lookup to keep timing
    // consistent), and consumes the token exactly once
    // (internalAdapter.consumeVerificationValue). This callback is only the
    // delivery step: hand the ready-made reset URL to
    // lib/email/password-reset-email.ts. The password itself is never
    // visible here — only `url`/`token`, and the plaintext new password
    // never touches this codebase's own code at all (resetPassword hashes
    // it internally, same as sign-up).
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
    resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
    // A successful password reset (proof of email ownership via the
    // emailed link) also signs out every session the account had before
    // the reset — resetPassword in the installed better-auth source calls
    // internalAdapter.deleteUserSessions(userId) unconditionally when this
    // is true. Right protection for "someone reset my password": if the
    // original password had been compromised, any session an attacker was
    // already holding is killed too, not just future login attempts.
    revokeSessionsOnPasswordReset: true,
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  // Best-effort: see lib/auth/player-profile.ts for why this alone isn't
  // treated as the guarantee that a profile exists.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const displayName =
            (user as { displayUsername?: string; username?: string }).displayUsername ??
            (user as { username?: string }).username ??
            user.name ??
            "שחקן";

          await ensurePlayerProfile(user.id, displayName);
        },
      },
    },
  },

  plugins: [
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
    // Must be last: patches auth.api.* calls made from Server Actions so
    // their Set-Cookie response is applied via next/headers automatically.
    nextCookies(),
  ],
});
