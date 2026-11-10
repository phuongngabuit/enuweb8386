#!/bin/bash
# Khôi phục từ một tệp sao lưu:  ./scripts/restore.sh backups/supportflow-YYYYMMDD-HHMMSS.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."
FILE="${1:?Cần đường dẫn tệp sao lưu}"
[ -f "$FILE" ] || { echo "Không thấy tệp $FILE"; exit 1; }
docker compose down
[ -d data ] && mv data "data.truoc-khoi-phuc-$(date +%Y%m%d-%H%M%S)"
mkdir -p data
tar -xzf "$FILE" -C data
mv data/backup.db data/supportflow.db
chown -R 1000:1000 data 2>/dev/null || true   # Linux: container chạy bằng người dùng uid 1000
docker compose up -d
echo "Đã khôi phục. Dữ liệu cũ được giữ trong thư mục data.truoc-khoi-phuc-*"
