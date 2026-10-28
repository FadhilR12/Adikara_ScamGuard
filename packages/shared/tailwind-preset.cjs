// Token desain ScamGuard (PRD 15.1–15.3) sebagai preset Tailwind bersama.
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F766E', hover: '#115E59', soft: '#F0FDFA', border: '#CCFBF1', strong: '#99F6E4' },
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        line: '#E2E8F0',
        divider: '#F1F5F9',
        inputline: '#CBD5E1',
        ink: { DEFAULT: '#0F172A', 2: '#475569', 3: '#64748B' },
        low: { DEFAULT: '#16A34A', text: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
        medium: { DEFAULT: '#F59E0B', text: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
        high: { DEFAULT: '#DC2626', text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { btn: '12px', card: '16px', dialog: '20px' },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.05)',
        dialog: '0 24px 48px rgba(15,23,42,.22)',
      },
    },
  },
};
