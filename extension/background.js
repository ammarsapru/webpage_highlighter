chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    highlights: [],
    activeSessionTitle: "Untitled Research Session"
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SELECTION_UPDATED") {
    chrome.storage.local.set({ lastSelection: message.payload });
  }

  sendResponse({ ok: true });
});
