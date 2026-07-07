import { classifySupabaseError } from '../lib/supabaseErrorHandler.js'
import { writeDeadLetter, hashPayload } from '../lib/deadLetter.js'

/**
 * Hybrid batch insert utility.
 *
 * Strategy: Try bulk insert first (fast path). If the bulk fails,
 * fall back to per-item inserts and collect individual results.
 * Returns a per-item status array suitable for HTTP 207 responses.
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} table - Table name ('events', 'metrics', 'logs', 'profiles')
 * @param {object[]} rows - Array of row objects to insert
 * @param {object} dlqContext - Context for dead-letter writes
 * @param {string} dlqContext.route - Route name (e.g. 'otel-traces')
 * @param {string} [dlqContext.workflow_id] - Workflow ID if known
 * @param {object} [dlqContext.raw_payload] - Original request body for DLQ
 * @returns {{ status: number, body: object }}
 *   - 200: all succeeded (bulk path)
 *   - 207: partial success (per-item fallback)
 *   - 503/500: all failed
 */
export async function batchInsert(supabase, table, rows, dlqContext) {
  if (rows.length === 0) {
    return { status: 200, body: { ok: true, inserted: 0 } }
  }

  // ── Fast path: bulk insert ────────────────────────────────
  const { error: bulkError } = await supabase.from(table).insert(rows)

  if (!bulkError) {
    return { status: 200, body: { ok: true, inserted: rows.length } }
  }

  // ── Slow path: per-item fallback ──────────────────────────
  console.warn(`[${dlqContext.route}] Bulk insert failed (${bulkError.message}), falling back to per-item inserts`)

  const results = []
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const { error: itemError } = await supabase.from(table).insert(rows[i])

    if (itemError) {
      const classified = classifySupabaseError(itemError)
      results.push({ index: i, ok: false, error: classified.error_class })
      failed++

      // DLQ each failed item individually
      const itemHash = await hashPayload(JSON.stringify(rows[i]))
      writeDeadLetter({
        route: dlqContext.route,
        error_class: classified.error_class,
        error_message: classified.message,
        span_count: 1,
        workflow_id: dlqContext.workflow_id || rows[i].workflow_id || null,
        payload_hash: itemHash,
        raw_payload: rows[i],
      })
    } else {
      results.push({ index: i, ok: true })
      succeeded++
    }
  }

  // All failed → 503
  if (succeeded === 0) {
    return {
      status: 503,
      body: { error: 'All items failed to insert', results, succeeded: 0, failed }
    }
  }

  // Partial success → 207
  return {
    status: 207,
    body: { status: 207, results, succeeded, failed }
  }
}
