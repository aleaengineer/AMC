"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CyberBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: '/', label: 'Dash', icon: '◉' },
    { href: '/devices/add', label: 'Add', icon: '＋' },
    { href: '/profile', label: 'Profile', icon: '◈' },
    { href: '/settings', label: 'Settings', icon: '⬡' },
  ];
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
