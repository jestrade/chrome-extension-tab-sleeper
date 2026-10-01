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

async function getSettings() {
  return await chrome.storage.sync.get(DEFAULTS);
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isExcludedDomain(url, excludedDomains) {
  const hostname = getHostname(url);
  return excludedDomains.some(domain => {
    const normalized = domain.trim().toLowerCase().replace(/^https?:\\/\\//, '').replace(/\\/$/, '');
    return normalized && (hostname === normalized || hostname.endsWith(`.${normalized}`));
  });
}

function isDiscardable(tab, settings, inactivityMinutes) {
  if (!tab.id || tab.active || tab.discarded) return false;
  if (settings.excludePinned && tab.pinned) return false;
  if (settings.excludePlayingAudio && tab.audible) return false;
  if (isExcludedDomain(tab.url || '', settings.excludedDomains)) return false;

  const lastAccessed = tab.lastAccessed || 0;
  const inactiveMs = Date.now() - lastAccessed;
  return inactiveMs >= inactivityMinutes * 60 * 1000;
}

async function discardInactiveTabs(inactivityMinutesOverride = null) {
  const settings = await getSettings();
  if (!settings.enabled && inactivityMinutesOverride === null) return { discarded: 0 };

  const inactivityMinutes = inactivityMinutesOverride ?? settings.inactivityMinutes;
  const tabs = await chrome.tabs.query({});
  let discarded = 0;

  for (const tab of tabs) {
    if (!isDiscardable(tab, settings, inactivityMinutes)) continue;

    try {
      await chrome.tabs.discard(tab.id);
      discarded++;
    } catch (error) {
      console.warn(`Could not discard tab ${tab.id}:`, error);
    }
  }

  return { discarded };
}

async function getMemoryStatus() {
  if (!chrome.system?.memory?.getInfo) {
    return { available: false };
  }

  const info = await chrome.system.memory.getInfo();
  const availablePercent = info.capacity > 0
    ? (info.availableCapacity / info.capacity) * 100
    : 0;

  return {
    available: true,
    capacity: info.capacity,
    availableCapacity: info.availableCapacity,
    availablePercent: Number(availablePercent.toFixed(1))
  };
}

async function checkMemoryPressure() {
  const settings = await getSettings();
  if (!settings.enabled || !settings.memoryPressureEnabled) return { discarded: 0, memoryPressure: false };

  const memory = await getMemoryStatus();
  if (!memory.available) return { discarded: 0, memoryPressure: false };

  const memoryPressure = memory.availablePercent <= settings.memoryPressurePercent;
  if (!memoryPressure) return { discarded: 0, memoryPressure: false, memory };

  const result = await discardInactiveTabs(settings.memoryPressureInactivityMinutes);
  return { ...result, memoryPressure: true, memory };
}

async function setupAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear('tab-sleep-check');

  if (settings.enabled) {
    chrome.alarms.create('tab-sleep-check', {
      periodInMinutes: Math.max(1, settings.checkIntervalMinutes)
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...current });
  await setupAlarm();
});

chrome.runtime.onStartup.addListener(setupAlarm);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') setupAlarm();
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'tab-sleep-check') return;

  await discardInactiveTabs();
  await checkMemoryPressure();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'sleepNow') {
    discardInactiveTabs()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message?.type === 'getMemoryStatus') {
    getMemoryStatus()
      .then(sendResponse)
      .catch(error => sendResponse({ available: false, error: error.message }));
    return true;
  }

  if (message?.type === 'checkMemoryPressure') {
    checkMemoryPressure()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});
