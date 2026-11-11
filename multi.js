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
const MP = { on: false, net: null, id: '', room: '', slot: 0, players: {}, req: null, fame: {}, sent: '', sentAt: 0, nextSend: 0, first: true };

// ---- The connection (from Star-Wingtto's racenet.js): web socket → long polling → plain https ------------
const NET_LOCAL = /[?&]local\b/.test(location.search);
const within = (p, ms, code) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(code)), ms))]);
const nflag = (k, v) => { try { if (v === undefined) return localStorage.getItem(k) === '1'; localStorage.setItem(k, '1'); } catch (e) { return false; } };
const ndec = v => (typeof v === 'string' ? JSON.parse(v) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ndec(x)])) : null);
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
    mode: 'online', now: () => Date.now() + off,
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
function myId() { try { let id = sessionStorage.getItem('sf:id'); if (!id) { id = 'k' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('sf:id', id); } return id; } catch (e) { return 'k' + Math.random().toString(36).slice(2, 9); } }
async function mpJoin(room, say) {
  const net = await netConnect(room, say); say('방에 들어가는 중…');
  const now = net.now(), all = (await net.get('p')) || {}, id = myId(), mine = all[id];
  const used = new Set(Object.entries(all).filter(([k, p]) => k !== id && p && now - p.t < STALE).map(([, p]) => p.sl));
  let slot = mine ? mine.sl : 0; while (!mine && used.has(slot) && slot < 29) slot++;
  Object.assign(MP, { on: true, net, id, room, slot, players: {}, req: null, fame: {}, sent: '', nextSend: 0, first: true });
  reset(); // only me: the classmates come in as they are seen
  const m = me(); if (mine) mpRestore(m, mine);
  net.onKids('p', mpPlayers);
  net.onKids('ev/' + id, mpEvents);
  net.onKids('hid', mpHidden);
  net.on('req/' + id, r => { MP.req = r; if (r && r.stage === me().stage) applyReq(r); });
  net.onKids('fame', f => { MP.fame = f || {}; });
  return net.mode;
}
function mpRestore(m, p) { // a tablet that reloads comes back where it was, with what it had made
  m.x = p.x; m.z = p.z; m.h = gh(m.x, m.z); m.stage = p.st || 0; m.mission = MISSIONS.find(q => q.id === p.mi) || null;
  (p.pa || '').split(',').filter(Boolean).forEach(k => { m.parts[k] = true; }); m.order = (p.or || '').split(',').filter(Boolean);
  m.planStatus = p.ps === 'ok' ? 'ok' : 'none'; for (let e = 0; e <= Math.min(2, m.stage); e++) state.met[e] = true;
  state.seenEra = zoneOf(m.z) - 1; placeWork(m); refreshActor(m); lookAtSpot(m.x, m.z, tune.cam_height, tune.cam_back, true);
}

// ---- What my tablet tells the room, a few times a second ------------------------------------------------
function mpTick() {
  if (!MP.on) return; const t = performance.now(); if (t < MP.nextSend) return; MP.nextSend = t + 220;
  const m = me(), r1 = v => Math.round(v * 10) / 10;
  const snap = { n: m.name, c: SHIRTS.indexOf(m.shirt), sl: MP.slot, x: r1(m.x), z: r1(m.z), f: Math.round(m.face * 100) / 100, mv: m.moving ? 1 : 0, st: m.stage,
    pa: Object.keys(m.parts).join(','), or: m.order.join(','), lo: m.loose ? 1 : 0, dd: m.doodle ? 1 : 0, ca: m.carry ? m.carry.owner + '|' + m.carry.part : '',
    la: m.launched ? 1 : 0, se: (m.stage < 3 ? m.testStatus : m.planStatus) === 'sent' ? 1 : 0, ps: m.planStatus, sd: state.t < m.shieldUntil ? 1 : 0, mi: m.mission ? m.mission.id : '' };
  const s = JSON.stringify(snap);
  if (s === MP.sent && t - MP.sentAt < 4000) return; // nothing new: a heartbeat every few seconds is enough
  MP.sent = s; MP.sentAt = t; snap.t = MP.net.now(); MP.net.set('p/' + MP.id, snap);
}

// ---- Classmates: shown as they move, built when they first appear --------------------------------------------
function mpPlayers(all) {
  const now = MP.net.now(), seen = new Set();
  Object.entries(all || {}).forEach(([id, p]) => {
    if (id === MP.id || !p || now - p.t > STALE) return; seen.add(id);
    let a = state.actors.find(q => q.id === id);
    if (!a) {
      const si = Math.max(0, p.c) % SHIRTS.length;
      a = { id, i: p.sl % 30, remote: true, bot: false, name: p.n, shirt: SHIRTS[si], shirtName: SHIRT_NAMES[si], x: p.x, z: p.z, tx: p.x, tz: p.z, face: p.f, moving: false, stage: p.st,
        testStatus: 'none', planStatus: 'none', parts: {}, order: [], away: {}, loose: false, doodle: false, shieldUntil: 0, prankReady: 0, lastVictim: '', tasks: [], launched: false, carry: null, eraTime: [] };
      a.h = gh(a.x, a.z); a.mesh = makeKid({ shirt: a.shirt, hair: p.sl % 5, hairColor: HAIR[(p.sl * 3) % HAIR.length] }); dyn.add(a.mesh);
      placeWork(a); a.tag = tag(a.name, ''); state.actors.push(a);
      if (p.la) { a.launched = true; a.mesh.visible = a.proj.visible = false; }
    }
    a.tx = p.x; a.tz = p.z; a.face = p.f; a.moving = !!p.mv; a.mission = MISSIONS.find(q => q.id === p.mi) || null;
    a.testStatus = a.planStatus = p.se ? 'sent' : 'none'; a.shieldUntil = p.sd ? state.t + 1 : 0;
    if (a.stage !== p.st) { a.stage = p.st; placeWork(a); }
    const parts = {}; (p.pa || '').split(',').filter(Boolean).forEach(k => { parts[k] = true; });
    const ca = p.ca ? { owner: p.ca.split('|')[0], part: p.ca.split('|')[1] } : null;
    if (JSON.stringify([parts, p.lo, p.dd, ca]) !== a.look) { a.look = JSON.stringify([parts, p.lo, p.dd, ca]); a.parts = parts; a.loose = !!p.lo; a.doodle = !!p.dd; a.carry = ca; refreshActor(a); }
    a.order = (p.or || '').split(',').filter(Boolean);
    if (p.la && !a.launched) liftOff(a);
  });
  state.actors.filter(a => a.remote && !seen.has(a.id)).forEach(a => { // gone from the room
    [a.mesh, a.padG, a.proj].forEach(g => dyn.remove(g)); a.tag.remove(); COL.splice(COL.indexOf(a.padCol), 1); state.actors.splice(state.actors.indexOf(a), 1);
  });
  MP.players = all || {}; state.hud = '';
}
function mpMove(dt) { // classmates glide to where their tablets last said they were
  state.actors.forEach(a => { if (!a.remote) return; const k = Math.min(1, dt * 8); a.x += (a.tx - a.x) * k; a.z += (a.tz - a.z) * k; if (Math.hypot(a.tx - a.x, a.tz - a.z) > 30) { a.x = a.tx; a.z = a.tz; } a.h = gh(a.x, a.z); });
}

// ---- Pranks and catches arrive as messages; my tablet applies them to my own kid ---------------------
function mpSend(to, ev) { MP.net.set(`ev/${to}/${MP.id}_${Date.now().toString(36)}`, ev); }
function mpEvents(list) {
  Object.entries(list || {}).forEach(([key, ev]) => {
    MP.net.del(`ev/${MP.id}/${key}`); const m = me(), by = state.actors.find(a => a.id === ev.by), E = ER(m);
    if (ev.k === 'caught') { if (m.carry) { m.carry = null; refreshActor(m); toast(`${by ? by.name : '친구'}에게 잡혔다! 물건을 돌려줬어`, 'bad'); sfx('bad'); } return; }
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
  let players = {}, reqs = {}, typing = false;
  const word = { sent: '확인 대기', ok: 'OK', back: '돌려보냄' };
  const draw = () => {
    if (typing) return; const now = net.now(), live = Object.entries(players).filter(([, p]) => p && now - p.t < STALE);
    const count = [0, 0, 0, 0]; live.forEach(([, p]) => { count[p.st] = (count[p.st] || 0) + 1; });
    const ids = Object.keys(reqs).sort((a, b) => (reqs[a].status === 'sent' ? 0 : 1) - (reqs[b].status === 'sent' ? 0 : 1));
    root.innerHTML = `<h1>우주의 숲 · 선생님 방 <span class="stamp ok" style="font-size:22px">방 번호 ${esc(room)}</span></h1>
      <div style="word-break:break-all">학생들은 게임 첫 화면의 "방 번호"에 <b>${esc(room)}</b> 을 쓰거나 이 주소로 들어와요: <b>${esc(link)}</b></div>
      <div class="plan">지금 들어온 학생 ${live.length}명 · 석기 ${count[0]} · 철기 ${count[1]} · 산업 ${count[2]} · 우주 ${count[3]} · 발사 ${live.filter(([, p]) => p.la).length}
      <div style="font-weight:400;margin-top:6px">${live.map(([, p]) => `${esc(p.n)}(${ERAS[p.st].name.slice(0, 2)}${p.la ? '·발사' : ''})`).join(' · ') || '아직 아무도 없어요'}</div>
      <div class="row"><button class="btn" id="tClear">방 비우기 (새 수업 시작)</button></div></div>` +
      (ids.length ? '' : '<div class="plan">아직 제출된 그림이나 계획서가 없어요.</div>') + ids.map(id => { const p = reqs[id], plan = p.kind === 'plan';
        return `<div class="plan"><h2>${esc(p.name)} · ${ERAS[p.stage].name} ${plan ? '탐사 계획서' : ERAS[p.stage].test.title} <span class="stamp ${p.status}">${word[p.status] || ''}</span></h2>` +
          (plan ? `임무: ${esc(p.mission)} · 우주선: ${esc(p.fields.ship || '')}<dl>` + PLAN_FIELDS.slice(1).map(f => `<dt>${f.label}</dt><dd>${esc(p.fields[f.key] || '')}</dd>`).join('') + '</dl>'
            : (p.img ? `<img src="${p.img}" style="max-width:480px;width:100%;border-radius:14px;display:block">` : '') + `<div>제목: <b>${esc(p.fields.title || '')}</b></div>`) +
          `<div class="row"><input id="n_${id}" placeholder="학생에게 한마디" value="${esc(p.note || '')}"><button class="btn" data-id="${id}" data-s="ok">OK 도장</button><button class="btn" data-id="${id}" data-s="back">돌려보내기</button></div></div>`; }).join('');
    root.querySelectorAll('button[data-id]').forEach(b => { b.onclick = () => { const r = reqs[b.dataset.id]; net.set('req/' + b.dataset.id, Object.assign({}, r, { status: b.dataset.s, note: $('n_' + b.dataset.id).value.trim() })); }; });
    root.querySelectorAll('input').forEach(i => { i.onfocus = () => { typing = true; }; i.onblur = () => { typing = false; setTimeout(draw, 50); }; });
    $('tClear').onclick = () => { if (confirm('이 방의 학생 기록, 그림, 계획서를 모두 지울까요?')) ['p', 'ev', 'hid', 'req', 'fame'].forEach(k => net.del(k)); };
  };
  net.onKids('p', p => { players = p || {}; draw(); });
  net.onKids('req', r => { reqs = r || {}; draw(); });
  setInterval(draw, 5000);
}
