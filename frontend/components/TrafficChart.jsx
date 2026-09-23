"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatBits } from '@/lib/api';

export default function TrafficChart({ data, interfaceName }) {
  // data: [{ rx, tx, timestamp }]
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          LIVE Traffic — {interfaceName || 'No interface'}
        </h3>
        <span className="text-xs text-gray-500">{data.length} points • 5s interval</span>
      </div>
      <div className="h-[320px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
            Belum ada data, menunggu poller...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickMargin={8} minTickGap={40} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => formatBits(v)} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="RX" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="TX" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
