// Fork PontaLabs - dipakai karena Baileys resmi BELUM support Sound Sticker native WA
// (fitur audioSticker). Import pakai namespace biar aman kalau ada export yang beda nama.
import * as Baileys from '@pontalabs/baileys';
const makeWASocket = Baileys.default;
const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion } = Baileys;
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Di sebagian server/VM, koneksi WebSocket WhatsApp harus lewat proxy (env https_proxy).
// Di HP/VPS biasa variabel itu kosong, agent ini otomatis tidak dipakai.
const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || '';
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { imageToSticker, videoToSticker, videoToVoiceNote, videoToSquareVideo, checkFfmpeg, FFMPEG } from './lib/convert.js';
import { addStickerExif } from './lib/exif.js';

// Tempel WM (pack name + publisher dari config) ke file stiker WebP, di tempat.
async function applyStickerWm(file) {
  const buf = await readFile(file);
  const withExif = addStickerExif(buf, { packname: config.packname, author: config.author });
  await writeFile(file, withExif);
  return withExif;
}

await mkdir('tmp', { recursive: true });

// Cek ffmpeg SEBELUM mulai - error "spawn ffmpeg ENOENT" artinya ffmpeg belum keinstall / belum masuk PATH
if (!(await checkFfmpeg())) {
  console.error(`
============================================================
❌ FFMPEG TIDAK KETEMU (dipakai: "${FFMPEG}")

Bot TIDAK bisa bikin stiker tanpa ffmpeg. Cara benerin (Windows):
  Cara gampang: download ffmpeg.exe lalu taruh di folder project ini
                (sebelah index.js), lalu jalanin ulang: npm start
  Cara install: buka PowerShell baru, jalanin:  winget install Gyan.FFmpeg
                lalu TUTUP terminal, buka terminal baru, cek: ffmpeg -version

Linux:  sudo apt install ffmpeg
Termux: pkg install ffmpeg
============================================================`);
  process.exit(1);
}
console.log('✅ ffmpeg ketemu:', FFMPEG);
const logger = pino({ level: 'silent' });

// Antrean sederhana per chat, biar pemrosesan media jalan satu-satu
const queues = new Map();
function enqueue(jid, job) {
  const prev = queues.get(jid) || Promise.resolve();
  const next = prev.then(job, job).catch((e) => console.error(e));
  queues.set(jid, next);
  return next;
}

const tmpFile = (ext) => path.join('tmp', `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
async function cleanup(...files) {
  for (const f of files) if (f && existsSync(f)) await unlink(f).catch(() => {});
}

// Buka bungkus pesan WA: ephemeral / viewOnce / documentWithCaption / edited, dll.
// Tanpa ini, video yang di-reply / dikirim sebagai view-once kelihatan "tidak ada" buat bot.
function unwrapMessage(src) {
  let cur = src || {};
  for (let i = 0; i < 6; i++) {
    const wrapKey = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage']
      .find((k) => cur?.[k]?.message);
    if (!wrapKey) break;
    cur = cur[wrapKey].message;
  }
  return cur;
}

// Cari quotedMessage dari contextInfo di sub-pesan MANA PUN (teks, gambar, video, audio -
// semuanya bisa bawa contextInfo, bukan cuma extendedTextMessage).
function findQuotedMessage(m) {
  for (const val of Object.values(m || {})) {
    if (val?.contextInfo?.quotedMessage) return unwrapMessage(val.contextInfo.quotedMessage);
  }
  return {};
}

// Ambil media dari satu sumber pesan (isi pesan itu sendiri / pesan yang di-quote)
function getMediaFromSource(src) {
  if (!src) return null;
  const s = unwrapMessage(src);
  if (s.imageMessage) return { type: 'image', node: s.imageMessage, raw: { message: s } };
  if (s.videoMessage) return { type: 'video', node: s.videoMessage, raw: { message: s } };
  if (s.stickerMessage) return { type: 'sticker', node: s.stickerMessage, raw: { message: s } };
  if (s.audioMessage) return { type: 'audio', node: s.audioMessage, raw: { message: s } };
  return null;
}

// Ambil media dari pesan yang dikirim / di-reply
function getMediaMessage(msg) {
  const m = unwrapMessage(msg.message || {});
  const quoted = findQuotedMessage(m);
  const src = Object.keys(quoted).length ? quoted : m;
  return getMediaFromSource(src);
}

// Media milik pesan ini & media milik pesan yang di-quote, dipisah -
// buat mode gabung Sound Sticker: foto di pesan ini + audio di pesan yang di-reply, dsb.
function getOwnAndQuotedMedia(msg) {
  const m = unwrapMessage(msg.message || {});
  const quoted = findQuotedMessage(m);
  return { own: getMediaFromSource(m), quoted: getMediaFromSource(quoted) };
}

async function downloadMediaOf(msg, media, logger) {
  return downloadMediaMessage({ ...msg, message: media.raw.message }, 'buffer', {}, { logger });
}

function getText(msg) {
  const m = unwrapMessage(msg.message || {});
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  ).trim();
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  // Fork mungkin tidak mengeksport fetchLatestBaileysVersion - kalau tidak ada, pakai default-nya fork.
  let version;
  try { version = fetchLatestBaileysVersion ? (await fetchLatestBaileysVersion()).version : undefined; } catch { version = undefined; }

  const sock = makeWASocket({ version, auth: state, logger, browser: [config.botName, 'Chrome', '1.0.0'], agent: proxyAgent, fetchAgent: proxyAgent, connectTimeoutMs: 60000, qrTimeout: 120000 });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nScan QR ini pakai WhatsApp > Perangkat Tertaut:\n');
      qrcodeTerminal.generate(qr, { small: true });
      await QRCode.toFile('tmp/qr.png', qr, { width: 640, margin: 2 }).catch(() => {});
      await writeFile('tmp/qr-ready.txt', new Date().toISOString()).catch(() => {});
      console.log('QR_PNG_READY tmp/qr.png');
    }
    if (connection === 'open') {
      console.log(`✅ ${config.botName} aktif!`);
      await writeFile('tmp/connected.txt', new Date().toISOString()).catch(() => {});
      // Set profil WA bot (nama fancy + bio + foto) - cukup sekali, ditandai file tmp/profile-done.txt.
      // Hapus file penanda itu kalau mau set ulang setelah ganti config.
      if (config.setProfileOnStart && !existsSync('tmp/profile-done.txt')) {
        try {
          if (config.profileName) await sock.updateProfileName(config.profileName);
          if (config.profileStatus) await sock.updateProfileStatus(config.profileStatus);
          if (config.profilePicture && existsSync(config.profilePicture) && sock.user?.id) {
            await sock.updateProfilePicture(sock.user.id, await readFile(config.profilePicture));
          }
          await writeFile('tmp/profile-done.txt', new Date().toISOString());
          console.log('✅ Profil bot di-set:', config.profileName);
        } catch (e) { console.error('Gagal set profil (abaikan, bot tetap jalan):', e.message); }
      }
    }
    if (connection === 'close') {
      const loggedOut = DisconnectReason ? lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut : false;
      console.log('Koneksi putus.', loggedOut ? 'Logout - hapus folder auth/ lalu scan ulang.' : 'Reconnect 5 detik lagi...');
      if (!loggedOut) setTimeout(() => start().catch(console.error), 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      const text = getText(msg);
      const cmd = text.toLowerCase();
      const media = getMediaMessage(msg);
      try {
        // ---- .ping ----
        if (cmd === `${config.prefix}ping`) {
          await sock.sendMessage(jid, { text: 'Pong! Bot WhatsApp aktif.' }, { quoted: msg });
          continue;
        }

        if (cmd === `${config.prefix}menu` || cmd === `${config.prefix}help`) {
          await sock.sendMessage(jid, { text:
`🤖 *${config.botName} - Bot Stiker*

${config.prefix}ping - cek bot aktif
${config.prefix}s - kirim/reply foto atau video -> stiker
#sticker - kirim/reply *video* -> Sound Sticker native WA (stiker beneran + suara, tap ikon audio buat putar). Video dipotong maks ${config.soundAnimatedMaxSeconds} detik
#sticker (cara 2) - kirim *foto* sambil reply *audio/VN* -> Sound Sticker dari foto + suara itu (maks ${config.soundStaticMaxSeconds} detik)
${config.prefix}svn - reply *video* -> stiker animasi + voice note (2 pesan, cara lama)
${config.prefix}menu - menu ini

Otomatis juga bisa: kirim *video* langsung (tanpa perintah) -> Sound Sticker, kirim *foto* langsung -> stiker biasa.

Catatan: Sound Sticker cuma bunyi di WhatsApp yang udah dapet fitur itu (Beta 2.26.47.1+).` }, { quoted: msg });
          continue;
        }

        const isStickerCmd = [`${config.prefix}s`, `${config.prefix}sticker`, `${config.prefix}stiker`].includes(cmd);
        const isSoundCmd = (cmd === '#sticker'); // perintah Sound Sticker: #sticker (tanpa prefix titik)
        const isStickerVnCmd = cmd === `${config.prefix}svn`;

        // AUTO-DETECT (config.autoDetect): tanpa perintah, media yang dikirim
        // langsung diproses - video -> Sound Sticker, foto -> stiker biasa.
        // Cuma media milik pesan ini sendiri (bukan reply) dan teksnya bukan perintah.
        let autoMode = null;
        if (config.autoDetect && !isStickerCmd && !isSoundCmd && !isStickerVnCmd && !cmd.startsWith(config.prefix)) {
          const { own } = getOwnAndQuotedMedia(msg);
          if (own?.type === 'video') autoMode = 'sound';
          else if (own?.type === 'image') autoMode = 'sticker';
        }
        const effStickerCmd = isStickerCmd || autoMode === 'sticker';
        const effSoundCmd = isSoundCmd || autoMode === 'sound';

        if (!effStickerCmd && !effSoundCmd && !isStickerVnCmd) continue;
        if (!media) {
          await sock.sendMessage(jid, { text: 'Kirim / reply foto atau videonya dulu, baru kasih perintah itu.' }, { quoted: msg });
          continue;
        }
        if (isStickerVnCmd && media.type !== 'video') {
          await sock.sendMessage(jid, { text: 'Mode .svn butuh *video*. Kalau mau Sound Sticker native, pakai #sticker.' }, { quoted: msg });
          continue;
        }

        await enqueue(jid, async () => {
          if (effSoundCmd || isStickerVnCmd) {
            await sock.sendMessage(jid, { text: 'Video masuk antrean. Sedang disiapkan menjadi stiker bersuara.' }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: 'Tunggu bentar, lagi disiapkan...' }, { quoted: msg });
          }

          const buffer = await downloadMediaMessage(msg.key.fromMe ? msg : { ...msg, message: media.raw.message }, 'buffer', {}, { logger });
          const inFile = tmpFile(media.type === 'video' ? '.mp4' : '.jpg');
          await writeFile(inFile, buffer);
          const outSticker = tmpFile('.webp');
          const outAudio = tmpFile('.ogg');
          const outVideo = tmpFile('.mp4');
          try {
            if (effSoundCmd) {
              // ===== SOUND STICKER NATIVE WA (fitur baru WhatsApp Beta 2.26.47.1+) =====
              // Format resmi baru: stiker WebP + track audio OGG Opus dalam SATU pesan
              // audioSticker, kirim pakai fork @pontalabs/baileys (Baileys resmi belum support).
              // Di chat tampil sebagai stiker beneran + ikon audio; tap ikonnya, suaranya bunyi.
              const { own, quoted } = getOwnAndQuotedMedia(msg);
              // Fallback: pakai hasil deteksi media utama (cara lama) - termasuk video
              // yang dikirim dengan caption #sticker langsung / di-reply.
              const fallback = media && (media.type === 'image' || media.type === 'video') ? media : null;
              const visual = [own, quoted, fallback].find((m) => m && (m.type === 'image' || m.type === 'video'));
              const sepAudio = [own, quoted, media].find((m) => m && m.type === 'audio');
              if (!visual) {
                console.log('DEBUG #sticker visual tidak ketemu. keys pesan:', Object.keys(unwrapMessage(msg.message || {})), '| own:', own?.type, '| quoted:', quoted?.type, '| media:', media?.type);
                await sock.sendMessage(jid, { text: 'Botnya gagal membaca media di pesan itu. Coba cara ini: kirim ulang videonya langsung ke chat bot (bukan reply), caption-nya #sticker.' }, { quoted: msg });
                return;
              }
              console.log('DEBUG #sticker visual:', visual.type, '| audio terpisah:', sepAudio?.type || '-');
              const vBuf = await downloadMediaOf(msg, visual, logger);
              const vFile = tmpFile(visual.type === 'video' ? '.mp4' : '.jpg');
              await writeFile(vFile, vBuf);
              const extraFiles = [vFile];
              try {
                let animated = false;
                let seconds;
                if (visual.type === 'video') {
                  // Animasi: batas WA 5 detik buat stiker + audio
                  animated = true;
                  seconds = config.soundAnimatedMaxSeconds;
                  await videoToSticker(vFile, outSticker, { seconds });
                  await videoToVoiceNote(vFile, outAudio, seconds);
                } else {
                  // Gambar diam: batas WA 10 detik audio, suaranya dari audio/VN yang di-reply
                  seconds = config.soundStaticMaxSeconds;
                  await imageToSticker(vFile, outSticker);
                  if (!sepAudio) {
                    await sock.sendMessage(jid, { text: 'Foto doang gak ada suaranya. Caranya: kirim foto ini sambil *reply* pesan audio / voice note, caption-nya #sticker. Atau sekalian kirim video bersuara.' }, { quoted: msg });
                    return;
                  }
                  const aBuf = await downloadMediaOf(msg, sepAudio, logger);
                  const aFile = tmpFile('.ogg');
                  extraFiles.push(aFile);
                  await writeFile(aFile, aBuf);
                  await videoToVoiceNote(aFile, outAudio, seconds);
                }
                const stickerBuf = await applyStickerWm(outSticker);
                const audioBuf = await readFile(outAudio);
                await sock.sendMessage(jid, {
                  audioSticker: { sticker: stickerBuf, audio: audioBuf, animated, seconds, packname: config.packname, author: config.author },
                });
              } finally {
                await cleanup(...extraFiles);
              }
            } else if (media.type === 'video') {
              await videoToSticker(inFile, outSticker);
              await applyStickerWm(outSticker);
              await sock.sendMessage(jid, { sticker: { url: outSticker } });
              if (isStickerVnCmd) {
                // Mode lama: stiker WebP + suaranya dikirim sebagai voice note setelahnya.
                await videoToVoiceNote(inFile, outAudio);
                await sock.sendMessage(jid, { audio: { url: outAudio }, ptt: true, mimetype: 'audio/ogg; codecs=opus' });
              }
            } else {
              await imageToSticker(inFile, outSticker);
              await applyStickerWm(outSticker);
              await sock.sendMessage(jid, { sticker: { url: outSticker } });
            }
          } finally {
            await cleanup(inFile, outSticker, outAudio, outVideo);
          }
        });
      } catch (e) {
        console.error(e);
        const noFfmpeg = e?.code === 'ENOENT' && /ffmpeg/i.test(String(e?.path || e?.message || ''));
        await sock.sendMessage(jid, { text: noFfmpeg
          ? 'Server bot belum ada ffmpeg-nya, jadi belum bisa bikin stiker. Admin: install ffmpeg / taruh ffmpeg.exe di folder bot, lalu restart.'
          : 'Yah gagal bikin stikernya. Coba video yang lebih pendek / kecil ya.' }, { quoted: msg }).catch(() => {});
      }
    }
  });
}

start();
