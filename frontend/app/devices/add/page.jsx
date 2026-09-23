"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import Link from 'next/link';

export default function AddDevicePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', host: '', port: 8728, username: 'admin', password: '', apiType: 'api' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) { router.push('/login'); return; }
    if (u.role === 'teknisi') {
      setLocked(true);
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role === 'teknisi') return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/devices', form);
      router.push(`/devices/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-center py-12 text-gray-500">Memeriksa akses...</div>;

  if (locked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">← Kembali ke Dashboard</Link>
        <div className="glass rounded-xl p-8 border border-gray-800 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center text-2xl">🔒</div>
          <h2 className="font-bold text-white mt-4">Akses Terkunci</h2>
          <p className="text-sm text-gray-400 mt-2">Halaman <b className="text-white">Tambah Mikrotik</b> hanya untuk role <span className="text-blue-400">admin</span> & <span className="text-emerald-400">pop</span>.</p>
          <p className="text-xs text-gray-500 mt-1">Role kamu: <span className="capitalize text-amber-400">{user.role}</span> — hanya bisa melihat device, tidak bisa menambah.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/" className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white">Ke Dashboard</Link>
            <Link href="/settings" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white">Ke Settings</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">← Kembali ke Dashboard</Link>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <h1 className="text-xl font-bold text-white">Tambah Mikrotik</h1>
        <p className="text-sm text-gray-400 mt-1">Input data Mikrotik untuk monitoring realtime (uplink auto-detect via dhcp-client → route 0.0.0.0/0). Role kamu: <span className="text-white font-medium">{user.role}</span></p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400">Nama Mikrotik *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="POP AFNA Pusat" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Host / IP *</label>
              <input required value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.1" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Port</label>
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder="8728" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Username *</label>
            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-400">Password *</label>
            <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-400">API Type</label>
            <select value={form.apiType} onChange={e => setForm({ ...form, apiType: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
              <option value="api">RouterOS API (8728/8729) - Recommended</option>
              <option value="rest">REST API (80/443) - RouterOS 7+</option>
            </select>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Link href="/" className="flex-1 text-center px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white">Batal</Link>
            <button type="submit" disabled={loading || user.role === 'teknisi'} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white disabled:opacity-50">
              {loading ? 'Menyimpan...' : 'Simpan & Monitor (5s)'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-3 rounded-lg bg-[#0a0e1a] border border-gray-800 text-xs">
          <div className="font-medium text-white mb-1">Info Uplink Auto:</div>
          <div className="text-gray-500">Sistem akan cek <code className="text-gray-300">/ip dhcp-client</code> dulu, jika tidak ada cek <code className="text-gray-300">/ip route 0.0.0.0/0 AS</code> untuk tentukan ether uplink yang ditampilkan di dashboard.</div>
        </div>
      </div>
    </div>
  );
}
