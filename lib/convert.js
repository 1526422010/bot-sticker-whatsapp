import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

// Cari ffmpeg dengan urutan:
// 1. env FFMPEG_PATH (kalau di-set)
// 2. file ffmpeg.exe / ffmpeg di folder project (cara paling gampang di Windows:
//    download ffmpeg.exe, taruh di sebelah index.js, selesai - tanpa edit PATH)
// 3. 'ffmpeg' dari PATH sistem (kalau sudah install beneran)
const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const localWin = path.join(projectRoot, 'ffmpeg.exe');
const localUnix = path.join(projectRoot, 'ffmpeg');
export const FFMPEG =
  process.env.FFMPEG_PATH || (existsSync(localWin) ? localWin : existsSync(localUnix) ? localUnix : 'ffmpeg');

export function checkFfmpeg() {
  return new Promise((resolve) => {
    const p = spawn(FFMPEG, ['-version']);
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
  });
}

function run(_cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-600)}`))
    );
  });
}

const scalePad = (size) =>
  `scale=${size}:${size}:force_original_aspect_ratio=decrease,` +
  `pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`;

/** Gambar -> stiker WebP statis 512x512 */
export async function imageToSticker(input, output) {
  await run('ffmpeg', [
    '-y', '-i', input,
    '-vf', scalePad(config.stickerSize),
    '-c:v', 'libwebp', '-lossless', '1', '-loop', '0', '-an',
    output,
  ]);
  return output;
}

/**
 * Video -> stiker WebP animasi (TANPA suara).
 * Format WebP stiker WA memang tidak bisa menyimpan audio - ini batasan WhatsApp,
 * bukan bug. Untuk stiker bersuara dipakai format Sound Sticker / pesan terpisah.
 */
// Video portrait/landscape di-CROP full 512x512 (bukan di-pad).
// Kalau di-pad, video portrait hasilnya kelihatan kayak foto kecil di tengah
// dengan ruang kosong gede di kanan-kiri - bukan kayak stiker.
const scaleCrop = (size) =>
  `scale=${size}:${size}:force_original_aspect_ratio=increase,` +
  `crop=${size}:${size},format=rgba`;

export async function videoToSticker(input, output, { fps = config.fps, quality = 55, seconds = config.maxVideoSeconds } = {}) {
  await run('ffmpeg', [
    '-y', '-i', input,
    '-t', String(seconds),
    '-vf', `fps=${fps},${scaleCrop(config.stickerSize)}`,
    '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(quality),
    '-preset', 'default', '-loop', '0', '-an', '-fps_mode', 'passthrough',
    output,
  ]);
  // Kalau kegedean, turunin kualitas/fps lalu coba lagi (maks 2x)
  const { size } = await stat(output);
  if (size > config.maxStickerKB * 1024 && quality > 25) {
    return videoToSticker(input, output, { fps: Math.max(10, fps - 5), quality: quality - 25, seconds });
  }
  return output;
}

/** Video / file audio -> audio voice note (.ogg / Opus, ptt) */
export async function videoToVoiceNote(input, output, seconds = config.maxVideoSeconds) {
  await run('ffmpeg', [
    '-y', '-i', input,
    '-t', String(seconds),
    '-vn', '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on',
    '-application', 'voip', '-ac', '1', '-ar', '48000',
    output,
  ]);
  return output;
}

/** Video -> video persegi 512x512 DENGAN suara (dikirim sebagai video note / ptv) */
export async function videoToSquareVideo(input, output) {
  await run('ffmpeg', [
    '-y', '-i', input,
    '-t', String(config.maxVideoSeconds),
    '-vf',
    `scale=${config.stickerSize}:${config.stickerSize}:force_original_aspect_ratio=increase,` +
      `crop=${config.stickerSize}:${config.stickerSize}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '26',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
    output,
  ]);
  return output;
}
