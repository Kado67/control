// ===================================
// InflowAI Control / users / reports.js
// Kullanıcı raporlama
// ===================================

export const UserReports = {
    stats: {
        totalUsers: 0,
        activeUsers: 0,
        premiumUsers: 0
    },

    recalc(users) {
        this.stats.totalUsers = users.length;
        this.stats.activeUsers = users.filter(u => u.status === "active").length;
        this.stats.premiumUsers = users.filter(u => u.plan !== "free").length;

        console.log("[REPORTS] Kullanıcı istatistikleri güncellendi.");
        return this.stats;
    },

    get() {
        return this.stats;
    }
};
