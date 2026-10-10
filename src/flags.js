/*
 * Definisi bendera. Kanvas bendera = 1000 x 500 satuan (rasio 2:1).
 * Setiap bendera = daftar "shape" (poligon tertutup + warna) yang digambar
 * berurutan oleh titik penelusur. Shape dikelompokkan ke "group";
 * setiap group = satu not musik (kontur group = bentuk gelombangnya).
 */
(function (g) {
  const FS = g.FS || (g.FS = {});
  const G = FS.geo;
  const { rect, circle, star, path1, spline, strokePoly, xf, clipBox, clipConvex, crescent, leaf, rad } = G;

  class FlagBuilder {
    constructor(def) { Object.assign(this, def); this.shapes = []; this.groups = []; }
    group(midi, gain = 1) { this.groups.push({ midi, gain }); return this; }
    add(pts, color, o = {}) {
      if (!pts || pts.length < 3) return this;
      this.shapes.push(Object.assign({ pts, color, g: this.groups.length - 1 }, o));
      return this;
    }
  }

  const WHITE = '#ffffff', BLACK = '#0a0a0a';
  const CROWN = [[-45, 15], [-50, -20], [-28, -3], [-14, -28], [0, -6], [14, -28], [28, -3], [50, -20], [45, 15]];

  /* ---------------------------------------------------------------- SOVIET */
  function soviet() {
    const RED = '#da1100', GOLD = '#ffd400';
    const f = new FlagBuilder({
      id: 'soviet', name: 'SOVIET UNION', sub: '1955-1991', dur: 4.2, hold: 0.5,
      scale: [50, 53, 57, 60, 62, 65, 69]
    });
    f.group(50).add(rect(0, 0, 1000, 500), RED, { w: 150 });
    f.group(57).add(star(150, 72, 58, 23, 5, -90), GOLD);

    // palu & arit
    const P = { x: 152, y: 252, s: 1.8 };
    const hammerHandle = strokePoly([[-34, 50], [26, -30]], 9);
    const hammerHead = xf([[-24, -10], [24, -10], [24, 10], [-24, 10]], { r: 39.5, x: 30, y: -34 });
    f.group(53, 0.9)
      .add(xf(hammerHandle, P), GOLD)
      .add(xf(hammerHead, P), GOLD);
    const blade = crescent([0, 14], 54, [18, -6], 45);
    const sickleHandle = strokePoly([[-30, 58], [-46, 74]], 10);
    f.group(62, 0.9)
      .add(xf(blade, P), GOLD)
      .add(xf(sickleHandle, P), GOLD);
    return f;
  }

  /* --------------------------------------------------------------- OTTOMAN */
  function ottoman() {
    const RED = '#f0190f';
    const f = new FlagBuilder({
      id: 'ottoman', name: 'OTTOMAN EMPIRE', sub: '1844-1922', dur: 5.0, hold: 0.5,
      scale: [52, 54, 56, 57, 59, 60, 64]
    });
    f.group(52).add(rect(0, 0, 1000, 500), RED, { w: 150 });
    f.group(56).add(crescent([390, 250], 150, [440, 250], 122), WHITE);
    f.group(60).add(star(604, 250, 62, 27, 8, -90), WHITE);
    return f;
  }

  /* -------------------------------------------------------- AUSTRIA-HUNGARY */
  function austria() {
    const RED = '#e8360c', GREEN = '#0c8a45', GOLD = '#f2b705', DGOLD = '#c98a00', SH_R = '#d8281c';
    const f = new FlagBuilder({
      id: 'austria', name: 'AUSTRIA-HUNGARY', sub: 'MERCHANT ENSIGN \u00B7 1869-1918', dur: 6.0, hold: 0.5,
      scale: [48, 52, 55, 57, 60, 64, 67, 72]
    });
    f.group(48)
      .add(rect(0, 0, 1000, 170), RED, { w: 70 })
      .add(rect(0, 170, 1000, 165), WHITE, { w: 70 })
      .add(rect(0, 335, 500, 165), RED, { w: 55 })
      .add(rect(500, 335, 500, 165), GREEN, { w: 55 });

    const shield = path1('M -60 -75 L 60 -75 L 60 5 C 60 45 25 65 0 78 C -25 65 -60 45 -60 5 Z', 10);
    const placeShield = (cx, cy) => xf(shield, { x: cx, y: cy, s: SC });
    const SC = 1.32, cy = 262;
    const border = cx => xf(shield, { x: cx, y: cy, s: SC * 1.1 });

    // perisai Austria (kiri): merah-putih-merah ; Hungaria (kanan): garis, bukit hijau, salib ganda
    const ax = 240, hx = 760;
    const as = placeShield(ax, cy), hs = placeShield(hx, cy);
    const Y = v => cy + v * SC, X = (c, v) => c + v * SC;
    f.group(52)
      .add(border(ax), GOLD)
      .add(clipBox(as, ax - 200, Y(-80), ax + 200, Y(-24)), SH_R)
      .add(clipBox(as, ax - 200, Y(-24), ax + 200, Y(27)), WHITE)
      .add(clipBox(as, ax - 200, Y(27), ax + 200, Y(90)), SH_R);

    f.group(60).add(border(hx), GOLD);
    for (let k = 0; k < 8; k++) {
      f.add(clipBox(hs, X(hx, -60 + 15 * k), Y(-80), X(hx, -60 + 15 * (k + 1)), Y(-5)), k % 2 ? WHITE : SH_R);
    }
    f.add(clipBox(hs, hx - 200, Y(-5), hx + 200, Y(90)), SH_R);
    const hills = path1('M -64 44 C -45 22 -32 26 -20 40 C -10 8 10 8 20 40 C 32 26 45 22 64 44 L 64 90 L -64 90 Z', 8);
    f.add(clipConvex(xf(hills, { x: hx, y: cy, s: SC }), hs), GREEN);
    const H2 = { x: hx, y: cy, s: SC };
    f.add(xf([[-4, -2], [4, -2], [4, 46], [-4, 46]], H2), WHITE);
    f.add(xf([[-15, 8], [15, 8], [15, 15], [-15, 15]], H2), WHITE);
    f.add(xf([[-10, 20], [10, 20], [10, 27], [-10, 27]], H2), WHITE);

    // mahkota Austria (topi merah) & mahkota St. Stephen (lengkung + salib)
    const cA = { x: ax, y: 142, s: 1.2 }, cH = { x: hx, y: 142, s: 1.2 };
    f.group(64)
      .add(xf(path1('M -32 -2 Q 0 -54 32 -2 Z', 10), cA), SH_R)
      .add(xf(CROWN, cA), GOLD)
      .add(xf([[-45, 8], [45, 8], [45, 22], [-45, 22]], cA), DGOLD);
    f.group(67)
      .add(xf(strokePoly(spline([[-42, -4], [-30, -36], [0, -48], [30, -36], [42, -4]], 8), 6), cH), GOLD)
      .add(xf(CROWN, cH), GOLD)
      .add(xf([[-45, 8], [45, 8], [45, 22], [-45, 22]], cH), DGOLD)
      .add(xf([[-2.6, -70], [2.6, -70], [2.6, -46], [-2.6, -46]], cH), GOLD)
      .add(xf([[-10, -63], [10, -63], [10, -58], [-10, -58]], cH), GOLD);
    f.group(72, 0.8);
    for (const c of [cA, cH]) {
      for (const [jx, jy] of [[-50, -24], [-14, -32], [14, -32], [50, -24]]) {
        f.add(xf(circle(jx, jy, 4.6, 10), c), '#d81e1e');
      }
    }
    return f;
  }

  /* --------------------------------------------------------------- PRUSSIA */
  function eagle(f, cx, cy, s) {
    const GOLD = '#d9a21b', RIM = '#cfcfcf';
    const T = (pts, o = {}) => xf(pts, Object.assign({ x: cx, y: cy, s }, o));
    const mir = pts => xf(pts, { fx: true });
    const feathers = (flip) => {
      const rows = [
        { px: -16, py: -28, n: 9, a0: 254, a1: 170, len: 112, wid: 25 },
        { px: -12, py: -18, n: 8, a0: 238, a1: 166, len: 82, wid: 23 },
        { px: -10, py: -7, n: 7, a0: 224, a1: 158, len: 55, wid: 21 }
      ];
      for (const r of rows) {
        for (let i = 0; i < r.n; i++) {
          const t = i / (r.n - 1), a = r.a0 + (r.a1 - r.a0) * t;
          const len = r.len * (0.84 + 0.16 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.12)));
          let pts = leaf(r.px, r.py, a, len, r.wid);
          if (flip) pts = mir(pts);
          f.add(T(pts), BLACK, { stroke: RIM, lw: 0.9 });
        }
      }
    };

    // badan: ekor, torso, kepala
    f.group(55);
    for (const a of [62, 77, 90, 103, 118]) f.add(T(leaf(0, 44, a, 66, 19)), BLACK, { stroke: RIM, lw: 0.9 });
    f.add(T(path1('M -22 -48 C -38 -22 -34 28 -12 56 L 0 72 L 12 56 C 34 28 38 -22 22 -48 C 12 -58 -12 -58 -22 -48 Z', 10)), BLACK);
    f.add(T(circle(-24, -64, 14, 26)), BLACK);

    f.group(62, 0.9); feathers(false);   // sayap kiri
    f.group(67, 0.9); feathers(true);    // sayap kanan

    // detail emas
    f.group(74, 0.8);
    f.add(T(path1('M -34 -69 L -58 -62 C -54 -55 -46 -51 -37 -52 Z', 8)), GOLD);
    f.add(T(circle(-29, -68, 3.4, 12)), WHITE);
    f.add(T(xf(CROWN, { x: -24, y: -88, s: 0.3 })), GOLD);
    f.add(T(circle(0, 4, 15, 24)), GOLD);
    f.add(T(circle(0, 4, 10.5, 24)), BLACK);
    for (const sgn of [-1, 1]) {
      f.add(T(strokePoly([[sgn * 12, 52], [sgn * 25, 76]], 9)), GOLD);
      for (const da of [-26, 0, 26]) f.add(T(leaf(sgn * 25, 76, (sgn < 0 ? 100 : 80) + da * sgn, 15, 6)), GOLD);
    }
    f.add(T(strokePoly([[36, 90], [31, 8]], 5)), GOLD);
    f.add(T(circle(31, 2, 8, 14)), GOLD);
    f.add(T(strokePoly([[-36, 92], [-31, 16]], u => 7 * (1 - u * 0.8) + 1)), GOLD);
  }

  function prussia() {
    const f = new FlagBuilder({
      id: 'prussia', name: 'PRUSSIA', sub: 'STATE FLAG \u00B7 1892-1918', dur: 7.0, hold: 0.55,
      scale: [55, 58, 62, 65, 67, 70, 74]
    });
    f.group(43).add(rect(0, 0, 1000, 500), WHITE, { w: 80 });
    f.group(50).add(rect(0, 420, 1000, 80), BLACK, { w: 60 });
    eagle(f, 335, 222, 1.78);
    return f;
  }

  /* ------------------------------------------------------------- QING CHINA */
  function qing() {
    const YEL = '#ffc619', BLUE = '#17488f', LBLUE = '#3d7bc9', RED = '#e0301e', ORG = '#f08a1c', CREAM = '#f3ead0', GOLD = '#f2b21a';
    const f = new FlagBuilder({
      id: 'qing', name: 'QING CHINA', sub: '1889-1912', dur: 8.05, hold: 0.6,
      scale: [50, 52, 54, 57, 59, 62, 66, 69, 74]
    });
    f.group(50).add(rect(0, 0, 1000, 500), YEL, { w: 130 });
    f.group(57).add(circle(96, 92, 42, 40), '#e8231a');
    const dragonStart = f.shapes.length;

    const body = spline([[360, 270], [420, 312], [500, 336], [575, 306], [632, 246], [700, 214], [768, 238], [826, 292], [905, 322]], 14);
    const bw = u => 76 * Math.pow(1 - u, 0.6) + 6;
    const nrm = (i) => {
      const a = body[Math.max(0, i - 1)], b = body[Math.min(body.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      return { nx: -dy / d, ny: dx / d, tx: dx / d, ty: dy / d };
    };
    const at = u => Math.min(body.length - 1, Math.round(u * (body.length - 1)));

    f.group(62).add(strokePoly(body, bw), BLUE);

    // sisik
    f.group(66, 0.8);
    for (let k = 1; k <= 22; k++) {
      const u = k / 24, i = at(u), p = body[i], n = nrm(i), w = bw(u);
      for (const sgn of [-0.2, 0.2]) {
        f.add(circle(p[0] + n.nx * w * sgn, p[1] + n.ny * w * sgn, Math.max(2.2, w * 0.17), 9), LBLUE);
      }
    }
    // duri punggung
    f.group(69, 0.8);
    for (let k = 0; k < 18; k++) {
      const u = 0.03 + k * 0.052, i = at(u), p = body[i], n = nrm(i), w = bw(u);
      const sx = -n.nx, sy = -n.ny; // sisi atas
      const bx = p[0] + sx * w / 2, by = p[1] + sy * w / 2, h = 12 + 16 * (1 - u);
      f.add([[bx - n.tx * 6, by - n.ty * 6], [bx + n.tx * 6, by + n.ty * 6], [bx + sx * h + n.tx * 4, by + sy * h + n.ty * 4]], k % 2 ? ORG : RED);
    }
    // kaki + cakar
    f.group(57, 0.9);
    const legs = [
      { u: 0.1, d: [[-16, 34], [-46, 62]] }, { u: 0.2, d: [[-8, -40], [-40, -64]] },
      { u: 0.5, d: [[14, 36], [-6, 66]] },  { u: 0.64, d: [[16, -36], [42, -62]] }
    ];
    for (const L of legs) {
      const p = body[at(L.u)], pts = [p, [p[0] + L.d[0][0], p[1] + L.d[0][1]], [p[0] + L.d[1][0], p[1] + L.d[1][1]]];
      f.add(strokePoly(spline(pts, 8), u => 17 - 8 * u), BLUE);
      const paw = pts[2], ang = Math.atan2(L.d[1][1] - L.d[0][1], L.d[1][0] - L.d[0][0]) * 180 / Math.PI;
      for (const da of [-38, -13, 13, 38]) f.add(leaf(paw[0], paw[1], ang + da, 17, 5.5), CREAM);
    }
    // api / surai
    f.group(54, 0.9);
    for (let k = 0; k < 8; k++) {
      const a = -75 + k * 20 + (k > 3 ? 18 : 0), len = 58 + (k % 3) * 14;
      f.add(leaf(352, 250, a, len, 17), k % 2 ? ORG : RED);
    }
    // kepala
    const H = { x: 330, y: 262, s: 1.18 };
    f.group(59)
      .add(xf(path1('M 20 -22 C 5 -34 -25 -36 -50 -26 C -62 -22 -70 -15 -74 -8 L -62 -2 L -76 4 L -58 12 C -45 24 -20 30 5 26 C 15 24 22 14 24 4 C 26 -8 24 -16 20 -22 Z', 8), H), BLUE)
      .add(xf(path1('M -70 6 L -40 14 L 4 24 C -10 38 -40 34 -62 20 Z', 8), H), '#123b78')
      .add(xf(circle(-22, -14, 6.5, 14), H), WHITE)
      .add(xf(circle(-21, -14, 2.8, 10), H), BLACK);
    for (let k = 0; k < 4; k++) f.add(xf([[-64 + k * 11, 6 + k * 2], [-58 + k * 11, 6 + k * 2], [-61 + k * 11, 15 + k * 2]], H), WHITE);
    // tanduk & kumis
    f.group(74, 0.8);
    f.add(xf(strokePoly(spline([[6, -26], [22, -50], [48, -62], [72, -56]], 8), u => 10 * (1 - u) + 1), H), CREAM);
    f.add(xf(strokePoly(spline([[-8, -30], [4, -58], [26, -76], [50, -76]], 8), u => 8 * (1 - u) + 1), H), CREAM);
    f.add(xf(strokePoly(spline([[-70, -4], [-100, -20], [-132, -12], [-152, -36]], 8), u => 5 * (1 - u) + 0.9), H), GOLD);
    f.add(xf(strokePoly(spline([[-66, 12], [-96, 26], [-124, 22], [-146, 44]], 8), u => 5 * (1 - u) + 0.9), H), GOLD);
    // perbesar seluruh naga terhadap titik (500,270)
    for (let i = dragonStart; i < f.shapes.length; i++) f.shapes[i].pts = xf(f.shapes[i].pts, { s: 1.17 }).map(p => [p[0] + 500 * (1 - 1.17), p[1] + 270 * (1 - 1.17)]);
    return f;
  }

  let cache = null;
  FS.getFlags = function () {
    if (!cache) {
      cache = [soviet(), ottoman(), austria(), prussia(), qing()];
      cache.forEach(fl => FS.buildTimeline(fl));
      let t = 0;
      cache.forEach(fl => { fl.t0 = t; t += fl.dur; });
      cache.total = t;
    }
    return cache;
  };
})(typeof window !== 'undefined' ? window : globalThis);
