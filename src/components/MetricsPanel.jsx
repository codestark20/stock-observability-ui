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
  fontSize: '12px',
  color: '#f9fafb',
};

const axisTick = { fill: '#6b7280', fontSize: 10 };

function MetricsPanel({ latencyData, tpsData, cpuData }) {
  const hasLatency = latencyData && latencyData.length > 0;
  const hasTps = tpsData && tpsData.length > 0;
  const hasCpu = cpuData && cpuData.length > 0;

  return (
    <>
      {hasLatency && (
        <div className="chart-container">
          <div className="chart-title">Latency (ms)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={latencyData}>
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
              <Tooltip contentStyle={tooltipContentStyle} />
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
            <BarChart data={tpsData}>
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
              <Tooltip contentStyle={tooltipContentStyle} />
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
            <AreaChart data={cpuData}>
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
              <Tooltip contentStyle={tooltipContentStyle} />
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
