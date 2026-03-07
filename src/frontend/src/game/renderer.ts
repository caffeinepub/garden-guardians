// ─── Game Renderer ────────────────────────────────────────────────────────────

import {
  AREA_TERRAIN,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  RIDER_COLORS,
  TREE_SLOTS,
  WAVE_DURATION,
} from "./constants";
import { dist } from "./gameLogic";
import type {
  Arrow,
  Bomb,
  Brother,
  GameState,
  Particle,
  Rider,
  Tree,
  Villain,
} from "./types";

// ─── Precomputed grass tuft positions ────────────────────────────────────────

const GRASS_TUFTS: Array<{ x: number; y: number; h: number; angle: number }> =
  [];
for (let i = 0; i < 150; i++) {
  const x = (((i * 137 + i * 73) % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
  const yMin = CANVAS_HEIGHT * 0.4;
  const yMax = CANVAS_HEIGHT;
  const y = yMin + ((i * 47 + i * 31) % (yMax - yMin));
  const h = 4 + ((i * 19) % 5);
  const angle = -0.3 + ((i * 7) % 13) * 0.05;
  GRASS_TUFTS.push({ x, y, h, angle });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawEllipseShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Main Render Entry ───────────────────────────────────────────────────────

export function renderGame(ctx: CanvasRenderingContext2D, gs: GameState): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Layered background terrain
  drawBackground(ctx, gs);

  // Weather overlay (before characters but after BG)
  drawWeatherOverlay(ctx, gs);

  // Ancient tree auras
  drawTreeAuras(ctx, gs);

  // Dirt path circles on tree slots
  drawTreeSlotDirt(ctx, gs);

  // Trees
  for (const t of gs.trees) drawTree(ctx, t);

  // Shockwaves
  for (const sw of gs.shockwaves) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(sw.pos.x, sw.pos.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56,189,248,${sw.life / sw.maxRadius})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Brothers
  for (const b of gs.brothers) drawBrother(ctx, b, gs);

  // Riders
  for (const r of gs.riders) drawRider(ctx, r, gs);

  // Subbu
  drawSubbu(ctx, gs);

  // Villains
  for (const v of gs.villains) drawVillain(ctx, v, gs);

  // Arrows (Auli's projectiles)
  for (const arrow of gs.arrows) drawArrow(ctx, arrow);

  // Bombs (Samar & Nonu)
  for (const bomb of gs.bombs) drawBomb(ctx, bomb);

  // Particles
  for (const p of gs.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    drawParticle(ctx, p);
  }
  ctx.globalAlpha = 1;

  // Floating texts
  for (const ft of gs.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    const scale = alpha < 0.3 ? 0.7 + alpha : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.floor(13 * scale)}px Sora, sans-serif`;
    ctx.fillStyle = ft.color;
    ctx.textAlign = "center";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
    ctx.shadowBlur = 0;
    ctx.restore();
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
    ctx.fillText("⚠ NATURE IS ANGRY! ⚠", CANVAS_WIDTH / 2, 30);
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

// ─── Background / Terrain ─────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, gs: GameState): void {
  const skyH = CANVAS_HEIGHT * 0.4;

  // Sky area-appropriate colors
  const areaTerrainBase = AREA_TERRAIN[gs.area] ?? COLORS.bg;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
  skyGrad.addColorStop(0, areaTerrainBase);
  skyGrad.addColorStop(1, blendWithGreen(areaTerrainBase));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, skyH);

  // Ground gradient
  const groundGrad = ctx.createLinearGradient(0, skyH, 0, CANVAS_HEIGHT);
  groundGrad.addColorStop(0, "#1a3520");
  groundGrad.addColorStop(0.3, "#152b18");
  groundGrad.addColorStop(1, "#0e1e10");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, skyH, CANVAS_WIDTH, CANVAS_HEIGHT - skyH);

  // Horizon line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, skyH);
  ctx.lineTo(CANVAS_WIDTH, skyH);
  ctx.strokeStyle = "rgba(100,180,80,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Ground grass tufts
  ctx.save();
  ctx.strokeStyle = "rgba(80,160,60,0.45)";
  ctx.lineWidth = 1;
  for (const g of GRASS_TUFTS) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1, -g.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(1, -g.h * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-3, -g.h * 0.7);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function blendWithGreen(hex: string): string {
  // Return a slightly lighter greenish shade for sky horizon
  const colorMap: Record<string, string> = {
    "#142b22": "#1e4a30",
    "#0f2318": "#183520",
    "#0f1e2d": "#1a3530",
    "#1a1a0f": "#243020",
    "#0d0f1a": "#151e20",
  };
  return colorMap[hex] ?? "#1a3020";
}

function drawTreeSlotDirt(ctx: CanvasRenderingContext2D, gs: GameState): void {
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (const slot of TREE_SLOTS) {
    const occupied = gs.trees.some(
      (t) => Math.abs(t.pos.x - slot.x) < 5 && Math.abs(t.pos.y - slot.y) < 5,
    );
    // Draw faint dirt circle
    ctx.beginPath();
    ctx.ellipse(slot.x, slot.y + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = occupied ? "#4a2e10" : "#2d3018";
    ctx.fill();
    if (!occupied) {
      ctx.beginPath();
      ctx.ellipse(slot.x, slot.y, 10, 10, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#2d7a4a";
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.25;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Weather Overlay ─────────────────────────────────────────────────────────

function drawWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
): void {
  const t = Date.now();

  switch (gs.weather) {
    case "rain": {
      ctx.save();
      ctx.fillStyle = COLORS.rainOverlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 60 animated rain streaks angled 15 degrees
      ctx.strokeStyle = "rgba(150,200,255,0.28)";
      for (let i = 0; i < 60; i++) {
        const speed = 6 + (i % 4);
        const len = 12 + (i % 10);
        const alpha = 0.15 + (i % 5) * 0.04;
        const xOff = ((i * 73 + (t / 80) * speed) % (CANVAS_WIDTH + 40)) - 20;
        const yOff = ((i * 47 + (t / 60) * speed) % (CANVAS_HEIGHT + 40)) - 20;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.8 + (i % 3) * 0.3;
        ctx.beginPath();
        ctx.moveTo(xOff, yOff);
        ctx.lineTo(xOff - len * Math.sin(0.26), yOff + len * Math.cos(0.26));
        ctx.stroke();
      }

      // Ground ripple rings
      ctx.globalAlpha = 1;
      for (let i = 0; i < 7; i++) {
        const rx = (i * 137) % CANVAS_WIDTH;
        const ry = CANVAS_HEIGHT - 10 - ((i * 47) % 20);
        const phase = (t / 400 + i * 0.7) % 1;
        const radius = phase * 16;
        const alpha = (1 - phase) * 0.4;
        ctx.beginPath();
        ctx.ellipse(rx, ry, radius * 1.6, radius * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150,200,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // Draw sun/moon based on weather
      drawWeatherIcon(ctx, gs.weather);
      break;
    }
    case "storm": {
      ctx.save();
      ctx.fillStyle = COLORS.stormOverlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Heavy rain angled 30 degrees, double density
      ctx.strokeStyle = "rgba(120,160,220,0.22)";
      for (let i = 0; i < 80; i++) {
        const speed = 8 + (i % 5);
        const len = 14 + (i % 12);
        const alpha = 0.12 + (i % 5) * 0.04;
        const xOff = ((i * 61 + (t / 70) * speed) % (CANVAS_WIDTH + 40)) - 20;
        const yOff = ((i * 43 + (t / 55) * speed) % (CANVAS_HEIGHT + 40)) - 20;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(xOff, yOff);
        ctx.lineTo(xOff - len * Math.sin(0.52), yOff + len * Math.cos(0.52));
        ctx.stroke();
      }

      // Dark vignette
      ctx.globalAlpha = 0.25;
      const vignette = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        CANVAS_HEIGHT * 0.2,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        CANVAS_WIDTH * 0.8,
      );
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(20,10,40,0.8)");
      ctx.fillStyle = vignette;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
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
      drawWeatherIcon(ctx, "sun");
      break;
    }
    case "rainbow": {
      // Subtle bg tint
      const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      grad.addColorStop(0, "rgba(255,80,80,0.04)");
      grad.addColorStop(0.25, "rgba(255,220,50,0.05)");
      grad.addColorStop(0.5, "rgba(80,220,80,0.06)");
      grad.addColorStop(0.75, "rgba(80,140,255,0.05)");
      grad.addColorStop(1, "rgba(180,80,255,0.04)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawWeatherIcon(ctx, "rainbow");
      break;
    }
    case "night": {
      ctx.fillStyle = COLORS.nightOverlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawWeatherIcon(ctx, "night");

      // 40 stars
      for (let i = 0; i < 40; i++) {
        const starX = (i * 137 + 23) % CANVAS_WIDTH;
        const starY = (i * 89 + 11) % (CANVAS_HEIGHT * 0.35);
        const blink = 0.4 + Math.sin(t / 500 + i) * 0.3;
        ctx.save();
        ctx.globalAlpha = blink * 0.7;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(starX, starY, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }
}

function drawWeatherIcon(ctx: CanvasRenderingContext2D, weather: string): void {
  ctx.save();
  switch (weather) {
    case "sun": {
      // Sun in top-left
      const sx = 50;
      const sy = 40;
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#fde047";
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 8 rays
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(ang) * 17, sy + Math.sin(ang) * 17);
        ctx.lineTo(sx + Math.cos(ang) * 24, sy + Math.sin(ang) * 24);
        ctx.stroke();
      }
      break;
    }
    case "night": {
      // Crescent moon in top-right
      const mx = CANVAS_WIDTH - 50;
      const my = 40;
      ctx.globalAlpha = 0.8;
      // Outer circle
      ctx.beginPath();
      ctx.arc(mx, my, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#e2c97e";
      ctx.fill();
      // Subtract inner circle (offset) to make crescent
      ctx.beginPath();
      ctx.arc(mx + 8, my - 4, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#0d1525";
      ctx.fill();
      break;
    }
    case "rainbow": {
      // Rainbow arc at top-center
      const colors = [
        "#ef4444",
        "#f97316",
        "#fde047",
        "#4ade80",
        "#60a5fa",
        "#a78bfa",
      ];
      const cx = CANVAS_WIDTH / 2;
      const cy = CANVAS_HEIGHT * 0.15;
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < colors.length; i++) {
        const radius = 80 + i * 18;
        ctx.beginPath();
        ctx.arc(cx, cy + 60, radius, Math.PI, 0);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 12;
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

// ─── Ancient Tree Auras ───────────────────────────────────────────────────────

function drawTreeAuras(ctx: CanvasRenderingContext2D, gs: GameState): void {
  for (const t of gs.trees) {
    if (t.type === "ancient") {
      const pulse = 0.15 + Math.sin(Date.now() / 800 + t.id) * 0.05;
      ctx.save();
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
      ctx.restore();
    }
  }
}

// ─── Tree Renderer ────────────────────────────────────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, t: Tree): void {
  ctx.save();

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
    ctx.fillStyle = "rgba(100,200,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(100,200,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (size < 12) {
    // Seedling: just a stick + leaf cluster
    drawSeedling(ctx, t);
  } else {
    // Full tree
    drawFullTree(ctx, t);
  }

  // Health bar (rounded)
  const barW = Math.max(size * 2, 28);
  const barX = t.pos.x - barW / 2;
  const barY = t.pos.y + size + (t.type === "ancient" ? 14 : 10);
  const barH = 4;

  // Background
  ctx.fillStyle = "#111a10";
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 0.5;
  drawRoundedRect(ctx, barX, barY, barW, barH, 2);
  ctx.fill();
  ctx.stroke();

  // Gradient fill based on health
  if (barW * healthRatio > 2) {
    const hGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (healthRatio > 0.6) {
      hGrad.addColorStop(0, "#4ade80");
      hGrad.addColorStop(1, "#22c55e");
    } else if (healthRatio > 0.3) {
      hGrad.addColorStop(0, "#facc15");
      hGrad.addColorStop(1, "#f59e0b");
    } else {
      hGrad.addColorStop(0, "#ef4444");
      hGrad.addColorStop(1, "#dc2626");
    }
    ctx.fillStyle = hGrad;
    drawRoundedRect(ctx, barX, barY, barW * healthRatio, barH, 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSeedling(ctx: CanvasRenderingContext2D, t: Tree): void {
  const x = t.pos.x;
  const y = t.pos.y;
  // Thin brown stick
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y - 6);
  ctx.strokeStyle = "#8B5E3C";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Tiny leaf cluster
  ctx.beginPath();
  ctx.arc(x, y - 8, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#4ade80";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 3, y - 6, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e";
  ctx.fill();
}

function drawFullTree(ctx: CanvasRenderingContext2D, t: Tree): void {
  const x = t.pos.x;
  const y = t.pos.y;
  const size = t.size;

  // Trunk
  const trunkW = Math.max(4, size * 0.18);
  const trunkH = size * 0.65;
  const trunkY = y + size * 0.5;

  // Root flares
  ctx.save();
  ctx.strokeStyle = "#5a3010";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x, trunkY + trunkH - 4);
    ctx.quadraticCurveTo(
      x + i * trunkW * 2.5,
      trunkY + trunkH + 4,
      x + i * trunkW * 4,
      trunkY + trunkH + 6,
    );
    ctx.stroke();
  }
  ctx.restore();

  // Trunk body (tapered)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - trunkW, trunkY);
  ctx.lineTo(x - trunkW * 0.6, trunkY + trunkH);
  ctx.lineTo(x + trunkW * 0.6, trunkY + trunkH);
  ctx.lineTo(x + trunkW, trunkY);
  ctx.closePath();
  const trunkGrad = ctx.createLinearGradient(x - trunkW, 0, x + trunkW, 0);
  trunkGrad.addColorStop(0, "#6b3a18");
  trunkGrad.addColorStop(0.4, "#8B5E3C");
  trunkGrad.addColorStop(0.7, "#7a4e2c");
  trunkGrad.addColorStop(1, "#5a3010");
  ctx.fillStyle = trunkGrad;
  ctx.fill();

  // Bark stripes
  ctx.strokeStyle = "rgba(40,20,5,0.4)";
  ctx.lineWidth = 1;
  for (let s = 0; s < 2; s++) {
    const sx = x - trunkW * 0.3 + s * trunkW * 0.6;
    ctx.beginPath();
    ctx.moveTo(sx, trunkY + 3);
    ctx.lineTo(sx - 1, trunkY + trunkH - 3);
    ctx.stroke();
  }
  ctx.restore();

  // Canopy shadow layer (offset)
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(x + 3, y + 3, size + 2, 0, Math.PI * 2);
  const shadowColor = getTreeShadowColor(t.type);
  ctx.fillStyle = shadowColor;
  ctx.fill();
  ctx.restore();

  // Canopy main layer
  ctx.save();
  const mainColor = getTreeMainColor(t.type);
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);

  if (t.type === "ancient") {
    const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, size);
    grad.addColorStop(0, "#3aaa70");
    grad.addColorStop(0.5, "#1a7a50");
    grad.addColorStop(1, "#0f4030");
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createRadialGradient(
      x - size * 0.3,
      y - size * 0.3,
      2,
      x,
      y,
      size,
    );
    grad.addColorStop(0, lightenColor(mainColor, 30));
    grad.addColorStop(1, mainColor);
    ctx.fillStyle = grad;
  }
  ctx.fill();
  ctx.restore();

  // Canopy highlight
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();
  ctx.restore();

  // Canopy outline
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Type-specific decorations
  if (t.type === "fruit") drawFruitDecorations(ctx, x, y, size);
  else if (t.type === "flower") drawFlowerDecorations(ctx, x, y, size);
  else if (t.type === "ancient") drawAncientDecorations(ctx, x, y, size);
}

function getTreeMainColor(type: string): string {
  const map: Record<string, string> = {
    normal: "#2d8a4a",
    fruit: "#3a9050",
    flower: "#d060a0",
    ancient: "#1a6040",
  };
  return map[type] ?? "#2d8a4a";
}

function getTreeShadowColor(type: string): string {
  const map: Record<string, string> = {
    normal: "#1a5530",
    fruit: "#1a5530",
    flower: "#802060",
    ancient: "#0a3020",
  };
  return map[type] ?? "#1a5530";
}

function lightenColor(hex: string, amount: number): string {
  // Simple hex lighten
  const num = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawFruitDecorations(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  // 5 small red/orange fruit circles near canopy edge
  ctx.save();
  const fruitPositions = [
    { a: 0.2, r: 0.75 },
    { a: 1.0, r: 0.8 },
    { a: 1.8, r: 0.7 },
    { a: 2.6, r: 0.75 },
    { a: 3.5, r: 0.8 },
  ];
  for (const fp of fruitPositions) {
    const fx = x + Math.cos(fp.a) * size * fp.r;
    const fy = y + Math.sin(fp.a) * size * fp.r;
    ctx.beginPath();
    ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
    const fGrad = ctx.createRadialGradient(fx - 1, fy - 1, 0.5, fx, fy, 3.5);
    fGrad.addColorStop(0, "#ff8040");
    fGrad.addColorStop(1, "#cc2010");
    ctx.fillStyle = fGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlowerDecorations(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  // 8 petal shapes around canopy edge
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI * 2) / 8;
    const px = x + Math.cos(ang) * size * 0.78;
    const py = y + Math.sin(ang) * size * 0.78;

    // Two overlapping small circles make a petal
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "#f9a8d4" : "#fde68a";
    ctx.globalAlpha = 0.8;
    ctx.fill();
  }
  ctx.restore();
}

function drawAncientDecorations(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  // 5 gnarled branch lines + wide root spread + golden glow ring
  ctx.save();

  // Golden glow ring
  ctx.beginPath();
  ctx.arc(x, y, size + 8 + Math.sin(Date.now() / 700) * 3, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,215,80,${0.15 + Math.sin(Date.now() / 500) * 0.06})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Gnarled branches
  ctx.strokeStyle = "rgba(40,80,20,0.7)";
  ctx.lineWidth = 1.5;
  const branchAngles = [-1.2, -0.5, 0.1, 0.8, 1.5];
  for (const ba of branchAngles) {
    const bx = x + Math.cos(ba) * size * 0.6;
    const by = y + Math.sin(ba) * size * 0.6;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ba) * size * 0.3, y + Math.sin(ba) * size * 0.3);
    ctx.quadraticCurveTo(
      bx + Math.cos(ba + 0.4) * 8,
      by + Math.sin(ba + 0.4) * 8,
      bx + Math.cos(ba) * (size * 0.35),
      by + Math.sin(ba) * (size * 0.35),
    );
    ctx.stroke();
  }

  // Extra wide root arcs (5)
  const trunkY = y + size * 0.5;
  const trunkH = size * 0.65;
  ctx.strokeStyle = "rgba(50,25,8,0.5)";
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x, trunkY + trunkH - 4);
    ctx.quadraticCurveTo(
      x + i * 10,
      trunkY + trunkH + 6,
      x + i * 14,
      trunkY + trunkH + 9,
    );
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Villain Renderer ─────────────────────────────────────────────────────────

function drawVillain(
  ctx: CanvasRenderingContext2D,
  v: Villain,
  gs: GameState,
): void {
  ctx.save();
  if (v.stunTimer > 0) ctx.globalAlpha = 0.5;
  else ctx.globalAlpha = v.opacity;

  // Ground shadow
  drawEllipseShadow(ctx, v.pos.x, v.pos.y + 14, 14, 4);

  switch (v.type) {
    case "chotu":
      drawChotu(ctx, v, gs);
      break;
    case "pari":
      drawPari(ctx, v, gs);
      break;
    case "pihu":
      drawPihu(ctx, v);
      break;
    case "auli":
      drawAuli(ctx, v, gs);
      break;
    case "samar":
      drawSamar(ctx, v);
      break;
    case "nonu":
      drawNonu(ctx, v);
      break;
  }

  ctx.globalAlpha = 1;

  // Name label
  ctx.font = "bold 9px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 3;
  const labelY = v.pos.y - (v.type === "pari" ? 24 : 19);
  ctx.fillText(v.isClone ? "Clone" : v.name, v.pos.x, labelY);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Health bar (only show when damaged)
  if (v.health < v.maxHealth) {
    const healthRatio = v.health / v.maxHealth;
    const barW = 30;
    const barX = v.pos.x - 15;
    const barY = v.pos.y + (v.type === "pari" ? 22 : 18);

    // Background
    drawRoundedRect(ctx, barX, barY, barW, 4, 2);
    ctx.fillStyle = "#300000";
    ctx.fill();

    // Fill gradient
    const hGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hGrad.addColorStop(0, "#4ade80");
    hGrad.addColorStop(0.5, "#facc15");
    hGrad.addColorStop(1, "#ef4444");
    ctx.fillStyle = hGrad;
    if (barW * healthRatio > 2) {
      drawRoundedRect(ctx, barX, barY, barW * healthRatio, 4, 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawChotu(
  ctx: CanvasRenderingContext2D,
  v: Villain,
  _gs: GameState,
): void {
  const x = v.pos.x;
  const y = v.pos.y;

  // Speed blur (evolved)
  if (v.evolutionLevel > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(239,68,68,0.4)";
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const bx = x + i * 5;
      ctx.beginPath();
      ctx.moveTo(bx, y - 8 + i * 2);
      ctx.lineTo(bx + 8 + i * 2, y - 8 + i * 2);
      ctx.globalAlpha = 0.5 - i * 0.12;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Running legs (offset for motion)
  const legOffset = Math.sin(Date.now() / 80) * 3;
  ctx.fillStyle = "#7b1515";
  ctx.fillRect(x - 5, y + 8, 4, 7 + legOffset);
  ctx.fillRect(x + 1, y + 8, 4, 7 - legOffset);

  // Body circle
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 12);
  bodyGrad.addColorStop(0, "#f87171");
  bodyGrad.addColorStop(1, "#dc2626");
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Spiky hair (6 spikes)
  ctx.fillStyle = "#7f1d1d";
  ctx.strokeStyle = "#991b1b";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI * 0.8 + i * 0.32;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * 10, y + Math.sin(ang) * 10);
    ctx.lineTo(x + Math.cos(ang) * 18, y + Math.sin(ang) * 18);
    ctx.stroke();
  }

  // Angry eyes
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(x - 4, y - 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Angry eyebrow lines
  ctx.strokeStyle = "#1c0505";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 5);
  ctx.lineTo(x - 2, y - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 5);
  ctx.lineTo(x + 2, y - 4);
  ctx.stroke();

  // Teeth (small white squares)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 3, y + 3, 3, 3);
  ctx.fillRect(x + 1, y + 3, 3, 3);
}

function drawPari(
  ctx: CanvasRenderingContext2D,
  v: Villain,
  _gs: GameState,
): void {
  const x = v.pos.x;
  const y = v.pos.y;

  // Tornado indicator
  if (v.tornadoTimer > 240) {
    ctx.save();
    const ang = Date.now() / 200;
    for (let i = 0; i < 6; i++) {
      const a = ang + (i * Math.PI) / 3;
      const r = 70 + Math.sin(Date.now() / 300 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
      ctx.strokeStyle = `rgba(168,85,247,${0.2 + i * 0.04})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cape/cloak (behind body)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 8);
  ctx.lineTo(x - 14, y + 18);
  ctx.lineTo(x + 14, y + 18);
  ctx.lineTo(x + 8, y - 8);
  ctx.closePath();
  ctx.fillStyle = "#6b21a8";
  ctx.fill();
  ctx.restore();

  // Long flowing hair (behind body, curved arc)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 16);
  ctx.quadraticCurveTo(x - 20, y, x - 15, y + 12);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#581c87";
  ctx.stroke();
  ctx.restore();

  // Body (tall narrow)
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 9, 14, 0, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 14);
  bodyGrad.addColorStop(0, "#c084fc");
  bodyGrad.addColorStop(1, "#7e22ce");
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(x, y - 14, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#FDBCB4";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = "#1e0a30";
  ctx.beginPath();
  ctx.arc(x - 3, y - 15, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 3, y - 15, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Axe (L-shape with blade)
  ctx.save();
  ctx.translate(x + 14, y - 4);
  // Shaft
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -10);
  ctx.strokeStyle = "#6b3a18";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Blade polygon
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, -16);
  ctx.lineTo(9, -6);
  ctx.lineTo(0, -4);
  ctx.closePath();
  ctx.fillStyle = "#94a3b8";
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPihu(ctx: CanvasRenderingContext2D, v: Villain): void {
  const x = v.pos.x;
  const y = v.pos.y;

  // Dashed outline for clone
  if (v.isClone) {
    ctx.setLineDash([3, 3]);
  }

  // Body circle
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 13);
  bodyGrad.addColorStop(0, "#fdba74");
  bodyGrad.addColorStop(1, "#c2410c");
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = v.isClone
    ? "rgba(255,200,100,0.6)"
    : "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  // Mischievous wide grin
  ctx.beginPath();
  ctx.arc(x, y + 2, 7, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Teeth
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - 4 + i * 3, y + 2, 2.5, 2.5);
  }

  // Star/mask over eyes (diagonal slash shapes)
  ctx.strokeStyle = "#431407";
  ctx.lineWidth = 2;
  // Left eye mask
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 5);
  ctx.lineTo(x - 2, y - 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 3);
  ctx.lineTo(x - 2, y - 5);
  ctx.stroke();
  // Right eye mask
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 5);
  ctx.lineTo(x + 7, y - 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 3);
  ctx.lineTo(x + 7, y - 5);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = "#ffedd5";
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 4, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawAuli(
  ctx: CanvasRenderingContext2D,
  v: Villain,
  gs: GameState,
): void {
  const x = v.pos.x;
  const y = v.pos.y;
  const beast = v.beastMode && gs.auliBeastMode;

  // Hiding behind tree: draw partial peek from behind nearest tree
  if (v.hidingBehindTree && !beast) {
    ctx.save();
    // Peering eye glowing behind tree
    ctx.globalAlpha = 0.6;
    const eyeGlow = ctx.createRadialGradient(x, y - 2, 1, x, y - 2, 12);
    eyeGlow.addColorStop(0, "rgba(255,80,30,0.8)");
    eyeGlow.addColorStop(1, "transparent");
    ctx.fillStyle = eyeGlow;
    ctx.fillRect(x - 12, y - 14, 24, 24);

    // Peeking eyes (glowing slits)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#fde68a";
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 2, 2.5, 1.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 3, y - 2, 2.5, 1.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bow peeking out from side
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#8B5E3C";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 12, y, 10, -1.2, 1.2);
    ctx.stroke();
    // Bow string
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 10);
    ctx.lineTo(x + 15, y);
    ctx.lineTo(x + 12, y + 10);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (beast) {
    // Strong red glow gradient behind body
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 45);
    glow.addColorStop(0, "rgba(255,30,30,0.7)");
    glow.addColorStop(0.5, "rgba(200,10,10,0.3)");
    glow.addColorStop(1, "transparent");
    ctx.save();
    ctx.fillStyle = glow;
    ctx.fillRect(x - 45, y - 45, 90, 90);
    ctx.restore();

    // Crackling lightning lines
    ctx.save();
    const t = Date.now();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + t / 200;
      const r = 22 + Math.sin(t / 100 + i) * 6;
      const color = i % 2 === 0 ? "#ef4444" : "#fbbf24";
      ctx.strokeStyle = `${color}`;
      ctx.globalAlpha = 0.7 + Math.sin(t / 80 + i) * 0.3;
      ctx.lineWidth = 1.5;
      // Jagged lightning bolt
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * 10, y + Math.sin(ang) * 10);
      const midX = x + Math.cos(ang + 0.3) * (r * 0.55);
      const midY = y + Math.sin(ang + 0.3) * (r * 0.55);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x + Math.cos(ang - 0.15) * r, y + Math.sin(ang - 0.15) * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Flame spikes radiating outward (6-8)
  ctx.save();
  const numSpikes = beast ? 8 : 6;
  for (let i = 0; i < numSpikes; i++) {
    const ang = (i * Math.PI * 2) / numSpikes + Date.now() / 400;
    const r1 = beast ? 14 : 11;
    const r2 = beast ? 22 : 18;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
    ctx.lineTo(
      x + Math.cos(ang + 0.25) * (r2 * 0.6),
      y + Math.sin(ang + 0.25) * (r2 * 0.6),
    );
    ctx.lineTo(x + Math.cos(ang) * r2, y + Math.sin(ang) * r2);
    ctx.lineTo(
      x + Math.cos(ang - 0.25) * (r2 * 0.6),
      y + Math.sin(ang - 0.25) * (r2 * 0.6),
    );
    ctx.closePath();
    ctx.fillStyle = beast ? "#ff3010" : "#991b1b";
    ctx.globalAlpha = beast ? 0.9 : 0.65;
    ctx.fill();
  }
  ctx.restore();

  // Body
  ctx.beginPath();
  ctx.arc(x, y, beast ? 13 : 10, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(
    x - 2,
    y - 2,
    1,
    x,
    y,
    beast ? 13 : 10,
  );
  if (beast) {
    bodyGrad.addColorStop(0, "#ff6040");
    bodyGrad.addColorStop(1, "#990000");
  } else {
    bodyGrad.addColorStop(0, "#c0302a");
    bodyGrad.addColorStop(1, "#5a0a0a");
  }
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = beast ? "#ff8020" : "rgba(255,100,50,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Glowing eye slits
  ctx.save();
  ctx.fillStyle = beast ? "#ffffff" : "#fde68a";
  ctx.shadowColor = beast ? "#ffffff" : "#ffaa00";
  ctx.shadowBlur = beast ? 6 : 3;
  // Left slit
  ctx.beginPath();
  ctx.ellipse(x - 3.5, y - 2, 2.5, 1.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Right slit
  ctx.beginPath();
  ctx.ellipse(x + 3.5, y - 2, 2.5, 1.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bow (when not in beast mode)
  if (!beast) {
    ctx.save();
    // Bow arc
    ctx.strokeStyle = "#8B5E3C";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 14, y, 10, -1.1, 1.1);
    ctx.stroke();
    // Bow string
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 9);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x + 14, y + 9);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSamar(ctx: CanvasRenderingContext2D, v: Villain): void {
  const x = v.pos.x;
  const y = v.pos.y;

  // Throwing arm wind-up glow
  const armAngle = Math.sin(Date.now() / 120) * 0.5;
  ctx.save();
  ctx.strokeStyle = "rgba(251,146,60,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 2);
  const bombArmX = x + 8 + Math.cos(armAngle - 0.8) * 14;
  const bombArmY = y - 2 + Math.sin(armAngle - 0.8) * 14;
  ctx.lineTo(bombArmX, bombArmY);
  ctx.stroke();
  // Mini bomb held in hand
  ctx.beginPath();
  ctx.arc(bombArmX, bombArmY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#292524";
  ctx.fill();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Fuse spark
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(bombArmX, bombArmY - 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 12);
  grad.addColorStop(0, "#fb923c");
  grad.addColorStop(1, "#92400e");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,200,100,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(x, y - 15, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#FDBCB4";
  ctx.fill();

  // Bandana on head
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y - 17, 7, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#f97316";
  ctx.fill();
  ctx.restore();

  // Eyes — determined look
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(x - 3, y - 15, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 3, y - 15, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawNonu(ctx: CanvasRenderingContext2D, v: Villain): void {
  const x = v.pos.x;
  const y = v.pos.y;

  // Slower — chunkier figure
  // Throw animation
  const armSwing = Math.sin(Date.now() / 160) * 0.6;
  ctx.save();
  ctx.strokeStyle = "rgba(239,68,68,0.5)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 2);
  const bombArmX = x - 9 + Math.cos(Math.PI + armSwing - 0.8) * 14;
  const bombArmY = y - 2 + Math.sin(armSwing - 0.8) * 14;
  ctx.lineTo(bombArmX, bombArmY);
  ctx.stroke();
  // Bomb in hand (slightly larger — Nonu's are bigger)
  ctx.beginPath();
  ctx.arc(bombArmX, bombArmY, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#1c1917";
  ctx.fill();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Fuse spark
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(bombArmX - 1, bombArmY - 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Large chunky body
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 12, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 14);
  grad.addColorStop(0, "#fca5a5");
  grad.addColorStop(1, "#991b1b");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,150,100,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Head (wider)
  ctx.beginPath();
  ctx.arc(x, y - 16, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#FDBCB4";
  ctx.fill();

  // Messy hair
  ctx.strokeStyle = "#1c0a00";
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 3, y - 22);
    ctx.quadraticCurveTo(x + i * 4.5, y - 28, x + i * 4, y - 30);
    ctx.stroke();
  }

  // Eyes — wide
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(x - 3.5, y - 16, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 3.5, y - 16, 2, 0, Math.PI * 2);
  ctx.fill();
  // Whites
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 4, y - 17, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 17, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Bomb Renderer ────────────────────────────────────────────────────────────

function drawBomb(ctx: CanvasRenderingContext2D, bomb: Bomb): void {
  ctx.save();
  ctx.globalAlpha = Math.min(1, bomb.life / 15);

  const x = bomb.pos.x;
  const y = bomb.pos.y;

  // Outer glow (orange heat)
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 12);
  glow.addColorStop(0, "rgba(251,146,60,0.6)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 12, y - 12, 24, 24);

  // Bomb body
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#1c1917";
  ctx.fill();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shine spot
  ctx.beginPath();
  ctx.arc(x - 2.5, y - 2.5, 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,200,100,0.4)";
  ctx.fill();

  // Fuse line with animated spark
  const t = Date.now();
  const fuseLen = 10;
  const fuseEndX = x + Math.cos(-0.8) * fuseLen;
  const fuseEndY = y + Math.sin(-0.8) * fuseLen;
  ctx.strokeStyle = "#8B5E3C";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 7);
  ctx.quadraticCurveTo(x + 4, y - 10, fuseEndX, fuseEndY);
  ctx.stroke();

  // Animated fuse spark (flickers)
  const sparkPulse = 0.7 + Math.sin(t / 60) * 0.3;
  ctx.save();
  ctx.globalAlpha = sparkPulse;
  ctx.fillStyle = "#fde68a";
  ctx.shadowColor = "#fde68a";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(fuseEndX, fuseEndY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.restore();
}

// ─── Arrow Renderer ───────────────────────────────────────────────────────────

function drawArrow(ctx: CanvasRenderingContext2D, arrow: Arrow): void {
  ctx.save();
  ctx.globalAlpha = Math.min(1, arrow.life / 20);
  ctx.translate(arrow.pos.x, arrow.pos.y);
  ctx.rotate(arrow.angle);

  // Arrow shaft
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(8, 0);
  ctx.strokeStyle = "#8B5E3C";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(14, -2);
  ctx.lineTo(14, 2);
  ctx.closePath();
  ctx.fillStyle = "#94a3b8";
  ctx.fill();

  // Tail feathers
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-14, -3);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-14, 3);
  ctx.stroke();

  ctx.restore();
}

// ─── Rider Renderer ───────────────────────────────────────────────────────────

function drawRider(
  ctx: CanvasRenderingContext2D,
  r: Rider,
  gs: GameState,
): void {
  ctx.save();
  const color = RIDER_COLORS[r.name] ?? "#3b82f6";

  // Ground shadow
  drawEllipseShadow(ctx, r.pos.x, r.pos.y + 12, 18, 5);

  // Shield bubble
  if (r.shieldTimer > 0) {
    ctx.beginPath();
    ctx.arc(r.pos.x, r.pos.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,240,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(200,240,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Speed lines when rushing to Subbu
  if (r.rushingToSubbu) {
    ctx.strokeStyle = `${color}80`;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const bx = r.pos.x + i * 6;
      ctx.globalAlpha = 0.5 - i * 0.12;
      ctx.beginPath();
      ctx.moveTo(bx, r.pos.y - 4);
      ctx.lineTo(bx + 10, r.pos.y - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + 2, r.pos.y + 1);
      ctx.lineTo(bx + 10, r.pos.y + 1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Bike frame (diamond shape connecting front and rear)
  const bx = r.pos.x;
  const by = r.pos.y;
  const frontWheelX = bx + 9;
  const rearWheelX = bx - 9;
  const axleY = by + 6;
  const frameTop = by - 3;

  // Frame lines
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Main diamond frame
  ctx.moveTo(rearWheelX, axleY);
  ctx.lineTo(bx - 2, frameTop);
  ctx.lineTo(bx + 3, frameTop);
  ctx.lineTo(frontWheelX, axleY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx - 2, frameTop);
  ctx.lineTo(bx - 6, axleY);
  ctx.stroke();

  // Handlebars
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(frontWheelX - 2, frameTop + 1);
  ctx.lineTo(frontWheelX + 3, frameTop - 4);
  ctx.stroke();

  // Rear wheel
  ctx.beginPath();
  ctx.arc(rearWheelX, axleY, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wheel hub
  ctx.beginPath();
  ctx.arc(rearWheelX, axleY, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Front wheel
  ctx.beginPath();
  ctx.arc(frontWheelX, axleY, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(frontWheelX, axleY, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Rider body (leaning forward)
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(bx, frameTop - 2, 4, 6, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Rider head
  ctx.beginPath();
  ctx.arc(bx + 2, frameTop - 10, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#FDBCB4";
  ctx.fill();

  // Helmet (arc on top of head)
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx + 2, frameTop - 10, 5, Math.PI, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  // Name
  ctx.font = "bold 8px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 3;
  ctx.fillText(r.name, r.pos.x, r.pos.y - 20);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Night glow halo
  if (gs.weather === "night") {
    const nightGlow = ctx.createRadialGradient(
      r.pos.x,
      r.pos.y,
      4,
      r.pos.x,
      r.pos.y,
      22,
    );
    nightGlow.addColorStop(0, `${color}40`);
    nightGlow.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = nightGlow;
    ctx.fillRect(r.pos.x - 22, r.pos.y - 22, 44, 44);
    ctx.restore();
  }

  ctx.restore();
}

// ─── Brother Renderer ─────────────────────────────────────────────────────────

function drawBrother(
  ctx: CanvasRenderingContext2D,
  b: Brother,
  gs: GameState,
): void {
  ctx.save();

  const x = b.pos.x;
  const y = b.pos.y;

  // Ground shadow
  drawEllipseShadow(ctx, x, y + 14, 10, 3);

  // Legs (2 rectangles, slight outward angle)
  const legAnim = Math.sin(Date.now() / 100) * 2;
  ctx.fillStyle = "#3d1a08";
  ctx.save();
  ctx.translate(x - 3, y + 7);
  ctx.rotate(-0.1 + legAnim * 0.03);
  ctx.fillRect(-2, 0, 4, 8);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 3, y + 7);
  ctx.rotate(0.1 - legAnim * 0.03);
  ctx.fillRect(-2, 0, 4, 8);
  ctx.restore();

  // Arms
  const armAnim = Math.sin(Date.now() / 100 + Math.PI) * 2;
  ctx.fillStyle = "#166534";
  ctx.save();
  ctx.translate(x - 6, y - 2);
  ctx.rotate(-0.3 + armAnim * 0.04);
  ctx.fillRect(-1.5, 0, 3, 7);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 6, y - 2);
  ctx.rotate(0.3 - armAnim * 0.04);
  ctx.fillRect(-1.5, 0, 3, 7);
  ctx.restore();

  // Torso
  ctx.fillStyle = "#166534";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 7);
  ctx.lineTo(x + 5, y - 7);
  ctx.lineTo(x + 6, y + 7);
  ctx.lineTo(x - 6, y + 7);
  ctx.closePath();
  ctx.fillStyle = "#15803d";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();

  // Head
  ctx.beginPath();
  ctx.arc(x, y - 12, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#FDBCB4";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Hair (arc on top)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y - 14, 6, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fillStyle = "#3d1a08";
  ctx.fill();
  ctx.restore();

  // Eyes (tiny dots)
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(x - 2, y - 12, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 2, y - 12, 1, 0, Math.PI * 2);
  ctx.fill();

  // Carrying seedling indicator
  if (b.target !== null && !b.rushingToSubbu) {
    // Small leaf shape held in front
    ctx.save();
    ctx.translate(x + 8, y - 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(5, -5);
    ctx.lineTo(3, 2);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fillStyle = "#4ade80";
    ctx.fill();
    ctx.strokeStyle = "#166534";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // Name
  ctx.font = "bold 8px Sora, sans-serif";
  ctx.fillStyle = "#a3e635";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 2;
  ctx.fillText(b.name, x, y - 22);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Night glow halo
  if (gs.weather === "night") {
    const nightGlow = ctx.createRadialGradient(x, y, 4, x, y, 20);
    nightGlow.addColorStop(0, "rgba(100,220,100,0.3)");
    nightGlow.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = nightGlow;
    ctx.fillRect(x - 20, y - 20, 40, 40);
    ctx.restore();
  }

  ctx.restore();
}

// ─── Subbu Renderer ───────────────────────────────────────────────────────────

function drawSubbu(ctx: CanvasRenderingContext2D, gs: GameState): void {
  ctx.save();
  const s = gs.subbu;
  const x = s.pos.x;
  const y = s.pos.y;

  // Ground shadow
  drawEllipseShadow(ctx, x, y + 14, 14, 4);

  // Cry aura with ripple rings
  if (s.cryActive) {
    const t = Date.now();
    const pulse = 0.3 + Math.sin(t / 100) * 0.15;
    ctx.beginPath();
    ctx.arc(x, y, 30 + Math.sin(t / 150) * 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(96,165,250,${pulse * 0.5})`;
    ctx.fill();

    // Ripple rings
    for (let i = 0; i < 3; i++) {
      const phase = (t / 600 + i * 0.33) % 1;
      const r = 20 + phase * 40;
      const alpha = (1 - phase) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(147,197,253,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Tear drops
    ctx.fillStyle = "#60a5fa";
    // Left tear
    ctx.save();
    ctx.translate(x - 5, y + 6 + Math.sin(t / 200) * 2);
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Right tear
    ctx.save();
    ctx.translate(x + 5, y + 8 + Math.sin(t / 200 + 1) * 2);
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Body — large soft squished circle (skin tone)
  ctx.beginPath();
  ctx.ellipse(x, y, 13, 11, 0, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 14);
  bodyGrad.addColorStop(0, "#ffcfc4");
  bodyGrad.addColorStop(0.5, "#FDBCB4");
  bodyGrad.addColorStop(1, "#f0907a");
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "#e87060";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tiny arm stubs
  ctx.fillStyle = "#FDBCB4";
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x - 14, y, 3, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + 14, y, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tiny leg stubs
  ctx.fillStyle = "#FDBCB4";
  ctx.beginPath();
  ctx.ellipse(x - 5, y + 12, 3.5, 4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 12, 3.5, 4, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Big eyes
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(x - 4.5, y - 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4.5, y - 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // White shine spots
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 3.5, y - 3.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 5.5, y - 3.5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  if (s.cryActive) {
    // Sad downward arc
    ctx.beginPath();
    ctx.arc(x, y + 6, 4, Math.PI, 0);
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Happy smile
    ctx.beginPath();
    ctx.arc(x, y + 3, 4.5, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Hair — 3 small curved lines on top
  ctx.strokeStyle = "#3d1a08";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + i * 4, y - 11);
    ctx.quadraticCurveTo(x + i * 5, y - 18, x + i * 4.5, y - 19);
    ctx.stroke();
    ctx.restore();
  }

  // Night glow halo
  if (gs.weather === "night") {
    const nightGlow = ctx.createRadialGradient(x, y, 4, x, y, 25);
    nightGlow.addColorStop(0, "rgba(250,220,100,0.3)");
    nightGlow.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = nightGlow;
    ctx.fillRect(x - 25, y - 25, 50, 50);
    ctx.restore();
  }

  // Name
  ctx.font = "bold 9px Sora, sans-serif";
  ctx.fillStyle = "#fcd34d";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 2;
  ctx.fillText("Subbu", x, y - 17);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  ctx.restore();
}

// ─── Particle Renderer ───────────────────────────────────────────────────────

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;

  switch (p.type) {
    case "leaf": {
      // Rotated diamond/quad shape
      const rot = (Date.now() / 200 + p.id * 0.7) % (Math.PI * 2);
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.4);
      ctx.lineTo(p.size * 0.7, 0);
      ctx.lineTo(0, p.size * 1.4);
      ctx.lineTo(-p.size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case "sparkle": {
      // 4-pointed star
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(Date.now() / 300 + p.id);
      const sz = p.size;
      ctx.lineWidth = sz * 0.5;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 2);
      ctx.lineTo(0, sz * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-sz * 2, 0);
      ctx.lineTo(sz * 2, 0);
      ctx.stroke();
      // Diagonal thinner arms
      ctx.lineWidth = sz * 0.3;
      ctx.beginPath();
      ctx.moveTo(-sz * 1.2, -sz * 1.2);
      ctx.lineTo(sz * 1.2, sz * 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 1.2, -sz * 1.2);
      ctx.lineTo(-sz * 1.2, sz * 1.2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "water": {
      // Small elongated oval rotated in direction of velocity
      const velAngle = Math.atan2(p.vel.y, p.vel.x);
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(velAngle);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.6, p.size * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    default: {
      // Fallback: circle with slightly larger size for visibility
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// ─── Mini HUD on Canvas ───────────────────────────────────────────────────────

export function renderCanvasHUD(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
): void {
  // Wave complete animation
  if (gs.waveTimer > WAVE_DURATION * 0.95) {
    ctx.save();
    ctx.font = "bold 28px Bricolage Grotesque, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${gs.wave}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Pause overlay
  if (gs.paused) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 20;
    ctx.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = "16px Sora, sans-serif";
    ctx.fillStyle = "#a3e635";
    ctx.fillText(
      "Press SPACE to resume",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 20,
    );
    ctx.restore();
  }
}
