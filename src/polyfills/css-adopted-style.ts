// Minimal Constructable Stylesheets polyfill for UXP
// Provides global CSSStyleSheet and adoptedStyleSheets on Document/ShadowRoot
(() => {
  const g: any = globalThis as any;
  if (typeof g.CSSStyleSheet === 'function' &&
      typeof (Document.prototype as any).adoptedStyleSheets !== 'undefined' &&
      typeof (ShadowRoot.prototype as any).adoptedStyleSheets !== 'undefined') {
    return; // environment already supports it
  }

  class CSSStyleSheetPolyfill {
    cssText = '';
    replaceSync(text: string) {
      this.cssText = String(text);
    }
    replace(text: string) {
      this.replaceSync(text);
      return Promise.resolve(this);
    }
  }

  function applySheets(root: Document | ShadowRoot, sheets: any[]) {
    // remove previously injected tags
    const prev = (root as any)._adoptedStyleElements as HTMLStyleElement[] | undefined;
    if (prev && prev.length) {
      prev.forEach(el => el.parentNode && el.parentNode.removeChild(el));
    }
    const list: HTMLStyleElement[] = [];
    sheets.forEach((sheet) => {
      const css = (sheet && sheet.cssText) || '';
      const styleEl = (root as any).createElement ? (root as any).createElement('style') : document.createElement('style');
      (styleEl as any).textContent = css;
      // prefer head for Document, else append into shadow root
      if ((root as Document).head) {
        (root as Document).head.appendChild(styleEl);
      } else if ((root as ShadowRoot).appendChild) {
        (root as ShadowRoot).appendChild(styleEl);
      }
      list.push(styleEl);
    });
    (root as any)._adoptedStyleElements = list;
  }

  function defineAdopted(targetProto: any) {
    if (typeof targetProto.adoptedStyleSheets !== 'undefined') return;
    let _sheets: any[] = [];
    Object.defineProperty(targetProto, 'adoptedStyleSheets', {
      configurable: true,
      enumerable: true,
      get() { return _sheets; },
      set(v: any[]) {
        _sheets = Array.isArray(v) ? v : [];
        try { applySheets(this, _sheets); } catch { /* ignore */ }
      }
    });
  }

  g.CSSStyleSheet = CSSStyleSheetPolyfill as any;
  defineAdopted(Document.prototype as any);
  if (typeof ShadowRoot !== 'undefined') {
    defineAdopted(ShadowRoot.prototype as any);
  }
})();