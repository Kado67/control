/* =========================
   InflowAI Kontrol Merkezi
   scripts.js (SON SÜRÜM)
   ========================= */

(() => {
  "use strict";

  // === AYARLAR ===================================================
  // Render'daki API adresin
  const API_URL = "https://inflowai-api.onrender.com";

  // Yardımcılar
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");

  // === GLOBAL STATE ==============================================
  const state = {
    mode: "mock", // "mock" | "live"
    lastUpdatedAt: Date.now(),
    kpis: {
      todayVisits: 120,
      activeUsers: 90,
      growthRate: 3.4,
      systemHealth: 81,
    },
    services: [
      { key: "core", name: "Core (Beyin)", status: "ok" },
      { key: "growth", name: "Growth", status: "ok" },
      { key: "services", name: "Services", status: "ok" },
      { key: "sharing", name: "Sharing", status: "warn" },
      { key: "security", name: "Security", status: "ok" },
      { key: "updating", name: "Updating", status: "ok" },
    ],
    logs: [],
  };

  // === INIT ======================================================
  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();

    pushLog("Kontrol merkezi yüklendi. API kontrol ediliyor...");
    renderAll();
    startMockTicker();

    // API'den gerçek veriyi dene
    initApi();
  });

  // === API BAĞLANTISI ============================================
  async function initApi() {
    try {
      // 1) Genel status
      const statusRes = await fetch(`${API_URL}/api/status`);
      if (!statusRes.ok) throw new Error("status gagal");
      const statusJson = await statusRes.json();
      pushLog(`API durumu: ${statusJson.message || "OK"}`);

      // 2) Ortak özeti
      const summaryRes = await fetch(`${API_URL}/api/ortak/summary`);
      if (!summaryRes.ok) throw new Error("summary gagal");
      const summaryJson = await summaryRes.json();

      if (summaryJson && summaryJson.data) {
        applySummary(summaryJson.data);
        pushLog("Ortak özeti API'den yüklendi (live).");
      }

      // 3) Özellik listesi (isteğe bağlı)
      try {
        const featRes = await fetch(`${API_URL}/api/ortak/features`);
        if (featRes.ok) {
          const featJson = await featRes.json();
          if (featJson && featJson.data && featJson.data.version) {
            pushLog(`Ortak özellik seti: v${featJson.data.version}`);
          }
        }
      } catch (e) {
        // features hatası kritik değil
      }

      state.mode = "live";
      renderApiPill();
      renderAll();
      toast("API bağlantısı aktif (live).");
    } catch (err) {
      console.warn("API bağlanamadı, mock modda devam.", err);
      state.mode = "mock";
      renderApiPill();
      pushLog("API'ye ulaşılamadı, mock modda devam ediliyor.");
      // mock veriyle çalışmaya devam
    }
  }

  function applySummary(data) {
    // data.metrics vs engine'den geliyor
    if (data.metrics) {
      const m = data.metrics;
      state.kpis.todayVisits = m.traffic ?? state.kpis.todayVisits;
      state.kpis.activeUsers = m.activeUsers ?? state.kpis.activeUsers;
      state.kpis.growthRate = m.growthRate ?? state.kpis.growthRate;
    }
    if (data.healthScore != null) {
      state.kpis.systemHealth = data.healthScore;
    }

    // Ortak konuşma balonu
    const bubble = $("#assistant-bubble");
    const p = bubble ? $("p", bubble) : null;
    if (p && data.summary) {
      p.textContent = data.summary;
    }

    // Ortak mood etiketi
    const moodEl = $("#ortak-mood");
    if (moodEl && data.mood) {
      moodEl.textContent = data.mood;
    }

    state.lastUpdatedAt = Date.now();
  }

  // === NAV / SAYFALAR ============================================
  function bindNav() {
    const items = $$(".nav-item");
    items.forEach((btn) => {
      const page = btn.dataset.page;
      on(btn, "click", () => setActivePage(page));
    });
    // ilk sayfa
    setActivePage("overview");
  }

  function setActivePage(pageKey) {
    if (!pageKey) return;
    $$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === pageKey);
    });
    $$(".page").forEach((pg) => {
      pg.classList.toggle("active", pg.dataset.page === pageKey);
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
      users: "Users",
    };
    return map[key] || key;
  }

  // === TOPBAR ====================================================
  function bindTopbar() {
    on($("#btn-refresh"), "click", () => {
      refreshMockData(true);
      renderAll();
      toast("Veriler yenilendi.");
    });

    on($("#btn-mode"), "click", () => {
      // Manuel moda dokunmuyoruz, sadece durumu gösteriyoruz
      toast(
        state.mode === "live"
          ? "Şu an LIVE moddasın (API'den geliyor)."
          : "Şu an MOCK moddasın (demo veri)."
      );
    });
  }

  // === TOGGLE / SWITCH ===========================================
  function bindToggles() {
    $$(".switch input").forEach((sw) => {
      on(sw, "change", () => {
        const label = sw.dataset.label || "Ayar";
        const val = sw.checked ? "Açık" : "Kapalı";
        pushLog(`${label}: ${val}`);
        toast(`${label} ${val}`);
      });
    });
  }

  // === KOMUT KONSOLU =============================================
  function bindCommands() {
    const input = $("#cmd-input");
    const runBtn = $("#cmd-run");
    const clearBtn = $("#cmd-clear");
    const tags = $$(".tag");

    const run = () => {
      const cmd = (input && input.value) ? input.value.trim() : "";
      if (!cmd) return toast("Komut boş.");
      handleCommand(cmd);
      if (input) input.value = "";
    };

    on(runBtn, "click", run);
    on(input, "keydown", (e) => {
      if (e.key === "Enter") run();
    });
    on(clearBtn, "click", () => {
      setCmdOutput("");
      toast("Konsol temizlendi.");
    });

    tags.forEach((t) => {
      on(t, "click", () => {
        if (!input) return;
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      });
    });
  }

  function handleCommand(cmd) {
    pushLog(`Komut: ${cmd}`);
    const c = cmd.toLowerCase();
    const stamp = new Date().toLocaleTimeString("tr-TR");
    let result = "";

    if (c === "status" || c.includes("durum")) {
      result = `[#${stamp}] Sistem Durumu: ${
        state.mode === "live" ? "LIVE" : "MOCK"
      }\nHealth: ${state.kpis.systemHealth}/100\nAktif kullanici: ${
        state.kpis.activeUsers
      }\nBüyüme: ${state.kpis.growthRate.toFixed(1)}%`;
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Yeniden başlatma(mock): ${cmd.split(" ")[1] || "core"}`;
      bumpHealth(-1);
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Ölçekleme(mock): ${cmd.split(" ")[1] || "auto"}`;
      bumpVisits(5);
    } else if (c.startsWith("clear logs")) {
      state.logs = [];
      result = `[#${stamp}] Loglar temizlendi.`;
      renderLogs();
    } else if (c.startsWith("help")) {
      result =
        "[#" +
        stamp +
        `] Komutlar:
- status
- restart <service>
- scale <auto|n>
- clear logs
- help`;
    } else {
      result = `[#${stamp}] Ortak (mock): “Komutu aldım. Şu an demo moddayım, sadece simüle ettim: ${cmd}”`;
      bumpGrowth(0.1);
    }

    appendCmdOutput(result);
    renderMiniStats();
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

  // === ORTAK ASİSTAN =============================================
  function bindAssistant() {
    on($("#assistant-qa"), "click", () => {
      assistantSay(
        "Şu anda kontrol merkezi kararlı. Bir sonraki adım: platformdaki gömülü özellikleri UI'dan aç/kapat yapacak motoru tasarlamak."
      );
    });
    on($("#assistant-auto"), "click", () => {
      assistantSay("Mock auto-optimizasyon çalıştırıldı. Health skoru hafif yükseltiliyor.");
      bumpHealth(1);
      renderMiniStats();
    });
    on($("#assistant-repair"), "click", () => {
      assistantSay(
        "Sharing katmanında iyileştirme öneriyorum. Yüksek büyüme altında limite yaklaşabilir."
      );
      markService("sharing", "warn");
      renderServices();
    });
  }

  function assistantSay(text) {
    const bubble = $("#assistant-bubble");
    const p = bubble ? $("p", bubble) : null;
    if (p) p.textContent = text;
    pushLog(`Ortak: ${text}`);
  }

  // === SONSuzLUK MERKEZİ / NOTLAR ================================
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
      const val = localStorage.getItem("inflow_notes");
      if (val) ta.value = val;
    }
  }

  // === RENDER FONKSİYONLARI ======================================
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
    const dot = pill.querySelector(".dot");
    const text = pill.querySelector(".api-text");
    if (state.mode === "live") {
      pill.style.background = "rgba(34,197,94,0.10)";
      pill.style.borderColor = "rgba(34,197,94,0.4)";
      if (dot) {
        dot.style.background = "#22c55e";
        dot.style.boxShadow = "0 0 12px rgba(34,197,94,0.9)";
      }
      if (text) text.textContent = "API bağlantısı aktif (live)";
    } else {
      pill.style.background = "rgba(239,68,68,0.10)";
      pill.style.borderColor = "rgba(239,68,68,0.4)";
      if (dot) {
        dot.style.background = "#ef4444";
        dot.style.boxShadow = "0 0 12px rgba(239,68,68,0.9)";
      }
      if (text) text.textContent = "API bağlantısı yok (mock mod)";
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
      const div = document.createElement("div");
      div.className = "status-row";
      div.innerHTML = `
        <div>
          <div class="status-title">${s.name}</div>
          <div class="status-desc">${serviceDesc(s.status)}</div>
        </div>
        <div class="pill ${s.status}">${serviceLabel(s.status)}</div>
      `;
      list.appendChild(div);
    });
  }

  function renderMiniStats() {
    setText("#mini-health", state.kpis.systemHealth);
    setText(
      "#mini-state",
      state.kpis.systemHealth > 75 ? "Kararlı" : state.kpis.systemHealth > 60 ? "İzleniyor" : "Dikkat"
    );
    setText(
      "#mini-uptime",
      clamp(92 + state.kpis.systemHealth / 10, 92, 99.9).toFixed(1) + "%"
    );
    setText(
      "#mini-latency",
      clamp(520 - state.kpis.systemHealth * 1.2, 220, 520).toFixed(0) + "ms"
    );
    setText(
      "#mini-error",
      clamp(1.5 - state.kpis.systemHealth * 0.01, 0, 1.5).toFixed(2) + "%"
    );
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
    const el = $("#last-updated");
    if (!el) return;
    el.textContent = new Date(state.lastUpdatedAt).toLocaleTimeString("tr-TR");
  }

  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
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

  // === MOCK VERİ TİCKER ==========================================
  function startMockTicker() {
    setInterval(() => {
      if (state.mode === "live") return; // live bağlandıysa ellemiyoruz
      refreshMockData(false);
      renderAll();
    }, 4500);
  }

  function refreshMockData(forceLog) {
    bumpVisits(randInt(5, 35));
    bumpGrowth((Math.random() - 0.45) * 0.4);
    bumpHealth((Math.random() - 0.5) * 1.5);
    // servis durumu oynasın
    if (Math.random() < 0.08) {
      const idx = randInt(0, state.services.length - 1);
      const s = state.services[idx];
      s.status = Math.random() < 0.8 ? "ok" : "warn";
    }
    state.lastUpdatedAt = Date.now();
    if (forceLog) pushLog("Mock veri yenilendi.");
  }

  function bumpVisits(delta) {
    state.kpis.todayVisits = clamp(state.kpis.todayVisits + delta, 0, 9999999);
  }
  function bumpGrowth(delta) {
    state.kpis.growthRate = clamp(state.kpis.growthRate + delta, 0, 99);
  }
  function bumpHealth(delta) {
    state.kpis.systemHealth = clamp(
      state.kpis.systemHealth + delta,
      35,
      100
    );
  }
  function markService(key, status) {
    const s = state.services.find((x) => x.key === key);
    if (s) s.status = status;
  }

  // === LOG & TOAST ===============================================
  function pushLog(message) {
    state.logs.push({
      t: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      m: message,
    });
    renderLogs();
  }

  function toast(message) {
    const t = $("#toast");
    const inner = $("#toast-inner");
    if (!t || !inner) return;
    inner.textContent = message;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // === UTILS =====================================================
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
