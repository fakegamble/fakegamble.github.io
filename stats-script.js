class ViewerStats {
    constructor() {
        this.updateInterval = 1000;
        this.inactivityThreshold = 3000; // 3 seconds
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
        // Get and clean up viewers
        let viewers = {};
        try {
            viewers = JSON.parse(localStorage.getItem('activeViewers') || '{}');
        } catch (e) {
            viewers = {};
        }

        const now = Date.now();
        let activeCount = 0;

        // Count active viewers and clean up inactive ones
        Object.entries(viewers).forEach(([deviceId, timestamp]) => {
            if (now - timestamp <= this.inactivityThreshold) {
                activeCount++;
            } else {
                delete viewers[deviceId];
            }
        });

        // Save cleaned up viewers
        localStorage.setItem('activeViewers', JSON.stringify(viewers));

        // Update display
        this.currentViewersElement.textContent = activeCount;
        
        // Update total views
        const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');
        this.totalViewsElement.textContent = totalViews.toLocaleString();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ViewerStats();
}); 