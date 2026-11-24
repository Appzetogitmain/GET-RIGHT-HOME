import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    // Don't publish source maps — they expose the full original source.
    sourcemap: false,
  },
  // Production builds drop console.log/info/debug calls, several of which
  // print FCM/app tokens and form data into the browser console.
  // console.warn/error are kept for real error reporting.
  esbuild: mode === 'production'
    ? { pure: ['console.log', 'console.info', 'console.debug'], drop: ['debugger'] }
    : {},
}))
