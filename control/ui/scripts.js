// =========================
// InflowAI Control Center UI
// scripts.js
// =========================
(() => {
  "use strict";

  // 🔗 API adresi — KESİN BÖYLE KALSIN
  const API_BASE = "https://inflowai-api.onrender.com";

  // Küçük helper'lar
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => n.toLocaleString("tr-TR");
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const state = {
    mockMode: false,
    lastUpdated: null,
    logs: []
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindButtons();
    bindCommands();
    bindNotes();
    pushLog("Kontrol Merkezi yüklendi.");
    refreshAll();
    // Ortak özeti periyodik yenile
    setInterval(refreshSummaryOnly, 15000);
  });

  // ============ NAV ============
  function bindNav() {
    $$(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetSel = btn.dataset.target;
        const target = targetSel ? $(targetSel) : null;
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        $$(".nav-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  // ============ BUTTONS ============
  function bindButtons() {
    const btnRefreshAll = $("#btnRefreshAll");
    const btnMockToggle = $("#btnMockToggle");
    const btnTestApi = $("#btnTestApi");

    btnRefreshAll && btnRefreshAll.addEventListener("click", () => {
      refreshAll();
      toast("Veriler yenilendi.");
    });

    btnMockToggle && btnMockToggle.addEventListener("click", () => {
      state.mockMode = !state.mockMode;
      renderApiPill();
      toast(state.mockMode ? "Mock moda geçildi." : "Live moda geçildi.");
    });

    btnTestApi && btnTestApi.addEventListener("click", async () => {
      await refreshStatus();
      toast("API testi tamamlandı.");
    });

    // Ortak aksiyon butonları
    $("#btnAskSummary")?.addEventListener("click", refreshSummaryOnly);
    $("#btnAskGrowth")?.addEventListener("click", () => {
      assistantSay("Büyüme için içerik akışını ve ziyaretçi dönüşüm oranını analiz ediyorum...");
    });
    $("#btnAskRisk")?.addEventListener("click", () => {
      assistantSay("Risk analizi için hata loglarını ve uptime değerlerini tarıyorum...");
    });
  }

  // ============ KOMUT KONSOLU ============
  function bindCommands() {
    const input = $("#cmdInput");
    const runBtn = $("#cmdRun");
    const clearBtn = $("#btnClearLogs");
    const tags = $$(".tag");

    const run = () => {
      const cmd = (input?.value || "").trim();
      if (!cmd) return toast("Komut boş.");
      handleCommand(cmd);
      input.value = "";
    };

    runBtn?.addEventListener("click", run);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });

    clearBtn?.addEventListener("click", () => {
      state.logs = [];
      renderLogs();
      toast("Loglar temizlendi.");
    });

    tags.forEach(t => {
      t.addEventListener("click", () => {
        if (!input) return;
        input.value = t.dataset.cmd || t.textContent.trim();
        input.focus();
      });
    });
  }

  function handleCommand(cmd) {
    const stamp = new Date().toLocaleTimeString("tr-TR");
    let result = "";

    const c = cmd.toLowerCase();
    if (c === "status" || c.includes("durum")) {
      result = `[#${stamp}] Durum istendi. API'den özet çekiliyor...`;
      refreshSummaryOnly();
    } else if (c.startsWith("restart")) {
      result = `[#${stamp}] Yeniden başlatma (simülasyon): ${cmd.split(" ")[1] || "core"}`;
    } else if (c.startsWith("scale")) {
      result = `[#${stamp}] Ölçekleme (simülasyon): ${cmd.split(" ")[1] || "auto"}`;
    } else if (c.startsWith("clear logs")) {
      state.logs = [];
      renderLogs();
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
      result = `[#${stamp}] Ortak (simülasyon): “Komutu aldım, ileride gerçek API aksiyonlarına bağlanacağım: ${cmd}”`;
    }

    appendCmdOutput(result);
    pushLog(`Komut: ${cmd}`);
  }

  function appendCmdOutput(text) {
    const out = $("#cmdOutput");
    if (!out) return;
    out.textContent = (out.textContent ? out.textContent + "\n\n" : "") + text;
    out.scrollTop = out.scrollHeight;
  }

  // ============ NOTLAR ============
  function bindNotes() {
    const ta = $("#notesTextarea");
    const btnSave = $("#notesSave");
    const btnClear = $("#notesClear");

    if (ta) {
      const v = localStorage.getItem("inflow_notes");
      if (v) ta.value = v;
    }

    btnSave?.addEventListener("click", () => {
      if (!ta) return;
      localStorage.setItem("inflow_notes", ta.value);
      toast("Not kaydedildi.");
      pushLog("Sonsuzluk Merkezi notları kaydedildi.");
    });

    btnClear?.addEventListener("click", () => {
      if (!ta) return;
      ta.value = "";
      localStorage.removeItem("inflow_notes");
      toast("Notlar temizlendi.");
      pushLog("Sonsuzluk Merkezi notları temizlendi.");
    });
  }

  // ============ API / REFRESH ============
  async function refreshAll() {
    await refreshStatus();
    await refreshSummaryOnly();
    await refreshFeatures();
  }

  async function refreshStatus() {
    if (state.mockMode) {
      setApiStatusMock();
      return;
    }
    const res = await fetchJson("/api/status");
    if (!res) {
      setApiError("API bağlantısı yok");
      return;
    }
    const { uptime, timestamp } = res;
    const uptimeVal = $("#uptimeValue");
    if (uptimeVal) uptimeVal.textContent = `${uptime.toFixed(0)} sn`;
    const t = $("#last-updated");
    if (t) t.textContent = new Date(timestamp).toLocaleTimeString("tr-TR");
    setApiOk();
  }

  async function refreshSummaryOnly() {
    if (state.mockMode) {
      applyMockSummary();
      return;
    }
    const res = await fetchJson("/api/ortak/summary");
    if (!res || !res.data) {
      applyMockSummary();
      return;
    }
    applySummary(res.data);
  }

  async function refreshFeatures() {
    if (state.mockMode) {
      applyMockFeatures();
      return;
    }
    const res = await fetchJson("/api/ortak/features");
    if (!res || !res.data) {
      applyMockFeatures();
      return;
    }
    applyFeatures(res.data);
  }

  async function fetchJson(path) {
    try {
      const resp = await fetch(API_BASE + path, {
        headers: { "Content-Type": "application/json" }
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      return data;
    } catch (err) {
      pushLog(`API hata: ${path} → ${err.message}`);
      setApiError("API bağlantısı yok");
      return null;
    }
  }

  // ============ SUMMARY UYGULAMA ============
  function applySummary(summary) {
    // summary: { mood, summary, healthScore, mainActionHint, allActions, metrics, scores }
    const m = summary.metrics || {};
    const health = summary.healthScore ?? 0;
    const visits = m.traffic ?? 0;
    const active = m.activeUsers ?? 0;
    const growth = m.growthRate ?? 0;

    setText("#metricTodayVisits", fmt(Math.round(visits * 50) || 0));
    setText("#metricActiveNow", fmt(active || 0));
    setText("#metricGrowthRate", `${growth.toFixed(1)}%`);
    setText("#metricHealthScore", `${health}/100`);
    setText("#growthHint", summary.mainActionHint || "-");

    setText("#mini-health", health);
    setText("#mini-state", health > 80 ? "Kararlı" : health > 60 ? "Takipte" : "Dikkat");
    setText("#mini-uptime", (m.uptime ?? 99.2).toFixed(1) + "%");
    setText("#mini-latency", (m.apiLatency ?? 420).toFixed(0) + "ms");
    setText("#mini-error", (m.errorRate ?? 0.7).toFixed(2) + "%");

    const moodPill = $("#ortakMoodPill");
    if (moodPill) {
      moodPill.textContent = `Mod: ${summary.mood || "Bilinmiyor"}`;
      moodPill.classList.remove("ok", "warn", "bad", "ghost");
      if (summary.mood === "Heyecanlı") moodPill.classList.add("ok");
      else if (summary.mood === "Dikkatli") moodPill.classList.add("warn");
      else moodPill.classList.add("ghost");
    }

    assistantSay(summary.summary || "Özet alınamadı.");
    state.lastUpdated = new Date();
    const vUp = $("#metricVisitsUpdated");
    if (vUp) vUp.textContent = state.lastUpdated.toLocaleTimeString("tr-TR");

    pushLog("Ortak özeti API'den güncellendi.");
  }

  function applyMockSummary() {
    const fake = {
      mood: "Kararlı",
      summary:
        "Mock modda çalışıyorum. Gerçek API bağlantısı kurulunca InflowAI verilerini canlı takip edeceğim.",
      healthScore: 82,
      mainActionHint: "Büyümeyi izlerken altyapı stabilitesini koru.",
      metrics: {
        traffic: 120,
        activeUsers: 90,
        growthRate: 3.4,
        uptime: 99.2,
        apiLatency: 420,
        errorRate: 0.7
      }
    };
    applySummary(fake);
  }

  // ============ FEATURES / SERVISLER ============
  function applyFeatures(config) {
    const list = $("#serviceList");
    if (!list) return;
    list.innerHTML = "";

    const services = [
      { key: "core", name: "Core (Beyin)", desc: "Ziyaretçi akışını ve beyin fonksiyonlarını yönetir." },
      { key: "growth", name: "Growth", desc: "Büyüme, trafik ve keşif mekanizmaları." },
      { key: "services", name: "Services", desc: "Ücretsiz & Premium hizmet katmanı." },
      { key: "sharing", name: "Sharing", desc: "Paylaşım, etkileşim ve içerik yayılımı." },
      { key: "security", name: "Security", desc: "Güvenlik, erişim ve tehdit takibi." },
      { key: "updating", name: "Updating", desc: "Sürekli güncelleme ve optimizasyon." }
    ];

    services.forEach(s => {
      const row = document.createElement("div");
      row.className = "status-row";
      row.innerHTML = `
        <div>
          <div class="status-title">${s.name}</div>
          <div class="status-desc">${s.desc}</div>
        </div>
        <span class="pill ok">İzleniyor</span>
      `;
      list.appendChild(row);
    });

    pushLog("Katman durumu özellik konfigürasyonu ile senkronize edildi (mock).");
  }

  function applyMockFeatures() {
    applyFeatures({});
  }

  // ============ API DURUM GÖRSEL ============
  function setApiOk() {
    const pill = $("#api-pill");
    const dot = $("#apiLamp");
    const txt = $("#apiStatusText");
    if (pill) {
      pill.style.background = "rgba(34,197,94,0.08)";
      pill.style.borderColor = "rgba(34,197,94,0.35)";
    }
    if (dot) {
      dot.style.background = "#22c55e";
      dot.style.boxShadow = "0 0 12px rgba(34,197,94,0.9)";
    }
    if (txt) {
      txt.textContent = "API bağlantısı aktif (live mod)";
    }
  }

  function setApiError(msg) {
    const pill = $("#api-pill");
    const dot = $("#apiLamp");
    const txt = $("#apiStatusText");
    if (pill) {
      pill.style.background = "rgba(239,68,68,0.08)";
      pill.style.borderColor = "rgba(239,68,68,0.35)";
    }
    if (dot) {
      dot.style.background = "#ef4444";
      dot.style.boxShadow = "0 0 12px rgba(239,68,68,0.9)";
    }
    if (txt) {
      txt.textContent = msg || "API bağlantısı yok";
    }
  }

  function renderApiPill() {
    if (state.mockMode) {
      setApiError("Mock mod (demo veri)");
    } else {
      // live modda ama henüz test edilmemiş olabilir
      const txt = $("#apiStatusText");
      if (txt && txt.textContent.includes("mock")) {
        txt.textContent = "API testi bekleniyor...";
      }
    }
  }

  // ============ ASSISTANT ============
  function assistantSay(text) {
    const p = $("#assistantText");
    if (p) p.textContent = text;
  }

  // ============ LOG & TOAST ============
  function pushLog(message) {
    state.logs.push({
      t: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      m: message
    });
    if (state.logs.length > 80) state.logs.shift();
    renderLogs();
  }

  function renderLogs() {
    const ul = $("#logList");
    if (!ul) return;
    ul.innerHTML = "";
    state.logs.forEach(l => {
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <div class="log-time">${l.t}</div>
        <div class="log-text">${escapeHtml(l.m)}</div>
      `;
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

  // ============ UTIL ============
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
