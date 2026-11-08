import Link from "next/link";
import { getCategories, getEnquiries, getProducts, usingSupabase } from "@/lib/store";
import { channels } from "@/lib/notify";
import { formatDate } from "@/lib/notify/format";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [products, categories, enquiries] = await Promise.all([
    getProducts(),
    getCategories(),
    getEnquiries(),
  ]);

  const newEnquiries = enquiries.filter((enquiry) => enquiry.status === "new").length;
  const channelStatus = channels
    .filter((channel) => channel.name !== "console")
    .map((channel) => ({ name: channel.name, configured: channel.isConfigured() }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Overview</h1>
      <p className="mt-1 text-sm text-muted">Manage the catalogue and review incoming enquiries.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={products.length} href="/admin/products" />
        <Stat label="Categories" value={categories.length} href="/admin/categories" />
        <Stat label="Featured" value={products.filter((product) => product.featured).length} href="/admin/products" />
        <Stat label="New enquiries" value={newEnquiries} href="/admin/enquiries" highlight={newEnquiries > 0} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl2 border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent enquiries</h2>
            <Link href="/admin/enquiries" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>

          {enquiries.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">
              No enquiries yet. They appear here as soon as a customer submits one.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line-soft">
              {enquiries.slice(0, 6).map((enquiry) => (
                <li key={enquiry.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{enquiry.company_name}</p>
                    <p className="truncate text-xs text-muted">
                      {enquiry.contact_person} · {enquiry.items.length} products · {formatDate(enquiry.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase ${
                      enquiry.status === "new" ? "bg-brand-50 text-brand-700" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {enquiry.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl2 border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">System status</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <StatusRow
              label="Catalogue storage"
              ok={usingSupabase}
              okText="Supabase (Postgres)"
              warnText="Local JSON file — development only"
            />
            {channelStatus.map((channel) => (
              <StatusRow
                key={channel.name}
                label={`Notifications · ${channel.name}`}
                ok={channel.configured}
                okText="Configured"
                warnText="Not configured"
              />
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">
            Every enquiry is stored before notifications are sent, so nothing is lost if a channel is unavailable.
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">Add a product</Link>
        <Link href="/admin/categories" className="btn btn-secondary btn-sm">Manage categories</Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl2 border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card ${
        highlight ? "border-brand-300 bg-brand-50/50" : "border-line"
      }`}
    >
      <span className="block font-display text-2xl font-bold text-ink">{value}</span>
      <span className="mt-1 block text-sm text-muted">{label}</span>
    </Link>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  warnText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  warnText: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span
        className={`flex items-center gap-1.5 text-xs font-semibold ${ok ? "text-brand-700" : "text-[#9a6b14]"}`}
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ok ? "bg-brand-500" : "bg-[#d9a23a]"}`} />
        {ok ? okText : warnText}
      </span>
    </li>
  );
}
