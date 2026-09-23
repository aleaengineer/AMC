"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, WS_URL, formatBits, getUser, getToken } from '@/lib/api';
import { io } from 'socket.io-client';
import DeviceCard from '@/components/DeviceCard';
import AddDeviceModal from '@/components/AddDeviceModal';

export default function Dashboard() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [trafficMap, setTrafficMap] = useState({});
  const [uplinkMap, setUplinkMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [socket, setSocket] = useState(null);
  const [filter, setFilter] = useState('all');
  const [me, setMe] = useState(null);

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/devices');
      setDevices(res.data);
      try {
        const uplRes = await api.get('/api/uplinks');
        setUplinkMap(uplRes.data);
      } catch (e) { console.warn('uplinks fetch failed', e.message); }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (!token || !u) { router.push('/login'); return; }
    setMe(u);
    fetchDevices();
    const s = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    setSocket(s);
    s.on('connect', () => console.log('WS connected', s.id));
    s.on('device:status', ({ deviceId, status }) => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status } : d));
    });
    s.on('traffic', (payload) => {
      const { deviceId, rx, tx, interface: iface } = payload;
      setTrafficMap(prev => ({
        ...prev,
        [deviceId]: { rx, tx, interface: iface, rxFormatted: formatBits(rx), txFormatted: formatBits(tx), timestamp: payload.timestamp }
      }));
    });
    return () => s.disconnect();
  }, [router]);

  useEffect(() => {
    const id = setInterval(fetchDevices, 10000);
    return () => clearInterval(id);
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Hapus Mikrotik ini?')) return;
    await api.delete(`/api/devices/${id}`);
    fetchDevices();
  };

  const handleTest = async (id) => {
    try {
      const res = await api.post(`/api/devices/${id}/test`);
      alert(`✅ Online via ${res.data.method}`);
      fetchDevices();
    } catch (e) {
      alert(`❌ Offline: ${e.response?.data?.error || e.message}`);
    }
  };

  const filtered = devices.filter(d => {
    if (filter === 'online') return d.status === 'online';
    if (filter === 'offline') return d.status === 'offline';
    return true;
  });

  const total = devices.length;
  const online = devices.filter(d=>d.status==='online').length;
  const offline = devices.filter(d=>d.status==='offline').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cyber header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="hidden sm:inline-flex w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500"></span>
              <span className="text-white">Dashboard</span>
              <span className="text-cyan-400">NOC</span>
              <span className="hidden sm:inline-flex glass-pill cyan text-[10px] leading-none">CYBER v1.2</span>
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-fg-muted)] mt-1">Kelola {total} Mikrotik • {me?.role ? <span className="capitalize text-cyan-300">{me.role}</span> : ''} • Tap card untuk detail • Grid 32px</p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <div className="flex-1 sm:flex-none flex bg-[rgba(0,0,0,0.3)] rounded-full p-1 border border-[var(--color-border)] overflow-x-auto">
              {['all', 'online', 'offline'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 sm:flex-none px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition ${filter === f ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,235,235,0.35)]' : 'text-[var(--color-fg-muted)] hover:text-white'}`}>{f} {f === 'all' ? `(${total})` : f === 'online' ? `(${online})` : `(${offline})`}</button>
              ))}
            </div>
            {(me?.role === 'admin' || me?.role === 'pop') && (
              <Link href="/devices/add" className="hidden sm:inline-flex px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black rounded-full text-sm font-semibold shadow-[0_0_16px_rgba(0,235,235,0.25)] items-center gap-1.5">
                <span className="text-base leading-none">＋</span> Tambah
              </Link>
            )}
          </div>
        </div>
        {/* Mobile add button full width */}
        {(me?.role === 'admin' || me?.role === 'pop') && (
          <Link href="/devices/add" className="sm:hidden w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-cyan-400 text-black rounded-xl text-sm font-semibold">
            <span>＋</span> Tambah Mikrotik
          </Link>
        )}
      </div>

      {/* Stats - cyber */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div className="glass glass-card p-3 sm:p-4">
          <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">{total}</div>
          <div className="text-[11px] sm:text-xs text-[var(--color-fg-muted)]">Total</div>
          <div className="mt-1 h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
        </div>
        <div className="glass glass-card p-3 sm:p-4">
          <div className="text-lg sm:text-2xl font-bold text-emerald-400">{online}</div>
          <div className="text-[11px] sm:text-xs text-[var(--color-fg-muted)]">Online</div>
          <div className="mt-1 flex justify-center"><span className="glow-dot"></span></div>
        </div>
        <div className="glass glass-card p-3 sm:p-4">
          <div className="text-lg sm:text-2xl font-bold text-red-400">{offline}</div>
          <div className="text-[11px] sm:text-xs text-[var(--color-fg-muted)]">Offline</div>
          <div className="mt-1 flex justify-center"><span className="glow-dot off"></span></div>
        </div>
      </div>

      {loading ? (
        <div className="glass p-8 sm:p-12 text-center">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin"></div>
          <div className="text-sm text-[var(--color-fg-muted)] mt-3">Memuat device...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-8 sm:p-12 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-[rgba(0,235,235,0.08)] border border-cyan-400/20 flex items-center justify-center text-xl sm:text-2xl">◈</div>
          <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">{filter !== 'all' ? `Tidak ada device ${filter}` : 'Belum ada Mikrotik'}</h3>
          <p className="text-xs sm:text-sm text-[var(--color-fg-muted)] mb-4 px-2">{filter !== 'all' ? 'Coba ganti filter' : 'Tambahkan Mikrotik pertama untuk mulai monitoring realtime 5s • Cyber grid'}</p>
          {filter === 'all' && (me?.role === 'admin' || me?.role === 'pop') && <Link href="/devices/add" className="inline-flex px-5 py-2.5 bg-cyan-400 text-black rounded-full text-sm font-semibold">＋ Tambah Mikrotik</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(device => (
            <div key={device.id} className="relative group">
              <DeviceCard device={device} traffic={trafficMap[device.id]} uplink={uplinkMap[device.id]?.uplink || null} />
              <div className="absolute top-2 right-2 hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {(me?.role === 'admin' || me?.role === 'pop') && <button onClick={(e)=>{e.preventDefault(); setEditDevice(device); setShowAdd(true);}} className="w-7 h-7 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs hover:bg-white/10 hover:border-cyan-400/30">✎</button>}
                <button onClick={(e)=>{e.preventDefault(); handleTest(device.id)}} className="w-7 h-7 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs hover:bg-white/10">◉</button>
                {me?.role === 'admin' && <button onClick={(e)=>{e.preventDefault(); handleDelete(device.id)}} className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 text-xs hover:bg-red-500/30">✕</button>}
              </div>
              {/* mobile actions - swipe friendly */}
              <div className="flex lg:hidden gap-1.5 mt-2">
                {(me?.role === 'admin' || me?.role === 'pop') && <button onClick={()=>{ setEditDevice(device); setShowAdd(true);}} className="flex-1 py-2 rounded-full bg-white/[0.04] border border-[var(--color-border)] text-xs">Edit</button>}
                <button onClick={()=>handleTest(device.id)} className="flex-1 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-xs text-cyan-300">Test</button>
                {me?.role === 'admin' && <button onClick={()=>handleDelete(device.id)} className="flex-1 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400">Hapus</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editDevice) && (
        <AddDeviceModal
          editDevice={editDevice}
          onClose={() => { setShowAdd(false); setEditDevice(null); }}
          onAdded={fetchDevices}
        />
      )}
    </div>
  );
}
