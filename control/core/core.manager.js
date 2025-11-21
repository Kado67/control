// ===============================
//  InflowAI - CORE MANAGER
// ===============================

document.addEventListener("coreUpdated", () => {
    updateDashboard();
    updateOrtak();
});

function updateDashboard() {
    // Genel bakış kartları
    setText("ai-score", CoreState.aiScore);
    setText("server-load", CoreState.serverLoad + "%");
    setText("active-users", CoreState.activeUsers);
    setText("growth-rate", CoreState.growthRate + "%");
}

function updateOrtak() {
    setText("ortak-active", CoreState.activeUsers);
    setText("ortak-growth", CoreState.growthRate + "%");
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}
