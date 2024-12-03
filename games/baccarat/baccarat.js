import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBWSvCUgql8OcoubCi0GeAvVnCW_3bEsWw",
    authDomain: "views-d0b3b.firebaseapp.com",
    projectId: "views-d0b3b",
    storageBucket: "views-d0b3b.firebasestorage.app",
    messagingSenderId: "27855410097",
    appId: "1:27855410097:web:02e7a49a01be10ddc32390",
    measurementId: "G-5DPDZYDRFJ"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class BaccaratGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedBet = null;
        this.deck = [];
        
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        
        this.initializeDOM();
        this.initializeEventListeners();
        this.initializeGame();
    }

    async initializeGame() {
        const userData = await this.loadUserData();
        if (userData) {
            this.balance = userData.balance;
            this.gamesPlayed = userData.gamesPlayed || 0;
            this.gamesWon = userData.gamesWon || 0;
            this.updateBalanceDisplay();
            this.updateStats();
        }
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
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        await this.updateBalance(-this.betAmount);
        this.actionButton.disabled = true;

        this.createDeck();
        this.bankerCards.innerHTML = '';
        this.playerCards.innerHTML = '';
        
        const playerHand = [];
        const bankerHand = [];

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

        if (playerValue >= 8 || bankerValue >= 8) {
            await this.determineWinner(playerValue, bankerValue);
            return;
        }

        if (playerValue <= 5) {
            const playerCard = this.drawCard();
            playerHand.push(playerCard.card);
            this.playerCards.appendChild(playerCard.element);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            playerValue = this.calculateHandValue(playerHand);
            this.playerValue.textContent = playerValue;
        }

        if (bankerValue <= 5) {
            const bankerCard = this.drawCard();
            bankerHand.push(bankerCard.card);
            this.bankerCards.appendChild(bankerCard.element);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            bankerValue = this.calculateHandValue(bankerHand);
            this.bankerValue.textContent = bankerValue;
        }

        await this.determineWinner(playerValue, bankerValue);
    }

    async determineWinner(playerValue, bankerValue) {
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
            await this.updateBalance(winAmount);
            this.gamesWon++;
            this.showResult('Win!', `+$${(winAmount - this.betAmount).toFixed(2)}`);
        } else {
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }

        this.gamesPlayed++;
        this.updateStats();
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

    async updateStats() {
        const winRate = this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : '0.0';
        document.querySelector('.win-rate-value').textContent = `${winRate}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        await this.saveUserData();
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

    async updateBalance(amount) {
        this.balance += amount;
        this.updateBalanceDisplay();
        await this.saveUserData();
    }

    async saveUserData() {
        const userId = this.getUserId();
        const userRef = ref(database, `users/${userId}`);
        try {
            await update(userRef, {
                balance: this.balance,
                lastActive: Date.now(),
                gamesPlayed: this.gamesPlayed,
                gamesWon: this.gamesWon
            });
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    async loadUserData() {
        const userId = this.getUserId();
        const userRef = ref(database, `users/${userId}`);
        
        try {
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                const newUser = {
                    balance: 100,
                    lastActive: Date.now(),
                    gamesPlayed: 0,
                    gamesWon: 0
                };
                await set(userRef, newUser);
                return newUser;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BaccaratGame();
});