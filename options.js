const DEFAULTS = {
  enabled: true,
  inactivityMinutes: 30,
  checkIntervalMinutes: 5,
  excludePinned: true,
  excludePlayingAudio: true,
  excludedDomains: [],
  memoryPressureEnabled: true,
  memoryPressurePercent: 20,
  memoryPressureInactivityMinutes: 10
};

const $ = id => document.getElementById(id);

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  $('enabled').checked = settings.enabled;
  $('checkIntervalMinutes').value = settings.checkIntervalMinutes;
  $('inactivityMinutes').value = settings.inactivityMinutes;
  $('excludePinned').checked = settings.excludePinned;
  $('excludePlayingAudio').checked = settings.excludePlayingAudio;
  $('excludedDomains').value = settings.excludedDomains.join('\n');
  $('memoryPressureEnabled').checked = settings.memoryPressureEnabled;
  $('memoryPressurePercent').value = settings.memoryPressurePercent;
  $('memoryPressureInactivityMinutes').value = settings.memoryPressureInactivityMinutes;
}

$('save').addEventListener('click', async () => {
  const excludedDomains = $('excludedDomains').value
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(Boolean);

  await chrome.storage.sync.set({
    enabled: $('enabled').checked,
    checkIntervalMinutes: Math.max(1, Number($('checkIntervalMinutes').value)),
    inactivityMinutes: Math.max(1, Number($('inactivityMinutes').value)),
    excludePinned: $('excludePinned').checked,
    excludePlayingAudio: $('excludePlayingAudio').checked,
    excludedDomains,
    memoryPressureEnabled: $('memoryPressureEnabled').checked,
    memoryPressurePercent: Math.min(50, Math.max(5, Number($('memoryPressurePercent').value))),
    memoryPressureInactivityMinutes: Math.max(1, Number($('memoryPressureInactivityMinutes').value))
  });

  $('status').textContent = 'Saved.';
  setTimeout(() => $('status').textContent = '', 1500);
});

load();
