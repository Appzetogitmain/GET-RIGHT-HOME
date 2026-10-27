import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { reloadOnceForStaleChunk } from './utils/chunkReload'

// Vite fires this when a lazy page's file can no longer be fetched (new deploy).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

const isWorkerPath =
  window.location.pathname.startsWith('/worker') ||
  window.location.hash.startsWith('#/worker');

// Razorpay creates additional frames, network calls and risk-detection work as
// soon as its SDK loads. Worker screens do not need it globally (the worker
// subscription page loads it on demand), so keep it completely off their
// critical path. Marketplace payment flows retain the previous global SDK.
if (!isWorkerPath) {
  const paymentScript = document.createElement('script');
  paymentScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
  paymentScript.async = true;
  document.head.appendChild(paymentScript);
}

// Keep the worker app out of the very large marketplace/admin module graph.
// Use standard React.lazy + Suspense instead of top-level await so mobile WebViews
// and older mobile browsers (which don't support top-level await) load reliably without a blank screen.
const WorkerApp = lazy(() => import('./WorkerApp.jsx'));
const MainApp = lazy(() => import('./App.jsx'));

const RootApp = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
      </div>
    }
  >
    {isWorkerPath ? <WorkerApp /> : <MainApp />}
  </Suspense>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)

