import { useState } from "react";
import { FRAME_STYLES, buildPrompt } from "../App.jsx";
import ShotEditor from "./ShotEditor.jsx";
import "./StoryboardCard.css";

const SHOTS = ["Wide", "Medium", "Close-Up", "Extreme Close-Up", "POV", "Over-the-Shoulder"];
const ANGLES = ["Eye Level", "Low Angle", "High Angle", "Dutch Angle", "Bird's Eye", "Worm's Eye"];
const MOVEMENTS = ["Static", "Pan", "Tilt", "Dolly", "Handheld", "Drone"];

function SelectorGroup({ label, options, value, onChange }) {
  return (
    <div className="selector-group">
      <label>{label}</label>
      <div className="selector-pills">
        {options.map((opt) => (
          <button
            key={opt}
            className={`pill ${value === opt ? "active" : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StoryboardCard({ scene, onUpdate, onGenerateFrame }) {
  const [editorOpen, setEditorOpen] = useState(false);

  const angleAbbr = {
    "Eye Level": "EYE",
    "Low Angle": "LOW",
    "High Angle": "HIGH",
    "Dutch Angle": "DUTCH",
    "Bird's Eye": "BIRD",
    "Worm's Eye": "WORM",
  };

  const currentStyle = FRAME_STYLES[scene.frameStyle] || FRAME_STYLES.cinematic;

  const handleGenerate = () => {
    const { prompt, style } = buildPrompt(scene);
    onGenerateFrame(prompt, style);
  };

  const handleLock = (updates) => {
    Object.entries(updates).forEach(([field, value]) => onUpdate(field, value));
    // Auto-regenerate if a frame exists — build prompt from merged scene + updates
    if (scene.frameUrl) {
      const merged = { ...scene, ...updates };
      const { prompt, style } = buildPrompt(merged);
      onGenerateFrame(prompt, style);
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="scene-number">SC {scene.sceneNumber}</span>
          <span className="slugline">{scene.slugline}</span>
        </div>

        <div className="frame frame-clickable" onClick={() => setEditorOpen(true)} title="Click to open Shot Editor">
          {scene.frameUrl && (
            <img
              src={scene.frameUrl}
              alt={`Scene ${scene.sceneNumber} frame`}
              className="frame-image"
              style={{ filter: currentStyle.cssFilter }}
            />
          )}
          {scene.frameLoading && (
            <div className="frame-loading">
              <div className="frame-spinner" />
              <span>Generating...</span>
            </div>
          )}
          {scene.frameError && !scene.frameLoading && !scene.frameUrl && (
            <div className="frame-error">
              <span>{scene.frameError}</span>
            </div>
          )}
          {scene.frameStale && !scene.frameLoading && (
            <div className="frame-stale" onClick={(e) => { e.stopPropagation(); handleGenerate(); }}>
              <span className="frame-stale-icon">↻</span>
              <span>Settings changed — regenerate</span>
            </div>
          )}
          <div className="frame-overlay">
            <span className="frame-shot">{scene.shot}</span>
            <span className="frame-angle">{angleAbbr[scene.angle] || scene.angle}</span>
          </div>
          <div className="frame-edit-hint">
            <span>EDIT SHOT</span>
          </div>
          <div className="frame-crosshair-h" />
          <div className="frame-crosshair-v" />
          <div className="frame-corners">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
          </div>
          {scene.movement !== "Static" && (
            <span className="frame-movement">{scene.movement}</span>
          )}
        </div>

        <div className="frame-actions">
          <div className="style-selector">
            {Object.entries(FRAME_STYLES).map(([key, s]) => (
              <button
                key={key}
                className={`style-pill ${scene.frameStyle === key ? "active" : ""}`}
                onClick={() => onUpdate("frameStyle", key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            className={`generate-btn ${scene.frameStale && !scene.frameLoading ? "stale" : ""}`}
            onClick={handleGenerate}
            disabled={scene.frameLoading}
          >
            {scene.frameLoading ? "Generating..." : scene.frameStale ? "↻ Regenerate" : scene.frameUrl ? "Regenerate" : "Generate Frame"}
          </button>
        </div>

        <div className="card-description">{scene.description}</div>

        {scene.characters.length > 0 && (
          <div className="card-characters">
            {scene.characters.map((c) => (
              <span key={c} className="character-tag">{c}</span>
            ))}
          </div>
        )}

        <SelectorGroup
          label="SHOT"
          options={SHOTS}
          value={scene.shot}
          onChange={(v) => onUpdate("shot", v)}
        />
        <SelectorGroup
          label="ANGLE"
          options={ANGLES}
          value={scene.angle}
          onChange={(v) => onUpdate("angle", v)}
        />
        <SelectorGroup
          label="MOVEMENT"
          options={MOVEMENTS}
          value={scene.movement}
          onChange={(v) => onUpdate("movement", v)}
        />

        {scene.imagePrompt && (
          <div className="prompt-display">
            <label>IMAGE PROMPT</label>
            <p>{scene.imagePrompt}</p>
          </div>
        )}

        <div className="notes-section">
          <label>NOTES</label>
          <textarea
            value={scene.notes}
            onChange={(e) => onUpdate("notes", e.target.value)}
            placeholder="Director notes..."
            rows={3}
          />
        </div>
      </div>

      {editorOpen && (
        <ShotEditor
          scene={scene}
          onClose={() => setEditorOpen(false)}
          onLock={handleLock}
        />
      )}
    </>
  );
}
