"use client";
import { useEffect, useState } from 'react';
import { api, formatBits } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const RANGES = [
  { label: '5m', value: '5m' },
  { label: '10m', value: '10m' },
  { label: '30m', value: '30m' },
  { label: '60m', value: '60m' },
  { label: '3h', value: '3h' },
  { label: '6h', value: '6h' },
  { label: '12h', value: '12h' },
  { label: '1d', value: '24h' },
  { label: '2d', value: '2d' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

export default function HistoryChart({ deviceId, iface }) {
  const [range, setRange] = useState('30m');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchHistory = async (r = range) => {
    if (!deviceId || !iface) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/devices/${deviceId}/history`, {
        params: { interface: iface, range: r, points: 400 }
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      setData(arr);
      if (arr.length) {
        const rxs = arr.map(d => d.rx);
        const txs = arr.map(d => d.tx);
        const maxRx = Math.max(...rxs);
        const maxTx = Math.max(...txs);
        const avgRx = Math.round(rxs.reduce((a, b) => a + b, 0) / rxs.length);
        const avgTx = Math.round(txs.reduce((a, b) => a + b, 0) / txs.length);
        const last = arr[arr.length - 1];
        setStats({ count: arr.length, maxRx, maxTx, avgRx, avgTx, lastRx: last.rx, lastTx: last.tx });
      } else {
        setStats(null);
      }
    } catch (e) {
      console.error('history fetch', e.message);
      setData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(range);
  }, [deviceId, iface, range]);

  useEffect(() => {
    if (!iface) return;
    const isShort = ['5m', '10m', '30m', '60m'].includes(range);
    const interval = setInterval(() => fetchHistory(range), isShort ? 15000 : 60000);
    return () => clearInterval(interval);
  }, [range, iface, deviceId]);

  const chartData = data.map(d => {
    const date = new Date(d.timestamp);
    let timeLabel;
    if (['5m', '10m', '30m', '60m'].includes(range)) {
      timeLabel = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else if (['3h', '6h', '12h'].includes(range)) {
      timeLabel = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else {
      timeLabel = date.toLocaleDateString('id-ID', { month: 'short', day: '2-digit' }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return {
      time: timeLabel,
      timestamp: d.timestamp,
      RX: d.rx,
      TX: d.tx,
      rxFormatted: formatBits(d.rx),
      txFormatted: formatBits(d.tx),
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#020208] border border-cyan-400/20 rounded-xl p-3 text-xs shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur">
          <div className="text-[var(--color-fg-muted)] mb-1.5 text-[11px]">{label} • {iface}</div>
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
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500"></span>
            History Traffic
            <span className="glass-pill cyan text-[10px] px-2 py-0.5">{iface || '-'}</span>
            {loading && <span className="text-[11px] text-cyan-400/70 animate-pulse">loading...</span>}
          </h3>
          <span className="text-[11px] text-[var(--color-fg-muted)] hidden sm:block">{data.length} pts • {range} • {['5m','10m','30m','60m'].includes(range) ? '15s' : '60s'} refresh</span>
        </div>
        {/* Range selector - scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${range === r.value ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_12px_rgba(0,235,235,0.35)]' : 'bg-white/[0.04] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-white hover:border-cyan-400/20 hover:bg-white/[0.06]'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-[var(--color-fg-muted)] sm:hidden">{data.length} pts • {range} • Avg RX {stats ? formatBits(stats.avgRx) : '-'} • TX {stats ? formatBits(stats.avgTx) : '-'}</div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <div className="rounded-xl p-2.5 border border-cyan-400/10 bg-[rgba(0,235,235,0.04)]">
            <div className="text-[11px] text-cyan-300/60">Last RX</div>
            <div className="font-mono font-bold text-cyan-300 text-sm">{formatBits(stats.lastRx)}</div>
          </div>
          <div className="rounded-xl p-2.5 border border-amber-400/10 bg-[rgba(237,200,49,0.04)]">
            <div className="text-[11px] text-amber-300/60">Last TX</div>
            <div className="font-mono font-bold text-amber-300 text-sm">{formatBits(stats.lastTx)}</div>
          </div>
          <div className="rounded-xl p-2.5 border border-[var(--color-border)] bg-[rgba(0,0,0,0.2)]">
            <div className="text-[11px] text-[var(--color-fg-muted)]">Max RX / TX</div>
            <div className="font-mono text-xs text-white">{formatBits(stats.maxRx)} / {formatBits(stats.maxTx)}</div>
          </div>
          <div className="rounded-xl p-2.5 border border-[var(--color-border)] bg-[rgba(0,0,0,0.2)]">
            <div className="text-[11px] text-[var(--color-fg-muted)]">Points</div>
            <div className="font-mono text-xs text-white">{stats.count}</div>
          </div>
        </div>
      )}

      <div className="h-[300px] sm:h-[360px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-fg-muted)] text-sm border border-dashed border-[var(--color-border)] rounded-xl bg-[rgba(0,0,0,0.15)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(0,235,235,0.08)] border border-cyan-400/20 flex items-center justify-center text-cyan-400 mb-2">◈</div>
            <div>Belum ada data untuk range {range}</div>
            <div className="text-xs text-[var(--color-fg-dim)] mt-1 text-center px-4">Poller 60k points (~83 jam @5s) • Auto 5s/point • Cyber grid</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRxCyber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ebeb" stopOpacity={0.28}/>
                  <stop offset="95%" stopColor="#00ebeb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTxCyber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#edc831" stopOpacity={0.26}/>
                  <stop offset="95%" stopColor="#edc831" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,235,235,0.07)" />
              <XAxis dataKey="time" stroke="var(--color-fg-dim)" fontSize={11} tickMargin={8} minTickGap={44} interval="preserveStartEnd" />
              <YAxis stroke="var(--color-fg-dim)" fontSize={11} tickFormatter={(v) => formatBits(v)} width={72} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-fg-muted)' }} />
              <Area type="monotone" dataKey="RX" stroke="#00ebeb" fill="url(#colorRxCyber)" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 3, stroke: '#00ebeb', fill: '#020208' }} />
              <Area type="monotone" dataKey="TX" stroke="#edc831" fill="url(#colorTxCyber)" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 3, stroke: '#edc831', fill: '#020208' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[var(--color-fg-dim)]">
        <span className="hidden sm:inline">Range {range} • {iface} • Downsampled 400 pts • Cyber grid 32px</span>
        <button onClick={() => fetchHistory(range)} className="w-full sm:w-auto px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--color-border)] text-xs text-[var(--color-fg-muted)] hover:text-white">⟳ Refresh</button>
      </div>
    </div>
  );
}
