// InflowAI Kontrol Merkezi — ORTAK UI
// API: https://inflowai-api.onrender.com
// Endpoints:
//  - GET  /api/status
//  - GET  /api/ortak/summary
//  - GET  /api/ortak/features
//  - POST /api/ortak/analyze

const API_BASE = "https://inflowai-api.onrender.com";

const el = (id) => document.getElementById(id);
const logBox = el("logBox");

let lastSummary = null;
let lastFeatures = null;

// ------------------- LOG SYSTEM -------------------
const logs = [];
function addLog(text) {
  const t = new Date();
  const stamp = t.toLocaleTimeString("tr-TR");
  logs.unshift(`[${stamp}] ${text}`);
  if (logs.length > 80) logs.pop();
  logBox.textContent = logs.join("\n");
  el("logCount").textContent = `${logs.length} kayıt`;
}

// ------------------- API HELPERS -------------------
async function safeFetch(path, options = {}) {
  const url = API_BASE + path;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ------------------- RENDER SUMMARY -------------------
function renderSummary(summaryPayload) {
  // summaryPayload: {status:"ok", data:{...}, checkedAt:"..."}
  const data = summaryPayload?.data || summaryPayload || {};

  // Esnek okuma: farklı isimler gelirse bile kırılmasın
  const mood = data.mood || data.ruhHali || data.state || "Kararlı";
  const health =
    data.healthScore ??
    data.saglikSkoru ??
    data.score ??
    81;

  const note =
    data.note ||
    data.ortakNotu ||
    data.summaryText ||
    "Ortak özeti hazır.";

  el("moodValue").textContent = mood;
  el("moodReason").textContent =
    data.moodReason || data.ruhSebebi || "Ortak stabil durumda.";

  el("healthValue").textContent =
    typeof health === "number" ? health : String(health);

  el("lastUpdate").textContent = new Date().toLocaleTimeString("tr-TR");

  el("summaryNote").textContent = note;

  el("checkedAt").textContent =
    summaryPayload?.checkedAt
      ? new Date(summaryPayload.checkedAt).toLocaleString("tr-TR")
      : "—";
}

// ------------------- FEATURES NORMALIZE -------------------
function normalizeFeatures(featuresPayload) {
  // API'den gelebilecek her formu array'e çeviriyoruz.
  // Çünkü sende "features.map is not a function" hatası vardı.
  const raw = featuresPayload?.data ?? featuresPayload ?? [];

  if (Array.isArray(raw)) return raw;

  // object ise values veya embedded/suggested alanları olabilir
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.embedded) || Array.isArray(raw.suggested)) {
      const embedded = raw.embedded || [];
      const suggested = raw.suggested || [];
      return [...embedded, ...suggested].map(f => ({...f}));
    }
    // düz object -> values
    return Object.values(raw);
  }

  return [];
}

function splitEmbeddedSuggested(features) {
  // Etiket veya kaynak alanına göre ayırıyoruz
  const embedded = [];
  const suggested = [];

  features.forEach((f) => {
    const source = (f.source || f.type || f.category || "").toLowerCase();
    const isEmbedded =
      source.includes("embedded") ||
      source.includes("göm") ||
      f.embedded === true;

    if (isEmbedded) embedded.push(f);
    else suggested.push(f);
  });

  return { embedded, suggested };
}

function renderFeatureList(listEl, features) {
  listEl.innerHTML = "";
  if (!features.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Henüz özellik yok.";
    listEl.appendChild(li);
    return;
  }

  features.forEach((f, i) => {
    const title = f.title || f.name || `Özellik #${i + 1}`;
    const desc = f.desc || f.description || f.detail || "";
    const tag = f.tag || f.level || f.status || (f.source ? f.source : "ORTAK");

    const li = document.createElement("li");
    li.className = "feature-item";

    li.innerHTML = `
      <div class="feature-main">
        <div class="feature-title">${escapeHtml(title)}</div>
        ${desc ? `<div class="feature-desc">${escapeHtml(desc)}</div>` : ""}
      </div>
      <div class="feature-tag">${escapeHtml(tag)}</div>
    `;

    listEl.appendChild(li);
  });
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

// ------------------- API STATUS -------------------
function setApiStatus(ok, text) {
  const dot = el("apiDot");
  const label = el("apiText");
  const pill = el("apiModePill");

  if (ok) {
    dot.style.background = "var(--good)";
    dot.style.boxShadow = "0 0 10px rgba(61,220,151,.7)";
    label.textContent = text || "Aktif";
    pill.textContent = "API live";
  } else {
    dot.style.background = "var(--bad)";
    dot.style.boxShadow = "0 0 10px rgba(255,107,107,.7)";
    label.textContent = text || "Bağlı değil (mock)";
    pill.textContent = "API mock";
  }
}

// ------------------- CHAT -------------------
const chatWindow = el("chatWindow");
const chatInput = el("chatInput");

function pushMessage(role, text){
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  msg.innerHTML = `
    <div class="txt">${escapeHtml(text)}</div>
    <span class="time">${new Date().toLocaleTimeString("tr-TR")}</span>
  `;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function ortakReply(userText){
  // API'de chat endpoint yok, şimdilik zeki bir UI cevabı veriyoruz:
  const mood = lastSummary?.data?.mood || "Kararlı";
  const health = lastSummary?.data?.healthScore ?? 81;

  const embedded = lastFeatures?.embedded || [];
  const suggested = lastFeatures?.suggested || [];

  if (/özellik|feature|ne ekleyelim|fikir/i.test(userText)){
    if (suggested.length){
      return `Şu an önerdiklerimden başla: "${suggested[0].title || suggested[0].name}". İstersen detaylandırayım.`;
    }
    return "Henüz yeni öneri üretmedim. İstersen hedefini söyle, ona göre öneri çıkarayım.";
  }

  if (/sağlık|skor|durum/i.test(userText)){
    return `Şu an ruh hâlim: ${mood}. Sağlık skorun: ${health}. Sistem stabil.`;
  }

  if (/gömülü|mevcut/i.test(userText)){
    return embedded.length
      ? `Platformda gömülü ${embedded.length} özellik var. İstersen tek tek özetleyeyim.`
      : "Şu an gömülü özellik listesi boş görünüyor.";
  }

  return "Anladım. Hedefini biraz daha netleştirirsen sana en iyi yolu çıkarırım.";
}

// ------------------- LOAD ALL -------------------
async function loadAll() {
  addLog("UI başlatıldı.");

  // 1) Status
  const st = await safeFetch("/api/status");
  if (st.ok) {
    setApiStatus(true, "Aktif");
    addLog("API OK: InflowAI API durumu.");
  } else {
    setApiStatus(false, st.error);
    addLog("API bağlantısı kurulamadı. Mock moda geçildi.");
  }

  // 2) Summary
  const sm = await safeFetch("/api/ortak/summary");
  if (sm.ok) {
    lastSummary = sm.data;
    renderSummary(sm.data);
    addLog("Ortak summary güncellendi.");
  } else {
    renderSummary({
      data: {
        mood: "Kararlı",
        healthScore: 81,
        note: "API’den özet alınamadı. Mock özet gösteriliyor.",
        moodReason: "Bağlantı yok veya gecikme.",
      },
    });
    addLog(`Summary çekilemedi: ${sm.error}`);
  }

  // 3) Features
  const ft = await safeFetch("/api/ortak/features");
  let featuresArr = [];
  if (ft.ok) {
    featuresArr = normalizeFeatures(ft.data);
    addLog("Features güncellendi.");
  } else {
    addLog(`Features çekilemedi: ${ft.error}`);
    featuresArr = [];
  }

  const split = splitEmbeddedSuggested(featuresArr);
  lastFeatures = split;

  renderFeatureList(el("embeddedList"), split.embedded);
  renderFeatureList(el("suggestedList"), split.suggested);

  el("embeddedCount").textContent = `${split.embedded.length} özellik`;
  el("suggestedCount").textContent = `${split.suggested.length} özellik`;

  // Eğer API object sekmesinden embedded/suggested geliyorsa
  // count doğru kalsın diye tekrar hesaplıyor.
}

// ------------------- EVENTS -------------------
el("refreshBtn").addEventListener("click", loadAll);

el("sendChatBtn").addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;

  pushMessage("user", text);
  chatInput.value = "";

  const reply = ortakReply(text);
  pushMessage("bot", reply);
  addLog("Ortak konuşma mesajı işlendi.");
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") el("sendChatBtn").click();
});

el("clearChatBtn").addEventListener("click", () => {
  chatWindow.innerHTML = "";
  addLog("Konuşma temizlendi.");
});

el("openChatBtn").addEventListener("click", () => {
  chatInput.focus();
});

// Start
loadAll();
