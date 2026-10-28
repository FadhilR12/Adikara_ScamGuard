import { LEVEL_LABEL, LEVEL_SUMMARY, NO_RISK_MESSAGE, type RiskResult } from '@scamguard/shared';
import { CheckCircle2, Hash, Link2, Lock, Timer, TrendingUp, UserCheck, Wallet } from 'lucide-react';
import { Pill } from './ui';

const COLOR = { low: '#16A34A', medium: '#F59E0B', high: '#DC2626' } as const;
const ICON = { profit: TrendingUp, urgency: Timer, credential: Lock, url: Link2, payment: Wallet, impersonation: UserCheck, number: Hash } as const;

export function ScoreRing({ result, size = 88 }: { result: RiskResult; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Skor ${result.score} dari 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLOR[result.level]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(result.score / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-extrabold leading-none">{result.score}</span>
        <span className="mt-0.5 text-[11px] text-ink-3">dari 100</span>
      </div>
    </div>
  );
}

export function RiskView({ result, subject = 'Gambar ini' }: { result: RiskResult; subject?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5 rounded-card border border-line bg-white p-5 shadow-card">
        <ScoreRing result={result} />
        <div>
          <Pill tone={result.level}>{LEVEL_LABEL[result.level]}</Pill>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {result.level === 'high' ? <>{subject} <strong className="text-ink">terindikasi berisiko</strong>. Sebaiknya tunda transfer dan cek ulang.</> : LEVEL_SUMMARY[result.level]}
          </p>
        </div>
      </div>
      <div className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
        {result.reasons.length ? (
          <>
            <h3 className="text-[14px] font-semibold text-ink-2">Tanda yang kami temukan</h3>
            <ul className="mt-1 divide-y divide-divider">
              {result.reasons.map((r) => {
                const Icon = ICON[r.category] ?? Hash;
                return (
                  <li key={r.ruleId} className="flex gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-divider text-ink-2"><Icon className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0"><p className="text-[15px] font-bold">{r.title}</p>{r.evidence && <p className="text-[13px] text-ink-2">{r.evidence}</p>}</div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="flex gap-2 text-[15px] text-ink-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-low" aria-hidden />{NO_RISK_MESSAGE}</p>
        )}
      </div>
      <p className="text-center text-[12.5px] text-ink-3">Hasil ini bantuan awal berdasarkan tanda-tanda umum, bukan keputusan akhir.</p>
    </div>
  );
}
