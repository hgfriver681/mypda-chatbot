# CLAUDE.md — myPDA MCP 範本 (TypeScript)

給 Claude Code 在這個範本資料夾內工作時的快速指引。

## 這個專案是什麼

一個獨立、可執行的 MCP server 範本，用官方 `@modelcontextprotocol/sdk` 的
`McpServer` + `StreamableHTTPServerTransport`，搭 express 提供 HTTP。它是 workshop
學員下載後改接自己資料來源的起點。**這是 standalone 專案，有自己的 package.json，
不要把相依套件加到父層的 better-chatbot 專案。**

## 檔案分工

- `src/index.ts`：HTTP / 認證 / 傳輸的接線（express、Bearer 檢查、`/mcp`、`/health`）。
  一般加工具不用改這裡。
- `src/tools.ts`：**工具都放這裡。** 四個示範工具 `ping` / `echo` / `server_time` / `add`，
  用 zod 描述參數。這是使用者新增自己工具的地方。

## 認證模型

- `/mcp` 需要 `Authorization: Bearer <MCP_API_KEY>`（env，預設 `demo-key`）；缺/錯回 401。
- `/health` 不需要認證，回 200 `{"ok":true}`，給 docker healthcheck。
- Streamable HTTP 走 stateless 模式（`sessionIdGenerator: undefined`），GET/DELETE `/mcp` 回 405。

## 如何新增一個工具

在 `src/tools.ts` 的 `registerTools()` 內加：

```ts
server.registerTool(
  "your_tool",
  { description: "...", inputSchema: { foo: z.string() } },
  async ({ foo }) => ({ content: [{ type: "text", text: "..." }] }),
);
```

## 規範

- 不要使用 emoji。
- 改動後請實際跑起來驗證：`npm install` → `npm run dev` →
  curl `/health` 應得 200，並送真實 MCP `initialize` + `tools/list`，確認四個工具都在。
