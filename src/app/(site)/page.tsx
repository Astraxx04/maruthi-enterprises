import Link from "next/link";
import { getCategories, getProducts } from "@/lib/store";
import { ProductImage } from "@/components/product-image";
import { site } from "@/lib/site";

export const revalidate = 300;

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  // One product count and one representative image per category.
  const byCategory = new Map<string, { count: number; image: string | null }>();
  for (const product of products) {
    const entry = byCategory.get(product.category_id) ?? { count: 0, image: null };
    entry.count += 1;
    if (!entry.image && product.image_url) entry.image = product.image_url;
    byCategory.set(product.category_id, entry);
  }

  const phoneHref = `tel:${site.phone.replace(/[^+\d]/g, "")}`;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[30rem] w-[56rem] -translate-x-1/2 rounded-full bg-brand-400/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
        />

        <div className="container-page relative py-20 text-center sm:py-28">
          <p className="animate-rise mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-card/60 px-3.5 py-1.5 text-xs font-medium text-ink-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden="true" />
            Wholesale distributor · Bengaluru
          </p>
          <h1 className="animate-rise mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.05] text-ink sm:text-6xl">
            Quality products.{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-800 bg-clip-text text-transparent">
              Reliable supply.
            </span>
          </h1>
          <p className="animate-rise mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            OTC healthcare, ayurvedic, baby care and personal care products. Pick what you need and we send a
            quotation.
          </p>
          <div className="animate-rise mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="btn btn-primary px-6 py-3.5">
              Browse catalogue
              <Arrow className="h-4 w-4" />
            </Link>
            <a href={phoneHref} className="btn btn-secondary px-6 py-3.5">
              Call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Categories</p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Shop by category</h2>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            All products
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => {
            const info = byCategory.get(category.id);
            return (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative flex items-center gap-4 overflow-hidden rounded-xl2 border border-line bg-card p-3 pr-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
              >
                <div className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-28">
                  <ProductImage
                    src={info?.image ?? null}
                    alt=""
                    sizes="112px"
                    priority={index < 3}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-ink transition-colors group-hover:text-brand-700">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {info?.count ?? 0} {info?.count === 1 ? "product" : "products"}
                  </p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-all group-hover:border-brand-400 group-hover:bg-brand-400 group-hover:text-[#04201b]">
                  <Arrow className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
