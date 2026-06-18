import { useState, useEffect } from 'react'
import { fetchWorkflowAnalytics } from '../lib/api'

export default function AnalyticsDashboard({ workflow, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      if (!workflow) return
      setLoading(true)
      try {
        const stats = await fetchWorkflowAnalytics(workflow.id)
        setData(stats)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [workflow])

  if (!workflow) return null

  return (
    <div className="dashboard-container" style={{ overflowY: 'auto', padding: '24px' }}>
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: '24px' }}>
        <div className="header-brand">
          <div>
            <div className="header-title">{workflow.name}</div>
            <div className="header-subtitle">Historical Analytics</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            Back to Live View
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>Loading analytics...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', marginTop: '40px', color: '#ce3030' }}>Error: {error}</div>
      ) : !data || data.totalEvents === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Data Available</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Send some events via cURL to see historical analytics.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Events</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#e2e8f0' }}>{data.totalEvents}</div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Success Rate</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: data.successRate >= 99 ? '#4ade80' : data.successRate >= 95 ? '#fbbf24' : '#ef4444' }}>
                {data.successRate.toFixed(2)}%
              </div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Avg Latency</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#38bdf8' }}>
                {Math.round(data.averageDuration)}ms
              </div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Critical Failures</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: data.statusBreakdown?.critical > 0 ? '#ef4444' : '#4ade80' }}>
                {data.statusBreakdown?.critical || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            
            {/* Component Breakdown Chart */}
            <div className="glass-card">
              <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                Events by Component
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(data.componentBreakdown || {}).sort((a,b) => b[1] - a[1]).map(([compId, count]) => {
                  const comp = workflow.components.find(c => c.id === compId) || { name: compId }
                  const percentage = (count / data.totalEvents) * 100
                  return (
                    <div key={compId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#e2e8f0' }}>{comp.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: '#38bdf8', borderRadius: '4px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status Breakdown Chart */}
            <div className="glass-card">
              <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                Status Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(data.statusBreakdown || {}).map(([status, count]) => {
                  const percentage = (count / data.totalEvents) * 100
                  const color = status === 'healthy' ? '#4ade80' : status === 'warning' ? '#fbbf24' : '#ef4444'
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <span style={{ color: '#e2e8f0' }}>{status}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '4px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
