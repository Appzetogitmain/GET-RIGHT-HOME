import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast, { useToasterStore } from 'react-hot-toast';

// react-hot-toast stacks every toast it is given, so a few quick taps (e.g. on
// "detect my location") pile up a column of identical messages. Keep only the
// newest visible one. Admin / manager / worker panels are left alone: staff
// there can legitimately get several distinct messages at once.
const UNLIMITED_AREAS = ['/admin', '/manager', '/worker'];

const ToastLimiter = () => {
  const { toasts } = useToasterStore();
  const { pathname } = useLocation();
  const limited = !UNLIMITED_AREAS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!limited) return;
    const visible = toasts.filter((t) => t.visible);
    if (visible.length <= 1) return;
    const newest = visible.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
    visible.forEach((t) => {
      if (t.id !== newest.id) toast.dismiss(t.id);
    });
  }, [toasts, limited]);

  return null;
};

export default ToastLimiter;
