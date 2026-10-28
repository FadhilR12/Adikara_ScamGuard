// Tipe bersama ScamGuard (PRD Bagian 9.1, 12, 13).

export type InputType = 'url' | 'text' | 'number' | 'page';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskCategory =
  | 'profit'
  | 'urgency'
  | 'credential'
  | 'url'
  | 'payment'
  | 'impersonation'
  | 'number';

export interface PageInput {
  url: string;
  /** URL asal sebelum redirect (mis. tautan pendek). */
  sourceUrl?: string;
  title: string;
  text: string;
  hasPaymentForm: boolean;
  hasCountdown?: boolean;
}

export interface RiskInput {
  type: InputType;
  value?: string;
  page?: PageInput;
}

export interface RiskReason {
  ruleId: string;
  category: RiskCategory;
  title: string;
  evidence?: string;
  weight: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  reasons: RiskReason[];
  rulesVersion: string;
  analyzedAt: string;
  offline: boolean;
}

export interface TextRule {
  id: string;
  category: RiskCategory;
  /** Daftar pola regex (string, tanpa flag). Aturan terpicu bila salah satu cocok. */
  patterns: string[];
  /** Pola yang dihapus dulu dari teks sebelum dicocokkan (mis. kalimat negasi "jangan bagikan OTP"). */
  strip?: string[];
  weight: number;
  title: string;
}

export interface RuleSet {
  version: string;
  schemaVersion: number;
  fromServer?: boolean;
  text: TextRule[];
  /** Bobot & judul aturan berbasis kode (URL_*, PG_*, NUM_*). */
  weights: Record<string, { weight: number; title: string; category: RiskCategory }>;
  brands: string[];
  brandDomains: string[];
  allowlist: string[];
  shorteners: string[];
  riskyTlds: string[];
  lowRiskTlds: string[];
  moneyWords: string[];
  /** Hash SHA-256 entitas yang dilaporkan → jumlah laporan. Diisi dari server. */
  reported?: Record<string, number>;
}

export interface RiskHistoryItem {
  value: string;
  type: InputType;
  score: number;
  level: RiskLevel;
  at: string;
}

export type IncidentStatus = 'draft' | 'in_progress' | 'pack_generated' | 'reported' | 'closed';
export type EvidenceCategory = 'transfer' | 'chat' | 'profile' | 'other';

export interface OcrFields {
  amount?: number;
  date?: string;
  time?: string;
  account?: string;
  name?: string;
  bank?: string;
  ref?: string;
}

export interface Evidence {
  id: string;
  incidentId: string;
  category: EvidenceCategory;
  fileName: string;
  mime: string;
  size: number;
  sha256: string;
  ocrText?: string | null;
  ocrFields?: OcrFields | null;
  createdAt: string;
  url: string;
}

export interface Checklist {
  stopTransfer?: boolean;
  noOtp?: boolean;
  changePin?: boolean;
  contactedBank?: boolean;
  downloadedPack?: boolean;
  openedIasc?: boolean;
}

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
}

export interface Incident {
  id: string;
  code: string;
  status: IncidentStatus;
  currentStep: number;
  checklist: Checklist;
  source?: string | null;
  relatedDomain?: string | null;
  scamType?: string | null;
  contactChannel?: string | null;
  transferAt?: string | null;
  amount?: number | null;
  recipientBank?: string | null;
  recipientAccount?: string | null;
  recipientName?: string | null;
  relatedAccounts?: string[];
  chronology?: string | null;
  bankTicket?: string | null;
  iascReportNo?: string | null;
  packGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  evidence?: Evidence[];
  completeness?: { items: CompletenessItem[]; done: number; total: number };
}

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: 'Risiko rendah',
  medium: 'Risiko sedang',
  high: 'Risiko tinggi',
};

export const LEVEL_SUMMARY: Record<RiskLevel, string> = {
  low: 'Tidak ditemukan tanda risiko yang kuat. Tetap waspada.',
  medium: 'Ada beberapa tanda yang perlu dicek ulang sebelum transfer.',
  high: 'Terindikasi berisiko. Sebaiknya tunda transfer dan cek ulang.',
};

export const NO_RISK_MESSAGE =
  'Tidak ditemukan tanda risiko. Tetap waspada dan jangan bagikan OTP/PIN.';

export const BANKS = [
  'BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'BTN', 'CIMB Niaga', 'Permata', 'Danamon', 'OCBC',
  'Bank Jago', 'SeaBank', 'DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja', 'Lainnya',
];
export * from './demo';
export * from './incident';
