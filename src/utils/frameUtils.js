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

  const charDescs = scene.characterDescriptions || {};
  const charParts = (scene.characters || [])
    .filter((c) => charDescs[c])
    .map((c) => `${c} (${charDescs[c]})`);
  const charClause = charParts.length > 0 ? `, featuring ${charParts.join(", ")}` : "";

  const prompt = `${scene.description}${charClause}, ${shotDesc}, ${angleDesc}, ${style.promptSuffix}`;
  return { prompt, style: scene.frameStyle };
}
