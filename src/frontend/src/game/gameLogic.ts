// ─── Game Logic: Update Functions ────────────────────────────────────────────

import {
  AULI_RAGE_PER_TREE_DESTROY,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  NATURE_ANGER_THRESHOLD,
  TREE_SLOTS,
  VICTORY_ANCIENT_TREES,
  WAVE_DURATION,
  WEATHER_DURATION,
} from "./constants";
import type {
  AreaName,
  Arrow,
  Bomb,
  Brother,
  BrotherName,
  FloatingText,
  GameState,
  Particle,
  Shield,
  Shockwave,
  Subbu,
  Tree,
  TreeType,
  Vector2,
  Villain,
  VillainType,
  WeatherType,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

export function dist(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

// ─── Initialization ──────────────────────────────────────────────────────────

export function createInitialState(playerName: string): GameState {
  let treeId = 0;
  let villainId = 0;
  let brotherId = 0;

  // Create initial trees (fill ~half the slots)
  const trees: Tree[] = [];
  const usedSlots = new Set<number>();

  // Place 24 starting trees
  const startSlots = [...TREE_SLOTS.keys()]
    .sort(() => Math.random() - 0.5)
    .slice(0, 24);
  for (const slotIdx of startSlots) {
    const slot = TREE_SLOTS[slotIdx];
    usedSlots.add(slotIdx);
    trees.push(createTree(treeId++, slot.x, slot.y, pickRandomTreeType()));
  }

  // Create brothers (5 males + Papaji the defender) — positioned across the garden
  const brotherNames: BrotherName[] = [
    "Amit",
    "Ashok",
    "Pankaj",
    "Bharat",
    "Neeraj",
  ];
  const brothers: Brother[] = brotherNames.map((name, i) => ({
    id: brotherId++,
    name,
    pos: { x: 100 + i * 220, y: CANVAS_HEIGHT - 25 },
    target: null,
    plantCooldown: randInt(60, 180),
    protectRadius: 80,
    rushingToSubbu: false,
    speedBoost: 0,
    abilityCooldown: randInt(120, 300),
    abilityTimer: 0,
    caughtVillainId: null,
    catchCooldown: 0,
    grabAnimTimer: 0,
  }));

  // Add Papaji — the big defender who patrols the centre
  brothers.push({
    id: brotherId++,
    name: "Papaji",
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    target: null,
    plantCooldown: 9999, // Papaji never plants trees
    protectRadius: 160,
    rushingToSubbu: false,
    speedBoost: 0,
    abilityCooldown: 0,
    abilityTimer: 0,
    caughtVillainId: null,
    catchCooldown: 0,
    grabAnimTimer: 0,
  });

  const subbu: Subbu = {
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    direction: { x: randRange(-1, 1), y: randRange(-1, 1) },
    cryTimer: 60 * 60, // 60s
    cryActive: false,
    cryDuration: 0,
    flowerTimer: 300,
    waterTimer: 180,
  };

  return {
    screen: "playing",
    playerName,
    score: 0,
    wave: 1,
    area: "Backyard Garden",
    trees,
    villains: [],
    arrows: [],
    bombs: [],
    bombIdCounter: 0,
    shields: [],
    shieldIdCounter: 0,
    brothers,
    subbu,
    particles: [],
    floatingTexts: [],
    shockwaves: [],
    weather: "sun",
    weatherTimer: WEATHER_DURATION,
    natureAnger: false,
    natureAngerTimer: 0,
    auliBeastMode: false,
    auliBeastTimer: 0,
    auliRage: 0,
    totalAncientGrown: 0,
    waveTimer: WAVE_DURATION,
    nextWaveCountdown: 0,
    lightningFlash: false,
    lightningTimer: 0,
    canvasShaking: false,
    shakeTimer: 0,
    comboAttackCooldown: 0,
    treeIdCounter: treeId,
    villainIdCounter: villainId,
    brotherIdCounter: brotherId,
    particleIdCounter: 0,
    floatTextIdCounter: 0,
    shockwaveIdCounter: 0,
    arrowIdCounter: 0,
    clickTarget: null,
    paused: false,
    gameOver: false,
    victory: false,
    subbuCryActive: false,
  };
}

function pickRandomTreeType(): TreeType {
  const r = Math.random();
  if (r < 0.5) return "normal";
  if (r < 0.7) return "fruit";
  if (r < 0.85) return "flower";
  return "ancient";
}

export function createTree(
  id: number,
  x: number,
  y: number,
  type: TreeType,
): Tree {
  return {
    id,
    type,
    pos: { x, y },
    health: 50,
    maxHealth: type === "ancient" ? 150 : type === "normal" ? 100 : 80,
    size: type === "ancient" ? 22 : type === "normal" ? 16 : 14,
    growTimer: type === "ancient" ? 600 : 300,
    growthStage: type === "ancient" ? 2 : 1,
    shielded: false,
    shieldTimer: 0,
    waterBoost: false,
    waterTimer: 0,
    fruitTimer: type === "fruit" ? 300 : 0,
  };
}

// ─── Wave / Villain Spawning ─────────────────────────────────────────────────

export function spawnWave(gs: GameState): void {
  const wave = gs.wave;
  const villainTypes: VillainType[] = [
    "chotu",
    "pari",
    "pihu",
    "auli",
    "samar",
    "nonu",
  ];

  // Scale difficulty with wave
  const count = Math.min(2 + wave, 10);

  for (let i = 0; i < count; i++) {
    const type = villainTypes[i % villainTypes.length];
    const side = Math.floor(Math.random() * 4);
    let x: number;
    let y: number;
    switch (side) {
      case 0:
        x = Math.random() * CANVAS_WIDTH;
        y = -20;
        break;
      case 1:
        x = CANVAS_WIDTH + 20;
        y = Math.random() * CANVAS_HEIGHT;
        break;
      case 2:
        x = Math.random() * CANVAS_WIDTH;
        y = CANVAS_HEIGHT + 20;
        break;
      default:
        x = -20;
        y = Math.random() * CANVAS_HEIGHT;
        break;
    }

    const evolveLvl = Math.floor(wave / 2);
    gs.villains.push(
      createVillain(gs.villainIdCounter++, type, x, y, evolveLvl),
    );
  }

  // Update area
  gs.area = getAreaForWave(wave);
}

function getAreaForWave(wave: number): AreaName {
  if (wave <= 2) return "Backyard Garden";
  if (wave <= 4) return "Forest Path";
  if (wave <= 6) return "River Garden";
  if (wave <= 8) return "Mountain Orchard";
  return "Ancient Sacred Forest";
}

function createVillain(
  id: number,
  type: VillainType,
  x: number,
  y: number,
  evolveLvl: number,
): Villain {
  const names: Record<VillainType, string> = {
    chotu: "Chotu",
    pari: "Pari",
    pihu: "Pihu",
    auli: "Auli",
    samar: "Samar",
    nonu: "Nonu",
  };

  const baseHealthMap: Record<VillainType, number> = {
    chotu: 60,
    pari: 80,
    pihu: 70,
    auli: 50,
    samar: 90,
    nonu: 85,
  };

  const baseSpeedMap: Record<VillainType, number> = {
    chotu: 1.6 + evolveLvl * 0.3,
    pari: 1.2,
    pihu: 1.4,
    auli: 1.0,
    samar: 1.3,
    nonu: 1.1,
  };

  return {
    id,
    type,
    name: names[type],
    pos: { x, y },
    target: null,
    speed: baseSpeedMap[type],
    health: baseHealthMap[type] + evolveLvl * 10,
    maxHealth: baseHealthMap[type] + evolveLvl * 10,
    rageLevel: 0,
    beastMode: false,
    attackTimer: 0,
    stunTimer: 0,
    cloneTimer: 0,
    tornadoTimer: 0,
    isClone: false,
    opacity: 1,
    evolutionLevel: evolveLvl,
    hidingBehindTree: false,
    arrowCooldown: 0,
    hideTimer: 0,
  };
}

// ─── Main Update ─────────────────────────────────────────────────────────────

export function updateGame(gs: GameState): void {
  if (gs.paused || gs.gameOver || gs.victory) return;

  const weatherMod = getWeatherModifiers(gs.weather);

  // Timers
  gs.waveTimer--;
  if (gs.waveTimer <= 0) {
    gs.wave++;
    gs.waveTimer = WAVE_DURATION;
    gs.score += gs.wave * 50;
    spawnWave(gs);
    // Spawn some riders too on new wave if needed
  }

  // Weather
  gs.weatherTimer--;
  if (gs.weatherTimer <= 0) {
    gs.weather = getNextWeather(gs.weather);
    gs.weatherTimer = WEATHER_DURATION;
  }

  // Lightning
  if (gs.weather === "storm" && Math.random() < 0.005) {
    gs.lightningFlash = true;
    gs.lightningTimer = 12;
  }
  if (gs.lightningTimer > 0) {
    gs.lightningTimer--;
    if (gs.lightningTimer === 0) gs.lightningFlash = false;
  }

  // Canvas shake
  if (gs.shakeTimer > 0) {
    gs.shakeTimer--;
    if (gs.shakeTimer === 0) gs.canvasShaking = false;
  }

  // Nature anger
  const totalSlots = TREE_SLOTS.length;
  const destroyedRatio = 1 - gs.trees.length / totalSlots;
  const wasAngry = gs.natureAnger;
  gs.natureAnger = destroyedRatio > NATURE_ANGER_THRESHOLD;
  if (gs.natureAnger && !wasAngry) {
    spawnWeatherStorm(gs);
    addFloatingText(
      gs,
      { x: CANVAS_WIDTH / 2, y: 80 },
      "⚠️ NATURE IS ANGRY!",
      "#ef4444",
    );
  }
  if (gs.natureAnger) {
    gs.natureAngerTimer++;
  }

  // Auli beast mode
  if (gs.auliBeastMode) {
    gs.auliBeastTimer--;
    if (gs.auliBeastTimer <= 0) {
      gs.auliBeastMode = false;
      gs.auliRage = 0;
    }
  }

  // Shield rainbow
  if (gs.weather === "rainbow") {
    for (const tree of gs.trees) {
      if (!tree.shielded) {
        tree.shielded = true;
        tree.shieldTimer = 15 * 60;
      }
    }
  }

  // Combo attack cooldown
  if (gs.comboAttackCooldown > 0) gs.comboAttackCooldown--;

  // Update trees
  updateTrees(gs, weatherMod);

  // Update villains
  updateVillains(gs, weatherMod);

  // Update arrows
  updateArrows(gs);

  // Update bombs
  updateBombs(gs);

  // Update shields (Bharat ability)
  updateShields(gs);

  // Update brothers
  updateBrothers(gs, weatherMod);

  // Update Subbu
  updateSubbu(gs);

  // Update particles
  updateParticles(gs);

  // Update floating texts
  gs.floatingTexts = gs.floatingTexts.filter((ft) => {
    ft.life--;
    ft.pos.y -= 0.5;
    return ft.life > 0;
  });

  // Update shockwaves
  gs.shockwaves = gs.shockwaves.filter((sw) => {
    sw.radius += 8;
    sw.life--;
    return sw.life > 0;
  });

  // Check win/loss
  if (gs.trees.length === 0) {
    gs.gameOver = true;
    gs.victory = false;
  }
  if (gs.totalAncientGrown >= VICTORY_ANCIENT_TREES) {
    gs.gameOver = true;
    gs.victory = true;
  }
}

function getWeatherModifiers(weather: WeatherType): {
  treeGrowth: number;
  villainSpeed: number;
  workerSpeed: number;
} {
  switch (weather) {
    case "rain":
      return { treeGrowth: 2.0, villainSpeed: 1.0, workerSpeed: 1.0 };
    case "storm":
      return { treeGrowth: 1.0, villainSpeed: 1.3, workerSpeed: 1.0 };
    case "sun":
      return { treeGrowth: 1.0, villainSpeed: 1.0, workerSpeed: 1.2 };
    case "rainbow":
      return { treeGrowth: 1.2, villainSpeed: 1.0, workerSpeed: 1.0 };
    case "night":
      return { treeGrowth: 0.8, villainSpeed: 1.1, workerSpeed: 0.85 };
    default:
      return { treeGrowth: 1.0, villainSpeed: 1.0, workerSpeed: 1.0 };
  }
}

function getNextWeather(current: WeatherType): WeatherType {
  const weathers: WeatherType[] = ["sun", "rain", "storm", "rainbow", "night"];
  const idx = weathers.indexOf(current);
  return weathers[(idx + 1 + Math.floor(Math.random() * 3)) % weathers.length];
}

function spawnWeatherStorm(gs: GameState): void {
  gs.weather = "storm";
  gs.weatherTimer = WEATHER_DURATION / 2;
}

// ─── Tree Updates ────────────────────────────────────────────────────────────

function updateTrees(gs: GameState, wm: { treeGrowth: number }): void {
  for (const tree of gs.trees) {
    // Shield countdown
    if (tree.shielded && tree.shieldTimer > 0) {
      tree.shieldTimer--;
      if (tree.shieldTimer === 0) tree.shielded = false;
    }

    // Water boost countdown
    if (tree.waterBoost && tree.waterTimer > 0) {
      tree.waterTimer--;
      if (tree.waterTimer === 0) tree.waterBoost = false;
    }

    // Growth
    const growRate = wm.treeGrowth * (tree.waterBoost ? 2.0 : 1.0);
    tree.growTimer -= growRate;

    if (tree.growTimer <= 0) {
      tree.health = Math.min(tree.health + 5, tree.maxHealth);
      tree.growTimer = 300 / growRate;

      // Promote growth stage
      if (tree.growthStage < 3 && tree.health >= tree.maxHealth * 0.8) {
        tree.growthStage++;
        tree.size = Math.min(tree.size + 2, 24);
        if (tree.growthStage === 3 && tree.type !== "ancient") {
          tree.type = "ancient";
          tree.maxHealth = 150;
          gs.totalAncientGrown++;
          gs.score += 200;
          addFloatingText(gs, tree.pos, "+200 Ancient!", "#fbbf24");
          spawnParticles(gs, tree.pos, "sparkle", 10);
        }
      }
    }

    // Fruit production
    if (tree.type === "fruit" && tree.fruitTimer > 0) {
      tree.fruitTimer--;
      if (tree.fruitTimer === 0) {
        gs.score += 25;
        addFloatingText(gs, tree.pos, "+25 🍎", "#fb923c");
        spawnParticles(gs, tree.pos, "fruit", 5);
        tree.fruitTimer = 300;
      }
    }

    // Flower tree: attract butterflies
    if (tree.type === "flower" && Math.random() < 0.002) {
      gs.score += 5;
      addFloatingText(gs, tree.pos, "+5 🦋", "#f0abfc");
      spawnParticles(gs, tree.pos, "sparkle", 3);
    }
  }

  // Spawn new trees at empty slots
  if (Math.random() < 0.003) {
    const usedSlots = new Set(
      gs.trees.map((t) => {
        const idx = TREE_SLOTS.findIndex(
          (s) => Math.abs(s.x - t.pos.x) < 5 && Math.abs(s.y - t.pos.y) < 5,
        );
        return idx;
      }),
    );
    const freeSlots = TREE_SLOTS.map((_, i) => i).filter(
      (i) => !usedSlots.has(i),
    );
    if (freeSlots.length > 0) {
      const slotIdx = freeSlots[Math.floor(Math.random() * freeSlots.length)];
      const slot = TREE_SLOTS[slotIdx];
      gs.trees.push(
        createTree(gs.treeIdCounter++, slot.x, slot.y, pickRandomTreeType()),
      );
    }
  }
}

// ─── Villain Updates ─────────────────────────────────────────────────────────

function updateVillains(gs: GameState, wm: { villainSpeed: number }): void {
  const angerMod = gs.natureAnger ? 1.5 : 1.0;

  for (let i = gs.villains.length - 1; i >= 0; i--) {
    const v = gs.villains[i];

    // Stun
    if (v.stunTimer > 0) {
      v.stunTimer--;
      continue;
    }

    const speed = v.speed * wm.villainSpeed * angerMod;

    // Find target tree
    if (v.target === null || !gs.trees.find((t) => t.id === v.target)) {
      v.target = findNearestUnprotectedTree(gs, v);
    }

    const targetTree = gs.trees.find((t) => t.id === v.target);
    if (!targetTree) {
      // Wander
      v.pos.x += (Math.random() - 0.5) * 2;
      v.pos.y += (Math.random() - 0.5) * 2;
      continue;
    }

    // Auli: skip normal movement when hiding behind tree (she attacks from range)
    if (v.type === "auli" && v.hidingBehindTree && !gs.auliBeastMode) {
      // Stay put, don't move closer
    } else {
      // Move toward target
      const dir = normalize({
        x: targetTree.pos.x - v.pos.x,
        y: targetTree.pos.y - v.pos.y,
      });
      v.pos.x += dir.x * speed;
      v.pos.y += dir.y * speed;
    }

    // Pihu stealth near trees
    if (v.type === "pihu") {
      const nearTree = gs.trees.find((t) => dist(v.pos, t.pos) < 30);
      v.opacity = nearTree ? 0.4 : 1.0;
    }

    // Attack if close (skip for Auli when hiding — she uses arrows instead)
    const d = dist(v.pos, targetTree.pos);
    if (
      d < 25 &&
      !(v.type === "auli" && v.hidingBehindTree && !gs.auliBeastMode)
    ) {
      v.attackTimer++;
      let attackRate = 1;
      if (v.type === "pari") attackRate = 3;
      if (v.type === "chotu") attackRate = 2;
      if (v.type === "auli" && v.beastMode) attackRate = 10;

      if (v.attackTimer % Math.max(1, 12 - attackRate * 3) === 0) {
        if (!targetTree.shielded) {
          let dmg = v.type === "auli" && v.beastMode ? 20 : 5;
          targetTree.health -= dmg;
          spawnParticles(gs, targetTree.pos, "rage", 2);

          if (targetTree.health <= 0) {
            // Tree destroyed
            spawnParticles(gs, targetTree.pos, "leaf", 12);
            addFloatingText(
              gs,
              targetTree.pos,
              "💀 Tree destroyed!",
              COLORS.rage,
            );
            gs.auliRage = Math.min(
              100,
              gs.auliRage + AULI_RAGE_PER_TREE_DESTROY,
            );
            gs.score = Math.max(0, gs.score - 50);
            addFloatingText(
              gs,
              { x: targetTree.pos.x, y: targetTree.pos.y - 20 },
              "-50",
              "#ef4444",
            );

            // Remove tree
            gs.trees = gs.trees.filter((t) => t.id !== targetTree.id);
            v.target = null;

            // Auli rage check
            if (gs.auliRage >= 100 && !gs.auliBeastMode) {
              gs.auliBeastMode = true;
              gs.auliBeastTimer = 8 * 60;
              gs.canvasShaking = true;
              gs.shakeTimer = 30;
              addFloatingText(
                gs,
                { x: CANVAS_WIDTH / 2, y: 60 },
                "🔥 AULI BEAST MODE!",
                "#ff2020",
              );
            }
          }
        } else {
          // Hit shield
          addFloatingText(gs, targetTree.pos, "🛡️", "#7dd3fc");
        }
      }
    }

    // Pari tornado
    if (v.type === "pari") {
      if (v.tornadoTimer > 0) {
        v.tornadoTimer--;
      } else if (Math.random() < 0.002) {
        // Tornado: damage nearby trees
        v.tornadoTimer = 300;
        for (const t of gs.trees) {
          if (dist(v.pos, t.pos) < 80 && !t.shielded) {
            t.health -= 15;
            spawnParticles(gs, t.pos, "rage", 4);
          }
        }
        addFloatingText(gs, v.pos, "🌪️ Tree Tornado!", "#a855f7");
      }
    }

    // Pihu clone
    if (v.type === "pihu" && !v.isClone) {
      if (v.cloneTimer > 0) {
        v.cloneTimer--;
      } else if (
        Math.random() < 0.002 &&
        gs.villains.filter((x) => x.isClone).length < 4
      ) {
        v.cloneTimer = 600;
        // Spawn 2 clones
        for (let c = 0; c < 2; c++) {
          const clone = createVillain(
            gs.villainIdCounter++,
            "pihu",
            v.pos.x + randRange(-30, 30),
            v.pos.y + randRange(-30, 30),
            v.evolutionLevel,
          );
          clone.isClone = true;
          clone.health = 10;
          clone.maxHealth = 10;
          gs.villains.push(clone);
        }
        addFloatingText(gs, v.pos, "🎭 Clone Illusion!", "#f97316");
      }
    }

    // Samar & Nonu: bomb throwers — lob bombs from a distance
    if (v.type === "samar" || v.type === "nonu") {
      if (v.arrowCooldown > 0) {
        v.arrowCooldown--;
      } else {
        // Find nearest cluster of trees to maximise damage
        let bestTarget: Vector2 | null = null;
        let bestClusterSize = 0;
        for (const t of gs.trees) {
          if (t.shielded) continue;
          const d = dist(v.pos, t.pos);
          if (d < 50 || d > 450) continue;
          // Count how many trees are within blast radius of this tree
          const clusterSize = gs.trees.filter(
            (other) => dist(t.pos, other.pos) < 120,
          ).length;
          if (clusterSize > bestClusterSize) {
            bestClusterSize = clusterSize;
            bestTarget = { ...t.pos };
          }
        }
        if (bestTarget) {
          spawnBomb(gs, v, bestTarget);
          // Samar throws faster than Nonu
          v.arrowCooldown = v.type === "samar" ? 220 : 300;
        }
      }
    }

    // Auli beast mode visual + bow-and-arrow hiding mechanic
    if (v.type === "auli") {
      if (gs.auliBeastMode) {
        v.beastMode = true;
        v.hidingBehindTree = false;
      } else {
        v.beastMode = false;

        // Auli hides behind a tree and shoots arrows from a distance
        if (v.arrowCooldown > 0) v.arrowCooldown--;
        if (v.hideTimer > 0) v.hideTimer--;

        // Find a hiding spot behind a tree
        if (!v.hidingBehindTree && v.hideTimer === 0) {
          const hidingTree = gs.trees.find((t) => dist(v.pos, t.pos) < 80);
          if (hidingTree) {
            v.hidingBehindTree = true;
            v.hideTimer = 180 + randRange(60, 120);
            v.opacity = 0.35; // mostly hidden
          }
        }

        // While hiding, shoot arrows at trees from range
        if (v.hidingBehindTree && v.arrowCooldown === 0) {
          // Find the nearest unshielded tree to shoot
          let bestTarget: Tree | null = null;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const t of gs.trees) {
            if (t.shielded) continue;
            const d = dist(v.pos, t.pos);
            if (d > 50 && d < 280 && d < bestDist) {
              bestDist = d;
              bestTarget = t;
            }
          }
          if (bestTarget) {
            spawnArrow(gs, v, bestTarget.pos);
            v.arrowCooldown = 90;
          }
        }

        // Stop hiding when hideTimer expires
        if (v.hidingBehindTree && v.hideTimer <= 0) {
          v.hidingBehindTree = false;
          v.opacity = 1;
          // Move away from tree to find new position
          v.pos.x += (Math.random() - 0.5) * 60;
          v.pos.y += (Math.random() - 0.5) * 60;
          v.pos.x = Math.max(10, Math.min(CANVAS_WIDTH - 10, v.pos.x));
          v.pos.y = Math.max(10, Math.min(CANVAS_HEIGHT - 10, v.pos.y));
          v.hideTimer = 120; // cooldown before hiding again
        }
      }
    }
  }
}

function spawnArrow(gs: GameState, v: Villain, targetPos: Vector2): void {
  const dir = normalize({
    x: targetPos.x - v.pos.x,
    y: targetPos.y - v.pos.y,
  });
  const speed = 5;
  const angle = Math.atan2(dir.y, dir.x);
  gs.arrows.push({
    id: gs.arrowIdCounter++,
    pos: { x: v.pos.x, y: v.pos.y },
    vel: { x: dir.x * speed, y: dir.y * speed },
    ownerId: v.id,
    life: 80,
    angle,
  });
  addFloatingText(gs, v.pos, "🏹", "#991b1b");
}

function spawnBomb(gs: GameState, v: Villain, targetPos: Vector2): void {
  const dir = normalize({
    x: targetPos.x - v.pos.x,
    y: targetPos.y - v.pos.y,
  });
  const travelDist = dist(v.pos, targetPos);
  // Arc speed: travel to target in ~40 frames
  const frames = 40;
  const speed = travelDist / frames;
  gs.bombs.push({
    id: gs.bombIdCounter++,
    pos: { x: v.pos.x, y: v.pos.y },
    vel: { x: dir.x * speed, y: dir.y * speed - 3 }, // slight upward arc
    ownerId: v.id,
    life: frames + 10,
    fuseTimer: frames,
    angle: Math.atan2(dir.y, dir.x),
  });
  addFloatingText(
    gs,
    v.pos,
    "💣 BOMB!",
    v.type === "samar" ? "#f97316" : "#ef4444",
  );
}

function updateBombs(gs: GameState): void {
  const BLAST_RADIUS = 120;
  const MAX_TREES_DESTROYED = 10;

  gs.bombs = gs.bombs.filter((bomb) => {
    bomb.pos.x += bomb.vel.x;
    bomb.pos.y += bomb.vel.y;
    bomb.vel.y += 0.15; // gravity arc
    bomb.fuseTimer--;
    bomb.life--;

    // Explode when fuse hits 0
    if (bomb.fuseTimer <= 0) {
      // Find all trees within blast radius, destroy up to 10
      const treesInRange = gs.trees
        .filter((t) => !t.shielded && dist(bomb.pos, t.pos) < BLAST_RADIUS)
        .sort((a, b) => dist(bomb.pos, a.pos) - dist(bomb.pos, b.pos))
        .slice(0, MAX_TREES_DESTROYED);

      let destroyed = 0;
      for (const t of treesInRange) {
        spawnParticles(gs, t.pos, "rage", 8);
        spawnParticles(gs, t.pos, "leaf", 6);
        gs.auliRage = Math.min(100, gs.auliRage + AULI_RAGE_PER_TREE_DESTROY);
        gs.score = Math.max(0, gs.score - 50);
        gs.trees = gs.trees.filter((tr) => tr.id !== t.id);
        destroyed++;
      }

      // Big explosion particles at bomb center
      spawnParticles(gs, bomb.pos, "rage", 20);
      spawnParticles(gs, bomb.pos, "sparkle", 8);
      gs.shockwaves.push({
        id: gs.shockwaveIdCounter++,
        pos: { ...bomb.pos },
        radius: 0,
        maxRadius: BLAST_RADIUS,
        life: 18,
      });

      if (destroyed > 0) {
        addFloatingText(
          gs,
          bomb.pos,
          `💥 BOOM! -${destroyed} trees!`,
          "#ef4444",
        );
        gs.canvasShaking = true;
        gs.shakeTimer = 20;
      } else {
        addFloatingText(gs, bomb.pos, "💥 BOOM!", "#f97316");
      }

      // Auli rage check
      if (gs.auliRage >= 100 && !gs.auliBeastMode) {
        gs.auliBeastMode = true;
        gs.auliBeastTimer = 8 * 60;
        gs.canvasShaking = true;
        gs.shakeTimer = 30;
        addFloatingText(
          gs,
          { x: CANVAS_WIDTH / 2, y: 60 },
          "🔥 AULI BEAST MODE!",
          "#ff2020",
        );
      }

      return false; // remove bomb after exploding
    }

    // Hit a tree mid-flight? Explode early
    for (const t of gs.trees) {
      if (dist(bomb.pos, t.pos) < 15) {
        bomb.fuseTimer = 0; // trigger explosion next frame effectively
      }
    }

    return bomb.life > 0;
  });
}

// ─── Shield Updates (Bharat ability) ─────────────────────────────────────────

function updateShields(gs: GameState): void {
  gs.shields = gs.shields.filter((shield) => {
    // Rotate angle
    shield.angle += 0.15;
    shield.life--;

    if (shield.returnPhase) {
      // Move toward owner
      const owner = gs.brothers.find((b) => b.id === shield.ownerId);
      if (owner) {
        const dir = normalize({
          x: owner.pos.x - shield.pos.x,
          y: owner.pos.y - shield.pos.y,
        });
        const d = dist(shield.pos, owner.pos);
        if (d < 15) {
          return false; // arrived back, remove
        }
        shield.pos.x += dir.x * 6;
        shield.pos.y += dir.y * 6;
      } else {
        return false;
      }
    } else {
      // Move by velocity
      shield.pos.x += shield.vel.x;
      shield.pos.y += shield.vel.y;

      // Check collision with villains
      for (const v of gs.villains) {
        if (v.stunTimer > 0) continue;
        if (shield.hitVillains.includes(v.id)) continue;
        if (dist(shield.pos, v.pos) < 20) {
          v.health -= 25;
          v.stunTimer = 90;
          shield.hitVillains.push(v.id);
          spawnParticles(gs, v.pos, "shield", 5);
          addFloatingText(gs, v.pos, "-25 🛡️", "#7dd3fc");

          if (v.health <= 0) {
            spawnParticles(gs, v.pos, "sparkle", 8);
            gs.score += 100;
            addFloatingText(gs, v.pos, "+100 🛡️ KO!", "#7dd3fc");
            gs.villains = gs.villains.filter((x) => x.id !== v.id);
          }

          shield.bouncesLeft--;
          if (shield.bouncesLeft <= 0) {
            shield.returnPhase = true;
          } else {
            // Bounce toward next nearest unshielded villain
            let nearestV: Villain | null = null;
            let nearestDist = Number.POSITIVE_INFINITY;
            for (const nv of gs.villains) {
              if (shield.hitVillains.includes(nv.id)) continue;
              const nd = dist(shield.pos, nv.pos);
              if (nd < nearestDist) {
                nearestDist = nd;
                nearestV = nv;
              }
            }
            if (nearestV) {
              const newDir = normalize({
                x: nearestV.pos.x - shield.pos.x,
                y: nearestV.pos.y - shield.pos.y,
              });
              shield.vel = { x: newDir.x * 5, y: newDir.y * 5 };
            } else {
              shield.returnPhase = true;
            }
          }
          break;
        }
      }

      // Out of bounds check
      if (
        shield.pos.x < -50 ||
        shield.pos.x > CANVAS_WIDTH + 50 ||
        shield.pos.y < -50 ||
        shield.pos.y > CANVAS_HEIGHT + 50
      ) {
        shield.returnPhase = true;
      }
    }

    return shield.life > 0;
  });
}

function updateArrows(gs: GameState): void {
  gs.arrows = gs.arrows.filter((arrow) => {
    arrow.pos.x += arrow.vel.x;
    arrow.pos.y += arrow.vel.y;
    arrow.life--;

    // Check if arrow hits a tree
    for (const t of gs.trees) {
      if (dist(arrow.pos, t.pos) < 20) {
        if (!t.shielded) {
          t.health -= 8;
          spawnParticles(gs, t.pos, "rage", 3);
          if (t.health <= 0) {
            spawnParticles(gs, t.pos, "leaf", 12);
            addFloatingText(gs, t.pos, "💀 Arrow hit!", COLORS.rage);
            gs.auliRage = Math.min(
              100,
              gs.auliRage + AULI_RAGE_PER_TREE_DESTROY,
            );
            gs.score = Math.max(0, gs.score - 50);
            gs.trees = gs.trees.filter((tr) => tr.id !== t.id);
            if (gs.auliRage >= 100 && !gs.auliBeastMode) {
              gs.auliBeastMode = true;
              gs.auliBeastTimer = 8 * 60;
              gs.canvasShaking = true;
              gs.shakeTimer = 30;
              addFloatingText(
                gs,
                { x: CANVAS_WIDTH / 2, y: 60 },
                "🔥 AULI BEAST MODE!",
                "#ff2020",
              );
            }
          }
        } else {
          addFloatingText(gs, t.pos, "🛡️", "#7dd3fc");
        }
        return false; // remove arrow on hit
      }
    }

    return arrow.life > 0;
  });
}

function findNearestUnprotectedTree(gs: GameState, v: Villain): number | null {
  let nearest: Tree | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const t of gs.trees) {
    if (t.shielded) continue;
    // Prefer weakest tree (low health)
    const score = dist(v.pos, t.pos) + t.health * 2;
    if (score < nearestDist) {
      nearestDist = score;
      nearest = t;
    }
  }
  return nearest?.id ?? null;
}

// ─── Brother Updates ──────────────────────────────────────────────────────────

function updateBrothers(gs: GameState, wm: { workerSpeed: number }): void {
  // Check brother combos
  const brotherNames = gs.brothers.map((b) => b.name);
  const hasAmitAshok =
    brotherNames.includes("Amit") && brotherNames.includes("Ashok");
  const hasPankajBharat =
    brotherNames.includes("Pankaj") && brotherNames.includes("Bharat");
  const hasNeeraj = brotherNames.includes("Neeraj");
  // allFive counts the original 5 planting brothers (not Papaji)
  const allFive = gs.brothers.filter((b) => b.name !== "Papaji").length === 5;

  // All five: mega forest power (periodically)
  if (allFive && Math.random() < 0.0005) {
    let planted = 0;
    const usedSlots = new Set(
      gs.trees.map((t) => {
        return TREE_SLOTS.findIndex(
          (s) => Math.abs(s.x - t.pos.x) < 5 && Math.abs(s.y - t.pos.y) < 5,
        );
      }),
    );
    const freeSlots = TREE_SLOTS.map((_, i) => i).filter(
      (i) => !usedSlots.has(i),
    );
    for (let j = 0; j < Math.min(5, freeSlots.length); j++) {
      const slot = TREE_SLOTS[freeSlots[j]];
      gs.trees.push(createTree(gs.treeIdCounter++, slot.x, slot.y, "ancient"));
      gs.totalAncientGrown++;
      planted++;
    }
    if (planted > 0) {
      addFloatingText(
        gs,
        { x: CANVAS_WIDTH / 2, y: 80 },
        `🌲 MEGA FOREST! +${planted} trees!`,
        "#4ade80",
      );
      gs.score += planted * 100;
    }
  }

  for (const b of gs.brothers) {
    const speedMult =
      wm.workerSpeed *
      (b.speedBoost > 0 ? 1.5 : 1.0) *
      (hasAmitAshok ? 1.3 : 1.0);

    if (b.speedBoost > 0) b.speedBoost--;
    if (b.abilityTimer > 0) b.abilityTimer--;

    // ── Unique ability per brother (skip for Papaji — he has custom logic above)
    if (b.name === "Papaji") {
      // Handled above
    } else if (b.abilityCooldown > 0) {
      b.abilityCooldown--;
    } else {
      // Fire the ability
      switch (b.name) {
        case "Amit": {
          // Speed Dash: dash to most-threatened tree, heal it, stun nearby villains
          let mostThreatened: Tree | null = null;
          let lowestHealth = Number.POSITIVE_INFINITY;
          for (const t of gs.trees) {
            if (t.health < lowestHealth) {
              lowestHealth = t.health;
              mostThreatened = t;
            }
          }
          if (mostThreatened) {
            b.speedBoost = 120;
            b.target = { x: mostThreatened.pos.x, y: mostThreatened.pos.y };
            mostThreatened.health = Math.min(
              mostThreatened.health + 40,
              mostThreatened.maxHealth,
            );
            // Stun villains along the path (near the target)
            for (const v of gs.villains) {
              if (dist(v.pos, mostThreatened.pos) < 30) {
                v.stunTimer = Math.max(v.stunTimer, 45);
              }
            }
            addFloatingText(gs, b.pos, "⚡ AMIT DASH!", "#fde68a");
            spawnParticles(gs, mostThreatened.pos, "sparkle", 6);
          }
          b.abilityCooldown = 300;
          break;
        }
        case "Ashok": {
          // Healing Aura: heal all trees within 100px
          let healed = 0;
          for (const t of gs.trees) {
            if (dist(b.pos, t.pos) < 100) {
              t.health = Math.min(t.health + 25, t.maxHealth);
              spawnParticles(gs, t.pos, "heal", 4);
              healed++;
            }
          }
          if (healed > 0) {
            // Green shockwave
            gs.shockwaves.push({
              id: gs.shockwaveIdCounter++,
              pos: { ...b.pos },
              radius: 0,
              maxRadius: 100,
              life: 15,
            });
            addFloatingText(gs, b.pos, "💚 ASHOK AURA!", "#4ade80");
          }
          b.abilityCooldown = 360;
          break;
        }
        case "Pankaj": {
          // Ground Stomp: stun all villains within 120px
          let stunned = 0;
          for (const v of gs.villains) {
            if (dist(b.pos, v.pos) < 120) {
              v.stunTimer = Math.max(v.stunTimer, 60);
              stunned++;
            }
          }
          gs.canvasShaking = true;
          gs.shakeTimer = 18;
          gs.shockwaves.push({
            id: gs.shockwaveIdCounter++,
            pos: { ...b.pos },
            radius: 0,
            maxRadius: 130,
            life: 20,
          });
          spawnParticles(gs, b.pos, "stomp", 12);
          addFloatingText(
            gs,
            b.pos,
            stunned > 0 ? `💥 STOMP! ×${stunned}` : "💥 STOMP!",
            "#f97316",
          );
          b.abilityCooldown = 400;
          break;
        }
        case "Bharat": {
          // Shield Throw: find nearest villain, throw shield
          const alreadyHasShield = gs.shields.some((s) => s.ownerId === b.id);
          if (!alreadyHasShield) {
            let nearestVillain: Villain | null = null;
            let nearestDist = Number.POSITIVE_INFINITY;
            for (const v of gs.villains) {
              const d = dist(b.pos, v.pos);
              if (d < 350 && d < nearestDist) {
                nearestDist = d;
                nearestVillain = v;
              }
            }
            if (nearestVillain) {
              const dir = normalize({
                x: nearestVillain.pos.x - b.pos.x,
                y: nearestVillain.pos.y - b.pos.y,
              });
              const newShield: Shield = {
                id: gs.shieldIdCounter++,
                pos: { x: b.pos.x, y: b.pos.y },
                vel: { x: dir.x * 5, y: dir.y * 5 },
                ownerId: b.id,
                bouncesLeft: 3,
                hitVillains: [],
                returnPhase: false,
                life: 180,
                angle: 0,
              };
              gs.shields.push(newShield);
              addFloatingText(gs, b.pos, "🛡️ SHIELD THROW!", "#7dd3fc");
            }
          }
          b.abilityCooldown = 350;
          break;
        }
        case "Neeraj": {
          // Villain Chaser: find nearest villain and charge at it
          let nearestVillain: Villain | null = null;
          let nearestDistN = Number.POSITIVE_INFINITY;
          for (const v of gs.villains) {
            const d = dist(b.pos, v.pos);
            if (d < 300 && d < nearestDistN) {
              nearestDistN = d;
              nearestVillain = v;
            }
          }
          if (nearestVillain) {
            b.target = { x: nearestVillain.pos.x, y: nearestVillain.pos.y };
            b.speedBoost = 60;
            addFloatingText(gs, b.pos, "🏃 NEERAJ!", "#a3e635");
          }
          b.abilityCooldown = 120;
          break;
        }
      }
    }

    // ── Papaji: big defender who catches villains one by one ──────────────────
    if (b.name === "Papaji") {
      if (b.catchCooldown > 0) b.catchCooldown--;
      if (b.grabAnimTimer > 0) b.grabAnimTimer--;

      // If currently holding a villain, carry them off screen (throw them out)
      if (b.caughtVillainId !== null) {
        const caughtV = gs.villains.find((v) => v.id === b.caughtVillainId);
        if (caughtV) {
          // Drag it with Papaji
          caughtV.pos = { x: b.pos.x + 12, y: b.pos.y };
          caughtV.stunTimer = 30; // keep stunned while held
          // Walk Papaji to the right edge to throw them out
          const edgeTarget = { x: CANVAS_WIDTH + 80, y: b.pos.y };
          const dir = normalize({ x: edgeTarget.x - b.pos.x, y: 0 });
          b.pos.x += dir.x * 2.2;
          if (b.pos.x > CANVAS_WIDTH + 60) {
            // Villain escapes off screen (remove)
            gs.villains = gs.villains.filter((v) => v.id !== b.caughtVillainId);
            gs.score += 150;
            addFloatingText(
              gs,
              { x: CANVAS_WIDTH - 60, y: b.pos.y },
              "+150 👴 PAPAJI CAUGHT!",
              "#f59e0b",
            );
            spawnParticles(
              gs,
              { x: CANVAS_WIDTH - 80, y: b.pos.y },
              "sparkle",
              10,
            );
            b.caughtVillainId = null;
            b.catchCooldown = 200;
            // Walk back to centre
            b.pos.x = CANVAS_WIDTH / 2;
            b.pos.y = CANVAS_HEIGHT / 2;
          }
        } else {
          b.caughtVillainId = null;
        }
        // Skip normal targeting while holding someone
      } else if (b.catchCooldown === 0) {
        // Find closest villain (one at a time — Papaji is methodical)
        let closestV: Villain | null = null;
        let closestD = Number.POSITIVE_INFINITY;
        for (const v of gs.villains) {
          if (v.stunTimer > 60) continue; // already handled
          const d = dist(b.pos, v.pos);
          if (d < closestD) {
            closestD = d;
            closestV = v;
          }
        }
        if (closestV) {
          b.target = { x: closestV.pos.x, y: closestV.pos.y };
          const d = dist(b.pos, closestV.pos);
          if (d < 22) {
            // CATCH!
            b.caughtVillainId = closestV.id;
            closestV.stunTimer = 999; // fully immobilised
            b.grabAnimTimer = 30;
            b.target = null;
            addFloatingText(gs, b.pos, "👴 GOT YOU!", "#f59e0b");
            gs.canvasShaking = true;
            gs.shakeTimer = 10;
          }
        }
      }
    }

    // Neeraj: deal damage when close to target villain
    if (b.name === "Neeraj" && b.target !== null && b.speedBoost > 0) {
      for (const v of gs.villains) {
        if (dist(b.pos, v.pos) < 20) {
          v.health -= 30;
          spawnParticles(gs, v.pos, "sparkle", 6);
          addFloatingText(gs, v.pos, "-30 🏃", "#a3e635");
          if (v.health <= 0) {
            spawnParticles(gs, v.pos, "sparkle", 10);
            gs.score += 100;
            addFloatingText(gs, v.pos, "+100 KO!", "#a3e635");
            gs.villains = gs.villains.filter((x) => x.id !== v.id);
          }
          b.target = null;
          b.speedBoost = 0;
          break;
        }
      }
    }

    // Rush to Subbu?
    if (gs.subbuCryActive) {
      b.target = { ...gs.subbu.pos };
      b.rushingToSubbu = true;
    } else if (b.rushingToSubbu && dist(b.pos, gs.subbu.pos) < 20) {
      b.rushingToSubbu = false;
      b.target = null;
    }

    // Plant trees if empty slot nearby (Papaji never plants — he only defends)
    if (
      b.name !== "Papaji" &&
      !b.rushingToSubbu &&
      b.target === null &&
      b.plantCooldown === 0
    ) {
      const usedSlots = new Set(
        gs.trees.map((t) => {
          return TREE_SLOTS.findIndex(
            (s) => Math.abs(s.x - t.pos.x) < 5 && Math.abs(s.y - t.pos.y) < 5,
          );
        }),
      );
      const freeSlots = TREE_SLOTS.map((s, i) => ({ s, i }))
        .filter(({ i }) => !usedSlots.has(i))
        .sort(
          (a, b) =>
            dist({ x: b.s.x, y: b.s.y }, a.s) -
            dist({ x: b.s.x, y: b.s.y }, b.s),
        );

      if (freeSlots.length > 0) {
        const slot = freeSlots[0].s;
        b.target = { x: slot.x, y: slot.y };
      }
    }

    // Move toward target
    if (b.target && b.caughtVillainId === null) {
      const dir = normalize({
        x: b.target.x - b.pos.x,
        y: b.target.y - b.pos.y,
      });
      const d = dist(b.pos, b.target);
      // Papaji is slower but relentless
      const moveSpeed = b.name === "Papaji" ? 1.8 : 1.5 * speedMult;

      if (d > 8) {
        b.pos.x += dir.x * moveSpeed;
        b.pos.y += dir.y * moveSpeed;
      } else {
        // Arrived
        if (!b.rushingToSubbu && b.name !== "Papaji") {
          // Plant a tree here if empty
          const slotIdx = TREE_SLOTS.findIndex(
            (s) =>
              Math.abs(s.x - b.target!.x) < 5 &&
              Math.abs(s.y - b.target!.y) < 5,
          );
          const alreadyOccupied = gs.trees.some(
            (t) =>
              Math.abs(t.pos.x - b.target!.x) < 5 &&
              Math.abs(t.pos.y - b.target!.y) < 5,
          );
          if (slotIdx >= 0 && !alreadyOccupied) {
            const treeType: TreeType = hasNeeraj ? "ancient" : "normal";
            gs.trees.push(
              createTree(gs.treeIdCounter++, b.target.x, b.target.y, treeType),
            );
            if (treeType === "ancient") gs.totalAncientGrown++;
            gs.score += 30;
            addFloatingText(gs, b.target, `+30 🌱 ${b.name}`, "#4ade80");
            spawnParticles(gs, b.target, "heal", 5);
          }

          // Pankaj+Bharat: protect nearby trees
          if (hasPankajBharat && (b.name === "Pankaj" || b.name === "Bharat")) {
            for (const t of gs.trees) {
              if (dist(b.pos, t.pos) < 80) {
                t.health = Math.min(t.health + 30, t.maxHealth);
              }
            }
          }

          b.target = null;
          b.plantCooldown = hasAmitAshok ? 90 : 180;
        } else if (b.name !== "Papaji") {
          // just clear target for non-Papaji rushing to Subbu
          b.rushingToSubbu = false;
        }
        if (b.name === "Papaji") {
          b.target = null; // Papaji just clears target and looks for next villain
        }
      }
    } else if (b.plantCooldown > 0 && b.name !== "Papaji") {
      b.plantCooldown--;
      // Wander a bit
      b.pos.x += (Math.random() - 0.5) * 1.5;
      b.pos.y += (Math.random() - 0.5) * 1.5;
      b.pos.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, b.pos.x));
      b.pos.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, b.pos.y));
    } else if (
      b.name === "Papaji" &&
      b.caughtVillainId === null &&
      b.catchCooldown === 0
    ) {
      // Papaji wanders slowly looking for next target
      b.pos.x += (Math.random() - 0.5) * 0.8;
      b.pos.y += (Math.random() - 0.5) * 0.8;
      b.pos.x = Math.max(30, Math.min(CANVAS_WIDTH - 30, b.pos.x));
      b.pos.y = Math.max(30, Math.min(CANVAS_HEIGHT - 30, b.pos.y));
    }
  }
}

// ─── Subbu Updates ───────────────────────────────────────────────────────────

function updateSubbu(gs: GameState): void {
  const s = gs.subbu;

  // Wander
  if (Math.random() < 0.02) {
    s.direction = normalize({
      x: randRange(-1, 1),
      y: randRange(-1, 1),
    });
  }
  s.pos.x += s.direction.x * 0.8;
  s.pos.y += s.direction.y * 0.8;
  s.pos.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, s.pos.x));
  s.pos.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, s.pos.y));
  if (s.pos.x <= 20 || s.pos.x >= CANVAS_WIDTH - 20) s.direction.x *= -1;
  if (s.pos.y <= 20 || s.pos.y >= CANVAS_HEIGHT - 20) s.direction.y *= -1;

  // Water spill near trees
  s.waterTimer--;
  if (s.waterTimer <= 0) {
    s.waterTimer = 180;
    for (const t of gs.trees) {
      if (dist(s.pos, t.pos) < 50) {
        t.waterBoost = true;
        t.waterTimer = 240;
        spawnParticles(gs, t.pos, "water", 5);
        gs.score += 10;
      }
    }
  }

  // Flower throw
  s.flowerTimer--;
  if (s.flowerTimer <= 0) {
    s.flowerTimer = 300;
    for (const t of gs.trees) {
      if (dist(s.pos, t.pos) < 80) {
        t.health = Math.min(t.health + 20, t.maxHealth);
        spawnParticles(gs, t.pos, "sparkle", 4);
        addFloatingText(gs, t.pos, "+20 🌸", "#f0abfc");
      }
    }
  }

  // Cry alarm
  s.cryTimer--;
  if (s.cryTimer <= 0) {
    s.cryTimer = 60 * 60; // reset
    s.cryActive = true;
    s.cryDuration = 180;
    gs.subbuCryActive = true;
    addFloatingText(gs, s.pos, "😢 CRY ALARM!", "#60a5fa");
    spawnParticles(gs, s.pos, "water", 12);
  }

  if (s.cryActive) {
    s.cryDuration--;
    if (s.cryDuration <= 0) {
      s.cryActive = false;
      gs.subbuCryActive = false;
      // Reset brother rush flags
      for (const b of gs.brothers) b.rushingToSubbu = false;
    }
  }
}

// ─── Particles ───────────────────────────────────────────────────────────────

function updateParticles(gs: GameState): void {
  gs.particles = gs.particles.filter((p) => {
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.vel.y += 0.05; // gravity
    p.life--;
    return p.life > 0;
  });
}

export function spawnParticles(
  gs: GameState,
  pos: Vector2,
  type: Particle["type"],
  count: number,
): void {
  const colorMap: Record<Particle["type"], string> = {
    leaf: "#4ade80",
    sparkle: "#fde68a",
    water: "#7dd3fc",
    rage: "#ef4444",
    heal: "#4ade80",
    fruit: "#fb923c",
    shockwave: "#38bdf8",
    lightning: "#fde68a",
    shield: "#7dd3fc",
    stomp: "#f97316",
  };

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(0.5, 2.5);
    gs.particles.push({
      id: gs.particleIdCounter++,
      pos: { x: pos.x + randRange(-5, 5), y: pos.y + randRange(-5, 5) },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 1 },
      color: colorMap[type],
      size: randRange(2, 5),
      life: randInt(20, 45),
      maxLife: 45,
      type,
    });
  }
}

export function addFloatingText(
  gs: GameState,
  pos: Vector2,
  text: string,
  color: string,
): void {
  gs.floatingTexts.push({
    id: gs.floatTextIdCounter++,
    pos: { x: pos.x, y: pos.y - 10 },
    text,
    color,
    life: 80,
    maxLife: 80,
  });
}

// ─── Input Handling ──────────────────────────────────────────────────────────

export function handleCanvasClick(
  gs: GameState,
  canvasX: number,
  canvasY: number,
): void {
  const clickPos: Vector2 = { x: canvasX, y: canvasY };

  // Check if clicked on a villain — direct brothers to chase it
  for (const v of gs.villains) {
    if (dist(clickPos, v.pos) < 20) {
      addFloatingText(gs, clickPos, "⚡ On it!", "#4ade80");
      return;
    }
  }

  // Otherwise ignore (brothers auto-target)
}
