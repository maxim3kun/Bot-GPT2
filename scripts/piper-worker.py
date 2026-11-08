"""One CPU-only voice at a time. JSON-lines stdin/stdout; no runtime downloads."""
import base64
import gc
import io
import json
from pathlib import Path
import sys
import wave
import ctypes

ROOT = Path(__file__).resolve().parents[1]
# Railway installs Python wheels here; Replit uses its managed Python packages.
sys.path.insert(0, str(ROOT / ".piper/python"))
# Make native ONNX wheel dependencies available in Railway's Nix environment.
for library in ("libstdc++.so.6", "libgomp.so.1"):
    native = Path.home() / ".nix-profile/lib" / library
    if native.is_file():
        ctypes.CDLL(str(native), mode=ctypes.RTLD_GLOBAL)
import onnxruntime as ort
from piper import PiperVoice
from piper.config import PiperConfig

CATALOG = json.loads((ROOT / "config/piper-voices.json").read_text())
VOICES = {voice["id"]: voice for voice in CATALOG["voices"]}
MODELS = ROOT / ".piper/models"
voice = None
voice_id = None


def synthesize(request):
    global voice, voice_id
    selected = request.get("voice")
    text = request.get("text")
    if selected not in VOICES or not isinstance(text, str) or not text.strip() or len(text) > 3000:
        raise ValueError("Invalid voice or text")
    if voice_id != selected:
        voice = None
        voice_id = None
        gc.collect()
        model = MODELS / (VOICES[selected]["model"] + ".onnx")
        config = PiperConfig.from_dict(json.loads(Path(str(model) + ".json").read_text()))
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        voice = PiperVoice(
            config=config,
            session=ort.InferenceSession(str(model), sess_options=options, providers=["CPUExecutionProvider"]),
            download_dir=MODELS,
        )
        voice_id = selected
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        voice.synthesize_wav(text, wav)
    audio = buffer.getvalue()
    if len(audio) > 8 * 1024 * 1024:
        raise ValueError("Generated audio exceeds the limit")
    return {"id": request["id"], "audio": base64.b64encode(audio).decode("ascii")}


for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        result = synthesize(request)
    except Exception as error:
        # Keep text, file paths and user data out of diagnostic responses.
        print(f"Piper synthesis failed: {type(error).__name__}", file=sys.stderr, flush=True)
        result = {"id": request.get("id"), "error": "Local voice synthesis failed"}
    print(json.dumps(result), flush=True)
