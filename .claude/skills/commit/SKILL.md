---
name: commit
description: Approve and make a commit. Checks staged files against the personal data rules (only name, email, GitHub and professional content may be published), secrets, local machine details and image metadata, then makes a GPG-signed commit and pushes. Use for every commit, only when the owner asks to commit.
---

# Commit approval

## Personal data rules
- **Allowed** on the site and in the repository: name (Augusto Damasceno), email (augustodamasceno@protonmail.com),
  GitHub (github.com/augustodamasceno), and professional content the owner wrote (bio, areas, projects).
- **Forbidden** unless the owner explicitly approves it: phone, address, city/location, documents (CPF, RG, CNPJ),
  birth date, photos of people, employers/clients, other accounts or profiles (LinkedIn, social networks, messengers).
- Never add personal information taken from other sources or inferred. Only what the owner wrote.
- Images must have no metadata (EXIF, XMP, GPS, IPTC, PNG text chunks).
- No secrets, tokens, private keys, local paths (`/home/...`), hostnames or private IPs.

When the owner approves a new item (e.g. a LinkedIn link), add it to the allowlist at the top of `check.py`
in the same commit, and mention it in the commit message.

## Steps

1. Stage the step's files (`git add -A`, after checking `git status` for anything unexpected).
2. Run the check:
   ```sh
   python3 .claude/skills/commit/check.py           # --strip removes JPEG/PNG metadata and re-stages
   ```
   - `BLOCK`: fix it, or ask the owner for approval and update the allowlist. Never commit while blocked.
   - `WARN`: decide case by case; tell the owner if kept.
   - `REVIEW`: images always need the owner's confirmation that they may be published.
3. Read the staged diff (`git diff --cached`) for what the script cannot detect: the forbidden categories written
   in prose (city, employer, clients, birth date, family, health...).
4. If pages, layout, CSS or i18n changed, the `preview` board must be clean.
5. Commit, always signed, with a message that says what the step did:
   ```sh
   git commit -S -m "Short summary" -m "Details" -m "Co-Authored-By: ..."
   ```
   Verify with `git log --show-signature -1`. If signing fails, stop and tell the owner. Never commit unsigned.
6. Push the current branch (`git push`). While the new site is being built, work happens on `new-site`;
   never push to `main` without the owner's explicit approval.
