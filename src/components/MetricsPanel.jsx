import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const tooltipContentStyle = {
  background: '#1f2937',
  border: '1px solid #4b5563',
  borderRadius: '4px',
  padding: '8px',
  fontSize: '12px',
  color: '#f9fafb',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={tooltipContentStyle}>
        <div style={{ marginBottom: '4px', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ color: payload[0].color, fontWeight: 500 }}>
          Value: {payload[0].value}
        </div>
        {data.trace_id && (
          <div style={{ marginTop: '6px', color: '#fbbf24', fontWeight: 600, fontSize: '11px' }}>
            🎯 Click to view trace
          </div>
        )}
      </div>
    );
  }
  return null;
};

const axisTick = { fill: '#6b7280', fontSize: 10 };

function MetricsPanel({ latencyData, tpsData, cpuData, onTraceClick }) {
  const hasLatency = latencyData && latencyData.length > 0;
  const hasTps = tpsData && tpsData.length > 0;
  const hasCpu = cpuData && cpuData.length > 0;

  const handleChartClick = (e) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const data = e.activePayload[0].payload;
      if (data.trace_id && onTraceClick) {
        onTraceClick(data.trace_id);
      }
    }
  };

  return (
    <>
      {hasLatency && (
        <div className="chart-container">
          <div className="chart-title">Latency (ms)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={latencyData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fill="url(#latencyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasTps && (
        <div className="chart-container" style={{ marginTop: '12px' }}>
          <div className="chart-title">Throughput (req/s)</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={tpsData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <XAxis
                dataKey="time"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
              <Bar
                dataKey="value"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasCpu && (
        <div className="chart-container" style={{ marginTop: '12px' }}>
          <div className="chart-title">CPU Usage (%)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={cpuData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.3)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                fill="url(#cpuGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasLatency && !hasTps && !hasCpu && (
        <div style={{ 
          padding: '24px', 
          textAlign: 'center', 
          color: 'var(--text-muted)', 
          fontSize: '13px',
          border: '1px dashed var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          marginTop: '8px'
        }}>
          No metrics data yet. Send OTel metrics to see real charts here.
        </div>
      )}
    </>
  );
}

export default MetricsPanel;
