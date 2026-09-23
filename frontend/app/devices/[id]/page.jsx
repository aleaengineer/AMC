"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, WS_URL, formatBits, getToken, getUser } from '@/lib/api';
import { io } from 'socket.io-client';
import TrafficChart from '@/components/TrafficChart';
import HistoryChart from '@/components/HistoryChart';
import Link from 'next/link';

export default function DeviceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [device, setDevice] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [uplink, setUplink] = useState(null);
  const [traffic, setTraffic] = useState([]); // history points
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

  // Socket for live
  useEffect(() => {
    if (!selected) return;
    const token = getToken();
    const s = io(WS_URL, { transports: ['websocket', 'polling'], auth: { token } });
    socketRef.current = s;
    s.on('connect', () => {
      console.log('WS connected detail', s.id);
      s.emit('set:interfaces', { deviceId: id, interfaces: [selected] });
      // also subscribe
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
    // listen both specific and generic
    s.on(`traffic:${id}:${selected}`, handler);
    s.on(`traffic:${id}`, handler);
    s.on('traffic', (p) => {
      if (p.deviceId === id && p.interface === selected) handler(p);
    });
    return () => s.disconnect();
  }, [selected, id]);

  // When selected changes, tell backend to poll only that interface (optional, but we emit set:interfaces)
  useEffect(() => {
    if (socketRef.current && selected) {
      socketRef.current.emit('set:interfaces', { deviceId: id, interfaces: [selected] });
    }
  }, [selected]);

  if (!device) return <div className="text-center py-12 text-gray-500">Loading device...</div>;

  const peakRx = Math.max(...traffic.map(t => t.rx), 0);
  const peakTx = Math.max(...traffic.map(t => t.tx), 0);
  const avgRx = traffic.length ? Math.round(traffic.reduce((a, b) => a + b.rx, 0) / traffic.length) : 0;
  const avgTx = traffic.length ? Math.round(traffic.reduce((a, b) => a + b.tx, 0) / traffic.length) : 0;

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        ← Kembali ke Dashboard
      </Link>

      <div className="glass rounded-xl p-4 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            {device.name}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              {device.status}
            </span>
            {uplink && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30">UPLINK: {uplink}</span>}
          </h1>
          <p className="text-xs text-gray-400 mt-1">{device.host}:{device.port} • {device.username} • {device.apiType} • {interfaces.length} interfaces {uplink ? `• Uplink auto: ${uplink} (dhcp-client → route 0.0.0.0/0)` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selected} onChange={e => setSelected(e.target.value)} className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none min-w-[200px]">
            {interfaces.map(i => (
              <option key={i.name} value={i.name}>{i.name} {i.type ? `(${i.type})` : ''} {i.running === false || i.running === 'false' ? ' - down' : ''}</option>
            ))}
          </select>
          <button onClick={fetchInterfaces} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm">↻</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-3 border border-gray-800">
          <div className="text-xs text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> RX Current</div>
          <div className="font-mono font-bold text-blue-400 text-lg">{formatBits(live.rx)}</div>
          <div className="text-[11px] text-gray-600">Avg: {formatBits(avgRx)} • Peak: {formatBits(peakRx)}</div>
        </div>
        <div className="glass rounded-xl p-3 border border-gray-800">
          <div className="text-xs text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> TX Current</div>
          <div className="font-mono font-bold text-amber-400 text-lg">{formatBits(live.tx)}</div>
          <div className="text-[11px] text-gray-600">Avg: {formatBits(avgTx)} • Peak: {formatBits(peakTx)}</div>
        </div>
        <div className="glass rounded-xl p-3 border border-gray-800">
          <div className="text-xs text-gray-500">Total Points</div>
          <div className="font-mono font-bold text-white text-lg">{traffic.length}</div>
          <div className="text-[11px] text-gray-600">5s interval • {selected}</div>
        </div>
        <div className="glass rounded-xl p-3 border border-gray-800">
          <div className="text-xs text-gray-500">Uptime / Status</div>
          <div className="font-bold text-white text-sm mt-1">{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('id-ID') : '-'}</div>
          <div className="text-[11px] text-gray-600">Last seen</div>
        </div>
      </div>

      <TrafficChart data={traffic} interfaceName={selected} />

      <HistoryChart deviceId={id} iface={selected} />

      <div className="glass rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <h3 className="font-semibold text-white">Interfaces ({interfaces.length})</h3>
          <button onClick={() => setShowAll(!showAll)} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700">{showAll ? 'Show running only' : 'Show all'}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0e1a] text-gray-400 text-xs">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">MAC</th>
                <th className="text-left p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(showAll ? interfaces : interfaces.filter(i => i.running === true || i.running === 'true' || i.running === 'yes')).map(i => (
                <tr key={i.name} className={`hover:bg-gray-800/50 ${selected === i.name ? 'bg-blue-900/20' : ''} ${uplink === i.name ? 'ring-1 ring-blue-500/30' : ''}`}>
                  <td className="p-3 font-mono text-white">{i.name} {uplink === i.name && <span className="ml-2 text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded">UPLINK</span>} {selected === i.name && <span className="ml-1 text-[11px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">LIVE</span>}</td>
                  <td className="p-3 text-gray-400">{i.type}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${i.running === true || i.running === 'true' || i.running === 'yes' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {i.running === true || i.running === 'true' || i.running === 'yes' ? 'running' : 'down'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">{i.mac || '-'}</td>
                  <td className="p-3">
                    <button onClick={() => setSelected(i.name)} className={`px-3 py-1 rounded text-xs ${selected === i.name ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'}`}>
                      {selected === i.name ? '• Monitoring' : 'Monitor'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="glass rounded-xl p-3 border border-gray-800">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">Lihat Raw Data LIVE (50 points terakhir) — klik untuk expand</summary>
        <div className="overflow-x-auto max-h-[240px] overflow-y-auto mt-3">
          <table className="w-full text-xs">
            <thead className="text-gray-500 sticky top-0 bg-[#111827]">
              <tr>
                <th className="text-left p-2">Time</th>
                <th className="text-right p-2">RX</th>
                <th className="text-right p-2">TX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono">
              {[...traffic].reverse().slice(0, 50).map((t, i) => (
                <tr key={i} className="hover:bg-gray-800/30">
                  <td className="p-2 text-gray-400">{new Date(t.timestamp).toLocaleTimeString('id-ID')}</td>
                  <td className="p-2 text-right text-blue-400">{formatBits(t.rx)}</td>
                  <td className="p-2 text-right text-amber-400">{formatBits(t.tx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
