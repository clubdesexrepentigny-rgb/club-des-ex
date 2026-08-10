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

// ── Auth : on attend que l'utilisateur soit connecté avant tout ──────────────
let _authReady = false;
let _authResolvers = [];

onAuthStateChanged(auth, user => {
  if (!user) {
    signInAnonymously(auth).catch(console.error);
  } else {
    _authReady = true;
    // Vide la file d'attente des écritures en attente
    _authResolvers.forEach(fn => fn());
    _authResolvers = [];
    // Envoie les données en attente dans localStorage → Firebase
    _flushPendingWrites();
  }
});

const waitForAuth = () => new Promise(resolve => {
  if (_authReady) resolve();
  else _authResolvers.push(resolve);
});

export const initAuth = () => waitForAuth();

// ── File d'attente des écritures hors-ligne ───────────────────────────────────
const PENDING_KEY = "__fb_pending__";

const getPending = () => {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}"); }
  catch { return {}; }
};
const setPending = (obj) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(obj)); } catch {}
};

const _flushPendingWrites = async () => {
  const pending = getPending();
  const keys = Object.keys(pending);
  if (keys.length === 0) return;
  for (const key of keys) {
    try {
      await setDoc(doc(db, BAR_ID, key), { value: pending[key], updatedAt: Date.now() });
      const p = getPending();
      delete p[key];
      setPending(p);
    } catch (e) {
      console.warn("Flush failed for", key, e);
    }
  }
};

// ── Écriture ─────────────────────────────────────────────────────────────────
export const fbSet = async (key, value) => {
  // Toujours sauvegarder dans la file locale d'abord
  const pending = getPending();
  pending[key] = value;
  setPending(pending);

  // Si authentifié, envoyer immédiatement
  if (_authReady) {
    try {
      await setDoc(doc(db, BAR_ID, key), { value, updatedAt: Date.now() });
      // Succès — retirer de la file
      const p = getPending();
      delete p[key];
      setPending(p);
    } catch (e) {
      console.warn("fbSet failed, keeping in queue:", key);
    }
  }
  // Si pas encore auth, l'écriture restera dans la file jusqu'à la connexion
};

// ── Lecture ───────────────────────────────────────────────────────────────────
export const fbGet = async (key) => {
  try {
    await waitForAuth();
    const snap = await getDoc(doc(db, BAR_ID, key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.warn("fbGet failed:", key, e);
    return null;
  }
};

// ── Écoute temps réel ─────────────────────────────────────────────────────────
export const fbListen = (key, callback) => {
  return onSnapshot(doc(db, BAR_ID, key), (snap) => {
    if (snap.exists()) callback(snap.data().value);
  }, (err) => {
    console.warn("fbListen error:", key, err);
  });
};

export { db, auth };
