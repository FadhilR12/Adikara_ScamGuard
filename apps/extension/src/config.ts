export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
export const WEB_APP_URL: string = import.meta.env.VITE_WEB_APP_URL ?? 'http://localhost:3000';
export const EXT_VERSION = chrome.runtime.getManifest().version;

/** Ambang overlay "Tahan Dulu" (AC-04.1). Ubah di sini saat tuning. */
export const OVERLAY_SCORE = 70;
export const OVERLAY_SCORE_WITH_PAYMENT = 55;
/** Durasi jeda tombol "Tetap lanjut" dalam detik (AC-04.4, PRD Q2). */
export const COOLDOWN_SECONDS = 10;
export const ALLOW_HOURS = 24;
export const HISTORY_LIMIT = 20;
export const RULES_REFRESH_MINUTES = 6 * 60;
