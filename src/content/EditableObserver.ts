import { containsEditableCandidate } from "../utils/dom";

export class EditableObserver {
  private observer: MutationObserver | null = null;
  private scheduled = false;

  constructor(private readonly onRelevantMutation: () => void) {}

  start(): void {
    if (this.observer) {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        if (mutation.type === "attributes") {
          return containsEditableCandidate(mutation.target);
        }

        return [...mutation.addedNodes, ...mutation.removedNodes].some(containsEditableCandidate);
      });

      if (!relevant) {
        return;
      }

      this.schedule();
    });

    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["contenteditable", "rows", "style", "class"],
    });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private schedule(): void {
    if (this.scheduled) {
      return;
    }

    this.scheduled = true;
    window.requestAnimationFrame(() => {
      this.scheduled = false;
      this.onRelevantMutation();
    });
  }
}
