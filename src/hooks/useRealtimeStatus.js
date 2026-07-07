import { useEffect, useState } from 'react';
import { getStatus, subscribe } from '../lib/realtimeStatus';

export function useRealtimeStatus() {
  return { status: 'connected', staleness: 'just now', lastUpdated: Date.now() };
}
