import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'

const ROLE_OPTIONS = [
  { value: 'intermediate', label: '⬡ Intermediate', desc: 'Regular workflow step' },
  { value: 'start', label: '▶ Start', desc: 'Entry point of the workflow' },
  { value: 'end', label: '🏁 End', desc: 'Final step of the workflow' }
]

export default function ComponentForm({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  existingNames = [],
  commonLink = ''
}) {
  const [name, setName] = useState('')
  const [manager, setManager] = useState('')
  const [sla, setSla] = useState('')
  const [role, setRole] = useState('intermediate')
  const [linkUsage, setLinkUsage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '')
      setManager(initialData?.manager || '')
      setSla(initialData?.sla || '')
      setRole(initialData?.role || 'intermediate')
      setLinkUsage(initialData?.linkUsage || '')
      setError('')
    }
  }, [isOpen, initialData])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Component name is required')
      return
    }
    const isDuplicate = existingNames.some(
      n => n.toLowerCase() === trimmed.toLowerCase() && n.toLowerCase() !== (initialData?.name || '').toLowerCase()
    )
    if (isDuplicate) {
      setError('A component with this name already exists')
      return
    }
    onSubmit({ name: trimmed, manager: manager.trim(), sla: sla.trim(), role, linkUsage: linkUsage.trim() })
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="component-form-header">
          <h2>{initialData ? 'Edit Component' : 'Add Component'}</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Component Name *</label>
            <input
              className="form-input"
              placeholder="e.g., Google Account Setup"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Component Role</label>
            <div className="role-selector">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`role-option role-option--${opt.value} ${role === opt.value ? 'role-option--active' : ''}`}
                  onClick={() => setRole(opt.value)}
                >
                  <span className="role-option-label">{opt.label}</span>
                  <span className="role-option-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Manager</label>
            <input
              className="form-input"
              placeholder="e.g., John Doe"
              value={manager}
              onChange={e => setManager(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="form-group">
            <label className="form-label">SLA</label>
            <input
              className="form-input"
              placeholder="e.g., 99.9% or < 200ms"
              value={sla}
              onChange={e => setSla(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {commonLink && (
            <div className="form-group">
              <label className="form-label">
                🔗 How does this component use "{commonLink}"?
              </label>
              <input
                className="form-input"
                placeholder={`e.g., Creates account using ${commonLink}`}
                value={linkUsage}
                onChange={e => setLinkUsage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Describe how this component uses the common link field
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Add Component'}
          </button>
        </div>
      </div>
    </div>
  )
}
