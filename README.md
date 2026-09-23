# AFNA MONITORING CENTER — Network Operations Center (NOC)

**Realtime Mikrotik Traffic via RouterOS API + WebSocket • Multi-device • Uplink Auto-Detect • History Grafik • Role-Based**

> **Live:** Frontend `http://192.168.3.249:3000` • Backend `http://192.168.3.249:3001` • Server `AMC Debian 13 Trixie @ 192.168.3.249` (6 CPU i5-8500, 9.7GB RAM, 47GB)
> **Stack:** `Node 20.19.2 + Express 4.19 + Socket.IO 4.7 + Prisma-like JSON + Next.js 14.2 + Recharts 2.12 + Docker 26.1`

---

## 1. Ringkas

Web panel untuk input banyak Mikrotik (host/port/user/pass/apiType) lewat UI. Server konek ke Mikrotik via **RouterOS API 8728** (atau REST 80/443) lalu broadcast traffic **realtime 5 detik** via WebSocket ke frontend. Dashboard tampilkan **uplink** saja (bukan semua interface), detail bisa pilih interface lain. History grafik dengan range **5m,10m,30m,60m,3h,6h,12h,1d,2d,7d,30d** downsampled 400 points.

## 2. Fitur Lengkap (v1.0 23 Sep 2026)

**Realtime & Uplink**
- Polling `5s` (`backend/src/poller.js:9`, env `POLL_INTERVAL=5000`, `deviceManager.js:185` simpan `60k points ≈ 83 jam / 3.5 hari` per interface)
- Uplink auto-detect `backend/src/mikrotik.js:84` `getUplinkInterface()`:
  1. `GET /ip/dhcp-client/print` → cari `disabled=false` + `interface` (prioritas `status bound`)
  2. Fallback `GET /ip/route/print` → `dst-address 0.0.0.0/0` + `active=true` + `!routing-mark` → parse `gateway-status "via ether1"`
- Dashboard `frontend/app/page.jsx:22` fetch `GET /api/uplinks` → `DeviceCard` badge `UPLINK: ether1` `frontend/components/DeviceCard.jsx:22`, `GET /api/devices` ter-filter role
- LIVE Traffic `frontend/components/TrafficChart.jsx:6` `LineChart` 5s, History `frontend/components/HistoryChart.jsx:1` `AreaChart` gradient + selector + stats `Last/Max/Avg`

**History**
- `GET /api/devices/:id/history?interface=ether1&range=30m&points=400` `backend/src/server.js:148` `parseRangeToHours` (`5m→0.08h`) + `downsample(target 400)` rata-rata `rx/tx` + `maxRx/maxTx`
- Detail page `frontend/app/devices/[id]/page.jsx:171` `<HistoryChart deviceId iface>` + `TrafficChart` live + `Interfaces` table + `Raw Data` collapsible (tabel lama `last 200 points` sudah diganti grafik)

**Device & API**
- Custom port support (`mikrotik.js:8` `port: device.port`) — `api` default 8728, `rest` default 80 — input di `frontend/app/devices/add/page.jsx:9`
- `POST /api/devices/:id/test` cek koneksi, `POST /detect` auto-detect `api/rest` via `mikrotik.js:167`
- `GET /api/devices/:id/interfaces` (`/interface/print`), `GET /duplink`, `GET /uplinks` batch

**Auth & Role (RBAC)**
- `backend/src/userManager.js:1` `users.json` `bcryptjs` + `backend/src/auth.js:1` `jsonwebtoken 7d` `JWT_SECRET`
- Seed `admin/aleale` (admin), `pop/pop123` (pop), `teknisi/teknisi123` (teknisi) — `userManager.js:34`
- **Roles:**
  | Role | Device | User Management |
  |---|---|---|
  | `admin` | lihat semua, CRUD semua device (`POST/PUT` admin,pop; `DELETE` admin,pop own) | kelola semua user (`admin,pop,teknisi`) |
  | `pop` | **hanya own** (`ownerId === pop.id`) — `deviceManager.js:84` `getDevicesForUser` strict (legacy `ownerId null` hanya admin), `canAccessDevice` check di semua `history,interfaces,uplink` & socket `set:interfaces` | hanya bisa buat/edit/hapus `teknisi` miliknya (`createdBy === pop.id`) — `userManager.js:104` `pop hanya bisa membuat teknisi` |
  | `teknisi` | lihat device milik induk `pop` (`createdBy`) — `getDevicesForUser` `ownerId === parentId`, view only (`POST/PUT/DELETE` `requireRole admin,pop` → 403) | tidak bisa `GET /api/users` (`403`) |
- Frontend `frontend/lib/api.js:11` interceptor `Bearer token` + `401 → /login`, `frontend/components/Navbar.jsx:34` filter nav `roles` (Add Mikrotik hidden untuk teknisi), `frontend/app/page.jsx:36` `getToken()` redirect `/login`, `frontend/app/devices/add/page.jsx:14` locked card untuk teknisi (seperti User Management), `frontend/app/settings/users/page.jsx:16` `['admin','pop']` + dropdown role hanya `teknisi` untuk pop

**Halaman Terpisah**
- `http://192.168.3.249:3000/login` `frontend/app/login/page.jsx:1`
- `http://192.168.3.249:3000/devices/add` `frontend/app/devices/add/page.jsx:1` (khusus, locked untuk teknisi)
- `http://192.168.3.249:3000/devices/:id` `frontend/app/devices/[id]/page.jsx:10` (uplink auto, LIVE + History, Interfaces)
- `http://192.168.3.249:3000/profile` `frontend/app/profile/page.jsx:1` (`GET/PUT /api/auth/me`)
- `http://192.168.3.249:3000/settings` `frontend/app/settings/page.jsx:1`
- `http://192.168.3.249:3000/settings/users` `frontend/app/settings/users/page.jsx:1` (admin semua, pop own teknisi)

**Tema**
- `https://nu.afna.link/` dark `frontend/app/globals.css:5` `:root --bg radial-gradient #000a1a→#00030f + --glass-bg linear-gradient #e2f1fa1a + --blob-1 #007ca673` + `ambient-blob 3x blur 40px` (ringan: dari `80px→40px`, `glass blur 40px→16px`, `background-attachment fixed→scroll` di mobile) — `frontend/app/layout.jsx:11` `data-theme="dark"` + 3 `ambient-blob` div + script `localStorage afna-theme`
- `LIVE 5s` badge, `glass` `backdrop-blur 16px saturate 140%` `radius 20px`, `glass-card:hover -1px`
- Dashboard tabel `Cara Setup Mikrotik` sudah dihapus `frontend/app/page.jsx:163` (sesuai request)

---

## 3. Arsitektur

```
[Browser Next.js 3000] --(REST /api/* + Socket.IO auth Bearer)--> [Express 3001 + Poller 5s] --(TCP 8728 node-routeros / REST 80 axios)--> [Mikrotik RouterOS]
                                      |-> deviceManager.js devices.json + traffic_history.json (Docker volume backend_data:/app/data)
                                      |-> userManager.js users.json
```

**File Penting**
```
afna-monitoring-center/
├── docker-compose.yml (PORT 3001, FRONTEND_URL, POLL_INTERVAL=5000, JWT_SECRET)
├── backend/
│   ├── Dockerfile (node:20-alpine, npm install --production)
│   ├── package.json (axios, express, socket.io, node-routeros 1.6.9, bcryptjs, jsonwebtoken, uuid)
│   ├── .env (PORT, FRONTEND_URL, ENCRYPTION_KEY, JWT_SECRET, POLL_INTERVAL)
│   └── src/
│       ├── server.js (Express + Socket.IO, auth middleware, device/user/history/uplink routes, poller start)
│       ├── deviceManager.js (JSON devices.json + memoryHistory 60k, getDevicesForUser, canAccessDevice, ownerId)
│       ├── userManager.js (users.json, bcrypt, getUsersForRequester, createdBy)
│       ├── auth.js (JWT generate/verify, authRequired, requireRole, socketAuth)
│       ├── mikrotik.js (RouterOSAPI + axios REST, getInterfaces, getTraffic, getDhcpClient, getRoutes, getUplinkInterface)
│       └── poller.js (setInterval 5s, getUplinkInterface → [uplink], addHistory, emit traffic:*)
└── frontend/
    ├── Dockerfile (node:20-alpine multi-stage, Next standalone)
    ├── package.json (next 14.2, react 18, recharts 2.12, socket.io-client, axios)
    ├── next.config.js (output standalone)
    ├── app/
    │   ├── globals.css (nu theme vars, ambient-blob, glass)
    │   ├── layout.jsx (html data-theme dark + ambient blobs + Navbar)
    │   ├── page.jsx (Dashboard, filter all/online/offline, DeviceCard uplink, Link /devices/add, role guard)
    │   ├── login/page.jsx
    │   ├── devices/[id]/page.jsx (uplink auto, TrafficChart live 5s, HistoryChart range, Interfaces table)
    │   ├── devices/add/page.jsx (locked untuk teknisi)
    │   ├── profile/page.jsx
    │   └── settings/page.jsx + settings/users/page.jsx
    ├── components/
    │   ├── Navbar.jsx (role filter nav)
    │   ├── DeviceCard.jsx (uplink badge, RX/TX)
    │   ├── TrafficChart.jsx (LineChart live)
    │   ├── HistoryChart.jsx (AreaChart range 5m-30d, downsample)
    │   └── AddDeviceModal.jsx (edit modal, add via /devices/add)
    └── lib/api.js (axios baseURL, interceptor token, formatBits)
```

---

## 4. Deploy di 192.168.3.249 (AMC)

**Server:** `Debian 13 Trixie, 6C i5-8500, 9.7G RAM, 47G disk, Docker 26.1.5, Compose 2.26.1, Node 20.19.2`

```bash
# di server
cd /opt/afna-monitoring-center
cat .env # PORT=3001 POLL_INTERVAL=5000 JWT_SECRET
docker compose up -d --build
docker ps # afna-backend 0.0.0.0:3001->3001, afna-frontend 0.0.0.0:3000->3000
docker logs afna-backend --tail 20 # Uplink detected ether1, Polling interfaces: ether1, [Users] Seeded...
curl http://localhost:3001/api/health # {"status":"ok"}
curl http://localhost:3000 -I # 200
```

**ENV**
```
# backend/.env
PORT=3001
FRONTEND_URL=http://192.168.3.249:3000,http://localhost:3000
ENCRYPTION_KEY=afna-monitoring-center-secret-key-32b-change-me
JWT_SECRET=afna-jwt-super-secret-change-me-32b
JWT_EXPIRES=7d
POLL_INTERVAL=5000
NODE_ENV=production
```

**Volume:** `backend_data:/app/data` → `/app/data/devices.json`, `traffic_history.json`, `users.json` (persist, 60k points)

---

## 5. API

**Public:** `GET /api/health`

**Auth:** `POST /api/auth/login {username,password} → {token,user}`, `GET /api/auth/me` (Bearer), `PUT /api/auth/me {name,email,password}`

**Devices (Bearer, role):**
- `GET /api/devices` — admin all, pop own, teknisi parent pop
- `GET /api/devices/:id` — 403 jika bukan milik (pop/teknisi)
- `POST /api/devices {name,host,port,username,password,apiType}` — admin,pop (ownerId=req.user)
- `PUT /api/devices/:id` — admin,pop own only
- `DELETE /api/devices/:id` — admin,pop own only
- `POST /api/devices/:id/test`, `POST /detect`, `GET /interfaces`, `GET /uplink`, `GET /history?interface=ether1&range=30m&points=400`, `GET /history-all`, `GET /uplinks` — semua cek `canAccessDevice`

**Users (Bearer):**
- `GET /api/users` — admin all, pop own teknisi (`getUsersForRequester`)
- `POST /api/users {username,password,role,name,email}` — admin any, pop only teknisi (`Pop hanya bisa membuat user teknisi`)
- `PUT /api/users/:id`, `DELETE /api/users/:id` — admin any, pop only own teknisi

**WebSocket** `ws://192.168.3.249:3001` `auth:{token}` `emit set:interfaces {deviceId,interfaces}` cek `canAccessDevice`, `subscribe:traffic`, `emit traffic:*`

---

## 6. Mikrotik Setup

```r
# API (8728)
/ip service enable api
/ip service set api port=8728 address=192.168.3.249/32
/user add name=noc group=read password=xxx
# cek: /ip service print

# REST (RouterOS 7, 80/443)
/ip service enable www
/ip service set www port=80 address=192.168.3.249/32
# atau www-ssl 443

# Firewall
/ip firewall filter add chain=input src-address=192.168.3.249 protocol=tcp dst-port=8728 action=accept

# Uplink auto: pastikan /ip dhcp-client ada (jika DHCP) atau /ip route 0.0.0.0/0 AS via ether1
/ip dhcp-client print
/ip route print where dst-address=0.0.0.0/0
```

---

## 7. Frontend Routes & Role

| Route | Akses | Catatan |
|---|---|---|
| `/login` | public | `admin/aleale`, `pop/pop123`, `teknisi/teknisi123` |
| `/` Dashboard | `admin,pop,teknisi` (redirect /login jika no token) | `pop` hanya own, `teknisi` induk pop, `+ Tambah` hidden untuk teknisi |
| `/devices/add` | `admin,pop` (teknisi locked card) | `POST /api/devices` |
| `/devices/:id` | `admin` all, `pop` own, `teknisi` parent pop (403 jika bukan) | LIVE 5s + History 5m-30d + Interfaces |
| `/profile` | `admin,pop,teknisi` | `PUT /api/auth/me` |
| `/settings` | `admin,pop,teknisi` | link User Management untuk `admin,pop` (teknisi locked) |
| `/settings/users` | `admin` all, `pop` own teknisi (teknisi redirect) | dropdown role `admin` semua, `pop` hanya teknisi |

**Cara tambah device:** `Dashboard → + Tambah Mikrotik → /devices/add` (atau modal Edit di card) → isi host/port/user/pass → `Simpan & Monitor (5s)` → Poller `Uplink detected ether1` → Dashboard `UPLINK: ether1` `RX/TX` live via `traffic` socket.

---

## 8. Polling & History Detail

- Polling `5s` `poller.js:9` `POLL_INTERVAL` → `deviceManager.addHistory` → `memoryHistory[deviceId][iface]` push `{rx,tx,timestamp}` → `max 60k` → `saveHistoryToFile` tiap `5s` → volume
- History `server.js:148` `GET /history?range=30m` → `getHistoryRange(hours)` → `downsample(target 400)` average bucket → `AreaChart` `HistoryChart.jsx:1` `RANGES 5m-30d` auto-refresh `15s` (5m-60m) / `60s`
- LIVE `TrafficChart.jsx:6` `LineChart` `data.length 200` `5s interval` + `HistoryChart` terpisah

---

## 9. Tema nu.afna.link

`frontend/app/globals.css:5` `:root --bg radial-gradient #000a1a→#00030f + --glass-bg linear-gradient #e2f1fa1a + --blob-1 #007ca673` + `html[data-theme="dark"]` + `html[data-theme="light"]` + `body background:var(--bg) fixed (scroll di mobile)` + `.ambient-blob 3x blur 40px (dari 80px) fixed + float 20s` + `.glass backdrop-blur 16px (dari 40px) saturate 140% radius 20px` (mobile 12px) — `frontend/app/layout.jsx:11` `<html data-theme="dark">` + 3 `ambient-blob b1/b2/b3` + script `localStorage afna-theme`

Ringan: `blur 80→40`, `blur 40→16`, `will-change` hapus, `fixed→scroll` di mobile, `prefers-reduced-motion` disable float.

---

## 10. Default Akun & Testing

```bash
# login
curl -X POST http://192.168.3.249:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"aleale"}'
# → {"token":"eyJ...","user":{"role":"admin"}}

# pop hanya own
curl -H "Authorization: Bearer <pop_token>" http://192.168.3.249:3001/api/devices # hanya POP-DEVICE-TEST milik pop
curl -H "Authorization: Bearer <teknisi_token>" http://192.168.3.249:3001/api/devices # hanya parent pop

# pop buat teknisi OK, buat admin FAIL
curl -X POST http://192.168.3.249:3001/api/users -H "Authorization: Bearer <pop_token>" -d '{"username":"tek_baru","password":"test123","role":"teknisi"}'
curl -X POST ... -d '{"role":"admin"}' # → {"error":"Pop hanya bisa membuat user teknisi"}

# history
curl -H "Authorization: Bearer <token>" "http://192.168.3.249:3001/api/devices/<id>/history?interface=ether1&range=30m&points=400" | head -c 200
```

---

## 11. File di Server

```
/opt/afna-monitoring-center/
├── README.md (ini)
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env
│   └── src/server.js, deviceManager.js, userManager.js, auth.js, mikrotik.js, poller.js
└── frontend/
    ├── Dockerfile
    ├── app/globals.css, layout.jsx, page.jsx, login/page.jsx, devices/add/page.jsx, devices/[id]/page.jsx, profile/page.jsx, settings/page.jsx, settings/users/page.jsx
    ├── components/Navbar.jsx, DeviceCard.jsx, TrafficChart.jsx, HistoryChart.jsx, AddDeviceModal.jsx
    └── lib/api.js
```

**Data volume** `docker volume ls` `afna-monitoring-center_backend_data` → `/var/lib/docker/volumes/.../data` → `devices.json`, `traffic_history.json`, `users.json`

---

## 12. Troubleshooting

- `401 Unauthorized` → `localStorage afna_token` hilang → login lagi `http://192.168.3.249:3000/login`
- `403 Forbidden` pop lihat device orang → `device.ownerId !== pop.id` (cek `GET /api/devices` sebagai admin untuk lihat owner)
- `Timed out after 5 seconds` di `docker logs afna-backend` → Mikrotik `192.168.x.x:8728` tidak reachable dari `192.168.3.249` → cek `/ip service` + `firewall` + `ping` dari `docker exec afna-backend ping 192.168.x.x`
- `POP-DEVICE-TEST 192.168.5.1` dummy sudah dihapus `DELETE 8eaf...`
- Frontend berat → sudah ringan (`blur 16px`, `blob 40px`) — refresh `Ctrl+Shift+R`
- Port custom → input `port` di Add Mikrotik, backend `mikrotik.js:8` pakai `device.port`, untuk `api-ssl 8729` butuh `tls:true` (belum, hubungi)
- History kosong untuk `7d/30d` → baru `83 jam` max `60k @5s`, akan terisi seiring waktu

---

## 13. Changelog

- **23 Sep 2026 02:30** Init `Node 20 + Next 14` polling `1.5s` (MVP)
- **03:36** Uplink auto `dhcp-client → route 0.0.0.0/0` `ether1`, `GET /uplinks` (pop 192.168.3.1 & 192.168.99.31 → ether1)
- **03:46** History `30m-30d` grafik `AreaChart` downsample 400, `5s` polling `60k ≈ 83h`
- **04:02** Tema `nu.afna.link` `var(--bg) #000a1a` `glass` `ambient-blob` + ringan `blur 16px`
- **04:15** Role `admin/pop/teknisi` `JWT 7d`, halaman terpisah `/login`, `/devices/add` (locked teknisi), `/profile`, `/settings`, `/settings/users` (admin all, pop own teknisi)
- **04:30** Port custom support, `POLL_INTERVAL 1500→5000`
- **04:45** Pop own-only `ownerId`, teknisi lihat induk pop, `pop` hanya buat `teknisi`
- **04:55** Hapus tabel `Cara Setup Mikrotik` di dashboard
- **05:00** Dokumentasi `README.md` di server

---

**Kontak:** AFNA Digital • `http://192.168.3.249:3000` (NOC) • `http://192.168.3.249:3001/api/health` • Repo `E:\Programing\afna-monitoring-center` (local) ↔ `/opt/afna-monitoring-center` (server AMC)
