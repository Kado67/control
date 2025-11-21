// ============================
// InflowAI Security / auth.config.js
// Token ayarları + kullanıcı güvenliği
// ============================

export const AuthConfig = {
    tokenExpireMinutes: 45,
    refreshTokenExpireDays: 7,
    require2FA: true,
    allowGuestMode: true,

    validateToken(token) {
        try {
            if (!token) return false;
            return token.length > 20;
        } catch {
            return false;
        }
    },

    generateSession(userId) {
        return {
            userId,
            token: "INFLOWAI-" + Date.now().toString(36),
            createdAt: Date.now()
        };
    }
};
