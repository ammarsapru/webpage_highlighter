const serverUrlEl = document.getElementById("serverUrl");
const apiTokenEl = document.getElementById("apiToken");
const statusEl = document.getElementById("status");

async function load() {
  const { serverUrl, apiToken } = await chrome.storage.local.get(["serverUrl", "apiToken"]);
  serverUrlEl.value = serverUrl || "";
  apiTokenEl.value = apiToken || "";
}

document.getElementById("save").addEventListener("click", async () => {
  const serverUrl = serverUrlEl.value.trim().replace(/\/$/, "");
  const apiToken = apiTokenEl.value.trim();
  await chrome.storage.local.set({ serverUrl, apiToken });
  statusEl.style.color = "#16a34a";
  statusEl.textContent = "Saved.";
});

document.getElementById("test").addEventListener("click", async () => {
  const serverUrl = serverUrlEl.value.trim().replace(/\/$/, "");
  const apiToken = apiTokenEl.value.trim();
  statusEl.style.color = "#666";
  statusEl.textContent = "Testing…";

  try {
    const res = await fetch(`${serverUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (res.ok) {
      statusEl.style.color = "#16a34a";
      statusEl.textContent = "Connected successfully.";
    } else if (res.status === 401) {
      statusEl.style.color = "#dc2626";
      statusEl.textContent = "Invalid API token.";
    } else {
      statusEl.style.color = "#dc2626";
      statusEl.textContent = `Server responded with ${res.status}.`;
    }
  } catch {
    statusEl.style.color = "#dc2626";
    statusEl.textContent = "Could not reach that server URL.";
  }
});

load();
