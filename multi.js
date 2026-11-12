// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: the class room. Everyone in one room plays together over the school Wi-Fi, through the same
// free Firebase database as Star-Party and Star-Wingtto (path rooms/forest_<room>). Each tablet owns its
// own kid: it writes where it is and what it has made; a prank is a message to the victim's tablet, which
// applies it to itself. ?local joins tabs of one browser instead (for testing on one computer).
'use strict';

const FIREBASE = { // not a secret: a web app's Firebase settings are public by design
  apiKey: 'AIzaSyAAwMy-r61onIGMR2sbDekmXkc5f3PjkI8',
  authDomain: 'moonclipse-star-party.firebaseapp.com',
  databaseURL: 'https://moonclipse-star-party-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'moonclipse-star-party',
  storageBucket: 'moonclipse-star-party.firebasestorage.app',
  messagingSenderId: '984441301984',
  appId: '1:984441301984:web:5f13cb2fbf4232e9291985',
};
const MP = { on: false, net: null, id: '', room: '', slot: 0, players: {}, pos: {}, req: null, fame: {}, sent: '', sentAt: 0, nextSend: 0, sentPos: '', posAt: 0, nextPos: 0, nextSync: 0, first: true };
// 반 전체(30대)가 한 방에: 자주 바뀌는 위치(q/<id>, 짧은 배열)와 가끔 바뀌는 상태(p/<id>)를 나눠 보낸다.
// 예전처럼 상태 전체를 1초에 4~5번 보내면 30대에서 한 시간에 3 GB 가까이 오가서 무료 한도(한 달 10 GB, 별 파티 · 스타-윙또와 같이 씀)를 넘길 수 있다.
const POS_EVERY = 350, POS_BEAT = 5000, STATE_BEAT = 20000; // ms: 움직일 때 위치 간격 · 서 있을 때 살아 있다는 신호 · 상태 다시 보내기

// ---- The connection (from Star-Wingtto's racenet.js): web socket → long polling → plain https ------------
const NET_LOCAL = /[?&]local\b/.test(location.search);
const within = (p, ms, code) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(code)), ms))]);
const nflag = (k, v) => { try { if (v === undefined) return localStorage.getItem(k) === '1'; localStorage.setItem(k, '1'); } catch (e) { return false; } };
// 저장된 값 → 원래 값. 폴더({id: JSON 글})도 풀어 준다(스타-윙또 2026-10-27 의 '이미 누가 있는 방에 못 들어가던' 원인).
// 망가진 글 하나가 섞여 있어도 그것만 빼고 읽는다 — 한 대 때문에 반 전체가 못 들어오는 일이 없게
const ndec = v => { if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } } return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ndec(x)])) : null; };
async function netConnect(room, stage = () => {}) {
  const base = `rooms/forest_${room}`;
  if (!NET_LOCAL) {
    if (!nflag('forest:rest')) { try { return await sdkNet(base, stage); } catch (e) { console.warn('forest sdk', e.message); } }
    const net = await restNet(base, stage); nflag('forest:rest', 1); return net;
  }
  const K = p => `forest:${base}/${p}`, subs = new Set(), fire = k => subs.forEach(s => s(k));
  addEventListener('storage', e => e.key && fire(e.key));
  const read = k => { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); };
  const kids = p => { const pre = K(p) + '/', o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre) && !k.slice(pre.length).includes('/')) o[k.slice(pre.length)] = read(k); } return o; };
  return {
    mode: 'local', now: () => Date.now(),
    set(p, v) { localStorage.setItem(K(p), JSON.stringify(v)); fire(K(p)); },
    del(p) { const k = K(p), pre = k + '/'; for (let i = localStorage.length - 1; i >= 0; i--) { const x = localStorage.key(i); if (x === k || x.startsWith(pre)) localStorage.removeItem(x); } fire(k); },
    on(p, cb) { const k = K(p); subs.add(x => x === k && cb(read(k))); cb(read(k)); },
    onKids(p, cb) { const pre = K(p) + '/', k = K(p); subs.add(x => (x === k || x.startsWith(pre)) && cb(kids(p))); cb(kids(p)); },
    get: async p => read(K(p)) ?? (Object.keys(kids(p)).length ? kids(p) : null),
  };
}
async function sdkNet(base, stage) {
  const V = '10.12.2'; stage('게임 프로그램 불러오는 중…');
  const [{ initializeApp, getApps }, fb] = await within(Promise.all([import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`)]), 12000, 'sdk');
  if (nflag('forest:longpoll')) fb.forceLongPolling();
  const db = fb.getDatabase(getApps()[0] || initializeApp(FIREBASE));
  const linked = () => new Promise(ok => { const off = fb.onValue(fb.ref(db, '.info/connected'), s => { if (s.val()) { off(); ok(); } }); });
  stage('게임 서버에 연결 중…');
  try { await within(linked(), 6000, 'db'); } catch (e) {
    stage('다른 길로 다시 연결 중…'); fb.forceLongPolling(); nflag('forest:longpoll', 1); fb.goOffline(db); fb.goOnline(db);
    try { await within(linked(), 7000, 'db'); } catch (e2) { fb.goOffline(db); throw e2; }
  }
  const r = p => fb.ref(db, `${base}/${p}`), val = s => (s.exists() ? ndec(s.val()) : null);
  let off = 0; fb.onValue(fb.ref(db, '.info/serverTimeOffset'), s => { off = s.val() || 0; });
  return {
    mode: 'online', now: () => Date.now() + off, close: () => fb.goOffline(db),
    set: (p, v) => fb.set(r(p), JSON.stringify(v)), del: p => fb.remove(r(p)),
    on: (p, cb) => fb.onValue(r(p), s => cb(val(s))),
    onKids: (p, cb) => fb.onValue(r(p), s => { const o = {}; s.forEach(c => { try { o[c.key] = JSON.parse(c.val()); } catch (e) { /* skip a bad value */ } }); cb(o); }),
    get: async p => val(await within(fb.get(r(p)), 10000, 'db')),
  };
}
async function restNet(base, stage) {
  stage('서버 주소로 직접 연결 중…');
  const U = `${FIREBASE.databaseURL}/${base}`;
  const req = async (p, opt) => { let res; try { res = await within(fetch(`${U}${p ? '/' + p : ''}.json`, opt), 10000, 'block'); } catch (e) { throw new Error('block'); } if (!res.ok) throw new Error('db'); return res.json(); };
  const tk = `_t/${Math.random().toString(36).slice(2, 10)}`, t1 = Date.now();
  const ts = await req(tk, { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) }); const off = ts - (t1 + Date.now()) / 2;
  req(tk, { method: 'DELETE' }).catch(() => {});
  let tree = null; const seg = p => p.split('/').filter(Boolean), at = p => seg(p).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), tree);
  const put = (p, data) => { const ks = seg(p); if (!ks.length) { tree = data; return; } if (!tree || typeof tree !== 'object') tree = {}; let o = tree; for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; } if (data === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = data; };
  const parse = v => { if (typeof v !== 'string') return null; try { return JSON.parse(v); } catch (e) { return null; } };
  const subs = [], near = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/') || a === '' || b === '';
  const fire = p => { const q = seg(p).join('/'); subs.forEach(s => near(s.p, q) && s.f()); };
  const change = (p, data) => { const before = JSON.stringify(at(p) ?? null); put(p, data); if (JSON.stringify(at(p) ?? null) !== before) fire(p); };
  const es = new EventSource(`${U}.json`);
  await within(new Promise((ok, no) => {
    es.addEventListener('put', e => { const { path, data } = JSON.parse(e.data); change(path, data); ok(); });
    es.addEventListener('patch', e => { const { path, data } = JSON.parse(e.data); for (const [k, v] of Object.entries(data || {})) change(`${path}/${k}`, v); });
    es.addEventListener('cancel', () => no(new Error('db')));
  }), 10000, 'db').catch(e => { es.close(); throw e; });
  return {
    mode: 'rest', now: () => Date.now() + off,
    set: (p, v) => { const s = JSON.stringify(v); change(p, s); return req(p, { method: 'PUT', body: JSON.stringify(s) }).catch(() => {}); },
    del: p => { change(p, null); return req(p, { method: 'DELETE' }).catch(() => {}); },
    on: (p, cb) => { const s = { p: seg(p).join('/'), f: () => cb(parse(at(p))) }; subs.push(s); s.f(); },
    onKids: (p, cb) => { const s = { p: seg(p).join('/'), f: () => { const o = at(p), r = {}; if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { const x = parse(v); if (x !== null) r[k] = x; } cb(r); } }; subs.push(s); s.f(); },
    get: async p => { try { return ndec(at(p) ?? null); } catch (e) { return null; } },
  };
}

// ---- Joining a room ------------------------------------------------------------------------------------
const STALE = 45000; // a tablet silent this long has left the room
function myId() { // 깍두기 선생님 탭은 따로 (선생님 방에서 연 탭은 그 탭의 저장 공간을 물려받으므로)
  const key = KK ? 'sf:kkid' : 'sf:id', make = () => (KK ? 't' : 'k') + Math.random().toString(36).slice(2, 9);
  try { let id = sessionStorage.getItem(key); if (!id) { id = make(); sessionStorage.setItem(key, id); } return id; } catch (e) { return make(); }
}
const live = (q, now) => Array.isArray(q) && now - q[4] < STALE; // q = [x, z, 보는 방향, 걷는 중, 보낸 시각]
async function mpJoin(room, say) {
  let net = await netConnect(room, say), all, pos;
  const read = async n => { say('방에 들어가는 중…'); return Promise.all([n.get('p'), n.get('q')]); };
  try { [all, pos] = await read(net); } catch (e) { // 실시간 연결은 됐는데 방을 못 읽으면: 직접 연결로 한 번 더
    if (net.mode !== 'online') throw e;
    console.warn('forest read', e.message); if (net.close) net.close();
    say('다른 길로 다시 들어가는 중…'); net = await restNet(`rooms/forest_${room}`, say); nflag('forest:rest', 1); [all, pos] = await read(net);
  }
  all = all || {}; pos = pos || {};
  const now = net.now(), id = myId(), mine = all[id];
  const used = new Set(Object.keys(all).filter(k => k !== id && all[k] && !all[k].kk && live(pos[k], now)).map(k => all[k].sl));
  let slot = KK ? KK_SLOT : mine ? mine.sl : 0; while (!KK && !mine && used.has(slot) && slot < 29) slot++; // 깍두기 선생님은 31번째 자리
  Object.assign(MP, { on: true, net, id, room, slot, players: {}, pos: {}, req: null, fame: {}, sky: {}, sent: '', nextSend: 0, sentPos: '', nextPos: 0, first: true });
  reset(); // only me: the classmates come in as they are seen
  const m = me(); if (mine) mpRestore(m, mine, pos[id]);
  net.onKids('p', p => { MP.players = p || {}; mpSync(); });
  net.onKids('q', mpPos);
  net.onKids('ev/' + id, mpEvents);
  net.onKids('hid', mpHidden);
  net.on('req/' + id, r => { MP.req = r; if (r && r.stage === me().stage) applyReq(r); });
  net.onKids('fame', f => { MP.fame = f || {}; });
  net.onKids('sky', s => { MP.sky = s || {}; }); // 우주 무한 계단 최고 기록 {n: 이름, b: 칸}
  net.on('go', v => { MP.go = v; if (v && MP.onGo) { const f = MP.onGo; MP.onGo = null; f(); } }); // 선생님이 [다같이 시작]을 누른 시각
  return net.mode;
}
function mpRestore(m, p, q) { // a tablet that reloads comes back where it was, with what it had made
  if (Array.isArray(q)) { m.x = q[0]; m.z = q[1]; } else if (p.x != null) { m.x = p.x; m.z = p.z; } m.h = gh(m.x, m.z); m.stage = p.st || 0; m.mission = MISSIONS.find(q => q.id === p.mi) || null;
  (p.pa || '').split(',').filter(Boolean).forEach(k => { m.parts[k] = true; }); m.order = (p.or || '').split(',').filter(Boolean);
  m.planStatus = p.ps === 'ok' ? 'ok' : 'none'; for (let e = 0; e <= Math.min(2, m.stage); e++) state.met[e] = true;
  state.seenEra = zoneOf(m.z) - 1; placeWork(m); refreshActor(m); lookAtSpot(m.x, m.z, tune.cam_height, tune.cam_back, true);
}

// ---- What my tablet tells the room, a few times a second ------------------------------------------------
function mpTick() {
  if (!MP.on) return; const t = performance.now(), m = me(), r1 = v => Math.round(v * 10) / 10;
  if (t >= MP.nextPos) { // where I am: a short array, a few times a second while I walk, a heartbeat while I stand
    const pos = [r1(m.x), r1(m.z), Math.round(m.face * 100) / 100, m.moving ? 1 : 0], ps = JSON.stringify(pos);
    if (ps !== MP.sentPos || t - MP.posAt > POS_BEAT) { MP.sentPos = ps; MP.posAt = t; MP.nextPos = t + POS_EVERY; MP.net.set('q/' + MP.id, pos.concat(MP.net.now())); }
  }
  if (t >= MP.nextSync) { MP.nextSync = t + 2000; mpSync(); } // classmates who went quiet leave the island
  if (t < MP.nextSend) return; MP.nextSend = t + 250;
  const snap = { n: m.name, c: SHIRTS.indexOf(m.shirt), sl: MP.slot, st: m.stage, // what I am: only when it changes
    pa: Object.keys(m.parts).join(','), or: m.order.join(','), lo: m.loose ? 1 : 0, dd: m.doodle ? 1 : 0, ca: m.carry ? m.carry.owner + '|' + m.carry.part : '',
    la: m.launched ? 1 : 0, se: (m.stage < 3 ? m.testStatus : m.planStatus) === 'sent' ? 1 : 0, ps: m.planStatus, sd: state.t < m.shieldUntil ? 1 : 0, mi: m.mission ? m.mission.id : '' };
  if (KK) snap.kk = 1;
  const s = JSON.stringify(snap);
  if (s === MP.sent && t - MP.sentAt < STATE_BEAT) return;
  MP.sent = s; MP.sentAt = t; snap.t = MP.net.now(); MP.net.set('p/' + MP.id, snap);
}

// ---- Classmates: positions arrive often and only move them; who they are arrives rarely and builds them ----
function mpPos(all) {
  MP.pos = all || {}; const now = MP.net.now(); let changed = false;
  Object.entries(MP.pos).forEach(([id, q]) => {
    if (id === MP.id || !Array.isArray(q)) return; const a = state.actors.find(x => x.id === id);
    if (!a) { if (MP.players[id] && live(q, now)) changed = true; return; }
    a.tx = q[0]; a.tz = q[1]; a.face = q[2]; a.moving = !!q[3];
  });
  if (changed) mpSync();
}
function mpSync() {
  if (!MP.on) return; const all = MP.players, now = MP.net.now(), seen = new Set();
  Object.entries(all || {}).forEach(([id, p]) => {
    const q = MP.pos[id];
    if (id === MP.id || !p || !live(q, now)) return; seen.add(id);
    let a = state.actors.find(x => x.id === id);
    if (!a) {
      const si = Math.max(0, p.c) % SHIRTS.length;
      a = { id, i: p.kk ? KK_SLOT : p.sl % 30, kk: !!p.kk, remote: true, bot: false, name: p.n, shirt: SHIRTS[si], shirtName: SHIRT_NAMES[si], x: q[0], z: q[1], tx: q[0], tz: q[1], face: q[2], moving: false, stage: p.st,
        testStatus: 'none', planStatus: 'none', parts: {}, order: [], away: {}, loose: false, doodle: false, shieldUntil: 0, prankReady: 0, lastVictim: '', tasks: [], launched: false, carry: null, eraTime: [] };
      a.h = gh(a.x, a.z); a.mesh = makeKid({ shirt: a.shirt, hair: p.sl % 5, hairColor: HAIR[(p.sl * 3) % HAIR.length] }); dyn.add(a.mesh);
      placeWork(a); a.tag = tag(a.kk ? '★ ' + a.name : a.name, a.kk ? 'kk' : ''); state.actors.push(a);
      if (p.la) { a.launched = true; a.mesh.visible = a.proj.visible = false; }
    }
    a.tx = q[0]; a.tz = q[1]; a.face = q[2]; a.moving = !!q[3]; a.mission = MISSIONS.find(x => x.id === p.mi) || null;
    a.testStatus = a.planStatus = p.se ? 'sent' : 'none'; a.shieldUntil = p.sd ? state.t + 1 : 0;
    if (a.stage !== p.st) { a.stage = p.st; placeWork(a); }
    const parts = {}; (p.pa || '').split(',').filter(Boolean).forEach(k => { parts[k] = true; });
    const ca = p.ca ? { owner: p.ca.split('|')[0], part: p.ca.split('|')[1] } : null;
    if (JSON.stringify([parts, p.lo, p.dd, ca]) !== a.look) { a.look = JSON.stringify([parts, p.lo, p.dd, ca]); a.parts = parts; a.loose = !!p.lo; a.doodle = !!p.dd; a.carry = ca; refreshActor(a); }
    a.order = (p.or || '').split(',').filter(Boolean);
    if (p.la && !a.launched) liftOff(a);
    // 내 물건을 든 친구가 다른 시대 섬으로 갔거나 발사했으면(옛 버전 기기 등), 5초 뒤 내 가방으로 되돌린다
    if (a.carry && a.carry.owner === MP.id) {
      const far = a.launched || zoneOf(a.tz) !== zoneOf(me().pad.z);
      if (!far) a.farAt = 0; else if (!a.farAt) a.farAt = now; else if (now - a.farAt > 5000 && a.rescued !== p.ca) { a.rescued = p.ca; rescue(a); }
    }
  });
  state.actors.filter(a => a.remote && !seen.has(a.id)).forEach(a => { // gone from the room
    if (a.carry && a.carry.owner === MP.id) rescue(a); // 들고 나가 버렸으면 바로 되돌림
    [a.mesh, a.padG, a.proj].forEach(g => dyn.remove(g)); a.tag.remove(); COL.splice(COL.indexOf(a.padCol), 1); state.actors.splice(state.actors.indexOf(a), 1);
  });
  // Two tablets that joined in the same instant can pick the same work spot: the later id moves to a free one
  const clash = !KK && [...seen].some(id => !all[id].kk && all[id].sl === MP.slot && id < MP.id);
  if (clash) {
    const used = new Set([...seen].filter(id => !all[id].kk).map(id => all[id].sl)); let s = 0; while (used.has(s) && s < 29) s++;
    if (!used.has(s)) { const m = me(); MP.slot = m.i = s; placeWork(m); refreshActor(m); MP.sent = ''; toast('내 자리가 친구와 겹쳐서 옆자리로 옮겼어', ''); }
  }
  state.hud = '';
}
function rescue(a) { // 친구가 들고 간 내 물건을 되찾고, 그 친구 손에서는 내려놓게 한다 (다시 들어와도 겹치지 않게)
  gotBack(a.carry.part, a.name); mpSend(a.id, { k: 'caught', by: MP.id, auto: 1 });
}
function mpMove(dt) { // classmates glide to where their tablets last said they were
  state.actors.forEach(a => { if (!a.remote) return; const k = Math.min(1, dt * 8); a.x += (a.tx - a.x) * k; a.z += (a.tz - a.z) * k; if (Math.hypot(a.tx - a.x, a.tz - a.z) > 30) { a.x = a.tx; a.z = a.tz; } a.h = gh(a.x, a.z); });
}

// ---- Pranks and catches arrive as messages; my tablet applies them to my own kid ---------------------
function mpSend(to, ev) { MP.net.set(`ev/${to}/${MP.id}_${Date.now().toString(36)}`, ev); }
function mpEvents(list) {
  Object.entries(list || {}).forEach(([key, ev]) => {
    MP.net.del(`ev/${MP.id}/${key}`); const m = me(), by = state.actors.find(a => a.id === ev.by), E = ER(m);
    if (ev.k === 'caught') { if (m.carry) { m.carry = null; refreshActor(m); toast(ev.auto ? '들고 있던 친구 물건은 주인에게 돌아갔어' : `${by ? by.name : '친구'}에게 잡혔다! 물건을 돌려줬어`, 'bad'); sfx('bad'); } return; }
    if (ev.k === 'back') { gotBack(ev.part, by ? by.name : ''); return; }
    if (m.launched) return;
    let what = '';
    if (ev.k === 'hide' && m.parts[ev.part]) { delete m.parts[ev.part]; m.away[ev.part] = true; m.order = m.order.filter(q => q !== ev.part); what = `${josa(PART[ev.part].name, '이', '가')} 사라졌다!`; }
    if (ev.k === 'loose' && !m.loose) { m.loose = true; what = E.loose.done; }
    if (ev.k === 'doodle' && !m.doodle) { m.doodle = true; what = E.doodle.done; }
    if (!what) return;
    m.shieldUntil = state.t + tune.pad_shield; refreshActor(m); if (by) footprints(by, m);
    toast(`내 ${E.work}: ${what} ${by ? by.shirtName + '색 발자국이 남았어' : ''}`, 'bad'); sfx('alarm'); events.push('pranked:' + ev.k);
  });
}

// ---- Hidden things are shared, so every tablet sees the sparkle and the bouncing chest lid -----------
function mpHidden(all) {
  const keys = new Set(Object.keys(all || {}));
  state.hidden.filter(h => !keys.has(h.key)).forEach(h => { if (h.g) dyn.remove(h.g); if (h.chest) { h.chest.items--; showChest(h.chest); } state.hidden.splice(state.hidden.indexOf(h), 1); });
  Object.entries(all || {}).forEach(([key, v]) => {
    if (state.hidden.some(h => h.key === key)) return;
    const chest = v.c >= 0 ? state.chests[v.c] : null, h = { key, owner: v.o, part: v.p, x: chest ? chest.x : v.x, z: chest ? chest.z : v.z, chest };
    if (chest) { chest.items++; showChest(chest); } else { const g = new THREE.Group(); g.position.set(v.x, gh(v.x, v.z), v.z); const pm = partMesh(v.p); pm.position.y = 0.4; g.add(pm); h.st = mesh(starGeo(0.22, 0.06), glow(0xfff3a0), 0, 1.5, 0); g.add(h.st); dyn.add(g); h.g = g; }
    state.hidden.push(h);
    if (v.o === MP.id && !MP.first) toast(chest ? `내 ${josa(PART[v.p].name, '이', '가')} 보물상자 어딘가에 숨겨졌어. 뚜껑이 들썩이는 상자를 찾자!` : `내 ${josa(PART[v.p].name, '이', '가')} 어딘가에 숨겨졌어. 반짝이는 곳을 찾자!`, 'bad');
  });
  MP.first = false;
}

// ---- The teacher's room page: who is where, and every drawing and plan waiting for an OK ------------
async function teacherRoom(root, room) {
  root.innerHTML = '<h1>우주의 숲 · 선생님 방</h1><div id="tstat">연결 중…</div>';
  let net; try { net = await netConnect(room, t => { $('tstat').textContent = t; }); } catch (e) { $('tstat').textContent = '연결하지 못했어요. 학교 인터넷을 확인하고 다시 열어 주세요.'; return; }
  const link = location.href.split('?')[0] + '?room=' + room;
  let players = {}, pos = {}, reqs = {}, sky = {}, typing = false, hold = false, later = false, shown = '', go = null;
  const word = { sent: '확인 대기', ok: 'OK', back: '돌려보냄' }, notes = {}; // notes: 아직 보내지 않은, 선생님이 쓰는 중인 한마디
  // 한 번에 눌리게: 버튼을 누르는 동안(손가락·마우스가 내려가 있는 동안)과 글을 쓰는 동안에는 화면을 다시 그리지 않는다
  root.addEventListener('pointerdown', () => { hold = true; }, true);
  const up = () => { hold = false; if (later) setTimeout(() => { if (!hold) draw(); }, 300); };
  addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  root.addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('n_')) notes[e.target.id.slice(2)] = e.target.value; });
  root.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-id]'); if (!b) return;
    const id = b.dataset.id, r = reqs[id]; if (!r) return;
    const inp = $('n_' + id), note = (inp ? inp.value : notes[id] != null ? notes[id] : r.note || '').trim();
    delete notes[id]; typing = false;
    net.set('req/' + id, Object.assign({}, r, { status: b.dataset.s, note }));
  });
  const draw = () => {
    if (typing || hold) { later = true; return; } later = false; const now = net.now(), all = Object.entries(players).filter(([id, p]) => p && live2(pos[id], now)), live = all.filter(([, p]) => !p.kk), kk = all.some(([, p]) => p.kk);
    const top = Object.values(sky).filter(s => s && s.b > 0).sort((a, b) => b.b - a.b).slice(0, 10);
    const count = [0, 0, 0, 0]; live.forEach(([, p]) => { count[p.st] = (count[p.st] || 0) + 1; });
    const ids = Object.keys(reqs).sort((a, b) => (reqs[a].status === 'sent' ? 0 : 1) - (reqs[b].status === 'sent' ? 0 : 1));
    root.innerHTML = `<h1>우주의 숲 · 선생님 방 <span class="stamp ok" style="font-size:22px">방 번호 ${esc(room)}</span></h1>
      <div style="word-break:break-all">학생들은 게임 첫 화면의 "방 번호"에 <b>${esc(room)}</b> 을 쓰거나 이 주소로 들어와요: <b>${esc(link)}</b></div>
      <div class="plan">지금 들어온 학생 ${live.length}명 · 석기 ${count[0]} · 철기 ${count[1]} · 산업 ${count[2]} · 우주 ${count[3]} · 발사 ${live.filter(([, p]) => p.la).length}
      <div style="font-weight:400;margin-top:6px">${live.map(([, p]) => `${esc(p.n)}(${ERAS[p.st].name.slice(0, 2)}${p.la ? '·발사' : ''})`).join(' · ') || '아직 아무도 없어요'}</div>
      <div class="row">${go ? `<span class="stamp ok">출발함 · ${new Date(go).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>` : '<button class="btn" id="tGo" style="background:#ffd166;font-size:22px">다같이 시작</button><span style="align-self:center">학생들은 이 버튼을 누를 때까지 첫 화면에서 기다려요</span>'}
      <button class="btn" id="tClear">방 비우기 (새 수업 시작)</button></div>
      <div class="row"><button class="btn" id="tKK" style="background:#ffe08a">${kk ? '★ 깍두기 선생님 들어가 있음 · 창 하나 더 열기' : '★ 나도 깍두기로 들어가기'}</button><span style="align-self:center;font-weight:400">새 창에서 반 친구들과 같은 섬에 들어가요. 모든 게임을 해 보고 무엇이든 바로 통과할 수 있어요.</span></div>
      ${top.length ? `<div style="margin-top:10px">우주 무한 계단 순위: <span style="font-weight:400">${top.map((s, i) => `${i + 1}. ${esc(s.n)} ${s.b}칸`).join(' · ')}</span></div>` : ''}</div>` +
      (ids.length ? '' : '<div class="plan">아직 제출된 그림이나 계획서가 없어요.</div>') + ids.map(id => { const p = reqs[id], plan = p.kind === 'plan';
        return `<div class="plan"><h2>${esc(p.name)} · ${ERAS[p.stage].name} ${plan ? '탐사 계획서' : ERAS[p.stage].test.title} <span class="stamp ${p.status}">${word[p.status] || ''}</span></h2>` +
          (plan ? `임무: ${esc(p.mission)} · 우주선: ${esc(p.fields.ship || '')}<dl>` + PLAN_FIELDS.slice(1).map(f => `<dt>${f.label}</dt><dd>${esc(p.fields[f.key] || '')}</dd>`).join('') + '</dl>'
            : (p.img ? `<img src="${p.img}" style="max-width:480px;width:100%;border-radius:14px;display:block">` : '') + `<div>제목: <b>${esc(p.fields.title || '')}</b></div>`) +
          (p.note && p.status !== 'sent' ? `<div style="font-weight:400">보낸 한마디: ${esc(p.note)}</div>` : '') +
          `<div class="row"><input id="n_${id}" placeholder="학생에게 한마디 (도장 · 돌려보내기 모두 전달돼요)" value="${esc(notes[id] != null ? notes[id] : p.status === 'sent' ? '' : p.note || '')}"><button class="btn" data-id="${id}" data-s="ok">OK 도장</button><button class="btn" data-id="${id}" data-s="back">돌려보내기</button></div></div>`; }).join('');
    root.querySelectorAll('input').forEach(i => { i.onfocus = () => { typing = true; }; i.onblur = () => { typing = false; setTimeout(() => { if (!hold) draw(); }, 300); }; });
    $('tClear').onclick = () => { if (confirm('이 방의 학생 기록, 그림, 계획서를 모두 지울까요?')) ['p', 'q', 'ev', 'hid', 'req', 'fame', 'go', 'sky'].forEach(k => net.del(k)); };
    if ($('tGo')) $('tGo').onclick = () => net.set('go', net.now());
    $('tKK').onclick = () => window.open(location.pathname + '?room=' + room + '&kk=1', '_blank'); // 이 탭의 '선생님 확인'을 물려받아 암호를 다시 묻지 않는다
  };
  net.on('go', v => { go = v; draw(); });
  net.onKids('sky', s => { sky = s || {}; draw(); });
  const live2 = live;
  net.onKids('p', p => { players = p || {}; draw(); });
  net.onKids('q', q => { pos = q || {}; const n = Object.keys(pos).filter(id => live(pos[id], net.now())).join(); if (n !== shown) { shown = n; draw(); } }); // 위치는 자주 오니, 들어오고 나간 사람이 바뀔 때만 다시 그림
  net.onKids('req', r => { reqs = r || {}; draw(); });
  setInterval(draw, 5000);
}
