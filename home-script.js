class GameHub {
    constructor() {
        this.COOLDOWN_TIME = 3600000;
        this.initializeUI();
        this.addEventListeners();
        this.initializeSettings();
        this.setupBalanceListener();
        this.initializeHeaderScroll();
        this.pinnedGames = JSON.parse(localStorage.getItem('pinnedGames')) || ['crash', 'slots'];
        this.initializePinButtons();
        this.initializePinnedGames();
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

    setupBalanceListener() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login/';
            return;
        }

        const playerRef = doc(db, "users", username);
        onSnapshot(playerRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                window.playerBalance = userData.balance;
                window.lastFreeReward = userData.lastFreeReward || 0;
                
                if (isNaN(window.playerBalance)) {
                    console.warn("Invalid balance detected, resetting to $1");
                    window.playerBalance = 1;
                    updateBalance(1);
                }
                this.updateBalanceDisplay();
                this.updateAddMoneyButton();
            } else {
                localStorage.removeItem('username');
                localStorage.removeItem('userId');
                window.location.href = '/login/';
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
            addFundsBtn.textContent = `Wait ${timeLeft} sec`;
        } else {
            addFundsBtn.disabled = false;
            addFundsBtn.textContent = 'Get $1,000';
        }
    }

    getTimeLeftOnCooldown() {
        const now = Date.now();
        const lastReward = window.lastFreeReward || 0;
        const timeSinceLastReward = now - lastReward;
        const timeLeft = Math.ceil((this.COOLDOWN_TIME - timeSinceLastReward) / 1000);
        return Math.max(0, timeLeft);
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
                this.showNotification(`Please wait ${timeLeft} seconds before adding more money!`, 'warning');
                return;
            }

            const amount = 1000;
            const username = localStorage.getItem('username');
            
            if (!username) {
                window.location.href = '/login/';
                return;
            }
            
            try {
                const now = Date.now();
                const playerRef = doc(db, "users", username);
                await setDoc(playerRef, {
                    balance: (window.playerBalance || 0) + amount,
                    lastFreeReward: now
                }, { merge: true });
                
                window.lastFreeReward = now;
                this.showNotification(`Successfully added $${amount.toFixed(2)}!`, 'success');
                
                if (!window.isVIP) {
                    setTimeout(() => {
                        this.showNotification('Want more money? Buy VIP ($5) 👑', 'info', 8000);
                    }, 1500);
                }
            } catch (error) {
                console.error("Error adding money:", error);
                this.showNotification("Failed to add money. Please try again.", 'error');
            }
        });
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.querySelector('.notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon;
        switch(type) {
            case 'success':
                icon = 'check_circle';
                break;
            case 'warning':
                icon = 'warning';
                break;
            case 'error':
                icon = 'error';
                break;
            default:
                icon = 'info';
        }
        
        notification.innerHTML = `
            <span class="material-icons icon">${icon}</span>
            <div class="content">
                <div class="message">${message}</div>
            </div>
            <button class="close-btn">
                <span class="material-icons">close</span>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Handle close button
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
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

    initializePinButtons() {
        const gamesContainer = document.querySelector('.games-container');
        const pinButtons = document.querySelectorAll('.pin-button');
        
        // Set initial pinned states
        this.pinnedGames.forEach(gameId => {
            const button = document.querySelector(`.pin-button[data-game="${gameId}"]`);
            const gameCard = button?.closest('.game-card');
            if (button && gameCard) {
                button.classList.add('pinned');
                gameCard.classList.add('pinned');
                const pinnedIcon = document.createElement('span');
                pinnedIcon.className = 'material-icons pinned-icon';
                pinnedIcon.textContent = 'push_pin';
                gameCard.querySelector('h3').appendChild(pinnedIcon);
                // Move to the beginning of container
                gamesContainer.prepend(gameCard);
            }
        });

        // Add click handlers
        pinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const gameId = button.dataset.game;
                const gameCard = button.closest('.game-card');
                
                if (this.pinnedGames.includes(gameId)) {
                    // Unpin
                    this.pinnedGames = this.pinnedGames.filter(id => id !== gameId);
                    button.classList.remove('pinned');
                    gameCard.classList.remove('pinned');
                    const pinnedIcon = gameCard.querySelector('.pinned-icon');
                    if (pinnedIcon) pinnedIcon.remove();
                    // Optional: Move back to original position
                    gamesContainer.appendChild(gameCard);
                } else {
                    // Pin
                    this.pinnedGames.push(gameId);
                    button.classList.add('pinned');
                    gameCard.classList.add('pinned');
                    const pinnedIcon = document.createElement('span');
                    pinnedIcon.className = 'material-icons pinned-icon';
                    pinnedIcon.textContent = 'push_pin';
                    gameCard.querySelector('h3').appendChild(pinnedIcon);
                    gamesContainer.prepend(gameCard);
                }
                
                localStorage.setItem('pinnedGames', JSON.stringify(this.pinnedGames));
            });
        });
    }

    initializePinnedGames() {
        const gamesContainer = document.querySelector('.games-container');
        
        this.pinnedGames.forEach(gameId => {
            const gameCard = document.querySelector(`a[href="/games/${gameId}/"]`);
            if (gameCard && gamesContainer) {
                const pinnedIcon = gameCard.querySelector('.pinned-icon');
                if (pinnedIcon) {
                    gamesContainer.prepend(gameCard);
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameHub = new GameHub();
});