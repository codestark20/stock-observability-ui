import { useRealtimeStatus } from '../hooks/useRealtimeStatus';

export default function StaleNodeOverlay({ children }) {
  const { status, staleness } = useRealtimeStatus();
  const isStale = status !== 'connected';

  return (
    <div style={{ position: 'relative' }}>
      {children}
      {isStale && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          border: '1px solid rgba(234, 179, 8, 0.4)',
          background: 'rgba(234, 179, 8, 0.04)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          padding: '4px 6px',
        }}>
          <span style={{ fontSize: 10, color: '#facc15', opacity: 0.8 }}>
            {staleness}
          </span>
        </div>
      )}
    </div>
  );
}
