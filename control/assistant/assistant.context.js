/*
  ============================================================
  ORTAK – Bağlam Yöneticisi
  assistant.context.js
  ============================================================
*/

export const AssistantContext = {

    memory: {},

    set(key, value) {
        this.memory[key] = value;
    },

    get(key) {
        return this.memory[key] || null;
    },

    clear() {
        this.memory = {};
    }
};
