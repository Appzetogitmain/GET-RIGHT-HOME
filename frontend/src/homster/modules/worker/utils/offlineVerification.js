// Cached copy of the worker's office (offline) verification state, kept inside
// `workerData` so route guards can redirect without waiting for the network.
export const VERIFICATION_PENDING_PATH = '/worker/verification-pending';

const readWorkerData = () => {
  try {
    return JSON.parse(localStorage.getItem('workerData') || sessionStorage.getItem('workerData') || 'null');
  } catch {
    return null;
  }
};

export const isOfflineVerificationPendingCached = () =>
  readWorkerData()?.offlineVerificationStatus === 'pending';

export const setCachedOfflineVerificationStatus = (status) => {
  try {
    const store = localStorage.getItem('workerData') ? localStorage : (sessionStorage.getItem('workerData') ? sessionStorage : localStorage);
    const data = readWorkerData() || {};
    store.setItem('workerData', JSON.stringify({ ...data, offlineVerificationStatus: status || null }));
  } catch {
    // Storage can be unavailable in restricted webviews; the server still enforces the rule.
  }
};
