// rem → px: overlay dirender di Shadow DOM halaman lain, sehingga rem mengikuti font-size
// <html> milik halaman itu. Pakai px agar ukuran overlay & popup selalu konsisten.
const remToPx = () => ({
  postcssPlugin: 'rem-to-px',
  Declaration(decl) {
    if (decl.value.includes('rem')) {
      decl.value = decl.value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${parseFloat(n) * 16}px`);
    }
  },
});
remToPx.postcss = true;

module.exports = { plugins: [require('tailwindcss'), remToPx(), require('autoprefixer')] };
