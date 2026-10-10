/*
 * Mesin audio "bendera jadi suara".
 *
 *  - Setiap group shape = satu suara (not). Kontur group yang SUDAH tergambar oleh titik
 *    penelusur dijadikan satu siklus gelombang (osilator-xy: X -> kanal kiri, Y -> kanan,
 *    seperti musik osiloskop). Saat bendera makin lengkap, timbre ikut "tumbuh".
 *  - Pitch tiap group diambil dari tangga nada khas tiap bendera.
 *  - Tambahan: drone lembut, "pluck" kecil tiap shape, reverb, soft-limiter.
 */
(function (g) {
  const FS = g.FS || (g.FS = {});
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---- jalur (path) tiap group + pemetaan waktu -> jarak tempuh ----
  function buildGroupPaths(flag) {
    const gps = flag.groups.map(() => ({ X: [], Y: [], cum: [0], segs: [], t0: null, t1: null }));
    const push = (gp, x, y) => {
      const n = gp.X.length;
      if (n && Math.hypot(gp.X[n - 1] - x, gp.Y[n - 1] - y) < 1e-6) return;
      if (n) gp.cum.push(gp.cum[gp.cum.length - 1] + Math.hypot(x - gp.X[n - 1], y - gp.Y[n - 1]));
      gp.X.push(x); gp.Y.push(y);
    };
    for (const seg of flag.segs) {
      const gp = gps[seg.g], last = () => gp.cum[gp.cum.length - 1];
      if (seg.kind === 'travel') {
        if (!gp.X.length) continue;
        const d0 = last(); push(gp, seg.to[0], seg.to[1]);
        gp.segs.push({ t0: seg.t0, t1: seg.t1, d0, d1: last() });
      } else {
        const s = flag.shapes[seg.i];
        if (!gp.X.length) { push(gp, s.pts[0][0], s.pts[0][1]); gp.t0 = seg.t0; }
        else push(gp, s.pts[0][0], s.pts[0][1]);
        const d0 = last();
        for (let i = 1; i < s.pts.length; i++) push(gp, s.pts[i][0], s.pts[i][1]);
        push(gp, s.pts[0][0], s.pts[0][1]);
        gp.segs.push({ t0: seg.t0, t1: seg.t1, d0, d1: last() });
        gp.t1 = seg.t1;
      }
    }
    for (const gp of gps) {
      if (gp.X.length < 2) continue;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < gp.X.length; i++) { x0 = Math.min(x0, gp.X[i]); x1 = Math.max(x1, gp.X[i]); y0 = Math.min(y0, gp.Y[i]); y1 = Math.max(y1, gp.Y[i]); }
      gp.cx = (x0 + x1) / 2; gp.cy = (y0 + y1) / 2; gp.k = 1 / Math.max(1, (Math.max(x1 - x0, y1 - y0)) / 2);
      gp.total = gp.cum[gp.cum.length - 1];
    }
    return gps;
  }

  function posAt(gp, s, out) {
    const cum = gp.cum;
    let lo = 0, hi = cum.length - 1;
    if (s <= 0) { out[0] = gp.X[0]; out[1] = gp.Y[0]; return; }
    if (s >= cum[hi]) { out[0] = gp.X[hi]; out[1] = gp.Y[hi]; return; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const u = (s - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1);
    out[0] = gp.X[lo] + (gp.X[lo + 1] - gp.X[lo]) * u;
    out[1] = gp.Y[lo] + (gp.Y[lo + 1] - gp.Y[lo]) * u;
  }

  function distanceAt(gp, t, st) { // st = {i} pointer
    const segs = gp.segs;
    if (t <= segs[0].t0) return 0;
    while (st.i < segs.length - 1 && t >= segs[st.i + 1].t0) st.i++;
    const s = segs[st.i];
    if (t >= s.t1) return s.d1;
    return s.d0 + (s.d1 - s.d0) * ((t - s.t0) / (s.t1 - s.t0 || 1));
  }

  FS.renderAudio = function (opts = {}) {
    const sr = opts.sr || FS.config.SR;
    const flags = FS.getFlags();
    const total = flags.total + 1.6;                       // ekor reverb
    const N = Math.ceil(total * sr);
    const L = new Float32Array(N), R = new Float32Array(N);
    const p = [0, 0], q = [0, 0];

    for (const flag of flags) {
      const gps = buildGroupPaths(flag);

      // ---------- suara utama: kontur sebagai gelombang ----------
      gps.forEach((gp, gi) => {
        if (gp.X.length < 2) return;
        const def = flag.groups[gi], freq = mtof(def.midi), gain = 0.30 * (def.gain || 1);
        const tS = gp.t0, tE = gp.t1, rel = 1.15;
        const i0 = Math.max(0, Math.floor((flag.t0 + tS) * sr)), i1 = Math.min(N, Math.ceil((flag.t0 + tE + rel) * sr));
        const st = { i: 0 };
        let phase = 0;
        for (let i = i0; i < i1; i++) {
          const t = i / sr - flag.t0;
          const D = distanceAt(gp, t, st);
          const att = Math.min(1, (t - tS) / 0.012);
          const sus = 0.6 + 0.4 * Math.exp(-(t - tS) / 0.45);
          const relEnv = t > tE ? Math.exp(-(t - tE) / 0.38) : 1;
          const amp = gain * att * sus * relEnv;
          phase += freq / sr; phase -= Math.floor(phase);
          // satu siklus = jalur parsial [0..D] ditutup kembali ke titik awal
          posAt(gp, D, q);
          const closeD = Math.hypot(q[0] - gp.X[0], q[1] - gp.Y[0]);
          const Lp = D + closeD;
          let x, y;
          if (Lp < 1e-6) { x = gp.X[0]; y = gp.Y[0]; }
          else {
            const s = phase * Lp;
            if (s <= D) { posAt(gp, s, p); x = p[0]; y = p[1]; }
            else { const u = (s - D) / (closeD || 1); x = q[0] + (gp.X[0] - q[0]) * u; y = q[1] + (gp.Y[0] - q[1]) * u; }
          }
          L[i] += amp * (x - gp.cx) * gp.k;
          R[i] += amp * -(y - gp.cy) * gp.k;
        }
      });

      // ---------- drone lembut ----------
      {
        const f0 = mtof(flag.groups[0].midi - 12), i0 = Math.floor(flag.t0 * sr), i1 = Math.min(N, Math.floor((flag.t0 + flag.dur + 0.5) * sr));
        for (let i = i0; i < i1; i++) {
          const t = i / sr - flag.t0;
          const env = Math.min(1, t / 0.4) * (t > flag.dur ? Math.exp(-(t - flag.dur) / 0.2) : 1);
          const v = (Math.sin(2 * Math.PI * f0 * t) * 0.07 + Math.sin(2 * Math.PI * f0 * 1.5 * t) * 0.03) * env;
          L[i] += v; R[i] += v;
        }
      }

      // ---------- pluck kecil tiap shape ----------
      let last = -1, n = 0;
      for (const seg of flag.segs) {
        if (seg.kind !== 'trace') continue;
        const tg = flag.t0 + seg.t0;
        if (tg - last < 0.12) continue;
        last = tg;
        const sc = flag.scale, midi = sc[(n * 5 + 3) % sc.length] + 12; n++;
        const f = mtof(midi), s = flag.shapes[seg.i];
        let cx = 0; for (const pt of s.pts) cx += pt[0]; cx /= s.pts.length;
        const pan = Math.min(1, Math.max(0, cx / 1000)), gl = Math.cos(pan * Math.PI / 2), gr = Math.sin(pan * Math.PI / 2);
        const i0 = Math.floor(tg * sr), len = Math.floor(0.5 * sr);
        for (let k = 0; k < len && i0 + k < N; k++) {
          const tau = k / sr;
          const v = (Math.sin(2 * Math.PI * f * tau) * Math.exp(-tau * 9) + 0.25 * Math.sin(4 * Math.PI * f * tau) * Math.exp(-tau * 15)) * (1 - Math.exp(-tau * 500)) * 0.055;
          L[i0 + k] += v * gl * 1.2; R[i0 + k] += v * gr * 1.2;
        }
      }
    }

    // ---------- filter: high-pass (DC) + low-pass ringan ----------
    const aLP = 1 - Math.exp(-2 * Math.PI * 4200 / sr), RH = 0.997;
    for (const ch of [L, R]) {
      let xPrev = 0, yPrev = 0, lp = 0;
      for (let i = 0; i < N; i++) {
        const x = ch[i], y = x - xPrev + RH * yPrev; xPrev = x; yPrev = y;
        lp += aLP * (y - lp); ch[i] = lp;
      }
    }

    // ---------- reverb Schroeder sederhana ----------
    const rev = (src, spread) => {
      const sc = sr / 44100, combs = [1557, 1617, 1491, 1422].map(d => Math.floor((d + spread) * sc)), aps = [225, 556].map(d => Math.floor((d + spread) * sc));
      const out = new Float32Array(N);
      for (const d of combs) {
        const buf = new Float32Array(d); let idx = 0, fl = 0;
        for (let i = 0; i < N; i++) {
          const y = buf[idx]; fl += 0.3 * (y - fl);
          buf[idx] = src[i] + fl * 0.8; idx = (idx + 1) % d; out[i] += y * 0.25;
        }
      }
      for (const d of aps) {
        const buf = new Float32Array(d); let idx = 0;
        for (let i = 0; i < N; i++) {
          const b = buf[idx], x = out[i], y = -x + b; buf[idx] = x + b * 0.5; idx = (idx + 1) % d; out[i] = y;
        }
      }
      return out;
    };
    const wl = rev(L, 0), wr = rev(R, 23);
    const wet = 0.22;
    let peak = 0;
    for (let i = 0; i < N; i++) {
      let l = L[i] + wl[i] * wet, r = R[i] + wr[i] * wet;
      // fade-out akhir
      const tt = i / sr, fo = tt > flags.total ? Math.max(0, 1 - (tt - flags.total) / 1.5) : 1;
      l = Math.tanh(l * 1.15) * fo; r = Math.tanh(r * 1.15) * fo;
      L[i] = l; R[i] = r; peak = Math.max(peak, Math.abs(l), Math.abs(r));
    }
    const norm = peak > 0 ? 0.9 / peak : 1;
    for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }
    return { L, R, sr, duration: total };
  };

  // WAV 16-bit stereo -> Uint8Array
  FS.encodeWav = function (L, R, sr) {
    const n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
    const wr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE'); wr(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
    wr(36, 'data'); v.setUint32(40, n * 4, true);
    let o = 44;
    for (let i = 0; i < n; i++) {
      v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); o += 2;
      v.setInt16(o, Math.max(-1, Math.min(1, R[i])) * 32767, true); o += 2;
    }
    return new Uint8Array(buf);
  };
})(typeof window !== 'undefined' ? window : globalThis);
