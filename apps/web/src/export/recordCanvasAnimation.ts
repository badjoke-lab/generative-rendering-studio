export type CanvasRecordingResult = {
  blob: Blob;
  extension: "webm" | "mp4";
  mimeType: string;
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

export function canRecordCanvasAnimation(canvas?: HTMLCanvasElement | null) {
  return Boolean(canvas && typeof canvas.captureStream === "function" && typeof MediaRecorder !== "undefined");
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

  const stream = canvas.captureStream(frameRate);
  const format = pickMimeType();
  const recorder = format
    ? new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 8_000_000 })
    : new MediaRecorder(stream, { videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];

  const stopped = new Promise<CanvasRecordingResult>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("animation-export-failed"));
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || format?.mimeType || "video/webm";
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      resolve({ blob: new Blob(chunks, { type: mimeType }), extension, mimeType });
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

    recorder.stop();
    return await stopped;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
