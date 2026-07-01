import type { FormEvent } from "react";
import type { ExtensionSettings, ProviderStatus } from "../types/settings";
import {
  CURRENT_OPENROUTER_DEFAULT_MODEL,
  CURRENT_GEMINI_DEFAULT_MODEL,
  CURRENT_CHROME_AI_DEFAULT_MODEL,
} from "../types/settings";

interface SettingsFormProps {
  settings: ExtensionSettings;
  isLoaded: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  statusMessage: string;
  providerStatus: ProviderStatus;
  title: string;
  description: string;
  showAdvanced?: boolean;
  compact?: boolean;
  onChange: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
  onSubmit: () => Promise<void>;
  onRefreshStatus?: () => Promise<void>;
}

export const SettingsForm = ({
  settings,
  isLoaded,
  saveState,
  statusMessage,
  providerStatus,
  title,
  description,
  showAdvanced = false,
  compact = false,
  onChange,
  onSubmit,
  onRefreshStatus,
}: SettingsFormProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onSubmit();
  };

  return (
    <form className={`panel ${compact ? "panel--compact" : ""}`} onSubmit={handleSubmit}>
      <header className="panel__header">
        <p className="eyebrow">Inline AI Autocomplete</p>
        <h1>{title}</h1>
        <p className="panel__description">{description}</p>
      </header>

      <label className="toggle">
        <span>
          <strong>Enable extension</strong>
          <small>Turn suggestions on or off without removing the extension.</small>
        </span>
        <input
          type="checkbox"
          checked={settings.enabled}
          disabled={!isLoaded}
          onChange={(event) => onChange("enabled", event.target.checked)}
        />
      </label>

      <label className="field">
        <span>Provider</span>
        <select
          value={settings.provider}
          disabled={!isLoaded}
          onChange={(event) => {
            const nextProvider = event.target.value as ExtensionSettings["provider"];
            onChange("provider", nextProvider);
            if (nextProvider === "openrouter") {
              onChange("model", CURRENT_OPENROUTER_DEFAULT_MODEL);
            } else if (nextProvider === "gemini") {
              onChange("model", CURRENT_GEMINI_DEFAULT_MODEL);
            } else if (nextProvider === "chrome-ai") {
              onChange("model", CURRENT_CHROME_AI_DEFAULT_MODEL);
            }
          }}
        >
          <option value="openrouter">OpenRouter</option>
          <option value="gemini">Google Gemini (Cloud)</option>
          <option value="chrome-ai">Chrome Built-in AI (On-device)</option>
        </select>
      </label>

      <label className="field">
        <span>API key</span>
        <input
          type="password"
          autoComplete="off"
          placeholder={
            settings.provider === "gemini"
              ? "AIzaSy..."
              : settings.provider === "openrouter"
              ? "sk-or-v1-..."
              : "sk-..."
          }
          value={settings.apiKey}
          disabled={!isLoaded || (settings.provider !== "openrouter" && settings.provider !== "gemini")}
          onChange={(event) => onChange("apiKey", event.target.value)}
        />
      </label>

      <label className="field">
        <span>Model</span>
        <input
          type="text"
          value={settings.model}
          disabled={!isLoaded || settings.provider === "chrome-ai"}
          onChange={(event) => onChange("model", event.target.value)}
        />
      </label>

      {showAdvanced ? (
        <label className="field">
          <span>Debounce (ms)</span>
          <input
            type="number"
            min={0}
            max={2000}
            step={25}
            value={settings.debounceMs}
            disabled={!isLoaded}
            onChange={(event) => onChange("debounceMs", Number(event.target.value) || 0)}
          />
        </label>
      ) : null}

      <div className={`status status--${saveState}`}>{statusMessage}</div>
      <div className={`status status--provider-${providerStatus.state}`}>
        {providerStatus.message}
        {providerStatus.updatedAt
          ? ` (${new Date(providerStatus.updatedAt).toLocaleTimeString()})`
          : ""}
      </div>

      <button className="primary-button" type="submit" disabled={!isLoaded || saveState === "saving"}>
        {saveState === "saving" ? "Saving..." : "Save settings"}
      </button>
      {onRefreshStatus ? (
        <button className="secondary-button" type="button" onClick={() => void onRefreshStatus()}>
          Refresh status
        </button>
      ) : null}
    </form>
  );
};
