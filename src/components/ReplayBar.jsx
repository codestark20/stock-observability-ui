import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkflow } from '../context/WorkflowContext';
import '../styles/replayBar.css';

const REPLAY_WINDOW_HOURS = 24;
const PLAY_INTERVAL_MS   = 2000;
const PLAY_STEP_MINUTES  = 5;

export default function ReplayBar() {
  const { id: workflowId } = useParams();
  const { replayMode, replayTimestamp, enterReplay, exitReplay, setReplayTimestamp }
    = useWorkflow();

  const [open, setOpen]       = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sliderVal, setSliderVal] = useState(100);
  const intervalRef = useRef(null);

  const windowStart = Date.now() - REPLAY_WINDOW_HOURS * 60 * 60 * 1000;

  const sliderToTimestamp = (val) => {
    const ms = windowStart + (val / 100) * (Date.now() - windowStart);
    return new Date(ms).toISOString();
  };

  const formatShort = (iso) => {
    if (!iso) return 'Live';
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatWindowEdge = (msOffset) =>
    new Date(Date.now() - msOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

  const handleGoLive = () => {
    exitReplay();
    setSliderVal(100);
    setPlaying(false);
    clearInterval(intervalRef.current);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="replay-bar">
      {/* Collapsed pill toggle */}
      <button
        className={`replay-bar__toggle ${replayMode ? 'replay-bar__toggle--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title={replayMode ? 'Replaying historical data' : 'Open time scrubber'}
      >
        <span className={`replay-bar__toggle-dot ${replayMode ? 'replay-bar__toggle-dot--replay' : ''}`} />
        {replayMode ? `⏱ ${formatShort(replayTimestamp)}` : '⏱ Live'}
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="replay-bar__panel">
          <div className="replay-bar__row">
            <span className="replay-bar__title">Time Scrubber</span>
            <span className={`replay-bar__time ${replayMode ? 'replay-bar__time--replay' : ''}`}>
              {replayMode ? formatShort(replayTimestamp) : 'Live'}
            </span>
          </div>

          <input
            type="range"
            min={0} max={100} step={0.1}
            value={sliderVal}
            onChange={handleSliderChange}
            className="replay-bar__slider"
          />

          <div className="replay-bar__labels">
            <span>{formatWindowEdge(REPLAY_WINDOW_HOURS * 3600 * 1000)} ({REPLAY_WINDOW_HOURS}h ago)</span>
            <span>Now</span>
          </div>

          <div className="replay-bar__controls">
            <button className="replay-bar__play" onClick={handlePlay}>
              {playing ? '⏸' : '▶'}
            </button>
            {replayMode && (
              <button className="replay-bar__live" onClick={handleGoLive}>
                ● Back to Live
              </button>
            )}
            {!replayMode && (
              <span style={{ flex: 1, fontSize: '11px', color: '#475569', textAlign: 'center' }}>
                Drag slider to replay
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
