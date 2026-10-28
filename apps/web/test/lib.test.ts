import { describe, expect, it } from 'vitest';
import { extractFields, guessCategory } from '@/lib/extract';
import { formatRupiah, fromLocalInput, hms, parseRupiah } from '@/lib/format';
import { bankScript } from '@/lib/script';

const RESI = `Transfer Berhasil
14 Okt 2026 14:32:05 WIB
Nominal Rp 2.500.000,00
Rekening Tujuan 8820 1948 29
Nama Penerima: KEVIN SUSANTO
Bank BCA
No. Ref: TRX88213AB`;

describe('ekstraksi OCR (PRD 11.4)', () => {
  it('membaca field utama dari resi', () => {
    const { fields, confidence } = extractFields(RESI);
    expect(fields).toMatchObject({ amount: 2500000, date: '2026-10-14', time: '14:32', account: '8820194829', bank: 'BCA', ref: 'TRX88213AB' });
    expect(fields.name).toMatch(/^Kevin Susanto/);
    expect(confidence).toBe('tinggi');
  });
  it('confidence rendah bila hanya sedikit yang cocok', () => {
    expect(extractFields('halo apa kabar 12:30').confidence).toBe('rendah');
  });
  it('menebak kategori', () => {
    expect(guessCategory(RESI)).toBe('transfer');
    expect(guessCategory('kak jadi ikut investasinya?')).toBe('chat');
  });
});

describe('contoh kalimat bank (AC-05.7)', () => {
  it('memakai placeholder bila data kosong', () => {
    expect(bankScript({})).toContain('[NOMINAL]');
    expect(bankScript({})).toContain('[NO. REKENING]');
    expect(bankScript({})).toContain('[NAMA BANK]');
  });
  it('terisi dari data incident', () => {
    const s = bankScript({ amount: 2500000, transferAt: '2026-10-27T14:32:00+07:00', recipientAccount: '8820194829', recipientBank: 'BCA' });
    expect(s).toContain('Rp2.500.000');
    expect(s).toContain('8820194829');
    expect(s).toContain('di BCA');
  });
});

describe('format', () => {
  it('rupiah', () => {
    expect(formatRupiah(2500000)).toBe('Rp2.500.000');
    expect(parseRupiah('Rp 2.500.000')).toBe(2500000);
    expect(parseRupiah('')).toBeNull();
  });
  it('datetime-local → ISO dengan offset', () => {
    expect(fromLocalInput('2026-10-27T14:32')).toMatch(/^2026-10-27T14:32:00[+-]\d{2}:\d{2}$/);
  });
  it('HH:MM:SS', () => {
    expect(hms(3725)).toBe('01:02:05');
  });
});
