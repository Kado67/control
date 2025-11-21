// =====================================================
// InflowAI System Backup Manager
// Otomatik yedekleme + Acil durum snapshot sistemi
// =====================================================

export const SystemBackup = {
    backups: [],

    create(data) {
        const backup = {
            id: "BKP-" + Date.now().toString(36),
            createdAt: new Date().toISOString(),
            data
        };

        this.backups.push(backup);
        console.log("✔ Backup created:", backup.id);

        return backup;
    },

    getAll() {
        return this.backups;
    },

    latest() {
        return this.backups[this.backups.length - 1] || null;
    }
};
