"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuth, getToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (token) router.push('/');
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', form);
      setAuth(res.data.token, res.data.user);
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="glass rounded-2xl p-8 w-full max-w-md border border-gray-800 shadow-2xl">
        <div className="text-center mb-6">
          <img src="https://nu.afna.link/files/settings/central/202607/eb9a98675fc570613d20115e0a57e44e.png" alt="AFNA" className="w-14 h-14 mx-auto rounded-xl object-contain bg-[#020208] border border-cyan-400/30 shadow-[0_0_12px_rgba(0,235,235,0.25)] p-1" />
          <h1 className="font-bold text-xl text-white mt-3">AFNA MONITORING CENTER</h1>
          <p className="text-sm text-gray-400 mt-1">Login untuk akses NOC Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400">Username</label>
            <input
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="admin"
              required
              className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">{error}</div>
          )}

          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-600 mt-4">
          AFNA MONITORING CENTER © 2026
        </div>
      </div>
    </div>
  );
}
