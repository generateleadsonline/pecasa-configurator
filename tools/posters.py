"""Writes the style posters in public/assets/posters/ from 1440 x 960 renders of each style's
standard design (rendered by tools/qa/render-posters.mjs from this repository's own 3D scene).
Posters show before the 3D starts, on the style cards, and in the PDF when a device cannot render.
Run: python3 tools/posters.py <folder of <style>.png renders>
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'posters')
os.makedirs(OUT, exist_ok=True)
src = sys.argv[1]
for name in sorted(os.listdir(src)):
    if not name.endswith('.png'):
        continue
    style = name[:-4]
    img = Image.open(os.path.join(src, name)).convert('RGB')
    for w, q in [(960, 74), (480, 70)]:
        im = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, f'{style}-{w}.webp'), 'WEBP', quality=q, method=6)
    img.resize((960, 640), Image.LANCZOS).save(os.path.join(OUT, f'{style}-960.jpg'), 'JPEG', quality=80, optimize=True, progressive=True)
    print(style)
