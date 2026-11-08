import { CatalogueBuilder } from "@/components/admin/catalogue-builder";
import { catalogueBuilderAvailable, listGenerated, listTemplates } from "@/lib/catalogue-build";
import { getCategories, getProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminCataloguePage() {
  const available = catalogueBuilderAvailable();
  const [templates, categories, products, generated] = await Promise.all([
    listTemplates(),
    getCategories(),
    getProducts(),
    listGenerated(),
  ]);

  const counts: Record<string, number> = {};
  for (const product of products) {
    const name = categories.find((category) => category.id === product.category_id)?.name;
    if (name) counts[name] = (counts[name] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Printable catalogue</h1>
      <p className="mt-1 text-sm text-muted">
        Generate a print-ready PDF from the catalogue as it stands right now — {products.length}{" "}
        products across {categories.length} categories.
      </p>

      {!available ? (
        <p className="mt-6 rounded-xl2 border border-[#f0d8a8] bg-[#fdf6e8] px-4 py-4 text-sm text-[#7a5a14]">
          The catalogue builder is not available in this deployment. It needs the project files and
          Google Chrome on the server, so it works when the site runs on your own machine or a VPS,
          but not on a serverless host. From a terminal you can always run{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">npm run catalogue:pdf</code>.
        </p>
      ) : (
        <div className="mt-6">
          <CatalogueBuilder
            templates={templates}
            categories={categories.map((category) => category.name)}
            counts={counts}
            featuredCount={products.filter((product) => product.featured).length}
            totalCount={products.length}
            generated={generated.slice(0, 12)}
          />
        </div>
      )}
    </div>
  );
}
