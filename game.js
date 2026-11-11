// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: the rules. Draw a mission, get the plan stamped, fetch parts from the textbook
// shops, build, prank and get pranked, launch. Everything runs on the fixed step.
'use strict';

const PART = Object.fromEntries(PARTS.map(p => [p.id, p]));
const SHOP = Object.fromEntries(SHOPS.map(s => [s.id, s]));
const GUIDE = '도장 로봇';
let dyn = null, marker = null, COL = [], keepers = [], places = [], lineup = null, myShirt = 1, zoom = 1, zoomNow = 1;
const me = () => state.actors[0];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const pick = arr => arr[Math.floor(rng() * arr.length)];
const keeperSpot = s => ({ x: s.x + (s.x < 0 ? 2.3 : -2.3), z: s.z + 3.8 });
const shopStand = s => ({ x: s.x + (s.x < 0 ? 3.7 : -3.7), z: s.z + 4.9 });
const padStand = a => ({ x: a.pad.x + 1.6, z: a.pad.z + 2.0 });
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && (c - 0xac00) % 28 ? a : b); };

// ---- Sound ------------------------------------------------------------------------------
function sfx(k) {
  if (k === 'pop') { tone(660, 0.08, 'sine', 0.25); tone(990, 0.1, 'sine', 0.2, 0.06); }
  if (k === 'ok') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, i * 0.09));
  if (k === 'bad') { tone(220, 0.2, 'square', 0.12); tone(180, 0.25, 'square', 0.12, 0.12); }
  if (k === 'blip') tone(520 + (state.t * 997 % 180), 0.04, 'triangle', 0.1);
  if (k === 'stamp') { tone(140, 0.15, 'square', 0.25); tone(880, 0.3, 'triangle', 0.2, 0.1); }
  if (k === 'launch') for (let i = 0; i < 14; i++) tone(90 + i * 22, 0.3, 'sawtooth', 0.1, i * 0.12);
  if (k === 'alarm') [880, 660, 880, 660].forEach((f, i) => tone(f, 0.12, 'square', 0.1, i * 0.13));
}
function toast(msg, kind) { state.toasts.push({ msg, kind: kind || '', t: 4.5 }); state.hud = ''; }

// ---- The teacher's stamp: kept in this browser, shared by its tabs ----------------------------
const KEY = 'sf_plans';
function loadPlans() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function savePlans(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* no storage: the in-game stamp still works */ } }
function pushPlan(a) {
  const all = loadPlans(), f = a.bot ? { ship: a.name + '호', why: a.mission.bot[0], what: a.mission.bot[1], safe: a.mission.bot[2], pack: a.mission.bot[3] } : state.plan;
  all[a.bot ? 'bot' + a.i : 'me'] = { name: a.name, bot: a.bot, mission: a.mission.name, fields: f, status: a.planStatus, note: a.bot ? '' : state.planNote };
  savePlans(all);
}
function setStatus(id, status, note) { const all = loadPlans(); if (all[id]) { all[id].status = status; all[id].note = note || ''; savePlans(all); } }
function pollPlan() {
  const p = loadPlans().me, m = me(); if (!p || m.planStatus !== 'sent') return;
  if (p.status === 'ok') { m.planStatus = 'ok'; toast('계획서 통과! 도장 쾅! 이제 만들러 가자', 'good'); sfx('stamp'); events.push('approved'); }
  if (p.status === 'back') { m.planStatus = 'back'; state.planNote = p.note; toast('계획서가 돌아왔어. 책상에서 고쳐 쓰자', 'bad'); sfx('bad'); }
}

// ---- A new game -----------------------------------------------------------------------------
function reset() {
  seed = Number(params.get('seed')) || CONFIG.seed;
  if (dyn) W3.scene.remove(dyn);
  dyn = new THREE.Group(); W3.scene.add(dyn); $('tags').innerHTML = ''; lineup = null;
  closeUI(true); savePlans({});
  state = { t: 0, score: 0, gained: '', actors: [], hidden: [], chests: [], foot: [], fx: [], toasts: [], bag: [], ui: null, act: null, fame: [], plan: {}, planNote: '', sulk: {}, staged: false, near: null, launching: null, joy: { x: 0, z: 0 }, hud: '', questText: '' };
  COL = [{ x: PLACES.hq.x, z: PLACES.hq.z, r: 4.7 }, { x: PLACES.gacha.x, z: PLACES.gacha.z, r: 1.2 }, { x: PLACES.desk.x, z: PLACES.desk.z, r: 1.4 }, { x: PLACES.desk.x + 2.6, z: PLACES.desk.z + 0.2, r: 0.7 }];
  SHOPS.forEach(s => { COL.push({ x: s.x, z: s.z, r: 3.7 }); const k = keeperSpot(s); COL.push({ x: k.x, z: k.z, r: 0.75 }); });
  keepers = SHOPS.map(s => { const k = keeperSpot(s), m = makeKeeper(s.id); m.position.set(k.x, 0, k.z); m.rotation.y = s.x < 0 ? 0.5 : -0.5; dyn.add(m); return { id: s.id, name: s.keeper, x: k.x, z: k.z, y: 3.1, mesh: m, tag: tag(s.keeper, 'npc') }; });
  const g = makeKeeper('guide'); g.position.set(PLACES.desk.x + 2.6, 0, PLACES.desk.z + 0.2); dyn.add(g);
  keepers.push({ id: 'guide', name: GUIDE, x: g.position.x, z: g.position.z, y: 2.8, mesh: g, tag: tag(GUIDE, 'npc') });
  places = SHOPS.map(s => ({ x: s.x, y: 4.6, z: s.z + 2.8, tag: tag(s.name, 'place') }));
  places.push({ x: PLACES.hq.x, y: 4.2, z: PLACES.hq.z + 4.5, tag: tag('탐사 본부', 'place') }, { x: PLACES.gacha.x, y: 4.1, z: PLACES.gacha.z, tag: tag('임무 뽑기', 'place') }, { x: PLACES.desk.x - 1.2, y: 2.5, z: PLACES.desk.z, tag: tag('계획서 책상', 'place') },
    { x: PLACES.launch.x, y: 3.3, z: PLACES.launch.z, tag: tag('발사대', 'place') }, { x: PAD_SPOTS[0].x - 1.9, y: 1.9, z: PAD_SPOTS[0].z + 2.3, tag: tag('내 작업장', 'place'), mine: true });
  HIDE_SPOTS.slice(0, tune.chest_count).forEach(h => { const g2 = makeChest(h.x, h.z); dyn.add(g2); state.chests.push({ x: h.x, z: h.z, g: g2, items: 0 }); COL.push({ x: h.x, z: h.z, r: 0.8 }); });
  const n = 1 + Math.min(tune.bot_count, BOT_NAMES.length, PAD_SPOTS.length - 1);
  const myName = ($('nameIn').value.trim() || '나').slice(0, 8);
  for (let i = 0; i < n; i++) {
    const bot = i > 0, si = (myShirt + i) % SHIRTS.length, ang = Math.PI + rng() * Math.PI, rad = 3.5 + rng() * 4;
    const a = { i, bot, name: bot ? BOT_NAMES[i - 1] : myName, shirt: SHIRTS[si], shirtName: SHIRT_NAMES[si], x: bot ? Math.cos(ang) * rad : PLACES.spawn.x, z: bot ? Math.sin(ang) * rad : PLACES.spawn.z, face: 0, moving: false,
      mission: bot ? pick(MISSIONS) : null, planStatus: 'none', parts: {}, order: [], away: {}, pad: PAD_SPOTS[i], loose: false, doodle: false, shieldUntil: 0, prankReady: bot ? 60 + rng() * 120 : 0, lastVictim: -1, tasks: [], pace: 0.7 + rng() * 0.9, launched: false, carry: null };
    a.mesh = makeKid({ shirt: a.shirt, hair: i % 5, hairColor: HAIR[(i * 3) % HAIR.length] }); dyn.add(a.mesh);
    dyn.add(makePad(a.pad, a.shirt, a.name)); a.rocket = makeRocket(a.shirt); a.rocket.position.set(a.pad.x, 0.14, a.pad.z); dyn.add(a.rocket);
    COL.push({ x: a.pad.x, z: a.pad.z, r: 1.25 });
    a.want = PARTS.map(p => p.id); for (let k = a.want.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [a.want[k], a.want[j]] = [a.want[j], a.want[k]]; }
    a.tag = tag(a.name, bot ? '' : 'me'); state.actors.push(a);
  }
  if (n > 2) { const a = state.actors[1]; a.planStatus = 'ok'; a.parts.hull = true; a.order.push('hull'); a.pace = 1.6; } // the first minute's victim
  state.actors.forEach(refreshActor);
  marker = mesh(starGeo(0.42, 0.14), glow(0xffe14d)); dyn.add(marker);
  lookAtSpot(PLACES.spawn.x, PLACES.spawn.z, tune.cam_height, tune.cam_back, true);
}
function tag(textStr, cls) { const d = document.createElement('div'); d.className = 'tag ' + cls; d.textContent = textStr; $('tags').appendChild(d); d._w = d.offsetWidth || textStr.length * 16 + 20; return d; }
function refreshActor(a) {
  const u = a.rocket.userData;
  ['hull', 'engine', 'antenna', 'nav', 'oven', 'food', 'scan'].forEach(k => { u.parts[k].visible = !!a.parts[k]; });
  u.ghost.visible = !a.parts.hull; u.scribble.visible = a.doodle;
  dressKid(a.mesh, a.parts);
  const h = a.mesh.userData.hold; while (h.children.length) h.remove(h.children[0]);
  if (a.carry) { const m = partMesh(a.carry.part); m.scale.setScalar(1.4); h.add(m); }
  state.hud = '';
}
const count = a => PARTS.filter(p => a.parts[p.id]).length;
function install(a, id) { a.parts[id] = true; if (PART[id].group !== 'suit') a.order.push(id); delete a.away[id]; refreshActor(a); }

// ---- Walking ---------------------------------------------------------------------------------
function walk(a, dx, dz, sp, dt) {
  const l = Math.hypot(dx, dz); if (l < 0.01) { a.moving = false; return; }
  dx /= l; dz /= l; a.moving = true; a.x += dx * sp * dt; a.z += dz * sp * dt;
  let d = Math.atan2(dx, dz) - a.face; d = Math.atan2(Math.sin(d), Math.cos(d)); a.face += d * Math.min(1, dt * 14);
  for (const c of COL) {
    const ox = a.x - c.x, oz = a.z - c.z, r = c.r + 0.45, q = Math.hypot(ox, oz);
    if (q < r && q > 0.001) { // pushed out, and slid round the side it was heading for
      const nx = ox / q, nz = oz / q, side = (-nz * dx + nx * dz) >= 0 ? 1 : -1;
      a.x = c.x + nx * r - nz * side * sp * dt * 0.7; a.z = c.z + nz * r + nx * side * sp * dt * 0.7;
    }
  }
  a.x = Math.max(-40, Math.min(40, a.x)); a.z = Math.max(-35, Math.min(40, a.z));
}

// ---- Pranks: small delays, never a reset -----------------------------------------------------
function canPrank(by, v, kind) {
  if (v.launched) return '이미 우주로 떠났어';
  if (by.carry) return '손에 든 것부터 숨기자';
  if (state.t < by.prankReady) return `장난 기운 충전 중 (${Math.ceil(by.prankReady - state.t)}초)`;
  if (by.lastVictim === v.i) return '같은 친구를 연달아 괴롭히면 안 돼';
  if (state.t < v.shieldUntil) return '방금 당한 곳이라 경보가 켜져 있어';
  if (kind === 'hide' && !v.order.length) return '가져갈 물건이 아직 없어';
  if (kind === 'loose' && (v.loose || !count(v))) return v.loose ? '이미 나사가 풀려 있어' : '아직 아무것도 없어';
  if (kind === 'doodle' && (v.doodle || !v.parts.hull)) return v.doodle ? '이미 낙서투성이야' : '낙서할 몸체가 없어';
  return '';
}
function prank(by, v, kind) {
  by.prankReady = state.t + tune.prank_cooldown; by.lastVictim = v.i; v.shieldUntil = state.t + tune.pad_shield;
  const s = padStand(v), dx = by.x - v.pad.x, dz = by.z - v.pad.z, l = Math.hypot(dx, dz) || 1;
  for (let k = 0; k < 6; k++) { // footprints in the prankster's shirt colour
    const f = mesh(ball(0.16), mat(by.shirt), s.x + dx / l * k * 0.75 + (k % 2 ? 0.18 : -0.18), 0.05, s.z + dz / l * k * 0.75); f.scale.set(0.8, 0.15, 1.3); f.rotation.y = Math.atan2(dx, dz); dyn.add(f); state.foot.push({ m: f, t: 90 });
  }
  let what = '';
  if (kind === 'loose') { v.loose = true; what = '우주선 나사가 풀렸다!'; }
  if (kind === 'doodle') { v.doodle = true; what = '우주선에 낙서가 생겼다!'; }
  if (kind === 'hide') { const id = v.order.pop(); delete v.parts[id]; v.away[id] = true; by.carry = { owner: v.i, part: id }; what = `${josa(PART[id].name, '이', '가')} 사라졌다!`; refreshActor(by); }
  refreshActor(v); events.push('prank:' + kind);
  if (v === me()) { toast(`내 작업장: ${what} ${by.shirtName}색 발자국이 남았어`, 'bad'); sfx('alarm'); }
}
function stash(by, x, z, chest) { // on the ground where it sparkles, or out of sight in a treasure chest
  const c = by.carry; by.carry = null; refreshActor(by);
  if (chest) { chest.items++; state.hidden.push({ owner: c.owner, part: c.part, x: chest.x, z: chest.z, chest }); showChest(chest); }
  else {
    const g = new THREE.Group(); g.position.set(x, 0, z); const p = partMesh(c.part); p.position.y = 0.4; g.add(p);
    const st = mesh(starGeo(0.22, 0.06), glow(0xfff3a0), 0, 1.5, 0); g.add(st); dyn.add(g);
    state.hidden.push({ owner: c.owner, part: c.part, x, z, g, st });
  }
  if (c.owner === 0) toast(chest ? `내 ${josa(PART[c.part].name, '이', '가')} 보물상자 어딘가에 숨겨졌어. 뚜껑이 들썩이는 상자를 찾자!` : `내 ${josa(PART[c.part].name, '이', '가')} 어딘가에 숨겨졌어. 반짝이는 곳을 찾자!`, 'bad');
}
function showChest(c) { c.g.userData.lid.rotation.x = c.items ? -0.4 : 0; c.g.userData.spark.visible = c.items > 0; }
function unhide(h) { if (h.g) dyn.remove(h.g); if (h.chest) { h.chest.items--; showChest(h.chest); } state.hidden.splice(state.hidden.indexOf(h), 1); }
const beside = h => (h.chest ? { x: h.x, z: h.z + 1.5 } : h);

// ---- Bot friends: the stand-in for classmates --------------------------------------------------
const go = p => ({ go: p }), wait = t => ({ wait: t }), act = fn => ({ fn });
function botThink(a) {
  const T = a.tasks;
  if (a.planStatus === 'none') {
    T.push(go({ x: PLACES.desk.x - 5 + rng() * 9, z: PLACES.desk.z + 2 + rng() * 4 }), wait(tune.bot_plan_time * a.pace), act(() => { a.planStatus = 'sent'; pushPlan(a); }), wait(tune.bot_approve_time), act(() => { a.planStatus = 'ok'; pushPlan(a); }));
    return;
  }
  const h = state.hidden.find(x => x.owner === a.i);
  if (h) { T.push(go(beside(h)), act(() => { if (state.hidden.includes(h)) unhide(h); }), go(padStand(a)), wait(tune.build_time), act(() => install(a, h.part))); return; }
  if (a.loose || a.doodle) { T.push(go(padStand(a)), wait(tune.bot_fix_time), act(() => { a.loose = a.doodle = false; refreshActor(a); })); return; }
  if (state.t >= a.prankReady) {
    if (rng() < tune.bot_prank_chance) {
      const vs = state.actors.filter(v => v !== a && !v.launched && (v.bot || state.t >= tune.first_prank_min) && ['hide', 'loose', 'doodle'].some(k => !canPrank(a, v, k)));
      if (vs.length) { planPrank(a, pick(vs)); return; }
    }
    a.prankReady = state.t + 15; // not this time: think again later
  }
  const next = PART[a.want.find(id => !a.parts[id] && !a.away[id])];
  if (next) { const s = shopStand(SHOP[next.shop]); T.push(go({ x: s.x + rng() - 0.5, z: s.z + rng() - 0.5 }), wait(tune.bot_shop_time * a.pace), go(padStand(a)), wait(tune.build_time), act(() => install(a, next.id))); return; }
  if (!Object.keys(a.away).length) T.push(go({ x: PLACES.launch.x + rng() * 2 - 1, z: PLACES.launch.z + 3 }), wait(1.5), act(() => liftOff(a)));
  else T.push(wait(3));
}
function planPrank(a, v, via) {
  a.tasks.push(go(padStand(v)), act(() => {
    const ks = ['hide', 'loose', 'doodle'].filter(k => !canPrank(a, v, k)); if (!ks.length) return;
    const k = via ? 'hide' : pick(ks); if (via && !ks.includes('hide')) return;
    prank(a, v, k);
    if (k === 'hide') { const i = Math.floor(rng() * HIDE_SPOTS.length), spot = HIDE_SPOTS[i], chest = state.chests[i]; if (via) a.tasks.push(go(via)); a.tasks.push(go({ x: spot.x, z: spot.z + 1.5 }), act(() => { if (a.carry) stash(a, a.x, a.z, chest); })); }
  }));
}
function botStep(a, dt) {
  if (a.launched) return;
  if (!a.tasks.length) botThink(a);
  const k = a.tasks[0]; if (!k) { a.moving = false; return; }
  if (k.go) { const dx = k.go.x - a.x, dz = k.go.z - a.z; if (Math.hypot(dx, dz) < 0.4) { a.tasks.shift(); a.moving = false; } else walk(a, dx, dz, tune.bot_speed * (a.carry ? 1.15 : 1), dt); }
  else if (k.wait !== undefined) { a.moving = false; k.wait -= dt; if (k.wait <= 0) a.tasks.shift(); }
  else { a.tasks.shift(); k.fn(); }
}
function liftOff(a) {
  a.launched = true; a.mesh.visible = false; a.tag.style.transform = 'translate(-999px,0)'; a.rocket.visible = false;
  const r = makeRocket(a.shirt); Object.values(r.userData.parts).forEach(p => { p.visible = true; }); ['oven', 'food', 'scan'].forEach(k => { r.userData.parts[k].visible = false; }); r.userData.ghost.visible = false;
  r.position.set(PLACES.launch.x, 0.4, PLACES.launch.z);
  const fl = mesh(geo('flame', () => new THREE.ConeGeometry(0.6, 2.2, 12)), glow(0xffb347), 0, -0.9, 0); fl.rotation.x = Math.PI; r.add(fl); dyn.add(r);
  state.fx.push({ r, fl, t: 0 }); state.fame.push(a.name); state.hud = '';
  if (a.bot) toast(`${a.name} 발사! (${state.fame.length}번째)`); sfx('launch'); events.push('launch:' + a.name);
}

// ---- What the player can do right here ---------------------------------------------------------
function findNear() {
  const m = me(), R = tune.interact_range; let best = null;
  const offer = (d, o) => { if (d <= (o.range || R) && (!best || d < best.d)) best = Object.assign(o, { d }); };
  if (m.carry) { const c = state.chests.find(c2 => dist(m, c2) < R + 0.3); return c ? { kind: 'stash', label: '상자에 숨기기', x: c.x, z: c.z, y: 2.4, chest: c } : { kind: 'stash', label: '바닥에 숨기기', x: m.x, z: m.z, y: 3.2 }; }
  state.chests.forEach(c => offer(dist(m, c), { kind: 'chest', label: '상자 열기', x: c.x, z: c.z, y: 2.4, ref: c, range: R + 0.3 }));
  state.actors.forEach(a => { if (a.bot && a.carry && a.carry.owner === 0) offer(dist(m, a), { kind: 'catch', label: '잡아라!', x: a.x, z: a.z, y: 3.4, ref: a, range: R + 0.4 }); });
  state.hidden.forEach(h => { if (h.owner === 0 && !h.chest) offer(dist(m, h), { kind: 'find', label: '되찾기', x: h.x, z: h.z, y: 2.2, ref: h }); });
  offer(dist(m, PLACES.gacha), { kind: 'gacha', label: m.mission ? '임무 카드 보기' : '임무 뽑기', x: PLACES.gacha.x, z: PLACES.gacha.z, y: 3.6, range: R + 0.4 });
  offer(dist(m, PLACES.desk), { kind: 'desk', label: m.planStatus === 'ok' ? '내 계획서 보기' : '계획서 쓰기', x: PLACES.desk.x, z: PLACES.desk.z, y: 2.2, range: R + 0.4 });
  keepers.forEach(k => { if (k.id !== 'guide') offer(dist(m, k), { kind: 'keeper', label: '말 걸기', x: k.x, z: k.z, y: 3.7, ref: k }); });
  offer(dist(m, PLACES.launch), { kind: 'launch', label: '발사 점검', x: PLACES.launch.x, z: PLACES.launch.z, y: 2.5, range: 5 });
  state.actors.forEach(a => {
    if (a.launched) return; const d = dist(m, a.pad);
    if (a === m) offer(d, { kind: 'mypad', label: m.loose ? '나사 조이기' : m.doodle ? '낙서 지우기' : state.bag.length && m.planStatus === 'ok' ? '조립하기' : '내 작업장', x: a.pad.x, z: a.pad.z, y: 5.4, range: R + 0.8 });
    else offer(d, { kind: 'pad', label: '기웃거리기', x: a.pad.x, z: a.pad.z, y: 5.4, ref: a, range: R + 0.8 });
  });
  return best;
}
function doAction(n) {
  const m = me();
  if (n.kind === 'stash') {
    const v = state.actors[m.carry.owner];
    if (dist(m, v.pad) < tune.stash_min_dist) { toast('너무 가까워! 더 멀리 가서 숨기자'); sfx('bad'); return; }
    stash(m, m.x + Math.sin(m.face) * 0.9, m.z + Math.cos(m.face) * 0.9, n.chest); toast(n.chest ? '쉿! 상자에 넣고 뚜껑을 닫았다' : '쉿! 바닥에 숨겼다', 'good'); sfx('pop');
  }
  if (n.kind === 'chest') {
    const mine = state.hidden.filter(h => h.chest === n.ref && h.owner === 0);
    if (mine.length) { mine.forEach(h => { unhide(h); state.bag.push(h.part); }); toast(`상자에서 ${josa(mine.map(h => PART[h.part].name).join(', '), '을', '를')} 찾았다! 작업장에 다시 달자`, 'good'); sfx('ok'); state.hud = ''; }
    else if (n.ref.items) say('보물상자', ['친구 물건이 들어 있다. 내 것은 아니니 살짝 닫아 두자.']);
    else { toast('텅 빈 보물상자다. 물건을 숨기기 딱 좋겠는걸'); sfx('blip'); }
  }
  if (n.kind === 'catch') { const a = n.ref, id = a.carry.part; a.carry = null; a.tasks.length = 0; refreshActor(a); state.bag.push(id); toast(`잡았다! ${josa(PART[id].name, '을', '를')} 되찾았어`, 'good'); sfx('ok'); }
  if (n.kind === 'find') { unhide(n.ref); state.bag.push(n.ref.part); toast(`${PART[n.ref.part].name} 찾았다! 작업장에 다시 달자`, 'good'); sfx('pop'); state.hud = ''; }
  if (n.kind === 'gacha') {
    if (!m.mission) { m.mission = pick(MISSIONS); sfx('ok'); events.push('mission:' + m.mission.id); }
    ask('임무 카드', `<canvas class="cardpic" id="cardpic" width="340" height="240"></canvas><b style="font-size:28px">${m.mission.name}</b><br>${m.mission.hint}<br><span style="font-size:18px;color:#8a7fa8">이 임무로 탐사 계획서를 써서 도장을 받자.</span>`, [{ label: '좋아!' }], () => drawMission($('cardpic').getContext('2d'), m.mission.id, 340, 240));
  }
  if (n.kind === 'desk') deskTalk();
  if (n.kind === 'keeper') keeperTalk(n.ref);
  if (n.kind === 'mypad') myPad();
  if (n.kind === 'pad') otherPad(n.ref);
  if (n.kind === 'launch') launchCheck();
}
function deskTalk() {
  const m = me();
  if (!m.mission) return say(GUIDE, ['어서 와! 여긴 탐사 본부야.', '먼저 광장의 뽑기 기계에서 임무 카드를 뽑아 와. 계획서는 그다음!']);
  if (m.planStatus === 'none' || m.planStatus === 'back') return planForm();
  if (m.planStatus === 'sent') return ask(GUIDE, '계획서는 선생님께 갔어. 도장이 찍히면 제작을 시작할 수 있어!', [{ label: '선생님께 보여 드리기', sub: '이 기기에서 바로 확인', fn: teacherReview }, { label: '고쳐서 다시 내기', fn: planForm }, { label: '기다릴게' }]);
  ask(GUIDE, planHtml(state.plan, m.mission.name) + '<span class="stamp ok">승인 도장</span>', [{ label: '닫기' }], null, true);
}
function planHtml(f, mission) {
  return `<b>${esc(f.ship || '')}</b> · ${esc(mission)}<dl style="font-size:18px;margin:8px 0">` + PLAN_FIELDS.slice(1).map(p => `<dt style="color:#8a7fa8;font-size:15px">${p.label}</dt><dd style="margin:0 0 6px">${esc(f[p.key] || '')}</dd>`).join('') + '</dl>';
}
function planForm() {
  const m = me();
  openUI({ kind: 'plan', mid: true });
  $('modal').innerHTML = `<div class="bubble form"><div class="who">우주 탐사 계획서</div><b style="font-size:24px">임무: ${m.mission.name}</b> <span style="font-size:17px;color:#8a7fa8">${m.mission.hint}</span>` +
    (m.planStatus === 'back' && state.planNote ? `<div class="note">선생님 한마디: ${esc(state.planNote)}</div>` : '') +
    PLAN_FIELDS.map(p => `<label>${p.label}</label>` + (p.short ? `<input id="f_${p.key}" maxlength="16" placeholder="${p.ph}">` : `<textarea id="f_${p.key}" maxlength="300" placeholder="${p.ph}"></textarea>`)).join('') +
    `<div class="opts"><button class="opt" id="pSend" style="background:var(--sun)">선생님께 제출하기</button><button class="opt" id="pLater">나중에 쓸게</button></div></div>`;
  PLAN_FIELDS.forEach(p => { $('f_' + p.key).value = state.plan[p.key] || ''; });
  const read = () => PLAN_FIELDS.forEach(p => { state.plan[p.key] = $('f_' + p.key).value.trim(); });
  $('pLater').onclick = () => { read(); closeUI(); };
  $('pSend').onclick = () => {
    read(); let ok = true;
    PLAN_FIELDS.forEach(p => { const bad = state.plan[p.key].length < (p.short ? 1 : tune.plan_min_chars); $('f_' + p.key).classList.toggle('bad', bad); if (bad) ok = false; });
    if (!ok) { sfx('bad'); toast(`빈칸을 채워 줘 (칸마다 ${tune.plan_min_chars}자 이상)`, 'bad'); return; }
    m.planStatus = 'sent'; state.planNote = ''; pushPlan(m); closeUI(); sfx('pop'); events.push('plan-sent');
    say(GUIDE, ['계획서 접수! 선생님께 전달했어.', '도장이 찍힐 때까지 마을을 둘러봐. 친구 작업장에 가면 친구 계획서도 엿볼 수 있어.']);
  };
}
function teacherReview() {
  const m = me();
  ask('선생님 확인', planHtml(state.plan, m.mission.name) + '<input id="tnote" placeholder="학생에게 한마디 (돌려보낼 때)" style="width:100%;box-sizing:border-box;font:inherit;font-size:18px;padding:8px 12px;border-radius:14px;border:3px solid #e6dcc4;-webkit-user-select:text;user-select:text">', [
    { label: '승인 도장 찍기', fn: c => { setStatus('me', 'ok', c.note); pollPlan(); } },
    { label: '돌려보내기', fn: c => { setStatus('me', 'back', c.note || '조금 더 구체적으로 써 보자.'); pollPlan(); } }, { label: '닫기' }], null, true);
}
function keeperTalk(k) {
  const m = me(), s = SHOP[k.id], mine = PARTS.filter(p => p.shop === k.id);
  if (m.planStatus !== 'ok') return say(k.name, [`${s.name}에 어서 와!`, `${mine.map(p => p.item).join(', ')}… 다 있지. 하지만 계획서에 도장을 받아야 줄 수 있어.`]);
  if (state.t < (state.sulk[k.id] || 0)) return say(k.name, [`잠깐만, ${Math.ceil(state.sulk[k.id] - state.t)}초만 있다가 다시 물어봐 줄게.`]);
  const p = PARTS.find(q => !m.parts[q.id] && !m.away[q.id] && !state.bag.includes(q.id)); // the one next thing, in the set order
  if (mine.some(q => m.away[q.id])) return say(k.name, ['어머, 물건을 잃어버렸다고? 반짝이는 곳이나 보물상자를 찾아봐. 새로 줄 순 없어!']);
  if (!p) return say(k.name, ['필요한 건 다 챙겼네! 작업장에서 조립하고 발사대로 가 봐.']);
  if (p.shop !== k.id) { sfx('bad'); return say(k.name, [`잠깐, 순서가 있어! 지금은 ${josa(p.name, '을', '를')} 만들 차례야.`, `${SHOP[p.shop].name}에 가서 ${josa(p.item, '을', '를')} 먼저 구해 와. 우리 가게는 그다음이야!`]); }
  if (state.bag.length >= tune.bag_size) return say(k.name, ['가방이 꽉 찼잖아! 작업장에 가서 조립하고 와.']);
  const order = p.a.map((t, i) => ({ t, ok: i === 0 })); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  ask(k.name, `${josa(p.item, '이', '가')} 필요하구나? 그럼 하나만 맞혀 봐.<br><b>${p.q}</b>`, order.map(o => ({ label: o.t, fn: () => {
    if (o.ok) { state.bag.push(p.id); state.hud = ''; sfx('ok'); events.push('item:' + p.id); say(k.name, [p.fact, `자, ${p.item}! 작업장에서 ${josa(p.name, '을', '를')} 만들어.`]); }
    else { state.sulk[k.id] = state.t + tune.quiz_retry; sfx('bad'); say(k.name, [pick(WRONG_LINES)]); }
  } })));
}
function myPad() {
  const m = me();
  if (m.loose) return repairGame();
  if (m.doodle) { state.act = { kind: 'clean', t: 0, dur: tune.clean_time, label: '낙서 지우는 중…' }; return; }
  if (state.bag.length && m.planStatus === 'ok') { state.act = { kind: 'build', t: 0, dur: tune.build_time, label: `${PART[state.bag[0]].name} 조립 중…` }; return; }
  say('내 작업장', [m.planStatus === 'ok' ? `지금까지 ${count(m)}/10개 완성. 가게에서 재료를 구해 오면 여기서 조립할 수 있어.` : '계획서에 도장을 받으면 여기서 우주선을 만들 수 있어.']);
}
function otherPad(v) {
  const m = me(), o = k => { const why = canPrank(m, v, k); return { off: !!why, sub: why }; };
  ask(`${v.name}의 작업장`, `부품 ${count(v)}/10 · 임무: ${v.mission.name}` + (state.t < v.shieldUntil ? ' · 경보 중' : ''), [
    { label: '계획서 엿보기', fn: () => v.planStatus === 'none' ? say(v.name, ['(아직 계획서를 쓰는 중인가 봐. 책상이 비어 있다.)']) : ask(`${v.name}의 계획서`, planHtml({ ship: v.name + '호', why: v.mission.bot[0], what: v.mission.bot[1], safe: v.mission.bot[2], pack: v.mission.bot[3] }, v.mission.name), [{ label: '닫기' }], null, true) },
    Object.assign({ label: '물건 들고 튀기', fn: () => { prank(m, v, 'hide'); sfx('pop'); toast(`${PART[m.carry.part].name} 획득! 멀리 가서 숨기자`, 'good'); } }, o('hide')),
    Object.assign({ label: '나사 풀기', fn: () => { prank(m, v, 'loose'); sfx('pop'); toast('나사를 슬쩍 풀었다. 튀어!', 'good'); } }, o('loose')),
    Object.assign({ label: '낙서하기', fn: () => { prank(m, v, 'doodle'); sfx('pop'); toast('알록달록 낙서 완성. 튀어!', 'good'); } }, o('doodle')),
    { label: '그냥 갈래' }]);
}
function repairGame() {
  openUI({ kind: 'repair', mid: true, ang: 0, hits: 0, goal: rng() * 6.28, tap: false });
  $('modal').innerHTML = '<div class="bubble" style="width:min(420px,92vw);text-align:center"><div class="who">나사 조이기</div>바늘이 초록 칸에 올 때 누르기!<canvas id="dial" width="440" height="440" style="width:220px;height:220px"></canvas><div id="dialN"></div></div>';
  $('modal').onclick = () => { if (state.ui) state.ui.tap = true; };
}
function launchCheck() {
  const m = me(), n = count(m), miss = [];
  if (m.planStatus !== 'ok') miss.push('계획서 도장');
  ['suit', 'ship', 'cargo'].forEach(g => { const all = PARTS.filter(p => p.group === g), got = all.filter(p => m.parts[p.id]).length; if (got < all.length) miss.push(`${{ suit: '우주복', ship: '우주선', cargo: '짐' }[g]} ${got}/${all.length}`); });
  if (m.loose) miss.push('풀린 나사'); if (m.doodle) miss.push('낙서');
  if (miss.length) return say('발사 관제탑', [`발사 점검 결과… 아직이야! (${n}/10)`, `부족한 것: ${miss.join(', ')}`]);
  ask('발사 관제탑', `모든 점검 통과! <b>${esc(state.plan.ship)}</b>, 발사할까?`, [{ label: '발사!', fn: () => { liftOff(m); state.launching = { t: 0 }; } }, { label: '아직' }]);
}

// ---- Talk bubbles -----------------------------------------------------------------------------
function openUI(u) { state.ui = u; $('modal').className = u.mid ? 'mid' : ''; $('modal').onclick = null; }
function closeUI(quiet) { if (state) state.ui = null; $('modal').className = 'hide'; $('modal').innerHTML = ''; if (!quiet && document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
function say(who, lines, then) {
  openUI({ kind: 'talk', who, lines, i: 0, shown: 0, then });
  $('modal').innerHTML = `<div class="bubble"><div class="who">${esc(who)}</div><div id="line"></div><div class="more">스페이스 · 톡</div></div>`;
  $('modal').onclick = () => { if (state.ui) state.ui.tap = true; };
}
function ask(who, html, opts, after, mid) {
  openUI({ kind: 'ask', who, opts, mid });
  $('modal').innerHTML = `<div class="bubble"><div class="who">${esc(who)}</div><div>${html}</div><div class="opts">` + opts.map((o, i) => `<button class="opt" data-i="${i}" ${o.off ? 'disabled' : ''}><kbd>${i + 1}</kbd>${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('') + '</div></div>';
  $('modal').querySelectorAll('.opt').forEach(b => { b.onclick = () => choose(Number(b.dataset.i)); });
  if (after) after();
}
function choose(i) {
  const u = state.ui; if (!u || u.kind !== 'ask') return; const o = u.opts[i]; if (!o || o.off) return;
  const c = { note: $('tnote') ? $('tnote').value.trim() : '' }; closeUI(); sfx('blip'); if (o.fn) o.fn(c);
}
function uiStep(dt) {
  const u = state.ui, tap = u.tap || pressed('Space') || pressed('Enter'); u.tap = false;
  if (u.kind === 'talk') {
    const line = u.lines[u.i], before = Math.floor(u.shown); u.shown = Math.min(line.length, u.shown + dt * 45);
    if (Math.floor(u.shown) !== before) { $('line').textContent = line.slice(0, Math.floor(u.shown)); if (Math.floor(u.shown) % 3 === 0) sfx('blip'); }
    if (tap) { if (u.shown < line.length) { u.shown = line.length; $('line').textContent = line; } else if (++u.i >= u.lines.length) { closeUI(); if (u.then) u.then(); } else u.shown = 0; }
  } else if (u.kind === 'ask') {
    for (let i = 0; i < u.opts.length; i++) if (pressed('Digit' + (i + 1)) || pressed('Numpad' + (i + 1))) return choose(i);
    if (pressed('Escape')) choose(u.opts.length - 1);
  } else if (u.kind === 'repair') {
    u.ang = (u.ang + dt * tune.repair_speed * 6.283) % 6.283;
    let d = Math.abs(u.ang - u.goal); d = Math.min(d, 6.283 - d);
    if (tap) { if (d < tune.repair_window * Math.PI) { u.hits++; u.goal = rng() * 6.28; sfx('pop'); } else sfx('bad'); }
    const c = $('dial').getContext('2d'); c.clearRect(0, 0, 440, 440); c.lineWidth = 46; c.lineCap = 'butt';
    c.strokeStyle = '#efe6d2'; c.beginPath(); c.arc(220, 220, 170, 0, 6.3); c.stroke();
    c.strokeStyle = '#7fdab0'; c.beginPath(); c.arc(220, 220, 170, u.goal - tune.repair_window * Math.PI, u.goal + tune.repair_window * Math.PI); c.stroke();
    c.strokeStyle = '#4a3d6b'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(220, 220); c.lineTo(220 + Math.cos(u.ang) * 185, 220 + Math.sin(u.ang) * 185); c.stroke();
    c.fillStyle = '#ffd166'; c.beginPath(); c.arc(220, 220, 34, 0, 6.3); c.fill();
    $('dialN').textContent = `${u.hits} / ${tune.repair_hits}`;
    if (u.hits >= tune.repair_hits) { me().loose = false; refreshActor(me()); closeUI(); toast('나사를 꽉 조였다!', 'good'); sfx('ok'); }
  } else if (u.kind === 'plan' && pressed('Escape')) $('pLater').click();
}

// ---- The quest line: always one next thing ---------------------------------------------------------
function quest() {
  const m = me();
  if (state.launching) return { text: '발사!!' };
  if (m.carry) return { text: '들고 튀어! 멀리 가서 바닥이나 보물상자에 숨기자' };
  if (!m.mission) return Object.assign({ text: '광장의 뽑기 기계에서 임무 카드를 뽑자' }, PLACES.gacha);
  if (m.planStatus === 'none') return Object.assign({ text: '본부 책상에서 탐사 계획서를 쓰자' }, PLACES.desk);
  if (m.planStatus === 'back') return Object.assign({ text: '계획서가 돌아왔어! 책상에서 고쳐 쓰자' }, PLACES.desk);
  if (m.planStatus === 'sent') return Object.assign({ text: '도장을 기다리는 중… 책상에서 선생님께 보여 드리자' }, PLACES.desk);
  const th = state.actors.find(a => a.carry && a.carry.owner === 0);
  if (th) return { text: `${josa(th.name, '이', '가')} 내 ${josa(PART[th.carry.part].name, '을', '를')} 들고 튄다! 잡아라!`, x: th.x, z: th.z };
  const h = state.hidden.find(x => x.owner === 0);
  if (h) return h.chest ? { text: `내 ${josa(PART[h.part].name, '이', '가')} 보물상자에! 뚜껑이 들썩이는 상자를 찾자 (축소해서 둘러보기)` } : { text: `숨겨진 ${josa(PART[h.part].name, '을', '를')} 찾아오자! 반짝이는 곳`, x: h.x, z: h.z };
  if (m.loose) return Object.assign({ text: '내 작업장 나사가 풀렸어! 조이러 가자' }, m.pad);
  if (m.doodle) return Object.assign({ text: '내 우주선에 낙서가! 지우러 가자' }, m.pad);
  const next = PARTS.find(p => !m.parts[p.id] && !m.away[p.id] && !state.bag.includes(p.id));
  if (state.bag.length && (!next || state.bag.length >= tune.bag_size)) return Object.assign({ text: '내 작업장에서 조립하자' }, m.pad);
  if (next) { const s = SHOP[next.shop], k = keeperSpot(s); return { text: `${s.name}에서 ${next.item} 구하기` + (state.bag.length ? ' (또는 작업장에서 조립)' : ''), x: k.x, z: k.z }; }
  return Object.assign({ text: '준비 끝! 북쪽 발사대로 가자' }, PLACES.launch);
}

// ---- Scenes ---------------------------------------------------------------------------------------
function setScene(s) {
  scene = s; const play = s === 'play' || s === 'pause';
  ['parts', 'quest', 'top', 'bag', 'act', 'stick', 'toasts', 'zoomer'].forEach(id => $(id).classList.toggle('hide', !play));
  $('title').classList.toggle('hide', s !== 'title'); $('pause').classList.toggle('hide', s !== 'pause'); $('results').classList.toggle('hide', s !== 'results');
  if (s !== 'play') { $('ring').classList.add('hide'); $('prompt').style.transform = 'translate(-999px,0)'; }
  if (s === 'figures') buildLineup();
}
function start() { reset(); setScene('play'); sfx('ok'); }
function setZoom(dir) { zoom = Math.max(tune.zoom_min, Math.min(tune.zoom_max, zoom * Math.pow(tune.zoom_step, dir))); if (Math.abs(zoom - 1) < 0.12) zoom = 1; }
function view(x, z, up = 0, back = 0) { // the camera at the current zoom; far out, the ground flattens into a map
  const Z = zoomNow; lookAtSpot(x, z, tune.cam_height * Z + up, tune.cam_back * Math.pow(Z, 0.8) + back);
  BEND.uCurve.value = tune.curve / (Z * Z); W3.scene.fog.near = 48 * Z; W3.scene.fog.far = 110 * Z;
}
function playStep(dt) {
  const m = me(); state.t += dt;
  if (Math.floor(state.t * 2) !== Math.floor((state.t - dt) * 2)) pollPlan();
  if (state.ui) uiStep(dt);
  else if (state.launching) { /* watching the rocket */ }
  else if (state.act) {
    const a = state.act; a.t += dt; m.moving = false;
    if (a.t >= a.dur) {
      state.act = null;
      if (a.kind === 'clean') { m.doodle = false; refreshActor(m); toast('반짝반짝! 낙서를 다 지웠다', 'good'); sfx('ok'); }
      else { const id = state.bag.shift(); install(m, id); sfx('ok'); state.score = count(m); toast(`${PART[id].name} 완성! (${count(m)}/10)`, 'good'); events.push('built:' + id); if (state.bag.length) state.act = { kind: 'build', t: 0, dur: tune.build_time, label: `${PART[state.bag[0]].name} 조립 중…` }; }
    }
  } else {
    let dx = state.joy.x, dz = state.joy.z;
    if (down.has('ArrowLeft') || down.has('KeyA')) dx -= 1; if (down.has('ArrowRight') || down.has('KeyD')) dx += 1;
    if (down.has('ArrowUp') || down.has('KeyW')) dz -= 1; if (down.has('ArrowDown') || down.has('KeyS')) dz += 1;
    walk(m, dx, dz, tune.walk_speed * Math.min(1, Math.hypot(dx, dz)), dt);
    state.near = findNear();
    if (state.near && (pressed('Space') || pressed('Enter') || pressed('KeyE'))) doAction(state.near);
    if (pressed('Equal') || pressed('NumpadAdd')) setZoom(-1); if (pressed('Minus') || pressed('NumpadSubtract')) setZoom(1);
    if (pressed('KeyP') || pressed('Escape')) { setScene('pause'); return; }
  }
  if (state.ui || state.act || state.launching) { m.moving = false; state.near = null; }
  if (!state.staged && state.t >= tune.staged_prank_at && state.actors.length > 2) { // the first minute: a friend runs off with a friend's hull
    state.staged = true; const th = state.actors[2], v = state.actors[1];
    if (!canPrank(Object.assign({}, th, { prankReady: 0 }), v, 'hide')) { th.prankReady = 0; th.tasks.length = 0; planPrank(th, v, { x: -1.5, z: 2 }); th.tasks.push(act(() => toast(`어? ${josa(th.name, '이', '가')} ${v.name}의 ${josa(PART.hull.name, '을', '를')} 들고 튄다!`))); const t0 = th.tasks.pop(); th.tasks.splice(1, 0, t0); }
  }
  state.actors.forEach(a => { if (a.bot) botStep(a, dt); });
  state.actors.forEach(a => {
    if (a.launched) return;
    a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = a.face; animateKid(a.mesh, a.moving, dt, state.t);
    const u = a.rocket.userData; u.tilt.rotation.z = a.loose ? 0.2 + Math.sin(state.t * 5 + a.i) * 0.04 : 0;
  });
  state.hidden.forEach(h => { if (h.st) { h.st.rotation.y += dt * 3; h.st.position.y = 1.5 + Math.sin(state.t * 4) * 0.15; } });
  state.chests.forEach(c => { if (c.items) { const u = c.g.userData; u.lid.rotation.x = -0.3 - Math.abs(Math.sin(state.t * 5)) * 0.25; u.spark.rotation.y = state.t * 3; } });
  zoomNow += (zoom - zoomNow) * 0.15;
  state.foot = state.foot.filter(f => { f.t -= dt; if (f.t <= 0) dyn.remove(f.m); return f.t > 0; });
  state.fx = state.fx.filter(f => { f.t += dt; f.r.position.y = 0.4 + f.t * f.t * 1.4; f.fl.scale.set(1, 0.8 + Math.sin(f.t * 50) * 0.3, 1); f.r.rotation.y += dt * 0.6; if (f.t > 8) dyn.remove(f.r); return f.t <= 8; });
  const before = state.toasts.length; state.toasts = state.toasts.filter(t => (t.t -= dt) > 0); if (state.toasts.length !== before) state.hud = '';
  W3.twinkles.forEach(s => { s.scale.setScalar(0.75 + Math.sin(state.t * 3 + s.userData.k) * 0.3); s.rotation.y = state.t + s.userData.k; });
  W3.planet.position.x = 150 - (state.t * 1.2) % 300; W3.planet.rotation.y = state.t * 0.05;
  const q = quest(); state.questText = q.text;
  marker.visible = q.x !== undefined; if (marker.visible) { marker.position.set(q.x, 4.6 + zoomNow + Math.sin(state.t * 4) * 0.25, q.z); marker.rotation.y = state.t * 2.5; marker.scale.setScalar(1 + (zoomNow - 1) * 0.5); }
  if (state.launching) {
    const L = state.launching; L.t += dt; zoom = 1; view(PLACES.launch.x, PLACES.launch.z + 5, L.t * 0.8, 3);
    if (L.t > 5) finish();
  } else view(m.x, m.z);
}
function finish() {
  const m = me(), rank = state.fame.indexOf(m.name) + 1;
  state.gained = `${rank}번째로 발사 성공! 임무: ${m.mission.name}`; state.score = 10;
  $('results').innerHTML = `<div class="panel"><b style="font-size:30px">발사 성공! ${state.actors.length}명 중 ${rank}번째로 우주에 나갔어요</b><canvas id="pic" width="1400" height="560"></canvas>
    <div style="margin-top:10px"><b>${esc(state.plan.ship)}</b>의 임무 일지 · ${m.mission.name}</div><div style="font-weight:400;font-size:18px">${esc(state.plan.what)}</div>
    <div style="margin-top:8px">명예의 전당</div><ol id="fame">${state.fame.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div><button class="big" id="bAgain">다시 하기 (Enter)</button>`;
  drawMission($('pic').getContext('2d'), m.mission.id, 1400, 560); $('bAgain').onclick = start;
  setScene('results'); sfx('ok');
}
function drawWorld() {
  W3.r.render(W3.scene, W3.cam);
  // Name tags: me first, then places, then whoever is near. A tag never covers the HUD or another tag.
  const m = me(), play = scene === 'play' || scene === 'pause', list = [], taken = [], off = el => { el.style.transform = 'translate(-999px,0)'; };
  if (play) ['parts', 'questbox', 'top', 'bag', 'act', 'zoomer', 'stickBase'].forEach(id => { const b = $(id).getBoundingClientRect(); if (b.width) taken.push([b.left - 6, b.top - 6, b.right + 6, b.bottom + 6]); });
  const n = state.near, pr = $('prompt');
  if (n && scene === 'play') { pr.textContent = n.label; const p = toScreen(n.x, n.y, n.z), w = pr.offsetWidth; pr.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`; taken.push([p.x - w / 2 - 4, p.y - 40, p.x + w / 2 + 4, p.y + 2]); } else off(pr);
  const put = (el, x, y, z, pri) => list.push({ el, x, y, z, pri }), close = zoomNow < 1.9;
  if (!m.launched) put(m.tag, m.x, 2.75 * Math.max(1, zoomNow * 0.7), m.z, 0);
  places.forEach(p => put(p.tag, p.x, p.y, p.z, p.mine ? 1 : 2));
  keepers.forEach(k => { if (close && dist(m, k) < 13) put(k.tag, k.x, k.y, k.z, 3); else off(k.tag); });
  state.actors.forEach(a => { if (!a.bot) return; const d = dist(m, a); if (!a.launched && close && d < 15) put(a.tag, a.x, 2.75, a.z, 4 + d); else off(a.tag); });
  list.sort((a, b) => a.pri - b.pri).forEach(o => {
    const p = toScreen(o.x, o.y, o.z), w = o.el._w, tries = o.pri <= 2 ? 3 : 1; if (!p.on) return off(o.el);
    let y = p.y, r = null;
    for (let i = 0; i < tries; i++, y -= 30) { const q = [p.x - w / 2, y - 28, p.x + w / 2, y]; if (!taken.some(t => q[0] < t[2] && t[0] < q[2] && q[1] < t[3] && t[1] < q[3])) { r = q; break; } }
    if (!r) return off(o.el);
    taken.push(r); o.el.style.transform = `translate(${Math.round(p.x)}px,${Math.round(r[3])}px) translate(-50%,-100%)`;
  });
}
function drawHud() {
  const m = me(), n = state.near;
  const b = $('act'); b.textContent = n ? n.label : '행동'; b.classList.toggle('dim', !n);
  const a = state.act; $('ring').classList.toggle('hide', !a); if (a) { $('ring').firstElementChild.textContent = a.label; $('ring').querySelector('b').style.width = Math.round(a.t / a.dur * 100) + '%'; }
  const key = [state.questText, PARTS.map(p => m.parts[p.id] ? 1 : state.bag.includes(p.id) ? 2 : 0).join(''), state.bag.join(), state.fame.length, state.toasts.map(t => t.msg).join('|')].join('#');
  if (key === state.hud) return; state.hud = key;
  $('quest').textContent = state.questText;
  $('rank').textContent = `발사 ${state.fame.length}/${state.actors.length}`;
  const P = $('parts'); if (P.children.length !== PARTS.length) { P.innerHTML = ''; PARTS.forEach(p => { const c = document.createElement('canvas'); c.width = c.height = 68; P.appendChild(c); icon(c.getContext('2d'), p.id); }); }
  PARTS.forEach((p, i) => { P.children[i].className = m.parts[p.id] ? 'on' : state.bag.includes(p.id) ? '' : 'off'; });
  const B = $('bag'); B.innerHTML = '가방 '; for (let i = 0; i < Math.max(tune.bag_size, state.bag.length); i++) { if (state.bag[i]) { const c = document.createElement('canvas'); c.width = c.height = 68; B.appendChild(c); icon(c.getContext('2d'), state.bag[i]); } else { const d = document.createElement('div'); d.className = 'slot'; B.appendChild(d); } }
  $('toasts').innerHTML = state.toasts.slice(-3).map(t => `<div class="toast ${t.kind}">${esc(t.msg)}</div>`).join('');
}
const scenes = {
  figures: { update(dt) { state.t += dt; }, draw() { W3.cam.position.set(0, 5, 326); W3.cam.lookAt(0, 1.7, 300); BEND.uCamZ.value = 250; W3.r.render(W3.scene, W3.cam); lineup.forEach((f, i) => { const p = toScreen(f.x, -0.25 - (i % 2) * 0.75, 300); f.tag.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,0)`; }); } },
  title: {
    update(dt) { state.t += dt; W3.planet.position.x = 150 - (state.t * 1.2) % 300; state.actors.forEach(a => { a.mesh.position.set(a.x, 0, a.z); animateKid(a.mesh, false, dt, state.t); }); zoomNow = 1; view(0, 3); if (pressed('Enter') || pressed('Space')) start(); },
    draw() { drawWorld(); },
  },
  play: { update: playStep, draw() { drawWorld(); drawHud(); } },
  pause: { update() { if (pressed('KeyP') || pressed('Escape') || pressed('Enter')) setScene('play'); }, draw() { drawWorld(); } },
  results: { update(dt) { state.t += dt; if (pressed('Enter')) start(); }, draw() { drawWorld(); } },
};

// ---- The figures sheet: every kind of figure side by side, named ---------------------------------
function buildLineup() {
  if (lineup) return; lineup = []; closeUI(true);
  const floor = mesh(cyl(22, 22, 0.2, 48), mat(0x9fe6c3), 0, -0.1, 300); dyn.add(floor);
  const add = (m, name) => { const x = (lineup.length - 6) * 2.25; m.position.set(x, 0, 300); dyn.add(m); lineup.push({ x, tag: tag(name, 'npc') }); };
  ['학생: 앞머리', '학생: 뾰족머리', '학생: 동글머리', '학생: 묶음머리', '학생: 모자'].forEach((n, i) => add(makeKid({ shirt: SHIRTS[i], hair: i, hairColor: HAIR[i] }), n));
  const s = makeKid({ shirt: SHIRTS[6], hair: 0, hairColor: HAIR[1] }); dressKid(s, { suit: 1, outer: 1, helmet: 1 }); add(s, '우주복 학생');
  SHOPS.forEach(sh => add(makeKeeper(sh.id), sh.keeper)); add(makeKeeper('guide'), GUIDE);
}

// ---- Small pictures: part icons and mission scenes, all drawn ------------------------------------
function icon(c, id) {
  c.clearRect(0, 0, 68, 68); c.lineWidth = 5; c.lineJoin = c.lineCap = 'round'; c.strokeStyle = '#4a3d6b'; c.fillStyle = '#fff';
  const R = (x, y, w, h, r, f) => { c.beginPath(); c.roundRect(x, y, w, h, r); if (f) { c.fillStyle = f; c.fill(); } c.stroke(); };
  const O = (x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 6.3); if (f) { c.fillStyle = f; c.fill(); } c.stroke(); };
  const L = (...p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  if (id === 'suit') { R(22, 22, 24, 34, 8, '#f6f7ff'); L(22, 28, 10, 44); L(46, 28, 58, 44); O(34, 15, 8, '#ffe1c8'); }
  if (id === 'outer') { c.beginPath(); c.moveTo(34, 8); c.lineTo(56, 18); c.lineTo(52, 44); c.lineTo(34, 60); c.lineTo(16, 44); c.lineTo(12, 18); c.closePath(); c.fillStyle = '#dfe3f5'; c.fill(); c.stroke(); L(34, 20, 34, 46); }
  if (id === 'helmet') { O(34, 32, 22, '#bfe9ff'); R(18, 50, 32, 9, 4, '#f6f7ff'); L(22, 26, 28, 18); }
  if (id === 'hull') { c.beginPath(); c.moveTo(34, 6); c.quadraticCurveTo(54, 26, 48, 60); c.lineTo(20, 60); c.quadraticCurveTo(14, 26, 34, 6); c.fillStyle = '#fff5e1'; c.fill(); c.stroke(); O(34, 30, 7, '#bfe9ff'); }
  if (id === 'engine') { c.beginPath(); c.moveTo(24, 12); c.lineTo(44, 12); c.lineTo(54, 40); c.lineTo(14, 40); c.closePath(); c.fillStyle = '#ff8a73'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(22, 44); c.lineTo(34, 62); c.lineTo(46, 44); c.fillStyle = '#ffd166'; c.fill(); c.stroke(); }
  if (id === 'antenna') { L(34, 60, 34, 22); O(34, 16, 7, '#ffd166'); c.beginPath(); c.arc(34, 16, 17, -2.4, -0.7); c.stroke(); L(20, 60, 48, 60); }
  if (id === 'nav') { c.beginPath(); c.moveTo(34, 60); c.quadraticCurveTo(10, 30, 34, 8); c.quadraticCurveTo(58, 30, 34, 60); c.fillStyle = '#9fe0c6'; c.fill(); c.stroke(); O(34, 28, 7, '#fff'); }
  if (id === 'oven') { R(8, 16, 52, 38, 8, '#fff'); R(14, 22, 28, 26, 5, '#7d93b5'); O(51, 28, 3, '#ffa26b'); O(51, 42, 3, '#95e1a3'); }
  if (id === 'food') { R(16, 12, 36, 46, 8, '#ffd166'); L(16, 22, 52, 22); O(34, 40, 8, '#ff8fa3'); }
  if (id === 'scan') { c.lineWidth = 12; c.strokeStyle = '#f7e08a'; c.beginPath(); c.arc(34, 30, 17, 0, 6.3); c.stroke(); c.lineWidth = 5; c.strokeStyle = '#4a3d6b'; O(34, 30, 23); O(34, 30, 11); R(12, 54, 44, 8, 4, '#fff'); }
}
function drawMission(c, id, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2e2559'); g.addColorStop(1, '#7a64b8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  c.fillStyle = '#fff6d8'; for (let i = 0; i < 70; i++) { c.beginPath(); c.arc(r() * w, r() * h * 0.7, 1 + r() * h * 0.006, 0, 6.3); c.fill(); }
  const u = h / 100, O = (x, y, q, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, q, 0, 6.3); c.fill(); };
  const ground = f => { c.fillStyle = f; c.beginPath(); c.ellipse(w / 2, h * 1.55, w * 0.9, h * 0.85, 0, 0, 6.3); c.fill(); };
  const rocket = (x, y, k) => { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = '#fff5e1'; c.beginPath(); c.moveTo(0, -9 * u); c.quadraticCurveTo(6 * u, -2 * u, 4 * u, 7 * u); c.lineTo(-4 * u, 7 * u); c.quadraticCurveTo(-6 * u, -2 * u, 0, -9 * u); c.fill(); O(0, -1 * u, 1.8 * u, '#bfe9ff'); c.fillStyle = '#ff8a73'; c.fillRect(-5 * u, 6 * u, 10 * u, 2.4 * u); c.restore(); };
  if (id === 'moon') { ground('#d8d4e8'); [[0.2, 0.86, 5], [0.7, 0.92, 7], [0.45, 0.8, 3]].forEach(([x, y, q]) => { c.fillStyle = '#bcb6d4'; c.beginPath(); c.ellipse(w * x, h * y, q * u * 2, q * u * 0.7, 0, 0, 6.3); c.fill(); }); O(w * 0.82, h * 0.24, 9 * u, '#7cc6fe'); O(w * 0.8, h * 0.22, 4 * u, '#95e1a3'); c.fillStyle = 'rgba(191,233,255,.6)'; c.beginPath(); c.arc(w * 0.5, h * 0.78, 20 * u, Math.PI, 0); c.fill(); c.fillStyle = '#fff5e1'; c.fillRect(w * 0.5 - 8 * u, h * 0.68, 16 * u, 10 * u); rocket(w * 0.24, h * 0.66, 1.2); }
  if (id === 'mars') { ground('#f0a070'); O(w * 0.75, h * 0.86, 6 * u, '#d9865a'); c.fillStyle = '#fff5e1'; c.fillRect(w * 0.36, h * 0.6, 22 * u, 9 * u); [0.38, 0.47, 0.56].forEach(x => O(w * x + 2 * u, h * 0.72, 3 * u, '#4a3d6b')); c.fillRect(w * 0.42, h * 0.48, 2 * u, 12 * u); O(w * 0.43, h * 0.46, 3 * u, '#bfe9ff'); O(w * 0.66, h * 0.7, 5 * u, '#95e1a3'); O(w * 0.655, h * 0.69, 1 * u, '#4a3d6b'); O(w * 0.675, h * 0.69, 1 * u, '#4a3d6b'); }
  if (id === 'mine') { c.fillStyle = '#9a8fb5'; c.beginPath(); c.ellipse(w / 2, h * 0.68, 34 * u, 22 * u, 0.2, 0, 6.3); c.fill(); O(w * 0.4, h * 0.62, 5 * u, '#857aa3'); O(w * 0.6, h * 0.76, 7 * u, '#857aa3'); c.fillStyle = '#ff8a73'; c.fillRect(w * 0.5 - 1.5 * u, h * 0.3, 3 * u, 20 * u); c.fillStyle = '#fff5e1'; c.fillRect(w * 0.5 - 7 * u, h * 0.27, 14 * u, 5 * u); [[0.44, 0.52], [0.57, 0.56], [0.5, 0.6]].forEach(([x, y]) => O(w * x, h * y, 2 * u, '#ffe14d')); rocket(w * 0.78, h * 0.3, 1); }
  if (id === 'home') { O(w * 0.5, h * 0.72, 36 * u, '#7cc6fe'); O(w * 0.42, h * 0.6, 12 * u, '#95e1a3'); O(w * 0.6, h * 0.74, 9 * u, '#95e1a3'); O(w * 0.5, h * 0.48, 5 * u, '#fff'); O(w * 0.2, h * 0.3, 5 * u, '#ffc8a2'); O(w * 0.84, h * 0.4, 3 * u, '#cdb4ff'); rocket(w * 0.74, h * 0.22, 1); }
  if (id === 'deep') { O(w * 0.14, h * 0.6, 7 * u, '#ffd166'); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = u * 0.6; [16, 28, 42, 58].forEach(q => { c.beginPath(); c.ellipse(w * 0.14, h * 0.6, q * u, q * u * 0.45, 0, 0, 6.3); c.stroke(); }); c.setLineDash([u * 2, u * 2]); c.beginPath(); c.moveTo(w * 0.2, h * 0.58); c.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.8, h * 0.3); c.stroke(); c.setLineDash([]); c.save(); c.translate(w * 0.82, h * 0.28); c.rotate(1.0); rocket(0, 0, 1.1); c.restore(); }
  if (id === 'orbit') { O(w * 0.5, h * 1.7, 100 * u, '#7cc6fe'); O(w * 0.4, h * 0.98, 14 * u, '#95e1a3'); c.strokeStyle = '#fff5e1'; c.lineWidth = 5 * u; c.beginPath(); c.ellipse(w * 0.5, h * 0.42, 26 * u, 10 * u, -0.2, 0, 6.3); c.stroke(); O(w * 0.5, h * 0.42, 6 * u, '#ff8a73'); [-1, 1].forEach(k => { c.fillStyle = '#5b7fd6'; c.fillRect(w * 0.5 + k * 34 * u - 6 * u, h * 0.4 - k * 6 * u, 12 * u, 5 * u); }); rocket(w * 0.2, h * 0.3, 0.9); }
}

// ---- Buttons and the stick -------------------------------------------------------------------------
SHIRTS.slice(0, 8).forEach((c, i) => { const b = document.createElement('button'); b.style.background = '#' + c.toString(16).padStart(6, '0'); b.className = i === myShirt ? 'on' : ''; b.onclick = () => { myShirt = i; [...$('swatches').children].forEach((x, j) => x.classList.toggle('on', j === i)); reset(); }; $('swatches').appendChild(b); });
$('bStart').onclick = start; $('bResume').onclick = () => setScene('play');
$('bPause').onclick = () => { if (scene === 'play' && !state.ui) setScene('pause'); };
$('bMute').onclick = () => setMuted(!muted);
$('bIn').onclick = () => setZoom(-1); $('bOut').onclick = () => setZoom(1);
addEventListener('wheel', e => { if (scene === 'play' && !state.ui) setZoom(e.deltaY > 0 ? 1 : -1); }, { passive: true });
$('act').addEventListener('pointerdown', e => { e.preventDefault(); hit.add('Space'); });
(function stick() {
  const el = $('stick'), base = $('stickBase'), knob = $('stickKnob'); let id = null;
  const move = e => { const r = base.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / 50, z = (e.clientY - r.top - r.height / 2) / 50; const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; } state.joy.x = x; state.joy.z = z; knob.style.transform = `translate(${x * 38}px,${z * 38}px)`; };
  el.addEventListener('pointerdown', e => { id = e.pointerId; el.setPointerCapture(id); move(e); });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = e => { if (e.pointerId === id) { id = null; state.joy.x = state.joy.z = 0; knob.style.transform = ''; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
})();

// ---- The teacher's page (?teacher=1): every plan sent in this browser ------------------------------
function teacherPage() {
  $('ui').classList.add('hide'); $('game').classList.add('hide');
  const root = document.createElement('div'); root.id = 'teacher'; document.body.appendChild(root); let seen = '';
  const draw = () => {
    const raw = JSON.stringify(loadPlans()); if (raw === seen || (document.activeElement && document.activeElement.tagName === 'INPUT')) return; seen = raw;
    const all = loadPlans(), ids = Object.keys(all).sort((a, b) => (a === 'me' ? -1 : b === 'me' ? 1 : 0)), word = { sent: '확인 대기', ok: '승인', back: '돌려보냄', none: '작성 중' };
    root.innerHTML = '<h1>우주의 숲 · 선생님 화면</h1><div>학생이 낸 탐사 계획서를 읽고 도장을 찍어 주세요. 이 화면은 같은 기기, 같은 브라우저에서 낸 계획서만 보여 줍니다.</div>' +
      (ids.length ? '' : '<div class="plan">아직 제출된 계획서가 없습니다.</div>') + ids.map(id => { const p = all[id];
        return `<div class="plan"><h2>${esc(p.name)} ${p.bot ? '<span class="stamp">봇</span>' : ''} <span class="stamp ${p.status}">${word[p.status]}</span></h2>임무: ${esc(p.mission)} · 우주선: ${esc(p.fields.ship || '')}<dl>` +
          PLAN_FIELDS.slice(1).map(f => `<dt>${f.label}</dt><dd>${esc(p.fields[f.key] || '')}</dd>`).join('') + '</dl>' +
          (p.bot ? '' : `<div class="row"><input id="n_${id}" placeholder="학생에게 한마디" value="${esc(p.note || '')}"><button class="btn" data-id="${id}" data-s="ok">승인 도장</button><button class="btn" data-id="${id}" data-s="back">돌려보내기</button></div>`) + '</div>'; }).join('');
    root.querySelectorAll('button').forEach(b => { b.onclick = () => { setStatus(b.dataset.id, b.dataset.s, $('n_' + b.dataset.id).value.trim()); seen = ''; draw(); }; });
  };
  draw(); setInterval(draw, 1000); addEventListener('storage', draw);
}
