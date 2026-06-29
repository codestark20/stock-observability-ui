const DEFAULT_LIMITS = {
  traces: { burst: 500, sustained: 200, windowMs: 60000 },
  metrics: { burst: 300, sustained: 100, windowMs: 60000 },
  logs:   { burst: 500, sustained: 200, windowMs: 60000 },
};

// Per-plan overrides — keyed by tenants.plan value
const PLAN_OVERRIDES = {
  enterprise: {
    traces: { burst: 2000, sustained: 1000, windowMs: 60000 },
    metrics: { burst: 1000, sustained: 500,  windowMs: 60000 },
    logs:   { burst: 2000, sustained: 1000, windowMs: 60000 },
  },
  starter: DEFAULT_LIMITS,
};

export function getLimits(plan = 'starter', endpoint = 'traces') {
  const planLimits = PLAN_OVERRIDES[plan] ?? DEFAULT_LIMITS;
  return planLimits[endpoint] ?? DEFAULT_LIMITS[endpoint];
}
