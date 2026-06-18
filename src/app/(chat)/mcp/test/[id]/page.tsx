"use client";

import {
  callMcpToolAction,
  selectMcpClientAction,
} from "@/app/api/mcp/actions";
import JsonView from "@/components/ui/json-view";
import { cn, isNull, isString, safeJSONParse } from "lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileJson,
  Loader,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Input } from "ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "ui/resizable";
import { Separator } from "ui/separator";
import { handleErrorWithToast } from "ui/shared-toast";
import { Skeleton } from "ui/skeleton";
import { Textarea } from "ui/textarea";

// Type definitions
type SchemaProperty = {
  type: string;
  required: boolean;
  enum?: string[];
  properties?: Record<string, SchemaProperty>;
};

type SimplifiedSchema = Record<string, SchemaProperty>;

type ToolInfo = {
  name: string;
  description: string;
  inputSchema?: any;
};

type CallResult = {
  success: boolean;
  data?: any;
  error?: string;
};

// Helper function to create simplified schema view
const createSimplifiedSchema = (schema: any): SimplifiedSchema => {
  if (!schema || !schema.properties) return {};

  const simplified: SimplifiedSchema = {};
  const requiredFields = schema.required || [];

  for (const [key, value] of Object.entries(schema.properties)) {
    const prop = value as any;

    simplified[key] = {
      type: prop.type,
      required: requiredFields.includes(key),
    };

    if (prop.enum) {
      simplified[key].enum = prop.enum;
    }

    if (prop.type === "object" && prop.properties) {
      simplified[key].properties = createSimplifiedSchema({
        properties: prop.properties,
        required: prop.required || [],
      });
    }
  }

  return simplified;
};

// Deterministically build a fillable example input from a JSON Schema — no AI.
// Priority per field: examples[0] -> default -> const -> enum[0] -> a type-based
// placeholder. Author-provided `examples`/`default` are the runnable, trustworthy
// values; the type placeholders are a "fill me in" template, never a blank box.
const MAX_SCHEMA_DEPTH = 5;

const exampleForProp = (prop: any, depth: number): any => {
  if (!prop || typeof prop !== "object") return null;
  if (Array.isArray(prop.examples) && prop.examples.length > 0)
    return prop.examples[0];
  if ("default" in prop) return prop.default;
  if ("const" in prop) return prop.const;
  if (Array.isArray(prop.enum) && prop.enum.length > 0) return prop.enum[0];

  const variant = prop.anyOf?.[0] ?? prop.oneOf?.[0] ?? prop.allOf?.[0];
  if (variant) return exampleForProp(variant, depth);

  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  switch (type) {
    case "string":
      return "";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return buildExampleFromSchema(prop, depth + 1);
    case "null":
      return null;
    default:
      return "";
  }
};

function buildExampleFromSchema(schema: any, depth = 0): Record<string, any> {
  if (!schema || typeof schema !== "object" || depth > MAX_SCHEMA_DEPTH)
    return {};
  // A whole-object example, when the author provided one, wins outright.
  if (
    depth === 0 &&
    Array.isArray(schema.examples) &&
    schema.examples.length > 0 &&
    typeof schema.examples[0] === "object"
  ) {
    return schema.examples[0];
  }
  const props = schema.properties ?? {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    out[key] = exampleForProp(value, depth);
  }
  return out;
}

// True when the example carries at least one author-provided value (examples/
// default/const/enum) — i.e. it is more than a bare type skeleton. Used to decide
// whether to warn the user that the prefilled input is only a template.
const schemaHasAuthoredExample = (schema: any): boolean => {
  if (!schema || typeof schema !== "object") return false;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return true;
  const props = schema.properties ?? {};
  return Object.values(props).some((p: any) => {
    if (!p || typeof p !== "object") return false;
    return (
      (Array.isArray(p.examples) && p.examples.length > 0) ||
      "default" in p ||
      "const" in p ||
      (Array.isArray(p.enum) && p.enum.length > 0)
    );
  });
};

const hasSchemaProperties = (schema: any): boolean =>
  !!schema &&
  typeof schema === "object" &&
  !!schema.properties &&
  Object.keys(schema.properties).length > 0;

// Recursive schema property renderer component
const SchemaProperty = ({
  name,
  schema,
  level = 0,
}: {
  name: string;
  schema: SchemaProperty;
  level?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const isObject = schema.type === "object" && schema.properties;

  return (
    <div
      className={`pb-2 border-b border-border last:border-0 ${
        level > 0 ? "ml-3 pl-2 border-l" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {isObject && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-5 w-5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        <span className="text-sm font-medium">{name}</span>
        {schema.required && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            required
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground mt-1">
        <span>type: {schema.type}</span>
        {schema.enum && (
          <div className="mt-1">
            <span>enum: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {schema.enum.map((item) => (
                <Badge key={item} variant="secondary" className="text-[10px]">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {isObject && isExpanded && schema.properties && (
        <div className="mt-2 space-y-2">
          {Object.entries(schema.properties).map(([key, value]) => (
            <SchemaProperty
              key={key}
              name={key}
              schema={value}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Tool list item component
const ToolListItem = ({
  tool,
  isSelected,
  onClick,
}: {
  tool: ToolInfo;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    className={`flex border-secondary border cursor-pointer rounded-md p-2 transition-colors ${
      isSelected ? "bg-secondary" : "hover:bg-secondary"
    }`}
    onClick={onClick}
  >
    <div className="flex-1 w-full">
      <p className="font-medium text-sm mb-1 truncate">{tool.name}</p>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {tool.description}
      </p>
    </div>
  </div>
);

// Description display component
const ToolDescription = ({
  description,
  showFullDescription,
  toggleDescription,
}: {
  description: string;
  showFullDescription: boolean;
  toggleDescription: () => void;
}) => (
  <div className="mb-6">
    <p className="text-sm text-muted-foreground">
      {showFullDescription
        ? description
        : `${description.slice(0, 300)}${description.length > 300 ? "..." : ""}`}
    </p>
    {description.length > 300 && (
      <Button
        variant="ghost"
        className="ml-auto p-0 h-6 mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center"
        onClick={toggleDescription}
      >
        {showFullDescription ? (
          <>
            Show less
            <ChevronUp className="ml-1 h-3 w-3" />
          </>
        ) : (
          <>
            Show more
            <ChevronDown className="ml-1 h-3 w-3" />
          </>
        )}
      </Button>
    )}
  </div>
);

export default function Page() {
  const { id } = useParams() as { id: string };

  const t = useTranslations();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToolIndex, setSelectedToolIndex] = useState<number>(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Tool testing state
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [showInputSchema, setShowInputSchema] = useState(false);

  const { data: client, isLoading } = useSWR(`/mcp/${id}`, () =>
    selectMcpClientAction(id as string),
  );

  const filteredTools = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    return (
      client?.toolInfo?.filter(
        (tool) =>
          tool.name.toLowerCase().includes(trimmedQuery) ||
          tool.description.toLowerCase().includes(trimmedQuery),
      ) || []
    );
  }, [client?.toolInfo, searchQuery]);

  const selectedTool = useMemo(() => {
    return filteredTools?.[selectedToolIndex];
  }, [filteredTools, selectedToolIndex]);

  const simplifiedSchema = useMemo(() => {
    if (!selectedTool?.inputSchema) return null;
    return createSimplifiedSchema(selectedTool.inputSchema);
  }, [selectedTool]);

  // Prefill text for the Input JSON box: a runnable example (author-provided
  // values when present, otherwise a fillable type template). "{}" when the tool
  // takes no arguments.
  const exampleInputJson = useMemo(() => {
    if (!hasSchemaProperties(selectedTool?.inputSchema)) return "{}";
    return JSON.stringify(
      buildExampleFromSchema(selectedTool!.inputSchema),
      null,
      2,
    );
  }, [selectedTool]);

  // The prefill is only a bare type template (no author-provided example/default/
  // enum) — warn the user so they don't assume it will run as-is.
  const isTemplateExampleOnly = useMemo(
    () =>
      hasSchemaProperties(selectedTool?.inputSchema) &&
      !schemaHasAuthoredExample(selectedTool?.inputSchema),
    [selectedTool],
  );

  const toggleDescription = () => setShowFullDescription(!showFullDescription);
  const toggleInputSchema = () => setShowInputSchema(!showInputSchema);

  const handleInputChange = (data: string) => {
    setJsonInput(data);
    if (data.trim() === "") {
      setJsonError(null);
      return;
    }

    const result = safeJSONParse(data);
    if (!result.success) {
      setJsonError(
        (result.error as Error)?.message ??
          JSON.stringify(result.error, null, 2),
      );
    } else {
      setJsonError(null);
    }
  };

  const handleToolCall = async () => {
    if (!selectedTool) return;

    const parsedInput = safeJSONParse(jsonInput || "{}");
    if (!parsedInput.success)
      return handleErrorWithToast(parsedInput.error as Error);

    setIsCallLoading(true);
    try {
      const result = await callMcpToolAction(
        id,
        selectedTool.name,
        parsedInput.value,
      );

      setCallResult({
        success: true,
        data: result,
      });
    } catch (error) {
      setCallResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCallLoading(false);
    }
  };

  // Skeleton loader for tool list
  const renderSkeletons = () => (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="w-full h-14" />
      ))}
    </>
  );

  // Empty state message
  const renderEmptyState = () => (
    <p className="text-sm text-muted-foreground text-center py-4">
      {client?.toolInfo?.length ? "No search results" : "No tools available"}
    </p>
  );

  useEffect(() => {
    setCallResult(null);
    setIsCallLoading(false);
    setJsonError(null);
    // Prefill a runnable example instead of leaving the box blank.
    setJsonInput(exampleInputJson);
    setShowInputSchema(false);
    setShowFullDescription(false);
  }, [selectedToolIndex, exampleInputJson]);

  useEffect(() => {
    setSelectedToolIndex(0);
  }, [searchQuery]);

  return (
    <div className="relative flex flex-col max-w-5xl px-4 mx-4 md:mx-auto w-full h-full py-4">
      <div className="absolute bottom-0 left-0 w-full h-[10%] z-10 bg-gradient-to-b from-transparent to-background pointer-events-none" />

      <div className="bg-background pb-2">
        <Link
          href="/mcp"
          className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors pb-4"
        >
          <ArrowLeft className="size-3" />
          {t("Common.back")}
        </Link>
        <header>
          <h2 className="text-3xl font-semibold my-2">
            {decodeURIComponent(client?.name ?? "")}
          </h2>
        </header>
      </div>

      <ResizablePanelGroup direction="horizontal" className="mt-4">
        {/* Tool List Panel */}
        <ResizablePanel defaultSize={30}>
          <div className="w-full flex flex-col h-full relative pr-8">
            <div className="top-0 pb-2 z-1">
              <div className="w-full relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("MCP.searchTools")}
                  className="pl-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 h-full overflow-y-auto no-scrollbar">
              {isLoading
                ? renderSkeletons()
                : filteredTools.length > 0
                  ? filteredTools.map((tool, index) => (
                      <ToolListItem
                        key={tool.name}
                        tool={tool}
                        isSelected={selectedToolIndex === index}
                        onClick={() => setSelectedToolIndex(index)}
                      />
                    ))
                  : renderEmptyState()}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Tool Detail Panel */}
        <ResizablePanel defaultSize={70}>
          <div className="w-full h-full">
            {selectedTool ? (
              <div className="h-full overflow-y-auto pl-6 pr-12">
                <div className="sticky top-0 bg-background">
                  <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
                    {selectedTool.name}
                  </h3>

                  {selectedTool.description && (
                    <ToolDescription
                      description={selectedTool.description}
                      showFullDescription={showFullDescription}
                      toggleDescription={toggleDescription}
                    />
                  )}

                  <Separator className="my-4" />
                </div>

                <div className="space-y-4 h-full ">
                  {selectedTool.inputSchema ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Schema View */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs font-medium">
                              Input Schema
                            </h5>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                >
                                  {t("MCP.detail")}
                                  <ChevronDown className="ml-1 size-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogPortal>
                                <DialogContent className="sm:max-w-[800px] fixed p-10 overflow-hidden">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Input Schema: {selectedTool.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="overflow-y-auto max-h-[70vh]">
                                    <JsonView
                                      data={selectedTool.inputSchema}
                                      initialExpandDepth={3}
                                    />
                                  </div>
                                  <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
                                </DialogContent>
                              </DialogPortal>
                            </Dialog>
                          </div>

                          <div
                            className="border border-input rounded-md p-4 h-[200px] overflow-y-auto"
                            onClick={toggleInputSchema}
                          >
                            {simplifiedSchema &&
                            Object.keys(simplifiedSchema).length > 0 ? (
                              <div className="space-y-2">
                                {Object.entries(simplifiedSchema).map(
                                  ([key, value]) => (
                                    <SchemaProperty
                                      key={key}
                                      name={key}
                                      schema={value}
                                    />
                                  ),
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                {t("MCP.noSchemaPropertiesAvailable")}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* JSON Input */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs font-medium flex items-center">
                              Input JSON
                            </h5>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() =>
                                  handleInputChange(exampleInputJson)
                                }
                              >
                                <FileJson className="mr-1 size-3" />
                                {t("MCP.fillExample")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground"
                                onClick={() => handleInputChange("")}
                              >
                                {t("MCP.clearInput")}
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            autoFocus
                            value={jsonInput}
                            onChange={(e) => handleInputChange(e.target.value)}
                            className="font-mono h-[200px] resize-none overflow-y-auto"
                            placeholder="{}"
                          />
                          {jsonError && jsonInput && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertTitle className="text-xs font-semibold">
                                JSON Error
                              </AlertTitle>
                              <AlertDescription className="text-xs">
                                {jsonError}
                              </AlertDescription>
                            </Alert>
                          )}
                          {isTemplateExampleOnly && (
                            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                              {t("MCP.exampleIsTemplate")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Call Button */}
                      <div>
                        <Button
                          onClick={handleToolCall}
                          disabled={!!jsonError || isCallLoading}
                          className="w-full"
                        >
                          {isCallLoading && (
                            <Loader className="size-4 animate-spin mr-2" />
                          )}
                          {t("MCP.callTool")}
                        </Button>
                      </div>

                      {/* Results Display */}
                      {!isNull(callResult) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-medium">Result</h5>
                            {callResult.success &&
                            callResult.data?.isError !== true ? (
                              <Badge className="gap-1 border-transparent bg-green-500/15 text-green-700 dark:text-green-400">
                                <CheckCircle2 className="size-3" />
                                {t("MCP.callSucceeded")}
                              </Badge>
                            ) : (
                              <Badge className="gap-1 border-transparent bg-destructive/15 text-destructive">
                                <AlertCircle className="size-3" />
                                {t("MCP.callFailed")}
                              </Badge>
                            )}
                          </div>
                          {callResult.success ? (
                            <div
                              className={cn(
                                "border rounded-md p-4 max-h-[300px] overflow-auto",
                                callResult.data?.isError === true
                                  ? "border-destructive/40"
                                  : "border-green-500/40",
                              )}
                            >
                              <JsonView
                                data={callResult.data}
                                initialExpandDepth={2}
                              />
                            </div>
                          ) : (
                            <Alert
                              variant="destructive"
                              className="mt-2 border-destructive"
                            >
                              <AlertTitle className="text-xs font-semibold">
                                Error
                              </AlertTitle>
                              <AlertDescription className="text-xs mt-2 text-destructive">
                                <pre className="whitespace-pre-wrap">
                                  {isString(callResult.error)
                                    ? callResult.error
                                    : JSON.stringify(callResult.error, null, 2)}
                                </pre>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-secondary/30 p-4 rounded-md">
                      <p className="text-sm text-center text-muted-foreground">
                        This tool doesn{"'"}t have an input schema defined
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">
                  Select a tool from the left to test
                </p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
