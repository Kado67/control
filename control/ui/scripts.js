/* =========================
   InflowAI Control Center UI
   scripts.js (LIVE + fallback)
   ========================= */
(() => {
  "use strict";

  const API_BASE = "https://inflowai-api.onrender.com";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");

  const state = {
    activePage: "overview",
    mockMode: false,
    lastUpdatedAt: Date.now(),
    kpis: {
      todayVisits: 0,
      activeUsers: 0,
      growthRate: 0,
      systemHealth: 0
    },
    services: [
      { key: "core", name: "Core (Beyin)", status: "ok" },
      { key: "growth", name: "Growth", status: "ok" },
      { key: "services", name: "Services", status: "ok" },
      { key: "sharing", name: "Sharing", status: "warn" },
      { key: "security", name: "Security", status: "ok" },
      { key: "updating", name: "Updating", status: "ok" }
    ],
    featuresFromApi: null,
    ortakSummary: null,
    logs: []
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();

    setActivePage("overview");
    boot();
  });

  async function boot() {
    await refreshLiveData(true);
    renderAll();
    startTicker();
  }

  /* ---------- Navigation ---------- */
  function bindNav() {
    $$(".nav-item").forEach(item => {
      on(item, "click", () => setActivePage(item.dataset.page));
    });
  }

  function setActivePage(pageKey) {
    if (!pageKey) return;
    state.activePage = pageKey;

    $$(".nav-item").forEach(i =>
      i.classList.toggle("active", i.dataset.page === pageKey)
    );

    $$(".page").forEach(p =>
      p.classList.toggle("active", p.dataset.page === pageKey)
    );

    toast(`${labelOf(pageKey)} açıldı.`);
  }

  function labelOf(key) {
    const map = {
      overview: "Genel Bakış",
      core: "Core (Beyin)",
      growth: "Growth",
      services: "Services",
      sharing: "Sharing",
      security: "Security",
      updating: "Updating",
      commands: "Komut Haritası",
      monetization: "Monetization",
      infinity: "Sonsuzluk Merkezi",
      users: "Users"
    };
    return map[key] || key;
  }

  /* ---------- Topbar ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", async () => {
      await refreshLiveData(true);
      renderAll();
      toast("Veriler yenilendi.");
    });

    on($("#btn-live"), "click", async () => {
      state.mockMode = !state.mockMode;
      await refreshLiveData(true);
      renderAll();
      toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
    });
  }

  /* ---------- Toggles ---------- */
  function bindToggles() {
    $$(".switch input").forEach(sw => {
      on(sw, "change", () => {
        const label = sw.dataset.label || "Ayar";
        const val = sw.checked ? "Açık" : "Kapalı";
        pushLog(`${label}: ${val}`);
        toast(`${label} ${val}`);
      });
    });

    on($("#growth-ab"), "click", () => {
      pushLog("A/B Test başlatıldı (mock).");
      toast("A/B Test başlatıldı.");
    });
    on($("#growth-push"), "click", () => {
      pushLog("Otomatik Push devreye alındı (mock).");
      toast("Push aktif.");
    });
    on($("#growth-retain"), "click", () => {
      pushLog("Retention modları güçlendirildi (mock).");
      toast("Retention güçlendi.");
    });
  }

  /* ---------- Commands ---------- */
  function bindCommands() {
    const input = $("#cmd-input");
    const runBtn = $("#cmd-run");
    const clearBtn = $("#cmd-clear");
    const tags = $$(".tag");

    const run = () => {
      const cmd = (input && input.value || "").trim();
      if (!cmd) return toast("Komut boş.");
      handleCommand(cmd);
      input.value = "";
    };

    on(runBtn, "click", run);
    on(input, "keydown", e => e.key === "Enter" && run());
    on(clearBtn, "click", () => {
      setCmdOutput("");
      toast("Konsol temizlendi.");
    });

    tags.forEach(t => on(t, "click", () => {
      if (!input) return;
      input.value = t.dataset.cmd || t.textContent.trim();
      input.focus();
    }));
  }

  function handleCommand(cmd) {
    pushLog(`Komut çalıştırıldı: ${cmd}`);
    const stamp = new Date().toLocaleTimeString("tr-TR");
    const c = cmd.toLowerCase();
    let result = "";

    if (c === "status" || c.includes("durum")) {
      result =
`[#${stamp}] Sistem Durumu: ${state.kpis.systemHealth >= 75 ? "KARARLI" : "DİKKAT"}
Uptime: ${getUptime().toFixed(1)}%
API: ${state.mockMode ? "MOCK" : "LIVE"}
Health: ${state.kpis.systemHealth}/100`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Yeniden başlatma kuyruğa alındı (mock).\nBileşen: ${cmd.split(" ")[1] || "core"}`;
      bumpHealth(-1);
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Ölçekleme talebi alındı (mock).\nHedef: ${cmd.split(" ")[1] || "auto"}`;
      bumpVisits(5);
    } else if (c.startsWith("clear logs")) {
      state.logs = [];
      result = `[#${stamp}] Loglar temizlendi.`;
    } else if (c.startsWith("help")) {
      result =
`[#${stamp}] Komutlar:
- status
- restart <service>
- scale <auto|n>
- clear logs
- help`;
    } else {
      result = `[#${stamp}] Ortak: “Komutu aldım: ${cmd} (mock simülasyon)”`;
      bumpGrowth(0.1);
    }

    appendCmdOutput(result);
    renderAll();
  }

  /* ---------- Assistant (Ortak) ---------- */
  function bindAssistant() {
    on($("#assistant-qa"), "click", () => {
      assistantSay("Durum taraması tamam. Growth ve Core stabil, Sharing iyileştirme öneriyor.");
    });
    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto-optimizasyon başlattım. Ufak özellikleri otomatik açıyorum.");
      bumpHealth(1);
      bumpGrowth(0.2);
      renderAll();
    });
    on($("#assistant-repair"), "click", () => {
      assistantSay("Zayıf katman tarandı. Sharing katmanında öneri listesi güncellendi.");
      markService("sharing", "warn");
      renderAll();
    });
  }

  function assistantSay(text) {
    const p = $("#assistant-bubble p");
    if (p) p.textContent = text;
    pushLog(`Ortak: ${text}`);
  }

  /* ---------- Notes ---------- */
  function bindNotes() {
    const saveBtn = $("#notes-save");
    const clearBtn = $("#notes-clear");
    const ta = $("#notes-textarea");

    on(saveBtn, "click", () => {
      if (!ta) return;
      localStorage.setItem("inflow_notes", ta.value);
      toast("Not kaydedildi.");
      pushLog("Sonsuzluk Merkezi notları kaydedildi.");
    });

    on(clearBtn, "click", () => {
      if (!ta) return;
      ta.value = "";
      localStorage.removeItem("inflow_notes");
      toast("Notlar temizlendi.");
      pushLog("Sonsuzluk Merkezi notları temizlendi.");
    });

    if (ta) {
      const v = localStorage.getItem("inflow_notes");
      if (v) ta.value = v;
    }
  }

  /* ---------- LIVE DATA ---------- */
  async function refreshLiveData(forceLog) {
    if (state.mockMode) {
      refreshMockData(forceLog);
      return;
    }

    try {
      const statusRes = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
      if (!statusRes.ok) throw new Error("status not ok");

      const summaryRes = await fetch(`${API_BASE}/api/ortak/summary`, { cache: "no-store" });
      if (!summaryRes.ok) throw new Error("summary not ok");

      const featuresRes = await fetch(`${API_BASE}/api/ortak/features`, { cache: "no-store" });
      if (!featuresRes.ok) throw new Error("features not ok");

      const summaryJson = await summaryRes.json();
      const featuresJson = await featuresRes.json();

      const data = summaryJson.data || summaryJson;
      state.ortakSummary = data;
      state.featuresFromApi = featuresJson.data || featuresJson;

      const m = data.metrics || {};
      state.kpis.activeUsers = m.activeUsers ?? 90;
      state.kpis.growthRate = m.growthRate ?? 3.4;
      state.kpis.systemHealth = data.healthScore ?? data.globalHealth ?? 80;
      state.kpis.todayVisits = (m.traffic ?? 120) * 10;

      state.lastUpdatedAt = Date.now();
      if (forceLog) pushLog("Live veri API’den alındı.");
    } catch (e) {
      state.mockMode = true;
      refreshMockData(true);
      pushLog("Live veri alınamadı, mock moda geçildi.");
    }
  }

  /* ---------- MOCK ---------- */
  function refreshMockData(forceLog) {
    bumpVisits(randInt(20, 80));
    state.kpis.activeUsers = clamp(state.kpis.activeUsers + randInt(-3, 6), 40, 400);
    bumpGrowth((Math.random() - 0.45) * 0.5);
    bumpHealth((Math.random() - 0.5) * 2);

    if (Math.random() < 0.08) {
      const idx = randInt(0, state.services.length - 1);
      state.services[idx].status = Math.random() < 0.7 ? "ok" : "warn";
    }

    state.lastUpdatedAt = Date.now();
    if (forceLog) pushLog("Mock veri yenilendi.");
  }

  function startTicker() {
    setInterval(async () => {
      await refreshLiveData(false);
      renderAll();
    }, 5000);
  }

  /* ---------- Render ---------- */
  function renderAll() {
    renderApiPill();
    renderKpis();
    renderServices();
    renderHealthBars();
    renderLogs();
    renderMiniStats();
    renderLastUpdate();
    renderOrtakBox();
    renderUsersMock();
    renderServicesFeaturesFromApi();
  }

  function renderApiPill() {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill);

    const liveOk = !state.mockMode;
    if (dot) {
      dot.style.background = liveOk ? "#22c55e" : "#ef4444";
      dot.style.boxShadow = liveOk
        ? "0 0 12px rgba(34,197,94,0.9)"
        : "0 0 12px rgba(239,68,68,0.9)";
    }
    if (txt) {
      txt.textContent = liveOk
        ? "API bağlantısı aktif (live)"
        : "API bağlantısı yok (mock mod)";
    }
  }

  function renderKpis() {
    setText("#kpi-todayVisits", fmt(state.kpis.todayVisits));
    setText("#kpi-activeUsers", fmt(state.kpis.activeUsers));
    setText("#kpi-growthRate", `${state.kpis.growthRate.toFixed(1)}%`);
    setText("#kpi-systemHealth", `${Math.round(state.kpis.systemHealth)}/100`);
  }

  function renderServices() {
    const list = $("#service-list");
    if (!list) return;
    list.innerHTML = "";
    state.services.forEach(s => {
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

  function renderHealthBars() {
    setBar("#bar-api", state.mockMode ? 0 : 96);
    setBar("#bar-latency", clamp(100 - (state.kpis.todayVisits % 40), 55, 98));
    setBar("#bar-error", clamp(100 - (state.kpis.systemHealth * 0.9), 0, 25));
    setBar("#bar-uptime", getUptime());

    setText("#api-meter", `${state.mockMode ? 0 : 96}%`);
    setText("#latency-meter", `${clamp(100 - (state.kpis.todayVisits % 40), 55, 98).toFixed(0)}%`);
    setText("#error-meter", `${clamp(100 - (state.kpis.systemHealth * 0.9), 0, 25).toFixed(1)}%`);
    setText("#uptime-meter", `${getUptime().toFixed(1)}%`);
  }

  function getUptime() {
    return clamp(92 + (state.kpis.systemHealth / 10), 92, 99.9);
  }

  function renderLogs() {
    const ul = $("#log-list");
    if (!ul) return;
    ul.innerHTML = "";
    state.logs.slice(-50).forEach(l => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <div class="log-time">${l.t}</div>
        <div class="log-text">${escapeHtml(l.m)}</div>
      `;
      ul.appendChild(li);
    });
  }

  function renderMiniStats() {
    setText("#mini-health", Math.round(state.kpis.systemHealth));
    setText("#mini-state", state.kpis.systemHealth > 75 ? "Kararlı" : "Dikkat");
    setText("#mini-uptime", `${getUptime().toFixed(1)}%`);
    setText("#mini-latency", `${clamp(520 - state.kpis.systemHealth * 1.2, 250, 520).toFixed(0)}ms`);
    setText("#mini-error", `${clamp(1.5 - state.kpis.systemHealth * 0.01, 0, 1.5).toFixed(2)}%`);
  }

  function renderLastUpdate() {
    setText("#last-updated", new Date(state.lastUpdatedAt).toLocaleTimeString("tr-TR"));
  }

  function renderOrtakBox() {
    const list = $("#ortak-actions");
    if (!list) return;

    list.innerHTML = "";
    const s = state.ortakSummary;
    if (!s) {
      const li = document.createElement("li");
      li.textContent = "Ortak özeti bekleniyor…";
      list.appendChild(li);
      return;
    }

    assistantSay(s.summary || "Ortak aktif.");

    const actions = s.allActions || s.actions || [];
    actions.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      list.appendChild(li);
    });
  }

  function renderUsersMock() {
    setText("#users-registered", fmt(clamp(Math.round(state.kpis.todayVisits / 8), 0, 999999)));
    setText("#users-guest", fmt(clamp(state.kpis.todayVisits, 0, 999999)));
    setText("#users-active", fmt(state.kpis.activeUsers));
  }

  function renderServicesFeaturesFromApi() {
    const box = $("#services-feature-list");
    if (!box) return;
    box.innerHTML = "";

    const cfg = state.featuresFromApi;
    if (!cfg) {
      const div = document.createElement("div");
      div.className = "toggle-item";
      div.innerHTML = `<div><div class="toggle-title">Özellik listesi bekleniyor…</div>
        <div class="toggle-desc">API bağlanınca Ortak buraya özellik dökecek.</div></div>`;
      box.appendChild(div);
      return;
    }

    const goals = cfg.strategicGoals || [];
    goals.slice(0, 12).forEach((g) => {
      const div = document.createElement("div");
      div.className = "toggle-item";
      div.innerHTML = `
        <div>
          <div class="toggle-title">${g.title || g}</div>
          <div class="toggle-desc">${g.desc || "Ortak önerisi"}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-label="${g.title || g}"/>
          <span class="slider"></span>
        </label>
      `;
      box.appendChild(div);
    });
  }

  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  }

  function setBar(sel, val) {
    const el = $(sel);
    if (!el) return;
    const v = clamp(val, 0, 100);
    el.style.width = v + "%";
    el.setAttribute("aria-valuenow", String(v));
    const label = el.dataset.labelSel ? $(el.dataset.labelSel) : null;
    if (label) label.textContent = v.toFixed(1) + "%";
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

  function bumpVisits(delta) {
    state.kpis.todayVisits = clamp(state.kpis.todayVisits + delta, 0, 999999);
  }
  function bumpGrowth(delta) {
    state.kpis.growthRate = clamp(state.kpis.growthRate + delta, 0, 99);
  }
  function bumpHealth(delta) {
    state.kpis.systemHealth = clamp(state.kpis.systemHealth + delta, 35, 100);
  }
  function markService(key, status) {
    const s = state.services.find(x => x.key === key);
    if (s) s.status = status;
  }

  function pushLog(message) {
    state.logs.push({ t: nowTime(), m: message });
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

  function nowTime() {
    return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
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
})();
