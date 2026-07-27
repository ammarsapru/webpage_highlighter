const listEl = document.getElementById("hlx-list");
const emptyEl = document.getElementById("hlx-empty");
const titleEl = document.getElementById("hlx-title");
const saveBtn = document.getElementById("hlx-save");
const statusEl = document.getElementById("hlx-status");
const warningEl = document.getElementById("hlx-warning");

let currentTabId = null;
let currentData = null;

document.getElementById("hlx-settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("hlx-open-settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("hlx-refresh").addEventListener("click", load);

async function getConfig() {
  const { serverUrl, apiToken } = await chrome.storage.local.get(["serverUrl", "apiToken"]);
  return { serverUrl: (serverUrl || "").replace(/\/$/, ""), apiToken: apiToken || "" };
}

async function load() {
  statusEl.textContent = "";
  const { serverUrl, apiToken } = await getConfig();
  warningEl.style.display = serverUrl && apiToken ? "none" : "block";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  currentTabId = tab.id;

  chrome.tabs.sendMessage(tab.id, { type: "HLX_GET_HIGHLIGHTS" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      emptyEl.style.display = "block";
      emptyEl.textContent = "Reload this page to enable highlighting.";
      listEl.innerHTML = "";
      saveBtn.disabled = true;
      return;
    }
    currentData = response;
    titleEl.value = response.title || "";
    renderList(response.highlights || []);
  });
}

function renderList(highlights) {
  listEl.innerHTML = "";
  emptyEl.style.display = highlights.length === 0 ? "block" : "none";
  emptyEl.textContent = "Select some text on the page and pick a color to start highlighting.";
  saveBtn.disabled = highlights.length === 0;

  for (const h of highlights) {
    const li = document.createElement("li");
    li.style.borderLeftColor = h.color;
    li.style.background = `${h.color}22`;

    const p = document.createElement("p");
    p.textContent = `"${h.text}"`;
    li.appendChild(p);

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.addEventListener("click", () => {
      chrome.tabs.sendMessage(currentTabId, { type: "HLX_REMOVE_HIGHLIGHT", id: h.id }, () => load());
    });
    li.appendChild(btn);

    listEl.appendChild(li);
  }
}

saveBtn.addEventListener("click", async () => {
  const { serverUrl, apiToken } = await getConfig();
  if (!serverUrl || !apiToken) {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (!currentData || !currentData.highlights?.length) return;

  saveBtn.disabled = true;
  statusEl.style.color = "#666";
  statusEl.textContent = "Saving and generating summary…";

  try {
    const res = await fetch(`${serverUrl}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        title: titleEl.value || currentData.title || "Untitled page",
        sourceType: "webpage",
        sourceUrl: currentData.url,
        pageContent: currentData.pageContent,
        highlights: currentData.highlights.map((h, i) => ({
          text: h.text,
          color: h.color,
          position: i,
        })),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? data?.error ?? "Failed to save");

    statusEl.style.color = "#16a34a";
    statusEl.textContent = "Saved! Opening dashboard…";
    chrome.tabs.sendMessage(currentTabId, { type: "HLX_CLEAR_HIGHLIGHTS" });
    chrome.tabs.create({ url: `${serverUrl}/documents/${data.document.id}` });
    setTimeout(() => window.close(), 600);
  } catch (err) {
    statusEl.style.color = "#dc2626";
    statusEl.textContent = err instanceof Error ? err.message : "Failed to save";
    saveBtn.disabled = false;
  }
});

load();
