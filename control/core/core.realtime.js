// ===============================
//  InflowAI - REALTIME DATA
// ===============================

const RealtimeCore = {
    interval: null,

    start() {
        console.log("RealtimeCore: Aktif");

        // 3 saniyede bir gerçek API'ye istek gider
        this.interval = setInterval(() => {
            this.fetchData();
        }, 3000);
    },

    async fetchData() {
        try {
            const response = await fetch(`${InflowCore.apiBase}/api/core`);
            const data = await response.json();

            CoreState.updateAll(data);

        } catch (err) {
            console.warn("API Bağlantı Hatası:", err);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    RealtimeCore.start();
});
