#!/usr/bin/env python3
"""Preview board: build the site, screenshot every page (EN/PT x desktop/mobile),
run UX checks and compare against the last commit (HEAD).

Usage:
  python3 .claude/skills/preview/preview.py              # all pages
  python3 .claude/skills/preview/preview.py --only /     # one page (EN path; PT counterpart included)
Output: .preview/index.html  (git-ignored)
Needs: jekyll, chromium, ruby (installed with jekyll).
"""
import argparse, functools, hashlib, html, http.server, io, json, re, shutil, subprocess, sys, tarfile, threading, time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
OUT = ROOT / ".preview"
WIDTHS = {"desktop": 1280, "mobile": 375}
MAX_H = 16000

PROBE = """<!doctype html><meta charset="utf-8"><style>body{margin:0}iframe{border:0;width:100vw;height:100vh}</style>
<pre id="out"></pre><iframe id="f"></iframe><script>
const u=new URLSearchParams(location.search).get('u'),f=document.getElementById('f');
f.onload=()=>f.contentDocument.fonts.ready.then(()=>setTimeout(()=>{const d=f.contentDocument,e=d.documentElement,w=f.contentWindow;
 const wide=[...d.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>w.innerWidth+1&&!n.closest('.table-wrap,pre')).slice(0,5)
   .map(n=>n.tagName.toLowerCase()+(typeof n.className=='string'&&n.className.trim()?'.'+n.className.trim().split(/\\s+/).join('.'):''));
 const small=[...d.querySelectorAll('a,button,input,select')].filter(n=>{const r=n.getBoundingClientRect();
   return r.width>0&&r.height>0&&r.bottom>0&&r.height<24&&!n.closest('p,li,td,label,.skip-link')&&!n.matches('.card__link')}).length;
 document.getElementById('out').textContent=JSON.stringify({h:e.scrollHeight,overflow:e.scrollWidth>w.innerWidth,wide,
  title:d.title,h1:d.querySelectorAll('h1').length,imgNoAlt:d.querySelectorAll('img:not([alt])').length,smallTargets:small});},300));
f.src=u;</script>"""


def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


# ---------- build / serve ----------
def build(src, dest):
    r = sh(["jekyll", "build", "-q", "-s", str(src), "-d", str(dest)])
    if r.returncode:
        sys.exit("jekyll build failed:\n" + r.stdout + r.stderr)
    if r.stderr.strip():
        print(r.stderr.strip())
    (dest / "__probe.html").write_text(PROBE)


def serve(directory, port):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Quiet, directory=str(directory)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def pages(site):
    out = []
    for p in sorted(site.rglob("*.html")):
        if p.name.startswith("__"):
            continue
        rel = "/" + p.relative_to(site).as_posix()
        out.append(rel[: -len("index.html")] if rel.endswith("index.html") else rel)
    return out


def fingerprints(site, urls):
    """Hash of each page's HTML + all assets: 'changed' means the code changed, not pixel noise."""
    assets = hashlib.sha256()
    for f in sorted(site.rglob("*")):
        if f.is_file() and f.suffix != ".html":
            assets.update(f.relative_to(site).as_posix().encode() + f.read_bytes())
    out = {}
    for u in urls:
        f = site / u.lstrip("/")
        f = f / "index.html" if f.is_dir() else f
        out[u] = hashlib.sha256(f.read_bytes() + assets.digest()).hexdigest()
    return out


# ---------- screenshots ----------
def chromium(args):
    return sh(["timeout", "90", "chromium", "--headless=new", "--no-sandbox", "--disable-gpu",
               "--hide-scrollbars", "--virtual-time-budget=6000", *args])


def probe(base, url, width):
    r = chromium([f"--window-size={width},900", "--dump-dom", f"{base}/__probe.html?u={quote(url)}"])
    m = re.search(r'<pre id="out">(.*?)</pre>', r.stdout, re.S)
    try:
        return json.loads(html.unescape(m.group(1)))
    except Exception:
        return {"h": 2000, "error": "probe failed"}


def slug(url):
    return (url.strip("/").replace("/", "__") or "home").replace(".html", "")


def shoot_all(site, urls, shots, port):
    shots.mkdir(parents=True, exist_ok=True)
    srv = serve(site, port)
    base = f"http://127.0.0.1:{port}"
    info = {}
    for url in urls:
        for name, w in WIDTHS.items():
            i = probe(base, url, w)
            h = min(max(i.get("h", 2000), 600), MAX_H)
            chromium([f"--window-size={w},{h}", f"--screenshot={shots / (slug(url) + '--' + name + '.png')}", base + url])
            info[(url, name)] = i
            print(f"  {url:32} {name:8} h={i.get('h')}{'  OVERFLOW' if i.get('overflow') else ''}")
    srv.shutdown()
    return info


# ---------- baseline (last commit) ----------
def baseline(port):
    """Build + screenshot HEAD once per commit (cached in .preview/base/<sha>)."""
    head = sh(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"]).stdout.strip()
    if not head:
        return None, {}, set()
    bdir = OUT / "base" / head
    if not (bdir / "done").exists():
        shutil.rmtree(OUT / "base", ignore_errors=True)
        src = bdir / "src"
        src.mkdir(parents=True)
        tar = subprocess.run(["git", "-C", str(ROOT), "archive", "HEAD"], capture_output=True, check=True).stdout
        tarfile.open(fileobj=io.BytesIO(tar)).extractall(src, filter="data")
        build(src, bdir / "site")
        print(f"Baseline {head}:")
        shoot_all(bdir / "site", pages(bdir / "site"), bdir / "shots", port + 1)
        (bdir / "done").write_text("")
    burls = pages(bdir / "site")
    return head, fingerprints(bdir / "site", burls), set(burls)


# ---------- checks ----------
def check_links(site):
    broken = {}
    for p in site.rglob("*.html"):
        if p.name.startswith("__"):
            continue
        src = "/" + p.relative_to(site).as_posix()
        for ref in re.findall(r'(?:href|src)="(/[^"#?]*)', p.read_text(errors="ignore")):
            t = site / ref.lstrip("/")
            if not (t.is_file() or (t / "index.html").is_file()):
                broken.setdefault(ref, set()).add(src)
    return {k: sorted(v) for k, v in sorted(broken.items())}


def check_i18n():
    code = ('require "yaml"; require "json"; d=YAML.load_file(ARGV[0]);'
            'f=->(h,p=""){h.flat_map{|k,v| v.is_a?(Hash) ? f.(v,"#{p}#{k}.") : ["#{p}#{k}"]}};'
            'en=f.(d["en"]); pt=f.(d["pt"]); puts JSON.generate({"missing in pt"=>en-pt,"missing in en"=>pt-en})')
    r = sh(["ruby", "-e", code, str(ROOT / "_data/i18n.yml")])
    try:
        return json.loads(r.stdout)
    except Exception:
        return {"error": [r.stderr.strip()]}


def check_translations(urls):
    missing = []
    for u in urls:
        other = "/" + u[len("/pt/"):] if u.startswith("/pt/") else "/pt" + u
        if other not in urls and "404" not in u:
            missing.append(u)
    return missing


# ---------- board ----------
CSS = """:root{--bg:#0e0b16;--s:#161122;--b:#2c2340;--t:#ece6f5;--m:#9a90ad;--p:#b069ff;--k:#fd94ee;--g:#00ff00;color-scheme:dark}
body{margin:0;padding:24px;background:var(--bg);color:var(--t);font:14px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:22px} h2{font-size:16px;margin:0 0 12px} h2 small{color:var(--m);font-weight:400}
a{color:var(--k)} .m{color:var(--m)} code{color:var(--k)}
.checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:16px 0 24px}
.checks div{background:var(--s);border:1px solid var(--b);border-radius:10px;padding:12px}
.checks h3{margin:0 0 6px;font-size:13px;color:var(--p)}
ul{margin:0;padding-left:18px} .ok{color:var(--g);list-style:none;margin-left:-18px}
.filter{margin:8px 0 0} .filter label{cursor:pointer}
section{border-top:1px solid var(--b);padding:16px 0} body.only-changed section.same{display:none}
.row{display:flex;gap:16px;align-items:flex-start;overflow-x:auto;padding-bottom:8px}
.cell{flex:none} .desktop img{width:400px} .mobile img{width:160px}
.pair{display:flex;gap:6px}
figure{margin:0} figcaption{font-size:12px;color:var(--m);margin-bottom:4px;white-space:nowrap}
img{display:block;max-height:860px;object-fit:cover;object-position:top;border:1px solid var(--b);border-radius:8px}
.before img{opacity:.75}
.b{margin-left:6px;padding:0 6px;border-radius:99px;font-size:11px;color:#12091c}
.new{background:var(--k)} .chg{background:var(--p)} .same-b{background:var(--b);color:var(--m)}
.iss{font-size:12px;color:#ffc46b;margin-top:6px;max-width:400px}"""


def board(rows, checks, head, elapsed):
    def fig(src, label, cls=""):
        return (f'<figure class="{cls}"><figcaption>{label}</figcaption>'
                f'<a href="{src}" target="_blank"><img loading="lazy" src="{src}" alt=""></a></figure>')

    badges = {"new": '<span class="b new">new</span>', "changed": '<span class="b chg">changed</span>',
              "same": '<span class="b same-b">unchanged</span>'}
    sections, n_changed = [], 0
    for page, variants in rows.items():
        cells, any_change = [], False
        for v in variants:
            any_change |= v["status"] != "same"
            cur = fig(v["shot"], v["key"] + badges[v["status"]])
            if v["status"] == "changed":
                cur = f'<div class="pair">{fig(v["before"], v["key"] + " · " + head, "before")}{cur}</div>'
            iss = "".join(f"<li>{i}</li>" for i in v["issues"]) or '<li class="ok">ok</li>'
            cells.append(f'<div class="cell {v["key"].split("-")[-1]}">{cur}<ul class="iss">{iss}</ul></div>')
        n_changed += any_change
        sections.append(f'<section class="{"chg" if any_change else "same"}"><h2><a href="site{page}" target="_blank">{page}</a> '
                        f'<small>{html.escape(variants[0]["title"])}</small></h2><div class="row">{"".join(cells)}</div></section>')

    def ul(items):
        return "".join(items) or '<li class="ok">none</li>'
    links = ul([f"<li><code>{html.escape(k)}</code> ← {', '.join(v)}</li>" for k, v in checks["links"].items()])
    i18n = ul([f"<li>{k}: {', '.join(v)}</li>" for k, v in checks["i18n"].items() if v])
    trans = ul([f"<li><code>{u}</code></li>" for u in checks["translations"]])
    vs = f"compared with last commit <code>{head}</code>" if head else "no commit yet, so everything is new"
    (OUT / "index.html").write_text(f"""<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview board</title><style>{CSS}</style>
<h1>Preview board</h1>
<p class="m">{time.strftime("%Y-%m-%d %H:%M")} · {len(rows)} pages, {n_changed} changed, {vs} · {elapsed:.0f}s ·
thumbnails show the top of each page; click one for the full screenshot.</p>
<p class="filter"><label><input type="checkbox" onchange="document.body.classList.toggle('only-changed',this.checked)"> only changed pages</label></p>
<div class="checks"><div><h3>Broken internal links</h3><ul>{links}</ul></div>
<div><h3>i18n keys out of sync</h3><ul>{i18n}</ul></div>
<div><h3>Pages without EN/PT counterpart</h3><ul>{trans}</ul></div></div>
{''.join(sections)}
</html>""")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="EN page paths, e.g. / /apps/ (PT counterparts included)")
    ap.add_argument("--port", type=int, default=4123)
    a = ap.parse_args()
    t0 = time.time()
    OUT.mkdir(exist_ok=True)
    site, shots = OUT / "site", OUT / "shots"
    shutil.rmtree(shots, ignore_errors=True)

    build(ROOT, site)
    urls = pages(site)
    targets = urls
    if a.only:
        wanted = set(a.only) | {"/pt" + u for u in a.only}
        targets = [u for u in urls if u in wanted]

    head, base_fp, base_urls = baseline(a.port)
    print("Current:")
    info = shoot_all(site, targets, shots, a.port)
    cur_fp = fingerprints(site, urls)

    rows = {}
    for url in targets:
        lang = "pt" if url.startswith("/pt/") else "en"
        page = url[3:] if lang == "pt" else url
        status = "new" if url not in base_urls else ("changed" if base_fp.get(url) != cur_fp[url] else "same")
        for name in WIDTHS:
            i = info[(url, name)]
            issues = []
            if i.get("overflow"):
                issues.append("horizontal overflow: " + ", ".join(i.get("wide") or []))
            if i.get("h1", 1) != 1:
                issues.append(f"{i.get('h1')} &lt;h1&gt; (expected 1)")
            if i.get("imgNoAlt"):
                issues.append(f"{i['imgNoAlt']} img without alt")
            if name == "mobile" and i.get("smallTargets"):
                issues.append(f"{i['smallTargets']} tap targets &lt; 24px")
            if i.get("error"):
                issues.append(i["error"])
            rows.setdefault(page, []).append({
                "key": f"{lang}-{name}", "title": i.get("title", ""), "status": status, "issues": issues,
                "shot": f"shots/{slug(url)}--{name}.png", "before": f"base/{head}/shots/{slug(url)}--{name}.png"})
    rows = {k: sorted(v, key=lambda x: x["key"]) for k, v in sorted(rows.items())}

    checks = {"links": check_links(site), "i18n": check_i18n(), "translations": check_translations(urls)}
    board(rows, checks, head, time.time() - t0)

    print("\nChecks:", json.dumps(checks, indent=1, ensure_ascii=False))
    for page, vs in rows.items():
        for v in vs:
            if v["issues"]:
                print(f"  {page} {v['key']}: {'; '.join(v['issues'])}")
    print(f"\nBoard: {OUT / 'index.html'}")


if __name__ == "__main__":
    main()
