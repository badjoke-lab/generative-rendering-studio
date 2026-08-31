import type { BlendMode } from "@grs/core";
import "./video-layer-stack.css";

export type IndependentSourceBlendMode = Extract<BlendMode, "normal" | "multiply" | "screen">;

export interface IndependentSourceLayerLabels {
  readonly title: string;
  readonly summary: string;
  readonly mainSource: string;
  readonly secondarySource: string;
  readonly secondaryToggle: string;
  readonly secondaryOpacity: string;
  readonly opacity: string;
  readonly blend: string;
  readonly order: string;
  readonly secondaryOnTop: string;
  readonly mainOnTop: string;
  readonly normal: string;
  readonly multiply: string;
  readonly screen: string;
}

export function IndependentSourceLayerPanel({
  disabled,
  mainLabel,
  secondaryLabel,
  secondaryVisible,
  secondaryOpacity,
  secondaryOnTop,
  secondaryBlendMode,
  labels,
  onSecondaryVisibleChange,
  onSecondaryOpacityChange,
  onSecondaryOnTopChange,
  onSecondaryBlendModeChange,
}: {
  disabled?: boolean;
  mainLabel: string;
  secondaryLabel: string;
  secondaryVisible: boolean;
  secondaryOpacity: number;
  secondaryOnTop: boolean;
  secondaryBlendMode: IndependentSourceBlendMode;
  labels: IndependentSourceLayerLabels;
  onSecondaryVisibleChange: (visible: boolean) => void;
  onSecondaryOpacityChange: (opacity: number) => void;
  onSecondaryOnTopChange: (secondaryOnTop: boolean) => void;
  onSecondaryBlendModeChange: (blendMode: IndependentSourceBlendMode) => void;
}) {
  const mainRow = (
    <div className="stage5-layer-row" data-layer-id="source-main" key="source-main">
      <span className="stage5-layer-visibility on" aria-hidden="true">●</span>
      <div className="stage5-layer-name">
        <strong>{mainLabel}</strong>
        <span>{labels.mainSource}</span>
      </div>
    </div>
  );

  const secondaryRow = (
    <div className="stage5-layer-row" data-layer-id="source-secondary" key="source-secondary">
      <button
        type="button"
        className={`stage5-layer-visibility ${secondaryVisible ? "on" : ""}`}
        aria-label={labels.secondaryToggle}
        aria-pressed={secondaryVisible}
        disabled={disabled}
        onClick={() => onSecondaryVisibleChange(!secondaryVisible)}
      >
        {secondaryVisible ? "●" : "○"}
      </button>
      <div className="stage5-layer-name">
        <strong>{secondaryLabel}</strong>
        <span>{labels.secondarySource}</span>
      </div>
      <input
        aria-label={labels.secondaryOpacity}
        type="range"
        min="0"
        max="100"
        value={Math.round(secondaryOpacity * 100)}
        disabled={disabled || !secondaryVisible}
        onChange={(event) => onSecondaryOpacityChange(Number(event.target.value) / 100)}
      />
      <output>{Math.round(secondaryOpacity * 100)}%</output>
      <select
        aria-label={`${labels.blend}: ${secondaryLabel}`}
        value={secondaryBlendMode}
        disabled={disabled || !secondaryVisible}
        onChange={(event) => onSecondaryBlendModeChange(event.target.value as IndependentSourceBlendMode)}
      >
        <option value="normal">{labels.normal}</option>
        <option value="multiply">{labels.multiply}</option>
        <option value="screen">{labels.screen}</option>
      </select>
    </div>
  );

  return (
    <section className="inspector-section stage5-layer-stack" data-stage5-layer-stack="independent-source">
      <div className="stage5-layer-heading">
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.summary}</p>
        </div>
        <span className="stage5-layer-count">2</span>
      </div>

      <label className="stage5-layer-order-control">
        <span>{labels.order}</span>
        <select
          aria-label={labels.order}
          value={secondaryOnTop ? "secondary-top" : "main-top"}
          disabled={disabled}
          onChange={(event) => onSecondaryOnTopChange(event.target.value === "secondary-top")}
        >
          <option value="secondary-top">{labels.secondaryOnTop}</option>
          <option value="main-top">{labels.mainOnTop}</option>
        </select>
      </label>

      {secondaryOnTop ? <>{mainRow}{secondaryRow}</> : <>{secondaryRow}{mainRow}</>}
    </section>
  );
}
