"use client";
import { useState, useMemo } from "react";
import {
  MCPServerConfig,
  MCPRemoteConfigZodSchema,
  MCPStdioConfigZodSchema,
} from "app-types/mcp";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import JsonView from "./ui/json-view";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { useRouter } from "next/navigation";
import { createDebounce, fetcher, isNull, safeJSONParse } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { mutate } from "swr";
import { Loader } from "lucide-react";
import {
  isMaybeMCPServerConfig,
  isMaybeRemoteConfig,
} from "lib/ai/mcp/is-mcp-config";

import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { existMcpClientByServerNameAction } from "@/app/api/mcp/actions";
import { authClient } from "auth/client";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ShieldCheck } from "lucide-react";

interface MCPEditorProps {
  initialConfig?: MCPServerConfig;
  name?: string;
  id?: string;
  // When provided, the editor saves via this callback instead of POSTing to
  // /api/mcp (used by the admin "manage a user's MCP" flow). onSaved fires after
  // a successful save (e.g. to close a dialog / refresh a list).
  onSubmit?: (payload: {
    name: string;
    config: MCPServerConfig;
    id?: string;
  }) => Promise<void>;
  onSaved?: () => void;
}

const STDIO_ARGS_ENV_PLACEHOLDER = `/** STDIO Example */
{
  "command": "node", 
  "args": ["index.js"],
  "env": {
    "OPENAI_API_KEY": "sk-...",
  }
}

/** SSE,Streamable HTTP Example */
{
  "url": "https://api.example.com",
  "headers": {
    "Authorization": "Bearer sk-..."
  }
}`;

export default function MCPEditor({
  initialConfig,
  name: initialName,
  id,
  onSubmit,
  onSaved,
}: MCPEditorProps) {
  const t = useTranslations();
  const shouldInsert = useMemo(() => isNull(id), [id]);

  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const errorDebounce = useMemo(() => createDebounce(), []);

  // State for form fields
  const [name, setName] = useState<string>(initialName ?? "");
  const router = useRouter();
  const [config, setConfig] = useState<MCPServerConfig>(
    initialConfig as MCPServerConfig,
  );
  const [jsonString, setJsonString] = useState<string>(
    initialConfig ? JSON.stringify(initialConfig, null, 2) : "",
  );

  // "Bring my login identity" — a flag kept OUTSIDE the JSON textarea so the
  // editor stays clean and there are no half-typed-JSON race conditions. It is
  // merged into the saved config (and the preview) only. The real values are
  // injected server-side from the owner's account at connection time.
  const { data: session } = authClient.useSession();
  const [injectIdentity, setInjectIdentity] = useState<boolean>(
    Boolean((initialConfig as { injectIdentity?: boolean })?.injectIdentity),
  );
  const isRemote = isMaybeRemoteConfig(config);
  const userHeaders = Object.entries(
    (config as { headers?: Record<string, string> })?.headers ?? {},
  ).filter(([k]) => !k.toLowerCase().startsWith("x-mypda-"));

  // Name validation schema
  const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
    message: t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
  });

  const validateName = (nameValue: string): boolean => {
    const result = nameSchema.safeParse(nameValue);
    if (!result.success) {
      setNameError(
        t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
      );
      return false;
    }
    setNameError(null);
    return true;
  };

  const saveDisabled = useMemo(() => {
    return (
      name.trim() === "" ||
      isLoading ||
      !!jsonError ||
      !!nameError ||
      !isMaybeMCPServerConfig(config)
    );
  }, [isLoading, jsonError, nameError, config, name]);

  // Validate
  const validateConfig = (jsonConfig: unknown): boolean => {
    const result = isMaybeRemoteConfig(jsonConfig)
      ? MCPRemoteConfigZodSchema.safeParse(jsonConfig)
      : MCPStdioConfigZodSchema.safeParse(jsonConfig);
    if (!result.success) {
      handleErrorWithToast(result.error, "mcp-editor-error");
    }
    return result.success;
  };

  // Handle save button click
  const handleSave = async () => {
    // Perform validation
    if (!validateConfig(config)) return;
    if (!name) {
      return handleErrorWithToast(
        new Error(t("MCP.nameIsRequired")),
        "mcp-editor-error",
      );
    }

    if (!validateName(name)) {
      return handleErrorWithToast(
        new Error(t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens")),
        "mcp-editor-error",
      );
    }

    const finalConfig = isMaybeRemoteConfig(config)
      ? { ...config, injectIdentity }
      : config;

    safe(() => setIsLoading(true))
      .map(async () => {
        // Global name-uniqueness check only matters for the normal /api/mcp
        // flow; in the admin per-user flow names may repeat across users.
        if (shouldInsert && !onSubmit) {
          const exist = await existMcpClientByServerNameAction(name);
          if (exist) {
            throw new Error(t("MCP.nameAlreadyExists"));
          }
        }
      })
      .map(async () => {
        if (onSubmit) {
          await onSubmit({ name, config: finalConfig, id });
          return;
        }
        return fetcher("/api/mcp", {
          method: "POST",
          body: JSON.stringify({ name, config: finalConfig, id }),
        });
      })
      .ifOk(() => {
        toast.success(t("MCP.configurationSavedSuccessfully"));
        if (onSubmit) {
          onSaved?.();
        } else {
          mutate("/api/mcp/list");
          router.push("/mcp");
        }
      })
      .ifFail(handleErrorWithToast)
      .watch(() => setIsLoading(false));
  };

  const handleConfigChange = (data: string) => {
    setJsonString(data);
    const result = safeJSONParse(data);
    errorDebounce.clear();
    if (result.success) {
      setConfig(result.value as MCPServerConfig);
      setJsonError(null);
    } else if (data.trim() !== "") {
      errorDebounce(() => {
        setJsonError(
          (result.error as Error)?.message ??
            JSON.stringify(result.error, null, 2),
        );
      }, 1000);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-6">
        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>

          <Input
            id="name"
            value={name}
            disabled={!shouldInsert}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value) validateName(e.target.value);
            }}
            placeholder={t("MCP.enterMcpServerName")}
            className={nameError ? "border-destructive" : ""}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config">Config</Label>
          </div>

          {/* Split view for config editor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left side: Textarea for editing */}
            <div className="space-y-2">
              <Textarea
                id="config-editor"
                value={jsonString}
                onChange={(e) => handleConfigChange(e.target.value)}
                data-testid="mcp-config-editor"
                className="font-mono h-[40vh] resize-none overflow-y-auto"
                placeholder={STDIO_ARGS_ENV_PLACEHOLDER}
              />
            </div>

            {/* Right side: JSON view */}
            <div className="space-y-2 hidden sm:block">
              <div className="border border-input rounded-md p-4 h-[40vh] overflow-auto relative bg-secondary">
                <Label
                  htmlFor="config-view"
                  className="text-xs text-muted-foreground mb-2"
                >
                  preview
                </Label>
                <JsonView
                  data={isRemote ? { ...config, injectIdentity } : config}
                  initialExpandDepth={3}
                  data-testid="mcp-config-view"
                />
                {jsonError && jsonString && (
                  <div className="absolute w-full bottom-0 right-0 px-2 pb-2 animate-in fade-in-0 duration-300">
                    <Alert variant="destructive" className="border-destructive">
                      <AlertTitle className="text-xs font-semibold">
                        Parsing Error
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {jsonError}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inject login identity — only meaningful for remote (URL) servers */}
        {isRemote && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label
                  htmlFor="inject-identity"
                  className="flex items-center gap-2"
                >
                  <ShieldCheck className="size-4" />
                  自動帶入我的登入身分
                </Label>
                <p className="text-xs text-muted-foreground">
                  連線時由平台自動加上 x-mypda-user-id / email /
                  role。值來自你的帳號,不會寫進設定、也無法竄改。
                </p>
              </div>
              <Switch
                id="inject-identity"
                checked={injectIdentity}
                onCheckedChange={setInjectIdentity}
              />
            </div>

            {injectIdentity && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    你目前的登入身分
                  </p>
                  <div className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">姓名</span>
                    <span>{session?.user?.name ?? "—"}</span>
                    <span className="text-muted-foreground">Email</span>
                    <span>{session?.user?.email ?? "—"}</span>
                    <span className="text-muted-foreground">角色</span>
                    <span>
                      {(session?.user as { role?: string })?.role ?? "—"}
                    </span>
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono break-all">
                      {session?.user?.id ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    送出時 MCP server 實際會收到的 headers
                  </p>
                  <div className="rounded-md bg-secondary p-3 font-mono text-xs space-y-1">
                    {userHeaders.map(([k, v]) => (
                      <div key={k}>
                        <span className="text-muted-foreground">{k}</span>:{" "}
                        {String(v)}
                      </div>
                    ))}
                    {(
                      [
                        ["x-mypda-user-id", session?.user?.id],
                        ["x-mypda-email", session?.user?.email],
                        [
                          "x-mypda-role",
                          (session?.user as { role?: string })?.role,
                        ],
                      ] as [string, string | undefined][]
                    ).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span>
                          <span className="text-muted-foreground">{k}</span>:{" "}
                          {v ?? "—"}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          自動帶入
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    僅對信任網域(預設
                    *.mypda.ai)生效;非機密,工作坊刻意公開顯示。
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Save button */}
        <Button onClick={handleSave} className="w-full" disabled={saveDisabled}>
          {isLoading ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <span className="font-bold">{t("MCP.saveConfiguration")}</span>
          )}
        </Button>
      </div>
    </>
  );
}
