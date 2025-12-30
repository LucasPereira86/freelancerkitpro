// Firebase Configuration
// Projeto: freelancerkitpro

const firebaseConfig = {
    apiKey: "AIzaSyAlGPs7VaPKPynsve7BGzXNZgbS0TOh9ik",
    authDomain: "freelancerkitpro.firebaseapp.com",
    databaseURL: "https://freelancerkitpro-default-rtdb.firebaseio.com",
    projectId: "freelancerkitpro",
    storageBucket: "freelancerkitpro.firebasestorage.app",
    messagingSenderId: "227159057848",
    appId: "1:227159057848:web:16e9835ca6f547d7b65b4d",
    measurementId: "G-T1F7HV749N"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth and Realtime Database references
const auth = firebase.auth();
const db = firebase.database();

// Check if config is valid
function isFirebaseConfigured() {
    return true;
}
