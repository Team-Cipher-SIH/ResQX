let db;

// 1. Open (or create) the IndexedDB database
const request = indexedDB.open('PWAReportDatabase', 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  // Create an object store named 'pending_reports' with an auto-incrementing key
  if (!db.objectStoreNames.contains('pending_reports')) {
    db.createObjectStore('pending_reports', { keyPath: 'id', autoIncrement: true });
  }
};

request.onsuccess = (event) => {
  db = event.target.result;
  // If online upon load, check for any unsynced offline records immediately
  if (navigator.onLine) {
    syncOfflineReports();
  }
};

request.onerror = (event) => {
  console.error("IndexedDB error:", event.target.errorCode);
};

// 2. Save a report locally when offline
function saveReportOffline(reportData) {
  const transaction = db.transaction(['pending_reports'], 'readwrite');
  const store = transaction.objectStore('pending_reports');
  store.add(reportData);
}

// 3. Flush IndexedDB records to Express backend upon reconnection
async function syncOfflineReports() {
  if (!db) return;

  const transaction = db.transaction(['pending_reports'], 'readwrite');
  const store = transaction.objectStore('pending_reports');
  const getAllRequest = store.getAll();

  getAllRequest.onsuccess = async () => {
    const pendingReports = getAllRequest.result;

    if (pendingReports.length === 0) return;

    try {
      // Clean IndexedDB keys before sending to server
      const sanitizedPayload = pendingReports.map(({ id, ...rest }) => rest);

      const response = await fetch('/api/reports/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedPayload)
      });

      if (response.ok) {
        // Clear IndexedDB queue after successful server sync
        const clearTransaction = db.transaction(['pending_reports'], 'readwrite');
        const clearStore = clearTransaction.objectStore('pending_reports');
        clearStore.clear();

        console.log("Offline reports successfully synced and IndexedDB cleared!");
        if (window.fetchServerReports) window.fetchServerReports();
      }
    } catch (error) {
      console.error("Sync failed, items will remain queued in IndexedDB:", error);
    }
  };
}

// Listen for browser reconnection events
window.addEventListener('online', syncOfflineReports);