import { useState, useRef, useCallback, useEffect } from "react";
import "./ShotEditor.css";

// Diagram dimensions (logical units)
const W = 400;
const H = 280;

// --- Shot/Angle inference ---
function inferShot(camPos, subjects) {
  if (!subjects.length) return "Wide";
  const avgDist =
    subjects.reduce((sum, s) => {
      const dx = camPos.x - s.x;
      const dy = camPos.y - s.y;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / subjects.length;
  const norm = avgDist / Math.sqrt(W * W + H * H); // 0–1
  if (norm < 0.08) return "Extreme Close-Up";
  if (norm < 0.18) return "Close-Up";
  if (norm < 0.32) return "Medium";
  if (norm < 0.50) return "Over-the-Shoulder";
  return "Wide";
}

function inferAngle(height) {
  // height is 0 (ground) to 1 (overhead)
  if (height < 0.12) return "Worm's Eye";
  if (height < 0.35) return "Low Angle";
  if (height < 0.65) return "Eye Level";
  if (height < 0.85) return "High Angle";
  return "Bird's Eye";
}

// Default subject positions spread across the upper-center of the set
function defaultSubjects(characters) {
  return characters.map((name, i) => ({
    name,
    x: W * 0.3 + (i * W * 0.2),
    y: H * 0.35,
  }));
}

function defaultCamera() {
  return { x: W * 0.5, y: H * 0.82 };
}

// Draw field-of-view lines from camera toward subjects
function getFovLines(camPos, subjects) {
  if (!subjects.length) return null;
  // Find the leftmost and rightmost subjects relative to camera
  const angles = subjects.map((s) => Math.atan2(s.y - camPos.y, s.x - camPos.x));
  const minAngle = Math.min(...angles) - 0.3;
  const maxAngle = Math.max(...angles) + 0.3;
  const len = 320;
  return {
    left: {
      x: camPos.x + Math.cos(minAngle) * len,
      y: camPos.y + Math.sin(minAngle) * len,
    },
    right: {
      x: camPos.x + Math.cos(maxAngle) * len,
      y: camPos.y + Math.sin(maxAngle) * len,
    },
  };
}

export default function ShotEditor({ scene, onClose, onLock }) {
  const [camPos, setCamPos] = useState(
    scene.shotEditorCam || defaultCamera()
  );
  const [subjects, setSubjects] = useState(
    scene.shotEditorSubjects?.length
      ? scene.shotEditorSubjects
      : defaultSubjects(scene.characters.length ? scene.characters : ["SUBJECT"])
  );
  const [camHeight, setCamHeight] = useState(scene.shotEditorHeight ?? 0.5);
  const [dragging, setDragging] = useState(null); // null | "camera" | index
  const diagramRef = useRef(null);

  const inferredShot = inferShot(camPos, subjects);
  const inferredAngle = inferAngle(camHeight);
  const fov = getFovLines(camPos, subjects);

  const getPos = useCallback((e) => {
    const rect = diagramRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: Math.max(10, Math.min(W - 10, (e.clientX - rect.left) * scaleX)),
      y: Math.max(10, Math.min(H - 10, (e.clientY - rect.top) * scaleY)),
    };
  }, []);

  const onMouseDown = useCallback((e, target) => {
    e.preventDefault();
    setDragging(target);
  }, []);

  const onMouseMove = useCallback(
    (e) => {
      if (dragging === null) return;
      const pos = getPos(e);
      if (dragging === "camera") {
        setCamPos(pos);
      } else {
        setSubjects((prev) =>
          prev.map((s, i) => (i === dragging ? { ...s, ...pos } : s))
        );
      }
    },
    [dragging, getPos]
  );

  const onMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const handleLock = () => {
    onLock({
      shot: inferredShot,
      angle: inferredAngle,
      shotEditorCam: camPos,
      shotEditorSubjects: subjects,
      shotEditorHeight: camHeight,
    });
    onClose();
  };

  // SVG coordinate helpers
  const vb = `0 0 ${W} ${H}`;

  return (
    <div className="shot-editor-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="shot-editor">
        <div className="se-header">
          <div>
            <span className="se-title">SHOT EDITOR</span>
            <span className="se-scene">SC {scene.sceneNumber} — {scene.slugline}</span>
          </div>
          <button className="se-close" onClick={onClose}>✕</button>
        </div>

        <div className="se-body">
          {/* Top-down diagram */}
          <div className="se-diagram-wrap">
            <div className="se-diagram-label">TOP-DOWN VIEW — DRAG TO POSITION</div>
            <div className="se-diagram" ref={diagramRef} style={{ cursor: dragging ? "grabbing" : "default" }}>
              <svg viewBox={vb} width="100%" height="100%" style={{ display: "block" }}>
                {/* Set boundary */}
                <rect x="0" y="0" width={W} height={H} fill="#0d0d18" />
                <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="#2a2a4a" strokeWidth="1" />

                {/* Grid */}
                {[...Array(8)].map((_, i) => (
                  <line key={`gv${i}`} x1={(i + 1) * W / 9} y1="0" x2={(i + 1) * W / 9} y2={H} stroke="#1a1a2e" strokeWidth="0.5" />
                ))}
                {[...Array(5)].map((_, i) => (
                  <line key={`gh${i}`} x1="0" y1={(i + 1) * H / 6} x2={W} y2={(i + 1) * H / 6} stroke="#1a1a2e" strokeWidth="0.5" />
                ))}

                {/* Set label */}
                <text x={W / 2} y={H - 8} textAnchor="middle" fill="#2a2a4a" fontSize="9" fontFamily="monospace" letterSpacing="3">
                  SET / LOCATION
                </text>

                {/* FOV cone */}
                {fov && (
                  <polygon
                    points={`${camPos.x},${camPos.y} ${fov.left.x},${fov.left.y} ${fov.right.x},${fov.right.y}`}
                    fill="rgba(200,168,78,0.05)"
                    stroke="rgba(200,168,78,0.2)"
                    strokeWidth="0.5"
                  />
                )}

                {/* Subject icons */}
                {subjects.map((s, i) => (
                  <g
                    key={i}
                    transform={`translate(${s.x}, ${s.y})`}
                    onMouseDown={(e) => onMouseDown(e, i)}
                    style={{ cursor: "grab" }}
                  >
                    {/* Body */}
                    <circle cx="0" cy="-14" r="6" fill="#3a3a5a" stroke="#5a5a8a" strokeWidth="1" />
                    <rect x="-7" y="-8" width="14" height="16" rx="3" fill="#3a3a5a" stroke="#5a5a8a" strokeWidth="1" />
                    {/* Shadow */}
                    <ellipse cx="0" cy="9" rx="8" ry="2.5" fill="rgba(0,0,0,0.3)" />
                    {/* Label */}
                    <rect x={-s.name.length * 3.2} y="12" width={s.name.length * 6.4} height="12" rx="2" fill="rgba(0,0,0,0.7)" />
                    <text x="0" y="21" textAnchor="middle" fill="#8a8aaa" fontSize="7.5" fontFamily="monospace">
                      {s.name.length > 10 ? s.name.slice(0, 9) + "…" : s.name}
                    </text>
                  </g>
                ))}

                {/* Camera icon */}
                <g
                  transform={`translate(${camPos.x}, ${camPos.y})`}
                  onMouseDown={(e) => onMouseDown(e, "camera")}
                  style={{ cursor: "grab" }}
                >
                  {/* Shadow */}
                  <ellipse cx="0" cy="14" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
                  {/* Body */}
                  <rect x="-13" y="-10" width="22" height="14" rx="3" fill="#c8a84e" />
                  {/* Lens */}
                  <circle cx="12" cy="-3" r="6" fill="#1a1a2e" stroke="#c8a84e" strokeWidth="1.5" />
                  <circle cx="12" cy="-3" r="3" fill="#0d0d18" />
                  {/* Viewfinder */}
                  <rect x="-13" y="-18" width="8" height="8" rx="1" fill="#c8a84e" />
                  {/* Label */}
                  <text x="0" y="26" textAnchor="middle" fill="#c8a84e" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    CAM
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* Controls panel */}
          <div className="se-controls">
            <div className="se-inferred">
              <div className="se-inferred-item">
                <label>SHOT TYPE</label>
                <span>{inferredShot}</span>
              </div>
              <div className="se-inferred-item">
                <label>ANGLE</label>
                <span>{inferredAngle}</span>
              </div>
            </div>

            <div className="se-height-control">
              <div className="se-height-header">
                <label>CAMERA HEIGHT</label>
                <span className="se-height-value">{inferredAngle}</span>
              </div>
              <div className="se-height-row">
                <span className="se-height-label">WORM</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={camHeight}
                  onChange={(e) => setCamHeight(parseFloat(e.target.value))}
                  className="se-slider"
                />
                <span className="se-height-label">BIRD</span>
              </div>
              <div className="se-height-stops">
                {[
                  { label: "Worm's Eye", val: 0.05 },
                  { label: "Low", val: 0.25 },
                  { label: "Eye Level", val: 0.5 },
                  { label: "High", val: 0.75 },
                  { label: "Bird's Eye", val: 0.95 },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    className={`se-stop ${inferredAngle === inferAngle(val) ? "active" : ""}`}
                    onClick={() => setCamHeight(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="se-hint">
              <p>Drag <strong>CAM</strong> to change shot type based on distance to subjects.</p>
              <p>Drag <strong>subjects</strong> to reposition them in the scene.</p>
              <p>Use the <strong>height slider</strong> to set the vertical camera angle.</p>
            </div>

            <button className="se-lock-btn" onClick={handleLock}>
              {scene.frameUrl ? "Lock & Regenerate" : "Lock Shot"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
