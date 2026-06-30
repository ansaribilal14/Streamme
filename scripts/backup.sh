#!/usr/bin/env bash
# /home/z/my-project/streamhub/scripts/backup.sh
#
# Backs up the StreamHub SQLite database + .env to a timestamped tar.gz.
# Run from the repo root or via cron.
#
# Usage:
#   bash scripts/backup.sh                    # writes to ./backups/
#   BACKUP_DIR=/mnt/nas/streamhub bash scripts/backup.sh
#
# Cron example (daily at 3am):
#   0 3 * * * cd /home/ubuntu/Streamme && bash scripts/backup.sh >> backups/backup.log 2>&1

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
DB_PATH="$REPO_DIR/database/streamhub.db"
ENV_PATH="$REPO_DIR/.env"
EXTENSIONS_DIR="$REPO_DIR/cs3-bridge/extensions"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/streamhub-$TIMESTAMP.tar.gz"

echo "→ Backing up StreamHub to $BACKUP_FILE"

# Use sqlite3 .backup for a consistent snapshot if sqlite3 is available
if [[ -f "$DB_PATH" ]]; then
    if command -v sqlite3 &> /dev/null; then
        TEMP_DB=$(mktemp)
        sqlite3 "$DB_PATH" ".backup '$TEMP_DB'"
        ITEMS+=("$TEMP_DB:streamhub.db")
    else
        # Fallback: just copy the file (may catch mid-write state)
        TEMP_DB=$(mktemp)
        cp "$DB_PATH" "$TEMP_DB"
        ITEMS+=("$TEMP_DB:streamhub.db")
    fi
fi

if [[ -f "$ENV_PATH" ]]; then
    ITEMS+=("$ENV_PATH:.env")
fi

if [[ -d "$EXTENSIONS_DIR" ]]; then
    ITEMS+=("$EXTENSIONS_DIR:extensions/")
fi

# Build tarball with proper structure
TMP_TAR=$(mktemp --suffix=.tar)
for item in "${ITEMS[@]}"; do
    SRC="${item%%:*}"
    DST="${item##*:}"
    tar -rf "$TMP_TAR" --transform "s|^$SRC|streamhub-backup/$DST|" -C / "$SRC" 2>/dev/null || true
done
gzip -c "$TMP_TAR" > "$BACKUP_FILE"
rm -f "$TMP_TAR"

# Clean up temp DB
[[ -n "$TEMP_DB" && -f "$TEMP_DB" ]] && rm -f "$TEMP_DB"

# Retention: keep last 14 backups
ls -1t "$BACKUP_DIR"/streamhub-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✓ Backup complete: $BACKUP_FILE ($SIZE)"
echo "  Retained $(ls -1 "$BACKUP_DIR"/streamhub-*.tar.gz 2>/dev/null | wc -l) backups in $BACKUP_DIR"
