const DEFAULT_SETTINGS = {
  enabled: true,
  inactivityMinutes: 30,
  checkIntervalMinutes: 5,
  excludePinned: true,
  excludePlayingAudio: true,
  excludedDomains: []
};

const ALARM_NAME = "tab-sleep-check";

async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function scheduleAlarm() {
  const settings = await getSettings();
  chrome.alarms.clear(ALARM_NAME);
  if (!settings.enabled) return;
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, settings.checkIntervalMinutes)
  });
}

function getHostname(url) {
  try { return new URL(url).hostname.toLowerCase(); }
  catch { return ""; }
}

function isExcludedDomain(hostname, excludedDomains) {
  return excludedDomains.some((domain) => {
    const normalized = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return hostname === normalized || hostname.endsWith(`.${normalized}`);
  });
}

function isDiscardable(tab, settings) {
  if (!tab.id || tab.active || tab.discarded) return false;
  if (settings.excludePinned && tab.pinned) return false;
  if (settings.excludePlayingAudio && tab.audible) return false;

  if (!tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:")) {
    return false;
  }

  return !isExcludedDomain(getHostname(tab.url), settings.excludedDomains);
}

async function sleepInactiveTabs() {
  const settings = await getSettings();
  if (!settings.enabled) return { discarded: 0, checked: 0 };

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const timeout = settings.inactivityMinutes * 60 * 1000;
  let discarded = 0;

  for (const tab of tabs) {
    if (!isDiscardable(tab, settings) || !tab.lastAccessed) continue;
    if (now - tab.lastAccessed < timeout) continue;

    try {
      await chrome.tabs.discard(tab.id);
      discarded++;
    } catch (error) {
      console.warn(`Could not discard tab ${tab.id}:`, error);
    }
  }

  return { discarded, checked: tabs.length };
}

async function getProcessDiagnostics() {
  if (!chrome.processes?.getProcessInfo) return { supported: false, processes: [] };
  try {
    const processMap = await chrome.processes.getProcessInfo([], true);
    const tabs = await chrome.tabs.query({});
    const tabMap = new Map(tabs.map(tab => [tab.id, tab]));
    const processes = Object.entries(processMap).map(([id, process]) => ({
      processId: Number(id), type: process.type, cpu: process.cpu ?? 0,
      privateMemory: process.privateMemory ?? 0,
      tabs: (process.tasks || []).map(t => tabMap.get(t.tabId)).filter(Boolean).map(t => ({id:t.id,title:t.title||'Untitled'}))
    })).filter(p => p.cpu > 0 || p.privateMemory > 0).sort((a,b) => b.cpu-a.cpu);
    return { supported:true, processes:processes.slice(0,25) };
  } catch (error) { return { supported:false, error:error.message, processes:[] }; }
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  await chrome.storage.local.set({ ...DEFAULT_SETTINGS, ...existing });
  await scheduleAlarm();
});

chrome.runtime.onStartup.addListener(scheduleAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) await sleepInactiveTabs();
});

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.enabled || changes.checkIntervalMinutes ||
      changes.inactivityMinutes || changes.excludePinned ||
      changes.excludePlayingAudio || changes.excludedDomains) {
    await scheduleAlarm();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "sleepNow") {
    sleepInactiveTabs()
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "getDiagnostics") {
    getProcessDiagnostics().then(sendResponse).catch(error => sendResponse({supported:false,error:error.message,processes:[]}));
    return true;
  }

  if (message.type === "getStats") {
    chrome.tabs.query({}).then(tabs => {
      sendResponse({
        total: tabs.length,
        sleeping: tabs.filter(tab => tab.discarded).length
      });
    });
    return true;
  }
});