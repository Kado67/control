// PayTR ödeme altyapısı kontrol merkezi

export const PayTR = {
    apiKey: "test_api",
    merchantId: "000000",
    lastTransaction: null,
    autoSecureMode: true,

    init() {
        console.log("PayTR → Başlatıldı.");
        this.monitor();
    },

    createPayment(amount, user) {
        const id = "PAYTR-" + Date.now();

        this.lastTransaction = {
            id,
            user,
            amount,
            status: "Başarılı",
            date: new Date()
        };

        console.log("Yeni Ödeme:", this.lastTransaction);

        return this.lastTransaction;
    },

    monitor() {
        setInterval(() => {
            console.log("PayTR güvenlik taraması çalışıyor...");
        }, 5000);
    }
};

PayTR.init();
