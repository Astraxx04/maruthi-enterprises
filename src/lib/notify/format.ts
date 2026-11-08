import type { Enquiry } from "../types";
import { site } from "../site";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.BUSINESS_TIMEZONE || "Asia/Kolkata",
  }).format(new Date(iso));
}

export function totalUnits(enquiry: Enquiry): number {
  return enquiry.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function plainText(enquiry: Enquiry): string {
  const lines = [
    `New enquiry — ${site.name}`,
    "",
    `Company:        ${enquiry.company_name}`,
    `Contact person: ${enquiry.contact_person}`,
    `Phone:          ${enquiry.phone}`,
    `Email:          ${enquiry.email}`,
    `Submitted:      ${formatDate(enquiry.created_at)}`,
    `Reference:      ${enquiry.id}`,
    "",
    `Requested products (${enquiry.items.length} line items, ${totalUnits(enquiry)} units total):`,
  ];
  enquiry.items.forEach((item, index) => {
    const details = [item.brand, item.pack_size].filter(Boolean).join(" · ");
    lines.push(
      `${index + 1}. ${item.name}${details ? ` (${details})` : ""} — ${item.quantity} ${item.unit || "units"}`,
    );
  });
  lines.push("", `Additional remarks: ${enquiry.remarks?.trim() || "—"}`);
  return lines.join("\n");
}

export function htmlEmail(enquiry: Enquiry): string {
  const rows = enquiry.items
    .map(
      (item, index) => `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #eceef1;color:#6b7280;font-size:13px;">${index + 1}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #eceef1;">
          <div style="font-weight:600;color:#111827;font-size:14px;">${escapeHtml(item.name)}</div>
          <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escapeHtml(
            [item.brand, item.pack_size].filter(Boolean).join(" · ") || "—",
          )}</div>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #eceef1;text-align:right;font-weight:600;color:#111827;font-size:14px;white-space:nowrap;">
          ${item.quantity} <span style="font-weight:400;color:#6b7280;">${escapeHtml(item.unit || "units")}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e6e8ec;border-collapse:separate;width:100%;">
    <tr><td style="padding:28px 28px 20px;border-bottom:1px solid #eceef1;">
      <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#0f766e;font-weight:700;">${escapeHtml(site.name)}</div>
      <h1 style="margin:8px 0 4px;font-size:21px;color:#111827;">New catalogue enquiry</h1>
      <div style="color:#6b7280;font-size:13px;">${escapeHtml(formatDate(enquiry.created_at))} · Ref ${escapeHtml(enquiry.id.slice(0, 8))}</div>
    </td></tr>
    <tr><td style="padding:22px 28px;">
      <table role="presentation" style="width:100%;font-size:14px;color:#111827;border-collapse:collapse;">
        ${field("Company", enquiry.company_name)}
        ${field("Contact person", enquiry.contact_person)}
        ${field("Phone", enquiry.phone, `tel:${enquiry.phone.replace(/[^+\d]/g, "")}`)}
        ${field("Email", enquiry.email, `mailto:${enquiry.email}`)}
      </table>
    </td></tr>
    <tr><td style="padding:4px 28px 8px;">
      <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:6px;">Requested products</div>
      <table role="presentation" style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="margin-top:14px;padding:12px 14px;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;font-size:13px;color:#115e59;">
        <strong>${enquiry.items.length}</strong> product${enquiry.items.length === 1 ? "" : "s"} ·
        <strong>${totalUnits(enquiry)}</strong> units requested in total
      </div>
    </td></tr>
    <tr><td style="padding:18px 28px 28px;">
      <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:6px;">Additional remarks</div>
      <div style="font-size:14px;color:#374151;white-space:pre-wrap;">${escapeHtml(enquiry.remarks?.trim() || "—")}</div>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#fafbfc;border-top:1px solid #eceef1;border-radius:0 0 14px 14px;color:#6b7280;font-size:12px;">
      Sent automatically from the ${escapeHtml(site.name)} catalogue website. Reply directly to this email to reach the customer.
    </td></tr>
  </table>
</body></html>`;
}

export function telegramMessage(enquiry: Enquiry): string {
  const items = enquiry.items
    .map((item, index) => `${index + 1}. <b>${escapeHtml(item.name)}</b> — ${item.quantity} ${escapeHtml(item.unit || "units")}`)
    .join("\n");
  return [
    `🧾 <b>New enquiry — ${escapeHtml(site.name)}</b>`,
    "",
    `🏢 <b>${escapeHtml(enquiry.company_name)}</b>`,
    `👤 ${escapeHtml(enquiry.contact_person)}`,
    `📞 ${escapeHtml(enquiry.phone)}`,
    `✉️ ${escapeHtml(enquiry.email)}`,
    `🕒 ${escapeHtml(formatDate(enquiry.created_at))}`,
    "",
    `<b>Requested products (${enquiry.items.length}):</b>`,
    items,
    "",
    `📦 Total units: <b>${totalUnits(enquiry)}</b>`,
    enquiry.remarks?.trim() ? `\n📝 ${escapeHtml(enquiry.remarks.trim())}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function field(label: string, value: string, href?: string): string {
  const shown = href
    ? `<a href="${escapeHtml(href)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(value)}</a>`
    : escapeHtml(value);
  return `<tr>
    <td style="padding:6px 0;color:#6b7280;width:140px;font-size:13px;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-weight:600;">${shown}</td>
  </tr>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
