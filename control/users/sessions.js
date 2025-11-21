// ====================================
// InflowAI Control / users / sessions.js
// Oturum ve cihaz takibi
// ====================================

export const UserSessions = {
    sessions: [],

    start(userId, device = "web") {
        const session = {
            id: "SES-" + Date.now().toString(36),
            userId,
            device,
            startedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            active: true
        };

        this.sessions.push(session);
        console.log("[SESSIONS] Oturum başlatıldı:", session.id);
        return session.id;
    },

    touch(sessionId) {
        const s = this.sessions.find(x => x.id === sessionId);
        if (!s) return false;
        s.lastActivity = new Date().toISOString();
        return true;
    },

    end(sessionId) {
        const s = this.sessions.find(x => x.id === sessionId);
        if (!s) return false;
        s.active = false;
        console.log("[SESSIONS] Oturum kapatıldı:", sessionId);
        return true;
    },

    listByUser(userId) {
        return this.sessions.filter(s => s.userId === userId);
    }
};
