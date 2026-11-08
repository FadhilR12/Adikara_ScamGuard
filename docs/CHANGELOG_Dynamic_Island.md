# Changelog — Dynamic Island IASC & Penyesuaian Layout

**Tanggal:** 9 November 2026
**Commit:** `f02e933`, `d2117fa`
**Acuan:** [PRD Dynamic Island IASC Assistant](PRD_Dynamic_Island_IASC_Assistant.md), folder `reference/ScamGuard/`

---

## Ringkasan Perubahan

### 1. Autofill ke Portal IASC Asli
Autofill sekarang mengikuti struktur form live `iasc.ojk.go.id/Guest/LaporanV2`, bukan perkiraan dari PRD.

- **Step 2:** Island membuka sendiri jendela "Tambah Informasi Terlapor" dan "Tambah Sumber / Media Penipuan", lalu mengisi kode +62, nomor (tanpa awalan 0/62), nama, sumber, detail, dan PDF bukti.
- **Step 3:** Mengisi waktu kejadian lewat kalender IASC, kronologi (maks. 4000 karakter), dan melampirkan PDF ke "Bukti Pendukung Kejadian".
- **Step 4:** Mengisi pop-up "Tambah Penyelenggara Terlapor": kategori → bank, rekening, nama pemilik, waktu transaksi, nominal, dan PDF. Evidence Pack tidak lagi salah masuk ke "Bukti Kepemilikan Rekening Korban".
- **Step 1 dan 5:** Sengaja tidak diisi otomatis (data diri, persetujuan, CAPTCHA), sesuai Non-Goal PRD.
- **Kalender dan dropdown IASC** diisi lewat skrip yang berjalan di halaman IASC sendiri, jadi nilainya tampil di layar. Ini butuh izin baru `scripting`.
- **Batas ukuran file IASC** dicek sebelum melampirkan (2MB di Step 2/3, 5MB di Step 4).
- **Kronologi dibersihkan** menjadi huruf, angka, dan tanda baca dasar.
- **Nomor laporan** dibaca dari pop-up sukses IASC, lalu otomatis masuk ke kolom nomor laporan di `/darurat/:id`.

File utama: `apps/extension/src/content/island/autofill.ts`, `apps/extension/src/service_worker.ts`

### 2. Dynamic Island (Co-Pilot)
- **Tampilan baru:** kartu putih dan teal, mengikuti referensi "Extension Container".
- **Bisa digeser,** dan posisinya diingat.
- **Satu tombol "Isi Otomatis" per langkah** yang selalu menjalankan bagian berikutnya. Ada daftar tugas, hasil "Terisi / Perlu Anda isi", dan tombol "Ulangi".
- **Mengecil otomatis** saat jendela pop-up IASC terbuka.
- **Bug lama diperbaiki:** tombol "Mengerti" tidak bisa mengecilkan Island, dan Island kadang tidak muncul.

File utama: `apps/extension/src/content/island/island.ts`, `island.css`

### 3. Handshake Web ↔ Ekstensi
- **Pesan hanya diterima dari origin web ScamGuard,** jadi situs lain tidak bisa menyuntik sesi palsu.
- **Ekstensi yang membuka tab IASC** setelah sesi tersimpan, jadi tidak ada lagi race dan tidak terkena popup blocker.
- **Key storage diganti** menjadi `scamguard_active_reporting` (sesuai PRD), dan izin `unlimitedStorage` ditambahkan.

File utama: `apps/extension/src/content/content.ts`, `apps/extension/src/lib/storage.ts`, `apps/extension/manifest.json`, `apps/web/lib/reporting-session.ts`

### 4. Evidence Pack PDF
- **Diperbaiki:** PDF ditolak IASC karena "mengandung action/script". Penyebabnya, jsPDF selalu menulis `/OpenAction`. Entri itu sekarang dihapus dan PDF tetap valid.

File utama: `apps/web/lib/pdf.ts`

### 5. Layout Web & Ekstensi (mengikuti folder `reference/`)
- **Mode Darurat:** 4 kartu langkah dan tombol "Lanjut ke Pengumpulan Bukti". Detail langkah muncul saat kartu diklik.
- **Evidence Pack:** satu kartu formulir "Lengkapi Informasi Kejadian" dan satu kartu "Pratinjau Dokumen" dengan tombol "Unduh PDF" dan "Salin Tautan ke IASC".
- **Popup:** kartu "Saya sudah transfer", riwayat, dan nomor versi dihapus. Tombol di layar hasil dibuat rata tengah.
- **Overlay "Tahan dulu":** ikon tengah diganti ikon jeda.
- **Footer** memakai teks dan tautan dari referensi.
- **Halaman demo `/demo/iasc-portal`:** nama field, pop-up, dan teks pop-up sukses dibuat sama dengan IASC asli. Warna dan komponennya mengikuti web ScamGuard.

File utama: `apps/web/components/emergency/EmergencyMode.tsx`, `apps/web/components/evidence/EvidencePack.tsx`, `PdfPreview.tsx`, `Dropzone.tsx`, `apps/web/components/Header.tsx`, `apps/extension/src/popup/views/home.ts`, `result.ts`, `apps/extension/src/content/overlay/overlay.ts`, `apps/web/app/demo/iasc-portal/page.tsx`

Dihapus (tidak dipakai lagi): `EmergencyStepper.tsx`, `CompletenessPanel.tsx`, `EvidenceFileCard.tsx`

---

## Yang Bisa Ditingkatkan

### Prioritas tinggi (berpengaruh ke keberhasilan lapor)
1. **Uji di IASC asli.**
   - Step 5 belum pernah terlihat, karena halaman itu butuh sesi laporan yang aktif.
   - Nama opsi kategori/bank di pop-up Step 4 masih tebakan.
   - Aturan karakter kronologi juga belum dipastikan. Perlu satu kali uji lapor sungguhan atau cek pesan error IASC.
2. **Sinkron nomor laporan ke backend.** PATCH dari ekstensi bisa ditolak karena ID perangkat ekstensi berbeda dengan web, sehingga nomor laporan baru tersimpan kalau tab `/darurat` masih terbuka. Solusinya: kirim `deviceId` milik web di dalam sesi, lalu pakai ID itu di header permintaan ekstensi.
3. **PDF tanpa lampiran bukti.** Saat handoff, PDF dibuat tanpa screenshot (`files = []`). Sebaiknya lampiran ikut disertakan, tapi gambar perlu dikompres supaya tetap di bawah 2MB.

### Prioritas menengah
4. **Test otomatis.**
   - Unit test untuk `stripPdfActions`, `sanitizeIascText`, `normalizePhone`, dan `extractIascReportNo`.
   - E2E Playwright dengan ekstensi terpasang di halaman demo.
5. **Deteksi perubahan form IASC.** Kirim telemetri anonim saat sebuah field tidak ditemukan, supaya perubahan HTML IASC cepat ketahuan.
6. **Status Island hilang saat reload.** Status tugas "sudah diisi" hilang bila halaman di-reload. Simpan di `sessionStorage`.
7. **Fallback tanpa ekstensi.** Kalau ekstensi tidak terpasang, tab IASC dibuka setelah menunggu PDF dibuat, jadi bisa diblokir browser. Solusinya: buka tab kosong dulu, baru arahkan ke IASC.

### Prioritas rendah dan rapi-rapi
8. **Perbarui PRD.**
   - Posisi Island sekarang kanan atas dan bisa digeser, bukan tengah atas (AC-02.1).
   - Tombol Step 4 kini satu aksi, bukan dua (AC-03.5).
9. **Aksesibilitas Island.** Belum bisa dipindah dengan keyboard, dan hasil autofill belum diumumkan ke pembaca layar (`aria-live`).
10. **Pernyataan di Evidence Pack** belum tersimpan ke data insiden.
11. **Penghitung "sejak transfer"** sekarang hanya tampil di detail langkah 2. Pertimbangkan apakah perlu tetap terlihat.
12. **Kode mati:** aksi `evidence` di `autofill.ts` sudah tidak dipakai Island dan bisa dihapus.
13. **README:** tambahkan langkah `corepack enable` agar `pnpm` bisa langsung dipakai.

---

## Cara Menguji
1. `corepack enable` (sekali saja), lalu `pnpm --filter @scamguard/extension build`.
2. Buka `chrome://extensions`, aktifkan Developer mode, Load unpacked folder `apps/extension/dist` (atau klik **Reload** kalau sudah pernah dimuat).
3. Jalankan `pnpm dev:api` dan `pnpm dev:web`.
4. Buat insiden darurat lengkap, buka `/darurat/:id`, klik kartu **Siapkan Laporan**, lalu **Simulasi Demo IASC**.
5. Di tiap langkah, klik **Isi Otomatis**, periksa hasilnya, lalu klik "Simpan"/"Lanjut" di formulir. Di Step 5, centang persetujuan, isi CAPTCHA `SG982A`, lalu Kirim.
6. **IASC asli tanpa mengirim laporan:** buka `?step=2`, `?step=3`, atau `?step=4` langsung dan klik tombol Island. **Jangan klik Lanjut, Simpan, atau Kirim**, karena setiap klik itu mengirim data ke server OJK.
