# PRD — ScamGuard

**Ekstensi Peramban & Aplikasi Web untuk Intervensi Tepat Waktu dan Evidence Pack bagi Korban Penipuan Digital**

| Atribut | Nilai |
|---|---|
| Versi dokumen | 1.0 (MVP lomba) |
| Tanggal | 28 Oktober 2026 |
| Tim | Tim Yuri Time — Universitas Telkom |
| Penyusun | Fadhil Rahman Yuriana (Ketua), Wildan Bugi Rivansyah (Anggota) |
| Status | Siap implementasi (Sprint 1–3: 28–30 Oktober 2026) |
| Sumber acuan | Proposal "ScamGuard" Bab 1–6 (Template Software Development), desain antarmuka di Figma (halaman *ScamGuard UI (Claude)*) dan kanvas desain ScamGuard |
| Pendekatan | Agile ringan berbasis MVP, 3 sprint harian |

> **Cara membaca dokumen ini.** Bagian 1–4 menjelaskan *mengapa* dan *untuk siapa*. Bagian 5–12 adalah spesifikasi teknis yang bisa langsung dikerjakan (arsitektur, layar, risk engine, ekstensi, web app, API, database). Bagian 13–19 berisi kualitas, desain, pengujian, rencana sprint, risiko, dan lampiran. Setiap kebutuhan diberi kode (KF-xx, KNF-xx, US-xx, AC-xx) agar mudah dirujuk di commit, issue GitHub, dan laporan.

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Latar Belakang & Masalah](#2-latar-belakang--masalah)
3. [Tujuan, Non-Tujuan & Metrik Keberhasilan](#3-tujuan-non-tujuan--metrik-keberhasilan)
4. [Pengguna, Persona & Perjalanan Pengguna](#4-pengguna-persona--perjalanan-pengguna)
5. [Ruang Lingkup MVP](#5-ruang-lingkup-mvp)
6. [Arsitektur Sistem](#6-arsitektur-sistem)
7. [Kebutuhan Fungsional (KF) + User Story + Acceptance Criteria](#7-kebutuhan-fungsional)
8. [Spesifikasi Layar & Alur UI](#8-spesifikasi-layar--alur-ui)
9. [Spesifikasi Risk Engine](#9-spesifikasi-risk-engine)
10. [Spesifikasi Ekstensi Chrome (Manifest V3)](#10-spesifikasi-ekstensi-chrome-manifest-v3)
11. [Spesifikasi Aplikasi Web](#11-spesifikasi-aplikasi-web)
12. [Spesifikasi API Backend](#12-spesifikasi-api-backend)
13. [Model Data & Skema Database](#13-model-data--skema-database)
14. [Kebutuhan Non-Fungsional (KNF)](#14-kebutuhan-non-fungsional)
15. [Sistem Desain & Pedoman Bahasa](#15-sistem-desain--pedoman-bahasa)
16. [Rencana Pengujian](#16-rencana-pengujian)
17. [Rencana Sprint & Pembagian Tugas](#17-rencana-sprint--pembagian-tugas)
18. [Risiko & Mitigasi](#18-risiko--mitigasi)
19. [Asumsi, Pertanyaan Terbuka & Lampiran](#19-asumsi-pertanyaan-terbuka--lampiran)

---

## 1. Ringkasan Produk

ScamGuard adalah perangkat lunak yang terdiri dari **ekstensi peramban Chrome** dan **aplikasi web pendamping**. Produk ini mendampingi pengguna pada dua momen paling kritis dalam penipuan digital:

| Momen | Masalah utama | Jawaban ScamGuard |
|---|---|---|
| **Sebelum transfer** | Pengguna sulit mengenali tanda penipuan dan rentan memutuskan secara impulsif. | **Scam Risk Check** (cek tautan, nomor, teks, screenshot) + **layar "Tahan Dulu"** (jeda cooling-down) otomatis saat halaman terindikasi berisiko tinggi. |
| **Setelah transfer** | Korban panik, tidak tahu langkah awal, bukti tercecer, laporan terlambat. | **Emergency Mode** (4 langkah terpandu) + **Evidence Pack Generator** (PDF kronologi & bukti siap lapor ke bank dan IASC). |

**Prinsip produk (wajib dijaga di setiap fitur):**

1. **Tenang, bukan panik.** Bahasa netral, warna merah dipakai seperlunya, satu langkah dalam satu waktu.
2. **Transparan.** Setiap peringatan selalu menjelaskan *alasan*-nya.
3. **Tidak menuduh.** Gunakan "terindikasi berisiko", bukan "ini penipuan".
4. **Jembatan, bukan pengganti.** ScamGuard tidak membatalkan transfer atau memblokir rekening; ScamGuard mengarahkan ke kanal resmi (bank, e-wallet, IASC) dengan bukti yang lebih rapi.
5. **Keputusan tetap di tangan pengguna.** Peringatan dapat dilewati setelah jeda singkat.

---

## 2. Latar Belakang & Masalah

### 2.1 Data pendukung (dari proposal)

- Hingga 23 Desember 2025, IASC mencatat **411.055 laporan penipuan** dengan total kerugian sekitar **Rp9 triliun**; dana yang berhasil diblokir hanya **Rp402,5 miliar (~4,5%)** (Saputra, 2025 — Kontan).
- Hanya sekitar **0,9% laporan** diterima dalam **satu jam pertama** setelah kejadian, padahal dana dapat berpindah melalui banyak rekening dalam waktu singkat (Amara, 2025 — Bisnis.com mengutip OJK).
- Bias imbal hasil jangka pendek dan reaktivitas emosional berhubungan dengan perilaku transfer impulsif (Akin & Akin, 2026).

> ⚠️ **Catatan konsistensi sitasi:** di teks proposal tertulis Saputra (2025) "411.055 laporan hingga 23 Des 2025", tetapi di Daftar Pustaka tertulis Saputra (2026) "702.342 laporan hingga September 2026". Samakan sebelum dikumpulkan.

### 2.2 Problem statement

> *Pengguna internet Indonesia tidak memiliki alat yang (a) memperingatkan mereka secara kontekstual tepat sebelum mentransfer uang ke pihak berisiko, dan (b) memandu mereka bertindak cepat serta menyusun bukti lengkap setelah terlanjur menjadi korban — sehingga kerugian tinggi dan pelaporan terlambat.*

### 2.3 Pemetaan masalah → kebutuhan (Tabel 5.1 proposal)

| Kondisi | Masalah | Kebutuhan |
|---|---|---|
| Sebelum transaksi | Sulit mengenali janji keuntungan tidak wajar, desakan transfer, permintaan OTP/PIN, domain/rekening mencurigakan; keputusan impulsif. | Pemeriksaan risiko + peringatan sebelum transfer dengan penjelasan alasan. |
| Setelah transfer | Panik, tidak tahu langkah awal → pelaporan terlambat. | Panduan penanganan awal yang jelas dan berurutan. |
| Setelah transfer | Bukti & kronologi tidak terkumpul rapi. | Bantuan pengumpulan bukti + penyusunan kronologi menjadi dokumen terstruktur. |

---

## 3. Tujuan, Non-Tujuan & Metrik Keberhasilan

### 3.1 Tujuan produk

| Kode | Tujuan | Fitur terkait |
|---|---|---|
| G-1 | Meningkatkan kemampuan pengguna mengenali indikasi penipuan sebelum bertransaksi. | Scam Risk Check, daftar alasan risiko |
| G-2 | Mencegah transaksi berisiko melalui intervensi tepat waktu. | Layar "Tahan Dulu" (cooling-down) |
| G-3 | Mempercepat respons korban setelah transfer. | Emergency Mode |
| G-4 | Menyederhanakan pengumpulan & penyusunan bukti laporan. | Evidence Pack Generator + OCR |
| G-5 | Meningkatkan literasi keamanan digital secara kontekstual. | Penjelasan pada setiap peringatan, tips |
| G-6 | Menghasilkan perangkat lunak yang dapat dikembangkan berkelanjutan. | Tabel `risk_rules` yang dapat diperbarui, arsitektur modular |

### 3.2 Non-tujuan (tidak dikerjakan)

- Membatalkan transfer, membekukan rekening, atau menjamin pengembalian dana.
- Integrasi langsung dengan sistem bank, e-wallet, aparat, atau basis data internal IASC.
- Aplikasi mobile mandiri; dukungan peramban selain Chrome/Chromium.
- Model *machine learning* kompleks (MVP memakai rule-based + heuristik).
- Memindai seluruh konten pribadi pengguna (email, chat aplikasi desktop, dsb.).

### 3.3 Metrik keberhasilan MVP

| Metrik | Target MVP | Cara ukur |
|---|---|---|
| Skor SUS (System Usability Scale) | **≥ 70** (di atas rata-rata 68) | Kuesioner SUS ke ≥ 5 responden (30 Okt) |
| Waktu tampil peringatan sejak halaman selesai dimuat | **≤ 1 detik** (p90), analisis lokal ≤ 150 ms | `performance.now()` di content script |
| Akurasi deteksi pada set uji internal (Lampiran C) | Recall risiko tinggi **≥ 85%**, false positive pada situs umum **≤ 10%** | 40 kasus uji (20 berisiko, 20 aman) |
| Waktu menyusun Evidence Pack (data siap) | **≤ 10 menit** | Uji tugas dengan stopwatch |
| Keberhasilan tugas usability | **≥ 80%** responden menyelesaikan 4 tugas inti tanpa bantuan | Observasi uji usability |
| Alur end-to-end dapat didemokan | 100% (cek → Tahan Dulu → Emergency → PDF → link IASC) | Skrip demo (Lampiran D) |

---

## 4. Pengguna, Persona & Perjalanan Pengguna

### 4.1 Segmen pengguna

1. **Pengguna umum yang aktif bertransaksi online** (belanja, investasi, lowongan kerja, undian) — butuh pencegahan.
2. **Korban yang baru saja mentransfer** — butuh panduan cepat dan bukti.
3. **Keluarga pendamping** (anak yang membantu orang tua) — butuh langkah yang jelas untuk diikuti bersama.

### 4.2 Persona

**Persona A — Rina (24), karyawan, sering belanja & tertarik investasi**
- Konteks: menerima link "investasi profit tetap 30%/minggu" lewat WhatsApp, membukanya di laptop.
- Tujuan: tidak tertipu, tapi tidak mau ribet.
- Frustrasi: peringatan yang menakut-nakuti atau terlalu teknis.
- Kebutuhan: cek cepat, alasan yang mudah dimengerti.

**Persona B — Pak Budi (52), pedagang, kurang familiar teknologi**
- Konteks: sudah mentransfer Rp2.500.000 sebagai "deposit", lalu diminta "biaya pencairan".
- Tujuan: tahu apa yang harus dilakukan *sekarang*.
- Frustrasi: panik, informasi tersebar di banyak tempat, tidak tahu harus bilang apa ke bank.
- Kebutuhan: langkah satu-per-satu, contoh kalimat untuk petugas, dokumen siap kirim.

**Persona C — Dina (19), mahasiswa, membantu ibunya**
- Konteks: mendampingi ibunya yang menjadi korban.
- Kebutuhan: checklist kelengkapan bukti dan PDF yang bisa langsung dilampirkan.

### 4.3 Perjalanan pengguna utama

**J-1 Pencegahan otomatis (Persona A)**
1. Rina membuka `bit.ly/cuan-harian` → diarahkan ke `investasi-cuan88.xyz`.
2. Content script membaca URL + teks halaman → risk engine lokal → skor 86 (tinggi).
3. Overlay **"Tahan dulu sebentar"** muncul menutupi halaman; tombol "Tetap lanjut" terkunci 10 detik.
4. Rina menekan **Lihat detail** → popup hasil dengan 4 alasan.
5. Rina menekan **Kembali ke halaman aman** → tab kembali/ditutup. ✅ Transfer dicegah.

**J-2 Pemeriksaan manual (Persona A)**
1. Rina menerima nomor rekening dari penjual → klik ikon ScamGuard → **Periksa tautan / nomor** → tab **Nomor** → tempel → **Periksa sekarang**.
2. Hasil: "Risiko sedang" + alasan (mis. nomor pernah dilaporkan pengguna lain / format tidak wajar).

**J-3 Darurat (Persona B)**
1. Pak Budi klik ikon ScamGuard → **Saya sudah transfer** → web app terbuka di **Mode Darurat, Langkah 1**.
2. Langkah 1 Hentikan transfer → centang 3 checklist → **Sudah, lanjut**.
3. Langkah 2 Hubungi bank → baca **contoh kalimat** ke petugas, salin, isi nomor tiket.
4. Langkah 3 Evidence Pack → unggah bukti transfer (OCR mengisi nominal/tanggal/rekening otomatis), screenshot chat, tulis kronologi → **Unduh PDF**.
5. Langkah 4 Lapor ke IASC → buka kanal resmi, lampirkan PDF, simpan nomor laporan.
6. Layar **Semua langkah selesai**.

---

## 5. Ruang Lingkup MVP

### 5.1 Prioritas fitur (MoSCoW)

| Prioritas | Fitur | Kode KF |
|---|---|---|
| **Must** | Popup ekstensi (beranda, toggle aktif, status halaman, menu) | KF-01, KF-02 |
| **Must** | Scam Risk Check: tautan & teks | KF-01, KF-03 |
| **Must** | Deteksi otomatis halaman + layar "Tahan Dulu" | KF-02, KF-04 |
| **Must** | Emergency Mode 4 langkah | KF-05 |
| **Must** | Form kronologi + unggah bukti | KF-06, KF-07 |
| **Must** | Evidence Pack PDF (jsPDF) | KF-09 |
| **Must** | Penyimpanan data (SQLite) | KF-10 |
| **Should** | OCR bukti transfer (Tesseract.js) | KF-08 |
| **Should** | Cek nomor HP/rekening (format + daftar laporan lokal) | KF-01 |
| **Should** | Cek screenshot chat (OCR → analisis teks) | KF-01 |
| **Could** | Riwayat pemeriksaan di popup & web | KF-10 |
| **Could** | Tombol "Laporkan konten" (feedback) | KF-10 |
| **Won't (MVP)** | Akun/login penuh, sinkron multi-perangkat, ML model, dukungan Firefox/Safari, notifikasi push |

### 5.2 Definisi "Selesai" (Definition of Done) untuk setiap fitur

- Kode di-merge ke `main` lewat PR yang di-review anggota lain.
- Semua acceptance criteria fitur lulus (dicentang di issue).
- Teks UI sesuai pedoman bahasa (Bagian 15.4).
- Tidak ada error di console pada alur utama.
- Fitur bisa didemokan dari build `Load unpacked` + web app yang berjalan.

---

## 6. Arsitektur Sistem

### 6.1 Diagram komponen

```
┌───────────────────────── Peramban Chrome pengguna ─────────────────────────┐
│                                                                            │
│  ┌──────────────┐   message    ┌──────────────────────┐                    │
│  │ content.js   │ ───────────▶ │ service_worker.js    │                    │
│  │ (tiap tab)   │ ◀─────────── │ (background, MV3)    │                    │
│  │ - baca URL   │   hasil      │ - risk engine lokal  │                    │
│  │ - baca teks  │              │ - cache aturan       │──┐                 │
│  │ - overlay    │              │ - badge ikon         │  │ fetch (HTTPS)   │
│  │   Tahan Dulu │              └──────────┬───────────┘  │                 │
│  └──────────────┘                         │ chrome.storage                   │
│                                ┌──────────▼───────────┐  │                 │
│                                │ popup.html / popup.js│  │                 │
│                                │ beranda, periksa,    │  │                 │
│                                │ hasil                │  │                 │
│                                └──────────────────────┘  │                 │
└──────────────────────────────────────────────────────────┼─────────────────┘
                                                           │
            ┌──────────────────────────────────────────────▼───────────────┐
            │                    Backend API (Node.js/Express)             │
            │  /risk/check   /rules   /incidents   /evidence   /feedback   │
            │  ┌────────────────┐  ┌──────────────────┐                    │
            │  │ Risk engine    │  │ Incident service │                    │
            │  │ (shared module)│  │ + file storage   │                    │
            │  └───────┬────────┘  └────────┬─────────┘                    │
            │          └──────────┬─────────┘                              │
            │               ┌─────▼─────┐                                  │
            │               │  SQLite   │  (PostgreSQL di tahap lanjut)    │
            │               └───────────┘                                  │
            └──────────────────────────────▲───────────────────────────────┘
                                           │ REST (HTTPS)
            ┌──────────────────────────────┴───────────────────────────────┐
            │            Web App (Next.js + Tailwind CSS)                  │
            │  /darurat (Emergency Mode)  /evidence/:id  /riwayat          │
            │  Tesseract.js (OCR di browser)   jsPDF (PDF di browser)      │
            └──────────────────────────────────────────────────────────────┘
                                           │ tautan keluar
                                  Kanal resmi: bank / e-wallet / IASC
```

### 6.2 Lapisan arsitektur (Bab 6.3 proposal)

| Lapisan | Isi |
|---|---|
| Presentation | Popup ekstensi, overlay "Tahan Dulu", web dashboard (Mode Darurat, Evidence Pack) |
| Application | Analisis risiko, manajemen incident report, pembuatan Evidence Pack |
| Data | Pengguna (anonim), riwayat pemeriksaan, incident report, metadata bukti, aturan risiko, feedback |
| Integration | Komunikasi ekstensi ↔ backend, tautan ke kanal pelaporan resmi |

### 6.3 Keputusan teknis kunci

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Lokasi risk engine | **Dua tempat, satu kode**: modul `packages/risk-engine` dipakai di service worker (lokal) dan backend | Peringatan harus cepat & tetap jalan saat offline (KNF-01); backend jadi sumber aturan terbaru |
| Backend | Node.js + Express + TypeScript | Satu bahasa dengan ekstensi & web app; risk engine bisa di-share |
| Database | SQLite via `better-sqlite3` (MVP) | Tanpa server DB, mudah dijalankan lokal saat demo |
| OCR | Tesseract.js di **browser** (web app) | Gambar bukti tidak perlu dikirim ke server untuk OCR → privasi lebih baik |
| PDF | jsPDF di **browser** | Tidak perlu server render; file langsung diunduh |
| Identitas pengguna | **Anonim**: `device_id` (UUID v4) dibuat saat instal, disimpan di `chrome.storage.local` dan dikirim sebagai header | Tanpa login = tanpa hambatan (KNF-03) |
| Hubungan ekstensi → web app | Ekstensi membuka `WEB_APP_URL/darurat?d=<device_id>&src=<context>` | Web app mengenali perangkat yang sama untuk riwayat |

### 6.4 Struktur repositori (monorepo)

```
scamguard/
├─ apps/
│  ├─ extension/                 # Chrome Extension MV3
│  │  ├─ manifest.json
│  │  ├─ src/
│  │  │  ├─ service_worker.ts
│  │  │  ├─ content/
│  │  │  │  ├─ content.ts        # ekstraksi URL & teks
│  │  │  │  └─ overlay/          # Tahan Dulu (Shadow DOM)
│  │  │  ├─ popup/
│  │  │  │  ├─ popup.html
│  │  │  │  ├─ popup.ts
│  │  │  │  └─ views/            # home.ts, check.ts, result.ts
│  │  │  ├─ lib/                 # storage.ts, messaging.ts, api.ts
│  │  │  └─ styles/tokens.css
│  │  ├─ assets/icons/           # 16, 32, 48, 128 px
│  │  └─ vite.config.ts          # build (vite + @crxjs/vite-plugin atau rollup)
│  ├─ web/                       # Next.js (App Router) + Tailwind
│  │  ├─ app/
│  │  │  ├─ page.tsx             # beranda web (ringkas)
│  │  │  ├─ darurat/page.tsx     # Emergency Mode
│  │  │  ├─ evidence/[id]/page.tsx
│  │  │  └─ riwayat/page.tsx
│  │  ├─ components/
│  │  └─ lib/                    # api.ts, ocr.ts, pdf.ts, extract.ts
│  └─ api/                       # Express backend
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ routes/              # risk.ts, rules.ts, incidents.ts, evidence.ts, feedback.ts
│     │  ├─ db/                  # schema.sql, seed.ts, client.ts
│     │  └─ middleware/          # deviceId.ts, rateLimit.ts, errors.ts
│     └─ uploads/                # file bukti (gitignore)
├─ packages/
│  ├─ risk-engine/               # ★ dipakai extension + api
│  │  ├─ src/index.ts            # analyze(input, rules) → RiskResult
│  │  ├─ src/rules.default.json  # aturan bawaan (offline)
│  │  ├─ src/url.ts  text.ts  number.ts
│  │  └─ test/                   # vitest
│  └─ shared/                    # tipe TypeScript bersama (RiskResult, Incident, dll.)
├─ docs/                         # PRD ini, diagram, hasil SUS
└─ package.json                  # pnpm workspaces
```

---

## 7. Kebutuhan Fungsional

Format setiap kebutuhan: deskripsi → user story → acceptance criteria (Given/When/Then) → catatan implementasi.

### KF-01 — Pemeriksaan risiko tautan, teks, nomor, dan screenshot

**Deskripsi.** Pengguna dapat memeriksa tautan, teks penawaran, nomor HP/rekening, atau screenshot percakapan secara manual dari popup.

**User story**
- **US-01** Sebagai pengguna, saya ingin menempelkan tautan yang saya terima dan mengetahui apakah tautan itu terindikasi berisiko, agar saya tidak tertipu.
- **US-02** Sebagai pengguna, saya ingin menempelkan isi pesan penawaran dan mengetahui tanda bahayanya.
- **US-03** Sebagai pengguna, saya ingin memeriksa nomor rekening/HP sebelum transfer.
- **US-04** Sebagai pengguna, saya ingin mengunggah screenshot chat untuk diperiksa.

**Acceptance criteria**
- **AC-01.1** *Given* popup terbuka di tampilan Periksa dengan tab **Tautan**, *when* saya menempel URL valid dan menekan **Periksa sekarang**, *then* tampilan Hasil muncul ≤ 1 detik dengan skor 0–100, label (Rendah/Sedang/Tinggi), dan minimal 1 alasan (atau pesan "Tidak ditemukan tanda risiko").
- **AC-01.2** *Given* input kosong, *when* menekan **Periksa sekarang**, *then* tombol tidak memproses dan muncul pesan "Isi dulu tautan yang ingin diperiksa." di bawah kolom.
- **AC-01.3** *Given* tab **Tautan** dan input bukan URL (mis. "halo"), *then* muncul pesan "Format tautan belum benar. Contoh: https://contoh.com".
- **AC-01.4** URL tanpa skema (`bit.ly/abc`) otomatis dinormalisasi menjadi `https://bit.ly/abc`.
- **AC-01.5** Tab **Teks** menerima maks. **5.000 karakter**; penghitung karakter tampil saat > 4.000.
- **AC-01.6** Tab **Nomor** menerima nomor HP Indonesia (`08…`, `+628…`, `628…`, 10–13 digit) atau nomor rekening (6–16 digit); spasi/strip dibersihkan otomatis.
- **AC-01.7** Tab **Gambar** menerima PNG/JPG ≤ 5 MB; OCR berjalan di popup/web, teks hasil OCR dianalisis seperti tab Teks; selama proses tampil "Membaca gambar…".
- **AC-01.8** Jika backend tidak dapat dihubungi, pemeriksaan **tetap berjalan** dengan aturan lokal, dan hasil diberi catatan kecil "Diperiksa offline dengan aturan bawaan."
- **AC-01.9** Setiap pemeriksaan tersimpan ke riwayat lokal (maks. 20 entri terbaru) dan—bila online—ke tabel `risk_checks`.

**Catatan implementasi.** Popup mengirim `{type:'CHECK', inputType, value}` ke service worker; service worker memanggil `analyze()` lokal lalu (non-blocking) `POST /api/v1/risk/check` untuk logging dan memperoleh hasil server bila berbeda versi aturan.

---

### KF-02 — Ekstensi membaca URL & teks halaman aktif dan mengirim ke risk engine

**User story**
- **US-05** Sebagai pengguna, saya ingin ScamGuard otomatis memeriksa halaman yang saya buka, tanpa saya harus menekan apa pun.

**Acceptance criteria**
- **AC-02.1** Content script berjalan pada `document_idle` di semua halaman `http/https`, kecuali domain di *allowlist* (Lampiran B) dan halaman `chrome://`, Chrome Web Store, serta `localhost`.
- **AC-02.2** Teks yang diambil: `document.title`, `meta[name=description]`, `h1–h3`, teks tombol/tautan, label form, dan `document.body.innerText` dipotong maks. **20.000 karakter**.
- **AC-02.3** Analisis dijalankan sekali saat muat, lalu **ulang maksimum 1× per 3 detik** jika DOM berubah signifikan (MutationObserver, > 500 karakter baru) — untuk SPA.
- **AC-02.4** Konten halaman **tidak dikirim mentah ke server**; yang dikirim ke backend hanya: domain, URL tanpa query string, skor, daftar `rule_id` yang terpicu.
- **AC-02.5** Jika toggle perlindungan **Dijeda**, content script tidak menganalisis dan tidak menampilkan overlay.
- **AC-02.6** Ikon ekstensi menampilkan badge: kosong (rendah), `!` kuning (sedang), `!` merah (tinggi) untuk tab aktif.

---

### KF-03 — Skor risiko & daftar alasan yang mudah dipahami

**Acceptance criteria**
- **AC-03.1** Skor bilangan bulat 0–100; label: **0–39 Rendah**, **40–69 Sedang**, **70–100 Tinggi**.
- **AC-03.2** Setiap aturan yang terpicu menghasilkan alasan berisi: judul (≤ 40 karakter), bukti/kutipan yang ditemukan (≤ 60 karakter, dalam tanda kutip), dan kategori ikon.
- **AC-03.3** Alasan diurutkan dari bobot terbesar; tampilkan maks. **4** di popup, sisanya "+N tanda lainnya".
- **AC-03.4** Semua teks alasan memakai bahasa netral (lihat 15.4). Tidak ada kata "penipu", "pasti penipuan", "scammer".
- **AC-03.5** Hasil Rendah tanpa alasan menampilkan: "Tidak ditemukan tanda risiko. Tetap waspada dan jangan bagikan OTP/PIN."

---

### KF-04 — Layar peringatan "Tahan Dulu" (cooling-down)

**User story**
- **US-06** Sebagai pengguna yang hampir mentransfer ke situs berisiko, saya ingin dihentikan sejenak dan diberi penjelasan, agar saya bisa berpikir jernih.

**Acceptance criteria**
- **AC-04.1** Overlay tampil otomatis jika skor halaman **≥ 70**, atau skor **≥ 55** *dan* halaman memuat elemen pembayaran (input nominal/rekening, kata "transfer", "deposit", "bayar", QRIS).
- **AC-04.2** Overlay menutupi seluruh viewport (z-index maksimum), latar halaman diburamkan, dan **fokus keyboard terkunci di dalam dialog** (focus trap); `Esc` = Kembali ke halaman aman.
- **AC-04.3** Isi dialog: judul "Tahan dulu sebentar", deskripsi, kotak "Tanda yang ditemukan" (chip alasan, maks. 4) + pill "Risiko tinggi", tombol **Kembali ke halaman aman** (utama), **Lihat detail**, **Tetap lanjut (10)**, dan baris bawah "Sudah terlanjur mengirim uang? → Lihat panduan darurat".
- **AC-04.4** Tombol **Tetap lanjut** nonaktif selama **10 detik** (hitung mundur terlihat), lalu aktif.
- **AC-04.5** **Kembali ke halaman aman**: `history.back()` jika ada riwayat; jika tidak, tutup tab via service worker (`chrome.tabs.remove`) lalu buka tab baru.
- **AC-04.6** **Tetap lanjutkan**: overlay ditutup dan domain dicatat sebagai "sudah diizinkan" selama **24 jam** di `chrome.storage.local` (tidak muncul lagi di domain itu).
- **AC-04.7** **Lihat detail**: membuka popup hasil (atau halaman `chrome-extension://…/popup.html#result?tab=<id>` di tab baru bila popup tidak dapat dibuka programatik).
- **AC-04.8** **Lihat panduan darurat**: membuka web app `/darurat?src=overlay&domain=<domain>` di tab baru, field "Tautan/akun terkait" terisi domain.
- **AC-04.9** Overlay di-render di **Shadow DOM** agar CSS halaman tidak merusak tampilan; tidak memakai `alert()`.
- **AC-04.10** Setiap tampilan overlay dan pilihan pengguna dicatat sebagai event anonim (Bagian 14.2).

---

### KF-05 — Emergency Response Mode

**User story**
- **US-07** Sebagai korban yang baru transfer, saya ingin dipandu langkah demi langkah agar tidak bingung harus mulai dari mana.
- **US-08** Sebagai korban, saya ingin tahu persis apa yang harus saya katakan ke petugas bank.

**Acceptance criteria**
- **AC-05.1** Dapat diakses dari: popup (menu "Saya sudah transfer"), hasil pemeriksaan ("Lihat panduan"), overlay Tahan Dulu, dan URL langsung `/darurat`.
- **AC-05.2** Layout: header (logo, pill "Mode Darurat", timer "Sejak transfer", tombol Beranda) → judul "Kami pandu Anda dalam 4 langkah" → **stepper horizontal 4 langkah** → kartu langkah aktif → navigasi Kembali / Lanjut.
- **AC-05.3** Stepper menampilkan status setiap langkah: **Selesai** (lingkaran hijau + centang), **Anda di sini** (lingkaran teal + latar teal muda), **Berikutnya** (lingkaran putih bergaris). Setiap langkah dapat diklik.
- **AC-05.4** Setiap kartu langkah berpola sama: label "LANGKAH n DARI 4" → judul → kotak **"Kenapa penting?"** (1–2 kalimat) → **"Caranya"** (daftar bernomor/checklist) → aksi.
- **AC-05.5** Tombol lanjut selalu menyebut langkah berikutnya ("Berikutnya: Siapkan Evidence Pack").
- **AC-05.6** **Timer "Sejak transfer"**: saat pertama masuk, tampil pertanyaan opsional "Kapan Anda transfer?" (default: sekarang). Timer berjalan per detik (format `HH:MM:SS`); jika < 1 jam tampil pesan "Usahakan hubungi bank dalam 1 jam pertama."
- **AC-05.7** Konten langkah sesuai Bagian 8.6. Langkah 2 menampilkan **contoh kalimat** yang otomatis terisi nominal, waktu, rekening tujuan, bank tujuan dari data incident (placeholder `[NO. REKENING]` bila belum ada) + tombol **Salin kalimat** (Clipboard API; label berubah menjadi "Tersalin" 2 detik).
- **AC-05.8** Progres (langkah, checklist, nomor tiket, nomor laporan IASC) **tersimpan otomatis** (debounce 800 ms) ke backend `PATCH /incidents/:id` dan ke `localStorage` sebagai cadangan; memuat ulang halaman melanjutkan dari langkah terakhir.
- **AC-05.9** Selesai langkah 4 → layar **"Semua langkah selesai"** dengan ringkasan (nomor tiket bank, nomor laporan IASC, tombol Lihat Evidence Pack).
- **AC-05.10** Tersedia disclaimer di bawah: "ScamGuard tidak dapat membatalkan transfer atau memblokir rekening…".

---

### KF-06 — Unggah bukti transfer & percakapan

**Acceptance criteria**
- **AC-06.1** Area unggah mendukung klik dan seret-lepas; tipe: JPG, PNG, WEBP, PDF; maks. **10 MB/file**, maks. **10 file/incident**.
- **AC-06.2** Setiap file diberi kategori (pilih): *Bukti transfer*, *Percakapan*, *Profil/akun terkait*, *Lainnya*. Default ditebak dari OCR (kata "transfer/berhasil/Rp" → Bukti transfer).
- **AC-06.3** Thumbnail tampil untuk gambar; ikon dokumen untuk PDF; tombol hapus (ikon ×, `aria-label="Hapus <nama file>"`).
- **AC-06.4** File diunggah ke `POST /incidents/:id/evidence` (multipart) dengan progress bar; gagal → pesan "Gagal mengunggah. Coba lagi." + tombol Coba lagi.
- **AC-06.5** File ditolak jika tipe/ukuran tidak sesuai, dengan pesan spesifik ("File lebih dari 10 MB").
- **AC-06.6** Metadata disimpan: nama, kategori, ukuran, MIME, SHA-256, waktu unggah, teks OCR (bila ada).

---

### KF-07 — Formulir kronologi kejadian

**Field formulir (Data transaksi + Kronologi):**

| Field | Tipe | Wajib | Validasi / catatan |
|---|---|---|---|
| Waktu transfer | datetime-local | Ya | Tidak boleh di masa depan |
| Nominal transfer | teks berformat Rupiah | Ya | Angka > 0; tampil `Rp2.500.000` |
| Bank / e-wallet penerima | combobox (daftar + bebas) | Ya | Daftar bank/e-wallet umum (Lampiran B) |
| Nomor rekening / akun penerima | teks | Ya | 6–20 karakter alfanumerik |
| Nama pemilik rekening | teks | Tidak | — |
| Tautan / akun terkait | teks | Tidak | Bisa banyak, dipisah koma |
| Media kontak pertama | select | Tidak | WhatsApp, Telegram, Instagram, Facebook, SMS, Telepon, Situs web, Lainnya |
| Jenis modus | select | Tidak | Investasi, Belanja online, Lowongan kerja, Undian/hadiah, Mengaku petugas/bank, Pinjaman, Lainnya |
| Kronologi | textarea | Ya | 30–3.000 karakter; contoh/hint ditampilkan |
| Nomor tiket bank | teks | Tidak | Dari Langkah 2 |
| Nomor laporan IASC | teks | Tidak | Dari Langkah 4 |

**Acceptance criteria**
- **AC-07.1** Field wajib yang kosong ditandai garis kuning (`#F59E0B`) + teks "Belum diisi, diperlukan untuk laporan." (bukan merah, agar tidak menambah panik).
- **AC-07.2** Tersedia tombol **"Bantu susun kronologi"** yang menyisipkan templat: `[Tanggal] — Dihubungi lewat [media] oleh [akun]…` (tanpa AI generatif).
- **AC-07.3** Data tersimpan otomatis (debounce 800 ms); indikator "Tersimpan" kecil di pojok kartu.

---

### KF-08 — Ekstraksi teks dari screenshot bukti transfer (OCR)

**Acceptance criteria**
- **AC-08.1** OCR berjalan di browser dengan Tesseract.js, bahasa `ind+eng`, dimulai otomatis setelah gambar kategori *Bukti transfer* ditambahkan.
- **AC-08.2** Selama proses tampil "Membaca gambar… (xx%)"; maks. 20 detik, jika lewat → "Teks tidak terbaca otomatis. Silakan isi manual."
- **AC-08.3** Hasil ekstraksi (regex, Bagian 11.4): nominal, tanggal/jam, nomor rekening tujuan, nama penerima, nama bank, nomor referensi — ditampilkan di kotak "Terbaca otomatis dari gambar" + tombol **Isi ke formulir**.
- **AC-08.4** **Isi ke formulir** hanya mengisi field yang masih kosong; field yang sudah diisi pengguna tidak ditimpa (tampilkan konfirmasi bila berbeda).
- **AC-08.5** Gambar tidak dikirim ke layanan OCR pihak ketiga.

---

### KF-09 — Evidence Pack PDF

**Acceptance criteria**
- **AC-09.1** Tombol **Unduh Evidence Pack (PDF)** aktif kapan saja; jika kelengkapan < 100% muncul konfirmasi "Ada data yang belum lengkap: Data rekening penerima. Tetap unduh?" (Lengkapi / Tetap unduh).
- **AC-09.2** PDF dibuat dengan jsPDF, ukuran A4 portrait, nama file `EvidencePack_ScamGuard_<YYYYMMDD>_<4 digit id>.pdf`.
- **AC-09.3** Isi PDF sesuai struktur Bagian 11.5 (ringkasan kasus, kronologi, data rekening, daftar bukti + lampiran gambar, checklist kelengkapan, kanal resmi, pernyataan).
- **AC-09.4** Gambar bukti dilampirkan di halaman lampiran (maks. lebar 170 mm, dikompresi JPEG kualitas 0,7).
- **AC-09.5** Panel **Kelengkapan laporan** di web menampilkan 6 item dengan status dan progress (mis. 5/6).
- **AC-09.6** Pratinjau mini dokumen tampil di sisi kanan halaman Evidence Pack.
- **AC-09.7** Event `evidence_pack_generated` dicatat dan `incident_reports.status` → `pack_generated`.

---

### KF-10 — Penyimpanan data

**Acceptance criteria**
- **AC-10.1** Data tersimpan di tabel: `users`, `risk_checks`, `incident_reports`, `evidence`, `risk_rules`, `feedback` (Bagian 13).
- **AC-10.2** Pengguna dapat melihat riwayat pemeriksaan (popup: 2 terakhir; web `/riwayat`: semua milik `device_id`).
- **AC-10.3** Pengguna dapat **menghapus** incident dan semua bukti terkait (tombol "Hapus laporan ini" + konfirmasi), sesuai prinsip privasi.
- **AC-10.4** File bukti disimpan di `apps/api/uploads/<incident_id>/<uuid>.<ext>` dan tidak dapat diakses tanpa header `X-Device-Id` yang cocok.

---

## 8. Spesifikasi Layar & Alur UI

Referensi visual: halaman Figma **"ScamGuard UI (Claude)"** (frame 1A, 1B, 2, 3, 4.1–4.5, 5) dan kanvas desain ScamGuard. Ukuran, warna, dan komponen mengacu ke Bagian 15.

### 8.1 Peta navigasi

```
[Ikon ekstensi]
   └─ 1A Popup Beranda
        ├─ Periksa tautan / nomor ──▶ 1B Popup Periksa ──▶ 2 Hasil Pemeriksaan
        │                                                    ├─ Tunda transfer ──▶ 1A
        │                                                    ├─ Laporkan ──▶ (feedback terkirim, toast)
        │                                                    └─ Lihat panduan ──▶ 4.1 Mode Darurat
        ├─ Saya sudah transfer ──▶ 4.1 Mode Darurat (web app, tab baru)
        ├─ Buka aplikasi web ──▶ /riwayat (web app)
        └─ Tentang ScamGuard ──▶ halaman info (web app /tentang)

[Halaman berisiko terdeteksi]
   └─ 3 Overlay Tahan Dulu
        ├─ Kembali ke halaman aman ──▶ history.back / tutup tab
        ├─ Lihat detail ──▶ 2 Hasil Pemeriksaan
        ├─ Tetap lanjut (setelah 10 dtk) ──▶ overlay hilang, domain diizinkan 24 jam
        └─ Lihat panduan darurat ──▶ 4.1 Mode Darurat

[Web app] 4.1 → 4.2 → 4.3 (⇄ 5 Evidence Pack) → 4.4 → 4.5 Selesai
```

### 8.2 Layar 1A — Popup Beranda (380 × 600 px)

| Elemen | Detail |
|---|---|
| Header | Logo perisai teal 44×50, "ScamGuard" (20/800), tagline "Lindungi diri dari penipuan digital" (13/400, `#475569`) |
| Kartu status | Titik hijau `#16A34A` + "Aktif" (18/800 teal) + "Perlindungan berjalan di semua situs." · Toggle 52×30 (`role="switch"`) |
| Status halaman | "Halaman ini" (12, `#64748B`) + domain tab aktif (14/600) + pill risiko (Rendah/Sedang/Tinggi) |
| Menu (3 baris, tinggi ≥ 72) | 1) ikon kaca pembesar · "Periksa tautan / nomor" · "Cek apakah terindikasi berisiko" 2) ikon pelampung (merah muda) · "Saya sudah transfer" · "Panduan langkah darurat" 3) ikon monitor · "Buka aplikasi web" · "Kelola laporan & panduan" |
| Footer | ikon info + "Tentang ScamGuard" · "v1.0" |

**State:**
- *Dijeda*: titik abu `#94A3B8`, label "Dijeda", deskripsi "Peringatan otomatis tidak ditampilkan.", toggle abu.
- *Halaman tidak didukung* (chrome://, PDF viewer): baris status menampilkan "Halaman ini tidak diperiksa".
- *Sedang menganalisis*: pill abu "Memeriksa…".

### 8.3 Layar 1B — Popup Periksa

| Elemen | Detail |
|---|---|
| Header | Tombol kembali (44×44, `aria-label="Kembali"`) + "Periksa tautan / nomor" |
| Segmented control | Tautan · Nomor · Teks · Gambar (`role="group"`, tombol `aria-pressed`) |
| Field | Label dinamis: "Tautan yang ingin diperiksa" / "Nomor HP atau rekening" / "Teks penawaran atau pesan" / "Screenshot percakapan"; input 48 px; Teks = textarea 4 baris; Gambar = dropzone |
| Tombol utama | "Periksa sekarang" (full width, 48 px) — *loading*: spinner + "Memeriksa…" |
| Kartu tips | Ikon lampu + "Bank dan instansi resmi tidak pernah meminta kode OTP atau PIN Anda." |
| Riwayat | "Pemeriksaan terakhir" — 2 baris (nilai terpotong elipsis + pill) |

**Prefill cerdas:** saat popup dibuka di halaman yang terdeteksi Sedang/Tinggi, tab Tautan otomatis terisi URL halaman aktif.

### 8.4 Layar 2 — Hasil Pemeriksaan

| Elemen | Detail |
|---|---|
| Header | Kembali + "Hasil pemeriksaan" + sub "Tautan · bit.ly/cuan-harian" |
| Kartu skor | Ring 80 px (track `#F1F5F9`, isian warna sesuai level), angka skor (24/800) + "dari 100", pill level, kalimat ringkas |
| Kalimat ringkas per level | Rendah: "Tidak ditemukan tanda risiko yang kuat. Tetap waspada." · Sedang: "Ada beberapa tanda yang perlu dicek ulang sebelum transfer." · Tinggi: "**Terindikasi berisiko.** Sebaiknya tunda transfer dan cek ulang." |
| Kartu alasan | "Tanda yang kami temukan" + maks. 4 baris (ikon abu dalam kotak 32 px, judul 14/700, kutipan 12) |
| Footer | Tombol "Tunda transfer" (utama) + "Laporkan" (sekunder) · tautan "Sudah terlanjur transfer? **Lihat panduan**" |
| Disclaimer (bila muat) | "Hasil ini bantuan awal berdasarkan tanda-tanda umum, bukan keputusan akhir." |

### 8.5 Layar 3 — Overlay "Tahan Dulu"

Lihat AC-04.x. Dimensi dialog: lebar 540 px (maks. `calc(100vw - 32px)`), radius 20, bayangan `0 24px 48px rgba(15,23,42,.22)`, scrim `rgba(15,23,42,.55)` + `backdrop-filter: blur(3px)`.

Copy final:
- Judul: **Tahan dulu sebentar**
- Deskripsi: "Halaman ini **terindikasi berisiko**. Ambil napas dan cek dulu sebelum mengirim uang."
- Kotak: "Tanda yang ditemukan" + pill "Risiko tinggi" + chip (mis. "Profit tetap 30%/minggu", "Desakan transfer sekarang", "Meminta kode OTP", "Domain baru (.xyz)")
- Tombol: **Kembali ke halaman aman** · **Lihat detail** · **Tetap lanjut (10)** → "Tetap lanjutkan"
- Catatan: "Jeda singkat ini membantu Anda memutuskan dengan tenang."
- Baris bawah: "Sudah terlanjur mengirim uang?" · **Lihat panduan darurat →**

### 8.6 Layar 4 — Mode Darurat (web, lebar konten maks. 1040 px)

| Langkah | Judul | "Kenapa penting?" | "Caranya" / isi | Aksi |
|---|---|---|---|---|
| 1 | Hentikan transfer lanjutan | Pihak yang menipu sering meminta uang tambahan dengan alasan "biaya pencairan". Berhenti sekarang mencegah kerugian bertambah. | Checklist: (1) Jangan kirim uang lagi, apa pun alasannya. (2) Jangan bagikan kode OTP, PIN, atau kata sandi ke siapa pun. (3) Jika sempat dibagikan, ganti PIN lewat aplikasi resmi bank Anda. | Sudah, lanjut → |
| 2 | Hubungi bank atau e-wallet Anda | Bank bisa mencoba menahan dana di rekening tujuan jika Anda melapor dengan cepat. | (1) Telepon call center resmi (tombol "Lihat kontak resmi bank" → modal daftar sumber resmi: aplikasi bank, balik kartu, situs resmi). (2) Contoh kalimat + Salin. (3) Input nomor tiket. | Sudah, lanjut → |
| 3 | Siapkan Evidence Pack | Satu dokumen PDF berisi bukti dan kronologi. Laporan dengan bukti lengkap lebih mudah diproses bank dan IASC. | Daftar 4 item status: Bukti transfer, Screenshot percakapan, Nomor rekening penerima, Kronologi singkat (pill Sudah/Belum/Sedang diisi). | **Lengkapi Evidence Pack** (utama) → `/evidence/:id`; "Lewati dulu, lanjut →" (sekunder) |
| 4 | Laporkan ke IASC | Indonesia Anti-Scam Centre adalah kanal resmi untuk melaporkan penipuan keuangan agar bisa ditindaklanjuti. | (1) Unduh Evidence Pack (PDF). (2) Buka situs IASC, isi formulir, lampirkan PDF. (3) Simpan nomor laporan (input). | Selesai → |
| ✓ | Semua langkah selesai | — | "Anda sudah melakukan yang terbaik. Simpan Evidence Pack, nomor tiket bank, dan nomor laporan IASC untuk tindak lanjut." | Lihat Evidence Pack |

**Contoh kalimat Langkah 2 (templat):**
```
"Saya korban penipuan. Saya transfer {nominal} pada {tanggal} pukul {jam}
ke rekening {no_rekening} di {bank_tujuan}. Mohon dana di rekening tujuan ditahan."
```
Field kosong diganti placeholder `[NOMINAL]`, `[NO. REKENING]`, `[NAMA BANK]`.

**Responsif:** < 640 px stepper menjadi 2×2 grid; tombol navigasi full width bertumpuk (Lanjut di atas).

### 8.7 Layar 5 — Evidence Pack (web)

Dua kolom (kiri `flex: 999 1 560px`, kanan 340 px; menumpuk di mobile):

- **Kiri:** (1) Data transaksi — grid 2 kolom field KF-07; (2) Bukti — dropzone, kartu file + kotak OCR "Terbaca otomatis dari gambar" + "Isi ke formulir", thumbnail lain; (3) Kronologi — label petunjuk, textarea, tombol "Bantu susun kronologi".
- **Kanan:** Kartu **Kelengkapan laporan** (progress + 6 item ✓/!) · Kartu **Pratinjau dokumen** (miniatur PDF) · **Unduh Evidence Pack (PDF)** · **Lanjut lapor ke IASC ↗** · catatan privasi: "Data dan bukti Anda tersimpan aman dan hanya dapat diakses oleh Anda. Kebenaran isi dokumen tetap menjadi tanggung jawab pelapor."

### 8.8 State umum yang wajib ada

| State | Perilaku |
|---|---|
| Loading | Skeleton abu `#F1F5F9` / spinner + teks kerja ("Memeriksa…", "Menyimpan…") |
| Offline | Banner tipis: "Anda sedang offline. Pemeriksaan memakai aturan bawaan; data akan disimpan saat online." |
| Error server | Toast: "Terjadi kendala. Coba lagi sebentar lagi." + tombol Coba lagi |
| Kosong (riwayat) | Ilustrasi sederhana + "Belum ada pemeriksaan. Coba periksa tautan pertama Anda." |

---

## 9. Spesifikasi Risk Engine

### 9.1 Antarmuka

```ts
type InputType = 'url' | 'text' | 'number' | 'page';

interface RiskInput {
  type: InputType;
  value?: string;            // url/text/number
  page?: { url: string; title: string; text: string; hasPaymentForm: boolean };
}

interface RiskReason {
  ruleId: string;            // mis. "TXT_GUARANTEED_PROFIT"
  category: 'profit' | 'urgency' | 'credential' | 'url' | 'payment' | 'impersonation' | 'number';
  title: string;             // "Janji keuntungan tidak wajar"
  evidence?: string;         // "“profit tetap 30% per minggu”"
  weight: number;
}

interface RiskResult {
  score: number;             // 0–100
  level: 'low' | 'medium' | 'high';
  reasons: RiskReason[];     // urut bobot desc
  rulesVersion: string;      // "2026.10.28-1"
  analyzedAt: string;        // ISO
  offline: boolean;
}

function analyze(input: RiskInput, rules: RuleSet): RiskResult;
```

### 9.2 Normalisasi input

1. **Teks:** lowercase, ganti angka-leet (`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `@→a`) pada salinan khusus pencocokan, hapus diakritik, kompres spasi, hapus emoji.
2. **URL:** tambah `https://` bila tanpa skema; `new URL()`; ambil `hostname` (lowercase, decode punycode → simpan keduanya), `path`, jumlah subdomain, TLD; buang `utm_*`.
3. **Nomor:** hapus non-digit kecuali `+` di depan; `+62`/`62` → `0`.

### 9.3 Kategori aturan & bobot awal (seed `risk_rules`)

**A. Teks (berlaku untuk type `text`, `page`, hasil OCR)**

| rule_id | Kategori | Pola (regex, setelah normalisasi) | Bobot | Judul alasan |
|---|---|---|---|---|
| TXT_GUARANTEED_PROFIT | profit | `profit (tetap\|pasti\|harian)`, `untung (pasti\|tetap)`, `pasti cuan` | 30 | Janji keuntungan tidak wajar |
| TXT_HIGH_RETURN_PCT | profit | `(\d{2,3})\s?%\s?(per\|/)\s?(hari\|minggu\|bulan)` dengan angka ≥ 10 (per bulan) / ≥ 3 (per hari) | 25 | Persentase keuntungan terlalu tinggi |
| TXT_GUARANTEE_100 | profit | `jaminan 100\s?%`, `tanpa risiko`, `anti rugi` | 20 | Klaim tanpa risiko |
| TXT_URGENCY | urgency | `transfer sekarang`, `segera transfer`, `slot terbatas`, `hari ini saja`, `promo berakhir`, `batas waktu` | 20 | Desakan untuk segera transfer |
| TXT_DEPOSIT | payment | `deposit (awal\|minimal)`, `biaya (pencairan\|admin\|pajak) .{0,20}(dulu\|terlebih)`, `top ?up untuk (menarik\|withdraw)` | 20 | Diminta bayar dulu untuk mencairkan |
| TXT_OTP_PIN | credential | `(kode )?otp`, `\bpin\b`, `kata sandi`, `password`, `cvv`, `kode verifikasi` *bersamaan dengan* `(kirim\|berikan\|sebutkan\|bagikan)` | 35 | Meminta kode OTP / PIN |
| TXT_IMPERSONATION | impersonation | `(cs\|admin\|petugas) (resmi\|bank\|ojk)`, `akun anda (diblokir\|ditangguhkan)`, `verifikasi data` | 15 | Mengaku sebagai pihak resmi |
| TXT_PRIZE | profit | `(selamat\|anda) (memenangkan\|terpilih)`, `hadiah (undian\|langsung)` | 15 | Iming-iming hadiah |
| TXT_JOB_TASK | profit | `kerja (paruh waktu\|dari rumah) .{0,30}(like\|subscribe\|tugas)`, `komisi per tugas` | 20 | Pekerjaan dengan bayaran tidak wajar |
| TXT_PERSONAL_ACCOUNT | payment | `(transfer\|tf) ke (rekening )?(pribadi\|a\.n)` | 10 | Pembayaran ke rekening pribadi |

**B. URL**

| rule_id | Kondisi | Bobot | Judul |
|---|---|---|---|
| URL_SHORTENER | host ∈ daftar pemendek (bit.ly, s.id, tinyurl.com, cutt.ly, t.ly, rebrand.ly, shorturl.at, is.gd, ow.ly) | 15 | Tautan pendek menyembunyikan alamat asli |
| URL_RISKY_TLD | TLD ∈ {xyz, top, click, buzz, icu, cyou, rest, monster, online, site, live, shop*} (*bobot 5) | 15 | Domain dengan ekstensi yang sering disalahgunakan |
| URL_MANY_SUBDOMAIN | jumlah label host ≥ 5 | 10 | Alamat situs terlalu panjang/berlapis |
| URL_IP_HOST | host berupa IPv4/IPv6 | 25 | Situs memakai alamat IP, bukan nama domain |
| URL_PUNYCODE | host mengandung `xn--` | 20 | Nama domain memakai huruf mirip |
| URL_LOOKALIKE | jarak Levenshtein ≤ 2 terhadap daftar brand resmi (Lampiran B) **dan** bukan domain resmi itu sendiri, atau mengandung nama brand + kata (`-login`, `-promo`, `-hadiah`, `-verifikasi`) | 35 | Nama domain mirip layanan resmi |
| URL_NUMERIC_BRANDY | label host mengandung angka berulang + kata uang (`cuan88`, `profit77`) | 10 | Pola nama domain mencurigakan |
| URL_HTTP | skema `http:` di halaman berisi form pembayaran/login | 10 | Koneksi tidak aman |
| URL_REPORTED | domain ada di tabel laporan komunitas (`reported_entities`) dengan ≥ 3 laporan | 40 | Pernah dilaporkan pengguna lain |

**C. Halaman (type `page`, tambahan)**

| rule_id | Kondisi | Bobot | Judul |
|---|---|---|---|
| PG_PAYMENT_FORM | ada input bernama/berlabel nominal/rekening/QRIS **dan** salah satu aturan profit/urgency terpicu | 15 | Formulir pembayaran di halaman berisiko |
| PG_COUNTDOWN | elemen hitung mundur + kata "promo/slot" | 10 | Hitung mundur untuk menekan keputusan |

**D. Nomor**

| rule_id | Kondisi | Bobot | Judul |
|---|---|---|---|
| NUM_REPORTED | nomor ada di `reported_entities` ≥ 1 laporan (bobot 30), ≥ 3 laporan (bobot 60) | 30/60 | Nomor ini pernah dilaporkan |
| NUM_INVALID_FORMAT | nomor HP tidak sesuai prefiks operator Indonesia (`08[1-9]`) dan bukan pola rekening | 10 | Format nomor tidak umum |

> Daftar `reported_entities` MVP diisi dari **feedback pengguna** ScamGuard sendiri (tombol "Laporkan") — bukan data IASC. Untuk demo, isi seed contoh bertanda `is_demo = 1`.

### 9.4 Rumus skor

```
raw = Σ bobot aturan unik yang terpicu
     (aturan dalam kategori sama: ambil bobot terbesar + 50% sisanya)
bonus kombinasi:
  + 10 jika ≥ 3 kategori berbeda terpicu
  + 10 jika (credential ∧ (profit ∨ urgency))
score = min(100, round(raw + bonus))
level = score ≥ 70 ? 'high' : score ≥ 40 ? 'medium' : 'low'
allowlist: jika host ∈ allowlist resmi → score = min(score, 20), alasan URL dihapus
```

Contoh: teks "profit tetap 30% per minggu, slot terbatas, transfer sekarang, kirim kode OTP" + `bit.ly` → profit (30 + 0,5×25 = 42,5) + urgency 20 + credential 35 + url 15 = 112,5 + bonus 20 → **100 (Tinggi)**.

### 9.5 Pseudocode inti

```ts
export function analyze(input: RiskInput, rules: RuleSet): RiskResult {
  const hits: RiskReason[] = [];
  const text = input.type === 'page' ? input.page!.text
             : input.type === 'text' ? input.value! : '';
  const url  = input.type === 'url' ? input.value! : input.page?.url;

  if (text) hits.push(...matchTextRules(normalizeText(text), rules.text));
  if (url)  hits.push(...matchUrlRules(parseUrl(url), rules.url, rules.brands));
  if (input.type === 'page') hits.push(...matchPageRules(input.page!, hits));
  if (input.type === 'number') hits.push(...matchNumberRules(normalizeNumber(input.value!), rules.reported));

  const score = computeScore(dedupe(hits), isAllowlisted(url, rules.allowlist));
  return {
    score, level: toLevel(score),
    reasons: dedupe(hits).sort((a, b) => b.weight - a.weight),
    rulesVersion: rules.version, analyzedAt: new Date().toISOString(), offline: !rules.fromServer,
  };
}
```

### 9.6 Pembaruan aturan

- Ekstensi memuat `rules.default.json` (bundel) saat instal.
- Service worker memanggil `GET /api/v1/rules?since=<version>` saat startup dan setiap **6 jam** (`chrome.alarms`), menyimpan ke `chrome.storage.local.rules`.
- Aturan baru hanya aktif bila `schemaVersion` cocok; jika gagal parse → tetap pakai versi lama.

---

## 10. Spesifikasi Ekstensi Chrome (Manifest V3)

### 10.1 `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "ScamGuard — Cek Dulu Sebelum Transfer",
  "short_name": "ScamGuard",
  "version": "1.0.0",
  "description": "Peringatan saat halaman terindikasi berisiko penipuan, plus panduan darurat dan Evidence Pack.",
  "default_locale": "id",
  "icons": { "16": "assets/icons/16.png", "32": "assets/icons/32.png", "48": "assets/icons/48.png", "128": "assets/icons/128.png" },
  "action": { "default_popup": "src/popup/popup.html", "default_title": "ScamGuard" },
  "background": { "service_worker": "src/service_worker.js", "type": "module" },
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*"],
    "exclude_matches": ["https://chrome.google.com/webstore/*", "https://chromewebstore.google.com/*"],
    "js": ["src/content/content.js"],
    "run_at": "document_idle",
    "all_frames": false
  }],
  "permissions": ["storage", "activeTab", "tabs", "alarms"],
  "host_permissions": ["https://api.scamguard.example/*"],
  "web_accessible_resources": [{ "resources": ["src/content/overlay/*", "assets/*"], "matches": ["<all_urls>"] }]
}
```

**Justifikasi izin (wajib dicantumkan saat publikasi):**

| Izin | Alasan |
|---|---|
| `storage` | Menyimpan pengaturan, aturan, riwayat lokal, domain yang diizinkan |
| `activeTab` / `tabs` | Membaca URL tab aktif untuk status di popup; menutup tab saat "Kembali ke halaman aman" |
| `alarms` | Memperbarui aturan berkala |
| Content script `http(s)://*/*` | Menganalisis halaman untuk peringatan otomatis (inti produk) |
| `host_permissions` API | Mengirim log anonim & mengambil aturan terbaru |

> Ganti `api.scamguard.example` dengan domain backend sebenarnya (mis. Railway/Render). Untuk demo lokal: `http://localhost:4000/*`.

### 10.2 Skema pesan (message passing)

| type | Dari → Ke | Payload | Respons |
|---|---|---|---|
| `PAGE_ANALYZE` | content → SW | `{url,title,text,hasPaymentForm}` | `RiskResult` |
| `SHOW_OVERLAY` | SW → content | `{result}` | — |
| `CHECK` | popup → SW | `{inputType,value}` | `RiskResult` |
| `GET_TAB_STATUS` | popup → SW | `{tabId}` | `{domain, result \| null, supported}` |
| `SET_ENABLED` | popup → SW | `{enabled:boolean}` | `{ok}` |
| `ALLOW_DOMAIN` | content → SW | `{domain, hours:24}` | `{ok}` |
| `GO_SAFE` | content → SW | `{tabId}` | — (SW tutup/back tab) |
| `OPEN_EMERGENCY` | popup/content → SW | `{src, domain?}` | — (SW buka tab web app) |
| `REPORT` | popup → SW | `{target, type, note?}` | `{ok}` |

### 10.3 Kunci `chrome.storage.local`

| Kunci | Tipe | Contoh |
|---|---|---|
| `deviceId` | string (UUID v4) | `"5f1c…"` |
| `enabled` | boolean | `true` |
| `rules` | RuleSet | `{version:"2026.10.28-1",…}` |
| `history` | `RiskHistoryItem[]` (maks 20) | `[{value,type,score,level,at}]` |
| `allowedDomains` | `Record<string, number>` (epoch kedaluwarsa) | `{"contoh.xyz": 1793200000000}` |
| `tabResults` | `Record<tabId, RiskResult>` (session) — gunakan `chrome.storage.session` | |
| `onboardingDone` | boolean | `true` |

### 10.4 Alur content script

```
document_idle
  → if (!enabled || isExcluded(location)) return
  → if (allowedDomains[host] > now) return
  → payload = extract()             // ≤ 20.000 karakter
  → result = await sendMessage(PAGE_ANALYZE, payload)
  → if (shouldShowOverlay(result, payload.hasPaymentForm)) renderOverlay(result)
  → observe DOM (throttle 3 dtk) untuk SPA
```

`hasPaymentForm` = ada `input` dengan name/id/placeholder/label yang cocok `/(nominal|jumlah|amount|rekening|norek|account|qris|transfer)/i` atau gambar ber-alt "QRIS".

### 10.5 Overlay (Shadow DOM)

- Host element `<scamguard-overlay>` ditambahkan ke `document.documentElement`; `attachShadow({mode:'closed'})`.
- CSS overlay dimuat dari `web_accessible_resources` (font: Plus Jakarta Sans dibundel lokal, *fallback* `system-ui`).
- Kunci scroll halaman: `document.documentElement.style.overflow = 'hidden'` selama overlay; kembalikan saat ditutup.
- Focus trap + `role="alertdialog"`, `aria-labelledby`, `aria-describedby`; fokus awal di tombol "Kembali ke halaman aman".

### 10.6 Onboarding (pertama kali instal)

`chrome.runtime.onInstalled` → buka tab web app `/selamat-datang` berisi 3 kartu: (1) Apa yang dilakukan ScamGuard, (2) Data apa yang dibaca & tidak dikirim, (3) Tombol "Mulai" → set `onboardingDone`.

### 10.7 Build & instal (demo)

```bash
pnpm i
pnpm --filter extension build      # output: apps/extension/dist
# Chrome → chrome://extensions → aktifkan Developer mode → Load unpacked → pilih apps/extension/dist
```

---

## 11. Spesifikasi Aplikasi Web

### 11.1 Rute

| Rute | Isi | Catatan |
|---|---|---|
| `/` | Beranda ringkas: apa itu ScamGuard, tombol "Saya sudah transfer", unduh ekstensi | |
| `/selamat-datang` | Onboarding setelah instal | |
| `/darurat` | Mode Darurat (membuat incident baru bila belum ada) | Query: `src`, `domain`, `d` (deviceId) |
| `/darurat/[id]` | Melanjutkan incident | Redirect dari `/darurat` setelah incident dibuat |
| `/evidence/[id]` | Halaman Evidence Pack | |
| `/riwayat` | Riwayat pemeriksaan & laporan milik device | |
| `/tentang` | Tentang, batasan, privasi, kontak tim | |

### 11.2 State & penyimpanan

- `deviceId`: dari query `d` (dikirim ekstensi) → simpan di `localStorage.sg_device`; jika tidak ada, buat UUID baru.
- Data incident: diambil via `GET /incidents/:id`; perubahan dikirim `PATCH` (debounce 800 ms) + cadangan `localStorage.sg_incident_<id>`.
- Library yang disarankan: React Query (fetch/cache) atau `fetch` + hook sederhana; Zustand opsional.

### 11.3 Komponen web (React)

`Header`, `EmergencyStepper`, `StepCard`, `WhyBox`, `NumberedStep`, `ChecklistItem`, `ScriptBox` (contoh kalimat + salin), `Field`, `MoneyInput`, `Dropzone`, `EvidenceFileCard`, `OcrResultBox`, `CompletenessPanel`, `PdfPreview`, `Button` (primary/secondary), `Pill` (low/medium/high/info), `Toast`, `ConfirmDialog`.

### 11.4 Ekstraksi OCR (regex)

```ts
const RE = {
  amount: /(?:rp\.?\s?|idr\s?)(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:,\d{2})?/i,
  date:   /(\d{1,2})[\/\-\s](\d{1,2}|jan|feb|mar|apr|mei|jun|jul|agu|agt|sep|okt|nov|des)[a-z]*[\/\-\s](\d{2,4})/i,
  time:   /(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s?(wib|wita|wit)?/i,
  account:/(?:rek(?:ening)?|no\.?\s?rek|account|tujuan)[^\d]{0,15}(\d[\d\s-]{5,19}\d)/i,
  name:   /(?:nama penerima|penerima|a\.n\.?|atas nama)\s*[:\-]?\s*([a-z .']{3,40})/i,
  ref:    /(?:no\.?\s?ref(?:erensi)?|reference|id transaksi)\s*[:\-]?\s*([a-z0-9]{6,30})/i,
  bank:   /\b(bca|bri|bni|mandiri|bsi|cimb|permata|danamon|btn|ocbc|jago|seabank|dana|ovo|gopay|shopeepay|linkaja)\b/i,
};
```
Nilai yang ditemukan diberi `confidence` (rendah bila hanya 1 kecocokan lemah) dan ditampilkan untuk konfirmasi pengguna, **tidak pernah otomatis menimpa** isian pengguna.

### 11.5 Struktur PDF Evidence Pack (jsPDF, A4, margin 20 mm, font Helvetica bawaan)

1. **Header** — "EVIDENCE PACK — Laporan Penipuan Digital", ID laporan (`SG-2026-0001`), tanggal dibuat, "Dibuat dengan ScamGuard".
2. **Ringkasan kasus** — tabel: jenis modus, waktu transfer, nominal, bank/e-wallet penerima, nomor rekening, nama pemilik, media kontak, tautan/akun terkait.
3. **Kronologi kejadian** — teks pengguna (wrap 170 mm).
4. **Tindakan yang sudah dilakukan** — checklist Langkah 1, kontak bank + nomor tiket, nomor laporan IASC (bila ada).
5. **Daftar bukti** — tabel: no, nama file, kategori, waktu unggah, SHA-256 (8 karakter pertama).
6. **Checklist kelengkapan** — 6 item ✓/✗.
7. **Kanal pelaporan resmi** — IASC (OJK) [URL diverifikasi tim — Lampiran B], call center resmi bank/e-wallet pengguna, kepolisian (patrolisiber) [verifikasi].
8. **Pernyataan** — "Dokumen ini disusun oleh pelapor dengan bantuan ScamGuard. Kebenaran isi menjadi tanggung jawab pelapor. ScamGuard tidak menjamin pemblokiran rekening maupun pengembalian dana."
9. **Lampiran** — gambar bukti, 1–2 per halaman, dengan keterangan.
10. **Footer setiap halaman** — "Halaman x dari y · ID SG-2026-0001".

---

## 12. Spesifikasi API Backend

**Base URL:** `/api/v1` · **Format:** JSON (UTF-8) · **Header wajib:** `X-Device-Id: <uuid>` · **Rate limit:** 60 req/menit/device (risk), 20 req/menit (upload).

**Format error standar:**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Field 'amount' harus lebih dari 0.", "field": "amount" } }
```
Kode: `VALIDATION_ERROR` (400), `UNAUTHORIZED_DEVICE` (401), `NOT_FOUND` (404), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `INTERNAL` (500).

### 12.1 `POST /risk/check`

Request:
```json
{ "type": "url", "value": "https://bit.ly/cuan-harian", "source": "popup" }
```
`type`: `url | text | number | page` · `source`: `popup | auto | web`. Untuk `page`, kirim `{ "type":"page", "url":"…", "ruleHits":["TXT_URGENCY"], "score":86 }` (hasil lokal, untuk logging saja — teks halaman tidak dikirim).

Response 200:
```json
{
  "id": "rc_01J…",
  "score": 86,
  "level": "high",
  "reasons": [
    { "ruleId": "TXT_GUARANTEED_PROFIT", "category": "profit", "title": "Janji keuntungan tidak wajar", "evidence": "“profit tetap 30% per minggu”", "weight": 30 }
  ],
  "rulesVersion": "2026.10.28-1",
  "analyzedAt": "2026-10-29T07:32:10Z",
  "offline": false
}
```

### 12.2 `GET /rules?since=<version>`

Response 200: `{ "version": "2026.10.28-1", "schemaVersion": 1, "text": [...], "url": [...], "brands": [...], "allowlist": [...], "shorteners": [...] }` atau `304 Not Modified`.

### 12.3 Incident

| Method & path | Fungsi | Body / Respons inti |
|---|---|---|
| `POST /incidents` | Buat incident | `{source, relatedDomain?, transferAt?}` → `201 {id, status:"draft", createdAt}` |
| `GET /incidents/:id` | Ambil detail | incident + `evidence[]` + `completeness{items[], done, total}` |
| `PATCH /incidents/:id` | Perbarui sebagian | field KF-07 + `currentStep`, `checklist{}`, `bankTicket`, `iascReportNo` → `200 {…, updatedAt}` |
| `DELETE /incidents/:id` | Hapus incident + file | `204` |
| `GET /incidents?mine=1` | Daftar milik device | `[{id, status, amount, createdAt}]` |

Contoh `PATCH` body:
```json
{
  "currentStep": 2,
  "checklist": { "stopTransfer": true, "noOtp": true, "changePin": false },
  "amount": 2500000,
  "transferAt": "2026-10-27T14:32:00+07:00",
  "recipientBank": "Bank ABC",
  "recipientAccount": "",
  "chronology": "25 Okt 2026 — Dihubungi lewat WhatsApp…"
}
```

### 12.4 Evidence

| Method & path | Fungsi |
|---|---|
| `POST /incidents/:id/evidence` | multipart: `file`, `category`, `ocrText?`, `ocrFields?` (JSON) → `201 {id, fileName, category, size, mime, sha256, url}` |
| `GET /evidence/:id/file` | Unduh file (cek `X-Device-Id` pemilik) |
| `PATCH /evidence/:id` | Ubah kategori |
| `DELETE /evidence/:id` | Hapus file |

### 12.5 Lainnya

| Method & path | Fungsi |
|---|---|
| `POST /incidents/:id/pack-generated` | Catat PDF dibuat → status `pack_generated` |
| `POST /feedback` | `{targetType:"url\|number\|text", targetValue, kind:"report\|false_positive\|helpful", note?, riskCheckId?}` → `201` |
| `POST /events` | Event analitik anonim (Bagian 14.2), batch maks 20 |
| `GET /health` | `{status:"ok", rulesVersion}` |

---

## 13. Model Data & Skema Database

### 13.1 Diagram relasi (ringkas)

```
users 1 ──< risk_checks
users 1 ──< incident_reports 1 ──< evidence
users 1 ──< feedback >── (opsional) risk_checks
risk_rules (mandiri, versi aturan)
reported_entities (agregat dari feedback 'report')
events (analitik anonim)
```

### 13.2 DDL (SQLite)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,              -- device_id (UUID v4)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at  TEXT,
  ext_version   TEXT,
  locale        TEXT DEFAULT 'id'
);

CREATE TABLE risk_checks (
  id            TEXT PRIMARY KEY,              -- 'rc_' + ulid
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_type    TEXT NOT NULL CHECK (input_type IN ('url','text','number','page')),
  source        TEXT NOT NULL CHECK (source IN ('popup','auto','web')),
  target_hash   TEXT NOT NULL,                 -- SHA-256 dari nilai ternormalisasi
  target_display TEXT,                         -- url tanpa query / domain / nomor ter-mask (0812****7781); teks: NULL
  score         INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level         TEXT NOT NULL CHECK (level IN ('low','medium','high')),
  rule_hits     TEXT NOT NULL,                 -- JSON array of rule_id
  rules_version TEXT NOT NULL,
  user_action   TEXT,                          -- 'went_back' | 'proceeded' | 'opened_detail' | 'opened_emergency'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_rc_user ON risk_checks(user_id, created_at DESC);

CREATE TABLE incident_reports (
  id                 TEXT PRIMARY KEY,         -- 'SG-2026-0001' style display id disimpan di kolom code
  code               TEXT UNIQUE NOT NULL,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','in_progress','pack_generated','reported','closed')),
  current_step       INTEGER NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 4),
  checklist          TEXT NOT NULL DEFAULT '{}',   -- JSON
  source             TEXT,                          -- popup | overlay | result | web
  related_domain     TEXT,
  scam_type          TEXT,                          -- investasi | belanja | lowongan | undian | impersonasi | pinjaman | lainnya
  contact_channel    TEXT,
  transfer_at        TEXT,
  amount             INTEGER,                       -- dalam rupiah
  recipient_bank     TEXT,
  recipient_account  TEXT,
  recipient_name     TEXT,
  related_accounts   TEXT,                          -- JSON array string
  chronology         TEXT,
  bank_ticket        TEXT,
  iasc_report_no     TEXT,
  pack_generated_at  TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ir_user ON incident_reports(user_id, created_at DESC);

CREATE TABLE evidence (
  id            TEXT PRIMARY KEY,
  incident_id   TEXT NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('transfer','chat','profile','other')),
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  ocr_text      TEXT,
  ocr_fields    TEXT,                          -- JSON {amount, date, account, name, bank, ref}
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE risk_rules (
  id            TEXT PRIMARY KEY,              -- rule_id, mis. 'TXT_URGENCY'
  scope         TEXT NOT NULL CHECK (scope IN ('text','url','page','number')),
  category      TEXT NOT NULL,
  pattern       TEXT,                          -- regex (string) atau NULL untuk aturan berbasis kode
  params        TEXT,                          -- JSON parameter tambahan (daftar TLD, ambang)
  weight        INTEGER NOT NULL,
  title         TEXT NOT NULL,                 -- judul alasan (bahasa netral)
  is_active     INTEGER NOT NULL DEFAULT 1,
  version       TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE feedback (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  risk_check_id TEXT REFERENCES risk_checks(id) ON DELETE SET NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('url','number','text')),
  target_hash   TEXT NOT NULL,
  target_display TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('report','false_positive','helpful')),
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE reported_entities (           -- agregat untuk aturan URL_REPORTED / NUM_REPORTED
  target_hash   TEXT PRIMARY KEY,
  target_type   TEXT NOT NULL,
  target_display TEXT,
  report_count  INTEGER NOT NULL DEFAULT 0,
  fp_count      INTEGER NOT NULL DEFAULT 0,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  name       TEXT NOT NULL,
  props      TEXT,                            -- JSON tanpa data pribadi
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 13.3 Aturan penyimpanan & retensi

| Data | Disimpan? | Retensi MVP |
|---|---|---|
| Teks halaman penuh | **Tidak** (hanya dianalisis di perangkat) | — |
| Teks yang dicek manual (tab Teks) | Hanya hash + rule hits | 90 hari |
| URL | Tanpa query string | 90 hari |
| Nomor HP/rekening yang dicek | Hash + versi ter-mask | 90 hari |
| Incident & bukti | Ya, milik device | Sampai dihapus pengguna (atau 180 hari tidak aktif) |
| Events | Anonim | 90 hari |

---

## 14. Kebutuhan Non-Fungsional

| Kode | Aspek | Kebutuhan | Target terukur | Cara verifikasi |
|---|---|---|---|---|
| KNF-01 | Kecepatan | Peringatan tampil sebelum pengguna sempat transfer | Analisis lokal ≤ 150 ms (teks 20k karakter), overlay ≤ 1 dtk setelah `document_idle` (p90); `POST /risk/check` ≤ 500 ms (p90) | Log `performance.now()`, uji 40 halaman |
| KNF-02 | Kesederhanaan antarmuka | Mudah dipakai pengguna yang tertekan | SUS ≥ 70; ≤ 3 klik dari popup ke langkah darurat pertama | Uji SUS ≥ 5 responden |
| KNF-03 | Kemudahan penggunaan | Tanpa konfigurasi teknis | 0 langkah pengaturan wajib setelah instal; tanpa login | Uji instal oleh responden |
| KNF-04 | Keamanan data | Bukti terlindungi | HTTPS wajib; file hanya bisa diakses device pemilik; nama file acak (UUID); validasi MIME & ukuran; bukti dapat dihapus pengguna | Uji akses dengan device id lain → 401 |
| KNF-05 | Bahasa peringatan | Netral, tidak menuduh | 0 kata terlarang (Bagian 15.4) di seluruh string UI | Lint string (`grep` daftar kata terlarang di CI) |
| KNF-06 | Transparansi | Setiap peringatan ada alasannya | 100% hasil Sedang/Tinggi memiliki ≥ 1 alasan | Unit test risk engine |
| KNF-07 | Kemudahan pengembangan | Aturan dapat diperbarui; siap ML & mobile | Aturan di DB + endpoint `/rules`; risk engine paket terpisah dengan antarmuka `analyze()` | Review kode |
| KNF-08 | Platform | Chrome MV3 + web app | Chrome ≥ 116 / Edge Chromium; web app responsif 360–1440 px | Uji manual |
| KNF-09 | Aksesibilitas | Dapat dipakai dengan keyboard & pembaca layar | Kontras teks ≥ 4.5:1; target sentuh ≥ 44 px; semua tombol ikon punya `aria-label`; focus ring terlihat | Lighthouse Accessibility ≥ 90 |
| KNF-10 | Keandalan | Tetap berguna saat offline/backend mati | Pemeriksaan & overlay tetap jalan dengan aturan lokal; progres darurat tersimpan di `localStorage` | Uji dengan backend dimatikan |
| KNF-11 | Privasi | Minimisasi data | Teks halaman tidak dikirim; tidak ada pelacak pihak ketiga; kebijakan privasi di `/tentang` | Review jaringan (DevTools) |
| KNF-12 | Ukuran | Ringan | Bundel ekstensi ≤ 1,5 MB (tanpa traineddata OCR); popup tampil ≤ 200 ms | `du -sh dist` |

### 14.1 Keamanan & privasi (detail)

- **Transport:** HTTPS untuk API & web app (TLS dari platform hosting).
- **CORS:** hanya izinkan origin web app dan `chrome-extension://<EXTENSION_ID>`.
- **Validasi input:** `zod` di semua endpoint; batasi panjang string; sanitasi nama file.
- **Upload:** cek *magic bytes* (bukan hanya ekstensi); tolak SVG/HTML; simpan di luar folder publik.
- **Rate limiting:** `express-rate-limit` per `X-Device-Id` + IP.
- **Content script:** tidak menyuntik skrip ke konteks halaman; tidak membaca nilai input password (`input[type=password]` diabaikan); tidak membaca isi `iframe` lintas domain.
- **Regulasi:** perhatikan prinsip pelindungan data pribadi (UU No. 27 Tahun 2022 tentang PDP): tujuan jelas, minimisasi, hak hapus. *(Bukan nasihat hukum — konsultasikan bila produk diluncurkan publik.)*

### 14.2 Event analitik anonim

| Event | Kapan | Props |
|---|---|---|
| `ext_installed` | onInstalled | `version` |
| `check_performed` | pemeriksaan manual | `inputType`, `level`, `ms` |
| `overlay_shown` | overlay tampil | `score`, `ruleCount`, `hasPaymentForm` |
| `overlay_action` | klik tombol overlay | `action`: `go_safe` / `detail` / `proceed` / `emergency`, `secondsOnScreen` |
| `emergency_started` | masuk `/darurat` | `src` |
| `emergency_step_completed` | lanjut langkah | `step` |
| `ocr_used` | OCR selesai | `success`, `fieldsFound` |
| `evidence_pack_generated` | unduh PDF | `completeness` (mis. 5/6), `files` |
| `iasc_link_clicked` | klik kanal IASC | — |

Metrik turunan untuk laporan lomba: **% overlay → go_safe** (tingkat pencegahan), median waktu `emergency_started → evidence_pack_generated`.

---

## 15. Sistem Desain & Pedoman Bahasa

### 15.1 Token warna

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-primary` | `#0F766E` | Tombol utama, aksen, ikon aktif, toggle |
| `--color-primary-hover` | `#115E59` | Hover tombol utama |
| `--color-primary-soft` | `#F0FDFA` | Latar kotak info, langkah aktif |
| `--color-primary-border` | `#CCFBF1` / `#99F6E4` | Garis kotak info / pill info |
| `--color-bg` | `#F8FAFC` | Latar aplikasi |
| `--color-surface` | `#FFFFFF` | Kartu |
| `--color-border` | `#E2E8F0` | Garis kartu |
| `--color-divider` | `#F1F5F9` | Pemisah dalam kartu |
| `--color-input-border` | `#CBD5E1` | Garis input & tombol sekunder |
| `--color-text` | `#0F172A` | Teks utama |
| `--color-text-secondary` | `#475569` | Teks pendukung |
| `--color-text-tertiary` | `#64748B` | Keterangan kecil |
| `--risk-low` / `-text` / `-bg` / `-border` | `#16A34A` / `#15803D` / `#F0FDF4` / `#BBF7D0` | Risiko rendah, status selesai |
| `--risk-medium` / `-text` / `-bg` / `-border` | `#F59E0B` / `#B45309` / `#FFFBEB` / `#FDE68A` | Risiko sedang, data belum lengkap |
| `--risk-high` / `-text` / `-bg` / `-border` | `#DC2626` / `#B91C1C` / `#FEF2F2` / `#FECACA` | Risiko tinggi (hemat dipakai) |

> Warna risiko asli (`#16A34A`, `#F59E0B`) **tidak lolos kontras** untuk teks kecil di latar putih; gunakan varian `-text` untuk teks, varian asli untuk titik/ikon/garis.

### 15.2 Tipografi, bentuk, jarak

- **Font:** Plus Jakarta Sans (400, 500, 600, 700, 800); fallback `system-ui, sans-serif`. Bundel lokal di ekstensi (woff2).
- **Skala:** Display 30/800 · H1 26–28/800 · H2 18/700 · Judul baris 15/700 · Body 14–16/400 (line-height 1.5–1.55) · Caption 12–13.
- **Radius:** tombol/input 12 · kartu 16 · dialog 20 · pill 999.
- **Bayangan:** kartu `0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.05)`; dialog `0 24px 48px rgba(15,23,42,.22)`.
- **Jarak:** kelipatan 4 (4, 8, 12, 16, 20, 24, 28, 32).
- **Ikon:** gaya outline (stroke 2, rounded), 16/18/20/24 px — mis. Lucide.

### 15.3 Komponen

| Komponen | Varian | Spesifikasi |
|---|---|---|
| Button | Primary, Secondary, Ghost/link | Tinggi 44–52, padding 14×20, 15/700; Secondary: putih + garis `#CBD5E1` 1.5 px |
| Pill | Rendah, Sedang, Tinggi, Info | Titik 6 px + label 12/700, padding 4×10 |
| Card | Default, Warning (latar `#FFFBEB`, garis `#FDE68A`) | Radius 16, padding 16–22 |
| WhyBox | — | Latar teal muda, ikon lampu, label tebal "Kenapa penting?" |
| Stepper | Selesai, Aktif, Berikutnya | Lingkaran 44, label 14/700, status 12/600 |
| Input | Default, Focus (garis teal 2 px), Warning | Tinggi 46–48, radius 12 |
| Toggle | On/Off | 52×30, `role="switch"` |

Komponen yang sama sudah tersedia di Figma (frame "Komponen": Button/Primary, Button/Secondary, Pill/Rendah, Pill/Sedang, Pill/Tinggi, Pill/Info).

### 15.4 Pedoman bahasa (copywriting)

| ✅ Gunakan | ❌ Hindari |
|---|---|
| "terindikasi berisiko" | "ini penipuan", "pasti scam" |
| "pihak yang menghubungi Anda", "akun terkait" | "penipu", "pelaku" (di UI) |
| "Tahan dulu sebentar" | "BAHAYA!", "AWAS!" |
| "Sebaiknya tunda transfer dan cek ulang." | "Jangan bodoh", "Anda hampir tertipu" |
| "Belum diisi, diperlukan untuk laporan." | "Error! Field wajib!" |
| "Anda sudah melakukan yang terbaik." | menyalahkan korban |
| Kalimat aktif, ≤ 20 kata, sapaan "Anda" | Istilah teknis (phishing, TLD, punycode) tanpa penjelasan |

**Daftar kata terlarang untuk lint CI:** `penipu`, `scammer`, `pasti penipuan`, `bodoh`, `ceroboh`, `BAHAYA`, `AWAS`.

---

## 16. Rencana Pengujian

### 16.1 Unit test (vitest) — `packages/risk-engine`

- Setiap aturan: 2 contoh positif + 2 contoh negatif.
- Rumus skor: kasus kombinasi & batas level (39/40, 69/70).
- Normalisasi: leet-speak, URL tanpa skema, punycode, nomor `+62`.
- Allowlist: domain resmi tidak pernah > 20.

### 16.2 Set uji deteksi (Lampiran C, 40 kasus)

20 kasus berisiko (investasi bodong, undian, lowongan tugas like/subscribe, mengaku CS bank, link pendek ke domain .xyz, domain mirip bank) + 20 kasus aman (marketplace besar, situs bank resmi, berita, Wikipedia, halaman checkout resmi). Target: recall Tinggi ≥ 85%, FP ≤ 10%.

### 16.3 Uji fungsional (checklist per KF)

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| FT-01 | Cek tautan `bit.ly/cuan-harian` | Skor Tinggi, ≥ 3 alasan |
| FT-02 | Cek input kosong | Pesan validasi, tidak memanggil engine |
| FT-03 | Buka halaman demo investasi | Overlay tampil ≤ 1 dtk |
| FT-04 | Tombol "Tetap lanjut" sebelum 10 dtk | Nonaktif |
| FT-05 | "Tetap lanjutkan" lalu muat ulang | Overlay tidak tampil lagi (24 jam) |
| FT-06 | Toggle Dijeda lalu buka halaman demo | Tidak ada overlay |
| FT-07 | "Saya sudah transfer" di popup | Tab `/darurat` terbuka, incident dibuat |
| FT-08 | Isi data lalu muat ulang halaman darurat | Progres & langkah dipulihkan |
| FT-09 | Salin kalimat langkah 2 | Clipboard berisi kalimat terisi data |
| FT-10 | Unggah bukti transfer contoh | OCR menemukan nominal & tanggal |
| FT-11 | Unggah file 12 MB | Ditolak dengan pesan ukuran |
| FT-12 | Unduh PDF dengan data belum lengkap | Konfirmasi tampil; PDF terunduh berisi 6 bagian + lampiran |
| FT-13 | Matikan backend lalu cek tautan | Hasil tetap tampil + catatan offline |
| FT-14 | Akses file bukti dengan device lain | 401 |
| FT-15 | Navigasi overlay dengan keyboard saja | Fokus terkunci, Esc = kembali |

### 16.4 Uji usability (SUS)

- **Responden:** ≥ 5 (variasi: 2 mahasiswa, 2 pekerja, 1 orang tua 45+).
- **Tugas:** (T1) Periksa sebuah tautan dari pesan. (T2) Tanggapi peringatan Tahan Dulu. (T3) Anda baru saja transfer — temukan apa yang harus dikatakan ke bank. (T4) Buat Evidence Pack dari bukti contoh.
- **Ukur:** keberhasilan tugas, waktu, jumlah salah klik, komentar (think-aloud), lalu kuesioner SUS 10 butir (skala 1–5).
- **Rumus SUS:** butir ganjil (skor − 1), butir genap (5 − skor), jumlahkan × 2,5.
- **Output:** tabel hasil + 3 perbaikan teratas → masuk ke Sprint 3.

### 16.5 Halaman demo uji

Buat `apps/web/app/demo/investasi/page.tsx` dan `/demo/aman` — halaman tiruan **berlabel jelas "HALAMAN SIMULASI UNTUK DEMO SCAMGUARD"** yang memuat kata-kata pemicu, agar demo tidak bergantung pada situs penipuan nyata.

---

## 17. Rencana Sprint & Pembagian Tugas

Peran sesuai proposal Bab 4.5: **Anggota 1** = Full-stack Developer & Product Owner (backend, database, risk engine, prioritas fitur); **Anggota 2** = Frontend Developer & UI/UX Designer (ekstensi, web app, tampilan, Evidence Pack UI). Pengujian & dokumentasi dikerjakan bersama.

### Sprint 1 — Selasa, 28 Oktober 2026: Fondasi

| # | Tugas | PIC | Estimasi | Output |
|---|---|---|---|---|
| 1.1 | Setup monorepo pnpm, ESLint/Prettier, TypeScript, GitHub repo + branch protection | A1 | 1 j | Repo siap |
| 1.2 | `packages/risk-engine`: tipe, normalisasi, aturan teks & URL, rumus skor, 30 unit test | A1 | 4 j | `analyze()` lulus test |
| 1.3 | Backend Express: `/health`, `/risk/check`, `/rules`, middleware device id, skema SQLite + seed aturan | A1 | 3 j | API lokal jalan |
| 1.4 | Ekstensi MV3 kerangka: manifest, service worker, messaging, storage, ikon | A2 | 2 j | Bisa `Load unpacked` |
| 1.5 | Popup 1A, 1B, 2 (HTML/CSS token + logika) terhubung ke engine lokal | A2 | 4 j | Cek manual end-to-end |
| 1.6 | Halaman demo simulasi | A2 | 1 j | `/demo/investasi` |

### Sprint 2 — Rabu, 29 Oktober 2026: Fitur inti & integrasi

| # | Tugas | PIC | Estimasi | Output |
|---|---|---|---|---|
| 2.1 | Content script ekstraksi + overlay Tahan Dulu (Shadow DOM, countdown, focus trap, allow 24 j) | A2 | 4 j | KF-02, KF-04 |
| 2.2 | Endpoint incident & evidence (multipart, hash, akses per device) | A1 | 3 j | KF-06, KF-10 |
| 2.3 | Web app Next.js: layout, `/darurat` stepper 4 langkah + autosave | A2 | 4 j | KF-05 |
| 2.4 | `/evidence/[id]`: form, dropzone, panel kelengkapan | A1 + A2 | 3 j | KF-06, KF-07 |
| 2.5 | OCR Tesseract.js + regex ekstraksi | A1 | 2 j | KF-08 |
| 2.6 | Generator PDF jsPDF sesuai 11.5 | A1 | 3 j | KF-09 |
| 2.7 | Tombol ekstensi → web app (deviceId, src, domain) | A2 | 1 j | Integrasi |

### Sprint 3 — Kamis, 30 Oktober 2026: Uji, perbaiki, demo

| # | Tugas | PIC | Estimasi | Output |
|---|---|---|---|---|
| 3.1 | Jalankan 40 kasus uji deteksi, tuning bobot | A1 | 2 j | Laporan akurasi |
| 3.2 | Uji fungsional FT-01…FT-15 | Bersama | 2 j | Checklist lulus |
| 3.3 | Uji usability + SUS (≥ 5 responden) | Bersama | 3 j | Skor SUS |
| 3.4 | Perbaikan bug & copy dari hasil uji | Bersama | 2 j | MVP stabil |
| 3.5 | Deploy (web: Vercel; API: Railway/Render), build ekstensi zip | A1 | 1 j | Link prototipe (Bab 6.8) |
| 3.6 | Rekam video demo (skrip Lampiran D), tangkapan layar untuk Bab 7 | A2 | 2 j | Video + screenshot |

### Prioritas jika waktu tidak cukup (urutan potong)

1. Tab **Gambar** di popup → 2. Cek **Nomor** → 3. OCR (isi manual saja) → 4. Riwayat `/riwayat` → 5. Badge ikon.
**Jangan dipotong:** overlay Tahan Dulu, Mode Darurat 4 langkah, PDF Evidence Pack.

---

## 18. Risiko & Mitigasi

| Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|
| False positive tinggi (situs sah diberi peringatan) | Pengguna kesal, mematikan ekstensi | Sedang | Allowlist domain resmi, ambang overlay ≥ 70, tombol "Laporkan salah deteksi", izin 24 jam per domain |
| False negative (modus baru tidak terdeteksi) | Pengguna tetap tertipu | Tinggi | Aturan dapat diperbarui via `/rules`; edukasi bahwa hasil bukan jaminan |
| OCR tidak akurat (bukti blur, layout beragam) | Data salah | Sedang | Selalu konfirmasi pengguna; jangan menimpa; isi manual tetap tersedia |
| Waktu 3 hari tidak cukup | Fitur tidak selesai | Tinggi | MoSCoW + urutan potong (Bagian 17) |
| Overlay rusak di situs tertentu (CSS konflik, SPA) | Peringatan tidak terbaca | Sedang | Shadow DOM, z-index maksimum, uji di 10 situs populer |
| Kebocoran data bukti | Kepercayaan hilang | Rendah | Akses per device, HTTPS, nama file acak, fitur hapus |
| Bahasa terdengar menuduh pihak tertentu | Masalah reputasi/hukum | Rendah | Pedoman bahasa + lint kata terlarang |
| Bergantung pada situs penipuan nyata saat demo | Demo gagal/tidak etis | Sedang | Halaman simulasi berlabel |
| Performa content script memperlambat halaman | Pengalaman buruk | Rendah | Potong 20k karakter, throttle 3 dtk, regex terkompilasi sekali |

---

## 19. Asumsi, Pertanyaan Terbuka & Lampiran

### 19.1 Asumsi

1. Target peramban MVP: Chrome/Edge desktop.
2. Pengguna tidak perlu akun; identitas = device id anonim.
3. Data `reported_entities` berasal dari laporan pengguna ScamGuard sendiri, bukan dari IASC/bank.
4. Backend & web app di-hosting di layanan gratis (Vercel + Railway/Render) untuk demo.
5. Nama produk final adalah **ScamGuard** (proposal masih menyebut "TahanDulu" di Bab 2.1 poin 5 dan Bab 4.1 — perlu diseragamkan).

### 19.2 Pertanyaan terbuka

| # | Pertanyaan | Pemilik | Tenggat |
|---|---|---|---|
| Q1 | URL resmi kanal pelaporan IASC dan kanal kepolisian yang dicantumkan — verifikasi langsung dari situs OJK/IASC | A1 | 28 Okt |
| Q2 | Durasi cooling-down 10 detik sudah tepat? (uji 5 vs 10 detik saat usability) | Bersama | 30 Okt |
| Q3 | Apakah cek Nomor tetap masuk MVP jika belum ada data laporan? | A1 (PO) | 29 Okt |
| Q4 | Hosting backend: Railway atau Render? | A1 | 28 Okt |
| Q5 | Perlu halaman kebijakan privasi terpisah untuk publikasi Chrome Web Store? (tidak wajib untuk demo `Load unpacked`) | A2 | Pasca-lomba |

### Lampiran A — Glosarium

| Istilah | Arti |
|---|---|
| Cooling-down | Jeda singkat yang sengaja diberikan sebelum pengguna dapat melanjutkan tindakan berisiko |
| Evidence Pack | Dokumen PDF berisi ringkasan kasus, kronologi, data rekening, dan bukti |
| IASC | Indonesia Anti-Scam Centre |
| MV3 | Chrome Extension Manifest Version 3 |
| Content script | Skrip ekstensi yang berjalan di konteks halaman web |
| Service worker | Skrip latar belakang ekstensi MV3 |
| OCR | Optical Character Recognition — membaca teks dari gambar |
| SUS | System Usability Scale |
| False positive | Situs aman yang keliru diberi peringatan |

### Lampiran B — Daftar referensi data awal (isi & verifikasi tim)

- **Allowlist domain resmi (contoh awal):** domain resmi bank & e-wallet besar, marketplace besar, situs pemerintah `*.go.id`, `ojk.go.id`. *Tim wajib memverifikasi setiap domain dari sumber resmi sebelum dimasukkan.*
- **Daftar brand untuk deteksi domain mirip:** bca, bri, bni, mandiri, bsi, dana, ovo, gopay, shopee, tokopedia, lazada, bukalapak, blibli, ojk, pln, pajak.
- **Pemendek URL:** bit.ly, s.id, tinyurl.com, cutt.ly, t.ly, rebrand.ly, shorturl.at, is.gd, ow.ly.
- **TLD berisiko:** xyz, top, click, buzz, icu, cyou, rest, monster, online, site, live (shop: bobot rendah).
- **Daftar bank/e-wallet untuk combobox:** BCA, BRI, BNI, Mandiri, BSI, BTN, CIMB Niaga, Permata, Danamon, OCBC, Bank Jago, SeaBank, DANA, OVO, GoPay, ShopeePay, LinkAja, Lainnya.
- **Kanal resmi:** IASC (OJK) — `[URL RESMI, VERIFIKASI]`; call center resmi bank/e-wallet pengguna (tertera di aplikasi/kartu); kanal pengaduan kepolisian siber — `[URL RESMI, VERIFIKASI]`.

### Lampiran C — Contoh kasus uji deteksi (potongan)

| # | Input | Tipe | Harapan |
|---|---|---|---|
| C-01 | "Investasi profit tetap 30% per minggu! Slot terbatas, transfer sekarang ke rekening a.n …" | text | Tinggi |
| C-02 | `https://bit.ly/cuan-harian` → `investasi-cuan88.xyz` | url | Tinggi |
| C-03 | "Selamat! Anda memenangkan undian. Kirim kode OTP untuk verifikasi hadiah." | text | Tinggi |
| C-04 | "Kerja paruh waktu dari rumah, komisi per tugas like & subscribe, deposit awal 100rb" | text | Tinggi |
| C-05 | `https://bca-promo-hadiah.top/login` | url | Tinggi |
| C-06 | "CS resmi bank: akun anda diblokir, segera verifikasi data dan sebutkan PIN" | text | Tinggi |
| C-07 | "Promo diskon 50% hari ini saja di toko resmi" | text | Rendah–Sedang |
| C-08 | `https://www.wikipedia.org` | url | Rendah |
| C-09 | "Pembayaran tagihan listrik berhasil. Terima kasih." | text | Rendah |
| C-10 | `http://192.168.10.5/bayar` | url | Sedang–Tinggi |

(Lengkapi hingga 40 kasus di `packages/risk-engine/test/cases.json`.)

### Lampiran D — Skrip demo video (± 3 menit)

1. **(0:00–0:20)** Masalah: data IASC & 0,9% laporan di jam pertama.
2. **(0:20–0:50)** Instal ekstensi → popup beranda → cek tautan `bit.ly/cuan-harian` → hasil Tinggi + alasan.
3. **(0:50–1:30)** Buka halaman simulasi investasi → overlay **Tahan Dulu** muncul → tunjukkan hitung mundur → **Lihat detail** → **Kembali ke halaman aman**.
4. **(1:30–2:30)** Skenario korban: "Saya sudah transfer" → Mode Darurat langkah 1–2 (contoh kalimat + salin) → langkah 3: unggah bukti, OCR mengisi data, tulis kronologi → **Unduh PDF** (tampilkan isi PDF).
5. **(2:30–2:50)** Langkah 4: buka kanal IASC, simpan nomor laporan → layar Selesai.
6. **(2:50–3:00)** Penutup: batasan (bukan pengganti lembaga resmi), dampak, rencana lanjutan (ML, mobile).

### Lampiran E — Variabel lingkungan

```bash
# apps/api/.env
PORT=4000
DATABASE_PATH=./data/scamguard.db
UPLOAD_DIR=./uploads
CORS_ORIGINS=https://scamguard-web.vercel.app,chrome-extension://<EXTENSION_ID>
MAX_UPLOAD_MB=10
RULES_VERSION=2026.10.28-1

# apps/web/.env.local
NEXT_PUBLIC_API_URL=https://scamguard-api.example/api/v1
NEXT_PUBLIC_IASC_URL=<URL RESMI IASC – verifikasi>

# apps/extension/.env
VITE_API_URL=https://scamguard-api.example/api/v1
VITE_WEB_APP_URL=https://scamguard-web.vercel.app
```

### Lampiran F — Keterlacakan (traceability)

| Tujuan | KF | KNF | Layar | Uji |
|---|---|---|---|---|
| G-1 | KF-01, KF-03 | KNF-06 | 1B, 2 | FT-01, FT-02, Lampiran C |
| G-2 | KF-02, KF-04 | KNF-01, KNF-05 | 3 | FT-03…FT-06, FT-15 |
| G-3 | KF-05 | KNF-02, KNF-10 | 4.1–4.5 | FT-07…FT-09 |
| G-4 | KF-06…KF-09 | KNF-04 | 5 | FT-10…FT-12, FT-14 |
| G-5 | KF-03, KF-04 | KNF-05, KNF-06 | 2, 3, 4 | SUS |
| G-6 | KF-10 | KNF-07 | — | Review kode |

---

*Dokumen ini adalah acuan hidup. Setiap perubahan ruang lingkup dicatat di bagian riwayat versi di bawah.*

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1.0 | 28 Okt 2026 | Versi awal untuk MVP lomba | Tim Yuri Time |
