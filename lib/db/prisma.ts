import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

// Dev-mode hot-reload-safe singleton: Next.js dev server re-evaluates this
// module on every edit, which would otherwise open a new PrismaClient (and
// a new Postgres connection pool) each time. Caching it on `globalThis`
// survives the reload; production always gets a fresh instance per process.
declare global {
  var prismaClient: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}
