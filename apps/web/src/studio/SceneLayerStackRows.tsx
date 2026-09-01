import type { BlendMode } from "@grs/core";

export type SceneLayerStackBlendMode = Extract<BlendMode, "normal" | "multiply" | "screen">;

export interface SceneLayerStackRow {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly visible: boolean;
  readonly visibilityLocked?: boolean;
  readonly opacity?: number;
  readonly blendMode?: SceneLayerStackBlendMode;
}

export interface SceneLayerStackRowLabels {
  readonly opacity: string;
  readonly blend: string;
  readonly normal: string;
  readonly multiply: string;
  readonly screen: string;
}

export function SceneLayerStackRows({
  rows,
  disabled,
  labels,
  onVisibleChange,
  onOpacityChange,
  onBlendModeChange,
}: {
  rows: readonly SceneLayerStackRow[];
  disabled?: boolean;
  labels: SceneLayerStackRowLabels;
  onVisibleChange?: (layerId: string, visible: boolean) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  onBlendModeChange?: (layerId: string, blendMode: SceneLayerStackBlendMode) => void;
}) {
  return <>
    {rows.map((row) => {
      const opacity = row.opacity ?? 1;
      const visibilityLocked = Boolean(row.visibilityLocked || !onVisibleChange);
      return (
        <div className="stage5-layer-row" data-layer-id={row.id} key={row.id}>
          {visibilityLocked ? (
            <span className={`stage5-layer-visibility ${row.visible ? "on" : ""}`} aria-hidden="true">
              {row.visible ? "●" : "○"}
            </span>
          ) : (
            <button
              type="button"
              className={`stage5-layer-visibility ${row.visible ? "on" : ""}`}
              aria-label={row.label}
              aria-pressed={row.visible}
              disabled={disabled}
              onClick={() => onVisibleChange?.(row.id, !row.visible)}
            >
              {row.visible ? "●" : "○"}
            </button>
          )}
          <div className="stage5-layer-name">
            <strong>{row.label}</strong>
            <span>{row.detail}</span>
          </div>
          {row.opacity !== undefined && onOpacityChange && <>
            <input
              aria-label={`${labels.opacity}: ${row.label}`}
              type="range"
              min="0"
              max="100"
              value={Math.round(opacity * 100)}
              disabled={disabled || !row.visible}
              onChange={(event) => onOpacityChange(row.id, Number(event.target.value) / 100)}
            />
            <output>{Math.round(opacity * 100)}%</output>
          </>}
          {row.blendMode !== undefined && onBlendModeChange && (
            <select
              aria-label={`${labels.blend}: ${row.label}`}
              value={row.blendMode}
              disabled={disabled || !row.visible}
              onChange={(event) => onBlendModeChange(row.id, event.target.value as SceneLayerStackBlendMode)}
            >
              <option value="normal">{labels.normal}</option>
              <option value="multiply">{labels.multiply}</option>
              <option value="screen">{labels.screen}</option>
            </select>
          )}
        </div>
      );
    })}
  </>;
}
