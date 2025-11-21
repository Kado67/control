// InflowAI - Beyin Motoru
// Ortak Paneli + Sistem Özetleri + Büyüme Hesapları

(function (global) {
  "use strict";

  class InflowBrainCore {
    constructor() {
      this.growthRate = 0;
      this.totalUsers = 0;
      this.lastUsers = 0;
      this.lastCheck = Date.now();
    }

    updateStats(currentUserCount) {
      const now = Date.now();
      const diff = now - this.lastCheck;

      if (diff > 5000) {
        const change = currentUserCount - this.lastUsers;
        this.growthRate = change / (diff / 1000); // saniyeye göre büyüme
        this.lastUsers = currentUserCount;
        this.lastCheck = now;
      }
    }

    calculateGrowthPercentage() {
      return Math.max(0, Math.min(10, (this.growthRate / 50) * 100));
    }

    calculatePlatformHealth(cpu, ram) {
      let score = 100;

      if (cpu > 70) score -= (cpu - 70) * 0.7;
      if (ram > 75) score -= (ram - 75) * 0.8;

      return Math.max(50, Math.min(100, score));
    }

    async buildPartnerSummary() {
      const hour = new Date().getHours();

      let greet =
        hour < 6
          ? "İyi geceler"
          : hour < 12
          ? "Günaydın"
          : hour < 18
          ? "İyi günler"
          : "İyi akşamlar";

      return `${greet}, platform gündelik olarak büyüyor.`;
    }
  }

  const brain = new InflowBrainCore();

  // Global export
  global.InflowBrain = {
    updateStats: (users) => brain.updateStats(users),
    growth: () => brain.calculateGrowthPercentage(),
    health: (cpu, ram) => brain.calculatePlatformHealth(cpu, ram),
    buildPartnerSummary: () => brain.buildPartnerSummary(),
  };

  console.info("[InflowAI] Beyin Yüklendi.");
})(window);
