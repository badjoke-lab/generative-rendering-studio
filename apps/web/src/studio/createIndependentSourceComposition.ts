import {
  createSceneLayer,
  createStudioScene,
  resolveStudioSceneSources,
  type SourceDescriptor,
} from "@grs/core";
import type { IndependentSourceLayerState } from "./IndependentSourceLayers";

export function createIndependentSourceComposition({
  primarySource,
  primaryRenderer,
  additionalLayers,
  primaryLayerIndex = 0,
}: {
  primarySource: SourceDescriptor;
  primaryRenderer: Parameters<typeof createSceneLayer>[0]["renderer"];
  additionalLayers: readonly IndependentSourceLayerState[];
  primaryLayerIndex?: number;
}) {
  const primaryLayer = createSceneLayer({
    id: "source-main",
    sourceId: primarySource.id,
    renderer: primaryRenderer,
  });

  const additionalSceneLayers = additionalLayers.map((layer) => createSceneLayer({
    id: layer.id,
    sourceId: layer.sourceId,
    renderer: "original",
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    ...(layer.timingEnabled
      ? { clip: { timelineStart: layer.timelineStart, duration: layer.duration } }
      : {}),
  }));
  const boundedPrimaryLayerIndex = Math.max(0, Math.min(additionalSceneLayers.length, primaryLayerIndex));
  const sceneLayers = [...additionalSceneLayers];
  sceneLayers.splice(boundedPrimaryLayerIndex, 0, primaryLayer);

  const scene = createStudioScene("independent-source-scene", sceneLayers);
  const additionalSources = additionalLayers.map((layer) => ({
    id: layer.sourceId,
    kind: "raster" as const,
    label: layer.label,
  } satisfies SourceDescriptor));

  return {
    scene,
    bindings: resolveStudioSceneSources(scene, [primarySource, ...additionalSources]),
  };
}
