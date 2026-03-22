import { useState } from "react";
import StoryboardCard from "./StoryboardCard";
import SequenceView from "./SequenceView";
import ExportMenu from "./ExportMenu";
import "./StoryboardTimeline.css";

function CardViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="6" height="12" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="9" y="2" width="6" height="12" rx="1" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}

function SequenceViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="8" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="1" y="13" width="3" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="5" y="13" width="3" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="9" y="13" width="3" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="13" y="13" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

export default function StoryboardTimeline({ scenes, onUpdateScene, onGenerateFrame, onGenerateAll, generatingAll }) {
  const ungeneratedCount = scenes.filter(s => !s.frameUrl && !s.frameLoading).length;
  const [viewMode, setViewMode] = useState("cards");

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div className="timeline-header-left">
          <span className="timeline-label">STORYBOARD</span>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Card View"
            >
              <CardViewIcon />
              Cards
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "sequence" ? "active" : ""}`}
              onClick={() => setViewMode("sequence")}
              title="Sequence View"
            >
              <SequenceViewIcon />
              Sequence
            </button>
          </div>
        </div>
        <div className="timeline-header-right">
          <ExportMenu scenes={scenes} />
          <button
            className="generate-all-btn"
            onClick={onGenerateAll}
            disabled={generatingAll || ungeneratedCount === 0}
          >
            {generatingAll ? (
              <>
                <span className="btn-spinner" />
                Generating...
              </>
            ) : ungeneratedCount === 0 ? (
              "All Generated"
            ) : scenes.some(s => s.frameUrl) ? (
              `Generate Next 5 (${ungeneratedCount} left)`
            ) : (
              "Generate First 5"
            )}
          </button>
          <span className="timeline-count">{scenes.length} SCENES</span>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="timeline-scroll">
          <div className="timeline-track">
            {scenes.map((scene, i) => (
              <StoryboardCard
                key={i}
                scene={scene}
                onUpdate={(field, value) => onUpdateScene(i, field, value)}
                onGenerateFrame={(prompt, style) => onGenerateFrame(i, prompt, style)}
              />
            ))}
          </div>
        </div>
      ) : (
        <SequenceView
          scenes={scenes}
          onUpdateScene={onUpdateScene}
          onGenerateFrame={onGenerateFrame}
        />
      )}
    </div>
  );
}
