import { useState, useCallback, useMemo, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow'
import 'reactflow/dist/style.css'

import BuilderNode from './BuilderNode'
import ComponentForm from './ComponentForm'
import { useWorkflow } from '../context/WorkflowContext'

const nodeTypes = { builderNode: BuilderNode }
const EDGE_COLOR = '#00f0ff'

const ARROW_MARKER = {
  type: MarkerType.ArrowClosed,
  color: EDGE_COLOR,
  width: 28,
  height: 28,
  strokeWidth: 1
}

function buildEdgeStyle(direction, commonLink) {
  const base = {
    animated: true,
    type: 'smoothstep',
    style: { strokeWidth: 4, stroke: EDGE_COLOR },
    label: commonLink || undefined,
    labelStyle: commonLink ? { fill: '#e2e8f0', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif' } : undefined,
    labelBgStyle: commonLink ? { fill: '#1e293b', fillOpacity: 0.95 } : undefined,
    labelBgPadding: commonLink ? [8, 4] : undefined,
    labelBgBorderRadius: 6
  }

  if (direction === 'two-way') {
    return {
      ...base,
      markerEnd: { ...ARROW_MARKER },
      markerStart: { ...ARROW_MARKER, orient: 'auto-start-reverse' }
    }
  }
  // one-way (default)
  return {
    ...base,
    markerEnd: { ...ARROW_MARKER }
  }
}

export default function WorkflowBuilder() {
  const {
    editingWorkflowId,
    getWorkflow,
    saveWorkflow,
    addComponent,
    updateComponent,
    removeComponent,
    renameWorkflow,
    setActiveView
  } = useWorkflow()

  const workflow = getWorkflow(editingWorkflowId)

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [workflowName, setWorkflowName] = useState('')
  const [commonLink, setCommonLink] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingComponentId, setEditingComponentId] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [edgeMenuPos, setEdgeMenuPos] = useState(null)

  // Load workflow data into local state
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name)
      setCommonLink(workflow.commonLink || '')
      setEdges(workflow.edges || [])
      setNodes(
        (workflow.nodes || []).map(n => ({
          ...n,
          type: 'builderNode',
          data: {
            ...n.data,
            onEdit: handleEditComponent,
            onDelete: handleDeleteComponent
          }
        }))
      )
    }
  }, [workflow?.id])

  const handleEditComponent = useCallback((componentId) => {
    setEditingComponentId(componentId)
    setShowForm(true)
  }, [])

  const handleDeleteComponent = useCallback((componentId) => {
    if (!editingWorkflowId) return
    removeComponent(editingWorkflowId, componentId)
    setNodes(prev => prev.filter(n => n.id !== componentId))
    setEdges(prev => prev.filter(e => e.source !== componentId && e.target !== componentId))
    setHasChanges(true)
  }, [editingWorkflowId, removeComponent])

  useEffect(() => {
    setNodes(prev =>
      prev.map(n => ({
        ...n,
        data: { ...n.data, onEdit: handleEditComponent, onDelete: handleDeleteComponent }
      }))
    )
  }, [handleEditComponent, handleDeleteComponent])

  const onNodesChange = useCallback((changes) => {
    setNodes(prev => applyNodeChanges(changes, prev))
    setHasChanges(true)
  }, [])

  const onEdgesChange = useCallback((changes) => {
    setEdges(prev => applyEdgeChanges(changes, prev))
    setHasChanges(true)
  }, [])

  const onConnect = useCallback((connection) => {
    const newEdge = {
      ...connection,
      id: `e_${connection.source}-${connection.target}_${Date.now()}`,
      data: { direction: 'one-way' }
    }
    setEdges(prev => addEdge(newEdge, prev))
    setHasChanges(true)
  }, [])

  // Edge click → show direction menu
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation()
    const rect = event.currentTarget?.closest('.react-flow')?.getBoundingClientRect()
    if (rect) {
      setSelectedEdgeId(edge.id)
      setEdgeMenuPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
  }, [])

  const setEdgeDirection = useCallback((direction) => {
    setEdges(prev => prev.map(e => {
      if (e.id !== selectedEdgeId) return e
      if (direction === 'reverse') {
        return { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle, data: { ...e.data, direction: 'one-way' } }
      }
      return { ...e, data: { ...e.data, direction } }
    }))
    setSelectedEdgeId(null)
    setEdgeMenuPos(null)
    setHasChanges(true)
  }, [selectedEdgeId])

  const deleteSelectedEdge = useCallback(() => {
    setEdges(prev => prev.filter(e => e.id !== selectedEdgeId))
    setSelectedEdgeId(null)
    setEdgeMenuPos(null)
    setHasChanges(true)
  }, [selectedEdgeId])

  // Close edge menu on pane click
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null)
    setEdgeMenuPos(null)
  }, [])

  const handleAddComponent = useCallback(({ name, manager, sla, linkUsage }) => {
    if (!editingWorkflowId) return
    const compId = addComponent(editingWorkflowId, { name, manager, sla })

    const existingCount = nodes.length
    const col = existingCount % 3
    const row = Math.floor(existingCount / 3)
    const newNode = {
      id: compId,
      type: 'builderNode',
      position: { x: 100 + col * 300, y: 80 + row * 280 },
      data: {
        name, manager, sla, linkUsage,
        componentId: compId,
        onEdit: handleEditComponent,
        onDelete: handleDeleteComponent
      }
    }
    setNodes(prev => [...prev, newNode])
    setShowForm(false)
    setHasChanges(true)
  }, [editingWorkflowId, nodes.length, addComponent, handleEditComponent, handleDeleteComponent])

  const handleUpdateComponent = useCallback(({ name, manager, sla, linkUsage }) => {
    if (!editingWorkflowId || !editingComponentId) return
    updateComponent(editingWorkflowId, editingComponentId, { name, manager, sla, linkUsage })
    setNodes(prev =>
      prev.map(n =>
        n.id === editingComponentId
          ? { ...n, data: { ...n.data, name, manager, sla, linkUsage } }
          : n
      )
    )
    setEditingComponentId(null)
    setShowForm(false)
    setHasChanges(true)
  }, [editingWorkflowId, editingComponentId, updateComponent])

  const handleSave = useCallback(() => {
    if (!editingWorkflowId) return
    const cleanNodes = nodes.map(({ data, ...rest }) => ({
      ...rest,
      data: {
        name: data.name,
        manager: data.manager,
        sla: data.sla,
        linkUsage: data.linkUsage || '',
        componentId: data.componentId
      }
    }))
    const cleanEdges = edges.map(({ id, source, target, sourceHandle, targetHandle, data }) => ({
      id, source, target,
      sourceHandle: sourceHandle || null,
      targetHandle: targetHandle || null,
      data: { direction: data?.direction || 'one-way' }
    }))
    saveWorkflow(editingWorkflowId, {
      name: workflowName,
      commonLink,
      nodes: cleanNodes,
      edges: cleanEdges
    })
    renameWorkflow(editingWorkflowId, workflowName)
    setHasChanges(false)
    setActiveView('dashboard')
  }, [editingWorkflowId, nodes, edges, workflowName, commonLink, saveWorkflow, renameWorkflow, setActiveView])

  const autoLayout = useCallback(() => {
    const positioned = nodes.map((node, idx) => {
      const col = idx % 3
      const row = Math.floor(idx / 3)
      return { ...node, position: { x: 100 + col * 300, y: 80 + row * 280 } }
    })
    setNodes(positioned)
    setHasChanges(true)
  }, [nodes])

  const existingNames = useMemo(() => {
    if (!workflow) return []
    return workflow.components.map(c => c.name)
  }, [workflow])

  const editingComponentData = useMemo(() => {
    if (!editingComponentId || !workflow) return null
    const comp = workflow.components.find(c => c.id === editingComponentId)
    if (!comp) return null
    // Also look in local nodes for linkUsage
    const localNode = nodes.find(n => n.id === editingComponentId)
    return {
      name: comp.name, manager: comp.manager, sla: comp.sla,
      linkUsage: localNode?.data?.linkUsage || comp.linkUsage || ''
    }
  }, [editingComponentId, workflow, nodes])

  // Styled edges for display
  const styledEdges = useMemo(() =>
    edges.map(e => {
      const dir = e.data?.direction || 'one-way'
      const styleProps = buildEdgeStyle(dir, commonLink)
      return {
        ...e,
        ...styleProps,
        className: e.id === selectedEdgeId ? 'edge-selected' : ''
      }
    }),
    [edges, commonLink, selectedEdgeId]
  )

  if (!workflow) {
    return (
      <div className="welcome-page">
        <div className="welcome-icon">⚠️</div>
        <h2>Workflow not found</h2>
      </div>
    )
  }

  return (
    <div className="builder-container">
      {/* Toolbar */}
      <div className="builder-toolbar">
        <div className="builder-toolbar-left">
          <input
            className="builder-toolbar-input"
            value={workflowName}
            onChange={e => { setWorkflowName(e.target.value); setHasChanges(true) }}
            placeholder="Workflow name..."
          />
          <div className="common-link-input-wrapper">
            <span className="common-link-icon">🔗</span>
            <input
              className="builder-toolbar-input common-link-input"
              value={commonLink}
              onChange={e => { setCommonLink(e.target.value); setHasChanges(true) }}
              placeholder="Common link field (e.g., Employee Email)"
            />
          </div>
          {hasChanges && (
            <span style={{ fontSize: '11px', color: 'var(--status-warning)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Unsaved changes
            </span>
          )}
        </div>

        <div className="builder-toolbar-right">
          <button className="btn btn--primary btn--sm" onClick={() => { setEditingComponentId(null); setShowForm(true) }}>
            + Add Component
          </button>
          <button className="btn btn--ghost btn--sm" onClick={autoLayout}>
            ⊞ Auto Layout
          </button>
          <button className="btn btn--success btn--sm" onClick={handleSave}>
            ✓ Save & Monitor
          </button>
        </div>
      </div>

      {/* Helper bar */}
      {nodes.length === 0 && (
        <div className="builder-helper">
          Click <strong>"+ Add Component"</strong> to start building your workflow.
          {!commonLink && <> Set a <strong>common link field</strong> (e.g., "Employee Email") in the toolbar to connect components.</>}
        </div>
      )}

      {nodes.length > 0 && nodes.length < 3 && (
        <div className="builder-helper">
          💡 Drag from <strong>blue dots</strong> to connect components. <strong>Click an edge</strong> to change direction (→ one-way, ↔ two-way, ← reverse).
        </div>
      )}

      {/* ReactFlow Canvas */}
      <div className="builder-canvas">
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(148, 163, 184, 0.06)" gap={20} />
          <Controls />
          <MiniMap nodeColor={() => '#38bdf8'} maskColor="rgba(2, 6, 23, 0.8)" />
        </ReactFlow>

        {/* Edge Direction Menu */}
        {selectedEdgeId && edgeMenuPos && (
          <div
            className="edge-direction-menu"
            style={{ left: edgeMenuPos.x, top: edgeMenuPos.y }}
          >
            <div className="edge-direction-menu-title">Data Flow Direction</div>
            <button
              className={`edge-direction-option ${edges.find(e => e.id === selectedEdgeId)?.data?.direction === 'one-way' ? 'edge-direction-option--active' : ''}`}
              onClick={() => setEdgeDirection('one-way')}
            >
              <span className="edge-dir-arrow">→</span> One-way
            </button>
            <button
              className={`edge-direction-option ${edges.find(e => e.id === selectedEdgeId)?.data?.direction === 'two-way' ? 'edge-direction-option--active' : ''}`}
              onClick={() => setEdgeDirection('two-way')}
            >
              <span className="edge-dir-arrow">↔</span> Two-way
            </button>
            <button className="edge-direction-option" onClick={() => setEdgeDirection('reverse')}>
              <span className="edge-dir-arrow">←</span> Reverse
            </button>
            <div className="edge-direction-divider" />
            <button className="edge-direction-option edge-direction-option--danger" onClick={deleteSelectedEdge}>
              🗑️ Delete Edge
            </button>
          </div>
        )}
      </div>

      {/* Component Form Modal */}
      <ComponentForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingComponentId(null) }}
        onSubmit={editingComponentId ? handleUpdateComponent : handleAddComponent}
        initialData={editingComponentData}
        existingNames={existingNames}
        commonLink={commonLink}
      />
    </div>
  )
}
