import { useState, useEffect, useRef, useCallback } from "react";
import { FRAME_STYLES } from "../App.jsx";
import "./SequenceView.css";

const TRANSITIONS = ["Cut", "Dissolve", "Fade to Black"];

const TRANSITION_ICONS = {
  Cut: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
    </svg>
  ),
  Dissolve: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="7" width="7" height="6" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="11" y="7" width="7" height="6" rx="1" fill="currentColor" opacity="0.6"/>
      <path d="M9 10 L11 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1"/>
    </svg>
  ),
  "Fade to Black": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <defs>
        <linearGradient id="ftb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="16" height="8" rx="1" fill="url(#ftb)"/>
    </svg>
  ),
};

function FramePlaceholder({ scene, style }) {
  const filter = (FRAME_STYLES[scene.frameStyle] || FRAME_STYLES.cinematic).cssFilter;
  if (scene.frameUrl) {
    return (
      <img
        src={scene.frameUrl}
        alt={`Scene ${scene.sceneNumber}`}
        className="seq-frame-img"
        style={{ filter: style === "thumb" ? filter : filter }}
        draggable={false}
      />
    );
  }
  return (
    <div className="seq-frame-placeholder">
      {scene.frameLoading ? (
        <div className="seq-frame-spinner" />
      ) : (
        <span className="seq-frame-empty-label">NO FRAME</span>
      )}
    </div>
  );
}

function TransitionBadge({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="trans-badge-wrap">
      <button
        className="trans-badge"
        onClick={() => setOpen((o) => !o)}
        title={`Transition: ${value}`}
      >
        <span className="trans-icon">{TRANSITION_ICONS[value]}</span>
        <span className="trans-label">{value}</span>
      </button>
      {open && (
        <div className="trans-dropdown">
          {TRANSITIONS.map((t) => (
            <button
              key={t}
              className={`trans-option ${value === t ? "active" : ""}`}
              onClick={() => { onChange(t); setOpen(false); }}
            >
              <span className="trans-icon">{TRANSITION_ICONS[t]}</span>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SequenceView({ scenes, onUpdateScene, onGenerateFrame }) {
  const [selected, setSelected] = useState(0);
  const stripRef = useRef(null);
  const thumbRefs = useRef([]);

  const scene = scenes[selected];
  const style = FRAME_STYLES[scene?.frameStyle] || FRAME_STYLES.cinematic;

  // Keyboard navigation
  const navigate = useCallback((dir) => {
    setSelected((prev) => Math.max(0, Math.min(scenes.length - 1, prev + dir)));
  }, [scenes.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Scroll selected thumbnail into view
  useEffect(() => {
    const thumb = thumbRefs.current[selected];
    if (thumb && stripRef.current) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selected]);

  if (!scene) return null;

  const prevScene = scenes[selected - 1];
  const incomingTransition = prevScene?.transition || "Cut";

  return (
    <div className="seq-view">
      {/* Large frame */}
      <div className="seq-main">
        <button
          className="seq-nav seq-nav-left"
          onClick={() => navigate(-1)}
          disabled={selected === 0}
        >
          ‹
        </button>

        <div className="seq-center">
          {/* Incoming transition overlay */}
          {selected > 0 && (
            <div className={`seq-transition-overlay seq-transition-${incomingTransition.replace(/\s+/g, "-").toLowerCase()}`} />
          )}

          <div className="seq-large-frame">
            <FramePlaceholder scene={scene} />
            {/* Viewfinder overlays */}
            <div className="seq-frame-corners">
              <span className="seq-corner tl" /><span className="seq-corner tr" />
              <span className="seq-corner bl" /><span className="seq-corner br" />
            </div>
            <div className="seq-hud-top">
              <span className="seq-hud-scene">SC {scene.sceneNumber}</span>
              <span className="seq-hud-slugline">{scene.slugline}</span>
              <span className="seq-hud-count">{selected + 1} / {scenes.length}</span>
            </div>
            <div className="seq-hud-bottom">
              <span className="seq-hud-pill">{scene.shot}</span>
              <span className="seq-hud-pill">{scene.angle}</span>
              {scene.movement !== "Static" && <span className="seq-hud-pill">{scene.movement}</span>}
            </div>
          </div>

          {/* Scene info */}
          <div className="seq-info">
            <p className="seq-description">{scene.description}</p>
            {scene.characters.length > 0 && (
              <div className="seq-characters">
                {scene.characters.map((c) => (
                  <span key={c} className="seq-char-tag">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="seq-nav seq-nav-right"
          onClick={() => navigate(1)}
          disabled={selected === scenes.length - 1}
        >
          ›
        </button>
      </div>

      {/* Film strip */}
      <div className="seq-strip-wrap">
        <div className="seq-strip" ref={stripRef}>
          {scenes.map((s, i) => (
            <div key={i} className="seq-strip-item">
              {/* Transition badge between scenes */}
              {i > 0 && (
                <TransitionBadge
                  value={scenes[i - 1].transition || "Cut"}
                  onChange={(v) => onUpdateScene(i - 1, "transition", v)}
                />
              )}
              <button
                ref={(el) => (thumbRefs.current[i] = el)}
                className={`seq-thumb ${i === selected ? "seq-thumb-selected" : ""}`}
                onClick={() => setSelected(i)}
              >
                <div className="seq-thumb-frame">
                  <FramePlaceholder scene={s} style="thumb" />
                  {i === selected && <div className="seq-thumb-active-bar" />}
                </div>
                <span className="seq-thumb-label">SC {s.sceneNumber}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
