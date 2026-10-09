import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

import generator as gen


class WidgetTests(unittest.TestCase):
    def test_every_widget_folder_has_a_widget_file_with_a_unique_id(self):
        for kind in ("web", "email"):
            ids = []
            for folder in sorted(p for p in (gen.WIDGETS_DIR / kind).iterdir() if p.is_dir()):
                js = folder / "widget.js"
                self.assertTrue(js.exists(), f"{folder} has no widget.js")
                ids += re.findall(r"\bid: '([^']+)'", js.read_text(encoding="utf-8"))
            self.assertEqual(len(ids), len(set(ids)), f"duplicate {kind} widget ids: {ids}")

    def test_bundle_has_core_then_widgets_then_start(self):
        bundle = gen.editor_bundle()
        names = re.findall(r"^// ===== (.+) =====$", bundle, re.M)
        self.assertTrue(names[0].startswith("static/editor/js/00-"))
        self.assertTrue(names[-1].startswith("static/editor/js/99-"))
        self.assertIn("widgets/web/countdown/widget.js", names)
        self.assertIn("widgets/email/articles/widget.js", names)
        self.assertLess(names.index("static/editor/js/03-widgets.js"), names.index("widgets/web/heading/widget.js"))

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_bundle_and_runtime_are_valid_javascript(self):
        with tempfile.TemporaryDirectory() as d:
            for name, text in (("bundle.js", gen.editor_bundle()), ("runtime.js", gen.widget_assets("runtime.js"))):
                p = Path(d) / name
                p.write_text(text, encoding="utf-8")
                r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, f"{name}: {r.stderr}")

    def test_published_assets_include_widget_styles_and_scripts(self):
        ctx = gen.demo_context()
        css = gen.render_asset("style.css", ctx)
        js = gen.render_asset("effects.js", ctx)
        self.assertIn("/* widget: nav */", css)
        self.assertIn(".lp-countdown", css)
        self.assertIn("data-lp-countdown", js)
        self.assertNotIn("/* widget:", gen.render_asset("script.js", ctx))


if __name__ == "__main__":
    unittest.main()
