# If Historical Flags Had Sound

Video vertikal 9:16 (720×1280, 60 fps, ±31 detik) — bendera digambar oleh sebuah titik
yang menelusuri kontur bentuknya, dan **kontur itulah yang menjadi bunyi**.

Bendera: Soviet Union (1955-1991) · Ottoman Empire (1844-1922) · Austria-Hungary Merchant Ensign
(1869-1918) · Prussia State Flag (1892-1918) · Qing China (1889-1912).

## Cara kerja

**Visual** (`src/renderer.js`, Canvas 2D)
- Setiap bendera = daftar poligon berwarna. Titik kuning menelusuri kontur tiap poligon
  dengan kecepatan konstan; area yang tersapu terisi (kipas dari titik awal).
- Grafik bawah = koordinat Y titik penelusur terhadap waktu (gelombang bendera).
- Thumbnail atas: bendera yang belum tampil redup, yang sudah/sedang tampil berwarna.

**Suara** (`src/audio.js`, murni JavaScript, tanpa aset audio)
- Tiap *group* shape = satu not. Kontur yang sudah tergambar dijadikan **satu siklus gelombang**
  (X → kanal kiri, Y → kanan; teknik "musik osiloskop"), jadi timbre ikut tumbuh saat bendera
  makin lengkap. Persegi → gelombang trapesium, lingkaran → sinus, bintang → kaya harmonik.
- Tangga nada per bendera: Soviet = D minor, Ottoman = Phrygian dominant (E), Austria-Hungary =
  C mayor, Prussia = G minor, Qing = pentatonik D.
- Tambahan: drone lembut, "pluck" kecil tiap shape, reverb, soft-limiter.
- Video asli yang dikirim tidak punya track audio, jadi suara ini dirancang baru.

## Menjalankan

```bash
npm install

# 1) Preview interaktif di browser (dengan suara)
npx serve .            # lalu buka http://localhost:3000/public/

# 2) Render MP4 lokal (butuh ffmpeg + font serif, mis. fonts-liberation)
node render.js                         # Puppeteer/Chrome  -> out/flags-sound.mp4
node render.js --backend=canvas        # tanpa browser (lebih cepat)
node render.js --fps=30 --seconds=6    # tes cepat

# opsi lain: --footer="@channelku"  --tail=1.2  --out=out/hasil.mp4
```

## Render di GitHub Actions

1. Push folder ini ke repo GitHub.
2. Tab **Actions → Render video → Run workflow** (isi footer/handle, fps, backend).
3. Setelah selesai, unduh artifact **flag-sound-video** (`flags-sound.mp4` + `audio.wav`).

Workflow juga jalan otomatis saat push tag `v*`.

## Kustomisasi

| Ingin ubah | Edit |
|---|---|
| Judul, footer/handle, font, tata letak | `src/config.js` |
| Bentuk/warna bendera, nada tiap bagian, durasi | `src/flags.js` (`dur`, `groups`, `scale`) |
| Karakter suara (reverb, filter, drone, pluck) | `src/audio.js` |
| Tambah bendera baru | tambah fungsi di `src/flags.js` + daftarkan di `getFlags()` |

Koordinat bendera memakai kanvas 1000×500. Shape = poligon tertutup; helper tersedia di
`src/geometry.js` (`rect`, `circle`, `star`, `crescent`, `leaf`, `spline`, `strokePoly`, `path1` untuk path SVG).
