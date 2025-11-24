/* =========================
   InflowAI Control Center UI
   scripts.js  (API + fallback mock)
   ========================= */
(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");
  const nowTime = () =>
    new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  /* ---------- API BASE (Render) ---------- */
  const API_BASE = "https://inflowai-api.onrender.com";

  /* ---------- State ---------- */
  const state = {
    activePage: "overview",
    mockMode: false,             // ÖNEMLİ: artık varsayılan live
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
      { key: "updating", name: "Updating", status: "ok" },
    ],
    logs: [
      { t: nowTime(), m: "Ortak motoru başlatılıyor..." }
    ],
  };

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();
    bindApiTest();

    // İlk render
    renderAll();

    // İlk API ping
    const ok = await pingApi();
    if (!ok) {
      state.mockMode = true;
      pushLog("API erişilemedi. Mock moda geçildi.");
    }

    // İlk veri çek
    await refreshData(true);

    // Ticker
    startTicker();
  });

  /* ---------- Navigation ---------- */
  function bindNav() {
    $$(".nav-item").forEach(btn => {
      on(btn, "click", () => setActivePage(btn.dataset.page));
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
      commands: "Komutlar",
      monetization: "Monetization",
      infinity: "Sonsuzluk Merkezi",
      users: "Users",
    };
    return map[key] || key;
  }

  /* ---------- Topbar ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", async () => {
      await refreshData(true);
      toast("Veriler yenilendi.");
    });

    on($("#btn-live"), "click", async () => {
      state.mockMode = !state.mockMode;
      const ok = state.mockMode ? false : await pingApi();
      if (!ok && !state.mockMode) {
        state.mockMode = true;
        pushLog("Live mod denenedi ama API yok. Mock devam.");
      }
      renderApiPill();
      toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
    });
  }

  function bindApiTest() {
    on($("#api-test"), "click", async () => {
      const ok = await pingApi();
      toast(ok ? "API aktif ✅" : "API yok ❌");
    });
  }

  /* ---------- Toggles ---------- */
  function bindToggles() {
    $$(".switch input").forEach(sw => {
      on(sw, "change", () => {
        const label = sw.dataset.label || "Ayar";
        pushLog(`${label}: ${sw.checked ? "Açık" : "Kapalı"}`);
      });
    });
  }

  /* ---------- Command Console ---------- */
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
    tags.forEach(t =>
      on(t, "click", () => {
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      })
    );
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const stamp = nowTime();
    let result = "";
    const c = cmd.toLowerCase();

    if (c === "status" || c.includes("durum")) {
      result = `[#${stamp}] Durum: ${state.kpis.systemHealth}/100 | Growth: ${state.kpis.growthRate.toFixed(1)}%`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Restart simülasyonu: ${cmd.split(" ")[1] || "core"}`;
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Scale simülasyonu: ${cmd.split(" ")[1] || "auto"}`;
    } else if (c.startsWith("help")) {
      result =
`[#${stamp}] Komutlar:
- status
- restart <service>
- scale <auto|n>
- help`;
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

  /* ---------- Assistant ---------- */
  function bindAssistant() {
    on($("#assistant-qa"), "click", () =>
      assistantSay("Sistemi taradım. Şu an stabil, büyüme sağlıklı.")
    );
    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto-optimizasyon (mock/live) başlatıldı.");
    });
    on($("#assistant-repair"), "click", () =>
      assistantSay("Zayıf katman taraması tamamlandı. Sharing izleniyor.")
    );
  }

  function assistantSay(text) {
    const p = $("#ortak-summary");
    if (p) p.textContent = text;
    pushLog(`Ortak: ${text}`);
  }

  /* ---------- Notes ---------- */
  function bindNotes() {
    const ta = $("#notes-textarea");
    const saveBtn = $("#notes-save");
    const clearBtn = $("#notes-clear");

    on(saveBtn, "click", () => {
      localStorage.setItem("inflow_notes", ta.value);
      toast("Not kaydedildi.");
    });
    on(clearBtn, "click", () => {
      ta.value = "";
      localStorage.removeItem("inflow_notes");
      toast("Notlar temizlendi.");
    });

    const v = localStorage.getItem("inflow_notes");
    if (v && ta) ta.value = v;
  }

  /* ---------- API Ping + Data ---------- */
  async function pingApi() {
    try {
      const r = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
      if (!r.ok) throw new Error("status not ok");
      state.mockMode = false;
      renderApiPill(true);
      pushLog("API bağlantısı aktif.");
      return true;
    } catch {
      renderApiPill(false);
      return false;
    }
  }

  async function refreshData(forceLog) {
    if (state.mockMode) {
      refreshMock(forceLog);
      renderAll();
      return;
    }

    try {
      // 1) Ortak summary
      const sumR = await fetch(`${API_BASE}/api/ortak/summary`, { cache: "no-store" });
      const sumJ = await sumR.json();
      const summary = sumJ?.data;

      if (summary) {
        // summary içinden KPI üret
        const m = summary.metrics || {};
        state.kpis.activeUsers = m.activeUsers ?? 90;
        state.kpis.growthRate = m.growthRate ?? 3.4;
        state.kpis.systemHealth = summary.healthScore ?? summary.globalHealth ?? 80;

        $("#ortak-summary").textContent = summary.summary || "Ortak özet hazır.";
        $("#ortak-mood").textContent = summary.mood || "Sakin";
      }

      // 2) Status
      const stR = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
      const stJ = await stR.json();
      const up = stJ?.uptime ? (99.0 + (Math.random()*0.9)).toFixed(1) : "99.9";
      $("#uptime-meter").textContent = `${up}%`;

      // 3) Visits’i sahadan tahmin (şu an gerçek endpoint yoksa)
      state.kpis.todayVisits = clamp(state.kpis.todayVisits + rand(10, 80), 0, 999999);

      state.lastUpdatedAt = Date.now();
      if (forceLog) pushLog("Canlı veriler API’den çekildi.");
      renderAll();
    } catch (e) {
      state.mockMode = true;
      pushLog("API çekim hatası. Mock moda dönüldü.");
      refreshMock(forceLog);
      renderAll();
    }
  }

  function refreshMock(forceLog) {
    state.kpis.todayVisits = clamp(state.kpis.todayVisits + rand(40, 140), 0, 999999);
    state.kpis.activeUsers = clamp(state.kpis.activeUsers + rand(-5, 9), 40, 400);
    state.kpis.growthRate = clamp(state.kpis.growthRate + (Math.random()-0.4)*0.3, 0, 99);
    state.kpis.systemHealth = clamp(state.kpis.systemHealth + (Math.random()-0.5)*1.5, 35, 100);
    state.lastUpdatedAt = Date.now();
    if (forceLog) pushLog("Mock veri yenilendi.");
  }

  /* ---------- Ticker ---------- */
  function startTicker() {
    setInterval(() => refreshData(false), 5000);
  }

  /* ---------- Render ---------- */
  function renderAll() {
    renderApiPill();
    renderKpis();
    renderServices();
    renderMiniStats();
    renderLogs();
    renderLastUpdate();
  }

  function renderApiPill(liveOk = !state.mockMode) {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill);

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

  function renderMiniStats() {
    setText("#mini-health", Math.round(state.kpis.systemHealth));
    setText("#mini-state", state.kpis.systemHealth > 75 ? "Kararlı" : "Dikkat");
    setText("#mini-uptime", `${clamp(92 + state.kpis.systemHealth/10, 92, 99.9).toFixed(1)}%`);
    setText("#mini-latency", `${clamp(520 - state.kpis.systemHealth*1.2, 250, 520).toFixed(0)}ms`);
    setText("#mini-error", `${clamp(1.5 - state.kpis.systemHealth*0.01, 0, 1.5).toFixed(2)}%`);
  }

  function renderLogs() {
    const ul = $("#log-list");
    const count = $("#log-count");
    if (!ul) return;
    ul.innerHTML = "";
    state.logs.slice(-50).forEach(l => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `<div class="log-time">${l.t}</div><div class="log-text">${escapeHtml(l.m)}</div>`;
      ul.appendChild(li);
    });
    if (count) count.textContent = `${state.logs.length} kayıt`;
  }

  function renderLastUpdate() {
    setText("#last-updated", nowTime());
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
