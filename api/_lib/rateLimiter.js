// In-memory store: Map<tenantId:endpoint, { tokens, lastRefill }>
const buckets = new Map();

export function checkRateLimit(tenantId, endpoint, limits) {
  const key = `${tenantId}:${endpoint}`;
  const now = Date.now();
  const { burst, sustained, windowMs } = limits;

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: burst, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on time elapsed
  const elapsed = now - bucket.lastRefill;
  const refillRate = sustained / windowMs; // tokens per ms
  bucket.tokens = Math.min(burst, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    // Calculate retry-after in seconds
    const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate / 1000);
    return { allowed: false, retryAfter };
  }

  bucket.tokens -= 1;
  return { allowed: true, retryAfter: 0 };
}
