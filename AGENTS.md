# augustodamasceno.org — specs

Personal website and portfolio. Fully static: Jekyll on GitHub Pages, plain HTML/CSS/vanilla JS, no backend.

## Languages
- English at `/`, Portuguese under `/pt/`.
- Translated pages share the same `ref` in front matter. UI strings live in `_data/i18n.yml`.

## Palette
Colors come from the logo. Use the CSS variables in `assets/css/site.css`.

| Variable             | Hex       | Use                                   |
|----------------------|-----------|---------------------------------------|
| `--color-purple`     | `#b069ff` | Primary: buttons, focus, accents      |
| `--color-pink`       | `#fd94ee` | Secondary: links, highlights          |
| `--color-green`      | `#00ff00` | Rare accent: results, status          |
| `--color-bg`         | `#0e0b16` | Background                            |
| `--color-surface`    | `#161122` | Cards, header, inputs                 |
| `--color-surface-2`  | `#1e172d` | Raised surfaces                       |
| `--color-border`     | `#2c2340` | Borders                               |
| `--color-text`       | `#ece6f5` | Text                                  |
| `--color-text-muted` | `#9a90ad` | Secondary text                        |

## Fonts
Orbitron (wordmark), Space Grotesk (headings), Inter (body), JetBrains Mono (numbers/code).

## Personal data
Only name, email, GitHub and professional content the owner wrote may be published. Everything else needs the
owner's approval. Every commit goes through the `commit` skill (`.claude/skills/commit/`): it enforces these rules,
blocks secrets, local machine details and image metadata, then makes the signed commit and pushes.

## Pages
- Front matter: `title`, `description`, `ref`.
- App pages: JSON-LD `WebApplication`, listed on the apps page with a unique icon color.
- Add new pages to the sitemap.
