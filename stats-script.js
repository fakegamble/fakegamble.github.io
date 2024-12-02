class ViewerStats {
    constructor() {
        this.updateInterval = 2000; // Update every 2 seconds
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
        this.currentViewersElement.textContent = Object.keys(viewers).length;
        this.totalViewsElement.textContent = totalViews;
    }

    cleanupExpiredViewers() {
        const viewers = JSON.parse(localStorage.getItem('siteViewers') || '{}');
        const now = Date.now();
        let changed = false;

        for (const [id, timestamp] of Object.entries(viewers)) {
            if (now - timestamp > 30000) { // Remove after 30 seconds of inactivity
                delete viewers[id];
                changed = true;
            }
        }

        if (changed) {
            localStorage.setItem('siteViewers', JSON.stringify(viewers));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ViewerStats();
}); 