import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  enableIndexedDbPersistence,
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
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Hors-ligne : persistance IndexedDB ──────────────────────────────────────
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn("Persistance hors-ligne non disponible (plusieurs onglets ouverts)");
  } else if (err.code === 'unimplemented') {
    console.warn("Navigateur ne supporte pas la persistance hors-ligne");
  }
});

// ── Auth anonyme ─────────────────────────────────────────────────────────────
export const initAuth = () => new Promise((resolve) => {
  onAuthStateChanged(auth, user => {
    if (user) { resolve(user); }
    else { signInAnonymously(auth).then(r => resolve(r.user)); }
  });
});

// ── Helpers lecture / écriture ───────────────────────────────────────────────
const BAR_ID = "club_des_ex"; // identifiant unique du bar

// Lit un document depuis Firestore
export const fbGet = async (key) => {
  try {
    const snap = await getDoc(doc(db, BAR_ID, key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.error("fbGet error:", key, e);
    return null;
  }
};

// Écrit un document dans Firestore
export const fbSet = async (key, value) => {
  try {
    await setDoc(doc(db, BAR_ID, key), { value, updatedAt: Date.now() });
  } catch (e) {
    console.error("fbSet error:", key, e);
  }
};

// Écoute les changements en temps réel pour une clé
export const fbListen = (key, callback) => {
  return onSnapshot(doc(db, BAR_ID, key), (snap) => {
    if (snap.exists()) callback(snap.data().value);
  });
};

export { db, auth };
