// Screenshot scenes (?shot=start|patrol|chase|exit). Each one sets the game
// up deterministically on level 1 so the screenshots are real renders of
// the game's own code, showing the stealth at its best.
import { TILE } from './levels.js';

export function applyShot(game, shot) {
  const { level, player, guards } = game;
  const at = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });

  if (shot === 'start') {
    game.state = 'menu';
    return;
  }

  game.state = 'playing';
  game.hideOverlay();

  if (shot === 'patrol') {
    // Wren crouched behind a crate at the edge of a sweeping cone.
    const p = at(8, 5);
    player.x = p.x;
    player.y = p.y;
    player.sneaking = true;
    const g = guards[0];
    const gp = at(12, 5);
    g.x = gp.x;
    g.y = gp.y;
    g.dir = Math.PI; // facing left, cone sweeping toward the player
    g.state = 'pause';
    g.pauseLeft = 99;
    g.suspicion = 34;
    const g2 = guards[1];
    const gp2 = at(8, 11);
    g2.x = gp2.x;
    g2.y = gp2.y;
    g2.dir = -Math.PI / 2;
    g2.state = 'pause';
    g2.pauseLeft = 99;
    game.toast = 'Stay out of the yellow cones — shadows hide you';
    game.toastUntil = Date.now() + 60000;
    return;
  }

  if (shot === 'chase') {
    // The alarm is up: a guard has spotted Wren and is closing in.
    const p = at(11, 9);
    player.x = p.x;
    player.y = p.y;
    player.running = true;
    const g = guards[0];
    const gp = at(11, 6);
    g.x = gp.x;
    g.y = gp.y;
    g.dir = Math.PI / 2;
    g.state = 'chase';
    g.suspicion = 100;
    g.lastSeen = { x: p.x, y: p.y };
    g.lostSight = 0;
    g.spotted100 = true;
    const g2 = guards[1];
    const gp2 = at(5, 12);
    g2.x = gp2.x;
    g2.y = gp2.y;
    g2.dir = 0;
    g2.state = 'pause';
    g2.pauseLeft = 99;
    g2.suspicion = 62;
    game.toast = 'SPOTTED! Break line of sight to lose them';
    game.toastUntil = Date.now() + 60000;
    return;
  }

  if (shot === 'exit') {
    // The Sapphire is in hand and the green door stands open.
    level.artifact.taken = true;
    player.hasArtifact = true;
    game.artifactTaken = true;
    const p = at(16, 6);
    player.x = p.x;
    player.y = p.y;
    player.loot = 2;
    const g = guards[0];
    const gp = at(19, 4);
    g.x = gp.x;
    g.y = gp.y;
    g.dir = Math.PI;
    g.state = 'pause';
    g.pauseLeft = 99;
    const g2 = guards[1];
    const gp2 = at(10, 12);
    g2.x = gp2.x;
    g2.y = gp2.y;
    g2.dir = Math.PI / 2;
    g2.state = 'pause';
    g2.pauseLeft = 99;
    game.toast = 'Sapphire secured — reach the green EXIT unseen';
    game.toastUntil = Date.now() + 60000;
    document.getElementById('hud-objective').textContent =
      'Artifact secured! Reach the green EXIT unseen.';
    return;
  }
}
