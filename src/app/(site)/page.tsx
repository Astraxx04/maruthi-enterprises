import Link from "next/link";
import { getCategories, getProducts } from "@/lib/store";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { site } from "@/lib/site";

export const revalidate = 300;

const strengths = [
  {
    title: "Genuine branded stock",
    body: "Every product is sourced through authorised channels, so what reaches your counter is the real thing.",
    icon: "shield",
  },
  {
    title: "Counter-ready packs",
    body: "Single units, sachets, jars and bulk boxes — the pack sizes retail counters actually move.",
    icon: "box",
  },
  {
    title: "Order any quantity",
    body: "No minimum, no maximum. Tell us what you need and we confirm pricing and availability.",
    icon: "clock",
  },
];

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const featured = products.filter((product) => product.featured).slice(0, 8);
  const showcase = featured.length > 0 ? featured : products.slice(0, 8);
  const countFor = (categoryId: string) => products.filter((p) => p.category_id === categoryId).length;
  const brandCount = new Set(products.map((product) => product.brand).filter(Boolean)).size;

  const stats = [
    { value: String(products.length), label: "Products in the catalogue" },
    { value: `${brandCount}+`, label: "Brands distributed" },
    { value: String(categories.length), label: "Product categories" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-50/70 to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand-200/35 blur-3xl"
        />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-rise">
            <p className="eyebrow">OTC healthcare · Ayurvedic · Personal care</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] text-ink sm:text-5xl lg:text-[3.4rem]">
              Quality Products.<br />
              <span className="text-brand-700">Reliable Supply.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {site.shortDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary px-6 py-3.5">
                Explore Catalogue
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/contact" className="btn btn-secondary px-6 py-3.5">Talk to our team</Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-7">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-2xl font-bold text-ink">{stat.value}</span>
                    <span className="mt-1 block text-xs leading-snug text-muted">{stat.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product collage */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {showcase.slice(0, 4).map((product, index) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={`group overflow-hidden rounded-xl2 border border-line bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
                    index % 2 === 1 ? "translate-y-7" : ""
                  }`}
                >
                  <ProductImage src={product.image_url} alt={product.name} sizes="240px" priority={index < 2} />
                  <div className="p-3.5">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-600">
                      {product.category?.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-ink">{product.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section className="container-page py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {strengths.map((item) => (
            <div key={item.title} className="card p-6 transition-shadow hover:shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name={item.icon} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container-page py-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Featured</p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Frequently ordered products</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Add the quantities you need — you can combine as many products as you like into one enquiry.
            </p>
          </div>
          <Link href="/products" className="btn btn-secondary btn-sm">
            View full catalogue
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {showcase.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-14">
        <div className="text-center">
          <p className="eyebrow">Categories</p>
          <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Browse by product category</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            {categories.length} categories covering everyday counter stock for pharmacies, medical shops and
            general stores.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group flex flex-col justify-between rounded-xl2 border border-line bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
            >
              <div>
                <h3 className="text-base font-semibold text-ink group-hover:text-brand-700">{category.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{category.description}</p>
              </div>
              <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                {countFor(category.id)} products
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="border-y border-line bg-surface">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">About us</p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
              A distribution partner institutional buyers can plan around
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
              {site.name} supplies pharmacies, medical shops, general stores and supermarkets across Bengaluru.
              We carry {products.length} fast-moving products from {brandCount}+ trusted brands — pain balms,
              ayurvedic remedies, skin and hair care, first aid, baby care and everyday personal care.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
              Because rates move with volume and scheme, we quote on request rather than listing prices. Build
              your list in the catalogue, send it across, and our team responds with a detailed quotation.
            </p>
            <Link href="/about" className="btn btn-secondary mt-7">Read more about us</Link>
          </div>

          <ol className="grid gap-4">
            {[
              { step: "01", title: "Browse the catalogue", body: "Search or filter by category to find what you need." },
              { step: "02", title: "Set your quantities", body: "Add any number of products with the quantities you require." },
              { step: "03", title: "Send the enquiry", body: "Share your contact details — no account or payment needed." },
              { step: "04", title: "Receive a quotation", body: "Our team confirms availability and sends you the pricing." },
            ].map((item) => (
              <li key={item.step} className="flex gap-4 rounded-xl2 border border-line bg-white p-5">
                <span className="font-display text-sm font-bold text-brand-500">{item.step}</span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="container-page py-16">
        <div className="overflow-hidden rounded-xl2 border border-brand-700 bg-brand-700 px-7 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to send your requirement?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-100 sm:text-base">
            Build your list in the catalogue and submit a single enquiry. No registration, no payment, no minimum
            order — just tell us what you need and we will get back with our best quotation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="btn bg-white px-6 py-3.5 text-brand-800 hover:bg-brand-50">
              Explore Catalogue
            </Link>
            <a
              href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}
              className="btn border border-brand-400/60 px-6 py-3.5 text-white hover:bg-brand-600"
            >
              Call {site.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "shield") return <svg {...common}><path d="M12 3 20 6v6c0 4.6-3.3 7.8-8 9-4.7-1.2-8-4.4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "box") return <svg {...common}><path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z" /><path d="M3 8.5 12 13l9-4.5M12 13v7" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
}
