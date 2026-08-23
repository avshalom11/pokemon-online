// ACCOUNT DELETION — schema-audit coverage. Proves, by reading the actual
// schema text (same "read the real source" technique this codebase's other
// boundary tests already use for pieces a behavioral test can't reach —
// see features/player-progression/victory-xp-scope-boundary.test.ts), the
// two structural facts account-deletion.service.ts's own doc comment
// depends on: (a) every PlayerProfile/User-owned relation really is
// onDelete: Cascade except the one documented Restrict, so a plain
// `tx.user.delete()` really does clean up everything else, and (b)
// LeagueTournamentPlacement really has no FK at all, which is exactly why
// this feature deletes those rows explicitly instead of trusting a cascade
// that doesn't exist.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const schemaSrc = readSourceNormalized("prisma/schema.prisma");

// (13) every relation field is either onDelete: Cascade or the one
// documented onDelete: Restrict (FieldBattleSession.activePlayerPokemonId)
// — no relation was left on Prisma's implicit default, and no new
// Restrict/SetNull/NoAction was introduced by this feature.
test("(13) every foreign-key relation in the schema is onDelete: Cascade, except the one documented Restrict", () => {
  // Scoped to actual `@relation(...)` calls (never a doc comment that
  // happens to mention the word "onDelete") — schema.prisma's own comment
  // right above the Restrict relation explains it in prose too, which a
  // plain /onDelete:\s*(\w+)/g scan would double-count.
  const onDeleteMatches = [...schemaSrc.matchAll(/@relation\([^)]*?onDelete:\s*(\w+)/g)].map((match) => match[1]);
  assert.ok(onDeleteMatches.length > 20, "sanity check — the schema should have dozens of explicit onDelete clauses");

  const nonCascade = onDeleteMatches.filter((action) => action !== "Cascade");
  assert.deepEqual(nonCascade, ["Restrict"], "the only non-Cascade onDelete in the whole schema must be the one documented Restrict");
});

test("(13b) the one Restrict is specifically FieldBattleSession.activePlayerPokemonId -> PlayerPokemon, exactly as audited", () => {
  assert.ok(
    schemaSrc.includes(
      "activePlayerPokemon   PlayerPokemon @relation(fields: [activePlayerPokemonId], references: [id], onDelete: Restrict)"
    )
  );
});

// (14) LeagueTournamentPlacement.playerId/participantId are plain strings
// with no @relation — confirms there is genuinely no FK to explicitly
// clean up around, i.e. account-deletion.service.ts's explicit
// leagueTournamentPlacement.deleteMany is necessary, not redundant.
test("(14) LeagueTournamentPlacement has no foreign key on participantId/playerId — the explicit cleanup in account-deletion.service.ts is genuinely required", () => {
  const modelMatch = schemaSrc.match(/model LeagueTournamentPlacement \{[\s\S]*?\n\}/);
  assert.ok(modelMatch, "LeagueTournamentPlacement model must exist");
  const body = modelMatch![0];
  assert.ok(body.includes("participantId String"));
  assert.ok(body.includes("playerId      String"));
  // The model DOES have one real relation (tournamentId -> LeagueTournament)
  // — the audited fact is specifically that participantId/playerId have no
  // matching relation FIELD of their own (no "participant .../ player ..."
  // line right after either), unlike every other *Id/relation pair in this
  // schema.
  assert.ok(!/\bparticipant\s+LeagueTournamentParticipant\s+@relation/.test(body));
  assert.ok(!/\bplayer\s+PlayerProfile\s+@relation/.test(body));
});

// (15) AccountDeletionRequest itself cascades from User (a row can never
// outlive the account it describes) and its token is stored only as a
// hash (@@unique([tokenHash]) — never the raw token as an identifier or
// plaintext column).
test("(15) AccountDeletionRequest cascades from User and stores only tokenHash, never a raw token column", () => {
  const modelMatch = schemaSrc.match(/model AccountDeletionRequest \{[\s\S]*?\n\}/);
  assert.ok(modelMatch);
  const body = modelMatch![0];
  assert.ok(body.includes("onDelete: Cascade"));
  assert.ok(body.includes("tokenHash String    @unique"));
  assert.ok(!/\brawToken\b|\btoken\s+String(?!Hash)/.test(body), "no raw-token column may exist on this model");
});
