/**
 * MCP Artifact frame: the secure document served into the sandboxed iframe.
 *
 * Security model (defense in depth):
 *  - Served into an <iframe sandbox="allow-scripts"> (no allow-same-origin) so
 *    the document is an opaque origin and cannot touch the parent app.
 *  - Strict CSP below: `connect-src 'none'` blocks ALL fetch/XHR/WebSocket, so
 *    the artifact has no network of its own. The ONLY way out is the injected
 *    `window.mcp` bridge, which postMessages to the parent. That is what makes
 *    "the only backend is MCP" a browser-enforced guarantee, not a convention.
 *  - Only https://cdnjs.cloudflare.com is whitelisted for libraries (same
 *    choice Anthropic Artifacts makes).
 *
 * Note (upgrade point): for production this document should be served from a
 * SEPARATE origin (e.g. an artifacts subdomain) for full isolation. The MVP
 * serves it same-origin and relies on the sandbox attribute + CSP.
 */
export const ARTIFACT_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'unsafe-inline' https://cdnjs.cloudflare.com",
  "img-src data: https://cdnjs.cloudflare.com",
  "font-src https://cdnjs.cloudflare.com",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/**
 * The bridge injected into every artifact. Exposes:
 *   window.mcp.servers()            -> Promise<[{id,name,tools:[{name,description}]}]>
 *   window.mcp.call(server, tool, args) -> Promise<MCP tool result>
 *   window.mcp.text(result)         -> first text content of a tool result (helper)
 * All calls go to the parent via postMessage; the parent authorizes and proxies
 * them to the real MCP server.
 */
const MCP_BRIDGE = `
(function () {
  var _id = 0;
  var _pending = {};
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || !d.__mcpArtifact || d.dir !== "response") return;
    var p = _pending[d.id];
    if (!p) return;
    delete _pending[d.id];
    if (d.ok) p.resolve(d.payload);
    else p.reject(new Error(d.error || "MCP bridge error"));
  });
  function send(op, body) {
    return new Promise(function (resolve, reject) {
      var id = ++_id;
      _pending[id] = { resolve: resolve, reject: reject };
      var msg = { __mcpArtifact: true, dir: "request", id: id, op: op };
      for (var k in body) msg[k] = body[k];
      parent.postMessage(msg, "*");
      setTimeout(function () {
        if (_pending[id]) {
          delete _pending[id];
          reject(new Error("MCP call timed out"));
        }
      }, 30000);
    });
  }
  window.mcp = {
    servers: function () {
      return send("list", {});
    },
    call: function (server, tool, args) {
      return send("call", { server: server, tool: tool, args: args || {} });
    },
    // Convenience: pull text out of an MCP tool result. A tool result's
    // content[].text may be a string OR an already-parsed object depending on
    // the server/transport, so handle both.
    text: function (result) {
      try {
        var parts = (result && result.content) || [];
        var t = "";
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (!p || p.type !== "text") continue;
          if (typeof p.text === "string") t += p.text;
          else if (p.text != null) t += JSON.stringify(p.text);
        }
        return t;
      } catch (e) {
        return "";
      }
    },
    // Returns the structured data of a tool result, regardless of whether the
    // server returned structuredContent, an object text block, or a JSON string.
    json: function (result) {
      try {
        if (result && result.structuredContent != null)
          return result.structuredContent;
        var parts = (result && result.content) || [];
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (p && p.type === "text" && p.text != null && typeof p.text === "object")
            return p.text;
        }
        return JSON.parse(window.mcp.text(result));
      } catch (e) {
        return null;
      }
    },
  };
})();
`;

export function buildArtifactDocument(body: string, title = "MCP Artifact") {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="${ARTIFACT_CSP}" />
<title>${title}</title>
<script>${MCP_BRIDGE}</script>
</head>
<body>
${body}
</body>
</html>`;
}
