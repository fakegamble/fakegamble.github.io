class GameHub {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100.00;
        this.lastAddMoney = parseInt(localStorage.getItem('lastAddMoney')) || 0;
        this.COOLDOWN_TIME = 5 * 60 * 1000;
        this.initializeUI();
        this.addEventListeners();
        this.initializeWelcomeMessage();
        this.initializeSettings();
        
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

    updateBalanceDisplay() {
        const balanceElement = document.querySelector('.balance-amount');
        balanceElement.textContent = `$${this.balance.toFixed(2)}`;
        localStorage.setItem('gameBalance', this.balance.toFixed(2));
        
        balanceElement.classList.add('balance-update');
        setTimeout(() => balanceElement.classList.remove('balance-update'), 500);
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
            addFundsBtn.innerHTML = '<span class="material-icons">add_circle</span>';
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

    addEventListeners() {
        window.addmoney = (amount) => {
            const timeLeft = this.getTimeLeftOnCooldown();
            
            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                this.showNotification(`Please wait ${seconds} seconds before adding more money!`, 'warning');
                return;
            }

            this.balance += amount;
            this.lastAddMoney = Date.now();
            localStorage.setItem('lastAddMoney', this.lastAddMoney);
            
            this.updateBalanceDisplay();
            this.updateAddMoneyButton();
            this.showNotification(`Successfully added $${amount.toFixed(2)}!`, 'success');
            
            this.startCooldownTimer();
        };
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
                // Save the current time as the last add money time
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
        const SCROLL_THRESHOLD = 50; // Minimum scroll before hiding/showing
        
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameHub = new GameHub();
});