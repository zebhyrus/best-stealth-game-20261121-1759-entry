// Guard AI: patrols, vision cones, suspicion, alarm and recovery.
// A guard patrols its waypoint loop, pauses at each point and looks around.
// Seeing the player fills suspicion; a full meter raises the alarm and the
// guard chases. Break line of sight and the guard searches, then gives up
// and goes back to patrol — that is the player's chance to recover.
import { TILE, findPath, hasLineOfSight, isShadow } from './levels.js';

export const CONE_RANGE = 250;
export const CONE_HALF_ANGLE = 0.62; // ~35 degrees each side
export const SUSPICION_MAX = 100;

export class Guard {
  constructor(def, level) {
    this.level = level;
    this.waypoints = def.waypoints.map(([tx, ty]) => ({
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE / 2,
    }));
    this.pauseTime = def.pause;
    this.speed = def.speed;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.dir = 0; // facing angle, radians
    this.wpIndex = 1 % this.waypoints.length;
    this.path = [];
    this.state = 'patrol'; // patrol | pause | investigate | chase | search | return
    this.suspicion = 0;
    this.alarm = 0; // seconds the alarm has been active
    this.lostSight = 0; // seconds since the player was last seen
    this.pauseLeft = 0;
    this.scanDir = 1;
    this.scanAngle = 0;
    this.target = null; // point being investigated / chased
    this.lastSeen = null;
    this.heardAt = 0;
    this.chaseSpeed = def.speed * 1.55;
    this.stepPhase = 0;
    this.onStep = null; // callback(x, y, running) for footstep sounds
    this.onSpotted = null; // callback() when suspicion crosses 50 / 100
    this.spotted50 = false;
    this.spotted100 = false;
  }

  // Can this guard see the player right now? Returns 0..1 visibility.
  visibilityOf(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE) return 0;
    const ang = Math.atan2(dy, dx);
    let diff = ang - this.dir;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > CONE_HALF_ANGLE) return 0;
    if (!hasLineOfSight(this.level, this.x, this.y, player.x, player.y)) return 0;
    // Closer and better lit = easier to spot. Shadows and sneaking hide you.
    let vis = 1 - dist / CONE_RANGE * 0.55;
    if (isShadow(this.level, player.x, player.y)) vis *= 0.45;
    if (player.sneaking) vis *= 0.6;
    if (player.running) vis *= 1.35;
    return Math.min(1, Math.max(0, vis));
  }

  hearNoise(x, y, radius) {
    if (this.state === 'chase') return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d > radius) return;
    this.target = { x, y };
    this.path = findPath(this.level, this.x, this.y, x, y);
    this.state = 'investigate';
    this.heardAt = 1;
  }

  update(dt, player) {
    const vis = this.visibilityOf(player);
    if (vis > 0) {
      // Suspicion fills faster the clearer the view; drains when unseen.
      this.suspicion += vis * 62 * dt;
      this.lastSeen = { x: player.x, y: player.y };
      this.lostSight = 0;
      if (this.suspicion >= 50 && !this.spotted50) {
        this.spotted50 = true;
        if (this.onSpotted) this.onSpotted('noticed');
      }
      if (this.suspicion >= SUSPICION_MAX && this.state !== 'chase') {
        this.suspicion = SUSPICION_MAX;
        this.state = 'chase';
        this.alarm = 0;
        if (this.onSpotted) this.onSpotted('alarm');
        this.spotted100 = true;
      }
    } else {
      this.lostSight += dt;
      if (this.state !== 'chase') {
        this.suspicion = Math.max(0, this.suspicion - 26 * dt);
        if (this.suspicion < 50) this.spotted50 = false;
      }
    }

    if (this.state === 'chase') {
      this.alarm += dt;
      if (this.lastSeen) {
        // Chase the last seen spot; keep tracking while visible.
        const goal = vis > 0 ? { x: player.x, y: player.y } : this.lastSeen;
        this.moveToward(goal.x, goal.y, this.chaseSpeed, dt);
      }
      if (this.lostSight > 3.5) {
        // Lost the trail: search the last seen spot, then give up.
        this.state = 'search';
        this.target = this.lastSeen;
        this.path = findPath(this.level, this.x, this.y, this.target.x, this.target.y);
      }
      return;
    }

    if (this.state === 'search') {
      if (this.followPath(dt, this.speed * 1.15)) {
        // Arrived, looked around, found nothing: suspicion cools, back to patrol.
        this.suspicion = Math.max(0, this.suspicion - 40);
        this.spotted100 = false;
        this.state = 'return';
        this.target = this.nearestWaypoint();
        this.path = findPath(this.level, this.x, this.y, this.target.x, this.target.y);
      }
      return;
    }

    if (this.state === 'investigate') {
      if (this.followPath(dt, this.speed * 1.25)) {
        this.state = 'pause';
        this.pauseLeft = 1.6;
        this.scanAngle = 0;
      }
      return;
    }

    if (this.state === 'return') {
      if (this.followPath(dt, this.speed)) {
        this.state = 'patrol';
        this.wpIndex = this.nearestWaypointIndex();
        this.setNextPatrolTarget();
      }
      return;
    }

    if (this.state === 'pause') {
      this.pauseLeft -= dt;
      // Look around while waiting: sweep the cone back and forth.
      this.scanAngle += this.scanDir * dt * 1.1;
      if (this.scanAngle > 0.9) this.scanDir = -1;
      if (this.scanAngle < -0.9) this.scanDir = 1;
      this.dir += this.scanDir * dt * 1.1;
      if (this.pauseLeft <= 0) {
        this.state = 'patrol';
        this.setNextPatrolTarget();
      }
      return;
    }

    // patrol
    if (this.followPath(dt, this.speed)) {
      this.state = 'pause';
      this.pauseLeft = this.pauseTime;
      this.scanAngle = 0;
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
    }
  }

  nearestWaypoint() {
    let best = this.waypoints[0];
    let bestD = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (d < bestD) { bestD = d; best = wp; }
    }
    return best;
  }

  nearestWaypointIndex() {
    let best = 0;
    let bestD = Infinity;
    this.waypoints.forEach((wp, i) => {
      const d = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  setNextPatrolTarget() {
    const wp = this.waypoints[this.wpIndex];
    this.path = findPath(this.level, this.x, this.y, wp.x, wp.y);
  }

  // Walk the current BFS path. Returns true when the path is finished.
  followPath(dt, speed) {
    if (!this.path.length) return true;
    const next = this.path[0];
    const arrived = this.moveToward(next.x, next.y, speed, dt);
    if (arrived) this.path.shift();
    return !this.path.length;
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + dx / dist * step;
    const ny = this.y + dy / dist * step;
    this.dir = Math.atan2(dy, dx);
    this.x = nx;
    this.y = ny;
    this.stepPhase += step;
    if (this.stepPhase > 34) {
      this.stepPhase = 0;
      if (this.onStep) this.onStep(this.x, this.y, speed > this.speed);
    }
    return dist - step < 3;
  }

  // Distance at which the guard catches the player.
  catches(player) {
    return this.state === 'chase' && Math.hypot(player.x - this.x, player.y - this.y) < 26;
  }
}
