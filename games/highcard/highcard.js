class HighCardGame {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100;
        this.betAmount = 1.00;
        this.gameActive = false;
        
        // Load stats from localStorage
        this.gamesPlayed = parseInt(localStorage.getItem('highcard_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('highcard_gamesWon')) || 0;
        
        this.initializeDOM();
        this.initializeEventListeners();
        this.updateBalanceDisplay();
        this.updateStats();
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.dealerCardSpace = document.querySelector('.dealer-card');
        this.playerCardSpace = document.querySelector('.player-card');
        this.resultOverlay = document.querySelector('.result-overlay');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.playRound());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
    }

    createCard(value, suit) {
        const card = document.createElement('div');
        card.className = `card ${suit === '♥' || suit === '♦' ? 'red' : 'black'}`;
        card.textContent = `${value}${suit}`;
        return card;
    }

    getRandomCard() {
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const suits = ['♠', '♥', '♦', '♣'];
        const value = values[Math.floor(Math.random() * values.length)];
        const suit = suits[Math.floor(Math.random() * suits.length)];
        return { value, suit };
    }

    getCardValue(value) {
        const values = {
            'J': 11,
            'Q': 12,
            'K': 13,
            'A': 14
        };
        return values[value] || parseInt(value);
    }

    async playRound() {
        if (this.gameActive) return;
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        this.balance -= this.betAmount;
        this.updateBalanceDisplay();
        this.actionButton.disabled = true;

        // Clear previous cards
        this.dealerCardSpace.innerHTML = '';
        this.playerCardSpace.innerHTML = '';

        // Deal cards
        const dealerCard = this.getRandomCard();
        const playerCard = this.getRandomCard();

        // Show player's card first
        this.playerCardSpace.appendChild(this.createCard(playerCard.value, playerCard.suit));
        
        // Show dealer's card after a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        this.dealerCardSpace.appendChild(this.createCard(dealerCard.value, dealerCard.suit));

        // Compare cards
        const dealerValue = this.getCardValue(dealerCard.value);
        const playerValue = this.getCardValue(playerCard.value);

        await new Promise(resolve => setTimeout(resolve, 500));

        if (playerValue > dealerValue) {
            this.gamesWon++;
            const winAmount = this.betAmount * 2;
            this.balance += winAmount;
            this.showResult('Win!', `+$${(winAmount - this.betAmount).toFixed(2)}`);
        } else if (playerValue === dealerValue) {
            this.balance += this.betAmount;
            this.showResult('Push', 'Bet returned');
        } else {
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }

        this.gamesPlayed++;
        this.updateStats();
        this.saveBalance();
        this.updateBalanceDisplay();
        
        this.gameActive = false;
        this.actionButton.disabled = false;
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
        
        // Save stats to localStorage
        localStorage.setItem('highcard_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('highcard_gamesWon', this.gamesWon);
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
    new HighCardGame();
}); 