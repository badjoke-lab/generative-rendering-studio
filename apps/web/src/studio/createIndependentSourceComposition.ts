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
}: {
  primarySource: SourceDescriptor;
  primaryRenderer: Parameters<typeof createSceneLayer>[0]["renderer"];
  additionalLayers: readonly IndependentSourceLayerState[];
}) {
  const primaryLayer = createSceneLayer({
    id: "source-main",
    sourceId: primarySource.id,
    renderer: primaryRenderer,
  });

  const sceneLayers = [
    primaryLayer,
    ...additionalLayers.map((layer) => createSceneLayer({
      id: layer.id,
      sourceId: layer.sourceId,
      renderer: "original",
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      ...(layer.timingEnabled
        ? { clip: { timelineStart: layer.timelineStart, duration: layer.duration } }
        : {}),
    })),
  ];

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
