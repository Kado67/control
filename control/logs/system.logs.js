// SYSTEM LOGS - Evrensel Sistem Günlükleri

export const SystemLogs = {
    logs: [],

    add(type, message) {
        const log = {
            id: Date.now(),
            type,
            message,
            timestamp: new Date().toISOString()
        };

        this.logs.unshift(log);

        console.log("📘 SYSTEM LOG:", log);
        return log;
    },

    getAll() {
        return this.logs;
    },

    filter(type) {
        return this.logs.filter(l => l.type === type);
    }
};
