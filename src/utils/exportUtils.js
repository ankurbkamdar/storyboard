import { jsPDF } from "jspdf";

// ── JSON export ───────────────────────────────────────────────────────────────
export function exportJSON(scenes) {
  const data = scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    slugline: s.slugline,
    description: s.description,
    characters: s.characters,
    shot: s.shot,
    angle: s.angle,
    movement: s.movement,
    transition: s.transition || "Cut",
    frameStyle: s.frameStyle,
    frameUrl: s.frameUrl || null,
    imagePrompt: s.imagePrompt || null,
    notes: s.notes,
    shotEditorCam: s.shotEditorCam || null,
    shotEditorSubjects: s.shotEditorSubjects || null,
    shotEditorHeight: s.shotEditorHeight ?? null,
  }));

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "storyboard.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export ────────────────────────────────────────────────────────────────
// Layout: A4 landscape, 2×2 grid = 4 frames per page
const PAGE_W = 297;    // mm A4 landscape width
const PAGE_H = 210;    // mm A4 landscape height
const MARGIN = 10;
const COLS = 2;
const ROWS = 2;
const FRAMES_PER_PAGE = COLS * ROWS;

const CELL_W = (PAGE_W - MARGIN * (COLS + 1)) / COLS;
const CELL_H = (PAGE_H - MARGIN * (ROWS + 1)) / ROWS;
const IMG_H = CELL_W * (9 / 16);           // 16:9 image height
const INFO_H = CELL_H - IMG_H;             // remaining space for text

// Fetch an image URL and convert to base64 data URL
async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportPDF(scenes, onProgress) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Pre-fetch all images
  const imageCache = {};
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (s.frameUrl) {
      onProgress?.(`Fetching frame ${i + 1}/${scenes.length}…`);
      imageCache[i] = await toDataUrl(s.frameUrl);
    }
  }

  onProgress?.("Building PDF…");

  // Cover / title area colours
  const BG = [10, 10, 20];
  const GOLD = [200, 168, 78];
  const DIM = [90, 90, 110];
  const BRIGHT = [220, 220, 234];

  let firstPage = true;

  for (let pageStart = 0; pageStart < scenes.length; pageStart += FRAMES_PER_PAGE) {
    if (!firstPage) doc.addPage();
    firstPage = false;

    // Dark page background
    doc.setFillColor(...BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");

    // Page header rule
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, MARGIN - 1, PAGE_W - MARGIN, MARGIN - 1);

    // "STORYBOARD" watermark text top-left
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.text("STORYBOARD  PRE-VISUALIZATION", MARGIN, MARGIN - 3);

    // Page number top-right
    const pageNum = Math.floor(pageStart / FRAMES_PER_PAGE) + 1;
    const totalPages = Math.ceil(scenes.length / FRAMES_PER_PAGE);
    doc.setFont("courier", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...DIM);
    doc.text(`PAGE ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, MARGIN - 3, { align: "right" });

    const pageScenes = scenes.slice(pageStart, pageStart + FRAMES_PER_PAGE);

    pageScenes.forEach((scene, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = MARGIN + col * (CELL_W + MARGIN);
      const y = MARGIN + row * (CELL_H + MARGIN);

      // Cell background
      doc.setFillColor(18, 18, 28);
      doc.roundedRect(x, y, CELL_W, CELL_H, 2, 2, "F");

      // Image area
      const imgAreaH = IMG_H;
      if (imageCache[pageStart + idx]) {
        doc.addImage(imageCache[pageStart + idx], "WEBP", x, y, CELL_W, imgAreaH, undefined, "FAST");
        // Subtle gradient overlay (drawn as semi-transparent rect)
        doc.setFillColor(10, 10, 20);
        doc.setGState(doc.GState({ opacity: 0.25 }));
        doc.rect(x, y, CELL_W, imgAreaH, "F");
        doc.setGState(doc.GState({ opacity: 1 }));
      } else {
        // Placeholder
        doc.setFillColor(14, 14, 24);
        doc.rect(x, y, CELL_W, imgAreaH, "F");
        doc.setFont("courier", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...DIM);
        doc.text("NO FRAME GENERATED", x + CELL_W / 2, y + imgAreaH / 2, { align: "center" });
      }

      // Corner brackets over image
      const bLen = 4;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.4);
      // TL
      doc.line(x + 1, y + 1 + bLen, x + 1, y + 1); doc.line(x + 1, y + 1, x + 1 + bLen, y + 1);
      // TR
      doc.line(x + CELL_W - 1 - bLen, y + 1, x + CELL_W - 1, y + 1); doc.line(x + CELL_W - 1, y + 1, x + CELL_W - 1, y + 1 + bLen);
      // BL
      doc.line(x + 1, y + imgAreaH - 1 - bLen, x + 1, y + imgAreaH - 1); doc.line(x + 1, y + imgAreaH - 1, x + 1 + bLen, y + imgAreaH - 1);
      // BR
      doc.line(x + CELL_W - 1 - bLen, y + imgAreaH - 1, x + CELL_W - 1, y + imgAreaH - 1); doc.line(x + CELL_W - 1, y + imgAreaH - 1, x + CELL_W - 1, y + imgAreaH - 1 - bLen);

      // Shot + angle pills on image
      doc.setFont("courier", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...GOLD);
      doc.setFillColor(0, 0, 0);
      // Shot pill (bottom-left of image)
      const shotW = scene.shot.length * 1.7 + 4;
      doc.roundedRect(x + 2, y + imgAreaH - 5.5, shotW, 4.5, 0.8, 0.8, "F");
      doc.text(scene.shot.toUpperCase(), x + 4, y + imgAreaH - 2.5);
      // Angle pill (bottom-right)
      const angleW = scene.angle.length * 1.7 + 4;
      doc.roundedRect(x + CELL_W - angleW - 2, y + imgAreaH - 5.5, angleW, 4.5, 0.8, 0.8, "F");
      doc.text(scene.angle.toUpperCase(), x + CELL_W - angleW, y + imgAreaH - 2.5);

      // Info section below image
      const infoY = y + imgAreaH + 2;

      // Scene number + slugline
      doc.setFont("courier", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...GOLD);
      doc.text(`SC ${scene.sceneNumber}`, x + 2, infoY + 3.5);

      doc.setFont("courier", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...BRIGHT);
      const maxSlugW = CELL_W - 16;
      const slugline = doc.splitTextToSize(scene.slugline, maxSlugW)[0];
      doc.text(slugline, x + 12, infoY + 3.5);

      // Separator line
      doc.setDrawColor(42, 42, 58);
      doc.setLineWidth(0.2);
      doc.line(x + 2, infoY + 5, x + CELL_W - 2, infoY + 5);

      // Description
      doc.setFont("courier", "normal");
      doc.setFontSize(5);
      doc.setTextColor(...DIM);
      const descLines = doc.splitTextToSize(scene.description, CELL_W - 4);
      doc.text(descLines.slice(0, 2), x + 2, infoY + 8);

      // Movement + transition
      doc.setFont("courier", "normal");
      doc.setFontSize(4.5);
      doc.setTextColor(...DIM);
      const meta = [
        scene.movement !== "Static" ? `MVT: ${scene.movement}` : null,
        scene.transition ? `→ ${scene.transition}` : null,
      ].filter(Boolean).join("   ");
      if (meta) doc.text(meta, x + 2, infoY + INFO_H - 4);

      // Notes (if any)
      if (scene.notes?.trim()) {
        doc.setFont("courier", "italic");
        doc.setFontSize(4.5);
        doc.setTextColor(120, 100, 60);
        const noteLines = doc.splitTextToSize(`✎ ${scene.notes}`, CELL_W - 4);
        doc.text(noteLines.slice(0, 2), x + 2, infoY + INFO_H - 1);
      }
    });
  }

  doc.save("storyboard.pdf");
  onProgress?.(null);
}
