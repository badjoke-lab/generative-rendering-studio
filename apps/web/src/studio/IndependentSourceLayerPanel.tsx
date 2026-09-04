import type { BlendMode } from "@grs/core";
import { SceneLayerStackRows } from "./SceneLayerStackRows";
import { useIndependentSourceLayerRegistry } from "./independentSourceLayerRegistry";
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
  const registry = useIndependentSourceLayerRegistry();
  const firstRegistryLayer = registry.layers[0];
  const additionalRows = registry.layers.length > 0
    ? registry.layers.map((layer, index) => ({
        id: index === 0 ? "source-secondary" : layer.id,
        label: layer.label,
        detail: labels.secondarySource,
        visible: layer.visible,
        visibilityLabel: labels.secondaryToggle,
        opacity: layer.opacity,
        opacityLabel: labels.secondaryOpacity,
        blendMode: layer.blendMode,
      }))
    : [{
        id: "source-secondary",
        label: secondaryLabel,
        detail: labels.secondarySource,
        visible: secondaryVisible,
        visibilityLabel: labels.secondaryToggle,
        opacity: secondaryOpacity,
        opacityLabel: labels.secondaryOpacity,
        blendMode: secondaryBlendMode,
      }];
  const mainRow = {
    id: "source-main",
    label: mainLabel,
    detail: labels.mainSource,
    visible: true,
    visibilityLocked: true,
  };
  const rows = secondaryOnTop
    ? [mainRow, ...additionalRows]
    : [...additionalRows, mainRow];

  const patchAdditionalLayer = (
    layerId: string,
    patch: { visible?: boolean; opacity?: number; blendMode?: IndependentSourceBlendMode },
  ) => {
    if (layerId === "source-secondary") {
      if (firstRegistryLayer) {
        registry.patchLayer(firstRegistryLayer.id, patch);
        return;
      }
      if (patch.visible !== undefined) onSecondaryVisibleChange(patch.visible);
      if (patch.opacity !== undefined) onSecondaryOpacityChange(patch.opacity);
      if (patch.blendMode !== undefined) onSecondaryBlendModeChange(patch.blendMode);
      return;
    }
    registry.patchLayer(layerId, patch);
  };

  const patchLayerTiming = (
    layerId: string,
    index: number,
    patch: { timingEnabled?: boolean; timelineStart?: number; duration?: number },
  ) => {
    if (index === 0) {
      if (patch.timingEnabled !== undefined) onSecondaryTimingEnabledChange(patch.timingEnabled);
      if (patch.timelineStart !== undefined) onSecondaryTimelineStartChange(patch.timelineStart);
      if (patch.duration !== undefined) onSecondaryDurationChange(patch.duration);
      return;
    }
    registry.patchLayer(layerId, patch);
  };

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
        onVisibleChange={(layerId, visible) => patchAdditionalLayer(layerId, { visible })}
        onOpacityChange={(layerId, opacity) => patchAdditionalLayer(layerId, { opacity })}
        onBlendModeChange={(layerId, blendMode) => patchAdditionalLayer(layerId, { blendMode })}
      />

      {registry.layers.length > 0 ? registry.layers.map((layer, index) => (
        <div className="stage5-layer-timing" data-stage5-layer-controls={layer.id} data-stage5-layer-timing={layer.timingEnabled ? "on" : "off"} key={layer.id}>
          <div className="stage5-layer-order-control">
            <span>{layer.label}</span>
            <div className="range-row">
              <button type="button" aria-label={`${labels.order}: ${layer.label} up`} disabled={disabled || index === 0} onClick={() => registry.moveLayer(layer.id, index - 1)}>↑</button>
              <button type="button" aria-label={`${labels.order}: ${layer.label} down`} disabled={disabled || index === registry.layers.length - 1} onClick={() => registry.moveLayer(layer.id, index + 1)}>↓</button>
              <button type="button" aria-label={`Remove ${layer.label}`} disabled={disabled} onClick={() => registry.removeLayer(layer.id)}>×</button>
            </div>
          </div>
          <div className="toggle-row">
            <span>{labels.timing}</span>
            <button
              type="button"
              aria-label={`${labels.timingToggle}: ${layer.label}`}
              className={`toggle ${layer.timingEnabled ? "on" : ""}`}
              aria-pressed={layer.timingEnabled}
              disabled={timingUnavailable}
              onClick={() => patchLayerTiming(layer.id, index, { timingEnabled: !layer.timingEnabled })}
            />
          </div>
          {layer.timingEnabled && !timingDisabled && <>
            <p>{labels.timingHint}</p>
            <label>
              {labels.timelineStart}
              <div className="range-row">
                <input
                  aria-label={`${labels.timelineStart}: ${layer.label}`}
                  type="range"
                  min="0"
                  max={maxTimelineTime}
                  step="0.25"
                  value={layer.timelineStart}
                  disabled={disabled}
                  onChange={(event) => patchLayerTiming(layer.id, index, { timelineStart: Number(event.target.value) })}
                />
                <output>{layer.timelineStart.toFixed(2)} {labels.seconds}</output>
              </div>
            </label>
            <label>
              {labels.timelineDuration}
              <div className="range-row">
                <input
                  aria-label={`${labels.timelineDuration}: ${layer.label}`}
                  type="range"
                  min="0.25"
                  max={maxTimelineTime}
                  step="0.25"
                  value={layer.duration}
                  disabled={disabled}
                  onChange={(event) => patchLayerTiming(layer.id, index, { duration: Number(event.target.value) })}
                />
                <output>{layer.duration.toFixed(2)} {labels.seconds}</output>
              </div>
            </label>
          </>}
        </div>
      )) : (
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
                <input aria-label={labels.timelineStart} type="range" min="0" max={maxTimelineTime} step="0.25" value={secondaryTimelineStart} disabled={disabled} onChange={(event) => onSecondaryTimelineStartChange(Number(event.target.value))} />
                <output>{secondaryTimelineStart.toFixed(2)} {labels.seconds}</output>
              </div>
            </label>
            <label>
              {labels.timelineDuration}
              <div className="range-row">
                <input aria-label={labels.timelineDuration} type="range" min="0.25" max={maxTimelineTime} step="0.25" value={secondaryDuration} disabled={disabled} onChange={(event) => onSecondaryDurationChange(Number(event.target.value))} />
                <output>{secondaryDuration.toFixed(2)} {labels.seconds}</output>
              </div>
            </label>
          </>}
        </div>
      )}
    </section>
  );
}
