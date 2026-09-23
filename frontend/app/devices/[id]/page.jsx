"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, WS_URL, formatBits, getToken, getUser } from '@/lib/api';
import { io } from 'socket.io-client';
import TrafficChart from '@/components/TrafficChart';
import HistoryChart from '@/components/HistoryChart';
import HealthChart from '@/components/HealthChart';
import Link from 'next/link';

export default function DeviceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [device, setDevice] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [uplink, setUplink] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [live, setLive] = useState({ rx: 0, tx: 0 });
  const [showAll, setShowAll] = useState(false);
  const socketRef = useRef(null);
  const maxPoints = 200;

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    fetchDevice();
    fetchUplink();
    fetchInterfaces();
    fetchHistory();
  }, [id, router]);

  const fetchUplink = async () => {
    try {
      const res = await api.get(`/api/devices/${id}/uplink`);
      if (res.data.uplink) {
        setUplink(res.data.uplink);
        if (!selected) setSelected(res.data.uplink);
      }
    } catch (e) { console.warn('uplink fetch', e.message); }
  };

  const fetchDevice = async () => {
    try {
      const res = await api.get(`/api/devices/${id}`);
      setDevice(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInterfaces = async () => {
    try {
      const res = await api.get(`/api/devices/${id}/interfaces`);
      setInterfaces(res.data);
      if (res.data.length && !selected && !uplink) {
        const firstRunning = res.data.find(i => i.running === true || i.running === 'true') || res.data[0];
        setSelected(firstRunning.name);
      }
    } catch (e) {
      console.error('interfaces', e.message);
    }
  };

  const fetchHistory = async (iface) => {
    const target = iface || selected;
    if (!target) return;
    try {
      const res = await api.get(`/api/devices/${id}/history?interface=${target}&limit=${maxPoints}`);
      setTraffic(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selected) fetchHistory(selected);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const token = getToken();
    const s = io(WS_URL, { transports: ['websocket', 'polling'], auth: { token } });
    socketRef.current = s;
    s.on('connect', () => {
      s.emit('set:interfaces', { deviceId: id, interfaces: [selected] });
      s.emit('subscribe:traffic', { deviceId: id, interface: selected });
    });
    const handler = (payload) => {
      if (payload.interface !== selected || payload.deviceId !== id) return;
      setLive({ rx: payload.rx, tx: payload.tx });
      setTraffic(prev => {
        const next = [...prev, { rx: payload.rx, tx: payload.tx, timestamp: payload.timestamp }];
        if (next.length > maxPoints) return next.slice(-maxPoints);
        return next;
      });
    };
    s.on(`traffic:${id}:${selected}`, handler);
    s.on(`traffic:${id}`, handler);
    s.on('traffic', (p) => {
      if (p.deviceId === id && p.interface === selected) handler(p);
    });
    return () => s.disconnect();
  }, [selected, id]);

  useEffect(() => {
    if (socketRef.current && selected) {
      socketRef.current.emit('set:interfaces', { deviceId: id, interfaces: [selected] });
    }
  }, [selected]);

  if (!device) return <div className="glass p-8 text-center text-[var(--color-fg-muted)]">Loading device...</div>;

  const peakRx = Math.max(...traffic.map(t => t.rx), 0);
  const peakTx = Math.max(...traffic.map(t => t.tx), 0);
  const avgRx = traffic.length ? Math.round(traffic.reduce((a, b) => a + b.rx, 0) / traffic.length) : 0;
  const avgTx = traffic.length ? Math.round(traffic.reduce((a, b) => a + b.tx, 0) / traffic.length) : 0;

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-cyan-300">
        <span>‹</span> Kembali ke Dashboard
      </Link>

      {/* Cyber header */}
      <div className="glass glass-card p-3 sm:p-4">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight flex flex-wrap items-center gap-2">
              <span className="text-white">{device.name}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse' : 'bg-red-500'}`}></span>
                {device.status}
              </span>
              {uplink && <span className="glass-pill cyan text-[11px]">UPLINK: {uplink}</span>}
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--color-fg-muted)] mt-1 truncate">{device.host}:{device.port} • {device.username} • {device.apiType} • {interfaces.length} ifaces {uplink ? `• auto ${uplink}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <select value={selected} onChange={e => setSelected(e.target.value)} className="flex-1 lg:flex-none bg-[rgba(0,0,0,0.3)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:border-cyan-400/50 focus:outline-none min-w-0 lg:min-w-[220px]">
              {interfaces.map(i => (
                <option key={i.name} value={i.name} className="bg-[#020208]">{i.name} {i.type ? `(${i.type})` : ''} {i.running === false || i.running === 'false' ? '• down' : ''} {uplink === i.name ? '• uplink' : ''}</option>
              ))}
            </select>
            <button onClick={fetchInterfaces} className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--color-border)] text-sm">↻</button>
          </div>
        </div>
      </div>

      {/* Stats cyber */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="glass glass-card p-3">
          <div className="text-[11px] text-cyan-300/60 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00ebeb]"></span> RX Current</div>
          <div className="font-mono font-bold text-cyan-300 text-base sm:text-lg">{formatBits(live.rx)}</div>
          <div className="text-[11px] text-[var(--color-fg-dim)] truncate">Avg {formatBits(avgRx)} • Peak {formatBits(peakRx)}</div>
        </div>
        <div className="glass glass-card p-3">
          <div className="text-[11px] text-amber-300/60 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#edc831]"></span> TX Current</div>
          <div className="font-mono font-bold text-amber-300 text-base sm:text-lg">{formatBits(live.tx)}</div>
          <div className="text-[11px] text-[var(--color-fg-dim)] truncate">Avg {formatBits(avgTx)} • Peak {formatBits(peakTx)}</div>
        </div>
        <div className="glass glass-card p-3">
          <div className="text-[11px] text-[var(--color-fg-muted)]">Total Points</div>
          <div className="font-mono font-bold text-white text-base sm:text-lg">{traffic.length}</div>
          <div className="text-[11px] text-[var(--color-fg-dim)]">5s • {selected}</div>
        </div>
        <div className="glass glass-card p-3">
          <div className="text-[11px] text-[var(--color-fg-muted)]">Last seen</div>
          <div className="font-mono font-medium text-white text-xs sm:text-sm mt-1">{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('id-ID') : '-'}</div>
          <div className="text-[11px] text-[var(--color-fg-dim)]">{device.status}</div>
        </div>
      </div>

      <TrafficChart data={traffic} interfaceName={selected} />

      <HistoryChart deviceId={id} iface={selected} />

      <HealthChart deviceId={id} />

      {/* Interfaces - swipe on mobile */}
      <div className="glass overflow-hidden">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-cyan-400"></span>Interfaces ({interfaces.length})</h3>
          <button onClick={() => setShowAll(!showAll)} className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-white w-full sm:w-auto">{showAll ? 'Running only' : 'Show all'}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[560px]">
            <thead className="bg-[rgba(0,0,0,0.2)] text-[var(--color-fg-muted)] text-xs">
              <tr>
                <th className="text-left p-2 sm:p-3 font-medium">Name</th>
                <th className="text-left p-2 sm:p-3 font-medium">Type</th>
                <th className="text-left p-2 sm:p-3 font-medium">Status</th>
                <th className="hidden sm:table-cell text-left p-3 font-medium">MAC</th>
                <th className="text-left p-2 sm:p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {(showAll ? interfaces : interfaces.filter(i => i.running === true || i.running === 'true' || i.running === 'yes')).map(i => (
                <tr key={i.name} className={`hover:bg-white/[0.02] ${selected === i.name ? 'bg-cyan-500/[0.06]' : ''} ${uplink === i.name ? 'shadow-[inset_0_0_0_1px_rgba(0,235,235,0.14)]' : ''}`}>
                  <td className="p-2 sm:p-3 font-mono text-white text-xs sm:text-sm">{i.name} {uplink === i.name && <span className="ml-1 text-[10px] bg-cyan-400 text-black px-1 py-0.5 rounded font-bold">UPLINK</span>} {selected === i.name && <span className="ml-1 text-[10px] bg-emerald-500 text-white px-1 py-0.5 rounded">LIVE</span>}</td>
                  <td className="p-2 sm:p-3 text-[var(--color-fg-muted)] text-xs">{i.type}</td>
                  <td className="p-2 sm:p-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium border ${i.running === true || i.running === 'true' || i.running === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {i.running === true || i.running === 'true' || i.running === 'yes' ? '● running' : '○ down'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell p-3 font-mono text-xs text-[var(--color-fg-dim)]">{i.mac || '-'}</td>
                  <td className="p-2 sm:p-3">
                    <button onClick={() => setSelected(i.name)} className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition ${selected === i.name ? 'bg-cyan-400 text-black border-cyan-400' : 'bg-white/[0.04] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-white hover:border-cyan-400/30'}`}>
                      {selected === i.name ? '● Live' : 'Monitor'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 text-[11px] text-[var(--color-fg-dim)] border-t border-[var(--color-border)] hidden sm:block">Swipe horizontal di mobile untuk lihat MAC • Tap Monitor untuk ganti interface (5s poll)</div>
      </div>

      <details className="glass p-3">
        <summary className="text-xs text-[var(--color-fg-muted)] cursor-pointer hover:text-cyan-300 list-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Raw Data LIVE (50 terakhir) — tap untuk expand
        </summary>
        <div className="overflow-x-auto max-h-[240px] overflow-y-auto mt-3 rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-xs">
            <thead className="text-[var(--color-fg-muted)] sticky top-0 bg-[#020208] text-[11px]">
              <tr>
                <th className="text-left p-2">Time</th>
                <th className="text-right p-2">RX</th>
                <th className="text-right p-2">TX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] font-mono">
              {[...traffic].reverse().slice(0, 50).map((t, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="p-2 text-[var(--color-fg-muted)]">{new Date(t.timestamp).toLocaleTimeString('id-ID')}</td>
                  <td className="p-2 text-right text-cyan-300">{formatBits(t.rx)}</td>
                  <td className="p-2 text-right text-amber-300">{formatBits(t.tx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
