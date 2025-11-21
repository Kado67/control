// ==================================
// InflowAI Control / users / limits.js
// Kota ve limit yönetimi
// ==================================

export const UserLimits = {
    limits: {},

    setLimit(userId, key, value) {
        if (!this.limits[userId]) this.limits[userId] = {};
        this.limits[userId][key] = value;
        console.log("[LIMITS] Limit ayarlandı:", userId, key, value);
    },

    getLimit(userId, key) {
        return this.limits[userId]?.[key] ?? null;
    },

    check(userId, key, used) {
        const max = this.getLimit(userId, key);
        if (max === null) return true;
        return used <= max;
    }
};
