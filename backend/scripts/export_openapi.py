#!/usr/bin/env python
"""Dump the OpenAPI schema to a file.

Imports the app directly, so no server needs to be running:

    uv run python scripts/export_openapi.py             # -> openapi.json
    uv run python scripts/export_openapi.py api.yaml    # -> YAML
    uv run python scripts/export_openapi.py api.html    # -> standalone page

JSON and YAML import into Postman, Insomnia, Swagger Editor, or any client
generator. The .html output inlines the schema into a single self-contained file
that opens with no server — useful for sending to someone who cannot run the app.

For a page that stays current on its own, use the live route at /api/v1/docs
instead; it reads the schema on each load, so new endpoints appear without any
regeneration step.
"""

import json
import sys
from pathlib import Path

# Importable when run as a plain script from the backend/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402, I001  — must follow the sys.path fix above


TEMPLATE = Path(__file__).resolve().parent.parent / "app" / "static" / "docs.html"


def _standalone_html(schema: dict) -> str:
    """Inline the schema so the page needs no server to render."""
    html = TEMPLATE.read_text(encoding="utf-8")
    # </script> inside the JSON would close the tag early.
    payload = json.dumps(schema).replace("</", "<\\/")
    return html.replace(
        "<script>",
        f"<script>window.__OPENAPI__ = {payload};</script>\n<script>",
        1,
    )


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("openapi.json")
    schema = app.openapi()

    if out.suffix in {".yaml", ".yml"}:
        try:
            import yaml
        except ImportError:
            sys.exit("PyYAML is required for YAML output: uv add --dev pyyaml")
        out.write_text(yaml.safe_dump(schema, sort_keys=False), encoding="utf-8")
    elif out.suffix in {".html", ".htm"}:
        out.write_text(_standalone_html(schema), encoding="utf-8")
    else:
        out.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")

    routes = sum(
        1
        for methods in schema.get("paths", {}).values()
        for method in methods
        if method in {"get", "post", "put", "patch", "delete"}
    )
    print(f"Wrote {out} — {routes} operation(s)")


if __name__ == "__main__":
    main()
