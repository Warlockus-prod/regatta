#!/usr/bin/env python3
"""Flatten the iOS app icon to opaque RGB (no alpha channel).

Apple rejects App Store icons that carry an alpha channel; any transparency is
rendered as black. The source icon was opaque RGBA (the alpha channel was dead
weight), so compositing onto the brand background and dropping the channel
changes nothing visible while satisfying the requirement.

Usage: python3 mobile/scripts/flatten-icon.py mobile/assets/icon.png
"""
import sys
from PIL import Image

BG = (10, 22, 40)  # #0a1628 dark-ocean, matches splash/adaptive background

def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "mobile/assets/icon.png"
    img = Image.open(path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    flat = Image.new("RGB", img.size, BG)
    flat.paste(img, mask=img.split()[3])  # composite using the alpha channel
    flat.save(path, format="PNG")
    check = Image.open(path)
    print(f"saved {path} mode={check.mode} size={check.size}")
    return 0 if check.mode == "RGB" else 1

if __name__ == "__main__":
    raise SystemExit(main())
