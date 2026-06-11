import { useState, useEffect } from 'react'

function formatDate(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  const oneDay = 86400000
  if (diff < oneDay && date.getDate() === now.getDate()) return 'Today'
  if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Sidebar({
  workflows,
  activeWorkflowId,
  activeView,
  onCreateWorkflow,
  onSelectWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow
}) {
  const [menuOpenId, setMenuOpenId] = useState(null)

  useEffect(() => {
    if (!menuOpenId) return
    const handler = () => setMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="header-logo">⚡</div>
        <div>
          <div className="header-title">Workflow Platform</div>
          <div className="header-subtitle">OBSERVABILITY</div>
        </div>
      </div>

      <button className="btn btn--primary sidebar-create-btn" onClick={onCreateWorkflow}>
        + Create Workflow
      </button>

      <div className="section-label" style={{ padding: '0 20px' }}>Your Workflows</div>

      <div className="sidebar-workflows">
        {workflows.length === 0 ? (
          <div className="sidebar-empty">
            <span style={{ fontSize: '32px' }}>📋</span>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No workflows yet</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click above to create one</div>
          </div>
        ) : (
          workflows.map(wf => (
            <div
              key={wf.id}
              className={`workflow-card ${
                wf.id === activeWorkflowId && activeView !== 'builder' ? 'workflow-card--active' : ''
              }`}
              onClick={() => onSelectWorkflow(wf.id)}
            >
              <div className="workflow-card-header">
                <span className="workflow-card-name">{wf.name}</span>
                <button
                  className="workflow-card-menu-btn"
                  onClick={e => {
                    e.stopPropagation()
                    setMenuOpenId(menuOpenId === wf.id ? null : wf.id)
                  }}
                >
                  ⋯
                </button>
              </div>
              <div className="workflow-card-meta">
                <span>{wf.componentCount} components</span>
                <span className={`status-dot status-dot--${wf.overallStatus}`} />
                <span>{formatDate(wf.createdAt)}</span>
              </div>
              {menuOpenId === wf.id && (
                <div className="workflow-card-dropdown" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { onEditWorkflow(wf.id); setMenuOpenId(null) }}>✏️ Edit</button>
                  <button onClick={() => { onDuplicateWorkflow(wf.id); setMenuOpenId(null) }}>📄 Duplicate</button>
                  <button onClick={() => { onDeleteWorkflow(wf.id); setMenuOpenId(null) }} className="dropdown-danger">
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </nav>
  )
}
