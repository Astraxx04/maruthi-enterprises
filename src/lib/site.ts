/**
 * Business details, taken from the printed catalogue. Any value can be
 * overridden with the matching NEXT_PUBLIC_* environment variable.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Maruthi Enterprises",
  tagline: "Quality Products. Reliable Supply.",
  shortDescription:
    "Maruthi Enterprises is a Bengaluru-based distributor of over-the-counter healthcare, ayurvedic, baby care and personal care products. Browse the catalogue, tell us the quantities you need, and we will respond with our best quotation.",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "prabhalchandujm28@gmail.com",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "+91 70905 35334",
  whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+91 70905 35334",
  address:
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ||
    "Deena Seva School, No. 1, 1st Main Road, Kamala Nagar, Bengaluru 560079",
  gstin: process.env.NEXT_PUBLIC_BUSINESS_GSTIN || "GST No. 29DNRPP1242Q1Z2",
  hours: "Monday – Saturday, 9:30 AM – 7:00 PM IST",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
} as const;
