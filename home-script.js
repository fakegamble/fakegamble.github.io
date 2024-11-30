class GameHub {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100.00;
        this.lastAddMoney = parseInt(localStorage.getItem('lastAddMoney')) || 0;
        this.COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.initializeUI();
        this.addEventListeners();
        this.initializeWelcomeMessage();
        this.initializeSettings();
        
        // Start timer if there's an active cooldown
        if (this.getTimeLeftOnCooldown() > 0) {
            this.startCooldownTimer();
        }
        
        // Initialize player counter
        this.initializePlayerCounter();
    }

    initializeUI() {
        this.updateBalanceDisplay();
        this.initializeCategories();
        this.updateAddMoneyButton();
        
        // Add some visual flair with confetti on load
        this.showWelcomeEffect();
    }

    showWelcomeEffect() {
        // Simple confetti effect (you'll need to add confetti.js to your project)
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
        
        // Add animation effect when balance changes
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
                
                // Add subtle animation when switching categories
                const gamesContainer = document.querySelector('.games-container');
                gamesContainer.style.opacity = '0';
                setTimeout(() => {
                    // Add filtering logic here when you have more games
                    gamesContainer.style.opacity = '1';
                }, 300);
            });
        });
    }

    addEventListeners() {
        // Add global money function with cooldown
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
            
            // Start cooldown timer update
            this.startCooldownTimer();
        };
    }

    startCooldownTimer() {
        // Clear any existing timer
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
        }

        // Update immediately and then start interval
        this.updateAddMoneyButton();
        
        this.cooldownTimer = setInterval(() => {
            const timeLeft = this.getTimeLeftOnCooldown();
            this.updateAddMoneyButton();
            
            if (timeLeft <= 0) {
                clearInterval(this.cooldownTimer);
                this.showNotification('You can add money again!', 'info');
            }
        }, 1000); // Update every second
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 3 seconds
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

        // Load saved colors
        this.loadSavedColors();

        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('show');
        });

        closeSettings.addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });

        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }
        });

        // Handle color changes
        colorInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateColors();
            });
        });

        // Reset colors
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

        // Set input values
        document.getElementById('primaryColor').value = savedColors.primaryColor;
        document.getElementById('accentColor').value = savedColors.accentColor;
        document.getElementById('backgroundColor').value = savedColors.backgroundColor;

        // Apply colors
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

        // Reset input values
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

    initializePlayerCounter() {
        // Create a unique counter ID for your site
        const COUNTER_ID = 'fake-gamble-site';
        const API_KEY = 'your_api_ninjas_key'; // You'll need to sign up at api-ninjas.com
        
        const updatePlayerCount = async () => {
            try {
                const response = await fetch(
                    `https://api.api-ninjas.com/v1/counter?id=${COUNTER_ID}&hit=true`,
                    {
                        headers: {
                            'X-Api-Key': API_KEY
                        }
                    }
                );
                
                const data = await response.json();
                const playerCountElement = document.querySelector('.player-count-number');
                
                // Add animation when updating the count
                playerCountElement.classList.remove('balance-update');
                void playerCountElement.offsetWidth; // Trigger reflow
                playerCountElement.classList.add('balance-update');
                
                // Update the count
                playerCountElement.textContent = data.value;
                
            } catch (error) {
                console.error('Error updating player count:', error);
            }
        };

        // Update immediately and then every 30 seconds
        updatePlayerCount();
        setInterval(updatePlayerCount, 30000);

        // Update count when visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                updatePlayerCount();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameHub = new GameHub();
}); 