import type { BlendMode } from "@grs/core";
import { SceneLayerStackRows } from "./SceneLayerStackRows";
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
  const rows = secondaryOnTop
    ? [
        {
          id: "source-main",
          label: mainLabel,
          detail: labels.mainSource,
          visible: true,
          visibilityLocked: true,
        },
        {
          id: "source-secondary",
          label: secondaryLabel,
          detail: labels.secondarySource,
          visible: secondaryVisible,
          visibilityLabel: labels.secondaryToggle,
          opacity: secondaryOpacity,
          opacityLabel: labels.secondaryOpacity,
          blendMode: secondaryBlendMode,
        },
      ]
    : [
        {
          id: "source-secondary",
          label: secondaryLabel,
          detail: labels.secondarySource,
          visible: secondaryVisible,
          visibilityLabel: labels.secondaryToggle,
          opacity: secondaryOpacity,
          opacityLabel: labels.secondaryOpacity,
          blendMode: secondaryBlendMode,
        },
        {
          id: "source-main",
          label: mainLabel,
          detail: labels.mainSource,
          visible: true,
          visibilityLocked: true,
        },
      ];

  const timingUnavailable = Boolean(disabled || timingDisabled);

  return (
    <section className="inspector-section stage5-layer-stack" data-stage5-layer-stack="independent-source">
      <div className="stage5-layer-heading">
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.summary}</p>
        </div>
        <span className="stage5-layer-count">{rows.length}</span>
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

      <SceneLayerStackRows
        rows={rows}
        disabled={disabled}
        labels={{
          opacity: labels.opacity,
          blend: labels.blend,
          normal: labels.normal,
          multiply: labels.multiply,
          screen: labels.screen,
        }}
        onVisibleChange={(layerId, visible) => {
          if (layerId === "source-secondary") onSecondaryVisibleChange(visible);
        }}
        onOpacityChange={(layerId, opacity) => {
          if (layerId === "source-secondary") onSecondaryOpacityChange(opacity);
        }}
        onBlendModeChange={(layerId, blendMode) => {
          if (layerId === "source-secondary") onSecondaryBlendModeChange(blendMode);
        }}
      />

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
