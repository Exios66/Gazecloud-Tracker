'use strict';

// Constants and configuration
const DB_NAME = 'eyeTrackingDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// All the existing JavaScript code from the script tag, but without the CDATA and script tags
// ... rest of the JavaScript code ...

// Initialize everything when the page loads
window.onload = function() {
  try {
    initDB()
      .then(() => {
        initializeTheme();
        loadSessions();
      })
      .catch(error => {
        logMessage("Error initializing application: " + error.message, 'error');
      });
  } catch (error) {
    console.error("Error in window.onload:", error);
  }
}; 