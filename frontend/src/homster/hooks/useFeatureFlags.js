import { useEffect, useState } from 'react';
import { featureFlagService, DEFAULT_FEATURE_FLAGS } from '../services/featureFlagService';
import { useSocket } from '../context/SocketContext';

// One shared copy so every component sees the same flags without refetching.
let current = DEFAULT_FEATURE_FLAGS;
let inflight = null;
const listeners = new Set();

const publish = (flags) => {
  current = flags;
  listeners.forEach((fn) => fn(flags));
};

const refresh = () => {
  if (!inflight) {
    inflight = featureFlagService.getFlags()
      .then(publish)
      .catch(() => { /* keep the last known flags */ })
      .finally(() => { inflight = null; });
  }
  return inflight;
};

/**
 * Admin feature switches for the user / worker apps.
 * Re-fetched on mount, when the tab regains focus, and instantly when the
 * admin flips a switch (socket). The backend still enforces every switch.
 */
const useFeatureFlags = () => {
  const [flags, setFlags] = useState(current);
  const socket = useSocket();

  useEffect(() => {
    listeners.add(setFlags);
    setFlags(current);
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      listeners.delete(setFlags);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (next) => publish({ ...DEFAULT_FEATURE_FLAGS, ...next });
    socket.on('feature-flags:update', onUpdate);
    return () => socket.off('feature-flags:update', onUpdate);
  }, [socket]);

  return flags;
};

export default useFeatureFlags;
