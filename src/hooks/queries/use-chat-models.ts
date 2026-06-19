import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";

export const useChatModels = (options?: SWRConfiguration) => {
  return useSWR<
    {
      provider: string;
      hasAPIKey: boolean;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
        isImageInputUnsupported: boolean;
        supportedFileMimeTypes: string[];
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      const status = appStore.getState();
      if (status.chatModel || !data.length) return;
      // Default to MiniMax M3 (OpenRouter) when available; otherwise fall back
      // to the first provider that has an API key, then to the first listed.
      const hasMinimax = data.some(
        (p) =>
          p.provider === "openRouter" &&
          p.models.some((m) => m.name === "minimax-m3"),
      );
      if (hasMinimax) {
        appStore.setState({
          chatModel: { provider: "openRouter", model: "minimax-m3" },
        });
        return;
      }
      const provider =
        data.find((p) => p.hasAPIKey && p.models.length) ?? data[0];
      appStore.setState({
        chatModel: {
          provider: provider.provider,
          model: provider.models[0].name,
        },
      });
    },
    ...options,
  });
};
