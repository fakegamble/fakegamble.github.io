class CoinFlipGame {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100;
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedChoice = null;
        this.currentStreak = 0;
        
        this.gamesPlayed = parseInt(localStorage.getItem('coinflip_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('coinflip_gamesWon')) || 0;
        
        this.initializeDOM();
        this.initializeEventListeners();
        this.updateBalanceDisplay();
        this.updateStats();
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
        if (this.gameActive || !this.selectedChoice) return;
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        this.balance -= this.betAmount;
        this.saveBalance();
        this.updateBalanceDisplay();
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
            this.balance += winAmount;
            this.showResult('Win!', `+$${(winAmount - this.betAmount).toFixed(2)}`);
        } else {
            this.currentStreak = 0;
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }

        this.gamesPlayed++;
        this.updateStats();
        this.saveBalance();
        this.updateBalanceDisplay();
        
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

    updateBalanceDisplay() {
        document.querySelector('.balance-amount').textContent = `$${this.balance.toFixed(2)}`;
    }

    adjustBet(multiplier) {
        this.betAmount = parseFloat(this.betInput.value) * multiplier;
        this.betInput.value = this.betAmount.toFixed(2);
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }

    saveBalance() {
        localStorage.setItem('gameBalance', this.balance.toFixed(2));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CoinFlipGame();
}); 