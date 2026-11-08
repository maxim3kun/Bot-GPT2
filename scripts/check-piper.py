"""Offline CPU-only Piper evaluation; does not connect to Discord or change its voice.

Setup: python -m piper.download_voices fr_FR-siwis-medium \
    --download-dir generated-artifacts/piper/models
Run: python scripts/check-piper.py
"""
import importlib.metadata
import json
from pathlib import Path
import resource
import socket
import time
import wave
from unittest.mock import patch

import numpy as np
import onnxruntime as ort
from piper import PiperVoice
from piper.config import PiperConfig

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated-artifacts" / "piper"
MODEL = OUT / "models" / "fr_FR-siwis-medium.onnx"
SAMPLES = [
    (
        "voix-francaise-piper.wav",
        "Bonjour ! Je suis Maxime GPT. Cette voix française est générée directement "
        "sur le serveur, sans service de synthèse vocale payant. Je peux parler de "
        "Pokémon, répondre à tes questions et discuter avec toi.",
    ),
    (
        "voix-francaise-pokemon.wav",
        "Flambusard est un Pokémon de type Feu et Vol. Son talent caché est "
        "Ailes Bourrasque. Tu préfères une explication courte ou une fiche détaillée ?",
    ),
]


def no_network(*_args, **_kwargs):
    raise RuntimeError("Network access is disabled during this local voice test")


def main():
    if not MODEL.is_file() or not Path(f"{MODEL}.json").is_file():
        raise SystemExit("Missing voice model. Download fr_FR-siwis-medium first (see script docstring).")
    OUT.mkdir(parents=True, exist_ok=True)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    report = {
        "piper_version": importlib.metadata.version("piper-tts"),
        "voice": "fr_FR-siwis-medium",
        "network_disabled_during_synthesis": True,
        "cpu_threads": 2,
        "model_bytes": MODEL.stat().st_size,
        "voice_model_source": "https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium",
        "dataset_license": "CC-BY-4.0",
        "samples": [],
    }
    with patch.object(socket, "create_connection", no_network), patch.object(socket.socket, "connect", no_network):
        start = time.perf_counter()
        with open(f"{MODEL}.json", encoding="utf-8") as file:
            config = PiperConfig.from_dict(json.load(file))
        voice = PiperVoice(
            config=config,
            session=ort.InferenceSession(str(MODEL), sess_options=options, providers=["CPUExecutionProvider"]),
            download_dir=MODEL.parent,
        )
        report["model_load_seconds"] = round(time.perf_counter() - start, 3)
        for filename, text in SAMPLES:
            output = OUT / filename
            start = time.perf_counter()
            with wave.open(str(output), "wb") as wav:
                voice.synthesize_wav(text, wav)
            elapsed = time.perf_counter() - start
            with wave.open(str(output), "rb") as wav:
                duration = wav.getnframes() / wav.getframerate()
                assert wav.getsampwidth() == 2 and wav.getnchannels() == 1
                pcm = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2")
                assert duration > 1 and pcm.size and np.max(np.abs(pcm.astype(np.int32))) > 100
                rate = wav.getframerate()
            report["samples"].append({
                "file": str(output.relative_to(ROOT)),
                "text": text,
                "generation_seconds": round(elapsed, 3),
                "audio_seconds": round(duration, 3),
                "real_time_factor": round(elapsed / duration, 3),
                "sample_rate": rate,
                "bytes": output.stat().st_size,
            })
    report["peak_process_memory_mib"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1)
    (OUT / "benchmark.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
