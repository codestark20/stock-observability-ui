import { Handle, Position } from 'reactflow'

const handleStyle = {
  background: 'var(--accent-blue)',
  width: 10,
  height: 10,
  border: '2px solid var(--bg-secondary)',
}

const ROLE_CONFIG = {
  start: { icon: '▶', badge: 'START', badgeClass: 'builder-node-badge--start' },
  end: { icon: '🏁', badge: 'END', badgeClass: 'builder-node-badge--end' },
  intermediate: { icon: null, badge: null, badgeClass: null }
}

export default function BuilderNode({ data }) {
  const role = data.role || 'intermediate'
  const config = ROLE_CONFIG[role]

  const nodeClasses = [
    'builder-node',
    role !== 'intermediate' ? `builder-node--${role}` : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={nodeClasses}>
      {/* Start nodes only have source handles (outgoing) */}
      {role !== 'start' && (
        <>
          <Handle type="target" position={Position.Top} style={handleStyle} />
          <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />
        </>
      )}

      {/* Role badge */}
      {config.badge && (
        <div className={`builder-node-badge ${config.badgeClass}`}>
          {config.icon} {config.badge}
        </div>
      )}

      <div className="builder-node-header">
        <span className="builder-node-name">{data.name}</span>
        <div className="builder-node-actions">
          <button className="builder-node-action-btn" onClick={() => data.onEdit(data.componentId)} title="Edit">✏️</button>
          <button className="builder-node-action-btn" onClick={() => data.onDelete(data.componentId)} title="Delete">🗑️</button>
        </div>
      </div>

      <div className="builder-node-fields">
        <div className="builder-node-field">
          <span className="builder-node-field-label">👤 Manager</span>
          <span className="builder-node-field-value">{data.manager || 'Not assigned'}</span>
        </div>
        <div className="builder-node-field">
          <span className="builder-node-field-label">📋 SLA</span>
          <span className="builder-node-field-value">{data.sla || 'Not defined'}</span>
        </div>
        {data.linkUsage && (
          <div className="builder-node-field">
            <span className="builder-node-field-label">🔗 Link</span>
            <span className="builder-node-field-value builder-node-field-value--link">{data.linkUsage}</span>
          </div>
        )}
      </div>

      {/* End nodes only have target handles (incoming) */}
      {role !== 'end' && (
        <>
          <Handle type="source" position={Position.Bottom} style={handleStyle} />
          <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />
        </>
      )}
    </div>
  )
}
