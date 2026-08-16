import * as z from "zod";

// A closed enum (not a plain z.string()) — chestTypeId feeds directly into
// openChest's own typed ChestTypeId parameter, so this schema is what
// narrows an arbitrary client string down to that closed union before the
// service ever sees it, the same "structural validation only, catalog
// resolution is the service's job" split every other schema in this
// project follows — except here the closed set IS knowable structurally
// (exactly 3 values, features/chests/data/chest-definitions.ts), so z.enum
// is the correct tool rather than deferring to a service-side throw.
export const openChestSchema = z.object({
  chestTypeId: z.enum(["silver", "gold", "diamond"]),
});
