// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore'; // ←★この1行を追加しました！

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCb0WrVDOLavj2nHPcOCf8gQzJKwf4GNaA',
  authDomain: 'my-restaurant-shift.firebaseapp.com',
  projectId: 'my-restaurant-shift',
  storageBucket: 'my-restaurant-shift.firebasestorage.app',
  messagingSenderId: '418889808365',
  appId: '1:418889808365:web:f1d3607801be63c31c0fe4',
  measurementId: 'G-NPVGPRMN4K',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app); // ←ここで使っているので、上のimportが必須でした
