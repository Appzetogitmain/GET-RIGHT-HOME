import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Fail-safe sync that leans on the socket instead of hammering the API.
 *
 * - Socket connected: live events do the real work, so this only runs once on
 *   (re)connect, on the given window events, and as a slow safety sync.
 * - Socket down: falls back to a faster poll so nothing is missed.
 * - Tab hidden: never polls; catches up as soon as the tab is visible again.
 */
export default function useSocketAwarePoll(
  callback,
  { events = [], connectedMs = 60000, fallbackMs = 10000 } = {}
) {
  const socket = useSocket();
  const [connected, setConnected] = useState(!!socket?.connected);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return undefined;
    }
    const onUp = () => setConnected(true);
    const onDown = () => setConnected(false);
    setConnected(!!socket.connected);
    socket.on('connect', onUp);
    socket.on('disconnect', onDown);
    return () => {
      socket.off('connect', onUp);
      socket.off('disconnect', onDown);
    };
  }, [socket]);

  const eventKey = events.join('|');

  useEffect(() => {
    const run = () => {
      if (document.hidden) return;
      cbRef.current();
    };

    run(); // initial load, and catch-up whenever the connection state changes
    const timer = setInterval(run, connected ? connectedMs : fallbackMs);
    const names = ['focus', 'online', ...(eventKey ? eventKey.split('|') : [])];
    names.forEach((n) => window.addEventListener(n, run));
    document.addEventListener('visibilitychange', run);

    return () => {
      clearInterval(timer);
      names.forEach((n) => window.removeEventListener(n, run));
      document.removeEventListener('visibilitychange', run);
    };
  }, [connected, connectedMs, fallbackMs, eventKey]);
}
