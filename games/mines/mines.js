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
        this.autoPlaySettings = null;
        this.autoPlayActive = false;

        this.multiplierMap = {
            1: 1.03,
            2: 1.06,
            3: 1.10,
            4: 1.20,
            5: 1.30,
            6: 1.45,
            7: 1.65,
            8: 1.90,
            9: 2.20,
            10: 2.60,
            11: 3.10,
            12: 3.80,
            13: 4.70,
            14: 5.90,
            15: 7.60,
            16: 10.00,
            17: 13.50,
            18: 19.00,
            19: 28.00,
            20: 44.00,
            21: 76.00
        };

        // Modify the balance change listener
        Object.defineProperty(window, 'playerBalance', {
            get: function() {
                return parseFloat(localStorage.getItem('gameBalance')) || 0;
            },
            set: function(newValue) {
                localStorage.setItem('gameBalance', newValue.toFixed(2));
            }
        });

        // Add check for existing balance before redirect
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('userId');
        if (!username || !userId) {
            window.location.href = '/login.html';
            return;
        }

        // Initialize player data
        const playerRef = window.doc(window.db, "users", username);
        window.onSnapshot(playerRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.balance !== undefined) {
                    window.playerBalance = data.balance;
                    this.updateBalanceDisplay();
                    window.dispatchEvent(new Event('balanceInitialized'));
                }
            }
        });

        this.initializeDOM();
        this.initializeEventListeners();
        this.setupBalanceListener();
        this.updateBalanceDisplay();

        window.addmoney = (amount) => this.addMoney(amount);
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

    initializeDOM() {
        this.gameGrid = document.querySelector('.game-grid');
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.minesSelect = document.getElementById('minesCount');
        this.autoPanel = document.getElementById('autoPanel');
        this.resultOverlay = document.getElementById('resultOverlay');
        this.tilesCounter = document.querySelector('.revealed-count');
        this.profitDisplay = document.querySelector('.profit-amount');
        this.autoOverlay = document.querySelector('.auto-overlay');
        
        this.createGrid();
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.handleActionButton());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        this.minesSelect.addEventListener('change', () => this.updateMineCount());
        
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
        
        document.querySelector('[data-mode="auto"]').addEventListener('click', () => this.toggleAutoPanel(true));
        document.querySelector('[data-mode="manual"]').addEventListener('click', () => this.toggleAutoPanel(false));
        
        document.getElementById('startAutoPlay').addEventListener('click', () => this.startAutoPlay());
        document.getElementById('closeAutoPlay').addEventListener('click', () => this.toggleAutoPanel(false));
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

    toggleAutoPanel(show) {
        this.autoPanel.classList.toggle('active', show);
        this.autoOverlay.classList.toggle('active', show);
        document.querySelector('[data-mode="auto"]').classList.toggle('active', show);
        document.querySelector('[data-mode="manual"]').classList.toggle('active', !show);
        
        if (show) {
            this.autoOverlay.addEventListener('click', () => this.toggleAutoPanel(false), { once: true });
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

        window.playerBalance -= this.betAmount;
        await updateBalance(window.playerBalance);
        this.gameActive = true;
        this.revealed.clear();
        this.currentProfit = 0;
        this.placeMines();
        this.updateUI();
        
        this.actionButton.textContent = 'Cash Out';
        this.actionButton.classList.add('cashout');
        
        this.betInput.disabled = true;
        this.minesSelect.disabled = true;
        document.querySelector('.half-btn').disabled = true;
        document.querySelector('.double-btn').disabled = true;
        document.querySelector('[data-mode="auto"]').disabled = true;
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

    handleCellClick(index) {
        if (!this.gameActive) {
            this.showResult('Game Not Started', 'Press Play to start the game', true);
            return;
        }

        if (this.revealed.has(index)) return;

        const cell = this.gameGrid.children[index];
        
        if (this.mines.includes(index)) {
            this.gameActive = false;
            cell.classList.add('mine');
            this.gameOver(false);
            return;
        }

        this.revealed.add(index);
        cell.classList.add('revealed');
        
        this.updateProfit();
        this.updateUI();
        
        if (this.revealed.size === this.totalTiles - this.mineCount) {
            this.gameOver(true);
        }
    }

    updateProfit() {
        let multiplier = this.multiplierMap[this.mineCount] || this.calculateMultiplier();
        this.currentProfit = this.betAmount * Math.pow(multiplier, this.revealed.size);
    }

    calculateMultiplier() {
        const safeSpots = this.totalTiles - this.mineCount;
        const baseMultiplier = this.totalTiles / safeSpots;
        return 1 + (baseMultiplier - 1) * 0.95;
    }

    async cashOut() {
        if (!this.gameActive) return;
        
        window.playerBalance += this.currentProfit;
        await updateBalance(window.playerBalance);
        
        // Show all mines before ending the game
        this.mines.forEach(index => {
            const cell = this.gameGrid.children[index];
            cell.classList.add('mine');
        });
        
        this.showResult('Success!', `+$${this.currentProfit.toFixed(2)}`);
        this.endGame();
    }

    gameOver(won) {
        this.gameActive = false;
        
        this.mines.forEach(index => {
            const cell = this.gameGrid.children[index];
            cell.classList.add('mine');
        });

        if (!won) {
            this.showResult('Game Over', `-$${this.betAmount.toFixed(2)}`);
            updateBalance(window.playerBalance);
        }

        this.endGame();
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
        document.querySelector('[data-mode="auto"]').disabled = false;
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
        document.querySelectorAll('.balance-amount').forEach(element => {
            element.textContent = `$${formattedBalance}`;
        });
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

    async startAutoPlay() {
        this.autoPlaySettings = {
            amount: parseFloat(document.getElementById('autoAmount').value),
            mines: parseInt(document.getElementById('autoMines').value),
            games: parseInt(document.getElementById('autoGames').value),
            stopProfit: parseFloat(document.getElementById('autoProfit').value),
            stopLoss: parseFloat(document.getElementById('autoLoss').value)
        };

        this.autoPlayActive = true;
        this.toggleAutoPanel(false);
        
        const initialBalance = window.playerBalance;
        let gamesPlayed = 0;

        while (this.autoPlayActive && gamesPlayed < this.autoPlaySettings.games) {
            const netProfit = window.playerBalance - initialBalance;
            
            if (netProfit >= this.autoPlaySettings.stopProfit || 
                netProfit <= -this.autoPlaySettings.stopLoss) {
                break;
            }

            this.betAmount = this.autoPlaySettings.amount;
            this.mineCount = this.autoPlaySettings.mines;
            
            await this.playAutoGame();
            gamesPlayed++;
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.autoPlayActive = false;
    }

    async playAutoGame() {
        return new Promise(async (resolve) => {
            await new Promise(resolve => {
                const checkOverlay = () => {
                    if (!this.resultOverlay.classList.contains('active')) {
                        resolve();
                    } else {
                        setTimeout(checkOverlay, 100);
                    }
                };
                checkOverlay();
            });

            await this.startGame();
            
            const maxClicks = 5;
            let clicks = 0;
            
            while (this.gameActive && clicks < maxClicks) {
                const unrevealedPositions = Array.from(Array(this.totalTiles).keys())
                    .filter(pos => !this.revealed.has(pos));
                
                if (unrevealedPositions.length === 0) break;
                
                const randomIndex = Math.floor(Math.random() * unrevealedPositions.length);
                const selectedPosition = unrevealedPositions[randomIndex];
                
                await new Promise(resolve => setTimeout(resolve, 200));
                this.handleCellClick(selectedPosition);
                clicks++;
            }

            if (this.gameActive) {
                await this.cashOut();
            }
            
            resolve();
        });
    }

    async addMoney(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            console.log('Please provide a valid number');
            return;
        }
        
        window.playerBalance += amount;
        await updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        console.log(`Successfully added $${amount.toFixed(2)} to balance`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MinesGame();
});
