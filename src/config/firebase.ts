import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi Firebase - GANTI dengan konfigurasi project Anda
const firebaseConfig = {
   apiKey: "AIzaSyCPgw3psc_ONzhMfguZMP1ed94TxRsSEQk",
  authDomain: "coaching-doorprize.firebaseapp.com",
  projectId: "coaching-doorprize",
  storageBucket: "coaching-doorprize.firebasestorage.app",
  messagingSenderId: "212319745595",
  appId: "1:212319745595:web:2bdc8d9da9118587c78e1e",
  measurementId: "G-NPJK2C25Y9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Untuk development, uncomment baris berikut jika menggunakan emulator
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export default app;