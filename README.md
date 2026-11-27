# Bot Stiker WA Bersuara 🤖🔊

Bot WhatsApp kayak di postingan referensi (bot "Minato"): kirim `.ping` dibalas Pong,
kirim video pendek -> jadi **stiker bersuara**.

![Contoh](https://web.facebook.com/share/p/1AGYKWLeAT/) — postingan Alexander Zulfikar, 25 Nov 2026:
screenshot chat jam 02.36, user kirim video monyet 1 detik, bot balas
*"Video masuk antrean. Sedang disiapkan menjadi stiker bersuara."*

## Jujur dulu: "stiker bersuara" itu trik, bukan format asli

Format stiker WhatsApp itu **WebP 512x512 dan TIDAK bisa menyimpan audio sama sekali**.
Jadi semua bot "stiker bersuara" pakai salah satu dari 2 trik ini — dua-duanya ada di bot ini:

1. **`.ssuara` (mode screenshot)** — bot kirim 2 pesan berurutan nempel:
   stiker animasi (bisu) + voice note berisi suara asli videonya.
   Kelihatan kayak satu stiker yang bunyi pas VN-nya diputar.
2. **`.vsuara` (mode video note)** — video dipotong persegi & dikirim sebagai
   *video note* (ptv): autoplay, looping, **ada suaranya beneran** dalam 1 pesan.
   Ini yang paling terasa kayak "stiker hidup bersuara".

## Perintah

| Perintah | Fungsi |
|---|---|
| `.ping` | Cek bot aktif -> `Pong! Bot WhatsApp aktif.` |
| `.s` | Kirim/reply foto atau video -> stiker (animasi kalau video) |
| `.ssuara` | Reply video -> stiker animasi + voice note suaranya |
| `.vsuara` | Reply video -> video persegi bersuara (video note) |
| `.menu` | Daftar perintah |

## Cara jalanin

Syarat: **Node.js 18+** dan **ffmpeg** terinstall.

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
3. Chat nomor bot itu: kirim `.ping`, lalu kirim video 1-8 detik + caption `.ssuara`

Test konversi tanpa konek WA (bikin video contoh sendiri):

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
- Jalan 24 jam? Taruh di VPS / PC yang nyala terus, jalanin pakai `pm2 start index.js`.
