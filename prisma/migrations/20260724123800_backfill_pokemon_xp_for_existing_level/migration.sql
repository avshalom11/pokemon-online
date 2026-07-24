-- Data-only migration (no schema change): backfills PlayerPokemon.experience
-- for every existing row so it is never less than the total XP the new
-- Pokémon-progression curve (features/pokemon-progression) requires to reach
-- that row's already-stored `level`. Every existing row currently has
-- experience = 0 (level was always set directly — onboarding/capture set an
-- initial level with no matching XP, and the temporary level-50 Charmander
-- dev setup set level via a raw update) — without this backfill, the very
-- first real battle-XP grant under the new curve would recompute level from
-- experience and immediately drop every owned Pokémon (Charmander's level-50
-- dev setup included) back down to whatever a few hundred XP implies.
--
-- Formula matches getTotalXpRequiredForPokemonLevel's closed form exactly
-- (100 XP per level, triangular sum): 100 * (level - 1) * level / 2.
-- (level - 1) * level is always even, so integer division here is exact.
-- GREATEST(...) is a no-op for any row whose experience already meets or
-- exceeds that threshold, so this is safe to apply uniformly.
UPDATE "player_pokemon"
SET "experience" = GREATEST("experience", (100 * ("level" - 1) * "level") / 2)
WHERE "experience" < (100 * ("level" - 1) * "level") / 2;
