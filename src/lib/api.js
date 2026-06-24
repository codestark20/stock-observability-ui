// Centralized API client for backend communication
// Falls back to localStorage when API is unavailable

const API_BASE = '/api'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  }
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }

  const res = await fetch(url, config)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API Error: ${res.status}`)
  }
  return res.json()
}

// ── Workflow CRUD ─────────────────────────────────────────

export async function fetchWorkflows() {
  return request('/workflows')
}

export async function fetchWorkflow(id) {
  return request(`/workflows/${id}`)
}

export async function createWorkflowAPI(workflow) {
  return request('/workflows', { method: 'POST', body: workflow })
}

export async function updateWorkflowAPI(id, data) {
  return request(`/workflows/${id}`, { method: 'PUT', body: data })
}

export async function deleteWorkflowAPI(id) {
  return request(`/workflows/${id}`, { method: 'DELETE' })
}

export async function duplicateWorkflowAPI(id) {
  return request(`/workflows/${id}/duplicate`, { method: 'POST' })
}

// ── Events & Traces ──────────────────────────────────────

export async function fetchWorkflowEvents(workflowId) {
  return request(`/workflows/${workflowId}/events`)
}

export async function fetchEntityTrace(workflowId, entityId) {
  return request(`/workflows/${workflowId}/trace/${encodeURIComponent(entityId)}`)
}

export async function fetchWorkflowAnalytics(workflowId) {
  return request(`/workflows/${workflowId}/analytics`)
}

export async function ingestEvent(eventData) {
  return request('/v1/events', { method: 'POST', body: eventData })
}

export async function fetchFunnel(workflowId, since = null) {
  const params = since ? `?since=${encodeURIComponent(since)}` : ''
  return request(`/workflows/${workflowId}/funnel${params}`)
}
