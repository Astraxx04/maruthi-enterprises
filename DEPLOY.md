# Deploying to Netlify + Supabase

Free on both tiers. Roughly 30 minutes end to end.

| Piece | Where | Cost |
| --- | --- | --- |
| Website | Netlify | Free — 100 GB bandwidth, 300 build minutes a month |
| Catalogue + enquiries | Supabase Postgres | Free — 500 MB |
| Newly uploaded images | Supabase Storage | Free — 1 GB |
| Enquiry alerts | Resend and/or Telegram | Free |

The 160 product photographs already in `public/products/` ship with the repository
and are served straight from Netlify's CDN — Supabase Storage is only used for
images you upload from the admin later.

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
3. **Project Settings → API**, copy three values:

   | Supabase calls it | Goes into |
   | --- | --- |
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> The `service_role` key bypasses every security rule. It is only ever read on the
> server — never put it in a `NEXT_PUBLIC_` variable.

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

## 4. Set up notifications

Pick either, or both — see [README §5](README.md#5-enquiry-notification-flow).

- **Telegram** (free, two minutes): message @BotFather → `/newbot` → token.
  Add the bot to a group, open `https://api.telegram.org/bot<TOKEN>/getUpdates`,
  send a message, copy `result[0].message.chat.id`.
- **Email**: [resend.com](https://resend.com) → API key. Until your domain is verified
  leave `ENQUIRY_FROM_EMAIL` unset and Resend's test sender is used.

---

## 5. Deploy on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** →
   pick the repository. `netlify.toml` already sets the build command, the publish
   directory, Node 22 and the Next.js plugin — change nothing.
2. **Site configuration → Environment variables** → add these, scope **All**:

   | Variable | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | a long random password — this is the only lock on `/admin` |
   | `ADMIN_SESSION_SECRET` | `openssl rand -base64 32` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-site>.netlify.app`, or the custom domain |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
   | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | if using Telegram |
   | `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL` | if using email |
   | `NEXT_PUBLIC_BUSINESS_*` | only to override what is in `src/lib/site.ts` |

3. **Deploy site**. First build takes three or four minutes.
4. Attach a custom domain under **Domain management**, then update
   `NEXT_PUBLIC_SITE_URL` and redeploy so the sitemap and link previews point at it.

---

## 6. Check it works

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<your-site>/products
curl -s https://<your-site>/sitemap.xml | head -5     # URLs should be your domain
```

Then by hand:

1. Open `/products` — 160 products, images loading, filters working.
2. Add two products, submit an enquiry. The success panel shows a reference, and the
   email or Telegram message arrives.
3. Log into `/admin`, confirm **System status** shows *Supabase (Postgres)* and your
   notification channels as *Configured*.
4. Edit a product and save. If the save fails, Supabase is not wired up — the site is
   falling back to the JSON file, which Netlify cannot write to.

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
