import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { reloadOnceForStaleChunk } from './utils/chunkReload'

// Vite fires this when a lazy page's file can no longer be fetched (new deploy).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

const isWorkerPath = window.location.pathname.startsWith('/worker');

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
// Dynamic entry selection is especially important in Vite dev mode, where
// every eager source module is a separate browser request.
const { default: App } = await (isWorkerPath
  ? import('./WorkerApp.jsx')
  : import('./App.jsx'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
