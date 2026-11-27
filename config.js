export const config = {
  botName: 'Pakaw Bot', // nama bot lo
  // Profil WA bot (nama fancy + bio + foto) - di-set otomatis sekali pas bot connect.
  // Ganti teksnya sesuka lo, kosongkan profileStatus kalau gak mau diganti, dan
  // set setProfileOnStart ke false kalau gak mau profil diubah bot.
  setProfileOnStart: true,
  profileName: 'Pakaw Bot',
  profileStatus: 'Bot stiker WA aktif 24/7', // bio profil bot - isi teks / link lo sendiri di sini
  profilePicture: 'pp.jpg', // taruh file gambar ini di folder project (sebelah index.js), kosongkan kalau gak mau ganti foto
  // WM stiker: teks ini nempel di metadata (EXIF) SETIAP stiker yang bot kirim.
  // Pas stiker di-tap / dibuka, WhatsApp nampilin: "<packname> • <author>"
  packname: 'Pakaw Bot',
  author: 'Pakaw Bot', // publisher pack stiker - bisa diganti teks promo / link lo sendiri
  prefix: '.',
  autoDetect: true, // true = tanpa perintah pun video langsung jadi Sound Sticker & foto jadi stiker. false = wajib pakai perintah
  maxVideoSeconds: 8,      // stiker WA animasi idealnya <= 8-10 detik
  soundAnimatedMaxSeconds: 10,  // durasi maks Sound Sticker animasi (detik)
  stickerSize: 512,        // wajib 512x512 buat stiker WA
  fps: 15,                 // makin tinggi makin halus, tapi file makin gede
  maxStickerKB: 950,       // batas aman stiker animasi WA ~1MB
};
