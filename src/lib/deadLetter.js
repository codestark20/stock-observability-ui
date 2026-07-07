import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Writes a dead-letter record to the ingest_errors table.
 * This function NEVER throws — a DLQ failure must not crash the ingest handler.
 *
 * @param {object} fields
 * @param {string} fields.route - The API route that failed (e.g. 'otel-traces')
 * @param {string} fields.error_class - Classified error string
 * @param {string} [fields.error_message] - Safe error message (no PII)
 * @param {number} [fields.span_count] - Number of items in the failed batch
 * @param {string} [fields.workflow_id] - Workflow ID if known
 * @param {string} [fields.payload_hash] - SHA-256 hex of the raw payload body
 * @param {object} [fields.raw_payload] - The original payload (truncated to ~32KB)
 */
export async function writeDeadLetter(fields) {
  try {
    // Truncate raw_payload to prevent bloating the DLQ table
    let rawPayload = fields.raw_payload || null
    if (rawPayload) {
      const serialized = JSON.stringify(rawPayload)
      if (serialized.length > 32768) {
        rawPayload = { _truncated: true, _size: serialized.length, _preview: serialized.slice(0, 2000) }
      }
    }

    await supabase.from('ingest_errors').insert({
      route: fields.route || 'unknown',
      error_class: fields.error_class || 'unknown',
      error_message: fields.error_message || null,
      span_count: fields.span_count || null,
      workflow_id: fields.workflow_id || null,
      payload_hash: fields.payload_hash || null,
      raw_payload: rawPayload,
    })
  } catch (err) {
    // Silently log — a DLQ write failure must never propagate upward
    console.error('[dead-letter] Failed to write dead-letter record:', err.message)
  }
}

/**
 * Computes a SHA-256 hex digest of any string.
 * Uses the Web Crypto API available in Vercel's Node.js runtime.
 *
 * @param {string} text
 * @returns {Promise<string>} hex string
 */
export async function hashPayload(text) {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(String(text).slice(0, 4096)) // limit to 4KB for hashing
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}
