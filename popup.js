const diagnostics=document.getElementById("diagnostics");
const diagnosticsPanel=document.getElementById("diagnosticsPanel");
const diagnosticsStatus=document.getElementById("diagnosticsStatus");
const processList=document.getElementById("processList");
function formatMemory(bytes){if(!bytes)return "0 MB";const mb=bytes/1024/1024;return mb<1024?`${mb.toFixed(0)} MB`:`${(mb/1024).toFixed(1)} GB`;}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function renderDiagnostics(r){diagnosticsPanel.classList.remove("hidden");if(!r.supported){diagnosticsStatus.textContent="Unavailable";processList.innerHTML='<div class="process"><div class="processTitle">Chrome process diagnostics are unavailable.</div></div>';return;}diagnosticsStatus.textContent=`${r.processes.length} processes`;processList.innerHTML=r.processes.slice(0,8).map(p=>{const name=p.tabs.length===1?p.tabs[0].title:p.tabs.length>1?`${p.tabs.length} tabs`:p.type||"Chrome process";const tabs=p.tabs.map(t=>`<div class="processTab">${escapeHtml(t.title)}</div>`).join("");return `<div class="process"><div class="processTitle">${escapeHtml(name)}</div><div class="processMeta">CPU ${p.cpu.toFixed(1)}% · Memory ${formatMemory(p.privateMemory)} · ${escapeHtml(p.type)}</div>${tabs}</div>`;}).join("");}
diagnostics.addEventListener("click",async()=>{diagnostics.disabled=true;diagnostics.textContent="Analyzing...";try{renderDiagnostics(await chrome.runtime.sendMessage({type:"getDiagnostics"}));}finally{diagnostics.disabled=false;diagnostics.textContent="Refresh CPU & memory";}});
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