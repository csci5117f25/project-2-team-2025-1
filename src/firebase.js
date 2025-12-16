// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {

    apiKey: "AIzaSyC6oGcHyMJXArAT-BFxw8BfNn-eEiIzEuM",

    authDomain: "project2-f33f1.firebaseapp.com",

    projectId: "project2-f33f1",

    storageBucket: "project2-f33f1.firebasestorage.app",

    messagingSenderId: "889285337798",

    appId: "1:889285337798:web:de1f32bfb7edd90037edc7",

    measurementId: "G-KP4X5FJFZG"

};



// if not configured, don't initialize and export nulls
let app
let storage
let db
let auth
try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig)
        // optional: initialize analytics if available in the environment
        try { getAnalytics(app) } catch (e) { /* ignore in non-browser envs */ }
        storage = getStorage(app)
        db = getFirestore(app)
        auth = getAuth(app)
    }
} catch (e) {
    // initialization failed (likely missing env vars); leave undefined
}

export { storage, db, auth }
