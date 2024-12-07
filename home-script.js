class GameHub {
    constructor() {
        this.balance = 0;
        this.lastAddMoney = parseInt(localStorage.getItem('lastAddMoney')) || 0;
        this.COOLDOWN_TIME = 5 * 60 * 1000;
        this.initializeUI();
        this.addEventListeners();
        this.initializeWelcomeMessage();
        this.initializeSettings();
        this.setupBalanceListener();
        
        if (this.getTimeLeftOnCooldown() > 0) {
            this.startCooldownTimer();
        }
        this.initializeHeaderScroll();
    }

    initializeUI() {
        this.updateBalanceDisplay();
        this.initializeCategories();
        this.updateAddMoneyButton();
        this.showWelcomeEffect();
        this.disableZoom();
    }

    showWelcomeEffect() {
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    initializeWelcomeMessage() {
        const username = localStorage.getItem('username') || 'Player';
        const mainContent = document.querySelector('.main-content');
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <h2>Welcome back, ${username}! 🎮</h2>
            <p>Ready to play? Choose your game below!</p>
        `;
        mainContent.insertBefore(welcomeDiv, mainContent.firstChild);
    }

    setupBalanceListener() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login.html';
            return;
        }

        const playerRef = doc(db, "users", username);
        onSnapshot(playerRef, (doc) => {
            if (doc.exists()) {
                window.playerBalance = doc.data().balance;
                this.updateBalanceDisplay();
            } else {
                localStorage.removeItem('username');
                localStorage.removeItem('userId');
                window.location.href = '/login.html';
            }
        });
    }

    updateBalanceDisplay() {
        const balanceElement = document.querySelector('.balance-amount');
        if (!balanceElement) return;
        
        const currentBalance = window.playerBalance || 0;
        balanceElement.textContent = this.formatLargeNumber(currentBalance);
        
        balanceElement.classList.remove('balance-update');
        void balanceElement.offsetWidth;
        balanceElement.classList.add('balance-update');
        
        setTimeout(() => {
            balanceElement.classList.remove('balance-update');
        }, 500);
    }

    updateAddMoneyButton() {
        const addFundsBtn = document.querySelector('.add-funds');
        const timeLeft = this.getTimeLeftOnCooldown();
        
        if (timeLeft > 0) {
            addFundsBtn.disabled = true;
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            addFundsBtn.innerHTML = `<span class="material-icons">hourglass_empty</span> ${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            addFundsBtn.disabled = false;
            addFundsBtn.innerHTML = '<span class="material-icons">add_circle</span> Get $1,000';
        }
    }

    getTimeLeftOnCooldown() {
        const now = Date.now();
        const timeSinceLastAdd = now - this.lastAddMoney;
        return Math.max(0, this.COOLDOWN_TIME - timeSinceLastAdd);
    }

    initializeCategories() {
        const categories = document.querySelectorAll('.category');
        categories.forEach(category => {
            category.addEventListener('click', () => {
                categories.forEach(c => c.classList.remove('active'));
                category.classList.add('active');
                
                const gamesContainer = document.querySelector('.games-container');
                gamesContainer.style.opacity = '0';
                setTimeout(() => {
                    gamesContainer.style.opacity = '1';
                }, 300);
            });
        });
    }

    async addEventListeners() {
        const addFundsBtn = document.querySelector('.add-funds');
        addFundsBtn.addEventListener('click', async () => {
            const timeLeft = this.getTimeLeftOnCooldown();
            
            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                this.showNotification(`Please wait ${seconds} seconds before adding more money!`, 'warning');
                return;
            }

            const amount = 1000;
            const username = localStorage.getItem('username');
            
            if (!username) {
                window.location.href = '/login.html';
                return;
            }
            
            try {
                await window.updateBalance(window.playerBalance + amount);
                
                this.lastAddMoney = Date.now();
                localStorage.setItem('lastAddMoney', this.lastAddMoney);
                
                this.updateAddMoneyButton();
                this.showNotification(`Successfully added $${amount.toFixed(2)}!`, 'success');
                
                this.startCooldownTimer();
            } catch (error) {
                console.error("Error adding money:", error);
                this.showNotification("Failed to add money. Please try again.", 'error');
            }
        });
    }

    startCooldownTimer() {
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
        }

        this.updateAddMoneyButton();
        
        this.cooldownTimer = setInterval(() => {
            const timeLeft = this.getTimeLeftOnCooldown();
            this.updateAddMoneyButton();
            
            if (timeLeft <= 0) {
                clearInterval(this.cooldownTimer);
                this.showNotification('You can add money again!', 'info');
                this.lastAddMoney = Date.now();
                localStorage.setItem('lastAddMoney', this.lastAddMoney);
            }
        }, 1000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    initializeSettings() {
        const settingsBtn = document.querySelector('.settings-btn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettings = document.querySelector('.close-settings');
        const colorInputs = document.querySelectorAll('.color-option input');
        const resetColors = document.querySelector('.reset-colors');

        this.loadSavedColors();

        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
            setTimeout(() => {
                settingsModal.classList.add('show');
            }, 10);
        });

        closeSettings.addEventListener('click', () => {
            settingsModal.classList.remove('show');
            setTimeout(() => {
                settingsModal.style.display = 'none';
            }, 300);
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
                setTimeout(() => {
                    settingsModal.style.display = 'none';
                }, 300);
            }
        });

        colorInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateColors();
            });
        });

        resetColors.addEventListener('click', () => {
            this.resetColors();
        });
    }

    loadSavedColors() {
        const defaultColors = {
            primaryColor: '#4f46e5',
            accentColor: '#7c3aed',
            backgroundColor: '#0f172a'
        };

        const savedColors = JSON.parse(localStorage.getItem('themeColors')) || defaultColors;

        document.getElementById('primaryColor').value = savedColors.primaryColor;
        document.getElementById('accentColor').value = savedColors.accentColor;
        document.getElementById('backgroundColor').value = savedColors.backgroundColor;

        this.applyColors(savedColors);
    }

    updateColors() {
        const colors = {
            primaryColor: document.getElementById('primaryColor').value,
            accentColor: document.getElementById('accentColor').value,
            backgroundColor: document.getElementById('backgroundColor').value
        };

        this.applyColors(colors);
        localStorage.setItem('themeColors', JSON.stringify(colors));
    }

    resetColors() {
        const defaultColors = {
            primaryColor: '#4f46e5',
            accentColor: '#7c3aed',
            backgroundColor: '#0f172a'
        };

        document.getElementById('primaryColor').value = defaultColors.primaryColor;
        document.getElementById('accentColor').value = defaultColors.accentColor;
        document.getElementById('backgroundColor').value = defaultColors.backgroundColor;

        this.applyColors(defaultColors);
        localStorage.setItem('themeColors', JSON.stringify(defaultColors));
    }

    applyColors(colors) {
        document.documentElement.style.setProperty('--primary-color', colors.primaryColor);
        document.documentElement.style.setProperty('--accent-color', colors.accentColor);
        document.documentElement.style.setProperty('--background-color', colors.backgroundColor);
    }

    disableZoom() {
        document.addEventListener('wheel', function(e) {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
                e.preventDefault();
            }
        });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd < 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    initializeHeaderScroll() {
        let lastScroll = 0;
        let headerTimeout;
        const header = document.querySelector('.main-header');
        const SCROLL_THRESHOLD = 50;
        
        window.addEventListener('scroll', () => {
            clearTimeout(headerTimeout);
            
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                header.classList.remove('header-hidden');
                return;
            }
            
            if (currentScroll > lastScroll && currentScroll > SCROLL_THRESHOLD) {
                header.classList.add('header-hidden');
            } 

            else if (currentScroll < lastScroll) {
                header.classList.remove('header-hidden');
            }
            
            lastScroll = currentScroll;
            
            headerTimeout = setTimeout(() => {
                header.classList.remove('header-hidden');
            }, 3000);
        }, { passive: true });
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches[0].clientY < 50) {
                header.classList.remove('header-hidden');
            }
        }, { passive: true });
    }

    formatLargeNumber(num) {
        const abbreviations = {
            33: 'Tg', 32: 'Nnvg', 31: 'Ocvg', 30: 'Spvg', 29: 'Sxvg', 28: 'Qivg',
            27: 'Qvg', 26: 'Tvg', 25: 'Dvg', 24: 'Uvg', 23: 'Vg', 22: 'Nnd',
            21: 'Ocd', 20: 'Spd', 19: 'Sxd', 18: 'Qi', 17: 'Qd', 16: 'Td',
            15: 'Dd', 14: 'Ud', 13: 'Dc', 12: 'Nn', 11: 'Oc', 10: 'Sp',
            9: 'Sx', 8: 'Qn', 7: 'q'
        };

        if (num < 1e15) {
            return `$${num.toFixed(2)}`;
        }

        const exp = Math.floor(Math.log10(num) / 3);
        for (let e = 33; e >= 7; e--) {
            const limit = Math.pow(10, e * 3);
            if (num >= limit) {
                return `$${(num / limit).toFixed(2)}${abbreviations[e]}+`;
            }
        }
        return `$${num.toFixed(2)}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameHub = new GameHub();
});