import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - provided by user
const firebaseConfig = {
  apiKey: "AIzaSyATv0S4k2pVcnm4y1HawPRHraFjn6jyl8w",
  authDomain: "time-pass-64e77.firebaseapp.com",
  projectId: "time-pass-64e77",
  storageBucket: "time-pass-64e77.firebasestorage.app",
  messagingSenderId: "1007602442906",
  appId: "1:1007602442906:web:4a646c46081ded7f447523",
  measurementId: "G-G8ZDLHKFC2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
