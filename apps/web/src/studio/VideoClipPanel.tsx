import "./video-clip.css";

export interface VideoClipLabels {
  readonly title: string;
  readonly summary: string;
  readonly inPoint: string;
  readonly outPoint: string;
  readonly range: string;
  readonly seconds: string;
  readonly timelineStart?: string;
}

export function VideoClipPanel({
  disabled,
  duration,
  inPoint,
  outPoint,
  timelineStart,
  maxTimelineStart,
  labels,
  onInPointChange,
  onOutPointChange,
  onTimelineStartChange,
}: {
  disabled?: boolean;
  duration: number;
  inPoint: number;
  outPoint: number;
  timelineStart?: number;
  maxTimelineStart?: number;
  labels: VideoClipLabels;
  onInPointChange: (seconds: number) => void;
  onOutPointChange: (seconds: number) => void;
  onTimelineStartChange?: (seconds: number) => void;
}) {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const minimumGap = Math.min(0.01, safeDuration);
  const safeIn = Math.min(Math.max(0, inPoint), Math.max(0, safeDuration - minimumGap));
  const safeOut = Math.min(safeDuration, Math.max(safeIn + minimumGap, outPoint));
  const clipDuration = Math.max(0, safeOut - safeIn);
  const safeTimelineStart = Number.isFinite(timelineStart) ? Math.max(0, timelineStart ?? 0) : 0;
  const safeMaxTimelineStart = Number.isFinite(maxTimelineStart)
    ? Math.max(safeTimelineStart, maxTimelineStart ?? safeTimelineStart)
    : Math.max(12, safeTimelineStart);
  const showTimelineStart = Boolean(labels.timelineStart && onTimelineStartChange);

  return (
    <section className="inspector-section stage5-video-clip" data-stage5-video-clip="true">
      <h2>{labels.title}</h2>
      <p>{showTimelineStart ? `${labels.timelineStart} · ${labels.range}` : labels.summary}</p>
      {showTimelineStart && <label>
        {labels.timelineStart}
        <div className="range-row">
          <input
            aria-label={labels.timelineStart}
            type="range"
            min="0"
            max={safeMaxTimelineStart}
            step="0.01"
            value={safeTimelineStart}
            disabled={disabled}
            onChange={(event) => onTimelineStartChange?.(Number(event.target.value))}
          />
          <output>{safeTimelineStart.toFixed(2)} {labels.seconds}</output>
        </div>
      </label>}
      <label>
        {labels.inPoint}
        <div className="range-row">
          <input
            aria-label={labels.inPoint}
            type="range"
            min="0"
            max={Math.max(0, safeOut - minimumGap)}
            step="0.01"
            value={safeIn}
            disabled={disabled || safeDuration <= 0}
            onChange={(event) => onInPointChange(Number(event.target.value))}
          />
          <output>{safeIn.toFixed(2)} {labels.seconds}</output>
        </div>
      </label>
      <label>
        {labels.outPoint}
        <div className="range-row">
          <input
            aria-label={labels.outPoint}
            type="range"
            min={Math.min(safeDuration, safeIn + minimumGap)}
            max={safeDuration}
            step="0.01"
            value={safeOut}
            disabled={disabled || safeDuration <= 0}
            onChange={(event) => onOutPointChange(Number(event.target.value))}
          />
          <output>{safeOut.toFixed(2)} {labels.seconds}</output>
        </div>
      </label>
      <label className="stage5-video-clip-range">
        {labels.range}
        <code>{safeIn.toFixed(2)}–{safeOut.toFixed(2)} {labels.seconds} · {clipDuration.toFixed(2)} {labels.seconds}</code>
      </label>
    </section>
  );
}
