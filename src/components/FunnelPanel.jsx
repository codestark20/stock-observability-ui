import { useState } from 'react'

const ROLE_COLORS = {
  start: 'var(--status-healthy)',
  intermediate: 'var(--accent-blue)',
  end: '#a78bfa'
}

function DropoffDrawer({ stage, nextStage, onClose }) {
  if (!stage) return null
  const droppedCount = stage.dropped_ids?.length || 0

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.92)',
      backdropFilter: 'blur(8px)',
      zIndex: 50,
      padding: '16px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
          ⚠️ Drop-off: {stage.component_name} → {nextStage?.component_name}
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div style={{
        padding: '8px 12px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px', color: '#fca5a5'
      }}>
        <strong>{droppedCount}</strong> {droppedCount === 1 ? 'entity' : 'entities'} reached <strong>{stage.component_name}</strong> but never arrived at <strong>{nextStage?.component_name}</strong>.
      </div>

      {droppedCount === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
          No dropped entities — 100% passed through ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            LOST ENTITY IDs
          </div>
          {stage.dropped_ids.map((id, i) => (
            <div key={i} style={{
              padding: '5px 10px',
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#fca5a5'
            }}>
              {id}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FunnelPanel({ funnelData, workflowComponents }) {
  const [selectedGap, setSelectedGap] = useState(null) // index of the stage where drop-off happened
  const [isCollapsed, setIsCollapsed] = useState(false)

  const stages = funnelData?.stages || []

  if (stages.length === 0) {
    return (
      <div>
        <div className="section-label">Order Funnel</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 0' }}>
          No trace data yet. Run test-otel.js to populate.
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...stages.map(s => s.order_count), 1)
  const totalDropped = stages.slice(0, -1).reduce((sum, s) => sum + (s.dropped_ids?.length || 0), 0)

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsCollapsed(c => !c)}
      >
        <div className="section-label" style={{ marginBottom: 0 }}>
          Order Funnel
          {totalDropped > 0 && (
            <span style={{
              marginLeft: '8px', fontSize: '9px', padding: '2px 6px',
              background: 'rgba(239, 68, 68, 0.15)', color: '#f87171',
              borderRadius: '99px', fontWeight: 600
            }}>
              {totalDropped} drops
            </span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{isCollapsed ? '▼' : '▲'}</span>
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: '10px', position: 'relative' }}>
          {/* Drop-off drawer overlay */}
          {selectedGap !== null && (
            <DropoffDrawer
              stage={stages[selectedGap]}
              nextStage={stages[selectedGap + 1]}
              onClose={() => setSelectedGap(null)}
            />
          )}

          {/* Funnel bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {stages.map((stage, i) => {
              const pct = maxCount > 0 ? (stage.order_count / maxCount) * 100 : 0
              const droppedCount = stage.dropped_ids?.length || 0
              const hasNext = i < stages.length - 1
              const dropPct = stage.order_count > 0 && hasNext
                ? Math.round((droppedCount / stage.order_count) * 100)
                : 0
              const color = ROLE_COLORS[stage.role] || 'var(--accent-blue)'

              return (
                <div key={stage.component_id}>
                  {/* Stage bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    {/* Bar */}
                    <div style={{ flex: 1, height: '28px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}40, ${color}90)`,
                        borderRight: `2px solid ${color}`,
                        transition: 'width 0.5s ease',
                        display: 'flex', alignItems: 'center', paddingLeft: '8px'
                      }}>
                      </div>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', alignItems: 'center', paddingLeft: '8px',
                        fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600,
                        pointerEvents: 'none'
                      }}>
                        {stage.component_name}
                      </div>
                    </div>
                    {/* Count */}
                    <div style={{ width: '40px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                      {stage.order_count}
                    </div>
                  </div>

                  {/* Drop-off gap between this stage and next */}
                  {hasNext && droppedCount > 0 && (
                    <div
                      onClick={() => setSelectedGap(i)}
                      title={`${droppedCount} entities dropped — click to inspect`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        margin: '2px 0',
                        cursor: 'pointer',
                        background: 'rgba(239, 68, 68, 0.07)',
                        border: '1px dashed rgba(239, 68, 68, 0.25)',
                        borderRadius: '4px',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                    >
                      <span style={{ color: '#f87171', fontSize: '10px' }}>▼ {droppedCount} dropped</span>
                      <span style={{
                        marginLeft: 'auto', fontSize: '9px', padding: '1px 5px',
                        background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                        borderRadius: '99px'
                      }}>
                        -{dropPct}%
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>inspect →</span>
                    </div>
                  )}

                  {/* Green pass-through when no drop */}
                  {hasNext && droppedCount === 0 && stage.order_count > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '2px 8px', margin: '1px 0',
                      fontSize: '9px', color: 'var(--status-healthy)', opacity: 0.7
                    }}>
                      ✓ 100% passed through
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary footer */}
          <div style={{
            marginTop: '10px', padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '10px', color: 'var(--text-muted)',
            display: 'flex', justifyContent: 'space-between'
          }}>
            <span>{stages[0]?.order_count ?? 0} entered</span>
            <span>{stages[stages.length - 1]?.order_count ?? 0} completed</span>
            {stages[0]?.order_count > 0 && (
              <span style={{ color: totalDropped > 0 ? '#f87171' : 'var(--status-healthy)' }}>
                {Math.round(((stages[stages.length - 1]?.order_count || 0) / stages[0].order_count) * 100)}% conversion
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
