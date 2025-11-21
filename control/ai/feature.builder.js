/* ============================================
 * InflowAI Control - AI / feature.builder.js
 * Küçük özellik üretici – mikro iyileştirmeler
 * ============================================ */

;(function (global) {
  const InflowControlAI = global.InflowControlAI || {};

  const FeatureBuilder = {
    version: "1.0.0",

    registry: [],

    registerFeature(feature) {
      const f = {
        id:
          feature.id ||
          "feat_" + Date.now() + "_" + Math.random().toString(16).slice(2),
        createdAt: new Date().toISOString(),
        status: "idea", // idea | planned | active | paused
        impact: feature.impact || "low", // low | medium | high
        ...feature,
      };

      this.registry.push(f);
      return f;
    },

    list(options = {}) {
      let items = [...this.registry];
      if (options.status) {
        items = items.filter((f) => f.status === options.status);
      }
      if (options.tag) {
        items = items.filter((f) => (f.tags || []).includes(options.tag));
      }
      return items;
    },

    // Ziyaretçi & davranışa göre ufak feature önerileri
    suggestMicroFeatures(context = {}) {
      const suggestions = [];
      const {
        activeUsers = 0,
        bounceRate,
        avgSessionDuration,
        signupsToday,
      } = context;

      if (activeUsers > 30 && signupsToday === 0) {
        suggestions.push(
          this.registerFeature({
            status: "planned",
            impact: "high",
            title: "Ziyaretçi > 30, kayıt yok – pop-up kayıt çağrısı",
            description:
              "Kayıt olmayan kullanıcılara ücretsiz paket / kayıt hatırlatması göster.",
            tags: ["conversion", "micro-ui"],
          })
        );
      }

      if (bounceRate && bounceRate > 70) {
        suggestions.push(
          this.registerFeature({
            status: "idea",
            impact: "medium",
            title: "Yüksek bounce – ilk ekran optimizasyonu",
            description:
              "İlk ekranda daha net değer önerisi, daha az metin, daha fazla aksiyon butonu öner.",
            tags: ["ux", "landing"],
          })
        );
      }

      if (avgSessionDuration && avgSessionDuration > 600) {
        suggestions.push(
          this.registerFeature({
            status: "planned",
            impact: "low",
            title: "Uzun ziyaret – küçük ipuçları",
            description:
              "Uzun süre sitede kalanlara mini ipucu baloncukları göster, yeni özellikleri tanıt.",
            tags: ["engagement"],
          })
        );
      }

      return suggestions;
    },
  };

  InflowControlAI.featureBuilder = FeatureBuilder;
  global.InflowControlAI = InflowControlAI;
})(window);
