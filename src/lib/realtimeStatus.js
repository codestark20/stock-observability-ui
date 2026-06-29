const listeners = new Set();
let currentStatus = 'connected'; // 'connected' | 'reconnecting' | 'failed'
let lastUpdated = Date.now();
let failTimer = null;

export function getStatus() {
  return { status: currentStatus, lastUpdated };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(status) {
  currentStatus = status;
  lastUpdated = Date.now();
  listeners.forEach(fn => fn({ status, lastUpdated }));
}

export function onSocketEvent(event) {
  if (event === 'open' || event === 'reconnected') {
    clearTimeout(failTimer);
    emit('connected');
  } else if (event === 'close' || event === 'error') {
    emit('reconnecting');
    // Escalate to failed after 15 seconds of no recovery
    failTimer = setTimeout(() => emit('failed'), 15000);
  }
}
