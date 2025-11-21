// ======================================
// InflowAI Control / users / accounts.js
// Kullanıcı hesap yönetimi
// ======================================

export const UserAccounts = {
    list: [],

    create(user) {
        const account = {
            id: "USR-" + Date.now().toString(36),
            name: user.name || "Ziyaretçi",
            email: user.email || null,
            plan: user.plan || "free",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        this.list.push(account);
        console.log("[ACCOUNTS] Yeni kullanıcı:", account.id);
        return account;
    },

    findById(id) {
        return this.list.find(u => u.id === id) || null;
    },

    updatePlan(id, plan) {
        const user = this.findById(id);
        if (!user) return false;
        user.plan = plan;
        console.log("[ACCOUNTS] Plan güncellendi:", id, "=>", plan);
        return true;
    },

    markLogin(id) {
        const user = this.findById(id);
        if (!user) return false;
        user.lastLogin = new Date().toISOString();
        console.log("[ACCOUNTS] Giriş kaydedildi:", id);
        return true;
    }
};
