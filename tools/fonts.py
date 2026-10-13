"""Subset the Barlow family for the web (WOFF2) and the PDF (TTF).

Barlow and Barlow Condensed (SIL OFL 1.1, tools/fonts/OFL.txt) are the typefaces of Pecasa's own
garden room planner. Masters come from github.com/google/fonts (ofl/barlow, ofl/barlowcondensed).
Run: python3 tools/fonts.py   (needs fontTools and brotli)
"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts')
WEB = os.path.join(ROOT, 'public', 'assets', 'fonts')
PDF = os.path.join(ROOT, 'tools', 'fonts', 'pdf')
# Latin, punctuation, currency, arrows used in copy, the multiplication sign and superscripts.
UNICODES = list(range(0x20, 0x7f)) + list(range(0xa0, 0x180)) + [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac, 0x2122, 0x2190, 0x2192, 0x2212, 0x00d7, 0x00b2, 0x00b3, 0x2009, 0x202f]

FACES = {
    'barlow-400': 'Barlow-Regular.ttf',
    'barlow-500': 'Barlow-Medium.ttf',
    'barlow-600': 'Barlow-SemiBold.ttf',
    'barlow-condensed-600': 'BarlowCondensed-SemiBold.ttf',
    'barlow-condensed-700': 'BarlowCondensed-Bold.ttf',
}


def make(src, out, flavor):
    options = subset.Options()
    options.flavor = flavor
    options.layout_features = ['kern', 'liga', 'tnum', 'lnum']
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.drop_tables += ['DSIG']
    font = TTFont(src)
    sub = subset.Subsetter(options)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    font.flavor = flavor
    font.save(out)
    return os.path.getsize(out)


os.makedirs(WEB, exist_ok=True)
os.makedirs(PDF, exist_ok=True)
for name, master in FACES.items():
    web = make(os.path.join(SRC, master), os.path.join(WEB, f'{name}.woff2'), 'woff2')
    pdf = make(os.path.join(SRC, master), os.path.join(PDF, f'{name}.ttf'), None)
    print(f'{name}: web {web:,} bytes, pdf {pdf:,} bytes')
