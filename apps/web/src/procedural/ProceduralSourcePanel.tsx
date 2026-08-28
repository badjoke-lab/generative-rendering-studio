import { useMemo, useState } from "react";
import {
  generateProceduralPointField,
  type PointField,
  type GeneratedProceduralSourceKind,
} from "@grs/core";

export interface ProceduralSourcePanelLabels {
  readonly title: string;
  readonly description: string;
  readonly create: string;
  readonly count: string;
  readonly scale: string;
  readonly sphere: string;
  readonly torus: string;
  readonly grid: string;
  readonly spiral: string;
  readonly wave: string;
  readonly ribbon: string;
  readonly vortex: string;
  readonly noise: string;
}

export interface ProceduralSourceSelection {
  readonly kind: GeneratedProceduralSourceKind;
  readonly count: number;
  readonly scale: number;
  readonly field: PointField;
}

interface ProceduralSourcePanelProps {
  readonly labels: ProceduralSourcePanelLabels;
  readonly disabled?: boolean;
  readonly seed?: number;
  readonly onCreate: (selection: ProceduralSourceSelection) => void;
}

const kinds: readonly GeneratedProceduralSourceKind[] = ["sphere", "torus", "grid", "spiral", "wave", "ribbon", "vortex", "noise"];

export function ProceduralSourcePanel({ labels, disabled = false, seed = 1, onCreate }: ProceduralSourcePanelProps) {
  const [kind, setKind] = useState<GeneratedProceduralSourceKind>("sphere");
  const [count, setCount] = useState(6000);
  const [scale, setScale] = useState(0.9);

  const kindLabels = useMemo<Record<GeneratedProceduralSourceKind, string>>(() => ({
    sphere: labels.sphere,
    torus: labels.torus,
    grid: labels.grid,
    spiral: labels.spiral,
    wave: labels.wave,
    ribbon: labels.ribbon,
    vortex: labels.vortex,
    noise: labels.noise,
  }), [labels.grid, labels.noise, labels.ribbon, labels.spiral, labels.sphere, labels.torus, labels.vortex, labels.wave]);

  const create = () => {
    const field = generateProceduralPointField({ kind, count, scale, seed });
    onCreate({ kind, count, scale, field });
  };

  return (
    <section className="procedural-source-panel" aria-label={labels.title}>
      <div className="section-title-row source-heading"><strong>{labels.title}</strong></div>
      <p className="supported-note">{labels.description}</p>
      <div className="procedural-kind-grid" role="group" aria-label={labels.title}>
        {kinds.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={candidate === kind ? "source-secondary selected" : "source-secondary"}
            disabled={disabled}
            aria-pressed={candidate === kind}
            onClick={() => setKind(candidate)}
          >
            {kindLabels[candidate]}
          </button>
        ))}
      </div>
      <label className="procedural-control-row">
        <span>{labels.count}</span>
        <input type="range" min={256} max={20000} step={256} value={count} disabled={disabled} onChange={(event) => setCount(Number(event.target.value))} />
        <output>{count.toLocaleString()}</output>
      </label>
      <label className="procedural-control-row">
        <span>{labels.scale}</span>
        <input type="range" min={0.2} max={1.25} step={0.05} value={scale} disabled={disabled} onChange={(event) => setScale(Number(event.target.value))} />
        <output>{scale.toFixed(2)}</output>
      </label>
      <button type="button" className="source-add" disabled={disabled} onClick={create}>＋ {labels.create}</button>
    </section>
  );
}
