import * as pdfjsLib from "pdfjs-dist";

// Point PDF.js worker at the bundled file via Vite's ?url import
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// ── .txt ─────────────────────────────────────────────────────────────────────
export function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ── .pdf ─────────────────────────────────────────────────────────────────────
export async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct lines by grouping items with similar y-coordinates
    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push(item);
    }
    // Sort lines top-to-bottom, join items left-to-right
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      pages.push(items.map((i) => i.str).join(" "));
    }
    pages.push(""); // blank line between pages
  }

  return pages.join("\n");
}

// ── .fdx (Final Draft XML) ───────────────────────────────────────────────────
export async function parseFdx(file) {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Invalid FDX file");

  const paragraphs = doc.querySelectorAll("Paragraph");
  const lines = [];

  for (const para of paragraphs) {
    const type = para.getAttribute("Type") || "";
    const rawText = [...para.querySelectorAll("Text")]
      .map((t) => t.textContent)
      .join("")
      .trim();

    if (!rawText) continue;

    // Format each element type to match screenplay plain-text conventions
    switch (type) {
      case "Scene Heading":
        lines.push("", rawText.toUpperCase(), "");
        break;
      case "Action":
        lines.push(rawText, "");
        break;
      case "Character":
        lines.push(rawText.toUpperCase());
        break;
      case "Parenthetical":
        lines.push(`(${rawText.replace(/^\(|\)$/g, "")})`);
        break;
      case "Dialogue":
        lines.push(rawText, "");
        break;
      case "Transition":
        lines.push("", rawText.toUpperCase(), "");
        break;
      default:
        lines.push(rawText);
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export async function parseScriptFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  switch (ext) {
    case "txt":
      return parseTxt(file);
    case "pdf":
      return parsePdf(file);
    case "fdx":
      return parseFdx(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
