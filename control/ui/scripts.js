/* =========================
   InflowAI Control Center UI
   scripts.js  (FINAL)
   - Live API + fallback mock
   - Ortak konuşur
   ========================= */
(() => {
  "use strict";

  const API_BASE = "https://inflowai-api.onrender.com"; // Render API

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");

  /* ---------- state ---------- */
  const state = {
    activePage: "overview",
    mockMode: false,        // LIVE ile başla, düşerse mock’a geçer
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
      { key: "sharing", name: "Sharing", status: "ok" },
      { key: "security", name: "Security", status: "ok" },
      { key: "updating", name: "Updating", status: "ok" }
    ],
    logs: []
  };

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();

    on($("#btn-ping"), "click", pingApi);

    await pingApi();     // ilk ping
    await refreshData(); // ilk veri
    renderAll();

    setInterval(async () => {
      await refreshData();
      renderAll();
    }, 5000);
  });

  /* ---------- API ---------- */
  async function pingApi() {
    try {
      const t0 = performance.now();
      const r = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
      if (!r.ok) throw new Error("status not ok");
      const dt = performance.now() - t0;

      state.mockMode = false;
      setBar("#bar-api", 98);
      setText("#badge-mode", "Live");

      pushLog(`API bağlantısı aktif. Ping ${dt.toFixed(0)}ms`);
      renderApiPill(true);
      return true;
    } catch (e) {
      state.mockMode = true;
      setBar("#bar-api", 0);
      setText("#badge-mode", "Mock");
      renderApiPill(false);
      pushLog("API bağlantısı yok. Mock moda geçildi.");
      return false;
    }
  }

  async function refreshData() {
    state.lastUpdatedAt = Date.now();

    if (state.mockMode) {
      refreshMockData();
      assistantSay(buildMockSummary());
      return;
    }

    try {
      // 1) Ortak summary
      const sumRes = await fetch(`${API_BASE}/api/ortak/summary`, { cache: "no-store" });
      const sumJson = await sumRes.json();
      const summary = sumJson?.data || {};

      // 2) Ortak features/config
      const featRes = await fetch(`${API_BASE}/api/ortak/features`, { cache: "no-store" });
      const featJson = await featRes.json();
      const cfg = featJson?.data || {};

      // KPI’leri summary’den al
      const metrics = summary.metrics || {};
      state.kpis.todayVisits = metrics.traffic ? metrics.traffic * 15 : randInt(2500, 6500);
      state.kpis.activeUsers = metrics.activeUsers ?? randInt(70, 160);
      state.kpis.growthRate  = metrics.growthRate ?? 3.4;
      state.kpis.systemHealth = summary.healthScore ?? summary.globalHealth ?? randInt(70, 95);

      // Ortak mood ve konuşma
      setText("#ortakMoodLabel", summary.mood || "Kararlı");
      assistantSay(summary.summary || "Ortak: Sistem stabil, büyümeyi izliyorum.");

      // Updating sayfası bilgi
      setText("#config-info", cfg.version ? `v${cfg.version}` : "v1");
      setText("#deploy-info", new Date().toLocaleDateString("tr-TR"));

      // Barlar
      setBar("#bar-latency", clamp(95 - (metrics.apiLatency ?? 420) / 10, 55, 98));
      setBar("#bar-error", clamp((metrics.errorRate ?? 0.7) * 10, 0, 25));
      setBar("#bar-uptime", clamp(metrics.uptime ?? 99.2, 92, 99.9));

      pushLog("Live veriler güncellendi.");
    } catch (e) {
      // live bozulursa mock’a düş
      state.mockMode = true;
      refreshMockData();
      assistantSay(buildMockSummary());
      renderApiPill(false);
      pushLog("Live veri çekilemedi, mock moda geçildi.");
    }
  }

  /* ---------- navigation ---------- */
  function bindNav() {
    $$(".nav-item").forEach(item => {
      on(item, "click", () => setActivePage(item.dataset.page));
    });
  }

  function setActivePage(pageKey) {
    if (!pageKey) return;
    state.activePage = pageKey;

    $$(".nav-item").forEach(i => i.classList.toggle("active", i.dataset.page === pageKey));
    $$(".page").forEach(p => p.classList.toggle("active", p.dataset.page === pageKey));

    toast(`${labelOf(pageKey)} açıldı.`);
  }

  function labelOf(key) {
    const map = {
      overview:"Genel Bakış", core:"Core", growth:"Growth", services:"Services",
      sharing:"Sharing", security:"Security", updating:"Updating",
      commands:"Komutlar", monetization:"Monetization", infinity:"Sonsuzluk Merkezi", users:"Users"
    };
    return map[key] || key;
  }

  /* ---------- topbar ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", async () => {
      await refreshData();
      renderAll();
      toast("Veriler yenilendi.");
    });

    on($("#btn-live"), "click", async () => {
      state.mockMode = !state.mockMode;
      renderApiPill(!state.mockMode);
      toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
      await refreshData();
      renderAll();
    });
  }

  /* ---------- toggles ---------- */
  function bindToggles() {
    $$(".switch input").forEach(sw => {
      on(sw, "change", () => {
        const label = sw.dataset.label || "Ayar";
        const val = sw.checked ? "Açık" : "Kapalı";
        pushLog(`${label}: ${val}`);
        toast(`${label} ${val}`);
      });
    });
  }

  /* ---------- commands ---------- */
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
    tags.forEach(t => on(t, "click", () => { input.value = t.dataset.cmd; input.focus(); }));
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const stamp = new Date().toLocaleTimeString("tr-TR");
    let result = "";
    const c = cmd.toLowerCase();

    if (c === "status") {
      result = `[#${stamp}] Durum: ${state.mockMode ? "MOCK" : "LIVE"} | Health ${state.kpis.systemHealth}/100`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Restart (mock): ${cmd.split(" ")[1] || "core"}`;
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Scale (mock): ${cmd.split(" ")[1] || "auto"}`;
    } else {
      result = `[#${stamp}] Ortak: “Komutu aldım: ${cmd}”`;
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

  /* ---------- assistant ---------- */
  function bindAssistant() {
    on($("#assistant-qa"), "click", () => assistantSay(buildHumanSummary()));
    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto-optimizasyon başlattım. Küçük özellikleri aktive ediyorum.");
      bumpHealth(1);
    });
    on($("#assistant-repair"), "click", () => {
      assistantSay("Zayıf katman taraması: Sharing izleniyor. Güçlendirme öneriyorum.");
      markService("sharing", "warn");
    });
  }

  function assistantSay(text) {
    const bubble = $("#assistant-bubble p");
    if (bubble) bubble.textContent = text;
    pushLog(`Ortak: ${text}`);
  }

  /* ---------- notes ---------- */
  function bindNotes() {
    const ta = $("#notes-textarea");
    const saveBtn = $("#notes-save");
    const clearBtn = $("#notes-clear");

    on(saveBtn, "click", () => {
      localStorage.setItem("inflow_notes", ta.value);
      toast("Not kaydedildi.");
      pushLog("Not kaydedildi.");
    });
    on(clearBtn, "click", () => {
      ta.value = "";
      localStorage.removeItem("inflow_notes");
      toast("Notlar temizlendi.");
      pushLog("Notlar temizlendi.");
    });

    const v = localStorage.getItem("inflow_notes");
    if (v && ta) ta.value = v;
  }

  /* ---------- render ---------- */
  function renderAll() {
    renderApiPill(!state.mockMode);
    renderKpis();
    renderServices();
    renderMiniStats();
    renderLastUpdate();
  }

  function renderApiPill(isOn) {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill);
    if (dot) {
      dot.style.background = isOn ? "#22c55e" : "#ef4444";
      dot.style.boxShadow  = isOn ? "0 0 12px rgba(34,197,94,.9)" : "0 0 12px rgba(239,68,68,.9)";
    }
    if (txt) txt.textContent = isOn ? "API bağlantısı aktif (live)" : "API bağlantısı yok (mock mod)";
  }

  function renderKpis() {
    setText("#kpi-todayVisits", fmt(state.kpis.todayVisits));
    setText("#kpi-activeUsers", fmt(state.kpis.activeUsers));
    setText("#kpi-growthRate", `${state.kpis.growthRate.toFixed(1)}%`);
    setText("#kpi-systemHealth", `${state.kpis.systemHealth}/100`);
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

  function renderMiniStats() {
    setText("#mini-health", state.kpis.systemHealth);
    setText("#mini-state", state.kpis.systemHealth > 75 ? "Kararlı" : "Dikkat");
    setText("#mini-uptime", clamp(92 + state.kpis.systemHealth/10, 92, 99.9).toFixed(1) + "%");
    setText("#mini-latency", clamp(520 - state.kpis.systemHealth*1.2, 250, 520).toFixed(0) + "ms");
    setText("#mini-error", clamp(1.5 - state.kpis.systemHealth*0.01, 0, 1.5).toFixed(2) + "%");
  }

  function renderLastUpdate() {
    setText("#last-updated", new Date(state.lastUpdatedAt).toLocaleTimeString("tr-TR"));
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

  /* ---------- mock fallback ---------- */
  function refreshMockData() {
    state.kpis.todayVisits = randInt(2400, 7200);
    state.kpis.activeUsers = randInt(60, 180);
    state.kpis.growthRate  = randInt(1, 7) + Math.random();
    state.kpis.systemHealth= randInt(70, 95);
    setText("#ortakMoodLabel", state.kpis.growthRate >= 5 ? "Heyecanlı" : "Kararlı");
  }

  function buildMockSummary() {
    return `Aktif ziyaretçi ~${state.kpis.activeUsers}. Günlük büyüme ${state.kpis.growthRate.toFixed(1)}%. Sistem sağlığı ${state.kpis.systemHealth}/100. Ortak izliyor ve yeni küçük özellikleri otomatik açıyor.`;
  }

  function buildHumanSummary() {
    return `Şu an ${state.kpis.activeUsers} kişi aktif. Büyüme ${state.kpis.growthRate.toFixed(1)}%. Sağlık ${state.kpis.systemHealth}/100. Premium/Kurumsal/B2B açarsan dönüşüm hızlanır.`;
  }

  function bumpHealth(delta) {
    state.kpis.systemHealth = clamp(state.kpis.systemHealth + delta, 35, 100);
  }
  function markService(key, status) {
    const s = state.services.find(x => x.key === key);
    if (s) s.status = status;
  }

  /* ---------- logs / toast ---------- */
  function pushLog(message) {
    const ul = $("#log-list");
    const t = new Date().toLocaleTimeString("tr-TR", { hour:"2-digit", minute:"2-digit" });
    state.logs.push({ t, m: message });
    if (!ul) return;
    ul.innerHTML = "";
    state.logs.slice(-50).reverse().forEach(l => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `<div class="log-time">${l.t}</div><div class="log-text">${escapeHtml(l.m)}</div>`;
      ul.appendChild(li);
    });
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

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

})();
