// Test konversi tanpa perlu konek WA: bikin video test 2 detik (gambar + bunyi bip),
// lalu ubah jadi stiker animasi + voice note + video persegi, dan cek hasilnya pakai ffprobe.
// Jalanin: npm run test-convert
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { imageToSticker, videoToSticker, videoToVoiceNote, videoToSquareVideo } from './lib/convert.js';

execFileSync('ffmpeg', ['-y',
  '-f', 'lavfi', '-i', 'testsrc2=size=640x640:rate=15:duration=2',
  '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2',
  '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', 'tmp/test.mp4',
], { stdio: 'inherit' });

await videoToSticker('tmp/test.mp4', 'tmp/hasil-stiker.webp');
await videoToVoiceNote('tmp/test.mp4', 'tmp/hasil-suara.ogg');
await videoToSquareVideo('tmp/test.mp4', 'tmp/hasil-video-bersuara.mp4');

for (const f of ['tmp/hasil-stiker.webp', 'tmp/hasil-suara.ogg', 'tmp/hasil-video-bersuara.mp4']) {
  const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=codec_name,width,height:format=duration', '-of', 'default=noprint_wrappers=1', f]).toString();
  console.log(`\n✅ ${f} (${(statSync(f).size / 1024).toFixed(1)} KB)\n${info}`);
}
console.log('\nSemua konversi OK. Stiker WebP tidak punya stream audio (memang begitu format WA), suaranya ada di file .ogg voice note.');
