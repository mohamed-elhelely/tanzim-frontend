"""
Builds the narrated app-tour videos (Arabic and English) from real Tanzim screens.

Per language:
  1. capture every scene's screens from the running app (capture_app.py, Edge headless)
  2. render the title card, end card and one on-screen label per scene (HTML -> PNG, so Arabic shapes correctly)
  3. synthesize the narration of each scene
       --voice azure   : Azure Speech neural voices (natural). Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.
       --voice voicetut: VoiceTut-TTS, free and local on the GPU, natural Egyptian Arabic (default).
                         Needs its own environment: see README (python at ~/.tanzim/voicetut-venv).
       --voice windows : offline Windows voices (robotic; only for previewing timing and visuals)
  4. encode each screen with a slow zoom, add the label, join scenes, add subtitles
Outputs next to index.html: video/tanzim-tour-<lang>.mp4 / .srt / .vtt

Usage (app on :4200 with the API behind it, demo data loaded with seed_demo_data.py):
  set TANZIM_EMAIL / TANZIM_PASSWORD (company admin) and TANZIM_STAFF_EMAIL / TANZIM_STAFF_PASSWORD (platform staff)
  set AZURE_SPEECH_KEY=<key>  and  AZURE_SPEECH_REGION=<region, e.g. westeurope>
  python build_app_video.py --voice azure [--lang ar en] [--ar-voice ar-EG-ShakirNeural] [--en-voice en-US-AndrewNeural]
                            [--skip-capture] [--ffmpeg PATH]
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
DECK = HERE.parent
FPS = 30
LEAD, TAIL = 0.5, 0.7      # silence around each scene's narration
CARD = 3.2                 # seconds for the title and end cards
W, H = 1920, 1080


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode:
        sys.stderr.write((r.stderr or b"").decode("utf-8", "replace")[-3000:])
        sys.exit(f"failed: {Path(cmd[0]).name}")
    return r


def find_ffmpeg(arg):
    for c in (arg, os.environ.get("FFMPEG"), shutil.which("ffmpeg")):
        if c and Path(c).exists():
            return c
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg not found: pass --ffmpeg, set FFMPEG, or pip install imageio-ffmpeg")


def seconds(wav):
    with wave.open(str(wav)) as w:
        return w.getnframes() / float(w.getframerate())


# ---------------------------------------------------------------- voices
AZURE_FILE = Path.home() / ".tanzim" / "azure-speech.env"  # KEY=... and REGION=... lines, kept out of the repo


def azure_settings():
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if (not key or not region) and AZURE_FILE.exists():
        conf = dict(l.split("=", 1) for l in AZURE_FILE.read_text(encoding="utf-8").splitlines() if "=" in l)
        key = key or conf.get("KEY", "").strip()
        region = region or conf.get("REGION", "").strip()
    if not key or not region:
        sys.exit(f"Azure Speech is not configured: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION, or write KEY=... and "
                 f"REGION=... lines in {AZURE_FILE} (Azure portal > your Speech resource > Keys and Endpoint).")
    return key, region


def tts_azure(text, lang, voice, out):
    key, region = azure_settings()
    locale = "ar-EG" if lang == "ar" else "en-US"
    ssml = (f"<speak version='1.0' xml:lang='{locale}' xmlns='http://www.w3.org/2001/10/synthesis'>"
            f"<voice name='{voice}'><prosody rate='{'-2%' if lang == 'ar' else '0%'}'>{escape(text)}</prosody></voice></speak>")
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", data=ssml.encode("utf-8"),
        headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "tanzim-video"})
    with urllib.request.urlopen(req) as r:
        out.write_bytes(r.read())


def tts_windows(items, lang, outdir):
    js = outdir / "items.json"
    js.write_text(json.dumps([{"n": i + 1, "id": s["id"], lang: s["say"][lang]} for i, s in enumerate(items)],
                             ensure_ascii=False), encoding="utf-8")
    run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(HERE / "tts.ps1"),
         "-Json", str(js), "-Lang", lang, "-OutDir", str(outdir)])


# ---------------------------------------------------------------- overlays (HTML -> PNG)
CARD_CSS = """
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600&display=swap');
* { margin: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; background: transparent; }
body { font-family: 'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif; }
[lang=ar] body, body[lang=ar] { font-family: 'IBM Plex Sans Arabic', sans-serif; }
.card { width: 1920px; height: 1080px; display: flex; flex-direction: column; justify-content: center; gap: 28px;
  padding: 0 180px; color: #fff; background: radial-gradient(1200px 700px at 80% 20%, #4f46e5 0%, transparent 60%),
  linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #1e1b4b 100%); }
.logo { width: 120px; height: 120px; border-radius: 28px; background: #fff; color: #4338ca; display: grid; place-items: center;
  font: 700 76px 'IBM Plex Sans Arabic'; }
.card h1 { font-size: 92px; line-height: 1.1; font-weight: 700; }
.card p { font-size: 40px; color: #c7d2fe; max-width: 1300px; line-height: 1.45; }
.label { position: absolute; bottom: 70px; inset-inline-start: 70px; display: flex; align-items: center; gap: 18px;
  background: rgba(30, 27, 75, .92); color: #fff; padding: 18px 34px 18px 22px; border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,.25); }
.label b { display: grid; place-items: center; min-width: 64px; height: 64px; border-radius: 14px; background: #6366f1;
  font: 600 30px 'IBM Plex Sans'; padding: 0 10px; }
.label span { font-size: 44px; font-weight: 600; }
.chapter .num { font: 600 44px 'IBM Plex Sans'; color: #a5b4fc; letter-spacing: .08em; }
.chapter h1 { font-size: 110px; }
"""


def render_overlays(tour, lang, out, count):
    from playwright.sync_api import sync_playwright
    out.mkdir(parents=True, exist_ok=True)
    d = "rtl" if lang == "ar" else "ltr"
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": W, "height": H})

        def shot(html, name, transparent):
            pg.set_content(f"<html lang='{lang}' dir='{d}'><head><style>{CARD_CSS}</style></head><body lang='{lang}'>{html}</body></html>")
            pg.wait_for_timeout(600)
            pg.evaluate("document.fonts.ready")
            pg.screenshot(path=str(out / name), omit_background=transparent)

        shot(f"<div class='card'><div class='logo'>ت</div><h1>{tour['title'][lang]}</h1><p>{tour['subtitle'][lang]}</p></div>",
             "title.png", False)
        end = {"en": "Thanks for watching", "ar": "شكرًا إنك اتفرجت"}[lang]
        shot(f"<div class='card'><div class='logo'>ت</div><h1>{end}</h1><p>{tour['subtitle'][lang]}</p></div>", "end.png", False)
        content = [s["id"] for s in tour["scenes"][1:-1] if not s.get("card")]
        part = {"en": "Part", "ar": "الجزء"}[lang]
        for s in tour["scenes"]:
            if s.get("card"):
                shot(f"<div class='card chapter'><div class='num'>{part} {s['chapter']}</div><h1>{s['label'][lang]}</h1></div>",
                     f"card-{s['id']}.png", False)
                continue
            n = f"{content.index(s['id']) + 1:02d} / {len(content):02d}" if s["id"] in content else "•"
            shot(f"<div class='label'><b dir='ltr'>{n}</b><span>{s['label'][lang]}</span></div>", f"label-{s['id']}.png", True)
        b.close()


# ---------------------------------------------------------------- subtitles
def sentences(text):
    parts = [p.strip() for p in re.split(r"(?<=[.!?؟،,])\s+", text) if p.strip()]
    out = []
    for p in parts:
        if out and (len(p) < 30 or len(out[-1]) < 30) and len(out[-1]) + len(p) < 95:
            out[-1] += " " + p
        else:
            out.append(p)
    return out


def spoken_sentences(text):
    return [p.strip() for p in re.split(r"(?<=[.!?؟])\s+", text) if p.strip()]


def ts(sec, sep):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"


# ---------------------------------------------------------------- video
def still_clip(ff, png, dur, out, label=None, zoom=True):
    frames = max(1, int(round(dur * FPS)))
    chain = (f"[0:v]scale={W * 2}:{H * 2},zoompan=z='1+0.045*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
             f":d={frames}:s={W}x{H}:fps={FPS}" if zoom else f"[0:v]scale={W}:{H},fps={FPS}")
    chain += f",fade=t=in:st=0:d=0.35,fade=t=out:st={max(0, dur - 0.3):.3f}:d=0.3,format=yuv420p"
    inputs = ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(png)]
    if label:
        inputs += ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(label)]
        until = min(dur - 0.4, 5.0)
        flt = (f"{chain}[bg];[1:v]format=rgba,fade=t=in:st=0.4:d=0.4:alpha=1,"
               f"fade=t=out:st={until:.2f}:d=0.4:alpha=1[lb];[bg][lb]overlay=0:0:format=auto,format=yuv420p[v]")
    else:
        flt = chain + "[v]"
    run([ff, "-y", *inputs, "-filter_complex", flt, "-map", "[v]", "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "medium", "-crf", "25", "-r", str(FPS), "-an", str(out)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", choices=["voicetut", "azure", "windows"], default="voicetut")
    ap.add_argument("--ar-speaker", default="Mohamed", help="VoiceTut speaker for Arabic")
    ap.add_argument("--en-speaker", default="Mohamed", help="VoiceTut speaker for English")
    ap.add_argument("--tts-python", default=str(Path.home() / ".tanzim" / "voicetut-venv" / "Scripts" / "python.exe"))
    ap.add_argument("--lang", nargs="+", default=["ar", "en"], choices=["ar", "en"])
    ap.add_argument("--ar-voice", default="ar-EG-ShakirNeural")
    ap.add_argument("--en-voice", default="en-US-AndrewNeural")
    ap.add_argument("--tour", default=str(HERE / "app_tour.json"))
    ap.add_argument("--base", default="http://localhost:4200")
    ap.add_argument("--work", default=str(Path(tempfile.gettempdir()) / "tanzim-tour-work"))
    ap.add_argument("--ffmpeg")
    ap.add_argument("--skip-capture", action="store_true")
    ap.add_argument("--suffix", default="", help="added to output names, e.g. -preview")
    a = ap.parse_args()

    ff = find_ffmpeg(a.ffmpeg)
    tour = json.loads(Path(a.tour).read_text(encoding="utf-8"))
    scenes = tour["scenes"]
    work = Path(a.work)
    (DECK / "video").mkdir(exist_ok=True)

    for lang in a.lang:
        L = work / lang
        shots_dir, ov_dir, wav_dir, clip_dir = L / "shots", L / "overlays", L / "wav", L / "clips"
        for d in (shots_dir, ov_dir, wav_dir, clip_dir):
            d.mkdir(parents=True, exist_ok=True)

        if not a.skip_capture:
            print(f"[{lang}] capturing screens")
            shots = [{**sh, "name": f"{s['id']}-{i}"} for s in scenes if not s.get("card") for i, sh in enumerate(s["shots"])]
            (L / "shots.json").write_text(json.dumps(shots), encoding="utf-8")
            run([sys.executable, str(HERE / "capture_app.py"), "--shots", str(L / "shots.json"), "--lang", lang,
                 "--out", str(shots_dir), "--base", a.base])

        print(f"[{lang}] overlays")
        render_overlays(tour, lang, ov_dir, len(scenes))

        print(f"[{lang}] voice ({a.voice})")
        if a.voice == "windows":
            tts_windows(scenes, lang, wav_dir)
        if a.voice == "voicetut":
            jobs = {"speaker": a.ar_speaker if lang == "ar" else a.en_speaker, "num_step": 32, "guidance_scale": 2.5,
                    "pause": 0.3, "language": "Egyptian" if lang == "ar" else "English",
                    "jobs": [{"sentences": spoken_sentences(s["say"][lang]),
                              "out": str(wav_dir / f"{i + 1:02d}-{s['id']}.wav")} for i, s in enumerate(scenes)]}
            (wav_dir / "jobs.json").write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")
            r = subprocess.run([a.tts_python, str(HERE / "voicetut_say.py"), str(wav_dir / "jobs.json")])
            if r.returncode:
                sys.exit("VoiceTut failed (see the output above)")
        for i, s in enumerate(scenes):
            wav = wav_dir / f"{i + 1:02d}-{s['id']}.wav"
            if a.voice == "azure":
                tts_azure(s["say"][lang], lang, a.ar_voice if lang == "ar" else a.en_voice, wav)
            s["_wav"] = wav

        print(f"[{lang}] encoding")
        parts, cues, t = [], [], 0.0
        title = clip_dir / "000-title.mp4"
        still_clip(ff, ov_dir / "title.png", CARD, title, zoom=False)
        parts.append((title, None, CARD))
        t += CARD
        for i, s in enumerate(scenes):
            speech = seconds(s["_wav"])
            total = LEAD + speech + TAIL
            if s.get("card"):
                clip = clip_dir / f"{i + 1:02d}-{s['id']}.mp4"
                still_clip(ff, ov_dir / f"card-{s['id']}.png", total, clip, zoom=False)
                parts.append(([clip], s["_wav"], total))
                t += total
                continue
            n = len(s["shots"])
            vids = []
            for k in range(n):
                dur = total / n
                clip = clip_dir / f"{i + 1:02d}-{s['id']}-{k}.mp4"
                still_clip(ff, shots_dir / f"{s['id']}-{k}.png", dur, clip,
                           label=ov_dir / f"label-{s['id']}.png" if k == 0 else None)
                vids.append(clip)
            parts.append((vids, s["_wav"], total))
            timing = Path(str(s["_wav"]) + ".json")
            if timing.exists():  # exact sentence times from VoiceTut; long sentences split at commas by length
                for c in json.loads(timing.read_text(encoding="utf-8")):
                    pieces = sentences(c["text"])
                    chars = sum(len(x) for x in pieces) or 1
                    start = t + LEAD + c["start"]
                    for x in pieces:
                        d = (c["end"] - c["start"]) * len(x) / chars
                        cues.append((start, start + d, x))
                        start += d
            else:
                start = t + LEAD
                segs = sentences(s["say"][lang])
                chars = sum(len(x) for x in segs) or 1
                for x in segs:
                    d = speech * len(x) / chars
                    cues.append((start, start + d, x))
                    start += d
            t += total
        end = clip_dir / "999-end.mp4"
        still_clip(ff, ov_dir / "end.png", CARD, end, zoom=False)
        parts.append((end, None, CARD))
        t += CARD

        # each part: its video clips + its audio (narration padded, or silence) -> one segment with sound
        seg_list = []
        for j, (vid, wav, dur) in enumerate(parts):
            vids = vid if isinstance(vid, list) else [vid]
            lst = clip_dir / f"seg{j:03d}.txt"
            lst.write_text("\n".join(f"file '{v.as_posix()}'" for v in vids), encoding="utf-8")
            seg = clip_dir / f"seg{j:03d}.mp4"
            audio = (["-i", str(wav)] if wav else ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono"])
            af = (f"[1:a]aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad[a]" if wav else "[1:a]anull[a]")
            run([ff, "-y", "-f", "concat", "-safe", "0", "-i", str(lst), *audio, "-filter_complex", af,
                 "-map", "0:v", "-map", "[a]", "-t", f"{dur:.3f}", "-c:v", "copy",
                 "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "1", str(seg)])
            seg_list.append(seg)
        all_txt = clip_dir / "all.txt"
        all_txt.write_text("\n".join(f"file '{p.as_posix()}'" for p in seg_list), encoding="utf-8")
        joined = clip_dir / "joined.mp4"
        run([ff, "-y", "-f", "concat", "-safe", "0", "-i", str(all_txt), "-c", "copy", str(joined)])

        name = f"tanzim-tour-{lang}{a.suffix}"
        srt, vtt = DECK / "video" / f"{name}.srt", DECK / "video" / f"{name}.vtt"
        srt.write_text("\n".join(f"{i}\n{ts(s, ',')} --> {ts(e, ',')}\n{x}\n" for i, (s, e, x) in enumerate(cues, 1)), encoding="utf-8")
        vtt.write_text("WEBVTT\n\n" + "\n".join(f"{ts(s, '.')} --> {ts(e, '.')}\n{x}\n" for s, e, x in cues), encoding="utf-8")
        out = DECK / "video" / f"{name}.mp4"
        code = "ara" if lang == "ar" else "eng"
        run([ff, "-y", "-i", str(joined), "-i", str(srt), "-map", "0", "-map", "1", "-c", "copy", "-c:s", "mov_text",
             "-metadata", f"title={tour['title'][lang]}", "-metadata:s:a:0", f"language={code}",
             "-metadata:s:s:0", f"language={code}", "-movflags", "+faststart", str(out)])
        print(f"[{lang}] {out}  {t / 60:.1f} min  {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
