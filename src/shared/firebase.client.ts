import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBIyST2glGpq6guZ8-yTlegn_wGRTeKw8s",
    authDomain: "voes-a88f4.firebaseapp.com",
    projectId: "voes-a88f4",
    storageBucket: "voes-a88f4.firebasestorage.app",
    messagingSenderId: "79915571390",
    appId: "1:79915571390:web:fe7659ef2933e1167826ef",
    measurementId: "G-2THWFQZF51"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fireStorage = getStorage(app);