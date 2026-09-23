"use client";
import Link from 'next/link';

export default function DeviceCard({ device, traffic, uplink }) {
  const isOnline = device.status === 'online';
  const displayUplink = uplink || traffic?.interface || '-';
  return (
    <Link href={`/devices/${device.id}`} className="block group">
      <div className="glass glass-card p-3 sm:p-4">
        {/* Top cyber line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-60 group-hover:opacity-100 transition" />
        <div className="flex items-start justify-between mb-2.5 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[13px] sm:text-sm text-white truncate tracking-tight">{device.name}</h3>
            <p className="text-[11px] text-[var(--color-fg-muted)] truncate">{device.host}:{device.port} • {device.username} • {device.apiType}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : device.status === 'unknown' ? 'bg-white/5 text-[var(--color-fg-muted)] border-white/10' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse' : device.status === 'unknown' ? 'bg-gray-500' : 'bg-red-500'}`}></span>
            {device.status}
          </span>
        </div>

        <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="glass-pill cyan text-[10px] px-2 py-0.5">UPLINK: {displayUplink}</span>
          {uplink && traffic?.interface && uplink !== traffic.interface && <span className="text-[10px] text-amber-400/80 border border-amber-400/20 rounded-full px-2 py-0.5">live: {traffic.interface}</span>}
        </div>

        {traffic ? (
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl p-2.5 border border-cyan-400/10 bg-[rgba(0,235,235,0.04)]">
              <div className="text-[11px] text-cyan-300/70 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00ebeb]"></span> RX
              </div>
              <div className="font-mono font-bold text-cyan-300 text-[13px] sm:text-sm">{traffic.rxFormatted || '0 bps'}</div>
              <div className="text-[10px] text-[var(--color-fg-dim)] truncate">{traffic.interface || '-'}</div>
            </div>
            <div className="rounded-xl p-2.5 border border-amber-400/10 bg-[rgba(237,200,49,0.05)]">
              <div className="text-[11px] text-amber-300/70 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#edc831]"></span> TX
              </div>
              <div className="font-mono font-bold text-amber-300 text-[13px] sm:text-sm">{traffic.txFormatted || '0 bps'}</div>
              <div className="text-[10px] text-[var(--color-fg-dim)] truncate">{traffic.interface || '-'}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-3 border border-dashed border-[var(--color-border)] bg-[rgba(0,0,0,0.2)] text-center">
            <div className="text-xs text-[var(--color-fg-muted)]">Menunggu data realtime...</div>
            <div className="text-[11px] text-[var(--color-fg-dim)] mt-1">Uplink {displayUplink} • polling 5s</div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-fg-dim)]">
          <span className="truncate pr-2">Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
          <span className="text-cyan-400/80 group-hover:text-cyan-300 shrink-0">Lihat detail →</span>
        </div>
      </div>
    </Link>
  );
}
