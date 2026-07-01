import type {
  EditableSnapshot,
  SupportedEditableElement,
  SupportedTextControl,
} from "../types/autocomplete";

const SUPPORTED_INPUT_TYPES = new Set(["text", "search"]);

export const isTextControl = (element: Element | null): element is SupportedTextControl => {
  if (!element) {
    return false;
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled;
  }

  if (element instanceof HTMLInputElement) {
    return SUPPORTED_INPUT_TYPES.has(element.type) && !element.readOnly && !element.disabled;
  }

  return false;
};

export const isContentEditableElement = (element: Element | null): element is HTMLElement =>
  Boolean(element instanceof HTMLElement && element.isContentEditable);

export const isSupportedEditable = (
  element: EventTarget | null,
): element is SupportedEditableElement => {
  if (!(element instanceof Element)) {
    return false;
  }

  return isTextControl(element) || isContentEditableElement(element);
};

export const containsEditableCandidate = (node: Node): boolean => {
  if (!(node instanceof Element)) {
    return false;
  }

  if (isSupportedEditable(node)) {
    return true;
  }

  return Boolean(
    node.querySelector(
      'textarea, input[type="text"], input[type="search"], [contenteditable]:not([contenteditable="false"])',
    ),
  );
};

export const getEditableRoot = (target: EventTarget | null): SupportedEditableElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  if (isTextControl(target)) {
    return target;
  }

  const editableAncestor = target.closest<HTMLElement>(
    '[contenteditable]:not([contenteditable="false"])',
  );
  return isContentEditableElement(editableAncestor) ? editableAncestor : null;
};

export const getPlainText = (element: SupportedEditableElement): string => {
  if (isTextControl(element)) {
    return element.value;
  }

  return element.innerText.replace(/\r\n/g, "\n");
};

const getCaretOffsetWithin = (element: HTMLElement): number => {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
};

export const getEditableSnapshot = (element: SupportedEditableElement): EditableSnapshot | null => {
  if (isTextControl(element)) {
    const selectionStart = element.selectionStart ?? element.value.length;
    const selectionEnd = element.selectionEnd ?? element.value.length;

    return {
      text: element.value,
      selectionStart,
      selectionEnd,
      cursorAtEnd: selectionStart === element.value.length && selectionEnd === element.value.length,
    };
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !element.contains(selection.anchorNode)) {
    return null;
  }

  const selectionStart = getCaretOffsetWithin(element);
  const selectionEnd = selectionStart + selection.toString().length;
  const text = getPlainText(element);

  return {
    text,
    selectionStart,
    selectionEnd,
    cursorAtEnd: selection.isCollapsed && selectionStart === text.length,
  };
};

export const hasCollapsedSelection = (element: SupportedEditableElement): boolean => {
  const snapshot = getEditableSnapshot(element);
  return Boolean(snapshot && snapshot.selectionStart === snapshot.selectionEnd);
};

export const isFocusedEditable = (element: SupportedEditableElement | null): boolean => {
  if (!element) {
    return false;
  }

  if (isTextControl(element)) {
    return document.activeElement === element;
  }

  const selection = window.getSelection();
  return document.activeElement === element || Boolean(selection?.anchorNode && element.contains(selection.anchorNode));
};

export const insertSuggestion = (element: SupportedEditableElement, suggestion: string): void => {
  if (isTextControl(element)) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    element.setRangeText(suggestion, start, end, "end");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: suggestion }));
    return;
  }

  if (document.queryCommandSupported?.("insertText")) {
    document.execCommand("insertText", false, suggestion);
    return;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(suggestion);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

export const getCaretClientRect = (element: HTMLElement): DOMRect | null => {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !element.contains(selection.anchorNode)) {
    return null;
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();

  if (rects.length > 0) {
    return rects[rects.length - 1];
  }

  return range.getBoundingClientRect();
};

export const parseComputedColor = (value: string): [number, number, number] => {
  const rgbMatch = value.match(/\d+(\.\d+)?/g);

  if (!rgbMatch || rgbMatch.length < 3) {
    return [128, 128, 128];
  }

  return [
    Number.parseFloat(rgbMatch[0]),
    Number.parseFloat(rgbMatch[1]),
    Number.parseFloat(rgbMatch[2]),
  ];
};

export const toGhostColor = (color: string, alpha = 0.38): string => {
  const [r, g, b] = parseComputedColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
