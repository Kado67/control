/* ============================================
 * InflowAI Control - AI / automation.js
 * Otomasyon motoru – tetikleyici ve görev sistemi
 * ============================================ */

;(function (global) {
  const InflowControlAI = global.InflowControlAI || {};

  const AutomationEngine = {
    version: "1.0.0",
    automations: [],

    createAutomation(config) {
      const auto = {
        id:
          config.id ||
          "auto_" + Date.now() + "_" + Math.random().toString(16).slice(2),
        name: config.name || "Otomasyon",
        enabled: config.enabled !== false,
        trigger: config.trigger || { type: "time", intervalMs: 60_000 },
        action: config.action || (() => {}),
        lastRun: null,
        createdAt: new Date().toISOString(),
      };

      this.automations.push(auto);
      return auto;
    },

    // Basit tetikleyici kontrolü – kontrol merkezi periyodik çağırabilir
    tick(context = {}) {
      const now = Date.now();

      this.automations.forEach((auto) => {
        if (!auto.enabled) return;

        if (auto.trigger.type === "time") {
          const interval = auto.trigger.intervalMs || 60_000;
          const last = auto.lastRun ? new Date(auto.lastRun).getTime() : 0;
          if (now - last >= interval) {
            try {
              auto.action(context);
              auto.lastRun = new Date().toISOString();
            } catch (err) {
              console.error("[ORTAK AUTOMATION ERROR]", err, auto);
            }
          }
        }

        if (auto.trigger.type === "metric") {
          const { key, over, under } = auto.trigger;
          const value = context.metrics ? context.metrics[key] : undefined;
          if (typeof value === "number") {
            const okOver = typeof over === "number" ? value > over : true;
            const okUnder = typeof under === "number" ? value < under : true;
            if (okOver && okUnder) {
              try {
                auto.action({ ...context, value });
                auto.lastRun = new Date().toISOString();
              } catch (err) {
                console.error("[ORTAK AUTOMATION ERROR]", err, auto);
              }
            }
          }
        }
      });
    },

    list() {
      return [...this.automations];
    },

    enable(id, enabled = true) {
      const auto = this.automations.find((a) => a.id === id);
      if (!auto) return null;
      auto.enabled = enabled;
      return auto;
    },
  };

  InflowControlAI.automation = AutomationEngine;
  global.InflowControlAI = InflowControlAI;
})(window);
