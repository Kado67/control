// InflowAI Kontrol Merkezi - UI Script
// Bu dosya Vercel'deki UI'yi Render'daki API'ye bağlar.

// 🔗 BURAYI gerekirse değiştir: Render API URL'in
const API_BASE = "https://inflowai-api.onrender.com";

// Basit event log helper
function pushEvent(type, message) {
  const ul = document.getElementById("event-log");
  if (!ul) return;
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  li.innerHTML = `<span>[${time}]</span><strong>${type}</strong><span>${message}</span>`;
  ul.prepend(li);

  // 30 kayıttan fazlasını sil
  while (ul.children.length > 30) {
    ul.removeChild(ul.lastChild);
  }
}

// API durumunu kontrol et
async function refreshApiStatus() {
  const dot = document.getElementById("api-status-indicator");
  const label = document.getElementById("api-status-label");
  const detail = document.getElementById("api-status-detail");
  const apiModePill = document.getElementById("api-mode-pill");

  try {
    label.textContent = "API kontrol ediliyor...";
    detail.textContent = "Render servisine istek gönderiliyor...";
    dot.classList.remove("dot-online", "dot-offline");

    const res = await fetch(`${API_BASE}/api/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // Uptime yüzdesi hesapla (çok kabaca)
    const uptimeSec = data.uptime || 0;
    const uptimePercent = Math.max(
      0,
      Math.min(100, 100 - Math.max(0, 5 - uptimeSec) * 5)
    );

    label.textContent = "API bağlı (canlı mod)";
    detail.textContent = `Son kontrol: ${
      new Date().toLocaleTimeString("tr-TR") || ""
    } • uptime: ${uptimeSec.toFixed(1)} sn`;

    dot.classList.add("dot-online");
    apiModePill.textContent = "API live";

    // Kartlardaki bar'ları güncelle
    updateHealthBars({
      apiUptime: uptimePercent,
      latencyMs: 180, // şimdilik sabit sahte değer
      errorRate: 1.5,
    });

    // Ortak özetini çek
    await loadOrtakSummary();

    pushEvent("API", "Bağlantı başarılı, canlı modda.");
  } catch (err) {
    console.error("API status error:", err);
    label.textContent = "API bağlantısı yok (mock mod)";
    detail.textContent =
      "Gerçek API'ye ulaşılamadı. Gösterilen veriler örnek (mock).";
    dot.classList.add("dot-offline");
    apiModePill.textContent = "API mock";

    // Mock değerlerle devam
    updateHealthBars({
      apiUptime: 82,
      latencyMs: 260,
      errorRate: 3.4,
    });
    loadMockSummary();

    pushEvent("API", "Bağlantı başarısız, mock moda düşüldü.");
  }
}

// Sağlık barlarını doldur
function updateHealthBars({ apiUptime, latencyMs, errorRate }) {
  const barApi = document.getElementById("bar-api-uptime");
  const barLat = document.getElementById("bar-latency");
  const barErr = document.getElementById("bar-error");
  const labelApi = document.getElementById("label-api-uptime");
  const labelLat = document.getElementById("label-latency");
  const labelErr = document.getElementById("label-error");

  if (barApi) {
    barApi.style.width = `${apiUptime}%`;
  }
  if (barLat) {
    const maxLat = 1000;
    barLat.style.width = `${Math.min(100, (latencyMs / maxLat) * 100)}%`;
  }
  if (barErr) {
    barErr.style.width = `${Math.min(100, errorRate)}%`;
  }

  if (labelApi) labelApi.textContent = `${apiUptime.toFixed(0)}%`;
  if (labelLat) labelLat.textContent = `${latencyMs} ms`;
  if (labelErr) labelErr.textContent = `${errorRate.toFixed(1)}%`;
}

// Ortak özetini API'den çek
async function loadOrtakSummary() {
  const container = document.getElementById("ortak-stream");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/ortak/summary`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const summary = json.data || {};

    container.innerHTML = "";

    const lines = summary.highlights || [
      "Ortak özeti yüklendi ancak highlight verisi boş.",
    ];

    lines.forEach((text) => {
      const div = document.createElement("div");
      div.className = "ortak-message";
      div.textContent = text;
      container.appendChild(div);
    });

    pushEvent("Ortak", "Gerçek özet yüklendi.");
  } catch (e) {
    console.warn("Ortak summary error:", e);
    loadMockSummary();
  }
}

// Mock ortak mesajı
function loadMockSummary() {
  const container = document.getElementById("ortak-stream");
  if (!container) return;

  container.innerHTML = "";

  const msgs = [
    "Mock mod: Bugün trafik stabil, büyüme pozitif yönde.",
    "Mock mod: API canlıya geçtiğinde, buraya gerçek veriler gelecek.",
  ];

  msgs.forEach((m) => {
    const div = document.createElement("div");
    div.className = "ortak-message muted";
    div.textContent = m;
    container.appendChild(div);
  });
}

// Sol menü tıklamaları
function setupNav() {
  const items = document.querySelectorAll(".nav-item");
  const title = document.getElementById("main-title");
  const subtitle = document.getElementById("main-subtitle");

  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      items.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const section = btn.getAttribute("data-section");
      switch (section) {
        case "genel":
          title.textContent = "Genel Bakış";
          subtitle.textContent =
            "Tüm katmanları buradan izleyip yönetebilirsin.";
          break;
        case "core":
          title.textContent = "Core (Beyin)";
          subtitle.textContent =
            "Ortak ile beyin katmanının senkronizasyon durumu.";
          break;
        case "growth":
          title.textContent = "Growth";
          subtitle.textContent =
            "Ziyaret, kullanıcı ve gelir büyüme metrikleri.";
          break;
        case "services":
          title.textContent = "Services";
          subtitle.textContent =
            "Tüm servislerin bağlantı ve sağlık durumları.";
          break;
        case "sharing":
          title.textContent = "Sharing";
          subtitle.textContent = "Paylaşım, API anahtarları ve entegrasyonlar.";
          break;
        case "security":
          title.textContent = "Security";
          subtitle.textContent =
            "Güvenlik katmanları, firewall ve olay kayıtları.";
          break;
        case "updating":
          title.textContent = "Updating";
          subtitle.textContent =
            "Sürüm yönetimi, yeni özellikler ve rollback kontrolü.";
          break;
        case "commands":
          title.textContent = "Komutlar";
          subtitle.textContent =
            "Ortak'a vereceğin komutların geçmişi ve etkileri.";
          break;
        case "monetization":
          title.textContent = "Monetization";
          subtitle.textContent =
            "Reklam, abonelik ve kurumsal gelir kanalları.";
          break;
        case "infinity":
          title.textContent = "Sonsuzluk Merkezi";
          subtitle.textContent =
            "Tüm sistemin hayat sigortası, veri kasası ve acil mod.";
          break;
      }

      pushEvent("NAV", `Bölüm değişti: ${section}`);
    });
  });
}

// Yenile butonu
function setupControls() {
  const btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      refreshApiStatus();
    });
  }
}

// Baslangıç
document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupControls();
  refreshApiStatus(); // sayfa açılınca hemen kontrol et

  // Örnek üst metrikleri (şimdilik mock - API'ye bağlandığında burası
  // isteğe göre güncellenebilir)
  document.getElementById("metric-today-visits").textContent = "120";
  document.getElementById("metric-active-users").textContent = "90";
  document.getElementById("metric-growth-rate").textContent = "3.4%";
});
