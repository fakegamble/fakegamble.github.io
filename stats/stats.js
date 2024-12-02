class SiteStats {
    constructor() {
        this.viewerCount = document.getElementById('viewerCount');
        this.initializeWebSocket();
    }

    initializeWebSocket() {
        this.ws = new WebSocket('ws://' + window.location.host + '/ws');
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'viewerCount') {
                this.updateViewerCount(data.count);
            }
        };

        this.ws.onclose = () => {
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.initializeWebSocket(), 5000);
        };
    }

    updateViewerCount(count) {
        this.viewerCount.textContent = count;
        // Add animation class
        this.viewerCount.classList.add('update');
        setTimeout(() => this.viewerCount.classList.remove('update'), 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SiteStats();
}); 