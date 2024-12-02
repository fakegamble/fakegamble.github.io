class ViewCounter {
    constructor(displayMode = false) {
        this.sessionId = this.generateSessionId();
        this.lastPing = Date.now();
        this.PING_INTERVAL = 30000; // 30 seconds
        this.INACTIVE_THRESHOLD = 60000; // 1 minute
        this.displayMode = displayMode;
        
        this.initializeCounter();
        this.startPinging();

        // Add storage event listener for cross-tab communication
        window.addEventListener('storage', (e) => {
            if (e.key === 'activeSessions') {
                this.updateViewCount();
            }
        });

        // Add beforeunload event to clean up session
        window.addEventListener('beforeunload', () => {
            this.removeSession();
        });
    }

    initializeCounter() {
        // Initialize or get existing sessions from localStorage
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        sessions[this.sessionId] = Date.now();
        localStorage.setItem('activeSessions', JSON.stringify(sessions));
        this.updateViewCount();
    }

    startPinging() {
        setInterval(() => {
            this.lastPing = Date.now();
            this.updateSession();
        }, this.PING_INTERVAL);

        // Update on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.updateSession();
            }
        });
    }

    updateSession() {
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        sessions[this.sessionId] = Date.now();
        
        // Clean up inactive sessions
        Object.entries(sessions).forEach(([id, lastPing]) => {
            if (Date.now() - lastPing > this.INACTIVE_THRESHOLD) {
                delete sessions[id];
            }
        });

        localStorage.setItem('activeSessions', JSON.stringify(sessions));
        this.updateViewCount();
    }

    removeSession() {
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        delete sessions[this.sessionId];
        localStorage.setItem('activeSessions', JSON.stringify(sessions));
    }

    updateViewCount() {
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        const activeCount = Object.keys(sessions).length;
        
        if (this.displayMode) {
            const countElements = document.querySelectorAll('.viewer-count');
            countElements.forEach(element => {
                element.textContent = activeCount;
            });
        }
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
} 
