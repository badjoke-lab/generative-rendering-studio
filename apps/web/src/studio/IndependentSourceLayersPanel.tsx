import type { IndependentSourceLayerState } from "./IndependentSourceLayers";
import {
  SceneLayerStackRows,
  type SceneLayerStackBlendMode,
} from "./SceneLayerStackRows";
import "./video-layer-stack.css";

export interface IndependentSourceLayersPanelLabels {
  readonly title: string;
  readonly summary: string;
  readonly mainSource: string;
  readonly additionalSource: string;
  readonly opacity: string;
  readonly blend: string;
  readonly normal: string;
  readonly multiply: string;
  readonly screen: string;
}

export function IndependentSourceLayersPanel({
  disabled,
  mainLabel,
  layers,
  labels,
  onVisibleChange,
  onOpacityChange,
  onBlendModeChange,
}: {
  disabled?: boolean;
  mainLabel: string;
  layers: readonly IndependentSourceLayerState[];
  labels: IndependentSourceLayersPanelLabels;
  onVisibleChange: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  onBlendModeChange: (layerId: string, blendMode: SceneLayerStackBlendMode) => void;
}) {
  const rows = [
    {
      id: "source-main",
      label: mainLabel,
      detail: labels.mainSource,
      visible: true,
      visibilityLocked: true,
    },
    ...layers.map((layer) => ({
      id: layer.id,
      label: layer.label,
      detail: labels.additionalSource,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
    })),
  ];

  return (
    <section className="inspector-section stage5-layer-stack" data-stage5-layer-stack="independent-sources">
      <div className="stage5-layer-heading">
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.summary}</p>
        </div>
        <span className="stage5-layer-count">{rows.length}</span>
      </div>

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
    </section>
  );
}
