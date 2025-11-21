// ===============================
//  InflowAI - CORE STATE
// ===============================

const CoreState = {
    aiScore: 0,
    serverLoad: 0,
    activeUsers: 0,
    growthRate: 0,
    trafficData: [],
    events: [],

    updateAll(newData) {
        if (!newData) return;

        this.aiScore = newData.aiScore ?? this.aiScore;
        this.serverLoad = newData.serverLoad ?? this.serverLoad;
        this.activeUsers = newData.activeUsers ?? this.activeUsers;
        this.growthRate = newData.growthRate ?? this.growthRate;

        this.trafficData = newData.trafficData ?? this.trafficData;
        this.events = newData.events ?? this.events;

        document.dispatchEvent(new CustomEvent("coreUpdated"));
    }
};
