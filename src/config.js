(function (g) {
  const FS = g.FS || (g.FS = {});
  FS.config = {
    W: 720,
    H: 1280,
    FPS: 60,
    SR: 48000,
    TITLE: 'IF HISTORICAL FLAGS HAD SOUND',
    FOOTER: '@Evolution of Country',            // <- ganti dengan handle channel kamu
    FONT: '"Times New Roman","Liberation Serif",Tinos,"Noto Serif","DejaVu Serif",serif',
    // layout (piksel, kanvas 720x1280)
    FLAG: { x: 65, y: 365, w: 590, h: 295 },
    GRAPH: { x0: 48, x1: 672, top: 885, bottom: 1125, zero: 1004, hi: 905, lo: 1103 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
