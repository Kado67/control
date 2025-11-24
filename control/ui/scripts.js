// ================================
// InflowAI Kontrol Merkezi — ORTAK UI
// Vanilla JS, build yok, direkt çalışır.
// ================================

// === AYAR ===
const API_BASE = "https://inflowai-api.onrender.com"; // GEREKİRSE burayı değiştir
const STATUS_URL = `${API_BASE}/api/status`;
const SUMMARY_URL = `${API_BASE}/api/ortak/summary`;
const FEATURES_URL = `${API_BASE}/api/ortak/features`;

// UI refs
const apiDot = document.getElementById("apiDot");
const apiText = document.getElementById("apiText");
const apiModePill = document.getElementById("apiModePill");
const refreshBtn = document.getElementById("refreshBtn");

const ortakToggle = document.getElementById("ortakToggle");
const ortakStatePill = document.getElementById("ortakStatePill");
const ortakSummaryText = document.getElementById("ortakSummaryText");
const ruhHali = document.getElementById("ruhHali");
const saglikSkoru = document.getElementById("saglikSkoru");
const sonGuncelleme = document.getElementById("sonGuncelleme");
const ortakOneriList = document.getElementById("ortakOneriList");
const ortakFoundList = document.getElementById("ortakFoundList");
const ortakCount = document.getElementById("ortakCount");

const platformFeaturesBox = document.getElementById("platformFeatures");
const platformCount = document.getElementById("platformCount");

const logBox = document.getElementById("logBox");
const logCount = document.getElementById("logCount");

// state
let apiOnline = false;
let ortakEnabled = JSON.parse(localStorage.getItem("ortakEnabled") || "true");
let pollTimer = null;

// helpers
const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
function log(msg){
  const t = new Date().toLocaleTimeString();
  logBox.textContent = `[${t}] ${msg}\n` + logBox.textContent;
  const lines = logBox.textContent.trim().split("\n").filter(Boolean);
  logCount.textContent = `${lines.length} kayıt`;
}

function setApiStatus(online, mode="live"){
  apiOnline = online;
  apiDot.style.background = online ? "var(--good)" : "var(--bad)";
  apiDot.style.boxShadow = online ? "0 0 10px var(--good)" : "0 0 10px var(--bad)";
  apiText.textContent = online ? "API bağlantısı aktif" : "API bağlantısı yok";
  apiModePill.textContent = online ? "API live" : "API mock";
}

// robust fetch with retry (Render sleep için)
async function fetchJSON(url, opts={}, retry=3){
  let lastErr;
  for(let i=0;i<retry;i++){
    try{
      const res = await fetch(url, { ...opts, cache:"no-store" });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    }catch(e){
      lastErr = e;
      await sleep(800 + i*700);
    }
  }
  throw lastErr;
}

// API status ping
async function checkApi(){
  try{
    const data = await fetchJSON(STATUS_URL, {}, 4);
    setApiStatus(true);
    log(`API OK: ${data.message}`);
    return true;
  }catch(e){
    setApiStatus(false);
    log(`API kapalı/uyuyor: ${e.message}`);
    return false;
  }
}

// render platform features
function renderPlatformFeatures(list){
  platformFeaturesBox.innerHTML = "";
  platformCount.textContent = `${list.length} özellik`;

  list.forEach(f=>{
    const id = f.id || f.key || f.name;
    const enabled = JSON.parse(localStorage.getItem(`feat:${id}`) || "false");

    const row = document.createElement("div");
    row.className = "feature-row";
    row.innerHTML = `
      <div class="feature-meta">
        <div class="feature-title">${f.name}</div>
        <div class="feature-desc">${f.desc || f.description || ""}</div>
      </div>
      <label class="switch">
        <input type="checkbox" ${enabled ? "checked":""} data-feat="${id}">
        <span class="slider"></span>
      </label>
    `;
    platformFeaturesBox.appendChild(row);
  });

  // toggle handlers
  platformFeaturesBox.querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change", (e)=>{
      const key = e.target.dataset.feat;
      localStorage.setItem(`feat:${key}`, JSON.stringify(e.target.checked));
      log(`Özellik ${key}: ${e.target.checked ? "AÇIK":"KAPALI"}`);
      // İstersen burada API'ye de post atarız (ileride)
    });
  });
}

// load features from API
async function loadFeatures(){
  if(!apiOnline) return;
  try{
    const res = await fetchJSON(FEATURES_URL, {}, 4);
    const features = res?.data || [];

    // API "featureConfig" array döndürmüyorsa fallback
    const normalized = features.map(x=>({
      id: x.id || x.key || x.name,
      name: x.name || x.title || "Özellik",
      desc: x.desc || x.description || ""
    }));

    renderPlatformFeatures(normalized);

    // Ortak'ın bulduğu alanı ilk etapta boş bırakma
    if(normalized.length === 0){
      platformFeaturesBox.innerHTML = `<div class="muted">API features listesi boş döndü. Engine içi doldurulunca burada çıkacak.</div>`;
      platformCount.textContent = `0 özellik`;
    }
  }catch(e){
    log(`Features çekilemedi: ${e.message}`);
  }
}

// render ortak summary/analysis
function renderSummary(summary){
  const mood = summary.ruhHali || summary.mood || "Kararlı";
  const health = summary.saglikSkoru || summary.healthScore || 81;
  const recs = summary.oneriler || summary.recommendations || [];

  ruhHali.textContent = mood;
  saglikSkoru.textContent = health;
  sonGuncelleme.textContent = new Date().toLocaleTimeString();

  // öneriler
  ortakOneriList.innerHTML = "";
  if(recs.length === 0){
    ortakOneriList.innerHTML = `<li class="muted">Ortak henüz öneri üretmedi.</li>`;
  }else{
    recs.forEach(r=>{
      const li = document.createElement("li");
      li.textContent = r;
      ortakOneriList.appendChild(li);
    });
  }

  // Ortak found/features
  const found = summary.ortakBuldu || summary.foundFeatures || [];
  ortakFoundList.innerHTML = "";
  if(found.length === 0){
    ortakFoundList.innerHTML = `<li class="muted">Ortak aktif ama yeni bir özellik önermedi.</li>`;
  }else{
    found.forEach(f=>{
      const li = document.createElement("li");
      li.textContent = f.name ? `${f.name} — ${f.desc||""}` : String(f);
      ortakFoundList.appendChild(li);
    });
  }
  ortakCount.textContent = `${found.length} özellik`;

  ortakSummaryText.textContent = "Ortak özet üretiyor...";
}

// load ortak summary
async function loadSummary(){
  if(!apiOnline || !ortakEnabled) return;
  try{
    const res = await fetchJSON(SUMMARY_URL, {}, 4);
    renderSummary(res?.data || {});
    log(`Ortak summary güncellendi.`);
  }catch(e){
    log(`Ortak summary hatası: ${e.message}`);
  }
}

// ortak enable/disable
function setOrtakEnabled(v){
  ortakEnabled = v;
  localStorage.setItem("ortakEnabled", JSON.stringify(v));
  ortakToggle.checked = v;
  ortakStatePill.textContent = v ? "AKTİF" : "PASİF";
  ortakStatePill.style.opacity = v ? "1" : ".6";
  log(`Ortak ${v ? "AKTİF" : "PASİF"} edildi.`);

  if(v){
    loadSummary();
    startPolling();
  }else{
    stopPolling();
  }
}

function startPolling(){
  stopPolling();
  pollTimer = setInterval(loadSummary, 15000);
}
function stopPolling(){
  if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
}

// nav tabs (şimdilik sadece highlight)
document.querySelectorAll(".nav-item").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    log(`Sekme: ${btn.textContent.trim()}`);
  });
});

refreshBtn.addEventListener("click", async ()=>{
  await checkApi();
  await loadFeatures();
  await loadSummary();
});

// init
(async function init(){
  ortakToggle.checked = ortakEnabled;
  setOrtakEnabled(ortakEnabled);

  await checkApi();
  if(apiOnline){
    await loadFeatures();
    await loadSummary();
    startPolling();
  }else{
    // API uyanınca otomatik toparlasın
    const wakeTry = setInterval(async ()=>{
      const ok = await checkApi();
      if(ok){
        clearInterval(wakeTry);
        await loadFeatures();
        await loadSummary();
        startPolling();
      }
    }, 6000);
  }
})();
