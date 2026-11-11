// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: the islands. Each era is its own island with a beach, a hill (and a higher mesa),
// a ramp up, a river with a waterfall and a bridge. Heights are worked out from these shapes,
// so walking, placing things and drawing the ground all read the same numbers.
'use strict';

const TIER = 2.4;      // one cliff step
const SEA = -0.35;     // water level everywhere
// Shapes in island coordinates: x as in the world, z measured from the island's centre (cz).
const ISLANDS = [
  { cz: 900, seed: 1, pz: -24, pw: 1, grassS: 31, beachS: 40, // 석기: an autumn island, river on the west
    mesas: [{ x: 31, z: -42, r: 11 }], ramps: [{ x0: -3.2, x1: 3.2, z0: -28, z1: -18 }],
    rivers: [{ w: 4.5, pts: [[-33, -21], [-37, -6], [-35, 10], [-39, 26], [-42, 46]] }], tops: [{ x: -33, z: -28.5, r: 3.4 }],
    bridges: [{ x0: -41, x1: -30, z0: 10.4, z1: 13.6 }],
    paths: [[[0, -37], [0, 30]], [[-24, -18], [24, -18]], [[-24, 4], [24, 4]], [[-26, 12], [-44, 12]]], plazas: [[0, -37, 5], [0, 25, 4.5]],
    grass: [0xe6c36a, 0xd9b05a], cliff: [0xeaa97c, 0xd88f6c, 0xf2bd8e], path: 0xc9965e, sand: 0xf6e2b0 },
  { cz: 600, seed: 2, pz: -24, pw: 1, grassS: 31, beachS: 40, // 철기: a spring island, river on the east
    mesas: [{ x: -31, z: -42, r: 10 }], ramps: [{ x0: -3.2, x1: 3.2, z0: -28, z1: -18 }],
    rivers: [{ w: 4.5, pts: [[33, -21], [37, -6], [35, 10], [39, 26], [42, 46]] }], tops: [{ x: 33, z: -28.5, r: 3.4 }],
    bridges: [{ x0: 30, x1: 41, z0: -3.6, z1: -0.4 }],
    paths: [[[0, -37], [0, 30]], [[-24, -18], [24, -18]], [[-24, 4], [24, 4]], [[26, -2], [44, -2]]], plazas: [[0, -37, 5], [0, 25, 4.5]],
    grass: [0x9ad86b, 0x8acb5e], cliff: [0xc9a27e, 0xb58a68, 0xd8b690], path: 0xdcbf8f, sand: 0xf6e6b8 },
  { cz: 300, seed: 3, pz: -24, pw: 1, grassS: 31, beachS: 40, // 산업: a summer island, river bending round the east to the beach
    mesas: [{ x: -31, z: -42, r: 11 }], ramps: [{ x0: -3.2, x1: 3.2, z0: -28, z1: -18 }],
    rivers: [{ w: 4.5, pts: [[31, -21], [37, -2], [35, 14], [26, 27], [20, 46]] }], tops: [{ x: 31, z: -28.5, r: 3.4 }],
    bridges: [{ x0: 31, x1: 42, z0: 4.4, z1: 7.6 }],
    paths: [[[0, -37], [0, 30]], [[-24, -18], [24, -18]], [[-24, 4], [24, 4]], [[26, 6], [44, 6]]], plazas: [[0, -37, 5], [0, 25, 4.5]],
    grass: [0x7fcb6e, 0x70bd62], cliff: [0xb3acc4, 0x9b94ae, 0xc6bfd4], path: 0xc9c1b6, sand: 0xf3e4bd },
  { cz: 10, seed: 4, pz: -33, pw: 0.5, grassS: 50, beachS: 59, // 우주: the old village, now on an island with the launch pad up the hill
    mesas: [{ x: 33, z: -45, r: 9 }], ramps: [{ x0: -12.6, x1: -6.4, z0: -37, z1: -27 }],
    rivers: [{ w: 4.5, pts: [[-40, -30], [-42, -10], [-38, 10], [-42, 30], [-45, 56]] }], tops: [{ x: -40, z: -37.5, r: 3.4 }],
    bridges: [{ x0: -46, x1: -34, z0: 18.4, z1: 21.6 }],
    paths: [[[0, -40], [-9.5, -37], [-9.5, -24], [0, -17], [0, 52]], [[-21, -11], [21, -11]], [[-19.5, -21], [-19.5, 13]], [[19.5, -21], [19.5, 13]], [[-36, 20], [-48, 20]]], plazas: [[0, -10, 8.5]],
    grass: [0x9fe6c3, 0x92dbb8], cliff: [0xc3b1e1, 0xae9cd2, 0xd4c6ee], path: 0xf8e6c0, sand: 0xf6ead0 },
];
ISLANDS.forEach(I => { I.hx = 47; I.north = -52; });

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function segDist(px, pz, a, b) {
  const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t);
}
function lineDist(px, pz, pts) { let d = 1e9; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(px, pz, pts[i - 1], pts[i])); return d; }
const plateauZ = (I, lx) => I.pz + I.pw * (Math.sin(lx * 0.15 + I.seed) * 1.6 + Math.sin(lx * 0.37 + I.seed * 2));
function edgeIn(I, lx, lz) { // how far inside the island's cliffy north, east and west edges; the south is beach
  const side = I.hx + 1.3 * Math.sin(lz * 0.19 + I.seed) + Math.sin(lz * 0.43 + I.seed * 2) - Math.abs(lx);
  const north = lz - (I.north + 1.4 * Math.sin(lx * 0.17 + I.seed) + Math.sin(lx * 0.41 + I.seed));
  return Math.min(side, north);
}
/** Ground height at a world point, before bridges. Sea floor is -3. */
function terrainH(x, z) {
  const I = ISLANDS[zoneOf(z)], lx = x, lz = z - I.cz;
  const edge = edgeIn(I, lx, lz); if (edge < -0.5) return -3;
  let h = TIER * sstep(0.25, -0.25, lz - plateauZ(I, lx));
  for (const m of I.mesas) { const d = Math.hypot(lx - m.x, lz - m.z) - (m.r + Math.sin(Math.atan2(lz - m.z, lx - m.x) * 5 + I.seed) * 0.8); h += TIER * sstep(0.25, -0.25, d); }
  for (const r of I.ramps) if (lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1) h = TIER * (r.z1 - lz) / (r.z1 - r.z0);
  if (lz > I.grassS) { const t = lz - I.grassS, w = I.beachS - I.grassS - 1.5; h = Math.min(h, t < 1.5 ? -0.15 * t / 1.5 : t - 1.5 < w ? -0.15 - 0.2 * (t - 1.5) / w : -0.35 - (t - 1.5 - w) * 0.35); }
  for (const rv of I.rivers) { const d = lineDist(lx, lz, rv.pts), half = rv.w / 2; if (d < half + 1.4) h = Math.min(h, -1.1 + (h + 1.1) * sstep(half, half + 1.4, d)); }
  for (const p of I.tops) { const d = Math.hypot(lx - p.x, lz - p.z); if (d < p.r + 1) h = Math.min(h, TIER - 0.9 + 0.9 * sstep(p.r - 0.6, p.r + 1, d)); }
  return -3 + (h + 3) * sstep(-0.5, 0.4, edge);
}
/** Height to stand at, or null where nobody can stand (water, sea, a hilltop pond). Bridges count as ground. */
function walkH(x, z) {
  const I = ISLANDS[zoneOf(z)], lz = z - I.cz;
  for (const b of I.bridges) if (x > b.x0 && x < b.x1 && lz > b.z0 && lz < b.z1) return Math.max(0.02, terrainH(x, z));
  for (const p of I.tops) if (Math.hypot(x - p.x, lz - p.z) < p.r + 0.3) return null;
  const h = terrainH(x, z); return h < -0.28 ? null : h;
}
/** Where to put a thing's feet: the ground, a bridge deck, or the water's surface. */
const gh = (x, z) => { const h = walkH(x, z); return h === null ? Math.max(SEA, terrainH(x, z)) : h; };

// ---- Drawing an island: one mesh, coloured by height and slope like layered earth cliffs ----------
function buildIsland(e) {
  const I = ISLANDS[e], z0 = I.north - 14, z1 = I.beachS + 16, W = I.hx * 2 + 28, D = z1 - z0, step = 0.6;
  const g = new THREE.PlaneGeometry(W, D, Math.round(W / step), Math.round(D / step)); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, zc = I.cz + (z0 + z1) / 2;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainH(pos.getX(i), pos.getZ(i) + zc));
  g.computeVertexNormals();
  const nor = g.attributes.normal, col = new Float32Array(pos.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
  const sh = new THREE.Color(0xb6f0e4), dp = new THREE.Color(0x58b9d2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), lz = pos.getZ(i) + zc - I.cz, h = pos.getY(i), ny = nor.getY(i);
    if (h < -0.3) { if (h > -0.5) c.set(0xffffff); else c.copy(sh).lerp(dp, Math.min(1, (-h - 0.5) / 1.6)); } // the white foam line, then shallow to deep
    else if (ny < 0.62) c.set(I.cliff[Math.floor((h + 3) * 1.7) % 3]);                                     // the cliff's earth bands
    else if (lz > I.grassS + 0.6 || (h < -0.08 && lz > I.grassS - 2)) c.set(I.sand);
    else if (h < -0.08) c.set(I.cliff[1]).lerp(c2.set(I.grass[1]), 0.3);                                   // a river bank
    else {
      const n = Math.sin(x * 0.31 + lz * 0.17) + Math.sin(x * 0.11 - lz * 0.29 + I.seed) + Math.sin((x + lz) * 0.53) * 0.4;
      c.set(n > 0.6 ? I.grass[1] : I.grass[0]);
      let pd = 9; for (const p of I.paths) pd = Math.min(pd, lineDist(x, lz, p)); for (const q of I.plazas) pd = Math.min(pd, Math.hypot(x - q[0], lz - q[1]) - q[2] + 1.6);
      if (pd < 1.9) c.lerp(c2.set(I.path), pd < 1.5 ? 1 : (1.9 - pd) / 0.4);
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const grp = new THREE.Group(); grp.userData.era = e;
  const ground = mesh(g, bend(new THREE.MeshLambertMaterial({ vertexColors: true })), 0, 0, zc); grp.add(ground);
  const sea = mesh(geo('sea', () => new THREE.PlaneGeometry(420, 420, 60, 60)), geo('seaM', () => bend(new THREE.MeshLambertMaterial({ color: 0x6fd3e6, transparent: true, opacity: 0.72, depthWrite: false }))), 0, SEA, I.cz);
  sea.rotation.x = -Math.PI / 2; sea.renderOrder = 1; grp.add(sea);
  // the hilltop pond, its waterfall and the splash where it lands
  I.tops.forEach(p => {
    const pond = mesh(geo('pondG', () => new THREE.CircleGeometry(1, 24)), geo('pondM', () => bend(new THREE.MeshLambertMaterial({ color: 0x7fdcec, transparent: true, opacity: 0.85 }))), p.x, TIER - 0.35, I.cz + p.z);
    pond.rotation.x = -Math.PI / 2; pond.scale.setScalar(p.r + 0.4); grp.add(pond);
    const ez = I.cz + plateauZ(I, p.x), fall = mesh(geo('fallG', () => new THREE.PlaneGeometry(3.6, TIER + 0.6)), waterfallMat(), p.x, (TIER - 0.35 + SEA) / 2 + 0.1, ez + 0.15);
    grp.add(fall); const top = mesh(geo('fallTop', () => new THREE.PlaneGeometry(3.6, 3.2)), waterfallMat(), p.x, TIER - 0.32, ez - 1.4); top.rotation.x = -Math.PI / 2; grp.add(top);
    for (let k = 0; k < 6; k++) { const s = mesh(ball(0.45), mat(0xffffff), p.x - 1.5 + k * 0.6, SEA + 0.15, ez + 0.9 + (k % 2) * 0.5); s.scale.y = 0.5; grp.add(s); }
  });
  I.bridges.forEach(b => grp.add(makeBridge(e, b.x0, b.x1, I.cz + (b.z0 + b.z1) / 2)));
  return grp;
}
let WFALL = null;
function waterfallMat() { // white and pale-blue streaks that slide down; one texture shared by every waterfall
  if (!WFALL) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = '#9fe4f2'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 26; i++) { x.fillStyle = i % 3 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.35)'; x.fillRect((i * 37) % 64, (i * 53) % 128, 3 + (i % 3) * 2, 26 + (i % 4) * 10); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    WFALL = bend(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
  }
  return WFALL;
}
function makeBridge(e, x0, x1, z) { // planks or stone or iron across the river, with rails
  const g = new THREE.Group(), L = x1 - x0, cx = (x0 + x1) / 2; g.position.set(cx, 0, z);
  const deck = [0x9a6a45, 0xb58a5e, 0x8a8fb0, 0xffffff][e], rail = [0x7a5230, 0x9a6a45, 0x4a4060, 0xc3b1e1][e];
  for (let i = 0; i < Math.round(L / 0.7); i++) g.add(mesh(rbox(0.62, 0.16, 3.0, 0.05), mat(i % 2 ? deck : new THREE.Color(deck).multiplyScalar(0.9).getHex()), -L / 2 + 0.35 + i * 0.7, 0, 0));
  [-1, 1].forEach(k => { g.add(mesh(rbox(L, 0.14, 0.14, 0.05), mat(rail), 0, 0.75, k * 1.45)); for (let x = -L / 2 + 0.3; x < L / 2; x += 1.6) g.add(mesh(cyl(0.08, 0.08, 0.8, 6), mat(rail), x, 0.38, k * 1.45)); });
  return g;
}

// ---- Finding a way round cliffs and rivers (for the bot friends) -----------------------------------
const NAV = {};
function navReset() { Object.keys(NAV).forEach(k => delete NAV[k]); }
function navGrid(e) {
  if (NAV[e]) return NAV[e];
  const I = ISLANDS[e], x0 = -50, z0 = I.cz + I.north - 2, nx = 101, nz = Math.round(I.beachS - I.north + 4), h = new Float32Array(nx * nz), ok = new Uint8Array(nx * nz);
  const cols = COL.filter(c => !c.portal && zoneOf(c.z) === e);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i, z = z0 + j, w = walkH(x, z), k = j * nx + i; h[k] = w === null ? -9 : w;
    ok[k] = w !== null && !cols.some(c => Math.abs(c.z - z) < c.r + 0.6 && Math.hypot(x - c.x, z - c.z) < c.r + 0.5) ? 1 : 0;
  }
  return (NAV[e] = { x0, z0, nx, nz, h, ok });
}
function navCell(G, x, z) { // the nearest open cell to a point
  const ci = Math.round(x - G.x0), cj = Math.round(z - G.z0);
  for (let r = 0; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj;
    if (i >= 0 && j >= 0 && i < G.nx && j < G.nz && G.ok[j * G.nx + i]) return j * G.nx + i;
  }
  return -1;
}
/** A list of points from (x0,z0) to the goal that keeps off cliffs and water, or null. Same island only. */
function findPath(x0, z0, goal) {
  const G = navGrid(zoneOf(z0)), s = navCell(G, x0, z0), t = navCell(G, goal.x, goal.z); if (s < 0 || t < 0) return null;
  const prev = new Int32Array(G.nx * G.nz).fill(-1), q = new Int32Array(G.nx * G.nz); let qh = 0, qt = 0; q[qt++] = s; prev[s] = s;
  while (qh < qt) {
    const k = q[qh++]; if (k === t) break; const i = k % G.nx, j = (k - i) / G.nx;
    for (let d = 0; d < 8; d++) {
      const di = [1, -1, 0, 0, 1, 1, -1, -1][d], dj = [0, 0, 1, -1, 1, -1, 1, -1][d], ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= G.nx || jj >= G.nz) continue;
      const n = jj * G.nx + ii; if (prev[n] >= 0 || !G.ok[n] || Math.abs(G.h[n] - G.h[k]) > 0.9) continue;
      if (d > 3 && (!G.ok[j * G.nx + ii] || !G.ok[jj * G.nx + i])) continue; // no cutting corners
      prev[n] = k; q[qt++] = n;
    }
  }
  if (prev[t] < 0) return null;
  const cells = []; for (let k = t; k !== s; k = prev[k]) cells.push({ x: G.x0 + k % G.nx, z: G.z0 + Math.floor(k / G.nx) }); cells.reverse();
  const out = []; let from = { x: x0, z: z0 };
  for (let i = 0; i < cells.length;) { let far = i; for (let j = cells.length - 1; j > i; j--) if (clearLine(G, from, cells[j])) { far = j; break; } from = cells[far]; out.push(from); i = far + 1; }
  out.push(goal); return out;
}
function clearLine(G, a, b) { // a straight walk with no cliff, water or obstacle in the way
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5); let ph = null;
  for (let k = 1; k <= n; k++) {
    const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n, i = Math.round(x - G.x0), j = Math.round(z - G.z0), c = j * G.nx + i;
    if (!G.ok[c]) return false; const w = walkH(x, z); if (w === null || (ph !== null && Math.abs(w - ph) > 0.6)) return false; ph = w;
  }
  return true;
}
