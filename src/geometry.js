(function (g) {
  const FS = g.FS || (g.FS = {});
  const rad = d => d * Math.PI / 180;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

  function ellipse(cx, cy, rx, ry, n = 48, a0 = 0) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = rad(a0) + i / n * Math.PI * 2;
      p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return p;
  }
  const circle = (cx, cy, r, n = 40, a0 = 0) => ellipse(cx, cy, r, r, n, a0);

  function star(cx, cy, R, r, n = 5, rot = -90) {
    const p = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rad(rot) + i * Math.PI / n, rr = i % 2 ? r : R;
      p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return p;
  }

  // Parser path SVG sederhana (absolut): M L H V C Q Z -> daftar polyline
  function parsePath(d, steps = 12) {
    const tk = d.match(/[MLCQZHV]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    const out = [];
    let cur = null, cmd = null, i = 0, x = 0, y = 0, sx = 0, sy = 0;
    const num = () => parseFloat(tk[i++]);
    const isNum = () => i < tk.length && !/^[A-Za-z]$/.test(tk[i]);
    while (i < tk.length) {
      if (/^[A-Za-z]$/.test(tk[i])) cmd = tk[i++];
      if (cmd === 'Z') { if (cur && cur.length > 1) out.push(cur); cur = null; x = sx; y = sy; continue; }
      if (cmd === 'M') {
        if (cur && cur.length > 1) out.push(cur);
        x = num(); y = num(); sx = x; sy = y; cur = [[x, y]]; cmd = 'L'; continue;
      }
      while (isNum()) {
        if (cmd === 'L') { x = num(); y = num(); cur.push([x, y]); }
        else if (cmd === 'H') { x = num(); cur.push([x, y]); }
        else if (cmd === 'V') { y = num(); cur.push([x, y]); }
        else if (cmd === 'C') {
          const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
          for (let k = 1; k <= steps; k++) {
            const t = k / steps, u = 1 - t;
            cur.push([u*u*u*x + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3, u*u*u*y + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3]);
          }
          x = x3; y = y3;
        } else if (cmd === 'Q') {
          const x1 = num(), y1 = num(), x2 = num(), y2 = num();
          for (let k = 1; k <= steps; k++) {
            const t = k / steps, u = 1 - t;
            cur.push([u*u*x + 2*u*t*x1 + t*t*x2, u*u*y + 2*u*t*y1 + t*t*y2]);
          }
          x = x2; y = y2;
        } else break;
      }
    }
    if (cur && cur.length > 1) out.push(cur);
    return out;
  }
  const path1 = (d, steps) => parsePath(d, steps)[0];

  // Catmull-Rom spline melalui titik kontrol
  function spline(c, per = 10) {
    const out = [];
    for (let i = 0; i < c.length - 1; i++) {
      const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const f = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2*p0[j] - 5*p1[j] + 4*p2[j] - p3[j]) * t2 + (-p0[j] + 3*p1[j] - 3*p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(c[c.length - 1].slice());
    return out;
  }

  // Poligon dari garis tengah + lebar (fungsi u->lebar atau angka)
  function strokePoly(c, w) {
    const n = c.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const hw = (typeof w === 'function' ? w(i / (n - 1)) : w) / 2;
      L.push([c[i][0] + nx * hw, c[i][1] + ny * hw]);
      R.push([c[i][0] - nx * hw, c[i][1] - ny * hw]);
    }
    return L.concat(R.reverse());
  }

  // transformasi: skala -> flip X -> rotasi -> translasi
  function xf(pts, o = {}) {
    const sx = (o.sx ?? o.s ?? 1) * (o.fx ? -1 : 1), sy = o.sy ?? o.s ?? 1;
    const a = rad(o.r || 0), ca = Math.cos(a), sa = Math.sin(a), tx = o.x || 0, ty = o.y || 0;
    return pts.map(p => {
      const x = p[0] * sx, y = p[1] * sy;
      return [x * ca - y * sa + tx, x * sa + y * ca + ty];
    });
  }

  function clip(poly, axis, val, keepLess) {
    const out = [], n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const ia = keepLess ? a[axis] <= val : a[axis] >= val;
      const ib = keepLess ? b[axis] <= val : b[axis] >= val;
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (val - a[axis]) / (b[axis] - a[axis]);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    return out;
  }
  function clipBox(p, x0, y0, x1, y1) {
    p = clip(p, 0, x0, false); if (!p.length) return p;
    p = clip(p, 0, x1, true);  if (!p.length) return p;
    p = clip(p, 1, y0, false); if (!p.length) return p;
    return clip(p, 1, y1, true);
  }

  // potong subjek dengan poligon cembung (Sutherland-Hodgman)
  function clipConvex(subject, clipPoly) {
    let area = 0;
    for (let i = 0; i < clipPoly.length; i++) { const a = clipPoly[i], b = clipPoly[(i + 1) % clipPoly.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area >= 0 ? 1 : -1;
    let out = subject;
    for (let i = 0; i < clipPoly.length && out.length; i++) {
      const A = clipPoly[i], B = clipPoly[(i + 1) % clipPoly.length];
      const side = p => sgn * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]));
      const inp = out; out = [];
      for (let j = 0; j < inp.length; j++) {
        const P = inp[j], Q = inp[(j + 1) % inp.length], sp = side(P), sq = side(Q);
        if (sp >= 0) out.push(P);
        if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
      }
    }
    return out;
  }

  function runPts(samples, pred) {
    const n = samples.length, ok = samples.map(pred);
    let s = -1;
    for (let i = 0; i < n; i++) if (ok[i] && !ok[(i - 1 + n) % n]) { s = i; break; }
    if (s < 0) return ok.every(Boolean) ? samples.slice() : [];
    const out = [];
    for (let k = 0; k < n; k++) { const i = (s + k) % n; if (!ok[i]) break; out.push(samples[i]); }
    return out;
  }
  // lingkaran1 dikurangi lingkaran2 (sabit)
  function crescent(c1, R1, c2, R2, n = 160) {
    const A = [], B = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      A.push([c1[0] + R1 * Math.cos(a), c1[1] + R1 * Math.sin(a)]);
      B.push([c2[0] + R2 * Math.cos(a), c2[1] + R2 * Math.sin(a)]);
    }
    const outer = runPts(A, p => dist(p, c2) >= R2);
    const inner = runPts(B, p => dist(p, c1) < R1);
    const last = outer[outer.length - 1];
    if (dist(last, inner[inner.length - 1]) < dist(last, inner[0])) inner.reverse();
    return outer.concat(inner);
  }

  // bulu / daun runcing dari titik (px,py) mengarah sudut ang (derajat, y ke bawah)
  function leaf(px, py, ang, len, wid) {
    const ts = [0, .12, .3, .5, .7, .86, .96, 1], a = rad(ang), ca = Math.cos(a), sa = Math.sin(a);
    const up = [], dn = [];
    for (const t of ts) {
      const hw = wid / 2 * Math.sin(Math.PI * Math.pow(t, 0.7)), x = t * len;
      up.push([px + x * ca - hw * sa, py + x * sa + hw * ca]);
      dn.push([px + x * ca + hw * sa, py + x * sa - hw * ca]);
    }
    return up.concat(dn.reverse().slice(1, -1));
  }

  FS.geo = { rad, dist, rect, ellipse, circle, star, parsePath, path1, spline, strokePoly, xf, clipBox, clipConvex, crescent, leaf };
})(typeof window !== 'undefined' ? window : globalThis);
