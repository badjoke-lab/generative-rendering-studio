import type { IndependentSourceLayerState } from "./IndependentSourceLayers";
import { SceneLayerStackRows, type SceneLayerStackBlendMode } from "./SceneLayerStackRows";
import "./video-layer-stack.css";

export interface IndependentSourceLayersEditorLabels {
  readonly title: string;
  readonly summary: string;
  readonly mainSource: string;
  readonly additionalSource: string;
  readonly opacity: string;
  readonly blend: string;
  readonly order: string;
  readonly additionalOnTop: string;
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
  readonly remove: string;
}

export function IndependentSourceLayersEditorPanel({
  disabled,
  timingDisabled,
  mainLabel,
  layers,
  primaryOnTop,
  labels,
  onPrimaryOnTopChange,
  onVisibleChange,
  onOpacityChange,
  onBlendModeChange,
  onTimingEnabledChange,
  onTimelineStartChange,
  onDurationChange,
  onMove,
  onRemove,
}: {
  disabled?: boolean;
  timingDisabled?: boolean;
  mainLabel: string;
  layers: readonly IndependentSourceLayerState[];
  primaryOnTop: boolean;
  labels: IndependentSourceLayersEditorLabels;
  onPrimaryOnTopChange: (primaryOnTop: boolean) => void;
  onVisibleChange: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  onBlendModeChange: (layerId: string, blendMode: SceneLayerStackBlendMode) => void;
  onTimingEnabledChange: (layerId: string, enabled: boolean) => void;
  onTimelineStartChange: (layerId: string, seconds: number) => void;
  onDurationChange: (layerId: string, seconds: number) => void;
  onMove: (layerId: string, toIndex: number) => void;
  onRemove: (layerId: string) => void;
}) {
  const mainRow = {
    id: "source-main",
    label: mainLabel,
    detail: labels.mainSource,
    visible: true,
    visibilityLocked: true,
  } as const;
  const additionalRows = layers.map((layer) => ({
    id: layer.id,
    label: layer.label,
    detail: labels.additionalSource,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
  }));
  const rows = primaryOnTop ? [...additionalRows, mainRow] : [mainRow, ...additionalRows];

  return (
    <section className="inspector-section stage5-layer-stack" data-stage5-layer-stack="independent-sources-editor">
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
          value={primaryOnTop ? "main-top" : "additional-top"}
          disabled={disabled}
          onChange={(event) => onPrimaryOnTopChange(event.target.value === "main-top")}
        >
          <option value="additional-top">{labels.additionalOnTop}</option>
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
          if (layerId !== "source-main") onVisibleChange(layerId, visible);
        }}
        onOpacityChange={(layerId, opacity) => {
          if (layerId !== "source-main") onOpacityChange(layerId, opacity);
        }}
        onBlendModeChange={(layerId, blendMode) => {
          if (layerId !== "source-main") onBlendModeChange(layerId, blendMode);
        }}
      />

      {layers.map((layer, index) => (
        <div className="stage5-independent-layer-editor" data-layer-editor-id={layer.id} key={`${layer.id}-editor`}>
          <div className="stage5-layer-heading">
            <strong>{layer.label}</strong>
            <div className="stage5-layer-order-actions">
              <button type="button" aria-label={`${labels.order}: ↑`} disabled={disabled || index === 0} onClick={() => onMove(layer.id, index - 1)}>↑</button>
              <button type="button" aria-label={`${labels.order}: ↓`} disabled={disabled || index === layers.length - 1} onClick={() => onMove(layer.id, index + 1)}>↓</button>
              <button type="button" aria-label={`${labels.remove}: ${layer.label}`} disabled={disabled} onClick={() => onRemove(layer.id)}>×</button>
            </div>
          </div>
          <div className="toggle-row">
            <span>{labels.timing}</span>
            <button
              type="button"
              aria-label={`${labels.timingToggle}: ${layer.label}`}
              disabled={disabled || timingDisabled}
              className={`toggle ${layer.timingEnabled ? "on" : ""}`}
              aria-pressed={layer.timingEnabled}
              onClick={() => onTimingEnabledChange(layer.id, !layer.timingEnabled)}
            />
          </div>
          {timingDisabled ? <p>{labels.timingHint}</p> : layer.timingEnabled && <div className="stage5-layer-timing-controls">
            <label>
              {labels.timelineStart}
              <input
                aria-label={`${labels.timelineStart}: ${layer.label}`}
                type="number"
                min="0"
                step="0.1"
                value={layer.timelineStart}
                disabled={disabled}
                onChange={(event) => onTimelineStartChange(layer.id, Math.max(0, Number(event.target.value) || 0))}
              />
              <span>{labels.seconds}</span>
            </label>
            <label>
              {labels.timelineDuration}
              <input
                aria-label={`${labels.timelineDuration}: ${layer.label}`}
                type="number"
                min="0.1"
                step="0.1"
                value={layer.duration}
                disabled={disabled}
                onChange={(event) => onDurationChange(layer.id, Math.max(0.1, Number(event.target.value) || 0.1))}
              />
              <span>{labels.seconds}</span>
            </label>
          </div>}
        </div>
      ))}
    </section>
  );
}
