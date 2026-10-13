#!/bin/sh
# Netlify runs this. public/ is generated from src/ by tools/build.py and committed, so this
# only checks it: required files, no unexpanded placeholders, no em dashes, the Netlify form,
# the CSP, and that the preview cannot be indexed.
set -eu
for f in public/index.html public/configurator/index.html public/thank-you/index.html public/404.html public/_headers \
         public/robots.txt public/favicon.svg public/apple-touch-icon.png public/assets/og-v2.jpg \
         public/assets/brand/smart-logo-negative.svg public/assets/brand/smart-logo-positive.svg \
         public/assets/fonts/saira-sc-var.woff2 public/assets/fonts/figtree-var.woff2 public/assets/brand/leaf-lines.svg \
         public/assets/img/hero-belle-dusk-1280.avif public/assets/img/hero-belle-dusk-1280.jpg \
         public/assets/brochure/smart-garden-rooms-range-and-price-guide-2026-v2.pdf; do
  test -s "$f" || { echo "missing: $f"; exit 1; }
done
JS=$(grep -o '/assets/js/app\.[0-9a-f]*\.js' public/index.html | head -1)
test -n "$JS" && test -s "public$JS" || { echo "script missing: $JS (run python3 tools/build.py)"; exit 1; }
grep -q 'p:\[\[13475,14225' "public$JS" || { echo "price grids not injected"; exit 1; }
CONFIG_JS=$(grep -o '/assets/js/configurator\.[0-9a-f]*\.js' public/configurator/index.html | head -1)
test -n "$CONFIG_JS" && test -s "public$CONFIG_JS" || { echo "configurator script missing (run python3 tools/build.py)"; exit 1; }
SCENE_JS=$(grep -o '/assets/js/scene\.[0-9a-f]*\.js' "public$CONFIG_JS" | head -1)
test -n "$SCENE_JS" && test -s "public$SCENE_JS" || { echo "configurator scene missing (run python3 tools/build.py)"; exit 1; }
SCENE_GL1_JS=$(grep -o '/assets/js/scene-gl1\.[0-9a-f]*\.js' "public$CONFIG_JS" | head -1)
test -n "$SCENE_GL1_JS" && test -s "public$SCENE_GL1_JS" || { echo "WebGL1 scene missing (run python3 tools/build.py)"; exit 1; }
grep -q 'type="module"' public/configurator/index.html || { echo "configurator module attribute missing"; exit 1; }
grep -q '13475,14225' "public$CONFIG_JS" || { echo "configurator price grids not bundled"; exit 1; }
if grep -l '{{' public/index.html public/configurator/index.html public/thank-you/index.html public/404.html; then echo "unexpanded placeholder (run python3 tools/build.py)"; exit 1; fi
EM=$(printf '\342\200\224')
if grep -n "$EM" public/index.html public/configurator/index.html public/thank-you/index.html public/404.html; then echo "em dash found"; exit 1; fi
grep -q 'data-netlify="true"' public/index.html || { echo "Netlify form attribute missing"; exit 1; }
grep -q 'name="smart-configurator"' public/configurator/index.html || { echo "configurator form name missing"; exit 1; }
grep -q 'data-netlify="true"' public/configurator/index.html || { echo "configurator Netlify form attribute missing"; exit 1; }
grep -q 'name="robots" content="noindex, nofollow"' public/index.html || { echo "noindex missing"; exit 1; }
grep -q 'name="robots" content="noindex, nofollow"' public/configurator/index.html || { echo "configurator noindex missing"; exit 1; }
grep -q 'Disallow: /' public/robots.txt || { echo "robots.txt must disallow all on the preview"; exit 1; }
grep -q "Content-Security-Policy: default-src 'self'" public/_headers || { echo "CSP missing from public/_headers"; exit 1; }
test ! -e public/__axe.js || { echo "remove public/__axe.js (QA helper)"; exit 1; }
printf 'Static site ready in public/\n'
