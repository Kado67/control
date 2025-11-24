/* =========================
   InflowAI Control Center UI
   scripts.js (LIVE + MOCK)
   ========================= */
(() => {
  "use strict";

  /* ---------- Config ---------- */
  const API_BASE = "https://inflowai-api.onrender.com"; // Render API
  const PING_ENDPOINT = "/api/status";
  const SUMMARY_ENDPOINT = "/api/ortak/summary";
  const FEATURES_ENDPOINT = "/api/ortak/features";

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");
  const nowTime = () =>
    new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  /* ---------- State ---------- */
  const state = {
    activePage: "overview",
    mockMode: false,          // LIVE başlasın
    apiOnline: false,
    lastUpdatedAt: Date.now(),

    kpis: {
      todayVisits: 0,
      activeUsers: 0,
      growthRate: 0,
      systemHealth: 0,
    },

    services: [
      { key: "core", name: "Core (Beyin)", status: "ok" },
      { key: "growth", name: "Growth", status: "ok" },
      { key: "services", name: "Services", status: "ok" },
      { key: "sharing", name: "Sharing", status: "ok" },
      { key: "security", name: "Security", status: "ok" },
      { key: "updating", name: "Updating", status: "ok" },
    ],

    logs: [],
    featureToggles: loadLocal("featureToggles", {}),
    packageToggles: loadLocal("packageToggles", {
      free: true, premium: false, corporate: false, b2b: false
    }),
    adsenseCode: loadLocal("adsenseCode", ""),
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindNav();
    bindTopbar();
    bindTogglesPersistence();
    bindCommands();
    bindAssistantButtons();
    bindNotes();
    bindAdsense();
    bindPackageActions();

    // İlk render
    renderAll();

    // API bağlantısını test et + verileri çek
    firstLoad();

    // Periyodik canlı güncelleme
    setInterval(tick, 6000);
  }

  /* ---------- NAV ---------- */
  function bindNav() {
    $$(".nav-item").forEach((item) => {
      on(item, "click", () => setActivePage(item.dataset.page));
    });
  }

  function setActivePage(key) {
    if (!key) return;
    state.activePage = key;

    $$(".nav-item").forEach((i) => i.classList.toggle("active", i.dataset.page === key));
    $$(".page").forEach((p) => p.classList.toggle("active", p.dataset.page === key));

    toast(`${labelOf(key)} açıldı.`);
  }

  function labelOf(key) {
    const map = {
      overview: "Genel Bakış",
      packages: "Paketler",
      features: "Özellikler",
      commands: "Komutlar",
      monetization: "Para / Reklam",
      security: "Güvenlik",
      users: "Kullanıcılar",
      infinity: "Sonsuzluk Merkezi",
    };
    return map[key] || key;
  }

  /* ---------- TOPBAR ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", async () => {
      await fetchAndRenderAll(true);
    });

    on($("#btn-live"), "click", () => {
      state.mockMode = !state.mockMode;
      toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
      fetchAndRenderAll(true);
    });

    on($("#btn-test-api"), "click", async () => {
      await pingApi(true);
    });
  }

  /* ---------- PERSISTENT TOGGLES ---------- */
  function bindTogglesPersistence() {
    $$(".switch input").forEach((sw) => {
      const group = sw.dataset.toggle;
      const label = sw.dataset.label || group;

      // load initial
      if (group in state.packageToggles) {
        sw.checked = !!state.packageToggles[group];
      } else if (group in state.featureToggles) {
        sw.checked = !!state.featureToggles[group];
      }

      on(sw, "change", () => {
        const val = sw.checked;

        if (group in state.packageToggles) {
          state.packageToggles[group] = val;
          saveLocal("packageToggles", state.packageToggles);
        } else {
          state.featureToggles[group] = val;
          saveLocal("featureToggles", state.featureToggles);
        }

        pushLog(`${label}: ${val ? "Açık" : "Kapalı"}`);
        toast(`${label} ${val ? "Açıldı" : "Kapandı"}`);
      });
    });
  }

  /* ---------- COMMAND CONSOLE ---------- */
  function bindCommands() {
    const input = $("#cmd-input");
    const runBtn = $("#cmd-run");
    const clearBtn = $("#cmd-clear");
    const tags = $$(".tag");

    const run = () => {
      const cmd = (input?.value || "").trim();
      if (!cmd) return toast("Komut boş.");
      handleCommand(cmd);
      input.value = "";
    };

    on(runBtn, "click", run);
    on(input, "keydown", (e) => e.key === "Enter" && run());
    on(clearBtn, "click", () => setCmdOutput(""));

    tags.forEach((t) =>
      on(t, "click", () => {
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      })
    );
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const stamp = new Date().toLocaleTimeString("tr-TR");

    let result = "";
    const c = cmd.toLowerCase();

    if (c === "status" || c.includes("durum")) {
      result =
        `[#${stamp}] Sistem Durumu: ${state.kpis.systemHealth >= 75 ? "KARARLI" : "DİKKAT"}\n` +
        `API: ${state.apiOnline ? "ONLİNE" : "OFFLİNE"} (${state.mockMode ? "MOCK" : "LIVE"})\n` +
        `Health: ${state.kpis.systemHealth}/100`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Restart isteği alındı (mock). Bileşen: ${cmd.split(" ")[1] || "core"}`;
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Scale isteği alındı (mock). Hedef: ${cmd.split(" ")[1] || "auto"}`;
    } else if (c.startsWith("clear logs")) {
      state.logs = [];
      renderLogs();
      result = `[#${stamp}] Loglar temizlendi.`;
    } else if (c.startsWith("help")) {
      result = `[#${stamp}] Komutlar: status | restart <service> | scale <auto|n> | clear logs | help`;
    } else {
      result = `[#${stamp}] Ortak: “Komutu aldım. ${state.mockMode ? "Mock" : "Live"} modda işledim: ${cmd}”`;
    }

    appendCmdOutput(result);
  }

  function setCmdOutput(text) {
    const out = $("#cmd-output");
    if (out) out.textContent = text;
  }
  function appendCmdOutput(text) {
    const out = $("#cmd-output");
    if (!out) return;
    out.textContent = (out.textContent ? out.textContent + "\n\n" : "") + text;
    out.scrollTop = out.scrollHeight;
  }

  /* ---------- ASSISTANT BUTTONS ---------- */
  function bindAssistantButtons() {
    on($("#assistant-qa"), "click", () => {
      assistantSay(
        state.apiOnline
          ? "Canlı verileri okudum. Platform stabil ve büyüme sağlıklı."
          : "API offline görünüyor. Mock veride stabil çalışıyorum."
      );
    });

    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto-optimizasyon başlattım. Katmanlar dengeleniyor.");
      bumpHealth(1);
    });

    on($("#assistant-repair"), "click", () => {
      assistantSay("Zayıf katman taraması bitti. Sharing katmanı izleniyor.");
      markService("sharing", "warn");
      renderServices();
    });

    on($("#btn-refresh-features"), "click", () => {
      buildSuggestions();
      toast("Öneriler güncellendi.");
    });
  }

  function assistantSay(text) {
    const p = $("#ortak-summary");
    if (p) p.textContent = text;
    $("#ortak-last-update").textContent = nowTime();
    pushLog(`Ortak: ${text}`);
  }

  /* ---------- NOTES ---------- */
  function bindNotes() {
    const ta = $("#notes-textarea");
    if (ta) ta.value = loadLocal("inflow_notes", "");

    on($("#notes-save"), "click", () => {
      saveLocal("inflow_notes", ta.value);
      toast("Not kaydedildi.");
      pushLog("Sonsuzluk Merkezi notları kaydedildi.");
    });

    on($("#notes-clear"), "click", () => {
      ta.value = "";
      saveLocal("inflow_notes", "");
      toast("Notlar temizlendi.");
      pushLog("Sonsuzluk Merkezi notları temizlendi.");
    });
  }

  /* ---------- ADSENSE ---------- */
  function bindAdsense() {
    const ta = $("#adsense-code");
    if (ta) ta.value = state.adsenseCode;

    on($("#adsense-save"), "click", () => {
      state.adsenseCode = ta.value.trim();
      saveLocal("adsenseCode", state.adsenseCode);
      toast("AdSense kodu kaydedildi.");
      pushLog("AdSense kodu güncellendi.");
    });

    on($("#adsense-clear"), "click", () => {
      ta.value = "";
      state.adsenseCode = "";
      saveLocal("adsenseCode", "");
      toast("AdSense temizlendi.");
      pushLog("AdSense kodu silindi.");
    });
  }

  /* ---------- PACKAGE ACTIONS ---------- */
  function bindPackageActions() {
    on($("#btn-reset-packages"), "click", () => {
      state.packageToggles = { free: true, premium: false, corporate: false, b2b: false };
      saveLocal("packageToggles", state.packageToggles);
      // re-sync checkboxes
      $$(`input[data-toggle="free"],input[data-toggle="premium"],input[data-toggle="corporate"],input[data-toggle="b2b"]`)
        .forEach(sw => sw.checked = !!state.packageToggles[sw.dataset.toggle]);
      toast("Paketler varsayılana döndü.");
      pushLog("Paketler varsayılanlandı.");
    });

    on($("#btn-export-packages"), "click", () => {
      const json = JSON.stringify(state.packageToggles, null, 2);
      appendCmdOutput(`Paket JSON:\n${json}`);
      toast("Paket yedeği konsola yazıldı.");
    });

    on($("#btn-sync-packages"), "click", () => {
      toast("Paketler platform cache’ine yazıldı. Live modda gerçek yansır.");
      pushLog("Paketler platforma yansıtıldı (mock/cache).");
    });
  }

  /* ---------- API FETCH ---------- */
  async function firstLoad() {
    await fetchAndRenderAll(true);
    buildSuggestions();
  }

  async function tick() {
    await fetchAndRenderAll(false);
    if (state.mockMode) driftMock();
  }

  async function fetchAndRenderAll(forceLog) {
    await pingApi(forceLog);

    if (!state.apiOnline || state.mockMode) {
      // mock fallback
      refreshMockData(forceLog);
      renderAll();
      return;
    }

    try {
      const [summary, features] = await Promise.all([
        safeGet(SUMMARY_ENDPOINT),
        safeGet(FEATURES_ENDPOINT),
      ]);

      // summary -> KPIs
      if (summary?.data?.metrics) {
        const m = summary.data.metrics;
        state.kpis.activeUsers = m.activeUsers ?? state.kpis.activeUsers;
        state.kpis.growthRate = m.growthRate ?? state.kpis.growthRate;
        state.kpis.systemHealth = summary.data.healthScore ?? state.kpis.systemHealth;
        // traffic 15min -> approximate today visits
        const t = m.traffic ?? 120;
        state.kpis.todayVisits = Math.round(t * 96); // 15dk x 96 = 24s
      }

      // ortak summary text
      if (summary?.data?.summary) {
        $("#ortak-summary").textContent = summary.data.summary;
        $("#ortak-last-update").textContent = nowTime();
      }

      // features meta + list
      renderFeatures(features?.data);

      // users stats (live estimate for now)
      renderUsersLive();

      state.lastUpdatedAt = Date.now();
      renderAll();
      if (forceLog) pushLog("Canlı veriler API’den çekildi.");
    } catch (e) {
      state.apiOnline = false;
      refreshMockData(forceLog);
      renderAll();
      if (forceLog) pushLog("API hatası: mock moda düştü.");
    }
  }

  async function pingApi(forceLog) {
    if (state.mockMode) {
      state.apiOnline = false;
      renderApiPill();
      if (forceLog) pushLog("Mock mod açık. API ping atlanıyor.");
      return;
    }

    try {
      const res = await safeGet(PING_ENDPOINT);
      state.apiOnline = res?.status === "ok";
      renderApiPill();
      if (forceLog) pushLog(state.apiOnline ? "API ONLINE." : "API OFFLINE.");
    } catch {
      state.apiOnline = false;
      renderApiPill();
      if (forceLog) pushLog("API OFFLINE (ping fail).");
    }
  }

  async function safeGet(path) {
    const r = await fetch(API_BASE + path, { method: "GET" });
    if (!r.ok) throw new Error("GET fail");
    return r.json();
  }

  /* ---------- FEATURES UI ---------- */
  function renderFeatures(cfg) {
    const meta = $("#features-meta");
    const list = $("#features-list");

    if (meta) {
      meta.textContent = cfg
        ? `Config v${cfg.version || "1.0"} — ${cfg.lastUpdated || "canlı"}`
        : "Config (mock)";
    }

    if (!list) return;
    list.innerHTML = "";

    const items = cfg?.strategicGoals
      ? cfg.strategicGoals.map((g, i) => ({ key: `goal_${i}`, title: g, desc: "Stratejik hedef" }))
      : mockFeatures();

    items.forEach((f) => {
      const enabled = !!state.featureToggles[f.key];
      const row = document.createElement("div");
      row.className = "toggle-item";
      row.innerHTML = `
        <div>
          <div class="toggle-title">${f.title}</div>
          <div class="toggle-desc">${f.desc}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-toggle="${f.key}" data-label="${f.title}" ${enabled ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      `;
      list.appendChild(row);
    });

    // rebind new switches
    bindTogglesPersistence();
  }

  function mockFeatures() {
    return [
      { key: "ai_autopost", title: "AI Otomatik İçerik", desc: "Ziyaretçiyi tutmak için auto içerik." },
      { key: "b2b_mode", title: "B2B Radar", desc: "Kurumsal trafik tespiti." },
      { key: "growth_boost", title: "Growth Booster", desc: "A/B test + SEO dalgası." },
      { key: "spam_guard", title: "Spam Guard", desc: "Anormal trafiği keser." },
      { key: "reco_engine", title: "Öneri Motoru", desc: "Kişiye özel içerik akışı." },
    ];
  }

  function buildSuggestions() {
    const ul = $("#suggestions-list");
    if (!ul) return;
    ul.innerHTML = "";

    const suggestions = [
      "Premium için 3 günlük deneme akışı ekle.",
      "B2B ziyaretçileri ayrı segmentte etiketle.",
      "Ana sayfada 2 farklı CTA ile A/B test başlat.",
      "İçerik alanını otomatik önerilerle doldur.",
      "Spam ve bot trafiği için eşik arttır.",
    ];

    suggestions.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });
  }

  /* ---------- USERS LIVE (mock estimate) ---------- */
  function renderUsersLive() {
    const box = $("#users-stats");
    if (!box) return;

    const registered = Math.round(state.kpis.todayVisits * 0.08);
    const guest = state.kpis.todayVisits - registered;
    const conv = state.kpis.todayVisits ? (registered / state.kpis.todayVisits) * 100 : 0;

    $("#users-registered").textContent = fmt(registered);
    $("#users-guest").textContent = fmt(guest);
    $("#users-conversion").textContent = conv.toFixed(2) + "%";

    box.innerHTML = `
      <div class="status-row">
        <div>
          <div class="status-title">Aktif Şu An</div>
          <div class="status-desc">Online kullanıcı</div>
        </div>
        <div class="meter">${fmt(state.kpis.activeUsers)}</div>
      </div>
      <div class="status-row">
        <div>
          <div class="status-title">Bugün Ziyaret</div>
          <div class="status-desc">Toplam trafik</div>
        </div>
        <div class="meter">${fmt(state.kpis.todayVisits)}</div>
      </div>
    `;
  }

  /* ---------- RENDER ---------- */
  function renderAll() {
    renderApiPill();
    renderKpis();
    renderServices();
    renderMiniStats();
    renderLogs();
    renderLastUpdate();
  }

  function renderApiPill() {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const text = $(".api-text", pill);

    if (state.mockMode) {
      dot.style.background = "#f59e0b";
      dot.style.boxShadow = "0 0 12px rgba(245,158,11,0.9)";
      text.textContent = "Mock mod (demo)";
      return;
    }

    if (state.apiOnline) {
      dot.style.background = "#22c55e";
      dot.style.boxShadow = "0 0 12px rgba(34,197,94,0.9)";
      text.textContent = "API bağlantısı aktif";
    } else {
      dot.style.background = "#ef4444";
      dot.style.boxShadow = "0 0 12px rgba(239,68,68,0.9)";
      text.textContent = "API bağlantısı yok";
    }
  }

  function renderKpis() {
    setText("#kpi-todayVisits", fmt(state.kpis.todayVisits));
    setText("#kpi-activeUsers", fmt(state.kpis.activeUsers));
    setText("#kpi-growthRate", state.kpis.growthRate.toFixed(1) + "%");
    setText("#kpi-systemHealth", state.kpis.systemHealth + "/100");
  }

  function renderServices() {
    const list = $("#service-list");
    if (!list) return;
    list.innerHTML = "";

    state.services.forEach((s) => {
      const row = document.createElement("div");
      row.className = "status-row";
      row.innerHTML = `
        <div>
          <div class="status-title">${s.name}</div>
          <div class="status-desc">${serviceDesc(s.status)}</div>
        </div>
        <div class="pill ${s.status}">${serviceLabel(s.status)}</div>
      `;
      list.appendChild(row);
    });
  }

  function renderMiniStats() {
    setText("#mini-health", state.kpis.systemHealth);
    setText("#mini-state", state.kpis.systemHealth > 75 ? "Kararlı" : "Dikkat");
    setText("#mini-uptime", clamp(92 + state.kpis.systemHealth / 10, 92, 99.9).toFixed(1) + "%");
    setText("#mini-latency", clamp(520 - state.kpis.systemHealth * 1.2, 250, 520).toFixed(0) + "ms");
    setText("#mini-error", clamp(1.5 - state.kpis.systemHealth * 0.01, 0, 1.5).toFixed(2) + "%");
  }

  function renderLogs() {
    const ul = $("#log-list");
    if (!ul) return;
    ul.innerHTML = "";

    state.logs.slice(-50).forEach((l) => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <div class="log-time">${l.t}</div>
        <div class="log-text">${escapeHtml(l.m)}</div>
      `;
      ul.appendChild(li);
    });
  }

  function renderLastUpdate() {
    setText("#last-updated", new Date(state.lastUpdatedAt).toLocaleTimeString("tr-TR"));
  }

  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  }

  function serviceDesc(status) {
    return status === "ok" ? "Sağlıklı çalışıyor"
      : status === "warn" ? "İzleniyor / optimize ediliyor"
      : "Sorun tespit edildi";
  }
  function serviceLabel(status) {
    return status === "ok" ? "OK"
      : status === "warn" ? "DİKKAT"
      : "HATA";
  }

  /* ---------- MOCK DATA ---------- */
  function refreshMockData(forceLog) {
    const dv = randInt(200, 1200);
    state.kpis.todayVisits = clamp(state.kpis.todayVisits + dv, 0, 999999);

    const du = randInt(-5, 12);
    state.kpis.activeUsers = clamp(state.kpis.activeUsers + du, 30, 400);

    state.kpis.growthRate = clamp(state.kpis.growthRate + (Math.random() - 0.45), 0.2, 12);
    state.kpis.systemHealth = clamp(state.kpis.systemHealth + (Math.random() - 0.5) * 2, 55, 99);

    if (forceLog) pushLog("Mock veri güncellendi.");
    state.lastUpdatedAt = Date.now();
  }

  function driftMock() {
    refreshMockData(false);
    renderAll();
  }

  function bumpHealth(d) {
    state.kpis.systemHealth = clamp(state.kpis.systemHealth + d, 35, 100);
    renderKpis();
    renderMiniStats();
  }

  function markService(key, status) {
    const s = state.services.find((x) => x.key === key);
    if (s) s.status = status;
  }

  /* ---------- LOG / TOAST ---------- */
  function pushLog(message) {
    state.logs.push({ t: nowTime(), m: message });
    renderLogs();
  }

  function toast(message) {
    const t = $("#toast");
    const inner = $("#toast-inner");
    if (!t || !inner) return;
    inner.textContent = message;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  /* ---------- LOCAL STORAGE ---------- */
  function loadLocal(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }
  function saveLocal(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  /* ---------- UTILS ---------- */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
