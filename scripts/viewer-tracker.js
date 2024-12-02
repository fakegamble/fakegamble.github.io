class ViewerTracker {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.initializeWebSocket();
        this.setupPageEvents();
    }

    initializeWebSocket() {
        this.ws = new WebSocket('ws://' + window.location.host + '/ws');
        
        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.sendViewerStatus('connect');
        };

        this.ws.onclose = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.initializeWebSocket(), 5000);
            }
        };
    }

    setupPageEvents() {
        // Send disconnect when page is closed/navigated away from
        window.addEventListener('beforeunload', () => {
            this.sendViewerStatus('disconnect');
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.sendViewerStatus('inactive');
            } else {
                this.sendViewerStatus('active');
            }
        });
    }

    sendViewerStatus(status) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'viewerStatus',
                status: status,
                page: window.location.pathname
            }));
        }
    }
}

// Initialize tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ViewerTracker();
}); 