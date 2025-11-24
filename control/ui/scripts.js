(() => {
  // =========================
  // InflowAI Kontrol Merkezi UI
  // API base: Render
  // Düşerse otomatik Mock
  // =========================

  const API_BASE = "https://inflowai-api.onrender.com"; // Render URL'in SABİT
  const state = {
    apiOnline: false,
    mode: "mock",
    lastLatencyMs: null,
    summary: null,
    locked: false
  };

  // ---------- Helpers ----------
  const qs = (s, p=document) => p.querySelector(s);
  const qsa = (s, p=document) => [...p.querySelectorAll(s)];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function toast(msg){
    const t = qs("#toast");
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(t._hide);
    t._hide = setTimeout(()=>t.style.display="none", 1800);
  }

  async function fetchJson(path, opts={}){
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const t0 = performance.now();
    try{
      const res = await fetch(API_BASE + path, {
        ...opts,
        signal: controller.signal,
        headers: {
          "Content-Type":"application/json",
          ...(opts.headers || {})
        }
      });
      const t1 = performance.now();
      state.lastLatencyMs = Math.round(t1 - t0);
      clearTimeout(timeout);
      if(!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    }catch(e){
      clearTimeout(timeout);
      throw e;
    }
  }

  // ---------- Routing ----------
  function setActiveView(view){
    qsa(".view").forEach(v => v.classList.remove("active"));
    qs(`#view-${view}`)?.classList.add("active");

    qsa(".nav-item").forEach(i => i.classList.remove("active"));
    qs(`.nav-item[data-view="${view}"]`)?.classList.add("active");
  }

  function initRouting(){
    const getViewFromHash = () => {
      const h = location.hash || "#/overview";
      return h.replace("#/","") || "overview";
    };

    window.addEventListener("hashchange", () => setActiveView(getViewFromHash()));
    setActiveView(getViewFromHash());
  }

  // ---------- API Health ----------
  async function pingApi(){
    try{
      const data = await fetchJson("/api/status");
      state.apiOnline = data?.status === "ok";
      state.mode = state.apiOnline ? "live" : "mock";
      return state.apiOnline;
    }catch(e){
      state.apiOnline = false;
      state.mode = "mock";
      return false;
    }
  }

  function renderApiStatus(){
    const dot = qs("#apiDot");
    const text = qs("#apiText");
    const pill = qs("#modePill");
    const cmdChip = qs("#commandsModeChip");
    const liveChip = qs("#liveChip");

    if(state.apiOnline){
      dot.style.background = "var(--good)";
      dot.style.color = "var(--good)";
      text.textContent = `API bağlı • ${state.lastLatencyMs ?? 0}ms`;
      pill.textContent = "API live";
      cmdChip.textContent = "Live (Aktif)";
      liveChip.classList.remove("ghost");
    }else{
      dot.style.background = "var(--bad)";
      dot.style.color = "var(--bad)";
      text.textContent = "API bağlantısı yok (mock mod)";
      pill.textContent = "API mock";
      cmdChip.textContent = "Mock (Aktif)";
      liveChip.classList.add("ghost");
    }
  }

  // ---------- Summary / UI Fill ----------
  function safeNum(v, fallback=0){
    if(v === undefined || v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function mockSummary(){
    const now = Date.now();
    return {
      visits24h: 80 + Math.floor((now/1000)%120),
      activeUsers: 10 + Math.floor((now/1000)%30),
      growthRate: (2 + ((now/1000)%40)/10).toFixed(1),
      latencyMs: 120 + Math.floor((now/1000)%300),
      avgReqMin: 200 + Math.floor((now/1000)%500),
      errorRate: (safeNum(((now/1000)%7)/10)).toFixed(1),
      uptimePct: 99.7,
      ortakMessage: "Mock modda stabil ilerliyoruz. Live bağlantı kurulunca otomatik geçeceğim."
    };
  }

  async function loadSummary(){
    if(!state.apiOnline){
      state.summary = mockSummary();
      return state.summary;
    }

    try{
      const res = await fetchJson("/api/ortak/summary");
      // API'de hangi alanlar gelirse gelsin esnek okuyalım
      const d = res?.data || {};
      state.summary = {
        visits24h: safeNum(d.visits24h ?? d.todayVisits ?? d.visits ?? d.traffic),
        activeUsers: safeNum(d.activeUsers ?? d.onlineUsers ?? d.active),
        growthRate: (d.growthRate ?? d.growth ?? d.growthPct ?? "0"),
        latencyMs: safeNum(d.latencyMs ?? d.apiLatency ?? state.lastLatencyMs ?? 0),
        avgReqMin: safeNum(d.avgRequestsMin ?? d.avgReq ?? d.requestsPerMin ?? 0),
        errorRate: (d.errorRate ?? d.errors ?? "0"),
        uptimePct: (d.uptimePct ?? d.uptime ?? "0"),
        ortakMessage: d.ortakMessage ?? d.message ?? "Ortak aktif."
      };
      return state.summary;
    }catch(e){
      // canlıyken summary patlarsa mock fallback
      state.summary = mockSummary();
      return state.summary;
    }
  }

  function fillOverview(s){
    qs("#statVisits").textContent = s.visits24h ?? "—";
    qs("#statActive").textContent = s.activeUsers ?? "—";
    qs("#statGrowth").textContent = (s.growthRate ?? "0") + "%";

    // bars
    const lat = safeNum(s.latencyMs, 0);
    const req = safeNum(s.avgReqMin, 0);
    const err = safeNum(s.errorRate, 0);
    const up  = safeNum(s.uptimePct, 0);

    qs("#barLatency").style.width = Math.min(100, lat/8) + "%";
    qs("#valLatency").textContent = lat + " ms";

    qs("#barReq").style.width = Math.min(100, req/10) + "%";
    qs("#valReq").textContent = req + " /dk";

    qs("#barErr").style.width = Math.min(100, err*12) + "%";
    qs("#valErr").textContent = err + "%";

    qs("#barUp").style.width = Math.min(100, up) + "%";
    qs("#valUp").textContent = up + "%";

    qs("#ortakTalk").textContent = s.ortakMessage || "Ortak dinleniyor…";

    // mini log
    const mini = qs("#miniLog");
    mini.innerHTML = "";
    const lines = [
      `Mode: ${state.mode.toUpperCase()}`,
      `Latency: ${lat}ms`,
      `Requests/min: ${req}`,
      `Errors: ${err}%`,
      `Uptime: ${up}%`
    ];
    lines.forEach(l=>{
      const div = document.createElement("div");
      div.className="log-item";
      div.textContent=l;
      mini.appendChild(div);
    });
  }

  function fillOtherViews(s){
    // Core
    qs("#coreConscious").textContent = state.apiOnline ? "Yüksek" : "Mock";
    qs("#coreStability").textContent = (99 + Math.random()).toFixed(2) + "%";
    qs("#coreLearn").textContent = (3 + Math.random()*5).toFixed(1) + "x";

    // Growth
    qs("#growthVisits").textContent = "+" + (safeNum(s.visits24h)/10).toFixed(1) + "%";
    qs("#growthEngage").textContent = (safeNum(s.activeUsers)*1.7).toFixed(0);
    qs("#growthRevenue").textContent = "Hazırlanıyor";

    // Services
    const servicesList = qs("#servicesList");
    const servicesHealth = qs("#servicesHealth");
    servicesList.innerHTML = "";
    servicesHealth.innerHTML = "";

    const services = [
      "Ortak Engine",
      "Metrics Analyzer",
      "Growth Tracker",
      "Security Shield",
      "Sharing Router",
      "Update Manager"
    ];
    services.forEach((name, i)=>{
      const li = document.createElement("div");
      li.className="list-item";
      li.innerHTML = `<span>${name}</span><span class="muted">v${1+i}.0</span>`;
      servicesList.appendChild(li);

      const hi = document.createElement("div");
      hi.className="list-item";
      const ok = state.apiOnline ? "Active" : "Idle";
      hi.innerHTML = `<span>${name}</span><span style="color:${state.apiOnline?'#39d98a':'#ffd166'}">${ok}</span>`;
      servicesHealth.appendChild(hi);
    });

    // Sharing
    qs("#sharingInfo").textContent =
      "Sosyal ağlar, embed, çoklu platform dağıtımı katmanı. Hazır altyapı, Core’dan sinyal bekliyor.";

    // Security
    qs("#secThreat").textContent = state.apiOnline ? "Düşük" : "Mock";
    qs("#secFirewall").textContent = "Aktif";
    qs("#secPolicy").textContent = "Açık / kontrollü";

    // Updating
    qs("#updLast").textContent = new Date().toLocaleString("tr-TR");
    qs("#updQueue").textContent = state.apiOnline ? "0" : "Mock görevleri";

    // Monetization
    qs("#monPremium").textContent = "Yakında";
    qs("#monCorp").textContent = "Yakında";
    qs("#monB2b").textContent = "Yakında";

    // Infinite
    qs("#infStatus").textContent =
      "Sonsuzluk Merkezi çekirdeğe bağlı. Veriler burada sonsuz depolanacak, krizlerde devreye girecek.";
  }

  async function refreshAll(){
    await pingApi();
    renderApiStatus();
    const summary = await loadSummary();
    fillOverview(summary);
    fillOtherViews(summary);
  }

  // ---------- Commands ----------
  function appendLog(msg, type="info"){
    const log = qs("#commandLog");
    const t = new Date().toLocaleTimeString("tr-TR");
    const prefix = type === "err" ? "⛔" : type === "ok" ? "✅" : "•";
    log.textContent = `${prefix} [${t}] ${msg}\n` + log.textContent;
  }

  async function sendCommand(text){
    if(!text.trim()) return;

    appendLog(`Komut gönderiliyor: "${text}"`);
    qs("#ortakAnswer").textContent = "Ortak düşünüyor…";

    if(!state.apiOnline){
      await sleep(500);
      const mockReply = `Mock analiz: "${text}" komutu alındı. Live'a geçince gerçek görev üretilecek.`;
      qs("#ortakAnswer").textContent = mockReply;
      appendLog(mockReply, "ok");
      return;
    }

    try{
      const payload = {
        command: text,
        metrics: state.summary || {}
      };
      const res = await fetchJson("/api/ortak/analyze", {
        method:"POST",
        body: JSON.stringify(payload)
      });

      const analysis = res?.data || {};
      const reply =
        analysis.message ||
        analysis.summary ||
        JSON.stringify(analysis, null, 2);

      qs("#ortakAnswer").textContent = reply;
      appendLog("Ortak yanıtladı.", "ok");
    }catch(e){
      appendLog("Komut gönderilemedi. API düştü, mock moda geçildi.", "err");
      state.apiOnline = false;
      state.mode = "mock";
      renderApiStatus();
      qs("#ortakAnswer").textContent = "API düştü. Mock moda geçtim.";
    }
  }

  function initCommands(){
    const input = qs("#commandInput");
    const btn = qs("#sendCommandBtn");

    btn.addEventListener("click", async ()=>{
      if(state.locked) return toast("Panel kilitli.");
      const text = input.value;
      input.value = "";
      await sendCommand(text);
    });

    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") btn.click();
    });
  }

  // ---------- Locks / Panic ----------
  function initControls(){
    const lockBtn = qs("#lockBtn");
    const panicBtn = qs("#panicBtn");
    lockBtn.addEventListener("click", ()=>{
      state.locked = !state.locked;
      lockBtn.textContent = state.locked ? "Panel Kilitli" : "Paneli Kilitle";
      toast(state.locked ? "Panel kilitlendi." : "Panel açıldı.");
    });

    panicBtn.addEventListener("click", ()=>{
      toast("Acil mod aktif. Core devrede.");
      appendLog("Acil mod tetiklendi.", "err");
    });
  }

  // ---------- Sidebar Mobile ----------
  function initSidebar(){
    const hamburger = qs("#hamburger");
    const sidebar = qs("#sidebar");
    hamburger.addEventListener("click", ()=> sidebar.classList.toggle("open"));
    qsa(".nav-item").forEach(i=>{
      i.addEventListener("click", ()=> sidebar.classList.remove("open"));
    });
  }

  // ---------- Boot ----------
  async function boot(){
    initRouting();
    initCommands();
    initControls();
    initSidebar();

    qs("#refreshBtn").addEventListener("click", refreshAll);

    await refreshAll();
    // otomatik yenileme
    setInterval(refreshAll, 20000);
  }

  boot();
})();
