import { useState, useEffect, useRef } from "react";
import ScriptInput from "./components/ScriptInput";
import StoryboardTimeline from "./components/StoryboardTimeline";
import { readHash, writeHash } from "./utils/urlState.js";
import "./App.css";

export const FRAME_STYLES = {
  sketch: {
    label: "Sketch",
    promptSuffix: "cinematic storyboard sketch, pencil drawing, black and white, film noir style",
    cssFilter: "grayscale(0.85) contrast(1.3) brightness(0.7) sepia(0.15)",
  },
  cinematic: {
    label: "Cinematic",
    promptSuffix: "cinematic film still, photorealistic, dramatic lighting, high production value, movie scene",
    cssFilter: "contrast(1.05) brightness(0.9) saturate(0.95)",
  },
  noir: {
    label: "Noir",
    promptSuffix: "high contrast black and white photography, deep shadows, film noir, dramatic chiaroscuro lighting",
    cssFilter: "grayscale(1) contrast(1.4) brightness(0.75)",
  },
};

export default function App() {
  const [scenes, setScenes] = useState(() => readHash() || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const syncTimeout = useRef(null);

  // Debounced hash sync — write at most every 500ms
  useEffect(() => {
    clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => writeHash(scenes), 500);
    return () => clearTimeout(syncTimeout.current);
  }, [scenes]);

  const parseScript = async (script) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3001/api/parse-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to parse script");
      }
      const data = await res.json();
      setScenes(
        data.map((s) => ({
          ...s,
          shot: s.suggestedShot,
          angle: s.suggestedAngle,
          movement: s.suggestedMovement || "Static",
          notes: "",
          frameStyle: "cinematic",
          frameUrl: null,
          frameLoading: false,
          imagePrompt: null,
          transition: "Cut",
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const STALE_FIELDS = new Set(["shot", "angle", "movement", "frameStyle"]);

  const updateScene = (index, field, value) => {
    setScenes((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, [field]: value };
        // Mark stale if an image-affecting field changed and a frame exists
        if (STALE_FIELDS.has(field) && s.frameUrl && value !== s[field]) {
          updated.frameStale = true;
        }
        return updated;
      })
    );
  };

  const generateFrame = async (index, prompt, style) => {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, frameLoading: true, imagePrompt: prompt, frameError: null } : s
      )
    );

    try {
      const res = await fetch("http://localhost:3001/api/generate-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Frame generation failed");
      }
      const { imageUrl } = await res.json();
      setScenes((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, frameLoading: false, frameUrl: imageUrl, frameStyle: style, frameStale: false } : s
        )
      );
    } catch (err) {
      setScenes((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, frameLoading: false, frameError: err.message } : s
        )
      );
    }
  };

  const generateAllFrames = async () => {
    setGeneratingAll(true);
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const { prompt, style } = buildPrompt(scene);
      await generateFrame(i, prompt, style);
    }
    setGeneratingAll(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>STORYBOARD</h1>
        <span className="app-subtitle">PRE-VISUALIZATION</span>
        {scenes.length > 0 && <ShareButton scenes={scenes} />}
      </header>
      <ScriptInput onParse={parseScript} loading={loading} />
      {error && <div className="error-banner">{error}</div>}
      {scenes.length > 0 && (
        <StoryboardTimeline
          scenes={scenes}
          onUpdateScene={updateScene}
          onGenerateFrame={generateFrame}
          onGenerateAll={generateAllFrames}
          generatingAll={generatingAll}
        />
      )}
    </div>
  );
}

function ShareButton({ scenes }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Ensure hash is current before copying
    writeHash(scenes);
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: select a temp input
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={`share-btn ${copied ? "share-btn-copied" : ""}`} onClick={handleShare}>
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1H11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 1L5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M5 2H2C1.4 2 1 2.4 1 3V10C1 10.6 1.4 11 2 11H9C9.6 11 10 10.6 10 10V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Share
        </>
      )}
    </button>
  );
}

const SHOT_DESCRIPTIONS = {
  "Wide": "wide establishing shot, full environment visible",
  "Medium": "medium shot, subject from waist up",
  "Close-Up": "close-up shot, face and shoulders filling frame",
  "Extreme Close-Up": "extreme close-up, tight detail shot",
  "POV": "point of view shot, first-person perspective through character's eyes",
  "Over-the-Shoulder": "over-the-shoulder shot, camera behind and beside character looking toward subject",
};

const ANGLE_DESCRIPTIONS = {
  "Eye Level": "eye level camera, straight on",
  "Low Angle": "low angle shot, camera tilted upward looking up at subject, subject appears powerful",
  "High Angle": "high angle shot, camera tilted downward looking down at subject",
  "Dutch Angle": "dutch angle, camera tilted sideways, canted frame, disorienting",
  "Bird's Eye": "bird's eye view, overhead shot, camera pointing straight down from directly above, top-down perspective",
  "Worm's Eye": "worm's eye view, extreme low angle, camera on the ground pointing straight up",
};

export function buildPrompt(scene) {
  const style = FRAME_STYLES[scene.frameStyle] || FRAME_STYLES.cinematic;
  const shotDesc = SHOT_DESCRIPTIONS[scene.shot] || `${scene.shot} shot`;
  const angleDesc = ANGLE_DESCRIPTIONS[scene.angle] || `${scene.angle} angle`;
  const prompt = `${scene.description}, ${shotDesc}, ${angleDesc}, ${style.promptSuffix}`;
  return { prompt, style: scene.frameStyle };
}
