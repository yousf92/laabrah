
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAGgZmhJ_mMezlf7xElisvzJ8l9D758d4g",
    authDomain: "my-chat-app-daaf8.firebaseapp.com",
    projectId: "my-chat-app-daaf8",
    storageBucket: "my-chat-app-daaf8.firebasestorage.app",
    messagingSenderId: "789086064752",
    appId: "1:789086064752:web:d081f1b6832dabca1d64b5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db, firebase };
