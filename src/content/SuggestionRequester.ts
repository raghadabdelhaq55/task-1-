import { GENERATE_SUGGESTION_MESSAGE, type GenerateSuggestionResponse } from "../types/messages";
import type { RuntimeSettings } from "../types/settings";
import { logger } from "../utils/logger";
import { normalizePrompt, truncateForCacheKey } from "../utils/text";

interface RequestContext {
  text: string;
  pageTitle: string;
  pageUrl: string;
  settings: RuntimeSettings;
}

interface SuggestionResult {
  prompt: string;
  suggestion: string;
}

type ResultHandler = (result: SuggestionResult) => void;

const MAX_CACHE_ENTRIES = 50;

export class SuggestionRequester {
  private debounceTimer: number | null = null;
  private sequence = 0;
  private lastPrompt = "";
  private activePrompt = "";
  private readonly cache = new Map<string, string>();

  constructor(private readonly onResult: ResultHandler) {}

  schedule(context: RequestContext, immediate = false): void {
    const prompt = normalizePrompt(context.text);

    if (!prompt.trim()) {
      this.cancel();
      return;
    }

    const cacheKey = this.getCacheKey(prompt, context.settings);
    const cachedSuggestion = this.cache.get(cacheKey);

    if (cachedSuggestion !== undefined) {
      this.onResult({ prompt, suggestion: cachedSuggestion });
      return;
    }

    if (prompt === this.lastPrompt || prompt === this.activePrompt) {
      return;
    }

    this.clearTimer();
    this.debounceTimer = window.setTimeout(() => {
      void this.sendRequest(context, prompt, cacheKey);
    }, immediate ? 0 : context.settings.debounceMs);
  }

  cancel(): void {
    this.sequence += 1;
    this.activePrompt = "";
    this.clearTimer();
  }

  resetPromptMemory(): void {
    this.lastPrompt = "";
  }

  private async sendRequest(
    context: RequestContext,
    prompt: string,
    cacheKey: string,
  ): Promise<void> {
    this.activePrompt = prompt;
    const requestId = `${Date.now()}-${++this.sequence}`;
    const requestSequence = this.sequence;

    try {
      const response = (await chrome.runtime.sendMessage({
        type: GENERATE_SUGGESTION_MESSAGE,
        payload: {
          requestId,
          text: prompt,
          pageUrl: context.pageUrl,
          pageTitle: context.pageTitle,
          provider: context.settings.provider,
          model: context.settings.model,
        },
      })) as GenerateSuggestionResponse;

      if (requestSequence !== this.sequence || response.requestId !== requestId) {
        return;
      }

      this.lastPrompt = prompt;
      this.activePrompt = "";
      this.storeCache(cacheKey, response.suggestion);
      this.onResult({ prompt, suggestion: response.suggestion });
    } catch (error) {
      if (requestSequence === this.sequence) {
        this.activePrompt = "";
      }

      logger.warn("Unable to fetch suggestion.", error);
    }
  }

  private clearTimer(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private getCacheKey(prompt: string, settings: RuntimeSettings): string {
    return `${settings.provider}:${settings.model}:${truncateForCacheKey(prompt)}`;
  }

  private storeCache(cacheKey: string, suggestion: string): void {
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
    }

    this.cache.set(cacheKey, suggestion);

    if (this.cache.size <= MAX_CACHE_ENTRIES) {
      return;
    }

    const oldestKey = this.cache.keys().next().value;

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }
}
