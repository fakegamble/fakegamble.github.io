class ViewCounter {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.lastPing = Date.now();
        this.PING_INTERVAL = 30000; // 30 seconds
        this.INACTIVE_THRESHOLD = 60000; // 1 minute
        
        this.initializeCounter();
        this.startPinging();
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    initializeCounter() {
        // Initialize or get existing sessions from localStorage
        const sessions = JSON.parse(localStorage.getItem('activeSessions')) || {};
        sessions[this.sessionId] = Date.now();
        localStorage.setItem('activeSessions', JSON.stringify(sessions));

        // Add event listener for storage changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'activeSessions') {
                this.updateViewCount();
            }
        });

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

        // Update before page unload
        window.addEventListener('beforeunload', () => {
            this.removeSession();
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
        
        const countElements = document.querySelectorAll('.viewer-count');
        countElements.forEach(element => {
            element.textContent = activeCount;
        });
    }
} 
