"use client";
import Link from 'next/link';

export default function DeviceCard({ device, traffic, uplink }) {
  const isOnline = device.status === 'online';
  const displayUplink = uplink || traffic?.interface || '-';
  return (
    <Link href={`/devices/${device.id}`} className="block">
      <div className="glass rounded-xl p-4 hover:bg-gray-800/50 transition border border-gray-800 hover:border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{device.name}</h3>
            <p className="text-xs text-gray-400 truncate">{device.host}:{device.port} • {device.username} • {device.apiType}</p>
          </div>
          <span className={`ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : device.status === 'unknown' ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : device.status === 'unknown' ? 'bg-gray-500' : 'bg-red-500'}`}></span>
            {device.status}
          </span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-600/30 font-medium">UPLINK: {displayUplink}</span>
          {uplink && traffic?.interface && uplink !== traffic.interface && <span className="text-[11px] text-amber-400">live: {traffic.interface}</span>}
        </div>

        {traffic ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-800">
              <div className="text-gray-500 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> RX
              </div>
              <div className="font-mono font-bold text-blue-400 text-sm">{traffic.rxFormatted || '0 bps'}</div>
              <div className="text-[11px] text-gray-600 truncate">{traffic.interface || '-'}</div>
            </div>
            <div className="bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-800">
              <div className="text-gray-500 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> TX
              </div>
              <div className="font-mono font-bold text-amber-400 text-sm">{traffic.txFormatted || '0 bps'}</div>
              <div className="text-[11px] text-gray-600 truncate">{traffic.interface || '-'}</div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0e1a] rounded-lg p-3 border border-gray-800 text-center">
            <div className="text-xs text-gray-500">Menunggu data realtime...</div>
            <div className="text-[11px] text-gray-600 mt-1">Uplink {displayUplink} • polling 5s</div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
          <span>Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleString('id-ID') : '-'}</span>
          <span className="text-blue-400">Lihat detail →</span>
        </div>
      </div>
    </Link>
  );
}
