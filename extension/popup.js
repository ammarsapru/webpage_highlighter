const API_BASE = "http://localhost:3000";

const sessionTitleInput = document.getElementById("sessionTitle");
const userNoteInput = document.getElementById("userNote");
const saveSelectionBtn = document.getElementById("saveSelectionBtn");
const sendSessionBtn = document.getElementById("sendSessionBtn");
const clearBtn = document.getElementById("clearBtn");
const highlightsEl = document.getElementById("highlights");
const countEl = document.getElementById("count");
const statusEl = document.getElementById("status");

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(values) {
  return chrome.storage.local.set(values);
}

function renderHighlights(highlights) {
  countEl.textContent = highlights.length.toString();

  highlightsEl.innerHTML = highlights
    .slice()
    .reverse()
    .map((highlight) => {
      const safeTitle = escapeHtml(highlight.pageTitle || "Untitled page");
      const safeText = escapeHtml(highlight.text || "");
      return `
        <article class="card">
          <div class="card-title">${safeTitle}</div>
          <div class="card-text">${safeText.slice(0, 240)}${safeText.length > 240 ? "..." : ""}</div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refresh() {
  const { highlights = [], activeSessionTitle = "Untitled Research Session" } =
    await getStorage(["highlights", "activeSessionTitle"]);

  sessionTitleInput.value = activeSessionTitle;
  renderHighlights(highlights);
}

saveSelectionBtn.addEventListener("click", async () => {
  statusEl.textContent = "Saving selection...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    statusEl.textContent = "No active tab found.";
    return;
  }

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: "GET_LAST_SELECTION"
  });

  const selection = response?.selection;

  if (!selection?.text) {
    statusEl.textContent = "Highlight text on the page first.";
    return;
  }

  const { highlights = [] } = await getStorage(["highlights"]);

  const highlight = {
    ...selection,
    userNote: userNoteInput.value.trim()
  };

  const alreadySaved = highlights.some(
    (item) => item.text === highlight.text && item.pageUrl === highlight.pageUrl
  );

  if (!alreadySaved) {
    highlights.push(highlight);
    await setStorage({
      highlights,
      activeSessionTitle:
        sessionTitleInput.value.trim() || "Untitled Research Session"
    });
  }

  userNoteInput.value = "";
  statusEl.textContent = alreadySaved
    ? "That highlight was already saved."
    : "Highlight saved.";

  renderHighlights(highlights);
});

sendSessionBtn.addEventListener("click", async () => {
  statusEl.textContent = "Sending session to app...";

  const { highlights = [] } = await getStorage(["highlights"]);

  if (highlights.length === 0) {
    statusEl.textContent = "No highlights to send.";
    return;
  }

  const title = sessionTitleInput.value.trim() || "Untitled Research Session";

  const pagesByUrl = new Map();
  const highlightsToSend = highlights.map((highlight) => {
    const { pageContent, ...rest } = highlight;

    if (highlight.pageUrl && pageContent && !pagesByUrl.has(highlight.pageUrl)) {
      pagesByUrl.set(highlight.pageUrl, {
        url: highlight.pageUrl,
        title: highlight.pageTitle || "",
        content: pageContent
      });
    }

    return rest;
  });

  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      highlights: highlightsToSend,
      pages: Array.from(pagesByUrl.values())
    })
  });

  if (!response.ok) {
    const text = await response.text();
    statusEl.textContent = `Failed to send: ${text}`;
    return;
  }

  const data = await response.json();

  statusEl.textContent = "Session sent successfully.";

  chrome.tabs.create({
    url: `${API_BASE}/sessions/${data.session.id}`
  });
});

clearBtn.addEventListener("click", async () => {
  await setStorage({ highlights: [] });
  statusEl.textContent = "Local highlights cleared.";
  renderHighlights([]);
});

refresh();
