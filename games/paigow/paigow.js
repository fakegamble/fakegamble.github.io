class PaiGowGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.deck = [];
        this.playerCards = [];
        this.dealerCards = [];
        this.selectedCards = new Set();
        this.playerHighHand = [];
        this.playerLowHand = [];
        
        this.gamesPlayed = parseInt(localStorage.getItem('paigow_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('paigow_gamesWon')) || 0;
        
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

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.setHandsButton = document.getElementById('setHandsButton');
        this.betInput = document.getElementById('betAmount');
        this.dealerHighHand = document.querySelector('.dealer-area .high-hand');
        this.dealerLowHand = document.querySelector('.dealer-area .low-hand');
        this.playerHighHand = document.querySelector('.player-area .high-hand');
        this.playerLowHand = document.querySelector('.player-area .low-hand');
        this.unassignedCards = document.querySelector('.unassigned-cards');
        this.resultOverlay = document.querySelector('.result-overlay');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.startGame());
        this.setHandsButton.addEventListener('click', () => this.setHands());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
    }

    setupBalanceListener() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login/';
            return;
        }
        
        const playerRef = window.doc(window.db, "users", username);
        
        window.onSnapshot(playerRef, (doc) => {
            if (doc.exists()) {
                window.playerBalance = doc.data().balance;
                this.updateBalanceDisplay();
            } else {
                localStorage.removeItem('username');
                window.location.href = '/login/';
            }
        });
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ value, suit });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}`;
        cardElement.textContent = `${card.value}${card.suit}`;
        cardElement.dataset.value = card.value;
        cardElement.dataset.suit = card.suit;
        
        cardElement.addEventListener('click', () => {
            if (!this.gameActive) return;
            
            if (this.selectedCards.has(cardElement)) {
                this.selectedCards.delete(cardElement);
                cardElement.classList.remove('selected');
            } else if (this.selectedCards.size < 2) {
                this.selectedCards.add(cardElement);
                cardElement.classList.add('selected');
            }
            
            this.setHandsButton.disabled = this.selectedCards.size !== 2;
        });
        
        return cardElement;
    }

    async startGame() {
        if (this.gameActive) return;
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        window.playerBalance -= this.betAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();

        // Reset game state
        this.selectedCards.clear();
        this.createDeck();
        this.shuffleDeck();
        
        // Deal cards
        this.playerCards = this.deck.splice(0, 7);
        this.dealerCards = this.deck.splice(0, 7);
        
        // Clear previous hands
        this.dealerHighHand.innerHTML = '';
        this.dealerLowHand.innerHTML = '';
        this.playerHighHand.innerHTML = '';
        this.playerLowHand.innerHTML = '';
        this.unassignedCards.innerHTML = '';
        
        // Display player's cards
        this.playerCards.forEach(card => {
            this.unassignedCards.appendChild(this.createCardElement(card));
        });
        
        this.actionButton.disabled = true;
        this.setHandsButton.disabled = true;
    }

    setHands() {
        if (!this.gameActive || this.selectedCards.size !== 2) return;
        
        // Move selected cards to low hand
        this.playerLowHand.innerHTML = '';
        this.selectedCards.forEach(card => {
            this.playerLowHand.appendChild(card);
        });
        
        // Move remaining cards to high hand
        this.playerHighHand.innerHTML = '';
        Array.from(this.unassignedCards.children).forEach(card => {
            if (!this.selectedCards.has(card)) {
                this.playerHighHand.appendChild(card);
            }
        });
        
        this.unassignedCards.innerHTML = '';
        this.selectedCards.clear();
        
        // Set dealer's hands (house way)
        this.setDealerHands();
        
        // Compare hands and determine winner
        this.determineWinner();
    }

    setDealerHands() {
        // Sort all cards by value
        const sortedCards = [...this.dealerCards].sort((a, b) => {
            const values = {'2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'J':11, 'Q':12, 'K':13, 'A':14};
            return values[b.value] - values[a.value];
        });

        // Find pairs
        const pairs = [];
        for (let i = 0; i < sortedCards.length - 1; i++) {
            if (sortedCards[i].value === sortedCards[i + 1].value) {
                pairs.push([sortedCards[i], sortedCards[i + 1]]);
                i++; // Skip next card since it's part of the pair
            }
        }

        let highHand, lowHand;

        if (pairs.length >= 2) {
            // If we have multiple pairs, put highest pair in high hand, second highest in low hand
            lowHand = pairs[1];
            highHand = [...pairs[0], ...sortedCards.filter(card => 
                !pairs[0].includes(card) && !pairs[1].includes(card)).slice(0, 3)];
        } else if (pairs.length === 1) {
            // If we have one pair, put it in high hand with next highest cards
            highHand = [...pairs[0], ...sortedCards.filter(card => 
                !pairs[0].includes(card)).slice(0, 3)];
            // Put highest remaining cards in low hand
            lowHand = sortedCards.filter(card => !pairs[0].includes(card)).slice(0, 2);
        } else {
            // No pairs - put highest two cards that don't break potential straight/flush in low hand
            lowHand = [sortedCards[0], sortedCards[1]];
            highHand = sortedCards.slice(2, 7);
        }

        // Display dealer's hands
        this.dealerHighHand.innerHTML = '';
        this.dealerLowHand.innerHTML = '';
        
        highHand.forEach(card => {
            this.dealerHighHand.appendChild(this.createCardElement(card));
        });
        
        lowHand.forEach(card => {
            this.dealerLowHand.appendChild(this.createCardElement(card));
        });
    }

    getHandRank(cards) {
        const values = cards.map(card => {
            const value = card.dataset ? card.dataset.value : card.value;
            return {'2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'J':11, 'Q':12, 'K':13, 'A':14}[value];
        });
        
        values.sort((a, b) => b - a);
        return values[0]; // Simple high card comparison for demo
    }

    async determineWinner() {
        const playerHighRank = this.getHandRank(Array.from(this.playerHighHand.children));
        const playerLowRank = this.getHandRank(Array.from(this.playerLowHand.children));
        const dealerHighRank = this.getHandRank(Array.from(this.dealerHighHand.children));
        const dealerLowRank = this.getHandRank(Array.from(this.dealerLowHand.children));
        
        let wins = 0;
        
        if (playerHighRank > dealerHighRank) wins++;
        if (playerHighRank < dealerHighRank) wins--;
        if (playerLowRank > dealerLowRank) wins++;
        if (playerLowRank < dealerLowRank) wins--;
        
        this.gamesPlayed++;
        
        if (wins > 0) {
            // Player wins
            this.gamesWon++;
            const winAmount = this.betAmount * 1.95; // 5% house edge
            window.playerBalance += winAmount;
            await window.updateBalance(window.playerBalance);
            this.showResult('Win!', `+$${winAmount.toFixed(2)}`);
        } else if (wins === 0) {
            // Push
            window.playerBalance += this.betAmount;
            await window.updateBalance(window.playerBalance);
            this.showResult('Push', 'Bet returned');
        } else {
            // Dealer wins
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }
        
        this.updateStats();
        this.updateBalanceDisplay();
        
        this.gameActive = false;
        this.actionButton.disabled = false;
        this.setHandsButton.disabled = true;
    }

    showResult(text, amount, isError = false) {
        this.resultOverlay.querySelector('.result-text').textContent = text;
        this.resultOverlay.querySelector('.result-amount').textContent = amount;
        this.resultOverlay.className = `result-overlay ${isError ? 'error' : 'active'}`;
        
        setTimeout(() => {
            this.resultOverlay.className = 'result-overlay';
        }, 2000);
    }

    updateStats() {
        const winRate = this.gamesPlayed === 0 ? 0 : (this.gamesWon / this.gamesPlayed * 100);
        document.querySelector('.win-rate-value').textContent = `${winRate.toFixed(1)}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        localStorage.setItem('paigow_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('paigow_gamesWon', this.gamesWon);
    }

    updateBalanceDisplay() {
        const balance = window.playerBalance || 0;
        const formattedBalance = balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.querySelector('.balance-amount').textContent = `$${formattedBalance}`;
    }

    adjustBet(multiplier) {
        const newBet = this.betAmount * multiplier;
        if (newBet <= window.playerBalance) {
            this.betAmount = newBet;
            this.betInput.value = this.betAmount.toFixed(2);
        }
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PaiGowGame();
}); 