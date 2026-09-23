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

  // Auto refresh for short ranges every 15s, longer every 60s
  useEffect(() => {
    if (!iface) return;
    const isShort = ['5m', '10m', '30m', '60m'].includes(range);
    const interval = setInterval(() => fetchHistory(range), isShort ? 15000 : 60000);
    return () => clearInterval(interval);
  }, [range, iface, deviceId]);

  const chartData = data.map(d => {
    const date = new Date(d.timestamp);
    // format label based on range
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
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
          <div className="text-gray-400 mb-1">{label}</div>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: p.color }}></span>
              <span style={{ color: p.color }} className="font-medium">{p.name}:</span>
              <span className="font-mono text-white">{formatBits(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass rounded-xl p-4 border border-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            History Traffic — {iface || '-'}
            {loading && <span className="text-xs text-gray-500 ml-2">loading...</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {data.length} points • Range {range} • Auto refresh {['5m','10m','30m','60m'].includes(range) ? '15s' : '60s'}
            {stats && ` • Avg RX ${formatBits(stats.avgRx)} • Avg TX ${formatBits(stats.avgTx)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${range === r.value ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-800">
            <div className="text-[11px] text-gray-500">Last RX</div>
            <div className="font-mono font-bold text-blue-400 text-sm">{formatBits(stats.lastRx)}</div>
          </div>
          <div className="bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-800">
            <div className="text-[11px] text-gray-500">Last TX</div>
            <div className="font-mono font-bold text-amber-400 text-sm">{formatBits(stats.lastTx)}</div>
          </div>
          <div className="bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-800">
            <div className="text-[11px] text-gray-500">Max RX / TX</div>
            <div className="font-mono text-xs text-white">{formatBits(stats.maxRx)} / {formatBits(stats.maxTx)}</div>
          </div>
          <div className="bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-800">
            <div className="text-[11px] text-gray-500">Points</div>
            <div className="font-mono text-xs text-white">{stats.count} points</div>
          </div>
        </div>
      )}

      <div className="h-[360px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
            <div className="text-lg mb-1">📊</div>
            <div>Belum ada data untuk range {range}</div>
            <div className="text-xs text-gray-600 mt-1">Poller menyimpan max 60k points (~83 jam / 3.5 hari @5s) • Data akan terkumpul otomatis 5s/point</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickMargin={8} minTickGap={50} interval="preserveStartEnd" />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => formatBits(v)} width={85} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="RX" stroke="#3b82f6" fill="url(#colorRx)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="TX" stroke="#f59e0b" fill="url(#colorTx)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-600">
        <span>Range {range} • {iface} • Downsampled ke 400 points untuk performa</span>
        <button onClick={() => fetchHistory(range)} className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300">⟳ Refresh</button>
      </div>
    </div>
  );
}
