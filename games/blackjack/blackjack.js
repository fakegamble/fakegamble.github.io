class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameActive = false;
        this.betAmount = 1.00;
        
        // Initialize games played and won from localStorage
        this.gamesPlayed = parseInt(localStorage.getItem('blackjack_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('blackjack_gamesWon')) || 0;

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
        this.updateStats(); // Update stats display on initialization
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
        this.hitButton = document.getElementById('hitButton');
        this.standButton = document.getElementById('standButton');
        this.doubleButton = document.getElementById('doubleButton');
        this.betInput = document.getElementById('betAmount');
        this.playerCards = document.querySelector('.player-hand .cards');
        this.dealerCards = document.querySelector('.dealer-hand .cards');
        this.playerValue = document.querySelector('.player-hand .hand-value');
        this.dealerValue = document.querySelector('.dealer-hand .hand-value');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.startGame());
        this.hitButton.addEventListener('click', () => this.hit());
        this.standButton.addEventListener('click', () => this.stand());
        this.doubleButton.addEventListener('click', () => this.double());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
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
        
        for (let shuffle = 0; shuffle < 3; shuffle++) {
            for (let i = this.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
            }
        }
    }

    drawCard(hidden = false) {
        const card = this.deck.pop();
        const cardElement = document.createElement('div');
        cardElement.className = 'card' + (hidden ? ' hidden' : '');
        if (!hidden) {
            cardElement.className += (card.suit === '♥' || card.suit === '♦') ? ' red' : '';
            cardElement.textContent = `${card.value}${card.suit}`;
        }
        return { card, element: cardElement };
    }

    calculateHand(hand) {
        let value = 0;
        let aces = 0;
        
        for (let card of hand) {
            if (card.value === 'A') {
                aces += 1;
                value += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                value += 10;
            } else {
                value += parseInt(card.value);
            }
        }
        
        while (value > 21 && aces > 0) {
            value -= 10;
            aces -= 1;
        }
        
        return value;
    }

    updateControls(enabled) {
        this.hitButton.disabled = !enabled;
        this.standButton.disabled = !enabled;
        this.doubleButton.disabled = !enabled || this.betAmount * 2 > window.playerBalance;
        this.betInput.disabled = enabled;
        this.actionButton.disabled = enabled;
    }

    async startGame() {
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            return;
        }

        window.playerBalance -= this.betAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        
        this.gameActive = true;
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.playerCards.innerHTML = '';
        this.dealerCards.innerHTML = '';
        
        const playerCard1 = this.drawCard();
        const dealerCard1 = this.drawCard();
        const playerCard2 = this.drawCard();
        const dealerCard2 = this.drawCard(true);
        
        this.playerHand.push(playerCard1.card, playerCard2.card);
        this.dealerHand.push(dealerCard1.card, dealerCard2.card);
        
        this.playerCards.appendChild(playerCard1.element);
        this.dealerCards.appendChild(dealerCard1.element);
        this.playerCards.appendChild(playerCard2.element);
        this.dealerCards.appendChild(dealerCard2.element);
        
        this.updateHandValues();
        this.updateControls(true);
    }

    async endGame(result) {
        this.gameActive = false;
        this.gamesPlayed++;
        
        const dealerCards = this.dealerCards.querySelectorAll('.card');
        if (dealerCards[1]) {
            dealerCards[1].classList.remove('hidden');
            dealerCards[1].textContent = `${this.dealerHand[1].value}${this.dealerHand[1].suit}`;
            if (this.dealerHand[1].suit === '♥' || this.dealerHand[1].suit === '♦') {
                dealerCards[1].classList.add('red');
            }
        }

        this.updateHandValues();
        this.updateControls(false);

        let winAmount = 0;
        if (result === 'win') {
            winAmount = this.betAmount * 2;
        } else if (result === 'blackjack') {
            winAmount = this.betAmount * 2.5;
        } else if (result === 'push') {
            winAmount = this.betAmount;
        }

        if (winAmount > 0) {
            window.playerBalance += winAmount;
            await window.updateBalance(window.playerBalance);
            this.updateBalanceDisplay();
        }

        const resultText = result.charAt(0).toUpperCase() + result.slice(1);
        const profitAmount = winAmount - this.betAmount;
        
        const overlay = document.createElement('div');
        overlay.className = 'result-overlay active';
        overlay.innerHTML = `
            <div class="result-content">
                <div class="result-text-wrapper">
                    <span class="result-text">${resultText}</span>
                    <span class="result-amount ${profitAmount >= 0 ? 'win' : 'lose'}">
                        ${profitAmount >= 0 ? '+' : '-'}$${Math.abs(profitAmount).toFixed(2)}
                    </span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2000);

        if (result === 'win' || result === 'blackjack') {
            this.gamesWon++;
        }

        this.updateStats(); // Update stats after each game
    }

    hit() {
        if (!this.gameActive) return;

        const { card, element } = this.drawCard();
        this.playerHand.push(card);
        this.playerCards.appendChild(element);

        const playerValue = this.calculateHand(this.playerHand);
        this.updateHandValues();

        this.doubleButton.disabled = true;

        if (playerValue > 21) {
            this.endGame('lose');
        }
    }

    stand() {
        if (!this.gameActive) return;
        
        this.hitButton.disabled = true;
        this.standButton.disabled = true;
        this.doubleButton.disabled = true;
        
        this.playDealerHand();
    }

    async double() {
        if (!this.gameActive || this.betAmount * 2 > window.playerBalance) return;

        window.playerBalance -= this.betAmount;
        this.betAmount *= 2;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();

        const { card, element } = this.drawCard();
        this.playerHand.push(card);
        this.playerCards.appendChild(element);
        this.updateHandValues();

        if (this.calculateHand(this.playerHand) > 21) {
            this.endGame('lose');
        } else {
            this.playDealerHand();
        }
    }

    async playDealerHand() {
        if (!this.gameActive) return;

        // Reveal dealer's hidden card
        const dealerCards = this.dealerCards.querySelectorAll('.card');
        if (dealerCards[1]) {
            dealerCards[1].classList.remove('hidden');
            dealerCards[1].textContent = `${this.dealerHand[1].value}${this.dealerHand[1].suit}`;
            if (this.dealerHand[1].suit === '♥' || this.dealerHand[1].suit === '♦') {
                dealerCards[1].classList.add('red');
            }
        }

        // Dealer draws cards randomly between 16 and 19
        const targetValue = 16 + Math.floor(Math.random() * 4);
        
        while (this.calculateHand(this.dealerHand) < targetValue) {
            await new Promise(resolve => setTimeout(resolve, 500));

            const { card, element } = this.drawCard();
            this.dealerHand.push(card);
            this.dealerCards.appendChild(element);
            this.updateHandValues();
        }

        const playerValue = this.calculateHand(this.playerHand);
        const dealerValue = this.calculateHand(this.dealerHand);

        let result;
        if (dealerValue > 21) {
            result = 'win';
        } else if (playerValue > dealerValue) {
            result = 'win';
        } else if (playerValue < dealerValue) {
            result = 'lose';
        } else {
            result = 'push';
        }

        if (playerValue === 21 && this.playerHand.length === 2) {
            result = 'blackjack';
        }

        this.endGame(result);
    }

    updateHandValues() {
        const playerValue = this.calculateHand(this.playerHand);
        let dealerValue;
        if (this.gameActive && this.dealerHand.length > 0) {
            dealerValue = this.calculateHand([this.dealerHand[0]]);
        } else {
            dealerValue = this.calculateHand(this.dealerHand);
        }
        
        this.playerValue.textContent = playerValue;
        this.dealerValue.textContent = dealerValue || '0';
    }

    adjustBet(multiplier) {
        this.betAmount = parseFloat(this.betInput.value) * multiplier;
        this.betInput.value = this.betAmount.toFixed(2);
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }

    updateStats() {
        const winRate = this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : '0.0';
        document.querySelector('.win-rate-value').textContent = `${winRate}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;

        // Save stats to localStorage
        localStorage.setItem('blackjack_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('blackjack_gamesWon', this.gamesWon);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});