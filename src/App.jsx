import { useState, useEffect, useRef } from "react";
import ScriptInput from "./components/ScriptInput";
import StoryboardTimeline from "./components/StoryboardTimeline";
import { readHash, writeHash } from "./utils/urlState.js";
import { FRAME_STYLES, buildPrompt } from "./utils/frameUtils.js";
import "./App.css";

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
      const res = await fetch("/api/parse-script", {
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
          characterDescriptions: s.characterDescriptions || {},
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
        // When an image-affecting field changes, recompute prompt and mark stale
        if (STALE_FIELDS.has(field) && value !== s[field]) {
          updated.imagePrompt = buildPrompt(updated).prompt;
          if (s.frameUrl) updated.frameStale = true;
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
      const res = await fetch("/api/generate-frame", {
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

