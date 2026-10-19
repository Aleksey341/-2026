#!/usr/bin/env python3
"""Replace welcome girl image with male greeting video inside the card."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW = "r15-welcome-hero-1"
VIDEO = "assets/welcome-hero.webm"
POSTER = "assets/welcome-hero-poster.png"

html_path = ROOT / "START-HERE-R15.html"
text = html_path.read_text(encoding="utf-8")
if "Привет" not in text:
    raise SystemExit("START-HERE-R15.html missing Cyrillic — abort")

old_card = (
    "#welcome .start-card{position:relative;width:min(760px,calc(100vw - 40px));min-height:360px;"
    "padding:36px 36px 30px 220px;border:1px solid #ffffffb8;border-radius:28px 28px 0 0;"
    "background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(247,246,255,.95));"
    "box-shadow:0 28px 90px #17152f55;color:#292b4c;overflow:visible}"
)
new_card = (
    "#welcome .start-card{position:relative;display:flex;align-items:flex-end;gap:8px;"
    "width:min(820px,calc(100vw - 40px));min-height:360px;padding:28px 32px 0 8px;"
    "border:1px solid #ffffffb8;border-radius:28px 28px 0 0;"
    "background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(247,246,255,.95));"
    "box-shadow:0 28px 90px #17152f55;color:#292b4c;overflow:visible}"
)
old_girl = (
    "#welcome .start-girl{position:absolute;z-index:2;display:block;left:-178px;bottom:0;"
    "height:min(470px,72vh);width:auto;max-width:none;pointer-events:none;"
    "filter:drop-shadow(0 14px 22px #28204624)}"
)
new_girl = (
    "#welcome .start-girl{position:relative;z-index:2;display:block;flex:0 0 auto;"
    "align-self:flex-end;height:min(420px,68vh);width:auto;max-width:min(280px,38vw);"
    "object-fit:contain;object-position:bottom center;pointer-events:none;"
    "filter:drop-shadow(0 14px 22px #28204624);background:transparent}"
)
old_copy = "#welcome .start-copy{position:relative;z-index:3}"
new_copy = (
    "#welcome .start-copy{position:relative;z-index:3;flex:1 1 auto;min-width:0;"
    "padding:20px 0 30px 8px}"
)

if old_card not in text:
    raise SystemExit("card css not found")
if old_girl not in text:
    raise SystemExit("girl css not found")
if old_copy not in text:
    raise SystemExit("copy css not found")

text = text.replace(old_card, new_card).replace(old_girl, new_girl).replace(old_copy, new_copy)

old_mobile = (
    "@media(max-width:640px){#welcome{padding:22px 12px;align-items:end}"
    "#welcome .start-card{width:min(420px,94vw);min-height:390px;padding:142px 22px 22px;"
    "margin-top:108px;border-radius:22px 22px 0 0}"
    "#welcome .start-girl{height:250px;left:50%;top:-124px;bottom:auto;transform:translateX(-50%)}"
    "#welcome h2{font-size:26px;margin-bottom:18px}"
    "#welcome .start-eyebrow{margin-bottom:8px}"
    "#welcome #welcome-start{font-size:15px}"
    "#project-modal .panel,#project-modal.slide-view .panel{width:94vw;height:88vh;right:3vw;padding:14px}}"
)
new_mobile = (
    "@media(max-width:640px){#welcome{padding:22px 12px;align-items:end}"
    "#welcome .start-card{flex-direction:column;align-items:center;width:min(420px,94vw);"
    "min-height:390px;padding:18px 18px 0;margin-top:24px;border-radius:22px 22px 0 0;gap:0}"
    "#welcome .start-girl{height:min(260px,42vh);max-width:min(200px,55vw);order:-1}"
    "#welcome .start-copy{padding:8px 4px 22px;width:100%}"
    "#welcome h2{font-size:26px;margin-bottom:18px}"
    "#welcome .start-eyebrow{margin-bottom:8px}"
    "#welcome #welcome-start{font-size:15px}"
    "#project-modal .panel,#project-modal.slide-view .panel{width:94vw;height:88vh;right:3vw;padding:14px}}"
)
if old_mobile not in text:
    raise SystemExit("mobile css not found")
text = text.replace(old_mobile, new_mobile)

video_tag = (
    f'<video class="start-girl" autoplay muted loop playsinline '
    f'poster="{POSTER}" aria-label="Герой приветствует игрока">'
    f'<source src="{VIDEO}" type="video/webm">'
    f"</video>"
)
text2, n = re.subn(
    r'<img class="start-girl"[^>]*>',
    video_tag,
    text,
    count=1,
)
if n != 1:
    raise SystemExit(f"start-girl img replace failed: {n}")
text = text2

text = re.sub(r'(reactor-room\.js\?v=)[^"]+', rf"\g<1>{NEW}", text)
text = re.sub(r'(future\.js\?v=)[^"]+', rf"\g<1>{NEW}", text)
text = re.sub(r'(game\.js\?v=)[^"]+', rf"\g<1>{NEW}", text)
text = re.sub(
    r"r15-(?:hall-posters|future-pad|welcome-girl|welcome-hero|marquee)-\d+",
    NEW,
    text,
)

html_path.write_bytes(text.encode("utf-8"))
(ROOT / "index.html").write_bytes(
    (
        "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
        f"<meta http-equiv=\"refresh\" content=\"0; url=START-HERE-R15.html?v={NEW}\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<title>Итоги 2026 — HR · R15</title></head><body>"
        f"<a href=\"START-HERE-R15.html?v={NEW}\">"
        "Открыть игру «Итоги 2026 — HR» (R15)</a></body></html>\n"
    ).encode("utf-8")
)

# Ensure welcome video starts when the dialog opens.
game_path = ROOT / "room-module" / "src" / "game.js"
game = game_path.read_text(encoding="utf-8")
needle = "welcome.hidden=false;document.body.classList.add('welcome-open');"
inject = (
    "welcome.hidden=false;document.body.classList.add('welcome-open');"
    "const welcomeHero=welcome.querySelector('video.start-girl');"
    "if(welcomeHero){welcomeHero.muted=true;welcomeHero.play().catch(()=>{});}"
)
if "welcomeHero" not in game:
    if needle not in game:
        raise SystemExit("game.js welcome open needle not found")
    game = game.replace(needle, inject, 1)
    game_path.write_text(game, encoding="utf-8")
    source_game = ROOT / "source" / "game.js"
    if source_game.exists():
        source_game.write_text(game, encoding="utf-8")

check = html_path.read_text(encoding="utf-8")
print("cyrillic", "Привет" in check)
print("video", VIDEO in check and "<video class=\"start-girl\"" in check)
print("no_base64_girl", "data:image/png;base64" not in check or check.count("start-girl") == 1)
print("img_gone", '<img class="start-girl"' not in check)
print("in_card_flex", "display:flex;align-items:flex-end" in check)
print("cache", NEW in check)
print("html_bytes", html_path.stat().st_size)
print("webm", (ROOT / VIDEO).exists(), (ROOT / VIDEO).stat().st_size if (ROOT / VIDEO).exists() else 0)
print("poster", (ROOT / POSTER).exists())
