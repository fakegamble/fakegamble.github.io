class GameHub {
    constructor() {
        this.balance = parseFloat(localStorage.getItem('gameBalance')) || 100.00;
        this.initializeUI();
        this.addEventListeners();
    }

    initializeUI() {
        this.updateBalanceDisplay();
        this.initializeCategories();
    }

    updateBalanceDisplay() {
        const balanceElement = document.querySelector('.balance-amount');
        balanceElement.textContent = `$${this.balance.toFixed(2)}`;
        localStorage.setItem('gameBalance', this.balance.toFixed(2));
    }

    initializeCategories() {
        const categories = document.querySelectorAll('.category');
        categories.forEach(category => {
            category.addEventListener('click', () => {
                categories.forEach(c => c.classList.remove('active'));
                category.classList.add('active');
                // Add filtering logic here when you have more games
            });
        });
    }

    addEventListeners() {
        // Add global money function
        window.addmoney = (amount) => {
            this.balance += amount;
            this.updateBalanceDisplay();
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameHub = new GameHub();
}); 