class ViewerStats {
    constructor() {
        this.updateInterval = 1000; // Check every 1 second
        this.inactivityThreshold = 3000; // Consider viewer inactive after 3 seconds
        this.initializeStats();
        this.startUpdating();
    }

    initializeStats() {
        this.currentViewersElement = document.getElementById('currentViewers');
        this.totalViewsElement = document.getElementById('totalViews');
        this.updateStats();
    }

    startUpdating() {
        setInterval(() => this.updateStats(), this.updateInterval);
    }

    updateStats() {
        // Clean up expired viewers
        this.cleanupExpiredViewers();

        // Get current stats
        const viewers = JSON.parse(localStorage.getItem('siteViewers') || '{}');
        const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');

        // Update display
        const currentViewers = Object.keys(viewers).length;
        if (this.currentViewersElement.textContent !== currentViewers.toString()) {
            this.currentViewersElement.textContent = currentViewers;
        }
        if (this.totalViewsElement.textContent !== totalViews.toLocaleString()) {
            this.totalViewsElement.textContent = totalViews.toLocaleString();
        }
    }

    cleanupExpiredViewers() {
        const viewers = JSON.parse(localStorage.getItem('siteViewers') || '{}');
        const now = Date.now();
        let changed = false;

        for (const [id, timestamp] of Object.entries(viewers)) {
            if (now - timestamp > this.inactivityThreshold) {
                delete viewers[id];
                changed = true;
            }
        }

        if (changed) {
            localStorage.setItem('siteViewers', JSON.stringify(viewers));
        }
    }
}

// Initialize stats
document.addEventListener('DOMContentLoaded', () => {
    new ViewerStats();
}); 