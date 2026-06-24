import { useState, useMemo } from 'react'

export default function TraceTimelinePanel({ traceId, logs, onClose, onSpanClick, activeSpanId }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Status filter
      if (filterStatus === 'errors' && log.status !== 'critical' && log.status !== 'failed' && (!log.statusCode || log.statusCode < 500)) return false
      if (filterStatus === 'warnings' && log.status !== 'warning' && (!log.statusCode || (log.statusCode < 400 || log.statusCode >= 500))) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchNode = log.nodeName?.toLowerCase().includes(query)
        const matchMsg = log.message?.toLowerCase().includes(query)
        const matchAction = log.action?.toLowerCase().includes(query)
        const matchMeta = log.metadata ? Object.values(log.metadata).some(v => String(v).toLowerCase().includes(query)) : false
        if (!matchNode && !matchMsg && !matchAction && !matchMeta) return false
      }
      
      return true
    })
  }, [logs, filterStatus, searchQuery])

  return (
    <div className="trace-timeline-panel">
      <div className="trace-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="trace-title">
            <span className="trace-icon">🔍</span>
            Entity Trace: <span className="trace-id">{traceId}</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        {/* Advanced Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`btn btn--sm ${filterStatus === 'all' ? 'btn--primary' : 'btn--ghost'}`}
              style={{ flex: 1, fontSize: '10px' }}
              onClick={() => setFilterStatus('all')}
            >All</button>
            <button 
              className={`btn btn--sm ${filterStatus === 'warnings' ? 'btn--primary' : 'btn--ghost'}`}
              style={{ flex: 1, fontSize: '10px', color: filterStatus === 'warnings' ? '#0f172a' : '#fbbf24' }}
              onClick={() => setFilterStatus('warnings')}
            >Warnings</button>
            <button 
              className={`btn btn--sm ${filterStatus === 'errors' ? 'btn--primary' : 'btn--ghost'}`}
              style={{ flex: 1, fontSize: '10px', color: filterStatus === 'errors' ? '#fff' : '#ef4444' }}
              onClick={() => setFilterStatus('errors')}
            >Errors</button>
          </div>
          <input 
            type="text" 
            placeholder="Search logs, metadata, actions..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '6px 10px', 
              fontSize: '11px', 
              background: 'rgba(15, 23, 42, 0.5)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '4px',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Active span indicator */}
        {activeSpanId && onSpanClick && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '4px',
            fontSize: '11px', color: '#38bdf8'
          }}>
            <span style={{ flex: 1 }}>🔎 Span filter active in Logs tab</span>
          </div>
        )}
      </div>

      <div className="trace-logs">
        {filteredLogs.length === 0 && (
          <div className="empty-state" style={{ marginTop: '20px' }}>
            <div className="empty-state-icon">{logs.length === 0 ? '⏳' : '🚫'}</div>
            <div className="empty-state-text">{logs.length === 0 ? 'Waiting for trace data...' : 'No logs match your filters.'}</div>
          </div>
        )}
        
        {filteredLogs.map((log, i) => {
          const isSelected = activeSpanId && log.spanId && log.spanId === activeSpanId
          const isClickable = !!onSpanClick && !!log.spanId

          return (
            <div
              key={i}
              className={`trace-log-item trace-log-item--${log.status}`}
              onClick={isClickable ? () => onSpanClick(log) : undefined}
              title={isClickable ? 'Click to filter logs by this span' : undefined}
              style={{
                cursor: isClickable ? 'pointer' : 'default',
                outline: isSelected ? '1px solid rgba(56,189,248,0.6)' : 'none',
                background: isSelected ? 'rgba(56,189,248,0.06)' : undefined,
                borderRadius: isSelected ? '4px' : undefined,
                transition: 'background 0.15s, outline 0.15s'
              }}
            >
              <div className="trace-log-header">
                 <div className="trace-log-time">{log.time}</div>
                 {log.duration !== undefined && <div className="trace-log-duration">{log.duration}ms</div>}
                 {isClickable && (
                   <div style={{ fontSize: '9px', color: isSelected ? '#38bdf8' : 'var(--text-muted)', marginLeft: 'auto' }}>
                     {isSelected ? '✦ selected' : '⬡ click to filter'}
                   </div>
                 )}
              </div>
              
              <div className="trace-log-content">
                <div className="trace-log-node">{log.nodeName}</div>
                {log.action && (
                  <div className="trace-log-action">
                    <span className={`method-badge method-${log.method?.toLowerCase() || 'get'}`}>{log.method || 'EXEC'}</span>
                    <span className="action-path">{log.action}</span>
                    {log.statusCode && (
                      <span className={`status-code status-${log.statusCode >= 500 ? 'error' : log.statusCode >= 400 ? 'warn' : 'ok'}`}>
                        {log.statusCode}
                      </span>
                    )}
                  </div>
                )}
                <div className="trace-log-msg">{log.message}</div>
                
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="trace-log-metadata">
                    {Object.entries(log.metadata).map(([k, v]) => (
                      <div key={k} className="meta-tag">
                        <span className="meta-key">{k}:</span> <span className="meta-val">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
