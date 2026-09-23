"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u) router.push('/login');
    else setUser(u);
  }, [router]);

  if (!user) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">← Dashboard</Link>

      <div className="glass rounded-xl p-6 border border-gray-800">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Kelola sistem • Role kamu: <span className="text-white capitalize">{user.role}</span></p>

        <div className="mt-6 grid gap-3">
          <Link href="/profile" className="flex items-center justify-between p-4 rounded-xl bg-[#0a0e1a] border border-gray-800 hover:border-gray-700">
            <div>
              <div className="font-medium text-white">Profile</div>
              <div className="text-xs text-gray-500">Ubah nama, email, password</div>
            </div>
            <span className="text-gray-600">→</span>
          </Link>

          <Link href="/devices/add" className="flex items-center justify-between p-4 rounded-xl bg-[#0a0e1a] border border-gray-800 hover:border-gray-700">
            <div>
              <div className="font-medium text-white">Tambah Mikrotik</div>
              <div className="text-xs text-gray-500">Halaman khusus add device (5s polling, uplink auto)</div>
            </div>
            <span className="text-gray-600">→</span>
          </Link>

          {['admin','pop'].includes(user.role) ? (
            <Link href="/settings/users" className={`flex items-center justify-between p-4 rounded-xl border hover:border-blue-500/50 ${user.role==='admin' ? 'bg-blue-600/10 border-blue-600/30' : 'bg-emerald-600/10 border-emerald-600/30'}`}>
              <div>
                <div className="font-medium text-white">User Management</div>
                <div className="text-xs text-gray-400">{user.role==='admin' ? 'Tambah / edit / hapus user • admin kelola semua' : 'Kelola teknisi milikmu • pop hanya bisa buat teknisi'}</div>
              </div>
              <span className={user.role==='admin' ? 'text-blue-400' : 'text-emerald-400'}>→</span>
            </Link>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900 border border-gray-800 opacity-60">
              <div>
                <div className="font-medium text-gray-400">User Management</div>
                <div className="text-xs text-gray-600">Hanya admin & pop yang bisa akses (kamu {user.role})</div>
              </div>
              <span className="text-gray-600">🔒</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#0a0e1a] border border-gray-800">
            <div className="font-medium text-white">System Info</div>
            <div className="text-xs text-gray-500 mt-1">AFNA MONITORING CENTER v1.0 • Polling 5s • Backend 192.168.3.249:3001 • Frontend 192.168.3.249:3000</div>
            <div className="text-xs text-gray-600 mt-2">Role admin: full akses. pop: bisa add/edit device. teknisi: view only.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
