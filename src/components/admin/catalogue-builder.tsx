"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Template } from "@/lib/catalogue-build";

type Generated = { name: string; bytes: number; builtAt: string };
type Result = {
  template: string;
  templateLabel: string;
  products: number;
  pages: number;
  bytes: number;
  pdf: string;
};

export function CatalogueBuilder({
  templates,
  categories,
  counts,
  featuredCount,
  totalCount,
  generated,
}: {
  templates: Template[];
  categories: string[];
  counts: Record<string, number>;
  featuredCount: number;
  totalCount: number;
  generated: Generated[];
}) {
  const [template, setTemplate] = useState(templates[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [fileName, setFileName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState(generated);

  const selected = templates.find((item) => item.id === template);

  // Rough page count so the choice of template is not a surprise.
  const estimate = useMemo(() => {
    const included = onlyFeatured ? featuredCount : category ? (counts[category] ?? 0) : totalCount;
    const perPage = selected?.perPage ?? 1;
    return { included, pages: Math.ceil(included / perPage) + 1 };
  }, [onlyFeatured, featuredCount, category, counts, totalCount, selected]);

  const generate = async () => {
    if (busy || !template) return;
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          category: category || null,
          onlyFeatured,
          fileName: fileName.trim() || null,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; result?: Result };

      if (!response.ok || !payload.ok || !payload.result) {
        setError(payload.error || "The catalogue could not be generated.");
        return;
      }

      setResult(payload.result);
      setHistory((current) => [
        { name: payload.result!.pdf, bytes: payload.result!.bytes, builtAt: new Date().toISOString() },
        ...current.filter((item) => item.name !== payload.result!.pdf),
      ]);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const href = (file: string, download = false) =>
    `/api/admin/catalogue/download?file=${encodeURIComponent(file)}${download ? "&dl=1" : ""}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      {/* Template picker */}
      <section className="min-w-0 rounded-xl2 border border-line bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">1. Choose a template</h2>
        <p className="mt-1 text-sm text-muted">Each one is a folder in catalogue-print/templates.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {templates.map((item) => {
            const active = item.id === template;
            return (
              <label
                key={item.id}
                className={`flex min-w-0 cursor-pointer gap-3 rounded-xl border p-3 transition-all ${
                  active
                    ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-300"
                    : "border-line hover:border-brand-300"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={item.id}
                  checked={active}
                  onChange={() => setTemplate(item.id)}
                  className="sr-only"
                />

                <span className="relative block h-[4.6rem] w-[3.25rem] shrink-0 overflow-hidden rounded-md border border-line bg-surface sm:h-[7.5rem] sm:w-[5.3rem]">
                  {item.preview ? (
                    <Image src={item.preview} alt="" fill sizes="85px" className="object-cover object-top" />
                  ) : (
                    <span className="grid h-full place-items-center text-[0.6rem] text-muted">
                      {item.columns}×{item.rows}
                    </span>
                  )}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{item.name}</span>
                  <span className="mt-0.5 block text-[0.6875rem] font-medium uppercase tracking-wide text-brand-600">
                    {item.perPage} per page
                  </span>
                  <span className="mt-1 line-clamp-3 block text-xs leading-relaxed text-muted">
                    {item.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Options + action */}
      <section className="min-w-0 rounded-xl2 border border-line bg-white p-4 sm:p-5 lg:sticky lg:top-6">
        <h2 className="text-base font-semibold text-ink">2. What to include</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={onlyFeatured}
              className="field cursor-pointer disabled:opacity-50"
            >
              <option value="">All categories ({totalCount} products)</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name} ({counts[name] ?? 0})
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 transition-colors hover:border-brand-300">
            <input
              type="checkbox"
              checked={onlyFeatured}
              onChange={(event) => setOnlyFeatured(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">Featured products only</span>
              <span className="mt-0.5 block text-xs text-muted">
                {featuredCount} products — good for a short leave-behind.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="fileName" className="label">
              File name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="Hair-Care-Range"
              className="field"
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm">
          <div className="flex items-center justify-between text-ink-soft">
            <span>Products</span>
            <span className="font-semibold text-ink">{estimate.included}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-ink-soft">
            <span>Pages (about)</span>
            <span className="font-semibold text-ink">{estimate.pages}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-[#fdecef] px-3.5 py-2.5 text-sm font-medium text-[#b4253c]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={busy || estimate.included === 0}
          className="btn btn-primary mt-5 w-full py-3.5"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              Generating…
            </>
          ) : (
            "Generate PDF"
          )}
        </button>

        {result && (
          <div className="animate-rise mt-4 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
            <p className="text-sm font-semibold text-ink">{result.templateLabel} is ready</p>
            <p className="mt-1 text-xs text-muted">
              {result.products} products · {result.pages} pages · {(result.bytes / 1024 / 1024).toFixed(1)} MB
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={href(result.pdf)} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                Open PDF
              </a>
              <a href={href(result.pdf)} download={result.pdf} className="btn btn-secondary btn-sm">
                Download
              </a>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent builds</h3>
            <ul className="mt-2.5 space-y-1.5">
              {history.slice(0, 6).map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 text-xs">
                  <a
                    href={href(item.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-brand-700 hover:underline"
                  >
                    {item.name}
                  </a>
                  <span className="shrink-0 text-muted">{(item.bytes / 1024 / 1024).toFixed(1)} MB</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
