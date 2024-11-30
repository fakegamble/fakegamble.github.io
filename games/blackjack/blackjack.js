class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameActive = false;
        this.betAmount = 1.00;
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100;
        this.gameHistory = JSON.parse(localStorage.getItem('blackjackHistory')) || [];
        
        this.initializeDOM();
        this.initializeEventListeners();
        this.updateBalanceDisplay();
        this.updateHistory();
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.hitButton = document.getElementById('hitButton');
        this.standButton = document.getElementById('standButton');
        this.doubleButton = document.getElementById('doubleButton');
        this.betInput = document.getElementById('betAmount');
        this.resultOverlay = document.getElementById('resultOverlay');
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
        
        // Shuffle deck
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
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
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces -= 1;
        }
        
        return value;
    }

    updateControls(enabled) {
        this.hitButton.disabled = !enabled;
        this.standButton.disabled = !enabled;
        this.doubleButton.disabled = !enabled || this.betAmount * 2 > this.balance;
        this.betInput.disabled = enabled;
        
        // Only enable action button (Deal) when game is not active
        this.actionButton.disabled = enabled;
    }

    startGame() {
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            return;
        }

        this.balance -= this.betAmount;
        this.saveBalance();
        this.updateBalanceDisplay();
        
        this.gameActive = true;
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.playerCards.innerHTML = '';
        this.dealerCards.innerHTML = '';
        
        // Deal initial cards
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
        
        // Reveal dealer's hidden card
        const dealerCards = this.dealerCards.querySelectorAll('.card');
        if (dealerCards[1]) {
            dealerCards[1].classList.remove('hidden');
            dealerCards[1].textContent = `${this.dealerHand[1].value}${this.dealerHand[1].suit}`;
            if (this.dealerHand[1].suit === '♥' || this.dealerHand[1].suit === '♦') {
                dealerCards[1].classList.add('red');
            }
        }

        this.updateHandValues();
        this.updateControls(false); // Disable game controls, enable Deal button

        // Handle winnings
        let winAmount = 0;
        if (result === 'win') {
            winAmount = this.betAmount * 2;
        } else if (result === 'blackjack') {
            winAmount = this.betAmount * 2.5;
        } else if (result === 'push') {
            winAmount = this.betAmount;
        }

        if (winAmount > 0) {
            this.balance += winAmount;
            this.saveBalance();
            this.updateBalanceDisplay();
        }

        // Add to history
        this.addToHistory(result);

        // Show result overlay
        const resultOverlay = document.getElementById('resultOverlay');
        const resultText = resultOverlay.querySelector('.result-text');
        const resultAmount = resultOverlay.querySelector('.result-amount');
        
        resultText.textContent = result.charAt(0).toUpperCase() + result.slice(1);
        resultAmount.textContent = `${result === 'lose' ? '-' : '+'}$${Math.abs(winAmount - this.betAmount).toFixed(2)}`;
        resultOverlay.style.display = 'flex';

        // Hide result overlay after 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        resultOverlay.style.display = 'none';
    }

    hit() {
        if (!this.gameActive) return;

        const { card, element } = this.drawCard();
        this.playerHand.push(card);
        this.playerCards.appendChild(element);

        const playerValue = this.calculateHand(this.playerHand);
        this.updateHandValues();

        // Disable double after hit
        this.doubleButton.disabled = true;

        if (playerValue > 21) {
            this.endGame('lose');
        }
    }

    stand() {
        if (!this.gameActive) return;
        
        // Disable all game buttons during dealer's turn
        this.hitButton.disabled = true;
        this.standButton.disabled = true;
        this.doubleButton.disabled = true;
        
        this.playDealerHand();
    }

    double() {
        if (!this.gameActive || this.betAmount * 2 > this.balance) return;

        this.balance -= this.betAmount;
        this.betAmount *= 2;
        this.saveBalance();
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

        // Reveal dealer's hidden card first
        const dealerCards = this.dealerCards.querySelectorAll('.card');
        if (dealerCards[1]) {
            dealerCards[1].classList.remove('hidden');
            dealerCards[1].textContent = `${this.dealerHand[1].value}${this.dealerHand[1].suit}`;
            if (this.dealerHand[1].suit === '♥' || this.dealerHand[1].suit === '♦') {
                dealerCards[1].classList.add('red');
            }
        }

        // Dealer must hit on 16 and below, stand on 17 and above
        while (this.calculateHand(this.dealerHand) < 17) {
            // Add delay for animation
            await new Promise(resolve => setTimeout(resolve, 500));

            const { card, element } = this.drawCard();
            this.dealerHand.push(card);
            this.dealerCards.appendChild(element);
            this.updateHandValues();
        }

        // Determine winner
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

        // Check for blackjack (21 with exactly 2 cards)
        if (playerValue === 21 && this.playerHand.length === 2) {
            result = 'blackjack';
        }

        this.endGame(result);
    }

    showResult(text, amount, isError = false) {
        this.resultOverlay.querySelector('.result-text').textContent = text;
        this.resultOverlay.querySelector('.result-amount').textContent = amount;
        this.resultOverlay.className = 'result-overlay active' + (isError ? ' error' : '');
        
        setTimeout(() => {
            this.resultOverlay.className = 'result-overlay';
        }, 2000);
    }

    updateHandValues() {
        const playerValue = this.calculateHand(this.playerHand);
        
        // Calculate dealer's visible cards only during the game
        let dealerValue;
        if (this.gameActive && this.dealerHand.length > 0) {
            // Only count the visible card (first card) during active game
            dealerValue = this.calculateHand([this.dealerHand[0]]);
        } else {
            // Show full hand value when game is not active
            dealerValue = this.calculateHand(this.dealerHand);
        }
        
        this.playerValue.textContent = playerValue;
        this.dealerValue.textContent = dealerValue || '0';
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

    addToHistory(result) {
        let amount;
        if (result === 'win') {
            amount = this.betAmount; // Amount won (profit)
        } else if (result === 'blackjack') {
            amount = this.betAmount * 1.5; // Blackjack pays 3:2
        } else if (result === 'push') {
            amount = 0; // No profit/loss
        } else {
            amount = -this.betAmount; // Loss
        }
        
        const gameResult = {
            result: result,
            betAmount: this.betAmount,
            profit: amount,
            timestamp: Date.now() // Add timestamp for better tracking
        };
        
        this.gameHistory.unshift(gameResult);
        if (this.gameHistory.length > 5) {
            this.gameHistory.pop();
        }
        
        // Save to localStorage with specific key
        localStorage.setItem('blackjackHistory', JSON.stringify(this.gameHistory));
        
        this.updateHistory();
    }

    updateHistory() {
        const historyContainer = document.querySelector('.game-history');
        historyContainer.innerHTML = '';
        
        this.gameHistory.forEach(game => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const resultSpan = document.createElement('span');
            resultSpan.className = 'history-result';
            resultSpan.textContent = game.result.charAt(0).toUpperCase() + game.result.slice(1);
            
            const amountSpan = document.createElement('span');
            // Calculate total amount based on result
            let totalAmount;
            if (game.result === 'win') {
                totalAmount = game.betAmount * 2; // Original bet + win
            } else if (game.result === 'blackjack') {
                totalAmount = game.betAmount * 2.5; // Original bet + blackjack payout
            } else if (game.result === 'push') {
                totalAmount = game.betAmount; // Original bet returned
            } else { // lose
                totalAmount = 0; // Total loss
            }
            
            amountSpan.className = `history-profit ${totalAmount > 0 ? 'positive' : 'negative'}`;
            amountSpan.textContent = `$${totalAmount.toFixed(2)}`;
            
            historyItem.appendChild(resultSpan);
            historyItem.appendChild(amountSpan);
            historyContainer.appendChild(historyItem);
        });
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
}); 