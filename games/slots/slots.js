class SlotsGame {
    constructor() {
        this.betAmount = 1.00;
        this.gameActive = false;
        this.symbols = ['🍒', '🍋', '🍇', '7️⃣', '💎'];
        this.multipliers = {
            '🍒': 3,
            '🍋': 5,
            '🍇': 8,
            '7️⃣': 10,
            '💎': 15
        };
        
        this.gamesPlayed = parseInt(localStorage.getItem('slots_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('slots_gamesWon')) || 0;
        
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
        this.initializeReels();
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.reels = [
            document.getElementById('reel1'),
            document.getElementById('reel2'),
            document.getElementById('reel3')
        ];
        this.resultOverlay = document.querySelector('.result-overlay');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.spin());
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

    initializeReels() {
        this.reels.forEach(reel => {
            const container = document.createElement('div');
            container.className = 'reel-container';
            
            // Create 5 symbols per reel (visible + buffer)
            for (let i = 0; i < 5; i++) {
                const symbol = document.createElement('div');
                symbol.className = 'reel-symbol';
                symbol.textContent = this.getRandomSymbol();
                container.appendChild(symbol);
            }
            
            reel.innerHTML = '';
            reel.appendChild(container);
        });
    }

    updateReelSymbols(reel) {
        const symbols = Array.from(reel.querySelectorAll('.reel-symbol'));
        symbols.forEach(symbol => {
            symbol.textContent = this.getRandomSymbol();
        });
    }

    getRandomSymbol() {
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    }

    async spin() {
        if (this.gameActive) return;
        if (this.betAmount <= 0 || this.betAmount > window.playerBalance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        window.playerBalance -= this.betAmount;
        await window.updateBalance(window.playerBalance);
        this.updateBalanceDisplay();
        
        this.actionButton.disabled = true;
        this.betInput.disabled = true;
        const modifierBtns = document.querySelectorAll('.modifier-btn');
        modifierBtns.forEach(btn => btn.disabled = true);
        
        // Generate final results
        const results = this.reels.map(() => this.getRandomSymbol());
        
        // Start spinning all reels
        this.reels.forEach(reel => {
            this.updateReelSymbols(reel);
            reel.classList.add('spinning');
        });

        // Stop reels one by one
        for (let i = 0; i < this.reels.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 300 + i * 300));
            
            const reel = this.reels[i];
            const container = reel.querySelector('.reel-container');
            const symbols = container.querySelectorAll('.reel-symbol');
            
            // Update the middle symbol to the result
            symbols[2].textContent = results[i];
            
            // Stop spinning
            reel.classList.remove('spinning');
            reel.classList.add('stopping');
            
            // Position the winning symbol in the center
            container.style.transform = 'translateY(-40%)';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            reel.classList.remove('stopping');
        }

        // Check for wins
        await this.checkWin(results);
        
        this.gameActive = false;
        this.actionButton.disabled = false;
        this.betInput.disabled = false;
        modifierBtns.forEach(btn => btn.disabled = false);
    }

    async checkWin(results) {
        this.gamesPlayed++;
        
        // Check if all symbols are the same
        if (results.every(symbol => symbol === results[0])) {
            const multiplier = this.multipliers[results[0]];
            const winAmount = this.betAmount * multiplier;
            
            this.gamesWon++;
            window.playerBalance += winAmount;
            await window.updateBalance(window.playerBalance);
            
            // Flash winning line
            this.reels.forEach(reel => reel.classList.add('winning-line'));
            setTimeout(() => {
                this.reels.forEach(reel => reel.classList.remove('winning-line'));
            }, 1500);
            
            this.showResult('Win!', `$${winAmount.toFixed(2)}`);
        } else {
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }
        
        this.updateStats();
        this.updateBalanceDisplay();
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
        const winRate = this.gamesPlayed === 0 ? 0 : (this.gamesWon / this.gamesPlayed * 100);
        document.querySelector('.win-rate-value').textContent = `${winRate.toFixed(1)}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        localStorage.setItem('slots_gamesPlayed', this.gamesPlayed);
        localStorage.setItem('slots_gamesWon', this.gamesWon);
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
    new SlotsGame();
}); 