import { useState, useEffect } from 'react';
import { useWorkflow } from '../context/WorkflowContext';

export function useReplayData(workflowId) {
  const { replayMode, replayTimestamp } = useWorkflow();
  const [snapshot, setSnapshot] = useState(null);
  const [traces, setTraces] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!replayMode || !replayTimestamp) {
      setSnapshot(null);
      setTraces(null);
      return;
    }

    setLoading(true);

    const params = new URLSearchParams({ timestamp: replayTimestamp });

    Promise.all([
      fetch(`/api/workflows/${workflowId}/snapshot?${params}`).then(r => r.json()),
      fetch(`/api/workflows/${workflowId}/replay-traces?${params}`).then(r => r.json()),
    ]).then(([snapshotData, tracesData]) => {
      setSnapshot(snapshotData.snapshot);
      setTraces(tracesData.traces);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [replayMode, replayTimestamp, workflowId]);

  return { snapshot, traces, loading };
}
