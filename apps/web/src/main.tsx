import React from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import { createEmptyProject } from "@grs/core";
import { WebGLPreview } from "./webgl/WebGLPreview";
import "./styles.css";

const project = createEmptyProject(1);

const rendererModes = ["Original", "Glyph", "Point", "Particle"];

function App() {
  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup">
          <strong>{brand.shortName}</strong>
          <span>{brand.displayName}</span>
        </div>
        <nav className="workspace-tabs" aria-label="Workspace">
          <button className="tab active" type="button">Compose</button>
          <button className="tab" type="button">Timeline</button>
          <button className="tab" type="button">Export</button>
        </nav>
        <div className="top-actions">
          <button className="icon-button" type="button" aria-label="Undo">↶</button>
          <button className="icon-button" type="button" aria-label="Redo">↷</button>
          <span className="zoom-label">100%</span>
          <button className="render-button" type="button">▶ Render</button>
        </div>
      </header>

      <aside className="source-panel">
        <button className="source-add" type="button">＋ Source を追加</button>
        <div className="source-tabs" role="tablist" aria-label="Source types">
          <button className="source-tab active" type="button">画像</button>
          <button className="source-tab" type="button">動画</button>
          <button className="source-tab" type="button">テキスト</button>
          <button className="source-tab" type="button">SVG</button>
          <button className="source-tab" type="button">3D</button>
        </div>

        <section className="asset-card selected" aria-label="Selected source">
          <div className="asset-thumb" aria-hidden="true" />
          <div className="asset-meta">
            <strong>sample_source</strong>
            <span>Phase 0 placeholder</span>
          </div>
          <button className="asset-menu" type="button" aria-label="Source menu">⋮</button>
        </section>

        <button className="asset-add-row" type="button">＋</button>

        <div className="panel-divider" />
        <div className="section-title-row">
          <strong>レイヤー</strong>
          <span>⌄</span>
        </div>
        <section className="layer-row selected">
          <span className="visibility">◉</span>
          <span className="layer-chip" />
          <div><strong>メインレンダー</strong><small>100%</small></div>
        </section>
        <section className="layer-row">
          <span className="visibility">◉</span>
          <span className="text-layer">T</span>
          <div><strong>テキストレイヤー</strong><small>60%</small></div>
        </section>
        <section className="layer-row">
          <span className="visibility">◉</span>
          <span className="layer-chip effect" />
          <div><strong>エフェクトレイヤー</strong><small>40%</small></div>
        </section>

        <div className="panel-footer">
          <span>Schema v{project.schemaVersion}</span>
          <span>Seed {project.seed}</span>
        </div>
      </aside>

      <section className="canvas-column">
        <div className="canvas-toolbar">
          <div className="tool-group">
            <button type="button">✋</button>
            <button type="button">⌖</button>
            <button type="button">△</button>
            <button type="button">↻</button>
          </div>
          <div className="tool-group compact">
            <button type="button">3D</button>
            <button type="button">▦</button>
          </div>
          <div className="view-actions">
            <button type="button">Fit</button>
            <button type="button">1:1</button>
            <button type="button">Full</button>
          </div>
        </div>

        <section className="preview-frame" aria-label="Preview">
          <div className="canvas-meta"><span>1920 × 1080</span><span>60fps</span><span className="timecode">00:00:03.12</span></div>
          <WebGLPreview />
          <div className="canvas-status"><span>▲ Camera: Main</span><span>● Point Mode</span><span>○ Depth On</span></div>
        </section>

        <div className="transport-bar">
          <button type="button">▶</button>
          <button type="button">■</button>
          <button type="button">|◀</button>
          <button type="button">▶|</button>
          <div className="transport-time">00:00:03.12 / 00:00:10.00</div>
          <input aria-label="Timeline position" type="range" min="0" max="100" defaultValue="42" />
          <button type="button">🔊</button>
          <button type="button">⛶</button>
        </div>
      </section>

      <aside className="inspector-panel">
        <div className="inspector-tabs">
          <button type="button">ソース</button>
          <button className="active" type="button">レンダー</button>
          <button type="button">モーション</button>
          <button type="button">エフェクト</button>
        </div>

        <section className="inspector-section">
          <h2>レンダラーモード</h2>
          <div className="renderer-segmented">
            {rendererModes.map((mode) => <button className={mode === "Glyph" ? "active" : ""} type="button" key={mode}>{mode}</button>)}
          </div>
        </section>

        <section className="inspector-section">
          <h2>Glyph 設定</h2>
          <label>文字セット<select defaultValue="basic"><option value="basic">01 文字 (Basic)</option></select></label>
          <label>密度<div className="range-row"><input type="range" min="0" max="100" defaultValue="68" /><output>68%</output></div></label>
          <label>文字サイズ<div className="range-row"><input type="range" min="0" max="100" defaultValue="42" /><output>2.40</output></div></label>
          <label>カラー<div className="gradient-swatch" /></label>
          <label>背景<div className="color-row"><code>#000000</code><span className="black-swatch" /></div></label>
        </section>

        <section className="inspector-section">
          <h2>サンプリング</h2>
          <label>エッジ強調<div className="range-row"><input type="range" min="0" max="100" defaultValue="60" /><output>60%</output></div></label>
          <label>明るさ<div className="range-row"><input type="range" min="0" max="100" defaultValue="38" /><output>0.10</output></div></label>
          <label>コントラスト<div className="range-row"><input type="range" min="0" max="100" defaultValue="54" /><output>1.20</output></div></label>
        </section>

        <section className="inspector-section compact-section">
          <div className="toggle-row"><span>Depth (奥行き)</span><span className="toggle on" /></div>
          <div className="toggle-row"><span>ノイズ</span><span className="toggle on" /></div>
          <div className="toggle-row"><span>グロー</span><span className="toggle" /></div>
        </section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
