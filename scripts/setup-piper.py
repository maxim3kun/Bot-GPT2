"""Install the allowlisted Piper models at build time, not on a Discord request."""
import hashlib
import json
from pathlib import Path
import shutil
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / ".piper" / "models"
CATALOG = json.loads((ROOT / "config/piper-voices.json").read_text())
BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/"


def checksum(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "md5").hexdigest()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for voice in CATALOG["voices"]:
        for suffix in (".onnx", ".onnx.json"):
            name = voice["model"] + suffix
            target = DEST / name
            if target.exists():
                if suffix == ".onnx" and checksum(target) == voice["md5"]:
                    continue
                if suffix == ".onnx.json":
                    try:
                        json.loads(target.read_text())
                        continue
                    except (ValueError, OSError):
                        pass
            # Reuse the previous local evaluation download when available.
            sample = ROOT / "generated-artifacts/piper/models" / name
            temporary = target.with_suffix(target.suffix + ".part")
            try:
                if sample.is_file() and (suffix != ".onnx" or checksum(sample) == voice["md5"]):
                    shutil.copyfile(sample, temporary)
                else:
                    url = BASE + voice["path"] + "/" + name
                    with urllib.request.urlopen(url, timeout=120) as response, temporary.open("wb") as file:
                        shutil.copyfileobj(response, file)
                if suffix == ".onnx":
                    if checksum(temporary) != voice["md5"]:
                        raise RuntimeError(f"Invalid model checksum: {name}")
                else:
                    json.loads(temporary.read_text())
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
        print(f"Ready: {voice['name']}", flush=True)


if __name__ == "__main__":
    main()
