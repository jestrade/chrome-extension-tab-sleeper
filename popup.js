const DEFAULTS = {
  enabled: true,
  inactivityMinutes: 30,
  memoryPressureEnabled: true,
  memoryPressurePercent: 20,
  memoryPressureInactivityMinutes: 10
};

const $ = id => document.getElementById(id);

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  $('enabled').checked = settings.enabled;
  $('inactivityMinutes').value = String(settings.inactivityMinutes);
  $('memoryPressureEnabled').checked = settings.memoryPressureEnabled;
  await refreshStats();
  await refreshMemory();
}

async function refreshStats() {
  const tabs = await chrome.tabs.query({});
  const sleeping = tabs.filter(tab => tab.discarded).length;
  $('stats').textContent = `${sleeping} sleeping / ${tabs.length} total tabs`;
}

async function refreshMemory() {
  const result = await chrome.runtime.sendMessage({ type: 'getMemoryStatus' });
  if (!result?.available) {
    $('memoryStatus').textContent = 'Memory information is unavailable.';
    return;
  }

  $('memoryStatus').textContent = `${result.availablePercent}% memory available`;
}

async function save(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

$('enabled').addEventListener('change', e => save('enabled', e.target.checked));
$('inactivityMinutes').addEventListener('change', e => save('inactivityMinutes', Number(e.target.value)));
$('memoryPressureEnabled').addEventListener('change', e => save('memoryPressureEnabled', e.target.checked));

$('sleepNow').addEventListener('click', async () => {
  const result = await chrome.runtime.sendMessage({ type: 'sleepNow' });
  $('message').textContent = result?.error
    ? result.error
    : `${result?.discarded ?? 0} tab(s) put to sleep.`;
  await refreshStats();
});

$('checkMemory').addEventListener('click', async () => {
  const result = await chrome.runtime.sendMessage({ type: 'checkMemoryPressure' });
  if (result?.error) {
    $('message').textContent = result.error;
    return;
  }

  if (result.memoryPressure) {
    $('message').textContent = `Memory pressure detected. ${result.discarded} tab(s) put to sleep.`;
  } else {
    $('message').textContent = 'No memory pressure detected.';
  }

  await refreshMemory();
  await refreshStats();
});

$('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

load();
