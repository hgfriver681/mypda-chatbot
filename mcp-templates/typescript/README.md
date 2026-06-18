# myPDA MCP 範本 (TypeScript)

## 這是什麼

這是一個可以直接執行的最小 MCP server 範本，用官方 `@modelcontextprotocol/sdk` 透過
Streamable HTTP 對外服務。它內建四個示範工具（`ping`、`echo`、`server_time`、`add`），
讓你下載後改成連自己的資料來源（ERP、資料庫、檔案系統），再用 `docker compose up` 啟動，
最後在 myPDA 平台用網址加金鑰註冊就能用。

- 對外端點：`POST /mcp`（Streamable HTTP，stateless 模式）
- 健康檢查：`GET /health`（無認證，回 `{"ok":true}`）
- 認證：`Authorization: Bearer <MCP_API_KEY>`，缺少或錯誤回 HTTP 401

## 快速啟動

### 用 Docker（建議）

```bash
cp .env.example .env
docker compose up --build
```

### 本機開發

```bash
npm install
npm run dev
```

預設監聽 `0.0.0.0:8787`，端點為 `http://localhost:8787/mcp`，金鑰預設 `demo-key`。

## 如何在 myPDA 平台註冊

1. 到 myPDA 的 `/mcp` 頁，點 **Add MCP server**。
2. 貼入以下 JSON：

   ```json
   {
     "url": "http://localhost:8787/mcp",
     "headers": { "Authorization": "Bearer demo-key" }
   }
   ```

3. 存檔後做連線測試，應看到四個工具：`ping`、`echo`、`server_time`、`add`。

## 如何加入你自己的工具

打開 `src/tools.ts`，仿照裡面四個示範工具，用 `server.registerTool(name, config, handler)`
新增你自己的工具。把 handler 內容換成查你自己的 ERP / 資料庫 / 檔案系統的邏輯即可，
其餘 HTTP / 認證 / 傳輸的接線都在 `src/index.ts`，通常不用動。建議直接用 Claude Code
打開這個資料夾，告訴它你的資料來源，讓它幫你補工具。

## 安全提醒

- 正式環境請務必換掉預設的 `demo-key`，改用夠長、隨機的金鑰（改 `.env` 的 `MCP_API_KEY`）。
- 不要把服務直接曝露在公網；建議走內網或反向代理，並搭配 HTTPS。
- `.env` 已列入 `.gitignore` / `.dockerignore`，不要把金鑰提交進版控。
