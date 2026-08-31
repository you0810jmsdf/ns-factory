// 2D間取りエディタ
// 壁・窓・ドアをキャンバス上で作図する。座標系は実寸(m)、画面上方向=北
const GRID = 0.25;        // スナップ間隔(m)
const SNAP_END = 0.3;     // 端点スナップ距離(m)

export class FloorplanEditor {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} state  共有状態（walls配列を持つ）
   * @param {function} onChange  変更時コールバック
   * @param {function} onStatus  ステータス表示コールバック
   */
  constructor(canvas, state, onChange, onStatus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.onChange = onChange;
    this.onStatus = onStatus;

    this.tool = 'select';
    this.ppm = 50;                  // pixels per meter
    this.origin = { x: 0, y: 0 };   // 画面中央に表示する実寸座標
    this.drawing = null;            // 壁作図中の始点 {x,y}
    this.cursor = null;             // スナップ済みカーソル位置
    this.selected = null;           // {type:'wall'|'opening', wall:i, index:j}
    this.dragging = null;
    this.panning = null;

    canvas.addEventListener('pointerdown', e => this.onDown(e));
    canvas.addEventListener('pointermove', e => this.onMove(e));
    canvas.addEventListener('pointerup', e => this.onUp(e));
    canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); this.cancelDrawing(); });

    this.resize();
    // レイアウト確定前の0x0対策としてResizeObserverで親要素を監視する
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (this.canvas.width === r.width && this.canvas.height === r.height) return;
    this.canvas.width = r.width;
    this.canvas.height = r.height;
    this.draw();
  }

  setTool(t) {
    this.tool = t;
    this.cancelDrawing();
    this.selected = null;
    const hints = {
      select: '選択: 壁や開口部をクリック。開口部はドラッグで移動可',
      wall: '壁: クリックで始点→クリックで確定（連続作図、右クリック/Escで終了）',
      window: '窓: 壁の上をクリックして配置',
      door: 'ドア: 壁の上をクリックして配置',
      delete: '削除: 壁・開口部をクリックで削除'
    };
    this.onStatus(hints[t] || '');
    this.draw();
  }

  // ===== 座標変換 =====
  toScreen(p) {
    return {
      x: this.canvas.width / 2 + (p.x - this.origin.x) * this.ppm,
      y: this.canvas.height / 2 + (p.y - this.origin.y) * this.ppm
    };
  }
  toWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.ppm + this.origin.x,
      y: (sy - this.canvas.height / 2) / this.ppm + this.origin.y
    };
  }
  evWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return this.toWorld(e.clientX - r.left, e.clientY - r.top);
  }

  /** グリッド・既存端点へスナップ */
  snap(p) {
    for (const w of this.state.walls) {
      for (const q of [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]) {
        if (Math.hypot(p.x - q.x, p.y - q.y) < SNAP_END) return { ...q };
      }
    }
    return { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID };
  }

  // ===== ヒットテスト =====
  wallAt(p) {
    let best = -1, bestD = 0.25;
    this.state.walls.forEach((w, i) => {
      const d = this.distToSegment(p, w);
      if (d < Math.max(w.thickness / 2 + 0.08, bestD) && d < bestD + w.thickness / 2) {
        if (d < bestD || best === -1) { best = i; bestD = d; }
      }
    });
    return best;
  }
  distToSegment(p, w) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - w.x1, p.y - w.y1);
    let t = ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (w.x1 + t * dx), p.y - (w.y1 + t * dy));
  }
  /** 壁始点からの距離(m)を返す */
  offsetOnWall(p, w) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy);
    const t = ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / (len * len);
    return Math.max(0, Math.min(1, t)) * len;
  }
  openingAt(p) {
    for (let i = 0; i < this.state.walls.length; i++) {
      const w = this.state.walls[i];
      if (this.distToSegment(p, w) > w.thickness / 2 + 0.15) continue;
      const off = this.offsetOnWall(p, w);
      for (let j = 0; j < w.openings.length; j++) {
        const o = w.openings[j];
        if (off >= o.offset - o.width / 2 - 0.1 && off <= o.offset + o.width / 2 + 0.1)
          return { wall: i, index: j };
      }
    }
    return null;
  }

  // ===== イベント =====
  onDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.panning = { x: e.clientX, y: e.clientY, ox: this.origin.x, oy: this.origin.y };
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const p = this.evWorld(e);

    if (this.tool === 'wall') {
      const sp = this.snap(p);
      if (!this.drawing) {
        this.drawing = sp;
      } else {
        if (Math.hypot(sp.x - this.drawing.x, sp.y - this.drawing.y) > 0.1) {
          this.state.walls.push({
            x1: this.drawing.x, y1: this.drawing.y, x2: sp.x, y2: sp.y,
            height: this.state.defaults.wallHeight,
            thickness: this.state.defaults.wallThickness,
            openings: []
          });
          this.drawing = sp; // 連続作図
          this.onChange();
        }
      }
      this.draw();
      return;
    }

    if (this.tool === 'window' || this.tool === 'door') {
      const wi = this.wallAt(p);
      if (wi >= 0) {
        const w = this.state.walls[wi];
        const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        const isDoor = this.tool === 'door';
        const width = isDoor ? 0.8 : 1.2;
        if (len < width + 0.2) { this.onStatus('壁が短すぎて配置できません'); return; }
        let off = Math.round(this.offsetOnWall(p, w) / 0.05) * 0.05;
        off = Math.max(width / 2 + 0.05, Math.min(len - width / 2 - 0.05, off));
        w.openings.push(isDoor
          ? { type: 'door', offset: off, width, height: 2.0, sill: 0 }
          : { type: 'window', offset: off, width, height: 1.1, sill: 0.9 });
        this.selected = { type: 'opening', wall: wi, index: w.openings.length - 1 };
        this.onChange();
        this.draw();
      }
      return;
    }

    if (this.tool === 'delete') {
      const op = this.openingAt(p);
      if (op) {
        this.state.walls[op.wall].openings.splice(op.index, 1);
        this.onChange(); this.draw(); return;
      }
      const wi = this.wallAt(p);
      if (wi >= 0) {
        this.state.walls.splice(wi, 1);
        this.onChange(); this.draw();
      }
      return;
    }

    // select
    const op = this.openingAt(p);
    if (op) {
      this.selected = { type: 'opening', ...op };
      this.dragging = op;
    } else {
      const wi = this.wallAt(p);
      this.selected = wi >= 0 ? { type: 'wall', wall: wi } : null;
    }
    this.onChange();
    this.draw();
  }

  onMove(e) {
    if (this.panning) {
      this.origin.x = this.panning.ox - (e.clientX - this.panning.x) / this.ppm;
      this.origin.y = this.panning.oy - (e.clientY - this.panning.y) / this.ppm;
      this.draw();
      return;
    }
    const p = this.evWorld(e);
    this.cursor = this.snap(p);

    if (this.dragging) {
      const w = this.state.walls[this.dragging.wall];
      const o = w.openings[this.dragging.index];
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      let off = Math.round(this.offsetOnWall(p, w) / 0.05) * 0.05;
      o.offset = Math.max(o.width / 2 + 0.05, Math.min(len - o.width / 2 - 0.05, off));
      this.onChange();
    }
    this.draw();
  }

  onUp(e) {
    this.panning = null;
    this.dragging = null;
  }

  onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.ppm = Math.max(8, Math.min(300, this.ppm * factor));
    this.draw();
  }

  cancelDrawing() {
    this.drawing = null;
    this.draw();
  }

  deleteSelected() {
    if (!this.selected) return;
    if (this.selected.type === 'opening')
      this.state.walls[this.selected.wall].openings.splice(this.selected.index, 1);
    else
      this.state.walls.splice(this.selected.wall, 1);
    this.selected = null;
    this.onChange();
    this.draw();
  }

  getSelectedOpening() {
    if (this.selected?.type !== 'opening') return null;
    return this.state.walls[this.selected.wall]?.openings[this.selected.index] ?? null;
  }

  // ===== 描画 =====
  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawGrid();

    // 下階のゴースト表示（薄いグレー）
    const ghost = this.state.ghostWalls;
    if (ghost) for (const w of ghost) this.drawWall(w, '#ccd6e0');

    // 壁
    this.state.walls.forEach((w, i) => {
      const sel = this.selected?.type === 'wall' && this.selected.wall === i;
      this.drawWall(w, sel ? '#e8a020' : '#3a4654');
      w.openings.forEach((o, j) => {
        const osel = this.selected?.type === 'opening'
          && this.selected.wall === i && this.selected.index === j;
        this.drawOpening(w, o, osel);
      });
      this.drawDimension(w);
    });

    // 作図プレビュー
    if (this.drawing && this.cursor) {
      const a = this.toScreen(this.drawing), b = this.toScreen(this.cursor);
      ctx.strokeStyle = '#e8a020';
      ctx.lineWidth = this.state.defaults.wallThickness * this.ppm;
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const len = Math.hypot(this.cursor.x - this.drawing.x, this.cursor.y - this.drawing.y);
      ctx.fillStyle = '#d08800';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(len.toFixed(2) + ' m', (a.x + b.x) / 2 + 8, (a.y + b.y) / 2 - 8);
    }

    // カーソルスナップ点
    if (this.cursor && (this.tool === 'wall')) {
      const s = this.toScreen(this.cursor);
      ctx.strokeStyle = '#e8a020';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.stroke();
    }

    // 方位マーク（北=上）
    ctx.fillStyle = '#1a4f8b';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('N ↑', 14, 24);
  }

  drawGrid() {
    const { ctx, canvas } = this;
    const tl = this.toWorld(0, 0), br = this.toWorld(canvas.width, canvas.height);
    const step = this.ppm > 25 ? 0.5 : 1;
    ctx.lineWidth = 1;
    for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
      const s = this.toScreen({ x, y: 0 });
      ctx.strokeStyle = Math.abs(x % 1) < 1e-6 ? '#dde4ec' : '#eef2f7';
      ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, canvas.height); ctx.stroke();
    }
    for (let y = Math.floor(tl.y / step) * step; y <= br.y; y += step) {
      const s = this.toScreen({ x: 0, y });
      ctx.strokeStyle = Math.abs(y % 1) < 1e-6 ? '#dde4ec' : '#eef2f7';
      ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(canvas.width, s.y); ctx.stroke();
    }
  }

  drawWall(w, color) {
    const { ctx } = this;
    const a = this.toScreen({ x: w.x1, y: w.y1 }), b = this.toScreen({ x: w.x2, y: w.y2 });
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, w.thickness * this.ppm);
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  drawOpening(w, o, selected) {
    const { ctx } = this;
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    const ux = (w.x2 - w.x1) / len, uy = (w.y2 - w.y1) / len;
    const cx = w.x1 + ux * o.offset, cy = w.y1 + uy * o.offset;
    const a = this.toScreen({ x: cx - ux * o.width / 2, y: cy - uy * o.width / 2 });
    const b = this.toScreen({ x: cx + ux * o.width / 2, y: cy + uy * o.width / 2 });

    // 壁を白で抜く
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, w.thickness * this.ppm) + 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

    const color = selected ? '#e8a020' : (o.type === 'window' ? '#2196c4' : '#2e7d32');
    if (o.type === 'window') {
      // 窓: 二重線
      const nx = -uy, ny = ux, off = Math.max(2, w.thickness * this.ppm * 0.25);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(a.x + nx * off * s, a.y + ny * off * s);
        ctx.lineTo(b.x + nx * off * s, b.y + ny * off * s);
        ctx.stroke();
      }
    } else {
      // ドア: 開き軌跡の円弧
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const r = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(a.x, a.y, r, ang - Math.PI / 2, ang); ctx.stroke();
    }
  }

  drawDimension(w) {
    const { ctx } = this;
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (len < 0.5 || this.ppm < 20) return;
    const a = this.toScreen({ x: w.x1, y: w.y1 }), b = this.toScreen({ x: w.x2, y: w.y2 });
    const nx = -(b.y - a.y), ny = b.x - a.x;
    const nl = Math.hypot(nx, ny) || 1;
    ctx.fillStyle = '#8895a5';
    ctx.font = '11px sans-serif';
    ctx.fillText(len.toFixed(2),
      (a.x + b.x) / 2 + nx / nl * 14 - 12,
      (a.y + b.y) / 2 + ny / nl * 14 + 4);
  }
}
