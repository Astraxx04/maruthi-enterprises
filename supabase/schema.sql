-- ────────────────────────────────────────────────────────────────────────────
-- Maruthi Enterprises — database schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Categories ──────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  brand          text,
  category_id    uuid not null references public.categories (id) on delete restrict,
  description    text,
  specifications text,
  unit           text,
  pack_size      text,
  image_url      text,
  featured       boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_featured_idx on public.products (featured) where featured;

-- Full-text-ish search helper for larger catalogues.
create index if not exists products_name_trgm_idx on public.products using gin (to_tsvector('simple', name));

-- ── Enquiries ───────────────────────────────────────────────────────────────
create table if not exists public.enquiries (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null,
  contact_person text not null,
  phone          text not null,
  email          text not null,
  remarks        text,
  items          jsonb not null default '[]'::jsonb,
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'quoted', 'closed')),
  created_at     timestamptz not null default now()
);

create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_status_idx on public.enquiries (status);
create index if not exists enquiries_email_idx on public.enquiries (lower(email));

-- ── Row level security ──────────────────────────────────────────────────────
-- The public (anon) key may only READ the catalogue. Every write goes through
-- the server using the service role key, which bypasses RLS.
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.enquiries  enable row level security;

drop policy if exists "catalogue categories are public" on public.categories;
create policy "catalogue categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "catalogue products are public" on public.products;
create policy "catalogue products are public"
  on public.products for select
  to anon, authenticated
  using (true);

-- No anon policy on enquiries: they are never readable or writable with the
-- public key. Inserts and reads happen server-side with the service role key.

-- ── Keep updated_at fresh ───────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ── Storage bucket for product images ───────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images are publicly readable" on storage.objects;
create policy "product images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');
-- Uploads use the service role key from the server, so no insert policy is needed.
