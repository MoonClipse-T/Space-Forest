// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: the rules. Draw a mission, get the plan stamped, fetch parts from the textbook
// shops, build, prank and get pranked, launch. Everything runs on the fixed step.
'use strict';

const PART = Object.fromEntries(PARTS.map(p => [p.id, p]));
const SHOP = Object.fromEntries(SHOPS.map(s => [s.id, s]));
const GUIDE = '도장 로봇';
let dyn = null, marker = null, COL = [], keepers = [], places = [], lineup = null, myShirt = 1, zoom = 1, zoomNow = 1;
const me = () => state.actors[0];
// 깍두기: 선생님이 반 친구들 사이에 들어와 같이 노는 캐릭터. 모든 게임을 순서 없이 해 볼 수 있고, 무엇이든 바로 통과할 수 있다.
// 선생님 방의 [깍두기로 들어가기](주소 끝 &kk=1)로 들어오고, 선생님 암호를 한 번 넣는다.
const KK_URL = params.get('kk') === '1';
let KK = false;
const kkOK = () => { try { return sessionStorage.getItem('sf:teacher') === '1'; } catch (e) { return false; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const pick = arr => arr[Math.floor(rng() * arr.length)];
const keeperSpot = s => ({ x: s.x + (s.x < 0 ? 2.3 : -2.3), z: s.z + 3.8 });
const shopStand = s => ({ x: s.x + (s.x < 0 ? 3.7 : -3.7), z: s.z + 4.9 });
const padStand = a => ({ x: a.pad.x + 1.6, z: a.pad.z + 2.0 });
const eraParts = e => PARTS.filter(p => p.era === e);
const ER = a => ERAS[a.stage];
const total = a => eraParts(a.stage).length;
const fmt = t => `${Math.floor(t / 60)}분 ${String(Math.floor(t % 60)).padStart(2, '0')}초`;
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && (c - 0xac00) % 28 ? a : b); };

// ---- Sound ------------------------------------------------------------------------------
function sfx(k) {
  if (k === 'pop') { tone(660, 0.08, 'sine', 0.25); tone(990, 0.1, 'sine', 0.2, 0.06); }
  if (k === 'ok') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, i * 0.09));
  if (k === 'bad') { tone(220, 0.2, 'square', 0.12); tone(180, 0.25, 'square', 0.12, 0.12); }
  if (k === 'blip') tone(520 + (state.t * 997 % 180), 0.04, 'triangle', 0.1);
  if (k === 'stamp') { tone(140, 0.15, 'square', 0.25); tone(880, 0.3, 'triangle', 0.2, 0.1); }
  if (k === 'launch') for (let i = 0; i < 14; i++) tone(90 + i * 22, 0.3, 'sawtooth', 0.1, i * 0.12);
  if (k === 'warp') [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'sine', 0.2, i * 0.07));
  if (k === 'alarm') [880, 660, 880, 660].forEach((f, i) => tone(f, 0.12, 'square', 0.1, i * 0.13));
}
// ---- Music: each island its own track (files the teacher chose), started by the first press ----------
const BGM = ['assets/bgm-stone.mp3', 'assets/bgm-iron.mp3', 'assets/bgm-steam.mp3', 'assets/bgm-space.mp3'], tracks = [];
let bgmOn = -1;
function music(e) { // switch to island e's track; quiet while muted
  const v = muted ? 0 : tune.volume * 0.5;
  if (bgmOn !== e && audio) { if (tracks[bgmOn]) tracks[bgmOn].pause(); bgmOn = e; const t = tracks[e] || (tracks[e] = Object.assign(new Audio(BGM[e]), { loop: true })); t.currentTime = 0; t.volume = v; t.play().catch(() => { bgmOn = -1; }); }
  if (tracks[bgmOn]) tracks[bgmOn].volume = v;
}
function toast(msg, kind) { state.toasts.push({ msg, kind: kind || '', t: 4.5 }); state.hud = ''; }

// ---- The teacher's stamp: kept in this browser, shared by its tabs ----------------------------
const KEY = 'sf_plans';
function loadPlans() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function savePlans(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* no storage: the in-game stamp still works */ } }
function pushReq(a, e) { // bots are stamped in their own heads; only the player's papers go to the teacher
  if (a.bot) return; const all = loadPlans();
  const entry = e === 3 ? { name: a.name, stage: 3, kind: 'plan', mission: a.mission.name, fields: state.plan, status: a.planStatus, note: state.planNote }
    : { name: a.name, stage: e, kind: 'test', fields: state.tests[e], img: state.tests[e].img || '', status: a.testStatus, note: state.testNote };
  if (MP.on) return MP.net.set('req/' + MP.id, entry);
  all['me:' + e] = entry; savePlans(all);
}
function setStatus(id, status, note) {
  if (MP.on) { if (MP.req) MP.net.set('req/' + MP.id, Object.assign({}, MP.req, { status, note: note || '' })); return; }
  const all = loadPlans(); if (all[id]) { all[id].status = status; all[id].note = note || ''; savePlans(all); }
}
function pollReq() { if (!MP.on) applyReq(loadPlans()['me:' + me().stage]); }
function applyReq(p) { // the teacher said OK, or sent it back
  const m = me(), e = m.stage; if (!p || p.stage !== e) return;
  if (e === 3) {
    if (m.planStatus !== 'sent') return;
    if (p.status === 'ok') { m.planStatus = 'ok'; toast('계획서 통과! 도장 쾅! 이제 만들러 가자', 'good'); sfx('stamp'); events.push('approved'); }
    if (p.status === 'back') { m.planStatus = 'back'; state.planNote = p.note; toast('계획서가 돌아왔어. 책상에서 고쳐 쓰자', 'bad'); sfx('bad'); }
  } else if (m.testStatus === 'sent') {
    if (p.status === 'ok') { events.push('approved:' + e); advance(m); }
    if (p.status === 'back') { m.testStatus = 'back'; state.testNote = p.note; toast(`그림이 돌아왔어. ${ERAS[e].chief}에게 가서 다시 그려 보자`, 'bad'); sfx('bad'); }
  }
}

// ---- A new game -----------------------------------------------------------------------------
function reset() {
  seed = Number(params.get('seed')) || CONFIG.seed;
  if (dyn) W3.scene.remove(dyn);
  dyn = new THREE.Group(); W3.scene.add(dyn); $('tags').innerHTML = ''; lineup = null;
  closeUI(true); if (!MP.on) savePlans({});
  state = { sparks: [], warp: null, tries: {}, t: 0, score: 0, gained: '', actors: [], hidden: [], chests: [], foot: [], fx: [], toasts: [], bag: [], ui: null, act: null, fame: [], plan: {}, planNote: '', tests: {}, testNote: '', met: {}, seenEra: -1, sulk: {}, staged: false, near: null, launching: null, joy: { x: 0, z: 0 }, hud: '', questText: '' };
  COL = [{ x: PLACES.hq.x, z: PLACES.hq.z, r: 4.7 }, { x: PLACES.gacha.x, z: PLACES.gacha.z, r: 1.2 }, { x: PLACES.desk.x, z: PLACES.desk.z, r: 1.4 }, { x: PLACES.desk.x + 2.6, z: PLACES.desk.z + 0.2, r: 0.7 }];
  SHOPS.forEach(s => { COL.push({ x: s.x, z: s.z, r: 3.7 }); const k = keeperSpot(s); COL.push({ x: k.x, z: k.z, r: 0.75 }); });
  W3.solids.forEach(c => COL.push(c)); // houses, trees, landmarks on the islands
  PORTAL.forEach((p, e) => COL.push({ x: p.x, z: p.z, r: 1.7, portal: true, era: e })); // a shut portal is a wall; an open one you walk into

  keepers = SHOPS.map((s, i) => { const k = keeperSpot(s), m = s.era === 3 ? makeKeeper(s.id) : makeVillager(s.era, i); m.position.set(k.x, gh(k.x, k.z), k.z); m.rotation.y = s.x < 0 ? 0.5 : -0.5; dyn.add(m); return { id: s.id, name: s.keeper, x: k.x, z: k.z, y: s.era === 3 ? 3.1 : 3.3, mesh: m, tag: tag(s.keeper, 'npc') }; });
  ERA_Z.forEach((zc, e) => { const c = CHIEF_SPOT(e), m = makeVillager(e, 3, e === 1); m.scale.setScalar(1.4); m.position.set(c.x, gh(c.x, c.z), c.z); dyn.add(m); COL.push({ x: c.x, z: c.z, r: 0.8 }); keepers.push({ id: 'chief', era: e, name: ERAS[e].chief, x: c.x, z: c.z, y: 3.8, mesh: m, tag: tag(ERAS[e].chief + ' (문지기)', 'npc') }); });
  const g = makeKeeper('guide'); g.position.set(PLACES.desk.x + 2.6, 0, PLACES.desk.z + 0.2); dyn.add(g);
  keepers.push({ id: 'guide', name: GUIDE, x: g.position.x, z: g.position.z, y: 2.8, mesh: g, tag: tag(GUIDE, 'npc') });
  places = SHOPS.map(s => ({ x: s.x, y: 4.6, z: s.z + 2.8, tag: tag(s.name, 'place') }));
  places.push({ x: PLACES.hq.x, y: 4.2, z: PLACES.hq.z + 4.5, tag: tag('탐사 본부', 'place') }, { x: PLACES.gacha.x, y: 4.1, z: PLACES.gacha.z, tag: tag('임무 뽑기', 'place') }, { x: PLACES.desk.x - 1.2, y: 2.5, z: PLACES.desk.z, tag: tag('계획서 책상', 'place') },
    { x: PLACES.launch.x, y: 3.3, z: PLACES.launch.z, tag: tag('발사대', 'place') }, { x: 0, y: 1.9, z: 0, tag: tag('내 작업장', 'place'), mine: true });

  ERAS.forEach((E, e) => HIDE_SPOTS.filter(h => h.era === e).slice(0, tune.chest_count).forEach(h => { const g2 = makeChest(h.x, h.z); g2.position.y = gh(h.x, h.z); dyn.add(g2); state.chests.push({ x: h.x, z: h.z, g: g2, items: 0, era: e }); COL.push({ x: h.x, z: h.z, r: 0.8 }); }));
  navReset(); const n = MP.on ? 1 : 1 + Math.min(tune.bot_count, BOT_NAMES.length, PAD_SPOTS[0].length - 1); // in a class room, the classmates are real
  const myName = ($('nameIn').value.trim() || '나').slice(0, 8);
  for (let i = 0; i < n; i++) {
    const bot = i > 0, si = (myShirt + i) % SHIRTS.length, ang = Math.PI + rng() * Math.PI, rad = 3.5 + rng() * 4;
    const a = { i: MP.on ? MP.slot : i, id: MP.on ? MP.id : 'a' + i, bot, name: bot ? BOT_NAMES[i - 1] : myName, shirt: SHIRTS[si], shirtName: SHIRT_NAMES[si], x: bot ? PLACES.spawn.x + Math.cos(ang) * rad * 1.6 : PLACES.spawn.x, z: bot ? PLACES.spawn.z + Math.sin(ang) * rad : PLACES.spawn.z, face: 0, moving: false,
      mission: bot ? pick(MISSIONS) : null, stage: 0, testStatus: 'none', eraTime: [], planStatus: 'none', parts: {}, order: [], away: {}, loose: false, doodle: false, shieldUntil: 0, prankReady: bot ? 60 + rng() * 120 : 0, lastVictim: '', tasks: [], pace: 0.7 + rng() * 0.9, launched: false, carry: null };
    a.h = gh(a.x, a.z); a.mesh = makeKid({ shirt: a.shirt, hair: a.i % 5, hairColor: HAIR[(a.i * 3) % HAIR.length] }); dyn.add(a.mesh);
    a.kk = !bot && KK; placeWork(a);
    a.tag = tag(a.kk ? '★ ' + a.name : a.name, bot ? '' : 'me'); state.actors.push(a);
  }
  if (n > 2) { const a = state.actors[1], f = eraParts(0)[1].id; a.parts[f] = true; a.order.push(f); a.pace = 1.6; } // the first minute's victim
  state.actors.forEach(refreshActor);
  marker = mesh(starGeo(0.42, 0.14), glow(0xffe14d)); dyn.add(marker);
  lookAtSpot(PLACES.spawn.x, PLACES.spawn.z, tune.cam_height, tune.cam_back, true);
}
function tag(textStr, cls) { const d = document.createElement('div'); d.className = 'tag ' + cls; d.textContent = textStr; $('tags').appendChild(d); d._w = d.offsetWidth || textStr.length * 16 + 20; return d; }
function placeWork(a) { // a kid's work spot for the era they are in: it moves north with them
  const e = a.stage, k = e === 3 ? 1 : 0.8; a.pad = PAD_SPOTS[e][a.i];
  if (a.padG) [a.padG, a.proj].forEach(g => { dyn.remove(g); g.traverse(o => { if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); } }); });
  a.padG = makePad(a.pad, a.shirt, a.name, k); dyn.add(a.padG);
  a.proj = makeProject(e, a.shirt); a.proj.position.set(a.pad.x, 0.14, a.pad.z); dyn.add(a.proj);
  if (a.padCol) Object.assign(a.padCol, { x: a.pad.x, z: a.pad.z }); else { a.padCol = { x: a.pad.x, z: a.pad.z, r: 1.25 }; COL.push(a.padCol); }
  a.want = eraParts(e).map(p => p.id); for (let j = a.want.length - 1; j > 0; j--) { const q = Math.floor(rng() * (j + 1)); [a.want[j], a.want[q]] = [a.want[q], a.want[j]]; }
  if (!a.bot) { const p = places.find(q => q.mine); Object.assign(p, { x: a.pad.x - 1.9 * k, z: a.pad.z + 2.3 * k }); p.tag.textContent = '내 ' + ERAS[e].work; p.tag._w = p.tag.offsetWidth || p.tag._w; }
}
function advance(a) { // the teacher said OK: through the time gate to the next era
  a.eraTime[a.stage] = state.t; a.stage++; a.testStatus = 'none'; a.loose = a.doodle = false; a.away = {}; a.order = [];
  state.hidden.filter(h => h.owner === a.id).forEach(unhide);
  placeWork(a); refreshActor(a);
  if (!a.bot) { state.bag = []; state.testNote = ''; toast(`선생님 OK! 시간의 문이 열렸다. 북쪽 ${ERAS[a.stage].name}로!`, 'good'); sfx('stamp'); events.push('era:' + a.stage); }
}
const eraDone = a => eraParts(a.stage).every(p => a.parts[p.id]);
function eraMissing(a) { const E = ER(a), miss = eraParts(a.stage).filter(p => !a.parts[p.id]).map(p => p.name); if (a.loose) miss.push(E.loose.check); if (a.doodle) miss.push(E.doodle.check); return miss; }
function refreshActor(a) {
  const u = a.proj.userData;
  Object.keys(u.parts).forEach(k => { u.parts[k].visible = !!a.parts[k]; });
  u.ghost.visible = a.stage === 3 ? !a.parts.hull : !count(a); u.scribble.visible = a.doodle;
  if (u.live) u.live.forEach(m => { m.userData.live.visible = !a.loose; });
  dressKid(a.mesh, a.parts, a.stage);
  const h = a.mesh.userData.hold; while (h.children.length) h.remove(h.children[0]);
  if (a.carry) { const m = partMesh(a.carry.part); m.scale.setScalar(1.4); h.add(m); }
  state.hud = '';
}
const count = a => eraParts(a.stage).filter(p => a.parts[p.id]).length; // in the era the kid is in now
function install(a, id) { a.parts[id] = true; if (PART[id].group !== 'suit') a.order.push(id); delete a.away[id]; refreshActor(a); }

// ---- Walking ---------------------------------------------------------------------------------
function walk(a, dx, dz, sp, dt) {
  const l = Math.hypot(dx, dz); if (l < 0.01) { a.moving = false; return; }
  dx /= l; dz /= l; a.moving = true; const ox = a.x, oz = a.z; let x = a.x + dx * sp * dt, z = a.z + dz * sp * dt;
  let d = Math.atan2(dx, dz) - a.face; d = Math.atan2(Math.sin(d), Math.cos(d)); a.face += d * Math.min(1, dt * 14);
  for (const c of COL) {
    if (Math.abs(z - c.z) > c.r + 1 || (c.portal && a.stage > c.era)) continue;
    const px = x - c.x, pz = z - c.z, r = c.r + 0.45, q = Math.hypot(px, pz);
    if (q < r && q > 0.001) { // pushed out, and slid round the side it was heading for
      const nx = px / q, nz = pz / q, side = (-nz * dx + nx * dz) >= 0 ? 1 : -1;
      x = c.x + nx * r - nz * side * sp * dt * 0.7; z = c.z + nz * r + nx * side * sp * dt * 0.7;
    }
  }
  const ok = (x2, z2) => { const h = walkH(x2, z2); return h !== null && Math.abs(h - a.h) <= 1.2 * Math.hypot(x2 - ox, z2 - oz) + 0.02; }; // a cliff is too steep to walk
  if (ok(x, z)) { a.x = x; a.z = z; } else if (ok(x, oz)) a.x = x; else if (ok(ox, z)) a.z = z;
  const h = walkH(a.x, a.z); if (h !== null) a.h = h;
}

// ---- Pranks: small delays, never a reset -----------------------------------------------------
function canPrank(by, v, kind) {
  if (v.launched) return '이미 우주로 떠났어';
  if (v.stage !== by.stage) return '다른 시대 친구라 손이 닿지 않아';
  if (v.testStatus === 'sent') return '선생님이 시험지를 보는 중이라 건드릴 수 없어';
  if (by.carry) return '손에 든 것부터 숨기자';
  if (state.t < by.prankReady) return `장난 기운 충전 중 (${Math.ceil(by.prankReady - state.t)}초)`;
  if (by.lastVictim === v.id) return '같은 친구를 연달아 괴롭히면 안 돼';
  if (state.t < v.shieldUntil) return '방금 당한 곳이라 경보가 켜져 있어';
  if (kind === 'hide' && !v.order.length) return '가져갈 물건이 아직 없어';
  const L = ERAS[v.stage].loose, D = ERAS[v.stage].doodle;
  if (kind === 'loose' && (v.loose || (L.need ? !v.parts[L.need] : !count(v)))) return v.loose ? L.already : '아직 망가뜨릴 게 없어';
  if (kind === 'doodle' && (v.doodle || !v.parts[D.on])) return v.doodle ? D.already : D.none;
  return '';
}
function footprints(by, v) { // a trail in the prankster's shirt colour, from the victim's work spot towards them
  const s = padStand(v), dx = by.x - v.pad.x, dz = by.z - v.pad.z, l = Math.hypot(dx, dz) || 1;
  for (let k = 0; k < 6; k++) { const f = mesh(ball(0.16), mat(by.shirt), s.x + dx / l * k * 0.75 + (k % 2 ? 0.18 : -0.18), gh(s.x, s.z) + 0.05, s.z + dz / l * k * 0.75); f.scale.set(0.8, 0.15, 1.3); f.rotation.y = Math.atan2(dx, dz); dyn.add(f); state.foot.push({ m: f, t: 90 }); }
}
function prank(by, v, kind) {
  by.prankReady = state.t + tune.prank_cooldown; by.lastVictim = v.id; v.shieldUntil = state.t + tune.pad_shield; footprints(by, v);
  if (v.remote) { // a classmate: their tablet applies it; I just run off with the thing
    const part = kind === 'hide' ? v.order[v.order.length - 1] : '';
    if (kind === 'hide') { by.carry = { owner: v.id, part }; refreshActor(by); }
    mpSend(v.id, { k: kind, by: by.id, part }); events.push('prank:' + kind); return;
  }
  let what = '';
  if (kind === 'loose') { v.loose = true; what = ERAS[v.stage].loose.done; }
  if (kind === 'doodle') { v.doodle = true; what = ERAS[v.stage].doodle.done; }
  if (kind === 'hide') { const id = v.order.pop(); delete v.parts[id]; v.away[id] = true; by.carry = { owner: v.id, part: id }; what = `${josa(PART[id].name, '이', '가')} 사라졌다!`; refreshActor(by); }
  refreshActor(v); events.push('prank:' + kind);
  if (v === me()) { toast(`내 ${ERAS[v.stage].work}: ${what} ${by.shirtName}색 발자국이 남았어`, 'bad'); sfx('alarm'); }
}
function stash(by, x, z, chest) { // on the ground where it sparkles, or out of sight in a treasure chest
  const c = by.carry; by.carry = null; refreshActor(by);
  if (MP.on) return MP.net.set('hid/' + by.id + '_' + Date.now().toString(36), { o: c.owner, p: c.part, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, c: chest ? state.chests.indexOf(chest) : -1 });
  if (chest) { chest.items++; state.hidden.push({ owner: c.owner, part: c.part, x: chest.x, z: chest.z, chest }); showChest(chest); }
  else {
    const g = new THREE.Group(); g.position.set(x, gh(x, z), z); const p = partMesh(c.part); p.position.y = 0.4; g.add(p);
    const st = mesh(starGeo(0.22, 0.06), glow(0xfff3a0), 0, 1.5, 0); g.add(st); dyn.add(g);
    state.hidden.push({ owner: c.owner, part: c.part, x, z, g, st });
  }
  if (c.owner === me().id) toast(chest ? `내 ${josa(PART[c.part].name, '이', '가')} 보물상자 어딘가에 숨겨졌어. 뚜껑이 들썩이는 상자를 찾자!` : `내 ${josa(PART[c.part].name, '이', '가')} 어딘가에 숨겨졌어. 반짝이는 곳을 찾자!`, 'bad');
}
function showChest(c) { c.g.userData.lid.rotation.x = c.items ? -0.4 : 0; c.g.userData.spark.visible = c.items > 0; }
function unhide(h) { if (MP.on && h.key) MP.net.del('hid/' + h.key); if (h.g) dyn.remove(h.g); if (h.chest) { h.chest.items--; showChest(h.chest); } state.hidden.splice(state.hidden.indexOf(h), 1); }
const beside = h => (h.chest ? { x: h.x, z: h.z + 1.5 } : h);

// ---- Bot friends: the stand-in for classmates --------------------------------------------------
const go = p => ({ go: p }), wait = t => ({ wait: t }), act = fn => ({ fn });
function botThink(a) {
  const T = a.tasks;
  if (a.stage === 3 && a.planStatus === 'none') {
    T.push(go({ x: PLACES.desk.x - 5 + rng() * 9, z: PLACES.desk.z + 2 + rng() * 4 }), wait(tune.bot_plan_time * a.pace), act(() => { a.planStatus = 'sent'; }), wait(tune.bot_approve_time), act(() => { a.planStatus = 'ok'; }));
    return;
  }
  const h = state.hidden.find(x => x.owner === a.id);
  if (h) { T.push(go(beside(h)), act(() => { if (state.hidden.includes(h)) unhide(h); }), go(padStand(a)), wait(tune.build_time), act(() => install(a, h.part))); return; }
  if (a.loose || a.doodle) { T.push(go(padStand(a)), wait(tune.bot_fix_time), act(() => { a.loose = a.doodle = false; refreshActor(a); })); return; }
  if (state.t >= a.prankReady) {
    if (rng() < tune.bot_prank_chance) {
      const vs = state.actors.filter(v => v !== a && !v.launched && v.stage === a.stage && (v.bot || state.t >= tune.first_prank_min) && ['hide', 'loose', 'doodle'].some(k => !canPrank(a, v, k)));
      if (vs.length) { planPrank(a, pick(vs)); return; }
    }
    a.prankReady = state.t + 15; // not this time: think again later
  }
  const next = PART[a.want.find(id => !a.parts[id] && !a.away[id])];
  if (next) { const s = shopStand(SHOP[next.shop]); T.push(go({ x: s.x + rng() - 0.5, z: s.z + rng() - 0.5 }), wait(tune.bot_shop_time * a.pace), go(padStand(a)), wait(tune.build_time), act(() => install(a, next.id))); return; }
  if (Object.keys(a.away).length) T.push(wait(3));
  else if (a.stage < 3) { const c = CHIEF_SPOT(a.stage); T.push(go({ x: c.x + 1.5 + rng() * 3, z: c.z + 1.5 + rng() * 2 }), wait(4 * a.pace), act(() => { if (eraDone(a) && !a.loose && !a.doodle) a.testStatus = 'sent'; }), wait(tune.bot_approve_time), act(() => { if (a.testStatus === 'sent') advance(a); })); }
  else T.push(go({ x: PLACES.launch.x + rng() * 2 - 1, z: PLACES.launch.z + 3 }), wait(1.5), act(() => liftOff(a)));
}
function planPrank(a, v, via) {
  a.tasks.push(go(padStand(v)), act(() => {
    const ks = ['hide', 'loose', 'doodle'].filter(k => !canPrank(a, v, k)); if (!ks.length) return;
    const k = via ? 'hide' : pick(ks); if (via && !ks.includes('hide')) return;
    prank(a, v, k);
    if (k === 'hide') { const spot = pick(HIDE_SPOTS.filter(h => h.era === v.stage)), chest = state.chests.find(c => c.x === spot.x && c.z === spot.z); if (via) a.tasks.push(go(via)); a.tasks.push(go({ x: spot.x, z: spot.z + 1.5 }), act(() => { if (a.carry) stash(a, a.x, a.z, chest); })); }
  }));
}
function botStep(a, dt) {
  if (a.launched) return;
  if (!a.tasks.length) botThink(a);
  const k = a.tasks[0]; if (!k) { a.moving = false; return; }
  if (k.go) {
    const tg = waypoint(a, k.go);
    if (Math.hypot(tg.x - a.x, tg.z - a.z) < (tg.portal ? 1.2 : 0.4)) { if (tg.portal) warpBot(a); else { if (tg === k.go) a.tasks.shift(); a.moving = false; } return; }
    if (k.pt !== tg) { k.pt = tg; k.path = findPath(a.x, a.z, tg) || [tg]; }
    while (k.path.length > 1 && Math.hypot(k.path[0].x - a.x, k.path[0].z - a.z) < 0.6) k.path.shift();
    const p = k.path[0]; walk(a, p.x - a.x, p.z - a.z, tune.bot_speed * (a.carry ? 1.15 : 1), dt);
    const d = Math.hypot(tg.x - a.x, tg.z - a.z); // not getting any closer for a while: wedged, so step aside to a free spot
    if (a.gainFor !== tg.x + tg.z || d < a.best - 0.3) { a.gainFor = tg.x + tg.z; a.best = d; a.noGain = 0; } else if ((a.noGain += dt) > 1.5) {
      a.noGain = 0; k.pt = null; if (k.side) { a.tasks.shift(); return; }
      const r0 = rng() * 8;
      for (let j = 0; j < 8; j++) { const ang = (r0 + j) * Math.PI / 4, p = { x: a.x + Math.cos(ang) * 4, z: a.z + Math.sin(ang) * 4 };
        if (zoneOf(p.z) === zoneOf(a.z) && walkH(p.x, p.z) !== null && !COL.some(c => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.8)) { a.tasks.unshift({ go: p, side: true }); break; } }
    }
  }
  else if (k.wait !== undefined) { a.moving = false; k.wait -= dt; if (k.wait <= 0) a.tasks.shift(); }
  else { a.tasks.shift(); k.fn(); }
}
function waypoint(a, p) { // a later island is reached through this island's portal
  const za = zoneOf(a.z); return zoneOf(p.z) > za && za < 3 && a.stage > za ? PORTAL[za] : p;
}
function warpTo(a, e) { // land on island e's arrival ring, a step to the side so friends do not stack
  const A = ARRIVE[e] || PLACES.spawn, ang = rng() * 6.283, r = a.bot ? 1.5 + rng() * 2 : 0; sparkle(a.x, a.h, a.z);
  a.x = A.x + Math.cos(ang) * r; a.z = A.z + Math.abs(Math.sin(ang)) * r * 0.6; a.h = gh(a.x, a.z); sparkle(a.x, a.h, a.z);
}
function warpBot(a) { warpTo(a, zoneOf(a.z) + 1); a.tasks.forEach(t => { t.pt = null; }); }
function sparkle(x, y, z) { // a little burst of stars where someone leaves or lands
  for (let i = 0; i < 8; i++) { const st = mesh(starGeo(0.18, 0.05), glow([0xffe680, 0xffc2e2, 0xbfe9ff][i % 3]), x, y + 1, z); dyn.add(st); state.sparks.push({ m: st, t: 0, vx: Math.cos(i * 0.785) * 2.4, vz: Math.sin(i * 0.785) * 2.4 }); }
}
function liftOff(a) {
  a.launched = true; a.mesh.visible = false; a.tag.style.transform = 'translate(-999px,0)'; a.proj.visible = false;
  const r = makeRocket(a.shirt); Object.values(r.userData.parts).forEach(p => { p.visible = true; }); ['oven', 'food', 'scan'].forEach(k => { r.userData.parts[k].visible = false; }); r.userData.ghost.visible = false;
  r.position.set(PLACES.launch.x, 0.4 + gh(PLACES.launch.x, PLACES.launch.z), PLACES.launch.z);
  const fl = mesh(geo('flame', () => new THREE.ConeGeometry(0.6, 2.2, 12)), glow(0xffb347), 0, -0.9, 0); fl.rotation.x = Math.PI; r.add(fl); dyn.add(r);
  state.fx.push({ r, fl, t: 0 }); if (!a.kk) state.fame.push(a.name); state.hud = ''; // 깍두기 선생님은 학생 순위에 끼지 않는다
  if (a === me() && MP.on && !KK) MP.net.set('fame/' + MP.id, MP.net.now());
  if (a !== me()) toast(a.kk ? `${a.name} 선생님 발사!` : `${a.name} 발사! (${state.fame.length}번째)`); sfx('launch'); events.push('launch:' + a.name);
}

// ---- What the player can do right here ---------------------------------------------------------
function findNear() {
  const m = me(), R = tune.interact_range; let best = null;
  const offer = (d, o) => { if (d <= (o.range || R) && (!best || d < best.d)) best = Object.assign(o, { d }); };
  if (m.carry) { const c = state.chests.find(c2 => dist(m, c2) < R + 0.3); return c ? { kind: 'stash', label: '상자에 숨기기', x: c.x, z: c.z, y: 2.4, chest: c } : { kind: 'stash', label: '바닥에 숨기기', x: m.x, z: m.z, y: 3.2 }; }
  state.chests.forEach(c => offer(dist(m, c), { kind: 'chest', label: '상자 열기', x: c.x, z: c.z, y: 2.4, ref: c, range: R + 0.3 }));
  state.actors.forEach(a => { if (a !== m && a.carry && a.carry.owner === m.id) offer(dist(m, a), { kind: 'catch', label: '잡아라!', x: a.x, z: a.z, y: 3.4, ref: a, range: R + 0.4 }); });
  state.hidden.forEach(h => { if (h.owner === m.id && !h.chest) offer(dist(m, h), { kind: 'find', label: '되찾기', x: h.x, z: h.z, y: 2.2, ref: h }); });
  offer(dist(m, PLACES.gacha), { kind: 'gacha', label: m.mission ? '임무 카드 보기' : '임무 뽑기', x: PLACES.gacha.x, z: PLACES.gacha.z, y: 3.6, range: R + 0.4 });
  offer(dist(m, PLACES.desk), { kind: 'desk', label: m.planStatus === 'ok' ? '내 계획서 보기' : '계획서 쓰기', x: PLACES.desk.x, z: PLACES.desk.z, y: 2.2, range: R + 0.4 });
  keepers.forEach(k => { if (k.id === 'chief') offer(dist(m, k), { kind: 'chief', label: m.stage === k.era && eraDone(m) && m.testStatus !== 'sent' ? '시험 보기' : '말 걸기', x: k.x, z: k.z, y: 4.3, ref: k, range: R + 0.4 }); else if (k.id !== 'guide') offer(dist(m, k), { kind: 'keeper', label: '말 걸기', x: k.x, z: k.z, y: 3.7, ref: k }); });
  offer(dist(m, PLACES.launch), { kind: 'launch', label: '발사 점검', x: PLACES.launch.x, z: PLACES.launch.z, y: 2.5, range: 5 });
  state.actors.forEach(a => {
    if (a.launched) return; const d = dist(m, a.pad);
    const y = a.stage === 3 ? 5.4 : 3.2;
    if (a === m) offer(d, { kind: 'mypad', label: m.loose ? ER(m).loose.fix : m.doodle ? ER(m).doodle.fix : state.bag.length && (m.stage < 3 || m.planStatus === 'ok') ? '만들기' : '내 ' + ER(m).work, x: a.pad.x, z: a.pad.z, y, range: R + 0.8 });
    else offer(d, { kind: 'pad', label: '기웃거리기', x: a.pad.x, z: a.pad.z, y, ref: a, range: R + 0.8 });
  });
  return best;
}
function doAction(n) {
  const m = me();
  if (n.kind === 'stash') {
    const v = state.actors.find(a => a.id === m.carry.owner);
    if (v && dist(m, v.pad) < tune.stash_min_dist) { toast('너무 가까워! 더 멀리 가서 숨기자'); sfx('bad'); return; }
    stash(m, m.x + Math.sin(m.face) * 0.9, m.z + Math.cos(m.face) * 0.9, n.chest); toast(n.chest ? '쉿! 상자에 넣고 뚜껑을 닫았다' : '쉿! 바닥에 숨겼다', 'good'); sfx('pop');
  }
  if (n.kind === 'chest') {
    const mine = state.hidden.filter(h => h.chest === n.ref && h.owner === m.id);
    if (mine.length) { mine.forEach(h => { unhide(h); state.bag.push(h.part); }); toast(`상자에서 ${josa(mine.map(h => PART[h.part].name).join(', '), '을', '를')} 찾았다! 작업장에 다시 달자`, 'good'); sfx('ok'); state.hud = ''; }
    else if (n.ref.items) say('보물상자', ['친구 물건이 들어 있다. 내 것은 아니니 살짝 닫아 두자.']);
    else { toast('텅 빈 보물상자다. 물건을 숨기기 딱 좋겠는걸'); sfx('blip'); }
  }
  if (n.kind === 'catch') { const a = n.ref, id = a.carry.part; if (a.remote) mpSend(a.id, { k: 'caught', by: m.id }); a.carry = null; a.tasks.length = 0; refreshActor(a); state.bag.push(id); toast(`잡았다! ${josa(PART[id].name, '을', '를')} 되찾았어`, 'good'); sfx('ok'); }
  if (n.kind === 'find') { unhide(n.ref); state.bag.push(n.ref.part); toast(`${PART[n.ref.part].name} 찾았다! 작업장에 다시 달자`, 'good'); sfx('pop'); state.hud = ''; }
  if (n.kind === 'gacha') {
    if (!m.mission) { m.mission = pick(MISSIONS); sfx('ok'); events.push('mission:' + m.mission.id); }
    ask('임무 카드', `<canvas class="cardpic" id="cardpic" width="340" height="240"></canvas><b style="font-size:28px">${m.mission.name}</b><br>${m.mission.hint}<br><span style="font-size:18px;color:#8a7fa8">이 임무로 탐사 계획서를 써서 도장을 받자.</span>`, [{ label: '좋아!' }], () => drawMission($('cardpic').getContext('2d'), m.mission.id, 340, 240));
  }
  if (n.kind === 'desk') deskTalk();
  if (n.kind === 'keeper') keeperTalk(n.ref);
  if (n.kind === 'chief') chiefTalk(n.ref.era);
  if (n.kind === 'mypad') myPad();
  if (n.kind === 'pad') otherPad(n.ref);
  if (n.kind === 'launch') launchCheck();
}
// ---- 깍두기(선생님) 전용 ----------------------------------------------------------------------------
function kkPlanOK() { const m = me(); if (!m.mission) m.mission = pick(MISSIONS); if (!state.plan.ship) state.plan.ship = '선생님호'; m.planStatus = 'ok'; state.hud = ''; }
function kkTravel() { // 섬과 섬 사이를 마음대로: 지나온 시대의 게임도 다시 해 볼 수 있게
  const here = zoneOf(me().z), names = ['석기 시대 섬', '철기 시대 섬', '산업 시대 섬', '우주 마을'];
  ask('시간 이동 · 깍두기', '어느 시대로 갈까요? (지금 있는 곳: ' + names[here] + ')', names.map((n, e) => ({ label: n, off: e === here, fn: () => { state.warp = { t: 0, to: e }; sfx('warp'); } })).concat([{ label: '그냥 있을래' }]));
}
function kkKeeper(k) { // 가게 게임을 순서 · 시대 상관없이 해 보고, 지금 시대 것은 바로 받을 수도
  const m = me(), mine = PARTS.filter(p => p.shop === k.id), need = p => p.era === m.stage && !m.parts[p.id] && !state.bag.includes(p.id), opts = [];
  mine.forEach(p => {
    opts.push({ label: `${p.item} 게임 해 보기`, sub: need(p) ? '이기면 가방에 들어가요' : '연습 (가방에는 안 들어가요)', fn: () => playPart(k, p) });
    if (need(p)) opts.push({ label: `${p.item} 바로 받기`, sub: '깍두기 통과', fn: () => giveItem(k, p) });
  });
  ask(k.name + ' · 깍두기', `선생님 어서 오세요! ${SHOP[k.id].name}에서는 이런 게임을 해요.`, opts.concat([{ label: '그냥 갈래' }]));
}
function deskTalk() {
  const m = me();
  if (KK) return ask(GUIDE + ' · 깍두기', '선생님, 무엇을 할까요?', (m.planStatus === 'ok'
    ? [{ label: '내 계획서 보기', fn: () => ask(GUIDE, planHtml(state.plan, m.mission.name) + '<span class="stamp ok">승인 도장</span>', [{ label: '닫기' }], null, true) }]
    : [{ label: '계획서 써 보기', sub: '내면 바로 도장', fn: () => { if (!m.mission) m.mission = pick(MISSIONS); planForm(); } },
      { label: '계획서 바로 통과', sub: '깍두기 통과', fn: () => { kkPlanOK(); toast('깍두기 통과! 계획서 도장 쾅', 'good'); sfx('stamp'); } }])
    .concat([{ label: '다른 시대로 시간 이동', fn: kkTravel }, { label: '그냥 갈래' }]));
  if (!m.mission) return say(GUIDE, ['어서 와! 여긴 탐사 본부야.', '먼저 광장의 뽑기 기계에서 임무 카드를 뽑아 와. 계획서는 그다음!']);
  if (m.planStatus === 'none' || m.planStatus === 'back') return planForm();
  if (m.planStatus === 'sent') return ask(GUIDE, '계획서는 선생님께 갔어. 도장이 찍히면 제작을 시작할 수 있어!', [{ label: '선생님께 보여 드리기', sub: '선생님 암호가 필요해', fn: () => teacherReview(3) }, { label: '고쳐서 다시 내기', fn: planForm }, { label: '기다릴게' }]);
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
    if (KK) { closeUI(); kkPlanOK(); toast('깍두기 통과! 계획서 도장 쾅', 'good'); sfx('stamp'); return; }
    m.planStatus = 'sent'; state.planNote = ''; pushReq(m, 3); closeUI(); sfx('pop'); events.push('plan-sent');
    say(GUIDE, ['계획서 접수! 선생님께 전달했어.', '도장이 찍힐 때까지 마을을 둘러봐. 친구 작업장에 가면 친구 계획서도 엿볼 수 있어.']);
  };
}
const FIELD_CSS = 'width:100%;box-sizing:border-box;font:inherit;font-size:18px;padding:8px 12px;border-radius:14px;border:3px solid #e6dcc4;margin-top:6px;-webkit-user-select:text;user-select:text';
function testHtml(d) { return (d.img ? `<img src="${d.img}" style="width:100%;border-radius:16px;display:block">` : '') + `<div style="font-size:20px;margin:8px 0">제목: <b>${esc(d.title || '')}</b></div>`; }
function teacherReview(e) { // the teacher, at the student's tablet: needs the teacher's PIN
  const m = me(), html = e === 3 ? planHtml(state.plan, m.mission.name) : testHtml(state.tests[e]);
  ask('선생님 확인 · ' + (e === 3 ? '탐사 계획서' : ERAS[e].test.title), html + `<input id="tpin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="선생님 암호" style="${FIELD_CSS};${PIN_CSS}"><input id="tnote" placeholder="학생에게 한마디 (돌려보낼 때)" style="${FIELD_CSS}">`, [
    { label: 'OK 도장 찍기', fn: c => decide(e, 'ok', c) },
    { label: '돌려보내기', fn: c => decide(e, 'back', c) }, { label: '닫기' }], null, true);
}
function decide(e, st, c) {
  if (!pinOK(c.pin)) { toast('선생님 암호가 달라요', 'bad'); sfx('bad'); return; }
  setStatus('me:' + e, st, st === 'back' ? (c.note || '조금 더 구체적으로 써 보자.') : c.note); pollReq();
}
function chiefTalk(e) { // the gatekeeper of each early era: the story, then the test
  const m = me(), E = ERAS[e];
  if (KK) { state.met[e] = true; const miss = eraMissing(m);
    return ask(E.chief + ' · 깍두기', m.stage === e ? `선생님 어서 오세요! 이 시대의 시험은 "${E.test.title}"이에요.${miss.length ? ` (아직 안 만든 것 ${miss.length}개)` : ''}` : '선생님, 이 섬에서 무엇을 할까요?',
      (m.stage === e ? [{ label: '그림 시험 보기', sub: '내면 바로 통과', fn: () => testForm(e) }, { label: '바로 다음 시대로', sub: '깍두기 통과 · 포탈이 열려요', fn: () => advance(m) }] : [])
        .concat([{ label: '다른 시대로 시간 이동', fn: kkTravel }, { label: '그냥 갈래' }])); }
  if (m.stage > e) return say(E.chief, ['너는 벌써 이 시대를 지나갔지! 아직 여기 있는 친구들을 응원해 줘.']);
  if (!state.met[e]) { state.met[e] = true; return say(E.chief, E.intro); }
  if (m.carry) return say(E.chief, ['손에 든 그거, 네 것 아니지? 그것부터 어떻게 해!']);
  if (m.testStatus === 'sent') return ask(E.chief, '그림은 선생님께 갔어. 선생님 OK가 나면 언덕 위 포탈이 열려!', [{ label: '선생님께 보여 드리기', sub: '선생님 암호가 필요해', fn: () => teacherReview(e) }, { label: '고쳐서 다시 내기', fn: () => testForm(e) }, { label: '기다릴게' }]);
  const miss = eraMissing(m);
  if (miss.length) return say(E.chief, [`아직이야! 남은 것: ${miss.join(', ')}`, '가게에서 재료를 받아 네 자리에서 만들어 와.']);
  testForm(e);
}
const PAPER = { cave: { bg: '#6b5444', blot: ['255,235,200', '40,25,20'], pens: ['#fff6e0', '#ffd166', '#ff8a5c', '#d9534f'] },
  hanji: { bg: '#f3ead6', blot: ['255,255,255', '160,130,90'], pens: ['#3a2f45', '#d9534f', '#3f7f5f', '#5b7fd6'] },
  blueprint: { bg: '#3d6fb8', blot: ['255,255,255', '20,40,90'], pens: ['#ffffff', '#ffd166', '#bfe9ff', '#ff8a5c'], grid: true } };
function paper(c, kind, img) { // what you draw on: a cave wall, hanji, or a blueprint, with the drawing kept so far
  const P = PAPER[kind], x = c.getContext('2d'); let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  x.fillStyle = P.bg; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${P.blot[r() > 0.5 ? 0 : 1]},0.08)`; x.beginPath(); x.ellipse(r() * c.width, r() * c.height, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 6.3); x.fill(); }
  if (P.grid) { x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; for (let g = 0; g < c.width; g += 32) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, c.height); x.stroke(); } for (let g = 0; g < c.height; g += 32) { x.beginPath(); x.moveTo(0, g); x.lineTo(c.width, g); x.stroke(); } }
  if (img) { const im = new Image(); im.onload = () => x.drawImage(im, 0, 0, c.width, c.height); im.src = img; }
}
function testForm(e) { // the early eras end in a drawing and its title; the teacher looks and says OK
  const m = me(), T = ERAS[e].test, d = state.tests[e] || (state.tests[e] = {}), pens = PAPER[T.paper].pens;
  if (T.reveal && !d.revealed) { d.revealed = true; return say(ERAS[e].chief, T.reveal, () => testForm(e)); } // 문제는 지금 처음 공개
  openUI({ kind: 'plan', mid: true });
  $('modal').innerHTML = `<div class="bubble form"><div class="who">${T.title}</div><div style="font-size:19px">${esc(ERAS[e].chief)}: ${T.ask}</div>` +
    (m.testStatus === 'back' && state.testNote ? `<div class="note">선생님 한마디: ${esc(state.testNote)}</div>` : '') +
    '<canvas id="cave" width="640" height="300" style="width:100%;border-radius:18px;margin-top:8px;touch-action:none;display:block"></canvas><div class="opts" style="margin-top:8px">' +
    pens.map((p, i) => `<button class="opt pen" data-c="${p}" style="background:${p};width:44px;height:44px;padding:0;border-radius:50%;${i ? '' : 'outline:4px solid #4a3d6b'}"></button>`).join('') +
    '<button class="opt" id="cClear">다 지우기</button></div><label>그림 제목</label><input id="t_title" maxlength="24" placeholder="' + (T.ph || '예: 보름달 뜬 사냥 밤') + '">' +
    '<div class="opts"><button class="opt" id="pSend" style="background:var(--sun)">선생님께 보여 드리기</button><button class="opt" id="pLater">나중에 할게</button></div></div>';
  $('t_title').value = d.title || '';
  let drawn = !!d.img;
  const c = $('cave'), x = c.getContext('2d'); let pen = pens[0], last = null; paper(c, T.paper, d.img);
  const at = ev => { const b = c.getBoundingClientRect(); return [(ev.clientX - b.left) * c.width / b.width, (ev.clientY - b.top) * c.height / b.height]; };
  c.onpointerdown = ev => { c.setPointerCapture(ev.pointerId); last = at(ev); x.fillStyle = pen; x.beginPath(); x.arc(last[0], last[1], 4, 0, 6.3); x.fill(); drawn = true; };
  c.onpointermove = ev => { if (!last) return; const p = at(ev); x.strokeStyle = pen; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); last = p; };
  c.onpointerup = c.onpointercancel = () => { last = null; };
  $('modal').querySelectorAll('.pen').forEach(b => { b.onclick = () => { pen = b.dataset.c; $('modal').querySelectorAll('.pen').forEach(o => { o.style.outline = o === b ? '4px solid #4a3d6b' : ''; }); }; });
  $('cClear').onclick = () => { paper(c, T.paper); drawn = false; };
  const read = () => { d.title = $('t_title').value.trim(); d.img = drawn ? c.toDataURL('image/jpeg', 0.6) : ''; };
  $('pLater').onclick = () => { read(); closeUI(); };
  $('pSend').onclick = () => {
    read();
    if (!drawn) { sfx('bad'); toast('먼저 그림을 그려 줘!', 'bad'); return; }
    if (!d.title) { sfx('bad'); $('t_title').classList.add('bad'); toast('그림 제목을 붙여 줘!', 'bad'); return; }
    if (KK) { closeUI(); return advance(m); } // 깍두기: 선생님이 선생님께 낼 필요는 없으니 바로 통과
    m.testStatus = 'sent'; state.testNote = ''; pushReq(m, e); closeUI(); sfx('pop'); events.push('test-sent:' + e);
    say(ERAS[e].chief, ['멋진 그림이야! 선생님께 보냈어.', '선생님 OK를 기다리는 동안 친구를 도와도 되고… 살짝 장난을 쳐도 돼. 쉿!']);
  };
}
function keeperTalk(k) {
  const m = me(), s = SHOP[k.id], mine = PARTS.filter(p => p.shop === k.id);
  if (KK) return kkKeeper(k);
  if (s.era < m.stage) return say(k.name, ['오, 너는 벌써 이 시대를 지나갔구나!', `${ERAS[m.stage].name}에서도 힘내!`]);
  if (s.era < 3 && !state.met[s.era]) return say(k.name, [`잠깐! 먼저 언덕 위 ${ERAS[s.era].chief}에게 인사하고 와.`, '그래야 무엇을 만들지 알 수 있지!']);
  if (m.stage === 3 && m.planStatus !== 'ok') return say(k.name, [`${s.name}에 어서 와!`, `${mine.map(p => p.item).join(', ')}… 다 있지. 하지만 계획서에 도장을 받아야 줄 수 있어.`]);
  if (state.t < (state.sulk[k.id] || 0)) return say(k.name, [`잠깐만, ${Math.ceil(state.sulk[k.id] - state.t)}초만 있다가 다시 물어봐 줄게.`]);
  const p = eraParts(m.stage).find(q => !m.parts[q.id] && !m.away[q.id] && !state.bag.includes(q.id)); // the one next thing, in the set order
  if (mine.some(q => m.away[q.id])) return say(k.name, ['어머, 물건을 잃어버렸다고? 반짝이는 곳이나 보물상자를 찾아봐. 새로 줄 순 없어!']);
  if (!p) return say(k.name, [m.stage < 3 ? `필요한 건 다 챙겼네! 네 자리에서 만들고 ${ERAS[m.stage].chief}에게 시험을 보러 가.` : '필요한 건 다 챙겼네! 작업장에서 조립하고 발사대로 가 봐.']);
  if (p.shop !== k.id) { sfx('bad'); return say(k.name, [`잠깐, 순서가 있어! 지금은 ${josa(p.name, '을', '를')} 만들 차례야.`, `${SHOP[p.shop].name}에 가서 ${josa(p.item, '을', '를')} 먼저 구해 와. 우리 가게는 그다음이야!`]); }
  if (state.bag.length >= tune.bag_size) return say(k.name, [`가방이 꽉 찼잖아! 네 ${ER(m).work}에 가서 먼저 만들고 와.`]);
  playPart(k, p);
}
function playPart(k, p) { // the shop's game for one part; winning it gives the item
  if (p.kind === 'word' || p.kind === 'num') return typedQuiz(k, p);
  if (p.kind === 'nono') return nonoGame(k, p);
  if (p.kind === 'moon') return moonQuiz(k, p);
  if (p.kind === 'stairs') return stairsGame(k, p);
  if (p.kind === 'train') return trainGame(k, p);
  if (p.kind === 'scope') return scopeGame(k, p);
  const order = p.a.map((t, i) => ({ t, ok: i === 0 })); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  ask(k.name, `${josa(p.item, '이', '가')} 필요하구나? 그럼 하나만 맞혀 봐.<br><b>${p.q}</b>`, order.map(o => ({ label: o.t, fn: () => {
    if (o.ok) giveItem(k, p);
    else { state.sulk[k.id] = state.t + tune.quiz_retry; sfx('bad'); say(k.name, [pick(WRONG_LINES)]); }
  } })));
}
function giveItem(k, p) { // into the bag; a full bag sends you off to build
  const mm = me(); if (KK && (p.era !== mm.stage || mm.parts[p.id] || state.bag.includes(p.id))) { sfx('ok'); return say(k.name, [p.fact, '연습 성공! (지금 시대 물건이 아니라 가방에는 넣지 않았어요)']); }
  state.bag.push(p.id); state.hud = ''; sfx('ok'); events.push('item:' + p.id); state.tries[p.id] = 0;
  const full = state.bag.length >= tune.bag_size, W = ER(me()).work;
  say(k.name, [p.fact, full ? `자, ${p.item}! 가방이 꽉 찼어(${state.bag.length}/${tune.bag_size}). 얼른 네 ${W}에 가서 만들어!` : `자, ${p.item}! 네 ${W}에서 ${josa(p.name, '을', '를')} 만들어.`]);
}
const norm = t => String(t).replace(/[\s.,!?~]/g, '');
function typedQuiz(k, p) { // write the answer: a riddle with a hint after two misses, or a number with up and down hints
  openUI({ kind: 'plan', mid: true });
  $('modal').innerHTML = `<div class="bubble form"><div class="who">${esc(k.name)}</div>${josa(p.item, '이', '가')} 필요하구나? 그럼 맞혀 봐!<br><b style="font-size:24px">${p.q}</b>` +
    `<input id="qa" maxlength="14" autocomplete="off" ${p.kind === 'num' ? 'inputmode="decimal"' : ''} placeholder="${p.kind === 'num' ? '숫자만 (' + p.unit + ')' : '답을 써 봐'}" style="margin-top:12px">` +
    '<div id="qfb" class="note" style="display:none"></div><div class="opts"><button class="opt" id="pSend" style="background:var(--sun)">확인</button><button class="opt" id="pLater">다음에</button></div></div>';
  const fb = (t, good) => { const e = $('qfb'); e.style.display = 'block'; e.style.background = good ? '#d6f5e6' : '#ffe3e0'; e.innerHTML = t; };
  const check = () => {
    const v = $('qa').value.trim(); if (!v) return;
    const n = (state.tries[p.id] = (state.tries[p.id] || 0) + 1);
    if (p.kind === 'num') {
      const x = parseNum(v); if (isNaN(x)) { state.tries[p.id]--; return fb('숫자로 써 줘!'); }
      if (Math.abs(x - p.ans) < 1e-9) { closeUI(); return giveItem(k, p); } // 오차 없이 딱 맞아야 정답
      sfx('bad'); fb(`<b style="font-size:26px">${x < p.ans ? '업!' : '다운!'}</b> ${x}${p.unit}보다 ${x < p.ans ? '더 많아' : '더 적어'}. (${n}번째 도전)`);
    } else {
      if (p.ans.some(a => norm(a) === norm(v))) { closeUI(); return giveItem(k, p); }
      sfx('bad');
      if (n >= 4) { closeUI(); return say(k.name, [`땡! 정답은 "${p.ans[0]}"였어. 이번만 특별히 줄게!`], () => giveItem(k, p)); }
      fb(n >= 2 ? `땡! 힌트: ${p.hint}` : pick(['땡! 다시 생각해 봐.', '아쉽다! 한 번 더!']));
    }
    $('qa').value = ''; $('qa').focus();
  };
  $('pSend').onclick = check; $('qa').onkeydown = e => { if (e.key === 'Enter') check(); };
  $('pLater').onclick = () => closeUI(); setTimeout(() => $('qa') && $('qa').focus(), 50);
}
function scopeGame(k, p) { // two telescope views of the night sky; tap the four things that are different
  const R = 140, L = { x: 165, y: 160 }, Rt = { x: 475, y: 160 }; let s0 = 3; const r = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
  const stars = Array.from({ length: 26 }, () => { const a = r() * 6.283, d = Math.sqrt(r()) * 125; return [Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 1.8]; });
  const cand = [{ id: 'jmoon', x: 103, y: 18 }, { id: 'crater', x: -66, y: -54 }, { id: 'star', x: stars[5][0], y: stars[5][1] }, { id: 'ring', x: -40, y: 72 }, { id: 'comet', x: 60, y: -80 }, { id: 'jcolor', x: 40, y: 20 }];
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const diff = cand.slice(0, 4), has = id => diff.some(d => d.id === id), found = new Set(); let miss = [];
  openUI({ kind: 'scope', mid: true });
  $('modal').innerHTML = `<div class="bubble" style="width:min(700px,95vw);text-align:center"><div class="who">${esc(k.name)} · 망원경 틀린 그림 찾기</div>${p.q}<canvas id="scope" width="640" height="320" style="width:100%;margin-top:8px;touch-action:none;display:block"></canvas><div id="sst" style="margin-top:6px"></div><div class="opts" style="justify-content:center"><button class="opt" id="pLater">그만할래</button></div></div>`;
  const cv = $('scope'), x = cv.getContext('2d');
  const sky = (c, right) => {
    x.save(); x.translate(c.x, c.y); x.beginPath(); x.arc(0, 0, R, 0, 6.283); x.clip();
    x.fillStyle = '#1d1840'; x.fillRect(-R, -R, R * 2, R * 2);
    stars.forEach(([sx, sy, sr], i) => { if (right && i === 5 && has('star')) return; x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(sx, sy, sr, 0, 6.283); x.fill(); });
    x.fillStyle = '#f2ead2'; x.beginPath(); x.arc(-60, -48, 30, 0, 6.283); x.fill(); // the moon and its craters
    [[-66, -54, 7], [-48, -38, 5], [-62, -32, 4]].forEach(([cx, cy, cr], i) => { if (right && i === 0 && has('crater')) return; x.fillStyle = '#d6cdb0'; x.beginPath(); x.arc(cx, cy, cr, 0, 6.283); x.fill(); });
    x.fillStyle = right && has('jcolor') ? '#9fd0e8' : '#e8b98a'; x.beginPath(); x.arc(40, 20, 17, 0, 6.283); x.fill(); // Jupiter and its four moons
    x.fillStyle = 'rgba(160,90,60,.5)'; x.fillRect(23, 15, 34, 4); x.fillRect(24, 24, 32, 3);
    [70, 84, 103, 118].forEach((mx, i) => { if (right && i === 2 && has('jmoon')) return; x.fillStyle = '#fff'; x.beginPath(); x.arc(mx, 18 + (i % 2) * 4, 3.2, 0, 6.283); x.fill(); });
    x.fillStyle = '#f2d98a'; x.beginPath(); x.arc(-40, 72, 11, 0, 6.283); x.fill(); // Saturn
    if (!(right && has('ring'))) { x.strokeStyle = '#d9c39a'; x.lineWidth = 3; x.beginPath(); x.ellipse(-40, 72, 22, 6, -0.3, 0, 6.283); x.stroke(); }
    if (right && has('comet')) { x.fillStyle = '#bfe9ff'; x.beginPath(); x.arc(60, -80, 5, 0, 6.283); x.fill(); x.strokeStyle = 'rgba(191,233,255,.6)'; x.lineWidth = 5; x.beginPath(); x.moveTo(60, -80); x.lineTo(95, -100); x.stroke(); }
    found.forEach(id => { const d = diff.find(q => q.id === id); x.strokeStyle = '#ffd166'; x.lineWidth = 4; x.beginPath(); x.arc(d.x, d.y, 18, 0, 6.283); x.stroke(); });
    miss.forEach(m2 => { if (m2.right !== right) return; x.strokeStyle = 'rgba(255,107,107,' + m2.a + ')'; x.lineWidth = 4; x.beginPath(); x.moveTo(m2.x - 8, m2.y - 8); x.lineTo(m2.x + 8, m2.y + 8); x.moveTo(m2.x + 8, m2.y - 8); x.lineTo(m2.x - 8, m2.y + 8); x.stroke(); });
    x.restore(); x.lineWidth = 14; x.strokeStyle = '#e0b450'; x.beginPath(); x.arc(c.x, c.y, R + 4, 0, 6.283); x.stroke();
  };
  const draw = () => { x.clearRect(0, 0, 640, 320); sky(L, false); sky(Rt, true); $('sst').textContent = `찾은 곳 ${found.size} / 4`; };
  cv.onpointerdown = ev => {
    const b = cv.getBoundingClientRect(), px = (ev.clientX - b.left) * 640 / b.width, py = (ev.clientY - b.top) * 320 / b.height;
    const right = px > 320, c = right ? Rt : L, lx = px - c.x, ly = py - c.y; if (Math.hypot(lx, ly) > R) return;
    const d = diff.find(q => !found.has(q.id) && Math.hypot(q.x - lx, q.y - ly) < 24);
    if (d) { found.add(d.id); sfx('pop'); } else { sfx('bad'); miss.push({ x: lx, y: ly, right, a: 1 }); setTimeout(() => { miss = []; if (state.ui && state.ui.kind === 'scope') draw(); }, 700); }
    draw(); if (found.size === 4) setTimeout(() => { closeUI(); giveItem(k, p); }, 450);
  };
  $('pLater').onclick = () => closeUI(); draw();
}
function myPad() {
  const m = me();
  if (m.loose) return repairGame();
  if (m.doodle) { state.act = { kind: 'clean', t: 0, dur: tune.clean_time, label: ER(m).doodle.fix + ' 중…' }; return; }
  if (state.bag.length && (m.stage < 3 || m.planStatus === 'ok')) { state.act = { kind: 'build', t: 0, dur: tune.build_time, label: `${PART[state.bag[0]].name} 만드는 중…` }; return; }
  say('내 ' + ER(m).work, [m.stage < 3 || m.planStatus === 'ok' ? `지금까지 ${count(m)}/${total(m)}개 완성. 가게에서 재료를 구해 오면 여기서 만들 수 있어.` : '계획서에 도장을 받으면 여기서 우주선을 만들 수 있어.']);
}
function otherPad(v) {
  const m = me(), o = k => { const why = canPrank(m, v, k); return { off: !!why, sub: why }; };
  const E = ERAS[v.stage], peek = v.stage < 3 || !v.bot ? [] : [{ label: '계획서 엿보기', fn: () => v.planStatus === 'none' ? say(v.name, ['(아직 계획서를 쓰는 중인가 봐. 책상이 비어 있다.)']) : ask(`${v.name}의 계획서`, planHtml({ ship: v.name + '호', why: v.mission.bot[0], what: v.mission.bot[1], safe: v.mission.bot[2], pack: v.mission.bot[3] }, v.mission.name), [{ label: '닫기' }], null, true) }];
  ask(`${v.name}의 ${E.work}`, `${E.name} · ${count(v)}/${total(v)}개` + (v.stage === 3 ? ` · 임무: ${v.mission.name}` : '') + (state.t < v.shieldUntil ? ' · 경보 중' : ''), [...peek,
    Object.assign({ label: '물건 들고 튀기', fn: () => { prank(m, v, 'hide'); sfx('pop'); toast(`${PART[m.carry.part].name} 획득! 멀리 가서 숨기자`, 'good'); } }, o('hide')),
    Object.assign({ label: E.loose.act, fn: () => { prank(m, v, 'loose'); sfx('pop'); toast(`${E.loose.act} 성공. 튀어!`, 'good'); } }, o('loose')),
    Object.assign({ label: E.doodle.act, fn: () => { prank(m, v, 'doodle'); sfx('pop'); toast(`${E.doodle.act} 성공. 튀어!`, 'good'); } }, o('doodle')),
    { label: '그냥 갈래' }]);
}
function repairGame() {
  openUI({ kind: 'repair', mid: true, ang: 0, hits: 0, goal: rng() * 6.28, tap: false });
  $('modal').innerHTML = '<div class="bubble" style="width:min(420px,92vw);text-align:center"><div class="who">${ER(me()).loose.fix}</div>${ER(me()).loose.game}<canvas id="dial" width="440" height="440" style="width:220px;height:220px"></canvas><div id="dialN"></div></div>';
  $('modal').onclick = () => { if (state.ui) state.ui.tap = true; };
}
function launchCheck() {
  const m = me(), n = count(m), miss = [];
  if (m.planStatus !== 'ok') miss.push('계획서 도장');
  ['suit', 'ship', 'cargo'].forEach(g => { const all = PARTS.filter(p => p.group === g), got = all.filter(p => m.parts[p.id]).length; if (got < all.length) miss.push(`${{ suit: '우주복', ship: '우주선', cargo: '짐' }[g]} ${got}/${all.length}`); });
  if (m.loose) miss.push('풀린 나사'); if (m.doodle) miss.push('낙서');
  const fly = () => { if (!state.plan.ship) state.plan.ship = '선생님호'; if (!m.mission) m.mission = pick(MISSIONS); liftOff(m); state.launching = { t: 0 }; };
  if (KK) return ask('발사 관제탑 · 깍두기', miss.length ? `아직 부족한 것: ${miss.join(', ')}<br>선생님은 그래도 발사할 수 있어요.` : '모든 점검 통과! 발사할까요?', [{ label: '발사!', sub: miss.length ? '깍두기 통과' : '', fn: fly }, { label: '아직' }]);
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
  const c = { note: $('tnote') ? $('tnote').value.trim() : '', pin: $('tpin') ? $('tpin').value.trim() : '' }; closeUI(); sfx('blip'); if (o.fn) o.fn(c);
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
    if (u.hits >= tune.repair_hits) { me().loose = false; refreshActor(me()); closeUI(); toast(ER(me()).loose.fixed, 'good'); sfx('ok'); }
  } else if (['plan', 'nono', 'moon', 'stairs', 'train', 'scope'].includes(u.kind) && pressed('Escape') && $('pLater')) $('pLater').click();
}

// ---- The quest line: always one next thing ---------------------------------------------------------
function quest() {
  const m = me();
  if (state.launching) return { text: '발사!!' };
  if (m.carry) return { text: '들고 튀어! 멀리 가서 바닥이나 보물상자에 숨기자' };
  const E = ER(m), C = m.stage < 3 ? CHIEF_SPOT(m.stage) : null;
  const here = zoneOf(m.z); if (here < m.stage && here < 3) return Object.assign({ text: `선생님 OK! 언덕 위 시간의 포탈로 들어가 ${ERAS[here + 1].name}로 가자` }, PORTAL[here]);
  if (C) {
    if (!state.met[m.stage]) return Object.assign({ text: `${E.name}에 왔다! ${E.chief}에게 인사하자` }, C);
    if (m.testStatus === 'sent') return Object.assign({ text: `선생님 OK를 기다리는 중… ${E.chief}에게 가면 선생님께 보여 드릴 수 있어` }, C);
    if (m.testStatus === 'back') return Object.assign({ text: `그림이 돌아왔어! ${E.chief}에게 가서 다시 그려 보자` }, C);
  } else {
    if (!m.mission) return Object.assign({ text: '우주 시대 도착! 광장의 뽑기 기계에서 임무 카드를 뽑자' }, PLACES.gacha);
    if (m.planStatus === 'none') return Object.assign({ text: '본부 책상에서 탐사 계획서를 쓰자' }, PLACES.desk);
    if (m.planStatus === 'back') return Object.assign({ text: '계획서가 돌아왔어! 책상에서 고쳐 쓰자' }, PLACES.desk);
    if (m.planStatus === 'sent') return Object.assign({ text: '도장을 기다리는 중… 책상에서 선생님께 보여 드리자' }, PLACES.desk);
  }
  const th = state.actors.find(a => a !== m && a.carry && a.carry.owner === m.id);
  if (th) return { text: `${josa(th.name, '이', '가')} 내 ${josa(PART[th.carry.part].name, '을', '를')} 들고 튄다! 잡아라!`, x: th.x, z: th.z };
  const h = state.hidden.find(x => x.owner === m.id);
  if (h) return h.chest ? { text: `내 ${josa(PART[h.part].name, '이', '가')} 보물상자에! 뚜껑이 들썩이는 상자를 찾자 (축소해서 둘러보기)` } : { text: `숨겨진 ${josa(PART[h.part].name, '을', '를')} 찾아오자! 반짝이는 곳`, x: h.x, z: h.z };
  if (m.loose) return Object.assign({ text: `${E.loose.done} 내 ${E.work}에서 ${E.loose.fix}` }, m.pad);
  if (m.doodle) return Object.assign({ text: `${E.doodle.done} 내 ${E.work}에서 ${E.doodle.fix}` }, m.pad);
  const next = eraParts(m.stage).find(p => !m.parts[p.id] && !m.away[p.id] && !state.bag.includes(p.id));
  if (state.bag.length && (!next || state.bag.length >= tune.bag_size)) return Object.assign({ text: `내 ${E.work}에서 만들자` }, m.pad);
  if (next) { const s = SHOP[next.shop], k = keeperSpot(s); return { text: `${s.name}에서 ${next.item} 구하기` + (state.bag.length ? ' (또는 내 자리에서 만들기)' : ''), x: k.x, z: k.z }; }
  if (C) { const tt = (state.tests[m.stage] || {}).revealed ? E.test.title : E.test.pub || E.test.title; return Object.assign({ text: `모두 완성! ${E.chief}에게 ${josa(tt, '을', '를')} 보자` }, C); }
  return Object.assign({ text: '준비 끝! 북쪽 발사대로 가자' }, PLACES.launch);
}

// ---- Scenes ---------------------------------------------------------------------------------------
function setScene(s) {
  scene = s; const play = s === 'play' || s === 'pause';
  ['parts', 'quest', 'top', 'bag', 'act', 'stick', 'toasts', 'zoomer', 'eraBanner'].forEach(id => $(id).classList.toggle('hide', !play));
  $('title').classList.toggle('hide', s !== 'title'); $('pause').classList.toggle('hide', s !== 'pause'); $('results').classList.toggle('hide', s !== 'results'); $('lobby').classList.toggle('hide', s !== 'lobby');
  if (s === 'title') $('bSkyT').classList.toggle('hide', !skyOpen());
  if (s !== 'play') { $('ring').classList.add('hide'); $('prompt').style.transform = 'translate(-999px,0)'; }
  if (s === 'figures') buildLineup();
}
function start() {
  const room = ($('roomIn').value || '').replace(/\D/g, '').slice(0, 6);
  if (MP.on) return location.reload(); // a new game in a room: come back in fresh
  if ($('bStart').disabled) return; // already joining
  if (KK_URL && !KK) { // 깍두기 선생님: 암호 한 번
    if (!kkOK()) { if (!pinOK($('kkPin').value)) { $('joinMsg').textContent = '선생님 암호가 달라요.'; $('kkPin').value = ''; sfx('bad'); return; } try { sessionStorage.setItem('sf:teacher', '1'); } catch (e) { /* fine */ } }
    KK = true; $('kkPin').blur();
  }
  if (!room) { reset(); setScene('play'); sfx('ok'); return; }
  const msg = $('joinMsg'), b = $('bStart'); b.disabled = true; msg.textContent = '연결 중…';
  mpJoin(room, t => { msg.textContent = t; }).then(mode => {
    let beat = 0; // 대기실에서도 '들어왔어요' 신호를 보내 선생님 방과 친구 대기실에 이름이 보이게
    const play = () => { setScene('play'); sfx('ok'); toast(`${room}번 방 · 출발! (${mode === 'rest' ? '직접 연결' : '실시간 연결'}) 반 친구들과 함께 시간 여행 시작`, 'good'); };
    const go = () => { clearInterval(beat); msg.textContent = ''; if (scene !== 'lobby') return play(); $('lbWait').innerHTML = '<b style="font-size:54px;color:#2f9e77">출발!</b>'; sfx('ok'); setTimeout(play, 900); };
    if (MP.go || KK) return go(); // 이미 시작한 방(늦게 온 친구 · 새로고침)과 깍두기 선생님은 바로
    msg.textContent = ''; $('lbRoom').textContent = room; $('lbMe').textContent = me().name; lobbyDraw(); setScene('lobby'); sfx('blip');
    beat = setInterval(mpTick, 500); MP.onGo = go;
  })
    .catch(e => { console.warn('join', e && e.message); b.disabled = false; msg.textContent = (e && e.message === 'block' ? '학교 인터넷이 게임 서버를 막고 있어요.' : '게임 서버가 대답하지 않아요.') + ' [시작]을 한 번 더 눌러 보거나, 방 번호를 비우고 혼자 해 보세요.'; });
}
// 대기실: 방에 들어온 친구들 이름이 하나씩 늘어나고, 선생님이 [다같이 시작]을 누르면 "출발!"
function lobbyDraw() {
  const now = MP.net ? MP.net.now() : 0, others = Object.entries(MP.players || {}).filter(([id, p]) => id !== MP.id && p && live(MP.pos[id], now)).map(([, p]) => p);
  const kids = others.filter(p => !p.kk), kk = others.some(p => p.kk), chip = (n, c) => `<span class="lbChip ${c}">${esc(n)}</span>`;
  const html = chip(me().name + ' (나)', 'me') + (kk ? chip('★ 선생님', 'kk') : '') + kids.map(p => chip(p.n, '')).join('');
  $('lbCount').textContent = `들어온 친구 ${kids.length + 1}명`;
  if ($('lbNames').dataset.h !== html) { $('lbNames').dataset.h = html; $('lbNames').innerHTML = html; }
}
// 우주 무한 계단: 우주선을 발사(탈출)한 학생에게 열린다. 이 기기에 기억해 두어 다음에 첫 화면에서도 할 수 있다.
function skyOpen() { try { return localStorage.getItem('sf:sky') === '1'; } catch (e) { return false; } }
function skyStairs() { const back = scene; setScene('sky'); stairsGame({ name: me().name }, null, () => setScene(back)); }
function setZoom(dir) { zoom = Math.max(tune.zoom_min, Math.min(tune.zoom_max, zoom * Math.pow(tune.zoom_step, dir))); if (Math.abs(zoom - 1) < 0.12) zoom = 1; }
const SKIES = [[0xf5c79a, 0xf6d3b0], [0xa9dcf2, 0xc9e8f2], [0x9fbbe0, 0xbccbe2], [0x2e2559, 0x6c5fa8]]; // dusk, spring sky, hazy sky, space
function showIsland(e) { // only one island is drawn at a time; each has its own sky
  if (W3.shown === e) return; W3.shown = e; W3.stages.forEach((g, i) => { g.visible = i === e; });
  W3.scene.background.setHex(SKIES[e][0]); W3.scene.fog.color.setHex(SKIES[e][1]); W3.sky.visible = e === 3;
}
function view(x, z, up = 0, back = 0) { // the camera at the current zoom; far out, the ground flattens into a map
  showIsland(zoneOf(z));
  const Z = zoomNow; lookAtSpot(x, z, tune.cam_height * Z + up, tune.cam_back * Math.pow(Z, 0.8) + back);
  BEND.uCurve.value = tune.curve / (Z * Z); W3.scene.fog.near = 48 * Z; W3.scene.fog.far = 110 * Z;
}
function playStep(dt) {
  const m = me(); state.t += dt;
  if (Math.floor(state.t * 2) !== Math.floor((state.t - dt) * 2)) pollReq();
  music(zoneOf(W3.focus.z));
  const zn = zoneOf(m.z); if (zn > state.seenEra && !m.launched && !state.warp) { state.seenEra = zn; eraBanner(zn); }
  if (state.warp) { // spin, flash white, land on the next island, fade back in
    const w = state.warp; w.t += dt; m.moving = false; m.mesh.rotation.y += dt * 14; m.mesh.scale.setScalar(Math.max(0.05, w.t < 0.7 ? 1 - w.t / 0.7 : (w.t - 0.7) / 0.7));
    if (!w.done && w.t >= 0.7) { w.done = true; warpTo(m, w.to); lookAtSpot(m.x, m.z, tune.cam_height * zoomNow, tune.cam_back * Math.pow(zoomNow, 0.8), true); }
    $('warp').style.opacity = w.t < 0.7 ? w.t / 0.7 : Math.max(0, 1 - (w.t - 0.7) / 0.7);
    if (w.t >= 1.4) { state.warp = null; m.mesh.scale.setScalar(1); $('warp').style.opacity = 0; }
  } else if (zn < 3 && !state.ui && !m.launched) {
    const d = dist(m, PORTAL[zn]);
    if (m.stage > zn && d < 1.4) { state.warp = { t: 0, to: zn + 1 }; state.near = null; sfx('warp'); events.push('warp:' + (zn + 1)); }
    else if (m.stage <= zn && d < 3.4 && state.t > (state.lockMsg || 0)) { state.lockMsg = state.t + 8; toast(`포탈이 잠겨 있어. ${ERAS[zn].chief}의 시험에 선생님 OK를 받으면 열려!`); }
  }
  if (state.ui) uiStep(dt);
  else if (state.launching || state.warp) { /* watching the rocket, or flying through a portal */ }
  else if (state.act) {
    const a = state.act; a.t += dt; m.moving = false;
    if (a.t >= a.dur) {
      state.act = null;
      if (a.kind === 'clean') { m.doodle = false; refreshActor(m); toast(ER(m).doodle.fixed, 'good'); sfx('ok'); }
      else { const id = state.bag.shift(); install(m, id); sfx('ok'); state.score = count(m); toast(`${PART[id].name} 완성! (${count(m)}/${total(m)})`, 'good'); events.push('built:' + id); if (state.bag.length) state.act = { kind: 'build', t: 0, dur: tune.build_time, label: `${PART[state.bag[0]].name} 만드는 중…` }; }
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
  if (state.ui || state.act || state.launching || state.warp) { m.moving = false; state.near = null; }
  if (!state.staged && state.t >= tune.staged_prank_at && state.actors.length > 2) { // the first minute: a friend runs off with a friend's hull
    state.staged = true; const th = state.actors[2], v = state.actors[1], pid = v.order[v.order.length - 1];
    if (pid && !canPrank(Object.assign({}, th, { prankReady: 0 }), v, 'hide')) { th.prankReady = 0; th.tasks.length = 0; planPrank(th, v, { x: PLACES.spawn.x - 1.5, z: PLACES.spawn.z - 3 }); th.tasks.push(act(() => toast(`어? ${josa(th.name, '이', '가')} ${v.name}의 ${josa(PART[pid].name, '을', '를')} 들고 튄다!`))); const t0 = th.tasks.pop(); th.tasks.splice(1, 0, t0); }
  }
  state.actors.forEach(a => { if (a.bot) botStep(a, dt); }); mpMove(dt); mpTick();
  const fz = zoneOf(W3.focus.z); // only the island the camera is on is drawn

  keepers.forEach(k => { k.mesh.visible = zoneOf(k.z) === fz; }); state.chests.forEach(c => { c.g.visible = zoneOf(c.z) === fz; });
  state.actors.forEach(a => {
    if (a.launched) return;
    a.mesh.visible = zoneOf(a.z) === fz; a.proj.visible = a.padG.visible = zoneOf(a.pad.z) === fz;
    a.mesh.position.set(a.x, a.h, a.z); a.mesh.rotation.y = a.face; if (a.mesh.visible) animateKid(a.mesh, a.moving, dt, state.t);
    const u = a.proj.userData; u.tilt.rotation.z = a.loose && a.stage === 3 ? 0.2 + Math.sin(state.t * 5 + a.i) * 0.04 : 0;
  });
  W3.anim.forEach(f => f(state.t));
  W3.portals.forEach((g, e) => { const open = m.stage > e, u = g.userData; u.lock.visible = !open; u.swirl.rotation.z -= dt * (open ? 3 : 0.3); u.swirl.material.color.setHex(open ? 0xffffff : 0x8f86a8); });
  state.sparks = state.sparks.filter(p => { p.t += dt; p.m.position.x += p.vx * dt; p.m.position.z += p.vz * dt; p.m.position.y += dt * 2; p.m.rotation.y += dt * 6; p.m.scale.setScalar(Math.max(0.01, 1 - p.t)); if (p.t > 1) dyn.remove(p.m); return p.t <= 1; });
  state.hidden.forEach(h => { if (h.st) { h.st.rotation.y += dt * 3; h.st.position.y = 1.5 + Math.sin(state.t * 4) * 0.15; } });
  state.chests.forEach(c => { if (c.items) { const u = c.g.userData; u.lid.rotation.x = -0.3 - Math.abs(Math.sin(state.t * 5)) * 0.25; u.spark.rotation.y = state.t * 3; } });
  zoomNow += (zoom - zoomNow) * 0.15;
  state.foot = state.foot.filter(f => { f.t -= dt; if (f.t <= 0) dyn.remove(f.m); return f.t > 0; });
  state.fx = state.fx.filter(f => { f.t += dt; f.r.position.y = 0.4 + f.t * f.t * 1.4; f.fl.scale.set(1, 0.8 + Math.sin(f.t * 50) * 0.3, 1); f.r.rotation.y += dt * 0.6; if (f.t > 8) dyn.remove(f.r); return f.t <= 8; });
  const before = state.toasts.length; state.toasts = state.toasts.filter(t => (t.t -= dt) > 0); if (state.toasts.length !== before) state.hud = '';
  W3.twinkles.forEach(s => { s.scale.setScalar(0.75 + Math.sin(state.t * 3 + s.userData.k) * 0.3); s.rotation.y = state.t + s.userData.k; });
  W3.planet.position.x = 150 - (state.t * 1.2) % 300; W3.planet.rotation.y = state.t * 0.05;
  const q = quest(); state.questText = q.text;
  marker.visible = q.x !== undefined && zoneOf(q.z) === zoneOf(m.z); if (marker.visible) { marker.position.set(q.x, gh(q.x, q.z) + 4.6 + zoomNow + Math.sin(state.t * 4) * 0.25, q.z); marker.rotation.y = state.t * 2.5; marker.scale.setScalar(1 + (zoomNow - 1) * 0.5); }
  if (state.launching) {
    const L = state.launching; L.t += dt; zoom = 1; view(PLACES.launch.x, PLACES.launch.z + 5, L.t * 0.8, 3);
    if (L.t > 5) finish();
  } else view(m.x, m.z);
}
function finish() {
  const m = me(), mine = MP.fame[MP.id], rank = MP.on && mine ? 1 + Object.values(MP.fame).filter(t => t < mine).length : state.fame.indexOf(m.name) + 1;
  state.gained = `${rank}번째로 발사 성공! 임무: ${m.mission.name}`; state.score = 10;
  try { localStorage.setItem('sf:sky', '1'); } catch (e) { /* 저장이 안 돼도 이번 화면에서는 할 수 있다 */ }
  const trip = ERAS.slice(0, 3).map((E, i) => `${E.name} ${fmt(m.eraTime[i] || 0)}`).join(' → ') + ` → 발사 ${fmt(state.t)}`;
  const kids = state.actors.filter(a => !a.kk).length, head = KK ? '깍두기 선생님, 발사 성공!' : `발사 성공! ${kids}명 중 ${rank}번째로 우주에 나갔어요`;
  $('results').innerHTML = `<div class="panel"><b style="font-size:30px">${head}</b><div style="font-size:16px;color:#8a7fa8;margin:4px 0 8px">시간 여행 기록: ${trip}</div><canvas id="pic" width="1400" height="560"></canvas>
    <div style="margin-top:10px"><b>${esc(state.plan.ship || '')}</b>의 임무 일지 · ${m.mission.name}</div><div style="font-weight:400;font-size:18px">${esc(state.plan.what || '')}</div>
    <div style="margin-top:8px">명예의 전당</div><ol id="fame">${state.fame.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><button class="big" id="bSky" style="background:#8fd3ff;box-shadow:0 6px 0 #4f8fc0">우주 무한 계단 도전!</button><button class="big" id="bAgain">다시 하기 (Enter)</button></div>`;
  drawMission($('pic').getContext('2d'), m.mission.id, 1400, 560); $('bAgain').onclick = start; $('bSky').onclick = skyStairs;
  setScene('results'); sfx('ok');
}
function drawWorld() {
  W3.r.render(W3.scene, W3.cam);
  // Name tags: me first, then places, then whoever is near. A tag never covers the HUD or another tag.
  const m = me(), play = scene === 'play' || scene === 'pause', list = [], taken = [], off = el => { el.style.transform = 'translate(-999px,0)'; };
  if (play) ['parts', 'questbox', 'top', 'bag', 'act', 'zoomer', 'stickBase'].forEach(id => { const b = $(id).getBoundingClientRect(); if (b.width) taken.push([b.left - 6, b.top - 6, b.right + 6, b.bottom + 6]); });
  const n = state.near, pr = $('prompt');
  if (n && scene === 'play') { pr.textContent = n.label; const p = toScreen(n.x, n.y + gh(n.x, n.z), n.z), w = pr.offsetWidth; pr.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`; taken.push([p.x - w / 2 - 4, p.y - 40, p.x + w / 2 + 4, p.y + 2]); } else off(pr);
  const put = (el, x, y, z, pri) => list.push({ el, x, y, z, pri }), close = zoomNow < 1.9;
  if (!m.launched && !state.warp) put(m.tag, m.x, m.h + 2.75 * Math.max(1, zoomNow * 0.35), m.z, 0); else off(m.tag);
  const seen = 38 * zoomNow + 14; // names beyond the fog are not shown
  const fz = zoneOf(W3.focus.z);
  places.forEach(p => { if (zoneOf(p.z) === fz && Math.abs(p.z - W3.focus.z) < seen) put(p.tag, p.x, p.y + gh(p.x, p.z), p.z, p.mine ? 1 : 2); else off(p.tag); });
  keepers.forEach(k => { if (close && zoneOf(k.z) === fz && dist(m, k) < 13) put(k.tag, k.x, k.y + gh(k.x, k.z), k.z, 3); else off(k.tag); });
  state.actors.forEach(a => { if (a === m) return; const d = dist(m, a); if (!a.launched && close && zoneOf(a.z) === fz && d < 15) put(a.tag, a.x, a.h + 2.75, a.z, 4 + d); else off(a.tag); });
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
  const E = ER(m), mates = state.actors.filter(a => a.stage === m.stage && !a.launched).length - 1;
  const key = [state.questText, m.stage, mates, PARTS.map(p => m.parts[p.id] ? 1 : state.bag.includes(p.id) ? 2 : 0).join(''), state.bag.join(), state.fame.length, state.toasts.map(t => t.msg).join('|')].join('#');
  if (key === state.hud) return; state.hud = key;
  $('quest').textContent = state.questText;
  $('rank').textContent = `발사 ${state.fame.length}/${state.actors.filter(a => !a.kk).length}`;
  $('eraLine').textContent = `${E.name} ${count(m)}/${total(m)} · 같은 시대 친구 ${mates}명`;
  const P = $('partIcons'), EP = eraParts(m.stage); if (P.dataset.era !== String(m.stage)) { P.dataset.era = m.stage; P.innerHTML = ''; EP.forEach(p => { const c = document.createElement('canvas'); c.width = c.height = 68; P.appendChild(c); icon(c.getContext('2d'), p.id); }); }
  EP.forEach((p, i) => { P.children[i].className = m.parts[p.id] ? 'on' : state.bag.includes(p.id) ? '' : 'off'; });
  const B = $('bag'); B.innerHTML = '가방 '; for (let i = 0; i < Math.max(tune.bag_size, state.bag.length); i++) { if (state.bag[i]) { const c = document.createElement('canvas'); c.width = c.height = 68; B.appendChild(c); icon(c.getContext('2d'), state.bag[i]); } else { const d = document.createElement('div'); d.className = 'slot'; B.appendChild(d); } }
  $('toasts').innerHTML = state.toasts.slice(-3).map(t => `<div class="toast ${t.kind}">${esc(t.msg)}</div>`).join('');
}
const scenes = {
  figures: { update(dt) { state.t += dt; }, draw() { showIsland(3); W3.stages[3].visible = false; W3.cam.position.set(0, 5, -374); W3.cam.lookAt(0, 1.7, -400); BEND.uCamZ.value = -450; W3.r.render(W3.scene, W3.cam); lineup.forEach((f, i) => { const p = toScreen(f.x, -0.25 - (i % 2) * 0.75, -400); f.tag.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,0)`; }); } },
  title: {
    update(dt, lobby) { state.t += dt; W3.planet.position.x = 150 - (state.t * 1.2) % 300; W3.anim.forEach(f => f(state.t)); state.actors.forEach(a => { a.mesh.position.set(a.x, a.h, a.z); a.mesh.visible = zoneOf(a.z) === 0; animateKid(a.mesh, false, dt, state.t); }); zoomNow = 1; view(PLACES.spawn.x, PLACES.spawn.z - 3); if (!lobby && (pressed('Enter') || pressed('Space'))) start(); },
    draw() { drawWorld(); },
  },
  play: { update: playStep, draw() { drawWorld(); drawHud(); } },
  pause: { update() { if (pressed('KeyP') || pressed('Escape') || pressed('Enter')) setScene('play'); }, draw() { drawWorld(); } },
  results: { update(dt) { state.t += dt; mpTick(); if (pressed('Enter')) start(); }, draw() { drawWorld(); } }, // 발사한 뒤에도 방에 남아 있다는 신호
  lobby: {
    update(dt) { scenes.title.update.call(null, dt, true); if ((state.lobbyT = (state.lobbyT || 0) + dt) > 0.5) { state.lobbyT = 0; lobbyDraw(); } },
    draw() { drawWorld(); },
  },
  sky: { update() { mpTick(); }, draw() { /* 계단 놀이가 화면을 덮고 있으니 3D는 쉰다 (디벗 배터리) */ } },
};

// ---- The figures sheet: every kind of figure side by side, named ---------------------------------
function buildLineup() {
  if (lineup) return; lineup = []; closeUI(true);
  const floor = mesh(cyl(22, 22, 0.2, 48), mat(0x9fe6c3), 0, -0.1, -400); dyn.add(floor);
  const add = (m, name) => { const x = (lineup.length - 6) * 2.25; m.position.set(x, 0, -400); dyn.add(m); lineup.push({ x, tag: tag(name, 'npc') }); };
  ['학생: 앞머리', '학생: 뾰족머리', '학생: 동글머리', '학생: 묶음머리', '학생: 모자'].forEach((n, i) => add(makeKid({ shirt: SHIRTS[i], hair: i, hairColor: HAIR[i] }), n));
  const s = makeKid({ shirt: SHIRTS[6], hair: 0, hairColor: HAIR[1] }); dressKid(s, { suit: 1, outer: 1, helmet: 1 }); add(s, '우주복 학생');
  SHOPS.forEach((sh, i) => add(sh.era === 3 ? makeKeeper(sh.id) : makeVillager(sh.era, i), sh.keeper)); add(makeKeeper('guide'), GUIDE);
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
  if (id === 'st_fire') { L(14, 58, 54, 46); L(14, 46, 54, 58); c.beginPath(); c.moveTo(34, 8); c.quadraticCurveTo(52, 30, 44, 46); c.lineTo(24, 46); c.quadraticCurveTo(16, 30, 34, 8); c.fillStyle = '#ffa24a'; c.fill(); c.stroke(); O(34, 36, 6, '#ffe680'); }
  if (id === 'st_axe') { L(22, 60, 40, 14); c.beginPath(); c.moveTo(30, 10); c.lineTo(56, 18); c.lineTo(50, 36); c.lineTo(34, 30); c.closePath(); c.fillStyle = '#b9bccb'; c.fill(); c.stroke(); }
  if (id === 'st_wall') { R(10, 10, 48, 50, 10, '#d8c8ad'); const moon = (cx, cy, R) => { const r = R * 0.9, k = R * 0.47, x = (R * R - r * r + k * k) / (2 * k), y = Math.sqrt(R * R - x * x), t = Math.atan2(y, x), p = Math.atan2(y, x - k); c.beginPath(); c.arc(cx, cy, R, t, 6.283 - t); c.arc(cx + k, cy, r, 6.283 - p, p, true); c.closePath(); c.fillStyle = '#fff6d8'; c.fill(); c.stroke(); }; moon(26, 30, 11); [[45, 20], [42, 40], [24, 50]].forEach(([x, y]) => O(x, y, 3, '#ffd166')); }
  if (id === 'ir_tool') { c.beginPath(); c.arc(30, 30, 18, 3.6, 6.6); c.lineWidth = 7; c.strokeStyle = '#b9c2e6'; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#4a3d6b'; c.beginPath(); c.arc(30, 30, 18, 3.6, 6.6); c.stroke(); L(46, 34, 54, 60); }
  if (id === 'ir_cal') { O(34, 34, 24, '#e2d8c2'); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; O(34 + Math.cos(a) * 18, 34 + Math.sin(a) * 18, 2, '#4a3d6b'); } O(34, 34, 7, '#fff1d6'); }
  if (id === 'ir_tower') { c.beginPath(); c.moveTo(18, 60); c.quadraticCurveTo(22, 28, 26, 16); c.lineTo(42, 16); c.quadraticCurveTo(46, 28, 50, 60); c.closePath(); c.fillStyle = '#e2d8c2'; c.fill(); c.stroke(); R(22, 8, 24, 8, 2, '#d0c4aa'); R(30, 32, 8, 8, 2, '#4a3d6b'); }
  if (id === 'in_scope') { L(34, 40, 20, 62); L(34, 40, 48, 62); c.save(); c.translate(34, 30); c.rotate(-0.6); R(-24, -7, 48, 14, 6, '#e0b450'); c.restore(); }
  if (id === 'in_steam') { R(8, 26, 32, 20, 6, '#5d5a70'); R(38, 14, 22, 32, 4, '#d9534f'); R(14, 10, 8, 16, 2, '#5d5a70'); O(10, 6, 5, '#fff'); [16, 30, 48].forEach(x => O(x, 52, 7, '#e0b450')); R(42, 18, 12, 9, 2, '#bfe9ff'); }
  if (id === 'in_plane') { R(4, 18, 60, 8, 3, '#ff8a73'); R(4, 40, 60, 8, 3, '#ff8a73'); L(18, 26, 18, 40); L(50, 26, 50, 40); c.beginPath(); c.ellipse(34, 33, 22, 7, 0, 0, 6.3); c.fillStyle = '#fff5e1'; c.fill(); c.stroke(); L(58, 24, 58, 42); O(58, 33, 3, '#ffd166'); R(8, 26, 8, 6, 2, '#ff8a73'); }
  if (id === 'scan') { c.lineWidth = 12; c.strokeStyle = '#f7e08a'; c.beginPath(); c.arc(34, 30, 17, 0, 6.3); c.stroke(); c.lineWidth = 5; c.strokeStyle = '#4a3d6b'; O(34, 30, 23); O(34, 30, 11); R(12, 54, 44, 8, 4, '#fff'); }
}
function eraBanner(e) { // a big title when you first step into an era
  const E = ERAS[e], b = $('eraBanner'); b.innerHTML = `<small>${E.when}</small><b>${E.name}</b><span>${E.motto}</span>`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); sfx('ok');
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

function titleInit() { // 첫 화면: 깍두기 선생님 표시, 우주 무한 계단 버튼
  $('bSkyT').onclick = skyStairs; $('bLeave').onclick = () => location.reload();
  if (!KK_URL) return;
  $('kkBox').classList.remove('hide'); if (!$('nameIn').value) $('nameIn').value = '선생님';
  if (kkOK()) $('kkPin').classList.add('hide'); else $('kkPin').setAttribute('style', $('kkPin').getAttribute('style') + ';' + PIN_CSS);
  $('bStart').textContent = '깍두기로 들어가기 (Enter)';
}
// ---- The teacher's page (?teacher=1): every plan sent in this browser ------------------------------
function teacherPage() {
  $('ui').classList.add('hide'); $('game').classList.add('hide');
  const root = document.createElement('div'); root.id = 'teacher'; document.body.appendChild(root);
  const go = () => { const room = (params.get('room') || '').replace(/\D/g, ''); if (room) teacherRoom(root, room); else localTeacher(root); };
  let ok = false; try { ok = sessionStorage.getItem('sf:teacher') === '1'; } catch (e) { /* no storage: ask every time */ }
  if (ok) return go();
  root.innerHTML = '<h1>우주의 숲 · 선생님 화면</h1><div class="plan">선생님 암호를 넣어 주세요.<div class="row"><input id="tpinPage" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="선생님 암호" style="' + PIN_CSS + '"><button class="btn" id="tpinGo">들어가기</button></div></div>';
  const tryPin = () => { if (pinOK($('tpinPage').value)) { $('tpinPage').blur(); /* 선생님 화면은 입력 칸에 커서가 있으면 다시 그리지 않는다 */ try { sessionStorage.setItem('sf:teacher', '1'); } catch (e) { /* fine */ } go(); } else $('tpinPage').value = ''; };
  $('tpinGo').onclick = tryPin; $('tpinPage').onkeydown = e => { if (e.key === 'Enter') setTimeout(tryPin, 30); }; // 한글 조합 중 Enter: 글자가 끝난 뒤에 확인
}
// 방 열기: 1000~9999 중 아무 번호나 고르되, 이미 누가 쓰는 방이면 다른 번호로 (서버에 못 물어보면 그냥 그 번호로)
async function openRandomRoom() {
  const b = $('openRoom'); if (b) { b.disabled = true; b.textContent = '방 번호 고르는 중…'; }
  let r = 0;
  for (let i = 0; i < 6; i++) {
    r = 1000 + Math.floor(Math.random() * 9000); // 방 번호는 게임 판이 아니므로 rng() 를 쓰지 않는다
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
      const res = await fetch(`${FIREBASE.databaseURL}/rooms/forest_${r}.json?shallow=true`, { signal: ctl.signal }); clearTimeout(t);
      if (res.ok && (await res.json()) === null) break; // 빈 방
    } catch (e) { break; } // 학교망이 막아도 방은 연다
  }
  location.href = location.pathname + '?teacher=1&room=' + r;
}
function localTeacher(root) {
  let seen = '';
  const draw = () => {
    const raw = JSON.stringify(loadPlans()); if (raw === seen || (document.activeElement && document.activeElement.tagName === 'INPUT')) return; seen = raw;
    const all = loadPlans(), word = { sent: '확인 대기', ok: 'OK', back: '돌려보냄', none: '작성 중' };
    const ids = Object.keys(all).filter(id => all[id] && all[id].kind).sort((a, b) => (all[a].status === 'sent' ? 0 : 1) - (all[b].status === 'sent' ? 0 : 1) || all[b].stage - all[a].stage);
    root.innerHTML = '<h1>우주의 숲 · 선생님 화면</h1><div class="plan">반 전체가 함께 하려면 방을 여세요. 방 번호(4자리)는 저절로 정해집니다. <div class="row"><button class="btn" id="openRoom">방 열기</button></div></div><div>혼자 하기(봇과 함께)로 낸 것은 아래에 보여요. 석기 · 철기 · 산업 시대의 그림과 우주 시대 탐사 계획서를 보고 OK를 눌러 주세요. OK가 나면 학생 섬의 시간의 포탈이 열립니다. 이 화면은 같은 기기, 같은 브라우저에서 낸 것만 보여 줍니다. 학생 기기에서 바로 OK할 때도 이 화면과 같은 선생님 암호를 씁니다.</div>' +
      (ids.length ? '' : '<div class="plan">아직 제출된 시험지나 계획서가 없습니다.</div>') + ids.map(id => { const p = all[id], plan = p.kind === 'plan';
        return `<div class="plan"><h2>${esc(p.name)} · ${ERAS[p.stage].name} ${plan ? '탐사 계획서' : ERAS[p.stage].test.title} <span class="stamp ${p.status}">${word[p.status]}</span></h2>` +
          (plan ? `임무: ${esc(p.mission)} · 우주선: ${esc(p.fields.ship || '')}<dl>` + PLAN_FIELDS.slice(1).map(f => `<dt>${f.label}</dt><dd>${esc(p.fields[f.key] || '')}</dd>`).join('') + '</dl>'
            : (p.img ? `<img src="${p.img}" style="max-width:480px;width:100%;border-radius:14px;display:block">` : '') + `<div>제목: <b>${esc(p.fields.title || '')}</b></div>`) +
          `<div class="row"><input id="n_${id}" placeholder="학생에게 한마디" value="${esc(p.note || '')}"><button class="btn" data-id="${id}" data-s="ok">OK 도장</button><button class="btn" data-id="${id}" data-s="back">돌려보내기</button></div></div>`; }).join('');
    root.querySelectorAll('button[data-id]').forEach(b => { b.onclick = () => { setStatus(b.dataset.id, b.dataset.s, $('n_' + b.dataset.id).value.trim()); seen = ''; draw(); }; });
    $('openRoom').onclick = openRandomRoom;
  };
  draw(); setInterval(draw, 1000); addEventListener('storage', draw);
}
