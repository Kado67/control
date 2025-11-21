// InflowAI - Voice & Listening Engine
// ORTAK'ın "dinleme" modu ve temel ses kontrolleri

(function (global) {
  "use strict";

  const Memory = global.InflowAssistantMemory;
  const Control = global.InflowControl;

  const VoiceEngine = {
    isListening() {
      const state = Memory.getState();
      return !!state.listening;
    },

    toggleListening() {
      const now = Memory.toggleListening();
      this.logListeningState(now);
      return now;
    },

    setListening(value) {
      const now = Memory.setListening(value);
      this.logListeningState(now);
      return now;
    },

    logListeningState(on) {
      const msg = on
        ? "Ortak: Dinleme modu açık. Seni bekliyorum kurban."
        : "Ortak: Dinleme modu kapalı. Çağırırsan yine buradayım.";
      console.info("[ORTAK][VOICE]", msg);

      // İstersek kontrol merkezine olay gönderebiliriz
      if (Control && typeof Control.emit === "function") {
        Control.emit("voice:listening-state", {
          listening: on,
          time: new Date().toISOString(),
        });
      }
    },

    // Örnek: metni "seslendiriyormuş gibi" işleme (gerçek TTS yok, simülasyon)
    speak(text) {
      console.log("[ORTAK][SPEAK]:", text);

      if (Control && typeof Control.emit === "function") {
        Control.emit("voice:speak", {
          text,
          time: new Date().toISOString(),
        });
      }
    },

    // Örnek: sesli komut simülasyonu
    handleCommand(text) {
      const normalized = (text || "").toLowerCase("tr-TR");

      if (!this.isListening()) {
        this.speak("Dinleme kapalı, önce beni uyandırman lazım.");
        return;
      }

      if (normalized.includes("dinlemeyi kapa")) {
        this.setListening(false);
        this.speak("Tamam, dinlemeyi kapattım.");
        return;
      }

      if (normalized.includes("dinlemeyi aç")) {
        this.setListening(true);
        this.speak("Tamam, dinlemeyi açtım. Buradayım.");
        return;
      }

      // Buraya ileride rota, müzik, arama, mesaj vb. eklenebilir.
      this.speak("Komutunu not aldım, kontrol merkezine iletiyorum.");
    },
  };

  global.InflowAssistantVoice = VoiceEngine;

  console.info("[InflowAI] Voice Engine Yüklendi.");
})(window);
