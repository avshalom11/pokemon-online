// TM SYSTEM PHASE 3 — cross-layer invariant check. engine/tm-compatibility
// deliberately never imports from features/tm-system (engine stays a
// general-purpose "species/form <-> move machine compatibility" fact base,
// not coupled to any one feature's shop catalog) — but a TEST is allowed to
// check both layers agree, since the whole point of this project's TM
// system is that only our 54 catalog moves are ever real TMs. If this test
// ever fails, either the harvested data drifted from TM_CATALOG or a future
// TM_CATALOG edit needs matching compatibility data.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getAllTmCompatibilityEntries } from "@/engine/tm-compatibility";
import { TM_CATALOG } from "./tm-catalog";

test("every moveId appearing anywhere in the TM compatibility data is one of TM_CATALOG's 54 moves", () => {
  const catalogMoveIds = new Set(TM_CATALOG.map((entry) => entry.moveId));
  const unexpected = new Set<string>();

  for (const entry of getAllTmCompatibilityEntries()) {
    for (const moveId of entry.moveIds) {
      if (!catalogMoveIds.has(moveId)) unexpected.add(moveId);
    }
  }

  assert.deepEqual([...unexpected], [], `compatibility data references moveId(s) outside TM_CATALOG: ${[...unexpected].join(", ")}`);
});

test("every TM_CATALOG move is referenced by at least one compatible species/form", () => {
  const referencedMoveIds = new Set<string>();
  for (const entry of getAllTmCompatibilityEntries()) {
    for (const moveId of entry.moveIds) referencedMoveIds.add(moveId);
  }

  const neverCompatible = TM_CATALOG.filter((entry) => !referencedMoveIds.has(entry.moveId));
  assert.deepEqual(
    neverCompatible.map((entry) => entry.moveId),
    [],
    "every one of the 54 TM moves should be verified-compatible with at least one species/form"
  );
});
