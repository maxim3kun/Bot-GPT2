# Local French voice experiment

This is an offline test, not an active Discord voice provider. The bot keeps its
existing voice and voice workflow. No paid API is enabled.

## Reproduce

Install the Python dependencies declared in `pyproject.toml` with Replit's package
management. Then:

```sh
python -m piper.download_voices fr_FR-siwis-medium \
  --download-dir generated-artifacts/piper/models
python scripts/check-piper.py
```

The test restricts ONNX Runtime to two CPU threads, disables Python network
connections during model loading/synthesis, validates non-silent PCM WAV output
and records load time, synthesis time, audio duration and process peak memory.
Figures describe this container and these samples, not guaranteed production
latency. Peak memory includes Python, ONNX Runtime, the model and audio buffers.

Models, samples and benchmark reports are under `generated-artifacts/piper/`,
excluded from Git and publishing. This test model is not application storage.
Before production integration, choose durable model storage and an installation
strategy rather than relying on experimental files.

## Attribution and licenses

- Engine: [OHF Piper](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0.
- Voice: `fr_FR-siwis-medium`, French, 22,050 Hz, one speaker.
- [Voice model card](https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/siwis/medium/MODEL_CARD).
- [SIWIS dataset](https://datashare.is.ed.ac.uk/handle/10283/2353), CC-BY 4.0,
  as stated in the voice model card. Recheck all model/engine license and
  attribution requirements before distributing an integrated product.

Local synthesis has no per-call TTS API fee, but still uses hosting CPU, memory
and disk. This experiment does not make transcription or the conversational AI
local, unlimited or free.
