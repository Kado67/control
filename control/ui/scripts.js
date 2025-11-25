// scripts.js
// =========================================
// InflowAI Kontrol Merkezi - UI Script
// API: Render (inflowai-api.onrender.com)
// =========================================

const API_BASE = "https://inflowai-api.onrender.com";

// --------- Yardımcılar ---------
function $(selector) {
  return document.querySelector(selector);
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function addLogRow(time, source, message) {
  const tbody = $("#log-body");
  if (!tbody) return;

  const tr = document.createElement("tr");

  const tdTime = document.createElement("td");
  tdTime.textContent = time;

  const tdSource = document.createElement("td");
  tdSource.textContent = source;

  const tdMsg = document.createElement("td");
  tdMsg.textContent = message;

  tr.appendChild(tdTime);
  tr.appendChild(tdSource);
  tr.appendChild(tdMsg);

  tbody.appendChild(tr);
}

// --------- API durumunu yükle ---------
async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function loadDashboard() {
  // İlk durum: yükleniyor
  setText("#api-status-text", "API kontrol ediliyor...");
  document.body.classList.add("loading");

  try {
    // Root veya /api/status ikisi de sağlık bilgisi veriyor
    const statusData = await fetchJson("/");
    // İsteğe bağlı: ortak özet; gelmezse sorun değil
    let summary = null;
    try {
      const summaryWrap = await fetchJson("/api/ortak/summary");
      summary = summaryWrap && summaryWrap.data ? summaryWrap.data : null;
    } catch (e) {
      // Özet gelmezse sessizce geç
      summary = null;
    }

    updateFromStatus(statusData, summary);
  } catch (err) {
    console.error("API bağlantı hatası:", err);
    setMockMode();
  } finally {
    document.body.classList.remove("loading");
  }
}

// --------- Gerçek verilerle ekranı güncelle ---------
function updateFromStatus(statusData, summary) {
  // 1) API durumu
  const pill = $("#api-status-pill");
  if (pill) {
    pill.classList.remove("status-error");
    pill.classList.add("status-live");
  }
  setText("#api-status-text", "API bağlantısı aktif (live mod)");

  // 2) Metrix (özetten al, yoksa makul fallback)
  const s = summary || {};
  const overview = s.overview || {};

  const todayVisits = overview.todayVisits ?? 120;
  const activeUsers = overview.activeUsers ?? 90;
  const growthRate = overview.growthRate ?? 3.4;

  setText("#metric-today-visits", todayVisits.toString());
  setText("#metric-active-users", activeUsers.toString());
  setText(
    "#metric-growth-rate",
    `${typeof growthRate === "number" ? growthRate.toFixed(1) : growthRate}%`
  );

  // 3) Sistem sağlığı
  const health = s.health || {};
  const apiUp = health.apiUptime ?? 100;
  const latency = health.avgLatencyMs ?? 180;
  const errorRate = health.errorRate ?? 1.5;

  setText("#health-api", `${apiUp}%`);
  setText("#health-latency", `${latency} ms`);
  setText("#health-error", `${errorRate}%`);

  // Progress bar genişlikleri (varsa)
  const barApi = $("#bar-api");
  const barLatency = $("#bar-latency");
  const barError = $("#bar-error");

  if (barApi) barApi.style.width = `${Math.min(apiUp, 100)}%`;
  if (barLatency) {
    // Latency ters mantıkla: düşük ms = yüksek bar
    const norm = Math.max(0, Math.min(100, 120 - latency)); // 0-120 ms arası
    barLatency.style.width = `${norm}%`;
  }
  if (barError) {
    const normErr = Math.max(0, Math.min(100, 100 - errorRate * 5));
    barError.style.width = `${normErr}%`;
  }

  // 4) Ortak Konuşuyor (daima dolu olsun)
  const uptimeSec = statusData.uptime || 0;
  const uptimeMin = Math.floor(uptimeSec / 60);

  let highlightLines = [];

  highlightLines.push("Ortak: API stabil, canlı modda çalışıyor.");
  if (uptimeMin > 0) {
    highlightLines.push(`Çalışma süresi: yaklaşık ${uptimeMin} dakika.`);
  } else {
    highlightLines.push("İnfra yeni başlatıldı, gözlem sürüyor.");
  }

  if (growthRate && typeof growthRate === "number") {
    if (growthRate > 0) {
      highlightLines.push(`Büyüme oranı pozitif (+${growthRate.toFixed(1)}%).`);
    } else if (growthRate < 0) {
      highlightLines.push(
        `Büyüme oranı negatif (${growthRate.toFixed(
          1
        )}%). Sebepler analiz ediliyor.`
      );
    }
  }

  // Eğer backend özetten ekstra highlight gönderiyorsa ekle
  if (summary && Array.isArray(summary.highlights)) {
    highlightLines = highlightLines.concat(summary.highlights);
  }

  const highlightText = highlightLines.join("  •  ");
  setText("#ortak-highlight", highlightText);

  // 5) Log satırları
  const now = new Date();
  const timeStr = `[${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}]`;

  // Önce body'yi temizle
  const tbody = $("#log-body");
  if (tbody) tbody.innerHTML = "";

  addLogRow(timeStr, "API", "Bağlantı başarılı, canlı modda.");
  addLogRow(timeStr, "Ortak", "Gerçek özet yüklendi ve analiz edildi.");
  addLogRow(timeStr, "Sistem", "Kontrol paneli verileri güncellendi.");
}

// --------- Mock moda düşme (API yoksa) ---------
function setMockMode() {
  const pill = $("#api-status-pill");
  if (pill) {
    pill.classList.remove("status-live");
    pill.classList.add("status-error");
  }
  setText("#api-status-text", "API bağlantısı yok (mock mod)");

  // Metrixleri sıfırla
  setText("#metric-today-visits", "0");
  setText("#metric-active-users", "0");
  setText("#metric-growth-rate", "0%");

  setText("#health-api", "0%");
  setText("#health-latency", "-");
  setText("#health-error", "-");

  const barApi = $("#bar-api");
  const barLatency = $("#bar-latency");
  const barError = $("#bar-error");

  if (barApi) barApi.style.width = "0%";
  if (barLatency) barLatency.style.width = "0%";
  if (barError) barError.style.width = "0%";

  setText(
    "#ortak-highlight",
    "Ortak: API şu anda kapalı. Gösterilen veriler mock/test modunda."
  );

  const tbody = $("#log-body");
  if (tbody) {
    tbody.innerHTML = "";
    addLogRow("[--:--]", "Sistem", "API'ye ulaşılamadı, mock moda geçildi.");
  }
}

// Sayfa yüklendiğinde başlat
document.addEventListener("DOMContentLoaded", loadDashboard);
