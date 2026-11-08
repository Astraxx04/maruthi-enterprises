import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Phone, email and address for ${site.name}. Send a catalogue enquiry or reach the sales desk directly.`,
};

const phoneHref = `tel:${site.phone.replace(/[^+\d]/g, "")}`;
const whatsappHref = `https://wa.me/${site.whatsapp.replace(/[^\d]/g, "")}`;

export default function ContactPage() {
  return (
    <div className="container-page pb-20">
      <header className="py-12 sm:py-16">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Talk to our sales desk</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
          For quotations, the fastest route is the catalogue — add what you need and submit an enquiry. For stock
          checks and anything else, reach us directly using the details below.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ContactCard icon="phone" title="Phone" href={phoneHref} value={site.phone} note={site.hours} />
        <ContactCard icon="mail" title="Email" href={`mailto:${site.email}`} value={site.email} note="Enquiries land here directly" />
        <ContactCard icon="chat" title="WhatsApp" href={whatsappHref} value={site.whatsapp} note="Message us for quick stock checks" external />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-ink">Office &amp; godown</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{site.address}</p>
          <p className="mt-4 text-sm text-muted">{site.gstin}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm mt-6"
          >
            Open in Maps
          </a>
        </div>

        <div className="rounded-xl2 border border-brand-200 bg-brand-50/60 p-6">
          <h2 className="text-base font-semibold text-ink">Need a quotation?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Build your requirement in the catalogue and send it in one enquiry. No login, no payment.
          </p>
          <Link href="/products" className="btn btn-primary btn-sm mt-5 w-full">Explore Catalogue</Link>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  value,
  href,
  note,
  external,
}: {
  icon: "phone" | "mail" | "chat";
  title: string;
  value: string;
  href: string;
  note: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group card min-w-0 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <Icon name={icon} />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-muted">{title}</h2>
      <p className="mt-1 break-all text-base font-semibold text-ink group-hover:text-brand-700">{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </a>
  );
}

function Icon({ name }: { name: "phone" | "mail" | "chat" }) {
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
  if (name === "phone") {
    return <svg {...common}><path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3h1Z" /></svg>;
  }
  if (name === "mail") {
    return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>;
  }
  return <svg {...common}><path d="M20 12a8 8 0 1 1-3.6-6.7" /><path d="M20 4v5h-5" /><path d="M4.5 19.5 6 16" /></svg>;
}
