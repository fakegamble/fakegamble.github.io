(() => {
    class ViewerTracker {
        constructor() {
            this.viewerId = this.getOrCreateViewerId();
            this.updateInterval = 10000; // 10 seconds
            this.startTracking();
        }

        getOrCreateViewerId() {
            let viewerId = sessionStorage.getItem('viewerId');
            if (!viewerId) {
                viewerId = 'viewer_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('viewerId', viewerId);
                
                // Increment total views only on first visit
                const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');
                localStorage.setItem('siteTotalViews', totalViews + 1);
            }
            return viewerId;
        }

        updateViewerActivity() {
            const viewers = JSON.parse(localStorage.getItem('siteViewers') || '{}');
            viewers[this.viewerId] = Date.now();
            localStorage.setItem('siteViewers', JSON.stringify(viewers));
        }

        startTracking() {
            // Update immediately
            this.updateViewerActivity();

            // Set up periodic updates
            setInterval(() => this.updateViewerActivity(), this.updateInterval);

            // Update when tab becomes visible
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.updateViewerActivity();
                }
            });
        }
    }

    // Initialize tracker
    new ViewerTracker();
})(); 