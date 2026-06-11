import { Handle, Position } from 'reactflow'
import { useMemo } from 'react'

function generateSparklineData(label, status) {
  const seed = label.length * 7
  const bars = []
  for (let i = 0; i < 10; i++) {
    const base = status === 'critical' ? 60 : status === 'warning' ? 40 : 20
    const variation = ((seed * (i + 1) * 13) % 40)
    bars.push(Math.min(base + variation, 100))
  }
  return bars
}

const statusColors = {
  healthy: 'var(--status-healthy)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',
  paused: 'var(--status-paused)'
}

const handleStyle = {
  background: 'var(--accent-blue)',
  width: 8,
  height: 8,
  border: '2px solid var(--bg-secondary)'
}

export default function DashboardNode({ data }) {
  const status = data.status || 'healthy'
  const sparkline = useMemo(() => generateSparklineData(data.label, status), [data.label, status])

  const nodeClasses = [
    'service-node',
    `service-node--${status}`,
    data.selected ? 'service-node--selected' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={nodeClasses}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />

      <div className="service-node-header">
        <div className="service-node-name">{data.label}</div>
      </div>

      <div className="service-node-status" style={{ color: statusColors[status] }}>
        <span className={`status-dot status-dot--${status}`} />
        {status.toUpperCase()}
      </div>

      {data.manager && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          👤 {data.manager}
        </div>
      )}
      {data.sla && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          📋 SLA: {data.sla}
        </div>
      )}
      {data.linkUsage && (
        <div style={{ fontSize: '10px', color: 'var(--accent-blue)', marginBottom: '8px', opacity: 0.8 }}>
          🔗 {data.linkUsage}
        </div>
      )}

      <div className="service-node-metrics">
        <div className="service-node-metric">
          <span className="service-node-metric-label">Latency</span>
          <span className="service-node-metric-value">{data.latency}</span>
        </div>
        <div className="service-node-metric">
          <span className="service-node-metric-label">TPS</span>
          <span className="service-node-metric-value">{data.tps}</span>
        </div>
        <div className="service-node-metric">
          <span className="service-node-metric-label">CPU</span>
          <span className="service-node-metric-value">{data.cpu}</span>
        </div>
      </div>

      <div className="service-node-sparkline">
        {sparkline.map((h, i) => (
          <div
            key={i}
            className="sparkline-bar"
            style={{
              height: `${h}%`,
              background: statusColors[status],
              opacity: 0.4 + (i / sparkline.length) * 0.6
            }}
          />
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />
    </div>
  )
}
