import React, { useState, useEffect, useCallback } from 'react'
import { FiX, FiUser, FiActivity, FiRefreshCw, FiPause, FiZap, FiBell, FiTrash2, FiPlus } from 'react-icons/fi'
import MetricsPanel from './MetricsPanel'
import Flamegraph from './Flamegraph'
import { useReplayData } from '../hooks/useReplayData';
import { useWorkflow } from '../context/WorkflowContext';
import { supabase } from '../lib/supabase';

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
  onTraceClick,
  onClearSpan,
  onClose,
  onRestart,
  onPause,
  onScale
}) {
  const { replayMode, replayTimestamp } = useWorkflow();
  const { snapshot, traces, loading } = useReplayData(activeWorkflowId);
  const [activeTab, setActiveTab] = useState('overview')
  const [profileData, setProfileData] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  // Self-fetched data — loaded directly when this panel opens
  const [selfMetrics, setSelfMetrics] = useState({})
  const [selfLogs, setSelfLogs] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Alert Rules state
  const [alertRules, setAlertRules] = useState([])
  const [alertRulesLoading, setAlertRulesLoading] = useState(false)
  const [alertRulesError, setAlertRulesError] = useState(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState({
    metric_name: 'latency_ms',
    condition: 'gt',
    threshold: '',
    severity: 'warning',
    slack_webhook_url: '',
    cooldown_minutes: 15,
  })
  const [addingRule, setAddingRule] = useState(false)

  const fetchAlertRules = useCallback(async () => {
    if (!node?.id || !activeWorkflowId) return
    setAlertRulesLoading(true)
    setAlertRulesError(null)
    try {
      const res = await fetch(`/api/workflows/${activeWorkflowId}/alert-rules?componentId=${encodeURIComponent(node.id)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load rules')
      setAlertRules(json.rules || [])
    } catch (err) {
      setAlertRulesError(err.message)
    } finally {
      setAlertRulesLoading(false)
    }
  }, [node?.id, activeWorkflowId])

  const handleAddRule = async () => {
    if (!newRule.threshold) return
    setAddingRule(true)
    try {
      const res = await fetch(`/api/workflows/${activeWorkflowId}/alert-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRule, component_id: node.id, threshold: Number(newRule.threshold) })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add rule')
      setAlertRules(prev => [json.rule, ...prev])
      setShowAddRule(false)
      setNewRule({ metric_name: 'latency_ms', condition: 'gt', threshold: '', severity: 'warning', slack_webhook_url: '', cooldown_minutes: 15 })
    } catch (err) {
      setAlertRulesError(err.message)
    } finally {
      setAddingRule(false)
    }
  }

  const handleDeleteRule = async (ruleId) => {
    try {
      const res = await fetch(`/api/workflows/${activeWorkflowId}/alert-rules?ruleId=${ruleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete rule')
      setAlertRules(prev => prev.filter(r => r.id !== ruleId))
    } catch (err) {
      setAlertRulesError(err.message)
    }
  }

  // Fetch alert rules when integration tab opens
  useEffect(() => {
    if (activeTab === 'integration') fetchAlertRules()
  }, [activeTab, fetchAlertRules])

  // Fetch metrics and logs for this specific component when it opens
  useEffect(() => {
    if (!node?.id || !activeWorkflowId || replayMode) return
    setIsLoadingData(true)
    Promise.all([
      supabase
        .from('metrics')
        .select('component_id, metric_name, value, created_at, trace_id, instance_id')
        .eq('workflow_id', activeWorkflowId)
        .eq('component_id', node.id)
        .order('created_at', { ascending: true })
        .limit(30),
      supabase
        .from('logs')
        .select('*')
        .eq('workflow_id', activeWorkflowId)
        .eq('component_id', node.id)
        .order('timestamp', { ascending: false })
        .limit(50)
    ]).then(([{ data: mRows }, { data: lRows }]) => {
      setIsLoadingData(false)
      // Group metrics by metric_name
      const grouped = {}
      for (const m of (mRows || [])) {
        if (!grouped[m.metric_name]) grouped[m.metric_name] = []
        grouped[m.metric_name].push(m)
      }
      setSelfMetrics(grouped)
      setSelfLogs(lRows || [])
    }).catch(() => setIsLoadingData(false))
  }, [node?.id, activeWorkflowId, replayMode])

  // Fetch profiles when the profiling tab is active
  useEffect(() => {
    if (activeTab === 'profiling' && node?.id && activeWorkflowId) {
      setIsLoadingProfile(true)
      
      let query = supabase
        .from('profiles')
        .select('profile_data')
        .eq('workflow_id', activeWorkflowId)
        .eq('component_id', node.id)

      if (activeTraceId) {
        query = query.eq('trace_id', activeTraceId)
      }

      query
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
          setIsLoadingProfile(false)
          if (!error && data && data.length > 0) {
            setProfileData(data[0].profile_data)
          } else {
            setProfileData(null)
          }
        })
    }
  }, [activeTab, node?.id, activeWorkflowId, activeTraceId])

  if (!node) return null

  const { data } = node

  // In live mode, use self-fetched data. Prop-based data is fallback for backwards compat.
  const activeLogs = replayMode ? (logsData || []) : (selfLogs.length > 0 ? selfLogs : (logsData || []))
  let realLogs = activeLogs

  // Span-level filter
  if (activeSpanId) {
    realLogs = realLogs.filter(log => log.span_id === activeSpanId)
  } else if (activeTraceId && traceEvents && traceEvents.length > 0) {
    const validSpanIds = new Set(traceEvents.map(e => e.spanId || e.span_id).filter(Boolean))
    if (validSpanIds.size > 0) {
      realLogs = realLogs.filter(log => log.span_id && validSpanIds.has(log.span_id))
    }
  }

  const nodeSnapshot = replayMode
    ? snapshot?.filter(r => r.component_id === node.id) ?? []
    : null;

  const componentMetrics = replayMode 
    ? (nodeSnapshot || []).reduce((acc, row) => {
        if (!acc[row.metric_name]) acc[row.metric_name] = [];
        acc[row.metric_name].push({ created_at: row.timestamp, value: row.value });
        return acc;
      }, {})
    : (Object.keys(selfMetrics).length > 0 ? selfMetrics : (metricsData || {}));

  const latencyData = (componentMetrics.latency_ms     || []).map(m => ({ time: formatMetricTime(m.created_at), value: m.value, trace_id: m.trace_id }))
  const tpsData     = (componentMetrics.throughput_rps || []).map(m => ({ time: formatMetricTime(m.created_at), value: m.value, trace_id: m.trace_id }))
  const cpuData     = (componentMetrics.cpu_percent    || []).map(m => ({ time: formatMetricTime(m.created_at), value: m.value, trace_id: m.trace_id }))
  
  // Group host metrics by instance_id
  const hostMetricsByInstance = {}
  Object.values(componentMetrics).flat().forEach(m => {
    if (!m.instance_id) return
    if (!hostMetricsByInstance[m.instance_id]) hostMetricsByInstance[m.instance_id] = {}
    hostMetricsByInstance[m.instance_id][m.metric_name] = m.value
  })

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
          {replayMode && (
            <div style={{ fontSize: '12px', color: '#fbbf24', marginLeft: '10px' }}>
              Replaying {new Date(replayTimestamp).toLocaleString()} ⏱
            </div>
          )}
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
          <button className={`tab ${activeTab === 'instances' ? 'tab--active' : ''}`} onClick={() => setActiveTab('instances')}>
            Instances
          </button>
          <button className={`tab ${activeTab === 'integration' ? 'tab--active' : ''}`} onClick={() => setActiveTab('integration')}>
            Integration
          </button>
          <button className={`tab ${activeTab === 'profiling' ? 'tab--active' : ''}`} onClick={() => setActiveTab('profiling')}>
            Profiling
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

            <MetricsPanel latencyData={latencyData} tpsData={tpsData} cpuData={cpuData} onTraceClick={onTraceClick} />

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

        {/* Instances Tab */}
        {activeTab === 'instances' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="section-label">Replica Instances</div>
            {Object.keys(node.instances || {}).length === 0 ? (
              <div className="glass-card glass-card--compact" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                No multi-instance telemetry received recently.
              </div>
            ) : (
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 4px' }}>Instance ID</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                      <th style={{ padding: '8px 4px' }}>Latency</th>
                      <th style={{ padding: '8px 4px' }}>CPU</th>
                      <th style={{ padding: '8px 4px' }}>Memory</th>
                      <th style={{ padding: '8px 4px' }}>Disk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(node.instances || {}).map(([instanceId, inst]) => {
                      const hostMetrics = hostMetricsByInstance[instanceId] || {}
                      return (
                        <tr key={instanceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 4px', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{instanceId}</td>
                          <td style={{ padding: '10px 4px' }}>
                            <span className={`status-badge status-badge--${inst.status}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                              <span className={`status-dot status-dot--${inst.status}`} />
                              {inst.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 4px' }}>{inst.latency || '-'}</td>
                          <td style={{ padding: '10px 4px' }}>{hostMetrics.host_cpu_percent ? `${Math.round(hostMetrics.host_cpu_percent)}%` : '-'}</td>
                          <td style={{ padding: '10px 4px' }}>{hostMetrics.host_memory_used_percent ? `${Math.round(hostMetrics.host_memory_used_percent)}%` : '-'}</td>
                          <td style={{ padding: '10px 4px' }}>{hostMetrics.host_disk_used_percent ? `${Math.round(hostMetrics.host_disk_used_percent)}%` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

            {/* ── Alert Rules ─────────────────────────────── */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="section-label" style={{ marginBottom: 0 }}>
                  <FiBell style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Alert Rules
                </div>
                <button
                  className="btn btn--ghost"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => setShowAddRule(v => !v)}
                >
                  <FiPlus style={{ marginRight: '4px' }} />
                  Add Rule
                </button>
              </div>

              {alertRulesError && (
                <div style={{ fontSize: '11px', color: 'var(--status-critical)', marginBottom: '8px', padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                  {alertRulesError}
                </div>
              )}

              {/* Add Rule Form */}
              {showAddRule && (
                <div className="glass-card glass-card--compact" style={{ marginBottom: '12px', border: '1px solid rgba(56,189,248,0.25)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</div>
                      <select
                        className="form-input"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                        value={newRule.metric_name}
                        onChange={e => setNewRule(r => ({ ...r, metric_name: e.target.value }))}
                      >
                        <option value="latency_ms">latency_ms</option>
                        <option value="error_rate">error_rate</option>
                        <option value="cpu_percent">cpu_percent</option>
                        <option value="memory_percent">memory_percent</option>
                        <option value="disk_percent">disk_percent</option>
                        <option value="throughput_rps">throughput_rps</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Condition</div>
                      <select
                        className="form-input"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                        value={newRule.condition}
                        onChange={e => setNewRule(r => ({ ...r, condition: e.target.value }))}
                      >
                        <option value="gt">&gt; Greater than</option>
                        <option value="lt">&lt; Less than</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Threshold</div>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="e.g. 500"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                        value={newRule.threshold}
                        onChange={e => setNewRule(r => ({ ...r, threshold: e.target.value }))}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</div>
                      <select
                        className="form-input"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                        value={newRule.severity}
                        onChange={e => setNewRule(r => ({ ...r, severity: e.target.value }))}
                      >
                        <option value="warning">⚠️ Warning</option>
                        <option value="critical">🚨 Critical</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slack Webhook URL (optional)</div>
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      style={{ fontSize: '12px', padding: '6px 8px', width: '100%', boxSizing: 'border-box' }}
                      value={newRule.slack_webhook_url}
                      onChange={e => setNewRule(r => ({ ...r, slack_webhook_url: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cooldown (minutes)</div>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                        value={newRule.cooldown_minutes}
                        onChange={e => setNewRule(r => ({ ...r, cooldown_minutes: Number(e.target.value) }))}
                      />
                    </div>
                    <button
                      className="btn btn--primary"
                      style={{ fontSize: '12px', padding: '6px 14px', marginTop: '18px' }}
                      onClick={handleAddRule}
                      disabled={addingRule || !newRule.threshold}
                    >
                      {addingRule ? 'Saving…' : 'Save Rule'}
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              {alertRulesLoading ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>Loading rules…</div>
              ) : alertRules.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
                  No alert rules configured. Add one to get notified when this component breaches a threshold.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alertRules.map(rule => (
                    <div key={rule.id} className="glass-card glass-card--compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', border: rule.severity === 'critical' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(251,191,36,0.3)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                          <span style={{ color: rule.severity === 'critical' ? 'var(--status-critical)' : '#f59e0b', marginRight: '6px' }}>
                            {rule.severity === 'critical' ? '🚨' : '⚠️'}
                          </span>
                          {rule.metric_name} {rule.condition === 'gt' ? '>' : '<'} {rule.threshold}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Cooldown: {rule.cooldown_minutes}m
                          {rule.slack_webhook_url && <span style={{ color: '#4ade80', marginLeft: '8px' }}>● Slack</span>}
                          {!rule.slack_webhook_url && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>○ No webhook</span>}
                          {rule.last_fired_at && <span style={{ display: 'block', marginTop: '2px' }}>Last fired: {new Date(rule.last_fired_at).toLocaleString()}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0 }}
                        title="Delete rule"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Profiling Tab */}
        {activeTab === 'profiling' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="section-label">Continuous Profiling (Flamegraph)</div>
            <div className="glass-card glass-card--compact" style={{ padding: '16px' }}>
              {isLoadingProfile ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading profile data...
                </div>
              ) : (
                <Flamegraph profileData={profileData} />
              )}
            </div>
            
            <div className="glass-card glass-card--compact" style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                How to send profiling data
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Send JSON payloads representing call stacks to <code>/api/v1/otel-profiles</code> to render flamegraphs here. 
                {activeTraceId && <span style={{ color: '#fbbf24', display: 'block', marginTop: '6px' }}>Currently filtering for trace ID: {activeTraceId}</span>}
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
