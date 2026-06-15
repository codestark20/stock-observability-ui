import { useState, useEffect } from 'react'

export default function TraceTimelinePanel({ traceId, logs, onClose }) {
  return (
    <div className="trace-timeline-panel">
      <div className="trace-header">
        <div className="trace-title">
          <span className="trace-icon">🔍</span>
          Entity Trace: <span className="trace-id">{traceId}</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="trace-logs">
        {logs.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <div className="empty-state-text">Waiting for trace data...</div>
          </div>
        )}
        
        {logs.map((log, i) => (
          <div key={i} className={`trace-log-item trace-log-item--${log.status}`}>
            <div className="trace-log-time">{log.time}</div>
            <div className="trace-log-content">
              <div className="trace-log-node">{log.nodeName}</div>
              <div className="trace-log-msg">{log.message}</div>
            </div>
            {log.duration && (
               <div className="trace-log-duration">{log.duration}ms</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
