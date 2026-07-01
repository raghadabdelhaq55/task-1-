import {
  CURRENT_OPENROUTER_DEFAULT_MODEL,
  DEFAULT_PROVIDER_STATUS,
  DEFAULT_RUNTIME_SETTINGS,
  DEFAULT_SECRET_SETTINGS,
  type ExtensionSettings,
  type ProviderStatus,
  type RuntimeSettings,
  type SecretSettings,
} from "../types/settings";

const STORAGE_AREA_SYNC = chrome.storage.sync;
const RUNTIME_SETTINGS_KEY = "runtimeSettings";
const STORAGE_AREA_LOCAL = chrome.storage.local;
const SECRET_SETTINGS_KEY = "secretSettings";
const PROVIDER_STATUS_KEY = "providerStatus";

const promisify = <T>(callback: (resolve: (value: T) => void, reject: (error: unknown) => void) => void) =>
  new Promise<T>((resolve, reject) => callback(resolve, reject));

export const getRuntimeSettings = async (): Promise<RuntimeSettings> => {
  const result = await promisify<Record<string, RuntimeSettings | undefined>>((resolve) =>
    STORAGE_AREA_SYNC.get(RUNTIME_SETTINGS_KEY, resolve),
  );

  const runtimeSettings = {
    ...DEFAULT_RUNTIME_SETTINGS,
    ...(result[RUNTIME_SETTINGS_KEY] ?? {}),
  };

  if (runtimeSettings.provider === ("openai" as any)) {
    runtimeSettings.provider = "openrouter";
    runtimeSettings.model = CURRENT_OPENROUTER_DEFAULT_MODEL;
  }

  if (
    runtimeSettings.provider === "openrouter" &&
    runtimeSettings.model === "meta-llama/llama-3.1-8b-instruct:free"
  ) {
    runtimeSettings.model = CURRENT_OPENROUTER_DEFAULT_MODEL;
  }

  return runtimeSettings;
};

export const getSecretSettings = async (): Promise<SecretSettings> => {
  const result = await promisify<Record<string, SecretSettings | undefined>>((resolve) =>
    STORAGE_AREA_LOCAL.get(SECRET_SETTINGS_KEY, resolve),
  );

  return {
    ...DEFAULT_SECRET_SETTINGS,
    ...(result[SECRET_SETTINGS_KEY] ?? {}),
  };
};

export const getSettings = async (): Promise<ExtensionSettings> => {
  const [runtimeSettings, secretSettings] = await Promise.all([
    getRuntimeSettings(),
    getSecretSettings(),
  ]);

  return {
    ...runtimeSettings,
    ...secretSettings,
  };
};

export const saveSettings = async (settings: ExtensionSettings): Promise<void> => {
  const runtimeSettings: RuntimeSettings = {
    enabled: settings.enabled,
    provider: settings.provider,
    model: settings.model,
    debounceMs: settings.debounceMs,
  };
  const secretSettings: SecretSettings = {
    apiKey: settings.apiKey,
  };

  await Promise.all([
    promisify<void>((resolve, reject) =>
      STORAGE_AREA_SYNC.set({ [RUNTIME_SETTINGS_KEY]: runtimeSettings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve();
      }),
    ),
    promisify<void>((resolve, reject) =>
      STORAGE_AREA_LOCAL.set({ [SECRET_SETTINGS_KEY]: secretSettings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve();
      }),
    ),
  ]);
};

export const getProviderStatus = async (): Promise<ProviderStatus> => {
  const result = await promisify<Record<string, ProviderStatus | undefined>>((resolve) =>
    STORAGE_AREA_LOCAL.get(PROVIDER_STATUS_KEY, resolve),
  );

  return {
    ...DEFAULT_PROVIDER_STATUS,
    ...(result[PROVIDER_STATUS_KEY] ?? {}),
  };
};

export const saveProviderStatus = async (status: ProviderStatus): Promise<void> => {
  await promisify<void>((resolve, reject) =>
    STORAGE_AREA_LOCAL.set({ [PROVIDER_STATUS_KEY]: status }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    }),
  );
};

export const isRuntimeSettingsChange = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
): boolean => areaName === "sync" && RUNTIME_SETTINGS_KEY in changes;
