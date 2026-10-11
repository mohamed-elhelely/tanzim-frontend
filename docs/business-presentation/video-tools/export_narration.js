// Prints the deck's slides and narration as JSON: [{ n, id, en, ar, title_en, title_ar }].
// Usage: node export_narration.js <deck folder>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const ctx = { window: {} };
ctx.TANZIM_DECK = undefined;
vm.createContext(ctx);
const files = fs.readdirSync(path.join(dir, 'content')).filter((f) => f.endsWith('.js')).sort();
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(dir, 'content', f), 'utf8'), ctx, { filename: f });
  if (!ctx.TANZIM_DECK && ctx.window.TANZIM_DECK) ctx.TANZIM_DECK = ctx.window.TANZIM_DECK;
}
const D = ctx.window.TANZIM_DECK;
const out = D.slides.map((s, i) => ({
  n: i + 1,
  id: s.id,
  en: (D.narration[s.id] || {}).en || '',
  ar: (D.narration[s.id] || {}).ar || '',
  title_en: (s.title && s.title.en) || s.id,
  title_ar: (s.title && s.title.ar) || s.id,
}));
const missing = out.filter((s) => !s.en || !s.ar).map((s) => s.id);
if (missing.length) console.error('Slides without narration: ' + missing.join(', '));
process.stdout.write(JSON.stringify(out, null, 1));
