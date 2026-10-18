#!/usr/bin/env python3
"""Restore good R15 HTML from origin/main bytes, then bump cache only."""
from pathlib import Path
import re
import subprocess
import shutil

ROOT = Path(__file__).resolve().parents[1]
NEW = "r15-hall-posters-1"

# Restore UTF-8-correct HTML from origin/main
raw = subprocess.check_output(
    ["git", "show", "origin/main:START-HERE-R15.html"], cwd=ROOT
)
text = raw.decode("utf-8")
if "Привет" not in text:
    raise SystemExit("origin/main HTML lacks Cyrillic")

text = re.sub(r'(reactor-room\.js\?v=)[^"]+', rf"\g<1>{NEW}", text)
for old in (
    "r15-marquee-7",
    "r15-marquee-6",
    "r15-marquee-5",
    "r15-marquee-4",
    "r15-hall-posters-1",
):
    text = text.replace(old, NEW)
if "charset=" not in text[:900].lower():
    text = re.sub(r"(<head[^>]*>)", r'\1<meta charset="utf-8">', text, count=1, flags=re.I)

(ROOT / "START-HERE-R15.html").write_bytes(text.encode("utf-8"))

idx = (
    "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
    f"<meta http-equiv=\"refresh\" content=\"0; url=START-HERE-R15.html?v={NEW}\">"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    "<title>Итоги 2026 — HR · R15</title></head><body>"
    f"<a href=\"START-HERE-R15.html?v={NEW}\">"
    "Открыть игру «Итоги 2026 — HR» (R15)</a></body></html>\n"
)
(ROOT / "index.html").write_bytes(idx.encode("utf-8"))

# Ensure source mirrors
for name in ("hall-posters.js", "reactor-room.js"):
    shutil.copy2(ROOT / "room-module/src" / name, ROOT / "source" / name)

check = (ROOT / "START-HERE-R15.html").read_text(encoding="utf-8")
print("ok_cyrillic", "Привет" in check and "движение" in check)
print("ok_cache", NEW in check)
print("ok_charset", "charset=utf-8" in check[:900].lower())
