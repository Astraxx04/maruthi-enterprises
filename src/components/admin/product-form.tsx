"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Category, Product } from "@/lib/types";
import type { Unit } from "@/lib/pack-sizes";
import { saveProductAction, type ActionState } from "@/app/admin/actions";
import { PackSizeEditor } from "./pack-size-editor";

export function ProductForm({
  categories,
  product,
  units,
}: {
  categories: Category[];
  product?: Product;
  units: Unit[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveProductAction, {});
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setUploadError(payload.error || "Upload failed");
        return;
      }
      setImageUrl(payload.url);
    } catch {
      setUploadError("Upload failed — check your connection");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-5">
        <section className="rounded-xl2 border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">Product details</h2>

          <div className="mt-4 space-y-4">
            <Field
              name="name"
              label="Product name"
              required
              defaultValue={product?.name}
              error={state.fields?.name}
              placeholder="Paracetamol 650 mg Tablets"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="brand"
                label="Brand / manufacturer"
                defaultValue={product?.brand ?? ""}
                error={state.fields?.brand}
                placeholder="Maruthi Generics"
              />
              <div>
                <label htmlFor="category_id" className="label">Category <span className="text-[#b4253c]">*</span></label>
                <select
                  id="category_id"
                  name="category_id"
                  required
                  defaultValue={product?.category_id ?? ""}
                  className={`field cursor-pointer ${state.fields?.category_id ? "field-error" : ""}`}
                >
                  <option value="" disabled>Choose a category…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {state.fields?.category_id && (
                  <p className="mt-1.5 text-xs font-medium text-[#b4253c]">{state.fields.category_id}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="label">Short description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={product?.description ?? ""}
                placeholder="Shown on the product card and detail page."
                className="field resize-y"
              />
            </div>

            <PackSizeEditor name="pack_size" defaultValue={product?.pack_size ?? null} units={units} />
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl2 border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">Product image</h2>

          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={imageUrl || "/images/placeholder.svg"}
                alt=""
                fill
                sizes="320px"
                className="object-cover"
                unoptimized={imageUrl.startsWith("/uploads/")}
              />
            </div>
          </div>

          <input type="hidden" name="image_url" value={imageUrl} />

          <label className="btn btn-secondary btn-sm mt-3 w-full cursor-pointer">
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>

          <div className="mt-3">
            <label htmlFor="image_url_text" className="label">…or paste an image URL</label>
            <input
              id="image_url_text"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…"
              className="field"
            />
          </div>

          {uploadError && <p className="mt-2 text-xs font-medium text-[#b4253c]">{uploadError}</p>}
          <p className="mt-2 text-xs leading-relaxed text-muted">
            JPG, PNG, WebP, AVIF or SVG up to 5 MB. Images are shown in a 4:3 frame — upload at roughly 1200 × 900 px
            for the sharpest result.
          </p>
        </section>

        <section className="rounded-xl2 border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">Visibility</h2>
          <div className="mt-3 space-y-3">
            <Toggle
              name="featured"
              label="Featured"
              hint="Featured products appear on the homepage."
              defaultChecked={product?.featured ?? false}
            />
            <div>
              <label htmlFor="sort_order" className="label">Sort order</label>
              <input
                id="sort_order"
                name="sort_order"
                type="number"
                min={0}
                max={9999}
                defaultValue={product?.sort_order ?? 0}
                className="field"
              />
              <p className="mt-1.5 text-xs text-muted">Lower numbers appear first within a category.</p>
            </div>
          </div>
        </section>

        {state.error && (
          <p role="alert" className="rounded-lg bg-[#fdecef] px-3.5 py-2.5 text-sm font-medium text-[#b4253c]">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <SubmitButton isEdit={Boolean(product)} />
          <Link href="/admin/products" className="btn btn-secondary">Cancel</Link>
        </div>
      </div>
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex-1">
      {pending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
    </button>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  required,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-[#b4253c]">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`field ${error ? "field-error" : ""}`}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-[#b4253c]">{error}</p>}
    </div>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 transition-colors hover:border-brand-300">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>
      </span>
    </label>
  );
}
