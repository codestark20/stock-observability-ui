import { Handle, Position } from 'reactflow'

const handleStyle = {
  background: 'var(--accent-blue)',
  width: 10,
  height: 10,
  border: '2px solid var(--bg-secondary)',
}

export default function BuilderNode({ data }) {
  return (
    <div className="builder-node">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />

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

      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />
    </div>
  )
}
