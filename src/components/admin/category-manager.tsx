"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { Category } from "@/lib/types";
import { deleteCategoryAction, saveCategoryAction, type ActionState } from "@/app/admin/actions";

export function CategoryManager({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="overflow-hidden rounded-xl2 border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Category</th>
              <th scope="col" className="px-4 py-3 font-semibold">Products</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-muted">
                  No categories yet — add the first one on the right.
                </td>
              </tr>
            )}
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-surface/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{category.name}</p>
                  {category.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">{category.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{counts[category.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(category)} className="btn btn-secondary btn-sm">
                      Edit
                    </button>
                    <form
                      action={deleteCategoryAction}
                      onSubmit={(event) => {
                        if (!window.confirm(`Delete “${category.name}”?`)) event.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={category.id} />
                      <button
                        type="submit"
                        disabled={(counts[category.id] ?? 0) > 0}
                        title={
                          (counts[category.id] ?? 0) > 0
                            ? "Move or delete the products in this category first"
                            : "Delete category"
                        }
                        className="btn btn-sm border border-line bg-white text-[#b4253c] hover:bg-[#fdecef]"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryForm key={editing?.id ?? "new"} category={editing} onDone={() => setEditing(null)} />
    </div>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(saveCategoryAction, {});

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok, router, onDone]);

  return (
    <form action={formAction} className="rounded-xl2 border border-line bg-white p-5">
      <h2 className="text-base font-semibold text-ink">
        {category ? `Edit “${category.name}”` : "Add a category"}
      </h2>

      {category && <input type="hidden" name="id" value={category.id} />}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="label">Name <span className="text-[#b4253c]">*</span></label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={category?.name ?? ""}
            placeholder="Tablets"
            className={`field ${state.fields?.name ? "field-error" : ""}`}
          />
          {state.fields?.name && <p className="mt-1.5 text-xs font-medium text-[#b4253c]">{state.fields.name}</p>}
        </div>

        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={category?.description ?? ""}
            placeholder="Shown on the homepage category card."
            className="field resize-y"
          />
        </div>

        <div>
          <label htmlFor="sort_order" className="label">Sort order</label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            min={0}
            max={999}
            defaultValue={category?.sort_order ?? 0}
            className="field"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-[#fdecef] px-3.5 py-2.5 text-sm font-medium text-[#b4253c]">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <SaveButton isEdit={Boolean(category)} />
        {category && (
          <button type="button" onClick={onDone} className="btn btn-secondary">Cancel</button>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Renaming a category updates its catalogue link. A category can only be deleted once no products use it.
      </p>
    </form>
  );
}

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex-1">
      {pending ? "Saving…" : isEdit ? "Save changes" : "Add category"}
    </button>
  );
}
