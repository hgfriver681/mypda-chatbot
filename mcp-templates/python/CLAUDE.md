# CLAUDE.md

給在這個範本裡工作的 Claude Code 的快速指南。

## 這是什麼

myPDA MCP 範本（Python）。用官方 `mcp` 套件的 `FastMCP`，stateless Streamable HTTP，服務 `/mcp`，跑在 uvicorn 上。

## 檔案位置

- `server/tools.py` — 所有工具定義都在這裡（`register_tools(mcp)` 內，用 `@mcp.tool()` 註冊）。新增工具請改這個檔。
- `server/main.py` — app / auth / uvicorn 接線。一般不需要動。
- `pyproject.toml` / `requirements.txt` — 依賴。
- `Dockerfile` / `docker-compose.yml` / `.env.example` — 部署。

## 驗證模型（auth）

- Bearer 金鑰從環境變數 `MCP_API_KEY` 讀（預設 `demo-key`）。
- `server/main.py` 的 `BearerAuthMiddleware` 對 `/mcp` 路徑要求 `Authorization: Bearer <MCP_API_KEY>`，不符回 HTTP 401。
- `GET /health` 不需驗證，給 healthcheck 用。

## 如何加一個工具

在 `server/tools.py` 的 `register_tools` 內加：

```python
@mcp.tool()
def my_tool(arg: str) -> str:
    """工具描述（會顯示在 myPDA UI）。"""
    return do_something(arg)
```

函式名 = 工具名，docstring = 描述，型別註記 = 參數 schema。改完重啟服務。

## 規則

- 不要使用 emoji。
- 不要把真實金鑰寫進原始碼或 commit `.env`。
