import unittest

import generator as gen


class FormRenderingTests(unittest.TestCase):
    def test_select_and_checkbox_labels_allow_html(self):
        template = gen.env.get_template("landing.html")
        html = template.render(
            campaign_name="Test Campaign",
            lp={
                "page_title": "",
                "meta_description": "",
                "eyebrow": "",
                "headline": "",
                "subheadline": "",
                "body": "",
                "form_title": "Get started",
                "form_intro": "",
                "fields": [
                    {
                        "name": "country",
                        "id": "country_code",
                        "label": "Country",
                        "type": "select",
                        "width": "full",
                        "required": True,
                        "placeholder": "Select your country",
                        "options": ["USA", "UK"],
                    },
                    {
                        "name": "consent",
                        "label": "I agree to the <a href=\"https://example.com/privacy\">Privacy Policy</a>",
                        "type": "checkbox",
                        "width": "full",
                        "required": True,
                        "placeholder": "",
                        "options": [],
                    },
                ],
                "consent_text": "I agree to the <a href=\"https://example.com/privacy\">Privacy Policy</a>",
                "manual_css": ".my-field { border-color: #0b5cff; }",
                "manual_js": "document.body.classList.add('custom-js-loaded');",
                "submit_text": "Submit",
            },
            layout={
                "header_style": "solid",
                "header_bg": "#ffffff",
                "sticky": False,
                "logo_height": 48,
                "partner_logo_height": 44,
                "header_padding": 14,
                "banner_height": "",
                "hero_text": False,
                "hero_text_color": "#ffffff",
                "hero_shade": True,
                "form_position": "right",
                "footer_columns": 3,
                "footer_logo_bg": "white",
            },
            brand={
                "primary_color": "#0b5cff",
                "button_text_color": "#ffffff",
                "heading_color": "#0f172a",
                "footer_bg": "#0f172a",
                "footer_text_color": "#cbd5e1",
            },
            company={
                "name": "Example Co",
                "website": "https://example.com",
                "address": "42 Market Street\nLondon, UK",
                "phone": "+44 20 1234 5678",
                "email": "hello@example.com",
                "privacy_url": "https://example.com/privacy",
                "terms_url": "https://example.com/terms",
                "linkedin": "https://linkedin.com/company/example",
                "twitter": "https://x.com/example",
                "facebook": "",
                "instagram": "",
                "youtube": "",
                "copyright": "© 2026",
            },
            files={},
            partner_label="",
            partner_name="",
            js_config={},
            google_font="",
            primary="#0b5cff",
            btn_text="#ffffff",
            font_family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        )

        self.assertIn('class="select-wrap"', html)
        self.assertIn('id="country_code" data-field-id="country_code" name="country"', html)
        self.assertIn('href="https://example.com/privacy"', html)
        self.assertIn("Privacy Policy", html)
        self.assertIn('name="consent"', html)
        self.assertIn('required', html)
        self.assertIn('.my-field', html)
        self.assertIn('custom-js-loaded', html)
        self.assertIn('footer-grid footer-grid-3', html)
        self.assertIn('Company', html)
        self.assertIn('Quick links', html)
        self.assertIn('Follow us', html)

        thank_you = gen.env.get_template("thankyou.html").render(
            campaign_name="Test Campaign",
            lp={"page_title": "Test Campaign"},
            ty={"heading": "Hi [First Name]", "body": "<p>Thanks <strong>[First Name]</strong> for downloading!</p>", "download_text": "Download [First Name]"},
            files={"pdf": "sample.pdf"},
            company={"website": "https://example.com", "name": "Example Co"},
            layout={"header_style": "solid", "header_bg": "#ffffff", "sticky": False, "logo_height": 48, "partner_logo_height": 44, "header_padding": 14, "banner_height": "", "hero_text": False, "hero_text_color": "#ffffff", "hero_shade": True, "form_position": "right", "footer_logo_bg": "white"},
            brand={"primary_color": "#0b5cff", "button_text_color": "#ffffff", "heading_color": "#0f172a", "footer_bg": "#0f172a", "footer_text_color": "#cbd5e1"},
            google_font="",
            primary="#0b5cff",
            btn_text="#ffffff",
            font_family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        )
        self.assertIn('applySubmittedValues', thank_you)
        self.assertIn('URLSearchParams', thank_you)
        self.assertIn('submitted', thank_you)
        self.assertIn('<p>Thanks <strong>[First Name]</strong> for downloading!</p>', thank_you)
        self.assertIn('document.createTreeWalker(root, NodeFilter.SHOW_TEXT)', thank_you)
        self.assertNotIn('node.innerHTML = replaced', thank_you)

    def test_field_ids_are_normalized_for_html(self):
        fields = gen.normalise_fields([{"label": "First Name", "id": "Customer Name"}])

        self.assertEqual(fields[0]["id"], "Customer_Name")


if __name__ == "__main__":
    unittest.main()
