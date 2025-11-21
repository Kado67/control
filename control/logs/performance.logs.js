// PERFORMANCE LOGS - Performans Günlükleri

export const PerformanceLogs = {
    metrics: [],

    add(name, value, note = "") {
        const metric = {
            id: Date.now(),
            name,
            value,
            note,
            timestamp: new Date().toISOString()
        };

        this.metrics.unshift(metric);

        console.log("⚡ PERFORMANCE LOG:", metric);
        return metric;
    },

    getAll() {
        return this.metrics;
    },

    avg(name) {
        const list = this.metrics.filter(m => m.name === name);
        if (list.length === 0) return 0;

        const total = list.reduce((sum, m) => sum + m.value, 0);
        return (total / list.length).toFixed(2);
    }
};
