// 共有用の画像（1080×1350）を作る。写真は端末の外へ出さない。共有は OS の共有画面か、画像の保存。
const GOLD = '#c9a96e', INK = '#e9e7dc';
export async function makeShareImage(blob, name, date, label) {
  const bmp = await createImageBitmap(blob);
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#0d100d'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 640, 80, W / 2, 640, 700);
  glow.addColorStop(0, 'rgba(120,98,52,0.38)'); glow.addColorStop(1, 'rgba(13,16,13,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = GOLD; g.font = '600 26px system-ui, sans-serif'; g.fillText('SHRINE NOTE', W / 2, 96);
  g.fillStyle = INK; g.font = '600 52px "Yu Mincho","Hiragino Mincho ProN",serif'; g.fillText('日本列島の神社めぐり', W / 2, 168);
  // 写真（枠の中に収める）
  const bx = 90, by = 230, bw = W - 180, bh = 780;
  const k = Math.min(bw / bmp.width, bh / bmp.height), w = bmp.width * k, h = bmp.height * k;
  const x = bx + (bw - w) / 2, y = by + (bh - h) / 2;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 14; g.fillStyle = '#000'; g.fillRect(x, y, w, h); g.restore();
  g.drawImage(bmp, x, y, w, h);
  g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(x - 6, y - 6, w + 12, h + 12);
  g.fillStyle = INK; g.font = '600 56px "Yu Mincho","Hiragino Mincho ProN",serif'; g.fillText(name, W / 2, 1110);
  g.fillStyle = '#e8765a'; g.font = '30px "Yu Mincho","Hiragino Mincho ProN",serif'; g.fillText(date.replace(/-/g, '.') + ' 参拝', W / 2, 1166);
  g.fillStyle = '#8b8c7c'; g.font = '24px system-ui, sans-serif'; g.fillText(label, W / 2, 1290);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.92));
}
// 共有画面を開く。使えない端末では、画像として保存する。戻り値：'shared' | 'saved' | 'cancel'
export async function shareOrSave(blob, name) {
  const file = new File([blob], '御朱印_' + name + '.jpg', { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name + '｜日本列島の神社めぐり' }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
