# myPDA MCP 範本 (Python)

## 這是什麼

這是一個可以直接跑起來的 MCP server 範本，用官方 `mcp` Python 套件的 `FastMCP`，走 Streamable HTTP（stateless 模式），服務路徑為 `/mcp`。內建 Bearer 金鑰驗證與 `/health` 健康檢查。

附四個示範工具：

- `ping` — 無參數，回傳 `pong`
- `echo` — 參數 `text`，原樣回傳文字
- `server_time` — 無參數，回傳 ISO 8601 時間與伺服器時區
- `add` — 參數 `a`、`b`，回傳兩數之和

你下載後，改 `server/tools.py` 接上自己的資料來源（ERP / 資料庫 / 檔案系統），用 `docker compose up` 跑起來，再到 myPDA 平台用網址 + 金鑰註冊即可。

## 快速啟動

### 用 Docker（建議）

```bash
cp .env.example .env
docker compose up --build
```

服務會跑在 `http://localhost:8787/mcp`。

### 本機跑（開發用）

用 uv：

```bash
uv venv
uv pip install -e .
uv run python -m server.main
```

或用 pip：

```bash
pip install -e .
python -m server.main
```

可用環境變數：

- `MCP_API_KEY`：Bearer 金鑰，預設 `demo-key`
- `PORT`：監聽埠，預設 `8787`

## 如何在 myPDA 平台註冊

1. 到 myPDA 的 `/mcp` 頁面，點 **Add MCP server**。
2. 貼入以下 JSON：

   ```json
   {
     "url": "http://localhost:8787/mcp",
     "headers": { "Authorization": "Bearer demo-key" }
   }
   ```

3. 存檔後做連線測試，應看到 `ping`、`echo`、`server_time`、`add` 四個工具。

## 如何加入你自己的工具

打開 `server/tools.py`，在 `register_tools` 裡用 `@mcp.tool()` 裝飾器新增函式：函式名稱就是工具名稱，docstring 就是描述，型別註記就是參數 schema。改完重啟服務即可。可以請 Claude Code 幫你把示範工具改成接你自己 ERP / 資料庫 / 檔案系統的工具。

## 安全提醒

- 正式環境請換掉 `demo-key`，改成夠長、隨機的金鑰，放在 `.env`（已被 `.gitignore` 忽略，不要 commit）。
- 建議只在內網開放，或在前面加上反向代理 / TLS，不要把未加密的 `/mcp` 直接暴露到公網。
