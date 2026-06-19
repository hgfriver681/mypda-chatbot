"use client";
import { appStore } from "@/app/store";
import { MCPServerInfo } from "app-types/mcp";
import { fetcher, objectFlow } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";

export function useMcpList(options?: SWRConfiguration) {
  return useSWR<MCPServerInfo[]>("/api/mcp/list", fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    focusThrottleInterval: 1000 * 60 * 5,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      const ids = data.map((v) => v.id);
      appStore.setState((prev) => {
        // Default ON: when the user has never configured tool selection
        // (allowedMcpServers === undefined), enable every MCP server and all of
        // its tools so any fresh account/browser starts with MCP tools selected.
        // Once the user has interacted (object exists, even empty), respect it.
        if (prev.allowedMcpServers === undefined) {
          return {
            mcpList: data,
            allowedMcpServers: Object.fromEntries(
              data.map((server) => [
                server.id,
                { tools: (server.toolInfo ?? []).map((tool) => tool.name) },
              ]),
            ),
          };
        }
        return {
          mcpList: data,
          allowedMcpServers: objectFlow(prev.allowedMcpServers).filter(
            (_, key) => ids.includes(key),
          ),
        };
      });
    },
    ...options,
  });
}
