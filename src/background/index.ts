import { getProvider } from "../services/providers";
import { getSettings, saveProviderStatus } from "../services/storage";
import {
  GENERATE_SUGGESTION_MESSAGE,
  type GenerateSuggestionRequest,
  type GenerateSuggestionResponse,
} from "../types/messages";
import { logger } from "../utils/logger";
import { normalizePrompt, truncateForCacheKey } from "../utils/text";

class LruCache<K, V> {
  private readonly items = new Map<K, V>();

  constructor(private readonly limit: number) {}

  get(key: K): V | undefined {
    const value = this.items.get(key);

    if (value === undefined) {
      return undefined;
    }

    this.items.delete(key);
    this.items.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.items.has(key)) {
      this.items.delete(key);
    }

    this.items.set(key, value);

    if (this.items.size <= this.limit) {
      return;
    }

    const oldestKey = this.items.keys().next().value;

    if (oldestKey !== undefined) {
      this.items.delete(oldestKey);
    }
  }
}

class SuggestionBroker {
  private readonly cache = new LruCache<string, string>(100);
  private readonly controllers = new Map<number, AbortController>();

  async generate(
    request: GenerateSuggestionRequest,
    tabId: number,
  ): Promise<GenerateSuggestionResponse> {
    const settings = await getSettings();
    const prompt = normalizePrompt(request.payload.text);

    if (!settings.enabled || !prompt.trim()) {
      return {
        requestId: request.payload.requestId,
        suggestion: "",
      };
    }

    const cacheKey = [
      settings.provider,
      settings.model,
      truncateForCacheKey(prompt),
      truncateForCacheKey(request.payload.pageUrl, 512),
    ].join("::");
    const cachedSuggestion = this.cache.get(cacheKey);

    if (cachedSuggestion !== undefined) {
      return {
        requestId: request.payload.requestId,
        suggestion: cachedSuggestion,
      };
    }

    this.controllers.get(tabId)?.abort();
    const controller = new AbortController();
    this.controllers.set(tabId, controller);

    try {
      const provider = getProvider(settings.provider);
      const suggestion = await provider.generateSuggestion(
        settings,
        {
          text: prompt,
          pageTitle: request.payload.pageTitle,
          pageUrl: request.payload.pageUrl,
        },
        controller.signal,
      );

      this.cache.set(cacheKey, suggestion);
      let statusMsg = "Request succeeded.";
      if (settings.provider === "openrouter") {
        statusMsg = `OpenRouter request succeeded using ${settings.model}.`;
      } else if (settings.provider === "gemini") {
        statusMsg = `Gemini request succeeded using ${settings.model}.`;
      } else if (settings.provider === "chrome-ai") {
        statusMsg = `Chrome Built-in AI request succeeded.`;
      }

      await saveProviderStatus({
        state: "success",
        message: statusMsg,
        updatedAt: Date.now(),
      });

      return {
        requestId: request.payload.requestId,
        suggestion,
      };
    } catch (error) {
      if (controller.signal.aborted) {
        return {
          requestId: request.payload.requestId,
          suggestion: "",
        };
      }

      logger.error("Suggestion request failed.", error);
      console.error("[Ghostwriter] Suggestion request failed.", error);
      await saveProviderStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Unknown provider error",
        updatedAt: Date.now(),
      });

      return {
        requestId: request.payload.requestId,
        suggestion: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      if (this.controllers.get(tabId) === controller) {
        this.controllers.delete(tabId);
      }
    }
  }
}

const broker = new SuggestionBroker();

chrome.runtime.onMessage.addListener(
  (
    message: GenerateSuggestionRequest,
    sender,
    sendResponse: (response: GenerateSuggestionResponse) => void,
  ) => {
    if (message.type !== GENERATE_SUGGESTION_MESSAGE) {
      return false;
    }

    const tabId = sender.tab?.id ?? -1;

    void broker.generate(message, tabId).then(sendResponse);
    return true;
  },
);

logger.log("Background service worker initialized.");
