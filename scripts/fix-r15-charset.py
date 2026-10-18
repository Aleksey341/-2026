#!/usr/bin/env python3
"""Ensure START-HERE-R15.html has early UTF-8 charset meta and fresh cache bust."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "START-HERE-R15.html"
text = path.read_text(encoding="utf-8")

if "Привет" not in text or "движение" not in text:
    raise SystemExit("ERROR: Cyrillic missing — aborting")

# Insert charset as first head child if missing
if "charset=" not in text[:800].lower():
    text = re.sub(
        r"(<head[^>]*>)",
        r'\1<meta charset="utf-8">',
        text,
        count=1,
        flags=re.IGNORECASE,
    )

for old in ("r15-entry-lift-2", "r15-marquee-2", "r15-marquee-3", "r15-marquee-4"):
    text = text.replace(old, "r15-marquee-5")
text = re.sub(r'retro\.js\?v=[^"]+', "retro.js?v=r15-marquee-5", text)

path.write_text(text, encoding="utf-8", newline="\n")

index = (
    "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
    "<meta http-equiv=\"refresh\" content=\"0; url=START-HERE-R15.html?v=r15-marquee-5\">"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    "<title>Итоги 2026 — HR · R15</title></head><body>"
    "<a href=\"START-HERE-R15.html?v=r15-marquee-5\">"
    "Открыть игру «Итоги 2026 — HR» (R15)</a></body></html>\n"
)
(ROOT / "index.html").write_text(index, encoding="utf-8", newline="\n")

check = path.read_text(encoding="utf-8")
print("charset_early", check.lower().find("charset=utf-8") < check.lower().find("<title"))
print("movement", "движение" in check)
print("action", "действие" in check)
print("cache", "r15-marquee-5" in check)
