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
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#f1f5f9',
};

const axisTick = { fill: '#64748b', fontSize: 10 };

function MetricsPanel({ latencyData, tpsData }) {
  const hasLatency = latencyData && latencyData.length > 0;
  const hasTps = tpsData && tpsData.length > 0;

  return (
    <>
      {hasLatency && (
        <div className="chart-container">
          <div className="chart-title">Latency (ms)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.3)" />
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
                stroke="#38bdf8"
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
                fill="#818cf8"
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

export default MetricsPanel;
