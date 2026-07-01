import { SettingsForm } from "../popup/SettingsForm";
import { useSettings } from "../hooks/useSettings";

export const App = () => {
  const {
    settings,
    isLoaded,
    saveState,
    statusMessage,
    providerStatus,
    updateSetting,
    persist,
    reloadStatus,
  } = useSettings();

  return (
    <main className="options-shell">
      <section className="options-hero">
        <p className="eyebrow">Production-ready Chrome extension</p>
        <h1>Ghostwriter AI Settings</h1>
        <p>
          Manage providers, secure API credentials, debounce timing, and runtime behavior for
          inline autocomplete across nearly any website.
        </p>
      </section>

      <SettingsForm
        title="Configuration"
        description="Your API key stays in extension storage and requests are executed from the background service worker."
        settings={settings}
        isLoaded={isLoaded}
        saveState={saveState}
        statusMessage={statusMessage}
        providerStatus={providerStatus}
        showAdvanced
        onChange={updateSetting}
        onSubmit={persist}
        onRefreshStatus={reloadStatus}
      />

      <section className="notes-panel">
        <h2>Tips</h2>
        <p>Press Tab to accept a visible suggestion.</p>
        <p>Press Ctrl+Space to force a fresh completion when the caret is at the end.</p>
        <p>Use Chrome Built-in AI to get local, on-device suggestions without an API key.</p>
      </section>
    </main>
  );
};
