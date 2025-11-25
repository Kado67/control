/* =========================
   InflowAI Control Center UI
   scripts.js
   ========================= */

(() => {
  "use strict";

  const API_BASE = "https://inflowai-api.onrender.com";

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const fmt = (n)=>n.toLocaleString("tr-TR");

  const state = {
    apiConnected: false,
    mockMode: true,
    lastUpdate: null,
    summary: null,
    features: null,
    packages: {
      free: true,
      premium: false,
      kurumsal: false,
      b2b: false
    },
    logs: []
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadPackageState();
    bindNav();
    bindSidebarButtons();
    bindPackages();
    bindAssistant();
    bindCommands();
    bindLogsButtons();
    initialLoad();
  });

  /* ---------- INITIAL LOAD ---------- */

  async function initialLoad() {
    pushLog("Kontrol merkezi açıldı.");
    await refreshFromApi();
    renderEverything();
  }

  async function refreshFromApi(showToast = true) {
    try {
      const statusRes = await fetch(`${API_BASE}/api/status`);
      if (!statusRes.ok) throw new Error("status failed");
      const statusJson = await statusRes.json();

      const summaryRes = await fetch(`${API_BASE}/api/ortak/summary`);
      const summaryJson = summaryRes.ok ? await summaryRes.json() : null;

      const featuresRes = await fetch(`${API_BASE}/api/ortak/features`);
      const featuresJson = featuresRes.ok ? await featuresRes.json() : null;

      state.apiConnected = true;
      state.mockMode = false;
      state.lastUpdate = new Date();
      state.summary = summaryJson ? summaryJson.data : null;
      state.features = featuresJson ? featuresJson.data : null;

      pushLog("API ile bağlantı kuruldu.");
      if (showToast) toast("API bağlantısı başarılı.");
    } catch (err) {
      // API yoksa mock moda düş
      state.apiConnected = false;
      state.mockMode = true;
      state.lastUpdate = new Date();
      if (!state.summary) {
        state.summary = buildMockSummary();
      }
      if (!state.features) {
        state.features = buildMockFeatures();
      }
      pushLog("API'ye ulaşılamadı, mock moda geçildi.");
      if (showToast) toast("API bulunamadı, mock veri ile devam.");
    }
  }

  /* ---------- NAV / PAGES ---------- */

  function bindNav() {
    $$(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const page = btn.dataset.page;
        setActivePage(page);
      });
    });
  }

  function setActivePage(key) {
    if (!key) return;
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === key));
    $$(".page").forEach(p => p.classList.toggle("active", p.dataset.page === key));
    toast(`${pageLabel(key)} açıldı.`);
  }

  function pageLabel(key) {
    const map = {
      overview: "Genel Bakış",
      packages: "Paketler",
      ortak: "ORTAK",
      logs: "Loglar"
    };
    return map[key] || key;
  }

  /* ---------- SIDEBAR BUTTONS ---------- */

  function bindSidebarButtons() {
    const refreshBtn = $("#btn-refresh");
    const mockBtn    = $("#btn-toggle-mock");
    const apiTestBtn = $("#apiTestBtn");

    refreshBtn && refreshBtn.addEventListener("click", async () => {
      await refreshFromApi(true);
      renderEverything();
    });

    mockBtn && mockBtn.addEventListener("click", () => {
      state.mockMode = !state.mockMode;
      toast(state.mockMode ? "Mock moda geçildi." : "Live mod denenecek.");
      refreshEverythingMaybeMock();
    });

    apiTestBtn && apiTestBtn.addEventListener("click", async () => {
      await refreshFromApi(true);
      renderEverything();
    });
  }

  async function refreshEverythingMaybeMock() {
    if (state.mockMode) {
      state.apiConnected = false;
      state.summary = buildMockSummary();
      state.features = buildMockFeatures();
      renderEverything();
    } else {
      await refreshFromApi(true);
      renderEverything();
    }
  }

  /* ---------- PACKAGES ---------- */

  function bindPackages() {
    const free   = $("#pkg-free");
    const prem   = $("#pkg-premium");
    const kurum  = $("#pkg-kurumsal");
    const b2b    = $("#pkg-b2b");

    if (free)   free.checked  = state.packages.free;
    if (prem)   prem.checked  = state.packages.premium;
    if (kurum)  kurum.checked = state.packages.kurumsal;
    if (b2b)    b2b.checked   = state.packages.b2b;

    const handler = (key,label) => (ev) => {
      state.packages[key] = !!ev.target.checked;
      savePackageState();
      pushLog(`${label} paketi: ${ev.target.checked ? "AÇIK" : "KAPALI"}`);
      toast(`${label} ${ev.target.checked ? "açıldı" : "kapatıldı"}.`);
    };

    free   && free.addEventListener("change", handler("free","Ücretsiz"));
    prem   && prem.addEventListener("change", handler("premium","Premium"));
    kurum  && kurum.addEventListener("change", handler("kurumsal","Kurumsal"));
    b2b    && b2b.addEventListener("change", handler("b2b","B2B"));
  }

  function loadPackageState() {
    try {
      const raw = localStorage.getItem("inflow_pkg_state");
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        state.packages = { ...state.packages, ...obj };
      }
    } catch {}
  }
  function savePackageState() {
    try {
      localStorage.setItem("inflow_pkg_state", JSON.stringify(state.packages));
    } catch {}
  }

  /* ---------- ASSISTANT (ORTAK) ---------- */

  function bindAssistant() {
    const btnSummary = $("#assistant-btn-summary");
    const btnGrowth  = $("#assistant-btn-growth");
    const btnRisk    = $("#assistant-btn-risk");

    btnSummary && btnSummary.addEventListener("click", () => {
      const text = buildAssistantSummaryText();
      setAssistantText(text);
      pushLog("Ortak özeti istendi.");
    });

    btnGrowth && btnGrowth.addEventListener("click", () => {
      const text = buildAssistantGrowthAdvice();
      setAssistantText(text);
      pushLog("Ortak büyüme tavsiyesi verdi.");
    });

    btnRisk && btnRisk.addEventListener("click", () => {
      const text = buildAssistantRiskAdvice();
      setAssistantText(text);
      pushLog("Ortak risk analizi yaptı.");
    });
  }

  function setAssistantText(text) {
    const p = $("#assistant-text");
    if (p) p.textContent = text;
  }

  function buildAssistantSummaryText() {
    const s = state.summary;
    if (!s) return "Ortak özet verisi henüz yok.";
    return `Aktif ziyaretçi yaklaşık ${s.metrics.activeUsers}. Günlük büyüme ` +
           `${s.metrics.growthRate.toFixed(1)}%. Genel sağlık ${s.healthScore}/100. ` +
           `Ortak şu anda "${s.mood}" modunda ve ilk önerisi: ${s.mainActionHint}`;
  }

  function buildAssistantGrowthAdvice() {
    const s = state.summary;
    if (!s) return "Büyüme verisi henüz yok. API bağlandıktan sonra güncellenecek.";
    const gr = s.metrics.growthRate;
    if (gr < 2) {
      return "Büyüme düşük görünüyor. Ana sayfa, içerik ve başlıkları test edecek A/B deneyleri öneriyorum.";
    } else if (gr < 5) {
      return "Büyüme dengeli. Ücretsiz pakette limitleri hissettirmeden ziyaretçiyi premium sinyallerine hazırlayalım.";
    } else {
      return "Büyüme agresif. Altyapı limiti, spam trafiği ve stabiliteyi yakından izlemeliyiz.";
    }
  }

  function buildAssistantRiskAdvice() {
    const s = state.summary;
    if (!s) return "Risk analizi için henüz veri yok.";
    const err  = s.metrics.errorRate;
    const up   = s.metrics.uptime;
    if (err > 3 || up < 97) {
      return "Hata oranı veya uptime kritik görünüyor. Önce en çok hata üreten endpoint ve sayfalara odaklanalım.";
    }
    return "Şu an kritik bir risk görünmüyor. Enerjiyi içerik üretimi ve uzun vadeli büyümeye ayırabiliriz.";
  }

  /* ---------- COMMAND CONSOLE ---------- */

  function bindCommands() {
    const input  = $("#cmd-input");
    const runBtn = $("#cmd-run");
    const tags   = $$(".tag");
    const out    = $("#cmd-output");

    const run = () => {
      const cmd = (input && input.value || "").trim();
      if (!cmd) {
        toast("Komut boş.");
        return;
      }
      handleCommand(cmd, out);
      if (input) input.value = "";
    };

    runBtn && runBtn.addEventListener("click", run);
    input && input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });

    tags.forEach(tag => {
      tag.addEventListener("click", () => {
        if (!input) return;
        input.value = tag.dataset.cmd || tag.textContent.trim();
        input.focus();
      });
    });
  }

  function handleCommand(cmd, outEl) {
    const time = new Date().toLocaleTimeString("tr-TR");
    const lower = cmd.toLowerCase();
    let result = "";

    if (lower === "status" || lower.includes("durum")) {
      result =
`[${time}] Sistem durumu:
- API: ${state.apiConnected ? "BAĞLI" : "KOPUK (mock)"}
- Sağlık: ${state.summary ? state.summary.healthScore : "-"}
- Mod: ${state.summary ? state.summary.mood : "-"}
`;
    } else if (lower.startsWith("restart")) {
      result = `[${time}] Restart komutu alındı (simülasyon): ${cmd}.`;
    } else if (lower.startsWith("scale")) {
      result = `[${time}] Scale komutu alındı (simülasyon): ${cmd}.`;
    } else if (lower.startsWith("help")) {
      result =
`[${time}] Komutlar:
- status
- restart core
- scale auto
- help`;
    } else {
      result = `[${time}] Ortak (mock): "${cmd}" komutunu kaydettim. API ile bağlandıkça gerçek aksiyonlara dönüştürülebilir.`;
    }

    pushLog(`Komut: ${cmd}`);
    appendCmdOutput(outEl, result);
  }

  function appendCmdOutput(el, text) {
    if (!el) return;
    el.textContent = (el.textContent ? el.textContent + "\n\n" : "") + text;
    el.scrollTop = el.scrollHeight;
  }

  /* ---------- LOGS ---------- */

  function bindLogsButtons() {
    const clearBtn = $("#btn-clear-logs");
    clearBtn && clearBtn.addEventListener("click", () => {
      state.logs = [];
      renderLogs();
      toast("Loglar temizlendi.");
    });
  }

  function pushLog(message) {
    const t = new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    state.logs.push({ t, m: message });
    if (state.logs.length > 80) state.logs.shift();
    renderLogs();
  }

  function renderLogs() {
    const ul = $("#log-list");
    if (!ul) return;
    ul.innerHTML = "";
    state.logs.slice().reverse().forEach(l => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <div class="log-time">${l.t}</div>
        <div class="log-text">${escapeHtml(l.m)}</div>
      `;
      ul.appendChild(li);
    });
  }

  /* ---------- RENDER EVERYTHING ---------- */

  function renderEverything() {
    renderApiPill();
    renderKpis();
    renderMiniStats();
    renderServices();
    renderOrtakSummary();
    renderFeatures();
    renderLogs();
  }

  function renderApiPill() {
    const pill = $("#api-pill");
    const dot  = $("#apiDot");
    const txt  = $("#apiText");
    if (!pill || !dot || !txt) return;

    if (state.apiConnected && !state.mockMode) {
      pill.style.background = "rgba(34,197,94,0.12)";
      pill.style.borderColor = "rgba(34,197,94,0.45)";
      dot.style.background = "#22c55e";
      dot.style.boxShadow = "0 0 12px rgba(34,197,94,0.9)";
      txt.textContent = "API bağlantısı AKTİF (live)";
    } else {
      pill.style.background = "rgba(239,68,68,0.08)";
      pill.style.borderColor = "rgba(239,68,68,0.35)";
      dot.style.background = "#ef4444";
      dot.style.boxShadow = "0 0 12px rgba(239,68,68,0.9)";
      txt.textContent = "API bağlantısı yok (mock mod)";
    }
  }

  function renderKpis() {
    const s = state.summary || buildMockSummary();
    $("#kpi-todayVisits")   && ($("#kpi-todayVisits").textContent   = fmt(s.metrics.traffic));
    $("#kpi-activeUsers")   && ($("#kpi-activeUsers").textContent   = fmt(s.metrics.activeUsers));
    $("#kpi-growthRate")    && ($("#kpi-growthRate").textContent    = s.metrics.growthRate.toFixed(1) + "%");
    $("#kpi-systemHealth")  && ($("#kpi-systemHealth").textContent  = s.healthScore + "/100");
  }

  function renderMiniStats() {
    const s = state.summary || buildMockSummary();
    $("#mini-traffic") && ($("#mini-traffic").textContent = fmt(s.metrics.traffic));
    $("#mini-uptime")  && ($("#mini-uptime").textContent  = s.metrics.uptime.toFixed(1) + "%");
    $("#mini-error")   && ($("#mini-error").textContent   = s.metrics.errorRate.toFixed(2) + "%");
    $("#mini-latency") && ($("#mini-latency").textContent = s.metrics.apiLatency.toFixed(0) + "ms");
    $("#mini-updated") && ($("#mini-updated").textContent = (state.lastUpdate || new Date()).toLocaleTimeString("tr-TR"));

    const moodPill = $("#ortak-mood-pill");
    const moodChip = $("#ortak-mood-chip");
    if (moodPill) moodPill.textContent = s.mood || "-";
    if (moodChip) moodChip.textContent = s.mood || "-";
  }

  function renderServices() {
    const list = $("#service-list");
    if (!list) return;
    list.innerHTML = "";
    const s = state.summary || buildMockSummary();

    const items = [
      { name:"Core (Beyin)",       status:"ok",   desc:"Zeka ve karar katmanı" },
      { name:"Growth",             status:"ok",   desc:"Büyüme ve trafik" },
      { name:"Services",           status:"ok",   desc:"Hizmetler / servisler" },
      { name:"Sharing",            status:"warn", desc:"Paylaşım / sosyal" },
      { name:"Security",           status:"ok",   desc:"Güvenlik" },
      { name:"Updating",           status:"ok",   desc:"Güncelleme / deploy" }
    ];

    items.forEach(it => {
      const row = document.createElement("div");
      row.className = "status-row";
      row.innerHTML = `
        <div>
          <div class="status-title">${it.name}</div>
          <div class="status-desc">${it.desc}</div>
        </div>
        <span class="pill ${it.status === "ok" ? "ok" : "warn"}">
          ${it.status === "ok" ? "OK" : "İZLE"}
        </span>
      `;
      list.appendChild(row);
    });
  }

  function renderOrtakSummary() {
    const box = $("#ortak-summary-main");
    const s = state.summary || buildMockSummary();
    if (!box) return;
    box.textContent =
      `Aktif ziyaretçi yaklaşık ${s.metrics.activeUsers}. Günlük büyüme ` +
      `${s.metrics.growthRate.toFixed(1)}%. Sistem sağlığı ` +
      `${s.healthScore}/100. Ortak şu anda "${s.mood}" modunda ve ilk önerisi: ${s.mainActionHint}`;
  }

  function renderFeatures() {
    const ul = $("#features-list");
    if (!ul) return;
    ul.innerHTML = "";
    const f = state.features || buildMockFeatures();

    if (Array.isArray(f.strategicGoals)) {
      f.strategicGoals.forEach(g => {
        const li = document.createElement("li");
        li.textContent = g;
        ul.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "API'den özellik listesi alınamadı, mock veri gösteriliyor.";
      ul.appendChild(li);
    }
  }

  /* ---------- MOCK HELPERS ---------- */

  function buildMockSummary() {
    return {
      mood: "Sakin",
      healthScore: 80,
      mainActionHint: "Ana sayfa ve içerik akışını test etmeye devam et.",
      metrics: {
        traffic: 3200,
        activeUsers: 120,
        growthRate: 3.4,
        uptime: 99.2,
        errorRate: 0.7,
        apiLatency: 420
      }
    };
  }

  function buildMockFeatures() {
    return {
      strategicGoals: [
        "Platformu her gün en az %3 büyüt.",
        "Ücretsiz paketten premium / kurumsala sağlıklı geçişleri hazırla.",
        "B2B / API modelini izleyip uygun zamanda aç."
      ]
    };
  }

  /* ---------- UTILS ---------- */

  function toast(msg) {
    const t = $("#toast");
    const inner = $("#toast-inner");
    if (!t || !inner) return;
    inner.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

})();
