// Minimal MutationObserver polyfill for UXP environments lacking it
(() => {
  if (typeof window === 'undefined') return;
  const g: any = globalThis as any;
  // If already present, do nothing
  if (typeof g.MutationObserver === 'function') return;

  type MutationRecordLike = {
    type: 'attributes' | 'characterData' | 'childList';
    target: Node;
    addedNodes?: Node[];
    removedNodes?: Node[];
    attributeName?: string | null;
    oldValue?: string | null;
  };

  class MutationObserverPolyfill {
    private _callback: (records: MutationRecordLike[], observer: MutationObserverPolyfill) => void;
    constructor(callback: (records: MutationRecordLike[], observer: MutationObserverPolyfill) => void) {
      this._callback = callback;
    }
    observe(_target: Node, _options?: MutationObserverInit): void {
      // No-op: This polyfill is meant to satisfy libraries that only check for presence of MutationObserver.
      // If future behavior requires, we can add a timer-based batching strategy to emit synthetic records.
    }
    disconnect(): void { /* no-op */ }
    takeRecords(): MutationRecordLike[] { return []; }
  }

  g.MutationObserver = MutationObserverPolyfill as any;
  // Some libraries check vendor-prefixed names
  g.WebKitMutationObserver = g.WebKitMutationObserver || MutationObserverPolyfill;
  g.MozMutationObserver = g.MozMutationObserver || MutationObserverPolyfill;
})();