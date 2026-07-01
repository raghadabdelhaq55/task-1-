import { useEffect, useState } from "react";
import { getProviderStatus, getSettings, saveSettings } from "../services/storage";
import {
  DEFAULT_PROVIDER_STATUS,
  DEFAULT_SETTINGS,
  type ExtensionSettings,
  type ProviderStatus,
} from "../types/settings";

type SaveState = "idle" | "saving" | "saved" | "error";

export const useSettings = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [statusMessage, setStatusMessage] = useState("Loading settings...");
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(DEFAULT_PROVIDER_STATUS);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const [loadedSettings, loadedProviderStatus] = await Promise.all([
      getSettings(),
      getProviderStatus(),
    ]);
    setSettings(loadedSettings);
    setProviderStatus(loadedProviderStatus);
    setIsLoaded(true);
    setStatusMessage(loadedSettings.enabled ? "Autocomplete is enabled." : "Autocomplete is disabled.");
  };

  const updateSetting = <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K],
  ): void => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setSaveState("idle");
  };

  const persist = async (): Promise<void> => {
    try {
      setSaveState("saving");
      setStatusMessage("Saving settings...");
      await saveSettings(settings);
      setSaveState("saved");
      setStatusMessage("Settings saved successfully.");
    } catch (error) {
      setSaveState("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }
  };

  return {
    settings,
    isLoaded,
    saveState,
    statusMessage,
    providerStatus,
    updateSetting,
    persist,
    reloadStatus: load,
  };
};
