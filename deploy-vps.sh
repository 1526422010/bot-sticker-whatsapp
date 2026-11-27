#!/usr/bin/env bash
# Deploy Bot Stiker WA di VPS Ubuntu/Debian - jalanin sebagai root / sudo:
#   bash deploy-vps.sh
# Script ini: install Node.js 20 + ffmpeg + pm2, npm install, lalu nyalain bot 24/7.
set -e
cd "$(dirname "$0")"

echo "== 1/5 Update & install ffmpeg =="
apt-get update -y
apt-get install -y ffmpeg curl unzip

echo "== 2/5 Install Node.js 20 (wajib >= 20 buat @pontalabs/baileys) =="
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v//;s/\..*//')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v; ffmpeg -version | head -1

echo "== 3/5 Install pm2 (biar bot nyala 24/7 & auto-restart) =="
command -v pm2 >/dev/null || npm install -g pm2

echo "== 4/5 Install dependensi bot =="
npm install

echo "== 5/5 Nyalain bot pakai pm2 =="
pm2 delete bot-stiker >/dev/null 2>&1 || true
pm2 start index.js --name bot-stiker
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" || true

echo ""
echo "============================================================"
echo "Bot jalan! Sekarang:"
echo "  - Lihat QR buat scan:   pm2 logs bot-stiker"
echo "    (QR digambar di log pakai karakter teks - scan langsung"
echo "     dari layar terminal/SSH lo, cepetan karena QR cepet ganti)"
echo "  - Pantau log terus:     pm2 logs bot-stiker"
echo "  - Restart bot:          pm2 restart bot-stiker"
echo "  - Stop bot:             pm2 stop bot-stiker"
echo "  - Status:               pm2 status"
echo ""
echo "Kalau folder auth/ ikut lo copy dari Windows, bot langsung"
echo "connect TANPA scan QR lagi."
echo "============================================================"
