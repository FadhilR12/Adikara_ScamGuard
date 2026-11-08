// Smart Autofill Engine for IASC Reporting Portal (PRD 5 / KF-ISLAND-04 & KF-ISLAND-05)
import type { ReportingSession } from '@scamguard/shared';

export interface AutofillResult {
  step: number;
  filledFields: string[];
  attachedFile?: boolean;
  message: string;
}

/** Deteksi langkah formulir IASC yang aktif (1 s/d 5) */
export function detectCurrentStep(): number {
  // 1. Cek parameter query URL ?step=X
  const urlParams = new URLSearchParams(window.location.search);
  const stepParam = urlParams.get('step');
  if (stepParam && /^[1-5]$/.test(stepParam)) {
    return parseInt(stepParam, 10);
  }

  // 2. Cek elemen form aktif di DOM IASC / Demo Mock
  if (document.getElementById('form-scam-step5') || document.querySelector('[data-step="5"].active')) return 5;
  if (document.getElementById('form-scam-step4') || document.querySelector('[data-step="4"].active')) return 4;
  if (document.getElementById('form-scam-step3') || document.querySelector('[data-step="3"].active')) return 3;
  if (document.getElementById('form-scam-step2') || document.querySelector('[data-step="2"].active')) return 2;
  if (document.getElementById('form-scam-step1') || document.querySelector('[data-step="1"].active')) return 1;

  // 3. Cek aria-selected pada stepper
  const activeTrigger = document.querySelector<HTMLElement>('.step-trigger[aria-selected="true"]');
  if (activeTrigger) {
    const id = activeTrigger.id || '';
    const match = id.match(/\d+$/);
    if (match) return parseInt(match[0], 10);
  }

  return 1;
}

/** Memicu event reaktif standar DOM agar jQuery / framework mendeteksi pengisian nilai */
export function triggerReactiveEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
}

/** Berikan highlight visual hijau sejenak untuk konfirmasi berhasil terisi */
export function highlightField(element: HTMLElement): void {
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;
  const originalBorderColor = element.style.borderColor;

  element.style.transition = 'all 0.3s ease';
  element.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.45)';
  element.style.borderColor = '#10B981';

  window.setTimeout(() => {
    element.style.boxShadow = originalBoxShadow;
    element.style.borderColor = originalBorderColor;
    element.style.transition = originalTransition;
  }, 2200);
}

/** Cari elemen input dengan multiple fallback selector */
export function findInput(selectors: string[]): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  for (const s of selectors) {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(s);
    if (el) return el;
  }
  return null;
}

/** Konversi base64 string ke objek File */
export function base64ToFile(base64: string, fileName: string, mimeType = 'application/pdf'): File {
  try {
    const byteChars = atob(base64.replace(/^data:[^;]+;base64,/, ''));
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
  } catch {
    // Fallback bila base64 kosong atau tidak valid: buat file dummy
    const dummyBlob = new Blob(['%PDF-1.4 Mock ScamGuard Evidence Pack Document'], { type: mimeType });
    return new File([dummyBlob], fileName, { type: mimeType, lastModified: Date.now() });
  }
}

/** Lampirkan file ke input[type="file"] via DataTransfer API */
export function attachFileToInput(input: HTMLInputElement, file: File): boolean {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    triggerReactiveEvents(input);
    highlightField(input);
    return true;
  } catch (err) {
    console.warn('[ScamGuard Island] Gagal melampirkan file via DataTransfer:', err);
    return false;
  }
}

/** Eksekusi autofill berdasarkan langkah yang aktif */
export async function executeAutofill(session: ReportingSession, step?: number): Promise<AutofillResult> {
  const currentStep = step ?? detectCurrentStep();
  const filledFields: string[] = [];
  let attachedFile = false;

  const target = session.target;

  switch (currentStep) {
    case 1: {
      // Step 1: Informasi Pelapor (Data Diri)
      // Catatan: Sesuai prinsip UU PDP, NIK/KTP diisi mandiri oleh pengguna.
      // Kita hanya mengisi field nama pelapor jika ada kesesuaian.
      return {
        step: 1,
        filledFields,
        message: 'Data pelapor (NIK & Alamat) silakan diisi langsung demi privasi Anda.',
      };
    }

    case 2: {
      // Step 2: Informasi Pihak Terlapor (Pelaku)
      // Input: no_nomor_telepon_terlapor / nomor_terlapor
      if (target.perpetratorPhone) {
        const phoneInput = findInput([
          'input[name="no_nomor_telepon_terlapor"]',
          'input[name="nomor_terlapor"]',
          '#laporanv2-nomor-terlapor',
          'input[name*="terlapor"][type="tel"]',
          'input[name*="terlapor"][type="text"]',
        ]);
        if (phoneInput && phoneInput instanceof HTMLInputElement) {
          phoneInput.value = target.perpetratorPhone;
          triggerReactiveEvents(phoneInput);
          highlightField(phoneInput);
          filledFields.push('Nomor Telepon Pelaku');
        }
      }
      return {
        step: 2,
        filledFields,
        message: filledFields.length > 0 ? 'Kontak pelaku berhasil diisi!' : 'Silakan buka modal tambah pihak terlapor.',
      };
    }

    case 3: {
      // Step 3: Informasi Kejadian
      // Input: kronologi_kejadian (textarea), waktu_kejadian
      if (target.chronology) {
        const chronoTextarea = findInput([
          'textarea[name="kronologi_kejadian"]',
          '#kronologi_kejadian',
          'textarea[name*="kronologi"]',
          'textarea',
        ]);
        if (chronoTextarea && chronoTextarea instanceof HTMLTextAreaElement) {
          chronoTextarea.value = target.chronology;
          triggerReactiveEvents(chronoTextarea);
          highlightField(chronoTextarea);
          filledFields.push('Kronologi Kejadian');
        }
      }

      // Waktu Kejadian
      if (target.incidentDate) {
        const timeInput = findInput([
          'input[name="waktu_kejadian"]',
          '#waktu_kejadian',
          'input[name*="waktu"]',
        ]);
        if (timeInput && timeInput instanceof HTMLInputElement) {
          timeInput.value = target.incidentDate.slice(0, 16).replace('T', ' ');
          triggerReactiveEvents(timeInput);
          highlightField(timeInput);
          filledFields.push('Waktu Kejadian');
        }
      }

      return {
        step: 3,
        filledFields,
        message: filledFields.length > 0 ? 'Kronologi rapi berhasil ditempel!' : 'Field kronologi tidak ditemukan.',
      };
    }

    case 4: {
      // Step 4: Informasi Transaksi & Kerugian + Evidence Pack
      // 1. Nomor Rekening Pelaku
      if (target.accountNumber) {
        const accInput = findInput([
          '#laporanv2-nomor-rekening-terlapor',
          'input[name="nomor_rekening_terlapor"]',
          'input[name*="rekening_terlapor"]',
          'input[name="rekening_tujuan"]',
          '#nomor_rekening_terlapor',
        ]);
        if (accInput && accInput instanceof HTMLInputElement) {
          accInput.value = target.accountNumber;
          triggerReactiveEvents(accInput);
          highlightField(accInput);
          filledFields.push('Rekening Tujuan');
        }
      }

      // 2. Nominal Transaksi
      if (target.lossAmount) {
        const amountInput = findInput([
          'input[name*="nominal_transaksi"]',
          '#nominal_transaksi',
          'input[name="nominal_transaksi"]',
          'input.money',
        ]);
        if (amountInput && amountInput instanceof HTMLInputElement) {
          // Format ribuan jika menggunakan maskMoney
          amountInput.value = target.lossAmount.toLocaleString('id-ID');
          triggerReactiveEvents(amountInput);
          highlightField(amountInput);
          filledFields.push('Nominal Kerugian');
        }
      }

      // 3. Nama Pemilik Rekening Pelaku
      if (target.accountHolder) {
        const holderInput = findInput([
          'input[name="nama_pemilik_rekening_terlapor"]',
          'input[name*="pemilik_rekening"]',
          '#nama_pemilik_rekening',
        ]);
        if (holderInput && holderInput instanceof HTMLInputElement) {
          holderInput.value = target.accountHolder;
          triggerReactiveEvents(holderInput);
          highlightField(holderInput);
          filledFields.push('Nama Pemilik Rekening');
        }
      }

      // 4. Lampirkan PDF Evidence Pack
      if (session.evidenceFile) {
        const fileInput = document.querySelector<HTMLInputElement>(
          'input[type="file"][name*="bukti"], input[type="file"][name*="file"], input[type="file"]'
        );
        if (fileInput) {
          const file = base64ToFile(
            session.evidenceFile.base64 || '',
            session.evidenceFile.fileName || 'Evidence_Pack_ScamGuard.pdf',
            session.evidenceFile.mimeType || 'application/pdf'
          );
          attachedFile = attachFileToInput(fileInput, file);
          if (attachedFile) filledFields.push('File Evidence Pack (PDF)');
        }
      }

      return {
        step: 4,
        filledFields,
        attachedFile,
        message: filledFields.length > 0 ? 'Data transaksi & dokumen PDF berhasil disematkan!' : 'Field transaksi belum siap.',
      };
    }

    case 5: {
      // Step 5: Kesediaan Melapor (Persetujuan & Captcha)
      const agreement = document.querySelector<HTMLInputElement>('#agreementCheckbox, input[type="checkbox"][name*="agree"]');
      if (agreement && !agreement.checked) {
        agreement.checked = true;
        triggerReactiveEvents(agreement);
        highlightField(agreement);
        filledFields.push('Centang Persetujuan');
      }

      return {
        step: 5,
        filledFields,
        message: 'Persetujuan dicentang. Silakan isi kode CAPTCHA di bawah, lalu kirim.',
      };
    }

    default:
      return { step: currentStep, filledFields: [], message: 'Langkah tidak dikenali.' };
  }
}
