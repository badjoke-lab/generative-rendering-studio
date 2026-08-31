from pathlib import Path

path = Path('apps/web/src/main.tsx')
text = path.read_text()


def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    text = text.replace(old, new, 1)

replace_once(
'''        <input ref={fileInput} data-source-kind="still" hidden disabled={animationExporting} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "source"); event.currentTarget.value = ""; }} />
        <input ref={secondarySourceInput} data-source-kind="scene-layer" hidden disabled={animationExporting || !hasSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadSecondaryRaster(file); event.currentTarget.value = ""; }} />
        <input ref={morphInput} data-source-kind="morph" hidden disabled={animationExporting || isVideoSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "morph"); event.currentTarget.value = ""; }} />
        <input ref={videoInput} data-source-kind="video" hidden disabled={animationExporting} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadVideo(file); event.currentTarget.value = ""; }} />
        <input ref={maskVideoInput} data-source-kind="video-mask" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadMaskVideo(file); event.currentTarget.value = ""; }} />
        <input ref={textureVideoInput} data-source-kind="video-texture" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadTextureVideo(file); event.currentTarget.value = ""; }} />
        <input ref={analysisVideoInput} data-source-kind="video-analysis" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadAnalysisVideo(file); event.currentTarget.value = ""; }} />''',
'''        <input ref={fileInput} data-source-kind="still" hidden disabled={animationExporting} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "source"); event.currentTarget.value = ""; }} />
        <input ref={morphInput} data-source-kind="morph" hidden disabled={animationExporting || isVideoSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "morph"); event.currentTarget.value = ""; }} />
        <input ref={videoInput} data-source-kind="video" hidden disabled={animationExporting} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadVideo(file); event.currentTarget.value = ""; }} />
        <input ref={maskVideoInput} data-source-kind="video-mask" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadMaskVideo(file); event.currentTarget.value = ""; }} />
        <input ref={textureVideoInput} data-source-kind="video-texture" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadTextureVideo(file); event.currentTarget.value = ""; }} />
        <input ref={analysisVideoInput} data-source-kind="video-analysis" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadAnalysisVideo(file); event.currentTarget.value = ""; }} />
        <input ref={secondarySourceInput} data-source-kind="scene-layer" hidden disabled={animationExporting || !hasSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadSecondaryRaster(file); event.currentTarget.value = ""; }} />''',
'preserve existing file input order',
)

replace_once(
'''        {hasSource ? <section className="asset-card selected"><div className="asset-thumb" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? `${sourceDetail}${pointCount ? ` · ${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : ""}`}</span></div><button className="asset-menu" disabled={animationExporting}>⋮</button></section> : <button className="empty-source-card" disabled={animationExporting} onClick={() => fileInput.current?.click()}><span className="empty-source-plus">＋</span><span><strong>{t("source.emptyTitle")}</strong><small>{t("source.emptyDetail")}</small></span></button>}
        <div className="section-title-row source-heading morph-source-heading"><strong>{t("layer.secondSource")}</strong><span className="optional-label">{t("source.optional")}</span></div>
        {secondaryRaster ? <section className="asset-card" data-source-role="scene-layer"><div className="asset-thumb" /><div className="asset-meta"><strong>{secondarySourceLabel}</strong><span>{secondaryRaster.width} × {secondaryRaster.height}</span></div><button className="asset-menu" aria-label={t("action.removeLayerSource")} disabled={animationExporting} onClick={clearSecondarySource}>×</button></section> : <button className="asset-add-row" disabled={animationExporting || !hasSource} onClick={() => secondarySourceInput.current?.click()}>＋ {t("action.addLayerSource")}</button>}
        {secondarySourceError && <p className="supported-note stage3-note" role="alert">{secondarySourceError}</p>}''',
'''        {hasSource ? <section className="asset-card selected"><div className="asset-thumb" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? `${sourceDetail}${pointCount ? ` · ${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : ""}`}</span></div><button className="asset-menu" aria-label={t("action.addLayerSource")} title={t("action.addLayerSource")} disabled={animationExporting} onClick={() => secondarySourceInput.current?.click()}>＋</button></section> : <button className="empty-source-card" disabled={animationExporting} onClick={() => fileInput.current?.click()}><span className="empty-source-plus">＋</span><span><strong>{t("source.emptyTitle")}</strong><small>{t("source.emptyDetail")}</small></span></button>}
        {secondaryRaster && <><div className="section-title-row source-heading morph-source-heading"><strong>{t("layer.secondSource")}</strong><span className="optional-label">{t("source.optional")}</span></div><section className="asset-card" data-source-role="scene-layer"><div className="asset-thumb" /><div className="asset-meta"><strong>{secondarySourceLabel}</strong><span>{secondaryRaster.width} × {secondaryRaster.height}</span></div><button className="asset-menu" aria-label={t("action.removeLayerSource")} disabled={animationExporting} onClick={clearSecondarySource}>×</button></section></>}
        {secondarySourceError && <p className="supported-note stage3-note" role="alert">{secondarySourceError}</p>}''',
'keep second-source UI latent until activated',
)

path.write_text(text)
print('compatibility patch applied')
