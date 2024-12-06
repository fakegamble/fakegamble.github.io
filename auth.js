import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class AuthManager {
    constructor() {
        this.db = getFirestore();
        this.currentUser = null;
        this.loadSession();
    }

    loadSession() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            return true;
        }
        return false;
    }

    async login(username, password) {
        try {
            const userRef = doc(this.db, "users", username.toLowerCase());
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error("User not found");
            }

            const userData = userDoc.data();
            if (userData.password !== this.hashPassword(password)) {
                throw new Error("Invalid password");
            }

            this.currentUser = {
                username: username.toLowerCase(),
                displayName: userData.displayName || username
            };
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            return this.currentUser;

        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    }

    async register(username, password, displayName) {
        try {
            username = username.toLowerCase();
            const userRef = doc(this.db, "users", username);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                throw new Error("Username already taken");
            }

            const userData = {
                username,
                displayName: displayName || username,
                password: this.hashPassword(password),
                createdAt: new Date().toISOString()
            };

            await setDoc(userRef, userData);
            
            this.currentUser = {
                username,
                displayName: userData.displayName
            };
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            return this.currentUser;

        } catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('userData');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    hashPassword(password) {
        // In a real application, use a proper hashing algorithm
        // This is a simple hash for demonstration
        return btoa(password);
    }
} 