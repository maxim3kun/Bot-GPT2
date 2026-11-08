# Piper voices: bot runtime and local evaluation

French Discord speech now uses local Piper by default. SIWIS is the base voice;
Gilles is the alternative. Non-French speech retains the existing Google TTS.
No paid voice API is enabled.

## Choosing voices

- `!voice list`: selection menu for the server's bot voice.
- `!voice siwis`, `!voice gilles`, `!voice default`: direct selection; Manage
  Server permission required. These settings are documented in `!help admin`.
- `!persona voice Azumi`: independent persona selection menu.
- `!persona voice Azumi gilles`: creator-only override.
- `!persona voice Azumi default`: remove the override and inherit the server's
  bot voice. Other personas and memories are unchanged.

The command prefix follows the server setting. Menus expire after two minutes,
are restricted to their author, and recheck permissions when clicked. Database
errors are reported, not presented as successful saves.

## Railway installation

The existing Nixpacks build installs `requirements-voice.txt` into `.piper/python`
without a virtual environment, verifies and downloads the two allowlisted models
into `.piper/models`, then runs `scripts/check-piper-runtime.py` before building the
Node bot. A new Railway build is necessary to apply these changes; changing files
locally does not update an already running Railway deployment.

The models are dependencies in the built Railway image, not files committed to
Git. Nothing needs to be uploaded to MongoDB. MongoDB stores only the selected
voice identifiers. Model files are approximately 121 MiB combined on disk.

Synthesis runs in one lazily started Python worker with two ONNX CPU threads.
Only one model remains loaded at a time. The global synthesis queue is bounded
to four requests, with a 45-second request timeout and worker shutdown after
60 seconds idle. Same-server playback does not overlap. Audio is transient in
memory, not saved to MongoDB or an audio history.

RAM is distinct from model storage: the previous SIWIS experiment measured
approximately 263 MiB for its synthesis process, on top of the Node bot's RAM.
That figure is not a guaranteed Railway memory limit or exact production usage.
Local generation has no per-phrase API charge, but uses Railway CPU/RAM/disk.

If Piper fails, the technician records the failure and the bot tries its existing
Google voice, announcing this fallback at most once per server every five
minutes. If that fails too, speech reports failure and persona replies retain
their existing text delivery path. There is no paid fallback.

The voice changes do not add a microphone conversation feature or change
existing Groq transcription quotas.

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

The original samples and reports remain under `generated-artifacts/piper/`,
excluded from Git. The runtime uses `.piper/models`, provisioned at build time:

```sh
python3 scripts/setup-piper.py
python3 scripts/check-piper-runtime.py
pnpm --filter @workspace/api-server run test:voices
```

The runtime check disables socket connections and verifies non-silent WAV output,
voice switching and recovery after an invalid voice request.

## Attribution and licenses

- Engine: [OHF Piper](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0.
- Voice: `fr_FR-siwis-medium`, French, 22,050 Hz, one speaker.
- [Voice model card](https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/siwis/medium/MODEL_CARD).
- [SIWIS dataset](https://datashare.is.ed.ac.uk/handle/10283/2353), CC-BY 4.0,
  as stated in the voice model card. Recheck all model/engine license and
  attribution requirements before distributing an integrated product.
- Gilles low: [model card](https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/gilles/low/MODEL_CARD),
  16,000 Hz, one speaker; [dataset by Bryan Park](https://www.kaggle.com/datasets/bryanpark/french-single-speaker-speech-dataset),
  CC0 according to the model card.
- Model download source: [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices).
  Models are used unmodified; the catalogue pins the published model MD5 digests
  for download integrity. Upstream engine source is available at the link above.

Local synthesis has no per-call TTS API fee, but still uses hosting CPU, memory
and disk. This experiment does not make transcription or the conversational AI
local, unlimited or free.
