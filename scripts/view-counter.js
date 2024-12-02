class ViewCounter {
    constructor(displayMode = false) {
        this.sessionId = this.generateSessionId();
        this.lastPing = Date.now();
        this.PING_INTERVAL = 30000; // 30 seconds
        this.INACTIVE_THRESHOLD = 60000; // 1 minute
        this.displayMode = displayMode;
        
        this.initializeCounter();
        this.startPinging();
    }

    // ... existing code ...

    updateViewCount() {
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        const activeCount = Object.keys(sessions).length;
        
        // Only update DOM if in display mode
        if (this.displayMode) {
            const countElements = document.querySelectorAll('.viewer-count');
            countElements.forEach(element => {
                element.textContent = activeCount;
            });
        }
    }
} 