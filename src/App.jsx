import { useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext'
import Sidebar from './components/Sidebar'
import WorkflowBuilder from './components/WorkflowBuilder'
import WorkflowDashboard from './components/WorkflowDashboard'
import ConnectionBanner from './components/ConnectionBanner'
import ReplayBar from './components/ReplayBar'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginPage from './auth/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'

function AuthGate({ children }) {
  // Auth temporarily disabled — re-enable by uncommenting below
  // const { session, loading } = useAuth();
  // if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-primary)' }}>Loading...</div>;
  // if (!session) return <LoginPage />;
  return children;
}

function WelcomePage() {
  const navigate = useNavigate()
  const { createWorkflow, saveWorkflow } = useWorkflow()

  const handleCreate = async () => {
    const id = await createWorkflow('Untitled Workflow')
    if (id) navigate(`/workflow/${id}/builder`)
  }

  const handleCreateDemo = useCallback(async () => {
    const id = await createWorkflow('Employee Onboarding')
    if (!id) return

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

    navigate(`/workflow/${id}/dashboard`)
  }, [createWorkflow, saveWorkflow, navigate])

  const handleCreateStockDemo = useCallback(async () => {
    const id = await createWorkflow('Order Fulfillment Pipeline')
    if (!id) return

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
      name: 'Order Fulfillment Pipeline',
      commonLink: 'Trade ID',
      components,
      nodes,
      edges
    })

    navigate(`/workflow/${id}/dashboard`)
  }, [createWorkflow, saveWorkflow, navigate])

  const handleCreateICCLDemo = useCallback(async () => {
    const id = await createWorkflow('T+1 Settlement Pipeline')
    if (!id) return

    const components = [
      { id: 'demo_iccl_trade', name: 'Trade Ingestion', manager: 'BSE Link', sla: '99.99%', role: 'start', linkUsage: 'Validates raw trade from exchange', latency: '2ms', tps: '150k/sec', cpu: '20%' },
      { id: 'demo_iccl_netting', name: 'Netting Engine', manager: 'Clearing Ops', sla: '99.95%', role: 'intermediate', linkUsage: 'Calculates net obligations per broker', latency: '45ms', tps: '80k/sec', cpu: '65%' },
      { id: 'demo_iccl_margin', name: 'Risk & Margin', manager: 'Risk Dept', sla: '99.9%', role: 'intermediate', linkUsage: 'Validates collateral vs obligations', latency: '15ms', tps: '80k/sec', cpu: '40%' },
      { id: 'demo_iccl_depository', name: 'Depositories', manager: 'CDSL/NSDL', sla: '< 500ms', role: 'intermediate', linkUsage: 'Transfers securities for Settlement No', latency: '250ms', tps: '10k/sec', cpu: '30%' },
      { id: 'demo_iccl_bank', name: 'Clearing Banks', manager: 'Banking Ops', sla: '99.5%', role: 'end', linkUsage: 'Transfers funds for Settlement No', latency: '120ms', tps: '5k/sec', cpu: '45%' }
    ]

    const nodes = [
      { id: 'demo_iccl_trade', type: 'builderNode', position: { x: 350, y: 0 }, data: { name: 'Trade Ingestion', manager: 'BSE Link', sla: '99.99%', role: 'start', linkUsage: 'Validates raw trade from exchange', componentId: 'demo_iccl_trade' } },
      { id: 'demo_iccl_netting', type: 'builderNode', position: { x: 350, y: 280 }, data: { name: 'Netting Engine', manager: 'Clearing Ops', sla: '99.95%', role: 'intermediate', linkUsage: 'Calculates net obligations per broker', componentId: 'demo_iccl_netting' } },
      { id: 'demo_iccl_margin', type: 'builderNode', position: { x: 50, y: 280 }, data: { name: 'Risk & Margin', manager: 'Risk Dept', sla: '99.9%', role: 'intermediate', linkUsage: 'Validates collateral vs obligations', componentId: 'demo_iccl_margin' } },
      { id: 'demo_iccl_depository', type: 'builderNode', position: { x: 200, y: 560 }, data: { name: 'Depositories', manager: 'CDSL/NSDL', sla: '< 500ms', role: 'intermediate', linkUsage: 'Transfers securities for Settlement No', componentId: 'demo_iccl_depository' } },
      { id: 'demo_iccl_bank', type: 'builderNode', position: { x: 500, y: 560 }, data: { name: 'Clearing Banks', manager: 'Banking Ops', sla: '99.5%', role: 'end', linkUsage: 'Transfers funds for Settlement No', componentId: 'demo_iccl_bank' } }
    ]

    const edges = [
      { id: 'e_trade_netting', source: 'demo_iccl_trade', target: 'demo_iccl_netting', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_trade_margin', source: 'demo_iccl_trade', target: 'demo_iccl_margin', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_netting_depository', source: 'demo_iccl_netting', target: 'demo_iccl_depository', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_netting_bank', source: 'demo_iccl_netting', target: 'demo_iccl_bank', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } },
      { id: 'e_margin_netting', source: 'demo_iccl_margin', target: 'demo_iccl_netting', sourceHandle: null, targetHandle: null, data: { direction: 'one-way' } }
    ]

    saveWorkflow(id, {
      name: 'T+1 Settlement Pipeline',
      commonLink: 'Settlement No',
      components,
      nodes,
      edges
    })

    navigate(`/workflow/${id}/dashboard`)
  }, [createWorkflow, saveWorkflow, navigate])

  return (
    <div className="welcome-page">
      <div className="welcome-icon">⚡</div>
      <h2 className="welcome-title">Nexus Observability</h2>
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
  )
}

function AppContent() {
  const { workflows, deleteWorkflow, duplicateWorkflow } = useWorkflow()
  const navigate = useNavigate()

  const sidebarWorkflows = workflows.map(wf => ({
    id: wf.id,
    name: wf.name,
    componentCount: wf.components?.length || 0,
    createdAt: wf.created_at || wf.createdAt,
    overallStatus: 'healthy'
  }))

  return (
    <div className="app-shell">
      <Sidebar
        workflows={sidebarWorkflows}
        onDeleteWorkflow={(id) => {
          deleteWorkflow(id)
          navigate('/')
        }}
        onDuplicateWorkflow={duplicateWorkflow}
      />

      <main className="app-main">
        <ConnectionBanner />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route 
            path="/workflow/:id/builder" 
            element={
              <ErrorBoundary onReset={() => navigate('/')}>
                <WorkflowBuilder />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="/workflow/:id/dashboard" 
            element={
              <ErrorBoundary onReset={() => navigate('/')}>
                <WorkflowDashboard />
                <ReplayBar />
              </ErrorBoundary>
            } 
          />
          <Route 
            path="/workflow/:id/analytics" 
            element={
              <ErrorBoundary onReset={() => navigate('/')}>
                <AnalyticsDashboard />
              </ErrorBoundary>
            } 
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <WorkflowProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </WorkflowProvider>
      </AuthGate>
    </AuthProvider>
  )
}