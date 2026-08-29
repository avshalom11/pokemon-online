import { existsSync } from "node:fs";

// dotenv-cli silently continues when the file passed to `-e` doesn't exist,
// and both Next.js and prisma.config.ts's own `dotenv/config` fall back to
// loading the plain `.env` file in that case — which would silently point
// a "DEV" command at the PLAY database instead of failing loudly. This
// guard runs before dotenv-cli in the DEV npm scripts so a missing DEV env
// file is a hard, explicit error instead of a silent PLAY fallback.
const [, , path] = process.argv;

if (!path) {
  console.error("require-env-file: no path given");
  process.exit(1);
}

if (!existsSync(path)) {
  console.error(
    `\nERROR: ${path} not found.\n` +
      `This command must run against the DEV environment, and ${path} doesn't exist yet.\n` +
      `Copy .env.development.example to ${path} and fill in the DEV database's connection strings first — see ENVIRONMENTS.md.\n` +
      `Refusing to continue rather than silently falling back to .env (PLAY).\n`,
  );
  process.exit(1);
}
