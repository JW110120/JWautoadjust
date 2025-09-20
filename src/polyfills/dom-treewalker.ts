// Polyfill for document.createTreeWalker in UXP DOM environments lacking it
(() => {
  if (typeof window === 'undefined') return;
  // UXP 有时把 document 挂在 globalThis 或 window.__uxpDefaultDoc
  const doc: any = (globalThis as any).document || (window as any).document || (window as any).__uxpDefaultDoc;
  if (!doc) return;
  if (typeof doc.createTreeWalker === 'function') return;

  const NF: any = (window as any).NodeFilter || {
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
    SHOW_ALL: -1,
    SHOW_ELEMENT: 0x1,
    SHOW_TEXT: 0x4,
    SHOW_COMMENT: 0x80,
  };
  (window as any).NodeFilter = (window as any).NodeFilter || NF;

  const acceptNodeByMask = (node: Node, whatToShow: number, filter?: any) => {
    const type = node.nodeType;
    const mask =
      (type === 1 ? NF.SHOW_ELEMENT : 0) |
      (type === 3 ? NF.SHOW_TEXT : 0) |
      (type === 8 ? NF.SHOW_COMMENT : 0);
    if (whatToShow !== NF.SHOW_ALL && (mask & whatToShow) === 0) return NF.FILTER_SKIP;
    if (filter) {
      if (typeof filter.acceptNode === 'function') return filter.acceptNode(node);
      if (typeof filter === 'function') return filter(node);
    }
    return NF.FILTER_ACCEPT;
  };

  function createTreeWalker(root: Node, whatToShow: number = NF.SHOW_ALL, filter?: any) {
    // 用一个惰性迭代器代替完整实现，满足 lit-html 的最小需求：nextNode()
    const list: Node[] = [];
    const stack: Node[] = [root];
    while (stack.length) {
      const n = stack.pop() as Node;
      if (acceptNodeByMask(n, whatToShow, filter) === NF.FILTER_ACCEPT) list.push(n);
      // 逆序入栈，保持文档顺序
      const children: Node[] = [];
      let c = (n as any).firstChild as Node | null;
      while (c) { children.push(c); c = (c as any).nextSibling as Node | null; }
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }

    let index = -1;
    const walker: any = {
      root,
      whatToShow,
      filter,
      currentNode: root,
      nextNode() {
        index++;
        if (index < list.length) {
          this.currentNode = list[index];
          return this.currentNode;
        }
        return null;
      },
      previousNode() {
        index--;
        if (index >= 0) {
          this.currentNode = list[index];
          return this.currentNode;
        }
        return null;
      },
      parentNode() { return null; },
      firstChild() { return null; },
      lastChild() { return null; },
      previousSibling() { return null; },
      nextSibling() { return null; },
    };
    return walker;
  }

  // 将 polyfill 绑定到当前 document 实例
  (doc as any).createTreeWalker = createTreeWalker as any;
  // 同时尽可能绑定到原型，确保通过 ownerDocument 等获取到的“文档实例”也具备该方法
  const DocCtor: any = (globalThis as any).Document || (doc && (doc as any).defaultView && (doc as any).defaultView.Document);
  if (DocCtor && DocCtor.prototype && typeof DocCtor.prototype.createTreeWalker !== 'function') {
    DocCtor.prototype.createTreeWalker = createTreeWalker as any;
  }
})();