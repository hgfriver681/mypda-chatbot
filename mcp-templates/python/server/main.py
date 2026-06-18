"""
myPDA MCP 範本 — 伺服器入口（auth + Streamable HTTP + uvicorn）。

- 用官方 mcp 套件的 FastMCP，stateless_http=True，走 Streamable HTTP（/mcp 路徑）。
- Bearer 驗證：讀 env MCP_API_KEY（預設 demo-key），用 Starlette middleware 擋 /mcp。
- GET /health 不需驗證，給 docker healthcheck 用。
- 工具定義在 server/tools.py。
"""

from __future__ import annotations

import os

import uvicorn
from mcp.server.fastmcp import FastMCP
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from server.tools import register_tools

MCP_API_KEY = os.environ.get("MCP_API_KEY", "demo-key")
PORT = int(os.environ.get("PORT", "8787"))

# stateless_http=True：每個請求獨立，不需維護 session，最適合放在反向代理 / 容器後面。
mcp = FastMCP("mypda-mcp-template", stateless_http=True)
register_tools(mcp)


class BearerAuthMiddleware(BaseHTTPMiddleware):
    """對 /mcp 路徑強制要求 Authorization: Bearer <MCP_API_KEY>。"""

    async def dispatch(self, request: Request, call_next):
        # /health 不需驗證（給 healthcheck）。
        if request.url.path.startswith("/mcp"):
            auth = request.headers.get("authorization", "")
            expected = f"Bearer {MCP_API_KEY}"
            if auth != expected:
                return JSONResponse(
                    {"error": "unauthorized"},
                    status_code=401,
                )
        return await call_next(request)


async def health(_request: Request) -> Response:
    """healthcheck 端點，不需驗證。"""
    return JSONResponse({"ok": True})


def build_app():
    """組裝 Starlette app：streamable http app + /health route + bearer middleware。"""
    app = mcp.streamable_http_app()
    app.add_route("/health", health, methods=["GET"])
    app.add_middleware(BearerAuthMiddleware)
    return app


# 模組層級 app，方便 `uvicorn server.main:app` 直接帶起。
app = build_app()


def main() -> None:
    uvicorn.run(app, host="0.0.0.0", port=PORT)


if __name__ == "__main__":
    main()
