let lastSelection = null;

function getSurroundingContext(selection) {
  try {
    if (!selection || selection.rangeCount === 0) return "";

    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    const nearestBlock = node.closest?.("p, article, section, div, li, main") || node;
    const text = nearestBlock?.innerText || "";

    return text.trim().slice(0, 2500);
  } catch (error) {
    console.warn("Failed to get surrounding context:", error);
    return "";
  }
}

function getPageContent() {
  try {
    const main = document.querySelector("article, main");
    const text = (main || document.body)?.innerText || "";
    return text.trim().slice(0, 15000);
  } catch (error) {
    console.warn("Failed to get page content:", error);
    return "";
  }
}

function getNearestHeading(selection) {
  try {
    if (!selection || selection.rangeCount === 0) return "";

    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    let current = node;
    while (current && current !== document.body) {
      const heading = current.querySelector?.("h1, h2, h3");
      if (heading?.innerText) return heading.innerText.trim();
      current = current.parentElement;
    }

    const pageHeading = document.querySelector("h1, h2");
    return pageHeading?.innerText?.trim() || "";
  } catch {
    return "";
  }
}

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (!selectedText || selectedText.length < 2) return;

  lastSelection = {
    id: crypto.randomUUID(),
    text: selectedText,
    pageTitle: document.title,
    pageUrl: window.location.href,
    heading: getNearestHeading(selection),
    surroundingText: getSurroundingContext(selection),
    pageContent: getPageContent(),
    createdAt: new Date().toISOString()
  };

  chrome.runtime.sendMessage({
    type: "SELECTION_UPDATED",
    payload: lastSelection
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_LAST_SELECTION") {
    sendResponse({ selection: lastSelection });
  }
});
