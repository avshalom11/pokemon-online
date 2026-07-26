// Node module-resolution hook used only by the automated test suite (see
// register.mjs, wired in via package.json's "test" script). Never loaded by
// `next dev`/`next build`/`next start` — production module resolution is
// untouched.
//
// Three jobs:
//  1. Resolve bare "@/..." specifiers the same way tsconfig's "paths" does
//     for the Next.js/tsc bundler, which plain Node otherwise can't follow.
//  2. Redirect a small, fixed set of persistence/session/framework
//     specifiers to in-memory test fakes (see ./fakes), so Phase 4E's
//     feature-layer functions can run for real against isolated state
//     instead of the live Neon database.
//  3. Fall back to trying ".ts"/"/index.ts" on any relative specifier
//     Node's own resolver can't find as-is — engine/ files always use
//     explicit ".ts" extensions (a plain-Node-execution convention set
//     before this test harness existed), but some features/ files use
//     extensionless relative imports (valid under tsconfig's "bundler"
//     moduleResolution, not under plain Node ESM) — this is what lets
//     those load too, without changing the production files themselves.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../../", import.meta.url);

const FAKES = {
  "@/lib/db/prisma": new URL("./fakes/prisma.fake.ts", import.meta.url).href,
  "@/lib/auth/auth-session": new URL("./fakes/auth-session.fake.ts", import.meta.url).href,
  "@/lib/auth/player-profile": new URL("./fakes/player-profile.fake.ts", import.meta.url).href,
  "next/cache": new URL("./fakes/next-cache.fake.ts", import.meta.url).href,
};

export async function resolve(specifier, context, nextResolve) {
  const fake = FAKES[specifier];
  if (fake) {
    return { url: fake, shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    const candidates = [
      new URL(`${rest}.ts`, ROOT),
      new URL(`${rest}/index.ts`, ROOT),
      new URL(`${rest}.tsx`, ROOT),
      new URL(`${rest}/index.tsx`, ROOT),
    ];
    for (const candidate of candidates) {
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;

      const base = new URL(context.parentURL);
      const candidates = [new URL(`${specifier}.ts`, base), new URL(`${specifier}/index.ts`, base)];
      for (const candidate of candidates) {
        if (existsSync(fileURLToPath(candidate))) {
          return { url: candidate.href, shortCircuit: true };
        }
      }
      throw error;
    }
  }

  return nextResolve(specifier, context);
}
