// =========================================================
// reUseId - FILTER FOTO (dipakai upload.js, edit.js, chat.js)
// =========================================================
// Dijalankan di browser SEBELUM foto diterima/diupload:
//   1. isi file harus beneran gambar JPG/PNG/WEBP (bukan sekadar nama file)
//   2. ukuran gambar minimal (nolak gambar kekecilan)
//   3. nolak gambar kosong/polos (hitam, putih, satu warna)
//   4. deteksi konten dewasa pakai model NSFWJS (MobileNetV2) via TensorFlow.js
//
// Model ada di assets/nsfw/ (di-host sendiri). TensorFlow.js baru dimuat saat
// ada foto yang dipilih, jadi halaman lain nggak jadi lebih berat.
//
// Pakai:  const res = await ImageFilter.check(file, { context: "item" });
//         res.ok === true  -> foto boleh dipakai
//         res.ok === false -> tampilkan res.reason ke user
//
// Catatan: filter di browser bisa dilewati orang yang paham teknis. Buat
// proteksi penuh, pengecekan harus diulang di server.
// =========================================================
const ImageFilter = (function () {
  const TF_URL =
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
  const MODEL_URL = new URL("assets/nsfw/model.json", document.baseURI).href;
  const CLASSES = ["Drawing", "Hentai", "Neutral", "Porn", "Sexy"]; // urutan output model
  const SIZE = 224;

  // ---- ambang batas (boleh disetel) ----
  const BLOCK_PORN_HENTAI = 0.5; // Porn + Hentai >= ini -> ditolak
  const BLOCK_SEXY = 0.8; // Sexy >= ini -> ditolak
  const MIN_STDDEV = 6; // keabuan antar piksel; di bawah ini dianggap gambar polos
  const MIN_SIDE = { item: 200, chat: 64 }; // sisi terpendek (piksel)

  // Kalau model gagal dimuat (offline/CDN down): false = foto ditolak dulu,
  // true = foto tetap diterima tanpa pengecekan konten.
  const FAIL_OPEN = false;

  let modelPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Gagal memuat " + src));
      document.head.appendChild(s);
    });
  }

  function getModel() {
    if (!modelPromise) {
      modelPromise = (async () => {
        if (!window.tf) await loadScript(TF_URL);
        await tf.ready();
        return tf.loadLayersModel(MODEL_URL);
      })().catch((err) => {
        modelPromise = null; // biar bisa dicoba lagi
        throw err;
      });
    }
    return modelPromise;
  }

  // panggil duluan (misal saat user klik tombol pilih foto) biar model sudah siap
  function preload() {
    getModel().catch(() => {});
  }

  // cek isi file lewat 12 byte pertama, bukan ekstensi/file.type
  async function sniffType(file) {
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
    return null;
  }

  function decode(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode"));
      };
      img.src = url;
    });
  }

  // gambar ke canvas 224x224, dipakai buat cek polos & klasifikasi
  function toCanvas(img) {
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    c.getContext("2d").drawImage(img, 0, 0, SIZE, SIZE);
    return c;
  }

  function stddevOf(canvas) {
    const { data } = canvas.getContext("2d").getImageData(0, 0, SIZE, SIZE);
    let sum = 0,
      sumSq = 0;
    const n = SIZE * SIZE;
    for (let i = 0; i < data.length; i += 4) {
      const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += y;
      sumSq += y * y;
    }
    const mean = sum / n;
    return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  }

  async function classify(canvas) {
    const model = await getModel();
    const probs = tf.tidy(() => {
      const x = tf.browser
        .fromPixels(canvas, 3)
        .toFloat()
        .div(255)
        .reshape([1, SIZE, SIZE, 3]);
      return model.predict(x);
    });
    const arr = Array.from(await probs.data());
    probs.dispose();
    const out = {};
    CLASSES.forEach((c, i) => (out[c] = arr[i]));
    return out;
  }

  // context: "item" (foto barang) | "chat"
  async function check(file, { context = "item" } = {}) {
    if (!file) return { ok: false, reason: "Foto tidak ditemukan." };

    const type = await sniffType(file);
    if (!type) {
      return {
        ok: false,
        reason: "File itu bukan foto JPG, PNG, atau WEBP yang valid.",
      };
    }

    let img;
    try {
      img = await decode(file);
    } catch {
      return { ok: false, reason: "Foto rusak atau tidak bisa dibuka." };
    }

    const minSide = MIN_SIDE[context] || MIN_SIDE.item;
    if (Math.min(img.naturalWidth, img.naturalHeight) < minSide) {
      return {
        ok: false,
        reason: `Resolusi foto terlalu kecil (minimal ${minSide}px di sisi terpendek).`,
      };
    }

    const canvas = toCanvas(img);

    if (stddevOf(canvas) < MIN_STDDEV) {
      return {
        ok: false,
        reason: "Foto terlihat kosong atau polos. Pakai foto yang jelas.",
      };
    }

    let scores;
    try {
      scores = await classify(canvas);
    } catch (err) {
      console.warn("ImageFilter: model gagal dimuat/dijalankan:", err);
      return FAIL_OPEN
        ? { ok: true, skipped: true }
        : {
            ok: false,
            error: true,
            reason:
              "Pemeriksaan foto gagal. Periksa koneksi internetmu lalu coba lagi.",
          };
    }

    if (
      scores.Porn + scores.Hentai >= BLOCK_PORN_HENTAI ||
      scores.Sexy >= BLOCK_SEXY
    ) {
      return {
        ok: false,
        reason:
          "Foto ditolak karena terdeteksi mengandung konten tidak pantas.",
        scores,
      };
    }

    return { ok: true, scores };
  }

  return { check, preload };
})();
