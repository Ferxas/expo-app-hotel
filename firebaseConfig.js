import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDolwmn4muWt3QH3YYKsrOaXx5mX2yScxU",
  authDomain: "oasishotelapp-33035.firebaseapp.com",
  projectId: "oasishotelapp-33035",
  storageBucket: "oasishotelapp-33035.firebasestorage.app",
  messagingSenderId: "638190803008",
  appId: "1:638190803008:web:d2fb6ff17c06f66061e7a5"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
