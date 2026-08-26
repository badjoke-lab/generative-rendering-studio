export type CanvasRecordingResult = {
  blob: Blob;
  extension: "webm" | "mp4";
  mimeType: string;
};

export type CanvasRecordingCapability = {
  supported: boolean;
  preferredMimeType?: string;
  preferredExtension?: "webm" | "mp4";
};

const MIME_CANDIDATES = [
  { mimeType: "video/webm;codecs=vp9", extension: "webm" as const },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" as const },
  { mimeType: "video/webm", extension: "webm" as const },
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" as const },
  { mimeType: "video/mp4", extension: "mp4" as const },
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType));
}

export function getCanvasRecordingCapability(canvas?: HTMLCanvasElement | null): CanvasRecordingCapability {
  const supported = Boolean(canvas && typeof canvas.captureStream === "function" && typeof MediaRecorder !== "undefined");
  if (!supported) return { supported: false };
  const format = pickMimeType();
  return {
    supported: true,
    preferredMimeType: format?.mimeType,
    preferredExtension: format?.extension,
  };
}

export function canRecordCanvasAnimation(canvas?: HTMLCanvasElement | null) {
  return getCanvasRecordingCapability(canvas).supported;
}

export async function recordCanvasAnimation({
  canvas,
  durationSeconds,
  frameRate = 60,
  onProgress,
}: {
  canvas: HTMLCanvasElement;
  durationSeconds: number;
  frameRate?: number;
  onProgress: (progress: number) => void;
}): Promise<CanvasRecordingResult> {
  if (!canRecordCanvasAnimation(canvas)) throw new Error("animation-export-unsupported");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("animation-export-invalid-duration");
  if (!Number.isFinite(frameRate) || frameRate <= 0) throw new Error("animation-export-invalid-frame-rate");

  const stream = canvas.captureStream(Math.min(60, Math.max(1, Math.round(frameRate))));
  const format = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = format
      ? new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 8_000_000 })
      : new MediaRecorder(stream, { videoBitsPerSecond: 8_000_000 });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("animation-export-unsupported");
  }

  const chunks: BlobPart[] = [];

  const stopped = new Promise<CanvasRecordingResult>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("animation-export-failed"));
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || format?.mimeType || "video/webm";
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error("animation-export-empty"));
        return;
      }
      resolve({ blob, extension, mimeType });
    };
  });

  try {
    onProgress(0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    recorder.start(250);
    const start = performance.now();
    const durationMs = Math.max(250, durationSeconds * 1000);

    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        onProgress(progress);
        if (progress >= 1) {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });

    if (recorder.state === "recording") recorder.requestData();
    recorder.stop();
    const result = await stopped;
    onProgress(1);
    return result;
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  }
}
