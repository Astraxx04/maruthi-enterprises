import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getCategories, getProducts } from "@/lib/store";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "About Us",
  description: `${site.name} supplies pharmaceutical, surgical and healthcare products to pharmacies, hospitals and institutional buyers.`,
};

const values = [
  { title: "Genuine branded stock", body: "Everything we carry comes through authorised channels, so what reaches your counter is the real thing." },
  { title: "Transparent quoting", body: "Rates move with volume and scheme, so we quote per enquiry instead of publishing a list price." },
  { title: "Any quantity, no minimum", body: "Order a single box or a full carton — the catalogue is for discovering products, not meeting a target." },
  { title: "Long-term relationships", body: "Most of our business comes from shops that have reordered with us for years." },
];

export default async function AboutPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <div className="container-page pb-20">
      <header className="py-12 sm:py-16">
        <p className="eyebrow">About us</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
          A distribution partner institutional buyers can plan around
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
          {site.name} is a Bengaluru-based distributor of over-the-counter healthcare, ayurvedic, baby care and
          personal care products. We supply pharmacies, medical shops, general stores and supermarkets, and we
          built this catalogue so buyers can put together a complete requirement in a few minutes and receive one
          consolidated quotation.
        </p>
      </header>

      <dl className="grid gap-4 border-y border-line py-8 sm:grid-cols-3">
        <Stat value={String(categories.length)} label="Supply categories" />
        <Stat value={`${new Set(products.map((p) => p.brand).filter(Boolean)).size}+`} label="Brands distributed" />
      </dl>

      <section className="py-14">
        <h2 className="text-2xl font-bold text-ink">What we stand for</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.title} className="card p-6">
              <h3 className="text-base font-semibold text-ink">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl2 border border-line bg-surface p-7 sm:p-10">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">Who we supply</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Pharmacies & medical shops", "General and kirana stores", "Supermarkets & retail chains", "Clinics and nursing homes"].map(
            (item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12.5 9 17.5 20 6.5" />
                </svg>
                {item}
              </li>
            ),
          )}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-primary">Explore Catalogue</Link>
          <Link href="/contact" className="btn btn-secondary">Contact our team</Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-3xl font-bold text-ink">{value}</span>
        <span className="mt-1 block text-sm text-muted">{label}</span>
      </dd>
    </div>
  );
}
