import { useRealtimeStatus } from '../hooks/useRealtimeStatus';
import { supabase } from '../lib/supabase';
import '../styles/connectionBanner.css';

export default function ConnectionBanner() {
  const { status, staleness } = useRealtimeStatus();

  if (status === 'connected') return null;

  const handleRetry = () => supabase.realtime.connect();

  return (
    <div className={`connection-banner connection-banner--${status}`}>
      <span className="connection-banner__dot" />
      {status === 'reconnecting' && (
        <span>Reconnecting to live data… Last updated {staleness}</span>
      )}
      {status === 'failed' && (
        <>
          <span>Live connection lost. Data may be stale.</span>
          <button onClick={handleRetry} className="connection-banner__retry">
            Retry
          </button>
        </>
      )}
    </div>
  );
}
