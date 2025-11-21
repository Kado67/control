/* =========================
   InflowAI Control Center UI
   scripts.js  (no deps)
   ========================= */
(() => {
  "use strict";

  /* ---------- Safe helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");

  /* ---------- State ---------- */
  const state = {
    activePage: "overview",
    mockMode: true,
    lastUpdatedAt: Date.now(),
    kpis: {
      todayVisits: 120,
      activeUsers: 90,
      growthRate: 3.4,
      systemHealth: 81
    },
    services: [
      { key: "core", name: "Core (Beyin)", status: "ok" },
      { key: "growth", name: "Growth", status: "ok" },
      { key: "services", name: "Services", status: "ok" },
      { key: "sharing", name: "Sharing", status: "warn" },
      { key: "security", name: "Security", status: "ok" },
      { key: "updating", name: "Updating", status: "ok" }
    ],
    logs: [
      { t: nowTime(), m: "Ortak mod aktif. Mock veri yükleniyor." }
    ]
  };

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();
    renderAll();
    startMockTicker();
  });

  /* ---------- Navigation / Pages ---------- */
  function bindNav() {
    const navItems = $$(".nav-item");
    navItems.forEach(item => {
      const page = item.dataset.page;
      on(item, "click", () => setActivePage(page));
    });
  }

  function setActivePage(pageKey) {
    if (!pageKey) return;
    state.activePage = pageKey;

    // nav active
    $$(".nav-item").forEach(i => {
      i.classList.toggle("active", i.dataset.page === pageKey);
    });

    // page active
    $$(".page").forEach(p => {
      p.classList.toggle("active", p.dataset.page === pageKey);
    });

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
      users: "Users"
    };
    return map[key] || key;
  }

  /* ---------- Topbar actions ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", () => {
      refreshMockData(true);
      renderAll();
      toast("Veriler yenilendi.");
    });

    on($("#btn-live"), "click", () => {
      state.mockMode = !state.mockMode;
      renderApiPill();
      toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
    });
  }

  /* ---------- Toggles (Security / System / etc.) ---------- */
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

  /* ---------- Command Console ---------- */
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
    on(input, "keydown", (e) => {
      if (e.key === "Enter") run();
    });
    on(clearBtn, "click", () => {
      setCmdOutput("");
      toast("Konsol temizlendi.");
    });

    tags.forEach(t => {
      on(t, "click", () => {
        if (!input) return;
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      });
    });
  }

  function handleCommand(cmd) {
    pushLog(`Komut çalıştırıldı: ${cmd}`);
    const out = $("#cmd-output");
    const stamp = new Date().toLocaleTimeString("tr-TR");

    // Simple command router (mock)
    let result = "";
    const c = cmd.toLowerCase();

    if (c === "status" || c.includes("durum")) {
      result = `[#${stamp}] Sistem Durumu: KARARLI\nUptime: 99.9%\nAPI: ${state.mockMode ? "MOCK" : "LIVE"}\nHealth: ${state.kpis.systemHealth}/100`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Yeniden başlatma kuyruğa alındı.\nBileşen: ${cmd.split(" ")[1] || "core"}\nETA: 3-7s (mock)`;
      bumpHealth(-1);
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Ölçekleme talebi alındı.\nHedef: ${cmd.split(" ")[1] || "auto"}\nMod: Adaptive (mock)`;
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
      result = `[#${stamp}] Ortak: “Komutu aldım. Mock modda simüle ettim: ${cmd}”`;
      bumpGrowth(0.1);
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

  /* ---------- Assistant (Ortak) ---------- */
  function bindAssistant() {
    on($("#assistant-qa"), "click", () => {
      assistantSay("Sorunu taradım. Şu anda UI mock modda stabil. Bir sonraki adım API live bağlamak.");
    });
    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto-optimizasyon (mock) başlattım. Health ve latency dengeleniyor.");
      bumpHealth(1);
    });
    on($("#assistant-repair"), "click", () => {
      assistantSay("Zayıf katman kontrolü yapıldı. Sharing katmanında iyileştirme öneriyorum.");
      markService("sharing", "warn");
    });
  }

  function assistantSay(text) {
    const bubble = $("#assistant-bubble");
    const p = bubble ? $("p", bubble) : null;
    if (p) p.textContent = text;
    pushLog(`Ortak: ${text}`);
  }

  /* ---------- Notes (Sonsuzluk Merkezi / Notlar) ---------- */
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

    // load on start
    if (ta) {
      const v = localStorage.getItem("inflow_notes");
      if (v) ta.value = v;
    }
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
  }

  function renderApiPill() {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill) || pill;
    if (dot) {
      dot.style.background = state.mockMode ? "#ef4444" : "#22c55e";
      dot.style.boxShadow = state.mockMode
        ? "0 0 12px rgba(239,68,68,0.9)"
        : "0 0 12px rgba(34,197,94,0.9)";
    }
    if (txt) {
      txt.textContent = state.mockMode
        ? "API bağlantısı yok (mock mod)"
        : "API bağlantısı aktif (live)";
    }
  }

  function renderKpis() {
    setText("#kpi-todayVisits", fmt(state.kpis.todayVisits));
    setText("#kpi-activeUsers", fmt(state.kpis.activeUsers));
    setText("#kpi-growthRate", `${state.kpis.growthRate.toFixed(1)}%`);
    setText("#kpi-systemHealth", `${state.kpis.systemHealth}/100`);
  }

  function renderServices() {
    // optional list area
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
    // Example bars (if exist)
    setBar("#bar-api", state.mockMode ? 0 : 96);
    setBar("#bar-latency", clamp(100 - (state.kpis.todayVisits % 35), 55, 98));
    setBar("#bar-error", clamp(100 - (state.kpis.systemHealth * 0.9), 0, 25));
    setBar("#bar-uptime", clamp(92 + (state.kpis.systemHealth / 10), 92, 99.9));
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
    setText("#mini-health", state.kpis.systemHealth);
    setText("#mini-state", state.kpis.systemHealth > 75 ? "Kararlı" : "Dikkat");
    setText("#mini-uptime", `${clamp(92 + state.kpis.systemHealth/10, 92, 99.9).toFixed(1)}%`);
    setText("#mini-latency", `${clamp(520 - state.kpis.systemHealth*1.2, 250, 520).toFixed(0)}ms`);
    setText("#mini-error", `${clamp(1.5 - state.kpis.systemHealth*0.01, 0, 1.5).toFixed(2)}%`);
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

  /* ---------- Mock Ticker ---------- */
  function startMockTicker() {
    setInterval(() => {
      refreshMockData(false);
      renderAll();
    }, 4500);
  }

  function refreshMockData(forceLog) {
    // visits drift
    const dv = randInt(1, 6);
    bumpVisits(dv);

    // active users oscillate
    const du = randInt(-2, 3);
    state.kpis.activeUsers = clamp(state.kpis.activeUsers + du, 40, 400);

    // growth slightly moves
    bumpGrowth((Math.random() - 0.45) * 0.25);

    // health stable with tiny noise
    bumpHealth((Math.random() - 0.5) * 1.2);

    // service random warn/ok in mock
    if (Math.random() < 0.08) {
      const idx = randInt(0, state.services.length - 1);
      const s = state.services[idx];
      s.status = Math.random() < 0.7 ? "ok" : "warn";
    }

    state.lastUpdatedAt = Date.now();

    if (forceLog) {
      pushLog("Mock veri yenilendi.");
    }
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

  /* ---------- Logs / Toast ---------- */
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

  /* ---------- Utils ---------- */
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

})();
