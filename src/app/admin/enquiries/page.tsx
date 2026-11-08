import { getEnquiries } from "@/lib/store";
import { formatDate, totalUnits } from "@/lib/notify/format";
import { setEnquiryStatusAction } from "@/app/admin/actions";
import type { Enquiry } from "@/lib/types";

export const dynamic = "force-dynamic";

const statuses: Enquiry["status"][] = ["new", "contacted", "quoted", "closed"];

export default async function AdminEnquiriesPage() {
  const enquiries = await getEnquiries();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Enquiries</h1>
      <p className="mt-1 text-sm text-muted">
        {enquiries.length} enquir{enquiries.length === 1 ? "y" : "ies"} received. Newest first.
      </p>

      {enquiries.length === 0 ? (
        <p className="mt-6 rounded-xl2 border border-dashed border-line bg-white px-4 py-16 text-center text-sm text-muted">
          No enquiries yet. Submissions from the website appear here, and are also sent to every configured
          notification channel.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {enquiries.map((enquiry) => (
            <li key={enquiry.id} className="rounded-xl2 border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">{enquiry.company_name}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {enquiry.contact_person} ·{" "}
                    <a href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`} className="hover:text-brand-700">
                      {enquiry.phone}
                    </a>{" "}
                    ·{" "}
                    <a href={`mailto:${enquiry.email}`} className="hover:text-brand-700">
                      {enquiry.email}
                    </a>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(enquiry.created_at)} · Ref {enquiry.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>

                <form action={setEnquiryStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={enquiry.id} />
                  <label htmlFor={`status-${enquiry.id}`} className="sr-only">Status</label>
                  <select
                    id={`status-${enquiry.id}`}
                    name="status"
                    defaultValue={enquiry.status}
                    className="field w-auto cursor-pointer py-2 text-sm"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status[0].toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary btn-sm">Update</button>
                </form>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">Product</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Pack</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {enquiry.items.map((item) => (
                      <tr key={item.product_id}>
                        <td className="px-3 py-2">
                          <span className="font-medium text-ink">{item.name}</span>
                          {item.brand && <span className="ml-1.5 text-xs text-muted">{item.brand}</span>}
                        </td>
                        <td className="px-3 py-2 text-muted">{item.pack_size ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-ink">
                          {item.quantity.toLocaleString("en-IN")}{" "}
                          <span className="font-normal text-muted">{item.unit ?? "units"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-line bg-surface text-sm">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 font-medium text-ink-soft">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-ink">
                        {totalUnits(enquiry).toLocaleString("en-IN")} units
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {enquiry.remarks && (
                <div className="mt-3 rounded-lg bg-surface px-3.5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Remarks</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{enquiry.remarks}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Quotation — enquiry ${enquiry.id.slice(0, 8).toUpperCase()}`)}`} className="btn btn-primary btn-sm">
                  Reply with quotation
                </a>
                <a href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`} className="btn btn-secondary btn-sm">Call</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
