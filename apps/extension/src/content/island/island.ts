// ScamGuard Dynamic Island Component (PRD 5 / KF-ISLAND-02, 03, 05, 06)
import type { ReportingSession } from '@scamguard/shared';
import { send } from '../../lib/messaging';
import { base64ToFile, detectCurrentStep, executeAutofill } from './autofill';
import islandCss from './island.css?inline';

const STEP_TITLES: Record<number, string> = {
  1: 'Data Pelapor',
  2: 'Pihak Terlapor',
  3: 'Kronologi Kejadian',
  4: 'Transaksi & Bukti',
  5: 'Kesediaan Melapor',
};

export class ScamGuardIsland {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private session: ReportingSession;
  private isExpanded = false;
  private currentStep = 1;
  private capturedReportNo: string | null = null;
  private message = '';
  private observer: MutationObserver | null = null;
  private swalObserver: MutationObserver | null = null;

  constructor(session: ReportingSession) {
    this.session = session;
    this.currentStep = detectCurrentStep();

    this.host = document.createElement('scamguard-island');
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = islandCss;
    this.shadow.appendChild(style);

    const root = document.createElement('div');
    root.className = 'island-root collapsed';
    this.shadow.appendChild(root);

    document.body.appendChild(this.host);

    this.initListeners();
    this.initStepObserver();
    this.initSweetAlertInterceptor();
    this.initValidationFeedbackWatcher();
    this.render();

    // Auto-expand sejenak saat pertama kali muncul agar user sadar
    window.setTimeout(() => {
      this.isExpanded = true;
      this.render();
    }, 400);
  }

  private initListeners(): void {
    // Pastikan hidden phone numbers terisi saat submit di Step 1 web IASC asli
    document.addEventListener(
      'submit',
      (e) => {
        const target = e.target as HTMLElement;
        if (target && target.id === 'form-scam-step1') {
          const kode = document.querySelector<HTMLSelectElement>('select[name="kode_nomor_telepon_pelapor"]')?.value || '62';
          const no = document.querySelector<HTMLInputElement>('input[name="no_nomor_telepon_pelapor"]')?.value || '';
          const hiddenPhone = document.querySelector<HTMLInputElement>('input[name="nomor_telepon_pelapor"]');
          if (hiddenPhone && no) hiddenPhone.value = kode + no;

          const konfKode = document.querySelector<HTMLSelectElement>('select[name="konfirmasi_kode_nomor_telepon_pelapor"]')?.value || '62';
          const konfNo = document.querySelector<HTMLInputElement>('input[name="konfirmasi_no_nomor_telepon_pelapor"]')?.value || '';
          const hiddenKonf = document.querySelector<HTMLInputElement>('input[name="konfirmasi_nomor_telepon_pelapor"]');
          if (hiddenKonf && konfNo) hiddenKonf.value = konfKode + konfNo;
        }
      },
      true
    );

    // Esc untuk menutup expanded
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isExpanded) {
        this.isExpanded = false;
        this.render();
      }
    });

    // Dengarkan drop global di halaman untuk membantu melampirkan file PDF jika di-drag
    document.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('application/x-scamguard-pdf')) {
        e.preventDefault();
      }
    });

    document.addEventListener('drop', (e) => {
      if (e.dataTransfer?.types.includes('application/x-scamguard-pdf')) {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const fileInput = target.closest('input[type="file"]') || document.querySelector<HTMLInputElement>('input[type="file"]');
        if (fileInput && fileInput instanceof HTMLInputElement && this.session.evidenceFile) {
          const file = base64ToFile(
            this.session.evidenceFile.base64 || '',
            this.session.evidenceFile.fileName || 'Evidence_Pack.pdf',
            this.session.evidenceFile.mimeType || 'application/pdf'
          );
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          this.message = 'Evidence Pack PDF berhasil dilampirkan lewat drag & drop!';
          this.render();
        }
      }
    });
  }

  /** Pantau perubahan step jika terjadi navigasi URL atau perubahan form */
  private initStepObserver(): void {
    let lastStep = this.currentStep;
    this.observer = new MutationObserver(() => {
      const nextStep = detectCurrentStep();
      if (nextStep !== lastStep) {
        lastStep = nextStep;
        this.currentStep = nextStep;
        this.message = '';
        this.render();
      }
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  /** Interseptor SweetAlert2 untuk menangkap nomor laporan IASC setelah submit */
  private initSweetAlertInterceptor(): void {
    this.swalObserver = new MutationObserver(() => {
      if (this.capturedReportNo) return;

      const swalContainer = document.querySelector('.swal2-container, .swal2-popup');
      if (!swalContainer) return;

      const text = swalContainer.textContent || '';
      // Pola IASC: "Laporan Anda telah diajukan dengan nomor laporan : [NOMOR]"
      const match = text.match(/nomor laporan\s*[:\n]\s*([A-Za-z0-9_-]{5,30})/i) ||
                    text.match(/([A-Z0-9]{4,10}-\d{4,}-\d+)/i) ||
                    text.match(/#?(\d{10,20})/);

      if (match && match[1]) {
        const reportNo = match[1].trim();
        this.capturedReportNo = reportNo;
        this.isExpanded = true;
        this.render();

        // Simpan nomor laporan balik ke ScamGuard Backend & Storage
        void send({
          type: 'SAVE_IASC_REPORT_NO',
          reportNo,
          incidentId: this.session.incidentId,
        });
      }
    });

    this.swalObserver.observe(document.body, { childList: true, subtree: true });
  }

  /** Pantau error validasi IASC (.invalid-feedback / .is-invalid) dan tampilkan di Island */
  private initValidationFeedbackWatcher(): void {
    const errObserver = new MutationObserver(() => {
      const errNodes = Array.from(document.querySelectorAll('.invalid-feedback'));
      const activeErrors = errNodes
        .map((n) => n.textContent?.trim())
        .filter((t): t is string => Boolean(t && t.length > 0));

      if (activeErrors.length > 0) {
        const unique = [...new Set(activeErrors)];
        const newMsg = `⚠️ IASC Menolak: ${unique.slice(0, 2).join(' • ')}`;
        if (this.message !== newMsg) {
          this.message = newMsg;
          this.isExpanded = true;
          this.render();
        }
      }
    });

    errObserver.observe(document.body, { childList: true, subtree: true });
  }

  public render(): void {
    const root = this.shadow.querySelector('.island-root');
    if (!root) return;

    if (this.capturedReportNo) {
      root.className = 'island-root expanded success';
      root.innerHTML = this.renderSuccessTemplate();
      this.bindSuccessEvents(root);
      return;
    }

    if (this.isExpanded) {
      root.className = 'island-root expanded';
      root.innerHTML = this.renderExpandedTemplate();
      this.bindExpandedEvents(root);
    } else {
      root.className = 'island-root collapsed';
      root.innerHTML = this.renderCollapsedTemplate();
      this.bindCollapsedEvents(root);
    }
  }

  private renderCollapsedTemplate(): string {
    const stepLabel = STEP_TITLES[this.currentStep] || `Step ${this.currentStep}`;
    return `
      <div class="pill-left">
        <div class="shield-badge">🛡️</div>
        <span class="pill-title">ScamGuard</span>
        <span class="pill-step">Step ${this.currentStep}: ${stepLabel}</span>
      </div>
      <div class="pill-right">
        ${this.session.evidenceFile ? '<span class="pdf-indicator">📄 PDF Siap</span>' : ''}
        <span class="chevron-icon">▼</span>
      </div>
    `;
  }

  private renderExpandedTemplate(): string {
    const target = this.session.target;
    const lossFmt = target.lossAmount ? `Rp ${target.lossAmount.toLocaleString('id-ID')}` : 'Belum diisi';
    const accFmt = target.accountNumber ? `${target.bankName || 'Bank'} ${target.accountNumber}` : '—';
    const stepTitle = STEP_TITLES[this.currentStep] || `Step ${this.currentStep}`;

    // Guidance text per step
    let guidanceText = '';
    let actionBtnText = `✨ Isi Otomatis ${stepTitle}`;

    if (this.currentStep === 1) {
      guidanceText = 'Demi privasi dan UU Pelindungan Data Pribadi (UU PDP), NIK & KTP silakan diisi langsung oleh Anda. ScamGuard tidak menyimpan data identitas Anda.';
      actionBtnText = 'ℹ️ Data Pribadi Diisi Mandiri';
    } else if (this.currentStep === 2) {
      guidanceText = 'ScamGuard siap mengisikan kontak dan identitas terlapor (pelaku penipuan).';
      actionBtnText = '✨ Isi Kontak & Info Pelaku';
    } else if (this.currentStep === 3) {
      guidanceText = 'Kronologi terstruktur hasil generate Evidence Pack siap ditempelkan langsung ke textarea kronologi.';
      actionBtnText = '✨ Tempel Kronologi Rapi';
    } else if (this.currentStep === 4) {
      guidanceText = 'Rekening penipu, nominal kerugian, dan berkas Evidence Pack (PDF) siap disematkan ke formulir.';
      actionBtnText = '✨ Isi Data Transaksi & Lampirkan PDF';
    } else if (this.currentStep === 5) {
      guidanceText = 'Tinjau kembali data laporan, ketik kode CAPTCHA di bawah, lalu klik tombol Kirim.';
      actionBtnText = '✨ Centang Kesediaan Melapor';
    }

    return `
      <div class="card-header">
        <div class="card-brand">
          <div class="shield-badge">🛡️</div>
          <div class="brand-text-col">
            <span class="brand-title">ScamGuard Co-Pilot</span>
            <span class="brand-sub">Kasus #${this.session.incidentCode || 'SG-2026'}</span>
          </div>
        </div>
        <button class="close-btn" id="btn-close" title="Kecilkan">✕</button>
      </div>

      <!-- Step Tracker 1 - 5 -->
      <div class="step-tracker">
        ${[1, 2, 3, 4, 5]
          .map(
            (n) => `
          <div class="step-node ${n === this.currentStep ? 'active' : n < this.currentStep ? 'done' : ''}">
            <div class="step-num">${n < this.currentStep ? '✓' : n}</div>
            <span>${STEP_TITLES[n]?.split(' ')[0]}</span>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- Detail Insiden -->
      <div class="incident-info-box">
        <div class="info-row">
          <span class="info-label">Rekening Penipu:</span>
          <span class="info-val">${accFmt}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kerugian:</span>
          <span class="info-val">${lossFmt}</span>
        </div>
      </div>

      <!-- Draggable PDF Chip -->
      ${
        this.session.evidenceFile
          ? `
        <div class="file-chip-container" id="draggable-pdf" draggable="true" title="Drag ke area upload berkas IASC">
          <div class="chip-left">
            <span>📄</span>
            <div>
              <div class="chip-name">${this.session.evidenceFile.fileName}</div>
              <div class="chip-size">${Math.round((this.session.evidenceFile.sizeBytes || 120000) / 1024)} KB • PDF Siap</div>
            </div>
          </div>
          <span class="chip-drag-hint">⇄ Drag ke Form</span>
        </div>
      `
          : ''
      }

      <!-- Step Guidance Message -->
      <div class="guidance-box ${this.currentStep === 1 ? 'info' : ''}">
        <span>${this.currentStep === 1 ? '🛡️' : '💡'}</span>
        <span>${this.message || guidanceText}</span>
      </div>

      <!-- Action Buttons -->
      <div class="island-actions">
        ${
          this.currentStep !== 1
            ? `<button class="btn-autofill" id="btn-autofill">${actionBtnText}</button>`
            : `<button class="btn-secondary" id="btn-autofill-info">Mengerti, Isi Mandiri Data Diri</button>`
        }
        ${
          this.session.evidenceFile?.base64
            ? `<button class="btn-secondary" id="btn-download-pdf">📥 Unduh PDF Evidence Pack</button>`
            : ''
        }
      </div>
    `;
  }

  private renderSuccessTemplate(): string {
    return `
      <div class="success-badge">✓</div>
      <div class="success-title">Laporan Berhasil Terkirim ke IASC!</div>
      <div class="success-report-no">${this.capturedReportNo}</div>
      <div class="guidance-box">
        <span>🎉</span>
        <span>Nomor laporan IASC telah ditangkap dan otomatis disimpan ke riwayat kasus ScamGuard Anda.</span>
      </div>
      <button class="btn-secondary" id="btn-close-success">Tutup Pendamping</button>
    `;
  }

  private bindCollapsedEvents(root: Element): void {
    root.addEventListener('click', () => {
      this.isExpanded = true;
      this.render();
    });
  }

  private bindExpandedEvents(root: Element): void {
    root.querySelector('#btn-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isExpanded = false;
      this.render();
    });

    root.querySelector('#btn-autofill')?.addEventListener('click', async () => {
      const res = await executeAutofill(this.session, this.currentStep);
      this.message = res.message;
      this.render();
    });

    root.querySelector('#btn-autofill-info')?.addEventListener('click', () => {
      this.isExpanded = false;
      this.render();
    });

    root.querySelector('#btn-download-pdf')?.addEventListener('click', () => {
      if (!this.session.evidenceFile?.base64) return;
      const link = document.createElement('a');
      link.href = this.session.evidenceFile.base64.startsWith('data:')
        ? this.session.evidenceFile.base64
        : `data:application/pdf;base64,${this.session.evidenceFile.base64}`;
      link.download = this.session.evidenceFile.fileName || 'Evidence_Pack.pdf';
      link.click();
    });

    // Draggable chip handling
    const dragChip = root.querySelector<HTMLElement>('#draggable-pdf');
    if (dragChip && this.session.evidenceFile) {
      dragChip.addEventListener('dragstart', (e) => {
        if (!e.dataTransfer || !this.session.evidenceFile) return;
        e.dataTransfer.setData('application/x-scamguard-pdf', 'true');
        e.dataTransfer.setData('text/plain', this.session.evidenceFile.fileName);

        try {
          const file = base64ToFile(
            this.session.evidenceFile.base64 || '',
            this.session.evidenceFile.fileName,
            this.session.evidenceFile.mimeType
          );
          e.dataTransfer.items.add(file);
        } catch {}
      });
    }
  }

  private bindSuccessEvents(root: Element): void {
    root.querySelector('#btn-close-success')?.addEventListener('click', () => {
      this.destroy();
    });
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.swalObserver?.disconnect();
    this.host.remove();
  }
}

/** Inisialisasi Dynamic Island jika ada session pelaporan aktif */
export function mountIsland(session: ReportingSession): ScamGuardIsland {
  return new ScamGuardIsland(session);
}
