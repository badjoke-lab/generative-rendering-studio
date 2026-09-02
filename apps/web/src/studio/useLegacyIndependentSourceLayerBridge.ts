import { useCallback, useState } from "react";
import type { RasterPixels } from "@grs/core";
import { useIndependentSourceLayers } from "./useIndependentSourceLayers";

export function useLegacyIndependentSourceLayerBridge() {
  const independentSources = useIndependentSourceLayers();
  const [secondaryOnTop, setSecondaryOnTop] = useState(true);
  const secondaryLayer = independentSources.layers[0];

  const replaceSecondaryLayer = useCallback((label: string, raster: RasterPixels) => {
    const id = independentSources.replaceSingleLayer(label, raster);
    setSecondaryOnTop(true);
    return id;
  }, [independentSources.replaceSingleLayer]);

  const clearSecondaryLayer = useCallback(() => {
    independentSources.clearLayers();
    setSecondaryOnTop(true);
  }, [independentSources.clearLayers]);

  const patchSecondaryLayer = useCallback((patch: Partial<Pick<NonNullable<typeof secondaryLayer>, "label" | "visible" | "opacity" | "blendMode" | "timingEnabled" | "timelineStart" | "duration">>) => {
    if (!secondaryLayer) return;
    independentSources.patchLayer(secondaryLayer.id, patch);
  }, [independentSources.patchLayer, secondaryLayer]);

  const setSecondarySourceLabel = useCallback((label: string) => patchSecondaryLayer({ label }), [patchSecondaryLayer]);
  const setSecondaryVisible = useCallback((visible: boolean) => patchSecondaryLayer({ visible }), [patchSecondaryLayer]);
  const setSecondaryOpacity = useCallback((opacity: number) => patchSecondaryLayer({ opacity }), [patchSecondaryLayer]);
  const setSecondaryBlendMode = useCallback((blendMode: "normal" | "multiply" | "screen") => patchSecondaryLayer({ blendMode }), [patchSecondaryLayer]);
  const setSecondaryTimingEnabled = useCallback((timingEnabled: boolean) => patchSecondaryLayer({ timingEnabled }), [patchSecondaryLayer]);
  const setSecondaryTimelineStart = useCallback((timelineStart: number) => patchSecondaryLayer({ timelineStart }), [patchSecondaryLayer]);
  const setSecondaryDuration = useCallback((duration: number) => patchSecondaryLayer({ duration }), [patchSecondaryLayer]);

  return {
    independentSources,
    secondaryLayer,
    secondaryLayerId: secondaryLayer?.id,
    secondaryRaster: secondaryLayer?.raster,
    secondarySourceLabel: secondaryLayer?.label ?? "",
    secondaryVisible: secondaryLayer?.visible ?? true,
    secondaryOpacity: secondaryLayer?.opacity ?? 0.72,
    secondaryBlendMode: secondaryLayer?.blendMode ?? "normal",
    secondaryTimingEnabled: secondaryLayer?.timingEnabled ?? false,
    secondaryTimelineStart: secondaryLayer?.timelineStart ?? 0,
    secondaryDuration: secondaryLayer?.duration ?? 3,
    secondaryOnTop,
    setSecondarySourceLabel,
    setSecondaryVisible,
    setSecondaryOpacity,
    setSecondaryOnTop,
    setSecondaryBlendMode,
    setSecondaryTimingEnabled,
    setSecondaryTimelineStart,
    setSecondaryDuration,
    replaceSecondaryLayer,
    clearSecondaryLayer,
    patchSecondaryLayer,
  } as const;
}
