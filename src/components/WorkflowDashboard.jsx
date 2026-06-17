import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
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
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { fetchEntityTrace } from '../lib/api'

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
  const { activeWorkflowId, getWorkflow, openBuilder, setActiveView } = useWorkflow()
  const workflow = getWorkflow(activeWorkflowId)

  // Runtime State
  const [runtimeComponents, setRuntimeComponents] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [incidentEvents, setIncidentEvents] = useState([])
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [globalAlert, setGlobalAlert] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Trace Mode State
  const [traceIdSearch, setTraceIdSearch] = useState('')
  const [activeTraceId, setActiveTraceId] = useState(null)
  const [tracePath, setTracePath] = useState([])
  const [traceLogs, setTraceLogs] = useState([])

  // Layout State
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  // Realtime subscription ref
  const realtimeChannel = useRef(null)
  const alertChannel = useRef(null)

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
    setGlobalAlert(null)
    setActiveTraceId(null)
    setTracePath([])
    setTraceLogs([])
  }, [workflow?.id, workflow?.updatedAt])

  // ── Supabase Realtime Subscription ──────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !activeWorkflowId) return

    // Subscribe to new events for this workflow
    const channel = supabase
      .channel(`events-${activeWorkflowId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `workflow_id=eq.${activeWorkflowId}`
        },
        (payload) => {
          const event = payload.new
          handleRealEvent(event)
        }
      )
      .subscribe()

    // Subscribe to global alerts for this workflow
    const aChannel = supabase
      .channel(`alerts-${activeWorkflowId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `workflow_id=eq.${activeWorkflowId}`
        },
        (payload) => {
          setGlobalAlert(payload.new)
        }
      )
      .subscribe()

    realtimeChannel.current = channel
    alertChannel.current = aChannel

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
        realtimeChannel.current = null
      }
      if (alertChannel.current) {
        supabase.removeChannel(alertChannel.current)
        alertChannel.current = null
      }
    }
  }, [activeWorkflowId])

  // Handle incoming real events from Supabase Realtime
  const handleRealEvent = useCallback((event) => {
    // Update component status based on the real event
    setRuntimeComponents(prev => prev.map(c => {
      if (c.id !== event.component_id) return c
      return {
        ...c,
        status: event.status || c.status,
        latency: event.duration_ms ? `${event.duration_ms}ms` : c.latency
      }
    }))

    // Add to incident log
    const severity = event.status === 'critical' ? 'critical'
      : event.status === 'warning' ? 'warning'
      : event.status === 'failed' ? 'critical'
      : 'healthy'

    const comp = runtimeComponents.find(c => c.id === event.component_id)
    const compName = comp?.name || event.component_id

    setIncidentEvents(prev => [
      createEvent(
        `<strong>${compName}</strong> — ${event.message || event.status} (${event.entity_id})`,
        severity
      ),
      ...prev
    ].slice(0, 50))

    // If in trace mode and this event matches the traced entity, update trace
    if (activeTraceId && event.entity_id === activeTraceId) {
      setTraceLogs(prev => [...prev, {
        nodeName: compName,
        time: formatTime(new Date(event.created_at)),
        message: event.message || 'Processed',
        status: event.status || 'healthy',
        duration: event.duration_ms || 0,
        action: event.action || '',
        method: event.method || 'POST',
        statusCode: event.status_code || 200,
        metadata: event.metadata || {}
      }])

      // Add to trace path
      setTracePath(prev => prev.includes(event.component_id) ? prev : [...prev, event.component_id])
    }
  }, [runtimeComponents, activeTraceId])

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

  // ── Trace: Try real API first, fallback to simulation ──
  const performTrace = useCallback(async (e) => {
    e.preventDefault()
    if (!traceIdSearch.trim() || !workflow) return
    const id = traceIdSearch.trim()
    setActiveTraceId(id)
    setTraceIdSearch('')

    // Try fetching real trace data from the API
    try {
      const events = await fetchEntityTrace(activeWorkflowId, id)
      if (events && events.length > 0) {
        // Real data exists! Use it.
        const path = []
        const logs = events.map(event => {
          if (!path.includes(event.component_id)) path.push(event.component_id)
          const comp = runtimeComponents.find(c => c.id === event.component_id)
          return {
            nodeName: comp?.name || event.component_id,
            time: formatTime(new Date(event.created_at)),
            message: event.message || 'Processed',
            status: event.status || 'healthy',
            duration: event.duration_ms || 0,
            action: event.action || '',
            method: event.method || 'POST',
            statusCode: event.status_code || 200,
            metadata: event.metadata || {}
          }
        })
        setTracePath(path)
        setTraceLogs(logs)
        return
      }
    } catch (err) {
      console.warn('Real trace unavailable, using simulation:', err.message)
    }

    // Fallback: simulate trace (demo mode)
    simulateTraceFallback(id)
  }, [traceIdSearch, workflow, activeWorkflowId, runtimeComponents])

  // Simulation fallback for demo purposes
  const simulateTraceFallback = useCallback((id) => {
    const nodes = workflow.nodes || []
    const edges = workflow.edges || []
    if (nodes.length === 0) return

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

      const isNodeCritical = comp?.status === 'critical'
      const isWarning = comp?.status === 'warning'

      let statusCode = 200
      let method = 'POST'
      let message = 'Processed successfully'

      if (isNodeCritical) {
        statusCode = 503
        message = 'Service Unavailable - Connection Timeout'
      } else if (isWarning) {
        statusCode = 429
        message = 'Rate Limited - Degraded Performance'
      }

      const actions = ['/api/v1/process', '/api/v2/validate', 'DB Query', 'Cache Read', 'RPC Invoke']
      const action = actions[Math.floor(Math.random() * actions.length)]
      const methods = action.includes('Query') || action.includes('Read') ? ['GET'] : ['POST', 'PUT', 'GRPC']
      method = methods[Math.floor(Math.random() * methods.length)]

      const metadata = {
        region: ['us-east-1', 'eu-central-1', 'ap-south-1'][Math.floor(Math.random() * 3)],
        host: `ip-10-0-${Math.floor(Math.random() * 255)}-${Math.floor(Math.random() * 255)}`,
      }
      if (isNodeCritical) metadata.error_code = 'ERR_TIMEOUT'
      if (isWarning) metadata.retry_count = Math.floor(Math.random() * 3) + 1

      logs.push({
        nodeName: comp?.name || 'Unknown',
        time: formatTime(now),
        message,
        status: comp?.status || 'healthy',
        duration: isNodeCritical ? 5000 : isWarning ? Math.floor(Math.random() * 800) + 200 : Math.floor(Math.random() * 80) + 20,
        action,
        method,
        statusCode,
        metadata
      })
      timeOffset += 3
    }

    for (let i = 0; i < 4; i++) {
      const outEdges = edges.filter(edge => edge.source === currentNodeId)
      if (outEdges.length === 0) break
      const randomEdge = outEdges[Math.floor(Math.random() * outEdges.length)]
      currentNodeId = randomEdge.target
      path.push(currentNodeId)
    }

    setTracePath(path)
    path.forEach(nodeId => generateLog(nodeId))
    setTraceLogs(logs)
  }, [workflow, runtimeComponents])

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
      {/* Global Alert Toast */}
      {globalAlert && (
        <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#ef4444', color: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '16px', animation: 'slideDown 0.3s ease-out' }}>
          <div style={{ fontSize: '24px' }}>🚨</div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CRITICAL ALERT</div>
            <div style={{ fontSize: '13px' }}>{globalAlert.message}</div>
          </div>
          <button 
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginLeft: '12px' }}
            onClick={() => setGlobalAlert(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div style={{ minWidth: 0 }}>
            <div className="header-title">{workflow.name}</div>
            <div className="header-subtitle">
              Live Monitoring
              {isSupabaseEnabled && <span className="realtime-badge" title="Connected to Supabase Realtime"> 🟢 Live</span>}
            </div>
          </div>
          {workflow.commonLink && (
            <div className="common-link-badge" title={workflow.commonLink}>
              🔗 {workflow.commonLink}
            </div>
          )}
        </div>

        <div className="header-center">

          <div className={`tx-rate-card ${isCritical ? 'tx-rate-card--critical' : 'tx-rate-card--ok'}`}>
            <div>
              <div className="tx-rate-label">Txn Success Rate</div>
              <div className={`tx-rate-value ${isCritical ? 'tx-rate-value--critical' : 'tx-rate-value--ok'}`}>
                {transactionRate}%
              </div>
            </div>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setActiveView('analytics')}>
            📊 Analytics
          </button>
          <button className="btn btn--danger btn--sm" onClick={simulateIncident}>
            🔴 Simulate Incident
          </button>
          <button className="btn btn--ghost btn--sm" onClick={resetAll}>
            ↺ Reset
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => openBuilder(workflow.id)}>
            ✏️ Edit Layout
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
        {isPanelOpen && (
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
                  <button className="panel-close-btn" onClick={() => setIsPanelOpen(false)}>✕</button>
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
        )}

        {/* Center Graph */}
        <div className="graph-canvas">
          {/* Canvas Overlays */}
          <div className="canvas-overlays">
            {!isPanelOpen && (
              <button className="btn btn--ghost btn--sm panel-toggle-btn" onClick={() => setIsPanelOpen(true)}>
                ◧ Show Health Panel
              </button>
            )}
            
            <form className="trace-search-form canvas-search-form" onSubmit={e => {
               performTrace(e)
               if (!isPanelOpen && traceIdSearch.trim()) setIsPanelOpen(true)
            }}>
              <input 
                className="trace-search-input" 
                placeholder="Track Entity (e.g. ORD-123)" 
                value={traceIdSearch}
                onChange={e => setTraceIdSearch(e.target.value)}
              />
              <button type="submit" className="trace-search-btn">🔍 Track</button>
            </form>
          </div>

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
