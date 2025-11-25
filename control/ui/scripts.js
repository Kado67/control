// ================================
// InflowAI Kontrol Merkezi UI
// Gerçek API ile bağlantı testi
// ================================

// BURAYI GEREKİRSE GÜNCELLE:
// Render'daki API URL'in tam hali:
const API_BASE_URL = "https://inflowai-api.onrender.com";

const apiStatusDot = document.getElementById("api-status-dot");
const apiStatusLabel = document.getElementById("api-status-label");
const apiStatusSub = document.getElementById("api-status-sub");
const apiModeTag = document.getElementById("api-mode-tag");
const lastCheckLabel = document.getElementById("last-check-label");

const overviewHealth = document.getElementById("overview-health");
const overviewMode = document.getElementById("overview-mode");
const overviewUptime = document.getElementById("overview-uptime");

const overviewSection = document.getElementById("overview-section");
const dynamicSection = document.getElementById("dynamic-section");
const dynamicTitle = document.getElementById("dynamic-title");
const dynamicDesc = document.getElementById("dynamic-desc");
const dynamicContent = document.getElementById("dynamic-content");

const sectionTitle = document.getElementById("section-title");
const sectionSubtitle = document.getElementById("section-subtitle");

const navItems = document.querySelectorAll(".nav-item");

// Küçük yardımcı: tarih formatı
function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// API sağlığını kontrol et
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("HTTP status " + res.status);
    }

    const data = await res.json();

    // UI güncelle
    apiStatusDot.style.background =
      "radial-gradient(circle, #e6fff6, #39e29a)";
    apiStatusDot.style.boxShadow = "0 0 14px rgba(57, 226, 154, 0.9)";
    apiStatusLabel.textContent = "API bağlantısı aktif (live)";
    apiStatusSub.textContent = "Render üzerinden canlı cevap alındı";
    apiModeTag.textContent = "API: Live";
    apiModeTag.classList.remove("tag-outline");
    apiModeTag.style.background = "rgba(57, 226, 154, 0.14)";
    apiModeTag.style.borderColor = "rgba(57, 226, 154, 0.8)";

    const uptimeSeconds = data.uptime || 0;
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);

    overviewHealth.textContent = "Stabil";
    overviewMode.textContent = "Normal";
    overviewUptime.textContent = uptimeMinutes.toString();

    lastCheckLabel.textContent = `Son kontrol: ${formatTime(
      new Date()
    )}`;
  } catch (error) {
    // Bağlantı yoksa mock moda geç
    apiStatusDot.style.background =
      "radial-gradient(circle, #ffebef, #ff4f6a)";
    apiStatusDot.style.boxShadow = "0 0 14px rgba(255, 79, 106, 0.9)";
    apiStatusLabel.textContent = "API bağlantısı yok (mock mod)";
    apiStatusSub.textContent = "Render şu an ulaşılmıyor veya uyku modunda";
    apiModeTag.textContent = "API: Mock";
    apiModeTag.classList.add("tag-outline");
    apiModeTag.style.background = "transparent";
    apiModeTag.style.borderColor = "rgba(255, 79, 106, 0.7)";

    overviewHealth.textContent = "Sadece UI";
    overviewMode.textContent = "İzleme";
    overviewUptime.textContent = "—";

    lastCheckLabel.textContent = `Son kontrol: hata (${error.message})`;
  }
}

// Bölüm içerikleri (sadece metin, rakam boğmuyoruz)
const SECTION_CONTENT = {
  core: {
    title: "Core (Beyin)",
    desc: "Asistan, üretim ve karar mekanizmasının birleştiği katman.",
    body: `
      <p><strong>Core ne yapar?</strong></p>
      <p>• İçerik üretimi, analiz ve karar akışlarının ana merkezi.</p>
      <p>• Kontrol merkeziyle konuşarak yeni özellik taleplerini, uyarıları ve
      acil durumları yönetecek.</p>
      <p><strong>Sonraki adımlar:</strong></p>
      <p>• Beyin için özel API endpoint'leri (ör: /api/core/state) eklenecek.</p>
    `,
  },
  growth: {
    title: "Growth",
    desc: "Büyüme hızını, yönünü ve tavanını yöneten katman.",
    body: `
      <p>Bu katman platformun <strong>ne kadar hızlı</strong> ve 
      <strong>ne kadar güvenli</strong> büyüyeceğini kontrol eder.</p>
      <p>Şimdilik sadece yüksek seviye strateji var; rakamlara boğmuyoruz.</p>
    `,
  },
  services: {
    title: "Services",
    desc: "Platformun sunduğu tüm servisleri yönetmek için.",
    body: `
      <p>• İçerik üretim servisleri</p>
      <p>• Analiz ve raporlama servisleri</p>
      <p>• İleride eklenecek premium / kurumsal servisler</p>
    `,
  },
  sharing: {
    title: "Sharing",
    desc: "Üretilen değerlerin dünyaya açıldığı katman.",
    body: `
      <p>Burada hangi içeriklerin, hangi kanallara, hangi hızda paylaşıldığını
      kontrol edeceksin.</p>
      <p>Henüz sadece planlama aşamasında.</p>
    `,
  },
  security: {
    title: "Security",
    desc: "Platformun zırhı. Hem sistem hem veri güvenliği burada.",
    body: `
      <p><strong>Odak noktaları:</strong></p>
      <p>• API anahtarları ve gizli bilgiler</p>
      <p>• Ziyaretçi verisinin güvenliği</p>
      <p>• Log'lar ve alarm mekanizması</p>
      <p>Bu panelden ileride “acil kilit”, “şüpheli trafik” gibi 
      butonlar eklenecek.</p>
    `,
  },
  updating: {
    title: "Updating",
    desc: "Platformun kendini yenilediği ve güncel tuttuğu katman.",
    body: `
      <p>• Yeni özellikler</p>
      <p>• Hata düzeltmeleri</p>
      <p>• Performans geliştirmeleri</p>
      <p>Buradan “güncelleme dalgaları” yönetilecek.</p>
    `,
  },
  commands: {
    title: "Komutlar",
    desc: "Tüm sistemi tek tuşla yönetmek için komut merkezi.",
    body: `
      <p>Buraya ileride; “bakımı başlat”, “acil modu aç”, 
      “trafik kalkanı” gibi tek tık komutlar gelecek.</p>
      <p>Şu an sadece tasarım ve mimari hazır.</p>
    `,
  },
  monetization: {
    title: "Monetization",
    desc: "Gelir akışlarını yöneten katman (Adsense, ödeme sistemleri vb.).",
    body: `
      <p>Şu anda platform <strong>bilerek</strong> ücretsiz ve reklamsız.</p>
      <p>Bu katman yalnızca hazır olduğunda devreye alınacak.</p>
    `,
  },
  infinity: {
    title: "Sonsuzluk Merkezi",
    desc: "Tüm verinin ve acil durum zekâsının saklandığı özel katman.",
    body: `
      <p>Bu katman senin bahsettiğin <strong>“hayat sigortası”</strong> gibi çalışacak.</p>
      <p>• Tüm kritik log ve yapılandırmalar burada saklanacak.</p>
      <p>• Core zayıflık gördüğünde buradan yardım isteyecek.</p>
      <p>• Sadece senin erişimin olan gizli bir oda gibi düşün.</p>
    `,
  },
};

// Bölüm değiştirme
function setSection(sectionKey) {
  if (sectionKey === "overview") {
    overviewSection.classList.remove("hidden");
    dynamicSection.classList.add("hidden");
    sectionTitle.textContent = "Genel Bakış";
    sectionSubtitle.textContent =
      "Tüm katmanların nabzını buradan takip edebilirsin.";
    return;
  }

  const info = SECTION_CONTENT[sectionKey];
  if (!info) return;

  overviewSection.classList.add("hidden");
  dynamicSection.classList.remove("hidden");

  sectionTitle.textContent = info.title;
  sectionSubtitle.textContent = info.desc;
  dynamicTitle.textContent = info.title;
  dynamicDesc.textContent = info.desc;
  dynamicContent.innerHTML = info.body;
}

// NAV olayları
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const section = btn.getAttribute("data-section");
    setSection(section);
  });
});

// İlk yüklemede
document.addEventListener("DOMContentLoaded", () => {
  setSection("overview");
  checkApiHealth();

  // Her 60 saniyede bir tekrar kontrol et
  setInterval(checkApiHealth, 60000);
});
