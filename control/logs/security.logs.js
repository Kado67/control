// SECURITY LOGS - Güvenlik Günlükleri

export const SecurityLogs = {
    logs: [],

    add(action, status, ip = "unknown") {
        const log = {
            id: Date.now(),
            action,
            status,
            ip,
            timestamp: new Date().toISOString()
        };

        this.logs.unshift(log);

        console.warn("🔐 SECURITY LOG:", log);
        return log;
    },

    getAll() {
        return this.logs;
    },

    filter(status) {
        return this.logs.filter(l => l.status === status);
    }
};
