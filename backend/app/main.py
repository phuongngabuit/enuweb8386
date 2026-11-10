"""Chạy đồng thời 2 cổng trong một tiến trình: public (đọc) và editor (biên tập nội bộ)."""
import asyncio

import uvicorn

from . import config
from .api import create_app

public_app = create_app(with_editor=False)
editor_app = create_app(with_editor=True)


async def serve():
    servers = [
        uvicorn.Server(uvicorn.Config(public_app, host=config.PUBLIC_HOST, port=config.PUBLIC_PORT, log_level="info",
                                      proxy_headers=True, forwarded_allow_ips="*")),
        uvicorn.Server(uvicorn.Config(editor_app, host=config.EDITOR_HOST, port=config.EDITOR_PORT, log_level="info")),
    ]
    print(f"SupportFlow  công khai: http://{config.PUBLIC_HOST}:{config.PUBLIC_PORT}")
    print(f"SupportFlow  Studio (nội bộ): http://{config.EDITOR_HOST}:{config.EDITOR_PORT}/studio"
          + ("" if config.EDITOR_TOKEN else "  [chưa đặt EDITOR_TOKEN]"))
    print("Gemini:", config.GEMINI_MODEL if config.GEMINI_API_KEY else "CHƯA cấu hình (import chạy chế độ quy tắc)")
    await asyncio.gather(*(s.serve() for s in servers))


if __name__ == "__main__":
    asyncio.run(serve())
