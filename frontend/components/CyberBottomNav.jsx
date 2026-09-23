"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';

export default function CyberBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
    const id = setInterval(() => setUser(getUser()), 1000);
    return () => clearInterval(id);
  }, [pathname]);

  // Hanya tampil jika sudah login dan bukan di halaman login
  if (pathname === '/login' || !user) return null;

  const allItems = [
    { href: '/', label: 'Dash', icon: '◉', roles: ['admin','pop','teknisi'] },
    { href: '/devices/add', label: 'Add', icon: '＋', roles: ['admin','pop'] },
    { href: '/profile', label: 'Profile', icon: '◈', roles: ['admin','pop','teknisi'] },
    { href: '/settings', label: 'Settings', icon: '⬡', roles: ['admin','pop','teknisi'] },
  ];
  const items = allItems.filter(i => i.roles.includes(user.role));
  const isActive = (href) => pathname === href || (href !== '/' && pathname.startsWith(href));
  return (
    <nav className="cyber-bottom-nav lg:hidden" aria-label="Mobile navigation">
      {items.map(item => (
        <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
          <span className="text-[14px] leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
