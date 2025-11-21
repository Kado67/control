// ============================
// InflowAI Security / firewall.js
// AI destekli saldırı engelleme sistemi
// ============================

export const Firewall = {
    attackLog: [],

    detect(req) {
        const { ip, rate, userAgent } = req;

        // Çok hızlı istek → olası DDOS
        if (rate > 50) return "ddos";

        // UserAgent şüpheli
        if (userAgent.includes("bot") || userAgent.includes("crawler"))
            return "bot";

        return "ok";
    },

    handle(req) {
        const result = this.detect(req);
        if (result !== "ok") {
            this.attackLog.push({
                ip: req.ip,
                type: result,
                time: Date.now()
            });
            console.warn("[FIREWALL] Engellenen saldırı:", result);
            return false;
        }
        return true;
    }
};
