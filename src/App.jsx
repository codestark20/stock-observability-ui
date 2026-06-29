import { useCallback } from 'react'
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext'
import Sidebar from './components/Sidebar'
import WorkflowBuilder from './components/WorkflowBuilder'
import WorkflowDashboard from './components/WorkflowDashboard'
import ConnectionBanner from './components/ConnectionBanner'
import ReplayBar from './components/ReplayBar'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginPage from './auth/LoginPage'

function AuthGate({ children }) {
  // Auth temporarily disabled — re-enable by uncommenting below
  // const { session, loading } = useAuth();
  // if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-primary)' }}>Loading...</div>;
  // if (!session) return <LoginPage />;
  return children;
}

function AppContent() {
  const {
    workflows,
    activeWorkflowId,
    activeView,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    selectWorkflow,
    openBuilder,
    saveWorkflow,
    setActiveView
  } = useWorkflow()

  const sidebarWorkflows = workflows.map(wf => ({
    id: wf.id,
    name: wf.name,
    componentCount: wf.components?.length || 0,
    createdAt: wf.created_at || wf.createdAt,
    overallStatus: 'healthy'
  }))

  const handleCreate = () => {
    createWorkflow('Untitled Workflow')
  }

  const handleCreateDemo = useCallback(() => {
    const id = createWorkflow('Employee Onboarding')

    // Pre-built components
    const components = [
      { id: 'demo_hr', name: 'HR Portal', manager: 'Priya Sharma', sla: '99.9%', role: 'start', linkUsage: 'Collects employee email during onboarding', latency: '12ms', tps: '5k/sec', cpu: '22%' },
      { id: 'demo_google', name: 'Google Workspace', manager: 'Rahul Mehta', sla: '99.95%', role: 'intermediate', linkUsage: 'Creates Gmail account using email', latency: '45ms', tps: '3k/sec', cpu: '35%' },
      { id: 'demo_company', name: 'Company ID System', manager: 'Anita Desai', sla: '99.5%', role: 'intermediate', linkUsage: 'Generates employee ID linked to email', latency: '30ms', tps: '4k/sec', cpu: '28%' },
      { id: 'demo_pf', name: 'PF Registration', manager: 'Vikram Singh', sla: '< 500ms', role: 'intermediate', linkUsage: 'Registers PF account using email as identifier', latency: '120ms', tps: '2k/sec', cpu: '45%' },
      { id: 'demo_it', name: 'IT Setup', manager: 'Sneha Patil', sla: '99.0%', role: 'end', linkUsage: 'Provisions laptop & VPN access using email', latency: '80ms', tps: '1k/sec', cpu: '55%' }
    ]

    const nodes = [
      { id: 'demo_hr', type: 'builderNode', position: { x: 350, y: 0 }, data: { name: 'HR Portal', manager: 'Priya Sharma', sla: '99.9%', role: 'start', linkUsage: 'Collects employee email during onboarding', componentId: 'demo_hr' } },
      { id: 'demo_google', type: 'builderNode', position: { x: 50, y: 280 }, data: { name: 'Google Workspace', manager: 'Rahul Mehta', sla: '99.95%', role: 'intermediate', linkUsage: 'Creates Gmail account using email', componentId: 'demo_google' } },
      { id: 'demo_company', type: 'builderNode', position: { x: 350, y: 280 }, data: { name: 'Company ID System', manager: 'Anita Desai', sla: '99.5%', role: 'intermediate', linkUsage: 'Generates employee ID linked to email', componentId: 'demo_company' } },
      { id: 'demo_pf', type: 'builderNode', position: { x: 650, y: 280 }, data: { name: 'PF Registration', manager: 'Vikram Singh', sla: '< 500ms', role: 'intermediate', linkUsage: 'Registers PF account using email as identifier', componentId: 'demo_pf' } },
      { id: 'demo_it', type: 'builderNode', position: { x: 350, y: 560 }, data: { name: 'IT Setup', manager: 'Sneha Patil', sla: '99.0%', role: 'end', linkUsage: 'Provisions laptop & VPN access using email', componentId: 'demo_it' } }
    ]

    const edges = [
      { id: 'e_hr_google', source: 'demo_hr', target: 'demo_google', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_hr_company', source: 'demo_hr', target: 'demo_company', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_hr_pf', source: 'demo_hr', target: 'demo_pf', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_company_it', source: 'demo_company', target: 'demo_it', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_google_it', source: 'demo_google', target: 'demo_it', sourceHandle: null, targetHandle: null, data: { direction: 'two-way' } }
    ]

    saveWorkflow(id, {
      name: 'Employee Onboarding',
      commonLink: 'Employee Email',
      components,
      nodes,
      edges
    })

    selectWorkflow(id)
  }, [createWorkflow, saveWorkflow, selectWorkflow])

  const handleCreateStockDemo = useCallback(() => {
    const id = createWorkflow('Stock Trade Execution')

    // Pre-built components
    const components = [
      { id: 'demo_order', name: 'Order Gateway', manager: 'Alex Trading', sla: '99.99%', role: 'start', linkUsage: 'Validates trade order and assigns Trade ID', latency: '5ms', tps: '15k/sec', cpu: '15%' },
      { id: 'demo_risk', name: 'Risk Engine', manager: 'Sarah Compliance', sla: '99.9%', role: 'intermediate', linkUsage: 'Checks margin requirements for Trade ID', latency: '12ms', tps: '15k/sec', cpu: '40%' },
      { id: 'demo_match', name: 'Matching Engine', manager: 'Core Engine Team', sla: '99.999%', role: 'intermediate', linkUsage: 'Matches buy/sell orders for Trade ID', latency: '2ms', tps: '50k/sec', cpu: '85%' },
      { id: 'demo_clear', name: 'Clearing House', manager: 'Finance', sla: '< 500ms', role: 'intermediate', linkUsage: 'Settles funds for Trade ID', latency: '150ms', tps: '10k/sec', cpu: '30%' },
      { id: 'demo_notify', name: 'Market Data Feed', manager: 'Data Team', sla: '99.5%', role: 'end', linkUsage: 'Broadcasts filled Trade ID to ticker', latency: '8ms', tps: '100k/sec', cpu: '60%' }
    ]

    const nodes = [
      { id: 'demo_order', type: 'builderNode', position: { x: 350, y: 0 }, data: { name: 'Order Gateway', manager: 'Alex Trading', sla: '99.99%', role: 'start', linkUsage: 'Validates trade order and assigns Trade ID', componentId: 'demo_order' } },
      { id: 'demo_risk', type: 'builderNode', position: { x: 50, y: 280 }, data: { name: 'Risk Engine', manager: 'Sarah Compliance', sla: '99.9%', role: 'intermediate', linkUsage: 'Checks margin requirements for Trade ID', componentId: 'demo_risk' } },
      { id: 'demo_match', type: 'builderNode', position: { x: 350, y: 280 }, data: { name: 'Matching Engine', manager: 'Core Engine Team', sla: '99.999%', role: 'intermediate', linkUsage: 'Matches buy/sell orders for Trade ID', componentId: 'demo_match' } },
      { id: 'demo_clear', type: 'builderNode', position: { x: 650, y: 280 }, data: { name: 'Clearing House', manager: 'Finance', sla: '< 500ms', role: 'intermediate', linkUsage: 'Settles funds for Trade ID', componentId: 'demo_clear' } },
      { id: 'demo_notify', type: 'builderNode', position: { x: 350, y: 560 }, data: { name: 'Market Data Feed', manager: 'Data Team', sla: '99.5%', role: 'end', linkUsage: 'Broadcasts filled Trade ID to ticker', componentId: 'demo_notify' } }
    ]

    const edges = [
      { id: 'e_order_risk', source: 'demo_order', target: 'demo_risk', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_order_match', source: 'demo_order', target: 'demo_match', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_risk_match', source: 'demo_risk', target: 'demo_match', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_match_clear', source: 'demo_match', target: 'demo_clear', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_match_notify', source: 'demo_match', target: 'demo_notify', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } }
    ]

    saveWorkflow(id, {
      name: 'Stock Trade Execution',
      commonLink: 'Trade ID',
      components,
      nodes,
      edges
    })

    selectWorkflow(id)
  }, [createWorkflow, saveWorkflow, selectWorkflow])

  return (
    <div className="app-shell">
      <Sidebar
        workflows={sidebarWorkflows}
        activeWorkflowId={activeWorkflowId}
        activeView={activeView}
        onCreateWorkflow={handleCreate}
        onSelectWorkflow={selectWorkflow}
        onEditWorkflow={openBuilder}
        onDeleteWorkflow={deleteWorkflow}
        onDuplicateWorkflow={duplicateWorkflow}
      />

      <main className="app-main">
        <ConnectionBanner />
        {activeView === 'builder' && <WorkflowBuilder />}
        {activeView === 'dashboard' && (
          <>
            <WorkflowDashboard />
            <ReplayBar workflowId={activeWorkflowId} />
          </>
        )}
        {activeView === 'analytics' && <AnalyticsDashboard workflow={workflows.find(w => w.id === activeWorkflowId)} onClose={() => setActiveView('dashboard')} />}
        {activeView === 'welcome' && (
          <div className="welcome-page">
            <div className="welcome-icon">⚡</div>
            <h2 className="welcome-title">Workflow Observability Platform</h2>
            <p className="welcome-text">
              Build custom workflows, define component SLAs, and monitor system health in real time.
            </p>
            <div className="welcome-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn--primary" onClick={handleCreate}>
                + Create Blank Workflow
              </button>
            </div>
            <div className="welcome-features">
              <div className="welcome-feature">
                <span className="welcome-feature-icon">🔧</span>
                <div className="welcome-feature-title">Build</div>
                <div className="welcome-feature-desc">Design custom workflows with drag-and-connect</div>
              </div>
              <div className="welcome-feature">
                <span className="welcome-feature-icon">📊</span>
                <div className="welcome-feature-title">Monitor</div>
                <div className="welcome-feature-desc">Real-time metrics, logs, and incident tracking</div>
              </div>
              <div className="welcome-feature">
                <span className="welcome-feature-icon">🚨</span>
                <div className="welcome-feature-title">Respond</div>
                <div className="welcome-feature-desc">Simulate incidents and manage service health</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <WorkflowProvider>
          <AppContent />
        </WorkflowProvider>
      </AuthGate>
    </AuthProvider>
  )
}