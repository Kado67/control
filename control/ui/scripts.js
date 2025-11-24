/* =========================
   InflowAI Kontrol Merkezi — ORTAK
   scripts.js
   ========================= */
(() => {
  "use strict";

  const API_BASE = "https://inflowai-api.onrender.com";

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  const ui = {
    apiDot: $("#api-dot"),
    apiText: $("#api-text"),
    btnRefresh: $("#btn-refresh"),

    ortakMode: $("#ortak-mode"),
    ortakSummary: $("#ortak-summary"),
    ortakMood: $("#ortak-mood"),
    ortakHealth: $("#ortak-health"),
    ortakUpdated: $("#ortak-updated"),
    ortakActions: $("#ortak-actions"),
    ortakHint: $("#ortak-hint"),

    embeddedList: $("#embedded-list"),
    suggestedList: $("#suggested-list"),
    embeddedCount: $("#embedded-count"),
    suggestedCount: $("#suggested-count"),

    logList: $("#log-list"),
    logCount: $("#log-count"),

    toast: $("#toast"),
    toastInner: $("#toast-inner")
  };

  const state = {
    embeddedFeatures: [
      { id:"free_pack", title:"Ücretsiz Paket", desc:"Şu an yayında olan paket.", locked:true },
      { id:"premium_pack", title:"Premium Paket", desc:"Kontrol merkezinden aç/kapat.", locked:false },
      { id:"b2b_pack", title:"B2B Paket", desc:"Kurumsal iş ortaklığı paketi.", locked:false },
      { id:"corporate_pack", title:"Kurumsal Paket", desc:"Büyük şirketler için.", locked:false },

      { id:"adsense_slot_1", title:"AdSense Reklam Alanı #1", desc:"Reklam yerleşimi aç/kapat." },
      { id:"adsense_slot_2", title:"AdSense Reklam Alanı #2", desc:"Ek reklam alanı." },

      { id:"smart_search", title:"Akıllı Arama", desc:"İçeriklerde hızlı arama." },
      { id:"auto_tags", title:"Oto Etiketleme", desc:"İçeriklere otomatik etiket." },
      { id:"live_feed", title:"Canlı Akış", desc:"Ziyaretçi ile etkileşim akışı." },
    ],
    suggestedFeatures: [],
    toggles: loadToggles(),
    logs: []
  };

  document.addEventListener("DOMContentLoaded", init);

  function init(){
    on(ui.btnRefresh, "click", () => {
      pullAll(true);
    });

    pullAll(true);
    setInterval(() => pullAll(false), 8000);
  }

  /* ---------- API PULL ---------- */
  async function pullAll(forceLog){
    const apiOk = await pingApi();
    if(!apiOk){
      renderApi(false);
      if(forceLog) addLog("API’ye ulaşılamadı. Render/Network kontrol et.");
      return;
    }

    renderApi(true);

    await Promise.all([
      pullSummary(),
      pullFeatures()
    ]);

    renderAll();
    if(forceLog) toast("Veriler güncellendi.");
  }

  async function pingApi(){
    try{
      const r = await fetch(`${API_BASE}/api/status`, { cache:"no-store" });
      return r.ok;
    }catch(e){
      return false;
    }
  }

  async function pullSummary(){
    try{
      const r = await fetch(`${API_BASE}/api/ortak/summary`, { cache:"no-store" });
      const j = await r.json();
      const data = j.data || {};

      ui.ortakSummary.textContent = data.summary || "Ortak özet üretiyor...";
      ui.ortakMood.textContent = data.mood || "—";
      ui.ortakHealth.textContent = data.healthScore ?? "—";
      ui.ortakHint.textContent = data.mainActionHint || "";
      ui.ortakUpdated.textContent = new Date().toLocaleTimeString("tr-TR");
      ui.ortakMode.textContent = "AKTİF";

      // öneriler listesi
      const actions = Array.isArray(data.allActions) ? data.allActions : [];
      ui.ortakActions.innerHTML = actions.map(a => `<li>${escapeHtml(a)}</li>`).join("") || `<li>Ortak öneri hazırlıyor...</li>`;

      // suggestedFeatures için ham önerileri kullan
      state.suggestedFeatures = actions.map((a, i) => ({
        id: `ortak_${i}_${hash(a)}`,
        title: a,
        desc: "Ortak tarafından önerildi."
      }));
    }catch(e){
      addLog("Ortak özeti çekilemedi.");
    }
  }

  async function pullFeatures(){
    // API'de featureConfig var ama UI’da sadece Ortak önerileri + gömülü listeyi kullanıyoruz.
    try{
      await fetch(`${API_BASE}/api/ortak/features`, { cache:"no-store" });
    }catch(e){
      /* önemli değil */
    }
  }

  /* ---------- RENDER ---------- */
  function renderAll(){
    renderEmbedded();
    renderSuggested();
    renderLogs();
  }

  function renderApi(ok){
    if(!ui.apiDot || !ui.apiText) return;
    if(ok){
      ui.apiDot.style.background = "#22c55e";
      ui.apiDot.style.boxShadow = "0 0 10px rgba(34,197,94,.9)";
      ui.apiText.textContent = "API bağlantısı aktif";
      ui.apiText.parentElement.style.background = "rgba(34,197,94,.10)";
      ui.apiText.parentElement.style.borderColor = "rgba(34,197,94,.38)";
      ui.apiText.parentElement.style.color = "#c9f7db";
    }else{
      ui.apiDot.style.background = "#ef4444";
      ui.apiDot.style.boxShadow = "0 0 10px rgba(239,68,68,.9)";
      ui.apiText.textContent = "API bağlantısı yok";
      ui.apiText.parentElement.style.background = "rgba(239,68,68,.08)";
      ui.apiText.parentElement.style.borderColor = "rgba(239,68,68,.25)";
      ui.apiText.parentElement.style.color = "#ffd8d8";
      ui.ortakMode.textContent = "BAĞLANTI YOK";
    }
  }

  function renderEmbedded(){
    const list = ui.embeddedList;
    if(!list) return;

    list.innerHTML = "";
    state.embeddedFeatures.forEach(f => {
      const enabled = !!state.toggles[f.id];
      list.appendChild(makeToggleRow(f, enabled, (val) => {
        if(f.locked) return; // ücretsiz paket kilit
        setToggle(f.id, val);
        addLog(`${f.title} ${val ? "AÇILDI" : "KAPANDI"}.`);
        toast(`${f.title} ${val ? "açıldı" : "kapandı"}`);
      }, f.locked));
    });

    ui.embeddedCount.textContent = `${state.embeddedFeatures.length} özellik`;
  }

  function renderSuggested(){
    const list = ui.suggestedList;
    if(!list) return;

    list.innerHTML = "";
    const unique = dedupeById(state.suggestedFeatures);

    unique.forEach(f => {
      const enabled = !!state.toggles[f.id];
      list.appendChild(makeToggleRow(f, enabled, (val) => {
        setToggle(f.id, val);
        addLog(`Ortak özelliği: "${f.title}" ${val ? "AÇILDI" : "KAPANDI"}.`);
        toast(`Ortak özelliği ${val ? "açıldı" : "kapandı"}`);
      }));
    });

    ui.suggestedCount.textContent = `${unique.length} özellik`;
  }

  function makeToggleRow(feature, enabled, onChange, locked=false){
    const row = document.createElement("div");
    row.className = "toggle-item";

    row.innerHTML = `
      <div class="toggle-info">
        <div class="toggle-title">${escapeHtml(feature.title)}</div>
        <div class="toggle-desc">${escapeHtml(feature.desc || "")}</div>
      </div>
      <label class="switch">
        <input type="checkbox" ${enabled ? "checked":""} ${locked ? "disabled":""}>
        <span class="slider"></span>
      </label>
    `;

    const input = $("input", row);
    on(input, "change", () => onChange(!!input.checked));
    return row;
  }

  /* ---------- TOGGLES PERSIST ---------- */
  function loadToggles(){
    try{
      return JSON.parse(localStorage.getItem("inflow_toggles") || "{}");
    }catch(e){
      return {};
    }
  }
  function saveToggles(){
    localStorage.setItem("inflow_toggles", JSON.stringify(state.toggles));
  }
  function setToggle(id, val){
    state.toggles[id] = !!val;
    saveToggles();
  }

  /* ---------- LOGS ---------- */
  function addLog(msg){
    state.logs.unshift({
      t: new Date().toLocaleTimeString("tr-TR", {hour:"2-digit", minute:"2-digit", second:"2-digit"}),
      m: msg
    });
    if(state.logs.length > 60) state.logs.pop();
    renderLogs();
  }

  function renderLogs(){
    const ul = ui.logList;
    if(!ul) return;
    ul.innerHTML = state.logs.map(l => `
      <li class="log-item">
        <div class="log-time">${l.t}</div>
        <div class="log-text">${escapeHtml(l.m)}</div>
      </li>
    `).join("");
    ui.logCount.textContent = `${state.logs.length} kayıt`;
  }

  /* ---------- TOAST ---------- */
  function toast(msg){
    if(!ui.toast || !ui.toastInner) return;
    ui.toastInner.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>ui.toast.classList.remove("show"), 1500);
  }

  /* ---------- helpers ---------- */
  function on(el, ev, fn){ el && el.addEventListener(ev, fn); }
  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function dedupeById(arr){
    const seen = new Set(); const out=[];
    for(const a of arr){
      if(seen.has(a.id)) continue;
      seen.add(a.id); out.push(a);
    }
    return out;
  }
  function hash(str){
    let h=0; for(let i=0;i<str.length;i++) h=(h<<5)-h+str.charCodeAt(i)|0;
    return Math.abs(h);
  }

})();
