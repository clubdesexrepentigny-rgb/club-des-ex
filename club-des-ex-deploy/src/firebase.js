import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
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
const auth = getAuth(app);

// ── Persistance hors-ligne complète (nouvelle API Firebase v10) ──────────────
// Avec persistentLocalCache, toutes les écritures sont mises en file d'attente
// localement et envoyées automatiquement dès que le WiFi revient.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// ── Auth anonyme ─────────────────────────────────────────────────────────────
export const initAuth = () => new Promise((resolve) => {
  onAuthStateChanged(auth, user => {
    if (user) { resolve(user); }
    else { signInAnonymously(auth).then(r => resolve(r.user)); }
  });
});

const BAR_ID = "club_des_ex";

// ── Écriture — fonctionne hors-ligne, envoi automatique au retour du WiFi ────
export const fbSet = async (key, value) => {
  try {
    // setDoc avec cache local — si hors-ligne, Firebase met en file d'attente
    // et envoie automatiquement quand la connexion revient
    await setDoc(doc(db, BAR_ID, key), { value, updatedAt: Date.now() });
  } catch (e) {
    // Même en cas d'erreur réseau, la persistance locale garde les données
    console.warn("fbSet queued offline:", key);
  }
};

// ── Lecture ──────────────────────────────────────────────────────────────────
export const fbGet = async (key) => {
  try {
    const snap = await getDoc(doc(db, BAR_ID, key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    return null;
  }
};

// ── Écoute temps réel ────────────────────────────────────────────────────────
export const fbListen = (key, callback) => {
  return onSnapshot(doc(db, BAR_ID, key), (snap) => {
    if (snap.exists()) callback(snap.data().value);
  });
};

export { db, auth };
