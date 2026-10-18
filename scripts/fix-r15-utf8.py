#!/usr/bin/env python3
"""Restore START-HERE-R15.html UTF-8 and bump cache without PowerShell mangling."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    # Restore binary-correct file from last known-good commit
    subprocess.run(
        ["git", "checkout", "092919e", "--", "START-HERE-R15.html"],
        cwd=ROOT,
        check=True,
    )
    path = ROOT / "START-HERE-R15.html"
    text = path.read_bytes().decode("utf-8")
    if "Движение" not in text or "Действие" not in text:
        print("ERROR: good Cyrillic missing after git checkout", file=sys.stderr)
        return 1
    if "РґРІРёР¶" in text:
        print("ERROR: file already double-encoded", file=sys.stderr)
        return 1

    for old in (
        "r15-entry-lift-2",
        "r15-marquee-2",
        "r15-marquee-3",
        "r15-marquee-4",
    ):
        text = text.replace(old, "r15-marquee-5")
    text = re.sub(r'retro\.js\?v=[^"]+', "retro.js?v=r15-marquee-5", text)
    path.write_bytes(text.encode("utf-8"))

    index = (
        "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
        "<meta http-equiv=\"refresh\" content=\"0; url=START-HERE-R15.html?v=r15-marquee-5\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<title>Итоги 2026 — HR · R15</title></head><body>"
        "<a href=\"START-HERE-R15.html?v=r15-marquee-5\">"
        "Открыть игру «Итоги 2026 — HR» (R15)</a></body></html>\n"
    )
    (ROOT / "index.html").write_bytes(index.encode("utf-8"))

    check = path.read_text(encoding="utf-8")
    print("ok_movement", "Движение" in check)
    print("ok_action", "Действие" in check)
    print("ok_cache", "r15-marquee-5" in check)
    print("mojibake", "РґРІРёР¶" in check)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
