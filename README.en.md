# WhatsApp Sound Sticker Bot 🤖🔊

**Language:** [Indonesia](README.md) | [English](README.en.md)

A WhatsApp sticker maker bot: send `.ping` and it replies Pong, send a photo /
short video and it becomes a sticker, and a video with audio becomes a
**Sound Sticker**.

## Sound Stickers (a WhatsApp feature)

A **Sound Sticker** is a WhatsApp sticker format that carries an audio track:
a sticker (WebP) + audio in ONE message, with a small audio icon in its corner —
tap the icon and the sound plays (loops 3x). The feature is available starting
with WhatsApp Beta for Android 2.26.47.1; on older WhatsApp versions the
sticker shows up without sound. Duration is configured in `config.js`
(`soundAnimatedMaxSeconds`).

This bot sends them using the **@pontalabs/baileys** fork (`audioSticker`),
because the official Baileys does not support this format yet. A fork is
third-party code with install scripts — use a secondary number dedicated to
the bot, not your main number.

Mode:
1. **`#sticker` from a video** — video -> animated WebP (full crop 512x512)
   + the video's original audio -> OGG Opus, sent as one `audioSticker`.

## Commands

| Command | Function |
|---|---|
| `.ping` | Check the bot is alive -> `Pong! Bot WhatsApp aktif.` |
| `.s` | Send/reply a photo or video -> sticker (animated for videos) |
| `#sticker` | Video -> native Sound Sticker |
| `.menu` | List of commands |
| *(automatic)* | Send a video directly (no command) -> Sound Sticker; send a photo directly -> regular sticker (controlled by `autoDetect` in `config.js`) |

## Running it

Requirements: **Node.js 20+** and **ffmpeg** installed.

> **Windows — `spawn ffmpeg ENOENT` error?** It means ffmpeg is missing / not on PATH.
> The easiest fix: download `ffmpeg.exe` (from https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip,
> take `bin/ffmpeg.exe` from inside the zip), **put that file in this project folder (next to `index.js`)**,
> then restart the bot. The bot automatically detects a local `ffmpeg.exe`.
> Alternative: `winget install Gyan.FFmpeg`, then **close & reopen the terminal** (required, so PATH refreshes),
> and verify with `ffmpeg -version`. The bot also stops at startup with a clear message if ffmpeg is not found,
> instead of failing in the middle of making a sticker.

```bash
# install ffmpeg (pick your OS)
# Ubuntu/Debian:  sudo apt install ffmpeg
# Windows:        winget install ffmpeg   (or download from ffmpeg.org)
# Termux:         pkg install nodejs ffmpeg

cd bot-stiker-wa
npm install
npm start
```

1. A QR code appears in the terminal -> scan it with WhatsApp on your phone: **Settings > Linked devices > Link a device**
2. The login is stored in the `auth/` folder — restarts don't need a new scan (never share this folder with anyone, it is the key to your WA account)
3. Chat the bot's number: send `.ping`, then send a 1-8 second video with the caption `#sticker`

Test the conversion without connecting to WA (uses an auto-generated test video):

```bash
npm run test-convert
# output: tmp/hasil-stiker.webp, tmp/hasil-suara.ogg, tmp/hasil-video-bersuara.mp4
```

## Settings

Edit `config.js`: bot name, sticker pack name, max video duration (default 8 seconds),
fps, and the sticker size limit.

## License

MIT — see the [LICENSE](LICENSE) file. Free to use & modify, as long as the
original author's name (Pakaw) is credited.

## Important notes

- Use a **secondary / bot-dedicated number**, not your main one. Baileys is an
  unofficial library — WhatsApp may restrict / block numbers it considers bots/spam.
  Don't spam, don't send bulk messages.
- Long/large videos get rejected by WA as stickers (limit ~1MB). This bot
  automatically lowers fps & quality when the result is too big.
- Running 24/7? Put it on a VPS / an always-on PC and run it with `pm2 start index.js`.
