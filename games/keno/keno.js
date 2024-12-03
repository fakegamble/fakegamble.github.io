class KenoGame {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100;
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedNumbers = new Set();
        this.drawnNumbers = new Set();
        this.maxSelections = 10; // Changed from 10 to 5 for 40-number board
        this.totalNumbers = 40; // Changed from 80 to 40
        
        this.gamesPlayed = parseInt(localStorage.getItem('keno_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('keno_gamesWon')) || 0;
        
        // Updated payout table for 5 selections
        this.payoutTable = {
            0: 0,
            1: 1,
            2: 2,
            3: 5,
            4: 20,
            5: 100
        };
        
        this.initializeDOM();
        this.initializeEventListeners();
        this.updateBalanceDisplay();
        this.updateStats();
        this.createBoard();
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.kenoBoard = document.querySelector('.keno-board');
        this.selectedCountDisplay = document.querySelector('.selected-count span');
        this.drawnNumbersDisplay = document.querySelector('.drawn-numbers');
        this.resultOverlay = document.querySelector('.result-overlay');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.startGame());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
    }

    createBoard() {
        this.kenoBoard.innerHTML = '';
        for (let i = 1; i <= this.totalNumbers; i++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = i;
            cell.addEventListener('click', () => this.toggleNumber(i, cell));
            this.kenoBoard.appendChild(cell);
        }
    }

    toggleNumber(number, cell) {
        if (this.gameActive) return;
        
        if (this.selectedNumbers.has(number)) {
            this.selectedNumbers.delete(number);
            cell.classList.remove('selected');
        } else if (this.selectedNumbers.size < this.maxSelections) {
            this.selectedNumbers.add(number);
            cell.classList.add('selected');
        }
        
        this.selectedCountDisplay.textContent = this.selectedNumbers.size;
        this.actionButton.disabled = this.selectedNumbers.size === 0;
    }

    async startGame() {
        if (this.gameActive || this.selectedNumbers.size === 0) return;
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            this.showResult('Invalid bet amount', '0.00', true);
            return;
        }

        this.gameActive = true;
        this.actionButton.disabled = true;
        this.drawnNumbers.clear();
        this.drawnNumbersDisplay.innerHTML = '';
        
        this.balance -= this.betAmount;
        this.saveBalance();
        this.updateBalanceDisplay();

        // Draw 10 numbers (changed from 20 to 10 for 40-number board)
        const numbers = Array.from({length: this.totalNumbers}, (_, i) => i + 1);
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const randomIndex = Math.floor(Math.random() * numbers.length);
            const drawnNumber = numbers.splice(randomIndex, 1)[0];
            this.drawnNumbers.add(drawnNumber);
            this.showDrawnNumber(drawnNumber);
        }

        const matches = Array.from(this.selectedNumbers).filter(num => this.drawnNumbers.has(num)).length;
        const multiplier = this.payoutTable[matches];
        const winAmount = this.betAmount * multiplier;

        this.gamesPlayed++;
        if (winAmount > 0) {
            this.gamesWon++;
            this.balance += winAmount;
            this.saveBalance();
            this.updateBalanceDisplay();
            this.showResult('Winner!', `+$${winAmount.toFixed(2)}`);
        } else {
            this.showResult('Try Again!', `-$${this.betAmount.toFixed(2)}`);
        }

        this.updateStats();
        
        setTimeout(() => {
            this.gameActive = false;
            this.actionButton.disabled = false;
        }, 2000);
    }

    showDrawnNumber(number) {
        const drawnNumber = document.createElement('div');
        drawnNumber.className = 'drawn-number';
        drawnNumber.textContent = number;
        this.drawnNumbersDisplay.appendChild(drawnNumber);

        const cell = this.kenoBoard.children[number - 1];
        cell.classList.add('drawn');
        
        if (this.selectedNumbers.has(number)) {
            cell.classList.add('hit');
        }
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
        
        localStorage.setItem('keno_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('keno_gamesWon', this.gamesWon);
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
    new KenoGame();
}); 