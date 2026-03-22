import LZString from "lz-string";

// Fields that are transient/runtime-only — don't persist in URL
const SKIP_FIELDS = new Set(["frameLoading", "frameError"]);

export function encodeState(scenes) {
  const slim = scenes.map((s) => {
    const out = {};
    for (const [k, v] of Object.entries(s)) {
      if (!SKIP_FIELDS.has(k)) out[k] = v;
    }
    return out;
  });
  const json = JSON.stringify(slim);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeState(hash) {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    const json = LZString.decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const scenes = JSON.parse(json);
    if (!Array.isArray(scenes) || !scenes.length) return null;
    // Restore transient fields with defaults
    return scenes.map((s) => ({
      frameLoading: false,
      frameError: null,
      ...s,
    }));
  } catch {
    return null;
  }
}

export function writeHash(scenes) {
  if (!scenes.length) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return;
  }
  const encoded = encodeState(scenes);
  history.replaceState(null, "", `#${encoded}`);
}

export function readHash() {
  return window.location.hash ? decodeState(window.location.hash) : null;
}
