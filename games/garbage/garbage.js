class GarbageGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.deck = [];
        this.playerCards = Array(10).fill(null);
        this.botCards = Array(10).fill(null);
        this.currentCard = null;
        this.discardPile = [];
        this.playerTurn = true;
        this.gameEnded = false;
        this.botThinkingTime = 600; // ms
        
        this.gamesPlayed = parseInt(localStorage.getItem('garbage_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('garbage_gamesWon')) || 0;
        
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

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.cardsContainer = document.querySelector('.cards-container');
        this.deckPile = document.querySelector('.deck-pile');
        this.discardPileElement = document.querySelector('.discard-pile');
        this.resultOverlay = document.querySelector('.result-overlay');
        this.handLabel = document.querySelector('.hand-label');
        
        // Initialize card slots
        this.cardsContainer.innerHTML = Array(10)
            .fill('')
            .map((_, i) => `<div class="card-slot" data-position="${i}">${i + 1}</div>`)
            .join('');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.startGame());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
        
        this.cardsContainer.addEventListener('click', (e) => {
            const slot = e.target.closest('.card-slot');
            if (slot && this.gameActive && this.currentCard && this.playerTurn) {
                this.tryPlaceCard(parseInt(slot.dataset.position));
            }
        });

        this.deckPile.addEventListener('click', () => {
            if (this.gameActive && !this.currentCard && this.playerTurn) {
                this.drawCard();
            }
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

    getCardValue(card) {
        if (card.value === 'A') return 1;
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        return parseInt(card.value);
    }

    createCardElement(card, faceDown = false) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${faceDown ? 'face-down' : ''} dealt`;
        if (faceDown) {
            cardElement.setAttribute('data-face-down', 'true');
        } else {
            cardElement.className += (card.suit === '♥' || card.suit === '♦') ? ' red' : '';
            cardElement.textContent = `${card.value}${card.suit}`;
        }
        return cardElement;
    }

    animateCardPlacement(fromElement, toElement, card) {
        // Create a card element for animation
        const animCard = this.createCardElement(card);
        animCard.classList.remove('dealt');
        animCard.classList.add('placing-card');
        
        // Get positions
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Calculate translation
        const translateX = toRect.left - fromRect.left;
        const translateY = toRect.top - fromRect.top;
        
        // Set initial position
        animCard.style.top = `${fromRect.top}px`;
        animCard.style.left = `${fromRect.left}px`;
        animCard.style.width = `${fromRect.width}px`;
        animCard.style.height = `${fromRect.height}px`;
        
        // Set animation target
        animCard.style.setProperty('--targetX', `${translateX}px`);
        animCard.style.setProperty('--targetY', `${translateY}px`);
        
        // Add to DOM
        document.body.appendChild(animCard);
        
        // Remove after animation
        animCard.addEventListener('animationend', () => {
            animCard.remove();
        });
    }

    async startGame() {
        if (this.gameActive) return;
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            this.showResult('Invalid Bet', 'Please enter a valid bet amount', true);
            return;
        }

        // Deduct bet amount
        window.playerBalance -= this.betAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        
        this.gameActive = true;
        this.gameEnded = false;
        this.actionButton.disabled = true;
        this.playerCards = Array(10).fill(null);
        this.botCards = Array(10).fill(null);
        this.currentCard = null;
        this.discardPile = [];
        this.playerTurn = true; // Player always goes first
        
        this.createDeck();
        
        // Show deck with face-down card and helper text
        this.deckPile.innerHTML = `
            ${this.createCardElement({ suit: '♠', value: '' }, true).outerHTML}
            <div class="helper-text">Click to draw card</div>
        `;
        this.deckPile.classList.add('has-cards');
        
        this.updateDisplay();
    }

    highlightValidMoves() {
        if (!this.currentCard) return;
        
        const cardValue = this.getCardValue(this.currentCard);
        const position = cardValue - 1;
        
        // Remove all highlights first
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.classList.remove('valid-move');
        });
        
        // Add highlight to valid move position
        if (position >= 0 && position < 10 && !this.playerCards[position]) {
            const validSlot = this.cardsContainer.querySelector(`[data-position="${position}"]`);
            if (validSlot) validSlot.classList.add('valid-move');
        }
    }

    async playBotTurn() {
        if (this.gameEnded) return;
        
        // Update display to show bot's cards
        this.updateDisplay();
        
        await new Promise(resolve => setTimeout(resolve, this.botThinkingTime));
        
        if (!this.currentCard) {
            this.drawCard();
            await new Promise(resolve => setTimeout(resolve, this.botThinkingTime));
        }

        const cardValue = this.getCardValue(this.currentCard);
        const position = cardValue - 1;

        if (position >= 0 && position < 10 && !this.botCards[position]) {
            // Get elements for animation
            const fromElement = this.discardPileElement;
            const toElement = this.cardsContainer.querySelector(`[data-position="${position}"]`);
            
            // Start animation
            this.animateCardPlacement(fromElement, toElement, this.currentCard);
            
            // Place card
            this.botCards[position] = this.currentCard;
            this.currentCard = null;
            this.updateDisplay();
            
            // Check for win
            if (this.checkWin(this.botCards)) {
                this.handleBotWin();
                return;
            }

            this.playBotTurn();
        } else {
            // Discard card
            this.discardPile.push(this.currentCard);
            this.currentCard = null;
            this.updateDisplay();
            
            // Switch to player's turn
            this.playerTurn = true;
            this.updateDisplay();
        }
    }

    drawCard() {
        if (this.deck.length === 0) {
            // Shuffle discard pile back into deck
            this.deck = [...this.discardPile];
            this.discardPile = [];
            this.discardPileElement.innerHTML = '';
            this.discardPileElement.classList.remove('has-cards');
            
            // Shuffle deck
            for (let i = this.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
            }
        }
        
        this.currentCard = this.deck.pop();
        this.updateDisplay();
        this.highlightValidMoves();
        
        // Update deck display
        if (this.deck.length === 0) {
            this.deckPile.innerHTML = '';
            this.deckPile.classList.remove('has-cards');
        } else {
            // Always show face-down card with helper text
            this.deckPile.innerHTML = `
                ${this.createCardElement({ suit: '♠', value: '' }, true).outerHTML}
                <div class="helper-text">Click to draw card</div>
            `;
        }
    }

    tryPlaceCard(position) {
        if (!this.currentCard || !this.playerTurn || this.gameEnded) return;
        
        const cardValue = this.getCardValue(this.currentCard);
        
        if (position === cardValue - 1 && !this.playerCards[position]) {
            // Get elements for animation
            const fromElement = this.discardPileElement;
            const toElement = this.cardsContainer.querySelector(`[data-position="${position}"]`);
            
            // Start animation
            this.animateCardPlacement(fromElement, toElement, this.currentCard);
            
            // Place card
            this.playerCards[position] = this.currentCard;
            this.currentCard = null;
            this.updateDisplay();
            
            // Check for win
            if (this.checkWin(this.playerCards)) {
                this.handleWin();
                return;
            }
            // Don't automatically draw a new card - player must click deck
        } else {
            // Discard card
            this.discardPile.push(this.currentCard);
            this.currentCard = null;
            this.updateDisplay();
            
            // Switch to bot's turn
            this.playerTurn = false;
            // Ensure deck shows face-down card
            this.deckPile.innerHTML = `
                ${this.createCardElement({ suit: '♠', value: '' }, true).outerHTML}
                <div class="helper-text">Click to draw card</div>
            `;
            this.playBotTurn();
        }
    }

    checkWin(cards) {
        return cards.every(card => card !== null);
    }

    async handleWin() {
        this.gameEnded = true;
        this.gameActive = false;
        this.actionButton.disabled = false;
        
        // Calculate winnings (2x bet)
        const winAmount = this.betAmount * 2;
        window.playerBalance += winAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        
        // Update stats
        this.gamesPlayed++;
        this.gamesWon++;
        localStorage.setItem('garbage_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('garbage_gamesWon', this.gamesWon);
        this.updateStats();
        
        this.showResult('You Won!', `+$${winAmount.toFixed(2)}`, false);
    }

    async handleBotWin() {
        this.gameEnded = true;
        this.gameActive = false;
        this.actionButton.disabled = false;
        
        // Update stats
        this.gamesPlayed++;
        localStorage.setItem('garbage_gamesPlayed', this.gamesPlayed);
        this.updateStats();
        
        this.showResult('Bot Won!', `-$${this.betAmount.toFixed(2)}`, true);
    }

    updateDisplay() {
        // Update hand label
        this.handLabel.textContent = this.playerTurn ? "Your Cards" : "Bot's Cards";
        
        // Update cards
        const slots = this.cardsContainer.querySelectorAll('.card-slot');
        const currentCards = this.playerTurn ? this.playerCards : this.botCards;
        
        slots.forEach((slot, i) => {
            slot.innerHTML = '';
            if (currentCards[i]) {
                slot.appendChild(this.createCardElement(currentCards[i]));
            } else {
                slot.textContent = i + 1;
            }
        });

        // Remove any existing highlights
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.classList.remove('valid-move');
        });
        
        // Add highlights for valid moves if it's player's turn
        if (this.playerTurn && this.currentCard) {
            this.highlightValidMoves();
        }

        // Update discard pile and current card
        if (this.currentCard) {
            this.discardPileElement.innerHTML = '';
            this.discardPileElement.appendChild(this.createCardElement(this.currentCard));
            this.discardPileElement.classList.add('has-cards');
        } else if (this.discardPile.length > 0) {
            this.discardPileElement.innerHTML = '';
            this.discardPileElement.appendChild(
                this.createCardElement(this.discardPile[this.discardPile.length - 1])
            );
            this.discardPileElement.classList.add('has-cards');
        } else {
            this.discardPileElement.innerHTML = '';
            this.discardPileElement.classList.remove('has-cards');
        }
    }

    updateBetAmount() {
        const newBet = parseFloat(this.betInput.value);
        if (!isNaN(newBet) && newBet >= 0) {
            this.betAmount = Math.min(newBet, window.playerBalance);
            this.betInput.value = this.betAmount.toFixed(2);
        }
    }

    adjustBet(multiplier) {
        const newBet = this.betAmount * multiplier;
        if (newBet <= window.playerBalance) {
            this.betAmount = newBet;
            this.betInput.value = this.betAmount.toFixed(2);
        }
    }

    updateBalanceDisplay() {
        const balance = window.playerBalance || 0;
        const formattedBalance = balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.querySelector('.balance-amount').textContent = `$${formattedBalance}`;
    }

    updateStats() {
        const winRate = this.gamesPlayed > 0 
            ? ((this.gamesWon / this.gamesPlayed) * 100).toFixed(1)
            : '0.0';
        
        document.querySelector('.win-rate-value').textContent = `${winRate}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
    }

    showResult(text, amount, isError = false) {
        this.resultOverlay.querySelector('.result-text').textContent = text;
        this.resultOverlay.querySelector('.result-amount').textContent = amount;
        this.resultOverlay.className = `result-overlay ${isError ? 'error' : 'active'}`;
        
        setTimeout(() => {
            this.resultOverlay.className = 'result-overlay';
        }, 2000);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GarbageGame();
}); 