/*
 * Timeline per bendera: titik penelusur menelusuri kontur tertutup tiap shape
 * (kecepatan konstan sepanjang kontur), berpindah (travel) antar shape,
 * lalu "hold" sebentar di akhir.
 */
(function (g) {
  const FS = g.FS || (g.FS = {});

  function prepContour(s) {
    const n = s.pts.length;
    s.cum = [0];
    for (let i = 0; i < n; i++) {
      const a = s.pts[i], b = s.pts[(i + 1) % n];
      s.cum.push(s.cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    s.len = s.cum[n];
  }

  // posisi pada kontur tertutup di jarak d -> {x,y,k} (k = indeks vertex terakhir yang terlewati)
  function contourAt(s, d) {
    const n = s.pts.length, cum = s.cum;
    if (d <= 0) return { x: s.pts[0][0], y: s.pts[0][1], k: 0 };
    if (d >= s.len) return { x: s.pts[0][0], y: s.pts[0][1], k: n - 1, end: true };
    let lo = 0, hi = n; // cum[lo] <= d < cum[hi]
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const a = s.pts[lo], b = s.pts[(lo + 1) % n], seg = cum[lo + 1] - cum[lo] || 1, u = (d - cum[lo]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, k: lo };
  }

  FS.buildTimeline = function (flag) {
    flag.shapes.forEach(prepContour);
    const segs = [];
    let prev = null;
    flag.shapes.forEach((s, i) => {
      const start = s.pts[0];
      if (prev) {
        const d = Math.hypot(start[0] - prev[0], start[1] - prev[1]);
        if (d > 0.5) segs.push({ kind: 'travel', i, g: s.g, from: prev, to: start, len: d, wt: 4 + d * 0.012 });
      }
      segs.push({ kind: 'trace', i, g: s.g, len: s.len, wt: s.w != null ? s.w : 20 + Math.pow(s.len, 0.62) });
      prev = start;
    });
    const drawT = flag.dur - flag.hold;
    const sum = segs.reduce((a, s) => a + s.wt, 0);
    let t = 0;
    for (const s of segs) { s.t0 = t; t += s.wt / sum * drawT; s.t1 = t; }
    segs[segs.length - 1].t1 = drawT;
    flag.segs = segs;
    flag.drawT = drawT;
    flag.endPos = flag.shapes[flag.shapes.length - 1].pts[0];
  };

  // state di waktu lokal tl (detik sejak awal bendera)
  FS.stateAt = function (flag, tl) {
    const segs = flag.segs;
    if (tl >= flag.drawT) return { phase: 'done', i: flag.shapes.length, x: flag.endPos[0], y: flag.endPos[1] };
    if (tl < 0) tl = 0;
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].t0 <= tl) lo = m; else hi = m - 1; }
    const sg = segs[lo], u = Math.min(1, Math.max(0, (tl - sg.t0) / (sg.t1 - sg.t0 || 1)));
    if (sg.kind === 'travel') {
      return { phase: 'travel', i: sg.i, seg: lo, x: sg.from[0] + (sg.to[0] - sg.from[0]) * u, y: sg.from[1] + (sg.to[1] - sg.from[1]) * u };
    }
    const s = flag.shapes[sg.i], d = u * s.len, p = contourAt(s, d);
    return { phase: 'trace', i: sg.i, seg: lo, d, k: p.k, x: p.x, y: p.y };
  };

  FS.contourAt = contourAt;
})(typeof window !== 'undefined' ? window : globalThis);
