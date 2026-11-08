"""Offline integration check used both locally and during Railway image builds."""
import array
import base64
import io
import json
from pathlib import Path
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
guard = """
import socket, runpy, sys
def forbidden(*args, **kwargs):
    raise RuntimeError("Network disabled during voice synthesis")
socket.socket.connect = forbidden
socket.create_connection = forbidden
runpy.run_path(sys.argv[1], run_name="__main__")
"""
requests = [
    {"id": 1, "voice": "siwis", "text": "Bonjour, voici ma voix française par défaut."},
    {"id": 2, "voice": "gilles", "text": "Bonjour, je suis une autre voix pour votre persona."},
    {"id": 3, "voice": "../invalid", "text": "This must be rejected."},
    {"id": 4, "voice": "siwis", "text": "Je peux revenir à la voix de base."},
]
try:
    result = subprocess.run(
        [sys.executable, "-u", "-c", guard, str(ROOT / "scripts/piper-worker.py")],
        input="\n".join(map(json.dumps, requests)) + "\n",
        text=True, capture_output=True, timeout=90, check=True,
    )
except subprocess.CalledProcessError as error:
    print(error.stderr[-2500:], file=sys.stderr)
    raise SystemExit("Piper runtime check failed before app startup") from None
responses = [json.loads(line) for line in result.stdout.splitlines()]
assert len(responses) == len(requests)
for request, response in zip(requests, responses):
    assert request["id"] == response["id"]
    if request["id"] == 3:
        assert "error" in response
        continue
    audio = base64.b64decode(response["audio"])
    with wave.open(io.BytesIO(audio), "rb") as wav:
        assert wav.getnchannels() == 1 and wav.getsampwidth() == 2
        samples = array.array("h", wav.readframes(wav.getnframes()))
        assert len(samples) > wav.getframerate() and max(map(abs, samples)) > 100
        print(f"{request['voice']}: valid non-silent audio, {wav.getnframes() / wav.getframerate():.2f}s")
print("Offline synthesis, voice switching and invalid-voice recovery: OK")
