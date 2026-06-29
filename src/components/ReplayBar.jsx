import { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import '../styles/replayBar.css';

const REPLAY_WINDOW_HOURS = 24; // how far back the scrubber goes
const PLAY_INTERVAL_MS   = 2000; // auto-scrub step interval
const PLAY_STEP_MINUTES  = 5;    // how many minutes each step advances

export default function ReplayBar({ workflowId }) {
  const { replayMode, replayTimestamp, enterReplay, exitReplay, setReplayTimestamp }
    = useWorkflow();

  const [playing, setPlaying] = useState(false);
  const [sliderVal, setSliderVal] = useState(100); // 100 = now
  const intervalRef = useRef(null);

  const windowStart = Date.now() - REPLAY_WINDOW_HOURS * 60 * 60 * 1000;

  const sliderToTimestamp = (val) => {
    const ms = windowStart + (val / 100) * (Date.now() - windowStart);
    return new Date(ms).toISOString();
  };

  const formatLabel = (iso) => {
    if (!iso) return 'Now';
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setSliderVal(val);
    if (val >= 100) { exitReplay(); return; }
    enterReplay(sliderToTimestamp(val));
  };

  const handlePlay = () => {
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
      return;
    }

    setPlaying(true);
    intervalRef.current = setInterval(() => {
      setSliderVal(prev => {
        const next = Math.min(100, prev + (PLAY_STEP_MINUTES / (REPLAY_WINDOW_HOURS * 60)) * 100);
        if (next >= 100) {
          clearInterval(intervalRef.current);
          setPlaying(false);
          exitReplay();
          return 100;
        }
        setReplayTimestamp(sliderToTimestamp(next));
        return next;
      });
    }, PLAY_INTERVAL_MS);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="replay-bar">
      <button className="replay-bar__play" onClick={handlePlay}>
        {playing ? '⏸' : '▶'}
      </button>

      <span className="replay-bar__label">
        {replayMode ? formatLabel(replayTimestamp) : 'Live'}
      </span>

      <input
        type="range"
        min={0} max={100} step={0.1}
        value={sliderVal}
        onChange={handleSliderChange}
        className="replay-bar__slider"
      />

      <span className="replay-bar__label replay-bar__label--right">Now</span>

      {replayMode && (
        <button className="replay-bar__live" onClick={() => { exitReplay(); setSliderVal(100); }}>
          ● Live
        </button>
      )}
    </div>
  );
}
