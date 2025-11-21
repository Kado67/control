// =====================================================
// InflowAI System Recovery
// Çökme sonrası geri yükleme + güvenli çalıştırma
// =====================================================

import { SystemBackup } from "./backup.js";

export const SystemRecovery = {
    recover() {
        const backup = SystemBackup.latest();
        if (!backup) {
            console.error("❌ No backup found. Recovery failed.");
            return null;
        }

        console.warn("⚠ Restoring system from backup:", backup.id);
        return backup.data;
    },

    safeRestart() {
        console.log("🔄 Safe restart triggered...");
        return true;
    }
};
