import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AFNA MONITORING CENTER",
  description: "Network Monitoring Center for Mikrotik - Realtime Traffic",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="dark">
      <body className="relative min-h-screen overflow-x-hidden antialiased">
        {/* Ambient blobs like nu.afna.link */}
        <div aria-hidden="true" className="ambient-blob b1" style={{ top: '-15%', left: '-10%', width: '55vw', height: '55vw', animation: 'var(--animate-float)' }}></div>
        <div aria-hidden="true" className="ambient-blob b2" style={{ top: '10%', right: '-15%', width: '45vw', height: '45vw', animation: 'var(--animate-float)', animationDelay: '5s' }}></div>
        <div aria-hidden="true" className="ambient-blob b3" style={{ bottom: '-20%', left: '30%', width: '60vw', height: '60vw', animation: 'var(--animate-float)', animationDelay: '10s' }}></div>
        <script dangerouslySetInnerHTML={{ __html: `!function(){try{var t=localStorage.getItem("afna-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}}()` }} />
        <header className="sticky top-0 z-50 glass" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white shrink-0">AF</div>
              <div className="min-w-0">
                <h1 className="font-bold text-lg leading-none truncate">AFNA MONITORING CENTER</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Network Operations Center • Realtime Mikrotik Traffic</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs shrink-0">
              <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE 5s
              </span>
              <Navbar />
            </div>
          </div>
        </header>
        <main className="max-w-[1400px] mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-[1400px] mx-auto px-4 py-4 text-center text-xs text-gray-600 border-t border-gray-900 mt-8">
          AFNA MONITORING CENTER © 2026 • Built for AFNALINK NOC
        </footer>
      </body>
    </html>
  );
}
