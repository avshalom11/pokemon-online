import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/paldea-map-editor
// against the real public/images/paldea-map.png (1402x1122 — verified
// directly from the PNG's own IHDR chunk in Paldea Phase 4, not guessed) and
// approved for production use. Supplied as percentage-space points and
// converted to these pixel coordinates the same way johto-map-config.ts's,
// hoenn-map-config.ts's, sinnoh-map-config.ts's, unova-map-config.ts's,
// kalos-map-config.ts's, alola-map-config.ts's, and galar-map-config.ts's
// own polygons were: x_pixel = round((x_percent/100) * 1402), y_pixel =
// round((y_percent/100) * 1122).
//
// Paldea is a deliberate SIX-zone region (same Kanto/Johto/Hoenn/Sinnoh/
// Unova precedent, unlike five-zone Kalos/Alola/Galar) — Beach IS included
// here, per Paldea Phase 4's own approved design. The global ZoneId type
// (shared/types/zone.ts) is untouched.
//
// Geometry check performed with scripts/validate-map-regions.mjs (the same
// script Hoenn/Sinnoh/Unova/Kalos/Alola/Galar's own polygons were checked
// with) against the converted pixel-space points below:
//   - No polygon was self-intersecting.
//   - No point was out of the 0..1402 / 0..1122 bounds.
//   - No near-duplicate consecutive points.
//   - Two genuine cross-zone edge-crossing pairs were found on grassland's
//     converted polygon and corrected — see "Approved adjustments" below.
//     Every other point is exactly the approved percentage point,
//     converted, unmoved.
//   - After the fix, re-running the script reports zero structural issues
//     (no out-of-bounds points, no near-duplicate points, no
//     self-intersection, no cross-zone edge crossings; 0% rasterized
//     overlap).
//
// Approved adjustments (2 single-point nudges, each the smallest offset
// found — by exhaustively searching every integer-pixel offset in
// increasing distance order around the offending point for the nearest
// position that clears the real bounded-segment intersection, the same
// "smallest offset that clears the real crossing test" method
// alola-map-config.ts's and galar-map-config.ts's own point nudges used;
// nudging the OTHER zone's shared point instead was also tried for both
// cases and required a strictly larger offset — or, for cave, no
// single-point offset within a 60px search radius cleared it at all — so
// grassland's own points were nudged in both cases):
//   - grassland's 2nd point (approved 17,26 -> converted 238,292) sat
//     across beach's shared boundary edge (beach's own point 0-1 edge,
//     336,258 -> 196,348), causing grassland's edges 0-1 and 1-2 to cross
//     it. Nudged to 252,312 (~24.41px) — pulled forward along grassland's
//     own silhouette, away from beach's boundary. No other point in
//     grassland or beach was touched.
//   - grassland's 7th point (approved 5,64 -> converted 70,718) sat across
//     cave's shared closing boundary edge (cave's own point 14-0 edge,
//     168,673 -> 56,696), causing grassland's edges 5-6 and 6-7 to cross
//     it. Nudged to 65,694 (~24.52px) — pulled back into grassland's own
//     territory, away from cave's boundary corner. No other point in
//     grassland or cave was touched.
//   - Both nudges preserve the polygon's overall shape (15 points, same
//     silhouette) and are visually indistinguishable from the original
//     clicked points at map scale.
//
// Coverage: all six zone ids (grassland/water/cave/lava/haunted-house/
// beach) have a real polygon here — every point below came from an actual
// click against the real image via the editor except the two grassland
// adjustments documented above, which were never invented from scratch —
// each is the original clicked point nudged the minimum distance needed to
// clear a real, validator-confirmed crossing against a neighboring zone's
// shared boundary.
//
// Paldea has NO zone encounter data yet (data/zones/paldea-zone-data.ts
// does not exist) — app/(game)/battle/page.tsx's region gate checks
// getZoneData(regionId).length === 0 (not mapConfig presence), so Paldea's
// map can render interactively once wired into the Region Registry while
// battles stay correctly blocked, the same "map before encounters" window
// Hoenn, Sinnoh, and (briefly) Kalos/Alola/Galar already went through
// between their own map-config and encounter-table phases (Paldea Phase 6).
export const PALDEA_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/paldea-map.png",

  viewBox: {
    width: 1402,
    height: 1122,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "379,247 252,312 182,381 210,449 168,550 84,628 65,694 154,651 266,662 393,707 365,606 379,539 393,494 435,426 491,359",
    },
    {
      zoneId: "water",
      points: "56,965 0,1111 1388,1111 1360,898 1136,1055 939,1055 771,965 687,875 729,797 869,741 953,617 967,505 799,438 673,370 659,325 729,258 799,168 855,90 897,0 687,11 449,22 379,11 365,157 393,224 449,269 463,314 519,337 547,393 505,426 463,494 435,561 407,640 449,684 505,707 575,763 645,797 673,853 659,909 617,976 547,1032 421,1066 280,1077 154,1043 84,999",
    },
    {
      zoneId: "cave",
      points: "56,696 84,741 70,797 70,853 70,942 168,1010 266,1032 435,1021 519,987 589,920 631,830 491,763 379,729 210,696 168,673",
    },
    {
      zoneId: "lava",
      points: "911,90 855,157 799,202 729,314 701,337 855,393 953,426 1023,471 1136,438 1220,415 1262,449 1318,381 1360,303 1332,213 1290,157 1220,101",
    },
    {
      zoneId: "haunted-house",
      points: "1009,494 1023,583 953,651 939,707 883,774 785,819 729,853 799,954 939,1021 1066,1032 1206,976 1290,909 1346,808 1332,595 1346,482 1192,426",
    },
    {
      zoneId: "beach",
      points: "336,258 196,348 154,404 196,482 56,628 14,628 0,11 196,11",
    },
  ],
};
