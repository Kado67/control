// =======================
// InflowAI Security / access.js
// Üst seviye erişim kontrol motoru
// =======================

export const AccessControl = {
    rules: [],

    init() {
        this.rules = [
            { id: "ip_block", type: "ip", deny: [], allow: [] },
            { id: "country_limit", type: "country", deny: [], allow: [] },
            { id: "device_check", type: "device", enabled: true },
            { id: "behavior", type: "behavior", threshold: 90 }
        ];
        console.log("[SECURITY] Access control hazır.");
    },

    check(req) {
        try {
            const { ip, country, device, behaviorScore } = req;

            // IP kontrol
            const ipRule = this.rules.find(r => r.id === "ip_block");
            if (ipRule.deny.includes(ip)) return false;

            // Ülke kontrol
            const cRule = this.rules.find(r => r.id === "country_limit");
            if (cRule.deny.includes(country)) return false;

            // Cihaz kontrol
            if (device.isEmulator) return false;

            // Davranış analizi (bot engelleme)
            if (behaviorScore < 25) return false;

            return true;
        } catch (err) {
            console.error("[SECURITY] Access kontrol hatası:", err);
            return false;
        }
    }
};
