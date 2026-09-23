# AFNA MONITORING CENTER

Network Monitoring Center untuk Mikrotik — panel web untuk pantau traffic realtime dari banyak Mikrotik via RouterOS API.

**Live:** `http://192.168.3.249:3000` (Frontend) • `http://192.168.3.249:3001` (Backend)

---

## Deskripsi

Web panel NOC untuk input beberapa Mikrotik dan lihat traffic uplink realtime. Traffic ditampilkan per interface (RX/TX) dengan grafik live 5 detik dan history (5m, 10m, 30m, 60m, 3h, 6h, 12h, 1d, 2d, 7d, 30d). Mendukung RouterOS API (8728) dan REST (80/443).

## Flow

```
Browser (Next.js) → Login (JWT) → Dashboard → Add Mikrotik → Poller 5s → Mikrotik API → WebSocket → Grafik LIVE + History
```

1. Admin/pop tambah Mikrotik (host, port, user, pass, apiType) — uplink auto-detect via `ip dhcp-client` atau `ip route 0.0.0.0/0`.
2. Backend poll tiap 5 detik `interface monitor-traffic`, simpan 60k points (~83 jam), broadcast via Socket.IO.
3. Frontend tampilkan `UPLINK: ether1` di dashboard, detail bisa ganti interface dan lihat history.

## Spesifikasi Server

Rekomendasi minimal untuk 20–50 Mikrotik:

- **OS:** Debian 12/13 atau Ubuntu 22.04
- **CPU:** 2–4 core (x86_64)
- **RAM:** 4GB (9.7GB di AMC: 6C i5-8500, 9.7GB RAM)
- **Disk:** 20GB (47GB, 3% terpakai)
- **Software:** Docker 26 + Compose 2.26 + Node 20 (di dalam container, tidak perlu install di host kecuali `docker`)

Server saat ini: `AMC @ 192.168.3.249` — 6C i5-8500, 9.7GB, 47GB, Docker 26.1.5

## Tata Cara Instalasi

```bash
# 1. Clone
git clone https://github.com/aleaengineer/AMC.git
cd AMC

# 2. Jalankan (otomatis build backend + frontend)
docker compose up -d --build

# 3. Cek
docker ps # afna-backend :3001, afna-frontend :3000
curl http://localhost:3001/api/health
# Buka http://192.168.3.249:3000 → Login admin/aleale
```

**Env (otomatis, tidak perlu ubah):**
- `PORT=3001`, `FRONTEND_URL=http://192.168.3.249:3000`, `POLL_INTERVAL=5000`, `JWT_SECRET`, `ENCRYPTION_KEY`

**Update:**
```bash
git pull
docker compose up -d --build
```

## Tata Cara Setup Mikrotik & Add Mikrotik

**Di Mikrotik (WinBox/Terminal):**
```
/ip service enable api
/ip service set api port=8728 address=192.168.3.249/32
/user add name=noc group=read password=xxxxx
/ip firewall filter add chain=input src-address=192.168.3.249 protocol=tcp dst-port=8728 action=accept
# Untuk REST RouterOS 7:
/ip service enable www
/ip service set www port=80 address=192.168.3.249/32
# Cek uplink:
/ip dhcp-client print
/ip route print where dst-address=0.0.0.0/0
```

**Di Web Panel:**
1. Login sebagai `admin` atau `pop`.
2. `Dashboard → Tambah Mikrotik` atau `http://192.168.3.249:3000/devices/add`.
3. Isi `Nama`, `Host` (IP Mikrotik), `Port` (8728 untuk API), `Username`, `Password`, `API Type` (api/rest).
4. `Simpan & Monitor` → dashboard tampil `UPLINK: ether1` + `RX/TX` live. Klik card untuk detail dan ganti interface.

Port custom didukung — ganti `Port` sesuai `/ip service print`.

## Role

| Role | Akses Device | Akses User |
|---|---|---|
| **admin** | Lihat semua device, bisa tambah/edit/hapus semua | Kelola semua user (admin, pop, teknisi) di `Settings → User Management` |
| **pop** | Hanya lihat device yang dia buat sendiri | Hanya bisa buat/edit/hapus user `teknisi` miliknya sendiri |
| **teknisi** | Hanya lihat device milik induk `pop`-nya (pop yang buat akun teknisi), view only | Tidak bisa kelola user |

**Default akun:**
- `admin / aleale` (admin)
- `pop / pop123` (pop)
- `teknisi / teknisi123` (teknisi) — lihat device pop induk

Login di `http://192.168.3.249:3000/login`. Setelah login, footer tampil `IP` kamu yang mengakses panel.
