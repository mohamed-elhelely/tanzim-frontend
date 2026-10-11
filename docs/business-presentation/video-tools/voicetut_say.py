"""
Runs inside the VoiceTut environment (it needs torch + voicetut-tts). Synthesizes each job sentence by sentence,
joins the sentences with short natural pauses, and writes the WAV plus the timing of every sentence.

  python voicetut_say.py jobs.json
jobs.json: {"speaker": "Mohamed", "speed": 1.0, "num_step": 32, "guidance_scale": 2.5, "pause": 0.28,
            "jobs": [{"sentences": ["...", "..."], "out": "path.wav"}]}
Writes <out>.json next to each WAV: [{"text", "start", "end"}] in seconds.
"""
import inspect
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from voicetut_tts import VoiceTutTTS


def main():
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    tts = VoiceTutTTS.from_pretrained("mohammedaly22/VoiceTut-TTS")
    params = inspect.signature(tts.synthesize).parameters
    extra = {k: cfg[k] for k in ("num_step", "guidance_scale", "speed", "language") if k in cfg and k in params}
    tmp = Path(sys.argv[1]).with_suffix(".part.wav")
    for job in cfg["jobs"]:
        pieces, cues, t, rate = [], [], 0.0, None
        for text in job["sentences"]:
            tts.synthesize(text, speaker=cfg["speaker"], output=str(tmp), **extra)
            audio, rate = sf.read(str(tmp), dtype="float32")
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            audio = trim(audio, rate)
            cues.append({"text": text, "start": round(t, 3), "end": round(t + len(audio) / rate, 3)})
            pause = np.zeros(int(rate * cfg.get("pause", 0.28)), dtype="float32")
            pieces += [audio, pause]
            t += (len(audio) + len(pause)) / rate
        sf.write(job["out"], np.concatenate(pieces[:-1]), rate, subtype="PCM_16")
        Path(job["out"] + ".json").write_text(json.dumps(cues, ensure_ascii=False), encoding="utf-8")
        print("ok", Path(job["out"]).name, round(t, 1), flush=True)


def trim(audio, rate, threshold=0.01, keep=0.06):
    """Cut leading and trailing silence, keeping a short natural margin."""
    loud = np.where(np.abs(audio) > threshold)[0]
    if not len(loud):
        return audio
    margin = int(rate * keep)
    return audio[max(0, loud[0] - margin): loud[-1] + margin]


if __name__ == "__main__":
    main()
