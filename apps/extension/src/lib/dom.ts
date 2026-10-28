// Template HTML kecil yang meng-escape semua nilai sisipan. Teks dari halaman web
// (bukti/kutipan) tidak pernah disisipkan sebagai HTML mentah.

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class Raw {
  constructor(readonly value: string) {}
  toString() {
    return this.value;
  }
}

export const raw = (value: string) => new Raw(value);
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ESC[c]);

type Value = string | number | boolean | null | undefined | Raw | Value[];

function render(value: Value): string {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Raw {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new Raw(out);
}

export function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Elemen ${selector} tidak ditemukan`);
  return el;
}
