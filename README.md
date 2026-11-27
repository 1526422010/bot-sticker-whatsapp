# Bot Stiker WA Bersuara 🤖🔊

Bot WhatsApp pembuat stiker: kirim `.ping` dibalas Pong, kirim foto / video
pendek -> jadi stiker, dan video bersuara -> jadi **Sound Sticker**.

## Sound Sticker (fitur WhatsApp)

**Sound Sticker** adalah format stiker WhatsApp yang membawa track audio:
stiker (WebP) + audio dalam SATU pesan, ada ikon audio di pojoknya,
tap ikonnya -> suaranya bunyi (loop 3x). Fitur ini tersedia mulai
WhatsApp Beta Android 2.26.47.1; di WA versi lama stiker tampil tanpa suara.
Durasi diatur di `config.js` (`soundAnimatedMaxSeconds`).

Bot ini mengirimnya pakai fork **@pontalabs/baileys** (`audioSticker`),
karena Baileys resmi belum support format ini. Fork = kode pihak ketiga,
ada script saat install — pakai nomor kedua khusus bot, jangan nomor utama.

Mode:
1. **`#sticker` dari video** — video -> WebP animasi (crop full 512x512)
   + audio asli video -> OGG Opus, dikirim sebagai satu `audioSticker`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `.ping` | Cek bot aktif -> `Pong! Bot WhatsApp aktif.` |
| `.s` | Kirim/reply foto atau video -> stiker (animasi kalau video) |
| `#sticker` | Video -> Sound Sticker native |
| `.menu` | Daftar perintah |

## Cara jalanin

Syarat: **Node.js 18+** dan **ffmpeg** terinstall.

> **Windows — error `spawn ffmpeg ENOENT`?** Artinya ffmpeg belum ada / belum masuk PATH.
> Cara paling gampang: download `ffmpeg.exe` (dari https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip,
> ambil `bin/ffmpeg.exe` dari dalam zip), **taruh file itu di folder project ini (sebelah `index.js`)**,
> lalu restart bot. Bot versi baru otomatis mendeteksi `ffmpeg.exe` lokal itu.
> Alternatif: `winget install Gyan.FFmpeg`, lalu **tutup & buka terminal baru** (wajib, biar PATH ke-refresh),
> cek dengan `ffmpeg -version`. Bot juga sekarang berhenti di awal dengan pesan jelas kalau ffmpeg gak ketemu,
> bukan error di tengah pas bikin stiker.

```bash
# install ffmpeg (pilih sesuai OS)
# Ubuntu/Debian:  sudo apt install ffmpeg
# Windows:        winget install ffmpeg   (atau download dari ffmpeg.org)
# Termux:         pkg install nodejs ffmpeg

cd bot-stiker-wa
npm install
npm start
```

1. QR muncul di terminal -> scan pakai WhatsApp di HP: **Setelan > Perangkat tertaut > Tautkan perangkat**
2. Login tersimpan di folder `auth/` — restart gak perlu scan lagi (jangan share folder ini ke siapa pun, itu = kunci akun WA lo)
3. Chat nomor bot itu: kirim `.ping`, lalu kirim video 1-8 detik + caption `#sticker`

Test konversi tanpa konek WA (pakai video test yang dibuat otomatis):

```bash
npm run test-convert
# hasil: tmp/hasil-stiker.webp, tmp/hasil-suara.ogg, tmp/hasil-video-bersuara.mp4
```

## Pengaturan

Edit `config.js`: nama bot, nama pack stiker, durasi maks video (default 8 detik),
fps, dan batas ukuran stiker.

## Catatan penting

- Pakai **nomor kedua / nomor khusus bot**, jangan nomor utama. Baileys itu library
  unofficial — WhatsApp bisa membatasi / memblokir nomor yang dianggap bot/spam.
  Jangan spam, jangan kirim massal.
- Video panjang/gede bakal ditolak WA sebagai stiker (batas ~1MB). Bot ini otomatis
  nurunin fps & kualitas kalau hasilnya kegedean.
- Jalan 24 jam? Taruh di VPS / PC yang nyala terus, jalanin pakai `pm2 start index.js/npm start`.
