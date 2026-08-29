import { existsSync } from "node:fs";

// dotenv-cli silently continues when the file passed to `-e` doesn't exist,
// and both Next.js and prisma.config.ts's own `dotenv/config` then fall back
// to auto-loading whichever env file actually exists in this directory —
// which would silently run a command labeled for one environment (DEV/PLAY)
// against the other one instead of failing loudly. This guard runs before
// dotenv-cli in every env-scoped npm script so a missing target env file is
// a hard, explicit error instead of a silent cross-environment fallback.
const [, , path] = process.argv;

if (!path) {
  console.error("require-env-file: no path given");
  process.exit(1);
}

if (!existsSync(path)) {
  const templatePath = path === ".env" ? ".env.example" : ".env.development.example";
  console.error(
    `\nERROR: ${path} not found in this directory.\n` +
      `This command requires ${path} — copy ${templatePath} to ${path} and fill in the correct database connection strings first (see ENVIRONMENTS.md).\n` +
      `Refusing to continue rather than silently falling back to a different environment file that happens to exist here.\n`,
  );
  process.exit(1);
}
