export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category_id: string;
  description: string | null;
  specifications: string | null;
  unit: string | null;
  pack_size: string | null;
  image_url: string | null;
  featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductWithCategory = Product & { category: Category | null };

export type EnquiryItem = {
  product_id: string;
  name: string;
  brand: string | null;
  pack_size: string | null;
  unit: string | null;
  quantity: number;
};

export type Enquiry = {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  remarks: string | null;
  items: EnquiryItem[];
  status: "new" | "contacted" | "quoted" | "closed";
  created_at: string;
};

export type CartLine = {
  productId: string;
  quantity: number;
};
