// ===============================
//  InflowAI - CORE LOADER
// ===============================

const InflowCore = {
    version: "1.0.0",
    apiBase: "https://inflow-ai-vmat.vercel.app",

    load() {
        console.log("InflowCore Loader: Başlatılıyor...");

        // Çekirdek modülleri yükle
        this.loadModules([
            "core.state.js",
            "core.realtime.js",
            "core.manager.js"
        ]);
    },

    loadModules(modules) {
        modules.forEach(file => {
            const script = document.createElement("script");
            script.src = file;
            script.defer = true;
            document.head.appendChild(script);

            console.log("Modül yüklendi:", file);
        });
    }
};

InflowCore.load();
