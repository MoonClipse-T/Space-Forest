// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: the shop mini-games before the space age (2026-11-12).
//   nonoGame   석기 · 돌 깨는 터  — 네모네모 로직으로 뗀석기(주먹도끼) 칠하기
//   moonQuiz   철기 · 논두렁 달력집 — 달 모양(위상) 보고 이름 쓰기: 삭 · 초승 · 상현 · 망 · 하현 · 그믐
//   stairsGame 철기 · 돌 다듬는 집 — 첨성대 돌계단 100칸 오르기 (오르기 / 방향 바꾸고 오르기, 시간 막대). 선생님 암호로 통과 가능
//   trainGame  산업 · 기차 공장   — 역마다 타고 내리는 사람을 보고 남은 사람 수 맞히기, 세 번
// Each calls giveItem(k, p) when the kid wins. All gameplay randomness goes through rng().
'use strict';

// '17000', '17,000', '1만 7천', '1만7000', '17000년' → 17000. 쓰는 법만 너그럽게, 값은 딱 맞아야 한다
function parseNum(v) {
  let s = String(v).replace(/[\s,]/g, '').replace(/(년전|년|전|초|개|일|명|쯤|약)+$/g, '').replace(/^약/, '');
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/^(?:(\d+)만)?(?:(\d+)천)?(?:(\d+)백)?(\d+)?$/);
  if (!m || !s) return NaN;
  return (+(m[1] || 0)) * 10000 + (+(m[2] || 0)) * 1000 + (+(m[3] || 0)) * 100 + (+(m[4] || 0));
}
const fbox = (t, good) => { const e = $('qfb'); if (!e) return; e.style.display = 'block'; e.style.background = good ? '#d6f5e6' : '#ffe3e0'; e.innerHTML = t; };

// ---- 석기: 네모네모 로직 뗀석기 ------------------------------------------------------------------------
function nonoGame(k, p) {
  const SOL = NONO_AXE.map(r => [...r].map(c => c === '#')), R = SOL.length, C = SOL[0].length;
  const runs = line => { const o = []; let n = 0; line.forEach(v => { if (v) n++; else if (n) { o.push(n); n = 0; } }); if (n) o.push(n); return o.length ? o : [0]; };
  const rowClue = SOL.map(runs), colClue = [...Array(C)].map((_, c) => runs(SOL.map(r => r[c])));
  const S = 34, LW = 64, TH = 84, W = LW + C * S, H = TH + R * S;
  const cell = [...Array(R)].map(() => Array(C).fill(0)); // 0 빈칸 · 1 칠함 · 2 ✕
  let mode = 1, paint = null, done = false;
  openUI({ kind: 'nono', mid: true });
  $('modal').innerHTML = `<div class="bubble" style="width:min(680px,94vw);text-align:center"><div class="who">${esc(k.name)} · 네모네모 뗀석기</div><div style="font-size:19px">${p.q}</div>` +
    `<canvas id="nono" width="${W}" height="${H}" style="height:min(52vh,${H}px);width:auto;max-width:100%;margin-top:8px;touch-action:none;display:inline-block"></canvas>` +
    '<div class="opts" style="justify-content:center"><button class="opt" id="nFill" style="background:var(--sun)">■ 칠하기</button><button class="opt" id="nX">✕ 표시</button><button class="opt" id="nClear">다 지우기</button><button class="opt" id="pLater">그만할래</button></div></div>';
  const cv = $('nono'), x = cv.getContext('2d');
  const stone = (r, c) => { // flint colours: lighter along the middle ridge, darker toward the edges
    const mid = (C - 1) / 2, edge = Math.abs(c - mid) / mid, h = (r * 7 + c * 13) % 5;
    const g = 150 - edge * 45 + h * 6 - r * 1.5; return `rgb(${g + 12},${g + 4},${g - 10})`;
  };
  const lineOK = (arr, clue) => runs(arr).join() === clue.join();
  const draw = () => {
    x.fillStyle = '#f3e3c0'; x.fillRect(0, 0, W, H);
    x.font = '700 17px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    rowClue.forEach((cl, r) => { const ok = lineOK(cell[r].map(v => v === 1), cl); x.fillStyle = ok ? '#b9ad94' : '#4a3d6b'; x.textAlign = 'right'; x.fillText(cl.join(' '), LW - 8, TH + r * S + S / 2); });
    colClue.forEach((cl, c) => { const ok = lineOK(cell.map(row => row[c] === 1), cl); x.fillStyle = ok ? '#b9ad94' : '#4a3d6b'; x.textAlign = 'center'; cl.forEach((n, i) => x.fillText(n, LW + c * S + S / 2, TH - 10 - (cl.length - 1 - i) * 20)); });
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const X = LW + c * S, Y = TH + r * S, v = cell[r][c];
      x.fillStyle = v === 1 ? stone(r, c) : '#fffaf0'; x.fillRect(X, Y, S, S);
      if (v === 1) { x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(X + 3, Y + 3); x.lineTo(X + S - 6, Y + 5); x.lineTo(X + 5, Y + S - 8); x.fill(); } // a flake scar
      if (v === 2) { x.strokeStyle = '#c9a27e'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + 9, Y + 9); x.lineTo(X + S - 9, Y + S - 9); x.moveTo(X + S - 9, Y + 9); x.lineTo(X + 9, Y + S - 9); x.stroke(); }
    }
    x.strokeStyle = 'rgba(74,61,107,.25)'; x.lineWidth = 1;
    for (let r = 0; r <= R; r++) { x.beginPath(); x.moveTo(LW, TH + r * S); x.lineTo(W, TH + r * S); x.stroke(); }
    for (let c = 0; c <= C; c++) { x.beginPath(); x.moveTo(LW + c * S, TH); x.lineTo(LW + c * S, H); x.stroke(); }
    x.strokeStyle = 'rgba(74,61,107,.6)'; x.lineWidth = 2; x.strokeRect(LW, TH, C * S, R * S);
  };
  const reveal = () => { // solved: the cells melt into one knapped stone with flake scars
    done = true; sfx('ok'); let t = 0; const t0 = performance.now(); // by the clock, not by frames: a slow tablet finishes on time too
    // a smooth outline through each row's edges, so the squares become one natural stone (pointed top, round bottom)
    const ends = SOL.map(row => [row.indexOf(true), row.lastIndexOf(true) + 1]);
    const pts = [[LW + C * S / 2, TH + 2]];
    ends.forEach(([a, b], r) => pts.push([LW + b * S - 2, TH + r * S + S / 2]));
    pts.push([LW + C * S / 2, TH + R * S - 1]);
    ends.slice().reverse().forEach(([a], i) => pts.push([LW + a * S + 2, TH + (R - 1 - i) * S + S / 2]));
    const path = () => { x.beginPath(); const n = pts.length, mid = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
      x.moveTo(...mid(0)); for (let i = 1; i <= n; i++) x.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...mid(i)); x.closePath(); };
    const step = () => {
      if (!state.ui || state.ui.kind !== 'nono') return; t = (performance.now() - t0) / 1000; draw();
      x.globalAlpha = Math.min(1, t * 1.5); x.fillStyle = '#fffaf0'; x.fillRect(LW, TH, C * S, R * S); // the grid fades away
      x.save(); path(); x.clip();
      const gr = x.createLinearGradient(LW, TH, LW + C * S, TH + R * S); gr.addColorStop(0, '#c9bba0'); gr.addColorStop(0.5, '#9c8f78'); gr.addColorStop(1, '#6f6453');
      x.fillStyle = gr; x.fillRect(LW, TH, C * S, R * S);
      let s0 = 11; const rr = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
      for (let i = 0; i < 26; i++) { const cx = LW + C * S * (0.15 + rr() * 0.7), cy = TH + R * S * rr(); x.fillStyle = `rgba(${rr() > 0.5 ? '255,250,235' : '60,50,40'},.16)`; x.beginPath(); x.ellipse(cx, cy, 10 + rr() * 22, 6 + rr() * 12, rr() * 3, 0, 6.3); x.fill(); }
      x.restore(); path(); x.strokeStyle = 'rgba(70,58,44,.8)'; x.lineWidth = 3; x.stroke(); x.globalAlpha = 1;
      if (t > 0.6) { x.fillStyle = '#4a3d6b'; x.font = '800 22px sans-serif'; x.textAlign = 'center'; x.fillText('주먹도끼 완성!', LW + C * S / 2, TH - 50); }
      if (t < 1.8) requestAnimationFrame(step); else { closeUI(); giveItem(k, p); }
    };
    step();
  };
  const at = ev => { const b = cv.getBoundingClientRect(), px = (ev.clientX - b.left) * W / b.width, py = (ev.clientY - b.top) * H / b.height; const c = Math.floor((px - LW) / S), r = Math.floor((py - TH) / S); return r >= 0 && r < R && c >= 0 && c < C ? [r, c] : null; };
  const put = rc => { if (!rc || done) return; const [r, c] = rc; if (cell[r][c] !== paint) { cell[r][c] = paint; tone(paint === 1 ? 420 : 260, 0.04, 'square', 0.08); draw(); } };
  cv.onpointerdown = ev => { const rc = at(ev); if (!rc || done) return; cv.setPointerCapture(ev.pointerId); paint = cell[rc[0]][rc[1]] === mode ? 0 : mode; put(rc); };
  cv.onpointermove = ev => { if (paint !== null) put(at(ev)); };
  cv.onpointerup = cv.onpointercancel = () => { paint = null; if (!done && SOL.every((row, r) => row.every((v, c) => v === (cell[r][c] === 1)))) reveal(); };
  const setMode = mm => { mode = mm; $('nFill').style.background = mm === 1 ? 'var(--sun)' : '#fff'; $('nX').style.background = mm === 2 ? 'var(--sun)' : '#fff'; };
  $('nFill').onclick = () => setMode(1); $('nX').onclick = () => setMode(2);
  $('nClear').onclick = () => { if (done) return; cell.forEach(row => row.fill(0)); draw(); };
  $('pLater').onclick = () => closeUI(); draw();
}

// ---- 철기: 달 모양 이름 맞히기 ----------------------------------------------------------------------------
function drawMoon(cv, ph) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, r = Math.min(W, H) * 0.34, cx = W / 2, cy = H / 2;
  x.fillStyle = '#1d1840'; x.fillRect(0, 0, W, H);
  let s0 = 7; const rr = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,246,216,${0.3 + rr() * 0.6})`; x.beginPath(); x.arc(rr() * W, rr() * H, 0.6 + rr() * 1.3, 0, 6.3); x.fill(); }
  x.save(); x.translate(cx, cy); x.scale(ph.lit, 1); // lit = -1 mirrors: 하현 · 그믐 are bright on the left
  x.fillStyle = '#2f2a55'; x.beginPath(); x.arc(0, 0, r, 0, 6.3); x.fill(); // the dark part, faintly seen
  x.strokeStyle = 'rgba(200,190,255,.25)'; x.lineWidth = 2; x.stroke();
  if (ph.k > 0) {
    const lit = '#fff1b8', e = r * Math.abs(1 - 2 * ph.k);
    x.shadowColor = 'rgba(255,240,180,.6)'; x.shadowBlur = 24;
    x.fillStyle = lit; x.beginPath(); x.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); // the right half
    if (ph.k < 0.5) x.ellipse(0, 0, e, r, 0, Math.PI / 2, -Math.PI / 2, true); // a crescent: cut back to the terminator
    else x.ellipse(0, 0, e, r, 0, Math.PI / 2, Math.PI * 1.5, false);     // gibbous to full: bulge past the middle
    x.closePath(); x.fill(); x.shadowBlur = 0;
    x.fillStyle = 'rgba(200,180,120,.25)'; [[0.35, -0.3, 0.12], [0.55, 0.25, 0.09], [0.2, 0.45, 0.07]].forEach(([a, b, s]) => { if (ph.k < 0.5 && a < 1 - 2 * ph.k) return; x.beginPath(); x.arc(a * r, b * r, s * r, 0, 6.3); x.fill(); });
  }
  x.restore();
}
function moonQuiz(k, p) {
  let ph = pick(MOON_PHASES), miss = 0;
  openUI({ kind: 'moon', mid: true });
  $('modal').innerHTML = `<div class="bubble form" style="text-align:center"><div class="who">${esc(k.name)}</div>${josa(p.item, '이', '가')} 필요하구나? ${p.q}` +
    '<canvas id="moonC" width="300" height="240" style="display:block;margin:8px auto 0;border-radius:18px;height:min(32vh,240px);width:auto;max-width:100%"></canvas>' +
    '<input id="qa" maxlength="8" autocomplete="off" placeholder="달의 모양 이름" style="margin-top:10px;text-align:center">' +
    '<div id="qfb" class="note" style="display:none"></div><div class="opts" style="justify-content:center"><button class="opt" id="pSend" style="background:var(--sun)">확인</button><button class="opt" id="pLater">다음에</button></div></div>';
  drawMoon($('moonC'), ph);
  const check = () => {
    const v = $('qa').value.trim(); if (!v) return;
    if (ph.ans.some(a => norm(a) === norm(v))) { closeUI(); return giveItem(k, Object.assign({}, p, { fact: `${ph.name} 정답! ${ph.say} ${p.fact}` })); }
    sfx('bad'); miss++;
    if (miss >= 4) { // tell this one, then a different moon: the item only comes for a right answer
      fbox(`땡! 이건 <b>${ph.name}</b>이야. ${ph.say}<br>다른 달로 다시 해 보자!`);
      ph = pick(MOON_PHASES.filter(q => q !== ph)); miss = 0; drawMoon($('moonC'), ph);
    } else fbox(miss >= 2 ? `땡! 힌트: 삭 · 초승 · 상현 · 망 · 하현 · 그믐 중 하나야.${miss >= 3 ? ' 밝은 쪽이 오른쪽인지 왼쪽인지 봐!' : ''}` : '땡! 다시 잘 봐.');
    $('qa').value = ''; $('qa').focus();
  };
  $('pSend').onclick = check; $('qa').onkeydown = e => { if (e.key === 'Enter') setTimeout(check, 30); };
  $('pLater').onclick = () => closeUI(); setTimeout(() => $('qa') && $('qa').focus(), 50);
}

// ---- 철기: 첨성대 돌계단 오르기 --------------------------------------------------------------------------
// [오르기] 지금 보는 쪽으로 한 칸 · [방향 바꾸기] 돌아서서 한 칸. 계단 방향과 다르게 누르거나 시간 막대가 다 닳으면 떨어진다.
// done 이 있으면 '우주 무한 계단': 우주선을 발사한 학생의 보너스. 꼭대기가 없고, 높이 오를수록 시간 막대가 더 빨리 준다.
const SKY_SIGHTS = [[25, '인공위성', '#cfd8ff'], [60, '국제 우주 정거장', '#e8e8f0'], [100, '달', '#f2ead2'], [160, '화성', '#e9825a'], [230, '목성', '#e8b98a'], [310, '토성', '#f2d98a'], [400, '천왕성', '#9fe3e8'], [500, '해왕성', '#6f8cff'], [650, '태양계 밖', '#ffd166']];
function stairsGame(k, p, done) {
  const SKY = !!done, GOAL = SKY ? Infinity : tune.stair_goal, W = 360, H = 540, SW = 46, SH = 30;
  let steps, pos, face, bar, run, over, hop, camX, camY, best = 0, last = 0, raf = 0, keyFn, gx = 0, gd = 1;
  const tower = SKY ? null : makeTower();
  const BKEY = 'sf:skyBest'; if (SKY) try { best = Number(localStorage.getItem(BKEY)) || 0; } catch (e) { /* no storage */ }
  const grow = n => { for (let i = 0; i < n; i++) { const j = steps.length; if (j > 1 && (rng() < tune.stair_turn || Math.abs(gx + gd) > 4)) gd = -gd; gx += gd; steps.push({ x: gx, d: gd }); } };
  const fresh = () => {
    steps = [{ x: 0, d: 1 }]; gx = 0; gd = 1; grow(SKY ? 60 : GOAL + 10);
    pos = 0; face = 1; bar = 1; run = false; over = ''; hop = 0; camX = 0; camY = 0;
    panel('');
  };
  const rankHtml = () => { // 우리 반 순위 (방에서 할 때)
    if (!MP.on) return '';
    const top = Object.values(MP.sky || {}).filter(s => s && s.b > 0).sort((a, b) => b.b - a.b).slice(0, 5);
    return top.length ? '<div style="font-size:16px;margin-top:6px">우리 반 순위<br>' + top.map((s, i) => `${i + 1}. ${esc(s.n)} ${s.b}칸`).join(' · ') + '</div>' : '';
  };
  openUI({ kind: 'stairs', mid: true });
  $('modal').innerHTML = `<div class="bubble" style="width:auto;max-width:94vw;padding:14px 18px 16px;text-align:center"><div class="who">${SKY ? '우주 무한 계단' : esc(k.name) + ' · 첨성대 오르기'}</div>` +
    `<div style="position:relative;display:inline-block;margin-top:4px"><canvas id="stairs" width="${W}" height="${H}" style="display:block;height:min(66vh,${H}px);width:auto;max-width:90vw;border-radius:22px;touch-action:none"></canvas>` +
    '<button id="sTurn" class="stb" style="left:10px">⇄<small>방향 바꾸기</small></button><button id="sUp" class="stb" style="right:10px">⬆<small>오르기</small></button>' +
    '<div id="sPanel" class="stpanel"></div></div>' +
    '<div class="opts" style="justify-content:center;margin-top:6px"><button class="opt" id="sTeach">선생님 통과</button><button class="opt" id="pLater">그만할래</button></div></div>' +
    '<style>.stb{position:absolute;bottom:12px;width:88px;height:88px;border-radius:50%;background:var(--sun);box-shadow:0 6px 0 #d9a93a;font-size:34px;line-height:1;touch-action:none;-webkit-user-select:none;user-select:none}' +
    '.stb small{display:block;font-size:12px;margin-top:2px}.stb:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a93a}' +
    '.stpanel{position:absolute;left:8%;right:8%;top:30%;background:rgba(255,248,232,.96);border-radius:24px;padding:14px;font-size:19px;box-shadow:0 6px 0 rgba(74,61,107,.25)}.stpanel:empty{display:none}</style>';
  const cv = $('stairs'), x = cv.getContext('2d');
  function panel(html) { $('sPanel').innerHTML = html; }
  const fall = why => {
    run = false; over = why; const rec = SKY && pos > best; best = Math.max(best, pos); sfx('bad');
    if (rec) { try { localStorage.setItem(BKEY, best); } catch (e) { /* fine */ } if (MP.on) MP.net.set('sky/' + MP.id, { n: me().name, b: best }); }
    const seen = SKY ? SKY_SIGHTS.filter(s => s[0] <= pos).pop() : null;
    panel(`<b style="font-size:24px">${why === 'time' ? '앗, 시간이 다 됐어!' : '으악, 헛디뎠다!'}</b><br>${pos}칸까지 올랐어 (최고 ${best}칸)` + (rec ? '<br><b style="color:#2f9e77">새 기록!</b>' : '') + (seen ? `<br><span style="font-size:16px">${seen[1]}까지 갔어!</span>` : '') + (SKY ? rankHtml() : '') +
      '<div class="opts" style="justify-content:center"><button class="opt" id="sAgain" style="background:var(--sun)">다시 도전</button></div>');
    $('sAgain').onclick = () => { fresh(); };
  };
  const press = turn => {
    if (over || pos >= GOAL) return;
    if (!run) { run = true; last = performance.now(); }
    if (turn) face = -face;
    const nx = steps[pos + 1];
    if (nx.d !== face) { hop = 1; return fall('slip'); }
    pos++; hop = 1; bar = Math.min(1, bar + tune.stair_refill); tone(520 + (pos % 8) * 30, 0.05, 'triangle', 0.1);
    if (SKY && pos + 30 > steps.length) grow(40);
    if (SKY && SKY_SIGHTS.some(s => s[0] === pos)) sfx('ok');
    if (pos >= GOAL) { run = false; sfx('ok'); panel('<b style="font-size:26px">첨성대 꼭대기 도착!</b><br>밤하늘이 한눈에 보여!'); setTimeout(() => { if (state.ui && state.ui.kind === 'stairs') { closeUI(); giveItem(k, p); } }, 1500); }
  };
  window.__stairs = { get pos() { return pos; }, get face() { return face; }, get bar() { return bar; }, get over() { return over; }, next: () => steps[pos + 1], press }; // 점검용
  const btn = (id, turn) => { const b = $(id); b.onpointerdown = ev => { ev.preventDefault(); press(turn); }; };
  btn('sTurn', true); btn('sUp', false);
  keyFn = e => { if (!state.ui || state.ui.kind !== 'stairs' || /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (['ArrowLeft', 'KeyA', 'KeyF'].includes(e.code)) { e.preventDefault(); if (!e.repeat) press(true); } if (['ArrowRight', 'ArrowUp', 'KeyD', 'KeyJ', 'Space'].includes(e.code)) { e.preventDefault(); if (!e.repeat) press(false); } };
  addEventListener('keydown', keyFn);
  $('sTeach').onclick = () => { // only this game: the teacher can let a kid through
    panel('선생님 암호를 넣으면 이번 계단은 통과!<input id="sPin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="선생님 암호" style="margin-top:8px;text-align:center;' + PIN_CSS + '"><div class="opts" style="justify-content:center"><button class="opt" id="sPinGo" style="background:var(--sun)">확인</button><button class="opt" id="sPinNo">취소</button></div>');
    run = false;
    const go = () => { if (pinOK($('sPin').value)) { closeUI(); toast('선생님 통과! 첨성대 계단을 건너뛰었어', 'good'); giveItem(k, p); } else { sfx('bad'); $('sPin').value = ''; toast('선생님 암호가 달라요', 'bad'); } };
    $('sPinGo').onclick = go; $('sPin').onkeydown = e => { if (e.key === 'Enter') setTimeout(go, 30); };
    $('sPinNo').onclick = () => { if (over) fall(over); else panel(''); };
    setTimeout(() => $('sPin') && $('sPin').focus(), 50);
  };
  $('pLater').onclick = () => { closeUI(); if (SKY) done(); };
  if (SKY) $('sTeach').remove(); // 보너스 놀이에는 통과가 없다
  const sx = i => W / 2 + (steps[i].x - camX) * SW, sy = i => H * 0.68 - (i - camY) * SH;
  const loop = now => {
    if (!state.ui || state.ui.kind !== 'stairs') { removeEventListener('keydown', keyFn); return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    const rate = SKY ? tune.stair_drain + tune.stair_drain_up * Math.min(1, pos / 100) + tune.sky_drain_more * Math.min(2, Math.max(0, pos - 100) / 100) : tune.stair_drain + tune.stair_drain_up * pos / GOAL;
    if (run) { bar -= rate * dt; if (bar <= 0) { bar = 0; fall('time'); } }
    hop = Math.max(0, hop - dt * 9);
    const tx = over === 'slip' ? steps[pos].x + face * 0.5 : steps[pos].x;
    camX += (tx - camX) * Math.min(1, dt * 10); camY += (pos - camY) * Math.min(1, dt * 12);
    let s0 = 5; const rr = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
    if (SKY) drawSpace(x, W, H, camY, SH);
    else {
      // sky: dusk at the foot, stars near the top
      const f = pos / GOAL, sk = x.createLinearGradient(0, 0, 0, H);
      sk.addColorStop(0, `rgb(${46 - f * 20},${37 - f * 15},${89 - f * 20})`); sk.addColorStop(1, `rgb(${240 - f * 150},${170 - f * 100},${130 - f * 30})`);
      x.fillStyle = sk; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 50; i++) { x.fillStyle = `rgba(255,246,216,${(0.2 + f * 0.8) * rr()})`; x.beginPath(); x.arc(rr() * W, rr() * H * 0.7, 0.7 + rr() * 1.2, 0, 6.3); x.fill(); }
      // 첨성대 behind the stairs: the view slides from its base to its top as you climb
      const th = tower.height, vis = H, off = (th - vis) * Math.min(1, camY / GOAL);
      x.globalAlpha = 0.4; x.drawImage(tower, 0, th - vis - off, tower.width, vis, (W - tower.width) / 2, 0, tower.width, vis); x.globalAlpha = 1; // far behind: faint
    }
    // the stone steps: dark slabs with a bright top edge, so the zigzag stands out from the tower
    for (let i = Math.max(0, pos - 8); i <= Math.min(steps.length - 1, pos + 22); i++) {
      const X = sx(i), Y = sy(i); if (Y < -30 || Y > H + 30) continue;
      x.fillStyle = 'rgba(30,24,60,.35)'; x.beginPath(); x.roundRect(X - SW / 2 + 3, Y + 5, SW, 16, 5); x.fill();
      const gold = SKY ? i % 50 === 0 && i > 0 : i === GOAL;
      x.fillStyle = gold ? '#ffd166' : SKY ? '#34407e' : '#6f5f86'; x.beginPath(); x.roundRect(X - SW / 2, Y, SW, 16, 5); x.fill();
      x.fillStyle = gold ? '#fff1b8' : SKY ? '#8fe3ff' : '#d9cbe8'; x.beginPath(); x.roundRect(X - SW / 2, Y, SW, 5, [5, 5, 0, 0]); x.fill();
      if (i % 10 === 0 && i) { x.fillStyle = '#fff8e8'; x.font = '700 12px sans-serif'; x.textAlign = 'center'; x.fillText(i, X, Y + 13); }
    }
    // the kid (iron-age clothes: white jacket, straw hat), facing their way
    const px = W / 2 + (steps[pos].x - camX) * SW + (over === 'slip' ? face * 18 : 0), py = sy(pos) - Math.sin(hop * Math.PI) * 14 + (over === 'slip' ? (1 - hop) * 60 : 0);
    x.save(); x.translate(px, py); x.scale(face, 1);
    if (SKY) { // 우주복: 흰 옷, 등짐, 둥근 헬멧과 파란 얼굴창
      x.fillStyle = '#c9cfe6'; x.fillRect(-8, -14, 6, 14); x.fillRect(2, -14, 6, 14);
      x.fillStyle = '#9aa3c4'; x.beginPath(); x.roundRect(-17, -36, 9, 20, 4); x.fill();
      x.fillStyle = '#f6f7ff'; x.beginPath(); x.roundRect(-11, -37, 22, 25, 8); x.fill(); x.fillStyle = '#ff8a73'; x.fillRect(-4, -30, 8, 5);
      x.fillStyle = '#f6f7ff'; x.beginPath(); x.arc(0, -49, 14, 0, 6.3); x.fill(); x.strokeStyle = '#c9cfe6'; x.lineWidth = 2; x.stroke();
      x.fillStyle = '#5b8fd6'; x.beginPath(); x.ellipse(4, -49, 8, 7, 0, 0, 6.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(6, -52, 2.2, 0, 6.3); x.fill();
      x.restore();
    } else {
    x.fillStyle = '#4a3d6b'; x.fillRect(-7, -14, 5, 14); x.fillRect(2, -14, 5, 14);
    x.fillStyle = '#fbf6ea'; x.beginPath(); x.roundRect(-11, -36, 22, 24, 7); x.fill(); x.strokeStyle = '#d9cbb0'; x.lineWidth = 2; x.stroke();
    x.fillStyle = '#ff8a73'; x.fillRect(-11, -24, 22, 4);
    x.fillStyle = '#ffd9b8'; x.beginPath(); x.arc(0, -48, 12, 0, 6.3); x.fill();
    x.fillStyle = '#3a2f45'; x.beginPath(); x.arc(5, -49, 1.8, 0, 6.3); x.fill();
    x.fillStyle = '#e8c66a'; x.beginPath(); x.ellipse(0, -58, 18, 5, 0, 0, 6.3); x.fill(); x.beginPath(); x.arc(0, -60, 9, Math.PI, 0); x.fill();
    x.restore();
    }
    // the time bar and the count
    x.fillStyle = 'rgba(255,248,232,.92)'; x.beginPath(); x.roundRect(16, 14, W - 32, 22, 11); x.fill();
    x.fillStyle = bar > 0.3 ? '#7fdab0' : '#ff8a73'; x.beginPath(); x.roundRect(19, 17, Math.max(0, (W - 38) * bar), 16, 8); x.fill();
    x.fillStyle = '#fff8e8'; x.strokeStyle = '#4a3d6b'; x.lineWidth = 5; x.font = '800 40px sans-serif'; x.textAlign = 'center';
    const cnt = SKY ? `${pos}` : `${pos} / ${GOAL}`; x.strokeText(cnt, W / 2, 80); x.fillText(cnt, W / 2, 80);
    if (SKY) { x.font = '700 15px sans-serif'; x.lineWidth = 4; const t2 = `최고 ${best}칸`; x.strokeText(t2, W / 2, 102); x.fillText(t2, W / 2, 102); }
    if (!run && !over && pos === 0) { x.font = '700 17px sans-serif'; x.fillStyle = '#fff8e8'; x.strokeStyle = 'rgba(46,37,89,.8)'; x.lineWidth = 4;
      (SKY ? ['끝없는 우주 계단! 어디까지 갈까?', '⬆ 오르기 · ⇄ 방향 바꾸기', '높이 갈수록 시간이 빨리 줄어요'] : ['⬆ 오르기: 보는 쪽으로 한 칸', '⇄ 방향 바꾸기: 돌아서 한 칸', '누르면 시작! (키보드 ← →)']).forEach((t, i) => { x.strokeText(t, W / 2, 118 + i * 24); x.fillText(t, W / 2, 118 + i * 24); }); }
    raf = requestAnimationFrame(loop);
  };
  fresh(); raf = requestAnimationFrame(loop);
}
function drawSpace(x, W, H, camY, SH) { // 우주 계단 배경: 별 세 겹(멀수록 느리게), 발밑의 지구, 오르다 만나는 행성들
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0820'); g.addColorStop(1, '#231a5c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  let s0 = 9; const rr = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
  [[40, 0.04, 0.8], [30, 0.1, 1.3], [16, 0.22, 1.9]].forEach(([n, sp, r]) => { for (let i = 0; i < n; i++) { const sx = rr() * W, sy = (rr() * H + camY * SH * sp) % H; x.fillStyle = `rgba(255,246,216,${0.35 + rr() * 0.6})`; x.beginPath(); x.arc(sx, sy, r * (0.6 + rr() * 0.5), 0, 6.3); x.fill(); } });
  x.fillStyle = 'rgba(205,180,255,.08)'; x.beginPath(); x.ellipse(W * 0.3, (H * 0.3 + camY * SH * 0.05) % (H * 1.4) - H * 0.2, 160, 60, -0.4, 0, 6.3); x.fill(); // 은하수 한 줄기
  const ey = H + 160 + camY * SH * 0.35; if (ey - 300 < H) { // 발밑의 지구: 오를수록 아래로 멀어진다
    x.fillStyle = '#5fa8f0'; x.beginPath(); x.arc(W / 2, ey, 300, 0, 6.3); x.fill();
    x.fillStyle = '#7fd69a'; [[-120, -250, 60], [60, -270, 46], [150, -200, 40]].forEach(([dx, dy, r]) => { x.beginPath(); x.ellipse(W / 2 + dx, ey + dy, r, r * 0.45, 0.2, 0, 6.3); x.fill(); });
    x.strokeStyle = 'rgba(191,233,255,.5)'; x.lineWidth = 10; x.beginPath(); x.arc(W / 2, ey, 306, 0, 6.3); x.stroke();
  }
  SKY_SIGHTS.forEach(([at, name, col], i) => { // 그 칸에 다다를 즈음 옆으로 지나가는 것들
    const y = H * 0.68 - (at - camY) * SH * 0.5, side = i % 2 ? W - 62 : 62; if (y < -90 || y > H + 90) return;
    const R = i < 2 ? 14 : 30 + Math.min(i, 6) * 2;
    if (i < 2) { x.fillStyle = col; x.fillRect(side - 6, y - 6, 12, 12); x.fillStyle = '#5b7fd6'; x.fillRect(side - 26, y - 4, 16, 8); x.fillRect(side + 10, y - 4, 16, 8); }
    else { x.fillStyle = col; x.beginPath(); x.arc(side, y, R, 0, 6.3); x.fill(); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(side + R * 0.35, y + R * 0.2, R * 0.85, 0, 6.3); x.fill();
      if (name === '토성') { x.strokeStyle = '#d9c39a'; x.lineWidth = 4; x.beginPath(); x.ellipse(side, y, R * 1.7, R * 0.45, -0.3, 0, 6.3); x.stroke(); } }
    x.font = '700 13px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#fff8e8'; x.fillText(`${name} · ${at}칸`, side, y + R + 16);
  });
}
function makeTower() { // 첨성대, drawn once: square base, a bottle-shaped body of stone courses, a window, the well-frame top
  const c = document.createElement('canvas'); c.width = 240; c.height = 1500; const x = c.getContext('2d'), cx = 120, top = 140, base = 1380;
  const half = t => 34 + 52 * Math.pow(t, 1.6) + 10 * Math.sin(t * Math.PI); // body half-width, t = 0 top .. 1 bottom
  x.fillStyle = '#b8a07a'; x.fillRect(cx - 112, base, 224, 60); x.fillStyle = '#a58c66'; x.fillRect(cx - 100, base - 40, 200, 44);
  const courses = 27, ch = (base - 40 - top) / courses;
  for (let i = 0; i < courses; i++) {
    const t = (i + 0.5) / courses, w = half(t), y = top + i * ch;
    x.fillStyle = i % 2 ? '#d8c29a' : '#cdb58c'; x.fillRect(cx - w, y, w * 2, ch + 1);
    x.strokeStyle = 'rgba(110,90,60,.45)'; x.lineWidth = 2; x.strokeRect(cx - w, y, w * 2, ch);
    for (let b = -w + (i % 2 ? 14 : 0); b < w; b += 28) { x.beginPath(); x.moveTo(cx + b, y); x.lineTo(cx + b, y + ch); x.stroke(); }
  }
  const wy = top + 13 * ch; x.fillStyle = '#3b3352'; x.fillRect(cx - 18, wy, 36, ch * 2.2); // the window halfway up
  x.fillStyle = '#c2a87e'; x.fillRect(cx - 44, top - 40, 88, 18); x.fillRect(cx - 44, top - 22, 88, 18); // 정자석
  x.fillStyle = '#3b3352'; x.fillRect(cx - 26, top - 36, 52, 30);
  return c;
}

// ---- 산업: 기차에 남은 사람 세기 ---------------------------------------------------------------------------
function trainGame(k, p) {
  const NEED = tune.train_need, W = 640, H = 300, DOOR = 330, PLAT = 238;
  const NAMES = ['칙칙역', '폭폭역', '석탄역', '증기역', '톱니역'], COLS = ['#ff8fa3', '#7cc6fe', '#ffd166', '#95e1a3', '#c9a0ff', '#ffa26b', '#6ee7d8', '#f78fd0'];
  let right = 0, round = null, raf = 0, last = 0, t = 0;
  const make = () => { // level 1: two stops; then three; then four, with people getting off and on at the same time
    const L = Math.min(right, 2), stops = 2 + L, ev = []; let inside = 0, at = 0.6;
    for (let s = 0; s < stops; s++) {
      const off = s === 0 ? 0 : Math.min(inside, 1 + Math.floor(rng() * (2 + L))), on = s === 0 ? 4 + Math.floor(rng() * 4) : 1 + Math.floor(rng() * (3 + L));
      const both = L >= 2 && s > 0; // the last level: they cross at the door
      for (let i = 0; i < off; i++) ev.push({ k: 'off', t: at + i * (0.22 + rng() * 0.25), c: pick(COLS) });
      const t0 = both ? at + 0.3 : at + off * 0.42 + 0.3;
      for (let i = 0; i < on; i++) ev.push({ k: 'on', t: t0 + i * (0.2 + rng() * 0.25), c: pick(COLS) });
      inside += on - off;
      const end = Math.max(...ev.map(e => e.t)) + 1.2;
      ev.push({ k: 'stop', t: at - 0.6, name: NAMES[s] }); ev.push({ k: 'go', t: end, s }); at = end + 1.6;
    }
    return { ev, ans: inside, end: at - 1.2 };
  };
  openUI({ kind: 'train', mid: true });
  $('modal').innerHTML = `<div class="bubble form" style="width:min(720px,95vw);text-align:center"><div class="who">${esc(k.name)} · 기차 셈</div><div style="font-size:19px">${p.q}</div>` +
    `<canvas id="train" width="${W}" height="${H}" style="width:100%;max-height:44vh;object-fit:contain;margin-top:6px;border-radius:18px;display:block"></canvas>` +
    '<div id="tst" style="margin-top:4px;font-size:18px"></div><div id="tAsk" style="display:none"><input id="qa" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="기차에 남은 사람 (명)" style="text-align:center"></div>' +
    '<div id="qfb" class="note" style="display:none"></div><div class="opts" style="justify-content:center"><button class="opt" id="tGo" style="background:var(--sun)">출발!</button><button class="opt" id="pSend" style="display:none;background:var(--sun)">확인</button><button class="opt" id="pLater">그만할래</button></div></div>';
  const cv = $('train'), x = cv.getContext('2d');
  const status = () => { $('tst').innerHTML = `맞힌 수 <b>${right} / ${NEED}</b>` + (round ? ` · ${round.ev.filter(e => e.k === 'stop').length}개 역` : ''); };
  const person = (px, py, col, a) => { x.save(); x.globalAlpha = a; x.translate(px, py + 14); x.scale(1.5, 1.5); x.fillStyle = col; x.beginPath(); x.roundRect(-7, -22, 14, 18, 5); x.fill(); x.fillStyle = '#ffd9b8'; x.beginPath(); x.arc(0, -28, 7, 0, 6.3); x.fill(); x.fillStyle = '#4a3d6b'; x.fillRect(-5, -4, 4, 6); x.fillRect(1, -4, 4, 6); x.restore(); };
  const draw = () => {
    const ev = round ? round.ev : [], stops = ev.filter(e => e.k === 'stop' && e.t <= t), gos = ev.filter(e => e.k === 'go' && e.t <= t);
    const moving = gos.length >= stops.length && stops.length > 0, lastGo = gos[gos.length - 1], nextStop = ev.find(e => e.k === 'stop' && e.t > t);
    let shift = 0; if (moving && lastGo) shift = (t - lastGo.t) * 520; // the train pulls out to the left
    if (nextStop && nextStop.t - t < 0.6 && stops.length) shift = -(nextStop.t - t) * 900; // the next train rolls in from the right
    x.fillStyle = '#bfe3f2'; x.fillRect(0, 0, W, H); x.fillStyle = '#9fd4a8'; x.beginPath(); x.ellipse(160 - (t * 30) % 900, 210, 260, 70, 0, 0, 6.3); x.ellipse(620 - (t * 30) % 900, 215, 300, 80, 0, 0, 6.3); x.fill();
    x.fillStyle = '#d9d2e6'; x.fillRect(0, PLAT, W, H - PLAT); x.fillStyle = '#8f7f9f'; x.fillRect(0, PLAT - 6, W, 6);
    const sName = stops.length && !moving ? stops[stops.length - 1].name : nextStop ? nextStop.name : '';
    if (sName) { x.fillStyle = '#4a3d6b'; x.beginPath(); x.roundRect(20, 18, 130, 40, 10); x.fill(); x.fillStyle = '#fff8e8'; x.font = '700 20px sans-serif'; x.textAlign = 'center'; x.fillText(sName, 85, 45); }
    x.save(); x.translate(-shift, 0); // the train: engine on the left, one car, the door in the middle
    x.fillStyle = '#3a2f45'; x.fillRect(40, 130, 150, 92); x.fillRect(70, 96, 26, 36); x.fillStyle = '#ff8a73'; x.fillRect(40, 150, 150, 10);
    for (let i = 0; i < 4; i++) { x.fillStyle = `rgba(240,240,240,${0.5 - i * 0.1})`; x.beginPath(); x.arc(84 + i * 18 - ((t * 40) % 18), 84 - i * 16, 10 + i * 4, 0, 6.3); x.fill(); }
    x.fillStyle = '#c9584a'; x.beginPath(); x.roundRect(196, 110, 300, 112, 12); x.fill(); x.fillStyle = '#e8c66a'; x.fillRect(196, 128, 300, 6);
    [216, 266, 400, 450].forEach(wx => { x.fillStyle = '#2e2559'; x.beginPath(); x.roundRect(wx, 144, 38, 30, 6); x.fill(); }); // tinted windows: no peeking
    const open = round && !moving && stops.length && ev.some(e => (e.k === 'on' || e.k === 'off') && Math.abs(e.t - t) < 1.4);
    x.fillStyle = open ? '#1d1840' : '#e8c66a'; x.fillRect(DOOR - 22, 142, 44, 80);
    [80, 150, 250, 320, 430].forEach(wx => { x.fillStyle = '#2e2559'; x.beginPath(); x.arc(wx, 226, 14, 0, 6.3); x.fill(); x.fillStyle = '#8f7f9f'; x.beginPath(); x.arc(wx, 226, 5, 0, 6.3); x.fill(); });
    x.restore();
    ev.forEach(e => { // people: getting on walk from the right into the door; getting off walk out to the left
      if (e.k !== 'on' && e.k !== 'off') return; const u = (t - e.t) / 1.1; if (u < 0 || u > 1) return;
      const bob = Math.abs(Math.sin(u * 18)) * 3;
      if (e.k === 'on') person(DOOR + 300 * (1 - u), PLAT + 6 - bob, e.c, u > 0.85 ? (1 - u) / 0.15 : 1);
      else person(DOOR - 300 * u, PLAT + 6 - bob, e.c, u < 0.15 ? u / 0.15 : 1);
    });
  };
  const loop = now => {
    if (!state.ui || state.ui.kind !== 'train') return; const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (round && !round.asked) { t += dt; if (t >= round.end) { round.asked = true; $('tAsk').style.display = 'block'; $('pSend').style.display = ''; setTimeout(() => $('qa') && $('qa').focus(), 50); } }
    draw(); raf = requestAnimationFrame(loop);
  };
  const begin = () => { round = make(); t = 0; $('tGo').style.display = 'none'; $('tAsk').style.display = 'none'; $('pSend').style.display = 'none'; $('qfb').style.display = 'none'; $('qa').value = ''; status(); sfx('blip'); };
  const check = () => {
    if (!round || !round.asked) return; const v = parseNum($('qa').value); if (isNaN(v)) return fbox('숫자로 써 줘!');
    if (v === round.ans) { right++; sfx('pop'); status(); if (right >= NEED) { closeUI(); return giveItem(k, p); } fbox(`딩동! ${round.ans}명 맞아. ${NEED - right}번 더! 다음 기차는 역이 하나 더 많아.`, true); }
    else { sfx('bad'); fbox(`땡! 기차에 남은 사람은 <b>${round.ans}명</b>이었어. 다시 세어 보자!`); }
    round = null; $('tGo').style.display = ''; $('tGo').textContent = '다음 기차 출발!'; $('tAsk').style.display = 'none'; $('pSend').style.display = 'none';
  };
  $('tGo').onclick = begin; $('pSend').onclick = check; $('qa').onkeydown = e => { if (e.key === 'Enter') setTimeout(check, 30); };
  $('pLater').onclick = () => closeUI(); status(); last = performance.now(); raf = requestAnimationFrame(loop);
}
