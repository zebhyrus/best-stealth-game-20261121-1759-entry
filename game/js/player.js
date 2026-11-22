// The player: Wren, a cat burglar. WASD/arrows to move, Shift to sneak,
// mouse click to throw a brass coin, E to pick up loot. Running is fast
// but loud; sneaking is slow, quiet and harder to spot.
import { TILE, isSolid } from './levels.js';

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 78;
export const RUN_SPEED = 205;
export const NOISE_RADIUS_WALK = 70;
export const NOISE_RADIUS_RUN = 190;
export const NOISE_RADIUS_SNEAK = 26;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.dir = -Math.PI / 2;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.coins = 3;
    this.loot = 0;
    this.hasArtifact = false;
    this.stepPhase = 0;
    this.stepTimer = 0;
    this.onStep = null; // callback(x, y, loud) for footstep sounds
    this.onNoise = null; // callback(x, y, radius) when a loud step is heard
    this.thrownCoins = []; // {x, y, tx, ty, t, landed}
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.dir = -Math.PI / 2;
    this.thrownCoins = [];
    this.hasArtifact = false;
  }

  throwCoin(tx, ty) {
    if (this.coins <= 0) return false;
    this.coins -= 1;
    this.thrownCoins.push({ x: this.x, y: this.y, tx, ty, t: 0, landed: false, clinked: false });
    return true;
  }

  update(dt, input, level) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = !!input.sneak;
    this.running = this.moving && !this.sneaking;

    let speed = WALK_SPEED;
    if (this.sneaking) speed = SNEAK_SPEED;
    else if (this.running) speed = RUN_SPEED;

    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.dir = Math.atan2(my, mx);
      this.moveWithCollision(mx * speed * dt, my * speed * dt, level);
      this.stepPhase += speed * dt;
      const stride = this.sneaking ? 26 : 36;
      if (this.stepPhase > stride) {
        this.stepPhase = 0;
        const loud = this.running;
        if (this.onStep) this.onStep(this.x, this.y, loud);
        if (loud && this.onNoise) this.onNoise(this.x, this.y, NOISE_RADIUS_RUN);
        else if (!this.sneaking && this.onNoise) this.onNoise(this.x, this.y, NOISE_RADIUS_WALK);
      }
    }

    // Thrown coins arc to their target, then clink and draw guards.
    for (const coin of this.thrownCoins) {
      if (coin.landed) continue;
      coin.t += dt * 2.2;
      if (coin.t >= 1) {
        coin.t = 1;
        coin.landed = true;
        if (!coin.clinked) {
          coin.clinked = true;
          if (coin.onLand) coin.onLand(coin.tx, coin.ty);
        }
      }
    }
    this.thrownCoins = this.thrownCoins.filter((c) => !c.landed || c.t < 1.6);
    for (const coin of this.thrownCoins) {
      if (coin.landed) coin.t += dt * 0.8;
    }
  }

  // Circle-vs-tile collision, axis separated so the player slides along walls.
  moveWithCollision(dx, dy, level) {
    const r = PLAYER_RADIUS;
    const nx = this.x + dx;
    if (!this.hitsSolid(nx, this.y, r, level)) this.x = nx;
    const ny = this.y + dy;
    if (!this.hitsSolid(this.x, ny, r, level)) this.y = ny;
  }

  hitsSolid(px, py, r, level) {
    const corners = [
      [px - r, py - r], [px + r, py - r],
      [px - r, py + r], [px + r, py + r],
      [px - r, py], [px + r, py], [px, py - r], [px, py + r],
    ];
    return corners.some(([x, y]) => isSolid(level, x, y));
  }

  coinPosition(coin) {
    const t = coin.t;
    const x = coin.x + (coin.tx - coin.x) * t;
    const y = coin.y + (coin.ty - coin.y) * t - Math.sin(t * Math.PI) * 26;
    return { x, y };
  }

  noiseRadius() {
    if (!this.moving) return 0;
    if (this.sneaking) return NOISE_RADIUS_SNEAK;
    if (this.running) return NOISE_RADIUS_RUN;
    return NOISE_RADIUS_WALK;
  }
}
