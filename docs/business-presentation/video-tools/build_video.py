"""
Builds the narrated explainer videos (Arabic and English) from the business deck.

Steps, per language:
  1. export the slides and narration (node export_narration.js)
  2. synthesize one WAV per slide with the offline Windows voices (tts.ps1)
  3. screenshot each slide with headless Edge from the deck's capture mode (?capture=1&lang=..&slide=..)
  4. encode a still-image segment per slide with its narration, join them, and add subtitles
Outputs (next to index.html):
  video/tanzim-<lang>.mp4, video/tanzim-<lang>.srt, video/tanzim-<lang>.vtt   the videos and subtitles
  audio/<lang>/<nn>-<id>.mp3                                                 per-slide narration for the deck's Narrate mode

Usage (the deck must be served over HTTP, e.g. `python -m http.server 8765 -d docs/business-presentation`):
  python build_video.py [--lang ar en] [--url http://localhost:8765/] [--ffmpeg PATH] [--edge PATH]
                        [--size 1920x1080] [--skip-tts] [--skip-shots]
ffmpeg: --ffmpeg, the FFMPEG env var, ffmpeg on PATH, or the imageio-ffmpeg package (`pip install imageio-ffmpeg`).
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
DECK = HERE.parent
LEAD, TAIL = 0.45, 0.85  # seconds of silence before and after each slide's narration
SILENT = 2.6  # seconds for a slide without narration


def find_ffmpeg(arg):
    for c in (arg, os.environ.get("FFMPEG"), shutil.which("ffmpeg")):
        if c and Path(c).exists():
            return c
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg not found: pass --ffmpeg, set FFMPEG, or pip install imageio-ffmpeg")


def find_edge(arg):
    cands = [arg, os.environ.get("EDGE"),
             r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
             r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
             shutil.which("msedge"), shutil.which("chrome"), shutil.which("google-chrome")]
    for c in cands:
        if c and Path(c).exists():
            return c
    sys.exit("Edge or Chrome not found: pass --edge")


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        sys.stderr.write((r.stderr or b"").decode("utf-8", "replace")[-3000:])
        sys.exit(f"failed: {cmd[0]}")
    return r


def wav_seconds(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / float(w.getframerate())


def ts(sec, sep):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"


def sentences(text):
    parts = [p.strip() for p in re.split(r"(?<=[.!?؟،:])\s+", text) if p.strip()]
    # keep cues readable: merge very short pieces into the previous one
    out = []
    for p in parts:
        if out and (len(p) < 28 or len(out[-1]) < 28) and len(out[-1]) + len(p) < 110:
            out[-1] += " " + p
        else:
            out.append(p)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", nargs="+", default=["ar", "en"], choices=["ar", "en"])
    ap.add_argument("--url", default="http://localhost:8765/")
    ap.add_argument("--ffmpeg")
    ap.add_argument("--edge")
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--work", default=str(Path(tempfile.gettempdir()) / "tanzim-video-work"))
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--skip-shots", action="store_true")
    a = ap.parse_args()

    ffmpeg, edge = find_ffmpeg(a.ffmpeg), find_edge(a.edge)
    work = Path(a.work)
    work.mkdir(parents=True, exist_ok=True)
    w, h = a.size.split("x")

    slides_json = work / "slides.json"
    r = run(["node", str(HERE / "export_narration.js"), str(DECK)])
    slides_json.write_bytes(r.stdout)
    slides = json.loads(r.stdout.decode("utf-8"))
    print(f"{len(slides)} slides")

    for lang in a.lang:
        wavs, shots = work / lang / "wav", work / lang / "png"
        segs = work / lang / "seg"
        for d in (wavs, shots, segs, DECK / "audio" / lang, DECK / "video"):
            d.mkdir(parents=True, exist_ok=True)

        if not a.skip_tts:
            print(f"[{lang}] narration")
            run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(HERE / "tts.ps1"),
                 "-Json", str(slides_json), "-Lang", lang, "-OutDir", str(wavs)])

        if not a.skip_shots:
            print(f"[{lang}] screenshots")
            profile = work / "edge-profile"
            for s in slides:
                png = shots / f"{s['n']:02}-{s['id']}.png"
                url = f"{a.url}?capture=1&lang={lang}&slide={s['id']}"
                run([edge, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                     f"--user-data-dir={profile}", f"--window-size={w},{h}", "--force-device-scale-factor=1",
                     "--virtual-time-budget=6000", f"--screenshot={png}", url])

        print(f"[{lang}] encoding")
        cues, t, listing = [], 0.0, []
        for s in slides:
            stem = f"{s['n']:02}-{s['id']}"
            png, wav, seg = shots / f"{stem}.png", wavs / f"{stem}.wav", segs / f"{stem}.mp4"
            text = s[lang]
            if wav.exists() and text:
                speech = wav_seconds(wav)
                dur = LEAD + speech + TAIL
                audio_in = ["-i", str(wav)]
                af = f"[1:a]aresample=44100,adelay={int(LEAD * 1000)}:all=1,apad[a]"
                # per-slide mp3 for the deck's Narrate mode
                run([ffmpeg, "-y", "-i", str(wav), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "64k",
                     str(DECK / "audio" / lang / f"{stem}.mp3")])
                # subtitle cues: sentences spread over the speech by length
                parts = sentences(text)
                total = sum(len(p) for p in parts) or 1
                start = t + LEAD
                for p in parts:
                    d = speech * len(p) / total
                    cues.append((start, start + d, p))
                    start += d
            else:
                dur = SILENT
                audio_in = ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"]
                af = "[1:a]anull[a]"
            run([ffmpeg, "-y", "-loop", "1", "-framerate", "30", "-i", str(png), *audio_in,
                 "-filter_complex", f"[0:v]scale={w}:{h},format=yuv420p,fade=t=in:st=0:d=0.3[v];{af}",
                 "-map", "[v]", "-map", "[a]", "-t", f"{dur:.3f}",
                 "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", "24", "-r", "30",
                 "-c:a", "aac", "-b:a", "96k", "-ac", "1", "-ar", "44100", str(seg)])
            listing.append(f"file '{seg.as_posix()}'")
            t += dur

        srt = DECK / "video" / f"tanzim-{lang}.srt"
        vtt = DECK / "video" / f"tanzim-{lang}.vtt"
        srt.write_text("\n".join(f"{i}\n{ts(s, ',')} --> {ts(e, ',')}\n{p}\n" for i, (s, e, p) in enumerate(cues, 1)),
                       encoding="utf-8")
        vtt.write_text("WEBVTT\n\n" + "\n".join(f"{ts(s, '.')} --> {ts(e, '.')}\n{p}\n" for s, e, p in cues),
                       encoding="utf-8")

        concat = work / lang / "concat.txt"
        concat.write_text("\n".join(listing), encoding="utf-8")
        joined = work / lang / "joined.mp4"
        run([ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(joined)])
        out = DECK / "video" / f"tanzim-{lang}.mp4"
        title = "Tanzim ERP explained" if lang == "en" else "شرح نظام تنظيم"
        run([ffmpeg, "-y", "-i", str(joined), "-i", str(srt), "-map", "0", "-map", "1", "-c", "copy",
             "-c:s", "mov_text", "-metadata", f"title={title}",
             "-metadata:s:a:0", f"language={'ara' if lang == 'ar' else 'eng'}",
             "-metadata:s:s:0", f"language={'ara' if lang == 'ar' else 'eng'}",
             "-movflags", "+faststart", str(out)])
        print(f"[{lang}] {out}  {t / 60:.1f} min  {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
