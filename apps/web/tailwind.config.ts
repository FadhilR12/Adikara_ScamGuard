import type { Config } from 'tailwindcss';
import preset from '@scamguard/shared/tailwind-preset';

export default {
  presets: [preset as Config],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.ts'],
} satisfies Config;
