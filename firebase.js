import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut, updateProfile, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUKh8DP3RWlRTXpIZSFrpIlBJ7t7dPThA",
    authDomain: "notesaverai.firebaseapp.com",
    projectId: "notesaverai",
    storageBucket: "notesaverai.firebasestorage.app",
    messagingSenderId: "1085695840430",
    appId: "1:1085695840430:web:8430146df69ba452b3dd3f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

window.__fb = { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, signInWithPopup, provider };
window.dispatchEvent(new Event('firebase-ready'));
