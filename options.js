const DEFAULT_SETTINGS = {
  enabled: true,
  inactivityMinutes: 30,
  checkIntervalMinutes: 5,
  excludePinned: true,
  excludePlayingAudio: true,
  excludedDomains: []
};

const enabled = document.getElementById("enabled");
const inactivityMinutes = document.getElementById("inactivityMinutes");
const checkIntervalMinutes = document.getElementById("checkIntervalMinutes");
const excludePinned = document.getElementById("excludePinned");
const excludePlayingAudio = document.getElementById("excludePlayingAudio");
const excludedDomains = document.getElementById("excludedDomains");
const save = document.getElementById("save");
const status = document.getElementById("status");

async function load() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  enabled.checked = settings.enabled;
  inactivityMinutes.value = String(settings.inactivityMinutes);
  checkIntervalMinutes.value = String(settings.checkIntervalMinutes);
  excludePinned.checked = settings.excludePinned;
  excludePlayingAudio.checked = settings.excludePlayingAudio;
  excludedDomains.value = settings.excludedDomains.join("\n");
}

save.addEventListener("click", async () => {
  const domains = excludedDomains.value.split("\n").map(d => d.trim()).filter(Boolean);

  await chrome.storage.local.set({
    enabled: enabled.checked,
    inactivityMinutes: Number(inactivityMinutes.value),
    checkIntervalMinutes: Number(checkIntervalMinutes.value),
    excludePinned: excludePinned.checked,
    excludePlayingAudio: excludePlayingAudio.checked,
    excludedDomains: domains
  });

  status.textContent = "Settings saved.";
  setTimeout(() => status.textContent = "", 2000);
});

load();