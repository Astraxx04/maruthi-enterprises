"use client";

import { useRef, useState } from "react";
import {
  composeSize,
  formatPackSizes,
  parsePackSizes,
  type Unit,
} from "@/lib/pack-sizes";

const CUSTOM = "__custom__";
const ADD_UNIT = "__add__";

/**
 * Builds the pack-size list from a unit plus one or more numbers, so the admin
 * picks "ml" once and types 9, 30, 50 rather than retyping the unit each time.
 * The value is submitted as a single hidden field, the same shape the rest of
 * the site reads.
 */
/** Matches productSchema's cap on the joined value. */
const MAX_LENGTH = 600;

export function PackSizeEditor({
  name,
  defaultValue,
  units,
  error,
}: {
  name: string;
  defaultValue: string | null;
  units: Unit[];
  error?: string;
}) {
  const [sizes, setSizes] = useState<string[]>(() => parsePackSizes(defaultValue));
  const [unitId, setUnitId] = useState(units[0]?.id ?? CUSTOM);
  const [value, setValue] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [extraUnits, setExtraUnits] = useState<Unit[]>([]);
  const [addingUnit, setAddingUnit] = useState(false);
  const valueRef = useRef<HTMLInputElement>(null);
  const newUnitRef = useRef<HTMLInputElement>(null);

  const allUnits = [...units, ...extraUnits];
  const joined = formatPackSizes(sizes);
  const tooLong = joined.length > MAX_LENGTH;
  const unit = unitId === CUSTOM ? null : allUnits.find((item) => item.id === unitId) ?? null;

  const add = () => {
    // "100, 200 300" adds three sizes in one go.
    const parts = value
      .split(/[,\n]+|\s{2,}/)
      .flatMap((part) => (unit ? part.split(/\s+/) : [part]))
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    setSizes((current) => {
      const next = [...current];
      for (const part of parts) {
        const size = composeSize(part, unit);
        if (size && !next.includes(size)) next.push(size);
      }
      return next;
    });
    setValue("");
    valueRef.current?.focus();
  };

  const confirmUnit = () => {
    const id = newUnit.trim();
    if (!id) return;
    if (!allUnits.some((item) => item.id === id)) {
      setExtraUnits((current) => [...current, { id, label: id, spaced: !/^['/]/.test(id) }]);
    }
    setUnitId(id);
    setNewUnit("");
    setAddingUnit(false);
    valueRef.current?.focus();
  };

  return (
    <div>
      <span className="label">Pack sizes</span>
      <input type="hidden" name={name} value={joined} />

      {/* The list as it stands */}
      {sizes.length > 0 ? (
        <ul className="mb-2.5 flex flex-wrap gap-1.5">
          {sizes.map((size, index) => (
            <li key={size}>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 py-1 pl-2.5 pr-1 text-sm font-medium text-brand-800">
                {size}
                <button
                  type="button"
                  onClick={() => setSizes((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Remove ${size}`}
                  className="grid h-5 w-5 place-items-center rounded-md text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-900"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2.5 rounded-lg border border-dashed border-line bg-surface px-3 py-2 text-xs text-muted">
          No pack sizes yet. Pick a unit, type the numbers and press Add.
        </p>
      )}

      {/* Add a size */}
      <div className="flex flex-wrap items-center gap-2">
        {addingUnit ? (
          <span className="flex items-center gap-1.5">
            <input
              ref={newUnitRef}
              type="text"
              value={newUnit}
              autoFocus
              placeholder="e.g. rolls"
              onChange={(event) => setNewUnit(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmUnit();
                }
                if (event.key === "Escape") setAddingUnit(false);
              }}
              className="field w-32"
              aria-label="New unit"
            />
            <button type="button" onClick={confirmUnit} className="btn btn-secondary btn-sm">Use</button>
            <button
              type="button"
              onClick={() => setAddingUnit(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </span>
        ) : (
          <>
            <label htmlFor={`${name}-unit`} className="sr-only">Unit</label>
            <select
              id={`${name}-unit`}
              value={unitId}
              onChange={(event) => {
                if (event.target.value === ADD_UNIT) {
                  setAddingUnit(true);
                  return;
                }
                setUnitId(event.target.value);
              }}
              className="field w-auto min-w-[9rem] cursor-pointer"
            >
              {allUnits.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
              <option value={CUSTOM}>Free text (no unit)</option>
              <option value={ADD_UNIT}>+ Add a unit…</option>
            </select>

            <input
              ref={valueRef}
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={unit ? "9, 30, 50" : "Strip of 10"}
              aria-label={unit ? `Sizes in ${unit.id}` : "Pack size"}
              className="field min-w-0 flex-1"
            />

            <button type="button" onClick={add} disabled={!value.trim()} className="btn btn-secondary btn-sm">
              Add
            </button>
          </>
        )}
      </div>

      {(error || tooLong) && (
        <p role="alert" className="mt-2 text-xs font-medium text-[#b4253c]">
          {error ??
            `That is ${joined.length} characters of pack sizes — remove a few to get under ${MAX_LENGTH}.`}
        </p>
      )}

      {!error && !tooLong && sizes.length > 12 && (
        <p className="mt-2 text-xs text-muted">
          {sizes.length} sizes · {joined.length} of {MAX_LENGTH} characters used
        </p>
      )}

      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        {unit
          ? `Type several at once — 9, 30, 50 becomes ${composeSize("9", unit)}, ${composeSize("30", unit)}, ${composeSize("50", unit)}.`
          : "Free text is stored exactly as typed — useful for “Strip of 10” or “Soft / Medium / Hard”."}
      </p>
    </div>
  );
}
