export type AIProvider = "openrouter" | "gemini" | "chrome-ai";
export const CURRENT_OPENROUTER_DEFAULT_MODEL = "openrouter/free";
export const CURRENT_GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
export const CURRENT_CHROME_AI_DEFAULT_MODEL = "gemini-nano";

export interface RuntimeSettings {
  enabled: boolean;
  provider: AIProvider;
  model: string;
  debounceMs: number;
}

export interface SecretSettings {
  apiKey: string;
}

export interface ExtensionSettings extends RuntimeSettings, SecretSettings {}

export interface ProviderStatus {
  state: "idle" | "success" | "error";
  message: string;
  updatedAt: number | null;
}

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  enabled: true,
  provider: "openrouter",
  model: CURRENT_OPENROUTER_DEFAULT_MODEL,
  debounceMs: 250,
};

export const DEFAULT_SECRET_SETTINGS: SecretSettings = {
  apiKey: "",
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  ...DEFAULT_RUNTIME_SETTINGS,
  ...DEFAULT_SECRET_SETTINGS,
};

export const DEFAULT_PROVIDER_STATUS: ProviderStatus = {
  state: "idle",
  message: "No provider request yet.",
  updatedAt: null,
};
