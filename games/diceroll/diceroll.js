class DiceRollGame {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100;
        this.betAmount = 1.00;
        this.gameActive = false;
        this.selectedBet = 'under';
        this.targetNumber = 7;
        
        this.gamesPlayed = parseInt(localStorage.getItem('diceroll_gamesPlayed')) || 0;
        this.gamesWon = parseInt(localStorage.getItem('diceroll_gamesWon')) || 0;
        
        this.initializeDOM();
        this.initializeEventListeners();
        this.updateBalanceDisplay();
        this.updateStats();
        
        // Initialize empty dice faces
        this.clearDice(this.dice1);
        this.clearDice(this.dice2);
    }

    clearDice(dice) {
        if (dice) {
            dice.innerHTML = '';
        }
    }

    initializeDOM() {
        this.actionButton = document.getElementById('actionButton');
        this.betInput = document.getElementById('betAmount');
        this.dice1 = document.getElementById('dice1');
        this.dice2 = document.getElementById('dice2');
        this.sumDisplay = document.querySelector('.sum-value');
        this.underButton = document.getElementById('underButton');
        this.overButton = document.getElementById('overButton');
        this.resultOverlay = document.querySelector('.result-overlay');
    }

    initializeEventListeners() {
        this.actionButton.addEventListener('click', () => this.playRound());
        this.betInput.addEventListener('input', () => this.updateBetAmount());
        this.underButton.addEventListener('click', () => this.setBetType('under'));
        this.overButton.addEventListener('click', () => this.setBetType('over'));
        document.querySelector('.half-btn').addEventListener('click', () => this.adjustBet(0.5));
        document.querySelector('.double-btn').addEventListener('click', () => this.adjustBet(2));
    }

    setBetType(type) {
        this.selectedBet = type;
        this.underButton.classList.toggle('active', type === 'under');
        this.overButton.classList.toggle('active', type === 'over');
    }

    updateDiceDisplay(dice, value) {
        // Clear previous dots
        dice.innerHTML = '';
        
        const createDot = (className) => {
            const dot = document.createElement('div');
            dot.className = `dot ${className}`;
            return dot;
        };

        // Add dots based on dice value
        switch (value) {
            case 1:
                dice.appendChild(createDot('center'));
                break;
                
            case 2:
                dice.appendChild(createDot('top-right'));
                dice.appendChild(createDot('bottom-left'));
                break;
                
            case 3:
                dice.appendChild(createDot('top-right'));
                dice.appendChild(createDot('center'));
                dice.appendChild(createDot('bottom-left'));
                break;
                
            case 4:
                dice.appendChild(createDot('top-left'));
                dice.appendChild(createDot('top-right'));
                dice.appendChild(createDot('bottom-left'));
                dice.appendChild(createDot('bottom-right'));
                break;
                
            case 5:
                dice.appendChild(createDot('top-left'));
                dice.appendChild(createDot('top-right'));
                dice.appendChild(createDot('center'));
                dice.appendChild(createDot('bottom-left'));
                dice.appendChild(createDot('bottom-right'));
                break;
                
            case 6:
                dice.appendChild(createDot('top-left'));
                dice.appendChild(createDot('top-right'));
                dice.appendChild(createDot('middle-left'));
                dice.appendChild(createDot('middle-right'));
                dice.appendChild(createDot('bottom-left'));
                dice.appendChild(createDot('bottom-right'));
                break;
        }
    }

    async playRound() {
        if (this.gameActive) return;
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            this.showResult('Error', 'Invalid bet amount', true);
            return;
        }

        this.gameActive = true;
        this.balance -= this.betAmount;
        this.updateBalanceDisplay();
        this.actionButton.disabled = true;

        // Roll animation
        this.dice1.classList.add('rolling');
        this.dice2.classList.add('rolling');
        this.sumDisplay.textContent = '-';

        // Show random faces during roll animation
        const rollInterval = setInterval(() => {
            this.updateDiceDisplay(this.dice1, Math.floor(Math.random() * 6) + 1);
            this.updateDiceDisplay(this.dice2, Math.floor(Math.random() * 6) + 1);
        }, 100);

        await new Promise(resolve => setTimeout(resolve, 600));
        clearInterval(rollInterval);

        // Generate final values and display them
        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;
        const sum = roll1 + roll2;

        this.dice1.classList.remove('rolling');
        this.dice2.classList.remove('rolling');

        this.updateDiceDisplay(this.dice1, roll1);
        this.updateDiceDisplay(this.dice2, roll2);
        this.sumDisplay.textContent = sum;

        // Determine win/loss
        const isUnderWin = this.selectedBet === 'under' && sum < this.targetNumber;
        const isOverWin = this.selectedBet === 'over' && sum > this.targetNumber;
        
        if (isUnderWin || isOverWin) {
            this.gamesWon++;
            const winAmount = this.betAmount * 2;
            this.balance += winAmount;
            this.showResult('Win!', `+$${(winAmount - this.betAmount).toFixed(2)}`);
        } else if (sum === this.targetNumber) {
            this.balance += this.betAmount;
            this.showResult('Push', 'Bet returned');
            // Don't count pushes in games played
            this.gamesPlayed--;
        } else {
            this.showResult('Loss', `-$${this.betAmount.toFixed(2)}`);
        }

        this.gamesPlayed++;
        this.updateStats(); // Update and save stats after each game
        this.saveBalance();
        this.updateBalanceDisplay();
        
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

    updateStats() {
        const winRate = this.gamesPlayed === 0 ? 0 : (this.gamesWon / this.gamesPlayed * 100);
        document.querySelector('.win-rate-value').textContent = `${winRate.toFixed(1)}%`;
        document.querySelector('.total-played-value').textContent = this.gamesPlayed;
        
        // Save both values to localStorage
        localStorage.setItem('diceroll_gamesPlayed', this.gamesPlayed.toString());
        localStorage.setItem('diceroll_gamesWon', this.gamesWon.toString());
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
    new DiceRollGame();
}); 