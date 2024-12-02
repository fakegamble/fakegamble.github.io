(() => {
    class ViewerTracker {
        constructor() {
            this.deviceId = this.getOrCreateDeviceId();
            this.updateInterval = 1000;
            this.startTracking();
        }

        getOrCreateDeviceId() {
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('deviceId', deviceId);
                
                const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');
                localStorage.setItem('siteTotalViews', totalViews + 1);
            }
            return deviceId;
        }

        updateViewerActivity() {
            try {
                // Get current viewers
                let viewers = {};
                try {
                    viewers = JSON.parse(localStorage.getItem('activeViewers') || '{}');
                } catch (e) {
                    viewers = {};
                }

                // Update timestamp for this device
                viewers[this.deviceId] = Date.now();

                // Save back to localStorage
                localStorage.setItem('activeViewers', JSON.stringify(viewers));
            } catch (error) {
                console.error('Error updating viewer activity:', error);
            }
        }

        startTracking() {
            this.updateViewerActivity();
            setInterval(() => this.updateViewerActivity(), this.updateInterval);

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.updateViewerActivity();
                }
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                const viewers = JSON.parse(localStorage.getItem('activeViewers') || '{}');
                delete viewers[this.deviceId];
                localStorage.setItem('activeViewers', JSON.stringify(viewers));
            });
        }
    }

    new ViewerTracker();
})(); 