// Kelas Tailwind bersama (bukan modul 'use client', agar bisa dipakai server component).
export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:opacity-60',
  secondary: 'border-[1.5px] border-inputline bg-white text-ink hover:bg-bg disabled:opacity-60',
  ghost: 'text-primary hover:bg-primary-soft',
  danger: 'border-[1.5px] border-high-border bg-white text-high-text hover:bg-high-bg',
};

export const buttonClass = (variant: Variant = 'primary', extra = '') =>
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-btn px-5 py-2.5 text-[15px] font-bold transition ${VARIANT[variant]} ${extra}`;


export const inputClass = (warn?: boolean) =>
  `h-12 w-full rounded-btn border bg-white px-3.5 text-[15px] text-ink placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 ${
    warn ? 'border-medium focus:ring-medium-border' : 'border-inputline focus:border-primary focus:ring-primary-strong'
  }`;

