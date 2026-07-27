let markIdCounter = 0;

/**
 * Wraps every text node intersecting `range` in its own <mark>, splitting partial text
 * nodes at the range boundaries. Handles selections that span multiple pdf.js text-layer
 * spans (a Range can't be `surroundContents`-ed directly once it crosses element boundaries).
 * Returns the ids assigned to the created <mark> elements, so callers can remove them later.
 */
export function wrapRangeInMarks(range: Range, color: string): string[] {
  const root = range.commonAncestorContainer;
  const walkRoot = root.nodeType === Node.TEXT_NODE ? root.parentElement! : (root as Element);

  const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  const markIds: string[] = [];

  for (const node of textNodes) {
    if (!node.parentNode || !node.textContent) continue;

    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    if (node === range.startContainer) nodeRange.setStart(node, range.startOffset);
    if (node === range.endContainer) nodeRange.setEnd(node, range.endOffset);
    if (nodeRange.collapsed) continue;

    const mark = document.createElement("mark");
    mark.className = "hlx-mark";
    mark.dataset.hlxId = `hlx-${++markIdCounter}`;
    // pdf.js's .textLayer establishes its own CSS stacking context (position:absolute +
    // z-index), so mix-blend-mode on a mark inside it can't reach the canvas painted
    // behind/outside that stacking context - it would just paint solid and hide the text.
    // Plain alpha transparency composites correctly regardless of stacking context.
    mark.style.background = color;
    mark.style.opacity = "0.45";
    markIds.push(mark.dataset.hlxId);

    try {
      nodeRange.surroundContents(mark);
    } catch {
      // Extremely rare fallback: extract + reinsert instead of surrounding in place.
      const contents = nodeRange.extractContents();
      mark.appendChild(contents);
      nodeRange.insertNode(mark);
    }
  }

  return markIds;
}

export function removeMarksById(container: HTMLElement, ids: string[]): void {
  for (const id of ids) {
    const mark = container.querySelector<HTMLElement>(`mark[data-hlx-id="${id}"]`);
    if (!mark) continue;
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}
