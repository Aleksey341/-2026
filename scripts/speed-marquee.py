#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NEW = "r15-marquee-7"
SPEED = "0.078"

for rel in ("room-module/src/graphite-r16.js", "source/graphite-r16.js"):
    p = ROOT / rel
    t = p.read_text(encoding="utf-8")
    t = re.sub(r"scrollSpeed = [0-9.]+ / copies", f"scrollSpeed = {SPEED} / copies", t)
    t = re.sub(r"scrollSpeed \?\? [0-9.]+", f"scrollSpeed ?? {SPEED}", t)
    p.write_text(t, encoding="utf-8", newline="\n")

html = ROOT / "START-HERE-R15.html"
text = html.read_text(encoding="utf-8")
for old in (
    "r15-entry-lift-2",
    "r15-marquee-2",
    "r15-marquee-3",
    "r15-marquee-4",
    "r15-marquee-5",
    "r15-marquee-6",
):
    text = text.replace(old, NEW)
text = re.sub(r'(graphite-r16\.js\?v=)[^"]+', rf"\g<1>{NEW}", text)
text = re.sub(r'(retro\.js\?v=)[^"]+', rf"\g<1>{NEW}", text)
html.write_text(text, encoding="utf-8", newline="\n")

(ROOT / "index.html").write_text(
    "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
    f"<meta http-equiv=\"refresh\" content=\"0; url=START-HERE-R15.html?v={NEW}\">"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    "<title>Итоги 2026 — HR · R15</title></head><body>"
    f"<a href=\"START-HERE-R15.html?v={NEW}\">"
    "Открыть игру «Итоги 2026 — HR» (R15)</a></body></html>\n",
    encoding="utf-8",
    newline="\n",
)
g = (ROOT / "room-module/src/graphite-r16.js").read_text(encoding="utf-8")
print("speed", SPEED in g)
print("cache", NEW in text)
print("cyrillic", "движение" in text)
