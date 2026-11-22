// The Night Curator — game orchestration: states, input, pickups, lives,
// level flow, HUD and overlays. The stealth rules live in guards.js and
// player.js; the look lives in render.js.
import { LEVELS, parseLevel, TILE } from './levels.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { drawGame } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const sounds = new SoundBank();

const game = {
  state: 'menu', // menu | playing | levelclear | gameover | victory | paused
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  lives: 3,
  score: 0,
  levelTime: 0,
  totalTime: 0,
  artifactTaken: false,
  toast: '',
  toastUntil: 0,
  caughtFlash: 0,
};

const input = { up: false, down: false, left: false, right: false, sneak: false };

function loadLevel(index) {
  const def = LEVELS[index];
  game.levelIndex = index;
  game.level = parseLevel(def);
  game.player = new Player(game.level.player);
  game.player.onStep = (x, y, loud) => sounds.footstep(loud);
  game.player.onNoise = (x, y, radius) => {
    for (const g of game.guards) g.hearNoise(x, y, radius);
  };
  game.guards = def.guards.map((gd) => {
    const g = new Guard(gd, game.level);
    g.onStep = () => sounds.guardStep();
    g.onSpotted = (kind) => {
      if (kind === 'noticed') sounds.noticed();
      if (kind === 'alarm') {
        sounds.alarm();
        showToast('SPOTTED! Break line of sight to lose them');
      }
    };
    return g;
  });
  game.artifactTaken = false;
  game.levelTime = 0;
  document.getElementById('hud-level').textContent =
    `Level ${index + 1} · ${def.name}`;
  document.getElementById('hud-objective').textContent =
    'Steal the artifact, then reach the green EXIT.';
  updateHud();
}

function showToast(text, ms) {
  game.toast = text;
  game.toastUntil = Date.now() + (ms || 2600);
}

function updateHud() {
  const p = game.player;
  const maxSuspicion = game.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  document.getElementById('hud-loot').textContent = `◆ ${p ? p.loot : 0}`;
  document.getElementById('hud-coins').textContent = `◉ ${p ? p.coins : 0}`;
  document.getElementById('hud-lives').textContent = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives));
  const fill = document.getElementById('suspicion-fill');
  fill.style.width = `${maxSuspicion}%`;
  fill.style.background = maxSuspicion >= 100 ? '#ff4d4d' : maxSuspicion >= 50 ? '#ff9d3c' : '#ffd23f';
  document.getElementById('hud-suspicion-label').textContent =
    maxSuspicion >= 100 ? 'ALARM!' : maxSuspicion >= 50 ? 'SUSPICIOUS' : 'UNSEEN';
}

function showOverlay(html) {
  overlay.innerHTML = `<div class="panel">${html}</div>`;
  overlay.classList.add('show');
}

function hideOverlay() {
  overlay.classList.remove('show');
  overlay.innerHTML = '';
}
game.hideOverlay = hideOverlay;

function showMenu() {
  game.state = 'menu';
  showOverlay(`
    <h1>THE NIGHT CURATOR</h1>
    <p>You are <b>Wren</b>, a cat burglar in the Halden Museum of Curiosities.
    The guards walk their rounds under the torches. Learn their patrols,
    slip through the shadows, steal the glowing artifact and leave by the
    green EXIT — unseen.</p>
    <p class="keys">${isTouchDevice
      ? '<b>Joystick</b> move &nbsp;·&nbsp; <b>SNEAK</b> sneak &nbsp;·&nbsp; <b>COIN</b> throw a coin ahead &nbsp;·&nbsp; tap the floor to throw at a spot'
      : '<b>WASD / arrows</b> move &nbsp;·&nbsp; <b>Shift</b> sneak &nbsp;·&nbsp; <b>Click</b> throw a coin to distract &nbsp;·&nbsp; walk over gems to grab them'}</p>
    <p class="keys">Yellow cones are a guard's sight. A full suspicion meter raises the
    alarm — break line of sight and hide until they give up. Running is loud.</p>
    <button class="big-btn" id="start-btn">BEGIN THE HEIST</button>
  `);
  document.getElementById('start-btn').addEventListener('click', () => {
    sounds.ensure();
    startLevel(0);
  });
}

function showLevelIntro(index) {
  game.state = 'intro';
  const def = LEVELS[index];
  showOverlay(`
    <h2>Level ${index + 1} · ${def.name}</h2>
    <p>${def.intro}</p>
    <p class="keys">Guards on this floor: <b>${def.guards.length}</b> &nbsp;·&nbsp;
    Gems to find: <b>${game.level.loot.length}</b></p>
    <button class="big-btn" id="go-btn">ENTER THE GALLERY</button>
  `);
  document.getElementById('go-btn').addEventListener('click', () => {
    sounds.ensure();
    hideOverlay();
    game.state = 'playing';
  });
}

function startLevel(index) {
  loadLevel(index);
  showLevelIntro(index);
}

function levelComplete() {
  const timeBonus = Math.max(0, 300 - Math.floor(game.levelTime)) * 2;
  const lootBonus = game.player.loot * 50;
  const gained = 200 + lootBonus + timeBonus;
  game.score += gained;
  sounds.levelClear();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'victory';
    showOverlay(`
      <h1>CLEAN GETAWAY</h1>
      <p>You slipped out of the Halden Museum with every artifact and not
      a single guard the wiser. The night is yours, Wren.</p>
      <p class="score-line">Final score: ${game.score} &nbsp;·&nbsp; Time: ${formatTime(game.totalTime)}</p>
      <button class="big-btn" id="again-btn">PLAY AGAIN</button>
    `);
    document.getElementById('again-btn').addEventListener('click', () => {
      game.lives = 3;
      game.score = 0;
      game.totalTime = 0;
      startLevel(0);
    });
    return;
  }
  game.state = 'levelclear';
  showOverlay(`
    <h2>${LEVELS[game.levelIndex].name} — cleared!</h2>
    <p>You reached the exit unseen. The next gallery is darker, and its
    guards walk faster.</p>
    <p class="score-line">+${gained} points &nbsp;·&nbsp; Score: ${game.score}</p>
    <button class="big-btn" id="next-btn">NEXT GALLERY</button>
  `);
  document.getElementById('next-btn').addEventListener('click', () => startLevel(game.levelIndex + 1));
}

function playerCaught() {
  game.lives -= 1;
  sounds.caught();
  game.caughtFlash = 1;
  updateHud();
  if (game.lives <= 0) {
    game.state = 'gameover';
    showOverlay(`
      <h2 class="danger">CAUGHT IN THE LIGHT</h2>
      <p>The guards closed in and the night ended in the museum's back room.
      Wren will try again tomorrow — the Sapphire is patient.</p>
      <p class="score-line">Score: ${game.score}</p>
      <button class="big-btn" id="retry-btn">TRY AGAIN</button>
    `);
    document.getElementById('retry-btn').addEventListener('click', () => {
      game.lives = 3;
      game.score = 0;
      game.totalTime = 0;
      startLevel(game.levelIndex);
    });
    return;
  }
  showToast(`Caught! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — back to the start`);
  // Reset the floor: player back at the entrance, guards back on patrol.
  game.player.reset(game.level.player);
  game.level.loot.forEach((g) => { if (g.taken) { g.taken = false; } });
  game.player.loot = 0;
  game.level.artifact.taken = false;
  game.player.hasArtifact = false;
  game.artifactTaken = false;
  for (const g of game.guards) {
    const def = LEVELS[game.levelIndex].guards[game.guards.indexOf(g)];
    const fresh = new Guard(def, game.level);
    fresh.onStep = () => sounds.guardStep();
    fresh.onSpotted = g.onSpotted;
    game.guards[game.guards.indexOf(g)] = fresh;
  }
  updateHud();
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function checkPickups() {
  const p = game.player;
  const lvl = game.level;
  for (const gem of lvl.loot) {
    if (!gem.taken && Math.hypot(gem.x - p.x, gem.y - p.y) < 24) {
      gem.taken = true;
      p.loot += 1;
      game.score += 50;
      sounds.pickup();
      showToast('Gem pocketed (+50)');
      updateHud();
    }
  }
  const a = lvl.artifact;
  if (!a.taken && Math.hypot(a.x - p.x, a.y - p.y) < 26) {
    a.taken = true;
    p.hasArtifact = true;
    game.artifactTaken = true;
    game.score += 200;
    sounds.artifact();
    showToast('Artifact secured — now reach the green EXIT!');
    document.getElementById('hud-objective').textContent =
      'Artifact secured! Reach the green EXIT unseen.';
    updateHud();
  }
  const e = lvl.exit;
  if (game.artifactTaken && Math.hypot(e.x - p.x, e.y - p.y) < 24) {
    sounds.exitOpen();
    levelComplete();
  }
}

function update(dt) {
  if (game.state !== 'playing') return;
  game.levelTime += dt;
  game.totalTime += dt;
  game.player.update(dt, input, game.level);
  for (const g of game.guards) g.update(dt, game.player);
  checkPickups();
  for (const g of game.guards) {
    if (g.catches(game.player)) {
      playerCaught();
      return;
    }
  }
  updateHud();
}

let last = performance.now();
let touchShown = false;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawGame(ctx, game);
  // Touch controls are only on screen while actually playing.
  const showTouch = game.state === 'playing';
  if (showTouch !== touchShown) {
    touchShown = showTouch;
    touchUI.classList.toggle('on', showTouch);
  }
  if (game.caughtFlash > 0) {
    game.caughtFlash = Math.max(0, game.caughtFlash - dt * 2);
    ctx.fillStyle = `rgba(255,40,40,${game.caughtFlash * 0.25})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(loop);
}

// ---- Input ----
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'Escape') { togglePause(); return; }
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; e.preventDefault(); }
  if (e.code === 'Enter' && game.state === 'menu') {
    sounds.ensure();
    startLevel(0);
  }
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) input[k] = false;
});
function throwCoinAt(tx, ty) {
  if (game.state !== 'playing') return;
  const dx = tx - game.player.x;
  const dy = ty - game.player.y;
  const dist = Math.hypot(dx, dy);
  const maxThrow = 280;
  const scale = dist > maxThrow ? maxThrow / dist : 1;
  if (game.player.throwCoin(game.player.x + dx * scale, game.player.y + dy * scale)) {
    sounds.coinThrow();
    const coin = game.player.thrownCoins[game.player.thrownCoins.length - 1];
    coin.onLand = (x, y) => {
      sounds.coinClink();
      for (const g of game.guards) g.hearNoise(x, y, 240);
      showToast('The coin clinks — a guard goes to look');
    };
    updateHud();
  }
}

canvas.addEventListener('mousedown', (e) => {
  sounds.ensure();
  if (game.state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const tx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const ty = (e.clientY - rect.top) * (canvas.height / rect.height);
  throwCoinAt(tx, ty);
});
// Tap the floor on a touch screen: same throw as a mouse click, at the
// tapped point. preventDefault stops the synthetic mousedown so the coin
// is only thrown once.
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  sounds.ensure();
  if (game.state !== 'playing') return;
  const t = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const tx = (t.clientX - rect.left) * (canvas.width / rect.width);
  const ty = (t.clientY - rect.top) * (canvas.height / rect.height);
  throwCoinAt(tx, ty);
}, { passive: false });
document.getElementById('mute-btn').addEventListener('click', toggleMute);
function toggleMute() {
  sounds.ensure();
  sounds.setMuted(!sounds.muted);
  document.getElementById('mute-btn').classList.toggle('muted', sounds.muted);
}

// ---- Touch controls (phones/tablets) ----
// Every touch control writes the SAME `input` flags the keyboard writes,
// so the game logic (player.js, guards.js) is untouched.
const touchUI = document.getElementById('touch-ui');
const isTouchDevice =
  window.matchMedia('(pointer: coarse)').matches ||
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0;
if (isTouchDevice) document.documentElement.classList.add('touch');

// Virtual joystick: 8-way movement. The stick's deflection maps to the
// four direction flags, exactly like holding WASD/arrows.
const stick = document.getElementById('stick');
const knob = document.getElementById('stick-knob');
let stickPointer = null;
function stickUpdate(e) {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = (e.clientX - cx) / (rect.width / 2);
  let dy = (e.clientY - cy) / (rect.height / 2);
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
  const dead = 0.3;
  input.left = dx < -dead;
  input.right = dx > dead;
  input.up = dy < -dead;
  input.down = dy > dead;
}
function stickReset() {
  stickPointer = null;
  knob.style.transform = 'translate(0, 0)';
  input.left = input.right = input.up = input.down = false;
}
stick.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  stickPointer = e.pointerId;
  try { stick.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer: no capture */ }
  stickUpdate(e);
});
stick.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickPointer) stickUpdate(e);
});
stick.addEventListener('pointerup', (e) => {
  if (e.pointerId === stickPointer) stickReset();
});
stick.addEventListener('pointercancel', (e) => {
  if (e.pointerId === stickPointer) stickReset();
});

// SNEAK is a toggle on touch (holding Shift with one thumb while steering
// with the other is not practical). It sets the same input.sneak flag.
const sneakBtn = document.getElementById('btn-sneak');
sneakBtn.addEventListener('click', () => {
  input.sneak = !input.sneak;
  sneakBtn.classList.toggle('active', input.sneak);
});

// COIN throws a brass coin 280 px ahead in the direction Wren faces —
// the same throwCoinAt() the mouse click uses.
document.getElementById('btn-coin').addEventListener('click', () => {
  sounds.ensure();
  const p = game.player;
  if (!p) return;
  throwCoinAt(p.x + Math.cos(p.dir) * 280, p.y + Math.sin(p.dir) * 280);
});

// Pause: freezing the update loop (update() already returns early unless
// the state is 'playing') while the world keeps drawing underneath.
function resumeGame() {
  hideOverlay();
  game.state = 'playing';
}
function togglePause() {
  if (game.state === 'playing') {
    game.state = 'paused';
    showOverlay(`
      <h2>PAUSED</h2>
      <p>Wren waits in the dark. The guards keep their rounds.</p>
      <button class="big-btn" id="resume-btn">RESUME</button>
    `);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
  } else if (game.state === 'paused') {
    resumeGame();
  }
}
document.getElementById('btn-pause').addEventListener('click', togglePause);

// ---- Boot ----
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
loadLevel(0);
if (shot) {
  applyShot(game, shot);
  if (shot === 'start') showMenu();
  else hideOverlay();
} else {
  showMenu();
}
requestAnimationFrame(loop);
