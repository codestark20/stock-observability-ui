/**
 * fetchWithRetry — A resilient replacement for raw fetch().
 *
 * Retries on 5xx errors and network failures with exponential backoff.
 * Throws a structured error object on 4xx or exhausted retries.
 *
 * @param {string} url
 * @param {RequestInit} options - Native fetch options
 * @param {{ maxAttempts?: number, baseDelayMs?: number, maxDelayMs?: number }} retryOptions
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 4000 } = retryOptions

  let lastError = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startTime = Date.now()

    try {
      const res = await fetch(url, options)
      const duration_ms = Date.now() - startTime

      // Success — return immediately
      if (res.ok) return res

      // 4xx — do NOT retry, classify and throw immediately
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}))
        const message = classify4xx(res.status, body)
        const err = new Error(message)
        err.status = res.status
        err.error_class = `http_${res.status}`
        err.message = message
        err.duration_ms = duration_ms
        throw err
      }

      // 5xx — schedule retry
      lastError = new Error(`Server error: ${res.status}`)
      lastError.status = res.status
      lastError.error_class = `http_${res.status}`

    } catch (err) {
      // Re-throw 4xx errors immediately (they have a .status set < 500)
      if (err.status && err.status >= 400 && err.status < 500) throw err

      // Network / CORS / parse error on last attempt
      lastError = err
      lastError.error_class = lastError.error_class || 'network_error'
    }

    // Backoff before retry (skip delay on last attempt)
    if (attempt < maxAttempts - 1) {
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
      console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed. Retrying in ${delay}ms…`, lastError?.message)
      await sleep(delay)
    }
  }

  // All attempts exhausted
  const err = new Error('Max retries exceeded. Please check your connection and try again.')
  err.status = lastError?.status || 0
  err.error_class = 'max_retries_exceeded'
  err.duration_ms = null
  throw err
}

function classify4xx(status, body) {
  const serverMsg = body?.error || body?.message || null
  switch (status) {
    case 401: return 'Session expired — please reload the page.'
    case 403: return 'You do not have permission to perform this action.'
    case 404: return serverMsg || 'Resource not found.'
    case 409: return serverMsg || 'A conflict occurred — this record may already exist.'
    case 422: return 'Invalid request — check your OTel Collector attribute configuration.'
    case 429: return 'Rate limit hit — please reduce your send frequency.'
    default:  return serverMsg || `Request error (${status}).`
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
