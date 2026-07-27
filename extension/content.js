(function () {
  if (window.__hlxInjected) return;
  window.__hlxInjected = true;

  /** @type {{id: string, text: string, color: string, markIds: string[]}[]} */
  let highlights = [];
  let markIdCounter = 0;
  let toolbarEl = null;

  function removeToolbar() {
    if (toolbarEl) {
      toolbarEl.remove();
      toolbarEl = null;
    }
  }

  function showToolbar(rect) {
    removeToolbar();
    toolbarEl = document.createElement("div");
    toolbarEl.className = "hlx-toolbar";
    toolbarEl.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    toolbarEl.style.top = `${rect.top + window.scrollY}px`;

    for (const color of HLX_COLORS) {
      const btn = document.createElement("button");
      btn.className = "hlx-swatch";
      btn.title = color.name;
      btn.style.background = color.value;
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => applyHighlight(color.value));
      toolbarEl.appendChild(btn);
    }

    document.documentElement.appendChild(toolbarEl);
  }

  // Wraps every text node intersecting `range` in its own <mark>, splitting partial text
  // nodes at the boundaries. Needed because a Range spanning multiple elements can't be
  // surroundContents()-ed directly.
  function wrapRangeInMarks(range, color) {
    const root = range.commonAncestorContainer;
    const walkRoot = root.nodeType === Node.TEXT_NODE ? root.parentNode : root;

    const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    const markIds = [];

    for (const node of textNodes) {
      if (!node.parentNode || !node.textContent || !node.textContent.trim()) continue;

      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);
      if (node === range.startContainer) nodeRange.setStart(node, range.startOffset);
      if (node === range.endContainer) nodeRange.setEnd(node, range.endOffset);
      if (nodeRange.collapsed) continue;

      const mark = document.createElement("mark");
      mark.className = "hlx-mark";
      const id = `hlx-${++markIdCounter}`;
      mark.dataset.hlxId = id;
      mark.style.background = color;
      markIds.push(id);

      try {
        nodeRange.surroundContents(mark);
      } catch {
        const contents = nodeRange.extractContents();
        mark.appendChild(contents);
        nodeRange.insertNode(mark);
      }
    }

    return markIds;
  }

  function applyHighlight(color) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    if (!text) return;

    const markIds = wrapRangeInMarks(range, color);
    if (markIds.length > 0) {
      highlights.push({ id: crypto.randomUUID(), text, color, markIds });
    }
    selection.removeAllRanges();
    removeToolbar();
  }

  function removeHighlight(id) {
    const h = highlights.find((x) => x.id === id);
    if (!h) return;
    for (const markId of h.markIds) {
      const mark = document.querySelector(`mark[data-hlx-id="${markId}"]`);
      if (!mark || !mark.parentNode) continue;
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
    highlights = highlights.filter((x) => x.id !== id);
  }

  function clearAllHighlights() {
    for (const h of [...highlights]) removeHighlight(h.id);
    highlights = [];
  }

  document.addEventListener("mouseup", (e) => {
    if (toolbarEl && toolbarEl.contains(e.target)) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !selection.toString().trim()) {
      removeToolbar();
      return;
    }
    const range = selection.getRangeAt(0);
    showToolbar(range.getBoundingClientRect());
  });

  document.addEventListener("mousedown", (e) => {
    if (toolbarEl && !toolbarEl.contains(e.target)) removeToolbar();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "HLX_GET_HIGHLIGHTS") {
      sendResponse({
        title: document.title,
        url: location.href,
        pageContent: document.body.innerText,
        highlights: highlights.map(({ id, text, color }) => ({ id, text, color })),
      });
      return true;
    }
    if (message?.type === "HLX_REMOVE_HIGHLIGHT") {
      removeHighlight(message.id);
      sendResponse({ ok: true });
      return true;
    }
    if (message?.type === "HLX_CLEAR_HIGHLIGHTS") {
      clearAllHighlights();
      sendResponse({ ok: true });
      return true;
    }
  });
})();
