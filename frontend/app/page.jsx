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
  const [trafficMap, setTrafficMap] = useState({}); // deviceId -> { rx, tx, interface, rxFormatted, txFormatted }
  const [uplinkMap, setUplinkMap] = useState({}); // deviceId -> uplink iface name
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
      // fetch uplinks for each device
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

  // Refetch every 10s for status
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard NOC</h2>
          <p className="text-sm text-gray-400">Kelola {devices.length} Mikrotik • Klik card untuk lihat traffic realtime</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
            {['all', 'online', 'offline'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{f} {f === 'all' ? `(${devices.length})` : f === 'online' ? `(${devices.filter(d=>d.status==='online').length})` : `(${devices.filter(d=>d.status==='offline').length})`}</button>
            ))}
          </div>
          {(me?.role === 'admin' || me?.role === 'pop') && (
            <Link href="/devices/add" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white flex items-center gap-2">
              <span className="text-lg leading-none">+</span> Tambah Mikrotik
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="glass rounded-xl p-4 border border-gray-800">
          <div className="text-2xl font-bold text-white">{devices.length}</div>
          <div className="text-xs text-gray-500">Total Device</div>
        </div>
        <div className="glass rounded-xl p-4 border border-gray-800">
          <div className="text-2xl font-bold text-emerald-400">{devices.filter(d=>d.status==='online').length}</div>
          <div className="text-xs text-gray-500">Online</div>
        </div>
        <div className="glass rounded-xl p-4 border border-gray-800">
          <div className="text-2xl font-bold text-red-400">{devices.filter(d=>d.status==='offline').length}</div>
          <div className="text-xs text-gray-500">Offline</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading devices...</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center border border-dashed border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center text-2xl">📡</div>
          <h3 className="font-semibold text-white mb-1">{filter !== 'all' ? `Tidak ada device ${filter}` : 'Belum ada Mikrotik'}</h3>
          <p className="text-sm text-gray-500 mb-4">{filter !== 'all' ? 'Coba ganti filter' : 'Tambahkan Mikrotik pertama untuk mulai monitoring realtime'}</p>
          {filter === 'all' && <Link href="/devices/add" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white inline-block">+ Tambah Mikrotik</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(device => (
            <div key={device.id} className="relative group">
              <DeviceCard device={device} traffic={trafficMap[device.id]} uplink={uplinkMap[device.id]?.uplink || uplinkMap[device.id]?.uplink === null ? uplinkMap[device.id]?.uplink : null} />
              <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                {(me?.role === 'admin' || me?.role === 'pop') && <button onClick={(e)=>{e.preventDefault(); setEditDevice(device); setShowAdd(true);}} className="w-7 h-7 rounded-md bg-gray-900 border border-gray-700 text-xs hover:bg-gray-800">✏️</button>}
                <button onClick={(e)=>{e.preventDefault(); handleTest(device.id)}} className="w-7 h-7 rounded-md bg-gray-900 border border-gray-700 text-xs hover:bg-gray-800">🔍</button>
                {me?.role === 'admin' && <button onClick={(e)=>{e.preventDefault(); handleDelete(device.id)}} className="w-7 h-7 rounded-md bg-red-900/50 border border-red-800 text-xs hover:bg-red-900">🗑️</button>}
              </div>
              {/* mobile actions */}
              <div className="flex md:hidden gap-2 mt-2">
                {(me?.role === 'admin' || me?.role === 'pop') && <button onClick={()=>{ setEditDevice(device); setShowAdd(true);}} className="flex-1 py-1.5 bg-gray-800 rounded text-xs">Edit</button>}
                <button onClick={()=>handleTest(device.id)} className="flex-1 py-1.5 bg-gray-800 rounded text-xs">Test</button>
                {me?.role === 'admin' && <button onClick={()=>handleDelete(device.id)} className="flex-1 py-1.5 bg-red-900/30 rounded text-xs text-red-400">Hapus</button>}
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
