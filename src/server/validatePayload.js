/**
 * Structural validation for all four OTel pillar types.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 *
 * This is Gate 2 (422) in the sequential validation pipeline.
 */

export function validateTraces(body) {
  const errors = []
  const { resourceSpans } = body || {}

  if (!resourceSpans) {
    errors.push('Missing "resourceSpans" array in request body')
    return { valid: false, errors }
  }
  if (!Array.isArray(resourceSpans)) {
    errors.push('"resourceSpans" must be an array')
    return { valid: false, errors }
  }

  for (let i = 0; i < resourceSpans.length; i++) {
    const rs = resourceSpans[i]
    if (!rs.scopeSpans && !rs.instrumentationLibrarySpans) {
      errors.push(`resourceSpans[${i}]: missing "scopeSpans"`)
    }
    const scopes = rs.scopeSpans || rs.instrumentationLibrarySpans || []
    for (let j = 0; j < scopes.length; j++) {
      const spans = scopes[j].spans || []
      for (let k = 0; k < spans.length; k++) {
        const span = spans[k]
        if (!span.traceId) errors.push(`resourceSpans[${i}].scopeSpans[${j}].spans[${k}]: missing "traceId"`)
        if (!span.spanId) errors.push(`resourceSpans[${i}].scopeSpans[${j}].spans[${k}]: missing "spanId"`)
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true }
}

export function validateMetrics(body) {
  const errors = []
  const { resourceMetrics } = body || {}

  if (!resourceMetrics) {
    errors.push('Missing "resourceMetrics" array in request body')
    return { valid: false, errors }
  }
  if (!Array.isArray(resourceMetrics)) {
    errors.push('"resourceMetrics" must be an array')
    return { valid: false, errors }
  }

  return { valid: true }
}

export function validateLogs(body) {
  const errors = []
  const { resourceLogs } = body || {}

  if (!resourceLogs) {
    errors.push('Missing "resourceLogs" array in request body')
    return { valid: false, errors }
  }
  if (!Array.isArray(resourceLogs)) {
    errors.push('"resourceLogs" must be an array')
    return { valid: false, errors }
  }

  return { valid: true }
}

export function validateProfiles(body) {
  const errors = []
  const { resourceProfiles } = body || {}

  if (!resourceProfiles) {
    errors.push('Missing "resourceProfiles" array in request body')
    return { valid: false, errors }
  }
  if (!Array.isArray(resourceProfiles)) {
    errors.push('"resourceProfiles" must be an array')
    return { valid: false, errors }
  }

  return { valid: true }
}

/**
 * Dispatches to the correct validator based on the pillar type.
 * @param {'traces'|'metrics'|'logs'|'profiles'} pillarType
 * @param {object} body - The request body
 */
export function validatePayload(pillarType, body) {
  switch (pillarType) {
    case 'traces':   return validateTraces(body)
    case 'metrics':  return validateMetrics(body)
    case 'logs':     return validateLogs(body)
    case 'profiles': return validateProfiles(body)
    default:         return { valid: false, errors: [`Unknown pillar type: ${pillarType}`] }
  }
}
