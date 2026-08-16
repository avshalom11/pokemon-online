// Shared deterministic randomness helpers for tests — every production
// roll in this project already accepts an injected `random: () => number`
// seam (see e.g. features/eggs/services/egg-drop-roll.service.ts), so
// tests never need to stub Math.random globally; these two helpers just
// make constructing a controlled sequence of rolls less repetitive across
// test files that need MULTIPLE distinct roll outcomes from one call.

// Returns `values` in order, one per call, then throws once exhausted —
// loud failure on exhaustion is deliberate: it means a test's assumption
// about how many `random()` calls a function under test makes was wrong,
// which should fail the test, not silently return `undefined`.
export function sequenceRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`sequenceRandom exhausted after ${values.length} call(s)`);
    }
    const value = values[index];
    index += 1;
    return value;
  };
}

// Returns `values` in order, then FOREVER returns `pad` afterward — useful
// for controlling only the first few rolls a function under test makes
// (e.g. a mandatory reward's own roll) while making every later,
// unrelated roll deterministically resolve to one fixed value (e.g. always
// failing a 50% bonus-chance check) without having to know or hand-compute
// the exact total number of calls the function will end up making.
export function paddedRandom(values: readonly number[], pad: number): () => number {
  let index = 0;
  return () => {
    if (index < values.length) {
      const value = values[index];
      index += 1;
      return value;
    }
    return pad;
  };
}
