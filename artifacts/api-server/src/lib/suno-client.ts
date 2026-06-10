const SUNO_BASE_URL = "https://api.sunoapi.org";

export interface SunoClip {
  id: string;
  status: string;
  title?: string | null;
  audio_url?: string | null;
  stream_audio_url?: string | null;
  image_url?: string | null;
  duration?: number | null;
  tags?: string | null;
  prompt?: string | null;
}

export interface SunoTaskResult {
  taskId: string;
  status: string;
  clips: SunoClip[];
  done: boolean;
}

const DONE_STATUSES = new Set([
  "SUCCESS",
  "COMPLETE",
  "FIRST_SUCCESS",
  "TEXT_SUCCESS",
  "SUCCEEDED",
]);

const ERROR_STATUSES = new Set(["ERROR", "FAILED", "FAILURE"]);

function sunoHeaders(): Record<string, string> {
  const rawKey = process.env.SUNO_API_KEY;
  if (!rawKey) throw new Error("SUNO_API_KEY is not set");
  const apiKey = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
  if (!apiKey) throw new Error("SUNO_API_KEY contains only invalid characters");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function unwrap(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "code" in raw) {
    const env = raw as { code: number; data?: unknown; msg?: string };
    if (env.code !== 200) {
      throw new Error(`Suno API code ${env.code}: ${env.msg ?? "unknown error"}`);
    }
    return env.data;
  }
  return raw;
}

function extractTracks(sunoData: Record<string, unknown>[], status: string): SunoClip[] {
  return sunoData.map((track) => {
    const audioUrl =
      String(track.audioUrl ?? "").trim() ||
      String(track.sourceAudioUrl ?? "").trim() ||
      String(track.streamAudioUrl ?? "").trim() ||
      String(track.sourceStreamAudioUrl ?? "").trim() ||
      null;

    const imageUrl =
      String(track.imageUrl ?? "").trim() ||
      String(track.sourceImageUrl ?? "").trim() ||
      null;

    return {
      id: String(track.id ?? ""),
      status,
      title: track.title ? String(track.title) : null,
      audio_url: audioUrl,
      stream_audio_url:
        String(track.sourceStreamAudioUrl ?? track.streamAudioUrl ?? "").trim() || null,
      image_url: imageUrl,
      duration: track.duration != null ? Number(track.duration) : null,
      tags: track.tags ? String(track.tags) : null,
      prompt: track.prompt ? String(track.prompt) : null,
    };
  });
}

function parseRecordInfo(raw: unknown, taskId: string): SunoTaskResult {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const overallStatus = String(obj.status ?? "PENDING");

  let clips: SunoClip[] = [];

  const topResponse = obj.response as Record<string, unknown> | null | undefined;
  const topSunoData = Array.isArray(topResponse?.sunoData)
    ? (topResponse!.sunoData as Record<string, unknown>[])
    : [];

  if (topSunoData.length > 0) {
    clips = extractTracks(topSunoData, overallStatus);
  } else {
    const rawClips = Array.isArray(obj.clips) ? (obj.clips as Record<string, unknown>[]) : [];
    for (const rawClip of rawClips) {
      const clipStatus = String(rawClip.status ?? overallStatus);
      const response = rawClip.response as Record<string, unknown> | null | undefined;
      const sunoData = Array.isArray(response?.sunoData)
        ? (response!.sunoData as Record<string, unknown>[])
        : [];

      if (sunoData.length > 0) {
        clips.push(...extractTracks(sunoData, clipStatus));
      } else {
        clips.push({ id: String(rawClip.taskId ?? taskId), status: clipStatus });
      }
    }
  }

  const done = DONE_STATUSES.has(overallStatus.toUpperCase()) && clips.some((c) => c.audio_url);
  const isError = ERROR_STATUSES.has(overallStatus.toUpperCase());

  return { taskId, status: overallStatus, clips, done: done || isError };
}

export async function generateSong(options: {
  prompt: string;
  instrumental?: boolean;
  tags?: string;
  title?: string;
  callBackUrl?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    instrumental: options.instrumental ?? false,
    customMode: !!(options.tags || options.title),
    model: "V4_5",
  };
  if (options.tags) payload.tags = options.tags;
  if (options.title) payload.title = options.title;
  if (options.callBackUrl) payload.callBackUrl = options.callBackUrl;

  const res = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
    method: "POST",
    headers: sunoHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Suno generate failed: ${res.status} ${await res.text()}`);

  const raw: unknown = await res.json();
  const data = unwrap(raw) as Record<string, unknown>;
  const taskId = String(data?.taskId ?? data?.task_id ?? data?.id ?? "");
  if (!taskId) throw new Error("No taskId in Suno response");
  return taskId;
}

export async function pollSong(taskId: string): Promise<SunoTaskResult> {
  const res = await fetch(
    `${SUNO_BASE_URL}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: sunoHeaders() },
  );

  if (!res.ok) throw new Error(`Suno record-info failed: ${res.status} ${await res.text()}`);

  const raw: unknown = await res.json();
  const data = unwrap(raw);
  return parseRecordInfo(data, taskId);
}

export async function getCredits(): Promise<number> {
  const res = await fetch(`${SUNO_BASE_URL}/api/v1/generate/credit`, {
    headers: sunoHeaders(),
  });
  if (!res.ok) throw new Error(`Suno credits failed: ${res.status}`);
  const raw: unknown = await res.json();
  const data = unwrap(raw);
  return typeof data === "number" ? data : Number((data as Record<string, unknown>)?.credits_left ?? 0);
}
