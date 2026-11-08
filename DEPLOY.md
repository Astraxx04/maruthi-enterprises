# Deploying to Netlify + Supabase

Free on both tiers. Roughly 30 minutes end to end.

| Piece | Where | Cost | Needed |
| --- | --- | --- | --- |
| Website | Netlify | Free — 100 GB bandwidth, 300 build minutes a month | Yes |
| Catalogue + enquiries | Supabase Postgres | Free — 500 MB | Yes |
| Newly uploaded images | Supabase Storage | Free — 1 GB | Yes |
| Enquiry alerts | Resend and/or Telegram | Free | **Later** — see step 6 |

The 160 product photographs already in `public/products/` ship with the repository
and are served straight from Netlify's CDN — Supabase Storage is only used for
images you upload from the admin later.

> **Notifications can wait.** Without them, enquiries are still saved to the database
> and listed at `/admin/enquiries` with the full product list — you just have to go and
> look rather than being emailed. Step 6 turns alerts on whenever you are ready.

---

## 1. Put the code on GitHub

```bash
git init
git add -A
git commit -m "Maruthi Enterprises catalogue"
git branch -M main
git remote add origin git@github.com:<you>/maruthi-enterprises.git
git push -u origin main
```

`.env.local` is in `.gitignore`, so no secrets go up. Check before pushing:

```bash
git status --short | grep -i env   # should print nothing
```

---

## 2. Create the Supabase project

1. [supabase.com](https://supabase.com) → **New project**. Pick the region nearest
   Bengaluru (**Mumbai, ap-south-1**) and save the database password somewhere safe.
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   That creates the tables, indexes, row-level security, the `updated_at` trigger and
   the public `product-images` bucket.
3. Collect three values. Supabase reorganised this in 2025, so they now live in two
   different places — there is no longer a "Settings → API" page.

   | Value | Where | Goes into |
   | --- | --- | --- |
   | Project URL | **Integrations → Data API** | `NEXT_PUBLIC_SUPABASE_URL` |
   | **Publishable key** (`sb_publishable_…`) | **Settings → API Keys** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | **Secret key** (`sb_secret_…`) | **Settings → API Keys** | `SUPABASE_SECRET_KEY` |

   Quickest route for the first two: the **Connect** button in the top bar shows the
   Project URL and publishable key ready to paste. The secret key is only on the
   API Keys page — if the project has none yet, create one there.

   > **The Project URL is the bare host**, `https://<ref>.supabase.co` — not the REST
   > endpoint `https://<ref>.supabase.co/rest/v1/`, which is also shown on that page.
   > The library adds `/rest/v1` itself; pasting it twice fails with
   > *"Invalid path specified in request URL"*. The scripts trim it for you and warn,
   > but set it correctly in Netlify.

> The secret key bypasses every security rule. It is only ever read on the server —
> never put it in a `NEXT_PUBLIC_` variable, and never commit it.

**Older project?** If you see `anon` and `service_role` keys instead (long strings
starting `eyJ`), those still work — put them in `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` and everything behaves identically. Supabase is retiring
them at the end of 2026, so move to the new keys when convenient; `npm run check:deploy`
will remind you.

---

## 3. Load the catalogue

Put the three keys in `.env.local` first, then:

```bash
npm run check:catalogue   # 160 products, every photograph present
npm run seed              # pushes data/catalogue.json into Postgres
npm run check:deploy      # the above, plus env vars, the database and RLS
```

`check:deploy` should report **160 products in 14 categories** and confirm that the
public key cannot read enquiries.

> **Seed before the first Netlify deploy.** The build pre-renders a page per product
> by reading the database, so deploying against an empty one produces a catalogue
> with nothing in it. If that happens, seed and redeploy — no harm done.

---

## 4. Deploy on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** →
   pick the repository. `netlify.toml` already sets the build command, the publish
   directory, Node 22 and the Next.js plugin — change nothing.
2. **Site configuration → Environment variables** → add these, scope **All**:

   | Variable | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | `openssl rand -base64 24` — the only lock on `/admin` (see below) |
   | `ADMIN_SESSION_SECRET` | `openssl rand -base64 32` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-site>.netlify.app`, or the custom domain |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 2 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from step 2 |
   | `SUPABASE_SECRET_KEY` | from step 2 |
   | `NEXT_PUBLIC_BUSINESS_*` | optional — only to override what is in `src/lib/site.ts` |

   Notification variables come later, in step 6. Skip them for now.

   > **Never use the business email, phone number or name as `ADMIN_PASSWORD`.** All of
   > those are printed in the footer of every page, so the password would be published
   > along with the site. `npm run check:deploy` fails if it spots this.
   >
   > Netlify's secret scanner will flag it too, reporting the value "found" in your
   > prerendered pages — that is the scanner working, not a bug in the site.

3. **Deploy site**. First build takes three or four minutes.
4. Attach a custom domain under **Domain management**, then update
   `NEXT_PUBLIC_SITE_URL` and redeploy so the sitemap and link previews point at it.

---

## 5. Check it works

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<your-site>/products
curl -s https://<your-site>/sitemap.xml | head -5     # URLs should be your domain
```

Then by hand:

1. Open `/products` — 160 products, images loading, filters working.
2. Log into `/admin` and confirm **System status** shows *Supabase (Postgres)*. If it
   says *Local JSON file* instead, the keys have not reached the build — check them in
   Netlify and redeploy.
3. **Edit a product and save**, then reload the public page to see the change. This is
   the one that proves the database is really wired up; a failure here means the site
   is still on the JSON file, which Netlify cannot write to.
4. **Add a product** from `/admin/products → Add product`, with an image upload. That
   exercises Supabase Storage too.
5. Submit a test enquiry from the site, then check `/admin/enquiries` — it should be
   there with the products and quantities. (No email or Telegram yet; that is step 6.)

---

## 6. Turn on enquiry alerts (later)

Until this is done, enquiries are saved to Postgres and listed at `/admin/enquiries` —
complete with company, contact, phone, email, every product and quantity, and the
remarks. Nothing is lost; nobody is pinged. Add a channel whenever you want that to
change, then redeploy.

**Telegram** — free, no subscription, about two minutes:

1. Message **@BotFather** on Telegram → `/newbot` → copy the token.
2. Add the bot to a group, or just message it directly.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates`, send the bot a message,
   refresh, and copy `result[0].message.chat.id`.
4. In Netlify, add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then redeploy.

**Email** — [resend.com](https://resend.com), 3,000 free emails a month:

1. Create an API key → `RESEND_API_KEY`.
2. Set `ENQUIRY_TO_EMAIL` to where enquiries should land (comma-separate for several).
3. Leave `ENQUIRY_FROM_EMAIL` unset until you have verified a sending domain in
   Resend; its test sender is used in the meantime.
4. Redeploy.

Either works alone, or both together. `/admin` → **System status** shows which ones
the server can see. More detail, including the generic webhook channel for WhatsApp
or Slack, is in [README §5](README.md#5-enquiry-notification-flow).

---

## What does not work on Netlify, and why

**The Generate PDF button in `/admin/catalogue`.** It runs Node and headless Chrome
and reads `catalogue-print/` off disk; a serverless function has none of that. The
page detects this and says so. Build catalogues from your own machine instead — they
take about four seconds:

```bash
node catalogue-print/build.mjs --template=modern-grid
```

If you want that button working in production, host on a small VPS with Chrome
installed rather than on Netlify. Nothing in the code changes.

**Image uploads need Supabase Storage.** With the keys set they go to the bucket. The
admin shows a clear message rather than failing silently if they are missing — and you
can always paste an image URL instead.

---

## If Netlify's secret scanner complains

It compares every environment variable's **value** against the repository and the build
output, so a variable set to something that legitimately appears in the code gets flagged.

- **`SUPABASE_STORAGE_BUCKET`** — its value is the bucket name `product-images`, which
  has to appear in `supabase/schema.sql` to create the bucket. Not a secret.
  `netlify.toml` already tells the scanner to skip this one key; you can also simply
  delete the variable in Netlify, since the code defaults to the same name.
- **`ADMIN_PASSWORD` reported inside `.netlify/deploy/...` blobs** — those blobs are the
  prerendered pages. If the password turns up there it is because you set it to
  something the site prints, such as the business email. **Change the password**; do not
  silence the scanner.
- Anything else — treat it as real until you have proved otherwise. `grep -r` the value
  across the repository and the `.next` folder.

Only ever add a key to `SECRETS_SCAN_OMIT_KEYS` when you have confirmed its value is
genuinely public information.

---

## Keeping Next.js patched

Netlify **blocks deploys** of Next.js versions with known critical vulnerabilities, so a
stale dependency becomes a deployment outage rather than a warning. This project is on
the Next.js 15 maintenance line:

```bash
npm outdated next react react-dom
npm audit --omit=dev
```

If a deploy is ever refused for this reason, bump to the newest 15.x and rebuild:

```bash
npm install next@^15 react@^19 react-dom@^19
npm run build && npm run check:deploy
```

Two known advisories are accepted rather than fixed, both deliberately:

- **postcss** (high) — reachable only when compiling untrusted CSS at build time, which
  this project never does. It is bundled inside Next.js and clears when the project
  moves to Next 16.
- **zod** (high) — memory exhaustion on oversized collections. The public enquiry
  endpoint caps request bodies at 64 KB before anything is parsed, which closes the
  path; the library fix needs Zod 4, a breaking upgrade.

The low-severity findings all sit inside `resend`'s email renderer and are only
reachable through attacker-controlled objects, which never reach it here. Upgrading
Resend is best done when email notifications are switched on.

---

## Things worth knowing

- **Supabase pauses a free project after 7 days with no database activity.** Any
  visitor keeps it awake, but a brand-new site with no traffic can go to sleep; resume
  it from the dashboard. If that gets annoying it is $25/month to remove, or move the
  database to Neon.
- **The rate limiter is per function instance** and resets on deploy. Fine at this
  traffic. Swap in Upstash Redis if the enquiry form ever gets spammed.
- **Enquiries are never lost to a notification failure** — the row is written to
  Postgres before anything is sent, and `/admin/enquiries` always has the full list.
- **Back up** with Supabase's daily backups, or `npm run seed` in reverse: the
  catalogue is also in `data/catalogue.json` in the repository.
- **Changing products from the admin writes to Postgres only.** `data/catalogue.json`
  stays as it was, so re-running `npm run seed` would overwrite live edits with the
  repository's copy. After going live, treat the admin as the source of truth and use
  the seed script only for the first load.
