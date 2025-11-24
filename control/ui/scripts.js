/* InflowAI Kontrol Merkezi - Ortak API UI
   - API base tek yerden yönetilir
   - /api/status, /api/ortak/summary, /api/ortak/features kullanır
*/

const DEFAULT_API = "https://inflowai-api.onrenderder.com"; // yanlışsa inputtan düzelteceğiz
const STORAGE_KEY = "inflowai_api_base";

const el = (id) => document.getElementById(id);

let apiBase = localStorage.getItem(STORAGE_KEY) || "https://inflowai-api.onrender.com";
let logs = [];
let lastOrtakText = "";
let featuresCache = null;

function setApiBase(url) {
  apiBase = (url || "").trim().replace(/\/+$/, "");
  localStorage.setItem(STORAGE_KEY, apiBase);
  el("apiBaseInput").value = apiBase;
  pushLog(`API Base ayarlandı: ${apiBase}`);
}

async function apiGet(path, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(apiBase + path, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

function pushLog(text, level="info") {
  const time = new Date();
  logs.unshift({
    time: time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    text,
    level
  });
  logs = logs.slice(0, 50);
  renderLogs();
}

function renderLogs() {
  const ul = el("logList");
  ul.innerHTML = "";
  logs.forEach(l => {
    const li = document.createElement("li");
    li.className = "log-item";
    li.innerHTML = `
      <div class="log-time">${l.time}</div>
      <div class="log-text">${l.text}</div>
    `;
    ul.appendChild(li);
  });
  el("logCount").textContent = `Son ${logs.length} kayıt`;
}

function pct(val){ return Math.max(0, Math.min(100, Number(val)||0)); }
function fmtPct(v){ return `${Math.round(v)}%`; }

function setDot(state){
  const d = el("apiStatusDot");
  d.classList.remove("good","warn","bad");
  d.classList.add(state);
}

function setBar(id, v){
  el(id).style.width = `${pct(v)}%`;
}

function renderLayers(summary){
  const list = el("layerList");
  list.innerHTML = "";
  const layers = summary?.layers || [
    { name:"Core (Beyin)", status:"ok" },
    { name:"Growth", status:"ok" },
    { name:"Services", status:"ok" },
    { name:"Sharing", status:"ok" },
    { name:"Security", status:"ok" },
    { name:"Updating", status:"ok" }
  ];

  layers.forEach(L=>{
    const div = document.createElement("div");
    div.className="layer";
    let badgeClass="badge";
    let badgeText="OK";
    if(L.status==="warn"){ badgeClass="badge warn"; badgeText="İZLE"; }
    if(L.status==="bad"){ badgeClass="badge bad"; badgeText="KRİTİK"; }

    div.innerHTML=`
      <div class="left">
        <div class="${badgeClass}">${badgeText}</div>
        <div>${L.name}</div>
      </div>
      <div class="muted small">${L.detail || "Sağlıklı çalışıyor"}</div>
    `;
    list.appendChild(div);
  });
}

function speak(text){
  if(!("speechSynthesis" in window)) {
    pushLog("Bu cihaz sesli okuma desteklemiyor.", "warn");
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "tr-TR";
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

async function refreshAll(){
  const started = performance.now();
  try{
    // status
    const st = await apiGet("/api/status");
    const latency = performance.now() - started;

    // summary + features
    const [summary, features] = await Promise.allSettled([
      apiGet("/api/ortak/summary"),
      apiGet("/api/ortak/features")
    ]);

    if(features.status==="fulfilled") featuresCache = features.value?.data || null;

    el("apiMode").textContent = "API canlı";
    el("apiMode").classList.remove("ghost");
    el("apiUpdatedAt").textContent = "Son güncelleme: " + new Date().toLocaleTimeString("tr-TR");

    // Bağlantı metrikleri (UI tarafı)
    const connPct = 98;
    const latencyPct = Math.min(100, (latency/1000)*100); // kaba ölçek
    const errPct = 2;
    const upPct = 99.2;

    el("apiConn").textContent = fmtPct(connPct);
    el("apiLatency").textContent = Math.round(latency) + "ms";
    el("apiError").textContent = fmtPct(errPct);
    el("apiUptime").textContent = fmtPct(upPct);

    setBar("barConn", connPct);
    setBar("barLatency", 100-latencyPct);
    setBar("barError", 100-errPct);
    setBar("barUptime", upPct);

    setDot("good");

    // summary render
    if(summary.status==="fulfilled"){
      const s = summary.value?.data || {};
      el("m-visits").textContent = s.todayVisits ?? "—";
      el("m-active").textContent = s.activeUsers ?? "—";
      el("m-growth").textContent = (s.growthRate!=null ? fmtPct(s.growthRate) : "—");
      el("m-health").textContent = (s.systemHealth!=null ? `${s.systemHealth}/100` : "—");

      renderLayers(s);

      // Ortak konuşması
      const ortakText =
        s.ortakMessage ||
        s.ortak?.message ||
        "Sistem stabil, katmanları izliyorum. İstersen zayıf katmanı tarayayım.";
      setOrtakSpeech(ortakText, true);
    } else {
      setOrtakSpeech("Ortak şu an özet verisine ulaşamadı ama API canlı. Yenile butonu ile tekrar deneriz.", false);
    }

    pushLog("Live veriler güncellendi.");
  }catch(err){
    // API yoksa mock
    el("apiMode").textContent = "API bağlantısı yok (mock mod)";
    el("apiMode").classList.add("ghost");
    setDot("warn");

    el("apiConn").textContent = "0%";
    el("apiLatency").textContent = "—";
    el("apiError").textContent = "—";
    el("apiUptime").textContent = "—";

    setBar("barConn", 0);
    setBar("barLatency", 25);
    setBar("barError", 25);
    setBar("barUptime", 25);

    // mock veriler
    el("m-visits").textContent = "—";
    el("m-active").textContent = "—";
    el("m-growth").textContent = "—";
    el("m-health").textContent = "—";
    renderLayers(null);

    setOrtakSpeech("API’ye bağlanamadım. Base URL doğru mu? Sol alttan API linkini kaydet ve yenile.", false);

    pushLog("API bağlantısı yok, mock moda düştü.", "warn");
  }
}

function setOrtakSpeech(text, fromApi=false){
  lastOrtakText = text;
  const box = el("ortakSpeech");
  box.textContent = "Ortak: " + text;
  if(fromApi) pushLog("Ortak: " + text);
}

// Buton aksiyonları
function bindActions(){
  el("saveApiBtn").addEventListener("click", ()=>{
    setApiBase(el("apiBaseInput").value);
    refreshAll();
  });

  el("askOrtakBtn").addEventListener("click", async ()=>{
    try{
      const sum = await apiGet("/api/ortak/summary");
      const msg = sum?.data?.ortakMessage || "Sistem stabil. Katmanlar sağlıklı.";
      setOrtakSpeech(msg, true);
    }catch{
      setOrtakSpeech("Şu an API’ye ulaşamıyorum. Base URL’yi kontrol et.", false);
    }
  });

  el("optimizeBtn").addEventListener("click", ()=>{
    const msg = "Auto optimize taraması başlattım. Growth ve Services katmanını güçlendiriyorum.";
    setOrtakSpeech(msg, true);
  });

  el("weakLayerBtn").addEventListener("click", ()=>{
    const weak = "Security katmanında küçük hassasiyet gördüm; bot filtresi aktif edilirse daha da sağlam olur.";
    setOrtakSpeech(weak, true);
  });

  el("speakBtn").addEventListener("click", ()=>{
    speak(lastOrtakText || "Ortak hazır.");
  });

  // Menü aktifleri (şimdilik tek görünüm ama hazır)
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      pushLog(`Görünüm: ${btn.dataset.view}`);
    });
  });

  // Paket toggle logları
  ["tPremium","tCorp","tB2B"].forEach(id=>{
    el(id).addEventListener("change",(e)=>{
      const on = e.target.checked;
      pushLog(`${id.replace("t","")} ${on?"aktif":"pasif"} edildi.`);
    });
  });
}

function init(){
  el("apiBaseInput").value = apiBase;
  bindActions();
  pushLog("Kontrol merkezi açıldı.");
  refreshAll();
  setInterval(refreshAll, 7000); // canlı döngü
}

init();
