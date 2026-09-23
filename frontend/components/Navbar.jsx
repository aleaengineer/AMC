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
          <Link key={n.href} href={n.href} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${isActive(n.href) ? 'bg-[rgba(0,235,235,0.12)] border-cyan-400/30 text-cyan-400 shadow-[0_0_10px_rgba(0,235,235,0.15)]' : 'border-transparent text-[var(--color-fg-muted)] hover:text-white hover:bg-white/5 hover:border-white/10'}`}>
            <span className="mr-1">{n.icon}</span>{n.label}
          </Link>
        ))}
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
