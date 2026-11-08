# Printable catalogue

Turns `data/catalogue.json` — the same data the website uses — into a print-ready
PDF styled like the original Maruthi Enterprises catalogue: ivy corner flourishes,
gold bead card frames, two columns by three rows per page.

```bash
npm run catalogue:pdf        # the default template, from config.json
npm run catalogue:html       # HTML only, for quick previewing in a browser
```

Pick a template with `--template`. Each one writes its own file, so they sit side by
side in `catalogue-print/out/`:

```bash
node catalogue-print/build.mjs --template=modern-grid
node catalogue-print/build.mjs --template=midnight
node catalogue-print/build.mjs --template=vivid --only="Eye & Lens Care"

# name the file yourself
node catalogue-print/build.mjs --template=swiss --out=Hair-Care-Range
```

Products are always printed grouped by category, and each card shows only the
photograph, the name and the pack sizes (when the product has any).

Other flags: `--featured` (featured products only),
`--source=file.json` (build from a snapshot instead of `data/catalogue.json`), `--json`
(print a machine-readable result line), `--html` (save the HTML page for previewing, skip the PDF).

To settle on one template, set `"template"` in `config.json` and `npm run catalogue:pdf`
uses it. Set `"output": { "suffixTemplate": false }` to drop the `-<template>` suffix
from the file name.

Add a product on the website (or with the image tool below) and it appears in the
next PDF build. No separate list to maintain.

Or press a button: **`/admin/catalogue`** in the admin area has a template picker with
thumbnails, a category filter and a featured-only switch. It builds from live catalogue
data, so edits made in the admin seconds earlier are in the PDF.

> The admin button runs this same script, so it needs the project files and Chrome on the
> server — fine on your own machine, a VPS or a container, not on a serverless host. The
> page says so when the builder is unavailable.

```bash
node catalogue-print/make-previews.mjs   # refresh the thumbnails after restyling a template
```

---

## How it works

```
data/catalogue.json
        │
        ├── build.mjs          reads the template, paginates, fills in the HTML
        │       │
        │       └── templates/<name>/   layout, styling, ornaments
        │
        └── out/…​.pdf          printed by headless Chrome (only the PDF is kept;
                                 --html saves the page instead, for previewing)
```

Chrome does the printing, so there is nothing to install. The script looks for
Google Chrome, Chromium, Brave and Edge in the usual places; set `CHROME_PATH`
if yours lives somewhere else.

---

## Options

In `catalogue-print/config.json`:

| Key | What it does |
| --- | --- |
| `template` | Which folder under `templates/` to use |
| `output.fileName` | Base name of the generated files |
| `order` | `"category"` (default), `"name"`, or `"data"` to keep the file order |
| `categoryPageBreak` | `true` starts every category on a fresh page |
| `onlyCategories` / `skipCategories` | Print a subset, e.g. one category for a sales call |
| `onlyFeatured` | Print just the featured products — a short leave-behind |
| `cover.*` | Business name, address, GST, email and phone on the cover |

Command line flags override the file for one run:

```bash
node catalogue-print/build.mjs --only="Hair Care & Colour"
node catalogue-print/build.mjs --template=gold-classic --html
```

---

## Templates

Five ship with the project, all 2 × 3 — two products in a row, three rows, six a page:

| Template | Look |
| --- | --- |
| `gold-classic` | Matches the printed original: ivy flourishes and gold bead frames |
| `modern-grid` | Clean and white: photographs in hairline panels, sizes as pills |
| `midnight` | Dark navy pages, photographs on white tiles, teal size pills |
| `vivid` | Bold coloured banner per category (each category starts a new page), coral and black size chips |
| `swiss` | Minimal hairline grid, numbered products, sizes in monospace |

Each template's accent comes from `template.json` → `colors.gold` and its tint from
`colors.goldSoft`; change those two values to re-skin it. A template can set
`"categoryPageBreak": true` to start every category on a fresh page, as `vivid` does.
Cards can use `{{number}}` — the product's position in the whole catalogue, as `swiss` does.

```bash
node catalogue-print/build.mjs --template=midnight
node catalogue-print/build.mjs --template=vivid --only="Hair Care & Colour"
```

## Changing the template

Everything about the look lives in `templates/gold-classic/`. Copy the folder,
rename it, point `config.json` at it, and edit:

| File | What to change there |
| --- | --- |
| `template.json` | Page size, margins, grid (columns × rows), fonts, colours, what each card shows |
| `theme.css` | All styling — frames, type, spacing, the divider under each title |
| `card.html` | The markup of one product card |
| `page.html` | The page shell: flourishes, grid, footer |
| `cover.html` | The cover page |
| `assets/` | The ornaments (PNG with transparency) |

### Template tokens

The templates use a tiny syntax — four forms, nothing else:

```html
{{name}}                     value, HTML-escaped
{{{sizesHtml}}}              value inserted as raw HTML
{{#if hasBrand}} … {{/if}}   shown when the value is set
{{#unless x}} … {{/unless}}  shown when it is not
```

Available in `card.html`: `name`, `nameClass`, `brand`, `hasBrand`, `sizesHtml`,
`hasSizes`, `description`, `hasDescription`, `imageSrc`, `hasImage`, `category`,
`assets`.

In `page.html`: `cards`, `pageNumber`, `totalPages`, `businessName`, `footer`,
`showFooter`, `flourishTopLeft`, `flourishBottomRight`, `assets`.

In `cover.html`: everything under `cover` in `config.json`, plus `showBlessing`
and `assets`.

### Grid and measurements

`template.json` values become CSS variables, so the grid is one edit:

```jsonc
"page":  { "width": 595.5, "height": 842.5,            // A4 in points
           "margin": { "top": 41.8, "right": 45.2, "bottom": 41.2, "left": 64.8 } },
"grid":  { "columns": 2, "rows": 3, "columnGap": 27.5, "rowGap": 35.5 },
"card":  { "titleHeight": 39, "showBrand": false, "showSizes": true,
           "showDescription": false, "imagePadding": 10,
           "titleLengths": { "long": 22, "xlong": 34 } }
```

`titleLengths` is where a long product name steps down to a smaller size — past
22 characters it uses `card-title--long`, past 34 `card-title--xlong`, and beyond
two lines it ellipsises. Smaller cards want smaller numbers.

Add `"assetsFrom": "gold-classic"` to borrow another template's ornaments instead
of copying the PNGs, as `modern-grid` does. `"sortOrder"` (a number) decides where the
template appears in the admin picker — lower comes first.

Those numbers were measured off the original catalogue. Four products per page
is `"columns": 2, "rows": 2`; a dense trade list is `3 × 4` with
`"titleHeight": 28`. Turning on `showBrand` or `showDescription` needs no other
change — the card template already handles them.

### The ornaments

`extract-theme.mjs` pulled them out of the original PDF, so they are the real
artwork rather than a lookalike:

```bash
node catalogue-print/extract-theme.mjs "/path/to/Maruthi Enterprises Catalogue.pdf"
```

It writes `card-corner.png`, `title-clover.png`, `flourish.png` and
`cover-blessing.png` (the Kannada blessing, kept as artwork so the original
typography survives). Replace any of them with your own PNG — transparent
background, and the card corner should be square with the corner at its top left.

---

## Adding product photographs

`scripts/add-images.mjs` takes photographs, tidies them and files them in the
right place. It updates `data/catalogue.json`, so new products reach both the
website and the next PDF build.

```bash
# A folder of photos — each one is matched by file name
node scripts/add-images.mjs ~/Desktop/new-photos

# Preview the decisions without changing anything
node scripts/add-images.mjs ~/Desktop/new-photos --dry-run

# One photo, named and filed by hand
node scripts/add-images.mjs photo.jpg --name="Zandu Balm Ultra Power" \
     --category="Pain Relief & Balms" --brand="Zandu" --sizes="8 ml, 25 ml"

# Replace the photograph of a product that already exists
node scripts/add-images.mjs photo.jpg --product=zandu-balm-green
```

For each image it trims the blank border, turns an off-white background into
clean white, resizes it, and then either **matches it to an existing product**
(by file name — `kesh king oil.jpg` finds *Kesh King Ayurvedic Hair Oil*) or
**creates a new product in the closest category**. The category guess uses the
category name, the keyword hints in `scripts/category-keywords.json`, and the
most similar product already filed there; it prints its choice and the runner-up
so you can see what it did. Edit the keyword file to steer it.

### When the file names say nothing

Stock photographs arrive called `71kk3MRbGyL.jpg`. Drop a `manifest.json` beside them
and the importer uses it automatically (or pass `--manifest=path`):

```json
{
  "71kk3MRbGyL.jpg": {
    "name": "LuvLap Moisturising Baby Wipes",
    "category": "Baby Care",
    "brand": "LuvLap",
    "sizes": "72 wipes",
    "description": "Moisturising baby wipes with aloe vera."
  },
  "kayam.jpg": { "product": "kayam-churna" },
  "duplicate.jxl": { "skip": true }
}
```

`product` replaces that product's photograph, `category` files the image as a new
product there, `skip` ignores the file. `images/manifest.json` in this repository is a
worked example covering 37 photographs; `new-upload/` and `new-upload-2/cropped/` have
their own.

When a supplied photograph is a brochure page showing several products — often with
prices printed on it — crop each product out first and point the importer at the folder
of crops. `new-upload-2/cropped/README.md` is an example.

JPEG XL (`.jxl`) and HEIC files are converted with macOS `sips` before processing;
on other platforms convert them to PNG first.

| Flag | Default | Notes |
| --- | --- | --- |
| `--dry-run` | off | Show the plan, write nothing |
| `--name=` | from the file name | Single image only |
| `--category=` | guessed | Must match a category name exactly |
| `--product=` | — | Replace one product's photograph |
| `--brand=`, `--sizes=` | — | Applied to new products |
| `--transparent` | off | Keeps the background transparent, writes PNG |
| `--keep-background` | off | Leave the background exactly as shot |
| `--max=` | 1400 | Longest edge, in pixels |
| `--quality=` | 86 | JPEG quality |
| `--trim-threshold=` | 12 | Higher trims more aggressively |
| `--white-threshold=` | 244 | Higher turns more off-white into background |

Cleaning up photographs already in the catalogue:

```bash
node scripts/add-images.mjs --clean --dry-run      # see what would change
node scripts/add-images.mjs --clean                # all of them
node scripts/add-images.mjs --clean --product=krack-heel-repair-cream
```

> Background removal is a white-background trim, not a cut-out. It is right for
> studio packshots on white or near-white. A photo on a busy background needs a
> proper cut-out first — raising `--white-threshold` too far will eat the white
> parts of the product itself.

New products arrive with no description. Fill those in at `/admin/products`.
