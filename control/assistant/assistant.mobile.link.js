// InflowAI - Device Link System
// Cihazların kontrol merkezine bağlanmasını ve durum takibini yönetir.

(function (global) {
  "use strict";

  const Memory = global.InflowAssistantMemory;
  const DEVICE_PING_INTERVAL = 5000; // 5 saniyede bir kontrol
  const EVENT_KEY = "inflowai_device_event";

  const DeviceLink = {
    // Cihaz bağlandığında çağrılır
    connect(deviceId) {
      Memory.updateDeviceStatus(deviceId, "online");

      this.dispatch({
        deviceId,
        status: "online",
        timestamp: Date.now(),
      });

      console.log(`[InflowAI] ${deviceId} bağlandı.`);
    },

    // Cihaz koptuğunda çağrılır
    disconnect(deviceId) {
      Memory.updateDeviceStatus(deviceId, "offline");

      this.dispatch({
        deviceId,
        status: "offline",
        timestamp: Date.now(),
      });

      console.log(`[InflowAI] ${deviceId} bağlantısı kesildi.`);
    },

    // Cihazların durumunu ping ile yeniler
    startAutoPing() {
      setInterval(() => {
        const state = Memory.getState();
        Object.keys(state.devices).forEach((deviceId) => {
          const device = state.devices[deviceId];

          // 20 saniyeden uzun süredir görünmüyorsa offline yap
          if (device.lastSeen) {
            const diff = Date.now() - new Date(device.lastSeen).getTime();
            if (diff > 20000 && device.status !== "offline") {
              this.disconnect(deviceId);
            }
          }
        });
      }, DEVICE_PING_INTERVAL);
    },

    // Diğer modüllere haber yay
    dispatch(event) {
      window.dispatchEvent(
        new CustomEvent(EVENT_KEY, { detail: event })
      );
    },

    // ORTAK paneli bu olayları dinler
    onUpdate(callback) {
      window.addEventListener(EVENT_KEY, (e) => callback(e.detail));
    },
  };

  // Global export
  global.InflowDeviceLink = DeviceLink;

  DeviceLink.startAutoPing();

  console.info("[InflowAI] Device Link System Çalışıyor...");
})(window);
