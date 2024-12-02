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

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    initializeCounter() {
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        sessions[this.sessionId] = Date.now();
        localStorage.setItem('activeSessions', JSON.stringify(sessions));

        if (this.displayMode) {
            window.addEventListener('storage', (e) => {
                if (e.key === 'activeSessions') {
                    this.updateViewCount();
                }
            });
            this.updateViewCount();
        }
    }

    // ... rest of the ViewCounter class remains the same ...
}