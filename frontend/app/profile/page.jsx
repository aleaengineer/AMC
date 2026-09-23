"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, setAuth, clearAuth } from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    // fetch fresh from backend
    api.get('/api/auth/me').then(res => {
      setUser(res.data);
      setForm({ name: res.data.name || '', email: res.data.email || '', password: '' });
    }).catch(() => router.push('/login'));
  }, [router]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const payload = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;
      const res = await api.put('/api/auth/me', payload);
      setMsg('Profile berhasil diupdate');
      // update local storage user
      const stored = getUser();
      const updatedUser = { ...stored, name: res.data.name, email: res.data.email };
      const token = localStorage.getItem('afna_token');
      setAuth(token, updatedUser);
      setUser(updatedUser);
      setForm({ ...form, password: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">← Dashboard</Link>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <p className="text-sm text-gray-400 mt-1">Kelola akun Anda</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-[#0a0e1a] rounded-lg p-3 border border-gray-800">
            <div className="text-xs text-gray-500">Username</div>
            <div className="font-mono text-white">{user.username}</div>
          </div>
          <div className="bg-[#0a0e1a] rounded-lg p-3 border border-gray-800">
            <div className="text-xs text-gray-500">Role</div>
            <div className="font-medium text-white capitalize">{user.role} <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${user.role==='admin'?'bg-blue-600':user.role==='pop'?'bg-emerald-600':'bg-amber-600'} text-white`}>{user.role}</span></div>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400">Nama</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Password Baru (kosongkan jika tidak ganti)</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
          </div>

          {msg && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">{msg}</div>}
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

          <div className="flex gap-3">
            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white">Simpan</button>
            <button type="button" onClick={handleLogout} className="px-6 py-2.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-sm text-red-400">Logout</button>
          </div>
        </form>

        <div className="mt-6 p-3 rounded-lg bg-[#0a0e1a] border border-gray-800 text-xs text-gray-500">
          Role: <b className="text-white">admin</b> akses penuh, <b className="text-white">pop</b> bisa add/edit device, <b className="text-white">teknisi</b> hanya view.
        </div>
      </div>
    </div>
  );
}
