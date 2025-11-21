// ============================
// InflowAI Security / logs.js
// Güvenlik loglama & AI tehdit raporu
// ============================

export const SecurityLogs = {
    entries: [],

    add(type, detail = {}) {
        const log = {
            id: "LOG-" + Date.now().toString(36),
            type,
            detail,
            time: new Date().toISOString()
        };
        this.entries.push(log);
        console.log("[SECURITY LOG]", log);
    },

    getLast(limit = 20) {
        return this.entries.slice(-limit);
    },

    analyze() {
        const summary = {
            ddos: 0,
            bot: 0,
            accessDenied: 0
        };

        this.entries.forEach(entry => {
            if (entry.type === "ddos") summary.ddos++;
            if (entry.type === "bot") summary.bot++;
            if (entry.type === "denied") summary.accessDenied++;
        });

        return summary;
    }
};
