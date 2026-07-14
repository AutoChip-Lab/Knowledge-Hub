#!/usr/bin/env python3
"""Remove legacy horizontal glyph fitting from English SVG files.

English SVG labels must keep their natural glyph proportions.  Layout fixes belong
in the SVG itself (shorter copy, wrapping, balanced font sizes, or larger boxes),
never in ``textLength`` with ``spacingAndGlyphs``.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


HERE = Path(__file__).resolve().parent
LEGACY_FIT = re.compile(r'\s+(?:textLength|lengthAdjust)="[^"]*"')


def remove_legacy_fitting(path: Path) -> int:
    raw = path.read_text(encoding="utf-8")
    cleaned, count = LEGACY_FIT.subn("", raw)
    if cleaned != raw:
        path.write_text(cleaned, encoding="utf-8", newline="\n")
    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "files",
        nargs="*",
        type=Path,
        help="English SVG files; defaults to assets/*_en.svg",
    )
    args = parser.parse_args()
    paths = args.files or sorted((HERE / "assets").glob("*_en.svg"))
    for supplied in paths:
        path = supplied if supplied.is_absolute() else HERE / supplied
        if not path.name.endswith("_en.svg") or not path.exists():
            raise FileNotFoundError(path)
        print(f"cleaned {path.relative_to(HERE)}: {remove_legacy_fitting(path)} attributes")


if __name__ == "__main__":
    main()
