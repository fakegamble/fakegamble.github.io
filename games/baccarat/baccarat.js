class BaccaratGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedBet = null;
        this.deck = [];
        
        this.gamesPlayed = parseInt(localStorage.getItem('baccarat_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('baccarat_gamesWon')) || 0;

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
                window.playerBalance = doc.data().balance;
                this.updateBalanceDisplay();
            } else {
                // If user document doesn't exist, redirect to login
                localStorage.removeItem('username');
                localStorage.removeItem('userId');
                window.location.href = '/login.html';
            }
        });
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

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.bankerCards = document.querySelector('.banker-hand .cards');
        this.playerCards = document.querySelector('.player-hand .cards');
        this.bankerValue = document.querySelector('.banker-hand .hand-value');
        this.playerValue = document.querySelector('.player-hand .hand-value');
        this.resultOverlay = document.querySelector('.result-overlay');
        this.betButtons = document.querySelectorAll('.bet-btn');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.startGame());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
        
        this.betButtons.forEach(button => {
            button.addEventListener('click', () => this.setBet(button.dataset.bet));
        });
    }

    setBet(type) {
        this.selectedBet = type;
        this.betButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.bet === type);
        });
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];
        
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ suit, value });
            }
        }
        
        // Shuffle deck
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    drawCard() {
        const card = this.deck.pop();
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.className += (card.suit === '♥' || card.suit === '♦') ? ' red' : '';
        cardElement.textContent = `${card.value}${card.suit}`;
        return { card, element: cardElement };
    }

    calculateHandValue(hand) {
        let value = 0;
        for (let card of hand) {
            if (card.value === 'A') {
                value += 1;
            } else if (['K', 'Q', 'J', '10'].includes(card.value)) {
                value += 0;
            } else {
                value += parseInt(card.value);
            }
        }
        return value % 10;
    }

    async startGame() {
        if (this.gameActive || !this.selectedBet) return;
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        window.playerBalance -= this.betAmount;
        this.saveBalance();
        this.updateBalanceDisplay();
        this.actionButton.disabled = true;

        this.createDeck();
        this.bankerCards.innerHTML = '';
        this.playerCards.innerHTML = '';
        
        const playerHand = [];
        const bankerHand = [];

        // Initial deal
        for (let i = 0; i < 2; i++) {
            const playerCard = this.drawCard();
            const bankerCard = this.drawCard();
            
            playerHand.push(playerCard.card);
            bankerHand.push(bankerCard.card);
            
            this.playerCards.appendChild(playerCard.element);
            this.bankerCards.appendChild(bankerCard.element);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        let playerValue = this.calculateHandValue(playerHand);
        let bankerValue = this.calculateHandValue(bankerHand);
        
        this.playerValue.textContent = playerValue;
        this.bankerValue.textContent = bankerValue;

        // Check for natural win
        if (playerValue >= 8 || bankerValue >= 8) {
            this.determineWinner(playerValue, bankerValue);
            return;
        }

        // Player third card rule
        if (playerValue <= 5) {
            const playerCard = this.drawCard();
            playerHand.push(playerCard.card);
            this.playerCards.appendChild(playerCard.element);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            playerValue = this.calculateHandValue(playerHand);
            this.playerValue.textContent = playerValue;
        }

        // Banker third card rule
        if (bankerValue <= 5) {
            const bankerCard = this.drawCard();
            bankerHand.push(bankerCard.card);
            this.bankerCards.appendChild(bankerCard.element);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            bankerValue = this.calculateHandValue(bankerHand);
            this.bankerValue.textContent = bankerValue;
        }

        this.determineWinner(playerValue, bankerValue);
    }

    determineWinner(playerValue, bankerValue) {
        let result;
        let winAmount = 0;

        if (playerValue === bankerValue) {
            result = 'tie';
        } else if (playerValue > bankerValue) {
            result = 'player';
        } else {
            result = 'banker';
        }

        if (result === this.selectedBet) {
            if (result === 'tie') {
                winAmount = this.betAmount * 8;
            } else {
                winAmount = this.betAmount * 1.95;
            }
            window.playerBalance += winAmount;
            this.gamesWon++;
            this.showResult('Win!', `+$${(winAmount - this.betAmount).toFixed(2)}`);
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
        const winRate = this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : '0.0';
        document.querySelector('.win-rate-value').textContent = `${winRate}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        localStorage.setItem('baccarat_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('baccarat_gamesWon', this.gamesWon);
    }

    adjustBet(multiplier) {
        this.betAmount = parseFloat(this.betInput.value) * multiplier;
        this.betInput.value = this.betAmount.toFixed(2);
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }

    saveBalance() {
        localStorage.setItem('gameBalance', window.playerBalance.toFixed(2));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BaccaratGame();
}); 