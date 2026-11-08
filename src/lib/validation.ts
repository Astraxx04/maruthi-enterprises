import { z } from "zod";

export const enquiryItemSchema = z.object({
  product_id: z.string().min(1).max(100),
  /** One of the product's pack sizes, checked against the catalogue server-side. */
  size: z.string().trim().min(1).max(60).optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(1_000_000),
});

export const enquirySchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(2, "Enter the company or pharmacy name")
    .max(160, "That company name is too long — keep it under 160 characters"),
  contact_person: z
    .string()
    .trim()
    .min(2, "Enter the contact person's name")
    .max(160, "That name is too long — keep it under 160 characters"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[+\d][\d\s\-()]{6,19}$/, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  remarks: z
    .string()
    .trim()
    .max(2000, "Please keep the remarks under 2000 characters")
    .optional()
    .or(z.literal("")),
  items: z.array(enquiryItemSchema).min(1, "Add at least one product to the enquiry").max(100),
  // Spam traps — see the API route.
  website: z.string().max(200).optional(),
  started_at: z.coerce.number().optional(),
  client_token: z.string().trim().min(8).max(64),
});

export type EnquiryPayload = z.infer<typeof enquirySchema>;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the product name")
    .max(160, "That product name is too long — keep it under 160 characters"),
  brand: z
    .string()
    .trim()
    .max(160, "That brand name is too long — keep it under 160 characters")
    .optional()
    .or(z.literal("")),
  category_id: z.string().trim().min(1, "Choose a category"),
  description: z
    .string()
    .trim()
    .max(2000, "The description is too long — keep it under 2000 characters")
    .optional()
    .or(z.literal("")),
  unit: z.string().trim().max(80, "Keep the unit under 80 characters").optional().or(z.literal("")),
  // The pack sizes are stored as one joined string, so this holds the whole
  // list — roughly forty sizes' worth.
  pack_size: z
    .string()
    .trim()
    .max(600, "That is too many pack sizes to store — remove a few")
    .optional()
    .or(z.literal("")),
  image_url: z
    .string()
    .trim()
    .max(600, "That image path is too long — keep it under 600 characters")
    .optional()
    .or(z.literal("")),
  featured: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the category name")
    .max(80, "That category name is too long — keep it under 80 characters"),
  description: z
    .string()
    .trim()
    .max(400, "The description is too long — keep it under 400 characters")
    .optional()
    .or(z.literal("")),
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
