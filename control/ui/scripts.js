/* =========================
   InflowAI Control Center UI
   scripts.js (LIVE + MOCK)
   ========================= */
(() => {
  "use strict";

  const API_BASE = "https://inflowai-api.onrender.com"; // Render API
  const PING_MS = 4500;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");
  const nowTime = () =>
    new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const state = {
    activePage: "overview",
    mockMode: false,      // LIVE başlar, düşerse otomatik mock olur
    apiOnline: false,
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

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();
    renderAll();
    boot();
  });

  /* ---------------- Boot / Live Fetch ---------------- */

  async function boot() {
    // İlk açılışta API ping
    await tick();
    setInterval(tick, PING_MS);
  }

  async function tick() {
    if (state.mockMode) {
      refreshMockData();
      renderAll();
      return;
    }

    const ok = await pingApi();
    if (!ok) {
      // Live düştü -> mock’a geç
      state.mockMode = true;
      pushLog("API erişimi yok. Mock moda geçildi.");
      refreshMockData();
      renderAll();
      return;
    }

    // Live veri çek
    await fetchLiveData();
    renderAll();
  }

  async function pingApi() {
    try {
      const r = await fetch(API_BASE + "/api/status", { cache: "no-store" });
      if (!r.ok) throw new Error("status not ok");
      state.apiOnline = true;
      return true;
    } catch (e) {
      state.apiOnline = false;
      return false;
    }
  }

  async function fetchLiveData() {
    try {
      const [summaryRes, featuresRes] = await Promise.all([
        fetch(API_BASE + "/api/ortak/summary", { cache: "no-store" }),
        fetch(API_BASE + "/api/ortak/features", { cache: "no-store" })
      ]);

      const summaryJson = await summaryRes.json();
      const featuresJson = await featuresRes.json();

      const data = summaryJson?.data || {};
      const metrics = data.metrics || {};
      const scores = data.scores || {};

      // KPI’ları doldur
      state.kpis.todayVisits = metrics.traffic ? metrics.traffic * 20 : rand(2000, 6000);
      state.kpis.activeUsers = metrics.activeUsers ?? rand(60, 180);
      state.kpis.growthRate = metrics.growthRate ?? 3.4;
      state.kpis.systemHealth = data.healthScore ?? data.globalHealth ?? rand(70, 95);

      // Ortak mesajı
      const ortakText = data.summary || "Ortak canlı analiz yapıyor.";
      assistantSay(ortakText);

      // Services durumunu features config ile ilişkilendir (şimdilik stabil)
      state.services = state.services.map(s => ({
        ...s,
        status: state.kpis.systemHealth > 75 ? "ok" : "warn"
      }));

      state.lastUpdatedAt = Date.now();
      pushLog("Live veri güncellendi (API).");
    } catch (e) {
      // Live veri çekilemedi -> mock fallback
      state.mockMode = true;
      state.apiOnline = false;
      pushLog("Live veri çekilemedi. Mock moda geçildi.");
      refreshMockData();
    }
  }

  /* ---------------- Navigation ---------------- */

  function bindNav() {
    $$(".nav-item").forEach(item => {
      on(item, "click", () => setActivePage(item.dataset.page));
    });
  }

  function setActivePage(pageKey) {
    state.activePage = pageKey;

    $$(".nav-item").forEach(i =>
      i.classList.toggle("active", i.dataset.page === pageKey)
    );
    $$(".page").forEach(p =>
      p.classList.toggle("active", p.dataset.page === pageKey)
    );

    toast(labelOf(pageKey) + " açıldı.");
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
      users: "Users",
      monetization: "Monetization",
      commands: "Komutlar",
      infinity: "Sonsuzluk Merkezi"
    };
    return map[key] || key;
  }

  /* ---------------- Topbar ---------------- */

  function bindTopbar() {
    on($("#btn-refresh"), "click", async () => {
      state.mockMode ? refreshMockData() : await fetchLiveData();
      renderAll();
      toast("Veriler yenilendi.");
    });

    on($("#btn-live"), "click", () => {
      state.mockMode = !state.mockMode;
      pushLog(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
      renderAll();
    });
  }

  /* ---------------- Toggles ---------------- */

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

  /* ---------------- Commands ---------------- */

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
    on(input, "keydown", e => e.key === "Enter" && run());
    on(clearBtn, "click", () => {
      $("#cmd-output").textContent = "";
      toast("Konsol temizlendi.");
    });

    tags.forEach(t =>
      on(t, "click", () => {
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      })
    );
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const out = $("#cmd-output");
    const stamp = nowTime();
    const c = cmd.toLowerCase();

    let result = "";

    if (c === "status" || c.includes("durum")) {
      result =
        `[#${stamp}] Durum: ${state.kpis.systemHealth > 75 ? "KARARLI" : "DİKKAT"}\n` +
        `API: ${state.mockMode ? "MOCK" : "LIVE"}\n` +
        `Health: ${state.kpis.systemHealth}/100\n` +
        `Büyüme: ${state.kpis.growthRate.toFixed(1)}%`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Restart kuyruğa alındı → ${cmd.split(" ")[1] || "core"} (mock).`;
      bumpHealth(-1);
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Scale talebi → ${cmd.split(" ")[1] || "auto"} (mock).`;
      bumpVisits(120);
      bumpGrowth(0.2);
    } else if (c.startsWith("clear logs")) {
      state.logs = [];
      $("#log-list").innerHTML = "";
      result = `[#${stamp}] Loglar temizlendi.`;
    } else if (c.startsWith("help")) {
      result =
        `[#${stamp}] Komutlar:\n` +
        `- status\n- restart <service>\n- scale <auto|n>\n- clear logs\n- help`;
    } else {
      result = `[#${stamp}] Ortak: “Komutu aldım → ${cmd}”`;
      bumpGrowth(0.1);
    }

    out.textContent = (out.textContent ? out.textContent + "\n\n" : "") + result;
    out.scrollTop = out.scrollHeight;
  }

  /* ---------------- Assistant (Ortak) ---------------- */

  function bindAssistant() {
    on($("#assistant-qa"), "click", () => {
      assistantSay(
        `Şu an ${state.kpis.activeUsers} aktif kullanıcı var. ` +
        `Büyüme ${state.kpis.growthRate.toFixed(1)}%. Health ${state.kpis.systemHealth}/100.`
      );
    });

    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto optimize çalışıyor. Zayıf katmanlar dengeleniyor.");
      bumpHealth(1);
    });

    on($("#assistant-repair"), "click", () => {
      assistantSay("Zayıf katman taraması bitti: Sharing katmanı izleniyor.");
      markService("sharing", "warn");
    });
  }

  function assistantSay(text) {
    const p = $("#assistant-bubble p");
    if (p) p.textContent = text;
    pushLog("Ortak: " + text);
  }

  /* ---------------- Notes ---------------- */

  function bindNotes() {
    const ta = $("#notes-textarea");
    const saveBtn = $("#notes-save");
    const clearBtn = $("#notes-clear");

    if (ta) {
      const saved = localStorage.getItem("inflow_notes");
      if (saved) ta.value = saved;
    }

    on(saveBtn, "click", () => {
      localStorage.setItem("inflow_notes", ta.value || "");
      toast("Not kaydedildi.");
      pushLog("Sonsuzluk Merkezi notu kaydedildi.");
    });

    on(clearBtn, "click", () => {
      ta.value = "";
      localStorage.removeItem("inflow_notes");
      toast("Notlar temizlendi.");
      pushLog("Sonsuzluk Merkezi notu temizlendi.");
    });
  }

  /* ---------------- Render ---------------- */

  function renderAll() {
    renderApiPill();
    renderKpis();
    renderServices();
    renderMiniStats();
    renderBars();
    renderLogs();
    renderLastUpdate();
  }

  function renderApiPill() {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill);

    const live = !state.mockMode && state.apiOnline;

    if (dot) {
      dot.style.background = live ? "#22c55e" : "#ef4444";
      dot.style.boxShadow = live
        ? "0 0 12px rgba(34,197,94,0.9)"
        : "0 0 12px rgba(239,68,68,0.9)";
    }
    if (txt) {
      txt.textContent = live
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

  function renderMiniStats() {
    setText("#mini-health", Math.round(state.kpis.systemHealth));
    setText("#mini-state", state.kpis.systemHealth > 75 ? "Kararlı" : "Dikkat");
    setText("#mini-uptime", `${clamp(92 + state.kpis.systemHealth/10, 92, 99.9).toFixed(1)}%`);
    setText("#mini-latency", `${clamp(520 - state.kpis.systemHealth*1.2, 250, 520).toFixed(0)}ms`);
    setText("#mini-error", `${clamp(1.5 - state.kpis.systemHealth*0.01, 0, 1.5).toFixed(2)}%`);
  }

  function renderBars() {
    // Basit bar fill’ler
    setWidth("#bar-uptime-fill", clamp(92 + state.kpis.systemHealth/10, 90, 100));
    setWidth("#bar-latency-fill", clamp(100 - (state.kpis.growthRate * 6), 40, 95));
    setWidth("#bar-error-fill", clamp(100 - state.kpis.systemHealth, 5, 30));
  }

  function renderLogs() {
    const ul = $("#log-list");
    if (!ul) return;
    ul.innerHTML = "";

    state.logs.slice(-50).forEach(l => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `<div class="log-time">${l.t}</div><div class="log-text">${escapeHtml(l.m)}</div>`;
      ul.appendChild(li);
    });
  }

  function renderLastUpdate() {
    setText("#last-updated", nowTime());
  }

  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  }
  function setWidth(sel, val) {
    const el = $(sel);
    if (el) el.style.width = clamp(val, 0, 100) + "%";
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

  /* ---------------- Mock fallback ---------------- */

  function refreshMockData() {
    state.kpis.todayVisits = rand(2000, 6500);
    state.kpis.activeUsers = rand(60, 180);
    state.kpis.growthRate = rand(1, 7) + Math.random();
    state.kpis.systemHealth = rand(70, 95);

    state.services = state.services.map(s => ({
      ...s, status: state.kpis.systemHealth > 75 ? "ok" : "warn"
    }));

    assistantSay(
      `Mock moddayım. Aktif ${state.kpis.activeUsers}, büyüme ${state.kpis.growthRate.toFixed(1)}%.`
    );

    state.lastUpdatedAt = Date.now();
  }

  function bumpVisits(d) { state.kpis.todayVisits = clamp(state.kpis.todayVisits + d, 0, 999999); }
  function bumpGrowth(d) { state.kpis.growthRate = clamp(state.kpis.growthRate + d, 0, 99); }
  function bumpHealth(d) { state.kpis.systemHealth = clamp(state.kpis.systemHealth + d, 35, 100); }
  function markService(key, status) {
    const s = state.services.find(x => x.key === key);
    if (s) s.status = status;
  }

  /* ---------------- Logs & Toast ---------------- */

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

  function rand(min, max) {
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
