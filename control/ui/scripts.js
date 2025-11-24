/* =========================
   InflowAI Control Center UI
   scripts.js  (LIVE + DEMO)
   ========================= */
(() => {
  "use strict";

  // ✅ API adresin
  const API_BASE = "https://inflowai-api.onrender.com";

  /* ---------- Safe helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");

  /* ---------- State ---------- */
  const state = {
    activePage: "overview",
    demoMode: false,     // ilk açılışta LIVE dene
    apiOnline: false,
    lastUpdatedAt: Date.now(),
    kpis: {
      todayVisits: 0,
      activeUsers: 0,
      growthRate: 0,
      systemHealth: 0,
      uptime: 0,
      apiLatency: 0,
      errorRate: 0
    },
    services: [
      { key: "core", name: "Core (Beyin)", status: "ok" },
      { key: "growth", name: "Growth", status: "ok" },
      { key: "services", name: "Services", status: "ok" },
      { key: "sharing", name: "Sharing", status: "warn" },
      { key: "security", name: "Security", status: "ok" },
      { key: "updating", name: "Updating", status: "ok" }
    ],
    logs: []
  };

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();
    bindLogButtons();

    setActivePage("overview");
    boot();
  });

  async function boot() {
    // ilk deneme live
    await fetchAll(true);
    // sonra düzenli yenile
    setInterval(() => fetchAll(false), 5000);
  }

  /* ---------- API Fetch (LIVE) ---------- */
  async function fetchAll(forceLog) {
    if (state.demoMode) {
      refreshDemo(forceLog);
      renderAll();
      return;
    }

    const t0 = performance.now();
    try {
      // status ping
      const status = await safeFetch(`${API_BASE}/api/status`);
      const summary = await safeFetch(`${API_BASE}/api/ortak/summary`);
      const features = await safeFetch(`${API_BASE}/api/ortak/features`);

      const latency = Math.round(performance.now() - t0);

      state.apiOnline = true;
      state.lastUpdatedAt = Date.now();
      state.kpis.apiLatency = latency;
      state.kpis.uptime = status.uptime ? Math.round(status.uptime) : state.kpis.uptime;

      // summary API yapısı:
      // {status:"ok", data:{ mood, summary, healthScore, metrics:{...} }}
      const data = summary?.data || {};
      const metrics = data.metrics || {};

      state.kpis.activeUsers = metrics.activeUsers ?? rand(80, 180);
      state.kpis.growthRate = metrics.growthRate ?? randFloat(2, 6);
      state.kpis.systemHealth = data.healthScore ?? clamp(rand(70, 92), 0, 100);

      // bugün ziyaret: API göndermiyor ise büyümeye göre tahmin et
      state.kpis.todayVisits =
        metrics.traffic
          ? metrics.traffic * 12
          : clamp(Math.round(state.kpis.activeUsers * (10 + state.kpis.growthRate)), 0, 999999);

      state.kpis.errorRate = metrics.errorRate ?? randFloat(0.1, 0.9);

      // Ortak mood pill
      setText("#ortak-summary", data.summary || "Ortak özeti geldi.");
      setMood(data.mood || "Sakin");

      if (forceLog) pushLog("LIVE veriler API’den alındı.");

      renderAll();

      // features listesi gelirse logla
      if (features?.data?.strategicGoals && forceLog) {
        pushLog("Ortak görev haritası yüklendi.");
      }

    } catch (err) {
      state.apiOnline = false;
      if (forceLog) pushLog("API erişilemedi. DEMO moda geçildi.");
      state.demoMode = true;
      refreshDemo(false);
      renderAll();
    }
  }

  async function safeFetch(url, timeoutMs = 3500) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error("fetch failed");
    return res.json();
  }

  /* ---------- DEMO data ---------- */
  function refreshDemo(forceLog) {
    state.apiOnline = false;
    state.lastUpdatedAt = Date.now();

    state.kpis.activeUsers = clamp(state.kpis.activeUsers + rand(-5, 8), 60, 240);
    state.kpis.growthRate = clamp(state.kpis.growthRate + randFloat(-0.2, 0.25), 1, 9);
    state.kpis.systemHealth = clamp(state.kpis.systemHealth + randFloat(-1, 1), 60, 98);
    state.kpis.todayVisits = clamp(state.kpis.todayVisits + rand(30, 120), 500, 999999);
    state.kpis.uptime = clamp(92 + state.kpis.systemHealth / 10, 92, 99.9);
    state.kpis.apiLatency = clamp(520 - state.kpis.systemHealth * 1.2, 250, 520);
    state.kpis.errorRate = clamp(1.5 - state.kpis.systemHealth * 0.01, 0, 1.5);

    const mood = detectMood();
    setMood(mood);

    const sum = `Demo moddayız. Aktif kullanıcı ~${state.kpis.activeUsers}. Büyüme ${state.kpis.growthRate.toFixed(1)}%. Sağlık ${state.kpis.systemHealth}/100.`;
    setText("#ortak-summary", sum);

    if (forceLog) pushLog("DEMO veriler yenilendi.");
  }

  function detectMood() {
    if (state.kpis.errorRate > 5 || state.kpis.uptime < 95) return "Dikkatli";
    if (state.kpis.growthRate >= 5 && state.kpis.uptime >= 99) return "Heyecanlı";
    if (state.kpis.growthRate >= 2) return "Kararlı";
    return "Sakin";
  }

  /* ---------- Navigation / Pages ---------- */
  function bindNav() {
    $$(".nav-item").forEach(item => {
      on(item, "click", () => setActivePage(item.dataset.page));
    });
  }

  function setActivePage(pageKey) {
    state.activePage = pageKey;

    $$(".nav-item").forEach(i => i.classList.toggle("active", i.dataset.page === pageKey));
    $$(".page").forEach(p => p.classList.toggle("active", p.dataset.page === pageKey));

    setText("#page-title", labelOf(pageKey));
    setText("#page-subtitle", subtitleOf(pageKey));
  }

  function labelOf(key) {
    return {
      overview: "Genel Bakış",
      core: "Core (Beyin)",
      growth: "Growth",
      services: "Services",
      sharing: "Sharing",
      security: "Security",
      updating: "Updating",
      commands: "Komutlar",
      monetization: "Monetization",
      users: "Users",
      infinity: "Sonsuzluk Merkezi",
    }[key] || key;
  }

  function subtitleOf(key) {
    return {
      overview: "Platformun canlı sağlık, büyüme ve Ortak özeti",
      core: "Beyin ve otomasyon yönetimi",
      growth: "Büyüme hızlandırma aksiyonları",
      services: "Servis ve özellik yönetimi",
      sharing: "Viral / paylaşım optimizasyonu",
      security: "Güvenlik ve erişim kalkanları",
      updating: "Hot-update ve sürüm kontrolü",
      commands: "Komutla özellik yönetimi",
      monetization: "Paketler, reklam ve ödeme",
      users: "Kullanıcı canlı özetleri",
      infinity: "Sonsuz not ve veri deposu"
    }[key] || "";
  }

  /* ---------- Topbar actions ---------- */
  function bindTopbar() {
    on($("#btn-refresh"), "click", async () => {
      await fetchAll(true);
      toast("Veriler yenilendi.");
    });

    on($("#btn-live"), "click", async () => {
      state.demoMode = !state.demoMode;
      if (!state.demoMode) await fetchAll(true);
      else refreshDemo(true);
      renderAll();
      toast(state.demoMode ? "DEMO moda geçildi." : "LIVE moda geçildi.");
    });

    on($("#btn-test-api"), "click", async () => {
      const ok = await testApi();
      toast(ok ? "API bağlı ✅" : "API yok, demo ✅");
    });

    on($("#btn-mode-demo"), "click", () => {
      state.demoMode = true;
      refreshDemo(true);
      renderAll();
      toast("DEMO mod açık.");
    });

    on($("#btn-mode-live"), "click", async () => {
      state.demoMode = false;
      await fetchAll(true);
      renderAll();
      toast("LIVE mod denendi.");
    });

    on($("#btn-ortak-refresh"), "click", async () => {
      await fetchAll(true);
      toast("Ortak özeti yenilendi.");
    });
  }

  async function testApi() {
    try {
      await safeFetch(`${API_BASE}/api/status`);
      state.apiOnline = true;
      state.demoMode = false;
      pushLog("API test başarılı.");
      return true;
    } catch {
      state.apiOnline = false;
      state.demoMode = true;
      pushLog("API test başarısız. Demo moda geçildi.");
      return false;
    } finally {
      renderApiPill();
    }
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
    on(input, "keydown", (e) => e.key === "Enter" && run());
    on(clearBtn, "click", () => setCmdOutput(""));

    tags.forEach(t => on(t, "click", () => {
      if (!input) return;
      input.value = t.dataset.cmd || t.textContent.trim();
      input.focus();
    }));
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const stamp = new Date().toLocaleTimeString("tr-TR");

    let result = "";
    const c = cmd.toLowerCase();

    if (c === "status" || c.includes("durum")) {
      result = `[#${stamp}] DURUM: ${state.demoMode ? "DEMO" : "LIVE"}\nHealth: ${state.kpis.systemHealth}/100\nActive: ${state.kpis.activeUsers}\nGrowth: ${state.kpis.growthRate.toFixed(1)}%`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Restart kuyruğa alındı: ${cmd.split(" ")[1] || "core"} (mock).`;
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Scale talebi alındı: ${cmd.split(" ")[1] || "auto"} (mock).`;
    } else if (c.startsWith("help")) {
      result = `[#${stamp}] Komutlar:\nstatus\nrestart <service>\nscale <auto|n>\nhelp`;
    } else {
      result = `[#${stamp}] Ortak: Komutu aldım → ${cmd} (mock).`;
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
    on($("#assistant-qa"), "click", () => {
      assistantSay("Sistemi taradım. Ölçeklenme ve paket açma altyapısı hazır.");
    });
    on($("#assistant-auto"), "click", () => {
      assistantSay("Auto-optimizasyon başlattım (mock).");
    });
    on($("#assistant-repair"), "click", () => {
      assistantSay("Sharing katmanı zayıf sinyal veriyor. Viral iyileştirme öneriyorum.");
    });
  }

  function assistantSay(text) {
    setText("#ortak-summary", text);
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
      pushLog("Notlar kaydedildi.");
    });

    on(clearBtn, "click", () => {
      if (!ta) return;
      ta.value = "";
      localStorage.removeItem("inflow_notes");
      toast("Notlar temizlendi.");
      pushLog("Notlar temizlendi.");
    });

    if (ta) {
      const v = localStorage.getItem("inflow_notes");
      if (v) ta.value = v;
    }
  }

  /* ---------- Logs ---------- */
  function bindLogButtons() {
    on($("#btn-clear-logs"), "click", () => {
      state.logs = [];
      renderLogs();
      toast("Loglar temizlendi.");
    });
  }

  function pushLog(message) {
    state.logs.push({ t: nowTime(), m: message });
    renderLogs();
    setText("#log-count", `${state.logs.length} kayıt`);
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
    const txt = $(".api-text", pill);

    if (dot) {
      dot.style.background = state.apiOnline ? "#22c55e" : "#ef4444";
      dot.style.boxShadow = state.apiOnline
        ? "0 0 12px rgba(34,197,94,0.9)"
        : "0 0 12px rgba(239,68,68,0.9)";
    }
    if (txt) {
      txt.textContent = state.apiOnline
        ? "API bağlantısı aktif (LIVE)"
        : "API bağlantısı yok (DEMO)";
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
    setBar("#bar-api", state.apiOnline ? 96 : 0);
    setBar("#bar-latency", clamp(100 - (state.kpis.apiLatency / 7), 40, 98));
    setBar("#bar-error", clamp(100 - (state.kpis.systemHealth * 0.9), 0, 25));
    setBar("#bar-uptime", clamp(state.kpis.uptime, 92, 99.9));
  }

  function renderLogs() {
    const ul = $("#log-list");
    if (!ul) return;
    ul.innerHTML = "";
    state.logs.slice(-60).forEach(l => {
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
    setText("#mini-state", detectMood());
    setText("#mini-uptime", `${clamp(state.kpis.uptime, 0, 100).toFixed(1)}%`);
    setText("#mini-latency", `${Math.round(state.kpis.apiLatency)}ms`);
    setText("#mini-error", `${clamp(state.kpis.errorRate, 0, 10).toFixed(2)}%`);
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

  function setMood(mood) {
    const pill = $("#ortak-mood-pill");
    if (!pill) return;
    pill.textContent = mood;
    pill.classList.remove("ok", "warn", "bad");
    if (mood === "Heyecanlı" || mood === "Kararlı") pill.classList.add("ok");
    else if (mood === "Dikkatli") pill.classList.add("warn");
    else pill.classList.add("ghost");
  }

  function serviceDesc(status) {
    return status === "ok" ? "Sağlıklı çalışıyor"
      : status === "warn" ? "İzleniyor / optimize ediliyor"
      : "Sorun tespit edildi";
  }
  function serviceLabel(status) {
    return status === "ok" ? "OK" : status === "warn" ? "DİKKAT" : "HATA";
  }

  /* ---------- Toast ---------- */
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
  function nowTime() {
    return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max) { return Math.random() * (max - min) + min; }
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
