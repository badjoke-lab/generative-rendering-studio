export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];

export type SourceKind = "raster" | "svg" | "text" | "video" | "procedural" | "audio" | "data";
export type RepresentationKind = "point-field" | "curve-field" | "surface-field";
export type RendererKind = "original" | "glyph" | "point" | "particle";

export interface FieldSample {
  readonly position: Vec3;
  readonly color?: Rgba;
  readonly density?: number;
  readonly velocity?: Vec3;
  readonly depth?: number;
  readonly glyphIndex?: number;
  readonly group?: number;
  readonly sourceUv?: Vec2;
}

export interface PointField {
  readonly kind: "point-field";
  readonly samples: readonly FieldSample[];
}

export interface SourceDescriptor {
  readonly id: string;
  readonly kind: SourceKind;
  readonly label: string;
}

export interface RenderDescriptor {
  readonly renderer: RendererKind;
  readonly sourceId: string;
}

export interface ProjectDocument {
  readonly schemaVersion: 1;
  readonly seed: number;
  readonly sources: readonly SourceDescriptor[];
  readonly renders: readonly RenderDescriptor[];
}

export const PROJECT_SCHEMA_VERSION = 1 as const;

export function createEmptyProject(seed = 1): ProjectDocument {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    seed,
    sources: [],
    renders: [],
  };
}

export * from "./sampling";
