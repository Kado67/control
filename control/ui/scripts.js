// ===============================
// InflowAI Kontrol Merkezi - ORTAK
// Frontend JS
// ===============================

// API adresini burada tutuyoruz
const API_BASE_URL = "https://inflowai-api.onrender.com";
// app.js içinde hangi endpoint'i yazdıysak ona göre burayı ayarlarız.
// Örnek: app.post("/api/ortak", ...) ise:
const ORTAK_ENDPOINT = "/api/ortak"; // Gerekirse bunu değiştir

// DOM elementleri
const messagesEl = document.getElementById("dialog-messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const avatarOrb = document.querySelector(".avatar-orb");

let isSending = false;
let typingMessageRow = null;

// Mesaj ekleme
function appendMessage(role, text) {
  const row = document.createElement("div");
  row.classList.add("message-row");

  if (role === "user") {
    row.classList.add("message-user");
  } else {
    row.classList.add("message-system");
  }

  const bubble = document.createElement("div");
  bubble.classList.add("message-bubble");
  bubble.innerHTML = sanitizeText(text);

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollMessagesToBottom();

  return row;
}

// Basit XSS koruması için
function sanitizeText(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML.replace(/\n/g, "<br>");
}

// Scroll'u en alta indir
function scrollMessagesToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ORTAK yazıyor göstergesi
function showTypingIndicator() {
  removeTypingIndicator();
  typingMessageRow = appendMessage("system", "ORTAK yazıyor...");
  if (avatarOrb) {
    avatarOrb.classList.add("speaking");
  }
}

function removeTypingIndicator() {
  if (typingMessageRow && typingMessageRow.parentNode) {
    typingMessageRow.parentNode.removeChild(typingMessageRow);
  }
  typingMessageRow = null;
  if (avatarOrb) {
    avatarOrb.classList.remove("speaking");
  }
}

// Kullanıcı mesaj gönderdiğinde
async function handleSend() {
  if (isSending) return;

  const text = (inputEl.value || "").trim();
  if (!text) return;

  // Kullanıcı mesajını ekle
  appendMessage("user", text);
  inputEl.value = "";
  scrollMessagesToBottom();

  // ORTAK yazıyor animasyonu
  showTypingIndicator();
  isSending = true;

  try {
    const responseText = await askOrtak(text);
    removeTypingIndicator();

    appendMessage("system", responseText);
  } catch (error) {
    console.error("ORTAK API hatası:", error);
    removeTypingIndicator();

    appendMessage(
      "system",
      "Şu anda API'ye ulaşamıyorum. Render uykuda olabilir veya endpoint adresi hatalı. " +
        "Lütfen biraz sonra tekrar dene ya da ORTAK_ENDPOINT ayarını kontrol et."
    );
  } finally {
    isSending = false;
  }
}

// ORTAK API çağrısı
async function askOrtak(userMessage) {
  const url = API_BASE_URL + ORTAK_ENDPOINT;

  const payload = {
    message: userMessage,
    source: "control-center",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("API yanıtı başarısız: " + res.status);
  }

  const data = await res.json();

  // app.js içinde nasıl bir format döndürdüysek ona göre burayı ayarlarız.
  // Örnekler:
  // { reply: "..." } veya { message: "...", debug: {...} } gibi.
  const reply =
    data.reply ||
    data.message ||
    data.answer ||
    "Sistemden yanıt aldım ama formatı tanımlı değil. Lütfen API response yapısını güncelle.";

  return reply;
}

// Event listener'lar
if (sendBtn) {
  sendBtn.addEventListener("click", handleSend);
}

if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}

// İlk yüklemede scroll
scrollMessagesToBottom();
