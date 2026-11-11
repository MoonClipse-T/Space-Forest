// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: everything drawn. A small round planet under a violet sky, a research village,
// big-headed kids and six shopkeepers, each with its own outline. No outlines, soft shadows.
'use strict';

// ---- The rolling ground: far things sink below the horizon ------------------------------
const BEND = { uCamZ: { value: 0 }, uCurve: { value: 0.011 } };
function bend(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uCamZ = BEND.uCamZ; sh.uniforms.uCurve = BEND.uCurve;
    sh.vertexShader = 'uniform float uCamZ;\nuniform float uCurve;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wpos = modelMatrix * mvPosition;
      float bdz = min( wpos.z - uCamZ, 0.0 );
      wpos.y -= bdz * bdz * uCurve;
      mvPosition = viewMatrix * wpos;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  return m;
}
const MATS = {};
function mat(color, o) { // soft matte colour, cached
  const key = color + (o ? JSON.stringify(o) : '');
  if (!MATS[key]) MATS[key] = bend(new THREE.MeshLambertMaterial(Object.assign({ color }, o || {})));
  return MATS[key];
}
function glow(color, o) { return bend(new THREE.MeshBasicMaterial(Object.assign({ color }, o || {}))); }
const GEO = {};
function geo(key, make) { return GEO[key] || (GEO[key] = make()); }
function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.frustumCulled = false; return o;
}
const ball = (r) => geo('ball' + r, () => new THREE.SphereGeometry(r, 20, 14));
const cap = (r, l) => geo('cap' + r + '_' + l, () => new THREE.CapsuleGeometry(r, l, 6, 14));
const cyl = (a, b, h, n = 20) => geo(`cyl${a}_${b}_${h}_${n}`, () => new THREE.CylinderGeometry(a, b, h, n));
function rbox(w, h, d, r = 0.2) { // a box with every edge rounded
  return geo(`rb${w}_${h}_${d}_${r}`, () => {
    const b = r * 0.5, x = w / 2 - b, y = h / 2 - b, s = new THREE.Shape();
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y);
    s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
    g.center(); return g;
  });
}
function starGeo(r, depth) { // a soft five-point star
  return geo('star' + r + '_' + depth, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + Math.PI / 2, q = i % 2 ? r * 0.5 : r;
      i ? s.lineTo(Math.cos(a) * q, Math.sin(a) * q) : s.moveTo(Math.cos(a) * q, Math.sin(a) * q);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: r * 0.12, bevelSize: r * 0.12, bevelSegments: 2 });
    g.center(); return g;
  });
}
function label(textStr, w, h, bg, fg) { // a painted sign
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = c.height * 0.6; x.font = `bold ${size}px sans-serif`;
  while (x.measureText(textStr).width > c.width * 0.92) { size -= 2; x.font = `bold ${size}px sans-serif`; }
  x.fillText(textStr, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return mesh(new THREE.PlaneGeometry(w, h), glow(0xffffff, { map: t }));
}
function shadow(r) {
  const s = mesh(geo('shadow', () => new THREE.CircleGeometry(1, 24)), geo('shadowMat', () => bend(new THREE.MeshBasicMaterial({ color: 0x2b2350, transparent: true, opacity: 0.2, depthWrite: false }))), 0, 0.03, 0);
  s.rotation.x = -Math.PI / 2; s.scale.setScalar(r); return s;
}

const gHardhat = () => geo('hardhat', () => new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2));
const gDish = () => geo('dish', () => new THREE.SphereGeometry(0.7, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42));
const gRing = () => geo('mriring', () => new THREE.TorusGeometry(0.62, 0.2, 12, 28));
const gSmile = () => geo('smile', () => new THREE.TorusGeometry(0.055, 0.016, 6, 12, Math.PI));
function put(g, m, f) { f(m); g.add(m); return m; } // add a mesh after turning or sizing it
const SKIN = 0xffe1c8, CREAM = 0xfff5e1, WOOD = 0xc9a27e, INK = 0x3a2f55, BLUSH = 0xff9fb0, SUIT = 0xf6f7ff, GLASS = 0xbfe9ff;

// ---- Faces: dot eyes, blush, a small smile -----------------------------------------------
function face(g, y, z, s = 1, gap = 0.19) {
  [-1, 1].forEach(k => {
    const e = mesh(ball(0.065), mat(INK), k * gap * s, y, z); e.scale.set(s, s * 1.35, 0.5); g.add(e);
    const h = mesh(ball(0.022), glow(0xffffff), k * gap * s + 0.02 * s, y + 0.035 * s, z + 0.03); g.add(h);
    const b = mesh(geo('blush', () => new THREE.CircleGeometry(0.085, 14)), mat(BLUSH), k * (gap + 0.15) * s, y - 0.13 * s, z - 0.045);
    b.rotation.y = k * 0.5; b.scale.setScalar(s); g.add(b);
  });
  const m = mesh(gSmile(), mat(INK), 0, y - 0.13 * s, z + 0.02);
  m.rotation.z = Math.PI; m.scale.setScalar(s); g.add(m);
}

// ---- A kid: big head, pear body, stubby limbs ---------------------------------------------
const HAIR = [0x5a4636, 0x2f2a3d, 0xb5651d, 0xf2c14e, 0x8d6e63, 0x4e6fae, 0xd77a9b];
function makeKid(o) { // o: shirt, hair (0-4), hairColor
  const root = new THREE.Group(), body = new THREE.Group(); root.add(shadow(0.55)); root.add(body);
  const shirt = new THREE.MeshLambertMaterial({ color: o.shirt }); bend(shirt);
  const pants = new THREE.MeshLambertMaterial({ color: 0x5b6aa8 }); bend(pants);
  const hairM = mat(o.hairColor);
  const legs = [-1, 1].map(k => {
    const p = new THREE.Group(); p.position.set(k * 0.16, 0.34, 0);
    p.add(mesh(cap(0.125, 0.14), pants, 0, -0.14, 0));
    const f = mesh(ball(0.15), mat(0xffffff), 0, -0.28, 0.06); f.scale.set(1, 0.6, 1.45); p.add(f);
    body.add(p); return p;
  });
  const torso = mesh(geo('torso', () => new THREE.LatheGeometry([[0, 0], [0.3, 0.02], [0.39, 0.2], [0.34, 0.44], [0.2, 0.62], [0, 0.66]].map(p => new THREE.Vector2(p[0], p[1])), 20)), shirt, 0, 0.3, 0);
  body.add(torso);
  const arms = [-1, 1].map(k => {
    const p = new THREE.Group(); p.position.set(k * 0.3, 0.84, 0); p.rotation.z = k * 0.55;
    p.add(mesh(cap(0.095, 0.2), shirt, 0, -0.17, 0)); p.add(mesh(ball(0.105), mat(SKIN), 0, -0.36, 0));
    body.add(p); return p;
  });
  const head = new THREE.Group(); head.position.y = 1.42; body.add(head);
  const skull = mesh(ball(0.52), mat(SKIN)); skull.scale.set(1.1, 0.95, 1); head.add(skull);
  [-1, 1].forEach(k => head.add(mesh(ball(0.1), mat(SKIN), k * 0.56, -0.05, 0)));
  face(head, 0, 0.49);
  const capG = geo('haircap', () => new THREE.SphereGeometry(0.56, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52));
  const hc = mesh(capG, o.hair === 4 ? shirt : hairM, 0, 0.02, -0.03); hc.scale.set(1.1, 1, 1.04); hc.rotation.x = -0.28; head.add(hc);
  if (o.hair === 0) { const fr = mesh(ball(0.2), hairM, 0.22, 0.36, 0.36); fr.scale.set(1.6, 0.6, 0.8); head.add(fr); }
  if (o.hair === 1) [-0.2, 0, 0.2].forEach((x, i) => { const s = mesh(geo('spike', () => new THREE.ConeGeometry(0.13, 0.42, 10)), hairM, x, 0.62 + (i === 1 ? 0.08 : 0), 0); s.rotation.z = -x * 1.6; head.add(s); });
  if (o.hair === 2) [-1, 1].forEach(k => head.add(mesh(ball(0.23), hairM, k * 0.42, 0.5, -0.05)));
  if (o.hair === 3) { head.add(mesh(ball(0.26), hairM, 0, 0.1, -0.62)); head.add(mesh(ball(0.17), hairM, 0, -0.22, -0.72)); }
  if (o.hair === 4) { head.add(mesh(ball(0.15), mat(0xffffff), 0, 0.62, -0.1)); const br = mesh(geo('brim', () => new THREE.TorusGeometry(0.56, 0.07, 8, 24)), mat(0xffffff), 0, 0.17, 0); br.rotation.x = Math.PI / 2 - 0.28; br.scale.set(1.1, 1.04, 1); head.add(br); }
  // The space suit, shown as its parts are fitted
  const helmet = new THREE.Group(); helmet.visible = false; head.add(helmet);
  helmet.add(mesh(ball(0.74), geo('glassM', () => bend(new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.3, depthWrite: false }))), 0, 0.03, 0));
  const ring = mesh(geo('collar', () => new THREE.TorusGeometry(0.42, 0.09, 8, 24)), mat(SUIT), 0, -0.5, 0); ring.rotation.x = Math.PI / 2; helmet.add(ring);
  const pack = mesh(rbox(0.5, 0.56, 0.26, 0.12), mat(0xdfe3f5), 0, 0.72, -0.36); pack.visible = false; body.add(pack);
  const lamp = mesh(ball(0.06), glow(o.shirt), 0.13, 0.9, -0.5); lamp.visible = false; body.add(lamp);
  const belt = mesh(geo('belt', () => new THREE.TorusGeometry(0.37, 0.05, 8, 24)), mat(o.shirt), 0, 0.5, 0); belt.rotation.x = Math.PI / 2; belt.visible = false; body.add(belt);
  const hold = new THREE.Group(); hold.position.y = 2.25; body.add(hold);
  // What each era wears, in the kid's own colour: fur and a feather, a white jeogori and a straw hat, a coat and a cap with goggles
  const accent = mat(o.shirt), wear = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  const band = mesh(geo('band', () => new THREE.TorusGeometry(0.55, 0.07, 8, 24)), accent, 0, 0.2, 0); band.rotation.x = Math.PI / 2 - 0.2; wear[0].add(band);
  const fe = mesh(geo('feather', () => new THREE.ConeGeometry(0.09, 0.6, 8)), mat(0xffd166), 0.28, 0.66, -0.3); fe.rotation.z = -0.4; wear[0].add(fe);
  const spots = new THREE.Group(); [[0.2, 0.62, 0.3], [-0.18, 0.5, 0.33], [0.05, 0.38, 0.38], [-0.25, 0.75, -0.25], [0.22, 0.45, -0.32]].forEach(([x, y, z]) => { const sp = mesh(ball(0.07), mat(0x8a5a36), x, y, z); sp.scale.set(1.2, 0.8, 0.4); spots.add(sp); });
  body.add(spots);
  const brim = mesh(cyl(0.92, 0.92, 0.05, 28), mat(0xe8c66a), 0, 0.46, 0); brim.rotation.x = -0.15; wear[1].add(brim); wear[1].add(mesh(geo('strawtop', () => new THREE.ConeGeometry(0.48, 0.42, 20)), mat(0xe8c66a), 0, 0.68, -0.05));
  const sash = mesh(geo('sash', () => new THREE.TorusGeometry(0.36, 0.06, 8, 24)), accent, 0, 0.55, 0); sash.rotation.x = Math.PI / 2; body.add(sash);
  const capT = mesh(ball(0.6), mat(0x8a6a50), 0, 0.33, -0.02); capT.scale.set(1.05, 0.45, 1.05); wear[2].add(capT);
  const peak = mesh(cyl(0.35, 0.35, 0.05, 16), mat(0x6b4f3a), 0, 0.26, 0.5); peak.scale.z = 0.6; wear[2].add(peak);
  [-1, 1].forEach(k => wear[2].add(mesh(geo('goggle', () => new THREE.TorusGeometry(0.13, 0.04, 8, 16)), mat(BRASS), k * 0.2, 0.52, 0.42)));
  const collar = mesh(geo('collar2', () => new THREE.TorusGeometry(0.22, 0.06, 8, 18)), mat(0xffffff), 0, 0.92, 0); collar.rotation.x = Math.PI / 2; body.add(collar);
  wear.forEach(w => { w.visible = false; head.add(w); });
  root.userData = { body, legs, arms, head, hold, shirt, pants, helmet, pack, lamp, belt, shirtColor: o.shirt, phase: 0, wear, spots, sash, collar };
  return root;
}
function dressKid(kid, parts, era = 3) { // the clothes of the era the kid is in, and in the space age the suit parts they have
  const u = kid.userData, sp = era === 3;
  u.wear.forEach((w, i) => { w.visible = i === era; }); u.spots.visible = era === 0; u.sash.visible = era === 1; u.collar.visible = era === 2;
  u.helmet.visible = sp && !!parts.helmet; u.pack.visible = u.lamp.visible = sp && !!parts.outer; u.belt.visible = sp && !!parts.suit;
  u.shirt.color.set(sp ? (parts.suit ? SUIT : u.shirtColor) : [0xd9a066, 0xf6f1e4, u.shirtColor][era]);
  u.pants.color.set(sp ? (parts.suit ? SUIT : 0x5b6aa8) : [0xb98a5e, 0xe6dcc6, 0x6b4f3a][era]);
}
function animateKid(kid, moving, dt, t) { // a waddle: short legs, a bob, a sway
  const u = kid.userData;
  u.phase += dt * (moving ? 11 : 0);
  const s = moving ? Math.sin(u.phase) : 0, idle = Math.sin(t * 2 + kid.id) * 0.02;
  u.legs[0].rotation.x = s * 0.8; u.legs[1].rotation.x = -s * 0.8;
  u.arms[0].rotation.x = -s * 0.7; u.arms[1].rotation.x = s * 0.7;
  u.body.position.y = moving ? Math.abs(Math.cos(u.phase)) * 0.09 : idle;
  u.body.rotation.z = s * 0.07; u.head.rotation.z = -s * 0.05;
}

// ---- Shopkeepers and the stamp robot: each its own outline --------------------------------
function makeKeeper(id) {
  const g = new THREE.Group(); g.add(shadow(0.7));
  if (id === 'cloth') { // 보들 씨: a woolly cloud with a scarf
    const wool = mat(0xfffaf3);
    g.add(mesh(ball(0.6), wool, 0, 0.75, 0));
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.add(mesh(ball(0.3), wool, Math.cos(a) * 0.52, 0.75 + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.5)); }
    const h = mesh(ball(0.42), mat(0x6b5b7b), 0, 1.55, 0.08); g.add(h);
    for (let i = 0; i < 5; i++) g.add(mesh(ball(0.2), wool, (i - 2) * 0.2, 1.9 - Math.abs(i - 2) * 0.06, 0));
    [-1, 1].forEach(k => { const e = mesh(ball(0.16), mat(0x6b5b7b), k * 0.5, 1.6, 0); e.scale.set(1.5, 0.6, 0.6); g.add(e); });
    face(g, 1.58, 0.47, 0.9); const sc = mesh(geo('scarf', () => new THREE.TorusGeometry(0.4, 0.1, 8, 20)), mat(0xf4a6b8), 0, 1.22, 0.04); sc.rotation.x = Math.PI / 2; g.add(sc);
    [-1, 1].forEach(k => g.add(mesh(cap(0.09, 0.2), mat(0x6b5b7b), k * 0.25, 0.18, 0)));
  } else if (id === 'poly') { // 단단 씨: a square robot in a hard hat
    g.add(mesh(rbox(1, 0.9, 0.8, 0.2), mat(0x9ad0ec), 0, 0.7, 0)); g.add(mesh(rbox(1.1, 0.8, 0.85, 0.22), mat(0xe9f6ff), 0, 1.55, 0));
    g.add(mesh(rbox(0.86, 0.46, 0.1, 0.12), mat(0x35506b), 0, 1.55, 0.41)); face(g, 1.58, 0.47, 0.8, 0.22);
    const hat = mesh(gHardhat(), mat(0xffd166), 0, 1.9, 0); g.add(hat);
    g.add(mesh(rbox(1.4, 0.1, 1.1, 0.05), mat(0xffd166), 0, 1.93, 0.1));
    [-1, 1].forEach(k => { g.add(mesh(rbox(0.22, 0.6, 0.22, 0.1), mat(0xe9f6ff), k * 0.66, 0.75, 0)); g.add(mesh(rbox(0.3, 0.3, 0.4, 0.1), mat(0x35506b), k * 0.26, 0.14, 0.03)); });
  } else if (id === 'alloy') { // 구불 씨: a tall one-eyed spring
    const p = mat(0xb79cf0);
    for (let i = 0; i < 6; i++) { const t = mesh(geo('coil', () => new THREE.TorusGeometry(0.3, 0.085, 8, 20)), p, Math.sin(i * 1.3) * 0.05, 0.2 + i * 0.2, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    g.add(mesh(ball(0.48), p, 0, 1.75, 0)); g.add(mesh(ball(0.24), glow(0xffffff), 0, 1.8, 0.33));
    const pu = mesh(ball(0.11), mat(INK), 0, 1.8, 0.53); pu.scale.z = 0.5; g.add(pu);
    const sm = mesh(gSmile(), mat(INK), 0, 1.52, 0.42); sm.rotation.z = Math.PI; g.add(sm);
    [-1, 1].forEach(k => { const a = mesh(cyl(0.025, 0.025, 0.5, 6), mat(0x8f7ad0), k * 0.25, 2.35, 0); a.rotation.z = -k * 0.4; g.add(a); g.add(mesh(ball(0.09), mat(0xffd166), k * 0.35, 2.6, 0)); });
  } else if (id === 'diner') { // 냠냠 씨: a round cook under a tall hat
    g.add(mesh(ball(0.72), mat(0xffc98b), 0, 0.8, 0)); const ap = mesh(ball(0.6), mat(0xffffff), 0, 0.72, 0.22); ap.scale.set(0.9, 0.9, 0.6); g.add(ap);
    g.add(mesh(ball(0.45), mat(0xffe1c8), 0, 1.7, 0)); face(g, 1.7, 0.42, 0.95);
    g.add(mesh(cyl(0.34, 0.3, 0.55), mat(0xffffff), 0, 2.25, 0));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(ball(0.26), mat(0xffffff), Math.cos(a) * 0.2, 2.58, Math.sin(a) * 0.2)); }
    [-1, 1].forEach(k => { g.add(mesh(ball(0.16), mat(0xffe1c8), k * 0.78, 0.95, 0.1)); const f = mesh(ball(0.2), mat(0xc77d4f), k * 0.3, 0.1, 0.1); f.scale.set(1, 0.5, 1.4); g.add(f); });
  } else if (id === 'sat') { // 삐삐 씨: a dish for a head, panels for ears
    g.add(mesh(cap(0.34, 0.4), mat(0x9fe0c6), 0, 0.62, 0));
    const dish = mesh(gDish(), mat(0xf2fff9, { side: THREE.DoubleSide }), 0, 1.3, -0.25); dish.rotation.x = -Math.PI / 2 - 0.25; g.add(dish);
    g.add(mesh(ball(0.3), mat(0x9fe0c6), 0, 1.55, 0.1)); face(g, 1.55, 0.37, 0.7, 0.15);
    g.add(mesh(cyl(0.02, 0.02, 0.6, 6), mat(INK), 0, 2.1, 0.1)); g.add(mesh(ball(0.08), glow(0xff6b6b), 0, 2.42, 0.1));
    [-1, 1].forEach(k => { g.add(mesh(rbox(0.7, 0.36, 0.06, 0.04), mat(0x5b7fd6), k * 1.05, 1.0, 0)); put(g, mesh(cyl(0.03, 0.03, 0.4, 6), mat(INK), k * 0.55, 1.0, 0), m => { m.rotation.z = Math.PI / 2; }); g.add(mesh(ball(0.12), mat(0x7cc9a8), k * 0.18, 0.12, 0.05)); });
  } else if (id === 'mri') { // 찰칵 씨: a face inside a big ring
    g.add(mesh(geo('coat', () => new THREE.CylinderGeometry(0.28, 0.5, 0.95, 18)), mat(0xffffff), 0, 0.6, 0));
    const r = mesh(gRing(), mat(0xf7e08a), 0, 1.75, 0); g.add(r);
    g.add(mesh(ball(0.4), mat(0xfff1d6), 0, 1.75, 0)); face(g, 1.76, 0.38, 0.85, 0.16);
    g.add(mesh(ball(0.07), glow(0x7cc6fe), 0, 2.56, 0.05));
    [-1, 1].forEach(k => { const a = mesh(cap(0.08, 0.3), mat(0xffffff), k * 0.48, 0.8, 0); a.rotation.z = k * 0.6; g.add(a); g.add(mesh(ball(0.13), mat(0x8fa3c9), k * 0.2, 0.1, 0.05)); });
  } else { // 도장 로봇: an egg on a wheel, holding a red stamp
    g.add(mesh(ball(0.3), mat(0x66708f), 0, 0.3, 0));
    const b = mesh(ball(0.55), mat(0xfff5e1), 0, 1.0, 0); b.scale.y = 1.25; g.add(b);
    g.add(mesh(rbox(0.7, 0.36, 0.1, 0.14), mat(0x3d4a6b), 0, 1.25, 0.46)); face(g, 1.28, 0.52, 0.75, 0.17);
    g.add(mesh(cyl(0.025, 0.025, 0.5, 6), mat(INK), 0, 1.95, 0)); g.add(mesh(starGeo(0.13, 0.05), glow(0xffd166), 0, 2.28, 0));
    const arm = mesh(cap(0.07, 0.5), mat(0xfff5e1), 0.75, 1.0, 0.15); arm.rotation.z = 1.1; g.add(arm);
    g.add(mesh(cyl(0.16, 0.16, 0.16), mat(0xff6b6b), 1.08, 0.82, 0.15)); g.add(mesh(cyl(0.06, 0.06, 0.3), mat(0xc9a27e), 1.08, 1.03, 0.15));
  }
  return g;
}

// ---- Parts: on the rocket, in the hands, and hidden in the bushes ---------------------------
function partMesh(id, color) {
  const g = new THREE.Group();
  if (id === 'hull') { const h = mesh(cap(0.3, 0.5), mat(CREAM)); g.add(h); g.add(mesh(ball(0.12), mat(GLASS), 0, 0.15, 0.27)); }
  else if (id === 'engine') { g.add(mesh(geo('pm_eng', () => new THREE.ConeGeometry(0.34, 0.5, 14, 1, true)), mat(0xff8a73, { side: THREE.DoubleSide }))); g.add(mesh(cyl(0.16, 0.2, 0.2), mat(0x8a8fb0), 0, 0.3, 0)); }
  else if (id === 'antenna') { g.add(mesh(cyl(0.03, 0.03, 0.8, 6), mat(0xb9c2e6))); g.add(mesh(ball(0.12), mat(0xffd166), 0, 0.45, 0)); const c = mesh(geo('pm_coil', () => new THREE.TorusGeometry(0.16, 0.03, 6, 14)), mat(0xb9c2e6), 0, 0.1, 0); c.rotation.x = Math.PI / 2; g.add(c); }
  else if (id === 'nav') { g.add(mesh(rbox(0.5, 0.36, 0.3, 0.08), mat(0x9fe0c6))); g.add(mesh(rbox(0.3, 0.18, 0.05, 0.03), mat(0x2f4858), 0, 0.02, 0.16)); g.add(mesh(ball(0.05), glow(0xff6b6b), 0.17, 0.24, 0)); }
  else if (id === 'oven') { g.add(mesh(rbox(0.62, 0.42, 0.44, 0.08), mat(0xffffff))); g.add(mesh(rbox(0.34, 0.26, 0.05, 0.04), mat(0x35506b), -0.08, 0, 0.22)); g.add(mesh(ball(0.045), mat(0xffa26b), 0.22, 0.08, 0.23)); g.add(mesh(ball(0.045), mat(0x95e1a3), 0.22, -0.06, 0.23)); }
  else if (id === 'food') { [0, 1, 2].forEach(i => { const p = mesh(rbox(0.46, 0.14, 0.34, 0.06), mat([0xffd166, 0xff8fa3, 0x95e1a3][i]), (i - 1) * 0.03, i * 0.15 - 0.15, 0); p.rotation.y = i * 0.3; g.add(p); }); }
  else if (id === 'scan') { const r = mesh(geo('pm_ring', () => new THREE.TorusGeometry(0.26, 0.09, 10, 20)), mat(0xf7e08a), 0, 0.1, 0); g.add(r); g.add(mesh(rbox(0.6, 0.12, 0.3, 0.05), mat(0xffffff), 0, -0.24, 0)); }
  else { g.add(mesh(rbox(0.5, 0.4, 0.4, 0.08), mat(color || 0xffd166))); g.add(mesh(rbox(0.52, 0.08, 0.42, 0.03), mat(0xffffff))); } // a wrapped parcel: suit pieces and shop items
  return g;
}

function makeRocket(color) { // a fat little rocket; a pale ghost shows what is still missing
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const hullG = geo('hull', () => new THREE.LatheGeometry([[0, 0], [0.55, 0.05], [0.82, 0.6], [0.86, 1.3], [0.7, 2.0], [0.4, 2.5], [0, 2.75]].map(p => new THREE.Vector2(p[0], p[1])), 22));
  const ghost = mesh(hullG, geo('ghostM', () => bend(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }))), 0, 0.75, 0); tilt.add(ghost);
  const p = {};
  p.hull = new THREE.Group(); p.hull.add(mesh(hullG, mat(CREAM), 0, 0.75, 0));
  const band = mesh(cyl(0.88, 0.86, 0.3, 22), mat(color), 0, 1.75, 0); p.hull.add(band);
  p.hull.add(mesh(ball(0.3), mat(0x6f7fb5), 0, 2.3, 0.56)); p.hull.add(mesh(ball(0.24), mat(GLASS), 0, 2.3, 0.63));
  p.engine = new THREE.Group(); p.engine.add(mesh(geo('nozzle', () => new THREE.CylinderGeometry(0.34, 0.6, 0.7, 18, 1, true)), mat(0xff8a73, { side: THREE.DoubleSide }), 0, 0.42, 0));
  [0, 1, 2].forEach(i => { const f = mesh(rbox(0.16, 1.0, 0.62, 0.1), mat(color), 0, 0.72, 0.98); const h = new THREE.Group(); h.rotation.y = i * Math.PI * 2 / 3 + 0.5; h.add(f); p.engine.add(h); });
  p.antenna = new THREE.Group(); p.antenna.add(mesh(cyl(0.035, 0.035, 0.8, 6), mat(0xb9c2e6), 0, 3.85, 0)); p.antenna.add(mesh(ball(0.14), mat(0xffd166), 0, 4.3, 0));
  const co = mesh(geo('pm_coil2', () => new THREE.TorusGeometry(0.2, 0.03, 6, 16)), mat(0xb9c2e6), 0, 3.75, 0); co.rotation.x = Math.PI / 2; p.antenna.add(co);
  p.nav = new THREE.Group(); p.nav.add(mesh(rbox(0.5, 0.4, 0.3, 0.08), mat(0x9fe0c6), 0.92, 1.25, 0.2)); p.nav.add(mesh(ball(0.06), glow(0xff6b6b), 1.08, 1.52, 0.2));
  ['hull', 'engine', 'antenna', 'nav'].forEach(k => { p[k].visible = false; tilt.add(p[k]); });
  [['oven', -1.7, 0.8], ['food', -1.55, 1.7], ['scan', 1.75, 1.2]].forEach(([k, x, z]) => { p[k] = partMesh(k); p[k].position.set(x, 0.35, z); p[k].scale.setScalar(1.25); p[k].visible = false; g.add(p[k]); });
  const scribble = new THREE.Group(); scribble.visible = false; tilt.add(scribble);
  [[0.6, 1.2, 0.62, 0xff5fa2], [-0.5, 1.7, 0.66, 0x54d6ff], [0.1, 2.2, 0.7, 0x8dff6a], [-0.3, 0.95, 0.7, 0xffe14d], [0.55, 2.1, 0.5, 0xff5fa2]].forEach(([x, y, z, c], i) => { const s = mesh(ball(0.16), glow(c), x, y + 0.75 - 0.75, z); s.scale.set(1.6, 0.5 + i * 0.12, 0.3); s.rotation.z = i; scribble.add(s); });
  g.userData = { parts: p, tilt, ghost, scribble };
  return g;
}

// ---- Buildings and props ---------------------------------------------------------------
function makeShop(s) {
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z);
  g.add(mesh(rbox(6.4, 3.2, 4.6, 0.5), mat(CREAM), 0, 1.6, 0));
  const roof = mesh(geo('roof', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mat(s.roof), 0, 3.0, 0); roof.scale.set(3.9, 2.1, 3.0); g.add(roof);
  g.add(mesh(rbox(1.3, 2.0, 0.2, 0.5), mat(WOOD), 0, 1.0, 2.3)); g.add(mesh(ball(0.07), mat(0xffd166), 0.4, 1.0, 2.44));
  [-1, 1].forEach(k => { put(g, mesh(cyl(0.62, 0.62, 0.16, 24), mat(0xffffff), k * 2.0, 1.9, 2.3), m => { m.rotation.x = Math.PI / 2; }); put(g, mesh(cyl(0.5, 0.5, 0.18, 24), mat(GLASS), k * 2.0, 1.9, 2.32), m => { m.rotation.x = Math.PI / 2; }); });
  const sign = label(s.name, 4.4, 0.8, '#fffaf0', '#5a4a7a'); sign.position.set(0, 3.55, 2.62); sign.rotation.x = -0.12; g.add(sign);
  g.add(mesh(rbox(4.7, 1.0, 0.2, 0.2), mat(s.roof), 0, 3.55, 2.5));
  const t = new THREE.Group(); t.position.set(0, 5.2, 0.4); g.add(t); // the shop's emblem on the roof
  if (s.id === 'cloth') { t.add(mesh(cyl(0.5, 0.5, 0.9, 18), mat(0xffffff))); [-1, 1].forEach(k => t.add(mesh(cyl(0.72, 0.72, 0.12, 18), mat(WOOD), 0, k * 0.5, 0))); t.rotation.z = 0.4; }
  if (s.id === 'poly') { put(t, mesh(gHardhat(), mat(0xffd166), 0, -0.3, 0), m => m.scale.setScalar(1.5)); t.add(mesh(rbox(2.2, 0.14, 1.7, 0.06), mat(0xffd166), 0, -0.26, 0.2)); }
  if (s.id === 'alloy') { [-1, 1].forEach(k => { const r = mesh(geo('glasses', () => new THREE.TorusGeometry(0.5, 0.09, 8, 20)), mat(0x8f7ad0), k * 0.62, 0, 0); t.add(r); }); put(t, mesh(cyl(0.05, 0.05, 0.3, 6), mat(0x8f7ad0)), m => { m.rotation.z = Math.PI / 2; }); }
  if (s.id === 'diner') { const o = partMesh('oven'); o.scale.setScalar(2.4); t.add(o); }
  if (s.id === 'sat') { const d = mesh(gDish(), mat(0xf2fff9, { side: THREE.DoubleSide })); d.scale.setScalar(1.5); d.rotation.x = -2.4; t.add(d); t.add(mesh(cyl(0.05, 0.05, 1.2, 6), mat(INK), 0, -0.7, 0)); }
  if (s.id === 'mri') { put(t, mesh(gRing(), mat(0xf7e08a)), m => m.scale.setScalar(1.3)); t.add(mesh(rbox(1.9, 0.2, 0.7, 0.08), mat(0xffffff), 0, -0.2, 0.5)); }
  return g;
}
function makeHQ() { // the stamp office: a round hall under a glass dome
  const g = new THREE.Group(); g.position.set(PLACES.hq.x, 0, PLACES.hq.z);
  g.add(mesh(cyl(4.2, 4.4, 3.2, 28), mat(CREAM), 0, 1.6, 0)); g.add(mesh(cyl(4.5, 4.5, 0.4, 28), mat(0xff9e8a), 0, 3.3, 0));
  const dome = mesh(geo('roof'), geo('domeM', () => bend(new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.45, depthWrite: false }))), 0, 3.5, 0); dome.scale.set(3.6, 3.0, 3.6); g.add(dome);
  const tr = mesh(ball(1.1), mat(0xffb7d5), 0, 4.6, 0); g.add(tr); g.add(mesh(cyl(0.2, 0.25, 1.2, 8), mat(WOOD), 0, 3.9, 0));
  g.add(mesh(rbox(1.6, 2.2, 0.3, 0.6), mat(WOOD), 0, 1.1, 4.25));
  const sign = label('탐사 본부', 3.2, 0.8, '#fffaf0', '#5a4a7a'); sign.position.set(0, 2.85, 4.42); g.add(sign);
  return g;
}
function makeDesk() {
  const g = new THREE.Group(); g.position.set(PLACES.desk.x, 0, PLACES.desk.z);
  g.add(mesh(rbox(2.6, 0.22, 1.3, 0.1), mat(WOOD), 0, 0.95, 0)); [-1, 1].forEach(k => g.add(mesh(cyl(0.1, 0.1, 0.9, 8), mat(0xa9825f), k * 1.0, 0.45, 0)));
  const paper = mesh(rbox(0.8, 0.03, 0.6, 0.02), mat(0xffffff), -0.3, 1.08, 0.05); paper.rotation.y = 0.2; g.add(paper);
  const pen = mesh(cyl(0.03, 0.03, 0.5, 6), mat(0xff6b6b), 0.45, 1.1, 0.1); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.6; g.add(pen);
  g.add(shadow(1.4));
  return g;
}
function makeGacha() { // the mission machine: a glass ball of capsules
  const g = new THREE.Group(); g.position.set(PLACES.gacha.x, 0, PLACES.gacha.z);
  g.add(mesh(rbox(1.5, 1.4, 1.3, 0.3), mat(0xff9e8a), 0, 0.7, 0));
  g.add(mesh(ball(0.95), geo('glassM2', () => bend(new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.4, depthWrite: false }))), 0, 2.1, 0));
  [0xffd166, 0xff8fa3, 0x95e1a3, 0x7cc6fe, 0xc9a0ff, 0xffa26b].forEach((c, i) => g.add(mesh(ball(0.26), mat(c), Math.cos(i * 1.1) * 0.42, 1.65 + (i % 3) * 0.3, Math.sin(i * 1.7) * 0.4)));
  g.add(mesh(cyl(1.0, 1.0, 0.16, 24), mat(0xffffff), 0, 1.42, 0));
  const knob = mesh(cyl(0.24, 0.24, 0.12, 16), mat(0xffffff), 0, 0.85, 0.68); knob.rotation.x = Math.PI / 2; g.add(knob);
  g.add(mesh(rbox(0.5, 0.3, 0.1, 0.08), mat(0x5a4a7a), 0, 0.32, 0.66)); g.add(shadow(1.2));
  return g;
}
function makeLaunch() {
  const g = new THREE.Group(); g.position.set(PLACES.launch.x, 0, PLACES.launch.z);
  g.add(mesh(cyl(5.2, 5.5, 0.4, 36), mat(0xc9c5e8), 0, 0.2, 0));
  const r = mesh(geo('lring', () => new THREE.TorusGeometry(4.2, 0.18, 8, 40)), mat(0xffd166), 0, 0.42, 0); r.rotation.x = Math.PI / 2; g.add(r);
  const t = new THREE.Group(); t.position.set(-3.6, 0, -1.2); g.add(t);
  [-1, 1].forEach(k => t.add(mesh(cyl(0.12, 0.12, 7, 8), mat(0xff9e8a), k * 0.6, 3.6, 0)));
  for (let i = 0; i < 6; i++) t.add(mesh(rbox(1.4, 0.14, 0.14, 0.05), mat(0xffffff), 0, 0.9 + i * 1.1, 0));
  t.add(mesh(ball(0.2), glow(0xff6b6b), 0, 7.3, 0));
  const sign = label('발사대', 2.6, 0.8, '#5a4a7a', '#fffaf0'); sign.position.set(3.8, 1.3, 3.4); g.add(sign); g.add(mesh(cyl(0.07, 0.07, 1, 6), mat(WOOD), 3.8, 0.5, 3.38));
  return g;
}
function makePad(spot, color, name, k = 1) {
  const g = new THREE.Group(); g.position.set(spot.x, 0, spot.z); g.scale.setScalar(k);
  const c = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55);
  g.add(mesh(cyl(2.7, 2.8, 0.14, 30), mat(c.getHex()), 0, 0.07, 0));
  const rim = mesh(geo('prim', () => new THREE.TorusGeometry(2.7, 0.1, 8, 36)), mat(color), 0, 0.14, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
  const sign = label(name, 1.8, 0.5, '#fffaf0', '#5a4a7a'); sign.position.set(-1.9, 1.0, 2.3); g.add(sign);
  g.add(mesh(cyl(0.05, 0.05, 0.8, 6), mat(WOOD), -1.9, 0.4, 2.28));
  return g;
}
function makeChest(x, z) { // a treasure chest: a place to hide things
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(mesh(rbox(1.4, 0.72, 0.95, 0.12), mat(0xb9825a), 0, 0.38, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.74, -0.46); g.add(lid);
  lid.add(mesh(rbox(1.48, 0.34, 1.02, 0.16), mat(0xd9a06c), 0, 0.15, 0.46));
  [-0.45, 0.45].forEach(x2 => { g.add(mesh(rbox(0.16, 0.76, 0.99, 0.05), mat(0xffd166), x2, 0.38, 0)); lid.add(mesh(rbox(0.16, 0.38, 1.06, 0.05), mat(0xffd166), x2, 0.15, 0.46)); });
  g.add(mesh(starGeo(0.15, 0.05), glow(0xfff3a0), 0, 0.58, 0.5));
  const spark = mesh(starGeo(0.2, 0.06), glow(0xfff3a0), 0, 1.7, 0); spark.visible = false; g.add(spark);
  g.add(shadow(1.0)); g.userData = { lid, spark };
  return g;
}
function makeTree(x, z, k) {
  const g = new THREE.Group(); g.position.set(x, 0, z); const c = [0xffb7d5, 0xcdb4ff, 0x8fdcb8, 0xa5d8ff][k % 4];
  g.add(mesh(cyl(0.22, 0.32, 1.6, 8), mat(0xa98b9e), 0, 0.8, 0));
  g.add(mesh(ball(1.25), mat(c), 0, 2.4, 0)); g.add(mesh(ball(0.85), mat(c), 0.8, 1.95, 0.2)); g.add(mesh(ball(0.8), mat(c), -0.75, 2.05, -0.1)); g.add(mesh(ball(0.7), mat(c), 0.1, 3.3, 0));
  if (k % 2 === 0) g.add(mesh(starGeo(0.28, 0.08), glow(0xffe680), 0.5, 2.9, 1.05));
  g.add(shadow(1.4)); return g;
}
function makeBush(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(mesh(ball(0.8), mat(0x6fcfa5), 0, 0.55, 0)); g.add(mesh(ball(0.6), mat(0x7fdab0), 0.7, 0.42, 0.1)); g.add(mesh(ball(0.55), mat(0x7fdab0), -0.65, 0.4, 0.15));
  g.add(mesh(ball(0.09), mat(0xff8fa3), 0.2, 1.0, 0.6)); g.add(mesh(ball(0.09), mat(0xffe680), -0.3, 0.8, 0.7));
  return g;
}

// ---- The three early eras: villagers, workshops, the things each kid makes ------------------
const STONE = 0xbdb3a0, DARK = 0x4a3d55, BRASS = 0xe0b450, BRICK = 0xd98a6c;
function makeVillager(era, k) { // a grown-up in the era's clothes
  const g = makeKid({ shirt: [0xff8a73, 0x7cc6fe, 0x95e1a3, 0xc9a0ff][k % 4], hair: k % 4, hairColor: HAIR[(k * 2 + era) % HAIR.length] });
  dressKid(g, {}, era); g.scale.setScalar(1.18); return g;
}
function eraPart(id) { // the thing a kid makes in each early era, standing on their work spot
  const g = new THREE.Group(); g.userData.live = null;
  if (id === 'st_fire') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; g.add(mesh(ball(0.2), mat(0x9d9384), Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62)); }
    [0, 1, 2].forEach(i => { const l = mesh(cap(0.09, 0.8), mat(0x9a6a45), 0, 0.22, 0); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; g.add(l); });
    const live = new THREE.Group(); g.add(live); g.userData.live = live;
    live.add(mesh(geo('flame1', () => new THREE.ConeGeometry(0.34, 0.95, 12)), glow(0xff9a3c), 0, 0.72, 0)); live.add(mesh(geo('flame2', () => new THREE.ConeGeometry(0.18, 0.6, 10)), glow(0xffe680), 0, 0.62, 0.05));
  } else if (id === 'st_axe') {
    g.add(mesh(cyl(0.42, 0.48, 0.55, 14), mat(0xb98a5e), 0, 0.27, 0)); g.add(mesh(cyl(0.38, 0.38, 0.04, 14), mat(0xe9d2a8), 0, 0.56, 0));
    const ax = new THREE.Group(); ax.position.set(0, 0.95, 0); ax.rotation.z = 0.35; g.add(ax);
    ax.add(mesh(cyl(0.05, 0.06, 1.0, 8), mat(0x9a6a45))); const hd = mesh(rbox(0.5, 0.32, 0.14, 0.06), mat(0x8f93a8), 0.18, 0.4, 0); hd.rotation.z = -0.3; ax.add(hd);
  } else if (id === 'st_wall') {
    const s = mesh(rbox(1.6, 2.1, 0.35, 0.16), mat(0xc9b9a0), 0, 1.05, 0); g.add(s);
    const moon = mesh(geo('crescent', () => { // a proper crescent: a full disc with a slightly smaller disc bitten out of one side
      const R = 0.32, r = R * 0.9, k = R * 0.47, x = (R * R - r * r + k * k) / (2 * k), y = Math.sqrt(R * R - x * x), t = Math.atan2(y, x), p = Math.atan2(y, x - k), sh = new THREE.Shape();
      sh.absarc(0, 0, R, t, Math.PI * 2 - t, false); sh.absarc(k, 0, r, Math.PI * 2 - p, p, true);
      return new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false, curveSegments: 16 });
    }), glow(0xfff1d6), -0.35, 1.5, 0.18); g.add(moon);
    [[0.3, 1.7], [0.5, 1.2], [0.1, 1.0], [-0.4, 0.8], [0.45, 0.6]].forEach(([x, y]) => g.add(mesh(starGeo(0.1, 0.02), glow(0xffd166), x, y, 0.19)));
    [-0.5, 0.5].forEach(x => { const hand = mesh(ball(0.1), mat(0xff8a73), x, 0.35, 0.18); hand.scale.set(1, 1.2, 0.3); g.add(hand); });
  } else if (id === 'ir_tool') {
    g.add(mesh(rbox(0.9, 0.5, 0.5, 0.1), mat(0x4d4a5e), 0, 0.25, 0)); g.add(mesh(rbox(1.1, 0.2, 0.5, 0.08), mat(0x5d5a70), 0, 0.58, 0));
    const live = new THREE.Group(); g.add(live); g.userData.live = live; live.add(mesh(rbox(0.6, 0.08, 0.14, 0.03), glow(0xff8a3c), 0, 0.72, 0));
    const sk = mesh(geo('sickle', () => new THREE.TorusGeometry(0.35, 0.05, 6, 16, Math.PI)), mat(0xb9c2e6), -0.2, 1.05, 0); sk.rotation.z = 0.6; g.add(sk); g.add(mesh(cyl(0.05, 0.05, 0.5, 6), mat(0x9a6a45), 0.15, 0.85, 0));
  } else if (id === 'ir_cal') {
    const d = mesh(cyl(0.85, 0.85, 0.22, 28), mat(0xcfc6b3), 0, 1.0, 0); d.rotation.x = Math.PI / 2; g.add(d);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; g.add(mesh(ball(0.07), mat(DARK), Math.cos(a) * 0.68, 1.0 + Math.sin(a) * 0.68, 0.12)); }
    g.add(mesh(ball(0.2), glow(0xfff1d6), 0, 1.0, 0.13)); g.add(mesh(rbox(0.5, 0.2, 0.4, 0.06), mat(0xb3a993), 0, 0.1, 0));
  } else if (id === 'ir_tower') {
    const t = mesh(geo('cheom', () => new THREE.LatheGeometry([[0, 0], [0.7, 0], [0.66, 0.45], [0.52, 1.1], [0.4, 1.6], [0.38, 1.85], [0, 1.85]].map(p => new THREE.Vector2(p[0], p[1])), 22)), mat(0xd8cdb6), 0, 0, 0); g.add(t);
    g.add(mesh(rbox(0.9, 0.16, 0.9, 0.04), mat(0xc4b89e), 0, 1.92, 0)); g.add(mesh(rbox(0.26, 0.26, 0.1, 0.04), mat(DARK), 0, 0.95, 0.56));
    [0.35, 0.7, 1.3].forEach(y => { const r = mesh(geo('cring' + y, () => new THREE.TorusGeometry(0.66 - y * 0.17, 0.025, 4, 22)), mat(0xb3a993), 0, y, 0); r.rotation.x = Math.PI / 2; g.add(r); });
  } else if (id === 'in_scope') {
    [0, 1, 2].forEach(i => { const l = mesh(cyl(0.035, 0.035, 1.3, 6), mat(0x9a6a45), Math.cos(i * 2.1) * 0.3, 0.6, Math.sin(i * 2.1) * 0.3); l.rotation.z = Math.cos(i * 2.1) * 0.25; l.rotation.x = -Math.sin(i * 2.1) * 0.25; g.add(l); });
    const tube = new THREE.Group(); tube.position.set(0, 1.25, 0); tube.rotation.x = -0.6; g.add(tube);
    tube.add(mesh(cyl(0.13, 0.17, 1.4, 16), mat(BRASS), 0, 0.2, 0)); tube.add(mesh(cyl(0.18, 0.18, 0.08, 16), mat(0x9a6a45), 0, 0.85, 0)); tube.add(mesh(cyl(0.12, 0.12, 0.02, 16), mat(GLASS), 0, 0.9, 0));
  } else if (id === 'in_steam') { // a little steam locomotive
    [-0.75, 0.75].forEach(k => g.add(mesh(rbox(0.12, 0.08, 2.4, 0.03), mat(0x8a8fb0), k * 0.35, 0.04, 0)));
    const boiler = mesh(cyl(0.38, 0.38, 1.3, 16), mat(0x3d3550), 0, 0.72, 0.35); boiler.rotation.x = Math.PI / 2; g.add(boiler);
    put(g, mesh(cyl(0.4, 0.4, 0.06, 16), mat(BRASS), 0, 0.72, 1.01), m => { m.rotation.x = Math.PI / 2; });
    g.add(mesh(rbox(0.9, 0.95, 0.75, 0.12), mat(0xd9534f), 0, 0.95, -0.55)); g.add(mesh(rbox(1.0, 0.1, 0.9, 0.04), mat(0x3d3550), 0, 1.47, -0.55));
    g.add(mesh(rbox(0.5, 0.35, 0.08, 0.06), mat(GLASS), 0, 1.05, -0.17));
    g.add(mesh(cyl(0.12, 0.17, 0.5, 10), mat(0x3d3550), 0, 1.25, 0.75));
    [[-0.45, 0.6], [0.45, 0.6], [-0.45, -0.4], [0.45, -0.4]].forEach(([x, z]) => { const wh = mesh(cyl(0.26, 0.26, 0.1, 14), mat(BRASS), x, 0.3, z); wh.rotation.z = Math.PI / 2; g.add(wh); });
    const live = new THREE.Group(); g.add(live); g.userData.live = live;
    [0, 1, 2].forEach(i => live.add(mesh(ball(0.15 + i * 0.06), mat(0xffffff), 0, 1.65 + i * 0.3, 0.75 - i * 0.2)));
  } else if (id === 'in_plane') { // a red biplane
    const body = mesh(cap(0.22, 1.3), mat(0xfff5e1), 0, 0.9, 0); body.rotation.x = Math.PI / 2; g.add(body);
    [0.62, 1.22].forEach(y => g.add(mesh(rbox(2.4, 0.07, 0.55, 0.03), mat(0xff8a73), 0, y, 0.15)));
    [-0.8, 0.8].forEach(x => [0, 0.3].forEach(z => g.add(mesh(cyl(0.025, 0.025, 0.6, 5), mat(0x8a6a50), x, 0.92, z))));
    g.add(mesh(rbox(0.9, 0.06, 0.35, 0.02), mat(0xff8a73), 0, 0.95, -0.85)); g.add(mesh(rbox(0.06, 0.4, 0.35, 0.02), mat(0xff8a73), 0, 1.15, -0.85));
    const prop = mesh(rbox(0.9, 0.1, 0.04, 0.03), mat(0x8a6a50), 0, 0.9, 0.95); g.add(prop); g.add(mesh(ball(0.08), mat(0xffd166), 0, 0.9, 0.98));
    [-0.35, 0.35].forEach(x => { g.add(mesh(cyl(0.025, 0.025, 0.5, 5), mat(0x8a6a50), x, 0.4, 0.35)); const wh = mesh(cyl(0.14, 0.14, 0.06, 12), mat(0x3d3550), x, 0.14, 0.35); wh.rotation.z = Math.PI / 2; g.add(wh); });
  } else return null;
  return g;
}
const PROJECT_AT = [[-1.0, 0.35], [1.0, 0.35], [0, -0.85]]; // where the three things stand on an early-era work spot
function makeProject(era, color) { // what stands on a kid's work spot: a rocket in the space era, three things before it
  if (era === 3) return makeRocket(color);
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const ghost = mesh(cyl(1.5, 1.5, 0.04, 24), geo('ghostM', () => bend(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }))), 0, 0.2, 0); tilt.add(ghost);
  const p = {}, live = [];
  PARTS.filter(q => q.era === era).forEach((q, i) => { const m = eraPart(q.id); m.position.set(PROJECT_AT[i][0], 0.14, PROJECT_AT[i][1]); m.visible = false; tilt.add(m); p[q.id] = m; if (m.userData.live) live.push(m); });
  const scribble = new THREE.Group(); scribble.visible = false; const on = ERAS[era].doodle.on, at = PROJECT_AT[PARTS.filter(q => q.era === era).findIndex(q => q.id === on)];
  scribble.position.set(at[0], 0.14, at[1] + 0.3); tilt.add(scribble);
  [[0.3, 1.2], [-0.35, 0.8], [0.05, 1.6], [-0.2, 1.3], [0.4, 0.6]].forEach(([x, y], i) => { const s = mesh(ball(0.16), mat(ERAS[era].doodle.color), x, y, 0.05); s.scale.set(1.5, 0.6 + i * 0.1, 0.3); s.rotation.z = i; scribble.add(s); });
  g.userData = { parts: p, tilt, ghost, scribble, live };
  return g;
}
function makeEraShop(s) { // a hide-and-rock hut, a thatched hut or a brick workshop, with its thing on the roof
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); let top = 4.4;
  if (s.era === 0) {
    const r = mesh(ball(1), mat(0xd6c8ae), 0, 0.4, 0); r.scale.set(3.4, 2.7, 2.6); g.add(r);
    const d = mesh(ball(1), mat(DARK), 0, 0.4, 1.7); d.scale.set(0.9, 1.4, 0.6); g.add(d);
    [[-2.2, 1.6], [2.4, 1.2], [-1, -1.6]].forEach(([x, z]) => g.add(mesh(ball(0.5), mat(0xc4b597), x, 0.3, z)));
    [-1, 1].forEach(k => { const t = mesh(cyl(0.08, 0.08, 1.6, 6), mat(0x9a6a45), k * 1.6, 0.8, 2.0); g.add(t); g.add(mesh(geo('flame1', () => new THREE.ConeGeometry(0.34, 0.95, 12)), glow(0xff9a3c), k * 1.6, 1.85, 2.0)); });
    top = 3.6;
  } else if (s.era === 1) {
    g.add(mesh(cyl(2.9, 3.0, 2.3, 24), mat(0xf3e6c8), 0, 1.15, 0));
    g.add(mesh(geo('thatch', () => new THREE.ConeGeometry(3.9, 2.6, 24)), mat(0xe8c66a), 0, 3.4, 0));
    g.add(mesh(rbox(1.2, 1.8, 0.2, 0.3), mat(WOOD), 0, 0.9, 2.9));
    top = 5.0;
  } else {
    g.add(mesh(rbox(6.2, 3.6, 4.6, 0.3), mat(BRICK), 0, 1.8, 0)); g.add(mesh(rbox(6.6, 0.4, 5.0, 0.15), mat(0x8f6f8f), 0, 3.75, 0));
    g.add(mesh(cyl(0.45, 0.55, 2.4, 14), mat(0xb5655a), 2.1, 5.0, -1.2));
    [-1, 1].forEach(k => { g.add(mesh(rbox(1.1, 1.0, 0.12, 0.08), mat(GLASS), k * 2.0, 2.2, 2.31)); g.add(mesh(rbox(1.3, 0.14, 0.2, 0.05), mat(0xfff5e1), k * 2.0, 1.66, 2.35)); });
    g.add(mesh(rbox(1.3, 2.2, 0.2, 0.2), mat(0x5d5a70), 0, 1.1, 2.3)); top = 4.6;
  }
  const sign = label(s.name, 4.2, 0.8, '#fffaf0', '#5a4a7a'); sign.position.set(0, 2.85, 3.2); g.add(sign);
  [-1, 1].forEach(k => g.add(mesh(cyl(0.06, 0.06, 2.6, 6), mat(WOOD), k * 1.9, 1.3, 3.15)));
  const emb = eraPart(PARTS.find(p => p.shop === s.id).id); emb.position.set(0, top, 0.6); emb.scale.setScalar(1.2); g.add(emb);
  return g;
}
function makePortal(e) { // the time portal on each island's hill: a ring with a swirl that only spins open on the teacher's OK
  const g = new THREE.Group(), P = PORTAL[e]; g.position.set(P.x, gh(P.x, P.z), P.z);
  const frame = [0xb3a993, 0xc9a27e, 0xe0b450][e];
  g.add(mesh(cyl(2.5, 2.7, 0.35, 28), mat(new THREE.Color(frame).multiplyScalar(0.85).getHex()), 0, 0.17, 0));
  const ring = mesh(geo('pring', () => new THREE.TorusGeometry(1.95, 0.3, 12, 36)), mat(frame), 0, 2.4, 0); g.add(ring);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.add(mesh(starGeo(0.22, 0.08), glow(0xffd166), Math.cos(a) * 1.95, 2.4 + Math.sin(a) * 1.95, 0.25)); }
  [-1, 1].forEach(k => g.add(mesh(rbox(0.5, 0.6, 0.6, 0.15), mat(frame), k * 1.5, 0.55, 0)));
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  for (let r = 64; r > 0; r -= 2) { x.fillStyle = `hsl(${(r * 9 + 200) % 360},85%,${72 + (r % 8)}%)`; x.beginPath(); x.arc(64, 64, r, 0, 6.3); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 5; for (let k = 0; k < 4; k++) { x.beginPath(); for (let t = 0; t < 5; t += 0.1) { const rr = t * 12, a = t + k * 1.57; x.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } x.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const swirl = mesh(geo('pswirl', () => new THREE.CircleGeometry(1.75, 32)), bend(new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })), 0, 2.4, 0); g.add(swirl);
  const lock = new THREE.Group(); lock.position.set(0, 2.2, 0.2); g.add(lock);
  lock.add(mesh(rbox(0.9, 0.75, 0.3, 0.12), mat(0xffd166))); lock.add(mesh(geo('shack', () => new THREE.TorusGeometry(0.28, 0.08, 8, 16, Math.PI)), mat(0xb9c2e6), 0, 0.38, 0));
  const sign = label('시간의 포탈 → ' + ERAS[e + 1].name, 4.6, 0.8, '#5a4a7a', '#fffaf0'); sign.position.set(0, 5.0, 0); g.add(sign);
  g.userData = { swirl, lock }; return g;
}
function makeArrival(e) { // where the portal drops you: a glowing ring on the ground
  const g = new THREE.Group(), A = ARRIVE[e]; g.position.set(A.x, gh(A.x, A.z) + 0.05, A.z);
  const r = mesh(geo('aring', () => new THREE.TorusGeometry(1.7, 0.16, 8, 32)), glow(0xffe680), 0, 0.05, 0); r.rotation.x = Math.PI / 2; g.add(r);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.add(mesh(starGeo(0.16, 0.05), glow(0xfff3b0), Math.cos(a) * 1.7, 0.25, Math.sin(a) * 1.7)); }
  return g;
}
function makeHouse(e, k) { // a villager's home in each era's style: a hide tent, a thatched house, a brick house, a glass dome
  const g = new THREE.Group(), accent = [0xff8a73, 0x7cc6fe, 0xffd166, 0x95e1a3, 0xc9a0ff][k % 5];
  if (e === 0) {
    g.add(mesh(geo('tent', () => new THREE.ConeGeometry(2.3, 3.4, 10)), mat([0xe8c08a, 0xd9a66b, 0xf0d2a0][k % 3]), 0, 1.7, 0));
    for (let i = 0; i < 3; i++) { const b = mesh(cyl(2.3 - i * 0.62, 2.3 - i * 0.62 + 0.05, 0.22, 10), mat(i % 2 ? accent : 0x8a5a36), 0, 0.5 + i * 0.95, 0); g.add(b); }
    [-0.5, 0, 0.5].forEach(x => { const p = mesh(cyl(0.06, 0.06, 1.2, 6), mat(0x7a5230), x * 0.4, 3.7, 0); p.rotation.z = x * 0.6; g.add(p); });
    const door = mesh(geo('tdoor', () => new THREE.ConeGeometry(0.75, 1.6, 3)), mat(0x5a3d2a), 0, 0.8, 1.55); door.rotation.x = -0.2; g.add(door);
  } else if (e === 1) {
    g.add(mesh(rbox(4.2, 2.0, 3.2, 0.3), mat(0xf3e6c8), 0, 1.0, 0)); g.add(mesh(rbox(4.4, 0.35, 3.4, 0.1), mat(0x9a6a45), 0, 0.17, 0));
    const roof = mesh(ball(1), mat(0xe8c66a), 0, 2.3, 0); roof.scale.set(2.8, 1.3, 2.2); g.add(roof); put(g, mesh(ball(1), mat(0xd9b35a), 0, 3.1, 0), m => m.scale.set(1.6, 0.5, 1.2));
    g.add(mesh(rbox(1.0, 1.4, 0.15, 0.2), mat(0x9a6a45), 0, 0.85, 1.62)); g.add(mesh(rbox(0.8, 0.6, 0.12, 0.1), mat(0xfff5e1), 1.3, 1.2, 1.62));
    for (let x = -2.6; x <= 2.6; x += 0.65) g.add(mesh(cyl(0.06, 0.06, 0.9, 5), mat(0xd9b860), x, 0.45, 2.6));
    g.add(mesh(rbox(5.4, 0.1, 0.1, 0.03), mat(0xc9a850), 0, 0.7, 2.6));
  } else if (e === 2) {
    g.add(mesh(rbox(4.0, 2.8, 3.4, 0.2), mat(BRICK), 0, 1.4, 0));
    const roof = mesh(geo('gable', () => new THREE.CylinderGeometry(2.0, 2.0, 4.4, 3)), mat([0xd9534f, 0x5b7fd6, 0x4f9e6f][k % 3]), 0, 3.35, 0); roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 1.1); g.add(roof);
    g.add(mesh(rbox(0.6, 1.4, 0.6, 0.1), mat(0xb5655a), 1.2, 4.0, -0.6)); g.add(mesh(rbox(1.0, 1.6, 0.15, 0.2), mat(0x5d5a70), 0, 0.8, 1.72));
    [-1.3, 1.3].forEach(x => { g.add(mesh(rbox(0.8, 0.8, 0.12, 0.08), mat(GLASS), x, 1.7, 1.72)); g.add(mesh(rbox(1.0, 0.12, 0.25, 0.04), mat(0xffffff), x, 1.25, 1.75)); });
    g.add(mesh(cyl(0.25, 0.25, 0.4, 10), mat(accent), 1.6, 0.2, 2.3)); // a flower pot
  } else {
    g.add(mesh(cyl(2.0, 2.1, 1.2, 24), mat(CREAM), 0, 0.6, 0));
    const d = mesh(geo('roof', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), geo('domeM', () => bend(new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.45, depthWrite: false }))), 0, 1.2, 0); d.scale.set(2.0, 1.8, 2.0); g.add(d);
    g.add(mesh(ball(0.7), mat(accent), 0, 1.6, 0)); g.add(mesh(rbox(0.9, 1.0, 0.15, 0.3), mat(WOOD), 0, 0.5, 2.05));
  }
  return g;
}
function makePalm(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  for (let i = 0; i < 6; i++) { const s = mesh(cyl(0.2 - i * 0.015, 0.23 - i * 0.015, 0.62, 8), mat(i % 2 ? 0xc9a27e : 0xb58a68), Math.sin(i * 0.35) * 0.35 * i * 0.2, 0.3 + i * 0.58, 0); g.add(s); }
  for (let i = 0; i < 6; i++) { const l = mesh(cap(0.18, 1.6), mat(0x6fcf8a), 0, 0, 0), h = new THREE.Group(); h.position.set(0.35, 3.6, 0); h.rotation.y = i * 1.05; l.position.set(0, 0, 0.9); l.rotation.x = 1.25; l.scale.set(1.6, 1, 0.35); h.add(l); g.add(h); }
  g.add(mesh(ball(0.18), mat(0x8a5a36), 0.45, 3.45, 0.15)); g.add(mesh(ball(0.18), mat(0x8a5a36), 0.2, 3.4, -0.2));
  g.add(shadow(1.2)); return g;
}
const ERA_TREES = [[0xf2a65a, 0xe36f4f, 0xf7c873, 0xd9534f], [0xffb7d5, 0x8fdcb8, 0xffc8e0, 0x9ad86b], [0x5fbf76, 0x4fae69, 0x7fcf8a, 0xf7e08a], [0xffb7d5, 0xcdb4ff, 0x8fdcb8, 0xa5d8ff]];
function makeEraTree(e, x, z, k) { // round fluffy trees in each era's colours: autumn, cherry blossom, summer, pastel
  const g = new THREE.Group(); g.position.set(x, 0, z); const c = ERA_TREES[e][k % 4];
  g.add(mesh(cyl(0.24, 0.34, 1.7, 8), mat(0x9a7a6a), 0, 0.85, 0));
  g.add(mesh(ball(1.3), mat(c), 0, 2.5, 0)); g.add(mesh(ball(0.9), mat(c), 0.8, 2.05, 0.25)); g.add(mesh(ball(0.85), mat(c), -0.8, 2.1, -0.1)); g.add(mesh(ball(0.75), mat(c), 0.1, 3.4, 0));
  if (k % 3 === 0) [[0.6, 2.2, 1.1], [-0.5, 2.6, 1.0], [0.1, 1.9, 1.15]].forEach(([a, b, d]) => g.add(mesh(ball(0.14), mat(e === 1 ? 0xffffff : 0xff6b6b), a, b, d))); // fruit, or blossom
  g.add(shadow(1.4)); return g;
}
function scatter(grp, e, geom, color, n, scale, seed, avoid) { // many small things (flowers, grass, pampas) in one draw call
  const I = ISLANDS[e], m = new THREE.InstancedMesh(geom, mat(color), n), o = new THREE.Object3D(); let s = seed, k = 0;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let t = 0; t < n * 8 && k < n; t++) {
    const x = (r() - 0.5) * 92, lz = I.north + 4 + r() * (I.beachS - I.north - 6), z = I.cz + lz, h = walkH(x, z);
    if (h === null || h < 0.02 || Math.abs(h - Math.round(h / TIER) * TIER) > 0.05 || avoid(x, z, lz)) continue;
    o.position.set(x, h, z); o.rotation.set(0, r() * 6.28, (r() - 0.5) * 0.3); o.scale.setScalar(scale * (0.7 + r() * 0.6)); o.updateMatrix(); m.setMatrixAt(k++, o.matrix);
  }
  m.count = k; m.frustumCulled = false; grp.add(m); return m;
}
function islandDecor(e, grp, solid) { // landmarks, houses, trees, palms and flowers for one island; solid() records what blocks walking
  const I = ISLANDS[e], zc = I.cz, anim = [], at = (o, x, lz, rot) => { o.position.set(x, gh(x, zc + lz), zc + lz); if (rot) o.rotation.y = rot; grp.add(o); return o; };
  const busy = [];
  SHOPS.filter(s => s.era === e).forEach(s => busy.push([s.x, s.z - zc + 2, 7]));
  if (e < 3) { busy.push([0, 4, 18], [0, 25, 6], [0, -37, 6], [-5, -33, 2]); grp.add(makePortal(e)); }
  if (e > 0) grp.add(makeArrival(e));
  const house = (x, lz, k, rot) => { at(makeHouse(e, k), x, lz, rot); solid(x, zc + lz, 2.4); busy.push([x, lz, 4]); };
  const tree = (x, lz, k) => { at(makeEraTree(e, 0, 0, k), x, lz); solid(x, zc + lz, 0.6); busy.push([x, lz, 2]); };
  const palm = (x, lz) => { at(makePalm(0, 0), x, lz); solid(x, zc + lz, 0.5); };
  [-34, -20, 18, 32].forEach((x, i) => palm(x + (i % 2) * 2, I.grassS + 3 + (i % 2) * 2));
  if (e === 0) { // 석기: hide tents, a cave in the high cliff, a dolmen with stars cut in it, a wandering mammoth, campfires, pampas
    house(36, -8, 0, -0.4); house(40, 18, 1, -0.8); house(20, 25, 2, 0.3); house(-14, -42, 1, 0); house(12, -44, 0, 0.2);
    const cave = new THREE.Group(); at(cave, 30, -30.6); cave.position.y = TIER;
    const arch = mesh(ball(1), mat(0x3a2f45), 0, 0.2, 0); arch.scale.set(2.2, 2.6, 0.8); cave.add(arch); solid(30, zc - 30.6, 2.4);
    [-2.4, 2.4].forEach(x => cave.add(mesh(ball(0.6), mat(0xc4b597), x, 0.3, 0.5))); cave.add(mesh(starGeo(0.3, 0.06), glow(0xffd166), 0, 2.9, 0.5));
    const dol = new THREE.Group(); at(dol, -16, -42); solid(-16, zc - 42, 1.9);
    [-1, 1].forEach(k => dol.add(mesh(rbox(0.7, 1.6, 1.4, 0.2), mat(STONE), k * 1.0, 0.8, 0)));
    dol.add(mesh(rbox(3.4, 0.5, 2.6, 0.25), mat(0xc9bba4), 0, 1.85, 0));
    [[-0.9, -0.5], [-0.3, 0.2], [0.4, -0.3], [1.0, 0.5], [0.1, 0.8]].forEach(([x, z]) => dol.add(mesh(ball(0.09), glow(0xffd166), x, 2.12, z)));
    const mam = makeMammoth(); mam.scale.setScalar(0.8); grp.add(mam);
    anim.push(t => { const a = t * 0.12, x = 31 + Math.sin(a) * 3, z = zc + 4 + Math.cos(a * 0.7) * 3; mam.position.set(x, gh(x, z), z); mam.rotation.y = Math.atan2(Math.cos(a) * 0.36, -Math.sin(a * 0.7) * 0.25); mam.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 4 + i * 1.6) * 0.25; }); });
    [[-28, -4], [12, 26], [-20, -40]].forEach(([x, lz]) => at(eraPart('st_fire'), x, lz));
    [[-30, -16, 0], [-28, 18, 1], [30, -18, 2], [-40, -2, 3], [24, 14, 0], [-20, 27, 1], [8, -48, 2], [-34, -46, 3], [-6, -46, 0], [20, -38, 1]].forEach(([x, lz, k]) => tree(x, lz, k));
  }
  if (e === 1) { // 철기: thatched houses with reed fences, a big 첨성대, rice paddies on the hill, cherry trees, 장승
    house(-38, 14, 0, 0.5); house(-38, -16, 1, 0.4); house(22, 25, 2, -0.3); house(-14, -44, 0, 0);
    const ch = at(eraPart('ir_tower'), -36, -1); ch.scale.setScalar(3.2); solid(-36, zc - 1, 2.5);
    for (let i = 0; i < 3; i++) { const pd = mesh(rbox(7, 0.25, 2.4, 0.1), mat(0xa8dcef), 0, 0, 0); at(pd, 14, -44 + i * 3); pd.position.y += 0.1; for (let j = 0; j < 9; j++) grp.add(mesh(cyl(0.03, 0.05, 0.6, 4), mat(0x6fbf5a), 10.8 + j * 0.8, pd.position.y + 0.35, zc - 44 + i * 3)); }
    [[4.5, -34, 0xd9534f], [-8.5, -36, 0x5b7fd6]].forEach(([x, lz, c]) => { const j = new THREE.Group(); at(j, x, lz); j.add(mesh(cyl(0.3, 0.35, 2.4, 10), mat(0xc9a27e), 0, 1.2, 0)); j.add(mesh(ball(0.42), mat(0xc9a27e), 0, 2.6, 0)); j.add(mesh(cyl(0.45, 0.45, 0.2, 12), mat(c), 0, 2.95, 0)); face(j, 2.55, 0.38, 1.1, 0.16); solid(x, zc + lz, 0.5); });
    [[-30, -8, 0], [-26, 24, 2], [30, -18, 1], [24, 14, 0], [12, -38, 2], [-24, -40, 0], [-6, -48, 1], [20, -48, 3], [-42, 26, 1], [16, 28, 2]].forEach(([x, lz, k]) => tree(x, lz, k));
  }
  if (e === 2) { // 산업: brick houses, a factory puffing smoke, an observatory on the high cliff, a big gear, lamps, a little steam engine
    house(-38, -18, 0, 0.4); house(14, 26, 1, -0.2); house(-16, 26, 2, 0.2); house(-14, -44, 1, 0);
    const fac = new THREE.Group(); at(fac, -37, 11); solid(-37, zc + 11, 4.6);
    fac.add(mesh(rbox(7, 4.4, 6, 0.3), mat(BRICK), 0, 2.2, 0)); [-1, 1].forEach(k => fac.add(mesh(cyl(0.6, 0.75, 5, 14), mat(0xb5655a), k * 2.2, 6.4, -1.5)));
    for (let i = 0; i < 3; i++) fac.add(mesh(rbox(1.3, 1.2, 0.12, 0.08), mat(GLASS), -2.2 + i * 2.2, 2.6, 3.02));
    const puffs = []; for (let i = 0; i < 8; i++) { const p = mesh(ball(0.7), mat(0xf4f0fa), 0, 0, 0); grp.add(p); puffs.push(p); }
    anim.push(t => puffs.forEach((p, i) => { const k = (t * 0.25 + i / 4) % 1, side = i % 2 ? 1 : -1; p.position.set(-37 + side * 2.2 + k * 3, 9 + k * 7, zc + 9.5 - k * 2); p.scale.setScalar(0.6 + k * 1.4); }));
    const obs = new THREE.Group(); at(obs, -31, -42); solid(-31, zc - 42, 3);
    obs.add(mesh(cyl(2.6, 2.8, 3, 20), mat(0xfff5e1), 0, 1.5, 0)); const dm = mesh(geo('roof', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0xc9c5e8), 0, 3.0, 0); dm.scale.set(2.7, 2.4, 2.7); obs.add(dm);
    const sc = mesh(cyl(0.35, 0.45, 3, 12), mat(BRASS), 0.6, 4.4, 0.6); sc.rotation.x = -0.7; sc.rotation.z = -0.3; obs.add(sc);
    const gear = new THREE.Group(); at(gear, 14, -40); gear.position.y += 3.2; solid(14, zc - 40, 1.2);
    const gw = mesh(cyl(2.2, 2.2, 0.5, 24), mat(BRASS), 0, 0, 0); gw.rotation.x = Math.PI / 2; gear.add(gw);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; gear.add(mesh(rbox(0.7, 0.7, 0.5, 0.1), mat(BRASS), Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0)); }
    at(mesh(rbox(0.8, 1.2, 0.8, 0.1), mat(0x5d5a70), 0, 0.6, 0), 14, -40); anim.push(t => { gear.rotation.z = t * 0.4; });
    [[-6, -18], [6, -18], [-18, 4], [18, 4], [-6, 26], [6, 26]].forEach(([x, lz]) => { const l = new THREE.Group(); at(l, x, lz); l.add(mesh(cyl(0.08, 0.1, 3, 8), mat(0x3d3550), 0, 1.5, 0)); l.add(mesh(rbox(0.5, 0.6, 0.5, 0.1), mat(0x3d3550), 0, 3.1, 0)); l.add(mesh(ball(0.2), glow(0xffe680), 0, 3.1, 0)); solid(x, zc + lz, 0.3); });
    const tr = new THREE.Group(); at(tr, 40, 20, Math.PI / 2); solid(40, zc + 20, 2.2);
    tr.add(mesh(rbox(1.6, 1.2, 3.2, 0.2), mat(0x3d3550), 0, 0.9, 0)); const boiler = mesh(cyl(0.6, 0.6, 2.2, 14), mat(0x3d3550), 0, 1.3, 0.6); boiler.rotation.x = Math.PI / 2; tr.add(boiler);
    tr.add(mesh(cyl(0.2, 0.3, 0.8, 10), mat(0xd9534f), 0, 2.1, 1.3)); tr.add(mesh(rbox(1.5, 1.2, 1.2, 0.15), mat(0xd9534f), 0, 1.9, -1.0));
    [-1.2, 0, 1.2].forEach(zz => [-1, 1].forEach(k => { const w = mesh(cyl(0.4, 0.4, 0.15, 14), mat(BRASS), k * 0.85, 0.4, zz); w.rotation.z = Math.PI / 2; tr.add(w); }));
    [[-30, -6, 0], [-26, 22, 1], [30, -20, 2], [22, 12, 3], [-24, -46, 0], [8, -48, 1], [26, -40, 2], [-42, 26, 0], [-4, -46, 3]].forEach(([x, lz, k]) => tree(x, lz, k));
  }
  if (e === 3) [[-36, -2, 0], [36, 6, 1], [-34, 40, 2], [34, 44, 3]].forEach(([x, lz, k]) => house(x, lz, k, 0));
  // little things everywhere: flowers and grass tufts (and pampas on the stone age island)
  const PAD = PAD_SPOTS[e], avoid = (x, z, lz) => busy.some(([bx, bz, r]) => Math.hypot(x - bx, lz - bz) < r) || PAD.some(p => Math.hypot(x - p.x, z - p.z) < 3.4) || I.paths.some(p => lineDist(x, lz, p) < 2.2) || I.plazas.some(q => Math.hypot(x - q[0], lz - q[1]) < q[2] + 1) || (e === 3 && Math.hypot(x, z) < 10);
  const petal = geo('petal', () => { const gg = new THREE.SphereGeometry(0.16, 6, 4); gg.translate(0, 0.28, 0); return gg; });
  const blade = geo('blade', () => { const gg = new THREE.ConeGeometry(0.07, 0.5, 4); gg.translate(0, 0.25, 0); return gg; });
  const flowerC = [[0xffffff, 0xff8a5c, 0xffd166], [0xff8fb8, 0xffffff, 0xffd166], [0xff6b6b, 0xffd166, 0x7cc6fe], [0xffd166, 0xc9a0ff, 0xff8fb8]][e];
  flowerC.forEach((c, i) => scatter(grp, e, petal, c, 45, 1, 11 + i * 7 + e, avoid));
  scatter(grp, e, blade, new THREE.Color(I.grass[1]).multiplyScalar(0.82).getHex(), 260, 1.1, 101 + e, avoid);
  if (e === 0) scatter(grp, e, geo('pampas', () => { const gg = new THREE.ConeGeometry(0.12, 1.4, 5); gg.translate(0, 0.7, 0); return gg; }), 0xf6e2b0, 90, 1, 303, avoid);
  return anim;
}
function makeMammoth() { // a woolly friend who wanders the stone age
  const g = new THREE.Group(), fur = mat(0xa0785a); g.add(shadow(2.0));
  const body = mesh(ball(1.6), fur, 0, 2.2, 0); body.scale.set(1.0, 0.95, 1.35); g.add(body);
  const head = mesh(ball(1.05), fur, 0, 2.9, 1.9); g.add(head); g.add(mesh(ball(0.5), fur, 0, 3.9, 1.6));
  face(g, 3.0, 2.85, 1.4, 0.32);
  const trunk = [mesh(cap(0.28, 0.6), fur, 0, 2.3, 2.75), mesh(cap(0.22, 0.5), fur, 0, 1.55, 2.95)]; trunk.forEach(t => g.add(t)); trunk[1].rotation.x = 0.4;
  [-1, 1].forEach(k => { const t = mesh(geo('tusk', () => new THREE.TorusGeometry(0.6, 0.11, 8, 16, Math.PI * 0.8)), mat(0xfff5e1), k * 0.5, 2.0, 2.4); t.rotation.y = Math.PI / 2; t.rotation.z = -0.3; g.add(t);
    const ear = mesh(ball(0.55), mat(0x8a6448), k * 0.95, 3.0, 1.55); ear.scale.set(0.35, 1, 0.9); g.add(ear); });
  const legs = []; [[-0.7, 0.8], [0.7, 0.8], [-0.7, -0.9], [0.7, -0.9]].forEach(([x, z]) => { const l = mesh(cap(0.38, 0.7), fur, x, 0.7, z); g.add(l); legs.push(l); });
  g.userData.legs = legs; return g;
}
// ---- The whole world ---------------------------------------------------------------------
const W3 = {};
function initWorld(canvas, cheap) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !cheap, powerPreference: 'high-performance' });
  r.setPixelRatio(cheap ? 0.5 : Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2e2559); scene.fog = new THREE.Fog(0x6c5fa8, 48, 110);
  const cam = new THREE.PerspectiveCamera(38, 1, 1, 700); scene.add(cam);
  scene.add(new THREE.HemisphereLight(0xfff7ea, 0xa494e6, 2.1));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.5); sun.position.set(6, 12, 9); scene.add(sun);

  // Four islands, each in its own group; only the island you are on is drawn
  const stages = ISLANDS.map((I, e) => { const g = buildIsland(e); scene.add(g); return g; }), solids = [], anim = [];
  const solid = (x, z, r) => solids.push({ x, z, r });
  const on = (e, o) => { o.position.y += gh(o.position.x, o.position.z); stages[e].add(o); return o; };
  stages.forEach((g, e) => anim.push(...islandDecor(e, g, solid)));
  // the space village: star grass, lamps, trees, shops and the launch pad up the hill
  W3.twinkles = [];
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 80, z = (rnd() - 0.5) * 90 + 2; if (Math.hypot(x, z) < 9 || (Math.abs(x) < 16 && z > 9 && z < 58) || walkH(x, z) === null) continue;
    const st = on(3, mesh(starGeo(0.2, 0.04), glow([0xffe680, 0xfff3b0, 0xffc2e2][i % 3]), x, 0.32, z)); st.userData.k = rnd() * 6; W3.twinkles.push(st);
    on(3, mesh(cyl(0.02, 0.02, 0.3, 5), mat(0x74c79e), x, 0.15, z));
  }
  [[-9, -6], [10, 4], [-30, -14], [30, -14], [-30, 27], [30, 27], [-22, 50], [22, 50], [-17, -30], [18, -31], [-34, 4], [37, 6], [-9, -33], [9, -34], [-15, 6], [15, -5]].forEach(([x, z], i) => { on(3, makeTree(x, z, i)); solid(x, z, 0.6); });
  HIDE_SPOTS.forEach(h => on(h.era, makeBush(h.x + 0.9, h.z - 0.6)));
  [[-6, -6], [6, 6], [-6, 6], [6.5, -5]].forEach(([x, z]) => { on(3, mesh(cyl(0.07, 0.1, 2.6, 8), mat(0xffffff), x, 1.3, z)); on(3, mesh(ball(0.3), glow(0xfff0a8), x, 2.75, z)); });
  SHOPS.forEach(sh => on(sh.era, sh.era === 3 ? makeShop(sh) : makeEraShop(sh)));
  [makeHQ(), makeDesk(), makeGacha(), makeLaunch()].forEach(o => on(3, o));
  const portals = [0, 1, 2].map(e => stages[e].children.find(o => o.userData.swirl));

  // Sky, fixed to the camera: stars, a ringed planet drifting by, a small moon
  const sky = new THREE.Group(); cam.add(sky);
  const pts = []; for (let i = 0; i < 260; i++) pts.push((rnd() - 0.5) * 520, 30 + rnd() * 110, -320);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xfff6d8, size: 2.2, sizeAttenuation: false, fog: false })); stars.frustumCulled = false; sky.add(stars);
  const planet = new THREE.Group(); planet.position.set(120, 82, -300); sky.add(planet);
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(13, 24, 16), new THREE.MeshLambertMaterial({ color: 0xffc8a2, fog: false })));
  const band = new THREE.Mesh(new THREE.SphereGeometry(13.1, 24, 6, 0, Math.PI * 2, 1.2, 0.35), new THREE.MeshLambertMaterial({ color: 0xff9e8a, fog: false })); planet.add(band);
  const pr = new THREE.Mesh(new THREE.TorusGeometry(21, 2.2, 3, 48), new THREE.MeshLambertMaterial({ color: 0xd9c8ff, fog: false })); pr.rotation.x = 1.25; pr.rotation.y = 0.3; pr.scale.z = 0.2; planet.add(pr);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 18, 12), new THREE.MeshLambertMaterial({ color: 0xfff3c4, fog: false })); moon.position.set(-135, 92, -300); sky.add(moon);
  Object.assign(W3, { r, scene, cam, planet, sky, stages, portals, solids, anim, focus: new THREE.Vector3(0, 0, 0) });
  resizeWorld(); addEventListener('resize', resizeWorld);
}
function resizeWorld() {
  W3.r.setSize(innerWidth, innerHeight, false); W3.r.domElement.style.width = innerWidth + 'px'; W3.r.domElement.style.height = innerHeight + 'px';
  W3.cam.aspect = innerWidth / innerHeight; W3.cam.fov = W3.cam.aspect < 1 ? 52 : 38; W3.cam.updateProjectionMatrix();
}
function lookAtSpot(x, z, height, back, snap) {
  const f = W3.focus, k = snap ? 1 : 0.12; f.x += (x - f.x) * k; f.z += (z - f.z) * k;
  W3.cam.position.set(f.x, height, f.z + back); W3.cam.lookAt(f.x, 1.3, f.z - 1.5);
  BEND.uCamZ.value = f.z + 2;
}
const _v = new THREE.Vector3();
function toScreen(x, y, z) { // where a world point lands on the screen, with the roll of the ground
  const d = Math.min(z - BEND.uCamZ.value, 0); _v.set(x, y - d * d * BEND.uCurve.value, z).project(W3.cam);
  return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight, on: _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1 };
}
