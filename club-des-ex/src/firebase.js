import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDgxSes57_nKXS0vTYHI7c0S8aGDkV23wU",
  authDomain: "systeme-d-inventaire.firebaseapp.com",
  projectId: "systeme-d-inventaire",
  storageBucket: "systeme-d-inventaire.firebasestorage.app",
  messagingSenderId: "136995363734",
  appId: "1:136995363734:web:6ca91fe78c66be53e8dbb7",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);
const BAR_ID = "club_des_ex";

// ── File d'attente locale pour les écritures hors-ligne ──────────────────────
const QUEUE_KEY = "__fb_queue__";
const getQueue  = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||"{}"); } catch { return {}; } };
const setQueue  = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} };

// ── État auth ─────────────────────────────────────────────────────────────────
let _ready = false;
let _waiters = [];

const flushQueue = async () => {
  const q = getQueue();
  const keys = Object.keys(q);
  if (keys.length === 0) return;
  console.log(`[Firebase] Envoi de ${keys.length} écriture(s) en attente...`);
  for (const key of keys) {
    try {
      await setDoc(doc(db, BAR_ID, key), { value: q[key], updatedAt: Date.now() });
      const q2 = getQueue(); delete q2[key]; setQueue(q2);
    } catch(e) { console.warn("[Firebase] Flush échoué pour", key); }
  }
};

onAuthStateChanged(auth, user => {
  if (user) {
    console.log("[Firebase] Auth OK — uid:", user.uid);
    _ready = true;
    _waiters.forEach(fn => fn());
    _waiters = [];
    flushQueue();
  } else {
    console.log("[Firebase] Connexion anonyme...");
    signInAnonymously(auth).catch(e => console.error("[Firebase] Auth échouée:", e));
  }
});

export const initAuth = () => new Promise(resolve => {
  if (_ready) resolve();
  else _waiters.push(resolve);
});

// ── Écriture ──────────────────────────────────────────────────────────────────
export const fbSet = async (key, value) => {
  // Toujours mettre dans la file d'attente d'abord
  const q = getQueue(); q[key] = value; setQueue(q);

  if (!_ready) {
    console.log("[Firebase] Pas encore prêt — mis en file:", key);
    return;
  }
  try {
    await setDoc(doc(db, BAR_ID, key), { value, updatedAt: Date.now() });
    // Succès — retirer de la file
    const q2 = getQueue(); delete q2[key]; setQueue(q2);
    console.log("[Firebase] ✓ Sauvegardé:", key);
  } catch(e) {
    console.warn("[Firebase] Échec — restera en file:", key, e.message);
  }
};

// ── Lecture ───────────────────────────────────────────────────────────────────
export const fbGet = async (key) => {
  try {
    await initAuth();
    const snap = await getDoc(doc(db, BAR_ID, key));
    if (snap.exists()) {
      console.log("[Firebase] ✓ Lu:", key);
      return snap.data().value;
    }
    return null;
  } catch(e) {
    console.warn("[Firebase] Lecture échouée:", key, e.message);
    return null;
  }
};

// ── Écoute temps réel ─────────────────────────────────────────────────────────
export const fbListen = (key, callback) => {
  return onSnapshot(
    doc(db, BAR_ID, key),
    snap => { if (snap.exists()) callback(snap.data().value); },
    err  => console.warn("[Firebase] Listen erreur:", key, err.message)
  );
};

export { db, auth };
