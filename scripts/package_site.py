#!/usr/bin/env python3
"""Package only the static public website and its human upload guides."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    "index.html",
    "404.html",
    "robots.txt",
    "sitemap.xml",
    "gaming/index.html",
)
GUIDE_FILES = {
    "README.md": "README.md",
    "docs/DEPLOYMENT.md": "DEPLOYMENT.md",
    "docs/EDITING.md": "EDITING.md",
}
ASSET_EXTENSIONS = {
    ".avif", ".css", ".gif", ".ico", ".jpeg", ".jpg", ".js", ".json",
    ".otf", ".pdf", ".png", ".svg", ".ttf", ".txt", ".webp", ".woff",
    ".woff2",
}
EXCLUDED_COMPONENTS = {
    "__pycache__", "node_modules", "cache", "caches", "private", "secrets",
}


def public_sources() -> list[Path]:
    """Use an explicit public-path allowlist; never archive the whole checkout."""
    sources = []
    for relative in PUBLIC_FILES:
        path = ROOT / relative
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Required public file is missing or not a regular file: {relative}")
        sources.append(path)

    assets = ROOT / "assets"
    if not assets.is_dir() or assets.is_symlink():
        raise ValueError("Required public assets directory is missing or is a symbolic link.")

    for path in sorted(assets.rglob("*")):
        relative = path.relative_to(ROOT)
        components = relative.parts
        if any(part.startswith(".") or part.lower() in EXCLUDED_COMPONENTS for part in components):
            continue
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != ROOT):
            raise ValueError(f"Refusing to package a symbolic link: {relative.as_posix()}")
        if path.is_file() and path.suffix.lower() in ASSET_EXTENSIONS:
            sources.append(path)

    if not any(path.is_relative_to(assets) for path in sources):
        raise ValueError("No public assets found; refusing to create an incomplete upload package.")
    return sources


def build_archive(output: Path) -> tuple[int, int]:
    sources = public_sources()
    guides = []
    for relative, name in GUIDE_FILES.items():
        path = ROOT / relative
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Required guide is missing or not a regular file: {relative}")
        guides.append((path, name))

    output = output.resolve()
    if output.is_relative_to(ROOT):
        raise ValueError("Write the upload ZIP outside the checkout, such as /workspace/artifacts/.")
    output.parent.mkdir(parents=True, exist_ok=True)

    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".portfolio-", suffix=".zip", dir=output.parent, delete=False) as handle:
            temporary = Path(handle.name)
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in sources:
                archive.write(path, f"site/{path.relative_to(ROOT).as_posix()}")
            for path, name in guides:
                content = path.read_text(encoding="utf-8")
                if name == "README.md":
                    content = content.replace("(docs/DEPLOYMENT.md)", "(DEPLOYMENT.md)")
                    content = content.replace("(docs/EDITING.md)", "(EDITING.md)")
                archive.writestr(f"UPLOAD-GUIDE/{name}", content)
        with zipfile.ZipFile(temporary) as archive:
            bad_file = archive.testzip()
            if bad_file:
                raise ValueError(f"Archive verification failed for {bad_file}.")
        os.replace(temporary, output)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return len(sources), len(guides)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT.parent / "artifacts" / "antreasparaskeva-portfolio.zip",
        help="ZIP destination outside the checkout (default: ../artifacts/antreasparaskeva-portfolio.zip)",
    )
    args = parser.parse_args()
    try:
        public_count, guide_count = build_archive(args.output)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(1, f"Packaging failed: {error}\n")
    print(f"Created {args.output.resolve()}")
    print(f"Verified ZIP: {public_count} public files in site/; {guide_count} documents in UPLOAD-GUIDE/.")
    print("Upload the CONTENTS of site/ into the domain document root; keep UPLOAD-GUIDE/ locally.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
