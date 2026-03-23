import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut, updateProfile, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKSnq6AMJ-WVsNrWzfE3cl43GkcakO3_Q",
    authDomain: "ainotesaver.firebaseapp.com",
    projectId: "ainotesaver",
    storageBucket: "ainotesaver.firebasestorage.app",
    messagingSenderId: "522688121145",
    appId: "1:522688121145:web:0c938e5b15b9ff7129c0e8",
    measurementId: "G-LZ0WL3CBP8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

window.__fb = { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, signInWithPopup, provider };
window.dispatchEvent(new Event('firebase-ready'));
