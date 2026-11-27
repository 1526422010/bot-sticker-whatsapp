// Nulis metadata "WM" stiker WhatsApp ke dalam file WebP: nama pack + publisher/author.
// Ini yang dibaca WhatsApp pas stiker di-tap / dibuka detailnya:
//   tampilannya:  "<sticker-pack-name> • <sticker-pack-publisher>"
// Format tampilannya: "<nama pack> • <publisher>", dua-duanya diambil dari config.js
// Murni manipulasi chunk WebP (RIFF), tanpa library tambahan.

function buildExifPayload({ packId, packname, author, emojis }) {
  const json = Buffer.from(JSON.stringify({
    'sticker-pack-id': packId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': emojis && emojis.length ? emojis : ['🔊'],
  }), 'utf8');
  // Header TIFF minimal yang dipakai format EXIF stiker WA (tag 0x5741)
  const header = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  header.writeUIntLE(json.length, 14, 4);
  return Buffer.concat([header, json]);
}

/**
 * Sisipkan EXIF (pack name + publisher) ke buffer WebP. Return buffer baru.
 * Chunk EXIF lama (kalau ada) dibuang dulu, flag EXIF di VP8X dinyalakan,
 * ukuran RIFF dihitung ulang. Frame animasi tidak diubah sama sekali.
 */
export function addStickerExif(webpBuffer, { packname, author, packId = 'bot-stiker-wa', emojis } = {}) {
  if (webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('File bukan WebP');
  }
  const payload = buildExifPayload({ packId, packname, author, emojis });
  const chunks = [];
  let offset = 12;
  while (offset + 8 <= webpBuffer.length) {
    const fourcc = webpBuffer.toString('ascii', offset, offset + 4);
    const size = webpBuffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > webpBuffer.length) break;
    if (fourcc !== 'EXIF') {
      let data = webpBuffer.subarray(dataStart, dataEnd);
      if (fourcc === 'VP8X' && data.length > 0) {
        // Nyalakan flag "EXIF present" (bit 3) di VP8X
        data = Buffer.from(data);
        data[0] = data[0] | 0x08;
      }
      chunks.push({ fourcc, data });
    }
    offset = dataEnd + (size % 2); // chunk genap selalu di-align 2 byte
  }
  chunks.push({ fourcc: 'EXIF', data: payload });

  const parts = [Buffer.from('WEBP')];
  for (const c of chunks) {
    const sizeBuf = Buffer.alloc(4);
    sizeBuf.writeUInt32LE(c.data.length, 0);
    parts.push(Buffer.from(c.fourcc, 'ascii'), sizeBuf, c.data);
    if (c.data.length % 2) parts.push(Buffer.from([0]));
  }
  const body = Buffer.concat(parts);
  const riffSize = Buffer.alloc(4);
  riffSize.writeUInt32LE(body.length, 0); // ukuran RIFF = total file - 8
  return Buffer.concat([Buffer.from('RIFF'), riffSize, body]);
}
