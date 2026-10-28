import { describe, expect, it } from 'vitest';
import { DEMO_AMAN, DEMO_INVESTASI, demoPageText, type RuleSet } from '@scamguard/shared';
import {
  analyze, computeScore, defaultRules, entityHash, isUsableRuleSet, normalizeNumber, normalizeText, parseUrl, sha256Hex, toLevel,
} from '../src';

const ids = (r: ReturnType<typeof analyze>) => r.reasons.map((x) => x.ruleId);
const text = (value: string) => analyze({ type: 'text', value });
const url = (value: string) => analyze({ type: 'url', value });
const num = (value: string, rules: RuleSet = defaultRules) => analyze({ type: 'number', value }, rules);

describe('aturan teks — 2 positif & 2 negatif', () => {
  const table: [string, string[], string[]][] = [
    ['TXT_GUARANTEED_PROFIT', ['profit tetap tiap bulan', 'dijamin pasti cuan'], ['profit perusahaan naik', 'untung rugi ditanggung bersama']],
    ['TXT_HIGH_RETURN_PCT', ['bunga 30% per minggu', 'imbal 5% per hari'], ['diskon 50% hari ini', 'bunga 3,5% per tahun']],
    ['TXT_GUARANTEE_100', ['jaminan 100% balik modal', 'investasi anti rugi'], ['jaminan garansi resmi 1 tahun', 'risiko ditanggung pembeli']],
    ['TXT_URGENCY', ['slot terbatas, segera daftar', 'transfer sekarang juga'], ['transfer berhasil', 'slot parkir tersedia']],
    ['TXT_DEPOSIT', ['deposit awal 100rb', 'bayar biaya pencairan dulu'], ['deposito berjangka', 'biaya admin bulanan Rp5.000']],
    ['TXT_OTP_PIN', ['kirimkan kode OTP ke admin', 'sebutkan PIN anda'], ['jangan bagikan kode OTP kepada siapa pun', 'atur PIN di aplikasi']],
    ['TXT_IMPERSONATION', ['cs resmi bank menghubungi', 'akun anda diblokir'], ['layanan pelanggan 24 jam', 'akun anda berhasil dibuat']],
    ['TXT_PRIZE', ['selamat anda terpilih', 'hadiah undian mobil'], ['hadiah ulang tahun untuk ibu', 'selamat pagi semua']],
    ['TXT_JOB_TASK', ['kerja dari rumah cukup like video', 'komisi per tugas'], ['kerja dari rumah tiga hari seminggu', 'tugas kuliah menumpuk']],
    ['TXT_PERSONAL_ACCOUNT', ['transfer ke rekening pribadi saya', 'tf ke a.n budi'], ['transfer ke rekening perusahaan', 'tf berhasil']],
  ];
  for (const [rule, pos, neg] of table) {
    it(rule, () => {
      for (const p of pos) expect(ids(text(p)), p).toContain(rule);
      for (const n of neg) expect(ids(text(n)), n).not.toContain(rule);
    });
  }

  it('mengenali leet-speak', () => {
    expect(ids(text('pr0fit t3tap tiap hari'))).toContain('TXT_GUARANTEED_PROFIT');
  });

  it('bukti berupa kutipan ≤ 60 karakter', () => {
    const r = text(demoPageText(DEMO_INVESTASI));
    for (const reason of r.reasons) if (reason.evidence) expect(reason.evidence.length).toBeLessThanOrEqual(60);
  });
});

describe('aturan URL — 2 positif & 2 negatif', () => {
  const table: [string, string[], string[]][] = [
    ['URL_SHORTENER', ['bit.ly/abc', 'https://s.id/promo'], ['https://bitly.com', 'https://example.com']],
    ['URL_RISKY_TLD', ['https://contoh.xyz', 'https://abc.top/x'], ['https://contoh.com', 'https://abc.co.id']],
    ['URL_MANY_SUBDOMAIN', ['https://a.b.c.d.contoh.com', 'https://x.y.z.w.v.net'], ['https://a.contoh.com', 'https://contoh.com']],
    ['URL_IP_HOST', ['http://192.168.1.1/bayar', 'https://10.0.0.5'], ['https://contoh.com', 'https://1x.com']],
    ['URL_PUNYCODE', ['https://xn--bc-xja.com', 'https://xn--mndiri-9ua.id'], ['https://bca.com.sg', 'https://mandiri.dev']],
    ['URL_LOOKALIKE', ['https://bca-promo-hadiah.top', 'https://tokopedla.com'], ['https://www.bca.co.id', 'https://tokopedia.com']],
    ['URL_NUMERIC_BRANDY', ['https://cuan88.com', 'https://profit77.net'], ['https://web2.com', 'https://cuan.com']],
  ];
  for (const [rule, pos, neg] of table) {
    it(rule, () => {
      for (const p of pos) expect(ids(url(p)), p).toContain(rule);
      for (const n of neg) expect(ids(url(n)), n).not.toContain(rule);
    });
  }

  it('URL_HTTP hanya untuk halaman berformulir pembayaran', () => {
    const page = (u: string, hasPaymentForm: boolean) =>
      analyze({ type: 'page', page: { url: u, title: '', text: '', hasPaymentForm } });
    expect(ids(page('http://toko.com/bayar', true))).toContain('URL_HTTP');
    expect(ids(page('https://toko.com/bayar', true))).not.toContain('URL_HTTP');
    expect(ids(page('http://toko.com/bayar', false))).not.toContain('URL_HTTP');
  });

  it('tautan pendek menyebut alamat tujuan bila diketahui', () => {
    const r = analyze({ type: 'url', value: 'bit.ly/cuan-harian', page: { url: 'https://investasi-cuan88.xyz', title: '', text: '', hasPaymentForm: false } });
    expect(r.reasons.find((x) => x.ruleId === 'URL_SHORTENER')?.evidence).toBe('Mengarah ke investasi-cuan88.xyz');
  });

  it('URL_REPORTED butuh ≥ 3 laporan', () => {
    const rules = { ...defaultRules, reported: { [entityHash('domain', 'lapor.com')]: 3, [entityHash('domain', 'sekali.com')]: 1 } };
    expect(ids(analyze({ type: 'url', value: 'https://lapor.com' }, rules))).toContain('URL_REPORTED');
    expect(ids(analyze({ type: 'url', value: 'https://sekali.com' }, rules))).not.toContain('URL_REPORTED');
  });
});

describe('aturan halaman & nomor', () => {
  it('PG_PAYMENT_FORM butuh form pembayaran + tanda profit/urgency', () => {
    const page = (text: string, hasPaymentForm: boolean) =>
      analyze({ type: 'page', page: { url: 'https://toko.com', title: '', text, hasPaymentForm } });
    expect(ids(page('slot terbatas, transfer sekarang', true))).toContain('PG_PAYMENT_FORM');
    expect(ids(page('slot terbatas, transfer sekarang', false))).not.toContain('PG_PAYMENT_FORM');
    expect(ids(page('form pembayaran tagihan', true))).not.toContain('PG_PAYMENT_FORM');
  });

  it('PG_COUNTDOWN', () => {
    const r = analyze({ type: 'page', page: { url: 'https://toko.com', title: '', text: 'promo berakhir', hasPaymentForm: false, hasCountdown: true } });
    expect(ids(r)).toContain('PG_COUNTDOWN');
  });

  it('NUM_INVALID_FORMAT', () => {
    expect(ids(num('0812-3456-7781'))).not.toContain('NUM_INVALID_FORMAT');
    expect(ids(num('+62 812 3456 7781'))).not.toContain('NUM_INVALID_FORMAT');
    expect(ids(num('1234567890'))).not.toContain('NUM_INVALID_FORMAT');
    expect(ids(num('+62 11 22'))).toContain('NUM_INVALID_FORMAT');
    expect(ids(num('0812-34'))).toContain('NUM_INVALID_FORMAT');
  });

  it('NUM_REPORTED 30 untuk 1 laporan, 60 untuk ≥ 3', () => {
    const one = { ...defaultRules, reported: { [entityHash('number', '081234567781')]: 1 } };
    const three = { ...defaultRules, reported: { [entityHash('number', '081234567781')]: 3 } };
    expect(num('081234567781', one).reasons[0]).toMatchObject({ ruleId: 'NUM_REPORTED', weight: 30 });
    const r = num('+6281234567781', three);
    expect(r.reasons[0]).toMatchObject({ ruleId: 'NUM_REPORTED', weight: 60 });
    expect(r.level).toBe('medium');
  });
});

describe('rumus skor & level', () => {
  const hit = (category: string, weight: number) => ({ ruleId: `${category}${weight}`, category, title: '', weight }) as never;

  it('batas level 39/40 dan 69/70', () => {
    expect(toLevel(39)).toBe('low');
    expect(toLevel(40)).toBe('medium');
    expect(toLevel(69)).toBe('medium');
    expect(toLevel(70)).toBe('high');
  });

  it('kategori sama: terbesar + 50% sisanya', () => {
    expect(computeScore([hit('profit', 30), hit('profit', 25)])).toBe(43); // 42,5 dibulatkan
  });

  it('contoh PRD 9.4 → 100', () => {
    expect(computeScore([hit('profit', 30), hit('profit', 25), hit('urgency', 20), hit('credential', 35), hit('url', 15)])).toBe(100);
  });

  it('bonus kombinasi', () => {
    expect(computeScore([hit('credential', 35), hit('urgency', 20)])).toBe(65);
    expect(computeScore([hit('a', 10), hit('b', 10), hit('c', 10)])).toBe(40);
  });

  it('skor 0 → tanpa alasan, level rendah', () => {
    const r = text('halo apa kabar');
    expect(r).toMatchObject({ score: 0, level: 'low', reasons: [] });
  });
});

describe('normalisasi', () => {
  it('teks: lowercase, diakritik, emoji, spasi', () => {
    expect(normalizeText('  PRÓFIT 🎉  Tétap  ')).toBe('profit tetap');
  });
  it('URL tanpa skema dinormalisasi ke https dan utm dibuang', () => {
    expect(parseUrl('bit.ly/abc?utm_source=wa&x=1')?.href).toBe('https://bit.ly/abc?x=1');
    expect(parseUrl('halo')).toBeNull();
  });
  it('punycode tetap terdeteksi', () => {
    expect(parseUrl('https://xn--bc-xja.com')?.host).toContain('xn--');
  });
  it('nomor +62 / 62 → 0', () => {
    expect(normalizeNumber('+62 812-3456-7781')).toBe('081234567781');
    expect(normalizeNumber('6281234567781')).toBe('081234567781');
  });
});

describe('allowlist', () => {
  it('domain resmi tidak pernah > 20', () => {
    const r = analyze({ type: 'page', page: { url: 'https://www.bca.co.id/promo', title: '', text: demoPageText(DEMO_INVESTASI), hasPaymentForm: true } });
    expect(r.score).toBeLessThanOrEqual(20);
  });
});

describe('halaman demo (PRD 16.5)', () => {
  it('/demo/investasi → tinggi dengan ≥ 3 alasan', () => {
    const r = analyze({ type: 'page', page: { url: 'http://localhost:3000/demo/investasi', title: DEMO_INVESTASI.title, text: demoPageText(DEMO_INVESTASI), hasPaymentForm: true } });
    expect(r.level).toBe('high');
    expect(r.reasons.length).toBeGreaterThanOrEqual(3);
  });
  it('/demo/aman → rendah', () => {
    const r = analyze({ type: 'page', page: { url: 'http://localhost:3000/demo/aman', title: DEMO_AMAN.title, text: demoPageText(DEMO_AMAN), hasPaymentForm: false } });
    expect(r.level).toBe('low');
  });
});

describe('lain-lain', () => {
  it('sha256 sesuai vektor standar', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
  it('validasi RuleSet', () => {
    expect(isUsableRuleSet(defaultRules)).toBe(true);
    expect(isUsableRuleSet({ ...defaultRules, schemaVersion: 2 })).toBe(false);
    expect(isUsableRuleSet({ ...defaultRules, text: [{ ...defaultRules.text[0], patterns: ['('] }] })).toBe(false);
  });
  it('analisis teks 20.000 karakter ≤ 150 ms', () => {
    const big = (demoPageText(DEMO_AMAN) + ' ').repeat(80).slice(0, 20_000);
    analyze({ type: 'page', page: { url: 'https://contoh.com', title: '', text: big, hasPaymentForm: false } });
    const t0 = performance.now();
    analyze({ type: 'page', page: { url: 'https://contoh.com', title: '', text: big, hasPaymentForm: false } });
    expect(performance.now() - t0).toBeLessThan(150);
  });
});
