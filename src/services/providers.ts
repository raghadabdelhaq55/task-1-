import { buildCompletionPrompt, normalizePrompt, sanitizeSuggestion } from "../utils/text";
import type { ExtensionSettings } from "../types/settings";

export interface SuggestionProviderContext {
  text: string;
  pageTitle: string;
  pageUrl: string;
}

export interface SuggestionProvider {
  generateSuggestion(
    settings: ExtensionSettings,
    context: SuggestionProviderContext,
    signal: AbortSignal,
  ): Promise<string>;
}

class OpenRouterProvider implements SuggestionProvider {
  async generateSuggestion(
    settings: ExtensionSettings,
    context: SuggestionProviderContext,
    signal: AbortSignal,
  ): Promise<string> {
    const apiKey = settings.apiKey.trim();

    if (!apiKey) {
      throw new Error("Missing OpenRouter API key.");
    }

    const prompt = [
      buildCompletionPrompt(normalizePrompt(context.text)),
      "",
      `Page title: ${context.pageTitle}`,
      `Page URL: ${context.pageUrl}`,
    ].join("\n");

    const model = settings.model || "openrouter/free";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/react-user/ghostwriter-ai-extension",
        "X-Title": "Ghostwriter AI Extension",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 64,
        messages: [
          {
            role: "system",
            content:
              "You write inline autocomplete continuations. Return only the continuation text with no quotes, labels, or explanations. Keep it extremely concise.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      let errorMessage = `OpenRouter request failed for ${model} (${response.status})`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed.error?.message) {
          errorMessage += `: ${parsed.error.message}`;
        } else {
          errorMessage += `. ${body}`;
        }
      } catch {
        errorMessage += `. ${body}`;
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const suggestion = data.choices?.[0]?.message?.content ?? "";
    return sanitizeSuggestion(context.text, suggestion);
  }
}

class GeminiProvider implements SuggestionProvider {
  async generateSuggestion(
    settings: ExtensionSettings,
    context: SuggestionProviderContext,
    signal: AbortSignal,
  ): Promise<string> {
    const apiKey = settings.apiKey.trim();

    if (!apiKey) {
      throw new Error("Missing Gemini API key.");
    }

    const prompt = [
      buildCompletionPrompt(normalizePrompt(context.text)),
      "",
      `Page title: ${context.pageTitle}`,
      `Page URL: ${context.pageUrl}`,
    ].join("\n");

    const model = settings.model || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          systemInstruction: {
            parts: [{
              text: "You write inline autocomplete continuations. Return only the continuation text with no quotes, labels, or explanations. Keep it extremely concise."
            }]
          },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 64,
          },
        }),
        signal,
      }
    );

    if (!response.ok) {
      const body = await response.text();
      let errorMessage = `Gemini request failed (${response.status})`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed.error?.message) {
          errorMessage += `: ${parsed.error.message}`;
        } else {
          errorMessage += `. ${body}`;
        }
      } catch {
        errorMessage += `. ${body}`;
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return sanitizeSuggestion(context.text, suggestion);
  }
}

class ChromeAIProvider implements SuggestionProvider {
  async generateSuggestion(
    _settings: ExtensionSettings,
    context: SuggestionProviderContext,
    signal: AbortSignal,
  ): Promise<string> {
    const aiNamespace =
      (self as any).ai ??
      (chrome as any).aiOriginTrial ??
      (self as any).chrome?.aiOriginTrial;

    if (!aiNamespace) {
      throw new Error(
        "Chrome Built-in AI (Prompt API) is not supported or enabled in this browser. " +
        "Ensure you are running Chrome with #prompt-api-for-gemini-nano enabled."
      );
    }

    const languageModel = aiNamespace.languageModel ?? aiNamespace.assistant;
    if (!languageModel) {
      throw new Error("Chrome Language Model API is not available.");
    }

    const capabilities = await languageModel.capabilities();
    if (capabilities.available === "no") {
      throw new Error("Chrome Built-in AI model is not available or not downloaded yet.");
    }

    const prompt = [
      buildCompletionPrompt(normalizePrompt(context.text)),
      "",
      `Page title: ${context.pageTitle}`,
      `Page URL: ${context.pageUrl}`,
    ].join("\n");

    const session = await languageModel.create({
      systemPrompt:
        "You write inline autocomplete continuations. Return only the continuation text with no quotes, labels, or explanations. Keep it extremely concise.",
      signal,
    });

    try {
      const rawSuggestion = await session.prompt(prompt, { signal });
      return sanitizeSuggestion(context.text, rawSuggestion);
    } finally {
      try {
        if (session.destroy) {
          session.destroy();
        } else if (session.close) {
          session.close();
        }
      } catch {
        // Ignore session destruction errors
      }
    }
  }
}

export const getProvider = (provider: ExtensionSettings["provider"]): SuggestionProvider => {
  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    case "chrome-ai":
      return new ChromeAIProvider();
    case "openrouter":
    default:
      return new OpenRouterProvider();
  }
};
