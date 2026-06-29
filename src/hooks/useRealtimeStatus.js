import { useEffect, useState } from 'react';
import { getStatus, subscribe } from '../lib/realtimeStatus';

export function useRealtimeStatus() {
  const [state, setState] = useState(getStatus);

  useEffect(() => {
    const unsub = subscribe(setState);
    return unsub;
  }, []);

  const secondsAgo = Math.floor((Date.now() - state.lastUpdated) / 1000);
  const staleness = secondsAgo < 5
    ? 'just now'
    : secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  return { ...state, staleness };
}
