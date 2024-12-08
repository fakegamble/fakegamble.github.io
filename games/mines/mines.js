class MinesGame {
    constructor() {
        this.gridSize = 5;
        this.totalTiles = this.gridSize * this.gridSize;
        this.mines = [];
        this.revealed = new Set();
        this.gameActive = false;
        this.betAmount = 0;
        this.mineCount = 3;
        this.currentProfit = 0;
        this.currentMultiplier = 1.0;
        
        if (typeof window.playerBalance === 'undefined') {
            window.addEventListener('balanceInitialized', () => {
                this.initialize();
            });
        } else {
            this.initialize();
        }

        window.addmoney = (amount) => this.addMoney(amount);
    }

    initialize() {
        this.initializeDOM();
        this.initializeEventListeners();
        this.setupBalanceListener();
        this.updateBalanceDisplay();
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

    initializeDOM() {
        this.gameGrid = document.querySelector('.game-grid');
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.minesSelect = document.getElementById('minesCount');
        this.resultOverlay = document.getElementById('resultOverlay');
        this.tilesCounter = document.querySelector('.revealed-count');
        this.profitDisplay = document.querySelector('.profit-amount');
        
        this.createGrid();
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.handleActionButton());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        this.minesSelect.addEventListener('change', () => this.updateMineCount());
        
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
    }

    createGrid() {
        this.gameGrid.innerHTML = '';
        for (let i = 0; i < this.totalTiles; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.handleCellClick(i));
            this.gameGrid.appendChild(cell);
        }
    }

    handleActionButton() {
        if (!this.gameActive) {
            this.startGame();
        } else {
            this.cashOut();
        }
    }

    async startGame() {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login/';
            return;
        }

        if (this.betAmount <= 0) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }
        
        if (this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Insufficient balance', true);
            return;
        }

        if (this.mineCount < 1 || this.mineCount > 21) {
            this.showResult('Error', 'Invalid mine count', true);
            return;
        }

        try {
            window.playerBalance -= this.betAmount;
            await window.updateBalance(window.playerBalance);
            this.updateBalanceDisplay();
            
            this.gameActive = true;
            this.revealed.clear();
            this.currentProfit = 0;
            this.currentMultiplier = 1.0;
            this.placeMines();
            this.updateUI();
            
            this.actionButton.textContent = 'Cash Out';
            this.actionButton.classList.add('cashout');
            
            this.betInput.disabled = true;
            this.minesSelect.disabled = true;
            document.querySelector('.half-btn').disabled = true;
            document.querySelector('.double-btn').disabled = true;
        } catch (error) {
            console.error("Error starting game:", error);
            this.showResult('Error', 'Failed to start game', true);
            window.playerBalance += this.betAmount;
            this.updateBalanceDisplay();
        }
    }

    placeMines() {
        this.mines = [];
        while (this.mines.length < this.mineCount) {
            const position = Math.floor(Math.random() * this.totalTiles);
            if (!this.mines.includes(position)) {
                this.mines.push(position);
            }
        }
    }

    revealAllMines() {
        this.mines.forEach(position => {
            const cell = document.querySelector(`[data-index="${position}"]`);
            cell.classList.add('mine');
            cell.style.animation = 'revealMine 0.3s ease forwards';
        });
    }

    async handleCellClick(position) {
        if (!this.gameActive || this.revealed.has(position)) return;

        if (this.mines.includes(position)) {
            this.gameActive = false;
            this.revealAllMines();
            this.showResult('Game Over!', `-$${this.betAmount.toFixed(2)}`);
            this.endGame();
            return;
        }

        this.revealed.add(position);
        const cell = document.querySelector(`[data-index="${position}"]`);
        cell.classList.add('revealed');

        this.currentMultiplier = this.calculateMultiplier(this.revealed.size);
        this.currentProfit = (this.betAmount * this.currentMultiplier) - this.betAmount;
        
        this.updateUI();

        if (this.revealed.size === this.totalTiles - this.mines.length) {
            await this.cashOut();
        }
    }

    async cashOut() {
        if (!this.gameActive) return;
        
        const profit = this.currentProfit;
        const total = this.betAmount + profit;
        this.gameActive = false;
        
        try {
            window.playerBalance += total;
            await window.updateBalance(window.playerBalance);
            this.updateBalanceDisplay();
            
            this.showResult('Winner!', `+$${total.toFixed(2)}`);
            this.revealAllMines();
            this.endGame();
        } catch (error) {
            console.error("Error cashing out:", error);
            this.showResult('Error', 'Failed to cash out', true);
            window.playerBalance -= total;
            this.updateBalanceDisplay();
        }
    }

    calculateMultiplier(revealedCount) {
        const multiplierTable = {
            1: [1.04, 1.09, 1.14, 1.19, 1.24, 1.30, 1.36, 1.42, 1.49, 1.56, 1.64, 1.72, 1.80, 1.89, 1.98, 2.08, 2.19, 2.30, 2.41, 2.54, 2.66, 2.80, 2.94, 3.09],
            2: [1.08, 1.17, 1.27, 1.37, 1.48, 1.59, 1.71, 1.83, 1.96, 2.09, 2.23, 2.38, 2.54, 2.70, 2.87, 3.05, 3.24, 3.43, 3.64, 3.86, 4.08, 4.31, 4.55, 4.80],
            3: [1.12, 1.25, 1.40, 1.55, 1.71, 1.88, 2.05, 2.24, 2.43, 2.63, 2.84, 3.05, 3.28, 3.51, 3.75, 4.00, 4.26, 4.53, 4.81, 5.10, 5.39, 5.70, 6.02, 6.34],
            4: [1.17, 1.34, 1.53, 1.73, 1.94, 2.16, 2.39, 2.63, 2.88, 3.14, 3.41, 3.69, 3.97, 4.27, 4.57, 4.88, 5.20, 5.52, 5.85, 6.19, 6.54, 6.89, 7.24, 7.60],
            5: [1.23, 1.52, 1.87, 2.30, 2.84, 3.51, 4.35, 5.41, 6.73, 8.35, 10.34, 12.77, 15.73, 19.33, 23.70, 28.99, 35.38, 43.11, 52.43, 63.76, 77.67, 94.83, 116.18, 142.96],
            6: [1.30, 1.67, 2.13, 2.71, 3.43, 4.31, 5.42, 6.79, 8.50, 10.61, 13.21, 16.42, 20.37, 25.24, 31.26, 38.69, 47.86, 59.25, 73.48, 91.36, 113.89, 142.41, 178.62, 224.73],
            7: [1.38, 1.82, 2.38, 3.09, 3.97, 5.06, 6.41, 8.08, 10.14, 12.67, 15.77, 19.56, 24.18, 29.80, 36.66, 45.02, 55.20, 67.64, 82.85, 101.48, 124.30, 152.32, 186.78, 229.20],
            8: [1.47, 2.00, 2.70, 3.61, 4.78, 6.27, 8.16, 10.54, 13.52, 17.23, 21.84, 27.54, 34.56, 43.23, 53.91, 67.06, 83.27, 103.28, 127.97, 158.47, 196.15, 242.70, 300.15, 370.98],
            9: [1.57, 2.21, 3.08, 4.21, 5.76, 7.79, 10.39, 13.68, 17.80, 23.00, 29.60, 37.92, 48.45, 61.78, 78.64, 99.95, 126.80, 160.61, 202.99, 255.95, 321.88, 403.68, 504.78, 629.30],
            10: [1.68, 2.45, 3.52, 4.91, 6.76, 9.30, 12.79, 17.58, 24.17, 33.23, 45.66, 62.73, 86.06, 117.84, 160.00, 215.47, 288.56, 384.20, 508.47, 668.20, 872.60, 1133.00, 1473.00, 1915.00],
            11: [1.76, 3.01, 5.18, 8.82, 14.71, 24.87, 42.51, 72.95, 125.25, 215.13, 378.77, 669.42, 1186.52, 2142.82, 4003.48, 7709.91, 15481.94, 31862.50, 68000.00, 153500.00, 369000.00, 921500.00, 2525000.00],
            12: [1.85, 3.30, 5.92, 10.41, 18.13, 31.75, 56.09, 100.89, 183.66, 343.10, 663.00, 1335.67, 2800.00, 6320.00, 15530.00, 42290.00, 126870.00, 434200.00, 2088333.33],
            13: [2.01, 3.76, 7.06, 13.28, 25.00, 49.20, 99.21, 211.22, 469.54, 1133.75, 2900.00, 9266.67, 46333.33],
            14: [2.24, 4.56, 8.97, 18.16, 38.62, 100.00, 240.00, 600.00, 1665.00],
            15: [2.5, 5.10, 10.11, 20.57, 50.00, 125.00, 375.00, 1000.00, 2500.00],
            16: [3.00, 6.25, 12.50, 25.00, 75.00, 200.00, 600.00, 2000.00],
            17: [3.50, 7.25, 15.00, 35.00, 100.00, 300.00, 1200.00],
            18: [4.00, 9.00, 20.00, 50.00, 200.00, 800.00],
            19: [5.00, 12.50, 30.00, 100.00, 500.00],
            20: [6.00, 18.00, 50.00, 200.00],
            21: [10.00, 30.00, 100.00]
        };

        const mineCount = Math.max(1, Math.min(10, this.mineCount));
        const multipliers = multiplierTable[mineCount];
        return multipliers[revealedCount - 1] || 1.0;
    }

    endGame() {
        this.gameActive = false;
        this.actionButton.textContent = 'Play';
        this.actionButton.classList.remove('cashout');
        this.updateUI();
        
        this.betInput.disabled = false;
        this.minesSelect.disabled = false;
        document.querySelector('.half-btn').disabled = false;
        document.querySelector('.double-btn').disabled = false;
    }

    showResult(text, amount, isError = false) {
        const overlay = this.resultOverlay;
        overlay.querySelector('.result-text').textContent = text;
        const amountElement = overlay.querySelector('.result-amount');
        
        const cleanAmount = amount.replace(/[+\-$]/g, '');
        amountElement.textContent = `$${cleanAmount}`;
        
        this.actionButton.disabled = true;
        
        amountElement.classList.remove('win', 'lose', 'error');
        if (isError) {
            amountElement.classList.add('error');
        } else if (amount.startsWith('-')) {
            amountElement.classList.add('lose');
        } else {
            amountElement.classList.add('win');
        }
        
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            this.actionButton.disabled = false;
            if (!this.gameActive) {
                this.createGrid();
            }
        }, 2000);
    }

    updateUI() {
        this.updateBalanceDisplay();
        this.tilesCounter.textContent = this.revealed.size;
        this.profitDisplay.textContent = `$${this.currentProfit.toFixed(2)}`;
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
        this.betAmount = parseFloat(this.betInput.value) * multiplier;
        this.betInput.value = this.betAmount.toFixed(2);
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }

    updateMineCount() {
        this.mineCount = parseInt(this.minesSelect.value);
    }

    async addMoney(amount) {
        const username = localStorage.getItem('username');
        if (!username) {
            window.location.href = '/login/';
            return;
        }

        if (typeof amount !== 'number' || isNaN(amount)) {
            console.log('Please provide a valid number');
            return;
        }
        
        window.playerBalance += amount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        console.log(`Successfully added $${amount.toFixed(2)} to balance`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MinesGame();
});