import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/store";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { AddToEnquiry } from "@/components/add-to-enquiry";
import { site } from "@/lib/site";

export const revalidate = 120;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description ?? `${product.name} available from ${site.name}.`,
    openGraph: { images: product.image_url ? [product.image_url] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getProducts())
    .filter((item) => item.category_id === product.category_id && item.id !== product.id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    image: product.image_url ? [new URL(product.image_url, site.url).toString()] : undefined,
  };

  return (
    <div className="container-page pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 py-6 text-sm text-muted">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="hover:text-brand-700">Products</Link>
        {product.category && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand-700">
              {product.category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="overflow-hidden rounded-xl2 border border-line bg-white shadow-card">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            sizes="(max-width: 1024px) 100vw, 560px"
            priority
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <Link
                href={`/products?category=${product.category.slug}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
              >
                {product.category.name}
              </Link>
            )}
            {product.featured && (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-soft">Featured</span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">{product.name}</h1>
          {product.brand && <p className="mt-2 text-sm text-muted">Brand · {product.brand}</p>}

          {product.description && (
            <p className="mt-5 text-base leading-relaxed text-ink-soft">{product.description}</p>
          )}

          <dl className="mt-7 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            <Detail label="Available sizes" value={product.pack_size} />
            <Detail label="Brand" value={product.brand} />
            <Detail label="Category" value={product.category?.name ?? null} />
            <Detail label="Order quantity" value="Any quantity on request" />
          </dl>

          {product.specifications && (
            <section className="mt-7">
              <h2 className="text-sm font-semibold text-ink">Pack details</h2>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 font-sans text-sm leading-relaxed text-ink-soft">
{product.specifications}
              </pre>
            </section>
          )}

          <div className="mt-8 rounded-xl2 border border-line bg-white p-5 shadow-card">
            <AddToEnquiry product={product} />
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Prices are quoted on request. Adding a product does not place an order — you confirm everything on the
              enquiry page before submitting.
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">More in {product.category?.name}</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}
