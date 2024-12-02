class ViewerStats {
    constructor() {
        this.updateInterval = 1000; // Check every 1 second
        this.inactivityThreshold = 3000; // Consider viewer inactive after 3 seconds
        this.initializeStats();
        this.startUpdating();
        this.initializeBroadcastChannel();
    }

    initializeStats() {
        this.currentViewersElement = document.getElementById('currentViewers');
        this.totalViewsElement = document.getElementById('totalViews');
        this.updateStats();
    }

    initializeBroadcastChannel() {
        this.broadcastChannel = new BroadcastChannel('viewerUpdate');
        this.broadcastChannel.onmessage = (event) => {
            if (event.data.type === 'update') {
                this.updateStats();
            }
        };
    }

    startUpdating() {
        setInterval(() => this.updateStats(), this.updateInterval);
    }

    updateStats() {
        // Clean up expired viewers
        this.cleanupExpiredViewers();

        // Get current stats
        const viewersData = localStorage.getItem('globalSiteViewers');
        const viewers = viewersData ? JSON.parse(viewersData) : {};
        const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');

        // Count unique devices (excluding expired ones)
        const now = Date.now();
        const activeViewers = Object.values(viewers).filter(viewer => 
            now - viewer.timestamp <= this.inactivityThreshold
        ).length;

        // Update display
        if (this.currentViewersElement.textContent !== activeViewers.toString()) {
            this.currentViewersElement.textContent = activeViewers;
        }
        if (this.totalViewsElement.textContent !== totalViews.toLocaleString()) {
            this.totalViewsElement.textContent = totalViews.toLocaleString();
        }
    }

    cleanupExpiredViewers() {
        const viewersData = localStorage.getItem('globalSiteViewers');
        if (!viewersData) return;

        const viewers = JSON.parse(viewersData);
        const now = Date.now();
        let changed = false;

        for (const [deviceId, data] of Object.entries(viewers)) {
            if (now - data.timestamp > this.inactivityThreshold) {
                delete viewers[deviceId];
                changed = true;
            }
        }

        if (changed) {
            localStorage.setItem('globalSiteViewers', JSON.stringify(viewers));
            // Broadcast the cleanup
            this.broadcastChannel.postMessage({
                type: 'update',
                viewers: viewers
            });
        }
    }
}

// Initialize stats
document.addEventListener('DOMContentLoaded', () => {
    new ViewerStats();
}); 