"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Footer() {
  const [ip, setIp] = useState('192.168.3.249');

  useEffect(() => {
    let cancelled = false;
    const fetchIp = async () => {
      try {
        // coba via backend client-ip (public)
        const res = await api.get('/api/client-ip');
        if (!cancelled && res.data?.ip) {
          // jika ip adalah 127.0.0.1 atau ::1 (localhost), fallback ke hostname frontend
          const fetchedIp = res.data.ip;
          if (fetchedIp && fetchedIp !== '127.0.0.1' && fetchedIp !== '::1' && !fetchedIp.startsWith('172.')) {
            setIp(fetchedIp);
            return;
          }
        }
      } catch (e) {
        // ignore, fallback
      }
      // fallback: coba via window location (untuk dev)
      try {
        if (!cancelled && typeof window !== 'undefined') {
          // jika diakses via 192.168.3.249, tampilkan IP client via RTC? Simple: pakai ip dari api yang sudah didapat atau fallback ke 192.168.3.249
          // untuk client IP yang sebenarnya, kita sudah coba backend. Jika masih localhost, biarkan default.
        }
      } catch {}
    };
    fetchIp();
    // refresh tiap 60 detik (jika IP berubah karena ganti network)
    const id = setInterval(fetchIp, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <footer className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 text-center text-[11px] text-[var(--color-fg-dim)] border-t border-[var(--color-border)] mt-6 hidden lg:block">
      <span className="inline-flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00ebeb]"></span>
        AFNA MONITORING CENTER © 2026 • Built for AFNALINK NOC • {ip}
      </span>
    </footer>
  );
}
