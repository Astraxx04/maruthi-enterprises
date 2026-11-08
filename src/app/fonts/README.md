# Fonts

Self-hosted so the build never depends on reaching Google. `next/font/google`
downloads font files during the build; when that fetch fails — as it did on
Netlify — the build dies with `TypeError: Cannot read properties of null`.
These files remove the network from the critical path, and visitors load them
from our own domain instead of a third party.

| File | Family | Licence |
| --- | --- | --- |
| `inter-latin.woff2` | Inter, variable 100–900, latin subset | SIL Open Font License 1.1 |
| `sora-latin.woff2` | Sora, variable 100–800, latin subset | SIL Open Font License 1.1 |

Both are wired up in `src/app/layout.tsx` with `next/font/local`.

## Refreshing them

Ask Google Fonts for the CSS, take the `src` whose `unicode-range` begins
`U+0000-00FF` (that is the latin subset), and save it here under the same name:

```bash
curl -s -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap"
```

Changing to a different family means updating the `localFont` calls in
`src/app/layout.tsx` and the `--font-sans` / `--font-display` stacks in
`src/app/globals.css`.
