class HorseRaceGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedHorse = null;
        this.horses = [];
        
        this.gamesPlayed = parseInt(localStorage.getItem('horserace_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('horserace_gamesWon')) || 0;
        
        this.multipliers = {
            1: 2,
            2: 3,
            3: 4,
            4: 5
        };

        // Add balance change listener
        Object.defineProperty(window, 'playerBalance', {
            get: function() {
                return this._playerBalance;
            },
            set: function(newValue) {
                this._playerBalance = newValue;
                this.updateBalanceDisplay();
            }.bind(this)
        });
        
        if (typeof window.playerBalance === 'undefined') {
            window.addEventListener('balanceInitialized', () => {
                this.initialize();
            });
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.initializeDOM();
        this.initializeEventListeners();
        this.setupBalanceListener();
        this.updateBalanceDisplay();
        this.updateStats();
    }

    setupBalanceListener() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login.html';
            return;
        }
        const playerRef = window.doc(window.db, "users", username);
        
        window.onSnapshot(playerRef, (doc) => {
            if (doc.exists()) {
                const newBalance = doc.data().balance;
                if (newBalance !== window.playerBalance) {
                    window.playerBalance = newBalance;
                    this.updateBalanceDisplay();
                }
            } else {
                // If user document doesn't exist, redirect to login
                localStorage.removeItem('username');
                localStorage.removeItem('userId');
                window.location.href = '/login.html';
            }
        });
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.horseButtons = document.querySelectorAll('.horse-btn');
        this.resultOverlay = document.querySelector('.result-overlay');
        this.horses = document.querySelectorAll('.horse');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.startRace());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
        
        this.horseButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.horseButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.selectedHorse = parseInt(button.dataset.horse);
            });
        });
    }

    async startRace() {
        if (this.gameActive || !this.selectedHorse) return;
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        window.playerBalance -= this.betAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        this.actionButton.disabled = true;

        // Reset horses to starting position
        this.horses.forEach(horse => {
            horse.style.left = '0';
        });

        // Simulate race with smoother movement
        const raceInterval = setInterval(() => {
            this.horses.forEach(horse => {
                const currentLeft = parseFloat(horse.style.left) || 0;
                // Smaller, more frequent movements for smoother animation
                const movement = Math.random() * 1.2; // Reduced from 2 to 1.2
                horse.style.left = `${currentLeft + movement}%`;
            });

            // Check for winner
            const winner = Array.from(this.horses).find(horse => {
                const rect = horse.getBoundingClientRect();
                const lane = horse.closest('.track-lane');
                const finish = lane.querySelector('.finish-line').getBoundingClientRect();
                return rect.right >= finish.left;
            });

            if (winner) {
                clearInterval(raceInterval);
                this.endRace(parseInt(winner.closest('.track-lane').dataset.horse));
            }
        }, 33); // Changed from 50ms to 33ms (approximately 30fps)
    }

    async endRace(winningHorse) {
        this.gamesPlayed++;
        this.gameActive = false;
        this.actionButton.disabled = false;

        if (winningHorse === this.selectedHorse) {
            this.gamesWon++;
            const winAmount = this.betAmount * this.multipliers[winningHorse];
            window.playerBalance += winAmount;
            await window.updateBalance(window.playerBalance);
            this.showResult('Win!', `$${winAmount.toFixed(2)}`);
        } else {
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }

        this.updateStats();
        this.updateBalanceDisplay();
    }

    showResult(text, amount, isError = false) {
        const overlay = this.resultOverlay;
        overlay.querySelector('.result-text').textContent = text;
        const amountElement = overlay.querySelector('.result-amount');
        
        const cleanAmount = amount.replace(/[+\-$]/g, '');
        amountElement.textContent = `$${cleanAmount}`;
        
        amountElement.classList.remove('win', 'lose', 'error');
        if (isError) {
            amountElement.classList.add('error');
        } else if (amount.startsWith('-')) {
            amountElement.classList.add('lose');
        } else {
            amountElement.classList.add('win');
        }
        
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 2000);
    }

    updateStats() {
        const winRate = this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : '0.0';
        document.querySelector('.win-rate-value').textContent = `${winRate}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        localStorage.setItem('horserace_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('horserace_gamesWon', this.gamesWon);
    }

    updateBalanceDisplay() {
        const balance = window.playerBalance || 0;
        const formattedBalance = balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.querySelectorAll('.balance-amount').forEach(element => {
            element.textContent = `$${formattedBalance}`;
        });
    }

    adjustBet(multiplier) {
        this.betAmount = parseFloat(this.betInput.value) * multiplier;
        this.betInput.value = this.betAmount.toFixed(2);
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HorseRaceGame();
});