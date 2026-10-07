"""Renders a campaign config into a landing page + email template bundle and zips it."""
import html
import json
import re
import shutil
import threading
import zipfile
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

BASE = Path(__file__).parent
CAMPAIGNS = BASE / "data" / "campaigns"
GENERATED = BASE / "generated"

# Prevent concurrent requests from deleting/rebuilding the same generated bundle.
BUILD_LOCK = threading.RLock()

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

GOOGLE_FONTS = {
    "Alegreya", "Archivo", "Arimo", "Assistant", "Barlow", "Cabin", "DM Sans", "DM Serif Display",
    "Fira Sans", "IBM Plex Sans", "Inter", "Lato", "Lora", "Manrope", "Merriweather", "Montserrat",
    "Mulish", "Nunito", "Nunito Sans", "Open Sans", "Oswald", "Playfair Display", "Poppins", "PT Sans",
    "Raleway", "Roboto", "Roboto Slab", "Rubik", "Source Sans 3", "Source Serif 4", "Ubuntu", "Work Sans",
    "Bitter", "Crimson Text", "Cormorant Garamond", "Figtree", "Josefin Sans", "Karla", "Libre Baskerville",
    "Noto Sans", "Noto Serif", "Outfit", "Plus Jakarta Sans", "Quicksand", "Space Grotesk",
}


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


def build_context(slug, public_base):
    """Load the campaign and compute everything the templates need."""
    return context_from_cfg(load_config(slug), slug, public_base)


def context_from_cfg(cfg, slug, public_base):
    for section in ("brand", "layout", "lp", "ty", "email", "company", "notify", "visual"):
        if not isinstance(cfg.get(section), dict):
            cfg[section] = {}
    public_base = (cfg.get("public_base_url") or public_base or "").rstrip("/")
    hosted = f"{public_base}/c/{slug}" if public_base else ""
    files = cfg.get("files", {})

    lp_cfg = cfg["lp"]
    lp_cfg["fields"] = normalise_fields(lp_cfg.get("fields"))
    primary = cfg["brand"].get("primary_color") or "#0b5cff"

    form_action = lp_cfg.get("form_action") or (f"{public_base}/api/submit/{slug}" if public_base else "")
    lp_url = cfg["email"].get("cta_url") or (f"{hosted}/landing-page/index.html" if hosted else "landing-page/index.html")
    img_base = f"{hosted}/email-template/images/" if hosted else "images/"

    layout = {**LAYOUT_DEFAULTS, **{k: v for k, v in cfg["layout"].items() if v not in (None, "")}}
    if not files.get("banner"):
        layout["header_style"], layout["hero_text"] = "solid", False
    font = cfg["brand"].get("font") or ""
    cta_font = cfg["email"].get("cta_font") or ""
    ctx = dict(cfg, files=files, primary=primary, form_action=form_action, lp_url=lp_url,
               img_base=img_base, hosted=hosted, layout=layout,
               btn_text=cfg["brand"].get("button_text_color") or "#ffffff",
               font_family=f"'{font}', 'Segoe UI', Arial, sans-serif" if font else "",
               google_font=font if font in GOOGLE_FONTS else "",
               google_fonts=sorted(GOOGLE_FONTS),
               cta_font_family=f"'{cta_font}',Arial,Helvetica,sans-serif" if cta_font in GOOGLE_FONTS else "Arial,Helvetica,sans-serif")
    ctx["js_config"] = {
        "formAction": form_action,
        "thankYouUrl": "thank-you.html",
        "campaign": slug,
        "submitText": lp_cfg.get("submit_text") or "Submit",
    }
    ctx["t"] = template_text(cfg)
    return cfg, ctx


def build(slug, public_base):
    """Render the campaign into generated/<slug>/ and return the zip path."""
    with BUILD_LOCK:
            cfg, ctx = build_context(slug, public_base)
            src = campaign_dir(slug) / "uploads"

            out = GENERATED / slug
            if out.exists():
                shutil.rmtree(out)
            lp, em = out / "landing-page", out / "email-template"
            (lp / "assets").mkdir(parents=True)
            (em / "images").mkdir(parents=True)

            for role, name in ctx["files"].items():
                if not (src / name).exists():
                    continue
                shutil.copy(src / name, lp / "assets" / name)
                if role != "pdf":
                    shutil.copy(src / name, em / "images" / name)
            if (src / "media").is_dir():  # images uploaded in the visual editor
                shutil.copytree(src / "media", lp / "assets" / "media")
                shutil.copytree(src / "media", em / "images" / "media")

            def render(template, dest, **extra):
                dest.write_text(env.get_template(template).render(**ctx, **extra), encoding="utf-8")

            for page, template, dest in (("landing", "landing.html", "index.html"), ("thankyou", "thankyou.html", "thank-you.html")):
                design = load_visual(slug, page) if cfg["visual"].get(page) else None
                if design:
                    css = relative_urls(design.get("base_css", "") + "\n" + design.get("css", "") + custom_css(design), slug)
                    render(template, lp / dest, visual_body=Markup(visual_body(design["html"], slug, ctx)), visual_css=Markup(css),
                           visual_js=Markup(design.get("custom_js") or ""),
                           visual_fonts=sorted(f for f in GOOGLE_FONTS if f in css and f != ctx["google_font"]))
                else:
                    render(template, lp / dest)
            render("style.css", lp / "assets" / "style.css")
            render("script.js", lp / "assets" / "script.js")
            render("effects.js", lp / "assets" / "effects.js")

            design = load_visual(slug, "email") if cfg["visual"].get("email") else None
            if design:
                body, css = email_visual(design, slug, ctx)
                render("email_visual.html", em / "email.html", visual_body=Markup(body), visual_css=Markup(css))
            else:
                render("email.html", em / "email.html")
            render("email.txt", em / "email.txt")

            return make_zip(slug)

# ---------------------------------------------------------------- visual (drag & drop) editor

VISUAL_PAGES = ("landing", "thankyou", "email")
MOBILE_MAX = 767
# Placeholders the editor stores as <div data-lp-block="name"></div>; filled with live campaign markup at build time.
BLOCK_RE = re.compile(r'<div([^>]*\sdata-lp-block="([a-z-]+)"[^>]*)>\s*</div>')


def visual_path(slug, page):
    return campaign_dir(slug) / "visual" / f"{page}.json"


def load_visual(slug, page):
    p = visual_path(slug, page)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def save_visual(slug, page, design):
    p = visual_path(slug, page)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(design), encoding="utf-8")


def custom_css(design):
    """The page's hand-written CSS, plus its mobile-only CSS wrapped in a media query."""
    css = design.get("custom_css") or ""
    mobile = design.get("custom_mobile_css") or ""
    if mobile.strip():
        css += f"\n@media (max-width: {MOBILE_MAX}px) {{\n{mobile}\n}}"
    return "\n" + css if css.strip() else ""


def editor_urls(text, slug):
    """Relative asset paths -> URLs the editor canvas can load."""
    text = re.sub(r"""(["'(])assets/""", lambda m: f"{m.group(1)}/c/{slug}/landing-page/assets/", text)
    return text


def _sub_path(text, prefix, repl):
    """Replace a site-relative path only where it starts a URL (after a quote or "("), never inside an absolute URL."""
    return re.sub(r"""(["'(])""" + re.escape(prefix), lambda m: m.group(1) + repl, text)


def relative_urls(text, slug):
    """Editor URLs -> paths relative to the exported page."""
    text = _sub_path(text, f"/c/{slug}/landing-page/assets/", "assets/")
    return _sub_path(text, f"/media/{slug}/", "assets/media/")


def email_urls(text, slug, ctx):
    """Editor URLs -> URLs for the email (absolute when the portal has a public address)."""
    base = ctx["img_base"]  # "<hosted>/email-template/images/" or "images/"
    pdf = ctx["files"].get("pdf")
    if pdf:  # the PDF lives with the landing page, not in the email's images folder
        lp_assets = f"{ctx['hosted']}/landing-page/assets/" if ctx["hosted"] else "../landing-page/assets/"
        text = _sub_path(text, f"/c/{slug}/landing-page/assets/{pdf}", lp_assets + pdf)
    text = _sub_path(text, f"/c/{slug}/landing-page/assets/media/", f"{base}media/")
    text = _sub_path(text, f"/c/{slug}/landing-page/assets/", base)
    text = _sub_path(text, f"/c/{slug}/email-template/images/", base)
    return _sub_path(text, f"/media/{slug}/", f"{base}media/")


def render_blocks(ctx):
    """HTML for each live placeholder block."""
    parts = env.get_template("_partials.html").make_module(ctx)
    form = env.get_template("_form.html").make_module(ctx)
    mail = env.get_template("_email_parts.html").make_module(ctx)
    return {
        "header": str(parts.header()),
        "banner": str(parts.banner()),
        "banner-slim": str(parts.banner(slim=True)),
        "footer": str(parts.footer()),
        "form": str(form.lead_form()),
        "download": str(form.pdf_download()),
        "email-header": str(mail.email_header()),
        "email-banner": str(mail.email_banner()),
        "email-content": str(mail.email_body()),
        "email-cta": str(mail.email_cta()),
        "email-cta-signature": str(mail.email_cta_signature()),
        "email-signoff": str(mail.email_signoff()),
        "email-footer": str(mail.email_footer()),
        "email-footer-signature": str(mail.email_footer_signature()),
    }


def fill_blocks(html_text, ctx):
    html_text = re.sub(r"^\s*<body[^>]*>|</body>\s*$", "", html_text.strip())
    blocks = render_blocks(ctx)

    def fill(m):
        attrs, key = m.group(1), m.group(2)
        block = blocks.get(key, "")
        if key in ("email-cta", "email-cta-signature", "email-footer-signature"):
            block = _apply_cta_overrides(block, attrs)
        return f"<div{attrs}>{block}</div>"

    return BLOCK_RE.sub(fill, html_text)


def _apply_cta_overrides(block, attrs):
    """Each CTA button can carry its own text / link / font (data-cta-* on its placeholder)."""
    def attr(name):
        m = re.search(rf'\sdata-cta-{name}="([^"]*)"', " " + attrs)
        return html.unescape(m.group(1)) if m else None

    text, url, font = attr("text"), attr("url"), attr("font")
    if text is not None:
        block = re.sub(r"(<a\b[^>]*>)[\s\S]*?(</a>)", lambda m: m.group(1) + html.escape(text) + m.group(2), block, count=1, flags=re.I)
    if url:
        block = re.sub(r'(<a\b[^>]*\bhref=")[^"]*("[^>]*>)', lambda m: m.group(1) + html.escape(url) + m.group(2), block, count=1, flags=re.I)
    if font is not None:
        stack = f"'{font}',Arial,Helvetica,sans-serif" if font in GOOGLE_FONTS else "Arial,Helvetica,sans-serif"
        block = re.sub(r"font-family:[^;\"']*(?:'[^']*'[^;\"']*)?", lambda m: f"font-family:{stack}", block, flags=re.I)
    return block


def visual_body(html_text, slug, ctx):
    return relative_urls(fill_blocks(html_text, ctx), slug)


CSS_RULE_RE = re.compile(r"([^{}@]+)\{([^{}]*)\}")


def inline_id_styles(html_text, css):
    """Move '#id { ... }' rules onto the elements' style attributes (email clients ignore most <style>).

    Returns the new HTML and the CSS that could not be inlined (classes, media queries...),
    with media-query declarations marked !important so they still beat the inline styles."""
    rest, media = [], []
    i = 0
    while i < len(css):  # split top-level rules from @media blocks
        at = css.find("@media", i)
        if at < 0:
            rest.append(css[i:])
            break
        rest.append(css[i:at])
        depth, j = 0, css.index("{", at)
        for j in range(j, len(css)):
            depth += css[j] == "{"
            depth -= css[j] == "}"
            if depth == 0:
                break
        media.append(css[at:j + 1])
        i = j + 1

    leftover = []
    for sel, decl in CSS_RULE_RE.findall("".join(rest)):
        sel, decl = sel.strip(), decl.strip().rstrip(";")
        m = re.fullmatch(r"#([\w-]+)", sel)
        if not m or not decl:
            if decl:
                leftover.append(f"{sel}{{{decl};}}")
            continue
        tag_re = re.compile(r'(<[a-zA-Z][^>]*\sid="%s")([^>]*?)(/?>)' % re.escape(m.group(1)))

        def merge(t):
            head, attrs, end = t.group(1), t.group(2), t.group(3)
            sm = re.search(r'\sstyle="([^"]*)"', head + attrs)
            if sm:
                new = sm.group(0)[:-1].rstrip(";") + ";" + decl + '"'
                return (head + attrs).replace(sm.group(0), new) + end
            return head + attrs + f' style="{decl}"' + end
        html_text = tag_re.sub(merge, html_text, count=1)

    important = [re.sub(r"(?<!important)\s*;", " !important;", re.sub(r"([^;{}\s])\s*}", r"\1;}", m)) for m in media]
    return html_text, "\n".join(leftover + important)


def email_links(html_text, ctx):
    """Email apps run no JavaScript: turn data-lp-link on any element into real <a> links."""
    lp_url = ctx["lp_url"]
    html_text = re.sub(r'href="#[^"]*"', f'href="{html.escape(lp_url)}"', html_text)
    if "data-lp-link" not in html_text:
        return html_text
    from lxml import html as lxml_html

    root = lxml_html.fragment_fromstring(html_text, create_parent="div")
    for el in root.xpath("//*[@data-lp-link]"):
        url = el.attrib.pop("data-lp-link")
        el.attrib.pop("data-lp-target", None)
        el.attrib.pop("role", None)
        if url.startswith("#"):
            url = lp_url
        if el.tag == "a":
            el.set("href", url)
            continue
        link = lxml_html.Element("a", href=url, target="_blank",
                                 style="display:block;text-decoration:none;color:inherit;")
        if el.tag == "img":  # wrap the image itself
            parent = el.getparent()
            link.tail, el.tail = el.tail, None
            parent.replace(el, link)
            link.append(el)
        else:  # wrap the element's content so its box keeps its styles
            link.text, el.text = el.text, None
            for child in list(el):
                link.append(child)
            el.append(link)
    inner = (root.text or "") + "".join(lxml_html.tostring(c, encoding="unicode") for c in root)
    return inner


def email_visual(design, slug, ctx):
    css = design.get("base_css", "") + design.get("css", "") + custom_css(design)
    html_text, leftover = inline_id_styles(fill_blocks(design["html"], ctx), css)
    html_text = email_links(email_urls(html_text, slug, ctx), ctx)
    return html_text, email_urls(leftover, slug, ctx)


def block_previews(slug, public_base):
    """Placeholder HTML for the editor canvas (absolute asset URLs)."""
    _, ctx = build_context(slug, public_base)
    ctx["img_base"] = f"/c/{slug}/email-template/images/"
    return {k: editor_urls(v, slug) for k, v in render_blocks(ctx).items()}


def visual_seed(slug, page, public_base):
    """Starting layout for the editor, built from the campaign's current content."""
    _, ctx = build_context(slug, public_base)
    ctx["img_base"] = f"/c/{slug}/email-template/images/"
    return editor_urls(env.get_template(f"visual_seed_{page}.html").render(**ctx), slug)


# ---------------------------------------------------------------- ready-made designs

TEMPLATE_LIBRARY = {
    "landing": [
        ("classic", "Classic split", "Banner on top, content on the left and the form on the right."),
        ("hero-form", "Hero with form", "Full-width image hero with the headline and the form side by side."),
        ("centered", "Centered minimal", "Clean, centred headline with the form in the middle of the page."),
        ("dark", "Bold dark", "High-contrast dark design with a checklist and a call-to-action band."),
        ("ebook", "eBook showcase", "Shows the asset cover next to the benefits, then the form."),
    ],
    "thankyou": [
        ("classic", "Classic card", "A centred card with the download button."),
        ("hero", "Success hero", "A full-width coloured thank-you message."),
        ("next-steps", "Next steps", "Thank-you card plus what happens next."),
    ],
    "email": [
        ("classic", "Classic", "Logos, banner, message, button and footer."),
        ("hero", "Hero banner", "Big banner, centred headline, button and a benefits list."),
        ("signature", "Signature Collection", "Editorial article highlights, partner branding and a prominent access CTA."),
        ("newsletter", "Newsletter", "Coloured title band and image + text rows."),
        ("letter", "Personal letter", "Plain, personal-style email with a text link."),
        ("dark", "Bold header", "Dark headline band with a highlight box."),
    ],
}

DEFAULT_FIELDS = [
    {"label": "First Name", "type": "text", "width": "half", "required": True},
    {"label": "Last Name", "type": "text", "width": "half", "required": True},
    {"label": "Business Email", "type": "email", "width": "full", "required": True},
    {"label": "Phone Number", "type": "tel", "width": "half", "required": False},
    {"label": "Company Name", "type": "text", "width": "half", "required": True},
    {"label": "Job Title", "type": "text", "width": "half", "required": True},
    {"label": "Country", "type": "select", "width": "half", "required": True,
     "options": ["India", "United States", "United Kingdom", "Canada", "Australia", "Singapore", "United Arab Emirates", "Germany", "Other"]},
]


def library():
    return {kind: [{"id": i, "name": n, "description": d} for i, n, d in items] for kind, items in TEMPLATE_LIBRARY.items()}


def _paragraphs(text):
    return [p.strip() for p in plain(text or "").split("\n\n") if p.strip() and not p.strip().startswith("- ")]


def _bullets(text):
    text = text or ""
    if is_html(text):
        items = [html.unescape(re.sub(r"<[^>]+>", "", li)).strip() for li in re.findall(r"<li[^>]*>(.*?)</li>", text, re.S)]
    else:
        items = [re.sub(r"^([-•*]|\d+[.)])\s+", "", l.strip()) for l in text.splitlines() if re.match(r"^\s*([-•*]|\d+[.)])\s+", l)]
    return [i for i in items if i][:6]


def template_text(cfg):
    """Campaign text for the ready-made designs, with sample text wherever the campaign has none yet."""
    lp, ty, em, co = cfg.get("lp") or {}, cfg.get("ty") or {}, cfg.get("email") or {}, cfg.get("company") or {}
    bullets = _bullets(lp.get("body")) or [
        "Proven strategies from industry experts",
        "Practical steps you can apply today",
        "Real-world examples and benchmarks",
    ]
    intro = (_paragraphs(lp.get("body")) or ["Find out how leading teams tackle this challenge, with clear guidance you can put to work straight away."])[0]
    email_intro = (_paragraphs(em.get("body")) or [intro])[0]
    signature_lines = [re.sub(r"\s+", " ", line).strip() for line in plain(em.get("body")).splitlines() if line.strip()]
    first_line = signature_lines[0].casefold() if signature_lines else ""
    known_intro = ["explore the signature collection", em.get("headline") or lp.get("headline") or cfg.get("campaign_name") or "", em.get("greeting") or ""]
    if any(value and first_line.startswith(value.casefold()) for value in known_intro):
        signature_lines = signature_lines[1:]
    question = ""
    if signature_lines and "?" in signature_lines[0]:
        question, remainder = signature_lines[0].split("?", 1)
        question = question.strip() + "?"
        signature_lines[0] = remainder.strip()
        signature_lines = [line for line in signature_lines if line]
    signature_articles = bullets
    if not _bullets(lp.get("body")):
        signature_articles = [
            sentence.strip()
            for line in signature_lines
            for sentence in re.split(r"(?<=[.!?])\s+", line)
            if len(sentence.strip()) > 30
        ][:4] or bullets
    reference_articles = [
        {
            "image": "https://arizent.brightspotcdn.com/dims4/default/d36713d/2147483647/strip/true/crop/1381x800+19+0/resize/302x175!/quality/90/?url=https%3A%2F%2Fsource-media-brightspot.s3.us-east-1.amazonaws.com%2F8c%2Fe4%2Fbb1a44fe4b5e930f8ccd20a6b4c1%2Fai-100-leaders.jpg",
            "title": "Fraud, productivity are top of mind for AI thought leaders in banks",
            "byline": "Penny Crosman",
            "url": "https://www.americanbanker.com/articlelist/artificial-intelligence-and-generative-ai-in-banking-use-cases-opportunities-and-threats#article-1",
        },
        {
            "image": "https://arizent.brightspotcdn.com/dims4/default/bbeb411/2147483647/strip/true/crop/3998x2317+0+175/resize/302x175!/quality/90/?url=https%3A%2F%2Fsource-media-brightspot.s3.us-east-1.amazonaws.com%2Ff5%2F52%2Fbc510d0f444bbb486539280896a5%2F402196825.jpg",
            "title": "A third of banks ban employees from using gen AI. Here's why.",
            "byline": "Penny Crosman",
            "url": "https://www.americanbanker.com/articlelist/artificial-intelligence-and-generative-ai-in-banking-use-cases-opportunities-and-threats#article-2",
        },
        {
            "image": "https://valasysb2bmarketing.com/Valasys-AI/Newsletter/Images/callSummary.jpg",
            "title": "Call summaries, co-pilots, cores: Use cases for generative AI",
            "byline": "Penny Crosman",
            "url": "https://www.americanbanker.com/articlelist/artificial-intelligence-and-generative-ai-in-banking-use-cases-opportunities-and-threats#article-3",
        },
        {
            "image": "https://valasysb2bmarketing.com/Valasys-AI/Newsletter/Images/Reimagined.jpg",
            "title": "A Reimagined Future of Possibilities: GenAI's Role in Banking, Financial Services and Insurance",
            "byline": "",
            "url": "https://arizent.brightspotcdn.com/c2/28/4120c3ab42168ccbac9fdc357915/a-reimagined-future-of-possibilities.pdf",
        },
    ]
    return {
        "eyebrow": lp.get("eyebrow") or "Free resource",
        "headline": lp.get("headline") or cfg.get("campaign_name") or "Your headline goes here",
        "sub": lp.get("subheadline") or "A short supporting line that explains why this resource is worth downloading.",
        "intro": intro,
        "bullets": bullets,
        "cta": lp.get("submit_text") or "Download Now",
        "ty_heading": ty.get("heading") or "Thank you!",
        "ty_body": (_paragraphs(ty.get("body")) or ["Your download is on its way. We hope you find it useful."])[0],
        "email_headline": em.get("headline") or lp.get("headline") or cfg.get("campaign_name") or "Your headline goes here",
        "email_greeting": em.get("greeting") or "Hi there,",
        "email_intro": email_intro,
        "email_cta": em.get("cta_text") or "Download Now",
        "signature_headline": em.get("headline") or lp.get("headline") or cfg.get("campaign_name") or "Your headline goes here",
        "signature_greeting": em.get("greeting") or "Hi {fname},",
        "signature_question": question or "Explore the latest insights and practical opportunities in this field.",
        "signature_body": signature_lines or [email_intro],
        "signature_articles": reference_articles if "artificial intelligence" in (cfg.get("campaign_name") or "").casefold() else [
            {"image": "", "title": item, "byline": co.get("name") or cfg.get("campaign_name") or "", "url": em.get("cta_url") or "#"}
            for item in signature_articles
        ],
        "signature_author_image": "https://arizent.s3.amazonaws.com/guids/CABINET_32fe7ee323d3548cb5cef30ca75650162301ef468ea7024a454da1efd39f5bce/images/eic_ab_qyq.png" if "artificial intelligence" in (cfg.get("campaign_name") or "").casefold() else "",
        "company": co.get("name") or "Your Company",
        "website": co.get("website") or "",
    }


def new_campaign_config(name, slug):
    return {
        "campaign_name": name, "slug": slug, "partner_name": "", "partner_label": "",
        "brand": {"primary_color": "#0b5cff", "button_text_color": "#ffffff", "heading_color": "#0f172a", "footer_bg": "#0f172a"},
        "layout": {},
        "lp": {"form_title": "Download the eBook", "submit_text": "Download Now", "fields": normalise_fields(DEFAULT_FIELDS),
               "consent_text": "I agree to receive communications and accept the privacy policy.", "consent_type": "checkbox"},
        "ty": {"heading": "Thank you!", "download_text": "Download the PDF"},
        "email": {"cta_text": "Download Now"},
        "company": {}, "notify": {}, "files": {}, "visual": {},
    }


def demo_config():
    cfg = new_campaign_config("Demo campaign", "demo")
    cfg["partner_name"] = "Partner"
    cfg["files"] = {"logo": "logo.svg", "partner_logo": "partner.svg", "banner": "banner.svg", "pdf": "guide.pdf"}
    cfg["lp"].update({
        "eyebrow": "Free eBook",
        "headline": "Modernise your business with a secure cloud",
        "subheadline": "A practical guide to simplifying IT, protecting data and helping teams work better together.",
        "body": "<p>Find out how leading organisations cut costs and reduce risk by moving their content to one secure, intelligent platform.</p>"
                "<ul><li>Centralise files and collaboration</li><li>Automate governance and compliance</li><li>Protect sensitive data everywhere</li></ul>",
    })
    cfg["ty"]["body"] = "<p>Your guide is downloading now. A copy has also been sent to your inbox.</p>"
    cfg["email"].update({"subject": "Your free guide is ready", "greeting": "Hi there,",
                         "body": "<p>Discover how leading organisations simplify IT and keep their data safe with one secure platform.</p>"})
    cfg["company"] = {"name": "Your Company", "website": "https://example.com", "address": "1 Business Park, City",
                      "email": "hello@example.com", "privacy_url": "https://example.com/privacy",
                      "copyright": "© 2026 Your Company. All rights reserved."}
    return cfg


def demo_context():
    _, ctx = context_from_cfg(demo_config(), "demo", "")
    ctx["img_base"] = "assets/"
    ctx["lp_url"] = "#"
    return ctx


DEMO_SVGS = {
    "logo.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" viewBox="0 0 180 48"><rect x="2" y="8" width="32" height="32" rx="8" fill="#0b5cff"/><path d="M11 24l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><text x="44" y="32" font-family="Arial" font-size="22" font-weight="700" fill="#0f172a">YourBrand</text></svg>',
    "partner.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="40" viewBox="0 0 150 40"><circle cx="18" cy="20" r="14" fill="#f97316"/><text x="40" y="27" font-family="Arial" font-size="18" font-weight="700" fill="#334155">Partner</text></svg>',
    "banner.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="480" viewBox="0 0 1600 480"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset=".55" stop-color="#2563eb"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="1600" height="480" fill="url(#g)"/><g fill="#fff" opacity=".12"><circle cx="1300" cy="120" r="220"/><circle cx="1450" cy="400" r="160"/><circle cx="200" cy="420" r="120"/></g><g stroke="#fff" stroke-opacity=".25" fill="none"><path d="M900 380 L1100 220 L1250 300 L1450 140"/><path d="M900 420 L1100 300 L1250 360 L1450 220"/></g></svg>',
}


def render_library(kind, tid, ctx):
    """Render a ready-made design: returns (html, css). Images use paths relative to the page."""
    if kind not in TEMPLATE_LIBRARY or tid not in {i for i, _, _ in TEMPLATE_LIBRARY[kind]}:
        raise KeyError(f"{kind}/{tid}")
    out = env.get_template(f"library/{kind}/{tid}.html").render(**ctx)
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", out, re.S))
    return re.sub(r"<style[^>]*>.*?</style>", "", out, flags=re.S).strip(), css.strip()


def library_for_editor(kind, tid, slug, public_base):
    """A ready-made design rendered with the campaign's content, with URLs the editor canvas can load."""
    _, ctx = build_context(slug, public_base)
    ctx["img_base"] = f"/c/{slug}/email-template/images/"
    body, css = render_library(kind, tid, ctx)
    return editor_urls(body, slug), editor_urls(css, slug)


ZIP_PARTS = {"landing": "landing-page", "email": "email-template"}


def make_zip(slug, part=None):
    """Zip the whole bundle, or only the landing page / email folder.

    The same lock is used by build() so a concurrent Flask request cannot
    remove generated files while another request is creating the ZIP.
    """
    with BUILD_LOCK:
        out = GENERATED / slug
        root = out / ZIP_PARTS[part] if part in ZIP_PARTS else out
        name = f"{slug}-{ZIP_PARTS[part]}" if part in ZIP_PARTS else slug
        zip_path = GENERATED / f"{name}.zip"

        if not root.exists():
            raise FileNotFoundError(f"Generated bundle not found: {root}")

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for p in root.rglob("*"):
                if p.is_file():
                    # The file may only be considered after the lock prevents
                    # another build from deleting/replacing the tree.
                    z.write(p, Path(name) / p.relative_to(root))
        return zip_path