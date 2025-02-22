'use strict';

// Constants and configuration
const DB_NAME = 'eyeTrackingDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// Configuration constants
const CONFIG = {
    SMOOTHING_WINDOW: 3,
    MIN_CONFIDENCE: 0.5,
    CALIBRATION_TIMEOUT: 30000,
    RECOVERY_DELAY: 2000,
    MAX_RECOVERY_ATTEMPTS: 3,
    MAX_RECORDED_POINTS: 10000,
    UPDATE_INTERVAL: 50
};

// State variables
let tracking = false;
let isCalibrating = false;
let dataCollectionReady = false;
let lastUpdate = 0;
let calibrationAttempts = 0;
let recordedData = [];
let lastValidData = null;

// Initialize GazeCloud API
function initializeGazeCloudAPI() {
    if (typeof GazeCloudAPI === 'undefined') {
        logMessage("GazeCloud API not found", 'error');
        return false;
    }

    try {
        // Configure GazeCloud API
        GazeCloudAPI.APIKey = ""; // Empty for demo key
        GazeCloudAPI.UseClickRecalibration = true;
        GazeCloudAPI.ShowVideo = true;
        GazeCloudAPI.Protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        // Set up callbacks
        GazeCloudAPI.OnCalibrationComplete = function() {
            logMessage("✅ Calibration completed!", 'success');
            isCalibrating = false;
            tracking = true;
            dataCollectionReady = true;
            calibrationAttempts = 0;
            updateUIState(true);
        };

        GazeCloudAPI.OnCalibrationFail = function() {
            logMessage("❌ Calibration failed", 'error');
            handleCalibrationFailure();
        };

        GazeCloudAPI.OnCamDenied = function() {
            logMessage("❌ Camera access denied", 'error');
            handleError('CAMERA_DENIED');
        };

        GazeCloudAPI.OnError = function(error) {
            logMessage("❌ API Error: " + error, 'error');
            handleError('API_ERROR', error);
        };

        GazeCloudAPI.OnResult = function(gazeData) {
            handleGazeData(gazeData);
        };

        return true;
    } catch (error) {
        logMessage("Error initializing GazeCloud API: " + error.message, 'error');
        return false;
    }
}

// Start eye tracking
async function startTracking() {
    try {
        if (tracking) {
            stopTracking();
            return;
        }

        if (calibrationAttempts >= CONFIG.MAX_RECOVERY_ATTEMPTS) {
            logMessage("Too many calibration attempts. Please refresh the page.", 'error');
            return;
        }

        resetDataStructures();
        
        if (!initializeGazeCloudAPI()) {
            throw new Error("Failed to initialize GazeCloud API");
        }

        logMessage("Starting eye tracking...", 'info');
        GazeCloudAPI.StartEyeTracking();
        isCalibrating = true;
        calibrationAttempts++;
        
    } catch (error) {
        logMessage("Error starting tracking: " + error.message, 'error');
        handleError('INITIALIZATION_ERROR', error);
    }
}

// Stop eye tracking
function stopTracking() {
    try {
        if (!tracking && !isCalibrating) return;
        
        GazeCloudAPI.StopEyeTracking();
        tracking = false;
        isCalibrating = false;
        dataCollectionReady = false;
        
        if (recordedData.length > 0) {
            saveSessionToDB(recordedData)
                .then(() => loadSessions())
                .catch(error => logMessage("Error saving session: " + error.message, 'error'));
        }
        
        resetDataStructures();
        updateUIState(false);
        
    } catch (error) {
        logMessage("Error stopping tracking: " + error.message, 'error');
    }
}

// Handle gaze data
function handleGazeData(gazeData) {
    if (!tracking || !dataCollectionReady) return;

    const now = Date.now();
    if (now - lastUpdate < CONFIG.UPDATE_INTERVAL) return;
    lastUpdate = now;

    const processedData = {
        timestamp: now,
        x: gazeData.docX,
        y: gazeData.docY,
        state: gazeData.state,
        confidence: gazeData.confidence,
        pupilD: gazeData.pupilD,
        HeadX: gazeData.HeadX,
        HeadY: gazeData.HeadY,
        HeadZ: gazeData.HeadZ,
        HeadYaw: gazeData.HeadYaw,
        HeadPitch: gazeData.HeadPitch,
        HeadRoll: gazeData.HeadRoll
    };

    recordedData.push(processedData);
    updateLiveData(processedData);

    if (recordedData.length > CONFIG.MAX_RECORDED_POINTS) {
        recordedData = recordedData.slice(-CONFIG.MAX_RECORDED_POINTS);
        logMessage("Trimming recorded data to prevent memory issues", 'warning');
    }

    if (recordedData.length % 10 === 0) {
        updateCharts();
    }
}

// Database initialization
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = event => {
            logMessage("Database error: " + event.target.error, 'error');
            reject(event.target.error);
        };
        
        request.onsuccess = event => {
            window.db = event.target.result;
            logMessage("Database initialized successfully", 'success');
            resolve(window.db);
        };
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('duration', 'duration', { unique: false });
                logMessage("Database structure created", 'info');
            }
        };
    });
}

// Save session to database
function saveSessionToDB(sessionData) {
    return new Promise((resolve, reject) => {
        if (!window.db) {
            reject(new Error("Database not initialized"));
            return;
        }

        const transaction = window.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const session = {
            timestamp: new Date().toISOString(),
            duration: sessionData.length > 0 ? 
                (sessionData[sessionData.length - 1].timestamp - sessionData[0].timestamp) / 1000 : 0,
            dataPoints: sessionData.length,
            averageConfidence: mean(sessionData.map(d => d.confidence || 0)),
            data: sessionData
        };

        const request = store.add(session);
        
        request.onsuccess = () => {
            logMessage(`Session saved (${session.dataPoints} points)`, 'success');
            resolve(request.result);
        };
        
        request.onerror = () => {
            logMessage("Error saving session", 'error');
            reject(request.error);
        };
    });
}

// Load sessions from database
function loadSessions() {
    if (!window.db) return;

    const transaction = window.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        updateSessionsList(request.result);
    };

    request.onerror = () => {
        logMessage("Error loading sessions", 'error');
    };
}

// Utility functions
function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function updateUIState(isRecording) {
    const startBtn = document.querySelector('button[onclick="startTracking()"]');
    const stopBtn = document.querySelector('button[onclick="stopTracking()"]');
    const exportBtn = document.querySelector('button[onclick="exportCSV()"]');
    const clearBtn = document.querySelector('button[onclick="clearData()"]');
    
    if (startBtn) startBtn.disabled = isRecording;
    if (stopBtn) stopBtn.disabled = !isRecording;
    if (exportBtn) exportBtn.disabled = !recordedData.length;
    if (clearBtn) clearBtn.disabled = !recordedData.length;
}

function logMessage(message, level = 'info') {
    const logDiv = document.getElementById("debugLog");
    if (!logDiv) return;

    const timestamp = new Date().toLocaleTimeString();
    const logLevels = {
        error: '🔴',
        warning: '🟡',
        success: '🟢',
        info: 'ℹ️'
    };
    
    logDiv.textContent += `[${timestamp}] ${logLevels[level] || 'ℹ️'} ${message}\n`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function resetDataStructures() {
    recordedData = [];
    tracking = false;
    isCalibrating = false;
    lastUpdate = 0;
    lastValidData = null;
    
    document.getElementById("liveData").innerHTML = "<em>Live gaze data will appear here...</em>";
    updateUIState(false);
}

// Initialize when the page loads
window.addEventListener('load', async () => {
    try {
        await initDB();
        loadSessions();
        logMessage("Application initialized successfully", 'success');
    } catch (error) {
        logMessage("Error initializing application: " + error.message, 'error');
    }
}); 