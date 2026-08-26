import React from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import { createEmptyProject } from "@grs/core";
import { WebGLPreview } from "./webgl/WebGLPreview";
import "./styles.css";

const project = createEmptyProject(1);

function App() {
  return (
    <main className="app-shell">
      <aside className="panel assets-panel">
        <div className="eyebrow">{brand.shortName}</div>
        <h1>{brand.displayName}</h1>
        <p className="muted">{brand.description}</p>
        <button className="drop-button" type="button">Drop or choose a source</button>
        <div className="status-row">
          <span>Schema</span>
          <strong>v{project.schemaVersion}</strong>
        </div>
      </aside>

      <section className="preview-panel" aria-label="Preview">
        <WebGLPreview />
      </section>

      <aside className="panel inspector-panel">
        <div className="eyebrow">Look</div>
        <h2>WebGL2 foundation</h2>
        <p className="muted">
          Phase 0 preview. Source import and renderer controls will attach to the same core contracts.
        </p>
        <div className="status-row"><span>Renderer</span><strong>Point</strong></div>
        <div className="status-row"><span>Backend</span><strong>WebGL2</strong></div>
        <div className="status-row"><span>Seed</span><strong>{project.seed}</strong></div>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
