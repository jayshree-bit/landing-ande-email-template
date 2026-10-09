"""LP & Email automation tool.

Run:  python app.py   then open http://localhost:5050
"""
import csv
import io
import json
import mimetypes
import os
import re
import shutil
import smtplib
import threading
import urllib.request
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

from flask import Flask, Response, abort, jsonify, render_template, request, send_file, send_from_directory
from flask_cors import CORS

import generator as gen
from markupsafe import Markup

BASE = Path(__file__).parent


def load_env(path=BASE / ".env"):
    """Minimal .env loader so python-dotenv isn't required."""
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
# Generated landing pages may be hosted on another domain and post leads here.
CORS(app, resources={r"/api/submit/*": {"origins": "*"}})

FILE_ROLES = {
    "logo": ("logo", {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}),
    "partner_logo": ("partner-logo", {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}),
    "banner": ("banner", {".png", ".jpg", ".jpeg", ".gif", ".webp"}),
    "pdf": (None, {".pdf"}),
}


def public_base():
    return os.environ.get("PUBLIC_BASE_URL") or request.host_url.rstrip("/")


def _filename_for(role, original, ext):
    stem, _ = FILE_ROLES[role]
    if stem:
        return stem + ext
    # Keep the PDF's own name (sanitised) since users see it when it downloads.
    return re.sub(r"[^A-Za-z0-9._-]+", "-", Path(original).stem).strip("-") + ext


def _store_file(slug, role, data, original, content_type=None):
    ext = Path(original).suffix.lower()
    if not ext and content_type:
        ext = mimetypes.guess_extension(content_type.split(";")[0]) or ""
    ext = ".jpg" if ext == ".jpe" else ext
    if ext not in FILE_ROLES[role][1]:
        raise ValueError(f"{role}: unsupported file type '{ext or 'unknown'}'")
    up = gen.campaign_dir(slug) / "uploads"
    up.mkdir(parents=True, exist_ok=True)
    name = _filename_for(role, original, ext)
    (up / name).write_bytes(data)
    return name


def _fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 LP-Automation"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(), r.headers.get("Content-Type", "")


# ---------------------------------------------------------------- builder UI

@app.get("/")
def dashboard():
    return render_template("dashboard.html")


@app.get("/builder")
@app.get("/builder/<slug>")
def builder(slug=""):
    if slug and not (gen.campaign_dir(slug) / "config.json").exists():
        abort(404)
    return render_template("builder.html", slug=slug)


@app.get("/api/campaigns")
def list_campaigns():
    items = []
    if gen.CAMPAIGNS.exists():
        for d in sorted(gen.CAMPAIGNS.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if (d / "config.json").exists():
                cfg = gen.load_config(d.name)
                leads = d / "leads.jsonl"
                count = sum(1 for _ in leads.open(encoding="utf-8")) if leads.exists() else 0
                files = cfg.get("files", {})
                thumb = files.get("banner") or files.get("logo")
                items.append({
                    "slug": d.name, "name": cfg.get("campaign_name", d.name), "leads": count,
                    "updated_at": cfg.get("updated_at"), "created_at": cfg.get("created_at"),
                    "partner": cfg.get("partner_name", ""),
                    "thumb": f"/c/{d.name}/landing-page/assets/{thumb}" if thumb else "",
                    "generated": (gen.GENERATED / d.name / "landing-page" / "index.html").exists(),
                })
    return jsonify(items)


@app.get("/api/campaigns/<slug>")
def get_campaign(slug):
    if not (gen.campaign_dir(slug) / "config.json").exists():
        abort(404)
    cfg = gen.load_config(slug)
    cfg["visual_saved"] = {p: gen.visual_path(slug, p).exists() for p in gen.VISUAL_PAGES}
    return jsonify(cfg)


@app.post("/api/campaigns")
def save_campaign():
    try:
        cfg = json.loads(request.form.get("config", "{}"))
    except json.JSONDecodeError:
        return jsonify(error="Invalid config"), 400

    slug = gen.slugify(cfg.get("slug") or cfg.get("campaign_name"))
    if request.form.get("is_new") == "1":
        slug = unique_slug(slug)
    cfg["slug"] = slug
    existing = gen.load_config(slug) if (gen.campaign_dir(slug) / "config.json").exists() else {}
    cfg["created_at"] = existing.get("created_at") or datetime.now(timezone.utc).isoformat()
    files = dict(existing.get("files", {}))

    try:
        for role in FILE_ROLES:
            upload = request.files.get(role)
            url = (cfg.get("file_urls") or {}).get(role, "").strip()
            if upload and upload.filename:
                files[role] = _store_file(slug, role, upload.read(), upload.filename, upload.mimetype)
            elif url:
                data, ctype = _fetch_url(url)
                files[role] = _store_file(slug, role, data, url.split("?")[0].rsplit("/", 1)[-1], ctype)
            elif cfg.get("remove_files", {}).get(role):
                files.pop(role, None)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:  # network errors fetching an image URL
        return jsonify(error=f"Could not fetch file URL: {e}"), 400

    cfg["files"] = files
    cfg["visual"] = existing.get("visual", {})  # visual-editor mode is managed by the editor, not this form
    cfg.setdefault("lp", {})["fields"] = gen.normalise_fields(cfg["lp"].get("fields"))
    cfg.pop("file_urls", None)
    cfg.pop("remove_files", None)
    cfg["updated_at"] = datetime.now(timezone.utc).isoformat()
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())

    base = f"/c/{slug}"
    return jsonify(
        slug=slug,
        files=files,
        landing=f"{base}/landing-page/index.html",
        thankyou=f"{base}/landing-page/thank-you.html",
        email=f"{base}/email-template/email.html",
        zip=f"/download/{slug}.zip",
        leads=f"/api/campaigns/{slug}/leads.csv",
    )


def unique_slug(slug):
    candidate, n = slug, 2
    while gen.campaign_dir(candidate).exists():
        candidate, n = f"{slug}-{n}", n + 1
    return candidate


@app.delete("/api/campaigns/<slug>")
def delete_campaign(slug):
    d = gen.campaign_dir(slug)
    if not (d / "config.json").exists():
        abort(404)
    shutil.rmtree(d)
    shutil.rmtree(gen.GENERATED / slug, ignore_errors=True)
    for z in gen.GENERATED.glob(f"{slug}*.zip"):
        try:
            z.unlink(missing_ok=True)
        except PermissionError:  # Windows: a download may still hold the file open
            pass
    return jsonify(ok=True)


@app.post("/api/campaigns/<slug>/duplicate")
def duplicate_campaign(slug):
    src = gen.campaign_dir(slug)
    if not (src / "config.json").exists():
        abort(404)
    new = unique_slug(f"{slug}-copy")
    shutil.copytree(src, gen.campaign_dir(new), ignore=shutil.ignore_patterns("leads.jsonl"))
    cfg = gen.load_config(new)
    now = datetime.now(timezone.utc).isoformat()
    cfg.update(slug=new, campaign_name=f"{cfg.get('campaign_name', slug)} (copy)", created_at=now, updated_at=now)
    gen.save_config(new, cfg)
    gen.build(new, public_base())
    return jsonify(slug=new)


# ---------------------------------------------------------------- ready-made designs

DEMO_PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
            b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF")


@app.get("/templates")
def templates_gallery():
    return render_template("templates_gallery.html")


@app.get("/api/templates")
def list_templates():
    return jsonify(gen.library())


@app.get("/templates/preview/<kind>/<tid>")
def template_preview(kind, tid):
    """A ready-made design as a full page: with a campaign's assets (?slug=) or with the demo content."""
    slug = request.args.get("slug", "")
    if slug:
        _require(slug)
        if not (gen.GENERATED / slug / "landing-page" / "assets" / "style.css").exists():
            gen.build(slug, public_base())
        _, ctx = gen.build_context(slug, public_base())
        base, ctx["img_base"] = f"/c/{slug}/landing-page/", f"/c/{slug}/email-template/images/"
    else:
        ctx, base = gen.demo_context(), "/templates/demo/"
        ctx["img_base"] = "/templates/demo/assets/"
    ctx["js_config"] = {**ctx["js_config"], "formAction": ""}  # previews never send leads
    try:
        body, css = gen.render_library(kind, tid, ctx)
    except KeyError:
        abort(404)
    if kind == "email":
        html_body, leftover = gen.email_visual({"html": body, "css": css}, slug or "demo", ctx)
        page = gen.env.get_template("email_visual.html").render(**ctx, visual_body=Markup(html_body), visual_css=Markup(leftover))
    else:
        page = gen.env.get_template("landing.html" if kind == "landing" else "thankyou.html").render(
            **ctx, visual_body=Markup(gen.fill_blocks(body, ctx)), visual_css=Markup(css))
    return page.replace("<head>", f'<head>\n  <base href="{base}">', 1)


@app.get("/templates/demo/assets/<path:name>")
def demo_asset(name):
    if name in ("style.css", "script.js", "effects.js"):
        text = gen.render_asset(name, gen.demo_context())
        return Response(text, mimetype="text/css" if name.endswith(".css") else "application/javascript")
    if name in gen.DEMO_SVGS:
        return Response(gen.DEMO_SVGS[name], mimetype="image/svg+xml")
    if name == "guide.pdf":
        return Response(DEMO_PDF, mimetype="application/pdf")
    abort(404)


@app.get("/api/campaigns/<slug>/library/<kind>/<tid>")
def library_design(slug, kind, tid):
    """A ready-made design rendered with this campaign's content, ready to load into the editor."""
    _require(slug, kind)
    try:
        body, css = gen.library_for_editor(kind, tid, slug, public_base())
    except KeyError:
        abort(404)
    return jsonify(html=body, css=css)


@app.post("/api/campaigns/from-template")
def create_from_template():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="Please enter a campaign name."), 400
    slug = unique_slug(gen.slugify(name))
    cfg = gen.new_campaign_config(name, slug)
    now = datetime.now(timezone.utc).isoformat()
    cfg.update(created_at=now, updated_at=now)
    gen.save_config(slug, cfg)
    for kind in gen.VISUAL_PAGES:
        tid = data.get(kind)
        if not tid:
            continue
        try:
            body, css = gen.library_for_editor(kind, tid, slug, public_base())
        except KeyError:
            continue
        gen.save_visual(slug, kind, {"project": None, "html": body, "css": "", "base_css": css, "template": tid})
        cfg["visual"][kind] = True
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())
    return jsonify(slug=slug)


# ---------------------------------------------------------------- visual (drag & drop) editor

def _require(slug, page=None):
    if not (gen.campaign_dir(slug) / "config.json").exists() or (page and page not in gen.VISUAL_PAGES):
        abort(404)


@app.get("/editor-bundle.js")
def editor_bundle():
    """The editor's code, joined from static/editor/js and widgets/ (see generator.editor_bundle)."""
    return Response(gen.editor_bundle(), mimetype="application/javascript", headers={"Cache-Control": "no-cache"})


@app.get("/editor/<slug>")
@app.get("/editor/<slug>/<page>")
def visual_editor(slug, page="landing"):
    _require(slug, page)
    gen.build(slug, public_base())  # canvas loads the generated style.css, so it must be current
    cfg = gen.load_config(slug)
    font = (cfg.get("brand") or {}).get("font") or ""
    return render_template("editor.html", slug=slug, page=page, name=cfg.get("campaign_name", slug),
                           google_font=font if font in gen.GOOGLE_FONTS else "",
                           google_fonts=sorted(gen.GOOGLE_FONTS), asset_v=gen.editor_assets_version())


@app.get("/api/campaigns/<slug>/visual/<page>")
def get_visual(slug, page):
    _require(slug, page)
    cfg = gen.load_config(slug)
    design = gen.load_visual(slug, page)
    project = design.get("project") if design else None
    if project and '"components"' not in json.dumps(project.get("pages") or []):
        project = None  # an empty saved design would give a blank canvas: start from the layout again
    if project:
        seed = None
    elif design and (design.get("html") or "").strip():  # created from a ready-made design, not opened in the editor yet
        seed = design["html"]
    else:
        seed = gen.visual_seed(slug, page, public_base())
    return jsonify(
        enabled=bool((cfg.get("visual") or {}).get(page)),
        project=project,
        base_css=(design or {}).get("base_css", ""),
        custom={k: (design or {}).get(k, "") for k in CUSTOM_CODE_KEYS},
        form=_form_settings(cfg),
        meta=_editor_meta(slug),
        seed=seed,
        blocks=gen.block_previews(slug, public_base()),
    )


@app.post("/api/campaigns/<slug>/visual/<page>")
def save_visual(slug, page):
    _require(slug, page)
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get("html"), str):
        return jsonify(error="Missing html"), 400
    design = {"project": data.get("project"), "html": data["html"], "css": data.get("css", ""),
              "base_css": str(data.get("base_css") or ""), "template": data.get("template") or ""}
    design.update({k: str(data.get(k) or "") for k in CUSTOM_CODE_KEYS})
    gen.save_visual(slug, page, design)
    cfg = gen.load_config(slug)
    if page == "email":
        email_cfg = cfg.setdefault("email", {})
        if "email_cta_text" in data:
            email_cfg["cta_text"] = str(data["email_cta_text"] or "").strip()[:120] or "Download Now"
        if "email_cta_url" in data:
            email_cfg["cta_url"] = str(data["email_cta_url"] or "").strip()[:2048]
        cta_font = str(data.get("email_cta_font") or "")
        if "email_cta_font" in data:
            email_cfg["cta_font"] = cta_font if cta_font in gen.GOOGLE_FONTS else ""
        background = str(data.get("email_body_background_color") or "")
        if re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?", background):
            email_cfg["body_background_color"] = background
    cfg.setdefault("visual", {})[page] = True
    cfg["updated_at"] = datetime.now(timezone.utc).isoformat()
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())
    return jsonify(ok=True)


def _editor_meta(slug):
    _, ctx = gen.build_context(slug, public_base())
    lp_url = ctx["lp_url"]
    if not lp_url.startswith("http"):  # no public address yet: link to this portal's hosted copy
        lp_url = f"{public_base()}/c/{slug}/landing-page/index.html"
    pdf = ctx["files"].get("pdf")
    return {"lp_url": lp_url, "primary": ctx["primary"], "btn_text": ctx["btn_text"],
            "cta_text": (ctx.get("email") or {}).get("cta_text") or "Download Now",
            "cta_url": ctx["lp_url"],
            "cta_font": (ctx.get("email") or {}).get("cta_font") or "",
            "body_background_color": (ctx.get("email") or {}).get("body_background_color") or "#f1f5f9",
            "pdf_url": f"/c/{slug}/landing-page/assets/{pdf}" if pdf else ""}


CUSTOM_CODE_KEYS = ("custom_css", "custom_mobile_css", "custom_js")
FORM_KEYS = ("form_title", "form_intro", "submit_text", "consent_text", "consent_type")


def _form_settings(cfg):
    lp = cfg.get("lp") or {}
    return {"fields": gen.normalise_fields(lp.get("fields")), **{k: lp.get(k, "") for k in FORM_KEYS}}


@app.post("/api/campaigns/<slug>/form")
def save_form(slug):
    """Lead-form fields and texts, edited from the visual editor."""
    _require(slug)
    data = request.get_json(silent=True) or {}
    cfg = gen.load_config(slug)
    lp = cfg.setdefault("lp", {})
    if "fields" in data:
        lp["fields"] = gen.normalise_fields(data["fields"])
    for k in FORM_KEYS:
        if k in data:
            lp[k] = str(data[k] or "")
    cfg["updated_at"] = datetime.now(timezone.utc).isoformat()
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())
    return jsonify(ok=True, form=_form_settings(cfg), blocks=gen.block_previews(slug, public_base()))


SETTINGS_SECTIONS = ("brand", "layout", "company", "email", "ty")
SETTINGS_TOP_KEYS = ("campaign_name", "partner_name", "partner_label")


@app.post("/api/campaigns/<slug>/settings")
def save_settings(slug):
    """Campaign settings edited from the visual editor (no need to go back to the builder).

    Multipart: "settings" is a JSON object with any of brand/layout/company/email/ty (merged into the
    existing values), top-level names, and "remove_files"; files are sent as logo/partner_logo/banner/pdf."""
    _require(slug)
    try:
        data = json.loads(request.form.get("settings", "{}"))
    except json.JSONDecodeError:
        return jsonify(error="Invalid settings"), 400
    cfg = gen.load_config(slug)
    for section in SETTINGS_SECTIONS:
        if isinstance(data.get(section), dict):
            target = cfg.setdefault(section, {})
            for k, v in data[section].items():
                target[k] = v if isinstance(v, (bool, int, float)) else str(v or "")
    for k in SETTINGS_TOP_KEYS:
        if k in data:
            cfg[k] = str(data[k] or "")
    files = dict(cfg.get("files", {}))
    try:
        for role in FILE_ROLES:
            upload = request.files.get(role)
            if upload and upload.filename:
                files[role] = _store_file(slug, role, upload.read(), upload.filename, upload.mimetype)
            elif (data.get("remove_files") or {}).get(role):
                files.pop(role, None)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    cfg["files"] = files
    cfg["updated_at"] = datetime.now(timezone.utc).isoformat()
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())
    return jsonify(ok=True, files=files, blocks=gen.block_previews(slug, public_base()), meta=_editor_meta(slug))


@app.post("/api/campaigns/<slug>/visual/<page>/mode")
def visual_mode(slug, page):
    """Switch a page between the visual design and the standard template (the design is kept)."""
    _require(slug, page)
    enabled = bool((request.get_json(silent=True) or {}).get("enabled"))
    if enabled and not gen.load_visual(slug, page):
        return jsonify(error="Open the visual editor and save a design first."), 400
    cfg = gen.load_config(slug)
    cfg.setdefault("visual", {})[page] = enabled
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())
    return jsonify(ok=True, enabled=enabled)


@app.delete("/api/campaigns/<slug>/visual/<page>")
def reset_visual(slug, page):
    """Discard the visual design; the editor starts again from the standard layout."""
    _require(slug, page)
    gen.visual_path(slug, page).unlink(missing_ok=True)
    cfg = gen.load_config(slug)
    cfg.setdefault("visual", {})[page] = False
    gen.save_config(slug, cfg)
    gen.build(slug, public_base())
    return jsonify(ok=True)


IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}


@app.post("/api/campaigns/<slug>/media")
def upload_media(slug):
    """Image uploads from the editor's asset manager (GrapesJS response format)."""
    _require(slug)
    media = gen.campaign_dir(slug) / "uploads" / "media"
    media.mkdir(parents=True, exist_ok=True)
    out = []
    for f in request.files.getlist("files[]") or request.files.getlist("files"):
        ext = Path(f.filename or "").suffix.lower()
        if ext not in IMAGE_EXTS:
            continue
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(f.filename).stem).strip("-")[:60] or "image"
        target, n = media / f"{name}{ext}", 2
        while target.exists():
            target, n = media / f"{name}-{n}{ext}", n + 1
        f.save(target)
        out.append({"src": f"/media/{slug}/{target.name}", "name": target.name})
    return jsonify(data=out)


@app.get("/api/campaigns/<slug>/media")
def list_media(slug):
    _require(slug)
    cfg = gen.load_config(slug)
    items = [{"src": f"/c/{slug}/landing-page/assets/{n}", "name": n}
             for role, n in cfg.get("files", {}).items() if role != "pdf"]
    media = gen.campaign_dir(slug) / "uploads" / "media"
    if media.is_dir():
        items += [{"src": f"/media/{slug}/{p.name}", "name": p.name} for p in sorted(media.iterdir())]
    return jsonify(data=items)


@app.get("/media/<slug>/<path:name>")
def media_file(slug, name):
    _require(slug)
    return send_from_directory(gen.campaign_dir(slug) / "uploads" / "media", name)


@app.get("/c/<slug>/<path:path>")
def hosted(slug, path):
    """Hosts generated pages and images so they have public URLs (used by the email)."""
    root = gen.GENERATED / slug
    if not root.exists():
        abort(404)
    return send_from_directory(root, path)


@app.get("/download/<slug>.zip")
def download(slug):
    if not (gen.campaign_dir(slug) / "config.json").exists():
        abort(404)
    gen.build(slug, public_base())
    zip_path = gen.make_zip(slug, request.args.get("part"))
    return send_file(zip_path, as_attachment=True, download_name=zip_path.name)


# ---------------------------------------------------------------- leads

@app.post("/api/submit/<slug>")
def submit(slug):
    if not (gen.campaign_dir(slug) / "config.json").exists():
        return jsonify(ok=False, error="Unknown campaign"), 404
    data = request.get_json(silent=True) or request.form.to_dict()
    data = {k: (", ".join(v) if isinstance(v, list) else str(v))[:2000] for k, v in data.items()}

    cfg = gen.load_config(slug)
    missing = [f["label"] for f in cfg.get("lp", {}).get("fields", [])
               if f.get("required") and f.get("type") != "hidden" and not data.get(f["name"], "").strip()]
    if missing:
        return jsonify(ok=False, error="Please fill: " + ", ".join(missing)), 400

    record = {"submitted_at": datetime.now(timezone.utc).isoformat(),
              "ip": request.headers.get("X-Forwarded-For", request.remote_addr), **data}
    with (gen.campaign_dir(slug) / "leads.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    threading.Thread(target=send_lead_emails, args=(cfg, record, public_base()), daemon=True).start()
    return jsonify(ok=True)


@app.get("/api/campaigns/<slug>/leads.csv")
def leads_csv(slug):
    path = gen.campaign_dir(slug) / "leads.jsonl"
    rows = [json.loads(l) for l in path.open(encoding="utf-8")] if path.exists() else []
    cols = []
    for r in rows:
        cols += [k for k in r if k not in cols]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols or ["submitted_at"])
    w.writeheader()
    w.writerows(rows)
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={slug}-leads.csv"})


def send_lead_emails(cfg, record, base):
    """Notify the internal team and (optionally) send the visitor a confirmation with the PDF link."""
    host = os.environ.get("SMTP_HOST")
    if not host:
        app.logger.info("SMTP not configured; lead saved only.")
        return
    sender = os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER")
    notify = cfg.get("notify", {})
    msgs = []

    if notify.get("notify_email"):
        m = EmailMessage()
        m["Subject"] = f"New lead: {cfg.get('campaign_name', cfg['slug'])}"
        m["From"], m["To"] = sender, notify["notify_email"]
        m.set_content("\n".join(f"{k}: {v}" for k, v in record.items()))
        msgs.append(m)

    visitor = next((v for k, v in record.items() if "email" in k.lower() and "@" in v), None)
    if notify.get("send_confirmation") and visitor:
        pdf = cfg.get("files", {}).get("pdf")
        pdf_url = f"{base}/c/{cfg['slug']}/landing-page/assets/{pdf}" if pdf else ""
        ty = cfg.get("ty", {})
        m = EmailMessage()
        m["Subject"] = ty.get("heading") or "Thank you"
        m["From"], m["To"] = sender, visitor
        body = gen.plain(ty.get("body", ""))
        m.set_content(f"{body}\n\n{('Download: ' + pdf_url) if pdf_url else ''}\n\n{cfg.get('company', {}).get('name', '')}")
        if pdf_url:
            m.add_alternative(f"<div style='font-family:Arial,sans-serif'>{gen.content(ty.get('body', ''), email=True)}"
                              f"<p><a href='{pdf_url}'>{ty.get('download_text') or 'Download the PDF'}</a></p></div>",
                              subtype="html")
        msgs.append(m)

    try:
        port = int(os.environ.get("SMTP_PORT", 587))
        cls = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
        with cls(host, port, timeout=30) as s:
            if port != 465:
                s.starttls()
            if os.environ.get("SMTP_USER"):
                s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASS", ""))
            for m in msgs:
                s.send_message(m)
    except Exception:
        app.logger.exception("Failed to send lead emails")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5050)), debug=True)