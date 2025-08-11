import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBA84feVaHbpH6wGD4LjNiG0ENMBrsBtiw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "forms-98efd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "forms-98efd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "forms-98efd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "992114138614",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:992114138614:web:a211832b729804bc54bbd7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HM6WH706MC"
};

// Check if environment variables are loaded
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  authDomain: firebaseConfig.authDomain ? 'Set' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Set' : 'Missing'
});

console.log('Full Firebase Config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with custom resolver
export const auth = getAuth(app);
auth.useDeviceLanguage();
auth.settings.appVerificationDisabledForTesting = false;

// Use custom popup redirect resolver for better domain handling
auth.useDeviceLanguage();

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});

// Configure Google provider with better error handling
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Add additional parameters for better domain handling
  hd: '', // Allow any hosted domain
});

// Add scopes if needed
googleProvider.addScope('email');
googleProvider.addScope('profile');

console.log('Firebase initialized successfully');

export default app; 