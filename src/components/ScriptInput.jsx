import { useState, useRef } from "react";
import { parseScriptFile } from "../utils/fileParser.js";
import "./ScriptInput.css";

const SAMPLE_SCRIPT = `FADE IN:

INT. DETECTIVE'S OFFICE - NIGHT

A dimly lit room. Rain streaks down the window. DETECTIVE HARRIS (50s, weathered) sits behind a cluttered desk, nursing a whiskey.

HARRIS
Another dead end.

The door CREAKS open. MAYA CHEN (30s, sharp-eyed) steps in, soaking wet, clutching a manila envelope.

MAYA
Not anymore.

She drops the envelope on the desk. Photos spill out — surveillance shots of a warehouse.

EXT. WAREHOUSE DISTRICT - NIGHT

Harris and Maya crouch behind a dumpster, watching the warehouse entrance. Two GUARDS patrol with flashlights.

HARRIS
(whispering)
How many inside?

MAYA
At least six. Maybe more.

INT. WAREHOUSE - CONTINUOUS

The warehouse interior is vast. Crates stacked high. A single overhead light illuminates a TABLE where THREE MEN in suits examine documents.

BOSS TANAKA turns to his lieutenant.

TANAKA
If anyone finds out about this shipment, we're finished.`;

export default function ScriptInput({ onParse, loading }) {
  const [script, setScript] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleParse = () => {
    if (script.trim()) onParse(script);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-uploaded
    e.target.value = "";

    setFileLoading(true);
    setFileError(null);
    setFileName(file.name);

    try {
      const text = await parseScriptFile(file);
      setScript(text);
      // Auto-trigger parsing
      onParse(text);
    } catch (err) {
      setFileError(err.message);
    } finally {
      setFileLoading(false);
    }
  };

  const busy = loading || fileLoading;

  return (
    <div className="script-input">
      <div className="script-input-header">
        <div className="script-input-title">
          <label>SCREENPLAY</label>
          {fileName && !fileError && (
            <span className="file-badge">{fileName}</span>
          )}
          {fileError && (
            <span className="file-badge file-badge-error">{fileError}</span>
          )}
        </div>
        <div className="script-input-actions">
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {fileLoading ? (
              <>
                <span className="spinner spinner-sm" />
                Reading...
              </>
            ) : (
              <>
                <UploadIcon />
                Upload File
              </>
            )}
          </button>
          <button
            className="sample-btn"
            onClick={() => { setScript(SAMPLE_SCRIPT); setFileName(null); }}
            disabled={busy}
          >
            Load Sample
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.fdx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="upload-drop-hint">
        Accepts <strong>.txt</strong>, <strong>.pdf</strong>, and <strong>.fdx</strong> (Final Draft) files
      </div>

      <textarea
        value={script}
        onChange={(e) => { setScript(e.target.value); setFileName(null); }}
        placeholder="Paste your screenplay here, or upload a file above..."
        spellCheck={false}
        disabled={busy}
      />
      <div className="script-input-footer">
        <span className="char-count">
          {script.length > 0 ? `${script.length.toLocaleString()} chars` : ""}
        </span>
        <button
          className="parse-btn"
          onClick={handleParse}
          disabled={!script.trim() || busy}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Parsing...
            </>
          ) : (
            "Parse Script"
          )}
        </button>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6.5 1v8M3.5 3.5L6.5 1l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 10h11v2H1z" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}
