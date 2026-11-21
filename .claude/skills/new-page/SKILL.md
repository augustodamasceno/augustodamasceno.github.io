---
name: new-page
description: Create a new page on the site in English and Portuguese (front matter, i18n strings, optional page CSS/JS, JSON-LD for apps, sitemap). Use whenever a page is added.
---

# New page

Specs (palette, fonts, rules) are in `AGENTS.md`. Reuse the components in `assets/css/site.css`
(see `/styleguide/`) before writing new CSS.

## Steps

1. **Pick the path and `ref`**: path `foo/` → EN at `foo/index.html`, PT at `pt/foo/index.html`.
   Both files use the same `ref: foo`. `lang` comes from `_config.yml` defaults; do not set it.
2. **Front matter** (both files):
   ```yaml
   ---
   title: Short title             # rendered as "Title | Augusto Damasceno"
   description: One sentence for search and social cards, in the page's language.
   ref: foo
   # css: /assets/css/pages/foo.css   (only if the page needs its own styles)
   # js: /assets/js/pages/foo.js      (only if the page needs its own script)
   # robots: noindex, follow           (internal pages only)
   ---
   ```
   The layout already renders meta, Open Graph, X cards, canonical and hreflang. Do not add them by hand.
3. **Content**: keep the markup in an include `_includes/pages/foo.html` shared by both languages, with every text from
   `_data/i18n.yml` (`en.foo.*` and `pt.foo.*`, same keys). Long prose that differs per language can live directly in each file.
4. **Page assets**: page-specific CSS in `assets/css/pages/<ref>.css` using only the CSS variables; JS in
   `assets/js/pages/<ref>.js`, vanilla, no libraries unless approved. Everything runs in the browser.
5. **App pages** also need:
   - JSON-LD `WebApplication` in each language (`inLanguage`), describing strictly what the app does.
   - A card on the apps page with an icon color not used by any other app.
6. **Navigation**: add to `_data/navigation.yml` only if the page belongs in the main menu.
7. **Sitemap**: add both URLs to the sitemap unless the page is `noindex`.
8. Run the `preview` skill and fix what it reports.
