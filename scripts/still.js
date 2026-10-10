// Render beberapa frame PNG untuk cek visual (backend @napi-rs/canvas)
const path = require('path'), fs = require('fs');
const { createCanvas } = require(require.resolve('@napi-rs/canvas', { paths: [process.cwd(), path.join(process.cwd(), '..')] }));
['config','geometry','timeline','flags','renderer'].forEach(m => require('../src/' + m + '.js'));
const FS = globalThis.FS, C = FS.config;
const cv = createCanvas(C.W, C.H), ctx = cv.getContext('2d');
const r = FS.createRenderer(ctx, (w, h) => createCanvas(w, h));
const times = process.argv.slice(2).map(Number);
fs.mkdirSync('out/stills', { recursive: true });
for (const t of times) { r.draw(t); fs.writeFileSync(`out/stills/t${t}.png`, cv.toBuffer('image/png')); }
console.log('flags', r.flags.map(f => `${f.id}:${f.shapes.length} shapes`).join(', '), 'total', r.flags.total);
