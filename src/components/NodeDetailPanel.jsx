import { useState } from 'react'
import MetricsPanel from './MetricsPanel'

function generateChartData(label, status) {
  const seed = label.length * 11
  const latencyData = []
  const tpsData = []
  for (let i = 0; i < 20; i++) {
    const base = status === 'critical' ? 150 : status === 'warning' ? 80 : 20
    const latVal = base + ((seed * (i + 3) * 17) % 60) - 20
    const tpsVal = 20000 + ((seed * (i + 1) * 23) % 15000)
    latencyData.push({ time: `${i}s`, value: Math.max(5, latVal) })
    tpsData.push({ time: `${i}s`, value: tpsVal })
  }
  return { latencyData, tpsData }
}

function generateLogs(label, status) {
  if (status === 'critical') {
    return [
      { text: `ERROR: ${label} — connection timeout after 5000ms`, type: 'error' },
      { text: `ERROR: ${label} — SLA breach detected`, type: 'error' },
      { text: `WARNING: ${label} — memory utilization spike`, type: 'warning' },
      { text: `INFO: ${label} — failover initiated`, type: 'info' }
    ]
  }
  if (status === 'warning') {
    return [
      { text: `WARNING: ${label} — latency increased 3x`, type: 'warning' },
      { text: `WARNING: ${label} — upstream dependency delayed`, type: 'warning' },
      { text: `INFO: ${label} — circuit breaker triggered`, type: 'info' }
    ]
  }
  if (status === 'paused') {
    return [
      { text: `INFO: ${label} — service paused by operator`, type: 'info' },
      { text: `INFO: ${label} — draining active connections`, type: 'info' }
    ]
  }
  return [
    { text: `INFO: ${label} — all systems nominal`, type: 'info' },
    { text: `INFO: ${label} — health check passed`, type: 'info' }
  ]
}

export default function NodeDetailPanel({
  node,
  onClose,
  onRestart,
  onPause,
  onScale
}) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!node) return null

  const { data } = node
  const logs = generateLogs(data.label, data.status)
  const { latencyData, tpsData } = generateChartData(data.label, data.status)
  const rootCause = data.status === 'critical'
    ? `${data.label} experiencing cascading failure — SLA breach`
    : data.status === 'warning'
    ? `${data.label} degraded — upstream dependency issue`
    : 'Healthy'

  const statusColors = {
    healthy: 'var(--status-healthy)',
    warning: 'var(--status-warning)',
    critical: 'var(--status-critical)',
    paused: 'var(--status-paused)'
  }

  return (
    <div className="panel panel--right">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {data.label}
          </span>
          <span
            className={`status-badge status-badge--${data.status}`}
            style={{ fontSize: '10px', padding: '3px 8px' }}
          >
            <span className={`status-dot status-dot--${data.status}`} />
            {data.status}
          </span>
        </div>
        <button className="close-btn" onClick={onClose} title="Close (Esc)">✕</button>
      </div>

      <div className="panel-body">
        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'tab--active' : ''}`} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button className={`tab ${activeTab === 'logs' ? 'tab--active' : ''}`} onClick={() => setActiveTab('logs')}>
            Logs
          </button>
          <button className={`tab ${activeTab === 'deps' ? 'tab--active' : ''}`} onClick={() => setActiveTab('deps')}>
            Info
          </button>
          <button className={`tab ${activeTab === 'integration' ? 'tab--active' : ''}`} onClick={() => setActiveTab('integration')}>
            Integration
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Manager & SLA */}
            {(data.manager || data.sla) && (
              <div className="glass-card glass-card--compact" style={{ marginBottom: '12px' }}>
                {data.manager && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    👤 <strong>Manager:</strong> {data.manager}
                  </div>
                )}
                {data.sla && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    📋 <strong>SLA:</strong> {data.sla}
                  </div>
                )}
              </div>
            )}

            {/* Metric Cards */}
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Latency</div>
                <div className={`metric-value ${
                  parseInt(data.latency) > 100 ? 'metric-value--critical' :
                  parseInt(data.latency) > 50 ? 'metric-value--warning' :
                  'metric-value--accent'
                }`}>{data.latency}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Throughput</div>
                <div className="metric-value metric-value--accent">{data.tps}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">CPU Usage</div>
                <div className={`metric-value ${
                  parseInt(data.cpu) > 80 ? 'metric-value--critical' :
                  parseInt(data.cpu) > 60 ? 'metric-value--warning' :
                  'metric-value--healthy'
                }`}>{data.cpu}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Status</div>
                <div className="metric-value" style={{ color: statusColors[data.status], fontSize: '16px' }}>
                  {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                </div>
              </div>
            </div>

            <MetricsPanel latencyData={latencyData} tpsData={tpsData} />

            <div className="section-label">Root Cause Analysis</div>
            <div className="glass-card glass-card--compact">
              <div style={{ fontSize: '13px', color: rootCause === 'Healthy' ? 'var(--status-healthy)' : 'var(--status-warning)', lineHeight: 1.5 }}>
                {rootCause}
              </div>
            </div>

            <div className="section-label">Actions</div>
            <div className="controls-group">
              <button className="btn btn--success btn--sm" onClick={onRestart}>↻ Restart</button>
              <button className="btn btn--ghost btn--sm" onClick={onPause}>⏸ Pause</button>
              <button className="btn btn--primary btn--sm" onClick={onScale}>⚡ Scale</button>
            </div>
            <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span className="kbd">R</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '20px' }}>Restart</span>
              <span className="kbd">Esc</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '20px' }}>Close</span>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {logs.map((log, idx) => (
              <div key={idx} className={`log-entry log-entry--${log.type}`}>{log.text}</div>
            ))}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'deps' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="section-label">Component Configuration</div>
            <div className="glass-card glass-card--compact">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <strong>Component ID:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{data.label.toLowerCase().replace(/\s+/g, '_')}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong>Common Link Usage:</strong><br/>
                <span style={{ color: 'var(--text-primary)' }}>{data.linkUsage || 'Not specified'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Integration Tab */}
        {activeTab === 'integration' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="section-label">Real-Time Data Ingestion</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Link your actual servers to this component by pushing events to our ingestion API. 
              When your service completes a task, send a webhook containing the specific entity ID (e.g., Order ID) to track it live on this dashboard.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>cURL Example</div>
              <button 
                className="btn btn--ghost btn--sm"
                style={{ fontSize: '10px', padding: '2px 8px' }}
                onClick={() => {
                  const snippet = `curl -X POST ${window.location.origin}/api/v1/events -H "Content-Type: application/json" -d "{\\"component_id\\": \\"${node.id}\\", \\"entity_id\\": \\"ORD-12345\\", \\"status\\": \\"healthy\\", \\"duration_ms\\": 145, \\"message\\": \\"Processed successfully\\"}"`
                  navigator.clipboard.writeText(snippet)
                    .then(() => alert('Copied to clipboard!'))
                    .catch(() => alert('Copy failed — please select and copy manually'))
                }}
              >📋 Copy</button>
            </div>
            <div className="glass-card glass-card--compact" style={{ background: '#020617', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
              <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`curl -X POST ${window.location.origin}/api/v1/events -H "Content-Type: application/json" -d "{\\"component_id\\": \\"${node.id}\\", \\"entity_id\\": \\"ORD-12345\\", \\"status\\": \\"healthy\\", \\"duration_ms\\": 145, \\"message\\": \\"Processed successfully\\"}"`}
              </pre>
            </div>
            <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600, marginBottom: '4px' }}>✅ This is a REAL endpoint</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Run this cURL command from any terminal and the event will appear on your dashboard in real-time via Supabase Realtime.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <button className="btn btn--ghost" onClick={onClose} style={{ width: '100%' }}>Close Details</button>
      </div>
    </div>
  )
}
