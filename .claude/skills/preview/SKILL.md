---
name: preview
description: Build the site and generate the preview board (screenshots of every page in EN/PT at desktop and mobile, before/after against the last commit, plus UX checks). Use after any change to pages, layout, CSS or i18n, before reporting the step as done.
---

# Preview

Run from the repository root:

```sh
python3 .claude/skills/preview/preview.py            # all pages
python3 .claude/skills/preview/preview.py --only /   # one page (EN path, PT included)
```

It writes `.preview/index.html` (git-ignored). The board shows:
- Every page as EN/PT × desktop (1280px) / mobile (375px) screenshots.
- `changed` pages side by side with the last commit (the step the owner already approved); `new` and `unchanged` badges.
- Checks: broken internal links, `_data/i18n.yml` keys out of sync, pages missing their EN/PT counterpart,
  and per screenshot: horizontal overflow, number of `<h1>`, images without `alt`, tap targets < 24px on mobile.

## Then

1. Read the screenshots of the changed pages yourself (the PNGs under `.preview/shots/`) and fix visual problems.
2. Fix every issue the checks report that this step introduced. Links to pages planned for later steps are expected.
3. Rerun until the board is clean, then tell the owner it is ready to open:
   `xdg-open .preview/index.html`, and list what changed and any issue left on purpose.

Requires `jekyll`, `chromium` and `ruby` (Debian: `sudo apt install jekyll chromium`).
