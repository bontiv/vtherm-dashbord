#!/usr/bin/env bash
# Build the archive that HACS installs (`zip_release`): the content of custom_components/vtherm_dashboard/, with the built frontend.
# The root of the archive is the integration itself, so HACS can extract it into custom_components/vtherm_dashboard/. The manifest is the
# one of the repository, unchanged. Run `npm run build` first. The archive is written to dist/ with the name of hacs.json.
set -euo pipefail
cd "$(dirname "$0")/.."
ARCHIVE="vtherm_dashboard.zip"
SOURCE="custom_components/vtherm_dashboard"
if [ ! -f "$SOURCE/www/vtherm-dashboard.js" ]; then
    echo "The frontend is not built: $SOURCE/www/vtherm-dashboard.js is missing. Run npm run build." >&2
    exit 1
fi
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT
# Without tests, sources, node_modules or caches: the integration only has what it needs at run time.
rsync -a --exclude '__pycache__' --exclude '*.pyc' --exclude 'tests' --exclude 'node_modules' --exclude '.DS_Store' "$SOURCE/" "$STAGING/"
cmp "$SOURCE/manifest.json" "$STAGING/manifest.json"
mkdir -p dist
rm -f "dist/$ARCHIVE"
(cd "$STAGING" && zip -q -r -X "$OLDPWD/dist/$ARCHIVE" .)
echo "dist/$ARCHIVE"
unzip -l "dist/$ARCHIVE" | tail -1
