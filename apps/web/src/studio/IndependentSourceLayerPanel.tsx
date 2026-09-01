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
  readonly timing: string;
  readonly timingToggle: string;
  readonly timingHint: string;
  readonly timelineStart: string;
  readonly timelineDuration: string;
  readonly seconds: string;
}

export function IndependentSourceLayerPanel({
  disabled,
  timingDisabled,
  mainLabel,
  secondaryLabel,
  secondaryVisible,
  secondaryOpacity,
  secondaryOnTop,
  secondaryBlendMode,
  secondaryTimingEnabled,
  secondaryTimelineStart,
  secondaryDuration,
  maxTimelineTime = 12,
  labels,
  onSecondaryVisibleChange,
  onSecondaryOpacityChange,
  onSecondaryOnTopChange,
  onSecondaryBlendModeChange,
  onSecondaryTimingEnabledChange,
  onSecondaryTimelineStartChange,
  onSecondaryDurationChange,
}: {
  disabled?: boolean;
  timingDisabled?: boolean;
  mainLabel: string;
  secondaryLabel: string;
  secondaryVisible: boolean;
  secondaryOpacity: number;
  secondaryOnTop: boolean;
  secondaryBlendMode: IndependentSourceBlendMode;
  secondaryTimingEnabled: boolean;
  secondaryTimelineStart: number;
  secondaryDuration: number;
  maxTimelineTime?: number;
  labels: IndependentSourceLayerLabels;
  onSecondaryVisibleChange: (visible: boolean) => void;
  onSecondaryOpacityChange: (opacity: number) => void;
  onSecondaryOnTopChange: (secondaryOnTop: boolean) => void;
  onSecondaryBlendModeChange: (blendMode: IndependentSourceBlendMode) => void;
  onSecondaryTimingEnabledChange: (enabled: boolean) => void;
  onSecondaryTimelineStartChange: (seconds: number) => void;
  onSecondaryDurationChange: (seconds: number) => void;
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

  const timingUnavailable = Boolean(disabled || timingDisabled);

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

      <div className="stage5-layer-timing" data-stage5-layer-timing={secondaryTimingEnabled ? "on" : "off"}>
        <div className="toggle-row">
          <span>{labels.timing}</span>
          <button
            type="button"
            aria-label={labels.timingToggle}
            className={`toggle ${secondaryTimingEnabled ? "on" : ""}`}
            aria-pressed={secondaryTimingEnabled}
            disabled={timingUnavailable}
            onClick={() => onSecondaryTimingEnabledChange(!secondaryTimingEnabled)}
          />
        </div>
        {secondaryTimingEnabled && !timingDisabled && <>
          <p>{labels.timingHint}</p>
          <label>
            {labels.timelineStart}
            <div className="range-row">
              <input
                aria-label={labels.timelineStart}
                type="range"
                min="0"
                max={maxTimelineTime}
                step="0.25"
                value={secondaryTimelineStart}
                disabled={disabled}
                onChange={(event) => onSecondaryTimelineStartChange(Number(event.target.value))}
              />
              <output>{secondaryTimelineStart.toFixed(2)} {labels.seconds}</output>
            </div>
          </label>
          <label>
            {labels.timelineDuration}
            <div className="range-row">
              <input
                aria-label={labels.timelineDuration}
                type="range"
                min="0.25"
                max={maxTimelineTime}
                step="0.25"
                value={secondaryDuration}
                disabled={disabled}
                onChange={(event) => onSecondaryDurationChange(Number(event.target.value))}
              />
              <output>{secondaryDuration.toFixed(2)} {labels.seconds}</output>
            </div>
          </label>
        </>}
      </div>
    </section>
  );
}
