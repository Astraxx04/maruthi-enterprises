"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { useCart } from "./cart-context";
import { useToast } from "./toast";
import { QuantityInput } from "./quantity-input";
import { ProductImage } from "./product-image";

type FormState = {
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  remarks: string;
};

const EMPTY_FORM: FormState = {
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  remarks: "",
};

type Submitted = { reference: string; lines: number; units: number; email: string };

export function EnquiryClient({ products }: { products: ProductWithCategory[] }) {
  const { lines, ready, setQuantity, remove, clear, totalUnits } = useCart();
  const { notify } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // Spam heuristics: forms completed in under a couple of seconds are bots.
  const startedAt = useRef<number>(Date.now());
  const clientToken = useRef<string>("");
  if (!clientToken.current) {
    clientToken.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const selected = useMemo(
    () =>
      lines
        .map((line) => ({ line, product: byId.get(line.productId) }))
        .filter((entry): entry is { line: typeof entry.line; product: ProductWithCategory } =>
          Boolean(entry.product),
        ),
    [lines, byId],
  );

  // Drop anything that was removed from the catalogue since the cart was saved.
  useEffect(() => {
    if (!ready || products.length === 0) return;
    for (const line of lines) {
      if (!byId.has(line.productId)) remove(line.productId);
    }
  }, [ready, lines, byId, products.length, remove]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);
    setErrors({});

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          website: honeypot,
          started_at: startedAt.current,
          client_token: clientToken.current,
          items: selected.map(({ line }) => ({ product_id: line.productId, quantity: line.quantity })),
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        fields?: Record<string, string>;
        reference?: string;
      };

      if (!response.ok || !payload.ok) {
        if (payload.fields) setErrors(payload.fields);
        setFormError(payload.error || "We could not submit your enquiry. Please try again.");
        return;
      }

      setSubmitted({
        reference: payload.reference ?? "",
        lines: selected.length,
        units: totalUnits,
        email: form.email,
      });
      clear();
      setForm(EMPTY_FORM);
      notify("Enquiry submitted successfully");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <SuccessPanel result={submitted} />;

  if (!ready) {
    return (
      <div className="grid gap-5 py-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-xl2 bg-surface-2" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl2 bg-surface-2" />
      </div>
    );
  }

  if (selected.length === 0) return <EmptyPanel />;

  return (
    <div className="grid items-start gap-8 pb-16 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
      {/* Selected products */}
      <section aria-labelledby="selected-heading">
        <div className="flex items-center justify-between">
          <h2 id="selected-heading" className="text-lg font-semibold text-ink">
            Selected products ({selected.length})
          </h2>
          <button
            type="button"
            onClick={() => {
              clear();
              notify("Enquiry cleared");
            }}
            className="text-sm font-medium text-muted transition-colors hover:text-[#b4253c]"
          >
            Clear all
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {selected.map(({ line, product }) => (
            <li
              key={product.id}
              className="flex gap-4 rounded-xl2 border border-line bg-white p-3 shadow-card sm:p-4"
            >
              <Link href={`/products/${product.slug}`} className="w-20 shrink-0 overflow-hidden rounded-lg sm:w-24">
                <ProductImage src={product.image_url} alt={product.name} sizes="96px" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-600">
                      {product.category?.name}
                      {product.brand ? <span className="ml-1.5 normal-case tracking-normal text-muted">· {product.brand}</span> : null}
                    </p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-ink">
                      <Link href={`/products/${product.slug}`} className="hover:text-brand-700">
                        {product.name}
                      </Link>
                    </h3>
                    {product.pack_size && (
                      <p className="mt-0.5 truncate text-xs text-muted">Sizes: {product.pack_size}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      remove(product.id);
                      notify(`${product.name} removed`);
                    }}
                    aria-label={`Remove ${product.name} from enquiry`}
                    className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-[#b4253c]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <QuantityInput
                    value={line.quantity}
                    onChange={(value) => setQuantity(product.id, value)}
                    label={`Quantity for ${product.name}`}
                    size="sm"
                  />
                  <span className="text-xs text-muted">units</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Link href="/products" className="btn btn-secondary btn-sm mt-5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Add more products
        </Link>
      </section>

      {/* Form */}
      <section aria-labelledby="form-heading" className="lg:sticky lg:top-24">
        <form onSubmit={handleSubmit} noValidate className="rounded-xl2 border border-line bg-white p-5 shadow-card sm:p-6">
          <h2 id="form-heading" className="text-lg font-semibold text-ink">Your details</h2>
          <p className="mt-1 text-sm text-muted">
            We only use these details to send your quotation. No account needed.
          </p>

          <div className="mt-5 space-y-4">
            <Field
              id="company_name"
              label="Pharma / Company name"
              required
              value={form.company_name}
              error={errors.company_name}
              autoComplete="organization"
              placeholder="ABC Pharma Distributors"
              onChange={(value) => update("company_name", value)}
            />
            <Field
              id="contact_person"
              label="Contact person"
              required
              value={form.contact_person}
              error={errors.contact_person}
              autoComplete="name"
              placeholder="Rahul Sharma"
              onChange={(value) => update("contact_person", value)}
            />
            <Field
              id="phone"
              label="Phone number"
              required
              type="tel"
              inputMode="tel"
              value={form.phone}
              error={errors.phone}
              autoComplete="tel"
              placeholder="9876543210"
              onChange={(value) => update("phone", value)}
            />
            <Field
              id="email"
              label="Email address"
              required
              type="email"
              inputMode="email"
              value={form.email}
              error={errors.email}
              autoComplete="email"
              placeholder="rahul@abcpharma.com"
              onChange={(value) => update("email", value)}
            />

            <div>
              <label htmlFor="remarks" className="label">
                Additional requirements or remarks <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="remarks"
                rows={3}
                value={form.remarks}
                maxLength={2000}
                placeholder="Please share your best quotation, delivery timelines, etc."
                onChange={(event) => update("remarks", event.target.value)}
                className="field resize-y"
              />
            </div>

            {/* Honeypot — hidden from people, irresistible to bots. */}
            <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm">
            <div className="flex items-center justify-between text-ink-soft">
              <span>Products</span>
              <span className="font-semibold text-ink">{selected.length}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-ink-soft">
              <span>Total units requested</span>
              <span className="font-semibold text-ink">{totalUnits.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-4 rounded-lg bg-[#fdecef] px-3.5 py-2.5 text-sm font-medium text-[#b4253c]">
              {formError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary mt-5 w-full py-3.5">
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit Enquiry"
            )}
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            No payment is taken on this website. Submitting sends your requirement to our sales desk.
          </p>
        </form>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-[#b4253c]">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`field ${error ? "field-error" : ""}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-[#b4253c]">
          {error}
        </p>
      )}
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="animate-fade rounded-xl2 border border-dashed border-line bg-surface px-6 py-20 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-muted shadow-card">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 3h6l1 4H8l1-4Z" />
          <path d="M5 7h14l-1.2 12.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">Your enquiry is empty</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Browse the catalogue, set the quantities you need and add them here. You can combine as many products as
        you like into a single enquiry.
      </p>
      <Link href="/products" className="btn btn-primary mt-6">Explore Catalogue</Link>
    </div>
  );
}

function SuccessPanel({ result }: { result: Submitted }) {
  return (
    <div className="animate-rise mx-auto max-w-xl rounded-xl2 border border-brand-200 bg-brand-50/60 px-6 py-14 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white shadow-lift">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12.5 9 17.5 20 6.5" />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-ink">Enquiry submitted</h2>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-ink-soft">
        Thank you — our sales desk has received your requirement for{" "}
        <strong>{result.lines} product{result.lines === 1 ? "" : "s"}</strong> ({result.units.toLocaleString("en-IN")}{" "}
        units). We will respond to <strong>{result.email}</strong> with a quotation, usually within 48 hours.
      </p>
      {result.reference && (
        <p className="mt-4 inline-block rounded-lg border border-brand-200 bg-white px-3.5 py-2 font-mono text-xs text-ink-soft">
          Reference: {result.reference.slice(0, 8).toUpperCase()}
        </p>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">Browse more products</Link>
        <Link href="/" className="btn btn-secondary">Back to home</Link>
      </div>
    </div>
  );
}
