# Maruthi Enterprises — Digital Product Catalogue

A professional B2B catalogue website for a Bengaluru distributor of OTC healthcare,
ayurvedic, baby care and personal care products. Customers browse the catalogue, set the
quantities they need, and submit a single quotation enquiry. **No login, no cart checkout,
no payments, no stock levels** — any quantity can be requested for any product. The business
receives every enquiry by email and/or Telegram, and manages the catalogue through a
password-protected admin area.

The catalogue ships with **160 products across 14 categories** — 126 imported straight from
the printed PDF catalogue (names, pack sizes and photographs) plus 34 added from supplied
product photographs.

---

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript | Static catalogue pages, server-rendered SEO, API routes — one deployable |
| Styling | Tailwind CSS v4 | No runtime cost, design tokens in `src/app/globals.css` |
| Database | Supabase (Postgres) | Free tier, hosted, no server to maintain |
| Images | Supabase Storage | Public CDN-backed bucket (seed images ship in `public/products/`) |
| Email | Resend | 3,000 free emails/month, clean HTML templates |
| Chat alerts | Telegram Bot API | **Free**, one HTTPS call, no subscription |
| Hosting | Vercel (or Netlify / Cloudflare Pages) | Free tier covers this traffic profile |

**Running cost at low volume: ₹0 / month** (Vercel Hobby + Supabase free + Resend free +
Telegram free). Only a custom domain costs money.

### Why Telegram over WhatsApp

| | Telegram Bot API | WhatsApp Business Cloud API |
| --- | --- | --- |
| Cost | Free, unlimited | Free tier, then per-conversation charges |
| Setup | 2 minutes with @BotFather | Meta Business verification, phone number, template approval |
| Message content | Any text, instantly | Business-initiated messages need pre-approved templates |

Telegram is the recommended second channel. WhatsApp is still reachable through the generic
webhook channel (`ENQUIRY_WEBHOOK_URL`) if the business insists on it later.

---

## 2. Run it locally

Requires **Node 20.9+** (`.nvmrc` pins 22 — the version Vercel runs).

```bash
nvm use                         # or: nvm install
npm install
cp .env.example .env.local      # set ADMIN_PASSWORD at minimum
npm run dev                     # http://localhost:3000
```

Without Supabase credentials the site reads and writes `data/catalogue.json`, so the full
catalogue, admin area and enquiry flow work immediately with no external accounts. The file
store is **development only** — serverless hosts have read-only file systems.

| Route | What it is |
| --- | --- |
| `/` | Homepage — hero, featured products, categories, about, contact |
| `/products` | Full catalogue: search, category filter, sort, quantity + add to enquiry |
| `/products/[slug]` | Product detail page |
| `/enquiry` | Selected products, quantity editing, enquiry form |
| `/about`, `/contact` | Company information |
| `/admin` | Admin area (password protected, `noindex`) |

---

## 3. Environment variables

Full annotated list in [`.env.example`](.env.example). The essentials:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | **Yes** | The single password for `/admin` |
| `ADMIN_SESSION_SECRET` | Production | Signs the admin cookie — `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical URLs, sitemap, Open Graph |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Public read-only key (RLS allows SELECT only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Server-only key for writes and uploads — **never** exposed to the browser |
| `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL` | Recommended | Email notifications |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional | Instant chat notification |
| `ENQUIRY_WEBHOOK_URL` | Optional | Any JSON endpoint — WhatsApp Cloud API, Slack, Zapier, n8n |
| `NEXT_PUBLIC_BUSINESS_*` | Optional | Phone, email, address, GSTIN shown on the site |

Every secret is read on the server only. No key, token or SMTP credential is ever sent to
the browser.

---

## 4. Database setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql), run it.
   This creates the tables, indexes, row-level-security policies, the `updated_at` trigger
   and the public `product-images` storage bucket.
3. Copy **Project URL**, **anon key** and **service_role key** into `.env.local`.
4. Load the starter catalogue:

   ```bash
   npm run seed        # node --env-file=.env.local scripts/seed-supabase.mjs
   ```

### Schema

```
categories                      products                              enquiries
──────────                      ────────                              ─────────
id          uuid pk             id             uuid pk                id             uuid pk
name        text unique         name           text                   company_name   text
slug        text unique         slug           text unique            contact_person text
description text                brand          text                   phone          text
sort_order  int                 category_id    uuid → categories.id   email          text
created_at  timestamptz         description    text                   remarks        text
                                specifications text                   items          jsonb
                                unit           text                   status         text
                                pack_size      text                   created_at     timestamptz
                                image_url      text
                                featured       bool
                                available      bool
                                sort_order     int
                                created_at     timestamptz
                                updated_at     timestamptz
```

Row-level security: the anon key may only `SELECT` from `categories` and `products`.
`enquiries` has no anon policy at all — it is written and read exclusively server-side with
the service role key.

---

## 5. Enquiry notification flow

```
Customer submits  →  POST /api/enquiry  (server, Node runtime)
                       ├─ coarse IP flood limit (40 req / 10 min)
                       ├─ Zod validation of every field
                       ├─ honeypot field must be empty
                       ├─ form must take ≥ 2.5 s to fill
                       ├─ submission limit (5 valid enquiries / 10 min / IP)
                       ├─ idempotency token + same-email 60 s window
                       ├─ product names, units and packs re-read from the database
                       ├─ INSERT into enquiries        ← saved before any notification
                       └─ notifyEnquiry() fans out in parallel:
                            • email:resend   (HTML + plain text, Reply-To = customer)
                            • telegram       (formatted HTML message)
                            • webhook        (JSON — WhatsApp / Slack / Zapier)
                            • console        (development fallback)
```

A channel failing never fails the request and never loses an enquiry — the row is already in
the database and visible at `/admin/enquiries`.

**Adding a channel:** write an object with `name`, `isConfigured()` and `send(enquiry)` in
`src/lib/notify/channels.ts` and add it to the exported `channels` array. Nothing else changes.

### Telegram setup (2 minutes)

1. Message **@BotFather** on Telegram → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Add the bot to a group (or just message it directly).
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates`, send a message to the bot/group,
   refresh, and copy `result[0].message.chat.id` into `TELEGRAM_CHAT_ID`.

### Resend setup

1. Sign up at [resend.com](https://resend.com), create an API key → `RESEND_API_KEY`.
2. Verify your sending domain, then set `ENQUIRY_FROM_EMAIL` to an address on that domain.
   Until the domain is verified, leave it unset to use Resend's test sender.
3. Set `ENQUIRY_TO_EMAIL` to where enquiries should land (comma-separate for several people).

---

## 6. Deployment

**Netlify + Supabase, both free: [DEPLOY.md](DEPLOY.md)** — the step-by-step version,
including what to check afterwards and the one feature that cannot work on serverless.

```bash
npm run check:catalogue  # every product and photograph still present
npm run check:deploy     # the above, plus env vars, the database, RLS and the image bucket
```

The short version for Vercel:

```bash
git init && git add -A && git commit -m "Maruthi Enterprises catalogue"
# push to GitHub, then:
```

1. [vercel.com/new](https://vercel.com/new) → import the repository. Framework is detected
   automatically; no build settings to change.
2. **Settings → Environment Variables**: add everything from section 3 for the Production
   environment. `NEXT_PUBLIC_SITE_URL` must be the final domain, e.g.
   `https://maruthienterprises.com`.
3. Deploy, then **Settings → Domains** to attach the custom domain.
4. Visit `/admin`, sign in with `ADMIN_PASSWORD`, and confirm **System status** shows
   *Supabase (Postgres)* and your notification channels as *Configured*.
5. Send one test enquiry from the live site and confirm the email / Telegram message arrives.

Netlify is configured already — `netlify.toml` sets the build command, Node 22, the Next.js
plugin and cache headers for the product images.

> Deploy with Supabase configured. On a serverless host the JSON fallback cannot be written
> to, so admin edits would be lost on every deploy.

---

## 7. Managing the catalogue

Everything below happens at **`/admin`** — no code changes, no redeploys.

### Add a product
1. `/admin/products` → **Add product**.
2. Fill in name, category (required) and whatever else applies: brand, description,
   specifications, unit of supply, packaging.
3. **Upload image** (JPG/PNG/WebP/AVIF/SVG, ≤ 5 MB) or paste an image URL. Images sit inside a
   fixed 4:3 frame on a white background and are never cropped, so packshots of any shape
   work. Around **1200 × 900 px** looks sharpest.
4. Tick **Featured** to show it on the homepage. **Sort order** controls position within the
   category (lower first).
5. **Add product** — it is live immediately.

### Edit, hide or delete
- **Edit** opens the same form. Renaming a product updates its catalogue URL.
- The **Featured** pill in the product table toggles homepage placement with one click.
- **Delete** asks for confirmation and cannot be undone.

There are no stock levels anywhere in the system: every listed product can be requested in
any quantity. To take a product off the catalogue, delete it.

### Categories
`/admin/categories` — add, rename, re-order and describe categories. They drive the catalogue
filter chips and the homepage grid. A category can only be deleted once no products use it.

### Enquiries
`/admin/enquiries` lists every submission newest-first: company, contact person, phone, email,
the full product list with quantities, totals and remarks. Set a status (new → contacted →
quoted → closed), click **Reply with quotation** to open a pre-filled email, or **Call**.

### Pack sizes and pack details
**Pack sizes** are built with a small editor rather than typed as text: pick a unit (ml, g,
's, /- …), type one or more numbers — `9, 30, 50` adds three at once — and press **Add**.
Each size becomes a chip you can remove. "Free text (no unit)" stores a size exactly as typed
for things like *Strip of 10*; **+ Add a unit…** creates a new unit, which is then offered on
every other product. Units already used anywhere in the catalogue are picked up automatically.

**Pack details** is free text shown on the detail page, with line breaks preserved:

```
Available pack sizes: 9 ml, 30 ml, 50 ml
Case pack: 20 boxes
```

### Business details
Name, address, GST number, phone and email come from the printed catalogue and live in
`src/lib/site.ts`; override any of them with the `NEXT_PUBLIC_BUSINESS_*` variables.
The logo mark is inline SVG in `src/components/logo.tsx` — swap it for the real logo there.

### Re-importing from the printed PDF
The catalogue was generated from `Maruthi Enterprises Catalogue.pdf`. To regenerate it after
the PDF changes:

1. Edit `scripts/catalogue-map.json` — it maps each card on the page (`p07-r2c1` = page 7,
   row 2, column 1) to a product name, brand, category and description.
2. Run the importer:

   ```bash
   node scripts/import-from-pdf.mjs "/path/to/Maruthi Enterprises Catalogue.pdf" \
     --fallback-pdf="/path/to/previous-edition.pdf"
   ```

   `--fallback-pdf` is optional: when a newer edition drops a photograph a previous one had,
   the older file supplies it, so the import is reproducible from the PDFs alone.

It crops every product photograph out of the PDF at 288 dpi, writes them to
`public/products/<slug>.jpg`, reads the printed pack sizes, and rewrites `data/catalogue.json`
(existing enquiries are preserved). With Supabase configured, follow it with `npm run seed`.

> This overwrites `public/products/` and the products in `data/catalogue.json`, so make any
> one-off edits in the admin area **after** importing, not before.

---

## 7b. Printing the catalogue

`catalogue-print/` turns the same `data/catalogue.json` into a print-ready PDF. Five templates
ship with it: `gold-classic` (matches the printed original — ivy flourishes, gold bead frames,
2 × 3), `compact-list` (3 × 4 trade list), and three modern, photograph-first ones —
`modern-grid`, `spotlight` and `lookbook`:

```bash
npm run catalogue:pdf     # the default template, from catalogue-print/config.json
npm run catalogue:html    # HTML only, to preview in a browser
```

```bash
node catalogue-print/build.mjs --template=modern-grid
node catalogue-print/build.mjs --template=spotlight --only="Hair Care & Colour"
```

Headless Chrome does the printing, so nothing extra is installed. Each template is a folder of
`template.json` + `theme.css` + three HTML files — copy one to make a new look. Full
documentation: [catalogue-print/README.md](catalogue-print/README.md).

### Generating a PDF from the admin area

`/admin/catalogue` has a template picker — each one shows a thumbnail of what it looks
like — plus a category filter, an ordering choice and a featured-only switch. Press
**Generate PDF** and the finished file opens in the browser; recent builds are listed
underneath. It builds from the catalogue as it stands at that moment, so edits made
seconds earlier are in the PDF.

This runs the same builder as the command line, which means it needs the project files
and Google Chrome **on the server**. That is true when the site runs on your own machine,
a VPS or a container; on a serverless host the page explains that and you build from a
terminal instead.

```bash
node catalogue-print/make-previews.mjs   # refresh the template thumbnails
```

### Adding photographs

```bash
node scripts/add-images.mjs ~/Desktop/new-photos --dry-run   # preview
node scripts/add-images.mjs ~/Desktop/new-photos             # apply
```

Each image is trimmed, its off-white background cleaned, resized, and then either matched to
an existing product by file name or filed as a new product in the closest category. For stock
photographs with meaningless names, drop a `manifest.json` beside them naming each file —
`images/manifest.json` is a worked example. Because it writes `data/catalogue.json`, anything
added shows up on the website and in the next PDF.

---

## 8. What was verified

| Check | Result |
| --- | --- |
| `npm run build` / `tsc --noEmit` | Clean, 172 routes generated (160 product pages) |
| Public pages (`/`, `/products`, detail, `/about`, `/contact`, `/enquiry`, sitemap, robots) | 200; unknown product → 404 |
| Catalogue search, category filter, A→Z / Z→A sort | Verified in headless Chrome |
| Add to enquiry, merge duplicate product, header badge, quantity edit, remove line | Verified in headless Chrome |
| Enquiry submission end-to-end | Success panel + reference shown, cart cleared, notification dispatched |
| Validation errors, honeypot, too-fast submit, unknown product id, duplicate email, token replay, rate limit | All rejected with the correct message |
| Admin: unauthenticated redirect, 401 on admin APIs, wrong password, login, logout | Correct |
| Admin product create / update / read-back / delete, image upload, file-type rejection | Correct |
| Horizontal overflow at 320 / 390 / 768 / 1024 / 1440 px across all pages | None (35 checks) |
| 126 product photographs cropped from the PDF, no stray label text baked in | Verified |
| Printed catalogue PDF: 28 pages, 6 products per page, cover with the Kannada blessing | Verified against the original |
| All five print templates render and paginate correctly | Verified |
| Image import: filename match, manifest, category guess, product replace, JPEG XL, dry run, clean mode | Verified |

---

## 9. Project layout

```
src/
├── app/
│   ├── (site)/            # public pages — share header, footer, enquiry bar
│   ├── admin/             # admin pages + server actions (actions.ts)
│   ├── api/
│   │   ├── enquiry/       # public enquiry endpoint
│   │   └── admin/         # login, logout, image upload (middleware-protected)
│   ├── globals.css        # Tailwind theme tokens, component classes
│   ├── sitemap.ts, robots.ts
│   └── layout.tsx
├── components/            # UI — catalogue, product card, cart, enquiry form, admin
├── lib/
│   ├── store.ts           # data access: Supabase, or data/catalogue.json fallback
│   ├── notify/            # channels.ts (email/telegram/webhook) + formatters
│   ├── validation.ts      # Zod schemas shared by API and admin actions
│   ├── auth.ts            # HMAC-signed admin session cookie
│   ├── rate-limit.ts      # in-memory fixed-window limiter
│   └── site.ts            # business details / placeholders
├── middleware.ts          # protects /admin and /api/admin
catalogue-print/           # printable catalogue: build script + editable templates
images/                    # supplied product photographs + manifest.json
public/products/           # 160 product photographs
data/catalogue.json        # catalogue data (also the development data store)
supabase/schema.sql        # tables, indexes, RLS, storage bucket
scripts/catalogue-map.json # PDF card → name, brand, category, description
scripts/import-from-pdf.mjs# rebuild the catalogue + images from the printed PDF
scripts/add-images.mjs     # import, trim and file new product photographs
scripts/category-keywords.json # hints for guessing a category
scripts/seed-supabase.mjs  # push data/catalogue.json into Supabase
```

### Known limits
- The rate limiter is in-memory, so it resets on deploy and is per-instance. Swap in Upstash
  Redis if the site ever scales horizontally.
- The JSON fallback store is single-process and development only.
- Product photographs are cropped from the printed PDF, so they are only as sharp as the
  artwork in that file. Replace any of them through the admin uploader.
- A product with several pack sizes shows them as information only — the enquiry captures a
  single quantity per product, and customers can note the sizes they want in the remarks box.
