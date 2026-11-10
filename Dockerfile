# --- Giai đoạn 1: build giao diện ---
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- Giai đoạn 2: máy chủ Python + FFmpeg ---
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 app && mkdir /data && chown app /data
WORKDIR /srv
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=web /web/dist ./static
ENV SF_DATA_DIR=/data SF_STATIC_DIR=/srv/static EDITOR_HOST=0.0.0.0 PYTHONUNBUFFERED=1
USER app
EXPOSE 8080 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8080/healthz',timeout=4)"
CMD ["python", "-m", "app.main"]
