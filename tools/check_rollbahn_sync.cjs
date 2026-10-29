// リフィルメーカー（refill-maker/index.html の PRESETS）と N's CAD（nscad/data）で、ロルバーン L・M の用紙・穴の数値が食い違っていないかを調べる。
// 数値の正本は N's CAD の規格（nscad/data/binder/rollbahn-{l,m}.json）と部品（nscad/data/library.json の notebook-rollbahn-{l,m}）。リフィルメーカーはそれに合わせる。
// 使い方: node tools/check_rollbahn_sync.cjs [リポジトリのフォルダ]    食い違いがあれば exit 1（GitHub Actions: .github/workflows/check-rollbahn-sync.yml）
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('refill-maker/index.html'), lib = JSON.parse(read('nscad/data/library.json'));
const errors = [];
for (const [key, id, spec] of [['rollbahnL', 'notebook-rollbahn-l', 'rollbahn-l'], ['rollbahnM', 'notebook-rollbahn-m', 'rollbahn-m']]) {
  const line = html.split('\n').find(l => l.trim().startsWith(key + ':'));
  if (!line) { errors.push(`${key}: refill-maker/index.html に PRESETS の行がない`); continue; }
  const m = line.match(/w: ([\d.]+), h: ([\d.]+), d: ([\d.]+), edge: ([\d.]+), rect: \[([\d.]+), ([\d.]+)\], holes: uniformHoles\((\d+), ([\d.]+), ([\d.]+)\)/);
  if (!m) { errors.push(`${key}: PRESETS の行を読めない（w・h・d・edge・rect・uniformHoles の並びが変わった？）`); continue; }
  const [w, h, , edge, rw, rh, n, pitch, uh] = m.slice(1).map(Number);
  const s = JSON.parse(read(`nscad/data/binder/${spec}.json`)), part = lib.items.find(i => i.id === id), v = part && part.vars;
  if (!part) { errors.push(`${key}: nscad/data/library.json に ${id} がない`); continue; }
  const eq = (name, a, b) => { if (Math.abs(a - b) > 1e-9) errors.push(`${key}: ${name} がリフィルメーカー ${a} ・N's CAD ${b} で違う`); };
  eq('用紙の幅', w, s.refill.wMm); eq('用紙の高さ', h, s.refill.hMm); eq('穴の数', n, s.holes.count); eq('穴の間隔', pitch, s.holes.centerPitchMm); eq('等間隔の高さ（uniformHoles の第3引数）', uh, s.refill.hMm);
  eq('穴の中心（端から）', edge, v.E); eq('穴の幅（縁から内へ）', rw, v.Dw); eq('穴の高さ（縁に沿って）', rh, v.Dh);
  eq('部品の幅', v.W, s.refill.wMm); eq('部品の高さ', v.H, s.refill.hMm); eq('部品のリング間隔', v.P, s.holes.centerPitchMm);
}
if (errors.length) { console.error('ロルバーンの数値が食い違っています:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('ロルバーン L・M：リフィルメーカーと N\'s CAD（規格・部品）の数値は一致しています');
