import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBPpNDyOLZmB7DclJMywtW4rCh_SJiUTRo",
  authDomain: "fir-employee-app.firebaseapp.com",
  projectId: "fir-employee-app",
  storageBucket: "fir-employee-app.appspot.com",
  messagingSenderId: "915065368441",
  appId: "1:915065368441:web:8eb124c309c565cfca09a8"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
