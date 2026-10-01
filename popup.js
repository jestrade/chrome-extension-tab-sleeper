const enabled = document.getElementById("enabled");
const inactivityMinutes = document.getElementById("inactivityMinutes");
const sleepingTabs = document.getElementById("sleepingTabs");
const totalTabs = document.getElementById("totalTabs");
const sleepNow = document.getElementById("sleepNow");
const options = document.getElementById("options");
const status = document.getElementById("status");

async function loadSettings() {
  const settings = await chrome.storage.local.get({ enabled: true, inactivityMinutes: 30 });
  enabled.checked = settings.enabled;
  inactivityMinutes.value = String(settings.inactivityMinutes);
}

async function loadStats() {
  const tabs = await chrome.tabs.query({});
  totalTabs.textContent = tabs.length;
  sleepingTabs.textContent = tabs.filter(tab => tab.discarded).length;
}

enabled.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabled.checked });
});

inactivityMinutes.addEventListener("change", async () => {
  await chrome.storage.local.set({ inactivityMinutes: Number(inactivityMinutes.value) });
  status.textContent = "Settings saved";
  setTimeout(() => status.textContent = "", 1500);
});

sleepNow.addEventListener("click", async () => {
  sleepNow.disabled = true;
  status.textContent = "Checking tabs...";
  const response = await chrome.runtime.sendMessage({ type: "sleepNow" });

  if (response?.success) {
    status.textContent = `${response.discarded} tab(s) put to sleep`;
    await loadStats();
  } else {
    status.textContent = "Something went wrong";
  }
  sleepNow.disabled = false;
});

options.addEventListener("click", () => chrome.runtime.openOptionsPage());

loadSettings();
loadStats();