/**
 * Classifies Supabase/PostgREST errors into structured error classes.
 * Import this in every API route that touches Supabase.
 *
 * @param {object} error - The error object from a Supabase client call
 * @returns {{ status: number, error_class: string, message: string }}
 */
export function classifySupabaseError(error) {
  if (!error) {
    return {
      status: 500,
      error_class: 'supabase_unknown',
      message: 'An unknown database error occurred.',
    }
  }

  const code = error.code || ''
  const msg = (error.message || '').toLowerCase()

  // RLS / permission denied
  if (code === '42501' || msg.includes('permission denied') || msg.includes('row-level security')) {
    return {
      status: 403,
      error_class: 'supabase_rls_rejection',
      message: 'Access denied by database security policy.',
    }
  }

  // Uniqueness constraint violation
  if (code === '23505') {
    return {
      status: 409,
      error_class: 'supabase_constraint_violation',
      message: 'A record with this identifier already exists.',
    }
  }

  // Foreign key violation
  if (code === '23503') {
    return {
      status: 422,
      error_class: 'supabase_foreign_key_violation',
      message: 'Referenced record does not exist.',
    }
  }

  // Query timeout
  if (code === '57014') {
    return {
      status: 504,
      error_class: 'supabase_timeout',
      message: 'Database query timed out.',
    }
  }

  // Network-level failure (no Postgres code, connection error)
  if (!code && (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('network'))) {
    return {
      status: 503,
      error_class: 'supabase_connection_failure',
      message: 'Could not reach the database. Please try again.',
    }
  }

  // Generic fallback
  return {
    status: 500,
    error_class: 'supabase_unknown',
    message: 'An unexpected database error occurred.',
  }
}
