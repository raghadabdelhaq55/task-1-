import { SettingsForm } from "./SettingsForm";
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

  const openOptions = (): void => {
    void chrome.runtime.openOptionsPage();
  };

  return (
    <main className="popup-shell">
      <SettingsForm
        title="Ghostwriter AI"
        description="Cursor-style ghost text suggestions for nearly any editable field on the web."
        settings={settings}
        isLoaded={isLoaded}
        saveState={saveState}
        statusMessage={statusMessage}
        providerStatus={providerStatus}
        compact
        onChange={updateSetting}
        onSubmit={persist}
        onRefreshStatus={reloadStatus}
      />

      <button className="secondary-button" type="button" onClick={openOptions}>
        Open full settings
      </button>
    </main>
  );
};
