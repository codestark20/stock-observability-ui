import { useState, useEffect } from 'react'
import { FiEdit2, FiCopy, FiTrash2, FiPlus, FiMoreHorizontal, FiZap } from 'react-icons/fi'

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
      <div className="sidebar-brand">
        <div className="brand-logo"><FiZap /></div>
        <div className="brand-text">
          <h1>Workflow Platform</h1>
          <div className="header-subtitle">OBSERVABILITY</div>
        </div>
      </div>

      <div className="sidebar-section">
        <button className="btn btn--primary sidebar-create-btn" onClick={onCreateWorkflow}>
          <FiPlus style={{ marginRight: '6px' }} /> Create Workflow
        </button>
      </div>

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
                  <button onClick={() => { onEditWorkflow(wf.id); setMenuOpenId(null) }}><FiEdit2 style={{ marginRight: '6px' }} /> Edit</button>
                  <button onClick={() => { onDuplicateWorkflow(wf.id); setMenuOpenId(null) }}><FiCopy style={{ marginRight: '6px' }} /> Duplicate</button>
                  <button onClick={() => { onDeleteWorkflow(wf.id); setMenuOpenId(null) }} className="dropdown-danger">
                    <FiTrash2 style={{ marginRight: '6px' }} /> Delete
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
