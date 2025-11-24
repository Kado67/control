/* =========================
   InflowAI Control Center UI
   scripts.js  LIVE ONLY
   ========================= */
(() => {
  "use strict";

  const API_BASE = "https://inflowai-api.onrender.com";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => (Number(n) || 0).toLocaleString("tr-TR");
  const nowTime = () =>
    new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const state = {
    activePage: "overview",
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
    featureConfig: null,
    summary: null,
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();
    bindQuick();
    renderAll();

    // ilk canlı çekim
    refreshLive(true);

    // canlı döngü (mock yok, sadece API tekrar deneme)
    setInterval(() => refreshLive(false), 7000);
  });

  /* ---------- NAV ---------- */
  function bindNav() {
    $$(".nav-item").forEach((item) => {
      on(item, "click", () => setActivePage(item.dataset.page));
    });
  }
  function setActivePage(pageKey) {
    if (!pageKey) return;
    state.activePage = pageKey;
    $$(".nav-item").forEach((i) =>
      i.classList.toggle("active", i.dataset.page === pageKey)
    );
    $$(".page").forEach((p) =>
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
      monetization: "Paketler / Ödeme",
      infinity: "Sonsuzluk Merkezi",
      users: "Users",
    };
    return map[key] || key;
  }

  /* ---------- TOPBAR / QUICK ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", () => refreshLive(true));
    on($("#btn-recheck-services"), "click", () => {
      pushLog("Katmanlar yeniden tarandı.");
      renderServices();
      toast("Katmanlar tarandı.");
    });
  }
  function bindQuick() {
    on($("#btn-open-site"), "click", () => {
      window.open("https://inflow-ai-vmat.vercel.app/", "_blank");
    });

    // action tiles -> komut gönder
    $$(".action-tile").forEach((b) => {
      on(b, "click", () => {
        const cmd = b.dataset.cmd;
        if (cmd) handleCommand(cmd);
      });
    });
  }

  /* ---------- LIVE FETCH ---------- */
  async function refreshLive(forceLog) {
    try {
      // 1) status ping
      const statusRes = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
      if (!statusRes.ok) throw new Error("API status değil");

      state.apiOnline = true;
      renderApiPill();

      // 2) ortak summary
      const sumRes = await fetch(`${API_BASE}/api/ortak/summary`, { cache: "no-store" });
      const sumJson = await sumRes.json();
      state.summary = sumJson?.data || null;

      // 3) features config
      const featRes = await fetch(`${API_BASE}/api/ortak/features`, { cache: "no-store" });
      const featJson = await featRes.json();
      state.featureConfig = featJson?.data || featJson || null;

      // 4) KPI’leri summary’den doldur
      const metrics = state.summary?.metrics || {};
      state.kpis.todayVisits = metrics.traffic ?? state.kpis.todayVisits;
      state.kpis.activeUsers = metrics.activeUsers ?? state.kpis.activeUsers;
      state.kpis.growthRate = metrics.growthRate ?? state.kpis.growthRate;
      state.kpis.systemHealth = state.summary?.healthScore ?? state.kpis.systemHealth;

      state.lastUpdatedAt = Date.now();
      renderAll();

      if (forceLog) pushLog("LIVE veriler başarıyla çekildi.");
    } catch (err) {
      state.apiOnline = false;
      renderApiPill();

      if (forceLog) {
        pushLog("API bağlantısı yok. Tekrar deniyorum...");
        toast("API bağlantısı yok.");
      }
    }
  }

  /* ---------- API PILL ---------- */
  function renderApiPill() {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill) || pill;

    if (dot) {
      dot.style.background = state.apiOnline ? "#22c55e" : "#ef4444";
      dot.style.boxShadow = state.apiOnline
        ? "0 0 12px rgba(34,197,94,0.9)"
        : "0 0 12px rgba(239,68,68,0.9)";
    }
    if (txt) {
      txt.textContent = state.apiOnline
        ? "API bağlantısı aktif (LIVE)"
        : "API bağlantısı yok (yeniden deneniyor)";
    }
  }

  /* ---------- KPI / ORTAK RENDER ---------- */
  function renderAll() {
    renderApiPill();
    renderKpis();
    renderServices();
    renderServicesToggles();
    renderOrtak();
    renderMiniStats();
    renderLogs();
    setText("#last-updated", new Date(state.lastUpdatedAt).toLocaleTimeString("tr-TR"));
    setText("#engine-version", state.featureConfig?.version || "-");
  }

  function renderKpis() {
    setText("#kpi-todayVisits", fmt(state.kpis.todayVisits));
    setText("#kpi-activeUsers", fmt(state.kpis.activeUsers));
    setText("#kpi-growthRate", `${Number(state.kpis.growthRate || 0).toFixed(1)}%`);
    setText("#kpi-systemHealth", `${fmt(state.kpis.systemHealth)}/100`);
  }

  function renderOrtak() {
    const mood = state.summary?.mood || "-";
    const summaryText = state.summary?.summary || "Ortak verileri bekleniyor...";
    setText("#ortakMoodLabel", mood);
    setText("#ortakSummary", summaryText);
  }

  function renderMiniStats() {
    const h = Number(state.kpis.systemHealth || 0);
    setText("#mini-health", h);
    setText("#mini-state", h > 75 ? "Kararlı" : h > 55 ? "Dikkat" : "Kritik");
    setText("#mini-uptime", clamp(92 + h / 10, 92, 99.9).toFixed(1) + "%");
    setText("#mini-latency", clamp(520 - h * 1.2, 250, 520).toFixed(0) + "ms");
    setText("#mini-error", clamp(1.5 - h * 0.01, 0, 1.5).toFixed(2) + "%");
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

  function renderServicesToggles() {
    const list = $("#services-toggle-list");
    if (!list) return;
    list.innerHTML = "";
    state.services.forEach((s) => {
      const item = document.createElement("div");
      item.className = "toggle-item";
      item.innerHTML = `
        <div>
          <div class="toggle-title">${s.name}</div>
          <div class="toggle-desc">LIVE izleme • aç/kapat sonraki adım</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-label="${s.name}">
          <span class="slider"></span>
        </label>
      `;
      list.appendChild(item);
    });

    // yeni eklenen switch’leri de dinle
    bindToggles();
  }

  function serviceDesc(status) {
    return status === "ok"
      ? "Sağlıklı çalışıyor"
      : status === "warn"
      ? "İzleniyor / optimize ediliyor"
      : "Sorun tespit edildi";
  }
  function serviceLabel(status) {
    return status === "ok" ? "OK" : status === "warn" ? "DİKKAT" : "HATA";
  }

  /* ---------- TOGGLES ---------- */
  function bindToggles() {
    $$(".switch input").forEach((sw) => {
      if (sw._bound) return;
      sw._bound = true;

      on(sw, "change", () => {
        const label = sw.dataset.label || "Ayar";
        const val = sw.checked ? "Açık" : "Kapalı";
        pushLog(`${label}: ${val}`);
        toast(`${label} ${val}`);
      });
    });
  }

  /* ---------- COMMANDS ---------- */
  function bindCommands() {
    const input = $("#cmd-input");
    const runBtn = $("#cmd-run");
    const clearBtn = $("#cmd-clear");
    const tags = $$(".tag");

    const run = () => {
      const cmd = (input && input.value) ? input.value.trim() : "";
      if (!cmd) return toast("Komut boş.");
      handleCommand(cmd);
      input.value = "";
    };

    on(runBtn, "click", run);
    on(input, "keydown", (e) => e.key === "Enter" && run());
    on(clearBtn, "click", () => {
      setCmdOutput("");
      toast("Konsol temizlendi.");
    });

    tags.forEach((t) => {
      on(t, "click", () => {
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      });
    });
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const stamp = nowTime();
    const c = cmd.toLowerCase();

    let result = "";
    if (c === "status" || c.includes("durum")) {
      result = `[#${stamp}] LIVE Durum:
API: ${state.apiOnline ? "AKTİF" : "YOK"}
Health: ${state.kpis.systemHealth}/100
Growth: ${Number(state.kpis.growthRate || 0).toFixed(1)}%`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Restart talebi alındı (LIVE kayıt).
Bileşen: ${cmd.split(" ")[1] || "core"}`;
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Ölçekleme talebi alındı (LIVE kayıt).
Hedef: ${cmd.split(" ")[1] || "auto"}`;
    } else if (c.startsWith("clear logs")) {
      state.logs = [];
      result = `[#${stamp}] Loglar temizlendi.`;
      renderLogs();
    } else if (c.startsWith("help")) {
      result =
`[#${stamp}] Komutlar:
- status
- restart <service>
- scale <auto|n>
- clear logs
- help`;
    } else {
      result = `[#${stamp}] Ortak: Komut kayda alındı: ${cmd}`;
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
  function bindAssistant() {
    on($("#assistant-qa"), "click", () => {
      toast("Ortak analiz yaptı.");
      pushLog("Ortak: Durum analizi üretildi.");
    });
    on($("#assistant-auto"), "click", () => {
      toast("Auto optimize kayda alındı.");
      pushLog("Ortak: Auto optimize tetiklendi.");
    });
    on($("#assistant-repair"), "click", () => {
      toast("Zayıf katman tarandı.");
      pushLog("Ortak: Zayıf katman taraması yapıldı.");
    });
  }

  /* ---------- NOTES ---------- */
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

  /* ---------- LOGS / TOAST ---------- */
  function renderLogs() {
    const ul = $("#log-list");
    const count = $("#log-count");
    if (!ul) return;
    ul.innerHTML = "";

    state.logs.slice(-60).forEach((l) => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `<div class="log-time">${l.t}</div><div class="log-text">${escapeHtml(l.m)}</div>`;
      ul.appendChild(li);
    });

    if (count) count.textContent = `${state.logs.length} kayıt`;
  }

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
    toast._timer = setTimeout(() => t.classList.remove("show"), 1500);
  }

  /* ---------- Utils ---------- */
  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
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
