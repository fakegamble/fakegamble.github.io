class CoinFlipGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedChoice = null;
        this.currentStreak = 0;
        
        this.gamesPlayed = parseInt(localStorage.getItem('coinflip_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('coinflip_gamesWon')) || 0;
        
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
        const deviceId = window.getDeviceId();
        const playerRef = window.doc(window.db, "players", deviceId);
        
        window.onSnapshot(playerRef, (doc) => {
            if (doc.exists()) {
                window.playerBalance = doc.data().balance;
                this.updateBalanceDisplay();
            }
        });
    }

    updateBalanceDisplay() {
        const balance = window.playerBalance || 0;
        const formattedBalance = balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.querySelector('.balance-amount').textContent = `$${formattedBalance}`;
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.coin = document.querySelector('.coin');
        this.resultOverlay = document.querySelector('.result-overlay');
        this.choiceButtons = document.querySelectorAll('.choice-btn');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.flip());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
        
        this.choiceButtons.forEach(button => {
            button.addEventListener('click', () => this.setChoice(button.dataset.choice));
        });
    }

    setChoice(choice) {
        this.selectedChoice = choice;
        this.choiceButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.choice === choice);
        });
    }
    async flip() {
        if (this.gameActive) return;
        if (!this.selectedChoice) {
            this.showResult('Error', 'Please select a side: Heads or Tails.', true);
            return;
        }
        if (this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Insufficient balance', true);
            return;
        }

        this.gameActive = true;
        await window.updateBalance(window.playerBalance - this.betAmount);
        this.actionButton.disabled = true;

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const rotations = result === 'heads' ? 10 : 9;
        
        this.coin.style.transform = `rotateY(${rotations * 180}deg)`;
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        const won = result === this.selectedChoice;
        
        if (won) {
            this.gamesWon++;
            this.currentStreak++;
            const multiplier = this.getMultiplier();
            const winAmount = this.betAmount * multiplier;
            await window.updateBalance(window.playerBalance + winAmount);
            this.showResult('Win!', `$${winAmount.toFixed(2)}`);
        } else {
            this.currentStreak = 0;
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }

        this.gamesPlayed++;
        this.updateStats();
        
        this.gameActive = false;
        this.actionButton.disabled = false;
        this.coin.style.transform = 'rotateY(0)';
    }

    getMultiplier() {
        // Base multiplier is 2x
        // Every 3 wins in a streak adds 0.5x to the multiplier
        return 2 + (Math.floor(this.currentStreak / 3) * 0.5);
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
        const winRate = this.gamesPlayed === 0 ? 0 : (this.gamesWon / this.gamesPlayed * 100);
        document.querySelector('.win-rate-value').textContent = `${winRate.toFixed(1)}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        document.querySelector('.streak-value').textContent = this.currentStreak;
        
        localStorage.setItem('coinflip_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('coinflip_gamesWon', this.gamesWon);
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
    new CoinFlipGame();
}); 