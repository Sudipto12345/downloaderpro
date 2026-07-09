"""
DownloaderPro - open-source video/image downloader.

A small Flask backend that wraps yt-dlp to fetch media info and download
content from YouTube, TikTok, Instagram, Facebook and many other sites.
"""

from __future__ import annotations

import os
import re
import shutil
import tempfile
import threading
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "downloaderpro"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

HAS_FFMPEG = shutil.which("ffmpeg") is not None

app = Flask(__name__, static_folder=None)
CORS(app)

# Pretend to be a normal browser; helps with some extractors.
COMMON_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "ignoreerrors": False,
    "http_headers": {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        )
    },
}


def human_size(num: int | None) -> str | None:
    if not num:
        return None
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(num)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024
    return None


def human_duration(seconds: int | float | None) -> str | None:
    if not seconds:
        return None
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def safe_filename(name: str) -> str:
    name = re.sub(r"[\\/:*?\"<>|]+", "_", name or "download")
    return name.strip()[:120] or "download"


def build_format_options(info: dict) -> list[dict]:
    """Build a friendly, de-duplicated list of download options."""
    formats = info.get("formats") or []
    video_heights: dict[int, dict] = {}
    has_audio_only = False
    has_any_image = False

    for f in formats:
        vcodec = f.get("vcodec")
        acodec = f.get("acodec")
        height = f.get("height")
        # image / thumbnail style formats
        if f.get("ext") in {"jpg", "jpeg", "png", "webp"} and not height:
            has_any_image = True
            continue
        if vcodec and vcodec != "none" and height:
            # Prefer progressive (has audio) but accept any; we let yt-dlp merge.
            entry = video_heights.get(height)
            filesize = f.get("filesize") or f.get("filesize_approx")
            progressive = acodec and acodec != "none"
            if entry is None or (progressive and not entry["progressive"]):
                video_heights[height] = {
                    "height": height,
                    "filesize": filesize,
                    "progressive": bool(progressive),
                    "ext": f.get("ext"),
                }
        if vcodec in (None, "none") and acodec and acodec != "none":
            has_audio_only = True

    options: list[dict] = []

    # Best overall
    options.append(
        {
            "id": "best",
            "label": "Best quality (auto)",
            "kind": "video",
            "note": "Highest available video + audio",
        }
    )

    for height in sorted(video_heights.keys(), reverse=True):
        entry = video_heights[height]
        label = f"{height}p"
        if height >= 2160:
            label = f"4K ({height}p)"
        elif height >= 1440:
            label = f"2K ({height}p)"
        size = human_size(entry.get("filesize"))
        options.append(
            {
                "id": f"h{height}",
                "label": label,
                "kind": "video",
                "height": height,
                "note": size or "",
            }
        )

    if has_audio_only or formats:
        options.append(
            {
                "id": "audio",
                "label": "Audio only" + (" (MP3)" if HAS_FFMPEG else " (M4A/original)"),
                "kind": "audio",
                "note": "Extract sound track",
            }
        )

    if has_any_image or info.get("ext") in {"jpg", "jpeg", "png", "webp"}:
        options.append(
            {
                "id": "image",
                "label": "Image / Photo",
                "kind": "image",
                "note": "Download original picture",
            }
        )

    return options


def format_selector_for(choice: str) -> str:
    """Map a friendly choice id to a yt-dlp format selector string."""
    if choice == "best":
        if HAS_FFMPEG:
            return "bestvideo*+bestaudio/best"
        return "best[ext=mp4]/best"
    if choice == "audio":
        return "bestaudio/best"
    if choice == "image":
        return "best"
    m = re.match(r"h(\d+)", choice)
    if m:
        height = int(m.group(1))
        if HAS_FFMPEG:
            return f"bestvideo[height<={height}]+bestaudio/best[height<={height}]"
        return f"best[height<={height}][ext=mp4]/best[height<={height}]/best"
    return "best"


@app.get("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/<path:path>")
def static_files(path: str):
    return send_from_directory(STATIC_DIR, path)


@app.post("/api/info")
def api_info():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "Please provide a URL."}), 400

    opts = dict(COMMON_OPTS)
    opts["skip_download"] = True
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except DownloadError as exc:
        return jsonify({"error": _clean_err(str(exc))}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": _clean_err(str(exc))}), 500

    if info is None:
        return jsonify({"error": "Could not extract any media from that URL."}), 400

    # Playlist / multi-entry: use first entry for preview.
    if info.get("_type") == "playlist" and info.get("entries"):
        entries = [e for e in info["entries"] if e]
        info = entries[0] if entries else info

    thumb = info.get("thumbnail")
    if not thumb and info.get("thumbnails"):
        thumb = info["thumbnails"][-1].get("url")

    return jsonify(
        {
            "title": info.get("title") or "Untitled",
            "uploader": info.get("uploader") or info.get("channel") or info.get("uploader_id"),
            "thumbnail": thumb,
            "duration": human_duration(info.get("duration")),
            "extractor": info.get("extractor_key") or info.get("extractor"),
            "webpage_url": info.get("webpage_url") or url,
            "is_image": info.get("ext") in {"jpg", "jpeg", "png", "webp"},
            "options": build_format_options(info),
        }
    )


@app.get("/api/download")
def api_download():
    url = (request.args.get("url") or "").strip()
    choice = (request.args.get("choice") or "best").strip()
    if not url:
        return jsonify({"error": "Missing url."}), 400

    job_dir = DOWNLOAD_DIR / uuid.uuid4().hex
    job_dir.mkdir(parents=True, exist_ok=True)

    opts = dict(COMMON_OPTS)
    opts["format"] = format_selector_for(choice)
    opts["outtmpl"] = str(job_dir / "%(title).100s.%(ext)s")
    opts["restrictfilenames"] = False

    postprocessors = []
    if choice == "audio" and HAS_FFMPEG:
        postprocessors.append(
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        )
    if choice.startswith("h") and HAS_FFMPEG:
        opts["merge_output_format"] = "mp4"
    if choice == "best" and HAS_FFMPEG:
        opts["merge_output_format"] = "mp4"
    if postprocessors:
        opts["postprocessors"] = postprocessors

    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if info.get("_type") == "playlist" and info.get("entries"):
                info = next((e for e in info["entries"] if e), info)
    except DownloadError as exc:
        _cleanup(job_dir)
        return jsonify({"error": _clean_err(str(exc))}), 400
    except Exception as exc:  # noqa: BLE001
        _cleanup(job_dir)
        return jsonify({"error": _clean_err(str(exc))}), 500

    files = sorted(job_dir.glob("*"), key=lambda p: p.stat().st_size, reverse=True)
    files = [p for p in files if p.is_file()]
    if not files:
        _cleanup(job_dir)
        return jsonify({"error": "Download produced no file."}), 500

    out_file = files[0]
    title = safe_filename(info.get("title") or out_file.stem)
    download_name = f"{title}{out_file.suffix}"

    response = send_file(out_file, as_attachment=True, download_name=download_name)

    # Schedule cleanup after the response has been served.
    def _delayed_cleanup():
        import time

        time.sleep(60)
        _cleanup(job_dir)

    threading.Thread(target=_delayed_cleanup, daemon=True).start()
    return response


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "ffmpeg": HAS_FFMPEG})


def _cleanup(path: Path) -> None:
    try:
        shutil.rmtree(path, ignore_errors=True)
    except Exception:  # noqa: BLE001
        pass


def _clean_err(msg: str) -> str:
    msg = re.sub(r"\x1b\[[0-9;]*m", "", msg)  # strip ANSI colors
    msg = msg.replace("ERROR: ", "").strip()
    if "Unsupported URL" in msg:
        return "This URL is not supported."
    if "Private" in msg or "login" in msg.lower():
        return "This content is private or requires login."
    return msg[:300]


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    print(f" * DownloaderPro running at http://127.0.0.1:{port}  (ffmpeg: {HAS_FFMPEG})")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
