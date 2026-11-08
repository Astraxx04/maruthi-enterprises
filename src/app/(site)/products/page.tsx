import type { Metadata } from "next";
import { Catalogue } from "@/components/catalogue";
import { getCategories, getProducts } from "@/lib/store";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Product Catalogue",
  description:
    "Browse the full Maruthi Enterprises catalogue — pain balms, ayurvedic remedies, skin and hair care, oral care, first aid, baby care and everyday personal care. Add quantities and send a single enquiry.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const [{ category, q }, products, categories] = await Promise.all([
    searchParams,
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="container-page pb-20">
      <header className="py-10 sm:py-12">
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">All products</h1>
      </header>

      <Catalogue
        products={products}
        categories={categories}
        initialCategory={category ?? "all"}
        initialQuery={q ?? ""}
      />
    </div>
  );
}
