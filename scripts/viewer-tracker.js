(() => {
    class ViewerTracker {
        constructor() {
            this.deviceId = this.getOrCreateDeviceId();
            this.updateInterval = 1000; // 1 second heartbeat
            this.startTracking();
        }

        getOrCreateDeviceId() {
            // Create a unique device ID that persists across sessions
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('deviceId', deviceId);
                
                // Increment total views for new devices
                const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');
                localStorage.setItem('siteTotalViews', totalViews + 1);
            }
            return deviceId;
        }

        updateViewerActivity() {
            try {
                // Get the current viewers from localStorage
                const viewersData = localStorage.getItem('globalSiteViewers');
                const viewers = viewersData ? JSON.parse(viewersData) : {};
                
                // Update this device's timestamp
                viewers[this.deviceId] = {
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent
                };

                // Store back to localStorage
                localStorage.setItem('globalSiteViewers', JSON.stringify(viewers));

                // Broadcast the update to other tabs/windows
                const broadcastChannel = new BroadcastChannel('viewerUpdate');
                broadcastChannel.postMessage({ 
                    type: 'update',
                    viewers: viewers 
                });
            } catch (error) {
                console.error('Error updating viewer activity:', error);
            }
        }

        startTracking() {
            // Update immediately
            this.updateViewerActivity();

            // Set up 1-second heartbeat
            setInterval(() => this.updateViewerActivity(), this.updateInterval);

            // Listen for updates from other tabs/windows
            const broadcastChannel = new BroadcastChannel('viewerUpdate');
            broadcastChannel.onmessage = (event) => {
                if (event.data.type === 'update') {
                    localStorage.setItem('globalSiteViewers', JSON.stringify(event.data.viewers));
                }
            };

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