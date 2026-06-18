import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * 在這裡新增你自己的工具，接你的 ERP / 資料庫 / 檔案系統。
 *
 * 每個工具用 server.registerTool(name, config, handler) 註冊：
 *  - name:    工具名稱（顯示在 myPDA UI）
 *  - config:  description + inputSchema（用 zod 描述參數）
 *  - handler: 實際邏輯，回傳 { content: [{ type: "text", text: ... }] }
 *
 * 下面四個是示範工具，可以照樣改成你自己的。
 */
export function registerTools(server: McpServer): void {
  // ping：無參數，回傳 "pong"。最小的連線健康測試。
  server.registerTool(
    "ping",
    {
      description: "Health check. Returns 'pong'.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: "pong" }],
    }),
  );

  // echo：回傳傳入的同一段文字。
  server.registerTool(
    "echo",
    {
      description: "Echo back the given text.",
      inputSchema: { text: z.string().describe("Text to echo back") },
    },
    async ({ text }) => ({
      content: [{ type: "text", text }],
    }),
  );

  // server_time：回傳目前時間（ISO 8601）與伺服器時區。
  server.registerTool(
    "server_time",
    {
      description: "Current server time as ISO 8601 string plus the server timezone.",
      inputSchema: {},
    },
    async () => {
      const now = new Date().toISOString();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        content: [{ type: "text", text: `${now} (${tz})` }],
      };
    },
  );

  // add：把兩個數字相加，回傳總和。
  server.registerTool(
    "add",
    {
      description: "Add two numbers and return the sum.",
      inputSchema: {
        a: z.number().describe("First number"),
        b: z.number().describe("Second number"),
      },
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
    }),
  );
}
