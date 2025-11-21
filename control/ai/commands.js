/* ============================================
 * InflowAI Control - AI / commands.js
 * Ortak komut motoru – konuşmayı komuta çevirir
 * ============================================ */

;(function (global) {
  const InflowControlAI = global.InflowControlAI || {};

  const COMMANDS = [
    // Navigasyon
    {
      id: "open_dashboard",
      group: "navigation",
      patterns: [/kontrol merkezi/i, /dashboard/i, /paneli aç/i],
      action: { type: "ui:navigate", target: "dashboard" },
    },
    {
      id: "open_reports",
      group: "navigation",
      patterns: [/raporlar/i, /istatistik/i, /grafik/i],
      action: { type: "ui:navigate", target: "reports" },
    },

    // Platform durumu
    {
      id: "platform_health",
      group: "status",
      patterns: [
        /platform nasıl/i,
        /sistem durumu/i,
        /sağlık raporu/i,
        /her şey yolunda mı/i,
      ],
      action: { type: "platform:status" },
    },

    // Kullanıcı / ziyaretçi
    {
      id: "today_summary",
      group: "analytics",
      patterns: [
        /bugün ne oldu/i,
        /bugünkü özet/i,
        /günün özeti/i,
        /ziyaretçi özeti/i,
      ],
      action: { type: "analytics:summary:today" },
    },

    // Kişisel asistan (Ortak)
    {
      id: "call_contact",
      group: "assistant",
      patterns: [/ara bakim/i, /şunu ara/i, /telefon aç/i],
      action: { type: "assistant:call" },
    },
    {
      id: "create_todo",
      group: "assistant",
      patterns: [/hatırlat/i, /not al/i, /yapılacaklara ekle/i],
      action: { type: "assistant:todo" },
    },

    // Moral / psikolog modu
    {
      id: "talk_mode",
      group: "assistant",
      patterns: [
        /canım sıkkın/i,
        /moralim bozuk/i,
        /biraz konuşalım/i,
        /dertleşelim/i,
      ],
      action: { type: "assistant:talk" },
    },
  ];

  function matchCommand(text) {
    if (!text) return null;
    const normalized = text.trim();

    for (const cmd of COMMANDS) {
      if (!cmd.patterns) continue;
      for (const re of cmd.patterns) {
        if (re.test(normalized)) {
          return {
            id: cmd.id,
            group: cmd.group,
            action: cmd.action,
            raw: text,
          };
        }
      }
    }

    // Hiç net eşleşme yoksa, genel "assistant:free" komutu
    return {
      id: "free_talk",
      group: "assistant",
      action: { type: "assistant:free" },
      raw: text,
    };
  }

  const CommandEngine = {
    version: "1.0.0",
    parse(text, context = {}) {
      const cmd = matchCommand(text);
      return {
        ...cmd,
        context,
        at: new Date().toISOString(),
      };
    },
    getCommands() {
      return COMMANDS;
    },
  };

  InflowControlAI.commands = CommandEngine;
  global.InflowControlAI = InflowControlAI;
})(window);
