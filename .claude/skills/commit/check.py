#!/usr/bin/env python3
"""Commit approval check: scans the STAGED files for personal data, secrets,
local machine details and image metadata. Exit 1 if anything blocks the commit.

Usage:
  python3 .claude/skills/commit/check.py           # check staged files
  python3 .claude/skills/commit/check.py --strip   # also strip EXIF/XMP/text metadata from staged JPEG/PNG and re-stage
"""
import re, subprocess, sys
from pathlib import Path

# ---- Allowlist: personal data the owner approved for publication ----
ALLOWED_EMAILS = {"augustodamasceno@protonmail.com"}
ALLOWED_EMAIL_DOMAINS = {"example.com", "example.org"}          # documentation examples
ALLOWED_URLS = ["https://github.com/augustodamasceno"]           # profile links approved by the owner
COMMIT_EMAIL = "augustodamasceno@protonmail.com"

ROOT = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
SELF = ".claude/skills/commit/check.py"

PROFILE_RE = re.compile(r"(?i)\b(?:https?://)?(?:www\.)?(?:linkedin\.com|instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com/|"
                        r"t\.me/|telegram\.me|wa\.me|api\.whatsapp|discord\.gg|discord\.com/users|tiktok\.com|youtube\.com/(?:@|c/|channel)|"
                        r"reddit\.com/u|medium\.com/@|lattes\.cnpq\.br|orcid\.org|keybase\.io|google\.[a-z.]+/maps|maps\.app\.goo\.gl|goo\.gl/maps)[^\s\"'<>)]*")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}")
RULES = [  # (severity, reason, regex)
    ("BLOCK", "phone number", re.compile(r"(?<![\w.])(?:\+\d{1,3}[\s.-]?)\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}(?!\d)|\(\d{2}\)\s?9?\d{4}-\d{4}")),
    ("BLOCK", "CPF", re.compile(r"(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)")),
    ("BLOCK", "CNPJ", re.compile(r"(?<!\d)\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}(?!\d)")),
    ("WARN", "looks like a CEP (postal code)", re.compile(r"(?<![\d-])\d{5}-\d{3}(?![\d-])")),
    ("BLOCK", "private key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY")),
    ("BLOCK", "API token", re.compile(r"\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,})")),
    ("BLOCK", "password/secret assignment", re.compile(r"(?i)\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*[\"'][^\"']{4,}[\"']")),
    ("BLOCK", "local machine path", re.compile(r"(?:/home/[a-z_][\w-]*|/Users/[A-Za-z][\w-]*|[A-Z]:\\\\?Users\\\\?\w+|/tmp/claude-\d+)")),
    ("BLOCK", "local hostname", re.compile(r"(?i)\b[\w-]+\.(?:mshome\.net|lan|internal)\b")),
    ("WARN", "private IP address", re.compile(r"\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b")),
]
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".heic", ".avif"}
PNG_META = {b"tEXt", b"zTXt", b"iTXt", b"eXIf", b"tIME"}


def staged():
    out = subprocess.check_output(["git", "-C", str(ROOT), "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
    return [p for p in out.decode().split("\0") if p]


def blob(path):
    return subprocess.check_output(["git", "-C", str(ROOT), "show", f":{path}"])


# ---------- images ----------
def jpeg_meta(b):
    """Return list of metadata segments found in a JPEG (APP1 Exif/XMP, APP13 Photoshop/IPTC, COM)."""
    found, i = [], 2
    while i + 4 <= len(b) and b[i] == 0xFF:
        m = b[i + 1]
        if m in (0xD9, 0xDA):
            break
        if 0xD0 <= m <= 0xD7 or m == 0x01:
            i += 2
            continue
        length = int.from_bytes(b[i + 2:i + 4], "big")
        if m == 0xE1:
            found.append("XMP" if b"xmpmeta" in b[i:i + 2 + length] or b"ns.adobe.com/xap" in b[i:i + 60] else "EXIF")
        elif m == 0xED:
            found.append("Photoshop/IPTC")
        elif m == 0xFE:
            found.append("comment")
        i += 2 + length
    return found


def strip_jpeg(b):
    out, i = bytearray(b[:2]), 2
    while i < len(b):
        if b[i] != 0xFF:
            raise ValueError("unexpected JPEG structure")
        m = b[i + 1]
        if m == 0xFF:          # fill byte
            i += 1
            continue
        if m == 0xDA or m == 0xD9:  # start of scan / end: copy the rest untouched
            out += b[i:]
            break
        if 0xD0 <= m <= 0xD7 or m == 0x01:
            out += b[i:i + 2]
            i += 2
            continue
        length = int.from_bytes(b[i + 2:i + 4], "big")
        if m not in (0xE1, 0xED, 0xFE):  # keep APP0 (JFIF), APP2 (ICC color), APP14 (Adobe), tables...
            out += b[i:i + 2 + length]
        i += 2 + length
    return bytes(out)


def png_chunks(b):
    i = 8
    while i + 8 <= len(b):
        length = int.from_bytes(b[i:i + 4], "big")
        yield b[i + 4:i + 8], b[i:i + 12 + length]
        i += 12 + length


def strip_png(b):
    return b[:8] + b"".join(c for t, c in png_chunks(b) if t not in PNG_META)


def image_meta(path, b):
    ext = Path(path).suffix.lower()
    if ext in (".jpg", ".jpeg"):
        return jpeg_meta(b)
    if ext == ".png":
        return sorted({t.decode() for t, _ in png_chunks(b) if t in PNG_META})
    return [k for k, sig in (("EXIF", b"Exif"), ("XMP", b"xmpmeta"), ("GPS", b"GPS")) if sig in b]


# ---------- text ----------
def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def scan_text(path, text, report):
    for m in EMAIL_RE.finditer(text):
        email, domain = m.group(0), m.group(0).split("@", 1)[1].lower()
        if email.lower() not in ALLOWED_EMAILS and domain not in ALLOWED_EMAIL_DOMAINS:
            report("BLOCK", path, line_of(text, m.start()), "email not in allowlist", email)
    for m in PROFILE_RE.finditer(text):
        if not any(m.group(0).startswith(u) for u in ALLOWED_URLS):
            report("BLOCK", path, line_of(text, m.start()), "profile/location link not in allowlist", m.group(0))
    for sev, reason, rx in RULES:
        for m in rx.finditer(text):
            report(sev, path, line_of(text, m.start()), reason, m.group(0))
    if path.endswith(".svg"):
        for rx, reason in ((r"<metadata[\s>]", "SVG <metadata> block"), (r"(?:inkscape|sodipodi):[\w-]*(?:filename|docname)", "SVG editor file name"),
                           (r"<dc:(?:creator|rights|publisher)", "SVG author metadata")):
            for m in re.finditer(rx, text):
                report("BLOCK", path, line_of(text, m.start()), reason, m.group(0))


def main():
    strip = "--strip" in sys.argv
    results = []

    def report(sev, path, line, reason, snippet):
        results.append((sev, path, line, reason, snippet[:80]))

    # Commit identity
    email = subprocess.run(["git", "-C", str(ROOT), "config", "user.email"], capture_output=True, text=True).stdout.strip()
    key = subprocess.run(["git", "-C", str(ROOT), "config", "user.signingkey"], capture_output=True, text=True).stdout.strip()
    if email != COMMIT_EMAIL:
        report("BLOCK", "git config", 0, f"commit email must be {COMMIT_EMAIL}", email or "(unset)")
    if not key:
        report("BLOCK", "git config", 0, "user.signingkey is not set (commits must be signed)", "")

    files = staged()
    for path in files:
        data = blob(path)
        ext = Path(path).suffix.lower()
        if ext in IMAGE_EXT:
            meta = image_meta(path, data)
            if meta and strip and ext in (".jpg", ".jpeg", ".png"):
                clean = strip_jpeg(data) if ext != ".png" else strip_png(data)
                (ROOT / path).write_bytes(clean)
                subprocess.check_call(["git", "-C", str(ROOT), "add", path])
                report("FIXED", path, 0, "stripped image metadata", ", ".join(meta))
            elif meta:
                hint = "run with --strip" if ext in (".jpg", ".jpeg", ".png") else "re-export without metadata"
                report("BLOCK", path, 0, f"image metadata ({hint})", ", ".join(meta))
            report("REVIEW", path, 0, "new/changed image: confirm with the owner it may be published", "")
            continue
        if path == SELF or b"\0" in data[:8000]:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        if ext == ".pdf" or "/Author" in text[:5000]:
            report("BLOCK", path, 0, "document metadata (/Author)", "")
        scan_text(path, text, report)

    order = {"BLOCK": 0, "WARN": 1, "REVIEW": 2, "FIXED": 3}
    for sev, path, line, reason, snip in sorted(results, key=lambda r: (order[r[0]], r[1], r[2])):
        loc = f"{path}:{line}" if line else path
        print(f"{sev:6} {loc}: {reason}" + (f"  [{snip}]" if snip else ""))
    blocks = sum(r[0] == "BLOCK" for r in results)
    print(f"\n{len(files)} staged files checked: {blocks} blocking, "
          f"{sum(r[0] == 'WARN' for r in results)} warnings, {sum(r[0] == 'REVIEW' for r in results)} to review.")
    print("RESULT: " + ("BLOCKED" if blocks else "OK"))
    sys.exit(1 if blocks else 0)


if __name__ == "__main__":
    main()
