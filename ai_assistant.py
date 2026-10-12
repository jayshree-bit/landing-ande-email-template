"""AI assistant for the visual editor (Claude API by default, Ollama as fallback).

  * "Full campaign": one prompt -> a complete Landing page and Email template, saved as the pages' visual designs.
  * "Section": one prompt -> one section added to / edited on the page you are working on.

Setup (hosted OpenRouter free-model routing):
    .env: AI_PROVIDER=openrouter
          OPENROUTER_API_KEY=your-openrouter-key
          AI_MODEL=openrouter/free
Setup (Claude, if configured):
    .env: ANTHROPIC_API_KEY=your-anthropic-key
Setup (local fallback):
    ollama pull llama3.1
    .env:  OLLAMA_URL=http://127.0.0.1:11434   OLLAMA_MODEL=llama3.1
App wiring (app.py, before `if __name__ == "__main__":`):
    import ai_assistant; ai_assistant.register(app)
"""
import json
import os
import re
import shutil
import urllib.error
import urllib.request
from datetime import datetime, timezone

from flask import jsonify, request

import generator as gen

STYLES = {
    "modern": "clean, modern, lots of white space, soft shadows, rounded cards",
    "corporate": "professional enterprise/finance look, restrained palette, navy and white, sharp clear typography",
    "bold": "bold dark theme, high contrast, large headlines, vivid accent colour",
    "minimal": "minimal, editorial, generous spacing, black/white with one accent",
}

LANDING_RULES = """You are a senior web designer building a B2B marketing landing page.
Return ONLY raw HTML. No markdown, no code fences, no explanations, no <html>/<head>/<body>, no <script>.
- Visual style: {style}.
- Semantic tags (<section>, <h1>/<h2>, <p>, <a>, <ul>, <img>, <div>) with INLINE style="" attributes only.
- Layout with flexbox, content max-width 1100px, margin 0 auto, padding 48px 24px, flex-wrap: wrap so it is responsive.
- Primary colour: {primary}. Use it for buttons and accents. Keep text contrast high. Do not set font-family.
- Buttons: <a href="#form"> with padding 14px 28px and border-radius 8px.
- Images: https://placehold.co/WIDTHxHEIGHT with a meaningful alt.
- Write real, specific copy for the topic (no lorem ipsum), in a confident B2B tone.
{extra}"""

LANDING_PAGE = """
Build the page as stacked <section> elements in this order:
 1. HERO: eyebrow label, big h1, one-sentence subtext, and an image on the right.
 2. MAIN: a two-column row. LEFT column: a short intro, a "What you will learn" list of 4 bullets, and a
    short credibility line. RIGHT column: contains exactly this line and nothing else:
    <div data-lp-block="form"></div>
 3. BENEFITS: three cards (title + two lines each).
 4. STATS or proof: 3-4 big numbers with labels.
Do NOT add a header, footer or navigation (they are added separately). Use the form line above exactly once."""

EMAIL_RULES = """You are an email designer building an HTML marketing email.
Return ONLY raw HTML. No markdown, no code fences, no explanations, no <html>/<head>/<body>, no <script>.
- Visual style: {style}.
- Email-safe: <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"> layouts, NO flex/grid.
- INLINE styles only. Content table max-width 600px, centred (align="center"). Primary colour: {primary}.
- Buttons: <a href="#"> inside a <td> with background-color, padding 14px 28px, border-radius 6px, display:inline-block.
- Images: https://placehold.co/WIDTHxHEIGHT with alt and width attributes.
- Write real, specific copy for the topic (no lorem ipsum).
{extra}"""

EMAIL_PAGE = """
Build in this order, as table rows inside ONE centred 600px table:
 1. HERO: headline, one-sentence subtext, image.
 2. BODY: short intro paragraph and 3 bullet takeaways.
 3. HIGHLIGHT BOX: one key stat or quote with a tinted background.
Do NOT add a header logo, call-to-action button row, sign-off or footer/unsubscribe (they are added separately)."""

SECTION_EXTRA = "\nCreate ONE root element only (a <section> for web, a <table> for email)."
EDIT_EXTRA = ("\nYou are EDITING existing HTML. Apply the user's instruction and return the FULL updated HTML of that "
              "same element. Keep everything the user did not ask to change.")

ENDCAP = {
    "landing": ("header", ["footer"]),
    "email": ("email-header", ["email-cta", "email-footer"]),
}


CLAUDE_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]
CLAUDE_DEFAULT = "claude-haiku-5-5"  # fastest; switch to claude-sonnet-5-5 for richer pages


def _ollama_url():
    return os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")


def _provider():
    """Choose the configured AI provider."""
    forced = (os.environ.get("AI_PROVIDER") or "").strip().lower()
    if forced in ("anthropic", "ollama", "openrouter"):
        return forced
    if os.environ.get("OPENROUTER_API_KEY"):
        return "openrouter"
    return "anthropic" if os.environ.get("ANTHROPIC_API_KEY") else "ollama"


def _default_model():
    if _provider() == "openrouter":
        return os.environ.get("AI_MODEL") or "openrouter/free"

    if _provider() == "anthropic":
        return os.environ.get("AI_MODEL") or CLAUDE_DEFAULT

    return os.environ.get("OLLAMA_MODEL") or "llama3.1"


def _pick_model(requested):
    """Use the model chosen in the UI, unless it belongs to the other provider."""
    requested = str(requested or "").strip()
    is_claude = requested.startswith("claude")
    if _provider() == "anthropic":
        return requested if is_claude else _default_model()
    return requested if requested and not is_claude else _default_model()


def clean_html(text):
    """Strip fences/wrappers the model adds, and anything unsafe."""
    text = (text or "").strip()
    m = re.search(r"```(?:html)?\s*(.*?)```", text, re.S | re.I)
    if m:
        text = m.group(1).strip()
    text = re.sub(r"<!DOCTYPE[^>]*>|</?(?:html|head|body)[^>]*>", "", text, flags=re.I)
    text = re.sub(r"<(script|iframe|object|embed|link|meta)\b[^>]*>.*?</\1>", "", text, flags=re.S | re.I)
    text = re.sub(r"<(script|iframe|object|embed|link|meta)\b[^>]*/?>", "", text, flags=re.I)
    text = re.sub(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", text, flags=re.I)
    text = re.sub(r"(href|src)\s*=\s*([\"'])\s*javascript:[^\"']*\2", r"\1=\2#\2", text, flags=re.I)
    return text.strip()


def _chat_anthropic(model, system, user, timeout=120):
    body = json.dumps({
        "model": model, "max_tokens": 6000, "temperature": 0.6,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"Content-Type": "application/json", "anthropic-version": "2023-06-01",
                 "x-api-key": os.environ["ANTHROPIC_API_KEY"]})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300]
        raise RuntimeError(f"Claude API {e.code}: {detail}")
    return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")


def _chat_ollama(model, system, user, timeout=420):
    body = json.dumps({
        "model": model, "stream": False,
        "options": {"temperature": 0.6, "num_ctx": 8192, "num_predict": 4096},
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }).encode()
    req = urllib.request.Request(_ollama_url() + "/api/chat", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)["message"]["content"]


def _block(name):
    return f'<div data-lp-block="{name}"></div>'


def assemble(page, ai_html):
    """Wrap the model's markup with the live campaign blocks so the form, logos, CTA and footer keep working."""
    head, tail = ENDCAP[page]
    html = ai_html
    if page == "landing" and 'data-lp-block="form"' not in html:
        html += ('<section style="max-width:520px;margin:0 auto;padding:32px 24px">' + _block("form") + "</section>")
    parts = [_block(head), html] + [_block(t) for t in tail if f'data-lp-block="{t}"' not in html]
    return "\n".join(parts)

def _chat_openrouter(model, system, user, timeout=120):
    body = json.dumps({
        "model": model,
        "max_tokens": 6000,
        "temperature": 0.6,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    }).encode()

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"],
            "X-Title": "Visual Editor AI Assistant"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:500]
        raise RuntimeError(f"OpenRouter API {e.code}: {detail}")

    choices = data.get("choices") or []
    if not choices or not isinstance(choices[0].get("message", {}).get("content"), str):
        raise RuntimeError("OpenRouter returned no text content. Check the selected model and API response.")
    return choices[0]["message"]["content"]


def _chat(model, system, user):
    """Send a prompt to the configured provider."""
    provider = _provider()
    if provider == "openrouter":
        return _chat_openrouter(model, system, user)
    if provider == "anthropic":
        return _chat_anthropic(model, system, user)
    return _chat_ollama(model, system, user)


def register(app):
    def ctx(slug):
        cfg = gen.load_config(slug)
        return cfg, ((cfg.get("brand") or {}).get("primary") or "#0b5cff")

    @app.get("/api/ai/models")
    def ai_models():
        provider = _provider()
        if provider == "anthropic":
            return jsonify(models=CLAUDE_MODELS, default=_default_model(), provider="anthropic")
        if provider == "openrouter":
            if not os.environ.get("OPENROUTER_API_KEY"):
                return jsonify(error="OPENROUTER_API_KEY is not configured", models=[]), 503
            # This is a router alias, not a list of every individual model.
            return jsonify(models=["openrouter/free"], default=_default_model(), provider="openrouter")
        try:
            with urllib.request.urlopen(_ollama_url() + "/api/tags", timeout=5) as r:
                names = [m["name"] for m in json.load(r).get("models", [])]
        except Exception:
            return jsonify(error="Ollama is not running. Start it with: ollama serve (or configure another provider)",
                           models=[]), 503
        return jsonify(models=names, default=_default_model(), provider="ollama")

    @app.post("/api/campaigns/<slug>/ai/campaign")
    def ai_campaign(slug):
        """Generate ONE page (landing or email) from a prompt and save it as that page's visual design."""
        if not (gen.campaign_dir(slug) / "config.json").exists():
            return jsonify(error="Campaign not found"), 404
        d = request.get_json(silent=True) or {}
        prompt = str(d.get("prompt") or "").strip()[:2000]
        page = d.get("page")
        if page not in ENDCAP:
            return jsonify(error="page must be landing or email"), 400
        if not prompt:
            return jsonify(error="Write what the campaign is about"), 400
        model = _pick_model(d.get("model"))
        style = STYLES.get(d.get("style"), STYLES["modern"])
        cfg, primary = ctx(slug)
        tmpl, extra = (LANDING_RULES, LANDING_PAGE) if page == "landing" else (EMAIL_RULES, EMAIL_PAGE)
        system = tmpl.format(style=style, primary=primary, extra=extra)
        user = f"Campaign name: {cfg.get('campaign_name', slug)}\nBrief: {prompt}"
        try:
            html = clean_html(_chat(model, system, user))
        except Exception as e:
            app.logger.exception("AI request failed")
            return jsonify(error=f"AI request failed: {e}"), 502
        if "<" not in html:
            return jsonify(error="The model did not return HTML. Try again or try again or pick a stronger model."), 502

        old = gen.visual_path(slug, page)
        if old.exists():  # keep the previous design so it can be restored
            shutil.copyfile(old, old.with_name(f"{page}.pre-ai.json"))
        gen.save_visual(slug, page, {"project": None, "html": assemble(page, html), "css": "", "base_css": "",
                                     "template": "ai"})
        cfg.setdefault("visual", {})[page] = True
        cfg["updated_at"] = datetime.now(timezone.utc).isoformat()
        gen.save_config(slug, cfg)
        gen.build(slug, os.environ.get("PUBLIC_BASE_URL") or request.host_url.rstrip("/"))
        return jsonify(ok=True, page=page)

    @app.post("/api/campaigns/<slug>/ai/restore")
    def ai_restore(slug):
        page = (request.get_json(silent=True) or {}).get("page")
        if page not in ENDCAP or not (gen.campaign_dir(slug) / "config.json").exists():
            return jsonify(error="Not found"), 404
        backup = gen.visual_path(slug, page).with_name(f"{page}.pre-ai.json")
        if not backup.exists():
            return jsonify(error="Nothing to restore"), 404
        shutil.copyfile(backup, gen.visual_path(slug, page))
        gen.build(slug, os.environ.get("PUBLIC_BASE_URL") or request.host_url.rstrip("/"))
        return jsonify(ok=True)

    @app.post("/api/campaigns/<slug>/ai/generate")
    def ai_generate(slug):
        """Section mode: one section, a whole-page replacement, or an edit of the selected element (returns HTML)."""
        if not (gen.campaign_dir(slug) / "config.json").exists():
            return jsonify(error="Campaign not found"), 404
        d = request.get_json(silent=True) or {}
        prompt = str(d.get("prompt") or "").strip()[:2000]
        mode = d.get("mode") if d.get("mode") in ("section", "edit") else "section"
        page = d.get("page") if d.get("page") in gen.VISUAL_PAGES else "landing"
        selected = str(d.get("selected_html") or "")[:12000]
        model = _pick_model(d.get("model"))
        if not prompt:
            return jsonify(error="Write what you want to create"), 400
        if mode == "edit" and not selected:
            return jsonify(error="Select an element in the editor first"), 400
        cfg, primary = ctx(slug)
        tmpl = EMAIL_RULES if page == "email" else LANDING_RULES
        system = tmpl.format(style=STYLES.get(d.get("style"), STYLES["modern"]), primary=primary,
                             extra=EDIT_EXTRA if mode == "edit" else SECTION_EXTRA)
        user = f"Campaign: {cfg.get('campaign_name', slug)}\n" + (
            f"Existing HTML:\n{selected}\n\nInstruction: {prompt}" if mode == "edit" else f"Create: {prompt}")
        try:
            html = clean_html(_chat(model, system, user))
        except Exception as e:
            app.logger.exception("AI request failed")
            return jsonify(error=f"AI request failed: {e}"), 502
        if "<" not in html:
            return jsonify(error="The model did not return HTML. Try again or use a bigger model."), 502
        return jsonify(html=html, model=model)