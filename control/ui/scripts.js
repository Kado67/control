(() => {
  // === CONFIG ===
  const API_BASE = "https://inflowai-api.onrenderder.com".replace("onrenderder","onrender"); 
  // yukarıdaki replace sadece typo güvenliği için

  const state = {
    live: true,
    lastSummary: null,
    log: []
  };

  // === DOM ===
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];

  const apiDot = qs("#apiDot");
  const apiText = qs("#apiText");
  const apiFooter = qs("#apiFooter");
  const refreshBtn = qs("#refreshBtn");
  const liveBtn = qs("#liveBtn");
  const clearLogBtn = qs("#clearLogBtn");
  const exportLogBtn = qs("#exportLogBtn");
  const analyzeBtn = qs("#analyzeBtn");
  const goCommandsBtn = qs("#goCommandsBtn");
  const talkBox = qs("#talkBox");
  const talkTime = qs("#talkTime");
  const modeChip = qs("#modeChip");

  const todayVisits = qs("#todayVisits");
  const activeUsers = qs("#activeUsers");

  const barApi = qs("#barApi");
  const barLatency = qs("#barLatency");
  const barError = qs("#barError");
  const barCrash = qs("#barCrash");

  const valApi = qs("#valApi");
  const valLatency = qs("#valLatency");
  const valError = qs("#valError");
  const valCrash = qs("#valCrash");

  const growthRate = qs("#growthRate");
  const stability = qs("#stability");
  const loadIndex = qs("#loadIndex");
  const recommendation = qs("#recommendation");

  const logEl = qs("#log");

  const hamburger = qs("#hamburger");
  const sidebar = qs("#sidebar");

  const cmdInput = qs("#cmdInput");
  const cmdSendBtn = qs("#cmdSendBtn");

  // === LOG ===
  function addLog(type, msg) {
    const time = new Date().toLocaleTimeString("tr-TR");
    state.log.unshift({ type, msg, time });
    if (state.log.length > 80) state.log.pop();
    renderLog();
  }
  function renderLog() {
    logEl.innerHTML = state.log.map(l => `
      <div class="log-item ${l.type}">
        <div><b>${l.time}</b> • ${l.msg}</div>
      </div>
    `).join("");
  }

  // === API HELPERS ===
  async function apiGet(path) {
    const url = API_BASE + path;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function apiPost(path, body) {
    const url = API_BASE + path;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // === STATUS / HEALTH ===
  async function checkApi() {
    try {
      const data = await apiGet("/api/status");
      apiDot.className = "dot ok";
      apiText.textContent = "API bağlı";
      apiFooter.textContent = `API: ${API_BASE}`;
      modeChip.textContent = "API live";
      addLog("ok", `API bağlandı: /api/status ok`);
      return data;
    } catch (e) {
      apiDot.className = "dot err";
      apiText.textContent = "API bağlantısı yok";
      apiFooter.textContent = `API: ${API_BASE} (bağlantı yok)`;
      modeChip.textContent = "API offline";
      addLog("err", `API hatası: ${e.message}`);
      throw e;
    }
  }

  function setHealth({ apiWork=0.9, latency=500, errorRate=0.5, crashRisk=0 }) {
    // apiWork 0..1
    const apiPct = Math.round(apiWork * 100);
    const latPct = Math.max(0, Math.min(100, 1000 - latency)) / 10; // rough
    const errPct = Math.min(100, errorRate * 100);
    const crashPct = Math.min(100, crashRisk * 100);

    barApi.style.width = apiPct + "%";
    barLatency.style.width = latPct + "%";
    barError.style.width = (100 - errPct) + "%";
    barCrash.style.width = (100 - crashPct) + "%";

    valApi.textContent = apiPct.toFixed(0) + "%";
    valLatency.textContent = latency + " ms";
    valError.textContent = errorRate.toFixed(2) + "%";
    valCrash.textContent = crashRisk.toFixed(2) + "%";

    qs("#healthStatus").textContent = apiPct > 80 ? "Stabil" : "Dikkat";
  }

  // === SUMMARY ===
  async function loadSummary() {
    try {
      const res = await apiGet("/api/ortak/summary");
      const summary = res?.data || {};
      state.lastSummary = summary;

      // Ortak konuşuyor metni
      talkBox.textContent = summary.message || summary.say || "Ortak motoru aktif. Veri akışı izleniyor.";
      talkTime.textContent = "son kontrol: " + new Date().toLocaleTimeString("tr-TR");

      // Mini analiz kutuları
      growthRate.textContent = summary.growthRate ?? "—";
      stability.textContent = summary.stability ?? "Kararlı";
      loadIndex.textContent = summary.loadIndex ?? "Düşük";
      recommendation.textContent = summary.recommendation ?? "Sistem akışı iyi.";

      addLog("ok", "Ortak özeti güncellendi.");
    } catch (e) {
      talkBox.textContent = "Ortak motorundan veri alınamadı.";
      addLog("warn", "Ortak summary alınamadı (API çalışıyor olabilir).");
    }
  }

  // === ANALYZE ===
  async function runAnalyze() {
    // UI’dan örnek metrikler (canlı modda son değerleri yolluyoruz)
    const metrics = {
      todayVisits: parseInt(todayVisits.textContent) || 0,
      activeUsers: parseInt(activeUsers.textContent) || 0,
      ts: Date.now(),
      live: state.live
    };

    try {
      const res = await apiPost("/api/ortak/analyze", metrics);
      const data = res?.data || {};

      talkBox.textContent =
        data.message ||
        data.summary ||
        "Ortak analiz tamamlandı. Sistem stabil görünüyor.";

      talkTime.textContent = "son kontrol: " + new Date().toLocaleTimeString("tr-TR");

      // Sağlık değerlerini varsa ordan al
      setHealth({
        apiWork: data.apiWork ?? 0.9,
        latency: data.latency ?? 500,
        errorRate: data.errorRate ?? 0.5,
        crashRisk: data.crashRisk ?? 0
      });

      growthRate.textContent = data.growthRate ?? growthRate.textContent;
      stability.textContent = data.stability ?? stability.textContent;
      loadIndex.textContent = data.loadIndex ?? loadIndex.textContent;
      recommendation.textContent = data.recommendation ?? recommendation.textContent;

      addLog("ok", "Ortak analiz güncellendi.");
    } catch (e) {
      addLog("err", "Analiz endpoint hatası: " + e.message);
    }
  }

  // === FAKE VISITS (UI canlı hissi) ===
  function tickMetrics() {
    // burada API'den gerçek metrik yoksa bile panel canlı görünsün diye
    const v = (parseInt(todayVisits.textContent) || 0) + Math.floor(Math.random()*3);
    const u = Math.max(0, (parseInt(activeUsers.textContent) || 1) + (Math.random()>.5?1:-1));

    todayVisits.textContent = v;
    activeUsers.textContent = u;

    // health küçük dalgalansın
    const latency = 350 + Math.floor(Math.random()*350);
    const errorRate = Math.random()*0.9;
    const apiWork = 0.86 + Math.random()*0.12;
    const crashRisk = Math.random()*0.2;

    setHealth({ apiWork, latency, errorRate, crashRisk });
  }

  let liveTimer = null;
  function setLive(on) {
    state.live = on;
    liveBtn.classList.toggle("ghost", !on);
    liveBtn.textContent = on ? "Live" : "Mock";
    addLog("ok", on ? "Live mod aktif." : "Mock mod aktif.");

    if (liveTimer) clearInterval(liveTimer);
    if (on) liveTimer = setInterval(tickMetrics, 2500);
  }

  // === NAV ===
  function switchView(viewId) {
    qsa(".menu-item").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
    qsa(".view").forEach(v => v.classList.remove("active"));
    qs(`#view-${viewId}`).classList.add("active");
  }

  // === EVENTS ===
  refreshBtn.addEventListener("click", async () => {
    await checkApi();
    await loadSummary();
  });

  liveBtn.addEventListener("click", () => {
    setLive(!state.live);
  });

  clearLogBtn.addEventListener("click", () => {
    state.log = [];
    renderLog();
  });

  exportLogBtn.addEventListener("click", () => {
    const text = state.log.map(l => `[${l.time}] ${l.msg}`).join("\n");
    navigator.clipboard.writeText(text);
    addLog("ok", "Log kopyalandı.");
  });

  analyzeBtn.addEventListener("click", runAnalyze);
  goCommandsBtn.addEventListener("click", () => switchView("commands"));

  qsa(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
      if (window.innerWidth <= 1020) sidebar.classList.remove("open");
    });
  });

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  cmdSendBtn.addEventListener("click", () => {
    const cmd = cmdInput.value.trim();
    if (!cmd) return;
    addLog("ok", `Komut alındı: "${cmd}"`);
    cmdInput.value = "";
  });

  // === INIT ===
  (async function init(){
    // başlangıç metrikleri
    todayVisits.textContent = "0";
    activeUsers.textContent = "1";
    setHealth({ apiWork:0.9, latency:500, errorRate:0.5, crashRisk:0 });

    try {
      await checkApi();
    } finally {
      await loadSummary();
      setLive(true);
      addLog("ok", "Kontrol merkezi senkron başlıyor...");
    }
  })();

})();
