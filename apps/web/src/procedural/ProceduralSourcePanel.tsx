import { useMemo, useState } from "react";
import {
  generateProceduralPointField,
  type PointField,
  type ProceduralSourceKind,
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
}

export interface ProceduralSourceSelection {
  readonly kind: ProceduralSourceKind;
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

const kinds: readonly ProceduralSourceKind[] = ["sphere", "torus", "grid", "spiral"];

export function ProceduralSourcePanel({ labels, disabled = false, seed = 1, onCreate }: ProceduralSourcePanelProps) {
  const [kind, setKind] = useState<ProceduralSourceKind>("sphere");
  const [count, setCount] = useState(6000);
  const [scale, setScale] = useState(0.9);

  const kindLabels = useMemo<Record<ProceduralSourceKind, string>>(() => ({
    sphere: labels.sphere,
    torus: labels.torus,
    grid: labels.grid,
    spiral: labels.spiral,
  }), [labels.grid, labels.spiral, labels.sphere, labels.torus]);

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
