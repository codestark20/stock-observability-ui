import { useMemo } from 'react'
import { FiAlertTriangle, FiX, FiZap } from 'react-icons/fi'

export default function ImpactSummaryPanel({ 
  sourceNode, 
  blastRadiusIds, 
  allComponents, 
  edges,
  onClose 
}) {
  const sourceComp = allComponents.find(c => c.id === sourceNode?.id)
  
  const atRiskComponents = useMemo(() => {
    if (!blastRadiusIds?.size) return []
    return allComponents.filter(c => blastRadiusIds.has(c.id))
  }, [allComponents, blastRadiusIds])

  const totalComponents = allComponents.length
  const atRiskCount = atRiskComponents.length
  const blastPercent = totalComponents > 0 ? Math.round((atRiskCount / totalComponents) * 100) : 0

  return (
    <div className="impact-summary-panel">
      {/* Header */}
      <div className="impact-summary-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>💥</span>
          <span className="impact-summary-title">Blast Radius</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          title="Exit Impact Mode"
        >
          <FiX size={16} />
        </button>
      </div>

      {/* Failing Source */}
      <div className="impact-source-card">
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          Failing Component
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="status-dot status-dot--critical" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>
            {sourceComp?.name || sourceNode?.id || '—'}
          </span>
        </div>
        {sourceComp?.manager && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            👤 Owner: {sourceComp.manager}
          </div>
        )}
      </div>

      {/* Blast Radius Stats */}
      <div className="impact-stats-row">
        <div className="impact-stat">
          <div className="impact-stat-value" style={{ color: '#fb923c' }}>{atRiskCount}</div>
          <div className="impact-stat-label">At Risk</div>
        </div>
        <div className="impact-stat">
          <div className="impact-stat-value" style={{ color: 'var(--text-muted)' }}>{totalComponents - atRiskCount - 1}</div>
          <div className="impact-stat-label">Unaffected</div>
        </div>
        <div className="impact-stat">
          <div className="impact-stat-value" style={{ color: blastPercent > 50 ? '#ef4444' : '#fb923c' }}>{blastPercent}%</div>
          <div className="impact-stat-label">Blast %</div>
        </div>
      </div>

      {/* Blast radius progress bar */}
      <div style={{ margin: '0 0 16px 0' }}>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${blastPercent}%`,
            background: blastPercent > 50
              ? 'linear-gradient(90deg, #f97316, #ef4444)'
              : 'linear-gradient(90deg, #fbbf24, #f97316)',
            borderRadius: '2px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* At Risk Components List */}
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        Downstream Components at Risk
      </div>

      {atRiskCount === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          color: 'var(--text-muted)',
          fontSize: '12px',
          border: '1px dashed var(--border-subtle)',
          borderRadius: '8px'
        }}>
          No downstream components affected
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {atRiskComponents.map((comp, i) => (
            <div key={comp.id} className="impact-risk-row" style={{ animationDelay: `${i * 60}ms` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <FiAlertTriangle size={12} style={{ color: '#fb923c', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fdba74', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {comp.name}
                  </div>
                  {comp.manager && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>👤 {comp.manager}</div>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(251,146,60,0.15)',
                color: '#fb923c',
                fontWeight: 600,
                flexShrink: 0
              }}>
                AT RISK
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action hint */}
      <div style={{
        marginTop: '16px',
        padding: '10px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        lineHeight: 1.5
      }}>
        <FiZap size={11} style={{ color: '#f87171', marginRight: '6px', verticalAlign: 'middle' }} />
        Restore <strong style={{ color: '#f87171' }}>{sourceComp?.name}</strong> to remove the blast radius.
        Click any node to inspect it.
      </div>
    </div>
  )
}
