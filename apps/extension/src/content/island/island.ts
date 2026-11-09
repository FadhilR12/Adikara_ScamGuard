// ScamGuard Co-Pilot Island (PRD 5 / KF-ISLAND-02, 03, 05, 06)
// Kartu mengambang bergaya referensi "Extension Container": bisa digeser (posisi diingat),
// dan tiap langkah IASC cukup satu tombol utama yang selalu menjalankan tugas berikutnya.
import type { ReportingSession } from '@scamguard/shared';
import { send } from '../../lib/messaging';
import { ensureFonts } from '../overlay/overlay';
import {
  attachFileToInput,
  detectCurrentStep,
  executeAutofill,
  extractIascReportNo,
  hasOpenDialog,
  sessionFile,
  visibleIascErrors,
  type AutofillAction,
  type AutofillResult,
} from './autofill';
import islandCss from './island.css?inline';

const POS_KEY = 'scamguard_island_pos';
const MB = 1024 * 1024;
const EDGE = 8;

const STEP_TITLES: Record<number, string> = {
  1: 'Data Pelapor',
  2: 'Pihak Terlapor',
  3: 'Informasi Kejadian',
  4: 'Informasi Transaksi',
  5: 'Kesediaan Melapor',
};

const STEP_NOTE: Record<number, string> = {
  1: 'Isi data diri Anda sendiri (NIK/KTP), lalu klik "Lanjut" di formulir. ScamGuard tidak menyimpan data kependudukan Anda.',
  2: 'Klik tombol di bawah. ScamGuard membuka jendela IASC dan mengisinya — Anda cukup memeriksa lalu klik "Simpan".',
  3: 'Satu klik untuk mengisi waktu kejadian, kronologi, dan melampirkan Evidence Pack.',
  4: 'Isi rekening bank Anda sendiri di formulir utama. Lalu klik tombol di bawah untuk mengisi rekening & bukti pelaku.',
  5: 'Centang pernyataan, ketik kode CAPTCHA, lalu klik "Kirim". Bagian ini sengaja tidak diisi otomatis.',
};

interface Task {
  id: AutofillAction;
  title: string;
}

const STEP_TASKS: Record<number, Task[]> = {
  2: [
    { id: 'terlapor', title: 'Kontak pelaku' },
    { id: 'sumber', title: 'Sumber penipuan' },
  ],
  3: [{ id: 'kejadian', title: 'Kronologi & bukti PDF' }],
  4: [{ id: 'transaksi', title: 'Isi rekening & bukti pelaku' }],
};

const SVG: Record<string, string> = {
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  minus: '<path d="M5 12h14"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13h4"/><path d="M10 17h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};

function svg(name: keyof typeof SVG, size = 18): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[name]}</svg>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

interface DragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

export class ScamGuardIsland {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private root: HTMLElement;
  private session: ReportingSession;
  private isExpanded = false;
  private autoCollapsed = false;
  private busy = false;
  private currentStep = 1;
  private capturedReportNo: string | null = null;
  private message = '';
  private errorMessage = '';
  private lastResult: AutofillResult | null = null;
  private done = new Set<AutofillAction>();
  private observer: MutationObserver | null = null;
  private scheduled = false;
  private dialogOpen = false;
  private pos: { x: number; y: number } | null = null;
  private drag: DragState | null = null;
  private suppressClick = false;

  private readonly onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isExpanded) this.setExpanded(false);
  };
  private readonly onDragOver = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('application/x-scamguard-pdf')) e.preventDefault();
  };
  private readonly onDrop = (e: DragEvent) => this.handleDrop(e);
  private readonly onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private readonly onPointerUp = () => this.handlePointerUp();
  private readonly onResize = () => this.clampToViewport();

  constructor(session: ReportingSession) {
    this.session = session;
    this.currentStep = detectCurrentStep();
    this.capturedReportNo = session.result?.iascReportNo ?? null;

    ensureFonts();
    this.host = document.createElement('scamguard-island');
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = islandCss;
    this.shadow.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'island-root collapsed';
    this.shadow.appendChild(this.root);
    document.body.appendChild(this.host);

    // Handler terdelegasi, dipasang sekali.
    this.root.addEventListener('click', (e) => this.handleClick(e));
    this.root.addEventListener('dragstart', (e) => this.handleDragStart(e));
    this.root.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeydown);
    document.addEventListener('dragover', this.onDragOver);
    document.addEventListener('drop', this.onDrop);

    this.initPageObserver();
    this.render();
    void this.restorePosition();

    // Buka otomatis sekali saat muncul agar user langsung melihat langkahnya.
    window.setTimeout(() => {
      if (!hasOpenDialog() && !this.capturedReportNo) this.setExpanded(true);
    }, 400);
  }

  /* ---------------- Posisi & drag ---------------- */

  private async restorePosition(): Promise<void> {
    try {
      const stored = (await chrome.storage.local.get(POS_KEY))[POS_KEY] as { x: number; y: number } | undefined;
      if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) this.applyPosition(stored.x, stored.y);
    } catch {
      /* posisi default (kanan atas) */
    }
  }

  private applyPosition(x: number, y: number): void {
    const w = this.root.offsetWidth || 200;
    const h = this.root.offsetHeight || 48;
    const nx = Math.min(Math.max(EDGE, x), Math.max(EDGE, window.innerWidth - w - EDGE));
    const ny = Math.min(Math.max(EDGE, y), Math.max(EDGE, window.innerHeight - h - EDGE));
    this.pos = { x: nx, y: ny };
    this.host.style.left = `${nx}px`;
    this.host.style.top = `${ny}px`;
    this.host.style.right = 'auto';
  }

  private clampToViewport(): void {
    if (this.pos) this.applyPosition(this.pos.x, this.pos.y);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const target = e.target as Element | null;
    const isHandle = !!target?.closest('[data-drag-handle]') || this.root.classList.contains('collapsed');
    if (!target || !isHandle) return;
    if (target.closest('button')) return; // tombol di header tetap bisa diklik
    const rect = this.root.getBoundingClientRect();
    this.drag = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top, moved: false };
  }

  private handlePointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      this.root.classList.add('dragging');
    }
    e.preventDefault();
    this.applyPosition(d.originX + dx, d.originY + dy);
  }

  private handlePointerUp(): void {
    const d = this.drag;
    this.drag = null;
    if (!d?.moved) return;
    this.root.classList.remove('dragging');
    this.suppressClick = true;
    window.setTimeout(() => (this.suppressClick = false), 0);
    if (this.pos) void chrome.storage.local.set({ [POS_KEY]: this.pos }).catch(() => {});
  }

  /* ---------------- Observer halaman ---------------- */

  private initPageObserver(): void {
    this.observer = new MutationObserver(() => {
      if (this.scheduled) return;
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.scheduled = false;
        this.syncWithPage();
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  private syncWithPage(): void {
    let dirty = false;

    const step = detectCurrentStep();
    if (step !== this.currentStep) {
      this.currentStep = step;
      this.message = '';
      this.lastResult = null;
      dirty = true;
    }

    if (!this.capturedReportNo) {
      const reportNo = extractIascReportNo();
      if (reportNo) {
        this.capturedReportNo = reportNo;
        dirty = true;
        void send({ type: 'SAVE_IASC_REPORT_NO', reportNo, incidentId: this.session.incidentId }).catch(() => {});
      }
    }

    // Jendela IASC terbuka → kecilkan agar tidak menutupi isinya; buka lagi setelah ditutup.
    const open = hasOpenDialog();
    if (open !== this.dialogOpen) {
      this.dialogOpen = open;
      if (open && this.isExpanded && !this.capturedReportNo) {
        this.isExpanded = false;
        this.autoCollapsed = true;
        dirty = true;
      } else if (!open && this.autoCollapsed) {
        this.autoCollapsed = false;
        this.isExpanded = true;
        dirty = true;
      }
    }

    const errors = visibleIascErrors();
    const errMsg = errors.length ? `IASC meminta perbaikan: ${errors.slice(0, 2).join(' • ')}` : '';
    if (errMsg !== this.errorMessage) {
      this.errorMessage = errMsg;
      if (errMsg && this.dialogOpen) this.autoCollapsed = true;
      else if (errMsg) this.isExpanded = true;
      dirty = true;
    }

    if (dirty) this.render();
  }

  /* ---------------- Interaksi ---------------- */

  private setExpanded(expanded: boolean): void {
    this.isExpanded = expanded;
    this.autoCollapsed = false;
    this.render();
  }

  private handleClick(e: MouseEvent): void {
    if (this.suppressClick) return;
    const btn = (e.target as Element | null)?.closest<HTMLElement>('[data-action]');
    const action = btn?.dataset.action;
    if (!action) {
      if (!this.isExpanded && !this.capturedReportNo) this.setExpanded(true);
      return;
    }
    e.stopPropagation();
    switch (action) {
      case 'expand':
        this.setExpanded(true);
        return;
      case 'collapse':
        this.setExpanded(false);
        return;
      case 'close-success':
        void send({ type: 'CLEAR_REPORTING_SESSION' }).catch(() => {});
        this.destroy();
        return;
      case 'download':
        this.downloadPdf();
        return;
      default:
        void this.runAutofill(action as AutofillAction);
    }
  }

  private async runAutofill(action: AutofillAction): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = '';
    this.render();
    try {
      const res = await executeAutofill(this.session, action);
      this.lastResult = res;
      this.message = res.message;
      if (res.ok && action !== 'captcha') this.done.add(action);
    } catch (err) {
      console.warn('[ScamGuard Island] autofill gagal:', err);
      this.lastResult = null;
      this.message = 'Autofill gagal. Silakan isi field secara manual.';
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private downloadPdf(): void {
    const ef = this.session.evidenceFile;
    if (!ef?.base64) return;
    const link = document.createElement('a');
    link.href = ef.base64.startsWith('data:') ? ef.base64 : `data:application/pdf;base64,${ef.base64}`;
    link.download = ef.fileName || 'Evidence_Pack.pdf';
    link.click();
  }

  /** AC-02.4 / AC-05.3: chip PDF bisa di-drag ke kolom unggah. */
  private handleDragStart(e: DragEvent): void {
    const chip = (e.target as Element | null)?.closest('[data-file-chip]');
    if (!chip || !e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-scamguard-pdf', 'true');
    e.dataTransfer.setData('text/plain', this.session.evidenceFile?.fileName ?? 'Evidence_Pack.pdf');
    const file = sessionFile(this.session);
    if (file) {
      try {
        e.dataTransfer.items.add(file);
      } catch {
        /* sebagian browser tidak mengizinkan menambah File saat dragstart */
      }
    }
  }

  private defaultFileInput(): HTMLInputElement | null {
    const inModal = document.querySelector<HTMLInputElement>('.modal.show input[type="file"]');
    if (inModal) return inModal;
    if (this.currentStep === 3) return document.querySelector('input[type="file"][name="file_bukti_pendukung_kejadian"]');
    return null;
  }

  private handleDrop(e: DragEvent): void {
    if (!e.dataTransfer?.types.includes('application/x-scamguard-pdf')) return;
    e.preventDefault();
    const target = e.target as Element | null;
    const direct = target?.closest('input[type="file"]');
    const zone = target?.closest('[data-dropzone], .dropzone, .col-12, .form-group, .mb-3')?.querySelector('input[type="file"]');
    const input = (direct ?? (zone as Element | null) ?? this.defaultFileInput()) as HTMLInputElement | null;
    const file = sessionFile(this.session);
    if (!input || !(input instanceof HTMLInputElement)) {
      this.message = 'Lepaskan chip PDF tepat di kolom unggah bukti.';
    } else if (!file) {
      this.message = 'PDF Evidence Pack belum tersedia.';
    } else {
      const max = input.name.startsWith('detail[') ? 5 * MB : 2 * MB;
      if (file.size > max) this.message = `PDF melebihi batas IASC ${max / MB}MB untuk kolom ini.`;
      else if (attachFileToInput(input, file)) this.message = 'Evidence Pack berhasil dilampirkan.';
      else this.message = 'Browser menolak lampiran. Unduh PDF lalu unggah manual.';
    }
    this.lastResult = null;
    this.render();
  }

  /* ---------------- Render ---------------- */

  public render(): void {
    if (this.capturedReportNo) {
      this.root.className = 'island-root expanded';
      this.root.innerHTML = this.renderSuccess();
    } else if (this.isExpanded) {
      this.root.className = 'island-root expanded';
      this.root.innerHTML = this.renderExpanded();
    } else {
      this.root.className = 'island-root collapsed';
      this.root.innerHTML = this.renderCollapsed();
    }
    // Ukuran berubah (pill ↔ kartu) → pastikan tetap di dalam layar.
    requestAnimationFrame(() => this.clampToViewport());
  }

  private tasks(): Task[] {
    return STEP_TASKS[this.currentStep] ?? [];
  }

  private nextTask(): Task | undefined {
    return this.tasks().find((t) => !this.done.has(t.id));
  }

  private renderCollapsed(): string {
    const step = this.currentStep;
    const next = this.nextTask();
    return `
      <div class="logo" data-drag-handle>${svg('shieldCheck', 18)}</div>
      <div class="pill-text" data-drag-handle>
        <span class="pill-title">ScamGuard Co-Pilot</span>
        <span class="pill-sub">Langkah ${step} dari 5 · ${escapeHtml(STEP_TITLES[step])}</span>
      </div>
      ${next ? '<span class="badge" data-drag-handle>✨ Siap isi</span>' : ''}
      <button class="pill-expand" data-action="expand" title="Buka">${svg('chevronDown', 18)}</button>
    `;
  }

  private renderNote(): string {
    const r = this.lastResult;
    let kind = '';
    let icon: keyof typeof SVG = 'info';
    let text = STEP_NOTE[this.currentStep] ?? '';
    if (this.errorMessage) {
      kind = 'warn';
      icon = 'alert';
      text = this.errorMessage;
    } else if (this.message) {
      text = this.message;
      if (r && r.ok && r.pending.length === 0) [kind, icon] = ['ok', 'checkCircle'];
      else if (r && !r.ok) [kind, icon] = ['warn', 'alert'];
      else if (r) [kind, icon] = ['ok', 'checkCircle'];
    } else if (this.tasks().length && !this.nextTask()) {
      kind = 'ok';
      icon = 'checkCircle';
      text = 'Semua bagian langkah ini sudah diisi. Periksa, lalu klik "Simpan"/"Lanjut" di formulir IASC.';
    }
    return `<div class="note ${kind}">${svg(icon, 18)}<span>${escapeHtml(text)}</span></div>`;
  }

  private renderTasks(): string {
    const tasks = this.tasks();
    if (!tasks.length) return '';
    const next = this.nextTask();
    return `
      <div class="tasks">
        ${tasks
          .map((t) => {
            const isDone = this.done.has(t.id);
            const state = isDone ? 'done' : t === next ? 'next' : '';
            return `
              <div class="task ${state}">
                <span class="task-dot">${isDone ? svg('check', 12) : ''}</span>
                <span class="task-title">${escapeHtml(t.title)}</span>
                ${isDone ? `<button class="task-redo" data-action="${t.id}" ${this.busy ? 'disabled' : ''}>Ulangi</button>` : ''}
              </div>`;
          })
          .join('')}
      </div>`;
  }

  private renderResult(): string {
    const r = this.lastResult;
    if (!r || this.errorMessage || (!r.filledFields.length && !r.pending.length)) return '';
    return `
      <div class="result">
        ${r.filledFields.length ? `<div><b>✓ Terisi:</b> ${r.filledFields.map(escapeHtml).join(', ')}</div>` : ''}
        ${r.pending.length ? `<div><b>✎ Perlu Anda isi:</b> ${r.pending.map(escapeHtml).join(', ')}</div>` : ''}
      </div>`;
  }

  private renderPrimary(): string {
    const disabled = this.busy ? 'disabled' : '';
    if (this.busy) return `<button class="btn-primary" disabled>Mengisi formulir IASC…</button>`;
    if (this.currentStep === 1) return `<button class="btn-secondary" data-action="collapse">Mengerti, saya isi sendiri</button>`;
    if (this.currentStep === 5) return `<button class="btn-primary" data-action="captcha" ${disabled}>${svg('search', 18)} Ke kolom CAPTCHA</button>`;
    const next = this.nextTask();
    if (!next) return '';
    const tasks = this.tasks();
    const counter = tasks.length > 1 ? ` (${tasks.indexOf(next) + 1}/${tasks.length})` : '';
    return `<button class="btn-primary" data-action="${next.id}" ${disabled} title="${escapeHtml(next.title)}">${svg('sparkles', 18)} Isi Otomatis${counter}</button>`;
  }

  private renderExpanded(): string {
    const step = this.currentStep;
    const t = this.session.target;
    const ef = this.session.evidenceFile;
    const loss = t.lossAmount ? `Rp ${t.lossAmount.toLocaleString('id-ID')}` : '—';
    const acc = t.accountNumber ? `${t.bankName ? `${t.bankName} · ` : ''}${t.accountNumber}` : '—';
    const size = ef?.sizeBytes ? `${Math.max(1, Math.round(ef.sizeBytes / 1024))} KB` : '';

    return `
      <div class="card-header" data-drag-handle title="Geser untuk memindahkan">
        <div class="logo">${svg('shieldCheck', 18)}</div>
        <div class="brand">
          <span class="brand-title">ScamGuard Co-Pilot</span>
          <span class="brand-sub">Lapor IASC · #${escapeHtml(this.session.incidentCode || '—')}</span>
        </div>
        <span class="drag-hint">${svg('grip', 16)}</span>
        <button class="icon-btn" data-action="collapse" title="Kecilkan">${svg('minus', 18)}</button>
      </div>

      <div class="card-body">
        <div>
          <div class="progress-head">
            <span class="progress-title">${escapeHtml(STEP_TITLES[step])}</span>
            <span class="progress-count">Langkah ${step} dari 5</span>
          </div>
          <div class="progress-bar">
            ${[1, 2, 3, 4, 5].map((n) => `<span class="${n === step ? 'active' : n < step ? 'done' : ''}"></span>`).join('')}
          </div>
        </div>

        ${this.renderNote()}
        ${this.renderTasks()}
        ${this.renderPrimary()}
        ${this.renderResult()}

        <div>
          <div class="section-label" style="margin-bottom:8px">Data siap isi</div>
          <div class="data-rows">
            <div class="data-row"><span>Rekening pelaku</span><span>${escapeHtml(acc)}</span></div>
            <div class="data-row"><span>Kerugian</span><span>${escapeHtml(loss)}</span></div>
          </div>
        </div>

        ${
          ef
            ? `<div class="file-chip" data-file-chip draggable="true" title="Seret ke kolom unggah bukti IASC">
                <span class="file-icon">${svg('file', 18)}</span>
                <span class="file-meta">
                  <span class="file-name">${escapeHtml(ef.fileName)}</span>
                  <span class="file-size">${ef.base64 ? `${size ? `${size} · ` : ''}Seret ke kolom unggah` : 'PDF belum tersedia'}</span>
                </span>
                ${ef.base64 ? `<button class="icon-btn" data-action="download" title="Unduh PDF">${svg('download', 18)}</button>` : ''}
              </div>`
            : ''
        }
      </div>

      <div class="card-footer">${svg('lock', 14)} Data pribadi Anda tidak disimpan ScamGuard.</div>
    `;
  }

  private renderSuccess(): string {
    return `
      <div class="card-header" data-drag-handle>
        <div class="logo">${svg('shieldCheck', 18)}</div>
        <div class="brand">
          <span class="brand-title">ScamGuard Co-Pilot</span>
          <span class="brand-sub">Lapor IASC · #${escapeHtml(this.session.incidentCode || '—')}</span>
        </div>
      </div>
      <div class="success-body">
        <div class="success-icon">${svg('check', 26)}</div>
        <div class="success-title">Laporan terkirim!</div>
        <div class="report-no">${escapeHtml(this.capturedReportNo)}</div>
        <div class="success-desc">Nomor laporan IASC tersimpan otomatis ke kasus ScamGuard Anda.</div>
        <button class="btn-secondary" data-action="close-success">Tutup</button>
      </div>
    `;
  }

  public destroy(): void {
    this.observer?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('dragover', this.onDragOver);
    document.removeEventListener('drop', this.onDrop);
    this.host.remove();
  }
}

/** Inisialisasi Dynamic Island jika ada session pelaporan aktif */
export function mountIsland(session: ReportingSession): ScamGuardIsland {
  return new ScamGuardIsland(session);
}
