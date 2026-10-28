// Aturan teks (PRD 9.3 A). Berlaku untuk input teks, halaman, dan hasil OCR.
import type { RiskReason, RuleSet, TextRule } from '@scamguard/shared';
import { deleet, quote } from './normalize';

interface CompiledTextRule {
  rule: TextRule;
  patterns: RegExp[];
  strip: RegExp[];
}

const cache = new WeakMap<RuleSet, CompiledTextRule[]>();

function compile(rules: RuleSet): CompiledTextRule[] {
  let compiled = cache.get(rules);
  if (!compiled) {
    compiled = rules.text.map((rule) => ({
      rule,
      patterns: rule.patterns.map((p) => new RegExp(p, 'i')),
      strip: (rule.strip ?? []).map((p) => new RegExp(p, 'gi')),
    }));
    cache.set(rules, compiled);
  }
  return compiled;
}

/** Perluas kecocokan sampai akhir frasa agar kutipan bermakna, mis. "profit tetap 30% per minggu". */
function evidenceAt(text: string, index: number, length: number): string {
  const rest = text.slice(index + length, index + length + 40);
  // Titik di tengah singkatan (a.n, dll.) bukan akhir frasa.
  const stop = rest.search(/[!?,;:\n]|\.(?=\s|$)|\s-\s/);
  const tail = stop === -1 ? rest.replace(/\s+\S*$/, '') : rest.slice(0, stop);
  return quote(text.slice(index, index + length) + tail);
}

const PCT = /(\d{1,3}(?:[.,]\d+)?)\s?%\s?(?:(?:\/|per|setiap|tiap)\s?(hari|minggu|bulan|jam)|(sehari|seminggu|sebulan))\b/gi;
const PCT_LIMIT: Record<string, number> = { jam: 1, hari: 3, minggu: 5, bulan: 10 };

function matchHighReturn(text: string, rules: RuleSet): RiskReason | null {
  const meta = rules.weights.TXT_HIGH_RETURN_PCT;
  if (!meta) return null;
  for (const m of text.matchAll(PCT)) {
    const pct = parseFloat(m[1].replace(',', '.'));
    const unit = (m[2] ?? m[3]).replace(/^se/, '');
    const limit = PCT_LIMIT[unit] ?? 10;
    if (pct >= limit) {
      return { ruleId: 'TXT_HIGH_RETURN_PCT', category: meta.category, title: meta.title, evidence: quote(m[0]), weight: meta.weight };
    }
  }
  return null;
}

/** `text` harus sudah dinormalisasi dengan normalizeText(). */
export function matchTextRules(text: string, rules: RuleSet): RiskReason[] {
  if (!text) return [];
  const leet = deleet(text);
  const hits: RiskReason[] = [];
  for (const { rule, patterns, strip } of compile(rules)) {
    let plain = text;
    let alt = leet;
    for (const re of strip) {
      plain = plain.replace(re, ' ');
      alt = alt.replace(re, ' ');
    }
    for (const re of patterns) {
      const inPlain = re.exec(plain);
      const m = inPlain ?? re.exec(alt);
      if (m) {
        const source = inPlain ? plain : alt;
        hits.push({
          ruleId: rule.id,
          category: rule.category,
          title: rule.title,
          evidence: evidenceAt(source, m.index, m[0].length),
          weight: rule.weight,
        });
        break;
      }
    }
  }
  const pct = matchHighReturn(text, rules);
  if (pct) hits.push(pct);
  return hits;
}
