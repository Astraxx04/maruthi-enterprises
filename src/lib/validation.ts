import { z } from "zod";

export const enquiryItemSchema = z.object({
  product_id: z.string().min(1).max(100),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(1_000_000),
});

export const enquirySchema = z.object({
  company_name: z.string().trim().min(2, "Enter the company or pharmacy name").max(120),
  contact_person: z.string().trim().min(2, "Enter the contact person's name").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[+\d][\d\s\-()]{6,19}$/, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  remarks: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(enquiryItemSchema).min(1, "Add at least one product to the enquiry").max(100),
  // Spam traps — see the API route.
  website: z.string().max(200).optional(),
  started_at: z.coerce.number().optional(),
  client_token: z.string().trim().min(8).max(64),
});

export type EnquiryPayload = z.infer<typeof enquirySchema>;

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().max(120).optional().or(z.literal("")),
  category_id: z.string().trim().min(1, "Choose a category"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  unit: z.string().trim().max(80).optional().or(z.literal("")),
  pack_size: z.string().trim().max(120).optional().or(z.literal("")),
  image_url: z.string().trim().max(600).optional().or(z.literal("")),
  featured: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again";
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
