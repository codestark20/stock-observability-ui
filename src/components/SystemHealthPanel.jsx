import { useState, useMemo } from 'react'

export default function SystemHealthPanel({ nodes, onNodeSelect }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null)

  const {
    healthyCount, warningCount, criticalCount, pausedCount,
    overallStatus, avgLatency, totalTps, avgCpu
  } = useMemo(() => {
    const healthy = nodes.filter(n => n.data.status === 'healthy').length
    const warning = nodes.filter(n => n.data.status === 'warning').length
    const critical = nodes.filter(n => n.data.status === 'critical').length
    const paused = nodes.filter(n => n.data.status === 'paused').length

    let status = 'Operational'
    if (critical > 0) status = 'Critical'
    else if (warning > 0) status = 'Degraded'

    const latencies = nodes.map(n => parseInt(n.data.latency, 10) || 0)
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0

    const tpsValues = nodes.map(n => (parseInt(n.data.tps, 10) || 0) * 1000)
    const total = tpsValues.reduce((a, b) => a + b, 0)

    const cpuValues = nodes.map(n => parseInt(n.data.cpu, 10) || 0)
    const cpuAvg = cpuValues.length > 0 ? Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) : 0

    return { healthyCount: healthy, warningCount: warning, criticalCount: critical, pausedCount: paused, overallStatus: status, avgLatency: avg, totalTps: total, avgCpu: cpuAvg }
  }, [nodes])

  const statusColorMap = {
    Operational: 'var(--status-healthy)',
    Degraded: 'var(--status-warning)',
    Critical: 'var(--status-critical)'
  }

  const countCards = [
    { count: healthyCount, label: 'Healthy', color: 'var(--status-healthy)' },
    { count: warningCount, label: 'Warning', color: 'var(--status-warning)' },
    { count: criticalCount, label: 'Critical', color: 'var(--status-critical)' },
    { count: pausedCount, label: 'Paused', color: 'var(--status-paused)' }
  ]

  return (
    <div>
      <div className="health-overall">
        <div className="health-overall-label">System Status</div>
        <div className="health-overall-status" style={{ color: statusColorMap[overallStatus] }}>
          {overallStatus}
        </div>
      </div>

      <div className="health-counts">
        {countCards.map(card => (
          <div className="health-count-card" key={card.label}>
            <div className="health-count-number" style={{ color: card.color }}>{card.count}</div>
            <div className="health-count-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="section-label">Aggregate Metrics</div>

      <div className="agg-metric">
        <span className="agg-metric-label">Avg Latency</span>
        <span className="agg-metric-value">{avgLatency}ms</span>
      </div>
      <div className="agg-metric">
        <span className="agg-metric-label">Total TPS</span>
        <span className="agg-metric-value">{(totalTps / 1000).toFixed(0)}k/sec</span>
      </div>
      <div className="agg-metric">
        <span className="agg-metric-label">Avg CPU</span>
        <span className="agg-metric-value">{avgCpu}%</span>
      </div>

      <div className="divider" />
      <div className="section-label">Components</div>

      <div>
        {nodes.map(node => (
          <div
            key={node.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
              marginBottom: '4px', transition: 'background 150ms',
              background: hoveredNodeId === node.id ? 'rgba(148, 163, 184, 0.06)' : 'transparent'
            }}
            onClick={() => onNodeSelect(node.id)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            <span className={`status-dot status-dot--${node.data.status}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{node.data.label}</div>
              {node.data.manager && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>👤 {node.data.manager}</div>
              )}
            </div>
            {node.data.sla && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{node.data.sla}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
