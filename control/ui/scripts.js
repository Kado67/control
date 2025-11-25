// InflowAI Kontrol Merkezi - Frontend Mantığı
// API: https://inflowai-api.onrender.com

const API_BASE = "https://inflowai-api.onrender.com";

// DOM referansları
const apiStatusPill = document.getElementById("api-status-pill");
const apiStatusText = document.getElementById("api-status-text");
const apiShortStatus = document.getElementById("api-short-status");

const metricTodayVisits = document.getElementById("metric-today-visits");
const metricActiveUsers = document.getElementById("metric-active-users");
const metricGrowthRate = document.getElementById("metric-growth-rate");

const healthApiFill = document.getElementById("health-api");
const healthLatencyFill = document.getElementById("health-latency");
const healthErrorsFill = document.getElementById("health-errors");
const healthApiText = document.getElementById("health-api-text");
const healthLatencyText = document.getElementById("health-latency-text");
const healthErrorsText = document.getElementById("health-errors-text");

const ortakSummaryBox = document.getElementById("ortak-summary");
const refreshBtn = document.getElementById("refresh-btn");
const forceSummaryBtn = document.getElementById("force-summary-btn");

// ---------------------------
// Yardımcı fonksiyonlar
// ---------------------------

function setApiConnected(connected, info) {
  if (connected) {
    apiStatusPill.classList.remove("status-disconnected");
    apiStatusPill.classList.add("status-connected");
    apiStatusText.textContent = "API bağlı (canlı)";
    apiShortStatus.textContent = "ON";

    if (info && info.timestamp) {
      apiStatusText.textContent = `API bağlı (son kontrol: ${new Date(
        info.timestamp
      ).toLocaleTimeString("tr-TR")})`;
    }
  } else {
    apiStatusPill.classList.remove("status-connected");
    apiStatusPill.classList.add("status-disconnected");
    apiStatusText.textContent = "API bağlantısı yok (mock mod)";
    apiShortStatus.textContent = "OFF";
  }
}

// Metrics'i basitçe doldur (şimdilik API'den bağımsız mock)
function updateBasicMetrics() {
  // Bu değerleri istersen gerçek metrik endpoint'ine göre değiştirebiliriz.
  metricTodayVisits.textContent = "120";
  metricActiveUsers.textContent = "90";
  metricGrowthRate.textContent = "3.4%";
}

// Sağlık bar'larını doldur
function updateHealthBars(options) {
  const apiScore = options.apiScore ?? 96;
  const latencyMs = options.latencyMs ?? 82;
  const errorRate = options.errorRate ?? 1.2;

  healthApiFill.style.width = `${apiScore}%`;
  healthApiText.textContent = `${apiScore}%`;

  const latencyPercent = Math.max(0, 100 - latencyMs / 3);
  healthLatencyFill.style.width = `${latencyPercent}%`;
  healthLatencyText.textContent = `${latencyMs.toFixed(0)} ms`;

  const errorPercent = Math.min(100, errorRate * 8);
  healthErrorsFill.style.width = `${100 - errorPercent}%`;
  healthErrorsText.textContent = `${errorRate.toFixed(1)}%`;
}

// Gelen summary objesini okunur hale getir
function formatSummary(summary) {
  if (!summary) {
    return "Ortak henüz konuşmadı.";
  }

  if (typeof summary === "string") {
    return summary;
  }

  const parts = [];

  if (summary.headline) parts.push(summary.headline);
  if (summary.growthNote) parts.push(summary.growthNote);
  if (Array.isArray(summary.highlights)) {
    parts.push(summary.highlights.join(" • "));
  }

  // Bilinmeyen yapı için fallback
  if (parts.length === 0) {
    return JSON.stringify(summary, null, 2);
  }

  return parts.join("\n\n");
}

// ---------------------------
// API Çağrıları
// ---------------------------

async function pingApi() {
  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Status kodu uygun değil: " + res.status);
    }

    const data = await res.json();
    setApiConnected(true, data);

    // Sağlık + metrikler
    updateBasicMetrics();
    updateHealthBars({
      apiScore: 97,
      latencyMs: 80,
      errorRate: 0.8,
    });

    return true;
  } catch (err) {
    console.error("API ping hatası:", err);
    setApiConnected(false);
    updateHealthBars({
      apiScore: 10,
      latencyMs: 500,
      errorRate: 20,
    });
    return false;
  }
}

async function loadOrtakSummary() {
  try {
    const res = await fetch(`${API_BASE}/api/ortak/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Summary status kodu uygun değil: " + res.status);
    }

    const body = await res.json();
    const formatted = formatSummary(body.data);
    ortakSummaryBox.textContent = formatted;
  } catch (err) {
    console.error("Summary çekilirken hata:", err);
    ortakSummaryBox.textContent =
      "Ortak şu an cevap veremedi. API bağlantısı kurulamadı veya summary endpoint'i hazır değil.";
  }
}

// ---------------------------
// Başlatma
// ---------------------------

async function initDashboard() {
  const ok = await pingApi();

  if (ok) {
    loadOrtakSummary();
  } else {
    ortakSummaryBox.textContent =
      "API'ye ulaşamıyoruz. Render servisinin çalıştığından emin ol ve tekrar dene.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();

  refreshBtn.addEventListener("click", () => {
    initDashboard();
  });

  forceSummaryBtn.addEventListener("click", () => {
    loadOrtakSummary();
  });
});
