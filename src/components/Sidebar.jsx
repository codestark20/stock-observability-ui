import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { FiEdit2, FiCopy, FiTrash2, FiPlus, FiZap } from 'react-icons/fi'
import { useWorkflow } from '../context/WorkflowContext'

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
  onDeleteWorkflow,
  onDuplicateWorkflow
}) {
  const [menuOpenId, setMenuOpenId] = useState(null)
  const navigate = useNavigate()
  const { id: activeWorkflowId } = useParams()
  const location = useLocation()
  const { createWorkflow } = useWorkflow()

  useEffect(() => {
    if (!menuOpenId) return
    const handler = () => setMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  const handleCreateWorkflow = async () => {
    const id = await createWorkflow('Untitled Workflow')
    if (id) navigate(`/workflow/${id}/builder`)
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo"><FiZap /></div>
        <div className="brand-text">
          <h1>Workflow Platform</h1>
          <div className="header-subtitle">OBSERVABILITY</div>
        </div>
      </div>

      <div className="sidebar-section">
        <button className="btn btn--primary sidebar-create-btn" onClick={handleCreateWorkflow}>
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
          workflows.map(wf => {
            const isActive = wf.id === activeWorkflowId && !location.pathname.includes('/builder')
            return (
              <div
                key={wf.id}
                className={`workflow-card ${isActive ? 'workflow-card--active' : ''}`}
                onClick={() => navigate(`/workflow/${wf.id}/dashboard`)}
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
                    <button onClick={() => { navigate(`/workflow/${wf.id}/builder`); setMenuOpenId(null) }}><FiEdit2 style={{ marginRight: '6px' }} /> Edit</button>
                    <button onClick={() => { onDuplicateWorkflow(wf.id); setMenuOpenId(null) }}><FiCopy style={{ marginRight: '6px' }} /> Duplicate</button>
                    <button onClick={() => { onDeleteWorkflow(wf.id); setMenuOpenId(null) }} className="dropdown-danger">
                      <FiTrash2 style={{ marginRight: '6px' }} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </nav>
  )
}
