// ─── Game Renderer ────────────────────────────────────────────────────────────

import {
  AREA_TERRAIN,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  RIDER_COLORS,
  TREE_SLOTS,
  WAVE_DURATION,
  WEATHER_ICONS,
} from "./constants";
import { dist } from "./gameLogic";
import type { Brother, GameState, Rider, Tree, Villain } from "./types";

// ─── Main Render Entry ───────────────────────────────────────────────────────

export function renderGame(ctx: CanvasRenderingContext2D, gs: GameState): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background terrain
  const terrainColor = AREA_TERRAIN[gs.area] ?? COLORS.bg;
  ctx.fillStyle = terrainColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid
  drawGrid(ctx, gs);

  // Weather overlay
  drawWeatherOverlay(ctx, gs);

  // Ancient tree auras
  drawTreeAuras(ctx, gs);

  // Trees
  for (const t of gs.trees) drawTree(ctx, t);

  // Shockwaves
  for (const sw of gs.shockwaves) {
    ctx.beginPath();
    ctx.arc(sw.pos.x, sw.pos.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56,189,248,${sw.life / sw.maxRadius})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Brothers
  for (const b of gs.brothers) drawBrother(ctx, b, gs);

  // Riders
  for (const r of gs.riders) drawRider(ctx, r, gs);

  // Subbu
  drawSubbu(ctx, gs);

  // Villains
  for (const v of gs.villains) drawVillain(ctx, v, gs);

  // Particles
  for (const p of gs.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating texts
  for (const ft of gs.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha;
    ctx.font = "bold 13px Sora, sans-serif";
    ctx.fillStyle = ft.color;
    ctx.textAlign = "center";
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  // Lightning flash
  if (gs.lightningFlash) {
    const flashAlpha = Math.min(1, gs.lightningTimer / 6) * 0.5;
    ctx.fillStyle = `rgba(200,200,255,${flashAlpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Nature anger vignette
  if (gs.natureAnger) {
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      100,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.7,
    );
    const pulse = 0.15 + Math.sin(Date.now() / 300) * 0.05;
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, `rgba(200,30,30,${pulse})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.font = "bold 16px Bricolage Grotesque, sans-serif";
    ctx.fillStyle = "#ff6060";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 12;
    ctx.fillText("⚠️ NATURE IS ANGRY! ⚠️", CANVAS_WIDTH / 2, 30);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // Auli beast mode overlay
  if (gs.auliBeastMode) {
    const beastAlpha = 0.08 + Math.sin(Date.now() / 150) * 0.04;
    ctx.fillStyle = `rgba(255,20,20,${beastAlpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, gs: GameState): void {
  // Draw subtle grid lines
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3;

  for (let x = 0; x < CANVAS_WIDTH; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Draw tree slot indicators for empty slots
  ctx.globalAlpha = 0.15;
  for (const slot of TREE_SLOTS) {
    const occupied = gs.trees.some(
      (t) => Math.abs(t.pos.x - slot.x) < 5 && Math.abs(t.pos.y - slot.y) < 5,
    );
    if (!occupied) {
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#2d7a4a";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Weather Overlay ─────────────────────────────────────────────────────────

function drawWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
): void {
  switch (gs.weather) {
    case "rain": {
      ctx.fillStyle = COLORS.rainOverlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Draw rain streaks
      ctx.strokeStyle = "rgba(150,200,255,0.25)";
      ctx.lineWidth = 1;
      const t = Date.now() / 100;
      for (let i = 0; i < 40; i++) {
        const x = ((i * 73 + t * 5) % (CANVAS_WIDTH + 40)) - 20;
        const y = ((i * 47 + t * 8) % (CANVAS_HEIGHT + 40)) - 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 15);
        ctx.stroke();
      }
      break;
    }
    case "storm": {
      ctx.fillStyle = COLORS.stormOverlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      break;
    }
    case "sun": {
      const sunGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        0,
        20,
        CANVAS_WIDTH / 2,
        0,
        300,
      );
      sunGrad.addColorStop(0, "rgba(255,220,50,0.12)");
      sunGrad.addColorStop(1, "transparent");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      break;
    }
    case "rainbow": {
      // Subtle rainbow arc
      const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      grad.addColorStop(0, "rgba(255,80,80,0.04)");
      grad.addColorStop(0.25, "rgba(255,220,50,0.05)");
      grad.addColorStop(0.5, "rgba(80,220,80,0.06)");
      grad.addColorStop(0.75, "rgba(80,140,255,0.05)");
      grad.addColorStop(1, "rgba(180,80,255,0.04)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      break;
    }
    case "night": {
      ctx.fillStyle = COLORS.nightOverlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Stars
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 30; i++) {
        const starX = (i * 137) % CANVAS_WIDTH;
        const starY = (i * 89) % (CANVAS_HEIGHT * 0.3);
        const blink = 0.4 + Math.sin(Date.now() / 500 + i) * 0.3;
        ctx.globalAlpha = blink * 0.6;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(starX, starY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

// ─── Ancient Tree Auras ───────────────────────────────────────────────────────

function drawTreeAuras(ctx: CanvasRenderingContext2D, gs: GameState): void {
  for (const t of gs.trees) {
    if (t.type === "ancient") {
      const pulse = 0.15 + Math.sin(Date.now() / 800 + t.id) * 0.05;
      ctx.beginPath();
      ctx.arc(
        t.pos.x,
        t.pos.y,
        t.size + 20 + Math.sin(Date.now() / 600) * 4,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(26,96,64,${pulse})`;
      ctx.fill();
    }
  }
}

// ─── Tree Renderer ────────────────────────────────────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, t: Tree): void {
  const colorMap: Record<string, string> = {
    normal: COLORS.normalTree,
    fruit: COLORS.fruitTree,
    flower: COLORS.flowerTree,
    ancient: COLORS.ancientTree,
  };

  const color = colorMap[t.type] || COLORS.normalTree;
  const size = t.size;
  const healthRatio = t.health / t.maxHealth;

  // Water ripple
  if (t.waterBoost) {
    ctx.beginPath();
    ctx.arc(
      t.pos.x,
      t.pos.y,
      size + 6 + Math.sin(Date.now() / 200) * 3,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(125,211,252,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Shield
  if (t.shielded) {
    ctx.beginPath();
    ctx.arc(
      t.pos.x,
      t.pos.y,
      size + 10 + Math.sin(Date.now() / 300) * 2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "rgba(100,200,255,0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(100,200,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Tree body (circle)
  ctx.beginPath();
  ctx.arc(t.pos.x, t.pos.y, size, 0, Math.PI * 2);

  if (t.type === "ancient") {
    const grad = ctx.createRadialGradient(
      t.pos.x - 5,
      t.pos.y - 5,
      2,
      t.pos.x,
      t.pos.y,
      size,
    );
    grad.addColorStop(0, "#2d8a50");
    grad.addColorStop(1, "#0f4030");
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = color;
  }
  ctx.fill();

  // Outline
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Trunk
  ctx.beginPath();
  ctx.moveTo(t.pos.x, t.pos.y + size * 0.8);
  ctx.lineTo(t.pos.x, t.pos.y + size * 0.8 + 8);
  ctx.strokeStyle = "#8B5E3C";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Type emoji
  const emojiMap: Record<string, string> = {
    normal: "🌱",
    fruit: "🍎",
    flower: "🌸",
    ancient: "🌳",
  };
  ctx.font = `${Math.floor(size * 0.8)}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(emojiMap[t.type] ?? "🌱", t.pos.x, t.pos.y + 5);
  ctx.textAlign = "left";

  // Health bar
  const barW = size * 2;
  const barX = t.pos.x - size;
  const barY = t.pos.y + size + 10;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(barX, barY, barW, 3);
  const healthColor =
    healthRatio > 0.5
      ? COLORS.treeHealthBar
      : healthRatio > 0.25
        ? "#facc15"
        : COLORS.treeDamagedBar;
  ctx.fillStyle = healthColor;
  ctx.fillRect(barX, barY, barW * healthRatio, 3);
}

// ─── Villain Renderer ─────────────────────────────────────────────────────────

function drawVillain(
  ctx: CanvasRenderingContext2D,
  v: Villain,
  gs: GameState,
): void {
  if (v.stunTimer > 0) ctx.globalAlpha = 0.5;
  else ctx.globalAlpha = v.opacity;

  const colorMap: Record<string, string> = {
    chotu: COLORS.chotu,
    pari: COLORS.pari,
    pihu: COLORS.pihu,
    auli: v.beastMode && gs.auliBeastMode ? COLORS.auliBeast : COLORS.auli,
  };
  const color = colorMap[v.type] ?? "#ff0000";
  const size = v.type === "auli" ? 12 : 16;

  // Beast mode glow
  if (v.type === "auli" && gs.auliBeastMode) {
    const glow = ctx.createRadialGradient(
      v.pos.x,
      v.pos.y,
      2,
      v.pos.x,
      v.pos.y,
      35,
    );
    glow.addColorStop(0, "rgba(255,30,30,0.6)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(v.pos.x - 35, v.pos.y - 35, 70, 70);
  }

  // Pari tornado indicator
  if (v.type === "pari" && v.tornadoTimer > 240) {
    ctx.beginPath();
    ctx.arc(v.pos.x, v.pos.y, 80, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(168,85,247,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Body
  ctx.beginPath();
  ctx.arc(v.pos.x, v.pos.y, size, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Emoji icon
  const emojiMap: Record<string, string> = {
    chotu: "😈",
    pari: "🪓",
    pihu: v.isClone ? "👻" : "🎭",
    auli: gs.auliBeastMode ? "🔥" : "😡",
  };
  ctx.font = "12px serif";
  ctx.textAlign = "center";
  ctx.fillText(emojiMap[v.type] ?? "😈", v.pos.x, v.pos.y + 4);
  ctx.textAlign = "left";

  // Name label
  ctx.globalAlpha = 1;
  ctx.font = "bold 9px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 3;
  ctx.fillText(v.isClone ? "Clone" : v.name, v.pos.x, v.pos.y - size - 3);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Health bar
  const healthRatio = v.health / v.maxHealth;
  const barW = 30;
  const barX = v.pos.x - 15;
  const barY = v.pos.y + size + 4;
  ctx.fillStyle = "#300000";
  ctx.fillRect(barX, barY, barW, 3);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(barX, barY, barW * healthRatio, 3);

  ctx.globalAlpha = 1;
}

// ─── Rider Renderer ───────────────────────────────────────────────────────────

function drawRider(
  ctx: CanvasRenderingContext2D,
  r: Rider,
  _gs: GameState,
): void {
  const color = RIDER_COLORS[r.name] ?? "#3b82f6";

  // Shield bubble
  if (r.shieldTimer > 0) {
    ctx.beginPath();
    ctx.arc(r.pos.x, r.pos.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,240,255,0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(200,240,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Glow
  const glow = ctx.createRadialGradient(
    r.pos.x,
    r.pos.y,
    2,
    r.pos.x,
    r.pos.y,
    20,
  );
  glow.addColorStop(0, `${color}88`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(r.pos.x - 20, r.pos.y - 20, 40, 40);

  // Bike body (simplified)
  ctx.fillStyle = color;
  ctx.fillRect(r.pos.x - 10, r.pos.y - 5, 20, 8);
  // Wheels
  ctx.beginPath();
  ctx.arc(r.pos.x - 7, r.pos.y + 5, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r.pos.x + 7, r.pos.y + 5, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.stroke();
  // Rider head
  ctx.beginPath();
  ctx.arc(r.pos.x + 2, r.pos.y - 9, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Name
  ctx.font = "bold 8px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 3;
  ctx.fillText(r.name, r.pos.x, r.pos.y - 17);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Rushing to Subbu indicator
  if (r.rushingToSubbu) {
    ctx.font = "10px serif";
    ctx.textAlign = "center";
    ctx.fillText("💨", r.pos.x, r.pos.y - 25);
    ctx.textAlign = "left";
  }
}

// ─── Brother Renderer ─────────────────────────────────────────────────────────

function drawBrother(
  ctx: CanvasRenderingContext2D,
  b: Brother,
  _gs: GameState,
): void {
  const color = COLORS.brother;

  // Body (humanoid)
  // Head
  ctx.beginPath();
  ctx.arc(b.pos.x, b.pos.y - 12, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#fcd34d";
  ctx.fill();
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(b.pos.x - 5, b.pos.y - 7, 10, 12);
  // Legs
  ctx.fillStyle = "#1a4a2a";
  ctx.fillRect(b.pos.x - 5, b.pos.y + 5, 4, 7);
  ctx.fillRect(b.pos.x + 1, b.pos.y + 5, 4, 7);

  // Name
  ctx.font = "bold 8px Sora, sans-serif";
  ctx.fillStyle = "#a3e635";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 2;
  ctx.fillText(b.name, b.pos.x, b.pos.y - 20);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Carrying a seedling indicator
  if (b.target !== null && !b.rushingToSubbu) {
    ctx.font = "10px serif";
    ctx.textAlign = "center";
    ctx.fillText("🌱", b.pos.x, b.pos.y - 28);
    ctx.textAlign = "left";
  }
}

// ─── Subbu Renderer ───────────────────────────────────────────────────────────

function drawSubbu(ctx: CanvasRenderingContext2D, gs: GameState): void {
  const s = gs.subbu;

  // Cry aura
  if (s.cryActive) {
    const pulse = 0.3 + Math.sin(Date.now() / 100) * 0.15;
    ctx.beginPath();
    ctx.arc(
      s.pos.x,
      s.pos.y,
      30 + Math.sin(Date.now() / 150) * 5,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(96,165,250,${pulse})`;
    ctx.fill();
    ctx.font = "14px serif";
    ctx.textAlign = "center";
    ctx.fillText("😢", s.pos.x, s.pos.y - 28);
    ctx.textAlign = "left";
  }

  // Body (cute round yellow)
  ctx.beginPath();
  ctx.arc(s.pos.x, s.pos.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.subbu;
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Big eyes
  ctx.fillStyle = COLORS.subbuEye;
  ctx.beginPath();
  ctx.arc(s.pos.x - 4, s.pos.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.pos.x + 4, s.pos.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(s.pos.x - 3, s.pos.y - 3, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.pos.x + 5, s.pos.y - 3, 1, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.beginPath();
  ctx.arc(s.pos.x, s.pos.y + 2, 4, 0, Math.PI);
  ctx.strokeStyle = COLORS.subbuEye;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Name
  ctx.font = "bold 9px Sora, sans-serif";
  ctx.fillStyle = "#fcd34d";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 2;
  ctx.fillText("Subbu", s.pos.x, s.pos.y - 17);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}

// ─── Mini HUD on Canvas ───────────────────────────────────────────────────────

export function renderCanvasHUD(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
): void {
  // Wave complete animation
  if (gs.waveTimer > WAVE_DURATION * 0.95) {
    ctx.font = "bold 28px Bricolage Grotesque, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 20;
    ctx.fillText(`🌊 WAVE ${gs.wave}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // Pause overlay
  if (gs.paused) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 20;
    ctx.fillText("⏸ PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = "16px Sora, sans-serif";
    ctx.fillStyle = "#a3e635";
    ctx.fillText(
      "Press SPACE to resume",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 20,
    );
    ctx.textAlign = "left";
  }
}
