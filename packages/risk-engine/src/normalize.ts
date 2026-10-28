// Normalisasi input (PRD 9.2).

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
const EMOJI = /\p{Extended_Pictographic}|️|‍/gu;

/** Teks untuk pencocokan: lowercase, tanpa diakritik/emoji, spasi dikompres. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(EMOJI, ' ')
    .toLowerCase()
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Salinan khusus pencocokan dengan angka-leet diganti huruf (hanya bila menempel ke huruf). */
export function deleet(normalized: string): string {
  return normalized.replace(/(?<=[a-z])[013457@$]|[013457@$](?=[a-z])/g, (ch) => LEET[ch] ?? ch);
}

export interface ParsedUrl {
  href: string;
  protocol: string;
  host: string; // lowercase, tanpa "www."
  path: string;
  labels: string[];
  tld: string;
  /** Token nama host dipisah titik & strip, mis. "bca-promo.top" → ["bca","promo","top"]. */
  tokens: string[];
  isIp: boolean;
}

export function parseUrl(raw: string): ParsedUrl | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  for (const key of [...u.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_')) u.searchParams.delete(key);
  }
  const hostname = u.hostname.toLowerCase().replace(/\.$/, '');
  const host = hostname.replace(/^www\./, '');
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
  const labels = host.split('.').filter(Boolean);
  if (!isIp && (labels.length < 2 || !/^[a-z0-9-]+$/.test(labels.join('')))) {
    // Host tanpa titik (mis. "halo") bukan tautan yang valid, kecuali localhost.
    if (host !== 'localhost') return null;
  }
  return {
    href: u.toString(),
    protocol: u.protocol,
    host,
    path: u.pathname,
    labels,
    tld: isIp ? '' : labels[labels.length - 1] ?? '',
    tokens: isIp ? [] : host.split(/[.-]/).filter(Boolean),
    isIp,
  };
}

/** True bila string tampak seperti tautan (dipakai popup untuk menebak tipe input). */
export function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  if (/\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/\S*)?$/i.test(v) && /[a-z]/i.test(v.split('/')[0]);
}

/** Nomor: hapus non-digit kecuali "+" di depan; +62/62 → 0. */
export function normalizeNumber(raw: string): string {
  let digits = raw.trim().replace(/(?!^\+)[^\d]/g, '');
  if (digits.startsWith('+62')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('62') && digits.length >= 10) digits = '0' + digits.slice(2);
  return digits.replace(/\D/g, '');
}

export function looksLikeNumber(value: string): boolean {
  const v = value.trim();
  return /^\+?[\d\s.-]{6,20}$/.test(v) && v.replace(/\D/g, '').length >= 6;
}

/** Host cocok dengan daftar domain (persis atau subdomain-nya). */
export function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Potong kutipan bukti ≤ 60 karakter, dalam tanda kutip. */
export function quote(fragment: string, max = 58): string {
  let s = fragment.trim().replace(/\s+/g, ' ');
  if (s.length > max - 2) s = s.slice(0, max - 3).trimEnd() + '…';
  return `“${s}”`;
}
