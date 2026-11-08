import type { Metadata } from "next";
import { EnquiryClient } from "@/components/enquiry-client";
import { getProducts } from "@/lib/store";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Your Enquiry",
  description: "Review the products you selected, set quantities and send your requirement to Maruthi Enterprises.",
  robots: { index: false, follow: true },
};

export default async function EnquiryPage() {
  const products = await getProducts();

  return (
    <div className="container-page">
      <header className="py-10 sm:py-12">
        <p className="eyebrow">Quotation request</p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Your enquiry</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Check the products and quantities below, add your contact details and submit. No payment is taken here —
          our team will reply with a quotation.
        </p>
      </header>

      <EnquiryClient products={products} />
    </div>
  );
}
