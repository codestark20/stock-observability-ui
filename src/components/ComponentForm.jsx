import { useState, useEffect } from 'react'

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
  const [linkUsage, setLinkUsage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '')
      setManager(initialData?.manager || '')
      setSla(initialData?.sla || '')
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
    onSubmit({ name: trimmed, manager: manager.trim(), sla: sla.trim(), linkUsage: linkUsage.trim() })
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Component' : 'Add Component'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
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
