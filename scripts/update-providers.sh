#!/usr/bin/env bash
# /home/z/my-project/streamhub/scripts/update-providers.sh
#
# Pulls latest .cs3 files from a provider repo (if configured) and reloads the bridge.
#
# Usage:
#   bash scripts/update-providers.sh
#
# Configure repo URLs in cs3-bridge/extensions/repos.json:
#   [
#     { "name": "VegaMovies", "url": "https://example.com/vegamovies.cs3" }
#   ]

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSIONS_DIR="$REPO_DIR/cs3-bridge/extensions"
REPOS_FILE="$EXTENSIONS_DIR/repos.json"

if [[ ! -f "$REPOS_FILE" ]]; then
    echo "No $REPOS_FILE found — nothing to update."
    echo "Create one with this format:"
    echo '[{"name":"VegaMovies","url":"https://example.com/vegamovies.cs3"}]'
    exit 0
fi

echo "→ Updating .cs3 files from repos..."

# Use jq if available, else fall back to python
if command -v jq &> /dev/null; then
    COUNT=$(jq length "$REPOS_FILE")
    for i in $(seq 0 $((COUNT - 1))); do
        NAME=$(jq -r ".[$i].name" "$REPOS_FILE")
        URL=$(jq -r ".[$i].url" "$REPOS_FILE")
        echo "  Fetching $NAME from $URL..."
        curl -fsSL -o "$EXTENSIONS_DIR/$NAME.cs3" "$URL" && echo "  ✓ $NAME.cs3" || echo "  ✗ Failed: $NAME"
    done
else
    python3 -c "
import json, urllib.request, os, sys
with open('$REPOS_FILE') as f:
    repos = json.load(f)
for r in repos:
    name, url = r['name'], r['url']
    print(f'  Fetching {name} from {url}...')
    try:
        urllib.request.urlretrieve(url, '$EXTENSIONS_DIR/' + name + '.cs3')
        print(f'  ✓ {name}.cs3')
    except Exception as e:
        print(f'  ✗ Failed: {name} ({e})')
"
fi

# Reload the bridge
if command -v docker &> /dev/null && docker compose ps cs3bridge 2>/dev/null | grep -q "Up"; then
    echo "→ Reloading CS3 bridge..."
    curl -fsSL -X POST http://localhost:5000/reload 2>/dev/null && echo "✓ Bridge reloaded" || \
        docker compose restart cs3bridge
else
    echo "ℹ Bridge not running locally — skip the reload step."
fi

echo "✓ Provider update complete"
