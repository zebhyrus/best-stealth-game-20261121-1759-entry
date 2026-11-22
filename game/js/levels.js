// Level data for The Night Curator.
// Legend: # wall · . lit floor · , shadow floor · C crate cover · D display-case cover
//          P player start · L loot gem · A the main artifact · X exit door · T torch
// Guards patrol waypoint loops (tile coords, 0-based). All tiles are 40 px.
export const TILE = 40;

export const LEVELS = [
  {
    name: 'The Marble Hall',
    intro: 'The Star Sapphire glows on its pedestal across the hall. Two night guards walk their rounds. Stay out of their lantern light, slip through the shadows, and leave by the green door.',
    map: [
      '#########################',
      '#P.....,,,......C.......#',
      '#......,,,......C....L..#',
      '#..C...,,,....####......#',
      '#..C..........#X#.......#',
      '#.....T.......#.#..C....#',
      '#.............#.#..C....#',
      '#..####.......#.#.......#',
      '#..####..C....#.#..T....#',
      '#........C.........#....#',
      '#..L.....C....C....#....#',
      '#.................#.....#',
      '#..C.....,,,......#.....#',
      '#..C.....,,,..A...#.....#',
      '#......T.,,,......#..L..#',
      '#########################',
    ],
    guards: [
      { waypoints: [[10, 2], [10, 7], [19, 7], [19, 2]], pause: 1.2, speed: 62 },
      { waypoints: [[5, 12], [12, 12], [12, 9], [5, 9]], pause: 0.9, speed: 58 },
    ],
  },
  {
    name: 'The Gallery of Whispers',
    intro: 'Portraits watch from the walls and three guards pace the gallery. The Moon Opal waits behind the display cases. Crates and cases block sight — use them.',
    map: [
      '#########################',
      '#P....C.......,,,.......#',
      '#.....C.......,,,....L..#',
      '#..D..........,,,....C..#',
      '#..D....####.......C....#',
      '#......####....T........#',
      '#.....,,,.....####...D..#',
      '#.....,,,.....####...D..#',
      '#..C..,T,.............C.#',
      '#..C....................#',
      '#......D....C....C......#',
      '#......D....C....C..L...#',
      '#.....,,,............#..#',
      '#..L..,,,....A.....#X#..#',
      '#.....,,,....T.....#.#..#',
      '#########################',
    ],
    guards: [
      { waypoints: [[4, 2], [13, 2], [13, 5], [4, 5]], pause: 1.0, speed: 66 },
      { waypoints: [[18, 3], [18, 10], [10, 10], [10, 3]], pause: 1.4, speed: 62 },
      { waypoints: [[5, 13], [5, 8], [15, 8], [15, 13]], pause: 0.8, speed: 70 },
    ],
  },
  {
    name: 'The Vault of Stars',
    intro: 'The last room. Four guards, tight patrols, and the Crown of Falling Stars under the skylight. Patience wins: learn the patrols, move when the cones turn away.',
    map: [
      '#########################',
      '#P..C......,,,......D...#',
      '#...C......,,,......D.L.#',
      '#...C..T...,,,....####..#',
      '#.........,,,....#X#....#',
      '#..D......,,,....#.#.C..#',
      '#..D...C.........#.#.C..#',
      '#.....C....####..#.#....#',
      '#.....,,,..####.....T...#',
      '#..L..,,,.......C.......#',
      '#.....T,,..D....C...C...#',
      '#.........D....C....C...#',
      '#..C.....,,,......##....#',
      '#..C..L..,,,..A...#.....#',
      '#.......T,,,.......#..L.#',
      '#########################',
    ],
    guards: [
      { waypoints: [[8, 2], [8, 6], [16, 6], [16, 2]], pause: 0.7, speed: 74 },
      { waypoints: [[3, 10], [10, 10], [10, 13], [4, 13]], pause: 1.1, speed: 68 },
      { waypoints: [[19, 2], [20, 8], [15, 8], [14, 3]], pause: 1.0, speed: 72 },
      { waypoints: [[12, 11], [19, 11], [18, 14], [12, 14]], pause: 1.3, speed: 64 },
    ],
  },
];

// Parse a level map into walkable grids and entity lists.
export function parseLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const solid = [];
  const shadow = [];
  const torches = [];
  const loot = [];
  let player = null;
  let artifact = null;
  let exit = null;
  for (let y = 0; y < rows; y++) {
    solid[y] = [];
    shadow[y] = [];
    for (let x = 0; x < cols; x++) {
      const ch = def.map[y][x];
      solid[y][x] = ch === '#' || ch === 'C' || ch === 'D';
      shadow[y][x] = ch === ',';
      if (ch === 'T') torches.push({ x, y });
      if (ch === 'L') loot.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false });
      if (ch === 'P') player = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      if (ch === 'A') artifact = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false };
      if (ch === 'X') exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, tx: x, ty: y };
    }
  }
  return { def, rows, cols, solid, shadow, torches, loot, player, artifact, exit };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.def.map[ty][tx];
}

export function isSolid(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return true;
  return level.solid[ty][tx];
}

export function isShadow(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return false;
  return level.shadow[ty][tx];
}

// Line of sight between two points, blocked by solid tiles. Sampled in small steps.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolid(level, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Breadth-first path on the tile grid; returns pixel waypoints (tile centres).
export function findPath(level, sx, sy, tx, ty) {
  const startX = Math.floor(sx / TILE);
  const startY = Math.floor(sy / TILE);
  const goalX = Math.floor(tx / TILE);
  const goalY = Math.floor(ty / TILE);
  if (startX === goalX && startY === goalY) return [{ x: tx, y: ty }];
  const key = (x, y) => y * level.cols + x;
  const prev = new Map();
  const seen = new Set([key(startX, startY)]);
  const queue = [[startX, startY]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue;
      if (level.solid[ny][nx] || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      prev.set(key(nx, ny), [cx, cy]);
      if (nx === goalX && ny === goalY) {
        const path = [{ x: tx, y: ty }];
        let cur = [nx, ny];
        while (!(cur[0] === startX && cur[1] === startY)) {
          path.unshift({ x: cur[0] * TILE + TILE / 2, y: cur[1] * TILE + TILE / 2 });
          cur = prev.get(key(cur[0], cur[1]));
        }
        return path;
      }
      queue.push([nx, ny]);
    }
  }
  return [];
}
