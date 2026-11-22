// Canvas rendering: the museum at night — marble floor, shadow pools,
// torch light, guard vision cones, cover you can read at a glance.
import { TILE, isSolid } from './levels.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guards.js';
import { PLAYER_RADIUS } from './player.js';

export function drawGame(ctx, game) {
  const { level, player, guards } = game;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  drawFloor(ctx, level);
  drawTorches(ctx, level);
  drawExit(ctx, level, game);
  drawLoot(ctx, level);
  drawArtifact(ctx, level);
  drawCover(ctx, level);
  drawWalls(ctx, level);
  drawCones(ctx, guards, level);
  drawCoins(ctx, player);
  drawGuards(ctx, guards);
  drawPlayer(ctx, player, game);
  drawNoiseRing(ctx, player);
  drawDarkness(ctx, level, player, guards);
  drawToast(ctx, game);
}

function drawFloor(ctx, level) {
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const ch = level.def.map[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (ch === '#') continue;
      const dark = (x + y) % 2 === 0;
      if (ch === ',') {
        ctx.fillStyle = dark ? '#171a2b' : '#1a1d30';
      } else {
        ctx.fillStyle = dark ? '#2b2f4a' : '#313552';
      }
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (ch === ',') {
        ctx.fillStyle = 'rgba(10,12,26,0.35)';
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }
}

function drawTorches(ctx, level) {
  for (const t of level.torches) {
    const cx = t.x * TILE + TILE / 2;
    const cy = t.y * TILE + TILE / 2;
    const flicker = 46 + Math.sin(Date.now() / 240 + t.x * 2.1 + t.y) * 6;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, flicker + 34);
    g.addColorStop(0, 'rgba(255,190,80,0.5)');
    g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, flicker + 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb84d';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2cc';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, level, game) {
  const e = level.exit;
  const px = e.tx * TILE;
  const py = e.ty * TILE;
  const open = game.artifactTaken;
  const pulse = open ? 0.75 + Math.sin(Date.now() / 200) * 0.25 : 0.3;
  ctx.fillStyle = open ? `rgba(80,255,140,${pulse})` : 'rgba(60,120,80,0.5)';
  ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
  ctx.strokeStyle = open ? '#7dffab' : '#3f7d55';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = open ? '#d8ffe4' : '#9fc7ab';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', px + TILE / 2, py + TILE / 2);
  if (open) {
    ctx.strokeStyle = 'rgba(125,255,171,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - 3, py - 3, TILE + 6, TILE + 6);
  }
}

function drawLoot(ctx, level) {
  for (const gem of level.loot) {
    if (gem.taken) continue;
    const bob = Math.sin(Date.now() / 300 + gem.x) * 2;
    ctx.save();
    ctx.translate(gem.x, gem.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#7fe3ff';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#d8f6ff';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

function drawArtifact(ctx, level) {
  const a = level.artifact;
  if (a.taken) return;
  const pulse = 1 + Math.sin(Date.now() / 260) * 0.15;
  const g = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, 44 * pulse);
  g.addColorStop(0, 'rgba(255,215,120,0.55)');
  g.addColorStop(1, 'rgba(255,215,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 44 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-9, -9, 18, 18);
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
  // Pedestal
  ctx.strokeStyle = '#8a7a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(a.x - 14, a.y - 14, 28, 28);
}

function drawCover(ctx, level) {
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const ch = level.def.map[y][x];
      if (ch !== 'C' && ch !== 'D') continue;
      const px = x * TILE;
      const py = y * TILE;
      if (ch === 'C') {
        ctx.fillStyle = '#6b4f2a';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#8a6a3c';
        ctx.fillRect(px + 2, py + 2, TILE - 4, 8);
        ctx.strokeStyle = '#3d2c15';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + TILE - 2, py + TILE - 2);
        ctx.moveTo(px + TILE - 2, py + 2);
        ctx.lineTo(px + 2, py + TILE - 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(150,200,230,0.28)';
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#b8d4e8';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWalls(ctx, level) {
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      if (level.def.map[y][x] !== '#') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = '#0d0f1c';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#232742';
      ctx.fillRect(px, py, TILE, 5);
      ctx.fillStyle = '#1a1d33';
      ctx.fillRect(px, py + TILE - 4, TILE, 4);
    }
  }
}

function drawCones(ctx, guards, level) {
  for (const g of guards) {
    const suspicious = g.suspicion > 1;
    const alarming = g.state === 'chase';
    const color = alarming ? '255,70,70' : suspicious ? '255,170,60' : '255,220,90';
    const alpha = alarming ? 0.42 : suspicious ? 0.3 : 0.2;
    // Clip the cone to line of sight: march a ray per angle and stop at the
    // first solid tile, so the light never shines through walls or cover.
    const rays = 26;
    const pts = [];
    for (let i = 0; i <= rays; i++) {
      const a = g.dir - CONE_HALF_ANGLE + (i / rays) * CONE_HALF_ANGLE * 2;
      let r = CONE_RANGE;
      for (let d = 10; d <= CONE_RANGE; d += 8) {
        if (isSolid(level, g.x + Math.cos(a) * d, g.y + Math.sin(a) * d)) {
          r = d;
          break;
        }
      }
      pts.push([g.x + Math.cos(a) * r, g.y + Math.sin(a) * r]);
    }
    ctx.fillStyle = `rgba(${color},${alpha})`;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    for (const [px, py] of pts) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${color},0.55)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (g.state === 'investigate' && g.target) {
      ctx.strokeStyle = 'rgba(255,200,90,0.7)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(g.target.x, g.target.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawCoins(ctx, player) {
  for (const coin of player.thrownCoins) {
    const p = player.coinPosition(coin);
    ctx.fillStyle = coin.landed ? '#ffd23f' : '#ffe98a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, coin.landed ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a1a';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (coin.landed) {
      ctx.strokeStyle = 'rgba(255,210,63,0.6)';
      ctx.beginPath();
      ctx.arc(coin.tx, coin.ty, 14 + Math.sin(Date.now() / 120) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawGuards(ctx, guards) {
  for (const g of guards) {
    // Body: a night guard with a lantern.
    ctx.fillStyle = '#3a3f5e';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#20233a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * 20, g.y + Math.sin(g.dir) * 20);
    ctx.stroke();
    // Suspicion / alarm markers
    if (g.state === 'chase') {
      drawMarker(ctx, g.x, g.y - 26, '!', '#ff4d4d');
    } else if (g.suspicion >= 50) {
      drawMarker(ctx, g.x, g.y - 26, '?', '#ffb84d');
    } else if (g.suspicion > 1) {
      drawMarker(ctx, g.x, g.y - 26, '…', '#ffe98a');
    }
    // Suspicion arc above the guard
    if (g.suspicion > 1 && g.state !== 'chase') {
      ctx.strokeStyle = g.suspicion >= 50 ? '#ff9d3c' : '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 19, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawMarker(ctx, x, y, text, color) {
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawPlayer(ctx, player, game) {
  const p = player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Shadow cloak
  ctx.fillStyle = p.sneaking ? '#4a6b8a' : '#5e7ea6';
  ctx.beginPath();
  ctx.moveTo(0, -PLAYER_RADIUS - 2);
  ctx.lineTo(PLAYER_RADIUS - 2, PLAYER_RADIUS);
  ctx.lineTo(-PLAYER_RADIUS + 2, PLAYER_RADIUS);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c2438';
  ctx.beginPath();
  ctx.arc(0, -3, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(Math.cos(p.dir) * 3, -3 + Math.sin(p.dir) * 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.hasArtifact) {
    ctx.fillStyle = '#ffd23f';
    ctx.save();
    ctx.translate(p.x + 12, p.y - 12);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(127,227,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawNoiseRing(ctx, player) {
  const r = player.noiseRadius();
  if (!r || !player.moving) return;
  ctx.strokeStyle = player.running ? 'rgba(255,120,90,0.5)' : 'rgba(200,210,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDarkness(ctx, level, player, guards) {
  // Night falls over the museum; torch light and vision cones stay readable.
  ctx.fillStyle = 'rgba(4,5,12,0.28)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawToast(ctx, game) {
  if (!game.toast || game.toastUntil < Date.now()) return;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(game.toast).width + 28;
  const x = ctx.canvas.width / 2;
  const y = 34;
  ctx.fillStyle = 'rgba(10,12,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 18, w, 36, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,122,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffd97a';
  ctx.fillText(game.toast, x, y + 1);
}
