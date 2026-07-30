#!/usr/bin/env python
"""Dump the OpenAPI schema to a file.

Imports the app directly, so no server needs to be running:

    uv run python scripts/export_openapi.py            # -> openapi.json
    uv run python scripts/export_openapi.py api.yaml   # -> YAML

The result imports into Postman, Insomnia, Swagger Editor, or any client
generator. Regenerate it whenever routes change.
"""

import json
import sys
from pathlib import Path

# Importable when run as a plain script from the backend/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("openapi.json")
    schema = app.openapi()

    if out.suffix in {".yaml", ".yml"}:
        try:
            import yaml
        except ImportError:
            sys.exit("PyYAML is required for YAML output: uv add --dev pyyaml")
        out.write_text(yaml.safe_dump(schema, sort_keys=False), encoding="utf-8")
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
