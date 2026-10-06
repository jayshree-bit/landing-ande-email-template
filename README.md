# LP & Email Automation

A Flask tool that turns campaign materials (logo, partner logo, banner, LP content, form fields,
thank-you content and an asset PDF) into:

- **Landing page**: header (logo + partner logo) → banner → content on the left, form on the right → footer
- **Thank-you page**: opens in the same browser after the form is submitted and **downloads the PDF automatically**
- **Email template**: table-based HTML with inline styles (works in Outlook and Gmail), a CTA button that links to the landing page, a footer and an unsubscribe link, plus a plain-text version

The output is a ZIP:

```
<slug>/
  landing-page/  index.html, thank-you.html, assets/ (logo, partner-logo, banner, pdf, style.css, script.js)
  email-template/ email.html, email.txt, images/
```

## Run

```
pip install -r requirements.txt
python app.py
```
Open http://localhost:5050 (change it with `PORT` in `.env`).

- **Dashboard** (`/`): every campaign is saved. Search, sort, edit, duplicate, delete, open the LP or email, and download the full ZIP, the landing-page-only ZIP, the email-only ZIP, or the leads CSV.
- **Builder** (`/builder/<slug>`): after the first **Save & Generate**, every change auto-saves and refreshes the live preview (Ctrl+S also saves).
  - Rich-text editor for the LP body, thank-you message, email body and consent text: font, size, colour, headings, lists, alignment, links, and a **Button** tool (`#form` scrolls to the form)
  - Header & banner layout: solid or transparent header over the banner (for white logos), header colour, sticky header, logo sizes, padding, banner height, headline on the banner, form on the left or right, footer logo style
  - Drag & drop: upload files by dropping them on each box, and drag ⋮⋮ to reorder form fields
  - Each uploaded file has Download / View / Remove links

## Flow
Email CTA → landing page → form submit (POST `/api/submit/<slug>`, saved to `data/campaigns/<slug>/leads.jsonl`)
→ redirect to `thank-you.html` → PDF downloads automatically as the page opens (plus a download button).
Leads can be downloaded as CSV from the preview panel.

## Lead emails
Copy `.env.example` to `.env` and set your SMTP details. Each lead is then emailed to the "Send each new lead to"
address, and you can optionally send the visitor a confirmation that includes the PDF link.

## Hosting / public image links
Email images must use public URLs. When this server is deployed, set **Public base URL** (or `PUBLIC_BASE_URL`)
and click Generate again. The email will then use `https://<host>/c/<slug>/email-template/images/...`, and the CTA
will point to the hosted landing page. If you host the LP files somewhere else, set **CTA URL** to that address.
The form still posts to this server unless you set a custom form action.

## Content formatting
Blank line = paragraph · `- item` = bullet · `## Heading` · `**bold**` · `*italic*` · `[text](https://url)`

## Visual drag & drop editor (Elementor-style)
Open it from the builder's **🎨 Visual editor** button or the **Page design** card (`/editor/<slug>/landing`, `/editor/<slug>/thankyou`, `/editor/<slug>/email`).

- **Widgets**: sections, 1–4 columns, 30/70 and 70/30 layouts, boxes, spacers, dividers, headings, text, buttons, images (upload or pick), video, lists, quotes, a hero banner, image + text, and feature cards. Drag them onto the page.
- **Style**: spacing (margin/padding), alignment and flex layout, size, typography (fonts, size, weight, colour, alignment), background, border, radius, shadow and effects. Styles apply to the selected element only.
- **Settings**: links, alt text and IDs. **Layers**: the page tree, where you can reorder, hide or select elements.
- Desktop / tablet / mobile views (styles can differ per device), undo/redo, outlines, preview, and an HTML/CSS view.
- **Live campaign widgets** (dashed): site header, banner, banner strip, lead form, PDF button and footer. They always show what's set in the builder, so form fields, logos and footer details stay in sync, and form submission, the thank-you page and the PDF auto-download keep working.
- **Save & Publish** stores the design (`data/campaigns/<slug>/visual/<page>.json`) and switches that page to it. The Page design card can switch back to the standard template at any time without losing the design. **Reset** discards the design.
- **+ Add**: every selected element has a **+** button in its toolbar (adds after it, or inside an empty column/box). There's also **Add** in the top bar and **Add section** at the bottom of the canvas.
- **Form**: edit the lead-form fields (drag to reorder, half/full width, required, options), the texts and the consent from the editor. The form is sticky while scrolling, and each form block has a switch to turn that off.
- **Mobile**: choose the Mobile view and any style you set applies to phones only. Settings → *Hide on desktop / tablet / mobile*. **Code** adds custom CSS, mobile-only CSS and JavaScript (no JavaScript in email).
- **Email editor**: table-based widgets (text, heading, button, image, 2/3 columns, image + text, highlight box, divider, spacer) and live campaign rows (header, banner, CTA, sign-off, footer with unsubscribe). On publish, styles are inlined for email clients, mobile rules stay in `<style>` with `!important`, and an Outlook wrapper is added.
- **Advanced tab**: give any element (box, section, image, text) a **link**: scroll to the form, open the PDF, the landing page or any URL, optionally in a new tab. On web pages `effects.js` makes it clickable; in emails it becomes a real `<a>`. You can also add **entrance animations** (fade, slide, zoom, bounce, flip; speed, delay, preview) and **hover effects** (grow, shrink, lift, glow, brighten, fade). Animations respect "reduce motion", and content stays visible if JavaScript fails.
- **Easier editing**: a breadcrumb (Section › Column › Heading) to jump to parents, plain names in Layers, a **?** help guide (shown the first time), and colour fields that open the browser's colour chooser with a one-click palette.

## Ready-made designs
- **Dashboard → ✨ Start from a template** (`/templates`): pick a landing page (Classic split, Hero with form, Centered minimal, Bold dark, eBook showcase), a thank-you page (Classic card, Success hero, Next steps) and an email (Classic, Hero banner, Newsletter, Personal letter, Bold header). Previews use demo content. **Create campaign** sets up the campaign with those designs and default form fields; you then add the logos, banner and PDF in the builder.
- **Editor → Templates**: switch the current page or email to another design. Previews use the campaign's own logos, banner and text, and **Restore previous design** undoes the switch.
- Designs live in `output_templates/library/<landing|thankyou|email>/<id>.html` (markup plus a `<style>` block; emails use inline styles only) and are registered in `TEMPLATE_LIBRARY` in `generator.py`. A design's stylesheet is kept outside GrapesJS (`base_css`), because its CSS parser drops shorthand properties that use `var()`.
