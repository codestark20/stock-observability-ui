import { useMemo, useState, useEffect, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType
} from 'reactflow'
import 'reactflow/dist/style.css'

import DashboardNode from './DashboardNode'
import NodeDetailPanel from './NodeDetailPanel'
import SystemHealthPanel from './SystemHealthPanel'
import IncidentTimeline from './IncidentTimeline'
import TraceTimelinePanel from './TraceTimelinePanel'
import { useWorkflow } from '../context/WorkflowContext'

const nodeTypes = { dashboardNode: DashboardNode }

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })
}

let eventIdCounter = 0
function createEvent(message, severity) {
  return {
    id: String(++eventIdCounter),
    time: formatTime(new Date()),
    message,
    severity
  }
}

function generateMetrics(name, sla) {
  const seed = name.length * 7 + (sla?.length || 0) * 3
  return {
    latency: `${5 + (seed % 80)}ms`,
    tps: `${10 + (seed % 40)}k/sec`,
    cpu: `${15 + (seed % 55)}%`
  }
}

export default function WorkflowDashboard() {
  const { activeWorkflowId, getWorkflow, openBuilder } = useWorkflow()
  const workflow = getWorkflow(activeWorkflowId)

  const [runtimeComponents, setRuntimeComponents] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [incidentEvents, setIncidentEvents] = useState([])
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Trace Mode State
  const [traceIdSearch, setTraceIdSearch] = useState('')
  const [activeTraceId, setActiveTraceId] = useState(null)
  const [tracePath, setTracePath] = useState([])
  const [traceLogs, setTraceLogs] = useState([])

  // Initialize runtime state from workflow
  useEffect(() => {
    if (!workflow) return
    setRuntimeComponents(
      workflow.components.map(comp => ({
        ...comp,
        status: 'healthy',
        ...generateMetrics(comp.name, comp.sla)
      }))
    )
    setSelectedNodeId(null)
    setIncidentEvents([])
    setAlertDismissed(false)
    setActiveTraceId(null)
    setTracePath([])
    setTraceLogs([])
  }, [workflow?.id, workflow?.updatedAt])

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !workflow) return null
    const comp = runtimeComponents.find(c => c.id === selectedNodeId)
    if (!comp) return null
    return { id: comp.id, data: { label: comp.name, manager: comp.manager, sla: comp.sla, linkUsage: comp.linkUsage || '', status: comp.status, latency: comp.latency, tps: comp.tps, cpu: comp.cpu } }
  }, [selectedNodeId, runtimeComponents, workflow])

  const transactionRate = runtimeComponents.some(c => c.status === 'critical')
    ? 92.3
    : runtimeComponents.some(c => c.status === 'warning')
    ? 95.1
    : 99.7

  const isCritical = transactionRate < 95

  const addEvent = useCallback((message, severity) => {
    setIncidentEvents(prev => [createEvent(message, severity), ...prev].slice(0, 50))
  }, [])

  const simulateTrace = useCallback((e) => {
    e.preventDefault()
    if (!traceIdSearch.trim() || !workflow) return
    const id = traceIdSearch.trim()
    setActiveTraceId(id)
    setTraceIdSearch('')
    
    const nodes = workflow.nodes || []
    const edges = workflow.edges || []
    if (nodes.length === 0) return
    
    // Find start node
    const startNodes = nodes.filter(n => n.data?.role === 'start')
    const startNode = startNodes.length > 0 ? startNodes[0] : nodes[0]
    
    const path = [startNode.id]
    const logs = []
    let currentNodeId = startNode.id
    let timeOffset = 0
    
    const generateLog = (nodeId) => {
      const comp = runtimeComponents.find(c => c.id === nodeId)
      const now = new Date()
      now.setSeconds(now.getSeconds() - (15 - timeOffset))
      logs.push({
        nodeName: comp?.name || 'Unknown',
        time: formatTime(now),
        message: comp?.status === 'healthy' ? 'Processed successfully' : 'Processing degraded',
        status: comp?.status || 'healthy',
        duration: Math.floor(Math.random() * 80) + 20
      })
      timeOffset += 3
    }
    
    // Generate a path of up to 4 nodes
    for(let i = 0; i < 4; i++) {
      const outEdges = edges.filter(edge => edge.source === currentNodeId)
      if (outEdges.length === 0) break
      const randomEdge = outEdges[Math.floor(Math.random() * outEdges.length)]
      currentNodeId = randomEdge.target
      path.push(currentNodeId)
    }
    
    setTracePath(path)
    path.forEach(nodeId => generateLog(nodeId))
    setTraceLogs(logs)
  }, [traceIdSearch, workflow, runtimeComponents])

  // Build ReactFlow nodes from runtime state
  const flowNodes = useMemo(() => {
    if (!workflow) return []
    return (workflow.nodes || []).map(n => {
      const comp = runtimeComponents.find(c => c.id === n.id)
      if (!comp) return null
      return {
        ...n,
        type: 'dashboardNode',
        data: {
          label: comp.name,
          manager: comp.manager,
          sla: comp.sla,
          role: n.data?.role || comp.role || 'intermediate',
          linkUsage: n.data?.linkUsage || comp.linkUsage || '',
          status: comp.status,
          latency: comp.latency,
          tps: comp.tps,
          cpu: comp.cpu,
          selected: n.id === selectedNodeId,
          isTraceMode: !!activeTraceId,
          inTracePath: activeTraceId ? tracePath.includes(n.id) : false
        }
      }
    }).filter(Boolean)
  }, [workflow, runtimeComponents, selectedNodeId, activeTraceId, tracePath])

  // Build edges with styling
  const flowEdges = useMemo(() => {
    if (!workflow) return []
    return (workflow.edges || []).map(e => {
      const sourceComp = runtimeComponents.find(c => c.id === e.source)
      const targetComp = runtimeComponents.find(c => c.id === e.target)
      let color = '#00f0ff'
      if (sourceComp?.status === 'critical' || targetComp?.status === 'critical') color = '#f87171'
      else if (sourceComp?.status === 'warning' || targetComp?.status === 'warning') color = '#fbbf24'

      const direction = e.data?.direction || 'one-way'
      const commonLink = workflow.commonLink || ''
      const inTracePath = activeTraceId ? tracePath.includes(e.source) && tracePath.includes(e.target) : false
      const opacity = activeTraceId && !inTracePath ? 0.2 : 1

      const edgeConfig = {
        ...e,
        animated: true,
        type: 'smoothstep',
        className: activeTraceId && inTracePath ? 'edge-in-trace' : '',
        style: { strokeWidth: 5, stroke: color, opacity },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 28, height: 28, strokeWidth: 1 },
        label: commonLink || undefined,
        labelStyle: commonLink ? { fill: '#e2e8f0', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif', opacity } : undefined,
        labelBgStyle: commonLink ? { fill: '#1e293b', fillOpacity: 0.95 * opacity } : undefined,
        labelBgPadding: commonLink ? [8, 4] : undefined,
        labelBgBorderRadius: 6
      }
      if (direction === 'two-way') {
        edgeConfig.markerStart = { type: MarkerType.ArrowClosed, color, width: 28, height: 28, strokeWidth: 1, orient: 'auto-start-reverse' }
      }
      return edgeConfig
    })
  }, [workflow, runtimeComponents, activeTraceId, tracePath])

  // Health panel nodes format
  const healthNodes = useMemo(() =>
    runtimeComponents.map(c => ({
      id: c.id,
      data: { label: c.name, status: c.status, latency: c.latency, tps: c.tps, cpu: c.cpu, manager: c.manager, sla: c.sla }
    })),
    [runtimeComponents]
  )

  // Simulate incident: randomly degrade 1-2 components
  const simulateIncident = useCallback(() => {
    if (runtimeComponents.length === 0) return
    setAlertDismissed(false)

    const shuffled = [...runtimeComponents].sort(() => Math.random() - 0.5)
    const primary = shuffled[0]
    const secondary = shuffled[1]

    setRuntimeComponents(prev => prev.map(c => {
      if (c.id === primary.id) {
        return { ...c, status: 'critical', latency: `${200 + Math.floor(Math.random() * 300)}ms`, cpu: `${85 + Math.floor(Math.random() * 14)}%` }
      }
      if (secondary && c.id === secondary.id) {
        return { ...c, status: 'warning', latency: `${100 + Math.floor(Math.random() * 150)}ms` }
      }
      return c
    }))

    setSelectedNodeId(primary.id)
    addEvent(`<strong>${primary.name}</strong> entered CRITICAL state — SLA breach (${primary.sla || 'N/A'})`, 'critical')
    if (secondary) {
      addEvent(`<strong>${secondary.name}</strong> degraded — upstream dependency failure`, 'warning')
    }
  }, [runtimeComponents, addEvent])

  // Actions
  const restartService = useCallback(() => {
    if (!selectedNode) return
    const label = selectedNode.data.label
    addEvent(`<strong>${label}</strong> restart initiated`, 'info')
    setRuntimeComponents(prev => prev.map(c =>
      c.id === selectedNodeId ? { ...c, status: 'warning' } : c
    ))
    setTimeout(() => {
      setRuntimeComponents(prev => prev.map(c => {
        if (c.id === selectedNodeId) {
          return { ...c, status: 'healthy', ...generateMetrics(c.name, c.sla) }
        }
        if (c.status === 'warning') {
          return { ...c, status: 'healthy', ...generateMetrics(c.name, c.sla) }
        }
        return c
      }))
      addEvent(`<strong>${label}</strong> recovered — service healthy`, 'healthy')
    }, 1500)
  }, [selectedNode, selectedNodeId, addEvent])

  const pauseService = useCallback(() => {
    if (!selectedNode) return
    setRuntimeComponents(prev => prev.map(c =>
      c.id === selectedNodeId ? { ...c, status: 'paused' } : c
    ))
    addEvent(`<strong>${selectedNode.data.label}</strong> paused by operator`, 'info')
  }, [selectedNode, selectedNodeId, addEvent])

  const scaleService = useCallback(() => {
    if (!selectedNode) return
    setRuntimeComponents(prev => prev.map(c => {
      if (c.id !== selectedNodeId) return c
      const newCpu = Math.max(20, parseInt(c.cpu) - 20) + '%'
      const newLat = Math.max(5, Math.round(parseInt(c.latency) * 0.6)) + 'ms'
      return { ...c, cpu: newCpu, latency: newLat }
    }))
    addEvent(`<strong>${selectedNode.data.label}</strong> scaled — resources increased`, 'healthy')
  }, [selectedNode, selectedNodeId, addEvent])

  const resetAll = useCallback(() => {
    if (!workflow) return
    setRuntimeComponents(
      workflow.components.map(comp => ({
        ...comp,
        status: 'healthy',
        ...generateMetrics(comp.name, comp.sla)
      }))
    )
    setSelectedNodeId(null)
    setAlertDismissed(false)
    setIncidentEvents([])
    setActiveTraceId(null)
    setTracePath([])
    setTraceLogs([])
    addEvent('System reset — all services restored to baseline', 'healthy')
  }, [workflow, addEvent])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedNodeId(null)
      if ((e.key === 'r' || e.key === 'R') && selectedNode && e.target.tagName !== 'INPUT') {
        restartService()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNode, restartService])

  if (!workflow) {
    return (
      <div className="welcome-page">
        <div className="welcome-icon">⚠️</div>
        <h2>Workflow not found</h2>
      </div>
    )
  }

  if (runtimeComponents.length === 0) {
    return (
      <div className="welcome-page">
        <div className="welcome-icon">📋</div>
        <h2>{workflow.name}</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>This workflow has no components yet.</p>
        <button className="btn btn--primary" style={{ marginTop: '16px' }} onClick={() => openBuilder(workflow.id)}>
          Open Builder
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div>
            <div className="header-title">{workflow.name}</div>
            <div className="header-subtitle">Live Monitoring</div>
          </div>
          {workflow.commonLink && (
            <div className="common-link-badge">
              🔗 {workflow.commonLink}
            </div>
          )}
        </div>

        <div className="header-center" style={{ flex: 2, display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <div className="live-clock">
            <span className="live-clock-dot" />
            {formatTime(currentTime)}
          </div>
          <div className={`tx-rate-card ${isCritical ? 'tx-rate-card--critical' : 'tx-rate-card--ok'}`}>
            <div>
              <div className="tx-rate-label">Txn Success Rate</div>
              <div className={`tx-rate-value ${isCritical ? 'tx-rate-value--critical' : 'tx-rate-value--ok'}`}>
                {transactionRate}%
              </div>
            </div>
          </div>
          <form className="trace-search-form" onSubmit={simulateTrace}>
            <input 
              className="trace-search-input" 
              placeholder="Track Entity (e.g. ORD-123)" 
              value={traceIdSearch}
              onChange={e => setTraceIdSearch(e.target.value)}
            />
            <button type="submit" className="trace-search-btn">🔍 Track</button>
          </form>
        </div>

        <div className="header-actions">
          <button className="btn btn--danger btn--sm" onClick={simulateIncident}>
            🔴 Simulate Incident
          </button>
          <button className="btn btn--ghost btn--sm" onClick={resetAll}>
            ↺ Reset
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => openBuilder(workflow.id)}>
            ✏️ Edit
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {isCritical && !alertDismissed && (
        <div className="alert-banner">
          <div className="alert-banner-content">
            <span>🚨</span>
            <span>CRITICAL INCIDENT — Transaction success rate below SLA threshold</span>
          </div>
          <button className="alert-banner-dismiss" onClick={() => setAlertDismissed(true)}>Dismiss</button>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Left Panel */}
        <div className="panel panel--left">
          {activeTraceId ? (
            <TraceTimelinePanel 
              traceId={activeTraceId} 
              logs={traceLogs} 
              onClose={() => setActiveTraceId(null)} 
            />
          ) : (
            <>
              <div className="panel-header">
                <span className="panel-title">System Health</span>
              </div>
              <div className="panel-body">
                <SystemHealthPanel nodes={healthNodes} onNodeSelect={setSelectedNodeId} />
                <div className="divider" />
                <div className="section-label">Incident Log</div>
                <IncidentTimeline events={incidentEvents} />
              </div>
            </>
          )}
        </div>

        {/* Center Graph */}
        <div className="graph-canvas">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(148, 163, 184, 0.06)" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const colors = { healthy: '#22c55e', warning: '#f59e0b', critical: '#ef4444', paused: '#6b7280' }
                return colors[node.data?.status] || '#38bdf8'
              }}
              maskColor="rgba(2, 6, 23, 0.8)"
            />
          </ReactFlow>
        </div>

        {/* Right Panel */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onRestart={restartService}
            onPause={pauseService}
            onScale={scaleService}
          />
        )}
      </div>
    </div>
  )
}
