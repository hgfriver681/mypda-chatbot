import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./tools.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = "0.0.0.0";
const MCP_API_KEY = process.env.MCP_API_KEY ?? "demo-key";

// 建立一個 MCP server 實例並註冊工具。
function buildServer(): McpServer {
  const server = new McpServer({
    name: "mypda-mcp-template",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}

const app = express();
app.use(express.json());

// /health：無認證，給 docker healthcheck 用。
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// Bearer 認證：/mcp 必須帶 Authorization: Bearer <MCP_API_KEY>。
function checkAuth(req: Request, res: Response): boolean {
  const header = req.headers["authorization"];
  const expected = `Bearer ${MCP_API_KEY}`;
  if (header !== expected) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: missing or invalid Bearer token" },
      id: null,
    });
    return false;
  }
  return true;
}

// POST /mcp：Streamable HTTP，stateless 模式（每次請求建立新 transport）。
app.post("/mcp", async (req: Request, res: Response) => {
  if (!checkAuth(req, res)) return;

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Error handling MCP request:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// stateless 模式下 GET / DELETE 不支援，回 405。
const methodNotAllowed = (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
};
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

app.listen(PORT, HOST, () => {
  console.log(`myPDA MCP template listening on http://${HOST}:${PORT}/mcp`);
});
