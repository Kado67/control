(() => {
  const API_BASE = (window.__API_BASE__ || "").replace(/\/+$/, "");
  const els = {
    apiPill: document.getElementById("apiPill"),
    apiDot: document.getElementById("apiDot"),
    apiText: document.getElementById("apiText"),
    chipMode: document.getElementById("chipMode"),
    btnRetry: document.getElementById("btnRetry"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnLive: document.getElementById("btnLive"),
    btnHamburger: document.getElementById("btnHamburger"),
    sidebar: document.getElementById("sidebar"),
    pageTitle: document.getElementById("pageTitle"),
    logList: document.getElementById("logList"),
    ortakBox: document.getElementById("ortakBox"),
    healthBadge: document.getElementById("healthBadge"),

    mVisits: document.getElementById("mVisits"),
    mUsers: document.getElementById("mUsers"),
    mGrowth: document.getElementById("mGrowth"),

    bLatency: document.getElementById("bLatency"),
    bCrash: document.getElementById("bCrash"),
    bError: document.getElementById("bError"),
    bUptime: document.getElementById("bUptime"),
    bLatencyVal: document.getElementById("bLatencyVal"),
    bCrashVal: document.getElementById("bCrashVal"),
    bErrorVal: document.getElementById("bErrorVal"),
    bUptimeVal: document.getElementById("bUptimeVal"),

    layers: document.getElementById("layers"),
    btnAskOrtak: document.getElementById("btnAskOrtak"),
    btnClearLogs: document.getElementById("btnClearLogs"),
    btnLock: document.getElementById("btnLock"),
    btnEmergency: document.getElementById("btnEmergency"),
  };

  const pages = [
    { key:"overview", title:"Genel Bakış" },
    { key:"core", title:"Core (Beyin)" },
    { key:"growth", title:"Growth" },
    { key:"services", title:"Services" },
    { key:"sharing", title:"Sharing" },
    { key:"security", title:"Security" },
    { key:"updating", title:"Updating" },
    { key:"commands", title:"Komutlar" },
    { key:"monetization", title:"Monetization" },
    { key:"infinity", title:"Sonsuzluk Merkezi" },
  ];

  let apiOnline = false;

  function log(msg, type="info"){
    const li = document.createElement("li");
    li.className = "log-item";
    const tm = new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    li.innerHTML = `<span>${msg}</span><span class="log-time">${tm}</span>`;
    els.logList.prepend(li);
  }

  function setApiState(online, note=""){
    apiOnline = online;
    els.apiDot.style.background = online ? "var(--good)" : "var(--bad)";
    els.apiDot.style.color = online ? "var(--good)" : "var(--bad)";
    els.apiText.textContent = online ? "API bağlı (live)" : "API yok (mock mod)";
    if(note) els.apiText.textContent += ` • ${note}`;
    els.chipMode.textContent = online ? "API: LIVE" : "API: MOCK";
    els.healthBadge.textContent = online ? "Stabil" : "Mock Mod";
    els.healthBadge.style.borderColor = online ? "rgba(74,222,128,.4)" : "rgba(251,113,133,.4)";
  }

  async function safeFetch(path, opts={}){
    const url = API_BASE + path;
    try{
      const res = await fetch(url, { ...opts, headers:{ "Content-Type":"application/json", ...(opts.headers||{}) } });
      if(!res.ok) throw new Error(res.status);
      return await res.json();
    }catch(e){
      return null;
    }
  }

  // mock data (API yoksa kırılmasın)
  function mockSummary(){
    return {
      visits24h: 120,
      activeUsers: 90,
      growthRate: "3.4%",
      health: {
        latencyMs: 420,
        crashRate: 0.1,
        errorRate: 0.7,
        uptimePct: 99.2
      },
      ortak: [
        "Mock mod aktif. API bağlanınca canlı veriler akar.",
        "Katmanlar stabil halde.",
        "Büyüme simülasyonu devam ediyor."
      ]
    };
  }

  function renderMetrics(sum){
    els.mVisits.textContent = `${sum.visits24h ?? "—"}`;
    els.mUsers.textContent = `${sum.activeUsers ?? "—"}`;
    els.mGrowth.textContent = `${sum.growthRate ?? "—"}`;
  }

  function renderHealth(h){
    const latency = Math.min(100, Math.max(1, (h.latencyMs||400)/10)); // 0-100 scale
    const crash = Math.min(100, Math.max(1, (h.crashRate||0.2)*100));
    const error = Math.min(100, Math.max(1, (h.errorRate||0.8)*100));
    const uptime = Math.min(100, Math.max(1, (h.uptimePct||99)));

    els.bLatency.style.width = `${latency}%`;
    els.bCrash.style.width = `${crash}%`;
    els.bError.style.width = `${error}%`;
    els.bUptime.style.width = `${uptime}%`;

    els.bLatencyVal.textContent = `${h.latencyMs ?? "—"} ms`;
    els.bCrashVal.textContent = `${h.crashRate ?? "—"}%`;
    els.bErrorVal.textContent = `${h.errorRate ?? "—"}%`;
    els.bUptimeVal.textContent = `${h.uptimePct ?? "—"}%`;
  }

  function renderOrtak(lines){
    els.ortakBox.innerHTML = "";
    (lines||[]).forEach(t=>{
      const div = document.createElement("div");
      div.className = "ortak-line";
      div.textContent = t;
      els.ortakBox.appendChild(div);
    });
    if(!lines || !lines.length){
      const m = document.createElement("div");
      m.className = "ortak-muted";
      m.textContent = "Ortak sessiz. Yenile deneyebilirsin.";
      els.ortakBox.appendChild(m);
    }
  }

  function renderLayers(){
    const layerNames = [
      ["Core (Beyin)", "AI çekirdek + karar motoru"],
      ["Growth", "Kitle büyümesi & analitik"],
      ["Services", "Modüller ve servisler"],
      ["Sharing", "Sosyal/dağıtım altyapısı"],
      ["Security", "Savunma & güvenlik katmanı"],
      ["Updating", "Sürekli evrim/upgrade"],
      ["Control", "Kontrol merkezi yönetimi"],
      ["Sonsuzluk Merkezi", "Veri kasası + acil sistem"]
    ];
    els.layers.innerHTML = "";
    layerNames.forEach(([title, sub], i)=>{
      const d = document.createElement("div");
      d.className = "layer";
      d.innerHTML = `
        <div class="layer-title">${title}</div>
        <div class="layer-sub">${sub}</div>
        <div class="layer-chip">${apiOnline ? "LIVE" : "SIM"}</div>
      `;
      els.layers.appendChild(d);
    });
  }

  async function checkApi(){
    const s = await safeFetch("/api/status");
    if(s && s.status==="ok"){
      setApiState(true);
      log("API bağlandı. Canlı mod aktif.");
      return true;
    }
    setApiState(false);
    log("API yok. Mock moda geçildi.","warn");
    return false;
  }

  async function loadSummary(){
    let sum = null;
    if(apiOnline){
      const r = await safeFetch("/api/ortak/summary");
      if(r && r.status==="ok") sum = r.data;
    }
    if(!sum) sum = mockSummary();

    renderMetrics(sum);
    renderHealth(sum.health || {});
    renderOrtak(sum.ortak || []);
    renderLayers();
  }

  // NAV
  function switchPage(key){
    document.querySelectorAll(".nav-item").forEach(b=>{
      b.classList.toggle("active", b.dataset.page===key);
    });
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    const pageEl = document.getElementById(`page-${key}`);
    if(pageEl) pageEl.classList.add("active");

    const p = pages.find(x=>x.key===key);
    els.pageTitle.textContent = p ? p.title : key;
    if(key!=="overview"){
      pageEl.innerHTML = `
        <div class="card">
          <div class="card-title">${els.pageTitle.textContent}</div>
          <div class="card-sub">Bu katman şimdi UI’da hazır. İçini birlikte dolduracağız.</div>
        </div>
      `;
    }
  }

  // EVENTS
  document.querySelectorAll(".nav-item").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      switchPage(btn.dataset.page);
      if(window.innerWidth<=800) els.sidebar.classList.remove("open");
    });
  });

  els.btnHamburger?.addEventListener("click", ()=>{
    els.sidebar.classList.toggle("open");
  });

  els.btnRetry?.addEventListener("click", async ()=>{
    await checkApi();
    await loadSummary();
  });
  els.btnRefresh?.addEventListener("click", loadSummary);
  els.btnLive?.addEventListener("click", ()=>log("Live panel açık."));

  els.btnAskOrtak?.addEventListener("click", async ()=>{
    if(!apiOnline){
      log("API yokken ortak analiz alınamaz. Mock metin gösteriliyor.");
      renderOrtak(mockSummary().ortak);
      return;
    }
    const sampleMetrics = {
      visits24h: Number(els.mVisits.textContent)||0,
      activeUsers: Number(els.mUsers.textContent)||0
    };
    const r = await safeFetch("/api/ortak/analyze", {
      method:"POST",
      body: JSON.stringify(sampleMetrics)
    });
    if(r && r.status==="ok"){
      renderOrtak([
        "Ortak analiz tamamlandı:",
        JSON.stringify(r.data, null, 2)
      ]);
      log("Ortak analiz aldı.");
    }else{
      log("Ortak analiz alınamadı.");
    }
  });

  els.btnClearLogs?.addEventListener("click", ()=>{
    els.logList.innerHTML="";
    log("Log temizlendi.");
  });

  els.btnLock?.addEventListener("click", ()=>{
    log("Panel kilitleme modu (UI).");
    document.body.classList.toggle("locked");
  });

  els.btnEmergency?.addEventListener("click", ()=>{
    log("Acil Mod tetiklendi (UI).","bad");
    document.body.classList.add("emergency");
    setTimeout(()=>document.body.classList.remove("emergency"), 1200);
  });

  // INIT
  (async function init(){
    log("Kontrol merkezi açıldı.");
    await checkApi();
    await loadSummary();
  })();
})();
