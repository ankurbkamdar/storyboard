import { useState, useRef, useEffect } from "react";
import { exportJSON, exportPDF } from "../utils/exportUtils.js";
import "./ExportMenu.css";

export default function ExportMenu({ scenes }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null); // null | string status
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleJSON = () => {
    setOpen(false);
    exportJSON(scenes);
  };

  const handlePDF = async () => {
    setOpen(false);
    setExporting("Preparing…");
    try {
      await exportPDF(scenes, (msg) => setExporting(msg));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        className="export-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={!!exporting}
      >
        {exporting ? (
          <>
            <span className="export-spinner" />
            {exporting}
          </>
        ) : (
          <>
            <ExportIcon />
            Export
            <ChevronIcon />
          </>
        )}
      </button>

      {open && (
        <div className="export-dropdown">
          <button className="export-option" onClick={handlePDF}>
            <PdfIcon />
            <div>
              <div className="export-option-label">Export PDF</div>
              <div className="export-option-desc">4 frames per page, A4 landscape</div>
            </div>
          </button>
          <button className="export-option" onClick={handleJSON}>
            <JsonIcon />
            <div>
              <div className="export-option-label">Export JSON</div>
              <div className="export-option-desc">All scene data, shots, notes &amp; URLs</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 8V1M3.5 5L6.5 8l3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 10h11v2H1z" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2.5 3.5L5 6.5l2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="1" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M13 3l3 3v10a1 1 0 01-1 1H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5 8h6M5 10.5h4M5 13h5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function JsonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 4C3.5 4 3 5 3 6v2c0 1-.5 1.5-1.5 2C2.5 10.5 3 11 3 12v2c0 1 .5 2 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M13 4c1.5 0 2 1 2 2v2c0 1 .5 1.5 1.5 2-1 .5-1.5 1-1.5 2v2c0 1-.5 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="9" cy="9" r="1" fill="currentColor"/>
      <circle cx="6.5" cy="9" r="1" fill="currentColor" opacity="0.5"/>
      <circle cx="11.5" cy="9" r="1" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}
