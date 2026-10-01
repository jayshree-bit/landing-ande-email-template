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
    return jsonify(gen.load_config(slug))


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
        z.unlink(missing_ok=True)
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
