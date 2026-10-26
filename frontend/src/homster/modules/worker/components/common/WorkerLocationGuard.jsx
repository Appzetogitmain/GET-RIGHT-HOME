import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMapPin, FiRefreshCw, FiSettings } from 'react-icons/fi';
import flutterBridge from '../../../../utils/flutterBridge';

const CHECK_EVERY_MS = 15000;

/**
 * Shown over the worker app whenever the phone's location is off or blocked.
 * Without location the worker can't be matched to nearby jobs and customers can't
 * track them, so it keeps asking until it is switched on (re-checks by itself when
 * the worker comes back from settings).
 *
 * state: null = fine / not known yet, 'denied' = permission blocked for the app,
 *        'off' = device location (GPS) switched off.
 */
export default function WorkerLocationGuard() {
  const [problem, setProblem] = useState(null);
  const [checking, setChecking] = useState(false);
  const busyRef = useRef(false);

  const check = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await flutterBridge.getCurrentLocation();
      setProblem(null);
    } catch (err) {
      // 1 = permission denied, 2 = position unavailable (device location off).
      // 3 (timeout) or anything else is a weak signal, not "location is off".
      if (err?.code === 1) setProblem('denied');
      else if (err?.code === 2) setProblem('off');
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(check, 1500); // let the native webview finish loading
    const timer = setInterval(() => { if (!document.hidden) check(); }, CHECK_EVERY_MS);
    const onVisible = () => { if (!document.hidden) check(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    let permission;
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((p) => {
        permission = p;
        p.onchange = check;
      }).catch(() => {});
    }

    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      if (permission) permission.onchange = null;
    };
  }, [check]);

  if (!problem) return null;

  const retry = async () => {
    setChecking(true);
    await check();
    setChecking(false);
  };

  const openSettings = async () => {
    try { await flutterBridge.openAppSettings(); } catch { /* not inside the app: the steps below apply */ }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 text-center shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <FiMapPin className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-900">
          {problem === 'denied' ? 'Allow location access' : 'Turn on your device location'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          {problem === 'denied'
            ? 'Location permission is blocked for this app. Allow it in your phone settings to receive jobs near you.'
            : 'Your phone\'s location is switched off. Turn it on to receive nearby jobs and let customers track you.'}
        </p>

        <ol className="mx-auto mt-4 max-w-[17rem] list-decimal space-y-1 pl-5 text-left text-xs text-gray-500">
          {problem === 'denied' ? (
            <>
              <li>Open <b>Settings</b> for this app</li>
              <li>Go to <b>Permissions → Location</b></li>
              <li>Choose <b>Allow</b>, then come back</li>
            </>
          ) : (
            <>
              <li>Swipe down from the top of your screen</li>
              <li>Tap the <b>Location</b> icon to turn it on</li>
              <li>Come back to this app</li>
            </>
          )}
        </ol>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={retry}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
          >
            <FiRefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : "I've turned it on"}
          </button>
          <button
            type="button"
            onClick={openSettings}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition active:scale-95"
          >
            <FiSettings className="h-4 w-4" /> Open settings
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
