# DownloaderPro

A free, open-source **video & image downloader** for YouTube, TikTok, Instagram,
Facebook and 1000+ other sites. Built with **Flask** + **yt-dlp** and a modern,
responsive web UI.

> For personal use only. Always respect copyright and each platform's Terms of Service.

## Features

- Paste any URL → preview thumbnail, title, uploader and duration
- Pick quality: best / 4K / 1080p / 720p / 480p … down to the lowest available
- Audio-only extraction (MP3 when ffmpeg is installed, otherwise original audio)
- Image / photo downloads (e.g. Instagram pictures)
- No login, no ads, no tracking — fully self-hosted
- Clean dark UI, mobile friendly

## Requirements

- Python 3.9+
- (Optional but recommended) **ffmpeg** — needed for merging high-res video+audio
  and for MP3 conversion. Without it, the app falls back to progressive formats.

## Setup

```bash
# 1. (optional) create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 2. install dependencies
pip install -r requirements.txt

# 3. run the server
python app.py
```

Then open <http://127.0.0.1:5000> in your browser.

### Installing ffmpeg (recommended)

- **Windows (winget):** `winget install Gyan.FFmpeg`
- **Windows (choco):** `choco install ffmpeg`
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

Restart `app.py` after installing so it detects ffmpeg.

## How it works

| Part        | Tech                         |
|-------------|------------------------------|
| Backend     | Flask (`app.py`)             |
| Extractor   | [yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| Frontend    | Vanilla HTML/CSS/JS (`static/`) |

- `POST /api/info` — returns metadata + available format options for a URL
- `GET  /api/download?url=...&choice=...` — downloads and streams the file back
- `GET  /api/health` — status + whether ffmpeg is available

## Project structure

```
downloaderpro/
├─ app.py              # Flask backend
├─ requirements.txt
├─ README.md
└─ static/
   ├─ index.html       # UI
   ├─ style.css
   └─ script.js
```

## Notes & limitations

- Some private/age-restricted content requires login cookies (not handled by default).
- Keep `yt-dlp` updated for best site support: `pip install -U yt-dlp`.
- Downloads are stored in a temp folder and auto-cleaned after serving.
