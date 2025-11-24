/* InflowAI Control Center UI v1.1 */

const API_BASE_LIVE = "https://inflowai-api.onrender.com";
const STORAGE_MODE_KEY = "inflowai_mode";
const STORAGE_SECTION_KEY = "inflowai_section";

let mode = localStorage.getItem(STORAGE_MODE_KEY) || "live"; // live | mock
let apiOnline = false;
let cachedSummary = null;
let cachedFeatures = null;

// DOM
const apiDot = document.getElementById("apiDot");
const apiTitle = document.getElementById("apiTitle");
const apiSub = document.getElementById("apiSub");
const chatDot = document.getElementById("chatDot");

const refreshBtn = document.getElementById("refreshBtn");
const toggleModeBtn = document.getElementById("toggleModeBtn");
const menu = document.getElementById("menu");
const content = document.getElementById("content");

const pageTitle = document.getElementById("pageTitle");
const pageDesc = document.getElementById("pageDesc");
const clockEl = document.getElementById("clock");

// Overview DOM
const visitToday = document.getElementById("visitToday");
const activeUsers = document.getElementById("activeUsers");
const growthRate = document.getElementById("growthRate");
const healthList = document.getElementById("healthList");
const ortakSummaryBox = document.getElementById("ortakSummaryBox");
const logList = document.getElementById("logList");

// Other sections
const corePills = document.getElementById("corePills");
const growthGrid = document.getElementById("growthGrid");
const servicesGrid = document.getElementById("servicesGrid");

// Commands
const cmdInput = document.getElementById("cmdInput");
const cmdSendBtn = document.getElementById("cmdSendBtn");
const cmdResult = document.getElementById("cmdResult");

// Chat DOM
const ortakModal = document.getElementById("ortakModal");
const ortakOpenBtn = document.getElementById("ortakOpenBtn");
const ortakCloseBtn = document.getElementById("ortakCloseBtn");
const ortakCloseBackdrop = document.getElementById("ortakCloseBackdrop");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

// Utils
const nowTR = () => new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

function setClock(){
  clockEl.textContent = nowTR();
}
setInterval(setClock, 1000);
setClock();

function setMode(next){
  mode = next;
  localStorage.setItem(STORAGE_MODE_KEY, mode);
  renderModeUI();
  loadAll();
}

function renderModeUI(){
  const live = mode === "live";
  toggleModeBtn.textContent = live ? "Live (Aktif)" : "Mock (Aktif)";
  toggleModeBtn.classList.toggle("btn-solid", live);
  toggleModeBtn.classList.toggle("btn-ghost", !live);
}

// Fetch wrapper
async function apiFetch(path, options={}){
  if(mode !== "live"){
    throw new Error("mock-mode");
  }
  const url = API_BASE_LIVE + path;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
  if(!res.ok) throw new Error("api-error");
  return res.json();
}

// Health + mock data
function getMockSummary(){
  return {
    visitsToday: 120,
    activeUsers: 90,
    growthRate: 3.4,
    health: [
      {name:"API Çalışma", value: 96},
      {name:"Ortalama Gecikme", value: 420},
      {name:"Hata Oranı", value: 0.7},
      {name:"Uptime", value: 99.7},
    ],
    ortakText: "Mock moddasın. API kapalıysa bile panel çalışır. Live’a alınca gerçek veriler akar.",
    logs: [
      "Ortak motoru hazır: Mock starter.",
      "Core çekirdeği stabil.",
      "Growth izleme modu açık."
    ],
    coreTags:["Karar Motoru","Görev Kuyruğu","Özet Üretim","Kural Sistemi"],
    growthCards:[
      {title:"Son 24s Trafik", value:"+%28"},
      {title:"Yeni Kayıt", value:"56"},
      {title:"Retention", value:"%62"},
      {title:"Hedefler", value:"3/7"}
    ],
    servicesCards:[
      {title:"Asistan Servisi", value:"Running"},
      {title:"Analytics Servisi", value:"Idle"},
      {title:"Sharing Servisi", value:"Ready"},
      {title:"Security Servisi", value:"Guard"}
    ]
  };
}

async function checkApi(){
  if(mode !== "live"){
    apiOnline = false;
    setApiUI("warn","Mock mod aktif","API çağrıları kapalı");
    return;
  }
  try{
    const status = await apiFetch("/api/status");
    apiOnline = status?.status === "ok";
    setApiUI("good","API bağlantısı aktif (live)", status?.message || "Render API");
  }catch(e){
    apiOnline = false;
    setApiUI("bad","API bağlantısı yok","Otomatik Mock’a düşüldü");
    mode = "mock";
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    renderModeUI();
  }
}

function setApiUI(type,title,sub){
  apiDot.className = "dot " + type;
  chatDot.className = "dot lg " + type;
  apiTitle.textContent = title;
  apiSub.textContent = sub;
}

// Loaders
async function loadSummary(){
  if(mode === "mock"){
    cachedSummary = getMockSummary();
    return cachedSummary;
  }
  const data = await apiFetch("/api/ortak/summary");
  // backend summary formatını koruyup UI'ya map ediyoruz:
  const s = data?.data || {};
  cachedSummary = {
    visitsToday: s.visitsToday ?? 0,
    activeUsers: s.activeUsers ?? 0,
    growthRate: s.growthRate ?? 0,
    health: s.health ?? [],
    ortakText: s.ortakText ?? "Ortak motoru canlı.",
    logs: s.logs ?? [],
    coreTags: s.coreTags ?? ["Karar Motoru","Görev Sistemi"],
    growthCards: s.growthCards ?? [],
    servicesCards: s.servicesCards ?? []
  };
  return cachedSummary;
}

async function loadFeatures(){
  if(mode === "mock"){
    cachedFeatures = {
      core:["Karar Motoru","Özet Üretimi","Otomasyon"],
      growth:["Trafik İzleme","Retention"],
      security:["Firewall","Rate Limit"]
    };
    return cachedFeatures;
  }
  const data = await apiFetch("/api/ortak/features");
  cachedFeatures = data?.data || {};
  return cachedFeatures;
}

function renderOverview(summary){
  visitToday.textContent = summary.visitsToday ?? "--";
  activeUsers.textContent = summary.activeUsers ?? "--";
  growthRate.textContent = (summary.growthRate ?? "--") + "%";

  healthList.innerHTML = "";
  (summary.health || []).forEach(h=>{
    const item = document.createElement("div");
    item.className = "health-item";
    const val = h.value ?? 0;
    const pct = Math.max(0, Math.min(100, val));
    item.innerHTML = `
      <div>${h.name}</div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div>${val}${h.name.includes("Gecikme") ? "ms" : "%"}</div>
    `;
    healthList.appendChild(item);
  });

  ortakSummaryBox.textContent = summary.ortakText || "--";

  logList.innerHTML = "";
  (summary.logs || []).slice(0,6).forEach(l=>{
    const li = document.createElement("li");
    li.textContent = "• " + l;
    logList.appendChild(li);
  });

  corePills.innerHTML = "";
  (summary.coreTags || []).forEach(t=>{
    const p = document.createElement("div");
    p.className="pill";
    p.textContent=t;
    corePills.appendChild(p);
  });

  growthGrid.innerHTML="";
  (summary.growthCards||[]).forEach(c=>{
    const el=document.createElement("div");
    el.className="card";
    el.innerHTML=`<div class="card-title">${c.title}</div><div class="big-number">${c.value}</div>`;
    growthGrid.appendChild(el);
  });

  servicesGrid.innerHTML="";
  (summary.servicesCards||[]).forEach(c=>{
    const el=document.createElement("div");
    el.className="card";
    el.innerHTML=`<div class="card-title">${c.title}</div><div class="big-number">${c.value}</div>`;
    servicesGrid.appendChild(el);
  });
}

async function loadAll(){
  await checkApi();
  const summary = await loadSummary();
  await loadFeatures();
  renderOverview(summary);
}

// Navigation
const sectionMeta = {
  overview: {t:"Genel Bakış", d:"Tüm katmanları buradan izleyip yönetebilirsin."},
  core: {t:"Core (Beyin)", d:"Karar, analiz ve otomasyon çekirdeği."},
  growth: {t:"Growth", d:"Büyüme ve analitik kontrol alanı."},
  services: {t:"Services", d:"Servis sağlığı ve orkestrasyon."},
  sharing: {t:"Sharing", d:"Paylaşım ve dağıtım otomasyonları."},
  security: {t:"Security", d:"Güvenlik ve koruma katmanı."},
  updating: {t:"Updating", d:"Versiyon ve güncelleme yönetimi."},
  commands: {t:"Komutlar", d:"Ortak’a canlı komut gönder."},
  monetization: {t:"Monetization", d:"Gelir ve ödeme katmanı."},
  infinity: {t:"Sonsuzluk Merkezi", d:"Sınırsız bellek ve acil destek çekirdeği."},
  users: {t:"Users", d:"Kullanıcılar ve segmentler."}
};

function showSection(key){
  localStorage.setItem(STORAGE_SECTION_KEY, key);

  document.querySelectorAll(".menu-item").forEach(b=>{
    b.classList.toggle("active", b.dataset.section === key);
  });
  document.querySelectorAll("[data-view]").forEach(v=>{
    v.classList.toggle("hidden", v.dataset.view !== key);
  });

  pageTitle.textContent = sectionMeta[key]?.t || key;
  pageDesc.textContent  = sectionMeta[key]?.d || "";
}

menu.addEventListener("click",(e)=>{
  const btn = e.target.closest(".menu-item");
  if(!btn) return;
  showSection(btn.dataset.section);
});

// Commands
cmdSendBtn.addEventListener("click", async ()=>{
  const cmd = (cmdInput.value||"").trim();
  if(!cmd){
    cmdResult.textContent = "Komut boş.";
    return;
  }
  cmdResult.textContent = "Ortak komutu işliyor...";
  await sleep(300);

  if(mode==="mock" || !apiOnline){
    cmdResult.textContent = `Mock yanıtı: "${cmd}" komutu sıraya eklendi.`;
    cmdInput.value="";
    return;
  }

  // basit analiz endpointiyle tetik:
  try{
    const res = await apiFetch("/api/ortak/analyze",{
      method:"POST",
      body: JSON.stringify({ command: cmd, from:"control-center" })
    });
    cmdResult.textContent = "Live yanıtı: " + (res?.data?.message || "Komut alındı.");
  }catch{
    cmdResult.textContent = "Live hata. Mock’a geçebilirsin.";
  }
  cmdInput.value="";
});

// --- ORTAK CHAT ---
function addMsg(text, who="ai"){
  const div=document.createElement("div");
  div.className="msg " + who;
  div.innerHTML = `${text}<span class="meta">${nowTR()}</span>`;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function openChat(){
  ortakModal.classList.remove("hidden");
  chatBody.innerHTML="";
  addMsg(`Selam Kadir. Ben Ortak Motoru. 
  ${mode==="live" && apiOnline ? "LIVE bağlıyım, gerçek veriyi okuyorum." : "Şu an MOCK moddayım, ama paneli yine yönetiriz."}
  Ne yapmak istersin?`, "ai");
  if(cachedSummary){
    addMsg(`Hızlı durum:
    • Ziyaret: ${cachedSummary.visitsToday}
    • Aktif: ${cachedSummary.activeUsers}
    • Büyüme: %${cachedSummary.growthRate}`, "ai");
  }
  chatInput.focus();
}

function closeChat(){
  ortakModal.classList.add("hidden");
}

ortakOpenBtn.addEventListener("click", openChat);
ortakCloseBtn.addEventListener("click", closeChat);
ortakCloseBackdrop.addEventListener("click", closeChat);

async function ortakReply(userText){
  const t = userText.toLowerCase();

  // niyet algısı (basit)
  if(t.includes("durum") || t.includes("özet") || t.includes("sistem")){
    if(mode==="live" && apiOnline){
      try{
        const s = await loadSummary();
        renderOverview(s);
        return `Canlı özet:
        Ziyaret ${s.visitsToday}, Aktif ${s.activeUsers}, Büyüme %${s.growthRate}. 
        Sağlık: ${ (s.health||[]).map(x=>x.name+" "+x.value).join(" / ") }`;
      }catch{
        return "Canlı özet çekemedim. Mock moduna alıp devam edebiliriz.";
      }
    }else{
      const s = cachedSummary || getMockSummary();
      return `Mock özet:
      Ziyaret ${s.visitsToday}, Aktif ${s.activeUsers}, Büyüme %${s.growthRate}.`;
    }
  }

  if(t.includes("live") || t.includes("mock")){
    return `Mod şu an: ${mode.toUpperCase()}. İstersen soldaki Live/Mock düğmesiyle değiştir.`;
  }

  if(t.includes("core") || t.includes("beyin")){
    return "Core katmanı canlı. İstersen Core sekmesinden detayları açalım, hedef kural seti tanımlayalım.";
  }

  if(t.includes("growth") || t.includes("büyüme")){
    return "Growth’ta şu an trend yukarı. İstersen hedef KPI’ları kilitleyip otomatik rapor açayım.";
  }

  // genel cevap
  return `Anladım. "${userText}" konusunu kaydettim. 
  İstersen bunu bir komuta çevirip katmanlara dağıtabilirim. Ne yönde ilerleyelim?`;
}

async function sendChat(){
  const userText=(chatInput.value||"").trim();
  if(!userText) return;
  addMsg(userText,"user");
  chatInput.value="";

  // typing efekti
  const typing=document.createElement("div");
  typing.className="msg ai";
  typing.textContent="Ortak düşünüyor...";
  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;

  await sleep(350);

  typing.remove();
  const reply = await ortakReply(userText);
  addMsg(reply,"ai");
}

chatSendBtn.addEventListener("click", sendChat);
chatInput.addEventListener("keydown",(e)=>{
  if(e.key==="Enter") sendChat();
});

// Buttons
refreshBtn.addEventListener("click", loadAll);
toggleModeBtn.addEventListener("click", ()=>{
  setMode(mode==="live" ? "mock" : "live");
});

// Init
(function init(){
  renderModeUI();
  loadAll();
  const lastSection = localStorage.getItem(STORAGE_SECTION_KEY) || "overview";
  showSection(lastSection);
})();
