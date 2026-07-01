import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Platform Self-Telemetry ────────────────────────────────
// Capture uncaught JS errors and unhandled promise rejections,
// then pipe them to our backend so the dashboard observes itself.
// Fire-and-forget: never retried, never throws.

function sendClientError(payload) {
  try {
    fetch('/api/v1/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {}) // swallow network errors silently
  } catch {
    // Never throw from inside an error handler
  }
}

window.onerror = function (message, source, lineno, colno, error) {
  sendClientError({
    error_class: 'uncaught_exception',
    error_message: String(message).slice(0, 300),
    stack: error?.stack?.slice(0, 500) ?? null,
    route: window.location.pathname,
  })
  return false // don't suppress the browser's default error logging
}

window.onunhandledrejection = function (event) {
  const reason = event.reason
  sendClientError({
    error_class: 'unhandled_rejection',
    error_message: (reason?.message || String(reason)).slice(0, 300),
    stack: reason?.stack?.slice(0, 500) ?? null,
    route: window.location.pathname,
  })
}

