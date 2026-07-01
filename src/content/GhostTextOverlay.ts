import { getCaretClientRect, isTextControl, toGhostColor } from "../utils/dom";
import type { SupportedEditableElement, SupportedTextControl } from "../types/autocomplete";

const OVERLAY_Z_INDEX = "2147483646";

export class GhostTextOverlay {
  private readonly textRoot = document.createElement("div");
  private readonly textInner = document.createElement("div");
  private readonly textPrefix = document.createElement("span");
  private readonly textSuggestion = document.createElement("span");
  private readonly caretGhost = document.createElement("div");
  private readonly inputGhost = document.createElement("div");
  private readonly measureProbe = document.createElement("span");
  private activeElement: SupportedEditableElement | null = null;
  private activeText = "";
  private activeSuggestion = "";

  constructor() {
    this.textInner.append(this.textPrefix, this.textSuggestion);
    this.textRoot.append(this.textInner);

    Object.assign(this.textRoot.style, {
      position: "fixed",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: OVERLAY_Z_INDEX,
      display: "none",
      background: "transparent",
    });

    Object.assign(this.textInner.style, {
      position: "absolute",
      inset: "0",
      boxSizing: "border-box",
      background: "transparent",
    });

    Object.assign(this.textPrefix.style, {
      color: "transparent",
      userSelect: "none",
      whiteSpace: "inherit",
    });

    Object.assign(this.textSuggestion.style, {
      userSelect: "none",
      whiteSpace: "inherit",
    });

    Object.assign(this.caretGhost.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: OVERLAY_Z_INDEX,
      display: "none",
      background: "transparent",
      userSelect: "none",
      whiteSpace: "pre",
    });

    Object.assign(this.inputGhost.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: OVERLAY_Z_INDEX,
      display: "none",
      background: "transparent",
      userSelect: "none",
      whiteSpace: "pre",
    });

    Object.assign(this.measureProbe.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      left: "-99999px",
      top: "-99999px",
      whiteSpace: "pre",
    });

    document.documentElement.append(this.textRoot, this.caretGhost, this.inputGhost, this.measureProbe);
  }

  show(element: SupportedEditableElement, text: string, suggestion: string): void {
    this.activeElement = element;
    this.activeText = text;
    this.activeSuggestion = suggestion;

    if (isTextControl(element)) {
      this.renderTextControl(element, text, suggestion);
      this.caretGhost.style.display = "none";
      return;
    }

    this.renderContentEditable(element, suggestion);
    this.textRoot.style.display = "none";
  }

  sync(): void {
    if (!this.activeElement || !this.activeSuggestion) {
      return;
    }

    this.show(this.activeElement, this.activeText, this.activeSuggestion);
  }

  hide(): void {
    this.activeElement = null;
    this.activeText = "";
    this.activeSuggestion = "";
    this.textRoot.style.display = "none";
    this.caretGhost.style.display = "none";
    this.inputGhost.style.display = "none";
  }

  private renderTextControl(
    element: SupportedTextControl,
    text: string,
    suggestion: string,
  ): void {
    if (element instanceof HTMLInputElement) {
      this.renderInputGhost(element, text, suggestion);
      this.textRoot.style.display = "none";
      this.caretGhost.style.display = "none";
      return;
    }

    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const whiteSpace = element instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";

    Object.assign(this.textRoot.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: computed.borderRadius,
    });

    Object.assign(this.textInner.style, {
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      padding: computed.padding,
      textIndent: computed.textIndent,
      textTransform: computed.textTransform,
      textAlign: computed.textAlign,
      boxSizing: computed.boxSizing,
      whiteSpace,
      overflowWrap: "break-word",
      transform: `translate(${-element.scrollLeft}px, ${-element.scrollTop}px)`,
    });

    this.textPrefix.textContent = text.endsWith("\n") ? `${text}\u200b` : text;
    this.textSuggestion.textContent = suggestion;
    this.textSuggestion.style.color = toGhostColor(computed.color);
    this.inputGhost.style.display = "none";
  }

  private renderContentEditable(element: HTMLElement, suggestion: string): void {
    const rect = getCaretClientRect(element);

    if (!rect) {
      this.caretGhost.style.display = "none";
      return;
    }

    const computed = window.getComputedStyle(element);

    Object.assign(this.caretGhost.style, {
      display: "block",
      left: `${rect.left + rect.width}px`,
      top: `${rect.top}px`,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      color: toGhostColor(computed.color, 0.42),
    });
    this.caretGhost.style.right = "auto";
    this.caretGhost.style.textAlign = "left";

    this.caretGhost.textContent = suggestion;
    this.inputGhost.style.display = "none";
  }

  private renderInputGhost(
    element: HTMLInputElement,
    text: string,
    suggestion: string,
  ): void {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const textIndent = Number.parseFloat(computed.textIndent) || 0;
    const fontSize = Number.parseFloat(computed.fontSize) || 16;
    const parsedLineHeight = Number.parseFloat(computed.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.2;
    const contentHeight = Math.max(0, rect.height - paddingTop - paddingBottom);
    const verticalOffset = rect.top + paddingTop + Math.max(0, (contentHeight - lineHeight) / 2);
    const measuredTextWidth = this.measureTextWidth(text || "", computed);
    const direction = computed.direction;

    Object.assign(this.inputGhost.style, {
      display: "block",
      top: `${verticalOffset}px`,
      maxWidth: `${Math.max(0, rect.width - paddingLeft - paddingRight)}px`,
      overflow: "hidden",
      textOverflow: "clip",
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      color: toGhostColor(computed.color),
      direction,
    });

    if (direction === "rtl") {
      const right = window.innerWidth - rect.right + paddingRight + textIndent + element.scrollLeft;
      this.inputGhost.style.right = `${right + measuredTextWidth}px`;
      this.inputGhost.style.left = "auto";
      this.inputGhost.style.textAlign = "right";
    } else {
      const left = rect.left + paddingLeft + textIndent - element.scrollLeft + measuredTextWidth;
      this.inputGhost.style.left = `${left}px`;
      this.inputGhost.style.right = "auto";
      this.inputGhost.style.textAlign = "left";
    }

    this.inputGhost.textContent = suggestion;
  }

  private measureTextWidth(text: string, computed: CSSStyleDeclaration): number {
    Object.assign(this.measureProbe.style, {
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      fontVariant: computed.fontVariant,
      letterSpacing: computed.letterSpacing,
      textTransform: computed.textTransform,
    });

    this.measureProbe.textContent = text || "\u200b";
    return this.measureProbe.getBoundingClientRect().width;
  }
}
