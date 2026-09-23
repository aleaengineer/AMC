"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatBits } from '@/lib/api';

export default function TrafficChart({ data, interfaceName }) {
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    RX: d.rx,
    TX: d.tx,
    rxFormatted: formatBits(d.rx),
    txFormatted: formatBits(d.tx),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#020208] border border-cyan-400/20 rounded-xl p-3 text-xs shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur">
          <div className="text-[var(--color-fg-muted)] mb-1.5 text-[11px]">{label} • {interfaceName}</div>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }}></span>
              <span style={{ color: p.color }} className="font-medium text-xs">{p.name}:</span>
              <span className="font-mono text-white text-xs">{formatBits(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass glass-card p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <span className="glow-dot"></span>
          LIVE Traffic
          <span className="glass-pill cyan text-[10px] px-2 py-0.5">{interfaceName || 'No interface'}</span>
        </h3>
        <span className="text-[11px] text-[var(--color-fg-muted)]">{data.length} points • 5s interval</span>
      </div>
      <div className="h-[260px] sm:h-[320px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-fg-muted)] text-sm border border-dashed border-[var(--color-border)] rounded-xl bg-[rgba(0,0,0,0.15)]">
            <span className="text-lg mb-1">◉</span>
            <span>Belum ada data, menunggu poller 5s...</span>
            <span className="text-[11px] text-[var(--color-fg-dim)] mt-1">Realtime</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,235,235,0.08)" />
              <XAxis dataKey="time" stroke="var(--color-fg-dim)" fontSize={11} tickMargin={8} minTickGap={36} interval="preserveStartEnd" />
              <YAxis stroke="var(--color-fg-dim)" fontSize={11} tickFormatter={(v) => formatBits(v)} width={72} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-fg-muted)' }} />
              <Line type="monotone" dataKey="RX" stroke="#00ebeb" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 3, stroke: '#00ebeb', strokeWidth: 2, fill: '#020208' }} />
              <Line type="monotone" dataKey="TX" stroke="#edc831" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 3, stroke: '#edc831', strokeWidth: 2, fill: '#020208' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
