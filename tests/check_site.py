#!/usr/bin/env python3
"""Check the static site's local references and optional upload ZIP, using stdlib."""

from __future__ import annotations

import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SITE_HOSTS = {"antreasparaskeva.com", "www.antreasparaskeva.com"}


class Page(HTMLParser):
    def __init__(self, path: Path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = []
        self.references = []
        self.aria_references = []
        self.images = []
        self.metadata = {}
        self.canonical = []
        self.h1_count = 0
        self.has_title = False
        self.language = None
        self.structured_data = []
        self.in_structured_data = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        for name in ("href", "src", "poster"):
            if attrs.get(name):
                self.references.append(attrs[name])
        for name in ("aria-controls", "aria-labelledby", "aria-describedby"):
            self.aria_references.extend(attrs.get(name, "").split())
        if tag == "html":
            self.language = attrs.get("lang")
        if tag == "title":
            self.has_title = True
        if tag == "h1":
            self.h1_count += 1
        if tag == "meta":
            self.metadata[attrs.get("name") or attrs.get("property")] = attrs.get("content", "")
            if "charset" in attrs:
                self.metadata["charset"] = attrs["charset"]
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical.append(attrs.get("href", ""))
        if tag == "img":
            self.images.append(attrs)
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.in_structured_data = True
            self.structured_data.append("")

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_structured_data = False

    def handle_data(self, data):
        if self.in_structured_data:
            self.structured_data[-1] += data


def local_target(source: Path, value: str):
    parts = urlsplit(value)
    if parts.scheme or parts.netloc:
        if parts.scheme not in {"http", "https"} or parts.hostname not in SITE_HOSTS:
            return None
    path = unquote(parts.path)
    target = ROOT / path.lstrip("/") if path.startswith("/") else source.parent / path
    if not path:
        target = source
    target = target.resolve()
    if target.is_dir():
        target /= "index.html"
    return target, unquote(parts.fragment)


def check(archive_path: Path | None) -> list[str]:
    errors = []
    pages = {}
    for path in sorted(ROOT.rglob("*.html")):
        page = Page(path)
        page.feed(path.read_text(encoding="utf-8"))
        pages[path.resolve()] = page
        name = path.relative_to(ROOT)
        duplicates = [identifier for identifier, count in Counter(page.ids).items() if count > 1]
        if duplicates:
            errors.append(f"{name}: duplicate IDs: {', '.join(duplicates)}")
        if not page.language or not page.has_title or page.h1_count != 1:
            errors.append(f"{name}: requires lang, title, and exactly one H1")
        if not page.metadata.get("viewport") or page.metadata.get("charset", "").lower() != "utf-8":
            errors.append(f"{name}: missing responsive viewport or UTF-8 charset")
        if "noindex" not in page.metadata.get("robots", ""):
            if not page.metadata.get("description") or len(page.canonical) != 1:
                errors.append(f"{name}: indexable page needs description and one canonical URL")
        for identifier in page.aria_references:
            if identifier not in page.ids:
                errors.append(f"{name}: ARIA reference #{identifier} does not exist")
        for image in page.images:
            if "alt" not in image:
                errors.append(f"{name}: image lacks an alt attribute: {image.get('src')}")
        for value in page.structured_data:
            try:
                json.loads(value)
            except json.JSONDecodeError as error:
                errors.append(f"{name}: invalid structured data: {error}")

    required_public = set(pages)
    for path, page in pages.items():
        for reference in page.references:
            resolved = local_target(path, reference)
            if resolved is None:
                continue
            target, fragment = resolved
            name = path.relative_to(ROOT)
            if not target.is_relative_to(ROOT):
                errors.append(f"{name}: reference escapes the public root: {reference}")
            elif not target.is_file():
                errors.append(f"{name}: missing local target: {reference}")
            elif fragment and target in pages and fragment not in pages[target].ids:
                errors.append(f"{name}: missing fragment target: {reference}")
            if target.is_file() and target.is_relative_to(ROOT):
                required_public.add(target)

    for path in sorted((ROOT / "assets").rglob("*.css")):
        for reference in re.findall(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", path.read_text(encoding="utf-8")):
            resolved = local_target(path, reference.strip())
            if resolved is not None and not resolved[0].is_file():
                errors.append(f"{path.relative_to(ROOT)}: missing CSS asset: {reference}")
            elif resolved is not None and resolved[0].is_relative_to(ROOT):
                required_public.add(resolved[0])

    cv = ROOT / "assets/docs/Andreas-Paraskeva-CV.pdf"
    if not cv.is_file() or not cv.read_bytes().startswith(b"%PDF-"):
        errors.append("CV download is missing or is not a PDF")
    if archive_path is not None:
        try:
            with zipfile.ZipFile(archive_path) as archive:
                if archive.testzip():
                    errors.append("Upload ZIP failed its integrity check")
                names = set(archive.namelist())
                for required in ("site/index.html", "site/gaming/index.html", "site/assets/docs/Andreas-Paraskeva-CV.pdf", "UPLOAD-GUIDE/DEPLOYMENT.md", "UPLOAD-GUIDE/EDITING.md"):
                    if required not in names:
                        errors.append(f"Upload ZIP lacks {required}")
                for target in required_public:
                    required = f"site/{target.relative_to(ROOT).as_posix()}"
                    if required not in names:
                        errors.append(f"Upload ZIP lacks a referenced public file: {required}")
                for name in names:
                    parts = Path(name).parts
                    if any(part.startswith(".") or part in {"node_modules", "tests", "scripts", "private", "secrets", "__pycache__"} for part in parts):
                        errors.append(f"Unexpected archive entry: {name}")
                    if name.startswith("site/") and not name.endswith("/"):
                        source = ROOT / name.removeprefix("site/")
                        if not source.is_file() or source.read_bytes() != archive.read(name):
                            errors.append(f"Archived public file does not match the checkout: {name}")
        except (OSError, zipfile.BadZipFile) as error:
            errors.append(f"Cannot read upload ZIP: {error}")
    print(f"Checked {len(pages)} HTML pages, local links, fragments, ARIA targets, CSS assets, metadata, and CV" + (", plus ZIP contents." if archive_path else "."))
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, dest="archive", help="Also validate a packaged upload ZIP")
    args = parser.parse_args()
    failures = check(args.archive)
    if failures:
        print("\n".join(f"FAIL: {message}" for message in failures))
        raise SystemExit(1)
    print("PASS: static website checks")
