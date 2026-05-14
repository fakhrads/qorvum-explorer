# Qorvum Explorer

Web UI untuk memonitor dan mengoperasikan node Qorvum secara real-time. Dibangun dengan React Router v7, TypeScript, dan Tailwind CSS.

---

## Fitur

| Halaman | Deskripsi |
|---|---|
| **Dashboard** | Ringkasan jaringan: blok terbaru, transaksi, status node, kontrak aktif |
| **Block Explorer** | Browse blok dan transaksi dengan detail lengkap per entry |
| **Contracts** | Daftar kontrak yang terdeploy beserta fungsi-fungsinya |
| **PKI & Certs** | Manajemen user: enroll, list, revoke; tampilkan detail sertifikat |
| **Node Monitor** | Status dan topologi semua node yang terhubung via P2P |
| **Event Log** | Stream event real-time (block, tx, node_status) + API reference |
| **API Playground** | Coba endpoint REST langsung dari browser |

**Koneksi real-time:** Semua data live menggunakan WebSocket (`/api/v1/ws`). Tidak ada polling berlebihan — blok dan transaksi baru muncul otomatis tanpa refresh.

---

## Prerequisites

- Node.js 20+
- Node Qorvum yang sedang berjalan (default `http://localhost:8080`)

---

## Development

```bash
npm install
npm run dev
```

Explorer tersedia di `http://localhost:5173`.

**Arahkan ke node Qorvum:** Buka Settings (ikon gear di top bar) → isi Gateway URL → klik Test.

Default URL: `http://localhost:8080`. Disimpan di `localStorage`, persist antar session.

---

## Build Production

```bash
npm run build
npm start
```

Server berjalan di port `3000`.

---

## Docker

```bash
docker build -t qorvum-explorer .
docker run -p 3000:3000 qorvum-explorer
```

---

## Konfigurasi

Semua konfigurasi disimpan di `localStorage` browser — tidak ada environment variable yang diperlukan untuk menjalankan explorer.

| Setting | Default | Keterangan |
|---|---|---|
| Gateway URL | `http://localhost:8080` | Alamat node Qorvum yang dituju |
| Token | — | JWT Bearer token, otomatis diisi setelah login |
| Token Expiry | — | Direfresh otomatis 5 menit sebelum kadaluarsa |

Untuk mengubah gateway URL setelah login: Settings → Gateway Configuration.

---

## Autentikasi

Explorer menggunakan JWT Bearer token dari Qorvum gateway. Login dari halaman login atau via Settings.

```
Username: admin
Password: <sesuai yang di-bootstrap di node>
```

Token disimpan di `localStorage` dan dipakai untuk semua request API. Session otomatis redirect ke login saat token expired.

---

## Struktur Project

```
app/
├── components/
│   ├── ui.tsx            # Design system: Card, Badge, Table, Button, dll
│   ├── icons.tsx         # Icon set (Lucide-style, manual SVG)
│   ├── layout.tsx        # Sidebar, TopBar, Layout wrapper
│   └── ConnectionBanner  # Banner disconnect / reconnect
├── lib/
│   ├── api.ts            # REST client — semua call ke gateway
│   ├── hooks.ts          # React hooks: useHealth, useBlocks, useTransactions, dll
│   ├── ws-context.tsx    # WebSocket context (single shared connection)
│   ├── config.ts         # localStorage config store
│   └── utils.ts          # Helper: timeAgo, format, dll
└── pages/
    ├── Dashboard.tsx
    ├── Explorer.tsx
    ├── Contracts.tsx
    ├── Pki.tsx
    ├── Nodes.tsx
    ├── EventsApi.tsx
    └── Login.tsx
```

---

## WebSocket Events

Explorer subscribe ke tiga topic saat connect:

| Topic | Data | Trigger |
|---|---|---|
| `blocks` | `{ block_num, tx_count, timestamp }` | Setiap blok baru di-commit |
| `tx` | `{ tx_id, block_num, contract_id, function_name, caller, success }` | Setiap transaksi selesai |
| `node_status` | `{ status, peer_count, latest_block, mode, peers[] }` | Peer join/leave jaringan |

Koneksi WebSocket otomatis reconnect dengan exponential backoff (max 30 detik) jika terputus.

---

## Type Check

```bash
npm run typecheck
```

---

Apache License 2.0
