import Link from "next/link";
import { Logo } from "./logo";
import { site } from "@/lib/site";
import { getCategories } from "@/lib/store";

export async function SiteFooter() {
  const categories = await getCategories();

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:pr-6">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            A Bengaluru distributor of OTC healthcare, ayurvedic, baby care and personal care products.
          </p>
          <p className="mt-4 text-xs text-muted">{site.gstin}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li><Link href="/products" className="transition-colors hover:text-brand-700">Product catalogue</Link></li>
            <li><Link href="/enquiry" className="transition-colors hover:text-brand-700">Your enquiry</Link></li>
            <li><Link href="/about" className="transition-colors hover:text-brand-700">About us</Link></li>
            <li><Link href="/contact" className="transition-colors hover:text-brand-700">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Categories</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="transition-colors hover:text-brand-700"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Get in touch</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li>
              <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} className="transition-colors hover:text-brand-700">
                {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="break-all transition-colors hover:text-brand-700">
                {site.email}
              </a>
            </li>
            <li className="leading-relaxed">{site.address}</li>
            <li className="text-xs">{site.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Prices are shared on request. This website is a catalogue, not an online store.</p>
        </div>
      </div>
    </footer>
  );
}
