#!/usr/bin/env bash
# Renders the share cards in client/public/og/ from scripts/og/card.html.
#
# There is no sharp/ImageMagick on the machines this repo is edited from, so the
# renderer is Playwright's cached headless Chrome and the downscale is `sips`.
# Rendering at 2× and halving is noticeably crisper than a 1× render, and
# --virtual-time-budget is what waits for the webfont — without it the text
# comes out in a fallback face.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/client/public/og"
SRC="$ROOT/scripts/og/card.html"
TMP="$(mktemp -d)"

CHROME="$(find "$HOME/Library/Caches/ms-playwright" -maxdepth 4 -name chrome-headless-shell 2>/dev/null | sort | tail -1)"
if [ -z "$CHROME" ]; then
  echo "No headless Chrome found under ~/Library/Caches/ms-playwright" >&2
  exit 1
fi

mkdir -p "$OUT"

for variant in home privacy dashboard; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 --window-size=1200,630 \
    --virtual-time-budget=6000 --allow-file-access-from-files \
    --screenshot="$TMP/$variant.png" "file://$SRC#$variant" 2>/dev/null
  sips -z 630 1200 "$TMP/$variant.png" --out "$OUT/$variant.png" >/dev/null
  echo "rendered og/$variant.png"
done

rm -rf "$TMP"
