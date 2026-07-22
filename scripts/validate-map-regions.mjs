#!/usr/bin/env node
// Geometry validation for polygon-based map hit areas (data/maps/*.ts).
// Reads the config file as text and extracts { zoneId, points } pairs via
// regex, so it works without a TypeScript runtime. Usage:
//   node scripts/validate-map-regions.mjs [path/to/config.ts]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(
  process.argv[2] || path.join(__dirname, "../data/maps/world-map-config.ts")
);

const source = readFileSync(configPath, "utf8");

const widthMatch = source.match(/width:\s*(\d+)/);
const heightMatch = source.match(/height:\s*(\d+)/);
const width = widthMatch ? Number(widthMatch[1]) : null;
const height = heightMatch ? Number(heightMatch[1]) : null;

if (!width || !height) {
  console.error("Could not determine viewBox width/height from config file.");
  process.exit(1);
}

const regionPattern = /zoneId:\s*"([^"]+)"\s*,\s*points:\s*"([^"]+)"/g;
const regions = [];
for (const match of source.matchAll(regionPattern)) {
  const [, zoneId, pointsStr] = match;
  const points = pointsStr
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number));
  regions.push({ zoneId, points });
}

if (regions.length === 0) {
  console.error("No regions found in config file.");
  process.exit(1);
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function segIntersect(p1, p2, p3, p4) {
  function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

let issues = 0;

console.log(`Validating ${regions.length} region(s) against viewBox ${width}x${height}\n`);

console.log("== Out-of-bounds points ==");
let outOfBounds = 0;
regions.forEach(({ zoneId, points }, regionIndex) => {
  points.forEach(([x, y], i) => {
    if (x < 0 || x > width || y < 0 || y > height) {
      console.log(`  ${zoneId}[region ${regionIndex}][${i}] = (${x},${y}) is outside 0..${width}/0..${height}`);
      outOfBounds++;
    }
  });
});
if (outOfBounds === 0) console.log("  none");
issues += outOfBounds;

console.log("\n== Duplicate / near-duplicate consecutive points (dist <= 3px, incl. closing edge) ==");
let duplicates = 0;
regions.forEach(({ zoneId, points }, regionIndex) => {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const d = dist(a, b);
    if (d <= 3) {
      console.log(`  ${zoneId}[region ${regionIndex}]: points[${i}]=(${a}) and points[${(i + 1) % n}]=(${b}) dist=${d.toFixed(2)}`);
      duplicates++;
    }
  }
});
if (duplicates === 0) console.log("  none");
issues += duplicates;

console.log("\n== Self-intersecting polygons ==");
let selfIntersections = 0;
regions.forEach(({ zoneId, points }, regionIndex) => {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      const sharesVertex = j === (i + 1) % n || i === (j + 1) % n || i === j;
      if (sharesVertex) continue;
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segIntersect(a1, a2, b1, b2)) {
        console.log(`  ${zoneId}[region ${regionIndex}]: edge ${i}-${(i + 1) % n} crosses edge ${j}-${(j + 1) % n}`);
        selfIntersections++;
      }
    }
  }
});
if (selfIntersections === 0) console.log("  none");
issues += selfIntersections;

console.log("\n== Cross-zone edge crossings (unintended overlaps between different zones) ==");
let crossings = 0;
for (let ri = 0; ri < regions.length; ri++) {
  for (let rj = ri + 1; rj < regions.length; rj++) {
    const a = regions[ri];
    const b = regions[rj];
    for (let i = 0; i < a.points.length; i++) {
      const a1 = a.points[i];
      const a2 = a.points[(i + 1) % a.points.length];
      for (let j = 0; j < b.points.length; j++) {
        const b1 = b.points[j];
        const b2 = b.points[(j + 1) % b.points.length];
        const sharesEndpoint = [a1, a2].some(
          (p) =>
            (p[0] === b1[0] && p[1] === b1[1]) ||
            (p[0] === b2[0] && p[1] === b2[1])
        );
        if (sharesEndpoint) continue;
        if (segIntersect(a1, a2, b1, b2)) {
          console.log(`  ${a.zoneId}[region ${ri}] edge ${i} crosses ${b.zoneId}[region ${rj}] edge ${j}`);
          crossings++;
        }
      }
    }
  }
}
if (crossings === 0) console.log("  none");
issues += crossings;

console.log("\n== Rasterized coverage (suspicious overlaps / uncovered gaps) ==");
const STEP = 3;
let overlapCells = 0;
let gapCells = 0;
let coveredCells = 0;
for (let y = STEP / 2; y < height; y += STEP) {
  for (let x = STEP / 2; x < width; x += STEP) {
    let count = 0;
    for (const region of regions) {
      if (pointInPolygon(x, y, region.points)) count++;
    }
    if (count === 0) gapCells++;
    else if (count >= 2) overlapCells++;
    else coveredCells++;
  }
}
const totalCells = coveredCells + gapCells + overlapCells;
console.log(`  covered=${coveredCells} gap=${gapCells} (${((gapCells / totalCells) * 100).toFixed(2)}%) overlap=${overlapCells} (${((overlapCells / totalCells) * 100).toFixed(2)}%)`);
if (overlapCells > 0) {
  console.log(`  ! ${overlapCells} sample point(s) fall inside more than one zone polygon — a click there could match either zone.`);
}
if (gapCells > 0) {
  console.log(`  ! ${gapCells} sample point(s) fall inside no zone polygon — a click there won't select any zone.`);
}

console.log(`\n${issues === 0 ? "OK" : `${issues} structural issue(s) found`} (bounds/duplicates/self-intersection/cross-zone-crossings). Coverage gaps/overlaps are reported above but are not counted as hard failures.`);

process.exit(issues > 0 ? 1 : 0);
