import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

class AdminDashboard {
    constructor() {
        // Check if already initialized
        if (window.adminDashboard) {
            return window.adminDashboard;
        }
        
        // Initialize Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyBWSvCUgql8OcoubCi0GeAvVnCW_3bEsWw",
            authDomain: "views-d0b3b.firebaseapp.com",
            projectId: "views-d0b3b",
            storageBucket: "views-d0b3b.firebasestorage.app",
            messagingSenderId: "27855410097",
            appId: "1:27855410097:web:02e7a49a01be10ddc32390",
            measurementId: "G-5DPDZYDRFJ"
        };
        
        const app = initializeApp(firebaseConfig);
        this.database = getDatabase(app);
        
        this.users = new Map();
        this.initializeDOM();
        this.initializeEventListeners();
        this.checkAuth();
        
        window.adminDashboard = this;
    }

    initializeDOM() {
        // Login elements
        this.loginForm = document.getElementById('loginForm');
        this.passcodeInput = document.getElementById('passcodeInput');
        this.loginButton = document.getElementById('loginButton');
        this.errorMessage = document.getElementById('errorMessage');
        this.dashboardContent = document.getElementById('dashboardContent');
        this.logoutButton = document.getElementById('logoutButton');

        // Dashboard elements
        this.searchInput = document.getElementById('searchInput');
        this.sortSelect = document.getElementById('sortSelect');
        this.usersTableBody = document.getElementById('usersTableBody');
        this.totalUsersElement = document.getElementById('totalUsers');
        this.totalBalanceElement = document.getElementById('totalBalance');

        // Ensure dashboard is hidden initially
        if (this.dashboardContent) {
            this.dashboardContent.style.display = 'none';
        }
    }

    initializeEventListeners() {
        // Login events
        if (this.loginButton) {
            this.loginButton.addEventListener('click', () => this.login());
        }
        if (this.logoutButton) {
            this.logoutButton.addEventListener('click', () => this.logout());
        }
        if (this.passcodeInput) {
            this.passcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }

        // Dashboard events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.filterUsers());
        }
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', () => this.sortUsers());
        }
    }

    async login() {
        const inputPasscode = this.passcodeInput.value;
        if (inputPasscode === '4185') {
            localStorage.setItem('adminAuth', 'true');
            this.showDashboard();
            this.startRealtimeUpdates();
        } else {
            if (this.errorMessage) {
                this.errorMessage.textContent = 'Invalid passcode';
            }
            if (this.passcodeInput) {
                this.passcodeInput.value = '';
            }
        }
    }

    logout() {
        localStorage.removeItem('adminAuth');
        this.hideDashboard();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    checkAuth() {
        const isAuth = localStorage.getItem('adminAuth') === 'true';
        if (isAuth) {
            this.showDashboard();
            this.startRealtimeUpdates();
        } else {
            this.hideDashboard();
        }
    }

    showDashboard() {
        if (this.loginForm) {
            this.loginForm.style.display = 'none';
        }
        if (this.dashboardContent) {
            this.dashboardContent.style.display = 'block';
        }
        if (this.errorMessage) {
            this.errorMessage.textContent = '';
        }
        if (this.passcodeInput) {
            this.passcodeInput.value = '';
        }
    }

    hideDashboard() {
        if (this.loginForm) {
            this.loginForm.style.display = 'flex';
        }
        if (this.dashboardContent) {
            this.dashboardContent.style.display = 'none';
        }
    }

    startRealtimeUpdates() {
        this.fetchUsers();
    }

    async fetchUsers() {
        const usersRef = ref(this.database, 'users');
        
        onValue(usersRef, (snapshot) => {
            const users = new Map();
            
            snapshot.forEach((childSnapshot) => {
                const userData = childSnapshot.val();
                const userId = childSnapshot.key;
                users.set(`user_${userId}`, {
                    ...userData,
                    id: userId
                });
            });
            
            this.users = users;
            this.updateUI();
        });
    }

    updateUI() {
        if (!this.totalUsersElement || !this.totalBalanceElement || !this.usersTableBody) {
            return;
        }

        // Update stats
        this.totalUsersElement.textContent = this.users.size;
        
        const totalBalance = Array.from(this.users.values())
            .reduce((sum, user) => sum + (parseFloat(user.balance) || 0), 0);
        this.totalBalanceElement.textContent = `$${totalBalance.toFixed(2)}`;

        this.renderUsersTable();
    }

    renderUsersTable() {
        if (!this.usersTableBody || !this.searchInput || !this.sortSelect) {
            return;
        }

        const searchTerm = this.searchInput.value.toLowerCase();
        const sortType = this.sortSelect.value;

        let users = Array.from(this.users.entries())
            .filter(([key, user]) => {
                return user.id.toLowerCase().includes(searchTerm);
            });

        // Sort users
        users.sort(([, a], [, b]) => {
            switch (sortType) {
                case 'balance-desc':
                    return (b.balance || 0) - (a.balance || 0);
                case 'balance-asc':
                    return (a.balance || 0) - (b.balance || 0);
                case 'lastActive-desc':
                    return (b.lastActive || 0) - (a.lastActive || 0);
                case 'lastActive-asc':
                    return (a.lastActive || 0) - (b.lastActive || 0);
                default:
                    return 0;
            }
        });

        this.usersTableBody.innerHTML = users.map(([key, user]) => `
            <tr>
                <td>${user.id}</td>
                <td>$${(user.balance || 0).toFixed(2)}</td>
                <td>${this.formatLastActive(user.lastActive)}</td>
                <td>
                    <button class="action-btn" onclick="window.adminDashboard.editUser('${key}')">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="action-btn danger" onclick="window.adminDashboard.deleteUser('${key}')">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    formatLastActive(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    async editUser(userId) {
        const newBalance = prompt('Enter new balance:');
        if (newBalance === null) return;

        const balance = parseFloat(newBalance);
        if (isNaN(balance)) {
            alert('Please enter a valid number');
            return;
        }

        const userData = this.users.get(userId) || {};
        userData.balance = balance;
        userData.lastActive = Date.now();
        
        const userRef = ref(this.database, `users/${userId.replace('user_', '')}`);
        await update(userRef, userData);
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        const userRef = ref(this.database, `users/${userId.replace('user_', '')}`);
        await remove(userRef);
    }

    filterUsers() {
        this.renderUsersTable();
    }

    sortUsers() {
        this.renderUsersTable();
    }
}

// Initialize dashboard only once
if (!window.adminDashboard) {
    window.adminDashboard = new AdminDashboard();
}
