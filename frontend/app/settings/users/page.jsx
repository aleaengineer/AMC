"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import Link from 'next/link';

export default function UsersPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'teknisi', name: '', email: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    if (!['admin','pop'].includes(u.role)) { router.push('/settings'); return; }
    setMe(u);
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      setUsers(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/api/users/${editing}`, payload);
        setMsg('User diupdate');
      } else {
        await api.post('/api/users', form);
        setMsg('User dibuat');
      }
      setForm({ username: '', password: '', role: 'teknisi', name: '', email: '' });
      setEditing(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleEdit = (u) => {
    setEditing(u.id);
    setForm({ username: u.username, password: '', role: u.role, name: u.name, email: u.email });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus user ini?')) return;
    try {
      await api.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ username: '', password: '', role: 'teknisi', name: '', email: '' });
  };

  if (!me) return <div className="text-center py-12 text-gray-500">Memeriksa akses...</div>;

  const isPop = me.role === 'pop';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">← Settings</Link>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          {isPop ? (
            <>Kamu <b className="text-emerald-400">pop</b> — hanya bisa buat/edit <b className="text-amber-400">teknisi</b> milikmu sendiri</>
          ) : (
            <>Tambah user dengan role <b className="text-white">admin</b> (full), <b className="text-white">pop</b> (add/edit device), <b className="text-white">teknisi</b> (view only) • Admin kelola semua, pop hanya teknisi own</>
          )}
        </p>

        <form onSubmit={handleCreate} className="mt-6 p-4 rounded-xl bg-[#0a0e1a] border border-gray-800 space-y-3">
          <h3 className="font-medium text-white text-sm">{editing ? 'Edit User' : 'Tambah User Baru'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Username *</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Password {editing ? '(kosongkan jika tidak ganti)' : '*'}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} placeholder="••••••••" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                {!isPop && <option value="admin">admin — full akses</option>}
                {!isPop && <option value="pop">pop — add/edit device</option>}
                <option value="teknisi">teknisi — view only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Nama</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400">Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@afnalink.local" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          {error && <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
          {msg && <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">{msg}</div>}
          <div className="flex gap-2">
            <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white">{editing ? 'Update' : 'Tambah'}</button>
            {editing && <button type="button" onClick={cancelEdit} className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white">Batal</button>}
          </div>
        </form>

        <div className="mt-6">
          <h3 className="font-medium text-white mb-3">Daftar User ({users.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0a0e1a] text-gray-400 text-xs">
                <tr>
                  <th className="text-left p-2">Username</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Nama</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/30">
                    <td className="p-2 font-mono text-white">{u.username}</td>
                    <td className="p-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role==='admin'?'bg-blue-600 text-white':u.role==='pop'?'bg-emerald-600 text-white':'bg-amber-600 text-white'}`}>{u.role}</span></td>
                    <td className="p-2 text-gray-300">{u.name}</td>
                    <td className="p-2 text-gray-400 text-xs">{u.email}</td>
                    <td className="p-2 flex gap-1">
                      <button onClick={() => handleEdit(u)} className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-white">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="px-2.5 py-1 rounded bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-xs text-red-400">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
