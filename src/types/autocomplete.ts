export type SupportedTextControl = HTMLTextAreaElement | HTMLInputElement;
export type SupportedEditableElement = SupportedTextControl | HTMLElement;

export interface EditableSnapshot {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  cursorAtEnd: boolean;
}
