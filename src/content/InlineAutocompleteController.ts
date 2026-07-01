import { EditableObserver } from "./EditableObserver";
import { GhostTextOverlay } from "./GhostTextOverlay";
import { SuggestionRequester } from "./SuggestionRequester";
import { getRuntimeSettings, isRuntimeSettingsChange } from "../services/storage";
import { DEFAULT_RUNTIME_SETTINGS, type RuntimeSettings } from "../types/settings";
import type { SupportedEditableElement } from "../types/autocomplete";
import {
  getEditableRoot,
  getEditableSnapshot,
  insertSuggestion,
  isFocusedEditable,
  isTextControl,
} from "../utils/dom";

const HIDE_ON_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Escape",
  "Backspace",
  "Delete",
  "Enter",
]);

export class InlineAutocompleteController {
  private runtimeSettings: RuntimeSettings = DEFAULT_RUNTIME_SETTINGS;
  private activeElement: SupportedEditableElement | null = null;
  private currentSuggestion = "";
  private readonly overlay = new GhostTextOverlay();
  private readonly requester = new SuggestionRequester((result) => this.handleSuggestion(result));
  private readonly editableObserver = new EditableObserver(() => this.handleDomMutation());
  private readonly resizeObserver = new ResizeObserver(() => this.syncOverlay());

  async start(): Promise<void> {
    this.runtimeSettings = await getRuntimeSettings();
    this.editableObserver.start();
    this.addListeners();
  }

  private addListeners(): void {
    document.addEventListener("focusin", this.handleFocusIn, true);
    document.addEventListener("focusout", this.handleFocusOut, true);
    document.addEventListener("input", this.handleInput, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("selectionchange", this.handleSelectionChange, true);
    document.addEventListener("pointerdown", this.handlePointerDown, true);
    window.addEventListener("resize", this.handleViewportChange, true);
    window.addEventListener("scroll", this.handleViewportChange, true);
    window.addEventListener("hashchange", this.handleNavigation, true);
    window.addEventListener("popstate", this.handleNavigation, true);
    window.visualViewport?.addEventListener("resize", this.handleViewportChange);
    window.visualViewport?.addEventListener("scroll", this.handleViewportChange);
    chrome.storage.onChanged.addListener(this.handleStorageChange);
  }

  private handleFocusIn = (event: FocusEvent): void => {
    const editable = getEditableRoot(event.target);

    if (!editable) {
      return;
    }

    this.setActiveElement(editable);
    this.requestSuggestion();
  };

  private handleFocusOut = (): void => {
    window.setTimeout(() => {
      if (this.activeElement && !isFocusedEditable(this.activeElement)) {
        this.clearSuggestion();
        this.setActiveElement(null);
      }
    }, 0);
  };

  private handleInput = (event: Event): void => {
    const editable = getEditableRoot(event.target);

    if (!editable || editable !== this.activeElement) {
      return;
    }

    this.clearSuggestion(false);
    this.requestSuggestion();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const editable = getEditableRoot(event.target);

    if (!editable) {
      return;
    }

    this.setActiveElement(editable);

    if (event.key === "Tab" && this.currentSuggestion) {
      event.preventDefault();
      this.acceptSuggestion();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
      event.preventDefault();
      this.requestSuggestion(true);
      return;
    }

    if (event.key === "Escape") {
      this.clearSuggestion();
      return;
    }

    if (HIDE_ON_KEYS.has(event.key) || (event.key.length === 1 && !event.metaKey && !event.ctrlKey)) {
      this.clearSuggestion(false);
    }
  };

  private handleSelectionChange = (): void => {
    if (!this.activeElement) {
      return;
    }

    const snapshot = getEditableSnapshot(this.activeElement);

    if (!snapshot || snapshot.selectionStart !== snapshot.selectionEnd || !snapshot.cursorAtEnd) {
      this.clearSuggestion();
      return;
    }

    if (!this.currentSuggestion) {
      return;
    }

    this.syncOverlay();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.activeElement) {
      return;
    }

    if (event.target instanceof Node && this.activeElement.contains(event.target)) {
      return;
    }

    this.clearSuggestion();
  };

  private handleViewportChange = (): void => {
    this.syncOverlay();
  };

  private handleNavigation = (): void => {
    this.clearSuggestion();
    this.requester.resetPromptMemory();
  };

  private handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (!isRuntimeSettingsChange(changes, areaName)) {
      return;
    }

    void getRuntimeSettings().then((settings) => {
      this.runtimeSettings = settings;

      if (!settings.enabled) {
        this.clearSuggestion();
        return;
      }

      this.requestSuggestion();
    });
  };

  private handleDomMutation(): void {
    if (!this.activeElement) {
      return;
    }

    if (!document.contains(this.activeElement)) {
      this.clearSuggestion();
      this.setActiveElement(null);
      return;
    }

    this.syncOverlay();
  }

  private setActiveElement(element: SupportedEditableElement | null): void {
    if (element === this.activeElement) {
      return;
    }

    if (this.activeElement && isTextControl(this.activeElement)) {
      this.activeElement.removeEventListener("scroll", this.handleViewportChange, true);
    }

    this.resizeObserver.disconnect();
    this.activeElement = element;
    this.currentSuggestion = "";
    this.overlay.hide();

    if (!element) {
      return;
    }

    this.resizeObserver.observe(element);

    if (isTextControl(element)) {
      element.addEventListener("scroll", this.handleViewportChange, true);
    }
  }

  private requestSuggestion(immediate = false): void {
    if (!this.activeElement || !this.runtimeSettings.enabled) {
      this.clearSuggestion();
      return;
    }

    const snapshot = getEditableSnapshot(this.activeElement);

    if (
      !snapshot ||
      snapshot.selectionStart !== snapshot.selectionEnd ||
      !snapshot.cursorAtEnd ||
      !snapshot.text.trim()
    ) {
      this.clearSuggestion();
      this.requester.cancel();
      return;
    }

    this.requester.schedule(
      {
        text: snapshot.text,
        pageTitle: document.title,
        pageUrl: window.location.href,
        settings: this.runtimeSettings,
      },
      immediate,
    );
  }

  private handleSuggestion(result: { prompt: string; suggestion: string }): void {
    if (!this.activeElement) {
      return;
    }

    const snapshot = getEditableSnapshot(this.activeElement);

    if (
      !snapshot ||
      snapshot.selectionStart !== snapshot.selectionEnd ||
      !snapshot.cursorAtEnd ||
      snapshot.text.replace(/\r\n/g, "\n") !== result.prompt ||
      !result.suggestion
    ) {
      this.clearSuggestion();
      return;
    }

    this.currentSuggestion = result.suggestion;
    this.overlay.show(this.activeElement, snapshot.text, result.suggestion);
  }

  private acceptSuggestion(): void {
    if (!this.activeElement || !this.currentSuggestion) {
      return;
    }

    insertSuggestion(this.activeElement, this.currentSuggestion);
    this.requester.cancel();
    this.clearSuggestion(false);
  }

  private syncOverlay(): void {
    if (!this.currentSuggestion || !this.activeElement || !isFocusedEditable(this.activeElement)) {
      return;
    }

    this.overlay.sync();
  }

  private clearSuggestion(resetPromptMemory = true): void {
    this.currentSuggestion = "";
    this.overlay.hide();

    if (resetPromptMemory) {
      this.requester.resetPromptMemory();
    }
  }
}
