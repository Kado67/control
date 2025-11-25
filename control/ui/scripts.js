/* =========================
   InflowAI Control Center UI
   scripts.js  (API + Mock güvenli)
   ========================= */
(() => {
  "use strict";

  /* ---------- Ayarlar ---------- */

  // Render'daki API adresin
  const API_BASE = "https://inflowai-api.onrender.com";

  // DOM yardımcıları
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (n) => n.toLocaleString("tr-TR");

  /* ---------- Durum ---------- */

  const state = {
    activePage: "overview",
    apiOnline: false,
    mockMode: true, // API hiç cevap vermezse mock'a düşer
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
      { t: nowTime(), m: "Kontrol merkezi açıldı. Ortak mock modda başlatıldı." }
    ],
    ortak: {
      mood: "Sakin",
      summary: "Ortak hazır.",
      healthScore: 80,
      mainActionHint: "API bağlantısı test ediliyor."
    }
  };

  /* ---------- Başlangıç ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindTopbar();
    bindToggles();
    bindCommands();
    bindAssistant();
    bindNotes();
    renderAll();

    // İlk API denemesi
    refreshFromApi(true);
    // Her 10 saniyede bir yeniden dene
    setInterval(() => refreshFromApi(false), 10000);
  });

  /* ---------- Navigation / Sayfalar ---------- */

  function bindNav() {
    $$(".nav-item").forEach(item => {
      const page = item.dataset.page;
      on(item, "click", () => setActivePage(page));
    });
  }

  function setActivePage(pageKey) {
    if (!pageKey) return;
    state.activePage = pageKey;

    $$(".nav-item").forEach(i => {
      i.classList.toggle("active", i.dataset.page === pageKey);
    });
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

  /* ---------- Topbar ---------- */

  function bindTopbar() {
    const refreshBtn = $("#btn-refresh");
    const liveBtn = $("#btn-live");

    on(refreshBtn, "click", () => {
      refreshFromApi(true);
    });

    // Live / Mock switch buton – sadece yazıyı değiştirir
    on(liveBtn, "click", () => {
      state.mockMode = !state.mockMode;
      if (!state.mockMode && !state.apiOnline) {
        toast("API offline görünüyor, mock kapanmadı.");
        state.mockMode = true;
      } else {
        renderApiPill();
        toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
      }
    });
  }

  /* ---------- Toggle'lar ---------- */

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

  /* ---------- Komut Konsolu ---------- */

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

  async function handleCommand(cmd) {
    pushLog(`Komut çalıştırıldı: ${cmd}`);
    const stamp = new Date().toLocaleTimeString("tr-TR");

    const outLines = [];
    outLines.push(`[#${stamp}] Komut: ${cmd}`);

    const c = cmd.toLowerCase();

    // Eğer API online ise /api/ortak/analyze'a gönder
    if (state.apiOnline && !state.mockMode) {
      try {
        const res = await fetch(API_BASE + "/api/ortak/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd })
        });
        const json = await res.json();
        if (json && json.data) {
          outLines.push("");
          outLines.push("Ortak Analizi (API):");
          outLines.push(JSON.stringify(json.data, null, 2));
        } else {
          outLines.push("");
          outLines.push("Ortak: API cevap verdi ama beklenen formatta değil.");
        }
      } catch (err) {
        outLines.push("");
        outLines.push("Ortak: API analiz isteği başarısız oldu, mock moda düşüyorum.");
        state.mockMode = true;
        state.apiOnline = false;
        renderApiPill();
      }
    } else {
      // Mock davranış
      if (c === "status" || c.includes("durum")) {
        outLines.push("Sistem Durumu: KARARLI (mock)");
        outLines.push("Uptime: 99.9%");
        outLines.push("Health: " + state.kpis.systemHealth + "/100");
      } else if (c.startsWith("restart")) {
        outLines.push("Yeniden başlatma (mock) kuyruğa alındı.");
        bumpHealth(-1);
      } else if (c.startsWith("scale")) {
        outLines.push("Ölçekleme (mock) talebi işlendi.");
        bumpVisits(5);
      } else if (c.startsWith("clear logs")) {
        state.logs = [];
        renderLogs();
        outLines.push("Loglar temizlendi (mock).");
      } else if (c.startsWith("help")) {
        outLines.push(
`Komutlar (mock):
- status
- restart <service>
- scale <auto|n>
- clear logs
- help`
        );
      } else {
        outLines.push(`Ortak (mock): “Komutu aldım, simüle ettim: ${cmd}”`);
        bumpGrowth(0.1);
      }
    }

    appendCmdOutput(outLines.join("\n"));
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

  /* ---------- Ortak (Asistan) ---------- */

  function bindAssistant() {
    on($("#assistant-qa"), "click", () => {
      assistantSay("Sorunu taradım. API durumu ve büyüme metrikleri panoda özetleniyor.");
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

  /* ---------- Notlar (Sonsuzluk Merkezi) ---------- */

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

  /* ---------- API'den Veri Çekme ---------- */

  async function refreshFromApi(showToast) {
    // /api/status ve /api/ortak/summary deniyoruz
    let statusOk = false;
    let summaryOk = false;

    try {
      const resStatus = await fetch(API_BASE + "/api/status");
      if (resStatus.ok) {
        const js = await resStatus.json();
        statusOk = js && js.status === "ok";
        pushLog("API /api/status OK.");
      }
    } catch (e) {
      pushLog("API /api/status hata: " + (e.message || e));
    }

    try {
      const resSum = await fetch(API_BASE + "/api/ortak/summary");
      if (resSum.ok) {
        const js = await resSum.json();
        if (js && js.status === "ok" && js.data) {
          summaryOk = true;
          applyOrtakSummary(js.data);
          pushLog("API /api/ortak/summary OK.");
        }
      }
    } catch (e) {
      pushLog("API /api/ortak/summary hata: " + (e.message || e));
    }

    if (statusOk || summaryOk) {
      state.apiOnline = true;
      state.mockMode = false;
      state.lastUpdatedAt = Date.now();
      renderAll();
      if (showToast) toast("API'ye başarıyla bağlanıldı.");
    } else {
      // API yoksa mock'a düş
      if (showToast) toast("API'ye ulaşılamadı, mock moda geçildi.");
      if (!state.apiOnline) {
        state.mockMode = true;
      }
      state.apiOnline = false;
      renderApiPill();
    }
  }

  function applyOrtakSummary(data) {
    // Backend'deki buildSummary() output’una göre
    // {
    //   mood, summary, healthScore, mainActionHint, allActions, metrics, scores
    // }
    if (!data) return;
    state.ortak.mood = data.mood || "Sakin";
    state.ortak.summary = data.summary || "Ortak özeti yok.";
    state.ortak.healthScore = typeof data.healthScore === "number" ? data.healthScore : 80;
    state.ortak.mainActionHint = data.mainActionHint || "Yeni aksiyon önerisi yok.";

    const metrics = data.metrics || {};
    if (typeof metrics.activeUsers === "number") {
      state.kpis.activeUsers = metrics.activeUsers;
    }
    if (typeof metrics.growthRate === "number") {
      state.kpis.growthRate = metrics.growthRate;
    }
    // todayVisits ve health'i biraz derive edelim
    if (typeof data.healthScore === "number") {
      state.kpis.systemHealth = clamp(data.healthScore, 0, 100);
    }

    renderOrtakBox();
    renderKpis();
  }

  /* ---------- Render Fonksiyonları ---------- */

  function renderAll() {
    renderApiPill();
    renderKpis();
    renderServices();
    renderHealthBars();
    renderLogs();
    renderMiniStats();
    renderLastUpdate();
    renderOrtakBox();
  }

  function renderApiPill() {
    const pill = $("#api-pill");
    if (!pill) return;
    const dot = $(".dot", pill);
    const txt = $(".api-text", pill) || pill;

    if (state.apiOnline && !state.mockMode) {
      if (dot) {
        dot.style.background = "#22c55e";
        dot.style.boxShadow = "0 0 12px rgba(34,197,94,0.9)";
      }
      if (txt) txt.textContent = "API bağlı (canlı)";
    } else {
      if (dot) {
        dot.style.background = "#ef4444";
        dot.style.boxShadow = "0 0 12px rgba(239,68,68,0.9)";
      }
      if (txt) txt.textContent = "API bağlantısı yok (mock mod)";
    }
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

  function renderHealthBars() {
    setBar("#bar-api", state.apiOnline && !state.mockMode ? 98 : 15);
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

  function renderOrtakBox() {
    const mood = $("#ortak-mood");
    const summary = $("#ortak-summary");
    const hint = $("#ortak-hint");
    if (mood) mood.textContent = state.ortak.mood;
    if (summary) summary.textContent = state.ortak.summary;
    if (hint) hint.textContent = state.ortak.mainActionHint;
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

  // API yoksa still hareketli görünsün
  setInterval(() => {
    if (!state.apiOnline || state.mockMode) {
      refreshMockData();
      renderAll();
    }
  }, 4500);

  function refreshMockData() {
    const dv = randInt(1, 6);
    bumpVisits(dv);
    const du = randInt(-2, 3);
    state.kpis.activeUsers = clamp(state.kpis.activeUsers + du, 40, 400);
    bumpGrowth((Math.random() - 0.45) * 0.25);
    bumpHealth((Math.random() - 0.5) * 1.2);

    if (Math.random() < 0.08) {
      const idx = randInt(0, state.services.length - 1);
      const s = state.services[idx];
      s.status = Math.random() < 0.7 ? "ok" : "warn";
    }

    state.lastUpdatedAt = Date.now();
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

  /* ---------- Log / Toast / Utils ---------- */

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
