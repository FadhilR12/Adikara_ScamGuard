# ScamGuard

Ekstensi Chrome + aplikasi web untuk intervensi tepat waktu dan Evidence Pack bagi korban penipuan digital.
Spesifikasi lengkap: [docs/PRD_ScamGuard.md](docs/PRD_ScamGuard.md).

| Paket | Isi |
|---|---|
| `packages/risk-engine` | `analyze(input, rules)` — aturan teks/URL/halaman/nomor, rumus skor PRD 9.4, 84 unit test + 40 kasus uji |
| `packages/shared` | Tipe bersama, preset Tailwind (token PRD 15), konten halaman demo |
| `apps/extension` | Chrome MV3 (Vite + @crxjs): content script, overlay "Tahan Dulu", popup, service worker |
| `apps/api` | Express + SQLite (`better-sqlite3`) + zod — `/api/v1/...` sesuai PRD 12 |
| `apps/web` | Next.js + Tailwind: Mode Darurat, Evidence Pack (Tesseract.js + jsPDF), riwayat, demo |

## Menjalankan (lokal)

Butuh Node 22. pnpm dijalankan lewat corepack (tidak perlu instal global).

```bash
corepack pnpm install
corepack pnpm dev:api          # http://localhost:4000/api/v1  (DB & seed dibuat otomatis)
corepack pnpm dev:web          # http://localhost:3000
corepack pnpm --filter @scamguard/extension build   # → apps/extension/dist
```

Chrome → `chrome://extensions` → aktifkan **Developer mode** → **Load unpacked** → pilih `apps/extension/dist`.

**Port 3000 sudah terpakai?** Jalankan web di port lain (`cd apps/web && npx next dev -p 3100`), lalu:
- build ekstensi dengan `VITE_WEB_APP_URL=http://localhost:3100`,
- jalankan API dengan `CORS_ORIGINS=http://localhost:3100`.

Variabel lingkungan: lihat `.env.example` di tiap aplikasi (PRD Lampiran E).
`NEXT_PUBLIC_IASC_URL` sengaja dikosongkan sampai tim memverifikasi URL resmi IASC (PRD Q1).

## Cara kerja deteksi otomatis

Content script (`apps/extension/src/content/content.ts`) membaca judul, heading, teks tombol/label, dan isi halaman
(maks. 20.000 karakter), lalu menjalankan risk engine **langsung di halaman**. Bila skor ≥ 70 (atau ≥ 55 dengan
formulir pembayaran), overlay "Tahan Dulu" tampil dengan ring skor dan alasan. Teks halaman tidak dikirim ke server —
yang dicatat hanya domain, URL tanpa query, skor, dan `rule_id`. Ambang & durasi jeda ada di `apps/extension/src/config.ts`.

## Pengujian

```bash
corepack pnpm test         # risk-engine (84), api (14), web (8)
corepack pnpm typecheck
corepack pnpm lint:copy    # kata terlarang PRD 15.4
```

Demo: buka `http://localhost:3000/demo/investasi` (overlay muncul) dan `/demo/aman` (tidak muncul).

### Checklist uji manual (PRD 16.3)
- [ ] FT-01 cek `bit.ly/cuan-harian` di popup (butuh internet; tautan diikuti untuk melihat tujuan)
- [ ] FT-03 overlay tampil di `/demo/investasi` · FT-04 "Tetap lanjut" terkunci 10 dtk · FT-05 setelah "Tetap lanjutkan", muat ulang tanpa overlay
- [ ] FT-06 toggle Dijeda → tidak ada overlay · FT-15 navigasi overlay dengan keyboard, `Esc` = kembali
- [ ] FT-07 "Saya sudah transfer" membuka `/darurat` · FT-08 isi data lalu muat ulang · FT-09 salin kalimat langkah 2
- [ ] FT-10 unggah resi → OCR · FT-11 file 12 MB ditolak · FT-12 PDF dengan data belum lengkap
- [ ] FT-13 matikan API lalu cek tautan → catatan offline · FT-14 akses bukti dari device lain → 401

## Catatan
- `brandDomains` & `allowlist` di `rules.default.json` adalah contoh awal — wajib diverifikasi tim (PRD Lampiran B).
- Izin `host_permissions: http(s)://*/*` dipakai agar pemeriksaan tautan manual bisa mengikuti redirect tautan pendek
  dan membaca halaman tujuan (tanpa cookie). Peringatan izin saat instal sama dengan content script yang sudah berjalan di semua situs.
- Unggah screenshot dari popup membuka halaman web `/periksa-gambar` (OCR di sana), agar bundel ekstensi tetap ≤ 1,5 MB dan
  sesuai CSP MV3.
