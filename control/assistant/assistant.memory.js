// InflowAI Assistant Memory
// Kullanıcı tercihleri, premium durumu, B2B modu ve cihaz bilgileri

(function (global) {
  "use strict";

  const STORAGE_KEY = "inflowai_assistant_memory_v1";

  const defaultState = {
    listening: true, // Dinleme: Açık / Kapalı
    premium: false,
    b2bMode: false,
    devices: {
      phone: {
        id: "phone",
        name: "Telefon",
        status: "offline", // online | offline
        lastSeen: null,
      },
      desktop: {
        id: "desktop",
        name: "Bilgisayar",
        status: "offline",
        lastSeen: null,
      },
      car: {
        id: "car",
        name: "Araba",
        status: "offline",
        lastSeen: null,
      },
    },
    lastSync: null,
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultState };

      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        devices: {
          ...defaultState.devices,
          ...(parsed.devices || {}),
        },
      };
    } catch (err) {
      console.warn("[InflowAI] Assistant memory load error:", err);
      return { ...defaultState };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[InflowAI] Assistant memory save error:", err);
    }
  }

  let state = loadState();

  const api = {
    // Mevcut hafızayı oku
    getState() {
      return JSON.parse(JSON.stringify(state));
    },

    // Dinleme anahtarı
    toggleListening() {
      state.listening = !state.listening;
      state.lastSync = new Date().toISOString();
      saveState(state);
      return state.listening;
    },

    setListening(value) {
      state.listening = !!value;
      state.lastSync = new Date().toISOString();
      saveState(state);
      return state.listening;
    },

    // Premium / B2B modları
    setPremium(value) {
      state.premium = !!value;
      state.lastSync = new Date().toISOString();
      saveState(state);
      return state.premium;
    },

    setB2BMode(value) {
      state.b2bMode = !!value;
      state.lastSync = new Date().toISOString();
      saveState(state);
      return state.b2bMode;
    },

    // Cihaz yönetimi (Telefon, Bilgisayar, Araba)
    updateDeviceStatus(deviceId, status) {
      if (!state.devices[deviceId]) return;

      state.devices[deviceId].status = status;
      state.devices[deviceId].lastSeen = new Date().toISOString();
      state.lastSync = state.devices[deviceId].lastSeen;
      saveState(state);
    },

    // Tüm cihazları tek seferde güncelle
    setDevices(devices) {
      Object.keys(devices || {}).forEach((id) => {
        if (!state.devices[id]) return;
        const d = devices[id];
        state.devices[id] = {
          ...state.devices[id],
          ...d,
          lastSeen: d.lastSeen || new Date().toISOString(),
        };
      });
      state.lastSync = new Date().toISOString();
      saveState(state);
    },

    // Hafızayı sıfırla (acil durum)
    reset() {
      state = { ...defaultState };
      saveState(state);
      return api.getState();
    },
  };

  // Global export
  global.InflowAssistantMemory = api;

  console.info("[InflowAI] Assistant Memory Yüklendi.");
})(window);
