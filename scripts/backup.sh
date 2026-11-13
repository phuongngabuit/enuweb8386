#!/bin/bash
# Sao lưu toàn bộ bài viết + ảnh/video vào thư mục backups/. Chạy được khi hệ thống đang hoạt động.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
# Chụp SQLite an toàn (không sao chép tệp đang ghi dở)
docker compose exec -T supportflow python -c "
import sqlite3; s=sqlite3.connect('/data/supportflow.db'); d=sqlite3.connect('/data/backup.db'); s.backup(d); d.close(); s.close()"
tar -czf "backups/supportflow-$STAMP.tar.gz" -C data backup.db media $( [ -d data/docs ] && echo docs ) $( [ -f data/symptoms.json ] && echo symptoms.json )
rm -f data/backup.db
# Giữ 30 bản gần nhất
ls -1t backups/supportflow-*.tar.gz | tail -n +31 | xargs -r rm -f
echo "Đã sao lưu: backups/supportflow-$STAMP.tar.gz"
