#!/bin/bash
# Cập nhật phiên bản mới: sao lưu -> lấy mã mới -> build lại -> chạy. Dữ liệu trong ./data được giữ nguyên.
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/backup.sh
git pull
docker compose up -d --build
docker image prune -f
docker compose ps
