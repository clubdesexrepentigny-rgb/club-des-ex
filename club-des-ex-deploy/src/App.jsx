import React, { useState, useEffect } from "react";

// ─── DATA DEFINITIONS ────────────────────────────────────────────────────────

const PETITES_BIERES = [
  "Petite Coors Original","Petite Coors","Petite Bud Light","Petite Bleue","Petite Budweiser",
  "Petite Export","Petite Labatt 50","Petite Molson Dry","Petite Molson Ultra"
];
const GROSSES_BIERES = [
  "Grosse Coors","Grosse Bud Light","Grosse Budweiser","Grosse Export",
  "Grosse Labatt 50","Grosse Molson Dry"
];
const AUTRES_BIERES = [
  "Corona","Corona 0 alcool","Heineken","Heineken Silver","IPA","Rev",
  "Rousse","Seltzer","Smirnoff Ice","Vizzy"
];
const AUTRES_BOISSONS = [
  "Red Bull","Bout. d'eau","Perrier","Café","7 Up","Coke","Ginger Ale",
  "Pepsi","Pepsi Diet","Tonic","Soda","Virgin Caesar","Jus (toutes sortes)"
];
const NOURRITURE = [
  "Ailes de poulet","Frites","Pizza Petite","Pizza Grosse",
  "Poulet Lanière","Pogo","Chips"
];

const BUG_ITEMS = [
  { id:"bug1", label:"#1 Fort rég",  oz:1    },
  { id:"bug2", label:"#2 Fort rég",  oz:1    },
  { id:"bug3", label:"#3 Prémium",   oz:1    },
  { id:"bug4", label:"#4 De Luxe",   oz:1    },
  { id:"bug5", label:"#5 Vermouth",  oz:1    },
  { id:"bug6", label:"#6 Liq. Fine", oz:1    },
  { id:"bug7", label:"#7 Shooter",   oz:0.75 },
  { id:"bug8", label:"#8 1/2 rég#1", oz:0.5  },
  { id:"bug9", label:"#9 1/2 rég#2", oz:0.5  },
];

const VIN_ITEMS = [
  { id:"moma_rouge",    label:"Moma Rouge",      type:"bouteille" },
  { id:"moma_blanc",    label:"Moma Blanc",       type:"bouteille" },
  { id:"chianti",       label:"Chianti Bout.",     type:"bouteille" },
  { id:"voga_blanc",    label:"Voga Blanc Bout.",  type:"bouteille" },
  { id:"vinier_blanc1", label:"Vinier Blanc Cliff 79 #1", type:"vinier", grPerVerre:250, poidsFull:3150 },
  { id:"vinier_blanc2", label:"Vinier Blanc Cliff 79 #2", type:"vinier", grPerVerre:250, poidsFull:3150 },
  { id:"vinier_rouge1", label:"Vinier Rouge #1",           type:"vinier", grPerVerre:250, poidsFull:3150 },
  { id:"vinier_rouge2", label:"Vinier Rouge #2",           type:"vinier", grPerVerre:250, poidsFull:3150 },
  { id:"vinier_bistro1",label:"Vinier Blanc Bistro #1",    type:"vinier", grPerVerre:250, poidsFull:4150 },
  { id:"vinier_bistro2",label:"Vinier Blanc Bistro #2",    type:"vinier", grPerVerre:250, poidsFull:4150 },
  { id:"rhum_bumbu",    label:"Rhum Bumbu",        type:"bouteille" },
];

const ALL_REGULAR_ITEMS = [
  ...PETITES_BIERES, ...GROSSES_BIERES, ...AUTRES_BIERES,
  ...AUTRES_BOISSONS, ...NOURRITURE
];

const TODAY = () => new Date().toISOString().slice(0,10);

// Previous calendar date helper
const prevDate = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0,10);
};

// ─── STORAGE ─────────────────────────────────────────────────────────────────

const load = (key, def) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
};
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ─── INITIAL STATE ────────────────────────────────────────────────────────────

const VINIER_MIN  = 250;  // seuil bas — en dessous = à remplacer
const vinierFull = (id) => VIN_ITEMS.find(v => v.id === id)?.poidsFull ?? 3150;

const emptyDaySheet = (date) => ({
  date,
  nomAM:"", nomPM:"",
  regular: Object.fromEntries(ALL_REGULAR_ITEMS.map(n => [n, {am:"",pm:"",total:0}])),
  bugs: Object.fromEntries(BUG_ITEMS.map(b => [b.id, {
    debutAM:"", finAM:"", venteAM:0,
    debutPM:"", finPM:"", ventePM:0,
  }])),
  vins: Object.fromEntries(VIN_ITEMS.map(v => [v.id, {
    debutAM:"", finAM:"", venteAM:0,
    debutPM:"", finPM:"", ventePM:0,
    remplacements: [],
  }])),
  bouteilleDebut:"", bouteilleFin:"",
  commentaire:"",
  // Happy Hour 5-7 : nombre de bières vendues à -1$ (petites + grosses confondues)
  happyHour: { AM:"", PM:"" },
  // Plateaux de shooters : 1 plateau = 10 shooters, -10$ par plateau
  plateauxShooter: { AM:"", PM:"" },
  // Cocktails — dynamic, keyed by cocktail id
  cocktails: {},
  // Caisse — one entry per shift
  caisse: {
    AM: {
      argentRecu:     "",
      machinesSous:   "",
      argentCoffre:   "",
      coupons:        "",
      factures:       "",   // barmaid entre (frais/factures à déduire)
      venteCalculee:  0,
      totalCaisse:    0,
      soumisePar:     "",
      soumiseTs:      "",
      note:           "",
    },
    PM: {
      argentRecu:     "",
      machinesSous:   "",
      argentCoffre:   "",
      coupons:        "",
      factures:       "",
      venteCalculee:  0,
      totalCaisse:    0,
      soumisePar:     "",
      soumiseTs:      "",
      note:           "",
    },
  },
});

const emptyInventory = () => ({
  regular: Object.fromEntries(ALL_REGULAR_ITEMS.map(n => [n, 0])),
  bugs: Object.fromEntries(BUG_ITEMS.map(b => [b.id, 0])),
  vins: Object.fromEntries(VIN_ITEMS.map(v => [v.id, 0])),
  lastUpdated: null,
});

// Migrate old inventory keys when loading
const migrateInventory = (inv) => {
  if (!inv) return emptyInventory();
  const splits = {
    "Bout. d'eau/Perrier": ["Bout. d'eau", "Perrier"],
    "Pepsi/Pepsi Diet":    ["Pepsi", "Pepsi Diet"],
    "Tonic/Soda":          ["Tonic", "Soda"],
  };
  const reg = { ...inv.regular };
  Object.entries(splits).forEach(([oldKey, newKeys]) => {
    if (reg[oldKey] !== undefined) {
      newKeys.forEach(nk => { if (reg[nk] === undefined) reg[nk] = reg[oldKey]; });
      delete reg[oldKey];
    }
  });
  // Ensure all new items exist
  ALL_REGULAR_ITEMS.forEach(n => { if (reg[n] === undefined) reg[n] = 0; });
  return { ...inv, regular: reg };
};

// ─── EXTRACT "FINS PM" from a day sheet (used as reference for next day AM) ──

const extractFinsPM = (sheet) => {
  if (!sheet) return null;
  const bugs = {};
  BUG_ITEMS.forEach(b => {
    const v = sheet.bugs?.[b.id]?.finPM;
    if (v !== "" && v !== undefined) bugs[b.id] = v;
  });
  const vins = {};
  VIN_ITEMS.forEach(v => {
    const val = sheet.vins?.[v.id]?.finPM;
    if (val !== "" && val !== undefined) vins[v.id] = val;
  });
  return { bugs, vins, date: sheet.date };
};

// ─── MIGRATION ───────────────────────────────────────────────────────────────
// Patches a sheet loaded from localStorage to add any missing items
// (e.g. new viniers added after the sheet was first saved)

const migrateSheet = (sheet) => {
  if (!sheet) return sheet;
  const s = JSON.parse(JSON.stringify(sheet)); // deep clone
  BUG_ITEMS.forEach(b => {
    if (!s.bugs[b.id]) s.bugs[b.id] = { debutAM:"", finAM:"", venteAM:0, debutPM:"", finPM:"", ventePM:0 };
  });
  VIN_ITEMS.forEach(v => {
    if (!s.vins[v.id]) s.vins[v.id] = { debutAM:"", finAM:"", venteAM:0, debutPM:"", finPM:"", ventePM:0, remplacements:[] };
    if (!s.vins[v.id].remplacements) s.vins[v.id].remplacements = [];
  });
  ALL_REGULAR_ITEMS.forEach(n => {
    if (!s.regular[n]) s.regular[n] = { am:"", pm:"", total:0 };
  });
  // Migrate old combined keys → split keys
  const splits = {
    "Bout. d'eau/Perrier": ["Bout. d'eau", "Perrier"],
    "Pepsi/Pepsi Diet":    ["Pepsi", "Pepsi Diet"],
    "Tonic/Soda":          ["Tonic", "Soda"],
  };
  Object.entries(splits).forEach(([oldKey, newKeys]) => {
    if (s.regular[oldKey]) {
      const old = s.regular[oldKey];
      newKeys.forEach(nk => {
        if (!s.regular[nk] || (s.regular[nk].am===""&&s.regular[nk].pm===""&&s.regular[nk].total===0)) {
          s.regular[nk] = { ...old };
        }
      });
      delete s.regular[oldKey];
    }
  });
  if (!s.happyHour) s.happyHour = { AM:"", PM:"" };
  if (!s.plateauxShooter) s.plateauxShooter = { AM:"", PM:"" };
  if (!s.cocktails) s.cocktails = {};
  if (!s.customProducts) s.customProducts = {};
  const emptyCaisseDay = {
    argentRecu:"", machinesSous:"", argentCoffre:"", coupons:"", factures:"",
    venteCalculee:0, totalCaisse:0, soumisePar:"", soumiseTs:"", note:"",
  };
  if (!s.caisse) s.caisse = { AM:{...emptyCaisseDay}, PM:{...emptyCaisseDay} };
  ["AM","PM"].forEach(sh => {
    if (!s.caisse[sh]) s.caisse[sh] = {...emptyCaisseDay};
    Object.keys(emptyCaisseDay).forEach(k => {
      if (s.caisse[sh][k] === undefined) s.caisse[sh][k] = emptyCaisseDay[k];
    });
  });
  return s;
};

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/**
 * Check continuity WITHIN the day (finAM vs debutPM)
 * AND vs previous day (prevFinsPM vs debutAM).
 * Returns array of anomaly objects.
 */
const checkAllContinuity = (sheet, prevFinsPM) => {
  const issues = [];
  const ts = new Date().toLocaleTimeString("fr-CA");

  // ── Within-day: finAM vs debutPM ──
  BUG_ITEMS.forEach(bug => {
    const d = sheet.bugs?.[bug.id];
    if (!d) return;
    const finAM   = d.finAM   !== "" ? parseFloat(d.finAM)   : null;
    const debutPM = d.debutPM !== "" ? parseFloat(d.debutPM) : null;
    if (finAM !== null && debutPM !== null && debutPM !== finAM) {
      issues.push({ ts, scope:"MÊME JOURNÉE", item:bug.label,
        detail:`Fin AM=${finAM} ≠ Début PM=${debutPM}` });
    }
  });
  VIN_ITEMS.forEach(vin => {
    const d = sheet.vins?.[vin.id];
    if (!d) return;
    const finAM   = d.finAM   !== "" ? parseFloat(d.finAM)   : null;
    const debutPM = d.debutPM !== "" ? parseFloat(d.debutPM) : null;
    if (finAM !== null && debutPM !== null && debutPM !== finAM) {
      issues.push({ ts, scope:"MÊME JOURNÉE", item:vin.label,
        detail:`Fin AM=${finAM} ≠ Début PM=${debutPM}` });
    }
  });

  // ── Cross-day: prevFinsPM vs debutAM ──
  if (prevFinsPM) {
    BUG_ITEMS.forEach(bug => {
      const prevFin = prevFinsPM.bugs?.[bug.id];
      const debutAM = sheet.bugs?.[bug.id]?.debutAM;
      if (prevFin !== undefined && prevFin !== "" &&
          debutAM !== undefined && debutAM !== "") {
        if (parseFloat(debutAM) !== parseFloat(prevFin)) {
          issues.push({ ts, scope:"INTER-JOURNÉES", item:bug.label,
            detail:`Fin PM veille (${prevFinsPM.date})=${prevFin} ≠ Début AM aujourd'hui=${debutAM}` });
        }
      }
    });
    VIN_ITEMS.forEach(vin => {
      const prevFin = prevFinsPM.vins?.[vin.id];
      const debutAM = sheet.vins?.[vin.id]?.debutAM;
      if (prevFin !== undefined && prevFin !== "" &&
          debutAM !== undefined && debutAM !== "") {
        if (parseFloat(debutAM) !== parseFloat(prevFin)) {
          issues.push({ ts, scope:"INTER-JOURNÉES", item:vin.label,
            detail:`Fin PM veille (${prevFinsPM.date})=${prevFin} ≠ Début AM aujourd'hui=${debutAM}` });
        }
      }
    });
  }

  return issues;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --bg:#0f0f12;--surface:#18181f;--card:#1e1e28;--border:#2a2a38;
    --accent:#e8a020;--green:#22c55e;--red:#ef4444;--orange:#f97316;
    --blue:#3b82f6;--text:#e8e8f0;--muted:#6b6b80;
    --font-head:'Bebas Neue',sans-serif;--font:'DM Sans',sans-serif;
  }
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;}
  h1,h2,h3{font-family:var(--font-head);letter-spacing:.04em;}
  .app{display:flex;flex-direction:column;min-height:100vh;}

  .topbar{background:var(--surface);border-bottom:2px solid var(--accent);
    padding:12px 20px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:100;}
  .topbar h1{font-size:1.3rem;color:var(--accent);flex:1;}
  .topbar .date{color:var(--muted);font-size:.8rem;}

  .nav{display:flex;gap:4px;background:var(--surface);padding:8px 20px;
    border-bottom:1px solid var(--border);flex-wrap:wrap;}
  .nav button{padding:7px 15px;border:1px solid var(--border);background:transparent;
    color:var(--muted);border-radius:6px;cursor:pointer;font-family:var(--font);
    font-size:.82rem;font-weight:500;transition:all .15s;position:relative;}
  .nav button.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:700;}
  .nav button:hover:not(.active){background:var(--card);color:var(--text);}
  .nav-badge{position:absolute;top:-5px;right:-5px;background:var(--red);color:#fff;
    border-radius:99px;font-size:.6rem;font-weight:700;padding:1px 5px;min-width:16px;text-align:center;}

  .main{flex:1;padding:20px;max-width:1100px;margin:0 auto;width:100%;}

  .card{background:var(--card);border:1px solid var(--border);border-radius:10px;
    margin-bottom:14px;overflow:hidden;}
  .card-header{background:var(--surface);padding:9px 16px;display:flex;
    align-items:center;gap:10px;border-bottom:1px solid var(--border);}
  .card-header h3{color:var(--accent);font-family:var(--font-head);letter-spacing:.06em;font-size:1.05rem;}
  .card-body{padding:12px 16px;}

  table{width:100%;border-collapse:collapse;font-size:.82rem;}
  th{background:var(--surface);color:var(--muted);font-weight:600;font-size:.72rem;
    text-transform:uppercase;letter-spacing:.05em;padding:6px 8px;
    border-bottom:1px solid var(--border);text-align:left;}
  td{padding:4px 6px;border-bottom:1px solid var(--border);}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:rgba(232,160,32,.04);}
  .item-name{font-weight:500;}
  .total-cell{font-weight:700;color:var(--accent);text-align:center;}

  input[type=number],input[type=text],textarea{
    background:var(--surface);border:1px solid var(--border);color:var(--text);
    border-radius:5px;padding:5px 8px;font-family:var(--font);font-size:.82rem;
    width:100%;transition:border .15s;}
  input:focus,textarea:focus{outline:none;border-color:var(--accent);}
  input[type=number]{text-align:center;}
  input.locked{background:#0d0d10;color:var(--muted);cursor:not-allowed;border-style:dashed;opacity:.7;}
  input.error{border-color:var(--red)!important;background:rgba(239,68,68,.1)!important;color:#fca5a5!important;}

  .badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.7rem;font-weight:600;}
  .badge-am{background:rgba(59,130,246,.2);color:#93c5fd;}
  .badge-pm{background:rgba(234,179,8,.2);color:#fde68a;}
  .badge-total{background:rgba(232,160,32,.2);color:var(--accent);}

  .btn{padding:8px 18px;border:none;border-radius:6px;cursor:pointer;
    font-family:var(--font);font-weight:600;font-size:.84rem;transition:all .15s;}
  .btn-accent{background:var(--accent);color:#000;}
  .btn-accent:hover{background:#f0b030;}
  .btn-green{background:var(--green);color:#000;}
  .btn-green:hover{filter:brightness(1.1);}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted);}
  .btn-ghost:hover{border-color:var(--accent);color:var(--accent);}
  .btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center;}

  .bug-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:10px;}
  .bug-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;transition:border .2s;}
  .bug-card.err-intra{border-color:var(--red);}
  .bug-card.err-inter{border-color:var(--orange);}
  .bug-label{font-weight:600;color:var(--accent);margin-bottom:8px;font-size:.87rem;
    display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
  .bug-row{display:flex;gap:6px;align-items:center;margin-bottom:4px;}
  .bug-row label{color:var(--muted);font-size:.72rem;width:66px;flex-shrink:0;}
  .bug-vente{display:flex;align-items:center;gap:6px;margin-top:5px;padding-top:5px;
    border-top:1px solid var(--border);}
  .vente-num{color:var(--green);font-weight:700;font-size:.95rem;min-width:24px;text-align:center;}

  .err-intra-tag{color:var(--red);font-size:.68rem;font-weight:700;}
  .err-inter-tag{color:var(--orange);font-size:.68rem;font-weight:700;}

  .vinier-low-banner{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.6);
    border-radius:6px;padding:6px 10px;margin-top:6px;display:flex;
    align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
  .vinier-low-txt{color:var(--red);font-size:.77rem;font-weight:600;}
  .btn-replace{padding:5px 12px;background:var(--accent);color:#000;border:none;
    border-radius:5px;font-family:var(--font);font-weight:700;font-size:.76rem;
    cursor:pointer;white-space:nowrap;}
  .btn-replace:hover{background:#f0b030;}
  .vinier-replaced{background:rgba(34,197,94,.1);border:1px solid var(--green);
    border-radius:6px;padding:4px 10px;margin-top:4px;font-size:.73rem;color:var(--green);}
  .repl-log{margin-top:8px;border-top:1px solid var(--border);padding-top:6px;}
  .repl-log-row{font-size:.71rem;color:var(--muted);padding:1px 0;}

  /* ANALYTICS */
  .period-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;}
  .period-btn{padding:5px 14px;border-radius:99px;border:1px solid var(--border);
    background:transparent;color:var(--muted);cursor:pointer;font-family:var(--font);
    font-size:.78rem;font-weight:600;transition:all .15s;}
  .period-btn.active{background:var(--accent);color:#000;border-color:var(--accent);}
  .period-btn:hover:not(.active){border-color:var(--accent);color:var(--accent);}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px;}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;
    padding:12px 14px;text-align:center;}
  .stat-num{font-family:var(--font-head);font-size:1.8rem;color:var(--accent);letter-spacing:.04em;}
  .stat-lbl{font-size:.72rem;color:var(--muted);margin-top:2px;}
  .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:7px;}
  .bar-label{font-size:.78rem;color:var(--text);width:160px;flex-shrink:0;text-align:right;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .bar-track{flex:1;background:var(--surface);border-radius:99px;height:18px;overflow:hidden;position:relative;}
  .bar-fill{height:100%;border-radius:99px;transition:width .4s ease;min-width:2px;}
  .bar-val{position:absolute;right:6px;top:50%;transform:translateY(-50%);
    font-size:.7rem;font-weight:700;color:#000;}
  .bar-val-out{font-size:.75rem;font-weight:700;color:var(--text);margin-left:6px;min-width:28px;}
  .trend-wrap{overflow-x:auto;padding-bottom:4px;}
  .trend-svg{display:block;}
  .cat-tab{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
  .cat-btn{padding:4px 12px;border-radius:5px;border:1px solid var(--border);
    background:transparent;color:var(--muted);cursor:pointer;font-family:var(--font);font-size:.76rem;}
  .cat-btn.active{background:var(--card);color:var(--text);border-color:var(--accent);}

  /* CALENDAR continued */
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
  .cal-head{text-align:center;font-size:.68rem;color:var(--muted);font-weight:600;
    padding:4px 0;text-transform:uppercase;letter-spacing:.04em;}
  .cal-day{border-radius:8px;padding:6px 4px;text-align:center;cursor:default;
    display:flex;flex-direction:column;align-items:center;gap:3px;
    border:1px solid transparent;transition:all .15s;min-height:42px;justify-content:center;}
  .cal-day.has-data{cursor:pointer;background:var(--surface);border-color:var(--border);}
  .cal-day.has-data:hover{border-color:var(--accent);background:rgba(232,160,32,.08);}
  .cal-day.is-today{border-color:var(--blue)!important;background:rgba(59,130,246,.1)!important;}
  .cal-day.is-selected{border-color:var(--accent)!important;background:rgba(232,160,32,.18)!important;}
  .cal-day.is-future{opacity:.3;}
  .cal-num{font-size:.82rem;font-weight:500;line-height:1;}
  .cal-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}
  .pin-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);
    z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;}
  .pin-modal{background:var(--card);border:2px solid var(--accent);border-radius:14px;
    padding:24px 20px;width:100%;max-width:300px;display:flex;flex-direction:column;
    align-items:center;gap:14px;}
  .pin-modal h3{font-family:var(--font-head);color:var(--accent);font-size:1.3rem;letter-spacing:.06em;text-align:center;}
  .pin-modal .sub{font-size:.78rem;color:var(--muted);text-align:center;}
  .pin-modal-display{background:var(--surface);border:1px solid var(--border);
    border-radius:8px;padding:10px 20px;font-size:1.3rem;letter-spacing:.3em;
    text-align:center;width:100%;min-height:46px;}
  .pin-modal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;}

  .error-banner{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.5);
    border-radius:8px;padding:10px 14px;margin-bottom:14px;}
  .error-banner .eb-title{color:var(--red);font-weight:700;font-size:.84rem;margin-bottom:6px;}
  .error-banner .eb-item{font-size:.79rem;padding:2px 0;color:#fca5a5;}
  .warn-banner{background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.5);
    border-radius:8px;padding:10px 14px;margin-bottom:14px;}
  .warn-banner .wb-title{color:var(--orange);font-weight:700;font-size:.84rem;margin-bottom:6px;}
  .warn-banner .wb-item{font-size:.79rem;padding:2px 0;color:#fed7aa;}

  .lock-info{display:flex;align-items:center;gap:4px;font-size:.7rem;
    color:var(--blue);background:rgba(59,130,246,.1);border-radius:4px;
    padding:2px 7px;margin-top:3px;}
  .lock-info-orange{display:flex;align-items:center;gap:4px;font-size:.7rem;
    color:var(--orange);background:rgba(249,115,22,.1);border-radius:4px;
    padding:2px 7px;margin-top:3px;}
  .err-msg{color:var(--red);font-size:.71rem;margin-top:2px;}
  .err-msg-orange{color:var(--orange);font-size:.71rem;margin-top:2px;}

  .inv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;}
  .inv-item{background:var(--surface);border:1px solid var(--border);
    border-radius:6px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;}
  .inv-item.low{border-color:var(--red);}

  .login{display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:100vh;gap:20px;padding:20px;}
  .login h1{font-family:var(--font-head);font-size:2.8rem;color:var(--accent);letter-spacing:.1em;}
  .role-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;max-width:480px;}
  .role-btn{background:var(--card);border:2px solid var(--border);color:var(--text);
    border-radius:12px;padding:26px 18px;cursor:pointer;text-align:center;
    font-family:var(--font);transition:all .2s;}
  .role-btn:hover{border-color:var(--accent);background:var(--surface);}
  .role-btn .icon{font-size:2rem;margin-bottom:8px;}
  .role-btn .role-name{font-family:var(--font-head);font-size:1.25rem;color:var(--accent);}
  .role-btn .role-desc{font-size:.74rem;color:var(--muted);margin-top:4px;}

  .pin-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:275px;}
  .pin-display{background:var(--card);border:1px solid var(--border);border-radius:8px;
    padding:12px 20px;font-size:1.4rem;letter-spacing:.3em;text-align:center;width:100%;min-height:50px;}
  .pin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;}
  .pin-key{background:var(--card);border:1px solid var(--border);border-radius:8px;
    padding:14px;font-size:1.1rem;font-weight:600;cursor:pointer;text-align:center;transition:all .1s;}
  .pin-key:hover{background:var(--accent);color:#000;border-color:var(--accent);}

  .shift-bar{padding:10px 20px;display:flex;gap:14px;align-items:center;
    flex-wrap:wrap;background:var(--surface);border-bottom:1px solid var(--border);}
  .shift-btn{padding:7px 20px;border-radius:6px;border:1px solid var(--border);
    background:transparent;color:var(--muted);cursor:pointer;font-family:var(--font);font-weight:600;font-size:.84rem;}
  .shift-btn.active-am{background:rgba(59,130,246,.3);color:#93c5fd;border-color:#3b82f6;}
  .shift-btn.active-pm{background:rgba(234,179,8,.25);color:#fde68a;border-color:#ca8a04;}

  .scope-inter{color:var(--orange);font-weight:700;}
  .scope-intra{color:var(--red);font-weight:700;}

  .toast{position:fixed;bottom:20px;right:20px;padding:10px 20px;
    border-radius:8px;font-weight:600;z-index:9999;animation:slideIn .3s ease;font-size:.87rem;}
  .toast-ok{background:var(--green);color:#000;}
  .toast-err{background:var(--red);color:#fff;}
  .toast-warn{background:var(--orange);color:#000;}
  @keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}

  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}

  @media(max-width:600px){
    .main{padding:10px;}
    .bug-grid{grid-template-columns:1fr;}
    .role-grid{grid-template-columns:1fr;}
    .topbar h1{font-size:1rem;}
  }
`;

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ msg, type="ok", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

// ─── PIN LOGIN ────────────────────────────────────────────────────────────────

// ─── EMPLOYEE ACCOUNT HELPERS ────────────────────────────────────────────────

const MANAGER_PIN_KEY = "manager_pin";
const EMPLOYEES_KEY   = "employees";
const DEPOT_KEY       = (date) => `depot_${date}`;
const NOTIFICATIONS_KEY = "notifications";

const defaultManagerPin = () => load(MANAGER_PIN_KEY, "1234");
const loadEmployees     = () => load(EMPLOYEES_KEY, []);
const saveEmployees     = (list) => save(EMPLOYEES_KEY, list);
const loadNotifications = () => load(NOTIFICATIONS_KEY, []);
const saveNotifications = (list) => save(NOTIFICATIONS_KEY, list);
const addNotification   = (msg, type="info") => {
  const notifs = loadNotifications();
  saveNotifications([{ id:Date.now().toString(), msg, type, ts: new Date().toLocaleString("fr-CA"), read:false }, ...notifs.slice(0,49)]);
};

// ROLES:
// "gerant"     — accès total
// "manageuse"  — dépôt + remplacement vinier + feuilles (gérant notifié des actions)
// "barmaid"    — feuilles de vente + caisse uniquement

const ROLE_LABELS = {
  gerant:    { label:"👑 Gérant",    color:"#e8a020", desc:"Accès total — tout modifier et tout voir" },
  manageuse: { label:"🔑 Manageuse", color:"#a855f7", desc:"Dépôt + remplacement vinier + feuilles" },
  barmaid:   { label:"🍺 Barmaid",   color:"#3b82f6", desc:"Feuilles de vente + caisse uniquement" },
};

// Permission helpers
const canAccessDepot     = (emp) => emp?.role === "gerant" || emp?.role === "manageuse";
const canReplaceVinier   = (emp) => emp?.role === "gerant" || emp?.role === "manageuse";
const canAccessManager   = (emp) => emp?.role === "gerant";
const isGerant           = (emp) => emp?.role === "gerant";

const emptyDepot = (date) => ({
  date, lotoQuebec:"", coffre:"", guichet:"", caisse:"", soumisTs:"", soumisePar:"",
});
const loadDepot  = (date) => load(DEPOT_KEY(date), emptyDepot(date));
const saveDepot  = (depot) => save(DEPOT_KEY(depot.date), depot);

// ─── PIN LOGIN ────────────────────────────────────────────────────────────────

function PinLogin({ title, subtitle, onSuccess, onBack, extraHint }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const press = (k) => {
    if (k === "DEL") { setPin(p => p.slice(0,-1)); setErr(false); return; }
    const np = pin + k;
    setPin(np);
    if (np.length === 4) {
      const ok = onSuccess(np); // returns true if correct
      if (!ok) { setErr(true); setTimeout(() => { setPin(""); setErr(false); }, 700); }
      else setPin("");
    }
  };

  return (
    <div className="login">
      <div className="pin-wrap">
        <div style={{color:"var(--muted)",fontSize:".88rem",textAlign:"center"}}>
          {title || "🔐 Code d'accès"}
        </div>
        {subtitle && <div style={{fontSize:".78rem",color:"var(--accent)",textAlign:"center"}}>{subtitle}</div>}
        <div className="pin-display" style={{color:err?"var(--red)":"var(--text)"}}>
          {pin.replace(/./g,"●") || "_ _ _ _"}
        </div>
        <div className="pin-grid">
          {["1","2","3","4","5","6","7","8","9","DEL","0","✓"].map(k => (
            <button key={k} className="pin-key"
              onClick={() => k !== "✓" ? press(k) : null}
              style={["DEL","✓"].includes(k)?{color:"var(--accent)"}:{}}>
              {k}
            </button>
          ))}
        </div>
        {extraHint && <div style={{fontSize:".72rem",color:"var(--muted)",textAlign:"center"}}>{extraHint}</div>}
        {onBack && <button className="btn btn-ghost" style={{width:"100%"}} onClick={onBack}>← Retour</button>}
      </div>
    </div>
  );
}

// ─── DÉPÔT PAGE ───────────────────────────────────────────────────────────────

function DepotPage({ onBack, sheet, setSheet, showToast }) {
  const today = TODAY();
  const [viewDate, setViewDate]   = useState(today);
  const [depot, setDepotState]    = useState(() => loadDepot(today));
  const [editMode, setEditMode]   = useState(false);
  // For past dates: require gérant PIN before editing
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput]   = useState("");
  const [pinErr, setPinErr]       = useState(false);

  const isPast     = viewDate < today;
  const isToday    = viewDate === today;
  const isSubmitted = !!depot.soumisTs;
  const isLocked   = isSubmitted && !editMode;
  // Past dates require gérant PIN to edit
  const canEdit    = isToday || pinUnlocked;

  const addDays = (ds, n) => {
    const d = new Date(ds+"T12:00:00"); d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  };

  const loadDate = (date) => {
    setViewDate(date);
    setDepotState(loadDepot(date));
    setEditMode(false);
    setPinUnlocked(date === today); // today doesn't need unlock
    setPinInput("");
    setPinErr(false);
  };

  const setF = (field, val) => setDepotState(d => ({ ...d, [field]: val }));

  const loto     = parseFloat(depot.lotoQuebec) || 0;
  const coffre   = parseFloat(depot.coffre)     || 0;
  const guichet  = parseFloat(depot.guichet)    || 0;
  const caisse   = parseFloat(depot.caisse)     || 0;
  const sumParts = Math.round((coffre + guichet + caisse) * 100) / 100;
  const balanced = loto > 0 && Math.abs(sumParts - loto) < 0.01;
  const hasError = loto > 0 && sumParts > 0 && !balanced;

  const handleSave = () => {
    if (hasError) { showToast("⛔ Le total Coffre + Guichet + Caisse doit égaler Loto-Québec", "err"); return; }
    const updated = {
      ...depot,
      soumisTs:   new Date().toLocaleString("fr-CA"),
      soumisePar: "Gérant",
    };
    saveDepot(updated);
    setDepotState(updated);
    // Only inject into sheet if editing today
    if (isToday && depot.caisse !== "") {
      setSheet(s => {
        const prices = loadPrices();
        const newCaisse = { ...s.caisse };
        newCaisse.AM = { ...newCaisse.AM, machinesSous: depot.caisse };
        const c = newCaisse.AM;
        const vente = calcVenteShift(s, "AM", prices);
        newCaisse.AM.venteCalculee = vente;
        newCaisse.AM.totalCaisse = Math.round((
          (parseFloat(c.argentRecu)||0) + (parseFloat(depot.caisse)||0) +
          (parseFloat(c.argentCoffre)||0) - (parseFloat(c.coupons)||0) -
          (parseFloat(c.factures)||0) + vente
        ) * 100) / 100;
        return { ...s, caisse: newCaisse };
      });
    }
    showToast(`✅ Dépôt du ${viewDate} sauvegardé`, "ok");
    setEditMode(false);
  };

  // PIN unlock for past dates
  const handlePinKey = (k) => {
    if (k === "DEL") { setPinInput(p => p.slice(0,-1)); setPinErr(false); return; }
    const np = pinInput + k;
    setPinInput(np);
    if (np.length === 4) {
      if (np === defaultManagerPin()) {
        setPinUnlocked(true); setPinInput(""); setPinErr(false);
        showToast("🔓 Accès autorisé — mode gérant", "ok");
      } else {
        setPinErr(true);
        setTimeout(() => { setPinInput(""); setPinErr(false); }, 700);
      }
    }
  };

  const monthNames = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const fmtDate = (ds) => {
    const d = new Date(ds+"T12:00:00");
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>LE CLUB DES EX</h1>
        <span className="date">📅 {viewDate}</span>
        <button className="btn btn-ghost" onClick={onBack}>← Retour</button>
      </div>

      <div className="main">

        {/* ── Date navigator ── */}
        <div className="card" style={{marginBottom:14}}>
          <div className="card-header">
            <button className="btn btn-ghost" style={{padding:"4px 12px"}}
              onClick={()=>loadDate(addDays(viewDate,-1))}>‹</button>
            <h3 style={{flex:1,textAlign:"center"}}>
              💰 Dépôt — {fmtDate(viewDate)}
              {isToday && <span style={{fontSize:".72rem",color:"var(--accent)",marginLeft:8}}>Aujourd'hui</span>}
              {isPast  && <span style={{fontSize:".72rem",color:"var(--muted)",marginLeft:8}}>Passé</span>}
            </h3>
            <button className="btn btn-ghost" style={{padding:"4px 12px"}}
              onClick={()=>loadDate(addDays(viewDate,1))}
              disabled={viewDate >= today}>›</button>
          </div>
          <div className="card-body" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <input type="date" value={viewDate} max={today} style={{width:160}}
              onChange={e=>loadDate(e.target.value)} />
            <button className="btn btn-ghost" style={{fontSize:".78rem",padding:"5px 12px"}}
              onClick={()=>loadDate(today)}>
              Aujourd'hui
            </button>
            {isSubmitted && (
              <span style={{background:"rgba(34,197,94,.12)",border:"1px solid var(--green)",
                borderRadius:6,padding:"3px 10px",fontSize:".74rem",color:"var(--green)",fontWeight:600}}>
                ✅ Soumis le {depot.soumisTs}
              </span>
            )}
            {!isSubmitted && (
              <span style={{background:"rgba(249,115,22,.1)",border:"1px solid var(--orange)",
                borderRadius:6,padding:"3px 10px",fontSize:".74rem",color:"var(--orange)",fontWeight:600}}>
                ⏳ Pas encore soumis
              </span>
            )}
          </div>
        </div>

        {/* ── PIN lock for past dates ── */}
        {isPast && !pinUnlocked && (
          <div className="card" style={{marginBottom:14}}>
            <div className="card-header"><h3>🔐 Code Gérant requis</h3></div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"20px 16px"}}>
              <div style={{fontSize:".82rem",color:"var(--muted)",textAlign:"center"}}>
                Entrez le NIP gérant pour modifier le dépôt du {fmtDate(viewDate)}
              </div>
              <div style={{
                background:"var(--surface)",border:`1px solid ${pinErr?"var(--red)":"var(--border)"}`,
                borderRadius:8,padding:"10px 20px",fontSize:"1.3rem",letterSpacing:".3em",
                textAlign:"center",width:200,minHeight:46,color:pinErr?"var(--red)":"var(--text)"}}>
                {pinInput.replace(/./g,"●")||"_ _ _ _"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:200}}>
                {["1","2","3","4","5","6","7","8","9","DEL","0","✓"].map(k=>(
                  <button key={k} className="pin-key"
                    onClick={()=>k!=="✓"?handlePinKey(k):null}
                    style={["DEL","✓"].includes(k)?{color:"var(--accent)"}:{}}>
                    {k}
                  </button>
                ))}
              </div>
              <div style={{fontSize:".72rem",color:"var(--muted)"}}>
                Vous pouvez consulter en lecture seule sans code.
              </div>
            </div>
          </div>
        )}

        {/* ── Depot form ── */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          {isPast && pinUnlocked && !isSubmitted && (
            <div style={{background:"rgba(168,85,247,.1)",border:"1px solid #a855f7",
              borderRadius:6,padding:"4px 12px",fontSize:".76rem",color:"#a855f7",fontWeight:600}}>
              🔓 Mode gérant — date passée
            </div>
          )}
          {isSubmitted && !editMode && (canEdit) && (
            <button className="btn btn-ghost" style={{fontSize:".76rem",padding:"5px 12px"}}
              onClick={()=>setEditMode(true)}>✏️ Modifier</button>
          )}
          {editMode && (
            <span style={{background:"rgba(249,115,22,.15)",border:"1px solid var(--orange)",
              borderRadius:6,padding:"3px 10px",fontSize:".76rem",color:"var(--orange)",fontWeight:600}}>
              ✏️ Mode modification
            </span>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>🎰 Argent Loto-Québec (Machines)</h3></div>
          <div className="card-body">
            <div style={{fontSize:".8rem",color:"var(--muted)",marginBottom:10}}>
              Total retiré des machines. Le total Coffre + Guichet + Caisse doit être égal.
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:"var(--muted)",fontSize:"1.1rem",fontWeight:700}}>$</span>
              <input type="number" min="0" step="0.01"
                value={depot.lotoQuebec}
                disabled={isLocked || (!canEdit)}
                style={{width:160,fontSize:"1.2rem",fontWeight:700,
                  borderColor: hasError?"var(--red)":loto>0&&balanced?"var(--green)":undefined}}
                onChange={e=>setF("lotoQuebec",e.target.value)}
                placeholder="0.00" />
              {balanced && <span style={{color:"var(--green)",fontWeight:700}}>✓ Balancé</span>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>📋 Répartition</h3></div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              { field:"coffre",  label:"🔒 Coffre",  hint:"Argent mis dans le coffre-fort" },
              { field:"guichet", label:"🏧 Guichet",  hint:"Argent déposé au guichet" },
              { field:"caisse",  label:"💵 Caisse",   hint:"Argent laissé dans la caisse (shift AM)" },
            ].map(item => (
              <div key={item.field}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:".9rem"}}>{item.label}</div>
                    <div style={{fontSize:".72rem",color:"var(--muted)"}}>{item.hint}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"var(--muted)"}}>$</span>
                    <input type="number" min="0" step="0.01"
                      value={depot[item.field]}
                      disabled={isLocked || (!canEdit)}
                      style={{width:130,textAlign:"right"}}
                      onChange={e=>setF(item.field,e.target.value)}
                      placeholder="0.00" />
                  </div>
                </div>
              </div>
            ))}

            <div style={{borderTop:"2px solid var(--border)",paddingTop:12,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700}}>Total Coffre + Guichet + Caisse</div>
                {hasError && <div style={{color:"var(--red)",fontSize:".78rem",marginTop:2}}>
                  ⛔ Doit égaler {loto.toFixed(2)} $ — écart : {(sumParts-loto).toFixed(2)} $
                </div>}
                {balanced && <div style={{color:"var(--green)",fontSize:".78rem",marginTop:2}}>✓ Égal à Loto-Québec</div>}
              </div>
              <div style={{fontFamily:"var(--font-head)",fontSize:"1.6rem",
                color: hasError?"var(--red)":balanced?"var(--green)":"var(--text)"}}>
                {sumParts.toFixed(2)} $
              </div>
            </div>
          </div>
        </div>

        {canEdit && !isLocked && (
          <div className="btn-row">
            <button
              className={`btn ${hasError||loto===0?"btn-ghost":"btn-green"}`}
              style={(hasError||loto===0)?{opacity:.5,cursor:"not-allowed"}:{}}
              onClick={handleSave}>
              💾 {editMode?"Resauvegarder":"Sauvegarder"} le dépôt
            </button>
            {editMode && <button className="btn btn-ghost" onClick={()=>setEditMode(false)}>Annuler</button>}
            {hasError && <span style={{color:"var(--red)",fontSize:".8rem",alignSelf:"center"}}>
              ⛔ Corrigez l'écart avant de sauvegarder
            </span>}
          </div>
        )}

        {isLocked && (
          <div style={{background:"rgba(34,197,94,.1)",border:"1px solid var(--green)",
            borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,marginTop:8}}>
            <span style={{fontSize:"1.4rem"}}>✅</span>
            <div>
              <div style={{fontWeight:700,color:"var(--green)"}}>Dépôt soumis</div>
              <div style={{fontSize:".76rem",color:"var(--muted)"}}>
                {depot.soumisTs} · Caisse : {parseFloat(depot.caisse).toFixed(2)} $
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROLE SELECT ──────────────────────────────────────────────────────────────

function RoleSelect({ onSelectManager, onSelectEmployee, onSelectDepot }) {
  const employees  = loadEmployees();
  const today      = TODAY();
  const depot      = loadDepot(today);
  const depotDone  = !!depot.soumisTs;

  const roleIcon = (role) => ({ gerant:"👑", manageuse:"🔑", barmaid:"🍺" }[role] || "👤");
  const roleColor = (role) => ROLE_LABELS[role]?.color || "var(--muted)";

  return (
    <div className="login" style={{gap:16}}>
      <div style={{textAlign:"center"}}>
        <h1>LE CLUB DES EX</h1>
        <div style={{color:"var(--muted)",marginTop:4,fontSize:".86rem"}}>Système d'inventaire</div>
      </div>

      {/* Depot button */}
      <div style={{width:"100%",maxWidth:480}}>
        <button className="role-btn" style={{
          width:"100%",
          borderColor: depotDone ? "var(--green)" : "var(--accent)",
          background:  depotDone ? "rgba(34,197,94,.08)" : "var(--card)"
        }} onClick={onSelectDepot}>
          <div className="icon">💰</div>
          <div className="role-name" style={{color: depotDone ? "var(--green)" : "var(--accent)"}}>
            Dépôt — {today}
          </div>
          <div className="role-desc">
            {depotDone ? "✅ Dépôt soumis" : "Gérant / Manageuse"}
          </div>
        </button>
      </div>

      {/* Gérant button */}
      <div style={{width:"100%",maxWidth:480}}>
        <button className="role-btn" style={{width:"100%",borderColor:"#e8a020"}}
          onClick={onSelectManager}>
          <div className="icon">👑</div>
          <div className="role-name" style={{color:"#e8a020"}}>Gérant</div>
          <div className="role-desc">Accès complet</div>
        </button>
      </div>

      {/* Employee list */}
      <div style={{width:"100%",maxWidth:480}}>
        <div style={{fontSize:".72rem",color:"var(--muted)",marginBottom:8,
          textTransform:"uppercase",letterSpacing:".06em",fontWeight:600}}>
          Employés
        </div>
        {employees.length === 0 ? (
          <div style={{color:"var(--muted)",fontSize:".82rem",padding:"14px 0",textAlign:"center"}}>
            Aucun employé — le gérant doit créer les comptes.
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
            {employees.map(emp => (
              <button key={emp.id} className="role-btn"
                style={{padding:"16px 10px",borderColor:`${roleColor(emp.role)}44`}}
                onClick={() => onSelectEmployee(emp)}>
                <div className="icon" style={{fontSize:"1.5rem"}}>{roleIcon(emp.role)}</div>
                <div className="role-name" style={{fontSize:".95rem",color:roleColor(emp.role)}}>
                  {emp.name}
                </div>
                <div className="role-desc" style={{fontSize:".68rem"}}>
                  {ROLE_LABELS[emp.role]?.label || emp.role}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EMPLOYEE VIEW ────────────────────────────────────────────────────────────

function EmployeeView({ sheet, setSheet, prevFinsPM, employee, onLogout, showToast,
  viewedDate, isViewingToday, onChangeDate }) {
  const [shift, setShift] = useState("AM");
  const [empTab, setEmpTab] = useState("ventes"); // ventes | caisse
  // Date picker — gérant only
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePinUnlocked, setDatePinUnlocked] = useState(false);
  const [datePinInput, setDatePinInput] = useState("");
  const [datePinErr, setDatePinErr]     = useState(false);
  const [pendingDate, setPendingDate]   = useState(viewedDate || TODAY());

  const openDatePicker = () => {
    setShowDatePicker(true);
    setDatePinUnlocked(false);
    setDatePinInput("");
    setDatePinErr(false);
    setPendingDate(viewedDate || TODAY());
  };
  const closeDatePicker = () => setShowDatePicker(false);

  const handleDatePinKey = (k) => {
    if (k === "DEL") { setDatePinInput(p => p.slice(0,-1)); setDatePinErr(false); return; }
    const np = datePinInput + k;
    setDatePinInput(np);
    if (np.length === 4) {
      const employees = loadEmployees();
      const ok = np === defaultManagerPin() || employees.some(e => isGerant(e) && e.pin === np);
      if (ok) {
        setDatePinUnlocked(true); setDatePinInput(""); setDatePinErr(false);
      } else {
        setDatePinErr(true);
        setTimeout(() => { setDatePinInput(""); setDatePinErr(false); }, 700);
      }
    }
  };

  const confirmDateChange = () => {
    onChangeDate(pendingDate);
    setShowDatePicker(false);
    showToast(`📅 Affichage de la journée du ${pendingDate}`, "ok");
  };

  // ── Helpers ──
  const getPrevFinAM = (id, collection) => {
    // For Début AM: locked to prev day's finPM
    if (!prevFinsPM) return null;
    const v = prevFinsPM[collection]?.[id];
    return (v !== undefined && v !== "") ? parseFloat(v) : null;
  };

  // ── Regular items ──
  const setReg = (name, field, val) => {
    setSheet(s => {
      const reg = { ...s.regular };
      const item = { ...reg[name], [field]: val };
      item.total = (parseFloat(item.am)||0) + (parseFloat(item.pm)||0);
      reg[name] = item;
      return { ...s, regular: reg };
    });
  };

  // ── Bugs ──
  const setBug = (id, field, rawVal) => {
    setSheet(s => {
      const bugs = { ...s.bugs };
      const item = { ...bugs[id] };

      // Block: debutAM locked to prev day finPM
      if (field === "debutAM" && getPrevFinAM(id, "bugs") !== null) {
        showToast("⛔ Début AM verrouillé — doit correspondre à la Fin PM de la veille", "err");
        return s;
      }
      // Block: debutPM locked to finAM
      if (field === "debutPM" && item.finAM !== "") {
        showToast("⛔ Début PM verrouillé — doit être égal à la Fin AM (" + item.finAM + ")", "err");
        return s;
      }

      // Block values above 999
      const numVal = parseFloat(rawVal);
      if (!isNaN(numVal) && numVal > 999) {
        showToast("⛔ Maximum 999 — le compteur repart à 0 après 999", "err");
        return s;
      }

      item[field] = rawVal;
      // Recalc vente — compteur 0-99 avec rollover
      // Ex: début=90, fin=15 → (99-90)+15+1 = 25
      const debut = parseFloat(item["debut"+shift]);
      const fin   = parseFloat(item["fin"+shift]);
      if (!isNaN(debut) && !isNaN(fin)) {
        item["vente"+shift] = fin >= debut
          ? fin - debut                     // pas de rollover
          : (999 - debut) + fin + 1;        // rollover par 999
      }
      bugs[id] = item;
      return { ...s, bugs };
    });
  };

  // On blur finAM → auto-fill debutPM
  const onFinAMBlurBug = (id) => {
    setSheet(s => {
      const bugs = { ...s.bugs };
      const item = { ...bugs[id] };
      if (item.finAM !== "") item.debutPM = item.finAM;
      bugs[id] = item;
      return { ...s, bugs };
    });
  };

  // ── Vins ──
  const setVin = (id, field, rawVal) => {
    setSheet(s => {
      const vins = { ...s.vins };
      const item = { ...vins[id] };
      const info = VIN_ITEMS.find(v => v.id === id);

      if (field === "debutAM" && getPrevFinAM(id, "vins") !== null) {
        showToast("⛔ Début AM verrouillé — doit correspondre à la Fin PM de la veille", "err");
        return s;
      }
      if (field === "debutPM" && item.finAM !== "") {
        showToast("⛔ Début PM verrouillé — doit être égal à la Fin AM (" + item.finAM + ")", "err");
        return s;
      }

      // Block values above poidsFull for viniers
      if (info?.type === "vinier" && info.poidsFull) {
        const val = parseFloat(rawVal);
        if (!isNaN(val) && val > info.poidsFull) {
          showToast(`⛔ Maximum ${info.poidsFull}g pour ${info.label}`, "err");
          return s;
        }
      }

      item[field] = rawVal;
      const debut = parseFloat(item["debut"+shift]) || 0;
      const fin   = parseFloat(item["fin"+shift])   || 0;
      if (info.type === "vinier") {
        const diff = debut - fin;
        item["vente"+shift] = diff > 0 ? Math.round(diff / (info.grPerVerre||250)) : 0;
      } else {
        item["vente"+shift] = debut > fin ? debut - fin : 0;
      }
      vins[id] = item;
      return { ...s, vins };
    });
  };

  const onFinAMBlurVin = (id) => {
    setSheet(s => {
      const vins = { ...s.vins };
      const item = { ...vins[id] };
      if (item.finAM !== "") item.debutPM = item.finAM;
      vins[id] = item;
      return { ...s, vins };
    });
  };

  // ── Vinier replacement (PIN-protected) ──
  const [replPending, setReplPending] = useState(null); // {id, field} waiting for PIN
  const [replPin, setReplPin] = useState("");
  const [replPinErr, setReplPinErr] = useState(false);

  const requestReplace = (id, field) => {
    setReplPending({ id, field });
    setReplPin("");
    setReplPinErr(false);
  };

  const cancelReplace = () => {
    setReplPending(null);
    setReplPin("");
    setReplPinErr(false);
  };

  const submitReplPin = (digit) => {
    const np = replPin + digit;
    setReplPin(np);
    if (np.length === 4) {
      const employees = loadEmployees();
      const authorizedEmp = employees.find(e => canReplaceVinier(e) && e.pin === np);
      const isManagerPin  = np === defaultManagerPin();
      if (isManagerPin || authorizedEmp) {
        const authorName = authorizedEmp ? authorizedEmp.name : "Gérant";
        // Authorized — do the replacement
        const { id, field } = replPending;
        const full = vinierFull(id);
        setSheet(s => {
          const vins = { ...s.vins };
          const item = { ...vins[id] };
          const avant = parseFloat(item[field]) || 0;
          const ts = new Date().toLocaleTimeString("fr-CA");
          item[field] = String(full);
          const info = VIN_ITEMS.find(v => v.id === id);
          const debut = parseFloat(item["debut"+shift]) || 0;
          if (info?.type === "vinier") {
            const diffAvant = debut - avant;
            item["vente"+shift] = diffAvant > 0 ? Math.round(diffAvant / (info.grPerVerre||250)) : 0;
          }
          if (field === "finAM") item.debutPM = String(full);
          item.remplacements = [...(item.remplacements||[]), {
            ts, shift, champ: field, avant, apres: full, par: authorName,
          }];
          vins[id] = item;
          return { ...s, vins };
        });
        // Notify gérant if done by manageuse
        if (authorizedEmp?.role === "manageuse") {
          addNotification(`🍷 ${authorizedEmp.name} (manageuse) a remplacé un vinier (${full}g)`, "info");
        }
        setReplPending(null);
        setReplPin("");
        showToast(`✅ Vinier remplacé → ${full}g — autorisé par ${authorName}`, "ok");
      } else {
        setReplPinErr(true);
        setTimeout(() => { setReplPin(""); setReplPinErr(false); }, 800);
      }
    }
  };

  // ── Live anomalies ──
  const anomalies = checkAllContinuity(sheet, prevFinsPM);
  const intraDayErrors  = anomalies.filter(a => a.scope === "MÊME JOURNÉE");
  const interDayErrors  = anomalies.filter(a => a.scope === "INTER-JOURNÉES");

  // ── Regular table ──
  const renderRegTable = (items, groupLabel) => (
    <div className="card" key={groupLabel}>
      <div className="card-header"><h3>{groupLabel}</h3></div>
      <div className="card-body" style={{padding:0}}>
        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th><span className="badge badge-am">AM</span></th>
              <th><span className="badge badge-pm">PM</span></th>
              <th><span className="badge badge-total">TOTAL</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map(name => {
              const d = sheet.regular[name] || {am:"",pm:"",total:0};
              return (
                <tr key={name}>
                  <td className="item-name">{name}</td>
                  <td><input type="number" min="0" value={d.am}
                    readOnly={shift==="PM" || (shift==="AM" && shiftReadOnly)} className={(shift==="PM"||(shift==="AM"&&shiftReadOnly))?"locked":""}
                    onChange={e=>setReg(name,"am",e.target.value)} /></td>
                  <td><input type="number" min="0" value={d.pm}
                    readOnly={shift==="AM" || (shift==="PM" && shiftReadOnly)} className={(shift==="AM"||(shift==="PM"&&shiftReadOnly))?"locked":""}
                    onChange={e=>setReg(name,"pm",e.target.value)} /></td>
                  <td className="total-cell">{d.total||0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Bug / Vin card renderer ──
  const renderCounterCard = (item, collection, d, setFn, onFinAMBlur) => {
    const isVin = collection === "vins";
    const info = isVin ? VIN_ITEMS.find(v => v.id === item.id) : null;
    const isVinier = isVin && info?.type === "vinier";

    const prevFin = getPrevFinAM(item.id, collection);
    const finAM   = d.finAM   !== "" ? parseFloat(d.finAM)   : null;
    const debutAM = d.debutAM !== "" ? parseFloat(d.debutAM) : null;
    const debutPM = d.debutPM !== "" ? parseFloat(d.debutPM) : null;
    const finPM   = d.finPM   !== "" ? parseFloat(d.finPM)   : null;

    const interErr = prevFin !== null && debutAM !== null && debutAM !== prevFin;
    const intraErr = finAM   !== null && debutPM !== null && debutPM !== finAM;

    const debutAMLocked = prevFin !== null;
    const debutPMLocked = finAM   !== null;

    const nomEmploye = shift === "AM" ? sheet.nomAM : sheet.nomPM;
    const finAMLow = isVinier && finAM !== null && finAM < VINIER_MIN;
    const finPMLow = isVinier && finPM !== null && finPM < VINIER_MIN;
    const maxPoids = isVinier ? (info.poidsFull || 3150) : undefined;
    const isBugItem = collection === "bugs";
    const inputMax = isBugItem ? 999 : maxPoids;

    const cardClass = intraErr ? "bug-card err-intra" : interErr ? "bug-card err-inter" : "bug-card";

    return (
      <div className={cardClass} key={item.id}>
        <div className="bug-label">
          {item.label}
          {isVinier && <span style={{fontSize:".66rem",color:"var(--muted)"}}>poids·250g/v · max {maxPoids}g</span>}
          {isBugItem && <span style={{fontSize:".66rem",color:"var(--muted)"}}>compteur 0–999</span>}
          {intraErr && <span className="err-intra-tag">⛔ Même journée</span>}
          {!intraErr && interErr && <span className="err-inter-tag">⚠ Inter-journées</span>}
        </div>

        {/* AM SECTION */}
        <div style={{marginBottom:6}}>
          <div className="bug-row">
            <label>Début AM</label>
            <input type="number" min="0" max={inputMax}
              value={d.debutAM||""}
              readOnly={debutAMLocked || shift==="PM"}
              className={`${debutAMLocked||shift==="PM"||(shift==="AM"&&shiftReadOnly)?"locked":""} ${interErr&&shift==="AM"?"error":""}`}
              onChange={e=>setFn(item.id,"debutAM",e.target.value)} />
          </div>
          {debutAMLocked && (
            <div className="lock-info-orange">🔒 Fin PM veille = {prevFin}</div>
          )}
          {interErr && shift==="AM" && (
            <div className="err-msg-orange">⚠ Doit être {prevFin} (Fin PM {prevFinsPM?.date})</div>
          )}
          <div className="bug-row" style={{marginTop:4}}>
            <label>Fin AM</label>
            <input type="number" min="0" max={inputMax}
              value={d.finAM||""}
              readOnly={shift==="PM" || (shift==="AM" && shiftReadOnly)}
              className={(shift==="PM"||(shift==="AM"&&shiftReadOnly))?"locked":""}
              onChange={e=>setFn(item.id,"finAM",e.target.value)}
              onBlur={()=>onFinAMBlur(item.id)} />
          </div>
          {finAMLow && shift==="AM" && (
            <div className="vinier-low-banner">
              <span className="vinier-low-txt">🪣 Bas ({finAM}g) — remplacement ?</span>
              <button className="btn-replace"
                onClick={()=>requestReplace(item.id,"finAM")}>
                🔄 Remplacer → {vinierFull(item.id)}g
              </button>
            </div>
          )}
        </div>

        {/* PM SECTION */}
        <div style={{paddingTop:6,borderTop:"1px solid var(--border)"}}>
          <div className="bug-row">
            <label>Début PM</label>
            <input type="number" min="0" max={inputMax}
              value={d.debutPM||""}
              readOnly={debutPMLocked || shift==="AM" || (shift==="PM" && shiftReadOnly)}
              className={`${debutPMLocked||shift==="AM"||(shift==="PM"&&shiftReadOnly)?"locked":""} ${intraErr?"error":""}`}
              onChange={e=>setFn(item.id,"debutPM",e.target.value)} />
          </div>
          {debutPMLocked && !intraErr && (
            <div className="lock-info">🔒 Fin AM = {finAM}</div>
          )}
          {intraErr && (
            <div className="err-msg">⛔ Doit être {finAM} (Fin AM)</div>
          )}
          <div className="bug-row" style={{marginTop:4}}>
            <label>Fin PM</label>
            <input type="number" min="0" max={inputMax}
              value={d.finPM||""}
              readOnly={shift==="AM" || (shift==="PM" && shiftReadOnly)}
              className={(shift==="AM"||(shift==="PM"&&shiftReadOnly))?"locked":""}
              onChange={e=>setFn(item.id,"finPM",e.target.value)} />
          </div>
          {finPMLow && shift==="PM" && (
            <div className="vinier-low-banner">
              <span className="vinier-low-txt">🪣 Bas ({finPM}g) — remplacement ?</span>
              <button className="btn-replace"
                onClick={()=>requestReplace(item.id,"finPM")}>
                🔄 Remplacer → {vinierFull(item.id)}g
              </button>
            </div>
          )}
        </div>

        {/* VENTES */}
        {(() => {
          const isBug = !isVinier && collection === "bugs";
          const debutCur = parseFloat(d["debut"+shift]);
          const finCur   = parseFloat(d["fin"+shift]);
          const rolledOver = isBug && !isNaN(debutCur) && !isNaN(finCur) && finCur < debutCur;
          return (
            <div className="bug-vente">
              <span style={{color:"var(--muted)",fontSize:".72rem"}}>AM :</span>
              <span className="vente-num">{d.venteAM||0}</span>
              <span style={{color:"var(--muted)",fontSize:".72rem",marginLeft:8}}>PM :</span>
              <span className="vente-num">{d.ventePM||0}</span>
              <span style={{color:"var(--muted)",fontSize:".72rem",marginLeft:8}}>Total :</span>
              <span className="vente-num" style={{color:"var(--accent)"}}>
                {(d.venteAM||0)+(d.ventePM||0)}
              </span>
              {rolledOver && (
                <span style={{fontSize:".66rem",color:"var(--blue)",marginLeft:6,
                  background:"rgba(59,130,246,.12)",borderRadius:4,padding:"1px 5px"}}>
                  🔁 rollover
                </span>
              )}
            </div>
          );
        })()}

        {/* Remplacement log (viniers seulement) */}
        {isVinier && (d.remplacements||[]).length > 0 && (
          <div className="repl-log">
            {(d.remplacements||[]).map((r,i)=>(
              <div className="repl-log-row" key={i}>
                🔄 {r.ts} (shift {r.shift}) — {r.avant}g → {r.apres}g · {r.par}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Auto-detect shift and fill name ──
  // Logic: if nomAM is already filled by someone else → this employee is PM
  //        if nomAM is empty → this employee is AM
  //        SAME employee cannot take both AM and PM the same day (unless gérant unlocks it)
  const [sameEmpBlocked, setSameEmpBlocked] = useState(false);
  const [sameEmpPinUnlocked, setSameEmpPinUnlocked] = useState(false);

  useEffect(() => {
    if (!employee?.name) return;
    setSheet(s => {
      const amTaken = s.nomAM && s.nomAM !== employee.name;
      const pmTaken = s.nomPM && s.nomPM !== employee.name;
      const alreadyOnAM = s.nomAM === employee.name;
      const alreadyOnPM = s.nomPM === employee.name;

      const updates = {};
      if (!amTaken && !s.nomAM) {
        updates.nomAM = employee.name;
      } else if (amTaken && !pmTaken && !s.nomPM && !alreadyOnAM) {
        // Block: this same employee is already on AM → cannot also take PM
        if (s.nomAM === employee.name) {
          // no-op, handled by alreadyOnAM check above (kept for clarity)
        } else {
          updates.nomPM = employee.name;
        }
      }
      if (Object.keys(updates).length === 0) return s;
      return { ...s, ...updates };
    });

    setSheet(s => {
      const amTaken = s.nomAM && s.nomAM !== employee.name;
      const alreadyOnAM = s.nomAM === employee.name;
      // If employee is already assigned to AM and tries to also be on PM slot → block
      if (alreadyOnAM && !s.nomPM) {
        setSameEmpBlocked(false); // they're fine staying on AM
      }
      if (amTaken) setShift("PM");
      else setShift("AM");
      return s;
    });
  }, []);

  // Determine shift ownership for the currently selected shift
  const shiftOwner = shift === "AM" ? sheet.nomAM : sheet.nomPM;
  const isShiftOwner = !shiftOwner || shiftOwner === employee?.name;
  const isGerantUser = isGerant(employee);

  // Block same employee taking both shifts unless unlocked
  const tryingBothShifts = employee?.name &&
    ((shift === "PM" && sheet.nomAM === employee.name) ||
     (shift === "AM" && sheet.nomPM === employee.name));
  const blockedSameEmployee = tryingBothShifts && !isGerantUser && !sameEmpPinUnlocked;

  // Read-only if: someone else owns this shift, OR same-employee-both-shifts is blocked —
  // unless current user is gérant or has unlocked via PIN
  const shiftReadOnly = (!isShiftOwner || blockedSameEmployee) && !isGerantUser && !sameEmpPinUnlocked;

  // PIN modal for unlocking (gérant only) — reused for both same-employee and shift-takeover cases
  const [showLockPin, setShowLockPin] = useState(false);
  const [lockPinInput, setLockPinInput] = useState("");
  const [lockPinErr, setLockPinErr] = useState(false);

  const handleLockPinKey = (k) => {
    if (k === "DEL") { setLockPinInput(p => p.slice(0,-1)); setLockPinErr(false); return; }
    const np = lockPinInput + k;
    setLockPinInput(np);
    if (np.length === 4) {
      const employees = loadEmployees();
      const ok = np === defaultManagerPin() || employees.some(e => isGerant(e) && e.pin === np);
      if (ok) {
        setSameEmpPinUnlocked(true);
        setShowLockPin(false);
        setLockPinInput("");
        setLockPinErr(false);
        showToast("🔓 Déverrouillé par le gérant", "ok");
      } else {
        setLockPinErr(true);
        setTimeout(() => { setLockPinInput(""); setLockPinErr(false); }, 700);
      }
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>LE CLUB DES EX</h1>
        <span style={{background:"rgba(232,160,32,.15)",border:"1px solid rgba(232,160,32,.3)",
          borderRadius:6,padding:"3px 10px",fontSize:".82rem",color:"var(--accent)",fontWeight:600}}>
          👤 {employee?.name || "Employé"}
        </span>
        <span className="date" style={{cursor:"pointer",
            textDecoration: isViewingToday ? "none" : "underline",
            color: isViewingToday ? undefined : "#a855f7"}}
          onClick={openDatePicker}
          title="Cliquer pour changer de date (code gérant requis)">
          📅 {sheet.date}{!isViewingToday && " 🔓"}
        </span>
        <button className="btn btn-ghost" onClick={onLogout}>Quitter</button>
      </div>

      {!isViewingToday && (
        <div style={{background:"rgba(168,85,247,.1)",borderBottom:"1px solid #a855f7",
          padding:"6px 20px",fontSize:".76rem",color:"#a855f7",display:"flex",
          alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span>🔓 Mode gérant — vous consultez/modifiez la journée du {sheet.date} (pas aujourd'hui)</span>
          <button className="btn btn-ghost" style={{fontSize:".72rem",padding:"3px 10px"}}
            onClick={()=>onChangeDate(TODAY())}>
            ← Revenir à aujourd'hui
          </button>
        </div>
      )}

      <div className="shift-bar">
        {/* Show which employee is on each shift */}
        <div style={{fontSize:".72rem",color:"var(--muted)",display:"flex",gap:12,alignItems:"center"}}>
          {sheet.nomAM && (
            <span style={{
              background: sheet.nomAM===employee?.name ? "rgba(59,130,246,.2)" : "var(--surface)",
              border: sheet.nomAM===employee?.name ? "1px solid #3b82f6" : "1px solid var(--border)",
              borderRadius:5,padding:"2px 8px",color: sheet.nomAM===employee?.name ? "#93c5fd" : "var(--muted)"}}>
              AM : {sheet.nomAM}
            </span>
          )}
          {sheet.nomPM && (
            <span style={{
              background: sheet.nomPM===employee?.name ? "rgba(234,179,8,.2)" : "var(--surface)",
              border: sheet.nomPM===employee?.name ? "1px solid #ca8a04" : "1px solid var(--border)",
              borderRadius:5,padding:"2px 8px",color: sheet.nomPM===employee?.name ? "#fde68a" : "var(--muted)"}}>
              PM : {sheet.nomPM}
            </span>
          )}
        </div>
        <div style={{display:"flex",gap:8}}>
          {["AM","PM"].map(s=>(
            <button key={s} className={`shift-btn ${shift===s?"active-"+s.toLowerCase():""}`}
              onClick={()=>setShift(s)}>{s}</button>
          ))}
        </div>
        {anomalies.length > 0 && (
          <div style={{display:"flex",gap:6,alignItems:"center",
            background:"rgba(239,68,68,.12)",border:"1px solid var(--red)",
            borderRadius:6,padding:"4px 10px",fontSize:".77rem",color:"var(--red)",fontWeight:600}}>
            ⚠ {anomalies.length} anomalie{anomalies.length>1?"s":""}
          </div>
        )}
        {prevFinsPM && (
          <div style={{fontSize:".72rem",color:"var(--orange)",
            background:"rgba(249,115,22,.1)",borderRadius:5,padding:"3px 8px"}}>
            🔗 Suivi depuis le {prevFinsPM.date}
          </div>
        )}
      </div>

      {/* Shift ownership / lock banners */}
      {blockedSameEmployee && (
        <div className="error-banner" style={{margin:"10px 20px"}}>
          <div className="eb-title">⛔ Vous occupez déjà l'autre shift aujourd'hui</div>
          <div className="eb-item">
            Vous ({employee?.name}) êtes déjà assigné(e) au shift {shift==="AM"?"PM":"AM"} de cette journée.
            Un même employé ne peut pas faire les deux shifts, sauf autorisation du gérant.
          </div>
          <button className="btn btn-ghost" style={{marginTop:8,fontSize:".78rem",padding:"5px 12px"}}
            onClick={()=>setShowLockPin(true)}>
            🔐 Débloquer avec code gérant
          </button>
        </div>
      )}
      {!blockedSameEmployee && shiftReadOnly && (
        <div className="warn-banner" style={{margin:"10px 20px"}}>
          <div className="wb-title">🔒 Shift {shift} déjà pris par {shiftOwner}</div>
          <div className="wb-item">
            Vous pouvez consulter cette feuille mais pas la modifier. Seul {shiftOwner} ou le gérant peut y apporter des changements.
          </div>
          <button className="btn btn-ghost" style={{marginTop:8,fontSize:".78rem",padding:"5px 12px"}}
            onClick={()=>setShowLockPin(true)}>
            🔐 Débloquer avec code gérant
          </button>
        </div>
      )}

      {/* Employee tab nav */}
      <div className="nav">
        <button className={empTab==="ventes"?"active":""} onClick={()=>setEmpTab("ventes")}>
          🍺 Ventes
        </button>
        <button className={empTab==="ticket"?"active":""} onClick={()=>setEmpTab("ticket")}>
          🧾 Mon Ticket
        </button>
        <button className={empTab==="caisse"?"active":""} onClick={()=>setEmpTab("caisse")}>
          💰 Ma Caisse
        </button>
      </div>

      <div className="main">
        {empTab === "ticket" && (
          <EmployeeTicket
            sheet={sheet}
            shift={shift}
            employee={employee}
          />
        )}
        {empTab === "caisse" && (
          <EmployeeCaisse
            sheet={sheet}
            setSheet={setSheet}
            shift={shift}
            employee={employee}
            showToast={showToast}
            prevCaisseTotal={(() => {
              if (shift === "PM") {
                // Previous shift = AM of the SAME viewed day
                return sheet.caisse?.AM?.totalCaisse || "";
              } else {
                // Previous shift = PM of the day BEFORE the viewed day
                const dayBefore = prevDate(sheet.date);
                const prevSheet = migrateSheet(load("sheet_"+dayBefore, null));
                return prevSheet?.caisse?.PM?.totalCaisse || "";
              }
            })()}
          />
        )}
        {empTab === "ventes" && (<>
        {/* Error banners */}
        {interDayErrors.length > 0 && (
          <div className="warn-banner">
            <div className="wb-title">⚠ Erreurs inter-journées — Début AM ≠ Fin PM de la veille ({prevFinsPM?.date})</div>
            {interDayErrors.map((e,i)=>(
              <div className="wb-item" key={i}><strong>{e.item}</strong> — {e.detail}</div>
            ))}
          </div>
        )}
        {intraDayErrors.length > 0 && shift==="PM" && (
          <div className="error-banner">
            <div className="eb-title">⛔ Erreurs même journée — Début PM ≠ Fin AM</div>
            {intraDayErrors.map((e,i)=>(
              <div className="eb-item" key={i}><strong>{e.item}</strong> — {e.detail}</div>
            ))}
          </div>
        )}

        {renderRegTable(PETITES_BIERES, "🍺 Petites Bières")}
        {renderRegTable(GROSSES_BIERES, "🍺 Grosses Bières")}
        {renderRegTable(AUTRES_BIERES,  "🍻 Autres Bières")}

        <div className="card">
          <div className="card-header">
            <h3>🥃 Bouteilles de Fort (Bugs)</h3>
            <span style={{marginLeft:"auto",fontSize:".7rem",color:"var(--muted)"}}>
              🔒 Début AM = Fin PM veille · Début PM = Fin AM
            </span>
          </div>
          <div className="card-body">
            <div className="bug-grid">
              {BUG_ITEMS.map(bug => renderCounterCard(
                bug, "bugs", sheet.bugs[bug.id]||{}, setBug, onFinAMBlurBug
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🍷 Vins & Spiritueux</h3>
            <span style={{marginLeft:"auto",fontSize:".7rem",color:"var(--muted)"}}>
              🔒 Début AM = Fin PM veille · Début PM = Fin AM
            </span>
          </div>
          <div className="card-body">
            <div className="bug-grid">
              {VIN_ITEMS.map(vin => renderCounterCard(
                vin, "vins", sheet.vins[vin.id]||{}, setVin, onFinAMBlurVin
              ))}
            </div>
          </div>
        </div>

        {renderRegTable(AUTRES_BOISSONS, "🥤 Autres Boissons")}
        {renderRegTable(NOURRITURE, "🍗 Nourriture")}

        {/* ── PRODUITS PERSONNALISÉS ── */}
        {(() => {
          const customProds = loadCustomProducts();
          if (customProds.length === 0) return null;
          const sh = shift.toLowerCase();
          return (
            <div className="card">
              <div className="card-header"><h3>📦 Produits personnalisés</h3></div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th><span className="badge badge-am">AM</span></th>
                      <th><span className="badge badge-pm">PM</span></th>
                      <th><span className="badge badge-total">TOTAL</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customProds.map(p => {
                      const d = sheet.customProducts?.[p.id] || {am:"",pm:"",total:0};
                      const amVal = d.am || "";
                      const pmVal = d.pm || "";
                      const total = (parseFloat(amVal)||0) + (parseFloat(pmVal)||0);
                      return (
                        <tr key={p.id}>
                          <td className="item-name">{p.name}</td>
                          <td><input type="number" min="0" value={amVal}
                            readOnly={shift==="PM"||(shift==="AM"&&shiftReadOnly)} className={(shift==="PM"||(shift==="AM"&&shiftReadOnly))?"locked":""}
                            onChange={e=>{
                              const v = e.target.value;
                              setSheet(s=>({...s, customProducts:{...s.customProducts, [p.id]:{...d, am:v, total:(parseFloat(v)||0)+(parseFloat(pmVal)||0)}}}));
                            }} /></td>
                          <td><input type="number" min="0" value={pmVal}
                            readOnly={shift==="AM"||(shift==="PM"&&shiftReadOnly)} className={(shift==="AM"||(shift==="PM"&&shiftReadOnly))?"locked":""}
                            onChange={e=>{
                              const v = e.target.value;
                              setSheet(s=>({...s, customProducts:{...s.customProducts, [p.id]:{...d, pm:v, total:(parseFloat(amVal)||0)+(parseFloat(v)||0)}}}));
                            }} /></td>
                          <td className="total-cell">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── COCKTAILS ── */}
        {(() => {
          const cocktailsList = loadCocktails();
          if (cocktailsList.length === 0) return null;
          const sh = shift.toLowerCase();
          return (
            <div className="card">
              <div className="card-header">
                <h3>🍹 Cocktails</h3>
                <span style={{marginLeft:"auto",fontSize:".72rem",color:"var(--muted)"}}>
                  Les ingrédients sont annulés du ticket — entrez les ventes normalement dans vos sections
                </span>
              </div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead>
                    <tr>
                      <th>Cocktail</th>
                      <th><span className="badge badge-am">AM</span></th>
                      <th><span className="badge badge-pm">PM</span></th>
                      <th><span className="badge badge-total">TOTAL</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cocktailsList.map(c => {
                      const d = sheet.cocktails?.[c.id] || {am:"",pm:"",total:0};
                      const amVal = d.am || "";
                      const pmVal = d.pm || "";
                      const total = (parseFloat(amVal)||0) + (parseFloat(pmVal)||0);
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="item-name">{c.name}</div>
                            <div style={{fontSize:".68rem",color:"var(--muted)"}}>
                              {(c.ingredients||[]).map(i=>{
                                const VINIER_LABELS = {
                                  "vinier_blanc":"Vinier Blanc (Cliff 79 ou Bistro)",
                                  "vinier_rouge":"Vinier Rouge",
                                };
                                const lbl = VINIER_LABELS[i.key]
                                  || [...BUG_ITEMS,...VIN_ITEMS].find(x=>(x.id||x)===i.key)?.label
                                  || AUTRES_BOISSONS.find(x=>x===i.key)
                                  || i.key;
                                const unit = i.type==="vinier_group" ? `${i.qty}ml` : `×${i.qty}`;
                                return `${lbl} ${unit}`;
                              }).join(" · ")}
                            </div>
                          </td>
                          <td><input type="number" min="0" value={amVal}
                            readOnly={shift==="PM"||(shift==="AM"&&shiftReadOnly)} className={(shift==="PM"||(shift==="AM"&&shiftReadOnly))?"locked":""}
                            onChange={e=>{
                              const v = e.target.value;
                              setSheet(s=>({...s, cocktails:{...s.cocktails, [c.id]:{...d, am:v, total:(parseFloat(v)||0)+(parseFloat(pmVal)||0)}}}));
                            }} /></td>
                          <td><input type="number" min="0" value={pmVal}
                            readOnly={shift==="AM"||(shift==="PM"&&shiftReadOnly)} className={(shift==="AM"||(shift==="PM"&&shiftReadOnly))?"locked":""}
                            onChange={e=>{
                              const v = e.target.value;
                              setSheet(s=>({...s, cocktails:{...s.cocktails, [c.id]:{...d, pm:v, total:(parseFloat(amVal)||0)+(parseFloat(v)||0)}}}));
                            }} /></td>
                          <td className="total-cell">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div className="card">
          <div className="card-header"><h3>📦 Bouteille Globale</h3></div>
          <div className="card-body" style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {["bouteilleDebut","bouteilleFin"].map(k=>(
              <div key={k}>
                <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:2}}>
                  {k==="bouteilleDebut"?"Bouteille Début":"Bouteille Fin"}
                </div>
                <input type="text" style={{width:120}} value={sheet[k]||""}
                  onChange={e=>setSheet(s=>({...s,[k]:e.target.value}))} />
              </div>
            ))}
          </div>
        </div>

        {/* ── HAPPY HOUR 5-7 ── */}
        {(() => {
          const sh = shift.toLowerCase();
          const totalBieresShift = [...PETITES_BIERES, ...GROSSES_BIERES, ...AUTRES_BIERES]
            .reduce((s,n) => s + (parseFloat(sheet.regular?.[n]?.[sh]) || 0), 0);
          const hhVal = sheet.happyHour?.[shift] || "";
          const hhNum = parseFloat(hhVal) || 0;
          const hhError = hhNum > totalBieresShift;

          const setHH = (val) => {
            setSheet(s => ({ ...s, happyHour: { ...s.happyHour, [shift]: val } }));
          };

          return (
            <div className="card">
              <div className="card-header">
                <h3>🍻 Happy Hour 5 à 7</h3>
                <span style={{marginLeft:"auto",fontSize:".72rem",color:"var(--muted)"}}>
                  Bières à -1$ (petites + grosses confondues)
                </span>
              </div>
              <div className="card-body">
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>
                      Nombre vendu en Happy Hour — shift {shift}
                    </div>
                    <input type="number" min="0" max={totalBieresShift}
                      value={hhVal}
                      readOnly={shiftReadOnly}
                      className={shiftReadOnly?"locked":""}
                      style={{width:120,
                        borderColor: hhError ? "var(--red)" : undefined}}
                      onChange={e=>setHH(e.target.value)}
                      placeholder="0" />
                  </div>
                  <div style={{fontSize:".78rem",color:"var(--muted)"}}>
                    Total bières vendues ce shift : <strong style={{color:"var(--text)"}}>{totalBieresShift}</strong>
                  </div>
                  {hhNum > 0 && !hhError && (
                    <div style={{fontSize:".78rem",color:"var(--orange)"}}>
                      → Déduction caisse : <strong>-{hhNum.toFixed(2)} $</strong>
                    </div>
                  )}
                </div>
                {hhError && (
                  <div style={{color:"var(--red)",fontSize:".78rem",marginTop:8}}>
                    ⛔ Ne peut pas dépasser le total de bières vendues ({totalBieresShift})
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── PLATEAUX DE SHOOTERS ── */}
        {(() => {
          const totalShootersShift = shift === "AM"
            ? (sheet.bugs?.bug7?.venteAM || 0)
            : (sheet.bugs?.bug7?.ventePM || 0);
          const maxPlateaux = Math.floor(totalShootersShift / 10);
          const platVal = sheet.plateauxShooter?.[shift] || "";
          const platNum = parseFloat(platVal) || 0;
          const platError = platNum > maxPlateaux;

          const setPlat = (val) => {
            setSheet(s => ({ ...s, plateauxShooter: { ...s.plateauxShooter, [shift]: val } }));
          };

          return (
            <div className="card">
              <div className="card-header">
                <h3>🥃 Plateaux de Shooters</h3>
                <span style={{marginLeft:"auto",fontSize:".72rem",color:"var(--muted)"}}>
                  1 plateau = 10 shooters · -10$ par plateau
                </span>
              </div>
              <div className="card-body">
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>
                      Nombre de plateaux vendus — shift {shift}
                    </div>
                    <input type="number" min="0" max={maxPlateaux}
                      value={platVal}
                      readOnly={shiftReadOnly}
                      className={shiftReadOnly?"locked":""}
                      style={{width:120,
                        borderColor: platError ? "var(--red)" : undefined}}
                      onChange={e=>setPlat(e.target.value)}
                      placeholder="0" />
                  </div>
                  <div style={{fontSize:".78rem",color:"var(--muted)"}}>
                    Shooters vendus ce shift : <strong style={{color:"var(--text)"}}>{totalShootersShift}</strong>
                    {" "}→ max <strong style={{color:"var(--text)"}}>{maxPlateaux}</strong> plateau{maxPlateaux>1?"x":""}
                  </div>
                  {platNum > 0 && !platError && (
                    <div style={{fontSize:".78rem",color:"var(--orange)"}}>
                      → Déduction caisse : <strong>-{(platNum*10).toFixed(2)} $</strong>
                    </div>
                  )}
                </div>
                {platError && (
                  <div style={{color:"var(--red)",fontSize:".78rem",marginTop:8}}>
                    ⛔ Ne peut pas dépasser {maxPlateaux} plateau{maxPlateaux>1?"x":""} (1/10 des {totalShootersShift} shooters vendus)
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="card">
          <div className="card-header"><h3>💬 Commentaire</h3></div>
          <div className="card-body">
            <textarea rows={4} value={sheet.commentaire||""}
              onChange={e=>setSheet(s=>({...s,commentaire:e.target.value}))}
              placeholder="Notes de la journée..." style={{resize:"vertical"}} />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-green" onClick={()=>{
            const errs = checkAllContinuity(sheet, prevFinsPM);
            if (errs.length > 0) showToast("⚠ "+errs.length+" anomalie(s) — voir les erreurs","warn");
            else showToast("✅ Données sauvegardées!","ok");
          }}>💾 Sauvegarder</button>
        </div>
        </>)}
      </div>

      {/* ── PIN MODAL for vinier replacement ── */}
      {replPending && (
        <div className="pin-modal-overlay" onClick={cancelReplace}>
          <div className="pin-modal" onClick={e=>e.stopPropagation()}>
            <h3>🔐 Code Gérant</h3>
            <div className="sub">Entrez le NIP de la manageuse pour autoriser le remplacement du vinier</div>
            <div className="pin-modal-display"
              style={{color: replPinErr ? "var(--red)" : "var(--text)"}}>
              {replPin.replace(/./g,"●") || "_ _ _ _"}
            </div>
            <div className="pin-modal-grid">
              {["1","2","3","4","5","6","7","8","9","✕","0","✓"].map(k => (
                <button key={k} className="pin-key"
                  onClick={() => {
                    if (k === "✕") cancelReplace();
                    else if (k !== "✓") submitReplPin(k);
                  }}
                  style={["✕","✓"].includes(k)
                    ? {color: k==="✕" ? "var(--red)" : "var(--accent)"}
                    : {}}>
                  {k}
                </button>
              ))}
            </div>
            <div style={{fontSize:".74rem",color:"var(--muted)"}}>
              Appuyez sur ✕ pour annuler
            </div>
          </div>
        </div>
      )}

      {/* ── DATE PICKER MODAL (gérant only) ── */}
      {showDatePicker && (
        <div className="pin-modal-overlay" onClick={closeDatePicker}>
          <div className="pin-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:320}}>
            {!datePinUnlocked ? (<>
              <h3>🔐 Code Gérant</h3>
              <div className="sub">Entrez le NIP gérant pour naviguer vers une autre date</div>
              <div className="pin-modal-display"
                style={{color: datePinErr ? "var(--red)" : "var(--text)"}}>
                {datePinInput.replace(/./g,"●") || "_ _ _ _"}
              </div>
              <div className="pin-modal-grid">
                {["1","2","3","4","5","6","7","8","9","✕","0","✓"].map(k => (
                  <button key={k} className="pin-key"
                    onClick={() => {
                      if (k === "✕") closeDatePicker();
                      else if (k !== "✓") handleDatePinKey(k);
                    }}
                    style={["✕","✓"].includes(k)
                      ? {color: k==="✕" ? "var(--red)" : "var(--accent)"}
                      : {}}>
                    {k}
                  </button>
                ))}
              </div>
              <div style={{fontSize:".74rem",color:"var(--muted)"}}>Appuyez sur ✕ pour annuler</div>
            </>) : (<>
              <h3 style={{color:"#a855f7"}}>🔓 Choisir une date</h3>
              <div className="sub">Naviguez vers n'importe quelle journée</div>
              <input type="date" value={pendingDate} max={TODAY()}
                style={{width:"100%",fontSize:"1rem",padding:"10px"}}
                onChange={e=>setPendingDate(e.target.value)} />
              <div style={{display:"flex",gap:8,width:"100%",marginTop:6}}>
                <button className="btn btn-accent" style={{flex:1}} onClick={confirmDateChange}>
                  ✓ Aller à cette date
                </button>
                <button className="btn btn-ghost" onClick={()=>{setPendingDate(TODAY());onChangeDate(TODAY());setShowDatePicker(false);}}>
                  Aujourd'hui
                </button>
              </div>
              <button className="btn btn-ghost" style={{width:"100%"}} onClick={closeDatePicker}>Annuler</button>
            </>)}
          </div>
        </div>
      )}

      {/* ── SHIFT LOCK UNLOCK MODAL (gérant only) ── */}
      {showLockPin && (
        <div className="pin-modal-overlay" onClick={()=>setShowLockPin(false)}>
          <div className="pin-modal" onClick={e=>e.stopPropagation()}>
            <h3>🔐 Code Gérant</h3>
            <div className="sub">
              {blockedSameEmployee
                ? "Autoriser cet employé à faire les deux shifts aujourd'hui"
                : `Autoriser la modification du shift ${shift} occupé par ${shiftOwner}`}
            </div>
            <div className="pin-modal-display"
              style={{color: lockPinErr ? "var(--red)" : "var(--text)"}}>
              {lockPinInput.replace(/./g,"●") || "_ _ _ _"}
            </div>
            <div className="pin-modal-grid">
              {["1","2","3","4","5","6","7","8","9","✕","0","✓"].map(k => (
                <button key={k} className="pin-key"
                  onClick={() => {
                    if (k === "✕") setShowLockPin(false);
                    else if (k !== "✓") handleLockPinKey(k);
                  }}
                  style={["✕","✓"].includes(k)
                    ? {color: k==="✕" ? "var(--red)" : "var(--accent)"}
                    : {}}>
                  {k}
                </button>
              ))}
            </div>
            <div style={{fontSize:".74rem",color:"var(--muted)"}}>Appuyez sur ✕ pour annuler</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────

function ManagerView({ sheet, setSheet, prevFinsPM, inventory, setInventory, history, setHistory, onLogout, showToast }) {
  const [tab, setTab] = useState("today");

  const anomalies = checkAllContinuity(sheet, prevFinsPM);

  const applyDeduction = () => {
    if (anomalies.length > 0) {
      showToast("⛔ Impossible — "+anomalies.length+" anomalie(s) non résolue(s)", "err");
      return;
    }
    const newInv = JSON.parse(JSON.stringify(inventory));
    ALL_REGULAR_ITEMS.forEach(name => {
      const total = sheet.regular[name]?.total || 0;
      newInv.regular[name] = Math.max(0, (newInv.regular[name]||0) - total);
    });
    BUG_ITEMS.forEach(bug => {
      const ventes = (sheet.bugs[bug.id]?.venteAM||0) + (sheet.bugs[bug.id]?.ventePM||0);
      const onces  = ventes * (bug.oz || 1);
      newInv.bugs[bug.id] = Math.max(0, (newInv.bugs[bug.id]||0) - onces);
    });
    VIN_ITEMS.forEach(vin => {
      const v = (sheet.vins[vin.id]?.venteAM||0) + (sheet.vins[vin.id]?.ventePM||0);
      newInv.vins[vin.id] = Math.max(0, (newInv.vins[vin.id]||0) - v);
    });
    // Cocktails — deduct ingredients from inventory
    const cocktailsList = loadCocktails();
    cocktailsList.forEach(cocktail => {
      const d = sheet.cocktails?.[cocktail.id];
      const totalSold = (parseFloat(d?.am)||0) + (parseFloat(d?.pm)||0);
      if (totalSold === 0) return;
      (cocktail.ingredients || []).forEach(ing => {
        const deduct = totalSold * (ing.qty || 1);
        if (ing.type === "bug") {
          newInv.bugs[ing.key] = Math.max(0, (newInv.bugs[ing.key]||0) - deduct * (BUG_ITEMS.find(b=>b.id===ing.key)?.oz||1));
        } else if (ing.type === "vin") {
          newInv.vins[ing.key] = Math.max(0, (newInv.vins[ing.key]||0) - deduct);
        } else if (ing.type === "vinier_group") {
          // ing.qty is in ml — convert to verres (1 verre = 250ml)
          const verres = (ing.qty || 0) / 250;
          const VINIER_IDS_MAP = {
            "vinier_blanc": ["vinier_blanc1","vinier_blanc2","vinier_bistro1","vinier_bistro2"],
            "vinier_rouge": ["vinier_rouge1","vinier_rouge2"],
          };
          const ids = VINIER_IDS_MAP[ing.key] || ing.ids || [];
          let remaining = totalSold * verres;
          for (const vid of ids) {
            if (remaining <= 0) break;
            const cur = parseFloat(newInv.vins[vid]) || 0;
            const used = Math.min(cur, remaining);
            newInv.vins[vid] = Math.max(0, cur - used);
            remaining -= used;
          }
        } else if (ing.type === "regular") {
          newInv.regular[ing.key] = Math.max(0, (newInv.regular[ing.key]||0) - deduct);
        }
      });
    });
    // Custom products
    const customProds = loadCustomProducts();
    customProds.forEach(p => {
      const d = sheet.customProducts?.[p.id];
      const total = (parseFloat(d?.am)||0) + (parseFloat(d?.pm)||0);
      if (newInv.regular[p.id] !== undefined) {
        newInv.regular[p.id] = Math.max(0, (newInv.regular[p.id]||0) - total);
      }
    });
    newInv.lastUpdated = new Date().toLocaleString("fr-CA");
    setInventory(newInv);
    setHistory(h => {
      const idx = h.findIndex(d => d.date === sheet.date);
      if (idx >= 0) { const hh=[...h]; hh[idx]=sheet; return hh; }
      return [sheet,...h];
    });
    showToast("✅ Inventaire mis à jour!","ok");
  };

  const tabs = [
    { id:"today",     label:"📋 Feuille du jour" },
    { id:"anomalies", label:"⚠ Anomalies", count: anomalies.length },
    { id:"inventory", label:"📦 Inventaire" },
    { id:"commandes", label:"📥 Commandes" },
    { id:"semaine",   label:"📊 Semaine" },
    { id:"analytique",label:"📈 Analytique" },
    { id:"produits",    label:"🏷 Produits" },
    { id:"cocktails",   label:"🍹 Cocktails" },
    { id:"caisse",      label:"🧾 Caisse" },
    { id:"verifcaisse", label:"✅ Vérif. Caisse" },
    { id:"employes",    label:"👥 Employés" },
    { id:"history",   label:"🗂 Historique" },
  ];

  const notifs = loadNotifications();
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="app">
      <div className="topbar">
        <h1>GÉRANT — LE CLUB DES EX</h1>
        <span className="date">📅 {sheet.date}</span>
        {unread > 0 && (
          <button className="btn btn-ghost" style={{position:"relative",padding:"6px 12px"}}
            onClick={()=>{
              saveNotifications(notifs.map(n=>({...n,read:true})));
              setTab("employes");
            }}>
            🔔 <span style={{position:"absolute",top:-4,right:-4,
              background:"var(--red)",color:"#fff",borderRadius:99,
              fontSize:".62rem",fontWeight:700,padding:"1px 5px",minWidth:16,textAlign:"center"}}>
              {unread}
            </span>
          </button>
        )}
        <button className="btn btn-ghost" onClick={onLogout}>Quitter</button>
      </div>
      <div className="nav">
        {tabs.map(t=>(
          <button key={t.id} className={tab===t.id?"active":""} onClick={()=>setTab(t.id)}>
            {t.label}
            {t.count > 0 && <span className="nav-badge">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="main">
        {tab==="today"      && <ManagerToday sheet={sheet} prevFinsPM={prevFinsPM} onApply={applyDeduction} anomalies={anomalies} />}
        {tab==="anomalies"  && <ManagerAnomalies anomalies={anomalies} />}
        {tab==="inventory"  && <ManagerInventory inventory={inventory} setInventory={setInventory} showToast={showToast} />}
        {tab==="commandes"  && <ManagerCommandes inventory={inventory} setInventory={setInventory} showToast={showToast} />}
        {tab==="semaine"    && <ManagerSemaine history={history} today={TODAY()} />}
        {tab==="analytique" && <ManagerAnalytique history={history} today={TODAY()} />}
        {tab==="produits"    && <ManagerProduits showToast={showToast} inventory={inventory} setInventory={setInventory} />}
        {tab==="cocktails"   && <ManagerCocktails showToast={showToast} />}
        {tab==="caisse"     && <ManagerCaisse history={history} today={TODAY()} />}
        {tab==="verifcaisse"&& <ManagerVerifCaisse sheet={sheet} setSheet={setSheet} history={history} setHistory={setHistory} showToast={showToast} />}
        {tab==="employes"   && <ManagerEmployes history={history} showToast={showToast} />}
        {tab==="history"    && <ManagerHistory history={history} />}
      </div>
    </div>
  );
}

// ─── CAISSE CALCULATION HELPER ───────────────────────────────────────────────

const calcVenteShift = (sheet, shift, prices) => {
  const sh = shift.toLowerCase(); // "am" or "pm"
  let total = 0;
  ALL_REGULAR_ITEMS.forEach(n => {
    const qty = parseFloat(sheet.regular?.[n]?.[sh]) || 0;
    const price = parseFloat(prices?.[n]) || 0;
    total += qty * price;
  });
  BUG_ITEMS.forEach(b => {
    const qty = shift==="AM"
      ? (sheet.bugs?.[b.id]?.venteAM || 0)
      : (sheet.bugs?.[b.id]?.ventePM || 0);
    const price = parseFloat(prices?.[b.id]) || 0;
    total += qty * price;
  });
  VIN_ITEMS.forEach(v => {
    const qty = shift==="AM"
      ? (sheet.vins?.[v.id]?.venteAM || 0)
      : (sheet.vins?.[v.id]?.ventePM || 0);
    const price = parseFloat(prices?.[v.id]) || 0;
    total += qty * price;
  });
  // Happy Hour 5-7 : bières vendues à -1$ — déduction du total
  const hhQty = parseFloat(sheet.happyHour?.[shift]) || 0;
  total -= hhQty * 1;
  // Plateaux de shooters : 1 plateau = 10 shooters, -10$ par plateau
  const plateauxQty = parseFloat(sheet.plateauxShooter?.[shift]) || 0;
  total -= plateauxQty * 10;
  // Cocktails: add revenue, but ingredient value was already zeroed out above
  // We need to subtract the ingredient portions counted in regular/bug/vin totals
  // then add cocktail revenue
  const { deductions: cocktailDeductions, revenues: cocktailRevenues } = calcCocktailOffset(sheet, shift, prices);
  total += cocktailRevenues - cocktailDeductions;
  // Custom products
  const customProds = loadCustomProducts();
  customProds.forEach(p => {
    const d = sheet.customProducts?.[p.id];
    const qty = shift === "AM" ? (parseFloat(d?.am)||0) : (parseFloat(d?.pm)||0);
    const price = parseFloat(p.price) || 0;
    total += qty * price;
  });
  return Math.round(total * 100) / 100;
};

// ─── PRICES STORAGE ──────────────────────────────────────────────────────────

// ─── COCKTAIL DEDUCTION HELPER ───────────────────────────────────────────────
// Returns { deductions, revenues, breakdown } for a given shift
// breakdown = [{cocktailName, qty, lines:[{label, unitPrice, qtyPerCocktail, total}]}]
const calcCocktailOffset = (sheet, shift, _prices) => {
  const prices       = loadPrices(); // always use latest saved prices
  const cocktailsList = loadCocktails();
  let deductions = 0;
  let revenues   = 0;
  const breakdown = [];

  cocktailsList.forEach(c => {
    const d = sheet.cocktails?.[c.id];
    const qty = shift === "AM" ? (parseFloat(d?.am)||0) : (parseFloat(d?.pm)||0);
    if (qty === 0) return;

    revenues += qty * (parseFloat(c.price) || 0);

    const lines = [];
    (c.ingredients || []).forEach(ing => {
      let ingPrice = 0;
      let label    = ing.key;
      const ingQty = ing.qty || 1;
      let ingMultiplier = ingQty; // what to multiply by price×qty for deduction

      if (ing.type === "bug") {
        ingPrice = parseFloat(prices[ing.key]) || 0;
        const bugItem = BUG_ITEMS.find(b => b.id === ing.key);
        label = bugItem ? bugItem.label : ing.key;
      } else if (ing.type === "vin") {
        ingPrice = parseFloat(prices[ing.key]) || 0;
        const vinItem = VIN_ITEMS.find(v => v.id === ing.key);
        label = vinItem ? vinItem.label : ing.key;
      } else if (ing.type === "vinier_group") {
        // ing.qty is in ml — convert to verres (1 verre = 250ml)
        const verres = ingQty / 250;
        const VINIER_IDS_MAP = {
          "vinier_blanc": ["vinier_blanc1","vinier_blanc2","vinier_bistro1","vinier_bistro2"],
          "vinier_rouge": ["vinier_rouge1","vinier_rouge2"],
        };
        const ids = VINIER_IDS_MAP[ing.key] || ing.ids || [];
        const pricePerVerre = ids.map(id => parseFloat(prices[id])||0).find(v => v > 0) || 0;
        ingPrice = pricePerVerre; // price per verre
        ingMultiplier = verres;   // multiply by fractional verres
        label = ing.key === "vinier_blanc"
          ? "Vinier Blanc (Cliff 79 ou Bistro)"
          : ing.key === "vinier_rouge"
            ? "Vinier Rouge"
            : ing.key;
      } else if (ing.type === "regular") {
        ingPrice = parseFloat(prices[ing.key]) || 0;
        label = ing.key;
      }

      const lineDeduc = qty * ingMultiplier * ingPrice;
      deductions += lineDeduc;
      lines.push({
        label,
        unitPrice:      ingPrice,
        qtyPerCocktail: ing.type === "vinier_group" ? `${ingQty}ml` : ingQty,
        total:          lineDeduc,
        type:           ing.type,
        ml:             ing.type === "vinier_group" ? ingQty : null,
        verres:         ing.type === "vinier_group" ? ingQty/250 : null,
      });
    });

    breakdown.push({ cocktailName: c.name, qty, lines, revenue: qty * (parseFloat(c.price)||0) });
  });

  return { deductions, revenues, breakdown };
};

const PRICES_KEY          = "prices";
const CUSTOM_PRODUCTS_KEY = "custom_products"; // [{id, name, category, price}]
const COCKTAILS_KEY       = "cocktails_v2";    // [{id, name, price, ingredients:[{type,key,qty}]}]

const loadCustomProducts  = () => load(CUSTOM_PRODUCTS_KEY, []);
const saveCustomProducts  = (list) => save(CUSTOM_PRODUCTS_KEY, list);
const loadCocktails       = () => load(COCKTAILS_KEY, []);
const saveCocktails       = (list) => save(COCKTAILS_KEY, list);

const DEFAULT_PRICES = {
  // Petites bières
  "Petite Coors Original":5,
  "Petite Coors":        5,
  "Petite Bud Light":    5,
  "Petite Bleue":        6.75,
  "Petite Budweiser":    6.75,
  "Petite Export":       6.75,
  "Petite Labatt 50":    6.75,
  "Petite Molson Dry":   6.75,
  "Petite Molson Ultra": 6.75,
  // Grosses bières
  "Grosse Coors":        8.75,
  "Grosse Bud Light":    8.75,
  "Grosse Budweiser":    9.75,
  "Grosse Export":       9.75,
  "Grosse Labatt 50":    9.75,
  "Grosse Molson Dry":   9.75,
  // Autres bières
  "Corona":              9.25,
  "Corona 0 alcool":     7.75,
  "Heineken":            9.25,
  "Heineken Silver":     6,
  "IPA":                 8.75,
  "Rev":                 9.5,
  "Rousse":              8.75,
  "Seltzer":             6.99,
  "Smirnoff Ice":        9.5,
  "Vizzy":               6.99,
  // Autres boissons
  "Red Bull":            6.25,
  "Bout. d'eau":         3.5,
  "Perrier":             3.5,
  "Café":                "",
  "7 Up":                3.5,
  "Coke":                3.5,
  "Ginger Ale":          3.5,
  "Pepsi":               3.5,
  "Pepsi Diet":          3.5,
  "Tonic":               3.5,
  "Soda":                3.5,
  "Virgin Caesar":       "",
  "Jus (toutes sortes)": "",
  // Nourriture
  "Ailes de poulet":     13,
  "Frites":              5.5,
  "Pizza Petite":        3.75,
  "Pizza Grosse":        8.75,
  "Poulet Lanière":      10,
  "Pogo":                2.5,
  "Chips":               2,
  // Bugs / Forts (prix par vente)
  "bug1": 9,   // #1 Fort rég
  "bug2": 9,   // #2 Fort rég
  "bug3": 9.5, // #3 Prémium
  "bug4": 9.5, // #4 De Luxe
  "bug5": 9,   // #5 Vermouth
  "bug6": 8.5, // #6 Liq. Fine
  "bug7": 4.5, // #7 Shooter (0.75 oz)
  "bug8": "",  // #8 1/2 rég#1 (0.5 oz)
  "bug9": "",  // #9 1/2 rég#2 (0.5 oz)
  // Vins (bouteilles = prix bouteille, viniers = prix au verre)
  "moma_rouge":    35,
  "moma_blanc":    32,
  "chianti":       36,
  "voga_blanc":    41,
  "vinier_blanc1": 9.75,
  "vinier_blanc2": 9.75,
  "vinier_rouge1": 9.75,
  "vinier_rouge2": 9.75,
  "vinier_bistro1":9.75,
  "vinier_bistro2":9.75,
  "rhum_bumbu":    10,
};

const emptyPrices = () => {
  const p = {};
  ALL_REGULAR_ITEMS.forEach(n => { p[n] = DEFAULT_PRICES[n] ?? ""; });
  BUG_ITEMS.forEach(b => { p[b.id] = DEFAULT_PRICES[b.id] ?? ""; });
  VIN_ITEMS.forEach(v => { p[v.id] = DEFAULT_PRICES[v.id] ?? ""; });
  return p;
};

const loadPrices  = () => {
  const stored = load(PRICES_KEY, null);
  const base = emptyPrices(); // has defaults
  if (!stored) return base;
  // merge: stored values override defaults, but missing keys get defaults
  return { ...base, ...stored };
};
const savePrices  = (p) => save(PRICES_KEY, p);

// ─── EMPLOYEE TICKET ─────────────────────────────────────────────────────────

function EmployeeTicket({ sheet, shift, employee }) {
  const prices  = loadPrices();
  const sh      = shift.toLowerCase();

  // ── Calculate how many units of each ingredient are used in cocktails ──
  const cocktailsList = loadCocktails();
  const VINIER_IDS = {
    "vinier_blanc": ["vinier_blanc1","vinier_blanc2","vinier_bistro1","vinier_bistro2"],
    "vinier_rouge": ["vinier_rouge1","vinier_rouge2"],
  };

  // Map: key → qty used in cocktails this shift
  const usedInCocktails = {}; // { "bug1": 2, "vinier_blanc1": 1, "Perrier": 3 }
  const cocktailBreakdown = [];

  cocktailsList.forEach(c => {
    const d = sheet.cocktails?.[c.id];
    const qty = shift === "AM" ? (parseFloat(d?.am)||0) : (parseFloat(d?.pm)||0);
    if (qty === 0) return;

    const ingLines = [];
    (c.ingredients || []).forEach(ing => {
      const ingQty = (ing.qty || 1) * qty;
      let ingQtyVerres = 0;
      let keys = [];
      let label = ing.key;

      if (ing.type === "bug") {
        keys = [ing.key];
        label = BUG_ITEMS.find(b => b.id === ing.key)?.label || ing.key;
        // ingQty = number of sales units used
      } else if (ing.type === "vin") {
        keys = [ing.key];
        label = VIN_ITEMS.find(v => v.id === ing.key)?.label || ing.key;
      } else if (ing.type === "vinier_group") {
        keys = VINIER_IDS[ing.key] || [];
        label = ing.key === "vinier_blanc" ? "Vinier Blanc (Cliff 79 ou Bistro)"
              : ing.key === "vinier_rouge"  ? "Vinier Rouge" : ing.key;
        // ing.qty is in ml — convert to verres (1 verre = 250ml) for the ticket
        ingQtyVerres = ((ing.qty || 0) / 250) * qty; // total verres used
      } else if (ing.type === "regular") {
        keys = [ing.key];
        label = ing.key;
      }

      // Distribute used qty across all keys
      if (ing.type === "vinier_group") {
        // Track total verres used — deducted from first available vinier in order
        // Don't divide by keys.length — the total goes to one vinier, not split
        usedInCocktails[`_vinier_group_${ing.key}`] =
          (usedInCocktails[`_vinier_group_${ing.key}`] || 0) + ingQtyVerres;
        ingLines.push({ label, ingQty: `${ing.qty}ml`, ingQtyNum: ingQtyVerres / qty, type: ing.type, keys });
      } else {
        keys.forEach(k => {
          usedInCocktails[k] = (usedInCocktails[k] || 0) + ingQty;
        });
        ingLines.push({ label, ingQty, ingQtyNum: ing.qty || 1, type: ing.type, keys });
      }
    });

    cocktailBreakdown.push({ name: c.name, qty, price: parseFloat(c.price)||0, ingLines });
  });

  // ── Build line items — ingredient lines show "included in cocktail" at 0$ ──
  const lines = [];

  ALL_REGULAR_ITEMS.forEach(name => {
    const qty   = parseFloat(sheet.regular?.[name]?.[sh]) || 0;
    if (qty === 0) return;
    const usedQty = usedInCocktails[name] || 0;
    const billableQty = Math.max(0, qty - usedQty);
    const price = parseFloat(prices[name]) || 0;
    lines.push({
      label: name, qty, price,
      billableQty, usedQty,
      total: billableQty * price,
      type: "regular",
    });
  });

  BUG_ITEMS.forEach(bug => {
    const qty = shift === "AM"
      ? (sheet.bugs?.[bug.id]?.venteAM || 0)
      : (sheet.bugs?.[bug.id]?.ventePM || 0);
    if (qty === 0) return;
    const usedQty = usedInCocktails[bug.id] || 0;
    const billableQty = Math.max(0, qty - usedQty);
    const price = parseFloat(prices[bug.id]) || 0;
    lines.push({
      label: bug.label, qty, price,
      billableQty, usedQty,
      total: billableQty * price,
      type: "bug", oz: bug.oz,
    });
  });

  // Resolve vinier group usage into individual vinier ids (first-available order)
  const VINIER_IDS_ORDER = {
    "vinier_blanc": ["vinier_blanc1","vinier_blanc2","vinier_bistro1","vinier_bistro2"],
    "vinier_rouge": ["vinier_rouge1","vinier_rouge2"],
  };
  Object.entries(VINIER_IDS_ORDER).forEach(([groupKey, ids]) => {
    const totalUsedVerres = usedInCocktails[`_vinier_group_${groupKey}`] || 0;
    if (totalUsedVerres === 0) return;
    let remaining = totalUsedVerres;
    for (const vid of ids) {
      if (remaining <= 0) break;
      const vinQty = shift === "AM"
        ? (sheet.vins?.[vid]?.venteAM || 0)
        : (sheet.vins?.[vid]?.ventePM || 0);
      const deduct = Math.min(vinQty, remaining);
      usedInCocktails[vid] = (usedInCocktails[vid] || 0) + deduct;
      remaining -= deduct;
    }
  });

  VIN_ITEMS.forEach(vin => {
    const qty = shift === "AM"
      ? (sheet.vins?.[vin.id]?.venteAM || 0)
      : (sheet.vins?.[vin.id]?.ventePM || 0);
    if (qty === 0) return;
    const usedQty = usedInCocktails[vin.id] || 0;
    const billableQty = Math.max(0, qty - usedQty);
    const price = parseFloat(prices[vin.id]) || 0;
    lines.push({
      label: vin.label, qty, price,
      billableQty, usedQty,
      total: billableQty * price,
      type: "vin",
    });
  });

  // Cocktail revenue lines
  const cocktailRevenue = cocktailBreakdown.reduce((s, c) => s + c.qty * c.price, 0);

  const subtotal     = lines.reduce((s, l) => s + l.total, 0) + cocktailRevenue;
  const totalQty     = lines.reduce((s, l) => s + l.qty,   0);
  const missingPrice = lines.filter(l => l.billableQty > 0 && l.price === 0);
  const hhQty   = parseFloat(sheet.happyHour?.[shift]) || 0;
  const hhDeduc = hhQty * 1;
  const platQty   = parseFloat(sheet.plateauxShooter?.[shift]) || 0;
  const platDeduc = platQty * 10;
  const finalTotal = Math.round((subtotal - hhDeduc - platDeduc) * 100) / 100;

  // Group by category for display
  const groups = [
    { label:"🍺 Bières",          lines: lines.filter(l => l.type==="regular" && [...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES].includes(l.label)) },
    { label:"🥃 Forts",           lines: lines.filter(l => l.type==="bug") },
    { label:"🍷 Vins & Spiritueux",lines: lines.filter(l => l.type==="vin") },
    { label:"🥤 Autres Boissons",  lines: lines.filter(l => l.type==="regular" && AUTRES_BOISSONS.includes(l.label)) },
    { label:"🍗 Nourriture",       lines: lines.filter(l => l.type==="regular" && NOURRITURE.includes(l.label)) },
  ].filter(g => g.lines.length > 0);

  const nom = shift === "AM" ? sheet.nomAM : sheet.nomPM;

  return (
    <>
      {/* Header */}
      <div style={{background:"var(--card)",border:"1px solid var(--border)",
        borderRadius:10,padding:"16px 20px",marginBottom:14,textAlign:"center"}}>
        <div style={{fontFamily:"var(--font-head)",fontSize:"1.6rem",
          color:"var(--accent)",letterSpacing:".1em"}}>
          LE CLUB DES EX
        </div>
        <div style={{color:"var(--muted)",fontSize:".78rem",marginTop:4,display:"flex",
          gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <span>📅 {sheet.date}</span>
          <span><span className={`badge badge-${sh}`}>{shift}</span></span>
          {nom && <span>👤 {nom}</span>}
        </div>
      </div>

      {lines.length === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:40,fontSize:".88rem"}}>
          Aucune vente pour le shift {shift} pour l'instant.
        </div>
      ) : (<>

        {missingPrice.length > 0 && (
          <div className="warn-banner" style={{marginBottom:14}}>
            <div className="wb-title">⚠ {missingPrice.length} article(s) sans prix — total incomplet</div>
            <div className="wb-item">{missingPrice.map(l=>l.label).join(", ")}</div>
          </div>
        )}

        {/* Line items by group */}
        {groups.map(grp => (
          <div className="card" key={grp.label} style={{marginBottom:10}}>
            <div className="card-header"><h3>{grp.label}</h3></div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th style={{textAlign:"center"}}>Qté</th>
                    <th style={{textAlign:"center"}}>Prix unit.</th>
                    <th style={{textAlign:"right",paddingRight:14}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grp.lines.map((l,i) => (
                    <tr key={i} style={l.usedQty > 0 ? {background:"rgba(59,130,246,.04)"} : {}}>
                      <td className="item-name" style={{fontSize:".84rem"}}>
                        {l.label}
                        {l.oz && <span style={{fontSize:".68rem",color:"var(--muted)",marginLeft:4}}>({l.oz} oz)</span>}
                        {l.usedQty > 0 && (
                          <span style={{fontSize:".68rem",color:"#60a5fa",marginLeft:6,
                            background:"rgba(59,130,246,.1)",borderRadius:4,padding:"1px 5px"}}>
                            🍹 {l.usedQty} cocktail
                          </span>
                        )}
                      </td>
                      <td style={{textAlign:"center"}}>
                        {l.usedQty > 0 ? (
                          <span>
                            <span style={{fontWeight:600}}>{l.qty}</span>
                            {" "}<span style={{fontSize:".72rem",color:"#60a5fa"}}>(-{l.usedQty})</span>
                            {" = "}<span style={{fontWeight:700}}>{l.billableQty}</span>
                          </span>
                        ) : (
                          <span style={{fontWeight:600}}>{l.qty}</span>
                        )}
                      </td>
                      <td style={{textAlign:"center",fontSize:".82rem",
                        color: l.price===0 ? "var(--red)" : "var(--muted)"}}>
                        {l.price===0 ? "—" : `${l.price.toFixed(2)} $`}
                      </td>
                      <td style={{textAlign:"right",paddingRight:14,fontWeight:600,
                        color: l.price===0 ? "var(--muted)" : "var(--text)"}}>
                        {l.price===0 ? "—" : `${l.total.toFixed(2)} $`}
                        {l.usedQty > 0 && l.price > 0 && (
                          <div style={{fontSize:".68rem",color:"#60a5fa"}}>
                            ({l.usedQty} × 0$)
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Group subtotal */}
                  <tr style={{background:"rgba(232,160,32,.04)"}}>
                    <td colSpan={2} style={{fontSize:".76rem",color:"var(--muted)",paddingLeft:14,
                      fontStyle:"italic"}}>
                      Sous-total — {grp.lines.reduce((s,l)=>s+l.billableQty,0)} articles facturés
                    </td>
                    <td/>
                    <td style={{textAlign:"right",paddingRight:14,fontWeight:700,color:"var(--accent)"}}>
                      {grp.lines.reduce((s,l)=>s+l.total,0).toFixed(2)} $
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Grand total */}
        <div style={{background:"var(--card)",border:"2px solid var(--accent)",
          borderRadius:10,padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontFamily:"var(--font-head)",fontSize:"1rem",
                color:"var(--muted)",letterSpacing:".06em"}}>
                SOUS-TOTAL VENTES — SHIFT {shift}
              </div>
              <div style={{fontSize:".75rem",color:"var(--muted)",marginTop:2}}>
                {totalQty} article{totalQty>1?"s":""} vendus
                {missingPrice.length>0 && <span style={{color:"var(--orange)",marginLeft:8}}>⚠ prix manquants</span>}
              </div>
            </div>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.8rem",color:"var(--text)",letterSpacing:".04em"}}>
              {subtotal.toFixed(2)} $
            </div>
          </div>
          {hhQty > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              borderTop:"1px solid var(--border)",marginTop:10,paddingTop:10}}>
              <div style={{fontSize:".82rem",color:"var(--orange)"}}>
                🍻 Happy Hour 5-7 : {hhQty} bière{hhQty>1?"s":""} × -1,00 $
              </div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"var(--orange)"}}>
                -{hhDeduc.toFixed(2)} $
              </div>
            </div>
          )}
          {platQty > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              borderTop:"1px solid var(--border)",marginTop:10,paddingTop:10}}>
              <div style={{fontSize:".82rem",color:"var(--orange)"}}>
                🥃 Plateaux Shooters : {platQty} × -10,00 $
              </div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"var(--orange)"}}>
                -{platDeduc.toFixed(2)} $
              </div>
            </div>
          )}
          {cocktailBreakdown.length > 0 && (
            <div style={{borderTop:"1px solid var(--border)",marginTop:10,paddingTop:10}}>
              <div style={{fontSize:".78rem",color:"#60a5fa",marginBottom:6,fontWeight:600}}>
                🍹 Cocktails vendus (ingrédients facturés à 0$ dans les sections ci-dessus)
              </div>
              {cocktailBreakdown.map((cb, ci) => (
                <div key={ci} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"4px 0"}}>
                  <div style={{fontSize:".84rem",color:"var(--green)"}}>
                    {cb.name} × {cb.qty}
                    <div style={{fontSize:".7rem",color:"var(--muted)"}}>
                      {cb.ingLines.map(il => `${il.label}×${il.ingQty/cb.qty}`).join(" · ")}
                    </div>
                  </div>
                  <div style={{fontWeight:700,color:"var(--green)"}}>
                    +{(cb.qty * cb.price).toFixed(2)} $
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            borderTop:"2px solid var(--accent)",marginTop:10,paddingTop:10}}>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.1rem",color:"var(--accent)",letterSpacing:".06em"}}>
              TOTAL FINAL
            </div>
            <div style={{fontFamily:"var(--font-head)",fontSize:"2.2rem",color:"var(--accent)",letterSpacing:".04em"}}>
              {finalTotal.toFixed(2)} $
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{textAlign:"center",color:"var(--muted)",fontSize:".72rem",
          margin:"14px 0",letterSpacing:".1em"}}>
          — — — — — — — — — —
        </div>

        {/* Quick stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
          {groups.map(grp => {
            const gTotal = grp.lines.reduce((s,l)=>s+l.total,0);
            const gQty   = grp.lines.reduce((s,l)=>s+l.qty,0);
            if (gQty === 0) return null;
            return (
              <div key={grp.label} style={{background:"var(--surface)",
                border:"1px solid var(--border)",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:".72rem",color:"var(--muted)"}}>{grp.label}</div>
                <div style={{fontFamily:"var(--font-head)",fontSize:"1.3rem",color:"var(--accent)"}}>{gTotal.toFixed(2)} $</div>
                <div style={{fontSize:".7rem",color:"var(--muted)"}}>{gQty} articles</div>
              </div>
            );
          })}
        </div>
      </>)}
    </>
  );
}

// ─── EMPLOYEE CAISSE PAGE ────────────────────────────────────────────────────

function EmployeeCaisse({ sheet, setSheet, shift, employee, showToast, prevCaisseTotal }) {
  const prices = loadPrices();
  const c = sheet.caisse?.[shift] || {};
  const [editMode, setEditMode] = useState(false);

  const isSubmitted = !!c.soumiseTs;
  const isLocked = isSubmitted && !editMode;

  const venteCalculee = calcVenteShift(sheet, shift, prices);

  // Source of truth for "Argent machines" — only applies to the AM shift.
  // PM never receives the machines amount (it's already counted once in the AM total).
  const machinesSousResolved = (() => {
    if (shift !== "AM") return "";
    const depotForDate = loadDepot(sheet.date);
    if (depotForDate.caisse !== "" && depotForDate.caisse !== undefined) return depotForDate.caisse;
    return c.machinesSous || "";
  })();

  // Auto-fill argentRecu from previous shift total when empty
  useEffect(() => {
    if (prevCaisseTotal !== "" && prevCaisseTotal !== undefined &&
        (c.argentRecu === "" || c.argentRecu === undefined)) {
      setSheet(s => {
        const caisse = { ...s.caisse };
        caisse[shift] = { ...caisse[shift], argentRecu: String(prevCaisseTotal) };
        return { ...s, caisse };
      });
    }
  }, [prevCaisseTotal]);

  // Keep sheet's machinesSous in sync with the depot for this date (AM only)
  useEffect(() => {
    if (shift === "AM" && machinesSousResolved !== "" &&
        String(c.machinesSous||"") !== String(machinesSousResolved)) {
      setSheet(s => {
        const caisse = { ...s.caisse };
        caisse[shift] = { ...caisse[shift], machinesSous: String(machinesSousResolved) };
        return { ...s, caisse };
      });
    }
  }, [machinesSousResolved]);

  const setC = (field, val) => {
    setSheet(s => {
      const caisse = { ...s.caisse };
      caisse[shift] = { ...caisse[shift], [field]: val };
      const cur = caisse[shift];
      const recu     = parseFloat(cur.argentRecu)      || 0;
      const machines = parseFloat(machinesSousResolved) || 0;
      const coffre   = parseFloat(cur.argentCoffre)    || 0;
      const coupons  = parseFloat(cur.coupons)         || 0;
      const factures = parseFloat(cur.factures)        || 0;
      caisse[shift].venteCalculee = venteCalculee;
      caisse[shift].totalCaisse   = Math.round((recu + machines + coffre - coupons - factures + venteCalculee)*100)/100;
      return { ...s, caisse };
    });
  };

  const handleSubmit = () => {
    setSheet(s => {
      const caisse = { ...s.caisse };
      caisse[shift] = { ...caisse[shift], venteCalculee,
        machinesSous: String(machinesSousResolved||""),
        soumisePar: employee?.name || "—",
        soumiseTs:  new Date().toLocaleString("fr-CA"),
      };
      const cur = caisse[shift];
      caisse[shift].totalCaisse = Math.round((
        (parseFloat(cur.argentRecu)||0) + (parseFloat(machinesSousResolved)||0) +
        (parseFloat(cur.argentCoffre)||0) - (parseFloat(cur.coupons)||0) -
        (parseFloat(cur.factures)||0) + venteCalculee
      )*100)/100;
      return { ...s, caisse };
    });
    setEditMode(false);
    showToast("✅ Caisse soumise!", "ok");
  };

  const handleReopen = () => {
    setEditMode(true);
    showToast("✏️ Mode modification activé", "warn");
  };

  const total = Math.round((
    (parseFloat(c.argentRecu)||0) + (parseFloat(machinesSousResolved)||0) +
    (parseFloat(c.argentCoffre)||0) - (parseFloat(c.coupons)||0) -
    (parseFloat(c.factures)||0) + venteCalculee
  )*100)/100;

  const row = (label, value, field, hint="", readOnly=false) => (
    <div key={field} style={{display:"flex",alignItems:"center",
      justifyContent:"space-between",padding:"10px 0",
      borderBottom:"1px solid var(--border)"}}>
      <div>
        <div style={{fontSize:".88rem",fontWeight:500}}>{label}</div>
        {hint && <div style={{fontSize:".72rem",color:"var(--muted)"}}>{hint}</div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {!isLocked && !readOnly ? (
          <>
            <span style={{color:"var(--muted)"}}>$</span>
            <input type="number" min="0" step="0.01"
              value={value||""} style={{width:110,textAlign:"right"}}
              onChange={e=>setC(field, e.target.value)} />
          </>
        ) : (
          <span style={{fontWeight:600,fontSize:"1rem",
            color: readOnly ? "var(--muted)" : "var(--text)"}}>
            {value !== "" && value !== undefined
              ? `${parseFloat(value)||0} $`
              : <span style={{color:"var(--muted)"}}>—</span>}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{fontFamily:"var(--font-head)",fontSize:"1.2rem",color:"var(--accent)"}}>
          🧾 Caisse — Shift {shift}
        </div>
        {isSubmitted && !editMode && (
          <span style={{background:"rgba(34,197,94,.15)",border:"1px solid var(--green)",
            borderRadius:6,padding:"3px 10px",fontSize:".76rem",color:"var(--green)",fontWeight:600}}>
            ✅ Soumise par {c.soumisePar} — {c.soumiseTs}
          </span>
        )}
        {editMode && (
          <span style={{background:"rgba(249,115,22,.15)",border:"1px solid var(--orange)",
            borderRadius:6,padding:"3px 10px",fontSize:".76rem",color:"var(--orange)",fontWeight:600}}>
            ✏️ Mode modification
          </span>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Détail de la caisse</h3>
          {isSubmitted && !editMode && (
            <button className="btn btn-ghost" style={{marginLeft:"auto",fontSize:".76rem",padding:"4px 12px"}}
              onClick={handleReopen}>✏️ Modifier</button>
          )}
        </div>
        <div className="card-body">
          {row("💵 Argent reçu", c.argentRecu, "argentRecu",
            shift === "PM"
              ? `Report automatique — Total caisse shift AM${sheet.caisse?.AM?.totalCaisse ? ` (${parseFloat(sheet.caisse.AM.totalCaisse).toFixed(2)} $)` : ""}`
              : `Report automatique — Total caisse shift PM de la veille${prevCaisseTotal ? ` (${parseFloat(prevCaisseTotal).toFixed(2)} $)` : ""}`,
            true // toujours en lecture seule — jamais modifiable par la barmaid
          )}

          {shift === "AM" && (
            <div style={{display:"flex",alignItems:"center",
              justifyContent:"space-between",padding:"10px 0",
              borderBottom:"1px solid var(--border)"}}>
              <div>
                <div style={{fontSize:".88rem",fontWeight:500}}>🎰 Argent machines</div>
                <div style={{fontSize:".72rem",color:"var(--orange)"}}>
                  🔒 Entré par la gérante — via page Dépôt du {sheet.date}
                </div>
              </div>
              <span style={{fontWeight:600,color:"var(--muted)"}}>
                {machinesSousResolved !== "" && machinesSousResolved !== undefined
                  ? `${parseFloat(machinesSousResolved)||0} $` : "—"}
              </span>
            </div>
          )}

          {row("🔓 Argent sorti du coffre", c.argentCoffre, "argentCoffre",
            "Montant retiré du coffre-fort")}
          {row("🎟 Coupons (à déduire)", c.coupons, "coupons",
            "Total des coupons / rabais")}
          {row("🧾 Factures (à déduire)", c.factures, "factures",
            "Frais, factures ou dépenses du shift")}

          <div style={{display:"flex",alignItems:"center",
            justifyContent:"space-between",padding:"10px 0",
            borderBottom:"1px solid var(--border)"}}>
            <div>
              <div style={{fontSize:".88rem",fontWeight:500}}>🧮 Ventes calculées</div>
              <div style={{fontSize:".72rem",color:"var(--muted)"}}>
                Calculé automatiquement
                {(parseFloat(sheet.happyHour?.[shift])||0) > 0 && (
                  <span style={{color:"var(--orange)"}}>
                    {" "}— inclut -{(parseFloat(sheet.happyHour[shift])||0).toFixed(2)} $ Happy Hour
                  </span>
                )}
                {(parseFloat(sheet.plateauxShooter?.[shift])||0) > 0 && (
                  <span style={{color:"var(--orange)"}}>
                    {" "}— inclut -{((parseFloat(sheet.plateauxShooter[shift])||0)*10).toFixed(2)} $ Plateaux
                  </span>
                )}
                {(() => {
                  const { deductions, revenues } = calcCocktailOffset(sheet, shift, prices);
                  if (deductions === 0 && revenues === 0) return null;
                  const net = revenues - deductions;
                  return (
                    <span style={{color: net >= 0 ? "var(--green)" : "var(--orange)"}}>
                      {" "}— cocktails : annulation {deductions.toFixed(2)} $ + revenus {revenues.toFixed(2)} $ = net {net >= 0 ? "+" : ""}{net.toFixed(2)} $
                    </span>
                  );
                })()}
              </div>
            </div>
            <span style={{fontWeight:700,color:"var(--accent)",fontSize:"1rem"}}>
              {venteCalculee.toFixed(2)} $
            </span>
          </div>

          <div style={{display:"flex",alignItems:"center",
            justifyContent:"space-between",padding:"14px 0 4px"}}>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.1rem",letterSpacing:".04em"}}>
              TOTAL CAISSE (prochain shift)
            </div>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.8rem",color:"var(--green)"}}>
              {total.toFixed(2)} $
            </div>
          </div>
          <div style={{fontSize:".72rem",color:"var(--muted)",marginBottom:10}}>
            = Reçu + Machines + Coffre − Coupons + Ventes
          </div>

          {!isLocked && (
            <textarea rows={2} value={c.note||""}
              onChange={e=>setC("note",e.target.value)}
              placeholder="Note (optionnel)..."
              style={{resize:"vertical",width:"100%",marginTop:6}} />
          )}
          {isLocked && c.note && (
            <div style={{fontSize:".8rem",color:"var(--muted)",paddingTop:6}}>💬 {c.note}</div>
          )}
        </div>
      </div>

      <div className="btn-row">
        {!isSubmitted || editMode ? (
          <button className="btn btn-green" onClick={handleSubmit}>
            ✅ {editMode ? "Resoumettre la caisse" : "Soumettre ma caisse"}
          </button>
        ) : (
          <div style={{color:"var(--green)",fontSize:".82rem"}}>
            Caisse soumise — utilisez ✏️ Modifier si correction nécessaire.
          </div>
        )}
        {editMode && (
          <button className="btn btn-ghost" onClick={()=>setEditMode(false)}>Annuler</button>
        )}
      </div>
    </>
  );
}

// ─── MANAGER VERIF CAISSE ─────────────────────────────────────────────────────

function ManagerVerifCaisse({ sheet, setSheet, history, setHistory, showToast }) {
  const [viewDate, setViewDate] = useState(TODAY());
  const [editMode, setEditMode] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(true); // today doesn't need unlock
  const [pinInput, setPinInput]   = useState("");
  const [pinErr, setPinErr]       = useState(false);
  const prices = loadPrices();

  const addDays = (ds, n) => {
    const d = new Date(ds+"T12:00:00"); d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  };

  const isToday = viewDate === TODAY();
  const isPast  = viewDate < TODAY();
  const canEdit = isToday || pinUnlocked;

  const loadDate = (date) => {
    setViewDate(date);
    setEditMode(false);
    setPinUnlocked(date === TODAY());
    setPinInput("");
    setPinErr(false);
  };

  const handlePinKey = (k) => {
    if (k === "DEL") { setPinInput(p => p.slice(0,-1)); setPinErr(false); return; }
    const np = pinInput + k;
    setPinInput(np);
    if (np.length === 4) {
      const employees = loadEmployees();
      const ok = np === defaultManagerPin() || employees.some(e => isGerant(e) && e.pin === np);
      if (ok) {
        setPinUnlocked(true); setPinInput(""); setPinErr(false);
        showToast("🔓 Accès autorisé — mode gérant", "ok");
      } else {
        setPinErr(true);
        setTimeout(() => { setPinInput(""); setPinErr(false); }, 700);
      }
    }
  };

  // Find sheet for chosen date
  const chosenSheet = isToday
    ? sheet
    : history.find(d => d.date === viewDate) || null;

  const migrated = chosenSheet ? migrateSheet(chosenSheet) : null;

  // Generic field updater — works for today (live sheet) or past (history array)
  const updateCaisseField = (shift, field, val) => {
    if (!canEdit) {
      showToast("⛔ Code gérant requis pour modifier une date passée", "err");
      return;
    }
    const applyUpdate = (s) => {
      const caisse = { ...s.caisse };
      caisse[shift] = { ...caisse[shift], [field]: val };
      const c = caisse[shift];
      const vente = calcVenteShift(s, shift, prices);
      caisse[shift].venteCalculee = vente;
      caisse[shift].totalCaisse = Math.round((
        (parseFloat(c.argentRecu)||0) +
        (parseFloat(c.machinesSous)||0) +
        (parseFloat(c.argentCoffre)||0) -
        (parseFloat(c.coupons)||0) -
        (parseFloat(c.factures)||0) +
        vente
      )*100)/100;
      return { ...s, caisse };
    };

    if (isToday) {
      setSheet(applyUpdate);
    } else {
      setHistory(h => h.map(d => d.date === viewDate ? applyUpdate(migrateSheet(d)) : d));
    }
    showToast(`✅ Modifié — caisse ${shift} du ${viewDate}`, "ok");
  };

  const shiftCard = (shift) => {
    if (!migrated) return null;
    const c = migrated.caisse?.[shift] || {};
    const vente = calcVenteShift(migrated, shift, prices);
    // AM "machines" always reflects the depot of THIS viewed date (source of truth)
    const depotForViewDate = loadDepot(viewDate);
    const machinesResolved = shift === "AM" && depotForViewDate.caisse !== ""
      ? depotForViewDate.caisse
      : c.machinesSous;
    const recu     = parseFloat(c.argentRecu)    || 0;
    const machines = parseFloat(machinesResolved)  || 0;
    const coffre   = parseFloat(c.argentCoffre)  || 0;
    const coupons  = parseFloat(c.coupons)       || 0;
    const factures = parseFloat(c.factures)      || 0;
    const total    = Math.round((recu + machines + coffre - coupons - factures + vente)*100)/100;
    const diff    = c.soumiseTs ? Math.round((total - (parseFloat(c.totalCaisse)||0))*100)/100 : null;

    const expectedRecu = (() => {
      if (shift === "PM") return migrated.caisse?.AM?.totalCaisse;
      const yesterday = addDays(viewDate, -1);
      const prevSheet = migrateSheet(history.find(d => d.date === yesterday) ||
        (yesterday === addDays(TODAY(),-1) ? load("sheet_"+yesterday, null) : null));
      return prevSheet?.caisse?.PM?.totalCaisse;
    })();
    const recuMismatch = expectedRecu !== undefined && expectedRecu !== "" &&
      c.argentRecu !== "" && Math.abs((parseFloat(c.argentRecu)||0) - (parseFloat(expectedRecu)||0)) > 0.01;

    const editableRow = (label, val, field, hint) => (
      <tr key={field} style={field==="argentRecu" && recuMismatch ? {background:"rgba(239,68,68,.06)"} : {}}>
        <td style={{padding:"8px 16px"}}>
          <div style={{fontSize:".82rem"}}>{label}</div>
          {hint}
        </td>
        <td style={{textAlign:"right",paddingRight:16}}>
          {editMode && canEdit ? (
            <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"flex-end"}}>
              <span style={{color:"var(--muted)",fontSize:".76rem"}}>$</span>
              <input type="number" min="0" step="0.01"
                defaultValue={val||""}
                style={{width:110,textAlign:"right"}}
                onBlur={e=>updateCaisseField(shift, field, e.target.value)}
                placeholder="0.00" />
            </div>
          ) : (
            <span style={{fontWeight:600}}>{(parseFloat(val)||0).toFixed(2)} $</span>
          )}
        </td>
      </tr>
    );

    return (
      <div className="card" key={shift}>
        <div className="card-header">
          <h3>
            <span className={`badge badge-${shift.toLowerCase()}`}>{shift}</span>
            &nbsp; Caisse {shift}
            {shift==="AM" && migrated.nomAM && <span style={{color:"var(--muted)",fontWeight:400,marginLeft:8,fontSize:".85rem"}}>— {migrated.nomAM}</span>}
            {shift==="PM" && migrated.nomPM && <span style={{color:"var(--muted)",fontWeight:400,marginLeft:8,fontSize:".85rem"}}>— {migrated.nomPM}</span>}
          </h3>
          <span style={{marginLeft:"auto",fontSize:".76rem",
            color: c.soumiseTs ? "var(--green)" : "var(--orange)"}}>
            {c.soumiseTs ? `✅ Soumise ${c.soumisePar} · ${c.soumiseTs}` : "⏳ Pas encore soumise"}
          </span>
        </div>
        <div className="card-body" style={{padding:0}}>
          <table>
            <tbody>
              {editableRow("💵 Argent reçu", c.argentRecu, "argentRecu",
                expectedRecu !== undefined && expectedRecu !== "" && (
                  <div style={{fontSize:".7rem",color: recuMismatch ? "var(--red)" : "var(--muted)"}}>
                    {recuMismatch
                      ? `⛔ Attendu : ${parseFloat(expectedRecu).toFixed(2)} $ (total ${shift==="PM"?"shift AM":"PM veille"})`
                      : `✓ Report du ${shift==="PM"?"shift AM":"shift PM veille"}`}
                  </div>
                ))}
              {shift === "AM" && editableRow("🎰 Argent machines", machinesResolved, "machinesSous",
                <div style={{fontSize:".7rem",color:"var(--orange)"}}>🔒 Gérant seul</div>)}
              {editableRow("🔓 Coffre", c.argentCoffre, "argentCoffre", null)}
              {editableRow("🎟 Coupons", c.coupons, "coupons", null)}
              {editableRow("🧾 Factures", c.factures, "factures",
                <div style={{fontSize:".7rem",color:"var(--muted)"}}>Frais / dépenses du shift</div>)}

              <tr>
                <td style={{color:"var(--muted)",fontSize:".82rem",padding:"8px 16px"}}>🧮 Ventes calculées</td>
                <td style={{textAlign:"right",paddingRight:16,fontWeight:600,color:"var(--accent)"}}>{vente.toFixed(2)} $</td>
              </tr>
              {(parseFloat(migrated.happyHour?.[shift])||0) > 0 && (
                <tr style={{background:"rgba(249,115,22,.06)"}}>
                  <td style={{color:"var(--orange)",fontSize:".78rem",padding:"6px 16px"}}>
                    🍻 incl. Happy Hour : {migrated.happyHour[shift]} bières × -1$
                  </td>
                  <td style={{textAlign:"right",paddingRight:16,color:"var(--orange)",fontSize:".82rem"}}>
                    -{(parseFloat(migrated.happyHour[shift])||0).toFixed(2)} $
                  </td>
                </tr>
              )}
              {(parseFloat(migrated.plateauxShooter?.[shift])||0) > 0 && (
                <tr style={{background:"rgba(249,115,22,.06)"}}>
                  <td style={{color:"var(--orange)",fontSize:".78rem",padding:"6px 16px"}}>
                    🥃 incl. Plateaux Shooters : {migrated.plateauxShooter[shift]} × -10$
                  </td>
                  <td style={{textAlign:"right",paddingRight:16,color:"var(--orange)",fontSize:".82rem"}}>
                    -{((parseFloat(migrated.plateauxShooter[shift])||0)*10).toFixed(2)} $
                  </td>
                </tr>
              )}
              <tr style={{background:"rgba(34,197,94,.06)",borderTop:"2px solid var(--border)"}}>
                <td style={{fontFamily:"var(--font-head)",fontSize:"1rem",letterSpacing:".04em",padding:"12px 16px"}}>
                  TOTAL CAISSE
                </td>
                <td style={{textAlign:"right",paddingRight:16,fontFamily:"var(--font-head)",
                  fontSize:"1.4rem",color:"var(--green)"}}>
                  {total.toFixed(2)} $
                </td>
              </tr>
              {diff !== null && Math.abs(diff) > 0.01 && (
                <tr style={{background:"rgba(239,68,68,.08)"}}>
                  <td style={{fontSize:".8rem",color:"var(--red)",padding:"6px 16px"}}>
                    ⚠ Écart avec la soumission barmaid
                  </td>
                  <td style={{textAlign:"right",paddingRight:16,color:"var(--red)",fontWeight:700}}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(2)} $
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {c.note && (
            <div style={{padding:"8px 16px",fontSize:".8rem",color:"var(--muted)",
              borderTop:"1px solid var(--border)"}}>
              💬 {c.note}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Date nav */}
      <div className="card">
        <div className="card-header">
          <button className="btn btn-ghost" style={{padding:"4px 12px"}}
            onClick={()=>loadDate(addDays(viewDate,-1))}>‹</button>
          <h3 style={{flex:1,textAlign:"center"}}>
            📅 {viewDate}
            {isToday && <span style={{fontSize:".72rem",color:"var(--accent)",marginLeft:8}}>Aujourd'hui</span>}
            {isPast && <span style={{fontSize:".72rem",color:"var(--muted)",marginLeft:8}}>Passé</span>}
          </h3>
          <button className="btn btn-ghost" style={{padding:"4px 12px"}}
            onClick={()=>loadDate(addDays(viewDate,1))}
            disabled={viewDate >= TODAY()}>›</button>
        </div>
        <div className="card-body" style={{padding:"8px 16px"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <input type="date" value={viewDate} style={{width:160}}
              max={TODAY()}
              onChange={e=>loadDate(e.target.value)} />
            <button className="btn btn-ghost" style={{fontSize:".78rem",padding:"5px 12px"}}
              onClick={()=>loadDate(TODAY())}>Aujourd'hui</button>
            {migrated && canEdit && (
              <button className={`btn ${editMode?"btn-accent":"btn-ghost"}`}
                style={{fontSize:".78rem",padding:"5px 12px",marginLeft:"auto"}}
                onClick={()=>setEditMode(m=>!m)}>
                {editMode ? "✓ Terminer la modification" : "✏️ Modifier cette caisse"}
              </button>
            )}
          </div>
          {editMode && (
            <div style={{marginTop:8,fontSize:".76rem",color:"var(--orange)"}}>
              ✏️ Mode modification actif — tous les champs sont éditables pour le {viewDate}
            </div>
          )}
          {isPast && pinUnlocked && (
            <div style={{marginTop:8,fontSize:".74rem",color:"#a855f7"}}>
              🔓 Mode gérant — date passée déverrouillée
            </div>
          )}
        </div>
      </div>

      {/* PIN lock for past dates */}
      {isPast && !pinUnlocked && (
        <div className="card">
          <div className="card-header"><h3>🔐 Code Gérant requis</h3></div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"20px 16px"}}>
            <div style={{fontSize:".82rem",color:"var(--muted)",textAlign:"center"}}>
              Entrez le NIP gérant pour modifier la caisse du {viewDate}
            </div>
            <div style={{
              background:"var(--surface)",border:`1px solid ${pinErr?"var(--red)":"var(--border)"}`,
              borderRadius:8,padding:"10px 20px",fontSize:"1.3rem",letterSpacing:".3em",
              textAlign:"center",width:200,minHeight:46,color:pinErr?"var(--red)":"var(--text)"}}>
              {pinInput.replace(/./g,"●")||"_ _ _ _"}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:200}}>
              {["1","2","3","4","5","6","7","8","9","DEL","0","✓"].map(k=>(
                <button key={k} className="pin-key"
                  onClick={()=>k!=="✓"?handlePinKey(k):null}
                  style={["DEL","✓"].includes(k)?{color:"var(--accent)"}:{}}>
                  {k}
                </button>
              ))}
            </div>
            <div style={{fontSize:".72rem",color:"var(--muted)"}}>
              Vous pouvez consulter en lecture seule sans code.
            </div>
          </div>
        </div>
      )}

      {!migrated ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:30}}>
          Aucune donnée pour le {viewDate}.
        </div>
      ) : (<>
        {shiftCard("AM")}
        {shiftCard("PM")}

        {/* Chain: today's PM total → tomorrow's AM received */}
        {migrated.caisse?.PM?.totalCaisse > 0 && (
          <div style={{background:"rgba(232,160,32,.08)",border:"1px solid rgba(232,160,32,.3)",
            borderRadius:8,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:"1.2rem"}}>🔗</span>
            <div>
              <div style={{fontSize:".8rem",fontWeight:600,color:"var(--accent)"}}>
                Caisse transmise au prochain shift
              </div>
              <div style={{fontSize:".76rem",color:"var(--muted)"}}>
                Le shift AM du {addDays(viewDate,1)} devrait recevoir{" "}
                <strong style={{color:"var(--text)"}}>
                  {parseFloat(migrated.caisse.PM.totalCaisse).toFixed(2)} $
                </strong>
              </div>
            </div>
          </div>
        )}
      </>)}
    </>
  );
}

// ─── COMMANDES STORAGE ───────────────────────────────────────────────────────

const COMMANDES_KEY = "commandes";
const loadCommandes = () => load(COMMANDES_KEY, []);
const saveCommandes = (list) => save(COMMANDES_KEY, list);

// All items available to order
const ALL_ORDERABLE = [
  { section:"🍺 Petites Bières",   items: PETITES_BIERES,  type:"regular" },
  { section:"🍺 Grosses Bières",   items: GROSSES_BIERES,  type:"regular" },
  { section:"🍻 Autres Bières",    items: AUTRES_BIERES,   type:"regular" },
  { section:"🥃 Forts (Bugs)",     items: BUG_ITEMS,       type:"bugs"    },
  { section:"🍷 Vins & Spiritueux",items: VIN_ITEMS,       type:"vins"    },
  { section:"🥤 Autres Boissons",  items: AUTRES_BOISSONS, type:"regular" },
  { section:"🍗 Nourriture",       items: NOURRITURE,      type:"regular" },
];

// ─── MANAGER COMMANDES ────────────────────────────────────────────────────────

function ManagerCommandes({ inventory, setInventory, showToast }) {
  const [commandes, setCommandesState] = useState(() => loadCommandes());
  const [view, setView]       = useState("list"); // list | new | detail
  const [detail, setDetail]   = useState(null);
  const [form, setForm]       = useState({ fournisseur:"", date:TODAY(), note:"" });
  const [items, setItems]     = useState({}); // { key: qty }
  const [search, setSearch]   = useState("");

  const persist = (list) => { saveCommandes(list); setCommandesState(list); };

  // Build a flat lookup: key → { label, section, type }
  const itemLookup = {};
  ALL_ORDERABLE.forEach(({ section, items: its, type }) => {
    its.forEach(item => {
      const key   = type === "regular" ? item : item.id;
      const label = type === "regular" ? item : item.label;
      itemLookup[key] = { label, section, type, raw: item };
    });
  });

  const setQty = (key, val) => {
    setItems(prev => {
      const next = { ...prev };
      if (val === "" || parseFloat(val) === 0) delete next[key];
      else next[key] = val;
      return next;
    });
  };

  const totalLines = Object.keys(items).filter(k => parseFloat(items[k]) > 0).length;

  const handleCreate = () => {
    if (!form.fournisseur.trim()) { showToast("⛔ Entrez un fournisseur", "err"); return; }
    if (totalLines === 0) { showToast("⛔ Aucun article ajouté", "err"); return; }
    const newCmd = {
      id: Date.now().toString(),
      fournisseur: form.fournisseur.trim(),
      date: form.date || TODAY(),
      note: form.note,
      items: Object.fromEntries(
        Object.entries(items)
          .filter(([,v]) => parseFloat(v) > 0)
          .map(([k,v]) => [k, parseFloat(v)])
      ),
      statut: "reçue", // reçue | en_attente
      createdAt: new Date().toLocaleString("fr-CA"),
    };
    persist([newCmd, ...commandes]);
    // Apply to inventory immediately if "reçue"
    applyToInventory(newCmd);
    showToast(`✅ Commande de ${newCmd.fournisseur} ajoutée et appliquée à l'inventaire!`, "ok");
    setForm({ fournisseur:"", date:TODAY(), note:"" });
    setItems({});
    setView("list");
  };

  const applyToInventory = (cmd) => {
    setInventory(inv => {
      const next = JSON.parse(JSON.stringify(inv));
      Object.entries(cmd.items).forEach(([key, qty]) => {
        const info = itemLookup[key];
        if (!info) return;
        const section = info.type === "regular" ? "regular" : info.type;
        if (next[section] === undefined) next[section] = {};
        next[section][key] = (parseFloat(next[section][key]) || 0) + qty;
      });
      next.lastUpdated = new Date().toLocaleString("fr-CA");
      return next;
    });
  };

  const handleDelete = (cmd) => {
    if (!window.confirm(`Supprimer la commande de ${cmd.fournisseur} du ${cmd.date} ?`)) return;
    persist(commandes.filter(c => c.id !== cmd.id));
    showToast("🗑 Commande supprimée (inventaire non modifié)", "warn");
  };

  // Filter items by search
  const filteredSections = ALL_ORDERABLE.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      const label = sec.type === "regular" ? item : item.label;
      return !search || label.toLowerCase().includes(search.toLowerCase());
    })
  })).filter(sec => sec.items.length > 0);

  // ── DETAIL VIEW ──
  if (view === "detail" && detail) {
    return (
      <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-ghost" onClick={()=>setView("list")}>← Retour</button>
          <div>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.2rem",color:"var(--accent)"}}>
              📦 {detail.fournisseur}
            </div>
            <div style={{fontSize:".75rem",color:"var(--muted)"}}>
              {detail.date} · Créée le {detail.createdAt}
            </div>
          </div>
          <span style={{marginLeft:"auto",background:"rgba(34,197,94,.15)",
            border:"1px solid var(--green)",borderRadius:6,padding:"3px 10px",
            fontSize:".76rem",color:"var(--green)",fontWeight:600}}>
            ✅ {detail.statut === "reçue" ? "Reçue & appliquée" : "En attente"}
          </span>
        </div>

        <div className="card">
          <div className="card-header"><h3>Articles commandés</h3></div>
          <div className="card-body" style={{padding:0}}>
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Catégorie</th>
                  <th style={{textAlign:"center"}}>Qté reçue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(detail.items).map(([key, qty]) => {
                  const info = itemLookup[key] || { label: key, section:"—" };
                  return (
                    <tr key={key}>
                      <td className="item-name" style={{fontSize:".85rem"}}>{info.label}</td>
                      <td style={{fontSize:".78rem",color:"var(--muted)"}}>{info.section}</td>
                      <td className="total-cell">{qty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {detail.note && (
          <div className="card">
            <div className="card-header"><h3>💬 Note</h3></div>
            <div className="card-body" style={{color:"var(--muted)"}}>{detail.note}</div>
          </div>
        )}
      </>
    );
  }

  // ── NEW ORDER VIEW ──
  if (view === "new") {
    return (
      <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-ghost" onClick={()=>{setView("list");setItems({});setForm({fournisseur:"",date:TODAY(),note:""});}}>
            ← Retour
          </button>
          <div style={{fontFamily:"var(--font-head)",fontSize:"1.2rem",color:"var(--accent)"}}>
            📥 Nouvelle commande
          </div>
          {totalLines > 0 && (
            <span style={{marginLeft:"auto",background:"rgba(232,160,32,.15)",
              border:"1px solid var(--accent)",borderRadius:6,
              padding:"3px 10px",fontSize:".76rem",color:"var(--accent)",fontWeight:600}}>
              {totalLines} article{totalLines>1?"s":""} ajouté{totalLines>1?"s":""}
            </span>
          )}
        </div>

        {/* Form header */}
        <div className="card">
          <div className="card-header"><h3>📋 Informations</h3></div>
          <div className="card-body" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <div style={{flex:2,minWidth:180}}>
              <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Fournisseur *</div>
              <input type="text" value={form.fournisseur}
                placeholder="Ex: Molson, Labatt, Metro..."
                onChange={e=>setForm(f=>({...f,fournisseur:e.target.value}))} />
            </div>
            <div>
              <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Date réception</div>
              <input type="date" value={form.date} style={{width:150}}
                onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            </div>
            <div style={{flex:2,minWidth:180}}>
              <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Note (optionnel)</div>
              <input type="text" value={form.note}
                placeholder="Numéro de bon, remarques..."
                onChange={e=>setForm(f=>({...f,note:e.target.value}))} />
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{marginBottom:12}}>
          <input type="text" value={search}
            placeholder="🔍 Rechercher un article..."
            onChange={e=>setSearch(e.target.value)}
            style={{maxWidth:320}} />
        </div>

        {/* Article sections */}
        {filteredSections.map(({ section, items: its, type }) => (
          <div className="card" key={section}>
            <div className="card-header"><h3>{section}</h3></div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th style={{textAlign:"center",width:140}}>Quantité reçue</th>
                    <th style={{textAlign:"center",width:100}}>En stock</th>
                  </tr>
                </thead>
                <tbody>
                  {its.map(item => {
                    const key     = type === "regular" ? item : item.id;
                    const label   = type === "regular" ? item : item.label;
                    const inStock = type === "regular"
                      ? (inventory.regular?.[key] ?? 0)
                      : type === "bugs"
                        ? (inventory.bugs?.[key] ?? 0)
                        : (inventory.vins?.[key] ?? 0);
                    const qty = items[key] || "";
                    const hasQty = qty !== "" && parseFloat(qty) > 0;
                    return (
                      <tr key={key} style={hasQty ? {background:"rgba(34,197,94,.04)"} : {}}>
                        <td className="item-name" style={{fontSize:".85rem"}}>{label}</td>
                        <td style={{padding:"4px 8px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                            <button style={{background:"var(--surface)",border:"1px solid var(--border)",
                              borderRadius:5,width:28,height:28,cursor:"pointer",fontSize:"1rem",
                              color:"var(--muted)",display:"flex",alignItems:"center",justifyContent:"center"}}
                              onClick={()=>setQty(key, Math.max(0,(parseFloat(qty)||0)-1)||"")}>−</button>
                            <input type="number" min="0" step={type==="bugs"?"0.5":"1"}
                              value={qty}
                              style={{width:70,textAlign:"center",
                                borderColor: hasQty ? "var(--green)" : undefined,
                                fontWeight: hasQty ? 700 : 400}}
                              onChange={e=>setQty(key, e.target.value)} />
                            <button style={{background:"var(--surface)",border:"1px solid var(--border)",
                              borderRadius:5,width:28,height:28,cursor:"pointer",fontSize:"1rem",
                              color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}
                              onClick={()=>setQty(key, (parseFloat(qty)||0)+1)}>+</button>
                          </div>
                        </td>
                        <td style={{textAlign:"center",fontSize:".8rem",
                          color: inStock <= 5 ? "var(--red)" : "var(--muted)"}}>
                          {inStock}{type==="bugs"?" oz":""}
                          {inStock <= 5 && <span style={{fontSize:".68rem",display:"block",color:"var(--red)"}}>⚠ bas</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="btn-row" style={{position:"sticky",bottom:16,background:"var(--bg)",padding:"10px 0"}}>
          <button
            className={`btn ${totalLines === 0 ? "btn-ghost" : "btn-green"}`}
            style={totalLines===0?{opacity:.5,cursor:"not-allowed"}:{}}
            onClick={handleCreate}>
            ✅ Confirmer et ajouter à l'inventaire ({totalLines} article{totalLines>1?"s":""})
          </button>
          <button className="btn btn-ghost" onClick={()=>{setView("list");setItems({});setForm({fournisseur:"",date:TODAY(),note:""});}}>
            Annuler
          </button>
        </div>
      </>
    );
  }

  // ── LIST VIEW ──
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div style={{color:"var(--muted)",fontSize:".8rem"}}>
          {commandes.length} commande{commandes.length>1?"s":""} enregistrée{commandes.length>1?"s":""}
        </div>
        <button className="btn btn-accent" onClick={()=>setView("new")}>
          ➕ Nouvelle commande
        </button>
      </div>

      {commandes.length === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:40,fontSize:".88rem"}}>
          Aucune commande. Cliquez sur "Nouvelle commande" pour en créer une.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {commandes.map(cmd => {
            const nbItems = Object.keys(cmd.items).length;
            return (
              <div key={cmd.id} className="card" style={{marginBottom:0}}>
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:"1rem"}}>{cmd.fournisseur}</span>
                      <span style={{background:"rgba(34,197,94,.15)",border:"1px solid var(--green)",
                        borderRadius:5,padding:"2px 7px",fontSize:".7rem",color:"var(--green)",fontWeight:600}}>
                        ✅ Reçue
                      </span>
                    </div>
                    <div style={{fontSize:".75rem",color:"var(--muted)",marginTop:3,display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span>📅 {cmd.date}</span>
                      <span>📦 {nbItems} article{nbItems>1?"s":""}</span>
                      {cmd.note && <span>💬 {cmd.note}</span>}
                    </div>
                    {/* Quick preview of top items */}
                    <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:4}}>
                      {Object.entries(cmd.items).slice(0,4).map(([k,q])=>(
                        <span key={k} style={{marginRight:10}}>
                          {itemLookup[k]?.label||k} ×{q}
                        </span>
                      ))}
                      {Object.keys(cmd.items).length > 4 && <span>+ {Object.keys(cmd.items).length-4} autres</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-ghost" style={{fontSize:".78rem",padding:"5px 12px"}}
                      onClick={()=>{setDetail(cmd);setView("detail");}}>
                      👁 Détail
                    </button>
                    <button className="btn btn-red" style={{fontSize:".78rem",padding:"5px 12px"}}
                      onClick={()=>handleDelete(cmd)}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── MANAGER PRIX ─────────────────────────────────────────────────────────────

// ─── MANAGER PRODUITS ────────────────────────────────────────────────────────

function ManagerProduits({ showToast, inventory, setInventory }) {
  const [prices, setPricesState]     = useState(() => loadPrices());
  const [customs, setCustomsState]   = useState(() => loadCustomProducts());
  const [subTab, setSubTab]          = useState("prix"); // prix | custom
  const [form, setForm]              = useState({ name:"", category:"boissons", price:"" });
  const [editId, setEditId]          = useState(null);

  const CATEGORIES = [
    { value:"petites_bieres",  label:"🍺 Petites Bières",    targetArray: PETITES_BIERES  },
    { value:"grosses_bieres",  label:"🍺 Grosses Bières",    targetArray: GROSSES_BIERES  },
    { value:"autres_bieres",   label:"🍻 Autres Bières",     targetArray: AUTRES_BIERES   },
    { value:"boissons",        label:"🥤 Autres Boissons",   targetArray: AUTRES_BOISSONS },
    { value:"nourriture",      label:"🍗 Nourriture",        targetArray: NOURRITURE      },
    { value:"autre",           label:"📦 Autre",             targetArray: null            },
  ];

  const setPrice = (key, val) => setPricesState(p => ({ ...p, [key]: val }));

  const handleSavePrices = () => { savePrices(prices); showToast("💾 Prix sauvegardés!", "ok"); };

  const handleAddCustom = () => {
    if (!form.name.trim()) { showToast("⛔ Nom requis", "err"); return; }
    const id = "custom_" + Date.now();
    const newProd = { id, name:form.name.trim(), category:form.category, price:form.price };
    const updated = editId
      ? customs.map(c => c.id===editId ? {...c, ...newProd, id:editId} : c)
      : [...customs, newProd];
    saveCustomProducts(updated);
    setCustomsState(updated);
    // Also add to inventory if new
    if (!editId) {
      setInventory(inv => ({
        ...inv,
        regular: { ...inv.regular, [id]: 0 },
      }));
      // Add default price
      setPricesState(p => ({ ...p, [id]: form.price }));
      savePrices({ ...prices, [id]: form.price });
    } else {
      savePrices({ ...prices, [editId]: form.price });
    }
    setForm({ name:"", category:"boissons", price:"" });
    setEditId(null);
    showToast(editId ? "✅ Produit mis à jour!" : "✅ Produit ajouté à l'inventaire!", "ok");
  };

  const handleDeleteCustom = (prod) => {
    if (!window.confirm(`Supprimer "${prod.name}" ?`)) return;
    const updated = customs.filter(c => c.id !== prod.id);
    saveCustomProducts(updated);
    setCustomsState(updated);
    showToast(`🗑 ${prod.name} supprimé`, "ok");
  };

  const priceSection = (items, label, getKey, getLabel) => (
    <div className="card" key={label}>
      <div className="card-header"><h3>{label}</h3></div>
      <div className="card-body" style={{padding:0}}>
        <table>
          <thead><tr><th>Article</th><th style={{width:130}}>Prix ($)</th></tr></thead>
          <tbody>
            {items.map(item => {
              const key = getKey(item);
              const lbl = getLabel(item);
              return (
                <tr key={key}>
                  <td className="item-name">{lbl}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:"var(--muted)",fontSize:".82rem"}}>$</span>
                      <input type="number" min="0" step="0.25" style={{width:90}}
                        value={prices[key]??""} placeholder="0.00"
                        onChange={e=>setPrice(key,e.target.value)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{v:"prix",l:"💲 Modifier les prix"},{v:"custom",l:"➕ Nouveaux produits"}].map(t=>(
          <button key={t.v} className={`btn ${subTab===t.v?"btn-accent":"btn-ghost"}`}
            onClick={()=>setSubTab(t.v)}>{t.l}</button>
        ))}
      </div>

      {subTab === "prix" && (<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <button className="btn btn-green" onClick={handleSavePrices}>💾 Sauvegarder les prix</button>
        </div>
        {priceSection(PETITES_BIERES,  "🍺 Petites Bières",  n=>n, n=>n)}
        {priceSection(GROSSES_BIERES,  "🍺 Grosses Bières",  n=>n, n=>n)}
        {priceSection(AUTRES_BIERES,   "🍻 Autres Bières",   n=>n, n=>n)}
        {priceSection(BUG_ITEMS,       "🥃 Bouteilles de Fort", b=>b.id, b=>`${b.label} (${b.oz} oz)`)}
        {priceSection(VIN_ITEMS,       "🍷 Vins & Spiritueux",  v=>v.id, v=>v.label)}
        {priceSection(AUTRES_BOISSONS, "🥤 Autres Boissons",    n=>n, n=>n)}
        {priceSection(NOURRITURE,      "🍗 Nourriture",          n=>n, n=>n)}
        {/* Custom products prices */}
        {customs.length > 0 && (
          <div className="card">
            <div className="card-header"><h3>📦 Produits personnalisés</h3></div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead><tr><th>Article</th><th style={{width:130}}>Prix ($)</th></tr></thead>
                <tbody>
                  {customs.map(p => (
                    <tr key={p.id}>
                      <td className="item-name">{p.name}<span style={{fontSize:".7rem",color:"var(--muted)",marginLeft:6}}>{CATEGORIES.find(c=>c.value===p.category)?.label}</span></td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:"var(--muted)",fontSize:".82rem"}}>$</span>
                          <input type="number" min="0" step="0.25" style={{width:90}}
                            value={prices[p.id]??""} placeholder="0.00"
                            onChange={e=>setPrice(p.id,e.target.value)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="btn-row">
          <button className="btn btn-green" onClick={handleSavePrices}>💾 Sauvegarder les prix</button>
        </div>
      </>)}

      {subTab === "custom" && (<>
        {/* Add / Edit form */}
        <div className="card">
          <div className="card-header">
            <h3>{editId ? "✏️ Modifier le produit" : "➕ Nouveau produit"}</h3>
          </div>
          <div className="card-body" style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:2,minWidth:160}}>
              <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>Nom *</div>
              <input type="text" value={form.name} placeholder="Ex: Vodka Red Bull"
                onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            </div>
            <div>
              <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>Catégorie</div>
              <select value={form.category} style={{width:160}}
                onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>Prix ($)</div>
              <input type="number" min="0" step="0.25" value={form.price}
                placeholder="0.00" style={{width:100}}
                onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-accent" onClick={handleAddCustom}>
                {editId ? "💾 Enregistrer" : "➕ Ajouter"}
              </button>
              {editId && <button className="btn btn-ghost" onClick={()=>{setEditId(null);setForm({name:"",category:"boissons",price:""});}}>Annuler</button>}
            </div>
          </div>
          <div style={{padding:"0 16px 12px",fontSize:".74rem",color:"var(--muted)"}}>
            Le produit sera automatiquement ajouté à la feuille de vente des barmaids et à l'inventaire.
          </div>
        </div>

        {/* List */}
        {customs.length === 0 ? (
          <div style={{textAlign:"center",color:"var(--muted)",padding:30}}>
            Aucun produit personnalisé. Ajoutez-en un ci-dessus.
          </div>
        ) : (
          <div className="card">
            <div className="card-header"><h3>📦 Produits personnalisés ({customs.length})</h3></div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th></th></tr></thead>
                <tbody>
                  {customs.map(p=>(
                    <tr key={p.id}>
                      <td className="item-name">{p.name}</td>
                      <td style={{fontSize:".8rem",color:"var(--muted)"}}>{CATEGORIES.find(c=>c.value===p.category)?.label}</td>
                      <td style={{fontWeight:600,color:"var(--accent)"}}>{p.price?`${p.price} $`:"—"}</td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-ghost" style={{fontSize:".72rem",padding:"3px 8px"}}
                            onClick={()=>{setEditId(p.id);setForm({name:p.name,category:p.category,price:p.price});}}>✏️</button>
                          <button className="btn btn-red" style={{fontSize:".72rem",padding:"3px 8px"}}
                            onClick={()=>handleDeleteCustom(p)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>)}
    </>
  );
}

// ─── MANAGER COCKTAILS ────────────────────────────────────────────────────────

function ManagerCocktails({ showToast }) {
  const [cocktails, setCocktailsState] = useState(() => loadCocktails());
  const [view, setView]   = useState("list"); // list | form
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]   = useState({ name:"", price:"", ingredients:[] });
  const [search, setSearch] = useState("");

  const persist = (list) => { saveCocktails(list); setCocktailsState(list); };

  // Grouped vinier items
  const VINIER_GROUPS = [
    { key:"vinier_blanc",  label:"Vinier Blanc (Cliff 79 ou Bistro)", ids:["vinier_blanc1","vinier_blanc2","vinier_bistro1","vinier_bistro2"], unit:"ml" },
    { key:"vinier_rouge",  label:"Vinier Rouge",                      ids:["vinier_rouge1","vinier_rouge2"], unit:"ml" },
  ];

  // 1 verre = 250ml = 250g (grPerVerre)
  const VINIER_ML_PER_VERRE = 250;

  const ALL_INGREDIENTS = [
    { group:"🥃 Forts (Bugs)", items: BUG_ITEMS.map(b=>({ type:"bug", key:b.id, label:b.label, unit:`${b.oz} oz/vente` })) },
    { group:"🍷 Viniers", items: VINIER_GROUPS.map(g=>({ type:"vinier_group", key:g.key, label:g.label, unit:"ml", ids:g.ids })) },
    { group:"🥤 Softs & Boissons", items: AUTRES_BOISSONS.map(n=>({ type:"regular", key:n, label:n, unit:"1 unité" })) },
  ];

  const getIngredientLabel = (ing) => {
    for (const grp of ALL_INGREDIENTS) {
      const found = grp.items.find(i => i.key === ing.key);
      if (found) return found.label;
    }
    return ing.key;
  };

  const addIngredient = (type, key) => {
    if (form.ingredients.find(i => i.key === key)) return;
    // Viniers default to 90ml (un peu moins d'un demi-verre), others to 1
    const defaultQty = type === "vinier_group" ? 90 : 1;
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { type, key, qty: defaultQty }] }));
  };

  const setIngQty = (key, val) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.map(i => i.key===key ? {...i,qty:parseFloat(val)||1} : i) }));
  };

  const removeIngredient = (key) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter(i => i.key!==key) }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { showToast("⛔ Nom requis", "err"); return; }
    if (form.ingredients.length === 0) { showToast("⛔ Au moins 1 ingrédient requis", "err"); return; }
    const cocktail = {
      id: editTarget?.id || "cocktail_"+Date.now(),
      name: form.name.trim(),
      price: form.price,
      ingredients: form.ingredients,
    };
    const updated = editTarget
      ? cocktails.map(c => c.id===editTarget.id ? cocktail : c)
      : [...cocktails, cocktail];
    persist(updated);
    showToast(`✅ Cocktail "${cocktail.name}" sauvegardé!`, "ok");
    setView("list");
    setEditTarget(null);
  };

  const filtered = search
    ? ALL_INGREDIENTS.map(g=>({...g, items:g.items.filter(i=>i.label.toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.items.length>0)
    : ALL_INGREDIENTS;

  if (view === "form") return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button className="btn btn-ghost" onClick={()=>{setView("list");setEditTarget(null);}}>← Retour</button>
        <div style={{fontFamily:"var(--font-head)",fontSize:"1.2rem",color:"var(--accent)"}}>
          {editTarget ? `✏️ Modifier — ${editTarget.name}` : "🍹 Nouveau cocktail"}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>📋 Informations</h3></div>
        <div className="card-body" style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:2,minWidth:200}}>
            <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>Nom du cocktail *</div>
            <input type="text" value={form.name} placeholder="Ex: Mojito, Gin Tonic..."
              onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <div style={{fontSize:".74rem",color:"var(--muted)",marginBottom:4}}>Prix de vente ($)</div>
            <input type="number" min="0" step="0.25" value={form.price}
              placeholder="0.00" style={{width:100}}
              onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
          </div>
        </div>
      </div>

      {/* Selected ingredients */}
      <div className="card">
        <div className="card-header">
          <h3>🧪 Ingrédients de la recette</h3>
          <span style={{marginLeft:"auto",fontSize:".75rem",color:"var(--muted)"}}>
            {form.ingredients.length} ingrédient{form.ingredients.length>1?"s":""}
          </span>
        </div>
        <div className="card-body">
          {form.ingredients.length === 0 ? (
            <div style={{color:"var(--muted)",fontSize:".82rem",textAlign:"center",padding:"10px 0"}}>
              Aucun ingrédient — choisissez ci-dessous
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {form.ingredients.map(ing => {
                const isVinier = ing.type === "vinier_group";
                const verres = isVinier ? (parseFloat(ing.qty)||0) / VINIER_ML_PER_VERRE : null;
                return (
                <div key={ing.key} style={{display:"flex",alignItems:"center",gap:10,
                  background:"var(--surface)",borderRadius:7,padding:"8px 12px",
                  border:"1px solid var(--border)"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:".85rem",fontWeight:500}}>{getIngredientLabel(ing)}</div>
                    {isVinier && verres !== null && (
                      <div style={{fontSize:".7rem",color:"var(--muted)"}}>
                        ≈ {verres.toFixed(2)} verre{verres !== 1 ? "s" : ""} (1 verre = {VINIER_ML_PER_VERRE}ml)
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:".72rem",color:"var(--muted)",minWidth:40}}>
                    {isVinier ? "ml" : ing.type==="bug" ? "oz" : "unité"}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <input type="number"
                      min={isVinier ? "5" : "0.25"}
                      step={isVinier ? "5" : "0.25"}
                      value={ing.qty}
                      style={{width: isVinier ? 80 : 70}}
                      onChange={e=>setIngQty(ing.key,e.target.value)} />
                    <span style={{fontSize:".72rem",color:"var(--muted)"}}>
                      {isVinier ? "ml" : ing.type==="bug" ? "oz" : "×"}
                    </span>
                  </div>
                  <button style={{background:"none",border:"none",color:"var(--red)",
                    cursor:"pointer",fontSize:"1rem",padding:"2px 6px"}}
                    onClick={()=>removeIngredient(ing.key)}>✕</button>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ingredient picker */}
      <div className="card">
        <div className="card-header"><h3>➕ Ajouter un ingrédient</h3></div>
        <div className="card-body">
          <input type="text" value={search} placeholder="🔍 Rechercher..."
            style={{marginBottom:12,maxWidth:280}}
            onChange={e=>setSearch(e.target.value)} />
          {filtered.map(grp => (
            <div key={grp.group} style={{marginBottom:12}}>
              <div style={{fontSize:".72rem",color:"var(--muted)",fontWeight:600,
                textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>
                {grp.group}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {grp.items.map(item => {
                  const already = form.ingredients.find(i=>i.key===item.key);
                  return (
                    <button key={item.key}
                      onClick={()=>!already && addIngredient(item.type, item.key)}
                      style={{padding:"4px 10px",borderRadius:99,fontSize:".76rem",
                        cursor:already?"default":"pointer",
                        background: already?"rgba(34,197,94,.15)":"var(--surface)",
                        color: already?"var(--green)":"var(--text)",
                        border:`1px solid ${already?"var(--green)":"var(--border)"}`}}>
                      {item.label} {already?"✓":""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-green" onClick={handleSave}>💾 Sauvegarder le cocktail</button>
        <button className="btn btn-ghost" onClick={()=>{setView("list");setEditTarget(null);}}>Annuler</button>
      </div>
    </>
  );

  // LIST VIEW
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:"var(--muted)",fontSize:".8rem"}}>
          {cocktails.length} cocktail{cocktails.length>1?"s":""} · Les ingrédients sont déduits automatiquement de l'inventaire
        </div>
        <button className="btn btn-accent" onClick={()=>{setForm({name:"",price:"",ingredients:[]});setView("form");}}>
          🍹 Nouveau cocktail
        </button>
      </div>

      {cocktails.length === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:40}}>
          Aucun cocktail. Créez-en un pour que les barmaids puissent le saisir.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {cocktails.map(c => (
            <div key={c.id} className="card" style={{marginBottom:0}}>
              <div className="card-header">
                <h3>🍹 {c.name}</h3>
                <span style={{marginLeft:8,color:"var(--accent)",fontSize:".88rem",fontWeight:600}}>
                  {c.price?`${c.price} $`:"—"}
                </span>
                <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                  <button className="btn btn-ghost" style={{fontSize:".76rem",padding:"4px 10px"}}
                    onClick={()=>{setEditTarget(c);setForm({name:c.name,price:c.price,ingredients:[...c.ingredients]});setView("form");}}>
                    ✏️ Modifier
                  </button>
                  <button className="btn btn-red" style={{fontSize:".76rem",padding:"4px 10px"}}
                    onClick={()=>{if(window.confirm(`Supprimer "${c.name}" ?`)){persist(cocktails.filter(x=>x.id!==c.id));showToast(`🗑 ${c.name} supprimé`,"ok");}}}>
                    🗑
                  </button>
                </div>
              </div>
              <div className="card-body" style={{padding:"8px 16px"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(c.ingredients||[]).map(ing=>(
                    <span key={ing.key} style={{padding:"3px 10px",borderRadius:99,fontSize:".76rem",
                      background:"rgba(232,160,32,.12)",color:"var(--accent)",
                      border:"1px solid rgba(232,160,32,.3)"}}>
                      {getIngredientLabel(ing)} {ing.type==="vinier_group" ? `${ing.qty}ml` : `× ${ing.qty}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── MANAGER CAISSE ───────────────────────────────────────────────────────────

function ManagerCaisse({ history, today }) {
  const [period, setPeriod] = useState("day");
  const [customDate, setCustomDate] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo,   setCustomTo]   = useState(today);

  const prices = loadPrices();

  const addDays = (ds, n) => {
    const d = new Date(ds+"T12:00:00"); d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  };
  const getMonday = (ds) => {
    const d = new Date(ds+"T12:00:00");
    const day = d.getDay();
    const diff = day===0?-6:1-day;
    d.setDate(d.getDate()+diff);
    return d.toISOString().slice(0,10);
  };

  // Determine date range
  let from, to, label;
  if (period === "day") {
    from = to = customDate;
    label = customDate;
  } else if (period === "week") {
    from = getMonday(today);
    to   = addDays(from, 6);
    label = `${from} → ${to}`;
  } else if (period === "month") {
    from = today.slice(0,7)+"-01";
    const lastDay = new Date(parseInt(today.slice(0,4)), parseInt(today.slice(5,7)), 0).getDate();
    to   = today.slice(0,7)+"-"+String(lastDay).padStart(2,"0");
    label = today.slice(0,7);
  } else {
    from = customFrom;
    to   = customTo;
    label = `${from} → ${to}`;
  }

  const days = history.filter(d => d.date >= from && d.date <= to);

  // Build line items
  const lines = [];

  const addLines = (items, getKey, getLabel, getTotal) => {
    items.forEach(item => {
      const key   = getKey(item);
      const lbl   = getLabel(item);
      const total = days.reduce((s, d) => s + getTotal(d, item), 0);
      const price = parseFloat(prices[key]) || 0;
      const rev   = total * price;
      if (total > 0) lines.push({ category: lbl, key, label: lbl, qty: total, price, revenue: rev });
    });
  };

  const regTotal  = (day, name) => day.regular?.[name]?.total || 0;
  const bugTotal  = (day, bug)  => (day.bugs?.[bug.id]?.venteAM||0) + (day.bugs?.[bug.id]?.ventePM||0);
  const vinTotal  = (day, vin)  => (day.vins?.[vin.id]?.venteAM||0) + (day.vins?.[vin.id]?.ventePM||0);

  addLines(PETITES_BIERES,  n=>n,    n=>n,    regTotal);
  addLines(GROSSES_BIERES,  n=>n,    n=>n,    regTotal);
  addLines(AUTRES_BIERES,   n=>n,    n=>n,    regTotal);
  addLines(BUG_ITEMS,       b=>b.id, b=>b.label, bugTotal);
  addLines(VIN_ITEMS,       v=>v.id, v=>v.label, vinTotal);
  addLines(AUTRES_BOISSONS, n=>n,    n=>n,    regTotal);
  addLines(NOURRITURE,      n=>n,    n=>n,    regTotal);

  const totalRevenue = lines.reduce((s, l) => s + l.revenue, 0);
  const totalQty     = lines.reduce((s, l) => s + l.qty, 0);
  const missingPrice = lines.filter(l => l.price === 0);

  // Group by category
  const CATEGORY_ORDER = [
    { key:"bieres",    label:"🍺 Bières",          items:[...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES].map(n=>({id:n})) },
    { key:"forts",     label:"🥃 Forts",            items:BUG_ITEMS },
    { key:"vins",      label:"🍷 Vins & Spiritueux", items:VIN_ITEMS },
    { key:"boissons",  label:"🥤 Autres Boissons",   items:AUTRES_BOISSONS.map(n=>({id:n})) },
    { key:"nourriture",label:"🍗 Nourriture",        items:NOURRITURE.map(n=>({id:n})) },
  ];

  const linesByKey = {};
  lines.forEach(l => { linesByKey[l.key] = l; });

  return (
    <>
      {/* Period selector */}
      <div className="card">
        <div className="card-header"><h3>🧾 Rapport de Caisse</h3></div>
        <div className="card-body">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {[
              {v:"day",   l:"Journée"},
              {v:"week",  l:"Semaine en cours"},
              {v:"month", l:"Mois en cours"},
              {v:"custom",l:"Période custom"},
            ].map(p => (
              <button key={p.v}
                className={`period-btn ${period===p.v?"active":""}`}
                onClick={()=>setPeriod(p.v)}>
                {p.l}
              </button>
            ))}
          </div>

          {period === "day" && (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <label style={{fontSize:".78rem",color:"var(--muted)"}}>Date :</label>
              <input type="date" value={customDate} style={{width:160}}
                onChange={e=>setCustomDate(e.target.value)} />
            </div>
          )}
          {period === "custom" && (
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <label style={{fontSize:".78rem",color:"var(--muted)"}}>Du :</label>
              <input type="date" value={customFrom} style={{width:160}}
                onChange={e=>setCustomFrom(e.target.value)} />
              <label style={{fontSize:".78rem",color:"var(--muted)"}}>Au :</label>
              <input type="date" value={customTo} style={{width:160}}
                onChange={e=>setCustomTo(e.target.value)} />
            </div>
          )}

          <div style={{marginTop:12,fontSize:".78rem",color:"var(--muted)"}}>
            Période : <strong style={{color:"var(--text)"}}>{label}</strong>
            &nbsp;·&nbsp; {days.length} journée{days.length!==1?"s":""} · {totalQty} articles vendus
          </div>
        </div>
      </div>

      {missingPrice.length > 0 && (
        <div className="warn-banner">
          <div className="wb-title">⚠ {missingPrice.length} article(s) sans prix — revenus incomplets</div>
          <div className="wb-item">
            {missingPrice.map(l=>l.label).join(", ")}
          </div>
          <div style={{fontSize:".74rem",color:"var(--orange)",marginTop:4}}>
            → Allez dans l'onglet 💲 Prix pour les configurer.
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:30}}>
          Aucune donnée pour cette période.
        </div>
      ) : (<>

        {/* Summary cards */}
        <div className="stat-grid" style={{marginBottom:16}}>
          <div className="stat-card" style={{gridColumn:"span 2"}}>
            <div className="stat-num" style={{fontSize:"2.2rem",color:"var(--green)"}}>
              {totalRevenue.toFixed(2)} $
            </div>
            <div className="stat-lbl">Revenu total estimé</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{totalQty}</div>
            <div className="stat-lbl">Articles vendus</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{days.length}</div>
            <div className="stat-lbl">Journée{days.length>1?"s":""}</div>
          </div>
        </div>

        {/* Detailed table by category */}
        {CATEGORY_ORDER.map(cat => {
          const catLines = cat.items
            .map(item => linesByKey[item.id || item])
            .filter(Boolean);
          if (!catLines.length) return null;
          const catRev = catLines.reduce((s,l)=>s+l.revenue,0);
          const catQty = catLines.reduce((s,l)=>s+l.qty,0);
          return (
            <div className="card" key={cat.key}>
              <div className="card-header">
                <h3>{cat.label}</h3>
                <span style={{marginLeft:"auto",display:"flex",gap:16,alignItems:"center"}}>
                  <span style={{fontSize:".78rem",color:"var(--muted)"}}>{catQty} vendus</span>
                  <span style={{fontSize:".9rem",fontWeight:700,color:"var(--green)"}}>
                    {catRev.toFixed(2)} $
                  </span>
                </span>
              </div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th style={{textAlign:"center"}}>Qté</th>
                      <th style={{textAlign:"center"}}>Prix unit.</th>
                      <th style={{textAlign:"right",paddingRight:12}}>Revenu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catLines.map(l => (
                      <tr key={l.key}>
                        <td className="item-name" style={{fontSize:".82rem"}}>{l.label}</td>
                        <td style={{textAlign:"center"}}>{l.qty}</td>
                        <td style={{textAlign:"center",color: l.price===0?"var(--red)":"var(--muted)",fontSize:".8rem"}}>
                          {l.price===0
                            ? <span style={{color:"var(--red)"}}>— prix manquant</span>
                            : `${l.price.toFixed(2)} $`
                          }
                        </td>
                        <td style={{textAlign:"right",paddingRight:12,fontWeight:600,
                          color: l.price===0?"var(--muted)":"var(--green)"}}>
                          {l.price===0 ? "—" : `${l.revenue.toFixed(2)} $`}
                        </td>
                      </tr>
                    ))}
                    {/* Category subtotal */}
                    <tr style={{background:"rgba(34,197,94,.05)",borderTop:"1px solid var(--border)"}}>
                      <td colSpan={2} style={{fontWeight:700,fontSize:".8rem",color:"var(--muted)",paddingLeft:16}}>
                        Sous-total {cat.label}
                      </td>
                      <td />
                      <td style={{textAlign:"right",paddingRight:12,fontWeight:700,color:"var(--green)"}}>
                        {catRev.toFixed(2)} $
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Grand total */}
        <div style={{
          background:"var(--surface)",border:"2px solid var(--green)",
          borderRadius:10,padding:"16px 20px",marginTop:8,
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.1rem",color:"var(--muted)",letterSpacing:".06em"}}>
              TOTAL CAISSE
            </div>
            <div style={{fontSize:".75rem",color:"var(--muted)"}}>
              {label} · {totalQty} articles
              {missingPrice.length>0 && <span style={{color:"var(--orange)"}}> · ⚠ {missingPrice.length} prix manquants</span>}
            </div>
          </div>
          <div style={{fontFamily:"var(--font-head)",fontSize:"2.4rem",color:"var(--green)",letterSpacing:".04em"}}>
            {totalRevenue.toFixed(2)} $
          </div>
        </div>
      </>)}
    </>
  );
}

function ManagerToday({ sheet, prevFinsPM, onApply, anomalies }) {
  const interErrors = anomalies.filter(a=>a.scope==="INTER-JOURNÉES");
  const intraErrors = anomalies.filter(a=>a.scope==="MÊME JOURNÉE");

  const regSection = (items, label) => (
    <div className="card" key={label}>
      <div className="card-header"><h3>{label}</h3></div>
      <div className="card-body" style={{padding:0}}>
        <table>
          <thead><tr>
            <th>Article</th>
            <th><span className="badge badge-am">AM</span></th>
            <th><span className="badge badge-pm">PM</span></th>
            <th><span className="badge badge-total">TOTAL</span></th>
          </tr></thead>
          <tbody>
            {items.map(n=>(
              <tr key={n}>
                <td className="item-name">{n}</td>
                <td style={{textAlign:"center"}}>{sheet.regular[n]?.am||0}</td>
                <td style={{textAlign:"center"}}>{sheet.regular[n]?.pm||0}</td>
                <td className="total-cell">{sheet.regular[n]?.total||0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      {interErrors.length > 0 && (
        <div className="warn-banner">
          <div className="wb-title">⚠ {interErrors.length} erreur(s) inter-journées (Début AM ≠ Fin PM veille)</div>
          {interErrors.map((a,i)=>(
            <div className="wb-item" key={i}><strong>{a.item}</strong> — {a.detail}</div>
          ))}
        </div>
      )}
      {intraErrors.length > 0 && (
        <div className="error-banner">
          <div className="eb-title">⛔ {intraErrors.length} erreur(s) même journée (Début PM ≠ Fin AM)</div>
          {intraErrors.map((a,i)=>(
            <div className="eb-item" key={i}><strong>{a.item}</strong> — {a.detail}</div>
          ))}
        </div>
      )}

      <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,
        padding:12,marginBottom:14,display:"flex",gap:20,flexWrap:"wrap"}}>
        <div><div style={{fontSize:".73rem",color:"var(--muted)"}}>NOM AM</div>
          <div style={{fontWeight:600}}>{sheet.nomAM||"—"}</div></div>
        <div><div style={{fontSize:".73rem",color:"var(--muted)"}}>NOM PM</div>
          <div style={{fontWeight:600}}>{sheet.nomPM||"—"}</div></div>
        {prevFinsPM && (
          <div style={{marginLeft:"auto"}}>
            <div style={{fontSize:".73rem",color:"var(--muted)"}}>Suivi depuis</div>
            <div style={{fontWeight:600,color:"var(--orange)"}}>{prevFinsPM.date}</div>
          </div>
        )}
      </div>

      {regSection(PETITES_BIERES,"🍺 Petites Bières")}
      {regSection(GROSSES_BIERES,"🍺 Grosses Bières")}
      {regSection(AUTRES_BIERES, "🍻 Autres Bières")}

      {/* Bugs table with continuity columns */}
      {[
        { title:"🥃 Bouteilles de Fort (Bugs)", items:BUG_ITEMS, col:"bugs", showOz:true },
        { title:"🍷 Vins & Spiritueux",          items:VIN_ITEMS, col:"vins", showOz:false },
      ].map(({ title, items, col, showOz }) => {
        const totalOzToday = showOz
          ? BUG_ITEMS.reduce((s,b)=>{
              const tot = (sheet.bugs[b.id]?.venteAM||0)+(sheet.bugs[b.id]?.ventePM||0);
              return s + tot*(b.oz||1);
            },0)
          : 0;
        return (
        <div className="card" key={title}>
          <div className="card-header">
            <h3>{title}</h3>
            {showOz && totalOzToday > 0 && (
              <span style={{marginLeft:"auto",fontSize:".78rem",color:"var(--accent)",fontWeight:700}}>
                −{totalOzToday.toFixed(2)} oz à déduire
              </span>
            )}
          </div>
          <div className="card-body" style={{padding:0}}>
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Début AM</th><th>Fin AM</th>
                  <th>Début PM</th><th>Fin PM</th>
                  <th>Vente AM</th><th>Vente PM</th>
                  <th><span className="badge badge-total">Total</span></th>
                  {showOz && <th style={{color:"var(--accent)"}}>Onces</th>}
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const d = sheet[col][item.id] || {};
                  const finAM   = d.finAM   !== "" ? parseFloat(d.finAM)   : null;
                  const debutPM = d.debutPM !== "" ? parseFloat(d.debutPM) : null;
                  const debutAM = d.debutAM !== "" ? parseFloat(d.debutAM) : null;
                  const prevFin = prevFinsPM?.[col]?.[item.id];
                  const prevFinN = (prevFin !== undefined && prevFin !== "") ? parseFloat(prevFin) : null;
                  const intraErr = finAM!==null && debutPM!==null && debutPM!==finAM;
                  const interErr = prevFinN!==null && debutAM!==null && debutAM!==prevFinN;
                  const total = (d.venteAM||0)+(d.ventePM||0);
                  const repls = d.remplacements||[];
                  const oz = showOz ? (total * (item.oz||1)).toFixed(2) : null;
                  return (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="item-name">
                          {item.label}
                          {repls.length>0 && <span style={{color:"var(--accent)",fontSize:".68rem",marginLeft:4}}>🔄×{repls.length}</span>}
                        </td>
                        <td style={{textAlign:"center",color:interErr?"var(--orange)":"inherit"}}>{d.debutAM||"—"}</td>
                        <td style={{textAlign:"center"}}>{d.finAM||"—"}</td>
                        <td style={{textAlign:"center",color:intraErr?"var(--red)":"inherit"}}>{d.debutPM||"—"}</td>
                        <td style={{textAlign:"center"}}>{d.finPM||"—"}</td>
                        <td style={{textAlign:"center"}}>{d.venteAM||0}</td>
                        <td style={{textAlign:"center"}}>{d.ventePM||0}</td>
                        <td className="total-cell">{total}</td>
                        {showOz && <td style={{textAlign:"center",color:"var(--accent)",fontWeight:600,fontSize:".8rem"}}>{oz} oz</td>}
                        <td style={{textAlign:"center",fontSize:".75rem"}}>
                          {intraErr
                            ? <span style={{color:"var(--red)",fontWeight:700}}>⛔ PM</span>
                            : interErr
                              ? <span style={{color:"var(--orange)",fontWeight:700}}>⚠ AM</span>
                              : <span style={{color:"var(--green)"}}>✓</span>
                          }
                        </td>
                      </tr>
                      {repls.map((r,i)=>(
                        <tr key={item.id+"_r"+i} style={{background:"rgba(232,160,32,.05)"}}>
                          <td colSpan={showOz?10:9} style={{fontSize:".72rem",color:"var(--accent)",paddingLeft:18}}>
                            &nbsp;&nbsp;🔄 Remplacement {i+1} · {r.ts} (shift {r.shift}) — {r.avant}g → {r.apres}g · par {r.par}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {showOz && totalOzToday > 0 && (
                  <tr style={{background:"rgba(232,160,32,.07)"}}>
                    <td colSpan={8} style={{textAlign:"right",fontWeight:700,fontSize:".8rem",color:"var(--muted)"}}>
                      Total onces à déduire →
                    </td>
                    <td style={{textAlign:"center",fontWeight:700,color:"var(--accent)"}}>{totalOzToday.toFixed(2)} oz</td>
                    <td/>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        );
      })}

      {regSection(AUTRES_BOISSONS,"🥤 Autres Boissons")}
      {regSection(NOURRITURE,"🍗 Nourriture")}

      {sheet.commentaire && (
        <div className="card">
          <div className="card-header"><h3>💬 Commentaire</h3></div>
          <div className="card-body" style={{color:"var(--muted)"}}>{sheet.commentaire}</div>
        </div>
      )}

      <div className="btn-row">
        <button className={`btn ${anomalies.length>0?"btn-ghost":"btn-accent"}`}
          onClick={onApply}
          style={anomalies.length>0?{opacity:.45,cursor:"not-allowed"}:{}}>
          ⬇️ Déduire de l'inventaire arrière
        </button>
        {anomalies.length>0 && (
          <span style={{color:"var(--red)",fontSize:".79rem"}}>
            ⛔ Résolvez les {anomalies.length} anomalie(s) d'abord
          </span>
        )}
      </div>
    </>
  );
}

function ManagerAnomalies({ anomalies }) {
  const inter = anomalies.filter(a=>a.scope==="INTER-JOURNÉES");
  const intra = anomalies.filter(a=>a.scope==="MÊME JOURNÉE");
  return (
    <>
      {anomalies.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{textAlign:"center",padding:30,color:"var(--green)",fontWeight:600}}>
            ✅ Aucune anomalie — tout est en ordre.
          </div>
        </div>
      ) : (<>
        {inter.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>⚠ Erreurs Inter-Journées</h3>
              <span style={{marginLeft:"auto",color:"var(--orange)",fontSize:".8rem"}}>{inter.length} problème(s)</span>
            </div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead><tr><th>Heure</th><th>Article</th><th>Détail</th></tr></thead>
                <tbody>
                  {inter.map((a,i)=>(
                    <tr key={i}>
                      <td style={{color:"var(--muted)",fontSize:".78rem"}}>{a.ts}</td>
                      <td style={{fontWeight:600}}>{a.item}</td>
                      <td style={{color:"var(--orange)",fontSize:".8rem"}}>{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {intra.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>⛔ Erreurs Même Journée</h3>
              <span style={{marginLeft:"auto",color:"var(--red)",fontSize:".8rem"}}>{intra.length} problème(s)</span>
            </div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead><tr><th>Heure</th><th>Article</th><th>Détail</th></tr></thead>
                <tbody>
                  {intra.map((a,i)=>(
                    <tr key={i}>
                      <td style={{color:"var(--muted)",fontSize:".78rem"}}>{a.ts}</td>
                      <td style={{fontWeight:600}}>{a.item}</td>
                      <td style={{color:"var(--red)",fontSize:".8rem"}}>{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>)}
    </>
  );
}

function ManagerInventory({ inventory, setInventory, showToast }) {
  const LOW = 5;

  // Generic setter for regular/vins (integer units)
  const setQty = (section, key, val) => {
    setInventory(inv => ({
      ...inv,
      [section]: { ...inv[section], [key]: Math.max(0, parseFloat(val)||0) }
    }));
  };

  // Ounce totals from today's bug inventory value
  const totalOzStock = BUG_ITEMS.reduce((s,b) => s + (inventory.bugs?.[b.id]||0), 0);

  // Regular invSection (non-bug)
  const invSection = (items, section) => (
    <div className="inv-grid" style={{marginBottom:14}}>
      {items.map(item => {
        const key = typeof item==="string"?item:item.id;
        const label = typeof item==="string"?item:item.label;
        const qty = inventory[section]?.[key]??0;
        const low = qty<=LOW;
        return (
          <div className={`inv-item ${low?"low":""}`} key={key}>
            <div>
              <div style={{fontSize:".79rem",color:low?"var(--red)":"var(--text)",fontWeight:500}}>{label}</div>
              {low && <div style={{fontSize:".65rem",color:"var(--red)"}}>⚠ Stock bas</div>}
            </div>
            <input type="number" min="0" value={qty} style={{width:60}}
              onChange={e=>setQty(section,key,e.target.value)} />
          </div>
        );
      })}
    </div>
  );

  // Bug inventory section — in OUNCES per bug type
  const bugInvSection = () => {
    // Group: #1-6 (1 oz each), #7 (0.75 oz), #8-9 (0.5 oz)
    const groups = [
      { label:"Forts 1 oz (#1 à #6)", items: BUG_ITEMS.filter(b=>b.oz===1),    ozEach:1    },
      { label:"Shooter 0.75 oz (#7)", items: BUG_ITEMS.filter(b=>b.oz===0.75), ozEach:0.75 },
      { label:"Demi 0.5 oz (#8 #9)",  items: BUG_ITEMS.filter(b=>b.oz===0.5),  ozEach:0.5  },
    ];
    return (
      <div style={{marginBottom:14}}>
        {/* Summary banner */}
        <div style={{background:"rgba(232,160,32,.08)",border:"1px solid rgba(232,160,32,.3)",
          borderRadius:8,padding:"10px 14px",marginBottom:12,
          display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
          <div>
            <div style={{fontSize:".72rem",color:"var(--muted)"}}>Stock total en onces</div>
            <div style={{fontSize:"1.5rem",fontWeight:700,color:"var(--accent)",fontFamily:"var(--font-head)"}}>
              {totalOzStock.toFixed(2)} oz
            </div>
          </div>
          <div style={{fontSize:".75rem",color:"var(--muted)",flex:1}}>
            L'inventaire des forts est géré en <strong style={{color:"var(--text)"}}>onces</strong>.<br/>
            #1–6 = 1 oz · #7 = 0.75 oz · #8–9 = 0.5 oz par vente
          </div>
        </div>

        {/* Per-group oz inputs */}
        {groups.map(grp => (
          <div key={grp.label} style={{marginBottom:10}}>
            <div style={{fontSize:".72rem",color:"var(--muted)",marginBottom:6,
              textTransform:"uppercase",letterSpacing:".06em",fontWeight:600}}>
              {grp.label}
            </div>
            <div className="inv-grid">
              {grp.items.map(bug => {
                const oz = inventory.bugs?.[bug.id]??0;
                const low = oz <= LOW;
                return (
                  <div className={`inv-item ${low?"low":""}`} key={bug.id}>
                    <div>
                      <div style={{fontSize:".79rem",color:low?"var(--red)":"var(--text)",fontWeight:500}}>
                        {bug.label}
                      </div>
                      <div style={{fontSize:".66rem",color:"var(--muted)"}}>{bug.oz} oz/vente</div>
                      {low && <div style={{fontSize:".65rem",color:"var(--red)"}}>⚠ Stock bas</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                      <input type="number" min="0" step="0.5" value={oz} style={{width:70}}
                        onChange={e=>setQty("bugs",bug.id,e.target.value)} />
                      <div style={{fontSize:".64rem",color:"var(--muted)"}}>oz</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{color:"var(--muted)",fontSize:".79rem"}}>
          {inventory.lastUpdated ? `Dernière MàJ : ${inventory.lastUpdated}` : "Pas encore mis à jour"}
        </div>
        <button className="btn btn-green" onClick={()=>showToast("💾 Inventaire sauvegardé!","ok")}>💾 Sauvegarder</button>
      </div>
      <div className="card"><div className="card-header"><h3>🍺 Petites Bières</h3></div><div className="card-body">{invSection(PETITES_BIERES,"regular")}</div></div>
      <div className="card"><div className="card-header"><h3>🍺 Grosses Bières</h3></div><div className="card-body">{invSection(GROSSES_BIERES,"regular")}</div></div>
      <div className="card"><div className="card-header"><h3>🍻 Autres Bières</h3></div><div className="card-body">{invSection(AUTRES_BIERES,"regular")}</div></div>
      <div className="card">
        <div className="card-header">
          <h3>🥃 Forts (Inventaire en onces)</h3>
          <span style={{marginLeft:"auto",fontSize:".75rem",color:"var(--accent)",fontWeight:600}}>
            {totalOzStock.toFixed(2)} oz en stock
          </span>
        </div>
        <div className="card-body">{bugInvSection()}</div>
      </div>
      <div className="card"><div className="card-header"><h3>🍷 Vins & Spiritueux</h3></div><div className="card-body">{invSection(VIN_ITEMS,"vins")}</div></div>
      <div className="card"><div className="card-header"><h3>🥤 Autres Boissons</h3></div><div className="card-body">{invSection(AUTRES_BOISSONS,"regular")}</div></div>
      <div className="card"><div className="card-header"><h3>🍗 Nourriture</h3></div><div className="card-body">{invSection(NOURRITURE,"regular")}</div></div>
    </>
  );
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function ManagerAnalytique({ history, today }) {
  const [period, setPeriod] = useState(30);   // days: 7 | 30 | 90 | 0=all
  const [cat, setCat]       = useState("bieres"); // bieres | forts | vins | boissons | nourriture

  const addDays = (ds, n) => {
    const d = new Date(ds+"T12:00:00"); d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  };

  // Filter history by period
  const cutoff = period === 0 ? "0000-00-00" : addDays(today, -period+1);
  const filtered = history.filter(d => d.date >= cutoff && d.date <= today);
  const sorted   = [...filtered].sort((a,b) => a.date.localeCompare(b.date));

  // ── Aggregation helpers ──
  const sumReg  = (days, name) => days.reduce((s,d) => s + (d.regular?.[name]?.total||0), 0);
  const sumBug  = (days, id)   => days.reduce((s,d) => s + (d.bugs?.[id]?.venteAM||0) + (d.bugs?.[id]?.ventePM||0), 0);
  const sumVin  = (days, id)   => days.reduce((s,d) => s + (d.vins?.[id]?.venteAM||0) + (d.vins?.[id]?.ventePM||0), 0);

  // ── Category items + totals ──
  const CATS = {
    bieres: {
      label:"🍺 Bières",
      color:"#3b82f6",
      items: [...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES].map(n=>({
        label:n, total: sumReg(filtered,n)
      }))
    },
    forts: {
      label:"🥃 Forts",
      color:"#e8a020",
      items: BUG_ITEMS.map(b=>({ label:b.label, total: sumBug(filtered,b.id) }))
    },
    vins: {
      label:"🍷 Vins",
      color:"#a855f7",
      items: VIN_ITEMS.map(v=>({ label:v.label, total: sumVin(filtered,v.id) }))
    },
    boissons: {
      label:"🥤 Boissons",
      color:"#22c55e",
      items: AUTRES_BOISSONS.map(n=>({ label:n, total: sumReg(filtered,n) }))
    },
    nourriture: {
      label:"🍗 Nourriture",
      color:"#f97316",
      items: NOURRITURE.map(n=>({ label:n, total: sumReg(filtered,n) }))
    },
  };

  const currentCat = CATS[cat];
  const ranked = [...currentCat.items]
    .filter(i => i.total > 0)
    .sort((a,b) => b.total - a.total);
  const maxVal = ranked[0]?.total || 1;

  // ── Grand totals per category ──
  const grandTotals = {
    bieres:     [...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES].reduce((s,n)=>s+sumReg(filtered,n),0),
    forts:      BUG_ITEMS.reduce((s,b)=>s+sumBug(filtered,b.id),0),
    vins:       VIN_ITEMS.reduce((s,v)=>s+sumVin(filtered,v.id),0),
    boissons:   AUTRES_BOISSONS.reduce((s,n)=>s+sumReg(filtered,n),0),
    nourriture: NOURRITURE.reduce((s,n)=>s+sumReg(filtered,n),0),
  };
  const grandTotal = Object.values(grandTotals).reduce((s,v)=>s+v,0);

  // ── Trend: group by week ──
  const weekKey = (ds) => {
    const d = new Date(ds+"T12:00:00");
    const day = d.getDay();
    const diff = day===0?-6:1-day;
    d.setDate(d.getDate()+diff);
    return d.toISOString().slice(0,10);
  };

  const trendMap = {};
  sorted.forEach(day => {
    const wk = weekKey(day.date);
    if (!trendMap[wk]) trendMap[wk] = { bieres:0, forts:0, vins:0, boissons:0, nourriture:0 };
    [...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES].forEach(n => { trendMap[wk].bieres += day.regular?.[n]?.total||0; });
    BUG_ITEMS.forEach(b => { trendMap[wk].forts += (day.bugs?.[b.id]?.venteAM||0)+(day.bugs?.[b.id]?.ventePM||0); });
    VIN_ITEMS.forEach(v => { trendMap[wk].vins  += (day.vins?.[v.id]?.venteAM||0)+(day.vins?.[v.id]?.ventePM||0); });
    AUTRES_BOISSONS.forEach(n => { trendMap[wk].boissons += day.regular?.[n]?.total||0; });
    NOURRITURE.forEach(n => { trendMap[wk].nourriture += day.regular?.[n]?.total||0; });
  });
  const weeks = Object.keys(trendMap).sort();
  const trendMax = weeks.reduce((mx,wk) => {
    const tot = Object.values(trendMap[wk]).reduce((s,v)=>s+v,0);
    return Math.max(mx, tot);
  }, 1);

  const CAT_COLORS = { bieres:"#3b82f6", forts:"#e8a020", vins:"#a855f7", boissons:"#22c55e", nourriture:"#f97316" };
  const CAT_KEYS   = ["bieres","forts","vins","boissons","nourriture"];

  // SVG trend chart dimensions
  const SVG_W = Math.max(400, weeks.length * 60);
  const SVG_H = 160;
  const PAD   = { l:10, r:10, t:10, b:28 };
  const chartW = SVG_W - PAD.l - PAD.r;
  const chartH = SVG_H - PAD.t - PAD.b;

  const barW = Math.min(44, (chartW / Math.max(weeks.length,1)) - 4);

  const formatWk = (ds) => {
    const d = new Date(ds+"T12:00:00");
    return d.toLocaleDateString("fr-CA",{month:"short",day:"numeric"});
  };

  return (
    <>
      {/* Period selector */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:".78rem",color:"var(--muted)"}}>Période :</span>
        <div className="period-bar" style={{marginBottom:0}}>
          {[{v:7,l:"7 jours"},{v:30,l:"30 jours"},{v:90,l:"90 jours"},{v:0,l:"Tout"}].map(p=>(
            <button key={p.v} className={`period-btn ${period===p.v?"active":""}`}
              onClick={()=>setPeriod(p.v)}>{p.l}</button>
          ))}
        </div>
        <span style={{fontSize:".75rem",color:"var(--muted)",marginLeft:4}}>
          {filtered.length} journée{filtered.length>1?"s":""} · {grandTotal} ventes total
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:40}}>
          Aucune donnée pour cette période.
        </div>
      ) : (<>

        {/* ── Stat cards ── */}
        <div className="stat-grid">
          {Object.entries(grandTotals).map(([k,v]) => v > 0 ? (
            <div className="stat-card" key={k}>
              <div className="stat-num">{v}</div>
              <div className="stat-lbl">{CATS[k].label}</div>
            </div>
          ) : null)}
        </div>

        {/* ── Stacked bar trend chart ── */}
        {weeks.length > 0 && (
          <div className="card">
            <div className="card-header"><h3>📈 Tendance par semaine</h3>
              <div style={{marginLeft:"auto",display:"flex",gap:10,flexWrap:"wrap"}}>
                {CAT_KEYS.map(k => grandTotals[k]>0 ? (
                  <span key={k} style={{fontSize:".68rem",display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:10,height:10,borderRadius:2,background:CAT_COLORS[k],display:"inline-block"}}/>
                    {CATS[k].label}
                  </span>
                ):null)}
              </div>
            </div>
            <div className="card-body trend-wrap">
              <svg width={SVG_W} height={SVG_H} className="trend-svg">
                {weeks.map((wk,i) => {
                  const x = PAD.l + i*(chartW/weeks.length) + (chartW/weeks.length - barW)/2;
                  let yOff = PAD.t + chartH;
                  return (
                    <g key={wk}>
                      {CAT_KEYS.map(k => {
                        const val = trendMap[wk][k] || 0;
                        if (!val) return null;
                        const h = (val / trendMax) * chartH;
                        yOff -= h;
                        return (
                          <rect key={k} x={x} y={yOff} width={barW} height={h}
                            fill={CAT_COLORS[k]} rx={2} opacity={0.9} />
                        );
                      })}
                      <text x={x+barW/2} y={SVG_H-6} textAnchor="middle"
                        fontSize={9} fill="var(--muted)">{formatWk(wk)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* ── Category ranking ── */}
        <div className="card">
          <div className="card-header">
            <h3>🏆 Classement par article</h3>
          </div>
          <div className="card-body">
            <div className="cat-tab">
              {Object.entries(CATS).map(([k,c]) => grandTotals[k]>0 ? (
                <button key={k} className={`cat-btn ${cat===k?"active":""}`}
                  onClick={()=>setCat(k)}>{c.label}</button>
              ):null)}
            </div>

            {ranked.length === 0 ? (
              <div style={{color:"var(--muted)",fontSize:".82rem"}}>Aucune vente pour cette catégorie.</div>
            ) : (
              <div>
                {ranked.map((item,i) => {
                  const pct = (item.total / maxVal) * 100;
                  const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
                  return (
                    <div className="bar-row" key={item.label}>
                      <div className="bar-label" title={item.label}>
                        {medal} {item.label}
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill"
                          style={{width:`${pct}%`, background:currentCat.color}} />
                        {pct > 25 && <span className="bar-val">{item.total}</span>}
                      </div>
                      {pct <= 25 && <span className="bar-val-out">{item.total}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Donut-style category breakdown ── */}
        <div className="card">
          <div className="card-header"><h3>🍩 Répartition par catégorie</h3></div>
          <div className="card-body">
            {Object.entries(grandTotals).filter(([,v])=>v>0).map(([k,v]) => {
              const pct = grandTotal > 0 ? ((v/grandTotal)*100).toFixed(1) : 0;
              return (
                <div className="bar-row" key={k}>
                  <div className="bar-label">{CATS[k].label}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{width:`${pct}%`, background:CAT_COLORS[k]}} />
                    {parseFloat(pct) > 15 && <span className="bar-val">{pct}%</span>}
                  </div>
                  {parseFloat(pct) <= 15 && <span className="bar-val-out">{pct}%</span>}
                  <span style={{fontSize:".72rem",color:"var(--muted)",minWidth:32}}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Top 5 overall ── */}
        <div className="card">
          <div className="card-header"><h3>⭐ Top 10 tous articles confondus</h3></div>
          <div className="card-body">
            {(() => {
              const all = [];
              ALL_REGULAR_ITEMS.forEach(n => { const t=sumReg(filtered,n); if(t>0) all.push({label:n,total:t,col:"#3b82f6"}); });
              BUG_ITEMS.forEach(b => { const t=sumBug(filtered,b.id); if(t>0) all.push({label:b.label,total:t,col:"#e8a020"}); });
              VIN_ITEMS.forEach(v => { const t=sumVin(filtered,v.id); if(t>0) all.push({label:v.label,total:t,col:"#a855f7"}); });
              const top = all.sort((a,b)=>b.total-a.total).slice(0,10);
              const topMax = top[0]?.total || 1;
              return top.map((item,i) => {
                const pct = (item.total/topMax)*100;
                const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`;
                return (
                  <div className="bar-row" key={item.label}>
                    <div className="bar-label" title={item.label}>{medal} {item.label}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{width:`${pct}%`, background:item.col}} />
                      {pct > 25 && <span className="bar-val">{item.total}</span>}
                    </div>
                    {pct <= 25 && <span className="bar-val-out">{item.total}</span>}
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </>)}
    </>
  );
}

// ─── MANAGER EMPLOYÉS ────────────────────────────────────────────────────────

function ManagerEmployes({ history, showToast }) {
  const [employees, setEmployeesState] = useState(() => loadEmployees());
  const [view, setView]       = useState("list");
  const [editTarget, setEditTarget]   = useState(null);
  const [caisseTarget, setCaisseTarget] = useState(null);
  const [form, setForm] = useState({ name:"", pin:"", pin2:"", role:"barmaid" });
  const [pinErr, setPinErr] = useState("");

  const ROLES_FORM = [
    { value:"barmaid",   ...ROLE_LABELS.barmaid   },
    { value:"manageuse", ...ROLE_LABELS.manageuse  },
    { value:"gerant",    ...ROLE_LABELS.gerant     },
  ];

  const persist = (list) => { saveEmployees(list); setEmployeesState(list); };

  const openAdd  = () => { setForm({name:"",pin:"",pin2:"",role:"barmaid"}); setPinErr(""); setView("add"); };
  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({ name:emp.name, pin:emp.pin, pin2:emp.pin, role:emp.role||"barmaid" });
    setPinErr(""); setView("edit");
  };
  const openCaisse = (emp) => { setCaisseTarget(emp); setView("caisse"); };

  const validate = () => {
    if (!form.name.trim()) { setPinErr("Le nom est requis."); return false; }
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) { setPinErr("Le NIP doit être 4 chiffres."); return false; }
    if (form.pin !== form.pin2) { setPinErr("Les NIPs ne correspondent pas."); return false; }
    // Check PIN uniqueness (not used by another employee or manager)
    const others = employees.filter(e => !editTarget || e.id !== editTarget.id);
    if (others.some(e => e.pin === form.pin)) { setPinErr("Ce NIP est déjà utilisé par un autre employé."); return false; }
    if (form.pin === defaultManagerPin() && form.role !== "gerant") { setPinErr("Ce NIP est réservé au gérant principal."); return false; }
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    const newEmp = { id:Date.now().toString(), name:form.name.trim(), pin:form.pin, role:form.role };
    persist([...employees, newEmp]);
    showToast(`✅ ${newEmp.name} (${ROLE_LABELS[form.role]?.label}) ajouté(e)!`, "ok");
    setView("list");
  };

  const handleEdit = () => {
    if (!validate()) return;
    persist(employees.map(e => e.id===editTarget.id
      ? { ...e, name:form.name.trim(), pin:form.pin, role:form.role }
      : e));
    showToast("✅ Compte mis à jour!", "ok");
    setView("list");
  };

  const handleDelete = (emp) => {
    if (!window.confirm(`Supprimer ${emp.name} ?`)) return;
    persist(employees.filter(e => e.id !== emp.id));
    showToast(`🗑 ${emp.name} supprimé(e)`, "ok");
  };

  // Caisse par employé: sum all history days where nomAM or nomPM matches
  const getCaisseData = (emp) => {
    const days = history.filter(d =>
      d.nomAM === emp.name || d.nomPM === emp.name
    ).sort((a,b) => b.date.localeCompare(a.date));
    return days;
  };

  // ── CAISSE VIEW ──
  if (view === "caisse" && caisseTarget) {
    const days = getCaisseData(caisseTarget);
    const totalReg = {};
    ALL_REGULAR_ITEMS.forEach(n => { totalReg[n] = 0; });
    const totalBugs = {};
    BUG_ITEMS.forEach(b => { totalBugs[b.id] = 0; });
    const totalVins = {};
    VIN_ITEMS.forEach(v => { totalVins[v.id] = 0; });

    days.forEach(day => {
      ALL_REGULAR_ITEMS.forEach(n => {
        // Only count shifts where this employee worked
        const isAM = day.nomAM === caisseTarget.name;
        const isPM = day.nomPM === caisseTarget.name;
        if (isAM) totalReg[n] += parseFloat(day.regular?.[n]?.am)||0;
        if (isPM) totalReg[n] += parseFloat(day.regular?.[n]?.pm)||0;
      });
      BUG_ITEMS.forEach(b => {
        const isAM = day.nomAM === caisseTarget.name;
        const isPM = day.nomPM === caisseTarget.name;
        if (isAM) totalBugs[b.id] += day.bugs?.[b.id]?.venteAM||0;
        if (isPM) totalBugs[b.id] += day.bugs?.[b.id]?.ventePM||0;
      });
      VIN_ITEMS.forEach(v => {
        const isAM = day.nomAM === caisseTarget.name;
        const isPM = day.nomPM === caisseTarget.name;
        if (isAM) totalVins[v.id] += day.vins?.[v.id]?.venteAM||0;
        if (isPM) totalVins[v.id] += day.vins?.[v.id]?.ventePM||0;
      });
    });

    const regSection = (items, label) => {
      const rows = items.filter(n => totalReg[n] > 0);
      if (!rows.length) return null;
      return (
        <div className="card" key={label}>
          <div className="card-header"><h3>{label}</h3></div>
          <div className="card-body" style={{padding:0}}>
            <table>
              <thead><tr><th>Article</th><th style={{textAlign:"center"}}>Total vendu</th></tr></thead>
              <tbody>
                {rows.map(n => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td className="total-cell">{totalReg[n]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button className="btn btn-ghost" onClick={()=>setView("list")}>← Retour</button>
          <div>
            <div style={{fontFamily:"var(--font-head)",fontSize:"1.3rem",color:"var(--accent)"}}>
              📊 Caisse de {caisseTarget.name}
            </div>
            <div style={{fontSize:".75rem",color:"var(--muted)"}}>
              {days.length} journée{days.length>1?"s":""} travaillée{days.length>1?"s":""}
            </div>
          </div>
        </div>

        {days.length === 0 ? (
          <div style={{textAlign:"center",color:"var(--muted)",padding:30}}>Aucune donnée pour cet employé.</div>
        ) : (<>
          {/* Historique des shifts */}
          <div className="card">
            <div className="card-header"><h3>📅 Historique des shifts</h3></div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <thead>
                  <tr><th>Date</th><th>Shift</th><th>Bières</th><th>Forts</th><th>Vins</th><th>Nourrit.</th></tr>
                </thead>
                <tbody>
                  {days.map(day => {
                    const shifts = [];
                    if (day.nomAM === caisseTarget.name) shifts.push("AM");
                    if (day.nomPM === caisseTarget.name) shifts.push("PM");
                    return shifts.map(sh => {
                      const bieres = [...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES]
                        .reduce((s,n) => s + (parseFloat(day.regular?.[n]?.[sh.toLowerCase()])||0), 0);
                      const forts = BUG_ITEMS.reduce((s,b) => s + (day.bugs?.[b.id]?.["vente"+sh]||0), 0);
                      const vins  = VIN_ITEMS.reduce((s,v) => s + (day.vins?.[v.id]?.["vente"+sh]||0), 0);
                      const nourr = NOURRITURE.reduce((s,n) => s + (parseFloat(day.regular?.[n]?.[sh.toLowerCase()])||0), 0);
                      return (
                        <tr key={day.date+sh}>
                          <td style={{fontSize:".8rem"}}>{day.date}</td>
                          <td><span className={`badge badge-${sh.toLowerCase()}`}>{sh}</span></td>
                          <td style={{textAlign:"center"}}>{bieres||"—"}</td>
                          <td style={{textAlign:"center"}}>{forts||"—"}</td>
                          <td style={{textAlign:"center"}}>{vins||"—"}</td>
                          <td style={{textAlign:"center"}}>{nourr||"—"}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totaux par article */}
          <div style={{fontSize:".75rem",color:"var(--muted)",margin:"8px 0 4px",
            textTransform:"uppercase",letterSpacing:".06em",fontWeight:600}}>
            Totaux cumulés
          </div>
          {regSection([...PETITES_BIERES,...GROSSES_BIERES,...AUTRES_BIERES], "🍺 Bières")}
          {BUG_ITEMS.some(b=>totalBugs[b.id]>0) && (
            <div className="card">
              <div className="card-header"><h3>🥃 Forts</h3></div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead><tr><th>Fort</th><th style={{textAlign:"center"}}>Ventes</th><th style={{textAlign:"center"}}>Onces</th></tr></thead>
                  <tbody>
                    {BUG_ITEMS.filter(b=>totalBugs[b.id]>0).map(b=>(
                      <tr key={b.id}>
                        <td>{b.label}</td>
                        <td className="total-cell">{totalBugs[b.id]}</td>
                        <td style={{textAlign:"center",color:"var(--orange)",fontWeight:600}}>
                          {(totalBugs[b.id]*b.oz).toFixed(2)} oz
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {VIN_ITEMS.some(v=>totalVins[v.id]>0) && (
            <div className="card">
              <div className="card-header"><h3>🍷 Vins</h3></div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead><tr><th>Article</th><th style={{textAlign:"center"}}>Verres</th></tr></thead>
                  <tbody>
                    {VIN_ITEMS.filter(v=>totalVins[v.id]>0).map(v=>(
                      <tr key={v.id}><td>{v.label}</td><td className="total-cell">{totalVins[v.id]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {regSection(AUTRES_BOISSONS, "🥤 Autres Boissons")}
          {regSection(NOURRITURE, "🍗 Nourriture")}
        </>)}
      </>
    );
  }

  // ── ADD / EDIT FORM ──
  if (view === "add" || view === "edit") {
    return (
      <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button className="btn btn-ghost" onClick={()=>setView("list")}>← Retour</button>
          <div style={{fontFamily:"var(--font-head)",fontSize:"1.2rem",color:"var(--accent)"}}>
            {view==="add" ? "➕ Nouvel employé" : `✏️ Modifier — ${editTarget?.name}`}
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:16,maxWidth:420}}>
            {/* Name */}
            <div>
              <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Nom complet</div>
              <input type="text" value={form.name} placeholder="Ex: Marie Tremblay"
                onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            </div>
            {/* NIP */}
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>NIP (4 chiffres)</div>
                <input type="password" inputMode="numeric" maxLength={4} value={form.pin}
                  placeholder="••••"
                  onChange={e=>setForm(f=>({...f,pin:e.target.value.replace(/\D/g,"").slice(0,4)}))} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Confirmer NIP</div>
                <input type="password" inputMode="numeric" maxLength={4} value={form.pin2}
                  placeholder="••••"
                  onChange={e=>setForm(f=>({...f,pin2:e.target.value.replace(/\D/g,"").slice(0,4)}))} />
              </div>
            </div>
            {/* Role */}
            <div>
              <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>
                Rôle
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {ROLES_FORM.map(r => (
                  <button key={r.value}
                    onClick={()=>setForm(f=>({...f,role:r.value}))}
                    style={{padding:"10px 14px",borderRadius:8,cursor:"pointer",fontFamily:"var(--font)",
                      textAlign:"left",border:`2px solid ${form.role===r.value ? r.color : "var(--border)"}`,
                      background: form.role===r.value ? `${r.color}18` : "var(--surface)"}}>
                    <div style={{fontWeight:700,fontSize:".88rem",color: form.role===r.value ? r.color : "var(--text)"}}>
                      {r.label}
                    </div>
                    <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:2}}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {pinErr && <div style={{color:"var(--red)",fontSize:".78rem"}}>⛔ {pinErr}</div>}
            <div className="btn-row" style={{marginTop:0}}>
              <button className="btn btn-green" onClick={view==="add"?handleAdd:handleEdit}>
                {view==="add"?"➕ Créer le compte":"💾 Enregistrer"}
              </button>
              <button className="btn btn-ghost" onClick={()=>setView("list")}>Annuler</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── LIST VIEW ──
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:"var(--muted)",fontSize:".8rem"}}>
          {employees.length} employé{employees.length>1?"s":""} enregistré{employees.length>1?"s":""}
        </div>
        <button className="btn btn-accent" onClick={openAdd}>➕ Ajouter un employé</button>
      </div>

      {employees.length === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:40}}>
          Aucun employé. Cliquez sur "Ajouter" pour créer des comptes.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {employees.map(emp => {
            const roleInfo = ROLE_LABELS[emp.role] || ROLE_LABELS.barmaid;
            const shifts = history.filter(d=>d.nomAM===emp.name||d.nomPM===emp.name).length;
            return (
              <div key={emp.id} className="card" style={{marginBottom:0}}>
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:"1rem"}}>{emp.name}</span>
                      <span style={{
                        padding:"2px 8px",borderRadius:99,fontSize:".68rem",fontWeight:700,
                        background:`${roleInfo.color}22`,color:roleInfo.color
                      }}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <div style={{fontSize:".73rem",color:"var(--muted)",marginTop:4,display:"flex",gap:10,flexWrap:"wrap"}}>
                      <span>NIP : {"●".repeat(4)}</span>
                      <span>{shifts} shift{shifts>1?"s":""}</span>
                      <span style={{color:"var(--muted)",fontStyle:"italic"}}>{roleInfo.desc}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button className="btn btn-ghost" style={{fontSize:".78rem",padding:"5px 12px"}}
                      onClick={()=>openCaisse(emp)}>📊 Voir caisse</button>
                    <button className="btn btn-ghost" style={{fontSize:".78rem",padding:"5px 12px"}}
                      onClick={()=>openEdit(emp)}>✏️ Modifier</button>
                    <button className="btn btn-red" style={{fontSize:".78rem",padding:"5px 12px"}}
                      onClick={()=>handleDelete(emp)}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manager PIN section */}
      <div className="card" style={{marginTop:20}}>
        <div className="card-header"><h3>🔐 NIP Gérant</h3></div>
        <div className="card-body">
          <ChangeManagerPin showToast={showToast} />
        </div>
      </div>
    </>
  );
}

function ChangeManagerPin({ showToast }) {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");

  const handleSave = () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setErr("4 chiffres requis."); return; }
    if (pin !== pin2) { setErr("Les NIPs ne correspondent pas."); return; }
    save(MANAGER_PIN_KEY, pin);
    setPin(""); setPin2(""); setErr("");
    showToast("✅ NIP gérant mis à jour!", "ok");
  };

  return (
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",maxWidth:400}}>
      <div>
        <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Nouveau NIP</div>
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          placeholder="••••" style={{width:100}}
          onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} />
      </div>
      <div>
        <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:4}}>Confirmer</div>
        <input type="password" inputMode="numeric" maxLength={4} value={pin2}
          placeholder="••••" style={{width:100}}
          onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} />
      </div>
      <button className="btn btn-accent" onClick={handleSave}>Changer</button>
      {err && <div style={{color:"var(--red)",fontSize:".76rem",width:"100%"}}>⛔ {err}</div>}
    </div>
  );
}

function ManagerSemaine({ history, today }) {
  // Build list of Mon–Sun weeks available, default to current week
  const getMonday = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0,10);
  };

  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0,10);
  };

  const formatDate = (ds) => {
    const d = new Date(ds + "T12:00:00");
    return d.toLocaleDateString("fr-CA", { weekday:"short", month:"short", day:"numeric" });
  };

  const [weekStart, setWeekStart] = useState(() => getMonday(today));

  const weekDates = Array.from({length:7}, (_,i) => addDays(weekStart, i));
  const weekEnd   = weekDates[6];

  const histMap = {};
  history.forEach(d => { histMap[d.date] = d; });

  // Aggregate totals for the week
  const totalsRegular = {};
  ALL_REGULAR_ITEMS.forEach(n => { totalsRegular[n] = 0; });
  const totalsBugs = {};
  BUG_ITEMS.forEach(b => { totalsBugs[b.id] = 0; });
  const totalsVins = {};
  VIN_ITEMS.forEach(v => { totalsVins[v.id] = 0; });

  let daysWithData = 0;
  weekDates.forEach(ds => {
    const day = histMap[ds];
    if (!day) return;
    daysWithData++;
    ALL_REGULAR_ITEMS.forEach(n => {
      totalsRegular[n] += day.regular?.[n]?.total || 0;
    });
    BUG_ITEMS.forEach(b => {
      totalsBugs[b.id] += (day.bugs?.[b.id]?.venteAM||0) + (day.bugs?.[b.id]?.ventePM||0);
    });
    VIN_ITEMS.forEach(v => {
      totalsVins[v.id] += (day.vins?.[v.id]?.venteAM||0) + (day.vins?.[v.id]?.ventePM||0);
    });
  });

  const prevWeek = () => setWeekStart(w => addDays(w, -7));
  const nextWeek = () => setWeekStart(w => addDays(w, 7));
  const canGoNext = addDays(weekStart, 7) <= today;

  // Section renderer
  const semaineSection = (items, label, totals, getKey, getValue) => {
    const rows = items.filter(item => getValue(item, totals) > 0);
    if (!rows.length) return null;
    return (
      <div className="card" key={label}>
        <div className="card-header"><h3>{label}</h3></div>
        <div className="card-body" style={{padding:0}}>
          <table>
            <thead>
              <tr>
                <th>Article</th>
                {weekDates.map(ds => (
                  <th key={ds} style={{textAlign:"center",fontSize:".65rem",
                    color: histMap[ds] ? "var(--text)" : "var(--muted)"}}>
                    {formatDate(ds)}
                  </th>
                ))}
                <th><span className="badge badge-total">TOTAL</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(item => {
                const key = getKey(item);
                const total = getValue(item, totals);
                return (
                  <tr key={key}>
                    <td className="item-name" style={{fontSize:".8rem"}}>{typeof item==="string"?item:item.label}</td>
                    {weekDates.map(ds => {
                      const day = histMap[ds];
                      const val = day ? getDayVal(item, day, key, getKey) : 0;
                      return (
                        <td key={ds} style={{textAlign:"center",
                          color: val > 0 ? "var(--text)" : "var(--muted)",
                          fontSize:".8rem"}}>
                          {val || "—"}
                        </td>
                      );
                    })}
                    <td className="total-cell">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getDayVal = (item, day, key, getKey) => {
    if (BUG_ITEMS.find(b => b.id === key)) {
      return (day.bugs?.[key]?.venteAM||0) + (day.bugs?.[key]?.ventePM||0);
    }
    if (VIN_ITEMS.find(v => v.id === key)) {
      return (day.vins?.[key]?.venteAM||0) + (day.vins?.[key]?.ventePM||0);
    }
    return day.regular?.[key]?.total || 0;
  };

  return (
    <>
      {/* Week selector */}
      <div className="card">
        <div className="card-header">
          <button className="btn btn-ghost" style={{padding:"4px 12px"}} onClick={prevWeek}>‹</button>
          <h3 style={{flex:1,textAlign:"center"}}>
            {formatDate(weekStart)} → {formatDate(weekEnd)}
          </h3>
          <button className="btn btn-ghost" style={{padding:"4px 12px"}}
            onClick={nextWeek} disabled={!canGoNext}>›</button>
        </div>
        <div className="card-body">
          {/* Day pills */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {weekDates.map(ds => (
              <div key={ds} style={{
                padding:"3px 10px",borderRadius:99,fontSize:".72rem",fontWeight:600,
                background: histMap[ds] ? "rgba(232,160,32,.2)" : "var(--surface)",
                color: histMap[ds] ? "var(--accent)" : "var(--muted)",
                border: ds===today ? "1px solid var(--blue)" : "1px solid var(--border)"}}>
                {formatDate(ds)}{histMap[ds]?" ✓":""}
              </div>
            ))}
          </div>
          <div style={{fontSize:".8rem",color:"var(--muted)"}}>
            {daysWithData} jour{daysWithData>1?"s":""} avec données cette semaine
          </div>
        </div>
      </div>

      {daysWithData === 0 ? (
        <div style={{textAlign:"center",color:"var(--muted)",padding:30}}>
          Aucune donnée pour cette semaine.
        </div>
      ) : (<>
        {semaineSection(PETITES_BIERES,  "🍺 Petites Bières",  totalsRegular, n=>n, (n,t)=>t[n])}
        {semaineSection(GROSSES_BIERES,  "🍺 Grosses Bières",  totalsRegular, n=>n, (n,t)=>t[n])}
        {semaineSection(AUTRES_BIERES,   "🍻 Autres Bières",   totalsRegular, n=>n, (n,t)=>t[n])}
        {semaineSection(BUG_ITEMS,        "🥃 Forts (Bugs)",    totalsBugs,   b=>b.id, (b,t)=>t[b.id])}
        {semaineSection(VIN_ITEMS,        "🍷 Vins & Spiritueux",totalsVins,  v=>v.id, (v,t)=>t[v.id])}
        {semaineSection(AUTRES_BOISSONS, "🥤 Autres Boissons", totalsRegular, n=>n, (n,t)=>t[n])}
        {semaineSection(NOURRITURE,      "🍗 Nourriture",      totalsRegular, n=>n, (n,t)=>t[n])}

        {/* Grand totaux */}
        <div className="card">
          <div className="card-header"><h3>📊 Grands Totaux de la Semaine</h3></div>
          <div className="card-body">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
              {[
                { label:"Total Petites Bières",  val: PETITES_BIERES.reduce((s,n)=>s+totalsRegular[n],0) },
                { label:"Total Grosses Bières",  val: GROSSES_BIERES.reduce((s,n)=>s+totalsRegular[n],0) },
                { label:"Total Autres Bières",   val: AUTRES_BIERES.reduce((s,n)=>s+totalsRegular[n],0) },
                { label:"Total Forts (Bugs)",    val: BUG_ITEMS.reduce((s,b)=>s+totalsBugs[b.id],0) },
                { label:"Total Vins",            val: VIN_ITEMS.reduce((s,v)=>s+totalsVins[v.id],0) },
                { label:"Total Autres Boissons", val: AUTRES_BOISSONS.reduce((s,n)=>s+totalsRegular[n],0) },
                { label:"Total Nourriture",      val: NOURRITURE.reduce((s,n)=>s+totalsRegular[n],0) },
              ].map(({label,val}) => val > 0 ? (
                <div key={label} style={{background:"var(--surface)",border:"1px solid var(--border)",
                  borderRadius:8,padding:"10px 14px"}}>
                  <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:2}}>{label}</div>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:"var(--accent)",fontFamily:"var(--font-head)"}}>{val}</div>
                </div>
              ) : null)}
            </div>
          </div>
        </div>
      </>)}
    </>
  );
}

function ManagerHistory({ history }) {
  const today = TODAY();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(today + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() }; // 0-indexed month
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0=Sun

  const dateStr = (y, m, d) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const histMap = {};
  history.forEach(d => { histMap[d.date] = d; });

  const { year, month } = viewDate;
  const totalDays = daysInMonth(year, month);
  const firstDay  = firstDayOfMonth(year, month); // Sun=0
  const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin",
                      "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const dayLabels = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

  const prevMonth = () => {
    setViewDate(v => {
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { year: v.year, month: v.month - 1 };
    });
    setSelectedDate(null);
  };
  const nextMonth = () => {
    setViewDate(v => {
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: v.month + 1 };
    });
    setSelectedDate(null);
  };

  const selectedDay = selectedDate ? histMap[selectedDate] : null;

  const regSection = (items, label, day) => {
    const rows = items.filter(n => (day.regular[n]?.total||0) > 0);
    if (!rows.length) return null;
    return (
      <div className="card" key={label}>
        <div className="card-header"><h3>{label}</h3></div>
        <div className="card-body" style={{padding:0}}>
          <table>
            <thead><tr><th>Article</th><th>AM</th><th>PM</th><th>Total</th></tr></thead>
            <tbody>
              {rows.map(n=>(
                <tr key={n}>
                  <td>{n}</td>
                  <td style={{textAlign:"center"}}>{day.regular[n]?.am||0}</td>
                  <td style={{textAlign:"center"}}>{day.regular[n]?.pm||0}</td>
                  <td className="total-cell">{day.regular[n]?.total||0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── CALENDRIER ── */}
      <div className="card">
        <div className="card-header">
          <button className="btn btn-ghost" style={{padding:"4px 12px"}} onClick={prevMonth}>‹</button>
          <h3 style={{flex:1,textAlign:"center"}}>
            {monthNames[month]} {year}
          </h3>
          <button className="btn btn-ghost" style={{padding:"4px 12px"}}
            onClick={nextMonth}
            disabled={dateStr(year,month,1) >= today.slice(0,7)+"-01"}>
            ›
          </button>
        </div>
        <div className="card-body" style={{padding:"10px 12px"}}>
          {/* Day labels */}
          <div className="cal-grid">
            {dayLabels.map(d => (
              <div key={d} className="cal-head">{d}</div>
            ))}
            {/* Empty cells before first day */}
            {Array.from({length: firstDay}).map((_,i) => (
              <div key={"e"+i} />
            ))}
            {/* Day cells */}
            {Array.from({length: totalDays}).map((_,i) => {
              const day = i + 1;
              const ds = dateStr(year, month, day);
              const hasData = !!histMap[ds];
              const isToday = ds === today;
              const isSel   = ds === selectedDate;
              const isFuture = ds > today;
              return (
                <div key={ds}
                  className={`cal-day ${hasData?"has-data":""} ${isToday?"is-today":""} ${isSel?"is-selected":""} ${isFuture?"is-future":""}`}
                  onClick={() => hasData ? setSelectedDate(isSel ? null : ds) : null}>
                  <span className="cal-num">{day}</span>
                  {hasData && <span className="cal-dot" />}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:14,marginTop:10,fontSize:".72rem",color:"var(--muted)"}}>
            <span><span style={{color:"var(--accent)"}}>●</span> Journée enregistrée</span>
            <span><span style={{color:"var(--blue)"}}>■</span> Aujourd'hui</span>
          </div>
        </div>
      </div>

      {/* ── DÉTAIL DE LA JOURNÉE SÉLECTIONNÉE ── */}
      {selectedDate && !selectedDay && (
        <div style={{textAlign:"center",color:"var(--muted)",padding:20}}>
          Aucune donnée pour le {selectedDate}.
        </div>
      )}

      {selectedDay && (
        <>
          <div style={{background:"var(--surface)",border:"1px solid var(--accent)",
            borderRadius:8,padding:12,marginBottom:14,display:"flex",
            gap:20,flexWrap:"wrap",alignItems:"center"}}>
            <div>
              <div style={{fontSize:".72rem",color:"var(--muted)"}}>Date</div>
              <div style={{fontWeight:700,color:"var(--accent)",fontSize:"1rem"}}>{selectedDay.date}</div>
            </div>
            <div>
              <div style={{fontSize:".72rem",color:"var(--muted)"}}>AM</div>
              <div style={{fontWeight:600}}>{selectedDay.nomAM||"—"}</div>
            </div>
            <div>
              <div style={{fontSize:".72rem",color:"var(--muted)"}}>PM</div>
              <div style={{fontWeight:600}}>{selectedDay.nomPM||"—"}</div>
            </div>
            <button className="btn btn-ghost" style={{marginLeft:"auto",fontSize:".78rem"}}
              onClick={()=>setSelectedDate(null)}>✕ Fermer</button>
          </div>

          {regSection(PETITES_BIERES, "🍺 Petites Bières", selectedDay)}
          {regSection(GROSSES_BIERES, "🍺 Grosses Bières", selectedDay)}
          {regSection(AUTRES_BIERES,  "🍻 Autres Bières",  selectedDay)}

          {/* Bugs */}
          {BUG_ITEMS.some(b=>((selectedDay.bugs?.[b.id]?.venteAM||0)+(selectedDay.bugs?.[b.id]?.ventePM||0))>0) && (
            <div className="card">
              <div className="card-header"><h3>🥃 Bouteilles de Fort</h3></div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead><tr><th>Bug</th><th>Début AM</th><th>Fin AM</th><th>Début PM</th><th>Fin PM</th><th>V.AM</th><th>V.PM</th><th>Total</th></tr></thead>
                  <tbody>
                    {BUG_ITEMS.map(b=>{
                      const d = selectedDay.bugs?.[b.id]||{};
                      const total = (d.venteAM||0)+(d.ventePM||0);
                      if (!total && !d.debutAM) return null;
                      return (
                        <tr key={b.id}>
                          <td>{b.label}</td>
                          <td style={{textAlign:"center"}}>{d.debutAM||"—"}</td>
                          <td style={{textAlign:"center"}}>{d.finAM||"—"}</td>
                          <td style={{textAlign:"center"}}>{d.debutPM||"—"}</td>
                          <td style={{textAlign:"center"}}>{d.finPM||"—"}</td>
                          <td style={{textAlign:"center"}}>{d.venteAM||0}</td>
                          <td style={{textAlign:"center"}}>{d.ventePM||0}</td>
                          <td className="total-cell">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vins */}
          {VIN_ITEMS.some(v=>((selectedDay.vins?.[v.id]?.venteAM||0)+(selectedDay.vins?.[v.id]?.ventePM||0))>0) && (
            <div className="card">
              <div className="card-header"><h3>🍷 Vins & Spiritueux</h3></div>
              <div className="card-body" style={{padding:0}}>
                <table>
                  <thead><tr><th>Article</th><th>Début AM</th><th>Fin AM</th><th>Début PM</th><th>Fin PM</th><th>V.AM</th><th>V.PM</th><th>Total</th></tr></thead>
                  <tbody>
                    {VIN_ITEMS.map(v=>{
                      const d = selectedDay.vins?.[v.id]||{};
                      const total = (d.venteAM||0)+(d.ventePM||0);
                      const repls = d.remplacements||[];
                      if (!total && !d.debutAM) return null;
                      return (
                        <React.Fragment key={v.id}>
                          <tr>
                            <td>
                              {v.label}
                              {repls.length>0 && <span style={{color:"var(--accent)",fontSize:".68rem",marginLeft:4}}>🔄×{repls.length}</span>}
                            </td>
                            <td style={{textAlign:"center"}}>{d.debutAM||"—"}</td>
                            <td style={{textAlign:"center"}}>{d.finAM||"—"}</td>
                            <td style={{textAlign:"center"}}>{d.debutPM||"—"}</td>
                            <td style={{textAlign:"center"}}>{d.finPM||"—"}</td>
                            <td style={{textAlign:"center"}}>{d.venteAM||0}</td>
                            <td style={{textAlign:"center"}}>{d.ventePM||0}</td>
                            <td className="total-cell">{total}</td>
                          </tr>
                          {repls.map((r,i)=>(
                            <tr key={v.id+"r"+i} style={{background:"rgba(232,160,32,.05)"}}>
                              <td colSpan={8} style={{fontSize:".7rem",color:"var(--accent)",paddingLeft:16}}>
                                🔄 {r.ts} (shift {r.shift}) — {r.avant}g → {r.apres}g · {r.par}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {regSection(AUTRES_BOISSONS, "🥤 Autres Boissons", selectedDay)}
          {regSection(NOURRITURE,      "🍗 Nourriture",      selectedDay)}

          {selectedDay.commentaire && (
            <div className="card">
              <div className="card-header"><h3>💬 Commentaire</h3></div>
              <div className="card-body" style={{color:"var(--muted)"}}>{selectedDay.commentaire}</div>
            </div>
          )}
        </>
      )}

      {/* If no date selected, show recent list hint */}
      {!selectedDate && (
        <div style={{textAlign:"center",color:"var(--muted)",fontSize:".82rem",padding:"10px 0"}}>
          Cliquez sur une date avec un point <span style={{color:"var(--accent)"}}>●</span> pour voir le détail.
        </div>
      )}
    </>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]   = useState("roleSelect");
  // screen: roleSelect | pinManager | pinEmployee | pinDepot | depot | employee | manager
  const [pendingEmployee, setPendingEmployee] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [toastMsg, setToastMsg]   = useState(null);
  const [toastType, setToastType] = useState("ok");
  // Date currently viewed in EmployeeView — defaults to today, gérant can change it
  const [viewedDate, setViewedDate] = useState(TODAY());

  const today = TODAY();

  const [sheet, setSheetRaw] = useState(() => {
    const existing = load("sheet_"+today, null);
    if (existing) return migrateSheet(existing);
    const yesterday = prevDate(today);
    const prevSheet = load("sheet_"+yesterday, null);
    const prevFins = extractFinsPM(prevSheet);
    const newSheet = emptyDaySheet(today);
    if (prevFins) {
      BUG_ITEMS.forEach(b => {
        const fin = prevFins.bugs?.[b.id];
        if (fin !== undefined && fin !== "") newSheet.bugs[b.id].debutAM = fin;
      });
      VIN_ITEMS.forEach(v => {
        const fin = prevFins.vins?.[v.id];
        if (fin !== undefined && fin !== "") newSheet.vins[v.id].debutAM = fin;
      });
    }
    return newSheet;
  });

  const prevFinsPM = (() => {
    const yesterday = prevDate(today);
    const prevSheet = load("sheet_"+yesterday, null);
    return extractFinsPM(migrateSheet(prevSheet));
  })();

  const [inventory, setInventoryRaw] = useState(() => migrateInventory(load("inventory", null)));
  const [history,   setHistoryRaw]   = useState(() =>
    (load("history", []) || []).map(d => migrateSheet(d))
  );

  const wrap = (raw, key) => (fn) => {
    raw(s => {
      const next = typeof fn==="function" ? fn(s) : fn;
      save(key, next);
      return next;
    });
  };
  const setSheet     = wrap(setSheetRaw,     "sheet_"+today);
  const setInventory = wrap(setInventoryRaw, "inventory");
  const setHistory   = wrap(setHistoryRaw,   "history");

  // ── Viewed sheet: today's live sheet, or an arbitrary date loaded from storage ──
  const isViewingToday = viewedDate === today;
  const viewedSheet = isViewingToday
    ? sheet
    : migrateSheet(load("sheet_"+viewedDate, null) || emptyDaySheet(viewedDate));

  const setViewedSheet = (fn) => {
    if (isViewingToday) {
      setSheet(fn);
    } else {
      const next = typeof fn === "function" ? fn(viewedSheet) : fn;
      save("sheet_"+viewedDate, next);
      // Also update history if this date already exists there
      setHistory(h => {
        const idx = h.findIndex(d => d.date === viewedDate);
        if (idx >= 0) { const hh = [...h]; hh[idx] = next; return hh; }
        return h;
      });
      // Force a re-render by toggling viewedDate to itself via a dummy state bump
      setForceTick(t => t + 1);
    }
  };
  const [, setForceTick] = useState(0);

  const viewedPrevFinsPM = isViewingToday
    ? prevFinsPM
    : extractFinsPM(migrateSheet(load("sheet_"+prevDate(viewedDate), null)));


  const showToast = (msg, type="ok") => { setToastMsg(msg); setToastType(type); };

  const logout = () => {
    setScreen("roleSelect");
    setPendingEmployee(null);
    setCurrentEmployee(null);
  };

  return (
    <>
      <style>{CSS}</style>

      {screen==="roleSelect" && (
        <RoleSelect
          onSelectManager={() => setScreen("pinManager")}
          onSelectEmployee={emp => { setPendingEmployee(emp); setScreen("pinEmployee"); }}
          onSelectDepot={() => setScreen("pinDepot")}
        />
      )}

      {screen==="pinDepot" && (
        <div style={{background:"var(--bg)",minHeight:"100vh"}}>
          <PinLogin
            title="💰 Dépôt du jour"
            subtitle="Code gérant ou manageuse"
            onSuccess={np => {
              const employees = loadEmployees();
              const ok = np === defaultManagerPin() ||
                employees.some(e => canAccessDepot(e) && e.pin === np);
              if (ok) setScreen("depot");
              return ok;
            }}
            onBack={() => setScreen("roleSelect")}
          />
        </div>
      )}

      {screen==="depot" && (
        <DepotPage
          onBack={() => setScreen("roleSelect")}
          sheet={sheet}
          setSheet={setSheet}
          showToast={showToast}
        />
      )}

      {screen==="pinManager" && (
        <div style={{background:"var(--bg)",minHeight:"100vh"}}>
          <PinLogin
            title="🔐 Accès Gérant"
            onSuccess={np => {
              const ok = np === defaultManagerPin();
              if (ok) setScreen("manager");
              return ok;
            }}
            onBack={() => setScreen("roleSelect")}
          />
        </div>
      )}

      {screen==="pinEmployee" && pendingEmployee && (
        <div style={{background:"var(--bg)",minHeight:"100vh"}}>
          <PinLogin
            title={`👤 ${pendingEmployee.name}`}
            subtitle="Entrez votre NIP"
            onSuccess={np => {
              const ok = np === pendingEmployee.pin;
              if (ok) { setCurrentEmployee(pendingEmployee); setScreen("employee"); }
              return ok;
            }}
            onBack={() => { setPendingEmployee(null); setScreen("roleSelect"); }}
          />
        </div>
      )}

      {screen==="employee" && (
        <EmployeeView sheet={viewedSheet} setSheet={setViewedSheet}
          prevFinsPM={viewedPrevFinsPM}
          employee={currentEmployee}
          viewedDate={viewedDate}
          isViewingToday={isViewingToday}
          onChangeDate={setViewedDate}
          onLogout={() => { setViewedDate(today); logout(); }}
          showToast={showToast} />
      )}

      {screen==="manager" && (
        <ManagerView sheet={sheet} setSheet={setSheet}
          prevFinsPM={prevFinsPM}
          inventory={inventory} setInventory={setInventory}
          history={history} setHistory={setHistory}
          onLogout={logout} showToast={showToast} />
      )}

      {toastMsg && <Toast msg={toastMsg} type={toastType} onDone={()=>setToastMsg(null)} />}
    </>
  );
}
