class AdminDashboard {
    constructor() {
        // Check if already initialized
        if (window.adminDashboard) {
            return window.adminDashboard;
        }
        
        this.users = new Map();
        this.initializeDOM();
        this.initializeEventListeners();
        this.checkAuth();
        
        // Store instance globally
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
        this.fetchUsers(); // Initial fetch
        this.updateInterval = setInterval(() => this.fetchUsers(), 2000);
    }

    async fetchUsers() {
        const users = new Map();
        
        // Iterate through localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('user_')) {
                try {
                    const userData = JSON.parse(localStorage.getItem(key));
                    if (userData && typeof userData === 'object') {
                        users.set(key, {
                            ...userData,
                            id: key.replace('user_', '')
                        });
                    }
                } catch (e) {
                    console.error('Error parsing user data:', e);
                }
            }
        }
        
        this.users = users;
        this.updateUI();
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
        
        localStorage.setItem(userId, JSON.stringify(userData));
        this.fetchUsers();
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        localStorage.removeItem(userId);
        this.fetchUsers();
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