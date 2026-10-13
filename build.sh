#!/bin/sh
# Netlify runs this. public/ is generated from src/ by tools/build.py and committed, so this only
# checks it: required files, every style's poster, the bundled scripts and price data, no
# unexpanded placeholders or em dashes, the five Netlify forms, the CSP, and that the preview
# cannot be indexed.
set -eu
for f in public/configurator/index.html public/configurator/thank-you/index.html public/404.html public/privacy.html \
         public/_headers public/_redirects public/robots.txt public/assets/pecasa-logo.webp public/assets/privacy.css \
         public/assets/brand/pecasa-logo-positive.svg public/assets/brand/pecasa-logo-negative.svg \
         public/assets/fonts/barlow-400.woff2 public/assets/fonts/barlow-500.woff2 public/assets/fonts/barlow-600.woff2 \
         public/assets/fonts/barlow-condensed-600.woff2 public/assets/fonts/barlow-condensed-700.woff2; do
  test -s "$f" || { echo "missing: $f"; exit 1; }
done
for s in levno apexo pergola portal cabano inspiro quba roko ofiko ecke edge lshape veranda angle; do
  for v in 320.webp 480.webp 960.webp 960.jpg; do test -s "public/assets/posters/$s-$v" || { echo "missing poster: $s-$v (run python3 tools/posters.py)"; exit 1; }; done
done
PAGE=public/configurator/index.html
CONFIG_JS=$(grep -o '/assets/js/configurator\.[0-9a-f]*\.js' "$PAGE" | head -1)
test -n "$CONFIG_JS" && test -s "public$CONFIG_JS" || { echo "configurator script missing (run python3 tools/build.py)"; exit 1; }
for part in scene scene-gl1 configurator-pdf; do
  JS=$(grep -o "/assets/js/$part\.[0-9a-f]*\.js" "public$CONFIG_JS" | head -1)
  test -n "$JS" && test -s "public$JS" || { echo "$part bundle missing (run python3 tools/build.py)"; exit 1; }
done
grep -q 'type="module"' "$PAGE" || { echo "configurator module attribute missing"; exit 1; }
grep -q '28109' "public$CONFIG_JS" || { echo "planner estimates not bundled"; exit 1; }
grep -q '22300' "public$CONFIG_JS" || { echo "published price table not bundled"; exit 1; }
PAGES="$PAGE public/configurator/thank-you/index.html public/404.html public/privacy.html"
if grep -l '{{' $PAGES; then echo "unexpanded placeholder (run python3 tools/build.py)"; exit 1; fi
EM=$(printf '\342\200\224')
if grep -n "$EM" $PAGES; then echo "em dash found"; exit 1; fi
for form in pecasa-design-quote pecasa-callback pecasa-book-call pecasa-showroom-visit pecasa-brochure; do
  grep -q "name=\"$form\" method=\"POST\" action=\"/configurator/thank-you/\" data-netlify=\"true\"" "$PAGE" || { echo "Netlify form $form missing"; exit 1; }
done
for p in $PAGES; do grep -q 'name="robots" content="noindex, nofollow"' "$p" || { echo "noindex missing: $p"; exit 1; }; done
grep -q 'Disallow: /' public/robots.txt || { echo "robots.txt must disallow all on the preview"; exit 1; }
grep -q "Content-Security-Policy: default-src 'self'" public/_headers || { echo "CSP missing from public/_headers"; exit 1; }
if grep -q "unsafe-inline" public/_headers; then echo "CSP must not allow unsafe-inline"; exit 1; fi
test ! -e public/__axe.js || { echo "remove public/__axe.js (QA helper)"; exit 1; }
printf 'Static site ready in public/\n'
