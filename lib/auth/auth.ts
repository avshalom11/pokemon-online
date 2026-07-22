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
