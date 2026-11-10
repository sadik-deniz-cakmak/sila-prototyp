"""Lädt IBM Plex Sans Arabic (SIL OFL 1.1) für den Offline-Betrieb und schreibt vendor/fonts/fonts.css.

Eingabe: vendor/fonts/google.css (Google-Fonts-Stylesheet, vorher mit Browser-User-Agent geladen).
Übernimmt nur die Teilmengen arabic, latin und latin-ext. Aufruf im Ordner 05_prototyp:
    python -I -X utf8 tools/fetch_fonts.py
"""
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "vendor" / "fonts"
KEEP = {"arabic", "latin", "latin-ext"}

css = (FONTS / "google.css").read_text(encoding="utf-8")
blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
out = ["/* IBM Plex Sans Arabic, SIL Open Font License 1.1 (siehe OFL.txt). Lokal gespeichert für den Offline-Betrieb. */"]
files = []
for subset, body in blocks:
    if subset not in KEEP:
        continue
    weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
    url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
    urange = re.search(r"unicode-range:\s*([^;]+);", body).group(1).strip()
    name = f"plex-arabic-{weight}-{subset}.woff2"
    target = FONTS / name
    if not target.exists():
        with urllib.request.urlopen(url, timeout=30) as resp:
            target.write_bytes(resp.read())
    files.append(name)
    out.append(
        "@font-face {\n"
        "  font-family: 'IBM Plex Sans Arabic';\n"
        "  font-style: normal;\n"
        f"  font-weight: {weight};\n"
        "  font-display: swap;\n"
        f"  src: url('{name}') format('woff2');\n"
        f"  unicode-range: {urange};\n"
        "}"
    )
(FONTS / "fonts.css").write_text("\n".join(out) + "\n", encoding="utf-8")
print(len(files), "Schriftdateien:", ", ".join(files))
sys.exit(0 if files else 1)
