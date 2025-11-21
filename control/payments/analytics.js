// Ziyaretçi hareketleri, trafik, dönüşüm ve davranış analiz motoru

export const AnalyticsEngine = {
    onlineUsers: 0,
    totalVisits: 0,
    avgSessionTime: 0,
    heatmapActive: true,
    recordings: [],

    init() {
        console.log("AnalyticsEngine → Başlatıldı.");
        this.startTracking();
        this.trackOnlineUsers();
    },

    startTracking() {
        setInterval(() => {
            this.totalVisits += Math.floor(Math.random() * 3);
            this.avgSessionTime = (Math.random() * 5 + 2).toFixed(1);
        }, 5000);
    },

    trackOnlineUsers() {
        setInterval(() => {
            this.onlineUsers = Math.floor(Math.random() * 40);
        }, 2000);
    },

    recordSession(data) {
        this.recordings.push(data);
        if (this.recordings.length > 1000) {
            this.recordings.shift();
        }
    }
};

AnalyticsEngine.init();
