"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const RANGES = [
  { label: '30m', value: '30m' },
  { label: '1h', value: '60m' },
  { label: '3h', value: '3h' },
  { label: '6h', value: '6h' },
  { label: '12h', value: '12h' },
  { label: '1d', value: '24h' },
  { label: '2d', value: '2d' },
  { label: '7d', value: '7d' },
];

export default function HealthChart({ deviceId }) {
  const [range, setRange] = useState('60m');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async (r = range) => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/devices/${deviceId}/health-history`, { params: { range: r, points: 200 } });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('health history', e.message);
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(range); }, [deviceId, range]);
  useEffect(() => {
    const id = setInterval(() => fetchHealth(range), 15000);
    return () => clearInterval(id);
  }, [range, deviceId]);

  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    CPU: d.cpu ?? 0,
    Temp: d.temperature ?? null,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#020208] border border-cyan-400/20 rounded-xl p-3 text-xs shadow-xl">
          <div className="text-[var(--color-fg-muted)] mb-1">{label}</div>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }}></span>
              <span style={{ color: p.color }} className="font-medium">{p.name}:</span>
              <span className="font-mono text-white">{p.value}{p.dataKey === 'CPU' ? '%' : '°C'}</span>
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
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400"></span>
          Health — CPU & Temp {loading && <span className="text-[11px] text-cyan-400/60 animate-pulse">loading...</span>}
        </h3>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)} className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition ${range === r.value ? 'bg-emerald-400 text-black border-emerald-400' : 'bg-white/[0.04] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-white'}`}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="h-[240px] sm:h-[280px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-fg-muted)] text-sm border border-dashed border-[var(--color-border)] rounded-xl bg-[rgba(0,0,0,0.15)]">
            <span className="text-lg mb-1">◎</span>
            <span>Belum ada data health untuk {range}</span>
            <span className="text-[11px] text-[var(--color-fg-dim)] mt-1">Polling 15s • CPU % + Temp °C</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.08)" />
              <XAxis dataKey="time" stroke="var(--color-fg-dim)" fontSize={11} tickMargin={8} minTickGap={44} />
              <YAxis stroke="var(--color-fg-dim)" fontSize={11} width={40} domain={[0, 100]} tickFormatter={(v)=>v+'%'} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="CPU" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Temp" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 text-[11px] text-[var(--color-fg-dim)] hidden sm:block">Range {range} • {data.length} pts • CPU 0-100% • Temp °C (jika support)</div>
    </div>
  );
}
