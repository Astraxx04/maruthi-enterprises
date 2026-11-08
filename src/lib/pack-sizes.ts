/**
 * Pack sizes are stored as one string — "9 ml · 30 ml · 50 ml" — because that
 * is what the catalogue, the product pages and the print templates all read.
 * The admin edits them as a list of chips; these helpers move between the two.
 */

export type Unit = {
  /** What is stored, e.g. "ml". */
  id: string;
  /** What the picker shows. */
  label: string;
  /** Whether a space goes between the number and the unit: 9 ml, but 60's. */
  spaced: boolean;
};

export const DEFAULT_UNITS: Unit[] = [
  { id: "ml", label: "ml — millilitre", spaced: true },
  { id: "L", label: "L — litre", spaced: true },
  { id: "g", label: "g — gram", spaced: true },
  { id: "kg", label: "kg — kilogram", spaced: true },
  { id: "mg", label: "mg — milligram", spaced: true },
  { id: "'s", label: "'s — count (60's)", spaced: false },
  { id: "/-", label: "/- — price pack (₹10/-)", spaced: false },
  { id: "pcs", label: "pcs — pieces", spaced: true },
  { id: "strips", label: "strips", spaced: true },
  { id: "sachets", label: "sachets", spaced: true },
  { id: "tablets", label: "tablets", spaced: true },
  { id: "capsules", label: "capsules", spaced: true },
  { id: "sheets", label: "sheets", spaced: true },
  { id: "wipes", label: "wipes", spaced: true },
];

export const SEPARATOR = " · ";

/** "9 ml · 30 ml" → ["9 ml", "30 ml"] */
export function parsePackSizes(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s*[·|,]\s*/)
    .map((size) => size.trim())
    .filter(Boolean);
}

export function formatPackSizes(sizes: string[]): string {
  return sizes.join(SEPARATOR);
}

/** Joins a number with its unit the way that unit is written. */
export function composeSize(value: string, unit: Unit | null): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!unit) return trimmed;
  return unit.spaced ? `${trimmed} ${unit.id}` : `${trimmed}${unit.id}`;
}

/** The unit at the end of a size, if there is one: "30 ml" → "ml". */
export function unitOf(size: string): string | null {
  const match = size.trim().match(/^\d+(?:\.\d+)?\s*(.+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Every unit already used in the catalogue, so a unit added for one product is
 * offered on the next one.
 */
export function collectUnits(packSizes: (string | null | undefined)[]): Unit[] {
  const known = new Map(DEFAULT_UNITS.map((unit) => [unit.id, unit]));

  for (const value of packSizes) {
    for (const size of parsePackSizes(value)) {
      const unit = unitOf(size);
      if (!unit || known.has(unit)) continue;
      known.set(unit, {
        id: unit,
        label: unit,
        spaced: /^\s/.test(size.slice(size.search(/\D/))) || !/^['/]/.test(unit),
      });
    }
  }

  return [...known.values()];
}
