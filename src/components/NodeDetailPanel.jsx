import { useState } from 'react'
import { FiX, FiUser, FiActivity, FiRefreshCw, FiPause, FiZap } from 'react-icons/fi'
import MetricsPanel from './MetricsPanel'

function formatMetricTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// Removed generateLogs function

export default function NodeDetailPanel({
  node,
  activeWorkflowId,
  metricsData,
  logsData,
  activeTraceId,
  traceEvents,
  activeSpanId,
  onClearSpan,
  onClose,
  onRestart,
  onPause,
  onScale
}) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!node) return null

  const { data } = node
  let realLogs = logsData || []

  // Span-level filter: if a specific span is selected in TraceTimelinePanel, show only that span's logs
  if (activeSpanId) {
    realLogs = realLogs.filter(log => log.span_id === activeSpanId)
  } else if (activeTraceId && traceEvents && traceEvents.length > 0) {
    // Trace-level filter: if a trace is active, only show logs whose span_id appears in the trace events
    const validSpanIds = new Set(traceEvents.map(e => e.spanId || e.span_id).filter(Boolean))
    if (validSpanIds.size > 0) {
      realLogs = realLogs.filter(log => log.span_id && validSpanIds.has(log.span_id))
    }
  }

  // Use real metrics if available, otherwise empty
  const componentMetrics = metricsData || {}
  const latencyData = (componentMetrics.latency_ms || []).map(m => ({ time: formatMetricTime(m.created_at), value: m.value }))
  const tpsData = (componentMetrics.throughput_rps || []).map(m => ({ time: formatMetricTime(m.created_at), value: m.value }))
  const cpuData = (componentMetrics.cpu_percent || []).map(m => ({ time: formatMetricTime(m.created_at), value: m.value }))
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
        <button className="close-btn" onClick={onClose} title="Close (Esc)"><FiX /></button>
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
                    <FiUser style={{ marginRight: '4px' }} /> <strong>Manager:</strong> {data.manager}
                  </div>
                )}
                {data.sla && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <FiActivity style={{ marginRight: '4px' }} /> <strong>SLA:</strong> {data.sla}
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

            <MetricsPanel latencyData={latencyData} tpsData={tpsData} cpuData={cpuData} />

            <div className="section-label">Root Cause Analysis</div>
            <div className="glass-card glass-card--compact">
              <div style={{ fontSize: '13px', color: rootCause === 'Healthy' ? 'var(--status-healthy)' : 'var(--status-warning)', lineHeight: 1.5 }}>
                {rootCause}
              </div>
            </div>

            <div className="section-label">Actions</div>
            <div className="controls-group">
              <button className="btn btn--success btn--sm" onClick={onRestart}><FiRefreshCw style={{ marginRight: '4px' }} /> Restart</button>
              <button className="btn btn--ghost btn--sm" onClick={onPause}><FiPause style={{ marginRight: '4px' }} /> Pause</button>
              <button className="btn btn--primary btn--sm" onClick={onScale}><FiZap style={{ marginRight: '4px' }} /> Scale</button>
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

            {/* Span correlation banner — shown when a specific span is selected */}
            {activeSpanId && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px',
                marginBottom: '10px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px'
              }}>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                  🔎 Showing logs for selected span
                </span>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ fontSize: '10px', padding: '3px 8px', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                  onClick={onClearSpan}
                >
                  ← Live
                </button>
              </div>
            )}

            {/* Trace-level filter indicator */}
            {!activeSpanId && activeTraceId && (
              <div style={{
                padding: '6px 10px',
                marginBottom: '10px',
                background: 'rgba(251, 191, 36, 0.06)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                color: '#fbbf24'
              }}>
                ⬡ Trace mode — click a span in the left panel to filter further
              </div>
            )}

            {realLogs.length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                color: 'var(--text-muted)', 
                fontSize: '13px',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-sm)'
              }}>
                {activeSpanId
                  ? 'No logs found for this span. The span may not have emitted any logs.'
                  : activeTraceId
                  ? 'No correlated logs for this trace. Click a span in the left panel to filter.'
                  : 'No real logs collected yet. Send OTel Logs to see them here.'}
              </div>
            ) : (
              realLogs.map((log) => {
                const sType = log.severity_text?.toLowerCase() || 'info'
                const typeClass = sType.includes('err') ? 'error' : sType.includes('warn') ? 'warning' : 'info'
                const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                return (
                  <div key={log.id} className={`log-entry log-entry--${typeClass}`}>
                    <span style={{ opacity: 0.7, marginRight: '8px', fontSize: '10px' }}>[{time}]</span>
                    {log.body}
                    {log.span_id && <span style={{ float: 'right', fontSize: '9px', opacity: 0.4, fontFamily: 'var(--font-mono)' }}>{log.span_id.slice(0, 8)}</span>}
                  </div>
                )
              })
            )}
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
            <div className="section-label">OpenTelemetry Ingestion</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Link your actual servers to this component using standard OpenTelemetry SDKs.
              Our platform acts as a native OTLP Receiver.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Required OTel Attributes</div>
            </div>
            <div className="glass-card glass-card--compact" style={{ background: '#020617', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
              <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`// Set these attributes on your spans:
span.setAttribute('workflow.id', '${activeWorkflowId}');
span.setAttribute('component.id', '${node.id}');
span.setAttribute('entity.id', '<TRACE_KEY>'); // e.g., Order ID`}
              </pre>
            </div>
            <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>📡 Native OTLP Support</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Export your traces to our Vercel endpoint via an OTel Collector. Check the <code>examples/</code> folder in the repository for full Node.js and Python setups!
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
