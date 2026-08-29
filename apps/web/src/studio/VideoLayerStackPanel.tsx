import type { BlendMode } from "@grs/core";
import "./video-layer-stack.css";

export type VideoLayerBlendMode = Extract<BlendMode, "normal" | "multiply" | "screen">;

export interface VideoLayerStackLabels {
  readonly title: string;
  readonly summary: string;
  readonly original: string;
  readonly transformed: string;
  readonly visible: string;
  readonly opacity: string;
  readonly blend: string;
  readonly normal: string;
  readonly multiply: string;
  readonly screen: string;
}

export function VideoLayerStackPanel({
  disabled,
  originalVisible,
  originalOpacity,
  transformedBlendMode,
  labels,
  onOriginalVisibleChange,
  onOriginalOpacityChange,
  onTransformedBlendModeChange,
}: {
  disabled?: boolean;
  originalVisible: boolean;
  originalOpacity: number;
  transformedBlendMode: VideoLayerBlendMode;
  labels: VideoLayerStackLabels;
  onOriginalVisibleChange: (visible: boolean) => void;
  onOriginalOpacityChange: (opacity: number) => void;
  onTransformedBlendModeChange: (blendMode: VideoLayerBlendMode) => void;
}) {
  return (
    <section className="inspector-section stage5-layer-stack" data-stage5-layer-stack="video">
      <div className="stage5-layer-heading">
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.summary}</p>
        </div>
        <span className="stage5-layer-count">2</span>
      </div>

      <div className="stage5-layer-row" data-layer-id="video-original">
        <button
          type="button"
          className={`stage5-layer-visibility ${originalVisible ? "on" : ""}`}
          aria-label={`${labels.visible}: ${labels.original}`}
          aria-pressed={originalVisible}
          disabled={disabled}
          onClick={() => onOriginalVisibleChange(!originalVisible)}
        >
          {originalVisible ? "●" : "○"}
        </button>
        <div className="stage5-layer-name">
          <strong>{labels.original}</strong>
          <span>{labels.opacity}</span>
        </div>
        <input
          aria-label={`${labels.opacity}: ${labels.original}`}
          type="range"
          min="0"
          max="100"
          value={Math.round(originalOpacity * 100)}
          disabled={disabled || !originalVisible}
          onChange={(event) => onOriginalOpacityChange(Number(event.target.value) / 100)}
        />
        <output>{Math.round(originalOpacity * 100)}%</output>
      </div>

      <div className="stage5-layer-row" data-layer-id="video-transformed">
        <span className="stage5-layer-visibility on" aria-hidden="true">●</span>
        <div className="stage5-layer-name">
          <strong>{labels.transformed}</strong>
          <span>{labels.blend}</span>
        </div>
        <select
          aria-label={`${labels.blend}: ${labels.transformed}`}
          value={transformedBlendMode}
          disabled={disabled}
          onChange={(event) => onTransformedBlendModeChange(event.target.value as VideoLayerBlendMode)}
        >
          <option value="normal">{labels.normal}</option>
          <option value="multiply">{labels.multiply}</option>
          <option value="screen">{labels.screen}</option>
        </select>
      </div>
    </section>
  );
}
