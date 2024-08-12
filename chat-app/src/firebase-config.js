import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // Import getStorage from Firebase

const firebaseConfig = {
  apiKey: "AIzaSyATPLpnLfTFHL49Ux_HcTw9mCgk7iMwhpY",
  authDomain: "lets-chat-to.firebaseapp.com",
  projectId: "lets-chat-to",
  storageBucket: "lets-chat-to.appspot.com",
  messagingSenderId: "515282360262",
  appId: "1:515282360262:web:d4774f623abc99d68c44c7",
  measurementId: "G-MVJYVRR5T3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);
