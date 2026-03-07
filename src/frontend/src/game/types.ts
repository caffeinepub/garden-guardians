// ─── Game Types ─────────────────────────────────────────────────────────────

export type GameScreen =
  | "start"
  | "playing"
  | "paused"
  | "gameover"
  | "highscores";

export type WeatherType = "sun" | "rain" | "storm" | "rainbow" | "night";

export type TreeType = "normal" | "fruit" | "flower" | "ancient";

export type VillainType = "chotu" | "pari" | "pihu" | "auli" | "samar" | "nonu";

export type RiderName = "Nishi" | "Mohini" | "Gaytri" | "Meenakshi" | "Sashi";

export type BrotherName = "Amit" | "Ashok" | "Pankaj" | "Bharat" | "Neeraj";

export type AreaName =
  | "Backyard Garden"
  | "Forest Path"
  | "River Garden"
  | "Mountain Orchard"
  | "Ancient Sacred Forest";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Tree {
  id: number;
  type: TreeType;
  pos: Vector2;
  health: number;
  maxHealth: number;
  size: number;
  growTimer: number; // ticks until it grows
  growthStage: number; // 0 = seedling, 1 = young, 2 = mature, 3 = ancient
  shielded: boolean;
  shieldTimer: number;
  waterBoost: boolean;
  waterTimer: number;
  fruitTimer: number; // ticks until fruit produced
}

export interface Arrow {
  id: number;
  pos: Vector2;
  vel: Vector2;
  ownerId: number; // villain id
  life: number;
  angle: number;
}

export interface Bomb {
  id: number;
  pos: Vector2;
  vel: Vector2;
  ownerId: number; // villain id
  life: number;
  fuseTimer: number; // counts down to explosion
  angle: number;
}

export interface Villain {
  id: number;
  type: VillainType;
  name: string;
  pos: Vector2;
  target: number | null; // tree id
  speed: number;
  health: number;
  maxHealth: number;
  rageLevel: number; // 0-100 (Auli specific)
  beastMode: boolean;
  attackTimer: number;
  stunTimer: number;
  cloneTimer: number; // Pihu clone cooldown
  tornadoTimer: number; // Pari tornado cooldown
  isClone: boolean; // Pihu fake copy
  opacity: number; // Pihu stealth
  evolutionLevel: number; // increases each wave
  hidingBehindTree: boolean; // Auli specific - hiding
  arrowCooldown: number; // Auli arrow fire cooldown
  hideTimer: number; // How long Auli stays hidden
}

export interface Rider {
  id: number;
  name: RiderName;
  pos: Vector2;
  target: Vector2 | null;
  villainTarget: number | null;
  speed: number;
  health: number;
  shieldTimer: number;
  healCooldown: number;
  comboTimer: number;
  rushingToSubbu: boolean;
}

export interface Brother {
  id: number;
  name: BrotherName;
  pos: Vector2;
  target: Vector2 | null;
  plantCooldown: number;
  protectRadius: number;
  rushingToSubbu: boolean;
  speedBoost: number;
}

export interface Subbu {
  pos: Vector2;
  direction: Vector2;
  cryTimer: number; // countdown to cry alarm
  cryActive: boolean;
  cryDuration: number;
  flowerTimer: number;
  waterTimer: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type:
    | "leaf"
    | "sparkle"
    | "water"
    | "rage"
    | "heal"
    | "fruit"
    | "shockwave"
    | "lightning";
}

export interface FloatingText {
  id: number;
  pos: Vector2;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Shockwave {
  id: number;
  pos: Vector2;
  radius: number;
  maxRadius: number;
  life: number;
}

export interface GameState {
  screen: GameScreen;
  playerName: string;
  score: number;
  wave: number;
  area: AreaName;
  trees: Tree[];
  villains: Villain[];
  arrows: Arrow[];
  bombs: Bomb[];
  bombIdCounter: number;
  riders: Rider[];
  brothers: Brother[];
  subbu: Subbu;
  particles: Particle[];
  floatingTexts: FloatingText[];
  shockwaves: Shockwave[];
  arrowIdCounter: number;
  weather: WeatherType;
  weatherTimer: number;
  natureAnger: boolean;
  natureAngerTimer: number;
  auliBeastMode: boolean;
  auliBeastTimer: number;
  auliRage: number; // 0-100
  totalAncientGrown: number; // cumulative
  waveTimer: number;
  nextWaveCountdown: number;
  lightningFlash: boolean;
  lightningTimer: number;
  canvasShaking: boolean;
  shakeTimer: number;
  comboAttackCooldown: number;
  treeIdCounter: number;
  villainIdCounter: number;
  riderIdCounter: number;
  brotherIdCounter: number;
  particleIdCounter: number;
  floatTextIdCounter: number;
  shockwaveIdCounter: number;
  clickTarget: Vector2 | null;
  selectedRiderIndex: number;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;
  subbuCryActive: boolean;
}

export interface HUDState {
  score: number;
  wave: number;
  area: AreaName;
  treeCount: number;
  maxTrees: number;
  ancientCount: number;
  auliRage: number;
  weather: WeatherType;
  natureAnger: boolean;
  paused: boolean;
  victory: boolean;
  gameOver: boolean;
  auliBeastMode: boolean;
}
