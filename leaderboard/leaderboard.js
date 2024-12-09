class Leaderboard {
    constructor() {
        this.isLoading = false;
        this.checkLogin();
        this.initializeRealTimeLeaderboard();
    }

    checkLogin() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login/';
            return;
        }
    }

    initializeRealTimeLeaderboard() {
        this.setLoading(true);
        
        try {
            const usersRef = window.collection(window.db, 'users');
            const q = window.query(
                usersRef,
                window.orderBy('balance', 'desc'),
                window.limit(100)
            );

            // Set up real-time listener
            window.onSnapshot(q, (snapshot) => {
                const rankings = snapshot.docs.map((doc, index) => ({
                    rank: index + 1,
                    username: doc.id,
                    ...doc.data()
                }));
                
                this.displayRankings(rankings);
                this.setLoading(false);

                // Add animation to updated rows
                snapshot.docChanges().forEach(change => {
                    if (change.type === "modified") {
                        const row = document.querySelector(`[data-username="${change.doc.id}"]`);
                        if (row) {
                            row.classList.add('row-updated');
                            setTimeout(() => row.classList.remove('row-updated'), 1000);
                        }
                    }
                });
            }, (error) => {
                console.error('Error loading leaderboard:', error);
                this.showError('Failed to load rankings. Please try again later.');
                this.setLoading(false);
            });

        } catch (error) {
            console.error('Error setting up leaderboard:', error);
            this.showError('Failed to initialize leaderboard. Please refresh the page.');
            this.setLoading(false);
        }
    }

    showError(message) {
        const container = document.querySelector('.leaderboard-container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'leaderboard-error';
        errorDiv.innerHTML = `
            <span class="material-icons">error_outline</span>
            <p>${message}</p>
            <button onclick="window.location.reload()">Refresh Page</button>
        `;
        
        container.innerHTML = '';
        container.appendChild(errorDiv);
    }

    displayRankings(rankings) {
        const tableBody = document.querySelector('.table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';

        if (rankings.length === 0) {
            tableBody.innerHTML = `
                <div class="table-row empty">
                    <div class="empty-message" colspan="4">
                        No players found
                    </div>
                </div>
            `;
            return;
        }

        rankings.forEach(player => {
            const row = document.createElement('div');
            row.className = 'table-row';
            row.setAttribute('data-username', player.username);
            
            row.innerHTML = `
                <div class="rank-col">#${player.rank}</div>
                <div class="player-col">
                    <div class="player-avatar">${player.username.charAt(0).toUpperCase()}</div>
                    <span>${player.username}</span>
                    ${player.isVIP ? '<span class="material-icons vip-badge">stars</span>' : ''}
                </div>
                <div class="balance-col">${window.formatLargeNumber(player.balance || 0)}</div>
            `;
            
            // Highlight current user's row
            if (player.username === localStorage.getItem('username')) {
                row.classList.add('current-user');
            }
            
            tableBody.appendChild(row);
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingElement = document.querySelector('.leaderboard-loading');
        const tableElement = document.querySelector('.leaderboard-table');
        
        if (!loadingElement || !tableElement) return;
        
        if (loading) {
            loadingElement.classList.add('show');
            tableElement.style.display = 'none';
        } else {
            loadingElement.classList.remove('show');
            tableElement.style.display = 'block';
        }
    }
}

// Initialize leaderboard when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be initialized
    const checkFirebase = setInterval(() => {
        if (window.db && window.collection) {
            clearInterval(checkFirebase);
            window.leaderboard = new Leaderboard();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.leaderboard) {
            console.error('Failed to initialize leaderboard: Firebase not available');
        }
    }, 5000);
}); 