// ─── Game Constants ──────────────────────────────────────────────────────────

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 700;

export const TREE_GRID_COLS = 11;
export const TREE_GRID_ROWS = 6;

// Tree slot positions (grid-based)
export const TREE_SLOTS: Array<{ x: number; y: number }> = [];
for (let row = 0; row < TREE_GRID_ROWS; row++) {
  for (let col = 0; col < TREE_GRID_COLS; col++) {
    TREE_SLOTS.push({
      x: 90 + col * 100,
      y: 80 + row * 90,
    });
  }
}

export const WEATHER_DURATION = 30 * 60; // 30s at 60fps

export const AULI_RAGE_PER_TREE_DESTROY = 12;
export const NATURE_ANGER_THRESHOLD = 0.3; // 30% trees destroyed

export const VICTORY_ANCIENT_TREES = 100;
export const WAVE_DURATION = 45 * 60; // 45s per wave

// Colors (literal values for Canvas)
export const COLORS = {
  // Backgrounds / terrain
  bg: "#0d1f1a",
  gridCell: "#142b22",
  gridLine: "#1e3d2e",
  path: "#2a1f0f",

  // Trees
  normalTree: "#2d8a4a",
  fruitTree: "#e07820",
  flowerTree: "#e060a0",
  ancientTree: "#1a6040",
  treeAura: "rgba(26,96,64,0.25)",
  treeShield: "rgba(100,200,255,0.35)",
  treeHealthBar: "#4ade80",
  treeDamagedBar: "#f87171",

  // Villains
  chotu: "#ef4444",
  pari: "#a855f7",
  pihu: "#f97316",
  auli: "#991b1b",
  auliBeast: "#ff2020",
  villainOutline: "#ffffff",

  // Riders
  rider: "#3b82f6",
  riderGlow: "rgba(59,130,246,0.4)",
  shield: "rgba(200,240,255,0.6)",

  // Brothers
  brother: "#22c55e",
  brotherOutline: "#ffffff",
  papaji: "#d97706",
  papajiAura: "rgba(245,158,11,0.2)",

  // Subbu
  subbu: "#fcd34d",
  subbuEye: "#1e293b",
  subbuCry: "#60a5fa",

  // UI
  hudBg: "rgba(10,25,20,0.88)",
  hudBorder: "#2d7a4a",
  rageFill: "#ef4444",
  rageEmpty: "#3f1515",
  scoreText: "#fbbf24",
  waveText: "#a3e635",
  areaText: "#67e8f9",

  // Particles
  spark: "#fde68a",
  waterDrop: "#7dd3fc",
  rage: "#ef4444",
  heal: "#4ade80",
  leaf: "#86efac",
  fruit: "#fb923c",

  // Weather overlays
  rainOverlay: "rgba(80,130,200,0.12)",
  stormOverlay: "rgba(80,50,130,0.15)",
  sunOverlay: "rgba(255,220,50,0.08)",
  rainbowOverlay: "rgba(100,200,150,0.08)",
  nightOverlay: "rgba(5,5,30,0.42)",
};

export const WEATHER_ICONS: Record<string, string> = {
  sun: "☀️",
  rain: "🌧️",
  storm: "⛈️",
  rainbow: "🌈",
  night: "🌙",
};

export const AREA_TERRAIN: Record<string, string> = {
  "Backyard Garden": "#142b22",
  "Forest Path": "#0f2318",
  "River Garden": "#0f1e2d",
  "Mountain Orchard": "#1a1a0f",
  "Ancient Sacred Forest": "#0d0f1a",
};
