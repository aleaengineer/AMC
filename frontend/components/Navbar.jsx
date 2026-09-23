"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
    const onStorage = () => setUser(getUser());
    window.addEventListener('storage', onStorage);
    // also check every 1s for login change in same tab
    const id = setInterval(() => setUser(getUser()), 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(id);
    };
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  // Don't show nav on login page
  if (pathname === '/login') return null;

  const allNav = [
    { href: '/', label: 'Dashboard', icon: '📊', roles: ['admin','pop','teknisi'] },
    { href: '/devices/add', label: 'Add Mikrotik', icon: '➕', roles: ['admin','pop'] },
    { href: '/profile', label: 'Profile', icon: '👤', roles: ['admin','pop','teknisi'] },
    { href: '/settings', label: 'Settings', icon: '⚙️', roles: ['admin','pop','teknisi'] },
  ];
  const nav = allNav.filter(n => !user || n.roles.includes(user.role));

  return (
    <nav className="flex items-center gap-1">
      <div className="hidden lg:flex items-center gap-1 mr-2">
        {nav.map(n => (
          <Link key={n.href} href={n.href} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive(n.href) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <span className="mr-1">{n.icon}</span>{n.label}
          </Link>
        ))}
      </div>

      {/* mobile nav dropdown via select? keep simple */}
      <div className="lg:hidden mr-2">
        <select value={nav.find(n => isActive(n.href))?.href || '/'} onChange={e => router.push(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white">
          {nav.map(n => <option key={n.href} value={n.href}>{n.label}</option>)}
        </select>
      </div>

      {user ? (
        <div className="flex items-center gap-2">
          <div className="hidden md:block text-right">
            <div className="text-xs font-medium text-white leading-none">{user.name || user.username}</div>
            <div className="text-[11px] text-gray-500 capitalize">{user.role}</div>
          </div>
          <span className={`hidden md:inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${user.role==='admin'?'bg-blue-600':user.role==='pop'?'bg-emerald-600':'bg-amber-600'} text-white`}>{user.role}</span>
          <button onClick={handleLogout} className="px-2.5 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-xs text-red-400">Logout</button>
        </div>
      ) : (
        <Link href="/login" className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white">Login</Link>
      )}
    </nav>
  );
}
