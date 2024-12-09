class CrashGame {
    constructor() {
        this.betAmount = 1.00;
        this.autoCashout = 0;
        this.gameActive = false;
        this.currentMultiplier = 1.00;
        this.hasCashedOut = false;
        this.gameLoop = null;
        this.crashPoint = 1.00;
        this.history = [];
        this.maxHistory = 3;
        
        this.gamesPlayed = parseInt(localStorage.getItem('crash_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('crash_gamesWon')) || 0;
        
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
        this.initializeCanvas();
        this.initializeEventListeners();
        this.setupBalanceListener();
        this.updateBalanceDisplay();
        this.updateStats();
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.autoCashoutInput = document.getElementById('autoCashout');
        this.multiplierDisplay = document.querySelector('.multiplier');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.historyList = document.querySelector('.history-list');
    }

    initializeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.graphPoints = [];
        
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.drawGraph();
        });
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.handleActionButton());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        this.autoCashoutInput.addEventListener('input', () => this.updateAutoCashout());
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

    updateBalanceDisplay() {
        const balance = window.playerBalance || 0;
        const formattedBalance = balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.querySelector('.balance-amount').textContent = `$${formattedBalance}`;
    }

    updateBetAmount() {
        this.betAmount = parseFloat(this.betInput.value) || 0;
    }

    updateAutoCashout() {
        const value = parseFloat(this.autoCashoutInput.value) || 0;
        this.autoCashout = value > 0 ? Math.max(1.01, value) : 0;
        if (value > 0) {
            this.autoCashoutInput.value = this.autoCashout.toFixed(2);
        }
    }

    adjustBet(multiplier) {
        this.betAmount = parseFloat(this.betInput.value) * multiplier;
        this.betInput.value = this.betAmount.toFixed(2);
    }

    handleActionButton() {
        if (!this.gameActive) {
            this.startGame();
        } else {
            this.cashOut();
        }
    }

    async startGame() {
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        this.hasCashedOut = false;
        window.playerBalance -= this.betAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();

        this.actionButton.textContent = 'Cash Out';
        this.actionButton.classList.add('cashout');
        this.betInput.disabled = true;
        this.autoCashoutInput.disabled = true;

        // Reset displays
        this.multiplierDisplay.classList.remove('crashed');
        document.querySelector('.potential-profit').textContent = '+$0.00';

        // Generate crash point
        this.crashPoint = this.generateCrashPoint();
        this.currentMultiplier = 1.00;
        this.graphPoints = [{x: 0, y: 1}];
        
        this.gameLoop = requestAnimationFrame(() => this.updateGame());
    }

    generateCrashPoint() {
        const r = Math.random();
        const baseHouseEdge = 0.035; // Base house edge (3.5%)
        
        // Normal crash point calculation with slightly higher lambda for more frequent crashes
        const lambda = 0.25; // Increased from 0.2 to create more frequent crashes
        const crashPoint = Math.max(1.00, 
            (1 / lambda) * Math.log(1 / (1 - r)) * (1 - baseHouseEdge)
        );
        
        return Math.min(10000, crashPoint);
    }

    async cashOut() {
        if (!this.gameActive || this.hasCashedOut) return;
        
        this.hasCashedOut = true;
        this.gameActive = false;
        cancelAnimationFrame(this.gameLoop);
        
        const winAmount = this.betAmount * this.currentMultiplier;
        window.playerBalance += winAmount;
        await window.updateBalance(window.playerBalance);
        
        this.gamesWon++;
        this.gamesPlayed++;
        this.updateStats();
        
        this.showResult(
            'Win!', 
            `$${winAmount.toFixed(2)}`,
            false,
            `Would have crashed at ${this.crashPoint.toFixed(2)}×`
        );

        this.history.unshift(this.crashPoint);
        if (this.history.length > this.maxHistory) this.history.pop();
        this.updateHistory();

        this.actionButton.textContent = 'Place Bet';
        this.actionButton.classList.remove('cashout');
        this.betInput.disabled = false;
        this.autoCashoutInput.disabled = false;

        setTimeout(() => {
            this.currentMultiplier = 1.00;
            this.multiplierDisplay.textContent = '1.00×';
            this.graphPoints = [{x: 0, y: 1}];
            this.drawGraph();
        }, 2000);
    }

    updateGame() {
        if (!this.gameActive) return;

        // Calculate time-based multiplier with increasing speed
        const baseMultiplier = 1.0012;
        const speedMultiplier = 1.0001;
        const timeElapsed = this.graphPoints.length;
        
        this.currentMultiplier = Math.min(
            this.crashPoint,
            1 + (Math.pow(baseMultiplier, timeElapsed) - 1) * Math.pow(speedMultiplier, timeElapsed)
        );

        // Auto cashout check - only if autoCashout is greater than 0
        if (!this.hasCashedOut && this.autoCashout > 0 && this.currentMultiplier >= this.autoCashout) {
            this.cashOut();
        }

        // Update display
        this.multiplierDisplay.textContent = `${this.currentMultiplier.toFixed(2)}×`;
        
        // Update potential profit
        const potentialProfit = this.betAmount * (this.currentMultiplier - 1);
        document.querySelector('.potential-profit').textContent = 
            `+$${potentialProfit.toFixed(2)}`;

        // Add point to graph
        this.graphPoints.push({
            x: this.graphPoints.length,
            y: this.currentMultiplier
        });
        
        this.drawGraph();

        // Check for crash
        if (this.currentMultiplier >= this.crashPoint) {
            this.gameCrashed();
        } else {
            this.gameLoop = requestAnimationFrame(() => this.updateGame());
        }
    }

    async gameCrashed() {
        this.gameActive = false;
        cancelAnimationFrame(this.gameLoop);
        
        this.multiplierDisplay.textContent = 'CRASHED';
        this.multiplierDisplay.classList.add('crashed');
        document.querySelector('.potential-profit').textContent = '';
        
        this.actionButton.textContent = 'Place Bet';
        this.actionButton.classList.remove('cashout');
        this.betInput.disabled = false;
        this.autoCashoutInput.disabled = false;

        if (!this.hasCashedOut) {
            this.showResult('Crashed', `-$${this.betAmount.toFixed(2)}`);
        }

        // Update history with actual crash point
        this.history.unshift(this.crashPoint);
        if (this.history.length > this.maxHistory) this.history.pop();
        this.updateHistory();

        // Update stats
        this.gamesPlayed++;
        this.updateStats();

        // Reset for next game
        setTimeout(() => {
            this.multiplierDisplay.classList.remove('crashed');
            this.currentMultiplier = 1.00;
            this.multiplierDisplay.textContent = '1.00×';
            this.graphPoints = [{x: 0, y: 1}];
            this.drawGraph();
        }, 2000);
    }

    drawGraph() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Scale points to canvas with better curve
        const scaledPoints = this.graphPoints.map(point => ({
            x: (point.x / Math.max(100, this.graphPoints.length)) * this.canvas.width,
            y: this.canvas.height - (Math.log(point.y) / Math.log(Math.max(...this.graphPoints.map(p => p.y)))) * (this.canvas.height * 0.8)
        }));

        // Draw smooth curve
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height);
        
        // Use bezier curves for smoother line
        for (let i = 0; i < scaledPoints.length - 1; i++) {
            const xc = (scaledPoints[i].x + scaledPoints[i + 1].x) / 2;
            const yc = (scaledPoints[i].y + scaledPoints[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(scaledPoints[i].x, scaledPoints[i].y, xc, yc);
        }
        
        if (scaledPoints.length > 1) {
            const last = scaledPoints[scaledPoints.length - 1];
            this.ctx.lineTo(last.x, last.y);
        }

        // Style the line
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Fill area under curve
        this.ctx.lineTo(scaledPoints[scaledPoints.length - 1].x, this.canvas.height);
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        this.ctx.fill();
    }

    updateHistory() {
        this.historyList.innerHTML = '';
        this.history.forEach(point => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            // Add special classes for high multipliers
            if (point >= 1000) {
                item.setAttribute('data-multiplier', '1000');
            } else if (point >= 100) {
                item.setAttribute('data-multiplier', '100');
            } else if (point >= 10) {
                item.setAttribute('data-multiplier', '10');
            } else {
                item.className += point >= 2 ? ' win' : ' lose';
            }
            
            item.textContent = `${point.toFixed(2)}×`;
            this.historyList.appendChild(item);
        });
    }

    updateStats() {
        const winRate = this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : '0.0';
        document.querySelector('.win-rate-value').textContent = `${winRate}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        localStorage.setItem('crash_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('crash_gamesWon', this.gamesWon);
    }

    showResult(text, amount, isError = false, subtext = '') {
        const overlay = document.querySelector('.result-overlay');
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

        // Add subtext if provided
        const subtextElement = overlay.querySelector('.result-subtext');
        if (subtextElement) {
            subtextElement.textContent = subtext;
        }
        
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 2000);
    }
}

// Initialize game
window.addEventListener('load', () => {
    new CrashGame();
}); 