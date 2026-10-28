import { describe, expect, it } from 'vitest';
import { analyze } from '../src';
import cases from './cases.json';

interface Case {
  id: string;
  type: 'url' | 'text';
  value: string;
  expect: 'high' | 'medium+' | 'low' | 'low|medium';
  resolved?: { url: string; text: string };
}

function run(c: Case) {
  const page = c.resolved ? { url: c.resolved.url, title: '', text: c.resolved.text, hasPaymentForm: false } : undefined;
  return analyze({ type: c.type, value: c.value, page });
}

function meets(c: Case, level: string): boolean {
  switch (c.expect) {
    case 'high': return level === 'high';
    case 'medium+': return level !== 'low';
    case 'low': return level === 'low';
    case 'low|medium': return level !== 'high';
  }
}

describe('set uji deteksi (Lampiran C, 40 kasus)', () => {
  const all = cases as Case[];
  const risky = all.filter((c) => c.expect === 'high' || c.expect === 'medium+');
  const safe = all.filter((c) => !risky.includes(c));

  it('berisi 40 kasus: 20 berisiko, 20 aman', () => {
    expect(all).toHaveLength(40);
    expect(risky).toHaveLength(20);
    expect(safe).toHaveLength(20);
  });

  it('recall kasus berisiko ≥ 85%', () => {
    const missed = risky.filter((c) => !meets(c, run(c).level));
    const recall = 1 - missed.length / risky.length;
    expect(recall, `terlewat: ${missed.map((c) => `${c.id}=${run(c).score}`).join(', ')}`).toBeGreaterThanOrEqual(0.85);
  });

  it('false positive kasus aman ≤ 10%', () => {
    const fp = safe.filter((c) => !meets(c, run(c).level));
    expect(fp.length / safe.length, `FP: ${fp.map((c) => `${c.id}=${run(c).score}`).join(', ')}`).toBeLessThanOrEqual(0.1);
  });

  it.each(all.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const r = run(c);
    if (r.level !== 'low') expect(r.reasons.length).toBeGreaterThan(0);
  });
});
