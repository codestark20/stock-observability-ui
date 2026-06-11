import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const WorkflowContext = createContext(null)

const STORAGE_KEY = 'workflow-observability-data'

function generateId(prefix = 'wf') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return data.workflows || []
    }
  } catch (e) {
    console.warn('Failed to load workflows from localStorage:', e)
  }
  return []
}

function saveToStorage(workflows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ workflows }))
  } catch (e) {
    console.warn('Failed to save workflows to localStorage:', e)
  }
}

// Generate realistic simulated metrics for a component
function generateMetrics(name, sla) {
  const seed = name.length * 7 + (sla?.length || 0) * 3
  const latency = 5 + (seed % 80)
  const tps = 10 + (seed % 40)
  const cpu = 15 + (seed % 55)
  return {
    latency: `${latency}ms`,
    tps: `${tps}k/sec`,
    cpu: `${cpu}%`
  }
}

export function WorkflowProvider({ children }) {
  const [workflows, setWorkflows] = useState(() => loadFromStorage())
  const [activeWorkflowId, setActiveWorkflowId] = useState(null)
  const [activeView, setActiveView] = useState('welcome') // 'welcome' | 'builder' | 'dashboard'
  const [editingWorkflowId, setEditingWorkflowId] = useState(null)

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(workflows)
  }, [workflows])

  const createWorkflow = useCallback((name) => {
    const id = generateId('wf')
    const newWorkflow = {
      id,
      name: name || 'Untitled Workflow',
      commonLink: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [],
      nodes: [],
      edges: []
    }
    setWorkflows(prev => [...prev, newWorkflow])
    setEditingWorkflowId(id)
    setActiveWorkflowId(id)
    setActiveView('builder')
    return id
  }, [])

  const deleteWorkflow = useCallback((id) => {
    setWorkflows(prev => prev.filter(w => w.id !== id))
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null)
      setActiveView('welcome')
      setEditingWorkflowId(null)
    }
  }, [activeWorkflowId])

  const duplicateWorkflow = useCallback((id) => {
    setWorkflows(prev => {
      const source = prev.find(w => w.id === id)
      if (!source) return prev
      const newId = generateId('wf')
      const clone = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return [...prev, clone]
    })
  }, [])

  const renameWorkflow = useCallback((id, name) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === id
          ? { ...w, name, updatedAt: new Date().toISOString() }
          : w
      )
    )
  }, [])

  const selectWorkflow = useCallback((id) => {
    setActiveWorkflowId(id)
    setActiveView('dashboard')
    setEditingWorkflowId(null)
  }, [])

  const openBuilder = useCallback((id = null) => {
    if (id) {
      setEditingWorkflowId(id)
      setActiveWorkflowId(id)
      setActiveView('builder')
    } else {
      createWorkflow('Untitled Workflow')
    }
  }, [createWorkflow])

  const saveWorkflow = useCallback((id, { name, commonLink, components, nodes, edges }) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === id
          ? {
              ...w,
              name: name || w.name,
              commonLink: commonLink !== undefined ? commonLink : w.commonLink,
              components: components || w.components,
              nodes: nodes || w.nodes,
              edges: edges || w.edges,
              updatedAt: new Date().toISOString()
            }
          : w
      )
    )
  }, [])

  const addComponent = useCallback((workflowId, { name, manager, sla }) => {
    const compId = generateId('comp')
    const metrics = generateMetrics(name, sla)
    const component = {
      id: compId,
      name,
      manager,
      sla,
      linkUsage: '',
      ...metrics
    }

    setWorkflows(prev =>
      prev.map(w => {
        if (w.id !== workflowId) return w
        // Calculate position for new node
        const existingCount = w.nodes.length
        const col = existingCount % 3
        const row = Math.floor(existingCount / 3)
        const newNode = {
          id: compId,
          type: 'builderNode',
          position: { x: 100 + col * 300, y: 80 + row * 250 },
          data: { name, manager, sla, componentId: compId }
        }
        return {
          ...w,
          components: [...w.components, component],
          nodes: [...w.nodes, newNode],
          updatedAt: new Date().toISOString()
        }
      })
    )
    return compId
  }, [])

  const updateComponent = useCallback((workflowId, componentId, updates) => {
    setWorkflows(prev =>
      prev.map(w => {
        if (w.id !== workflowId) return w
        return {
          ...w,
          components: w.components.map(c =>
            c.id === componentId ? { ...c, ...updates } : c
          ),
          nodes: w.nodes.map(n =>
            n.id === componentId
              ? { ...n, data: { ...n.data, ...updates, componentId } }
              : n
          ),
          updatedAt: new Date().toISOString()
        }
      })
    )
  }, [])

  const removeComponent = useCallback((workflowId, componentId) => {
    setWorkflows(prev =>
      prev.map(w => {
        if (w.id !== workflowId) return w
        return {
          ...w,
          components: w.components.filter(c => c.id !== componentId),
          nodes: w.nodes.filter(n => n.id !== componentId),
          edges: w.edges.filter(e => e.source !== componentId && e.target !== componentId),
          updatedAt: new Date().toISOString()
        }
      })
    )
  }, [])

  const updateNodesAndEdges = useCallback((workflowId, nodes, edges) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === workflowId
          ? { ...w, nodes, edges, updatedAt: new Date().toISOString() }
          : w
      )
    )
  }, [])

  const getWorkflow = useCallback((id) => {
    return workflows.find(w => w.id === id) || null
  }, [workflows])

  const value = {
    workflows,
    activeWorkflowId,
    activeView,
    editingWorkflowId,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    renameWorkflow,
    selectWorkflow,
    openBuilder,
    saveWorkflow,
    addComponent,
    updateComponent,
    removeComponent,
    updateNodesAndEdges,
    getWorkflow,
    setActiveView,
    generateMetrics
  }

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}

export default WorkflowContext
