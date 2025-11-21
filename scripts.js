/* ===========================
   InflowAI Kontrol Merkezi UI
   - Ortak API ile konuşur
   - Özellikleri AÇ/KAPAT eder
   - Komut çalıştırır
   - Hata vermez (array/obj farkı tolere)
   =========================== */

// UI başka domain’deyse Render adresini buraya yaz:
// const API_BASE = "https://inflowai-api.onrender.com";
const API_BASE = ""; // aynı domain / proxy ise boş bırak

const state = {
  apiOnline: false,
  featuresConfig: null,
  summary: null,
  logs: [],
  featureStates: loadFeatureStates(),
  notes: localStorage.getItem("inflowai_notes") || "",
  infinityArchive: JSON.parse(localStorage.getItem("inflowai_archive") || "[]"),
};

// ---------- Helpers ----------
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function safeArray(x){
  if (Array.isArray(x)) return x;
  if (!x) return [];
  if (typeof x === "object") return Object.values(x);
  return [];
}

function num(v, def=0){
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function pctClamp(v){
  const n = num(v, 0);
  return Math.max(0, Math.min(100, n));
}

function formatPct(v){
  return `${num(v,0).toFixed(1)}%`;
}

function formatMs(v){
  return `${Math.round(num(v,0))} ms`;
}

function nowTime(){
  return new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function addLog(tag, msg){
  state.logs.unshift({ tag, msg, time: nowTime() });
  state.logs = state.logs.slice(0, 50);
  renderLogs();
}

function saveFeatureStates(){
  localStorage.setItem("inflowai_features", JSON.stringify(state.featureStates));
}

function loadFeatureStates(){
  try { return JSON.parse(localStorage.getItem("inflowai_features") || "{}"); }
  catch { return {}; }
}

function setApiDot(ok){
  const dot = $("#apiDot");
  dot.classList.remove("good","bad");
  dot.classList.add(ok ? "good" : "bad");
  $("#apiEnvText").textContent = ok
    ? "API bağlantısı aktif"
    : "API bağlantısı yok (mock mod)";
}

// ---------- API ----------
async function apiGet(path){
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { headers:{ "Accept":"application/json" } });
  if(!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}

async function apiPost(path, body){
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Accept":"application/json" },
    body: JSON.stringify(body || {})
  });
  if(!r.ok) throw new Error(`POST ${path} ${r.status}`);
  return r.json();
}

// ---------- Navigation ----------
function setupTabs(){
  $all(".nav-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      $all(".nav-item").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      $all(".tab").forEach(t=>t.classList.remove("active"));
      $(`#tab-${tab}`).classList.add("active");

      const titleMap = {
        overview:"Genel Bakış",
        core:"Core (Beyin)",
        growth:"Growth",
        services:"Services",
        sharing:"Sharing",
        security:"Security",
        updating:"Updating",
        commands:"Komutlar",
        monetization:"Monetization",
        infinity:"Sonsuzluk Merkezi"
      };

      $("#pageTitle").textContent = titleMap[tab] || "Kontrol Merkezi";
      $("#pageHint").textContent =
        tab==="overview" ? "Tüm katmanları buradan izleyip yönetebilirsin." :
        tab==="commands" ? "Ortak'a komut gönder, anında cevap al." :
        tab==="infinity" ? "Platformun hayat sigortası: tüm veri ve geçmiş burada." :
        "Bu katmanı Ortak motoru ile yönetiyorsun.";
    });
  });

  $("#openCommandsBtn").addEventListener("click", ()=>{
    document.querySelector('[data-tab="commands"]').click();
  });
}

// ---------- Render Overview ----------
function renderSummary(){
  const s = state.summary;
  if(!s){
    $("#ortakSummary").textContent = "Ortak özeti alınamadı.";
    return;
  }

  $("#trafficValue").textContent = num(s.metrics?.traffic, 0);
  $("#activeValue").textContent = num(s.metrics?.activeUsers, 0);
  $("#growthValue").textContent = formatPct(s.metrics?.growthRate);

  $("#globalHealth").textContent = num(s.healthScore ?? s.globalHealth, 0);
  $("#moodValue").textContent = s.mood || "-";

  $("#ortakSummary").textContent = s.summary || "Ortak özet üretmedi.";

  // Sağlık barları
  const uptime = pctClamp(s.metrics?.uptime);
  const errorRate = pctClamp(s.metrics?.errorRate * 10); // hızlandırılmış görsel
  const latency = pctClamp(100 - (num(s.metrics?.apiLatency, 0) / 10)); // ms -> % yaklaşık
  const apiHealth = pctClamp(uptime - errorRate/2);

  $("#uptimeVal").textContent = formatPct(uptime);
  $("#errorVal").textContent = formatPct(num(s.metrics?.errorRate,0));
  $("#latencyVal").textContent = formatMs(num(s.metrics?.apiLatency,0));
  $("#apiHealthVal").textContent = formatPct(apiHealth);

  $("#uptimeBar").style.width = `${uptime}%`;
  $("#errorBar").style.width = `${errorRate}%`;
  $("#latencyBar").style.width = `${latency}%`;
  $("#apiHealthBar").style.width = `${apiHealth}%`;

  addLog("summary", `Ortak modu: ${s.mood} | Sağlık: ${$("#globalHealth").textContent}/100`);
}

function renderLogs(){
  const list = $("#logList");
  list.innerHTML = "";
  state.logs.forEach(l=>{
    const div = document.createElement("div");
    div.className = "log-item";
    div.innerHTML = `
      <div class="log-left">
        <div class="log-tag">${l.tag}</div>
        <div class="log-msg">${l.msg}</div>
      </div>
      <div class="log-time">${l.time}</div>
    `;
    list.appendChild(div);
  });
}

// ---------- Render Core Info ----------
function renderCore(){
  const cfg = state.featuresConfig;
  if(!cfg) return;

  $("#apiVersion").textContent = `API v${cfg.version || "?"}`;

  const goals = safeArray(cfg.strategicGoals);
  $("#strategicGoals").innerHTML = goals.map(g=>`<li>${g}</li>`).join("");

  const modes = safeArray(cfg.modes);
  const modesWrap = $("#modesList");
  modesWrap.innerHTML = "";
  modes.forEach(m=>{
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = m;
    chip.onclick = ()=> chip.classList.toggle("active");
    modesWrap.appendChild(chip);
  });

  // Metrics
  const tracked = cfg.trackedMetrics || {};
  const metricEntries = Object.entries(tracked);
  const grid = $("#metricsGrid");
  grid.innerHTML = "";

  metricEntries.forEach(([key, val])=>{
    const ideal = val.idealRange || {};
    const desc = val.description || key;

    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `
      <div class="metric-name">${key}</div>
      <div class="metric-desc">${desc}</div>
      <div class="metric-range">
        ideal: ${JSON.stringify(ideal)}
      </div>
      <div class="metric-score muted">Skor: API / analyze ile gelir</div>
    `;
    grid.appendChild(card);
  });
}

// ---------- Feature Switch Rendering ----------
function toFeatureList(cfg){
  // actionTemplates bir obje olabilir -> values
  const templates = safeArray(cfg.actionTemplates);
  const byLayer = {
    growth: [],
    services: [],
    sharing: [],
    security: [],
    updating: [],
    monetization: [],
  };

  templates.forEach(t=>{
    const layer = (t.layer || t.category || "growth").toLowerCase();
    if(byLayer[layer]) byLayer[layer].push(t);
    else byLayer.growth.push(t);
  });

  // Eğer actionTemplates boşsa fallback
  if(templates.length===0){
    byLayer.growth.push({
      id:"growth_ab_tests",
      title:"A/B Testleri",
      description:"Landing ve içerik akışını optimize eder.",
      layer:"growth"
    });
    byLayer.security.push({
      id:"security_rate_limit",
      title:"Rate Limit",
      description:"Spam/bot trafiğini düşürür.",
      layer:"security"
    });
    byLayer.monetization.push({
      id:"premium_signals",
      title:"Premium Sinyal Toplama",
      description:"Premium ve Kurumsal paketler için sinyal toplar.",
      layer:"monetization"
    });
  }

  return byLayer;
}

function renderFeatures(){
  const cfg = state.featuresConfig;
  if(!cfg) return;

  const byLayer = toFeatureList(cfg);

  renderLayerFeatures("growthFeatures", byLayer.growth, "growth");
  renderLayerFeatures("servicesFeatures", byLayer.services, "services");
  renderLayerFeatures("sharingFeatures", byLayer.sharing, "sharing");
  renderLayerFeatures("securityFeatures", byLayer.security, "security");
  renderLayerFeatures("updatingFeatures", byLayer.updating, "updating");
  renderLayerFeatures("monetizationFeatures", byLayer.monetization, "monetization");

  // Komut template listesi
  const tWrap = $("#commandTemplates");
  tWrap.innerHTML = "";
  safeArray(cfg.actionTemplates).forEach(t=>{
    const div = document.createElement("div");
    div.className = "template";
    const code = t.command || t.id || t.title || "ortak analyze";
    div.innerHTML = `
      <div class="template-title">${t.title || t.id || "Komut"}</div>
      <div class="muted">${t.description || ""}</div>
      <div class="template-code">${code}</div>
      <button class="btn small" data-code="${code}">Konsola Yaz</button>
    `;
    div.querySelector("button").onclick = ()=>{
      $("#commandInput").value = code;
      addLog("command", `Template konsola yazıldı: ${code}`);
    };
    tWrap.appendChild(div);
  });

  // Katman kısayolları
  const shortcuts = $("#layerShortcuts");
  shortcuts.innerHTML = "";
  ["overview","core","growth","services","sharing","security","updating","monetization","infinity"]
    .forEach(k=>{
      const c = document.createElement("div");
      c.className="chip";
      c.textContent=k;
      c.onclick=()=> document.querySelector(`[data-tab="${k}"]`).click();
      shortcuts.appendChild(c);
    });
}

function renderLayerFeatures(containerId, list, layerName){
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = "";

  safeArray(list).forEach((f, idx)=>{
    const id = f.id || `${layerName}_${idx}`;
    const title = f.title || id;
    const desc = f.description || f.desc || "Açıldığında Ortak bu özelliği aktif eder.";
    const tags = safeArray(f.tags);

    if(state.featureStates[id] == null){
      state.featureStates[id] = false;
    }

    const card = document.createElement("div");
    card.className = "feature-card";
    card.innerHTML = `
      <div class="feature-head">
        <div>
          <div class="feature-title">${title}</div>
          <div class="feature-meta">
            <span class="badge">${layerName}</span>
            <span class="badge">${id}</span>
            ${tags.map(t=>`<span class="badge">${t}</span>`).join("")}
          </div>
        </div>
        <div style="display:grid;gap:4px;justify-items:end">
          <div class="switch ${state.featureStates[id] ? "on":""}" data-id="${id}"></div>
          <div class="switch-label">${state.featureStates[id] ? "Açık":"Kapalı"}</div>
        </div>
      </div>
      <div class="feature-desc">${desc}</div>
    `;

    const sw = card.querySelector(".switch");
    const label = card.querySelector(".switch-label");
    sw.onclick = ()=>{
      const on = !state.featureStates[id];
      state.featureStates[id] = on;
      sw.classList.toggle("on", on);
      label.textContent = on ? "Açık" : "Kapalı";
      saveFeatureStates();
      addLog("feature", `${title} => ${on ? "Açıldı":"Kapandı"}`);
      pushInfinityArchive({
        type:"feature_toggle",
        id, title, on, time:new Date().toISOString()
      });
    };

    wrap.appendChild(card);
  });
}

// ---------- Commands ----------
function setupCommands(){
  $("#runCommandBtn").onclick = runCommand;
  $("#clearCommandBtn").onclick = ()=>{
    $("#commandInput").value = "";
    $("#commandOutput").textContent = "";
  };
}

async function runCommand(){
  const text = $("#commandInput").value.trim();
  if(!text){
    $("#commandOutput").textContent = "Komut boş.";
    return;
  }

  addLog("command", `Çalıştırıldı: ${text}`);

  // Basit komut parser: "analyze key=val key=val"
  const parts = text.split(/\s+/);
  const head = parts[0].toLowerCase();

  let payload = {};
  parts.slice(1).forEach(p=>{
    const [k,v] = p.split("=");
    if(!k) return;
    payload[k] = isNaN(v) ? v : Number(v);
  });

  try{
    let data;
    if(head.includes("analyze")){
      const res = await apiPost("/api/ortak/analyze", payload);
      data = res.data || res;
      $("#commandOutput").textContent = JSON.stringify(data, null, 2);
      state.summary = data; // istersen anlık özet gibi de kullan
    }else if(head.includes("summary")){
      const res = await apiGet("/api/ortak/summary");
      data = res.data || res;
      $("#commandOutput").textContent = JSON.stringify(data, null, 2);
      state.summary = data;
      renderSummary();
    }else if(head.includes("features")){
      const res = await apiGet("/api/ortak/features");
      data = res.data || res;
      $("#commandOutput").textContent = JSON.stringify(data, null, 2);
      state.featuresConfig = data;
      renderCore();
      renderFeatures();
    }else{
      // default analyze
      const res = await apiPost("/api/ortak/analyze", payload);
      data = res.data || res;
      $("#commandOutput").textContent = JSON.stringify(data, null, 2);
    }
  }catch(e){
    $("#commandOutput").textContent = `Hata: ${e.message}\nMock mod ile devam edebilirsin.`;
    addLog("error", e.message);
  }
}

// ---------- Infinity Center ----------
function setupInfinity(){
  $("#systemNotes").value = state.notes;

  $("#saveNotesBtn").onclick = ()=>{
    state.notes = $("#systemNotes").value;
    localStorage.setItem("inflowai_notes", state.notes);
    addLog("infinity", "Notlar kaydedildi.");
    pushInfinityArchive({ type:"note_save", note: state.notes, time:new Date().toISOString() });
  };

  $("#clearNotesBtn").onclick = ()=>{
    $("#systemNotes").value = "";
    state.notes = "";
    localStorage.setItem("inflowai_notes", "");
    addLog("infinity", "Notlar temizlendi.");
  };

  renderInfinityArchive();
}

function pushInfinityArchive(item){
  state.infinityArchive.unshift(item);
  state.infinityArchive = state.infinityArchive.slice(0, 200);
  localStorage.setItem("inflowai_archive", JSON.stringify(state.infinityArchive));
  renderInfinityArchive();
}

function renderInfinityArchive(){
  const wrap = $("#infinityArchive");
  wrap.innerHTML = "";
  state.infinityArchive.forEach(a=>{
    const div = document.createElement("div");
    div.className = "archive-item";
    div.textContent = `${a.time || ""} | ${a.type} | ${a.title || a.id || ""} ${a.on!=null?("=> "+(a.on?"Açık":"Kapalı")):""}`;
    wrap.appendChild(div);
  });
}

// ---------- Data Load ----------
async function loadAll(){
  // 1) Status check
  try{
    await apiGet("/api/status");
    state.apiOnline = true;
  }catch{
    state.apiOnline = false;
  }
  setApiDot(state.apiOnline);

  // 2) Features config
  if(state.apiOnline){
    try{
      const f = await apiGet("/api/ortak/features");
      state.featuresConfig = f.data || f;
      renderCore();
      renderFeatures();
      addLog("api", "Features config alındı.");
    }catch(e){
      addLog("error", "Features alınamadı, mock mod.");
      state.featuresConfig = mockFeatures();
      renderCore(); renderFeatures();
    }
  }else{
    state.featuresConfig = mockFeatures();
    renderCore(); renderFeatures();
  }

  // 3) Summary
  await loadSummary();
}

async function loadSummary(){
  if(state.apiOnline){
    try{
      const s = await apiGet("/api/ortak/summary");
      state.summary = s.data || s;
      renderSummary();
      return;
    }catch(e){
      addLog("error", "Summary alınamadı, mock mod.");
    }
  }
  state.summary = mockSummary();
  renderSummary();
}

// ---------- Mock fallback ----------
function mockFeatures(){
  return {
    version:"mock",
    lastUpdated:new Date().toISOString(),
    strategicGoals:[
      "Platform büyümesini sürdürülebilir artır",
      "Premium / Kurumsal / B2B sinyallerini topla",
      "Uptime ve performansı stabil tut",
      "Spam/bot trafiğini filtrele",
      "Veri kaybını sıfıra indir (Sonsuzluk Merkezi)"
    ],
    modes:["Sakin","Kararlı","Heyecanlı","Dikkatli"],
    trackedMetrics:{
      traffic:{description:"15 dakikada ziyaretçi"},
      activeUsers:{description:"Anlık tahmini aktif kullanıcı"},
      growthRate:{description:"Günlük büyüme %"},
      uptime:{description:"Sistem uptime %"},
      errorRate:{description:"Hata oranı %"},
      apiLatency:{description:"API gecikmesi ms"},
    },
    actionTemplates:[
      {id:"growth_ab_tests", title:"A/B Testleri", description:"Landing ve içerik akışını optimize eder.", layer:"growth"},
      {id:"growth_premium_signals", title:"Premium Sinyal Toplama", description:"Premium/Kurumsal geçiş sinyali toplar.", layer:"growth"},
      {id:"services_cache", title:"Cache Katmanı", description:"API gecikmesini düşürür.", layer:"services"},
      {id:"sharing_autoshare", title:"Otomatik Paylaşım", description:"İçerikleri platformlara dağıtır.", layer:"sharing"},
      {id:"security_rate_limit", title:"Rate Limit / Anti-Spam", description:"Bot trafiğini engeller.", layer:"security"},
      {id:"updating_self_heal", title:"Self-Heal", description:"Hata görünce sistemi toparlar.", layer:"updating"},
      {id:"monetization_paywall", title:"Paywall / Paket Geçişi", description:"Premium ekranlarını yönetir.", layer:"monetization"}
    ]
  };
}

function mockSummary(){
  return {
    mood:"Kararlı",
    summary:"Mock mod: API kapalı ama Ortak çekirdeği stabil. Büyüme sağlıklı, Premium sinyallerine devam.",
    healthScore:81,
    mainActionHint:"Büyüme sağlıklı: Premium ve Kurumsal paketler için sinyal toplamaya devam et.",
    allActions:[
      "Büyüme sağlıklı: Premium ve Kurumsal paketler için sinyal toplamaya devam et.",
      "Her şey stabil görünüyor."
    ],
    metrics:{
      traffic:120,
      activeUsers:90,
      growthRate:3.4,
      uptime:99.2,
      errorRate:0.7,
      apiLatency:420
    },
    scores:{}
  };
}

// ---------- Bindings ----------
function setupButtons(){
  $("#refreshBtn").onclick = loadAll;

  let live = false;
  let liveTimer = null;
  $("#liveBtn").onclick = ()=>{
    live = !live;
    $("#liveBtn").textContent = live ? "Live: Açık" : "Live";
    $("#liveBtn").classList.toggle("ghost", !live);

    if(live){
      liveTimer = setInterval(loadSummary, 5000);
      addLog("live", "Live izleme açıldı (5sn).");
    }else{
      clearInterval(liveTimer);
      addLog("live", "Live izleme kapandı.");
    }
  };

  $("#analyzeNowBtn").onclick = async ()=>{
    try{
      const res = await apiPost("/api/ortak/analyze", {});
      state.summary = res.data || res;
      renderSummary();
      addLog("analyze", "Anlık analiz yapıldı.");
    }catch(e){
      addLog("error", e.message);
      state.summary = mockSummary();
      renderSummary();
    }
  };
}

// ---------- Init ----------
function init(){
  setupTabs();
  setupCommands();
  setupInfinity();
  setupButtons();
  loadAll();
  addLog("ui", "Kontrol Merkezi başlatıldı.");
}

document.addEventListener("DOMContentLoaded", init);
