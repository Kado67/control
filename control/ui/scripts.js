(() => {
  // ==============================
  // InflowAI Control Center JS
  // API: Render -> https://inflowai-api.onrender.com
  // Eğer API yoksa mock mod çalışır.
  // ==============================

  const DEFAULT_API = "https://inflowai-api.onrender.com";
  const API_BASE = (window.__API_BASE__ || DEFAULT_API).replace(/\/+$/, "");

  const els = {
    apiPill: document.getElementById("apiPill"),
    apiDot: document.getElementById("apiDot"),
    apiText: document.getElementById("apiText"),
    chipMode: document.getElementById("chipMode"),
    footApi: document.getElementById("footApi"),

    btnRetry: document.getElementById("btnRetry"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnLive: document.getElementById("btnLive"),
    btnAnalyze: document.getElementById("btnAnalyze"),
    btnFeatures: document.getElementById("btnFeatures"),
    btnClearLog: document.getElementById("btnClearLog"),
    btnHamburger: document.getElementById("btnHamburger"),
    sidebar: document.getElementById("sidebar"),

    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),

    mVisits: document.getElementById("mVisits"),
    mUsers: document.getElementById("mUsers"),
    mGrowth: document.getElementById("mGrowth"),

    healthBadge: document.getElementById("healthBadge"),
    bUptime: document.getElementById("bUptime"),
    bLatency: document.getElementById("bLatency"),
    bError: document.getElementById("bError"),
    bCrash: document.getElementById("bCrash"),
    bUptimeVal: document.getElementById("bUptimeVal"),
    bLatencyVal: document.getElementById("bLatencyVal"),
    bErrorVal: document.getElementById("bErrorVal"),
    bCrashVal: document.getElementById("bCrashVal"),

    ortakPing: document.getElementById("ortakPing"),
    ortakBox: document.getElementById("ortakBox"),
    logList: document.getElementById("logList"),
    featuresList: document.getElementById("featuresList"),
  };

  // ------------------ Utils ------------------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  function log(msg, type="info"){
    const li = document.createElement("li");
    li.innerHTML = `<span class="t">${now()}</span> ${msg}`;
    if(type==="ok") li.style.borderColor = "rgba(51,240,164,.35)";
    if(type==="err") li.style.borderColor = "rgba(255,92,122,.45)";
    els.logList.prepend(li);
  }

  function setApiPill(state, text){
    els.apiPill.classList.remove("ok","err");
    if(state==="ok"){
      els.apiPill.classList.add("ok");
      els.apiText.textContent = text || "API bağlı";
      els.chipMode.textContent = "API live";
      els.chipMode.classList.remove("ghost");
      els.chipMode.style.opacity = 1;
    } else if(state==="err"){
      els.apiPill.classList.add("err");
      els.apiText.textContent = text || "API bağlantısı yok (mock mod)";
      els.chipMode.textContent = "API mock";
      els.chipMode.classList.add("ghost");
    } else {
      els.apiText.textContent = text || "API kontrol ediliyor...";
    }
    els.footApi.textContent = `API: ${API_BASE}`;
  }

  async function safeFetch(path, opts={}){
    const url = API_BASE + path;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try{
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      if(!res.ok) throw new Error("HTTP "+res.status);
      return await res.json();
    }catch(e){
      clearTimeout(t);
      throw e;
    }
  }

  // ------------------ API ------------------
  async function checkApi(){
    setApiPill("wait");
    try{
      const j = await safeFetch("/api/status");
      setApiPill("ok", "API bağlı");
      log("API bağlandı: /api/status ok", "ok");
      return { ok:true, status:j };
    }catch(e){
      setApiPill("err", "API bağlantısı yok (mock mod)");
      log("API yok, mock moda geçildi. ("+ e.message +")", "err");
      return { ok:false };
    }
  }

  async function loadSummary(apiOk){
    if(apiOk){
      try{
        const j = await safeFetch("/api/ortak/summary");
        return j?.data || null;
      }catch(e){
        log("Summary çekilemedi, mock kullanılıyor. ("+e.message+")","err");
      }
    }
    // mock
    return {
      visits24h: 120,
      activeUsers: 90,
      growthRate: 3.4,
      health: {
        uptimePct: 96.2,
        latencyMs: 420,
        errorPct: 0.7,
        crashRiskPct: 0.0
      },
      ortakSpeech: "Mock mod aktif. API geldiğinde otomatik canlıya geçeceğim.",
      lastEvents: [
        "Kontrol merkezi açıldı",
        "Mock motor çalışıyor",
        "UI stabil"
      ],
      checkedAt: new Date().toISOString()
    };
  }

  async function loadFeatures(apiOk){
    if(apiOk){
      try{
        const j = await safeFetch("/api/ortak/features");
        return j?.data || [];
      }catch(e){
        log("Features çekilemedi, mock listesi gösteriliyor. ("+e.message+")","err");
      }
    }
    // mock list
    return [
      { name:"Auto-Health", desc:"Tüm katmanları gerçek zamanlı tarar." },
      { name:"OrtakEngine Route", desc:"Katmanlar arası görev paylaşımı." },
      { name:"Crisis Shield", desc:"Hata/çökme oranını kilitler." },
      { name:"Infinite Vault", desc:"Sonsuzluk merkezi veri kasası." }
    ];
  }

  async function analyzeNow(apiOk){
    if(apiOk){
      try{
        const payload = {
          visits24h: Number(els.mVisits.textContent) || 0,
          activeUsers: Number(els.mUsers.textContent) || 0,
          growthRate: parseFloat(els.mGrowth.textContent) || 0
        };
        const j = await safeFetch("/api/ortak/analyze", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify(payload)
        });
        return j?.data;
      }catch(e){
        log("Analyze başarısız, mock analiz. ("+e.message+")","err");
      }
    }
    return {
      verdict: "Kararlı",
      note: "Mock analiz: sistem dengeli, büyüme sürüyor."
    };
  }

  // ------------------ Render UI ------------------
  function renderSummary(s){
    els.mVisits.textContent = s.visits24h ?? "—";
    els.mUsers.textContent = s.activeUsers ?? "—";
    els.mGrowth.textContent = (s.growthRate ?? "—") + (typeof s.growthRate==="number" ? "%" : "");

    const h = s.health || {};
    const uptimePct = clamp(h.uptimePct ?? 90, 0, 100);
    const latencyMs = h.latencyMs ?? 500;
    const errorPct = clamp(h.errorPct ?? 0.5, 0, 100);
    const crashRisk = clamp(h.crashRiskPct ?? 0, 0, 100);

    setBar(els.bUptime, els.bUptimeVal, uptimePct, uptimePct.toFixed(1)+"%");
    const latScore = clamp(100 - (latencyMs/10), 5, 100);
    setBar(els.bLatency, els.bLatencyVal, latScore, latencyMs+" ms");
    setBar(els.bError, els.bErrorVal, 100-errorPct, errorPct.toFixed(2)+"%");
    setBar(els.bCrash, els.bCrashVal, 100-crashRisk, crashRisk.toFixed(2)+"%");

    // badge
    let badgeClass="ok", badgeText="Stabil";
    if(errorPct>2 || crashRisk>2) { badgeClass="warn"; badgeText="Dikkat"; }
    if(errorPct>5 || crashRisk>5) { badgeClass="err"; badgeText="Risk"; }
    els.healthBadge.className = "badge " + badgeClass;
    els.healthBadge.textContent = badgeText;

    els.ortakBox.textContent = s.ortakSpeech || "Ortak motoru bekleniyor…";
    els.ortakPing.textContent = "son kontrol: " + new Date(s.checkedAt || Date.now()).toLocaleTimeString("tr-TR");

    if(Array.isArray(s.lastEvents)){
      s.lastEvents.slice(0,6).forEach(ev => log(ev, "ok"));
    }
  }

  function renderFeatures(list){
    els.featuresList.innerHTML = "";
    list.forEach((f) => {
      const div = document.createElement("div");
      div.className="feature";
      div.innerHTML = `
        <div>
          <div class="name">${escapeHtml(f.name || "Feature")}</div>
          <div class="desc">${escapeHtml(f.desc || "")}</div>
        </div>
        <div class="muted">aktif</div>
      `;
      els.featuresList.appendChild(div);
    });
  }

  function setBar(elFill, elVal, pct, text){
    elFill.style.width = pct + "%";
    elVal.textContent = text;
  }

  function clamp(n,a,b){ return Math.min(b, Math.max(a,n)); }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[s]));
  }

  // ------------------ Navigation ------------------
  const pages = {
    overview: { title:"Genel Bakış", sub:"Tüm katmanları buradan izleyip yönetebilirsin." },
    core: { title:"Core (Beyin)", sub:"Beyin katmanı canlı API ile beslenecek." },
    growth: { title:"Growth", sub:"Büyüme metrikleri ve trend zekâsı." },
    services: { title:"Services", sub:"Servis durumu, bağımlılıklar, otomasyon." },
    sharing: { title:"Sharing", sub:"Paylaşım ve dağıtım katmanı." },
    security: { title:"Security", sub:"Koruma kalkanı ve güvenlik raporları." },
    updating: { title:"Updating", sub:"Kendi kendini güncelleyen yapı." },
    commands: { title:"Komutlar", sub:"Ortak engine komutları ve özellikler." },
    monetization: { title:"Monetization", sub:"Premium, B2B ve gelir sistemi." },
    infinite: { title:"Sonsuzluk Merkezi", sub:"Evren dışı veri kasası." }
  };

  function showPage(key){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("show"));
    const el = document.getElementById("page-"+key);
    if(el) el.classList.add("show");

    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelector(`.nav-item[data-page="${key}"]`)?.classList.add("active");

    els.pageTitle.textContent = pages[key]?.title || key;
    els.pageSubtitle.textContent = pages[key]?.sub || "";
    if(window.innerWidth < 980) els.sidebar.classList.remove("open");
  }

  // ------------------ Events ------------------
  function bind(){
    document.querySelectorAll(".nav-item").forEach(btn=>{
      btn.addEventListener("click", () => showPage(btn.dataset.page));
    });

    els.btnRetry.addEventListener("click", boot);
    els.btnRefresh.addEventListener("click", boot);

    els.btnFeatures.addEventListener("click", () => showPage("commands"));

    els.btnAnalyze.addEventListener("click", async () => {
      const apiOk = els.apiPill.classList.contains("ok");
      const analysis = await analyzeNow(apiOk);
      if(analysis){
        els.ortakBox.textContent =
          (analysis.verdict ? `Durum: ${analysis.verdict}\n` : "") +
          (analysis.note || JSON.stringify(analysis));
        log("Ortak analiz güncellendi.", "ok");
      }
    });

    els.btnClearLog.addEventListener("click", () => {
      els.logList.innerHTML="";
      log("Log temizlendi.");
    });

    els.btnHamburger.addEventListener("click", () => {
      els.sidebar.classList.toggle("open");
    });

    els.btnLive.addEventListener("click", () => {
      log("Live mod tetiklendi.");
      boot();
    });
  }

  // ------------------ Boot ------------------
  async function boot(){
    log("Kontrol merkezi senkron başlıyor...");
    const { ok } = await checkApi();
    const summary = await loadSummary(ok);
    renderSummary(summary);

    const features = await loadFeatures(ok);
    renderFeatures(features);

    log("Panel hazır.", "ok");
  }

  bind();
  boot();
})();
