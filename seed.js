const ENDPOINT = "https://stock-observability-ui.vercel.app/api/workflows";

function generateId(prefix = 'wf') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function generateCompId() {
  return generateId('comp');
}

// Generate realistic simulated metrics for a component
function generateMetrics(name, sla) {
  const seed = name.length * 7 + (sla?.length || 0) * 3;
  const latency = 5 + (seed % 80);
  const tps = 10 + (seed % 40);
  const cpu = 15 + (seed % 55);
  return {
    latency: `${latency}ms`,
    tps: `${tps}k/sec`,
    cpu: `${cpu}%`
  };
}

function makeComponent(name, manager, sla, role, linkUsage) {
  const id = generateCompId();
  return {
    id,
    name,
    manager,
    sla,
    role,
    linkUsage,
    ...generateMetrics(name, sla)
  };
}

function makeNode(comp, x, y) {
  return {
    id: comp.id,
    type: 'builderNode',
    position: { x, y },
    data: {
      name: comp.name,
      manager: comp.manager,
      sla: comp.sla,
      role: comp.role,
      linkUsage: comp.linkUsage,
      componentId: comp.id
    }
  };
}

function makeEdge(sourceComp, targetComp) {
  return {
    id: `edge-${Date.now()}-${Math.random()}`,
    source: sourceComp.id,
    target: targetComp.id,
    data: { direction: 'one-way' }
  };
}

async function createWorkflow(workflowPayload) {
  console.log(`Creating workflow: ${workflowPayload.name}`);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowPayload)
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to create ${workflowPayload.name}: ${err}`);
  } else {
    console.log(`Successfully created ${workflowPayload.name}`);
  }
}

async function seed() {
  // ── Workflow 1: User Authentication Flow ─────────────────
  const w1_id = generateId();
  const c1_frontend = makeComponent("Web App Frontend", "Frontend Team", "99.9%", "start", "Passes User ID in headers");
  const c1_auth = makeComponent("Auth Gateway", "Security", "99.99%", "intermediate", "Validates JWT for User ID");
  const c1_db = makeComponent("User Database", "Data Team", "99.95%", "intermediate", "Fetches profile for User ID");
  const c1_email = makeComponent("Email Service", "Platform", "99.0%", "end", "Sends alert to User ID");

  const w1_payload = {
    id: w1_id,
    name: "User Authentication Flow",
    commonLink: "User ID",
    components: [c1_frontend, c1_auth, c1_db, c1_email],
    nodes: [
      makeNode(c1_frontend, 100, 100),
      makeNode(c1_auth, 400, 100),
      makeNode(c1_db, 400, 400),
      makeNode(c1_email, 700, 100)
    ],
    edges: [
      makeEdge(c1_frontend, c1_auth),
      makeEdge(c1_auth, c1_db),
      makeEdge(c1_auth, c1_email)
    ]
  };

  // ── Workflow 2: Data Ingestion Pipeline ──────────────────
  const w2_id = generateId();
  const c2_collector = makeComponent("Data Collector API", "Ingestion Team", "99.9%", "start", "Receives Batch ID");
  const c2_kafka = makeComponent("Kafka Stream", "Infra", "99.99%", "intermediate", "Queues Batch ID");
  const c2_processor = makeComponent("Spark Processor", "Data Eng", "99.5%", "intermediate", "Transforms Batch ID");
  const c2_warehouse = makeComponent("Snowflake DW", "Data Eng", "99.9%", "end", "Stores Batch ID records");

  const w2_payload = {
    id: w2_id,
    name: "Data Ingestion Pipeline",
    commonLink: "Batch ID",
    components: [c2_collector, c2_kafka, c2_processor, c2_warehouse],
    nodes: [
      makeNode(c2_collector, 100, 200),
      makeNode(c2_kafka, 400, 200),
      makeNode(c2_processor, 700, 200),
      makeNode(c2_warehouse, 1000, 200)
    ],
    edges: [
      makeEdge(c2_collector, c2_kafka),
      makeEdge(c2_kafka, c2_processor),
      makeEdge(c2_processor, c2_warehouse)
    ]
  };

  await createWorkflow(w1_payload);
  await createWorkflow(w2_payload);
  console.log("Done seeding workflows.");
}

seed().catch(console.error);
