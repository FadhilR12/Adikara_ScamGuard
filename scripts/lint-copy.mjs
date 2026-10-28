// Lint kata terlarang di teks UI (PRD 15.4, KNF-05). Dijalankan: pnpm lint:copy
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['apps/extension/src', 'apps/web/app', 'apps/web/components', 'apps/web/lib', 'apps/api/src', 'packages/shared/src', 'packages/risk-engine/src'];
const EXT = new Set(['.ts', '.tsx', '.html', '.json']);

// Huruf kapital BAHAYA/AWAS dicek peka huruf besar agar "waspada" tidak ikut tertangkap.
const RULES = [
  [/\bpenipu\b/i, 'penipu'],
  [/\bscammer\b/i, 'scammer'],
  [/\bpasti penipuan\b/i, 'pasti penipuan'],
  [/\bbodoh\b/i, 'bodoh'],
  [/\bceroboh\b/i, 'ceroboh'],
  [/\bBAHAYA\b/, 'BAHAYA'],
  [/\bAWAS\b/, 'AWAS'],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.next') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.has(extname(p))) yield p;
  }
}

let problems = 0;
for (const d of DIRS) {
  for (const file of walk(join(ROOT, d))) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const [re, word] of RULES) {
        if (re.test(line)) {
          problems++;
          console.log(`${relative(ROOT, file)}:${i + 1}  kata terlarang "${word}": ${line.trim().slice(0, 100)}`);
        }
      }
    });
  }
}
if (problems) {
  console.error(`\n${problems} pelanggaran pedoman bahasa (PRD 15.4).`);
  process.exit(1);
}
console.log('lint:copy — tidak ada kata terlarang.');
