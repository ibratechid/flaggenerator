/*
 * Renderer: menggambar satu frame untuk waktu global t (detik).
 * Hanya memakai Canvas 2D API standar -> jalan di browser (Puppeteer) maupun @napi-rs/canvas.
 */
(function (g) {
  const FS = g.FS || (g.FS = {});
  const C = FS.config;

  const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const lum = h => { const [r, G, b] = hexRgb(h); return 0.3 * r + 0.59 * G + 0.11 * b; };
  const dim = (h, k) => { const l = Math.round(lum(h) * k); return `rgb(${l},${l},${l})`; };
  const same = h => h;

  FS.createRenderer = function (ctx, createCanvas) {
    const flags = FS.getFlags();
    const { W, H, FLAG, GRAPH } = C;
    const kF = FLAG.w / 1000;               // satuan bendera -> piksel
    const TRAVEL = '#8a7a3a', GOLDDOT = '#ffd54a';

    /* ---------- helper gambar ---------- */
    function pathOf(c, pts, ox, oy, k, extra) {
      c.beginPath();
      c.moveTo(ox + pts[0][0] * k, oy + pts[0][1] * k);
      for (let i = 1; i < pts.length; i++) c.lineTo(ox + pts[i][0] * k, oy + pts[i][1] * k);
      if (extra) c.lineTo(ox + extra[0] * k, oy + extra[1] * k);
      c.closePath();
    }
    function paint(c, s, pts, ox, oy, k, colorFn, extra, px) {
      pathOf(c, pts, ox, oy, k, extra);
      c.fillStyle = colorFn(s.color);
      c.fill();
      c.lineJoin = 'round';
      if (s.stroke) { c.strokeStyle = colorFn(s.stroke); c.lineWidth = s.lw * px; }
      else { c.strokeStyle = c.fillStyle; c.lineWidth = 0.9 * px; }
      c.stroke();
    }
    function paintFlag(c, flag, ox, oy, k, colorFn, px) {
      for (const s of flag.shapes) paint(c, s, s.pts, ox, oy, k, colorFn, null, px);
    }

    /* ---------- thumbnail (pre-render) ---------- */
    const TW = 62, TH = 31, TS = 3;
    function makeThumb(flag, colorFn) {
      const cv = createCanvas(TW * TS, TH * TS), c = cv.getContext('2d');
      c.fillStyle = '#000'; c.fillRect(0, 0, TW * TS, TH * TS);
      paintFlag(c, flag, 0, 0, TW * TS / 1000, colorFn, TS * 0.8);
      return cv;
    }
    const thumbs = flags.map(f => ({ color: makeThumb(f, same), dim: makeThumb(f, h => dim(h, 0.42)) }));

    /* ---------- sampel grafik gelombang (y titik terhadap waktu) ---------- */
    const GDT = 1 / 240;
    const graphs = flags.map(fl => {
      const n = Math.ceil(fl.dur / GDT) + 1, y = new Float32Array(n), col = new Array(n);
      let last = '#ffffff';
      for (let i = 0; i < n; i++) {
        const st = FS.stateAt(fl, i * GDT);
        y[i] = st.y;
        if (st.phase === 'trace') { last = fl.shapes[st.i].color; col[i] = last; }
        else if (st.phase === 'travel') col[i] = TRAVEL;
        else col[i] = last;
        if (col[i] !== TRAVEL && lum(col[i]) < 55) col[i] = '#c4c4c4';
      }
      return { n, y, col };
    });

    /* ---------- ukuran judul ---------- */
    ctx.font = `41px ${C.FONT}`;
    const titleSize = 41 * 686 / ctx.measureText(C.TITLE).width;

    function drawFrame(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';

      let fi = flags.length - 1;
      for (let i = 0; i < flags.length; i++) if (t < flags[i].t0 + flags[i].dur) { fi = i; break; }
      const fl = flags[fi], tl = Math.max(0, Math.min(t - fl.t0, fl.dur));

      // judul
      ctx.fillStyle = '#fff'; ctx.font = `${titleSize}px ${C.FONT}`;
      ctx.fillText(C.TITLE, W / 2, 84);

      // thumbnail
      for (let i = 0; i < flags.length; i++) {
        const cx = 133 + 113.5 * i, x = cx - TW / 2, y = 215 - 17.5;
        ctx.fillStyle = '#111'; ctx.fillRect(x - 0.5, y, TW + 1, 35);
        ctx.drawImage(i <= fi ? thumbs[i].color : thumbs[i].dim, x, 215 - TH / 2, TW, TH);
      }

      // area bendera
      const FX = FLAG.x, FY = FLAG.y;
      const st = FS.stateAt(fl, tl);
      for (let i = 0; i < fl.shapes.length; i++) {
        const s = fl.shapes[i];
        if (i < st.i) paint(ctx, s, s.pts, FX, FY, kF, same, null, 1);
        else if (i === st.i && st.phase === 'trace') {
          const pts = s.pts.slice(0, st.k + 1), dot = [st.x, st.y];
          if (pts.length >= 2 || st.d > 0) paint(ctx, s, pts, FX, FY, kF, same, dot, 1);
          // jejak kontur
          ctx.beginPath(); ctx.moveTo(FX + pts[0][0] * kF, FY + pts[0][1] * kF);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(FX + pts[j][0] * kF, FY + pts[j][1] * kF);
          ctx.lineTo(FX + dot[0] * kF, FY + dot[1] * kF);
          ctx.strokeStyle = 'rgba(255,214,90,0.75)'; ctx.lineWidth = 1.1; ctx.stroke();
        }
      }
      // garis pindah (travel)
      if (st.phase === 'travel') {
        const sg = fl.segs[st.seg];
        ctx.beginPath(); ctx.moveTo(FX + sg.from[0] * kF, FY + sg.from[1] * kF); ctx.lineTo(FX + st.x * kF, FY + st.y * kF);
        ctx.strokeStyle = 'rgba(255,214,90,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      }
      // bingkai
      ctx.strokeStyle = 'rgba(128,118,76,0.95)'; ctx.lineWidth = 1.6;
      ctx.strokeRect(FX, FY, FLAG.w, FLAG.h);
      // titik penelusur
      if (st.phase !== 'done') {
        const dx = FX + st.x * kF, dy = FY + st.y * kF;
        const gr = ctx.createRadialGradient(dx, dy, 0, dx, dy, 11);
        gr.addColorStop(0, 'rgba(255,213,74,0.55)'); gr.addColorStop(1, 'rgba(255,213,74,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(dx, dy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = GOLDDOT; ctx.beginPath(); ctx.arc(dx, dy, 4.4, 0, Math.PI * 2); ctx.fill();
      }

      // nama & keterangan
      ctx.fillStyle = '#fff'; ctx.font = `52px ${C.FONT}`;
      ctx.fillText(fl.name, W / 2, 805);
      ctx.fillStyle = '#c9c9c9'; ctx.font = `22px ${C.FONT}`;
      ctx.fillText(fl.sub, W / 2, 836);

      // grafik gelombang
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(GRAPH.x0 + 0.5, GRAPH.top); ctx.lineTo(GRAPH.x0 + 0.5, GRAPH.bottom); ctx.stroke();
      ctx.strokeStyle = '#1c1c1c';
      ctx.beginPath(); ctx.moveTo(GRAPH.x0, GRAPH.zero + 0.5); ctx.lineTo(GRAPH.x1, GRAPH.zero + 0.5); ctx.stroke();

      const gd = graphs[fi], idx = Math.min(gd.n - 1, Math.floor(tl / GDT));
      const gx = i => GRAPH.x0 + (i * GDT / fl.dur) * (GRAPH.x1 - GRAPH.x0);
      const gy = i => GRAPH.hi + (gd.y[i] / 500) * (GRAPH.lo - GRAPH.hi);
      ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      let runStart = 0;
      for (let i = 1; i <= idx + 1; i++) {
        if (i > idx || gd.col[i] !== gd.col[runStart]) {
          const end = Math.min(i, idx);
          ctx.beginPath(); ctx.moveTo(gx(runStart), gy(runStart));
          for (let j = runStart + 1; j <= end; j++) ctx.lineTo(gx(j), gy(j));
          ctx.strokeStyle = gd.col[runStart]; ctx.stroke();
          runStart = end;
        }
      }
      if (st.phase !== 'done') {
        ctx.fillStyle = GOLDDOT; ctx.beginPath(); ctx.arc(gx(idx), gy(idx), 4, 0, Math.PI * 2); ctx.fill();
      }

      // footer
      ctx.fillStyle = '#5f5f5f'; ctx.font = `26px ${C.FONT}`;
      ctx.fillText(C.FOOTER, W / 2, 1203);
    }

    return { draw: drawFrame, flags };
  };
})(typeof window !== 'undefined' ? window : globalThis);
