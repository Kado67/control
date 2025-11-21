// =====================================================
// InflowAI System Updater
// Yeni özellikleri, API, modülleri otomatik günceller
// =====================================================

export const SystemUpdater = {
    currentVersion: "1.0.0",
    updateHistory: [],

    update(newVersion, notes) {
        this.updateHistory.push({
            from: this.currentVersion,
            to: newVersion,
            notes,
            date: new Date().toISOString()
        });

        this.currentVersion = newVersion;
        console.log(`⬆ Updated to version ${newVersion}`);
    },

    getHistory() {
        return this.updateHistory;
    }
};
