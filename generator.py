"""Renders a campaign config into a landing page + email template bundle and zips it."""
import html
import json
import re
import shutil
import zipfile
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

BASE = Path(__file__).parent
CAMPAIGNS = BASE / "data" / "campaigns"
GENERATED = BASE / "generated"

env = Environment(
    loader=FileSystemLoader(BASE / "output_templates"),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

# Inline styles used when rich text is rendered for email clients (no <style> support).
EMAIL_STYLES = {
    "p": "margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#333333;",
    "h3": "margin:8px 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;color:#111111;",
    "ul": "margin:0 0 16px 0;padding:0 0 0 22px;",
    "li": "margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#333333;",
    "a": "color:{primary};text-decoration:underline;",
}


def slugify(text):
    text = re.sub(r"[^a-zA-Z0-9]+", "-", (text or "").strip().lower()).strip("-")
    return text or "campaign"


def _inline(text, styles, primary):
    """Escape text, then apply **bold**, *italic* and [label](url) markup."""
    out = html.escape(text)
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*", r"<em>\1</em>", out)

    def link(m):
        style = f' style="{styles["a"].format(primary=primary)}"' if styles else ""
        return f'<a href="{m.group(2)}" target="_blank"{style}>{m.group(1)}</a>'

    return re.sub(r"\[(.+?)\]\((https?://[^\s)]+|mailto:[^\s)]+)\)", link, out)


def rich(text, email=False, primary="#0b5cff"):
    """Convert simple plain-text markup into HTML.

    Blank line = new paragraph, "- " or "• " = bullet, "## " = sub heading,
    **bold**, *italic*, [label](https://link).
    """
    styles = EMAIL_STYLES if email else None

    def tag(name):
        return f'<{name} style="{styles[name]}">' if styles else f"<{name}>"

    blocks, para, items = [], [], []

    def flush():
        if para:
            blocks.append(tag("p") + "<br>".join(_inline(l, styles, primary) for l in para) + "</p>")
            para.clear()
        if items:
            lis = "".join(tag("li") + _inline(i, styles, primary) + "</li>" for i in items)
            blocks.append(tag("ul") + lis + "</ul>")
            items.clear()

    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line:
            flush()
        elif re.match(r"^([-•*]|\d+[.)])\s+", line):
            if para:
                flush()
            items.append(re.sub(r"^([-•*]|\d+[.)])\s+", "", line))
        elif line.startswith("#"):
            flush()
            blocks.append(tag("h3") + _inline(line.lstrip("#").strip(), styles, primary) + "</h3>")
        else:
            if items:
                flush()
            para.append(line)
    flush()
    return Markup("\n".join(blocks))


HTML_RE = re.compile(r"<(p|h[1-6]|ul|ol|li|div|br|a|strong|em|span|u)[\s>/]", re.I)

EMAIL_TAG_STYLES = {
    "p": "margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#333333;",
    "h1": "margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:34px;color:#111111;",
    "h2": "margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:29px;color:#111111;",
    "h3": "margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;color:#111111;",
    "ul": "margin:0 0 16px 0;padding:0 0 0 22px;",
    "ol": "margin:0 0 16px 0;padding:0 0 0 22px;",
    "li": "margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#333333;",
    "a": "color:{primary};text-decoration:underline;",
    "btn": ("display:inline-block;background-color:{primary};color:{btn_text};font-family:Arial,Helvetica,sans-serif;"
            "font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;padding:12px 26px;border-radius:6px;"),
}


def is_html(text):
    return bool(text and HTML_RE.search(text))


def emailify(markup, primary="#0b5cff", btn_text="#ffffff", lp_url="#"):
    """Give editor HTML the inline styles email clients need. Styles set in the editor win."""
    def repl(m):
        tag, attrs = m.group(1).lower(), m.group(2) or ""
        key = "btn" if tag == "a" and "lp-btn" in attrs else tag
        base = EMAIL_TAG_STYLES[key].format(primary=primary, btn_text=btn_text)
        if tag == "a":
            # In-page anchors (e.g. "#form") make no sense in an email: send them to the landing page.
            attrs = re.sub(r'href="(#[^"]*)?"', f'href="{html.escape(lp_url)}"', attrs)
            if "target=" not in attrs:
                attrs += ' target="_blank"'
        sm = re.search(r'style="([^"]*)"', attrs)
        if sm:
            attrs = attrs.replace(sm.group(0), f'style="{base}{sm.group(1)}"')
        else:
            attrs += f' style="{base}"'
        return f"<{tag}{attrs}>"

    return re.sub(r"<(p|h1|h2|h3|ul|ol|li|a)(\s[^>]*)?>", repl, markup, flags=re.I)


def content(text, email=False, primary="#0b5cff", btn_text="#ffffff", lp_url="#"):
    """Render body content: editor HTML is used as-is, older plain-text content goes through rich()."""
    text = (text or "").strip()
    if text in ("", "<p><br></p>"):
        return Markup("")
    if not is_html(text):
        return rich(text, email=email, primary=primary)
    return Markup(emailify(text, primary, btn_text, lp_url) if email else text)


def plain(text):
    """Plain-text version of either editor HTML or the light markup."""
    text = text or ""
    if is_html(text):
        text = re.sub(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r"\2 (\1)", text, flags=re.I | re.S)
        text = re.sub(r"<li[^>]*>", "- ", text, flags=re.I)
        text = re.sub(r"<br\s*/?>|</(p|h[1-6]|li|div)>", "\n", text, flags=re.I)
        text = html.unescape(re.sub(r"<[^>]+>", "", text))
        return re.sub(r"\n{3,}", "\n\n", text).strip()
    text = re.sub(r"\[(.+?)\]\((.+?)\)", r"\1 (\2)", text)
    text = re.sub(r"\*\*(.+?)\*\*|\*(.+?)\*", lambda m: m.group(1) or m.group(2), text)
    return re.sub(r"^#+\s*", "", text, flags=re.M).strip()


env.filters["rich"] = rich
env.filters["content"] = content
env.filters["plain"] = plain

LAYOUT_DEFAULTS = {
    "header_style": "solid",      # solid | overlay (transparent header on top of the banner)
    "header_bg": "#ffffff",
    "sticky": False,
    "logo_height": 48,
    "partner_logo_height": 44,
    "header_padding": 14,
    "banner_height": "",          # empty = natural image height
    "banner_size": "cover",
    "banner_position": "center center",
    "hero_text": False,           # show eyebrow/headline/sub-headline on the banner
    "banner_eyebrow": "",
    "banner_headline": "",
    "banner_subheadline": "",
    "banner_button_text": "",
    "banner_button_url": "",
    "hero_text_color": "#ffffff",
    "hero_shade": True,
    "form_position": "right",
    "footer_columns": 3,
    "footer_logo_bg": "white",
}

GOOGLE_FONTS = {"Inter", "Poppins", "Roboto", "Open Sans", "Montserrat", "Lato"}


def campaign_dir(slug):
    return CAMPAIGNS / slug


def load_config(slug):
    return json.loads((campaign_dir(slug) / "config.json").read_text(encoding="utf-8"))


def save_config(slug, cfg):
    d = campaign_dir(slug)
    d.mkdir(parents=True, exist_ok=True)
    (d / "config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")


def normalise_fields(fields):
    out = []
    for f in fields or []:
        label = (f.get("label") or "").strip()
        if not label:
            continue
        name = slugify(f.get("name") or label).replace("-", "_")
        field_id = re.sub(r"[^A-Za-z0-9_.:-]+", "_", (f.get("id") or f"f_{name}").strip())
        if not re.match(r"^[A-Za-z_]", field_id):
            field_id = f"f_{field_id}"
        options = f.get("options") or []
        if isinstance(options, str):
            options = [o.strip() for o in re.split(r"[\n,]", options) if o.strip()]
        out.append({
            "label": label,
            "name": name,
            "id": field_id,
            "type": f.get("type") or "text",
            "required": bool(f.get("required")),
            "width": f.get("width") or "full",
            "placeholder": f.get("placeholder") or "",
            "options": options,
            "css_class": (f.get("css_class") or "").strip(),
        })
    return out


def build(slug, public_base):
    """Render the campaign into generated/<slug>/ and return the zip path."""
    cfg = load_config(slug)
    for section in ("brand", "layout", "lp", "ty", "email", "company", "notify"):
        if not isinstance(cfg.get(section), dict):
            cfg[section] = {}
    src =campaign_dir(slug) / "uploads"
    public_base = (cfg.get("public_base_url") or public_base or "").rstrip("/")
    hosted = f"{public_base}/c/{slug}" if public_base else ""

    out = GENERATED / slug
    if out.exists():
        shutil.rmtree(out)
    lp, em = out / "landing-page", out / "email-template"
    (lp / "assets").mkdir(parents=True)
    (em / "images").mkdir(parents=True)

    files = cfg.get("files", {})
    for role, name in files.items():
        if not (src / name).exists():
            continue
        shutil.copy(src / name, lp / "assets" / name)
        if role != "pdf":
            shutil.copy(src / name, em / "images" / name)

    lp_cfg = cfg.setdefault("lp", {})
    lp_cfg["fields"] = normalise_fields(lp_cfg.get("fields"))
    primary = cfg.get("brand", {}).get("primary_color") or "#0b5cff"

    form_action = lp_cfg.get("form_action") or (f"{public_base}/api/submit/{slug}" if public_base else "")
    lp_url = cfg.get("email", {}).get("cta_url") or (f"{hosted}/landing-page/index.html" if hosted else "landing-page/index.html")
    img_base = f"{hosted}/email-template/images/" if hosted else "images/"

    layout = {**LAYOUT_DEFAULTS, **{k: v for k, v in (cfg.get("layout") or {}).items() if v not in (None, "")}}
    if not files.get("banner"):
        layout["header_style"], layout["hero_text"] = "solid", False
    font = (cfg.get("brand") or {}).get("font") or ""
    ctx = dict(cfg, files=files, primary=primary, form_action=form_action, lp_url=lp_url,
               img_base=img_base, hosted=hosted, layout=layout,
               btn_text=(cfg.get("brand") or {}).get("button_text_color") or "#ffffff",
               font_family=f"'{font}', 'Segoe UI', Arial, sans-serif" if font else "",
               google_font=font if font in GOOGLE_FONTS else "")
    ctx["js_config"] = {
        "formAction": form_action,
        "thankYouUrl": "thank-you.html",
        "campaign": slug,
        "submitText": lp_cfg.get("submit_text") or "Submit",
    }

    def render(template, dest):
        dest.write_text(env.get_template(template).render(**ctx), encoding="utf-8")

    render("landing.html", lp / "index.html")
    render("thankyou.html", lp / "thank-you.html")
    render("style.css", lp / "assets" / "style.css")
    render("script.js", lp / "assets" / "script.js")
    render("email.html", em / "email.html")
    render("email.txt", em / "email.txt")

    return make_zip(slug)


ZIP_PARTS = {"landing": "landing-page", "email": "email-template"}


def make_zip(slug, part=None):
    """Zip the whole bundle, or only the landing page / email folder."""
    out = GENERATED / slug
    root = out / ZIP_PARTS[part] if part in ZIP_PARTS else out
    name = f"{slug}-{ZIP_PARTS[part]}" if part in ZIP_PARTS else slug
    zip_path = GENERATED / f"{name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in root.rglob("*"):
            if p.is_file():
                z.write(p, Path(name) / p.relative_to(root))
    return zip_path
