// =====================================================
// InflowAI System Monitor
// CPU, RAM, trafik, aktif kullanıcı, hataları izler
// =====================================================

export const SystemMonitor = {
    status: {
        cpu: 0,
        ram: 0,
        load: 0,
        uptime: 0,
        errors: []
    },

    update(values) {
        this.status = { ...this.status, ...values };
        console.log("🟦 System monitor updated");
    },

    pushError(err) {
        this.status.errors.push({
            message: err,
            time: new Date().toISOString()
        });

        if (this.status.errors.length > 50) {
            this.status.errors.shift();
        }
    },

    get() {
        return this.status;
    }
};
