import "./globals.css";
import Navbar from "@/components/Navbar";
import CyberBottomNav from "@/components/CyberBottomNav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "AFNA MONITORING CENTER",
  description: "Network Monitoring Center for Mikrotik - Realtime Traffic",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="dark">
      <body className="relative min-h-screen overflow-x-hidden antialiased">
        {/* Cyber grid + blobs */}
        <div aria-hidden="true" className="cyber-grid" />
        <div aria-hidden="true" className="ambient-blob b1" style={{ top: '-15%', left: '-10%', width: '42vw', height: '42vw', animation: 'var(--animate-float)' }}></div>
        <div aria-hidden="true" className="ambient-blob b2" style={{ top: '12%', right: '-12%', width: '38vw', height: '38vw', animation: 'var(--animate-float)', animationDelay: '6s' }}></div>
        <div aria-hidden="true" className="ambient-blob b3" style={{ bottom: '-18%', left: '28%', width: '52vw', height: '52vw', animation: 'var(--animate-float)', animationDelay: '11s' }}></div>
        <script dangerouslySetInnerHTML={{ __html: `!function(){try{var t=localStorage.getItem("afna-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}}()` }} />
        {/* Top neon line */}
        <div aria-hidden="true" className="fixed top-0 inset-x-0 h-[1px] z-[60] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
        <header className="sticky top-0 z-40 glass" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, borderBottom: '1px solid rgba(0,235,235,0.12)' }}>
          <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img src="https://nu.afna.link/files/settings/central/202607/eb9a98675fc570613d20115e0a57e44e.png" alt="AFNA" className="w-9 h-9 rounded-lg object-contain bg-[#020208] border border-cyan-400/30 shrink-0 shadow-[0_0_12px_rgba(0,235,235,0.25)] p-1" />
              <div className="min-w-0">
                <h1 className="font-bold text-[15px] sm:text-lg leading-none tracking-tight truncate">AFNA <span className="text-cyan-400">MONITORING</span> CENTER</h1>
                <p className="text-[11px] text-[var(--color-fg-muted)] hidden sm:block">Network Operations Center • Realtime 5s</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs shrink-0">
              <span className="hidden md:inline-flex items-center gap-1.5 glass-pill cyan">
                <span className="glow-dot"></span>
                LIVE 5s
              </span>
              <Navbar />
            </div>
          </div>
        </header>
        <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 lg:pb-6">{children}</main>
        <CyberBottomNav />
        <Footer />
      </body>
    </html>
  );
}
