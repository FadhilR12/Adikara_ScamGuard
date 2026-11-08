# PRD — Dynamic Island IASC Reporting Co-Pilot & Autofill

**Ekstensi Peramban ScamGuard: Kontainer "Dynamic Island" untuk Otomasi Pelaporan Cepat dan Penyerahan Evidence Pack ke Indonesia Anti-Scam Centre (IASC)**

| Atribut | Nilai |
|---|---|
| Versi Dokumen | 1.1 (Spesifikasi Fitur Ekstensi & Demo Lomba) |
| Tanggal | 8 November 2026 |
| Tim | Tim Yuri Time — Universitas Telkom |
| Penulis / Pengusul | Wildan Bugi Rivansyah, Fadhil Rahman Yuriana |
| Target Implementasi | Ekstensi Peramban (`apps/extension`) & Aplikasi Web (`apps/web`) |
| Target Eksternal | Portal Resmi IASC OJK (`https://iasc.ojk.go.id/Guest/LaporanV2`) & Halaman Simulasi Demo (`/demo/iasc-portal`) |
| Status | **Ready for Implementation** (Dapat langsung dikerjakan oleh agent/developer) |

---

## 1. Ringkasan Fitur & Latar Belakang Masalah

### 1.1 Masalah Nyata
Setelah korban penipuan menyelesaikan **Emergency Mode** di ScamGuard dan berhasil menghasilkan **Evidence Pack (PDF)**, korban dihadapkan pada tugas berat: **melaporkan insiden ke kanal resmi (IASC OJK)**. 

Hasil investigasi langsung terhadap formulir live IASC (`https://iasc.ojk.go.id/Guest/LaporanV2`) menunjukkan:
1. **Beban Kognitif Tinggi (5 Tahapan Formulir):** Terdiri dari Step 1 (Data Pelapor), Step 2 (Data Terlapor), Step 3 (Kronologi Kejadian), Step 4 (Transaksi & Bukti Transfer), dan Step 5 (Persetujuan & CAPTCHA).
2. **Tekanan Batas Waktu (Countdown Timer 30 Menit):** Portal IASC menerapkan batas waktu 1.800 detik. Korban yang sedang panik berisiko tinggi mengalami *session timeout* karena lambat mengetik ulang data atau bukti tercecer.
3. **Risiko Kesalahan Ketik (*Typo*):** Mengetik manual 10–16 digit nomor rekening penipu dan nominal jutaan rupiah sangat rawan salah di bawah tekanan mental.

### 1.2 Solusi ScamGuard: Dynamic Island Co-Pilot
ScamGuard menghadirkan **Dynamic Island Container**—sebuah kontainer UI mengambang (*floating*) yang diinjeksi oleh ekstensi ke viewport portal IASC. Kontainer ini:
* Menyimpan dokumen **Evidence Pack (PDF)** dan ringkasan data insiden (nominal, rekening pelaku, kronologi rapi).
* Bersifat **Step-Aware**: Tampilan dan tombol aksinya menyesuaikan langkah yang sedang aktif di portal IASC (Step 1 s/d Step 5).
* Menyediakan aksi **1-Click Smart Autofill** untuk mengisi field-field penipuan seketika (dengan highlight visual hijau) serta menyematkan file PDF ke input bukti.
* Menyediakan fitur **Auto-Capture Nomor Laporan** saat pelaporan berhasil, lalu menyinkronkannya kembali ke database ScamGuard korban.
* Mematuhi prinsip **Privacy by Design (UU PDP No. 27/2022)**: ScamGuard **tidak** menyimpan NIK atau foto KTP pengguna; data pribadi diisi mandiri oleh korban, sedangkan ScamGuard menangani 100% data forensik penipuannya.

---

## 2. Tujuan, Non-Tujuan, & Metrik Keberhasilan

### 2.1 Tujuan (Goals)
1. **Zero-Retyping untuk Data Kejahatan:** Pengguna tidak perlu mengetik ulang rekening bank penipu, nama bank, nominal transaksi, dan teks kronologi di formulir IASC.
2. **Seamless Evidence Handoff:** Memungkinkan penyematan/pengunggahan dokumen Evidence Pack PDF hasil generate ScamGuard ke field unggah bukti IASC (`file_bukti_pendukung_kejadian`) tanpa mengharuskan pengguna mencari file di file explorer OS.
3. **Cross-Step Persistence:** Dynamic Island tetap aktif, mulus, dan mempertahankan state saat portal IASC berpindah halaman (`?step=1` ke `?step=5`).
4. **Wow-Factor Demo Lomba:** Memberikan interaksi visual premium (animasi ekspansi ala iOS Dynamic Island + efek visual glow saat autofill) yang memukau juri kompetisi.
5. **Reliabilitas Offline / Demo Safe:** Menyediakan halaman mock `/demo/iasc-portal` yang identik dengan IASC untuk memastikan demo tidak bergantung pada status server pemerintah saat presentasi.

### 2.2 Non-Tujuan (Non-Goals)
1. **Tidak Mem-bypass CAPTCHA:** Step 5 IASC memiliki CAPTCHA gambar (`#CaptchaResponse`). ScamGuard secara etis dan legal **tidak** mem-bypass CAPTCHA; pengguna wajib menyelesaikannya secara sadar sebagai pernyataan kebenaran laporan.
2. **Tidak Menyimpan Data Kependudukan (NIK/KTP):** ScamGuard tidak menjadi penyimpan NIK/KTP pengguna di cloud backend ScamGuard.
3. **Tidak Men-submit Otomatis Tanpa Review:** ScamGuard hanya mengisi (*autofill*); keputusan klik "Kirim Laporan" tetap berada di tangan pengguna.

---

## 3. Alur Pengguna (User Flow)

```
[ ScamGuard Web: /emergency/:id (Step 4) ]
                   │
                   ▼ User klik "Lanjut Lapor ke IASC"
  (Web app mengirim payload insiden & PDF base64 ke ekstensi via window.postMessage / storage)
                   │
                   ▼ Ekstensi membuka tab baru ke portal IASC
[ Tab Baru: https://iasc.ojk.go.id/Guest/LaporanV2 ]
                   │
                   ▼ Content script mendeteksi domain IASC / session pelaporan aktif
[ Dynamic Island muncul di bagian atas (Top-Center Viewport) ]
                   │
   ┌───────────────┴────────────────────────────────────────┐
   ▼                                                        ▼
[ Step 1: Pihak Pelapor ]                         [ Step 3: Kronologi ]
Island: "Lengkapi NIK & data diri Anda"           Island: [ ✨ Tempel Kronologi ]
(User isi NIK mandiri -> Lanjut)                  (Textarea kronologi terisi otomatis)
   │                                                        │
   ▼                                                        ▼
[ Step 2: Pihak Terlapor ]                        [ Step 4: Rekening & Bukti ]
Island: [ ✨ Isi Info Pelaku ]                     Island: [ ✨ Isi Rekening & Nominal ]
(No. HP / Akun medsos terisi)                     Island: [ 📎 Lampirkan Evidence PDF ]
                                                            │
                                                            ▼
                                                  [ Step 5: Finalisasi ]
                                                  Island: "Periksa kembali & isi CAPTCHA"
                                                  (User isi captcha & klik Kirim)
                                                            │
                                                            ▼
                                                  [ Modal Sukses IASC Muncul ]
                                                  Island menangkap teks: "Nomor Laporan: IASC-xxx"
                                                  Island menampilkan: "Tersimpan ke ScamGuard! 🎉"
```

---

## 4. Arsitektur Teknis & Struktur Data

### 4.1 Schema Data Pelaporan (`ReportingSession`)
Data disimpan di `chrome.storage.local` dengan key `scamguard_active_reporting`:

```typescript
export interface ReportingSession {
  incidentId: string;
  createdAt: number;
  expiresAt: number; // TTL 1 jam
  status: 'active' | 'completed';
  
  // Data yang akan di-autofill
  target: {
    bankName?: string;          // e.g. "BCA", "BRI", "MANDIRI"
    bankCode?: string;          // e.g. mapping ID select2 IASC
    accountNumber?: string;     // e.g. "0882194819"
    accountHolder?: string;     // e.g. "Ahmad Penipu"
    perpetratorPhone?: string;  // e.g. "08123456789"
    perpetratorPlatform?: string;// e.g. "WhatsApp", "Telegram", "Instagram"
    lossAmount?: number;        // e.g. 15000000
    incidentDate?: string;      // ISO string
    chronology: string;         // Teks kronologi terstruktur
  };

  // Dokumen Evidence Pack
  evidenceFile: {
    fileName: string;           // e.g. "Evidence_Pack_SG-2026.pdf"
    mimeType: string;           // "application/pdf"
    base64: string;             // Base64 encoded file data
    sizeBytes: number;
  };

  // Hasil pelaporan yang ditangkap balik
  result?: {
    iascReportNo?: string;
    submittedAt?: number;
  };
}
```

### 4.2 Isolasi UI dengan Shadow DOM Tertutup
Untuk mencegah tabrakan CSS (baik CSS IASC merusak Island, maupun styling Tailwind Island merusak IASC):
1. Buat custom element `<scamguard-island>` yang di-attach ke `document.body`.
2. Gunakan `attachShadow({ mode: 'closed' })`.
3. Seluruh stylesheet Island di-injeksi secara inline di dalam Shadow Root.
4. Z-index diset ke level maksimum peramban: `z-index: 2147483647`.

---

## 5. Kebutuhan Fungsional (KF) & Kriteria Penerimaan (AC)

### KF-ISLAND-01: Handshake Sesi Web ke Ekstensi
* **Deskripsi:** Saat user mengklik "Lanjut Lapor ke IASC" di ScamGuard Web (`EmergencyMode.tsx` atau `EvidencePack.tsx`), web app mengirimkan payload insiden ke ekstensi ScamGuard.
* **Acceptance Criteria (AC):**
  * **AC-01.1:** Web app memancarkan event `window.postMessage({ type: 'SCAMGUARD_START_IASC_REPORT', payload: ReportingSession }, '*')` atau menggunakan `chrome.runtime.sendMessage` jika ekstensi terdeteksi.
  * **AC-01.2:** Ekstensi menyimpan payload ke `chrome.storage.local` di bawah key `scamguard_active_reporting`.
  * **AC-01.3:** Ekstensi otomatis membuka tab baru mengarah ke target IASC (`https://iasc.ojk.go.id/Guest/LaporanV2` atau `/demo/iasc-portal` bila mode demo).

### KF-ISLAND-02: Komponen Dynamic Island (Collapsed & Expanded)
* **Deskripsi:** Menampilkan floating pill modern di bagian tengah-atas layar peramban.
* **Acceptance Criteria (AC):**
  * **AC-02.1 (Posisi):** Terpasang di `fixed`, `top: 16px`, horizontal centered (`left: 50%`, `transform: translateX(-50%)`).
  * **AC-02.2 (Mode Collapsed):** Berbentuk pill memanjang hitam/glassmorphic (`rgba(15, 23, 42, 0.92)` dengan border halus `rgba(255, 255, 255, 0.1)`), menampilkan ikon perisai ScamGuard hijau, teks status singkat (e.g. `ScamGuard Assistant • Step 4`), dan badge status file PDF.
  * **AC-02.3 (Mode Expanded):** Mengembang mulus (*spring/ease-out transition*) saat diklik atau di-hover, menampilkan kartu detail insiden, preview file bukti, dan tombol aksi autofill.
  * **AC-02.4 (Draggable File Chip):** Menyediakan chip file mini bertuliskan `Evidence_Pack.pdf` yang dapat di-drag langsung menuju dropzone file formulir sebagai alternatif klik tombol.

### KF-ISLAND-03: Deteksi Langkah Adaptif (Step-Aware Adaptation)
* **Deskripsi:** Dynamic Island otomatis mendeteksi langkah formulir IASC yang aktif dan memperbarui UI-nya.
* **Acceptance Criteria (AC):**
  * **AC-03.1:** Mendeteksi parameter query URL (`?step=1` s/d `?step=5`) atau keberadaan form ID aktif (`#form-scam-step1` s/d `#form-scam-step5`).
  * **AC-03.2 (Konten Step 1):** Menampilkan panduan: *"Lengkapi identitas diri Anda (NIK/KTP) secara mandiri. ScamGuard menjaga privasi Anda dengan tidak menampung data kependudukan."*
  * **AC-03.3 (Konten Step 2):** Tombol aksi: `[ ✨ Isi Kontak Pelaku ]` -> Mengisi nomor HP / akun media sosial terlapor.
  * **AC-03.4 (Konten Step 3):** Tombol aksi: `[ ✨ Tempel Kronologi Rapi ]` -> Mengisi textarea `kronologi_kejadian`.
  * **AC-03.5 (Konten Step 4):** Tombol aksi: `[ ✨ Isi Info Transaksi & Rekening ]` dan `[ 📎 Lampirkan Dokumen PDF ]`.
  * **AC-03.6 (Konten Step 5):** Menampilkan instruksi verifikasi: *"Tinjau kembali ringkasan, masukkan kode CAPTCHA di bawah, lalu kirimkan laporan Anda."*

### KF-ISLAND-04: Smart Autofill Engine (Penanganan Select2 & MaskMoney)
* **Deskripsi:** Mengisi nilai input formulir pihak ketiga dengan memicu event reaktif agar terdeteksi oleh framework frontend IASC.
* **Acceptance Criteria (AC):**
  * **AC-04.1:** Pengisian nilai text/textarea harus memicu event:
    ```js
    el.value = targetValue;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    ```
  * **AC-04.2 (Select2 Support):** Untuk elemen `<select>` berkategori Select2, jika jQuery terpasang di host window, picu `$(el).val(val).trigger('change')` atau sinkronisasikan nilai select native.
  * **AC-04.3 (MaskMoney Support):** Untuk field nominal transaksi uang, ekstensi memicu mask rupiah atau menyuntikkan angka murni yang memicu event `keyup`/`change`.
  * **AC-04.4 (Feedback Visual):** Field yang berhasil diisi otomatis oleh ekstensi mendapatkan efek *glow/outline* hijau lembut selama 2 detik (`box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.4)`).

### KF-ISLAND-05: Lampirkan Dokumen Evidence Pack PDF
* **Deskripsi:** Memasukkan file Evidence Pack PDF ke dalam input berkas IASC (`name="detail[0].file_bukti_pendukung_kejadian"` atau input file di Step 4).
* **Acceptance Criteria (AC):**
  * **AC-05.1:** Ekstensi mengonversi base64 Evidence Pack menjadi objek `File`:
    ```ts
    const file = new File([blob], session.evidenceFile.fileName, { type: 'application/pdf' });
    ```
  * **AC-05.2 (1-Click Inject):** Saat tombol *"Lampirkan Dokumen"* ditekan, script menggunakan API `DataTransfer`:
    ```ts
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    ```
  * **AC-05.3 (Drag-and-Drop Fallback):** Jika user men-drag chip dari Dynamic Island dan melepaskannya (*drop*) di atas area input file atau dropzone form, event drop disuplai dengan `dataTransfer.files` yang valid.

### KF-ISLAND-06: Auto-Capture Nomor Laporan (Post-Submission Sync)
* **Deskripsi:** Menangkap nomor tiket/laporan IASC setelah pengguna men-submit Step 5.
* **Acceptance Criteria (AC):**
  * **AC-06.1:** Observer memantau kemunculan dialog sukses SweetAlert2 (`.swal2-container`) atau teks *"nomor laporan :"*.
  * **AC-06.2:** Regex mengekstrak nomor laporan (e.g. `/(IASC-[A-Z0-9-]+|\d{10,})/i`).
  * **AC-06.3:** Dynamic Island berubah warna menjadi hijau sukses: *"Laporan Terkirim! Nomor: [NOMOR] tersimpan otomatis ke ScamGuard."*
  * **AC-06.4:** Ekstensi melakukan `PATCH /incidents/:id` ke backend ScamGuard dengan payload `{ iascReportNo: capturedNumber }` dan memperbarui `localStorage`.

### KF-ISLAND-07: Halaman Mock Demo IASC (`/demo/iasc-portal`)
* **Deskripsi:** Halaman tiruan portal IASC di dalam `apps/web` untuk keperluan demonstrasi pameran/juri yang 100% reliabel tanpa risiko WAF/koneksi internet mati.
* **Acceptance Criteria (AC):**
  * **AC-07.1:** Memiliki struktur 5 langkah yang sama dengan IASC asli (Step 1 s/d Step 5), timer 30 menit, input rekening terlapor, dan upload bukti.
  * **AC-07.2:** Menerima autofill dari Dynamic Island persis seperti situs IASC aslinya.
  * **AC-07.3:** Tombol submit Step 5 memunculkan SweetAlert2 tiruan dengan nomor laporan acak yang kemudian ditangkap balik oleh Dynamic Island.

---

## 6. Spesifikasi Visual & UI Dynamic Island

### 6.1 State Mesin Tampilan

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      STATE 1: COLLAPSED                     │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │ (🛡️) ScamGuard Assistant  •  Step 4: Transaksi  [📄]│   │
 │   └─────────────────────────────────────────────────────┘   │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Click / Hover
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                      STATE 2: EXPANDED                      │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │ 🛡️ ScamGuard Co-Pilot                  [✖ Tutup]    │   │
 │   │ Kasus #SG-2026-08 • Kerugian: Rp 15.000.000         │   │
 │   ├─────────────────────────────────────────────────────┤   │
 │   │ 📋 Data Siap Isi:                                   │   │
 │   │  • Bank Tujuan: BCA (0882194819 a.n. Penipu)        │   │
 │   │  • Dokumen: Evidence_Pack.pdf (1.2 MB) [Drag Chip]  │   │
 │   ├─────────────────────────────────────────────────────┤   │
 │   │ [ ✨ Isi Otomatis Field Rekening & Kerugian ]        │   │
 │   │ [ 📎 Masukkan File Evidence Pack ke Form ]           │   │
 │   └─────────────────────────────────────────────────────┘   │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Saat Submit Berhasil
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                      STATE 3: SUCCESS                       │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │ 🎉 Nomor Laporan IASC Disalin: #202611080091        │   │
 │   │ Disimpan ke riwayat kasus ScamGuard Anda.           │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

### 6.2 Token Desain Island (Dark Glassmorphic)
* **Background:** `rgba(15, 23, 42, 0.94)` (Slate 900 semi-transparan dengan `backdrop-filter: blur(16px)`).
* **Border:** `1px solid rgba(255, 255, 255, 0.12)`.
* **Border Radius:** `28px` (Pill saat collapsed), `20px` (Card saat expanded).
* **Shadow:** `0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)`.
* **Typography:** `font-family: 'ScamGuard Jakarta', system-ui, -apple-system, sans-serif`.
* **Primary Accent Color:** Emerald Green `#10B981` (Melambangkan keamanan & aksi otomatis).

---

## 7. Rencana Kerja Implementasi (Sprint Checklist)

Dokumen ini siap dikerjakan oleh developer atau AI Agent dengan tahapan berikut:

- [ ] **Task 1: Shared Types & Messaging (`packages/shared` & `apps/extension/src/lib/messaging.ts`)**
  - Definisikan tipe `ReportingSession` dan pesan `START_REPORTING_SESSION`, `GET_REPORTING_SESSION`, `SAVE_IASC_REPORT_NO`.
- [ ] **Task 2: Dynamic Island Web Component (`apps/extension/src/content/island/`)**
  - Buat `island.ts` dan `island.css` menggunakan Shadow DOM (`attachShadow({ mode: 'closed' })`).
  - Implementasikan interaksi Collapsed, Expanded, Drag chip, dan tombol aksi.
- [ ] **Task 3: Smart Autofill Engine (`apps/extension/src/content/island/autofill.ts`)**
  - Pemetaan field Step 1 s/d 4 untuk portal IASC.
  - Event dispatching (`input`, `change`) dan manipulasi `DataTransfer` untuk input file PDF.
- [ ] **Task 4: SweetAlert Response Interceptor & Sync**
  - MutationObserver untuk mendeteksi popup nomor laporan IASC dan memicu `send({ type: 'SAVE_IASC_REPORT_NO', ... })`.
- [ ] **Task 5: Web App Integration (`apps/web`)**
  - Tambahkan tombol pemicu handoff di `EmergencyMode.tsx` (Step 4) dan `EvidencePack.tsx`.
  - Buat halaman mock demo di `apps/web/app/demo/iasc-portal/page.tsx` untuk pengujian dan demo pitch anti-gagal.
- [ ] **Task 6: E2E Validation & Polish**
  - Uji alur dari: Cek Risiko -> Emergency Mode -> Evidence Pack -> Buka IASC -> Dynamic Island Autofill -> Tangkap Nomor Laporan -> Selesai.

---

## 8. Panduan Pertahanan Pitch (FAQ untuk Lomba)

* **Q: Kenapa ekstensi tidak langsung mengisi NIK dan foto KTP korban?**
  * **A:** *Sesuai regulasi UU Pelindungan Data Pribadi (UU PDP No. 27/2022) dan prinsip Data Minimization, ScamGuard secara etis tidak menampung data kependudukan sensitif korban di cloud kami. Korban mengisinya secara mandiri di portal resmi OJK, sementara ScamGuard menuntaskan bagian paling rumit: data forensik penipu, rekening bank, nominal kerugian, dan bundel berkas bukti transfer.*
* **Q: Bagaimana jika portal resmi IASC mengubah susunan tag HTML-nya?**
  * **A:** *Engine autofill ScamGuard menggunakan Multi-Heuristic Matcher (mencocokkan berdasarkan `name`, `id`, `placeholder`, dan teks label di sekitarnya), sehingga tetap berfungsi meskipun class atau struktur pembungkus HTML berganti.*
