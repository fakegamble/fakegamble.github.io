import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, increment, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    // Copy your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Generate a unique ID for this browser tab
const tabId = Date.now().toString(36) + Math.random().toString(36).substr(2);

// Update player count when tab opens
function registerPlayer() {
    const myPresenceRef = ref(db, `presence/${tabId}`);
    const activePlayersRef = ref(db, 'activePlayers');

    // When this tab closes or disconnects
    set(myPresenceRef, true);
    set(ref(db, `.info/connected`), (snapshot) => {
        if (!snapshot.val()) return;

        // Remove presence when tab closes
        myPresenceRef.onDisconnect().remove();
        // Decrease active players when tab closes
        activePlayersRef.onDisconnect().transaction(count => 
            count > 0 ? count - 1 : 0
        );
    });

    // Increment active players
    set(activePlayersRef, increment(1));
}

// Start tracking
registerPlayer(); 