// Platform finans yönetimi, gelir tahmini, gider hesaplama

export const FinanceEngine = {
    balance: 0,
    incomeHistory: [],
    expenseHistory: [],
    autoForecast: true,

    init() {
        console.log("FinanceEngine → Başlatıldı.");
        this.simulateFlows();
        this.forecast();
    },

    addIncome(amount, source = "unknown") {
        this.balance += amount;
        this.incomeHistory.push({ amount, source, date: new Date() });
    },

    addExpense(amount, reason = "general") {
        this.balance -= amount;
        this.expenseHistory.push({ amount, reason, date: new Date() });
    },

    simulateFlows() {
        setInterval(() => {
            let gain = Math.random() * 10;
            this.addIncome(gain, "AdSense + Platform Geliri");
        }, 8000);
    },

    forecast() {
        if (!this.autoForecast) return;

        setInterval(() => {
            let predicted =
                this.balance +
                Math.random() * 150 -
                Math.random() * 50;

            console.log("Finansal tahmin:", predicted.toFixed(2), "₺");
        }, 15000);
    }
};

FinanceEngine.init();
