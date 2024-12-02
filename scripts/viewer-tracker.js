(() => {
    function generateViewerId() {
        return 'viewer_' + Math.random().toString(36).substr(2, 9);
    }

    function updateViewerActivity() {
        // Get or create viewer ID
        let viewerId = sessionStorage.getItem('viewerId');
        if (!viewerId) {
            viewerId = generateViewerId();
            sessionStorage.setItem('viewerId', viewerId);
            
            // Increment total views only on first visit
            const totalViews = parseInt(localStorage.getItem('siteTotalViews') || '0');
            localStorage.setItem('siteTotalViews', totalViews + 1);
        }

        // Update viewers list
        const viewers = JSON.parse(localStorage.getItem('siteViewers') || '{}');
        viewers[viewerId] = Date.now();
        localStorage.setItem('siteViewers', JSON.stringify(viewers));
    }

    // Update on page load
    updateViewerActivity();

    // Update periodically
    setInterval(updateViewerActivity, 10000); // Every 10 seconds

    // Update when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateViewerActivity();
        }
    });
})(); 