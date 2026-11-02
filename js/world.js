// 쿼터뷰 월드: 지도 불러오기, 이동·충돌, NPC, 상호작용 대상 찾기, 그리기

const World = {
  canvas: null, ctx: null, scale: 3,
  mapId: null, map: null, blocked: null,
  player: null, npcs: [],
  keys: {}, joy: { x: 0, y: 0 },
  target: null, frameT: 0, last: 0,
  auto: null,             // 자동 이동: { path, goal, r, onArrive, stuck }
  hits: [],               // 화면에서 누를 수 있는 말풍선 { x, y, w, h, id } (캔버스 픽셀)
  floaters: [],           // 거둔 뒤 떠오르는 글자 { x, y, text, t }
  onCollect: null,        // UI가 연결: 말풍선을 누르면 호출
  overview: false,        // 멀리서 바라보기 (주임 신부 본당): 캐릭터 없이 끌어서 둘러보고, 눌러서 연다
  cam: [0, 0],            // 바라보는 곳 (월드 픽셀, iso 좌표)
  camOff: [0, 0],         // 마지막으로 그린 화면 이동량 (캔버스 픽셀)
  zoomIdx: 1,
  onTap: null,            // UI가 연결: 멀리서 보기에서 무언가를 눌렀을 때
  placing: null,          // 짓기: 놓을 자리를 고르는 중 { kind, x, y, ok, reason }
  pathMode: false,        // 길 놓기 중 (누르면 길을 놓고, 길을 누르면 걷는다)
  onPathTap: null,        // UI가 연결
  onPlaceMove: null,      // UI가 연결: 놓을 자리가 바뀌면 호출 (x, y)
  onTargetChange: null,  // UI가 연결: 상호작용 대상이 바뀌면 호출
  isPaused: () => false, // UI가 연결: 모달이 열려 있으면 멈춤
};

const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4];  // 멀리서 보기 확대 단계 (화면 1픽셀 = 월드 몇 픽셀). v0.80: 지도가 두 배라 더 멀리
const PLAYER_SPEED = 3.2;   // 초당 타일
const NPC_SPEED = 1.1;
const BODY_R = 0.28;
const INTERACT_R = 1.05;

// ---------- 지도 ----------

function worldLoad(mapId) {
  const map = MAPS[mapId];
  World.mapId = mapId;
  World.map = map;
  World.pathSet = new Set();
  for (const [px, py, pw, ph] of map.paths)
    for (let x = px; x < px + pw; x++) for (let y = py; y < py + ph; y++) World.pathSet.add(x + ',' + y);
  worldRebuild();

  World.player = { x: map.spawn[0], y: map.spawn[1], dir: 'down', moving: false, look: Game.state.phase === 'seminary' ? 'seminarian' : 'priest' };
  World.npcs = map.npcs.map(n => ({ ...n, x: n.home[0], y: n.home[1], dir: 'down', moving: false, tx: null, ty: null, wait: Math.random() * 3 }));
  World.target = null;
  World.overview = !!map.overview;
  if (World.overview) {
    World.cam = iso(...(map.viewCenter || [map.w / 2, map.h / 2]));
    // 본당 한가운데가 화면에 넉넉히 들어오는 가장 큰 확대
    const fit = window.innerWidth / (map.viewWidth || 640);
    World.zoomIdx = Math.max(0, ZOOMS.reduce((best, z, i) => (z <= fit ? i : best), 0));
    worldResize();
  }
}

// 멀리서 보기: 사람은 특별한 때(찾아온 교우, 마을 이장님의 부탁)만 보인다
function npcVisible(n) {
  if (!World.overview) return true;
  return n.id === 'eventNpc' || !!npcBubble(n);
}

function clampCam() {
  const m = World.map, c = World.canvas;
  const left = iso(0, m.h)[0], right = iso(m.w, 0)[0], bottom = iso(m.w, m.h)[1];
  const hw = World.vw / 2, hh = World.vh / 2;
  // 지도 끝이 화면 가운데 근처까지 올 수 있게 넉넉히 (위쪽은 건물 지붕과 위쪽 막대 몫만큼 더)
  World.cam[0] = clamp(World.cam[0], Math.min(left + hw * 0.4, (left + right) / 2), Math.max(right - hw * 0.4, (left + right) / 2));
  World.cam[1] = clamp(World.cam[1], Math.min(-80, bottom / 2), Math.max(bottom + 40, bottom / 2));
}

function worldZoom(step, anchorX, anchorY) {
  if (typeof insideView === 'function' && insideView()) {
    // 성전 안 도면: 가리키는 곳이 그대로 남도록 키우고 줄인다 (1~3배)
    const c = World.canvas, r = c.getBoundingClientRect(), k = 1 / World.scale, z0 = World.inZoom || 1, z1 = clamp(z0 * (step > 0 ? 1.4 : 1 / 1.4), 1, 3);
    if (Math.abs(z1 - z0) < 0.01) return;
    const [cx, cy] = World.inCenter || [c.width / 2, c.height / 2], pan = World.inPan || [0, 0];
    const ax = (anchorX === undefined ? r.width / 2 : anchorX - r.left) * k - cx, ay = (anchorY === undefined ? r.height / 2 : anchorY - r.top) * k - cy;
    World.inPan = [ax - (ax - pan[0]) * z1 / z0, ay - (ay - pan[1]) * z1 / z0];
    World.inZoom = z1 < 1.05 ? 1 : z1;
    return;
  }
  const i = clamp(World.zoomIdx + step, 0, ZOOMS.length - 1);
  if (i === World.zoomIdx) return;
  // 손가락·마우스가 가리키는 곳이 그대로 남도록
  const c = World.canvas, r = c.getBoundingClientRect();
  const ax = anchorX === undefined ? r.width / 2 : anchorX - r.left, ay = anchorY === undefined ? r.height / 2 : anchorY - r.top;
  const before = ZOOMS[World.zoomIdx];
  const wx = World.cam[0] + (ax / before - World.vw / 2), wy = World.cam[1] + (ay / before - World.vh / 2);
  World.zoomIdx = i;
  worldResize();
  const after = ZOOMS[i];
  World.cam = [wx - (ax / after - World.vw / 2), wy - (ay / after - World.vh / 2)];
  clampCam();
}

function centerOn(x, y) { if (!World.overview) return; World.cam = iso(x, y); clampCam(); }

// 이웃 동네 종교 공동체 이름표 둘째 줄: 종교와 신자 수
function religionLine(b) {
  if (!b.religion) return '';
  const r = RELIGIONS[b.religion];
  return `${r.icon} ${r.kind} · 신자 ${religionMembers(b.religion)}명`;
}

// 교리실 이름표 둘째 줄: 방마다 든 단체 (빈 방은 "빈 방")
function roomsLine(b) {
  if (!b.rooms || b.scaffold) return '';
  return b.rooms.map(g => (g ? `${UNITS[g.type].icon}${g.type === 'district' && g.level ? `소공동체(${districtStage()})` : UNIT_SHORT[g.type]}${g.level ? ` ${g.level}` : '(준비)'}` : '🚪빈 방')).join(' · ');
}

// 지도에 보일 건물 이름 (짧게)
function buildingShortName(b) {
  const lv = b.level ? ` Lv${b.level}` : '';
  if (b.scaffold) return `${b.rooms ? `교리실 ${containerIndex(b.id)}` : b.label} 공사 중`;
  if (b.id === 'church') return `성당${lv}`;
  if (b.id === 'rectory') return `사제관${lv}`;
  if (b.id === 'office') return `사무실${lv}`;
  if (b.rooms) return `교리실 ${containerIndex(b.id)}${lv}`;
  if (b.style === 'gongso') return `공소${lv}`;
  const m = b.label.match(/\((.*)\)/);
  return m ? m[1] : b.label;
}

// 안내 화살표: 가리킬 건물 위에서 통통 튀는 손가락과 글자
function drawHintArrow(ctx, h) {
  let x, y0;
  if (h.at) { [x, y0] = iso(...h.at); y0 -= 10; }
  else {
    const b = (World.buildings || []).find(q => q.id === h.id);
    if (!b) return;
    [x, y0] = buildingTop(b);
  }
  const bob = Math.round(Math.sin(World.frameT * 6) * 3);
  const k = Math.max(1, 2.4 / World.scale);
  const y = Math.round(y0) - (h.bubble ? 44 * k + 6 : 8) + bob;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('👇', x, y);
  ctx.font = 'bold 8px sans-serif';
  const w = Math.ceil(ctx.measureText(h.text).width) + 10;
  ctx.fillStyle = '#7b2d26';
  ctx.fillRect(Math.round(x - w / 2), y - 26, w, 12);
  ctx.fillStyle = '#fff';
  ctx.fillText(h.text, x, y - 17);
}

// 장애물을 누르면 그 자리 위에 바로 뜨는 버튼 (obActionInfo는 ui.js가 정한다)
function drawObAction(ctx, camX, camY) {
  const m = World.map, o = m.obstacleList && m.obstacleList().find(q => q.id === World.obSel.id);
  const info = o && typeof obActionInfo === 'function' ? obActionInfo(o) : null;
  if (!info) { World.obSel = null; return; }
  const k = Math.max(1, 2 / World.scale), [ax, ay] = iso(o.x + o.w / 2, o.y + o.d / 2);
  const x = Math.round(ax), y = Math.round(ay - (o.type === 'house' ? 30 : 16) * 1 - 10 * k);
  ctx.font = `bold ${Math.round(8 * k)}px sans-serif`;
  ctx.textAlign = 'center';
  const w = Math.ceil(ctx.measureText(info.label).width) + 12 * k, h = Math.round(14 * k);
  const bx = Math.round(x - w / 2), by = Math.round(y - h);
  // 말풍선 꼬리와 몸통
  ctx.fillStyle = info.ok ? '#1f6b3a' : '#5f5e5a';
  poly(ctx, [[x - 3 * k, by + h], [x + 3 * k, by + h], [x, by + h + 4 * k]], ctx.fillStyle);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 1, by - 1, w + 2, h + 2, 5 * k) : ctx.rect(bx - 1, by - 1, w + 2, h + 2); ctx.fill();
  ctx.fillStyle = info.ok ? '#3cbf68' : '#8a8a84';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, h, 4 * k) : ctx.rect(bx, by, w, h); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(info.label, x, by + h - 4 * k);
  World.hits.push({ x: bx + camX - 3, y: by + camY - 3, w: w + 6, h: h + 6, id: o.id, obAct: true });
}

// 치운 자리 위로 결과가 떠오른다 (1.8초)
function drawClearFx(ctx) {
  if (typeof CLEAR_FX === 'undefined') return;
  World.fx = World.fx || [];
  while (CLEAR_FX.length) World.fx.push({ ...CLEAR_FX.shift(), t0: World.frameT });
  const k = Math.max(1, 2 / World.scale);
  World.fx = World.fx.filter(f => World.frameT - f.t0 < 1.8);
  for (const f of World.fx) {
    const a = (World.frameT - f.t0) / 1.8, [ax, ay] = iso(f.x, f.y);
    ctx.globalAlpha = a < 0.7 ? 1 : 1 - (a - 0.7) / 0.3;
    ctx.font = `bold ${Math.round(8 * k)}px sans-serif`;
    ctx.textAlign = 'center';
    f.lines.forEach((t, i) => {
      const y = Math.round(ay - 18 - a * 22 * k - (f.lines.length - 1 - i) * 10 * k);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,30,20,.85)'; ctx.strokeText(t, Math.round(ax), y);
      ctx.fillStyle = i === 0 ? '#fff6d8' : '#f2c14e'; ctx.fillText(t, Math.round(ax), y);
    });
    ctx.globalAlpha = 1;
  }
}

// 화면의 한 점 아래 타일 좌표 (소수)
function tileAt(clientX, clientY) {
  const r = World.canvas.getBoundingClientRect();
  const sx = (clientX - r.left) / World.scale - World.camOff[0], sy = (clientY - r.top) / World.scale - World.camOff[1];
  return [(sx / (TW / 2) + sy / (TH / 2)) / 2, (sy / (TH / 2) - sx / (TW / 2)) / 2];
}

// 조경 놓기: 반투명 그림과 초록·빨강 바닥
function drawDecorGhost(ctx, pl) {
  const [dw, dd] = sizeOf(pl.kind, pl.rot), foot = [iso(pl.x, pl.y), iso(pl.x + dw, pl.y), iso(pl.x + dw, pl.y + dd), iso(pl.x, pl.y + dd)];
  poly(ctx, foot, pl.ok ? 'rgba(60, 191, 104, .5)' : 'rgba(224, 71, 58, .5)', pl.ok ? '#3cbf68' : '#e0473a');
  ctx.globalAlpha = 0.7; drawDecor(ctx, { decor: pl.kind, x: pl.x, y: pl.y, w: dw, d: dd, rot: pl.rot || 0 }); ctx.globalAlpha = 1;
}

// 반투명 건물: 놓을 수 있으면 초록, 없으면 빨강
function drawPlacing(ctx, pl) {
  const [w, d] = sizeOf(pl.kind, pl.rot), rot = pl.rot || 0, side = DOOR_SIDE[rot];
  if (pl.move) {
    // 옮기는 중: 그 건물 그대로 반투명하게, 바닥은 초록·빨강
    const orig = World.buildings.find(q => q.id === pl.move);
    if (!orig) return;
    const b = { ...orig, x: pl.x, y: pl.y, w, d, rot, door: { ...orig.door, side } };
    poly(ctx, [iso(b.x, b.y), iso(b.x + w, b.y), iso(b.x + w, b.y + d), iso(b.x, b.y + d)], pl.ok ? 'rgba(60, 191, 104, .45)' : 'rgba(224, 71, 58, .45)', pl.ok ? '#3cbf68' : '#e0473a');
    ctx.globalAlpha = 0.8; drawBuildingAny(ctx, b); ctx.globalAlpha = 1;
    // 테두리와 ✔·✖는 건물 위에 한 번 더 (가려도 보이게)
    const col = pl.ok ? '#3cbf68' : '#e0473a', k = Math.max(1, 2 / World.scale);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5 * k; ctx.setLineDash([4 * k, 3 * k]);
    ctx.beginPath(); ctx.moveTo(...iso(b.x, b.y)); ctx.lineTo(...iso(b.x + w, b.y)); ctx.lineTo(...iso(b.x + w, b.y + d)); ctx.lineTo(...iso(b.x, b.y + d)); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    const [tx, ty] = iso(b.x + w / 2, b.y + d / 2), top = b.spriteTop ? b.spriteTop[1] : ty - (b.h || 13) - 6;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tx, top - 8 * k, 6 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(8 * k)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pl.ok ? '✔' : '✖', tx, top - 8 * k); ctx.textBaseline = 'alphabetic';
    // 건물 오른쪽 옆 ↻: 누르면 그 자리에서 돌린다
    const [rx, ry] = iso(b.x + w, b.y), r = 9 * k, cx = rx + 12 * k, cy = ry - 6 * k;
    ctx.fillStyle = 'rgba(60,40,20,.25)'; ctx.beginPath(); ctx.arc(cx, cy + 1.5 * k, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a3b2a'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, -Math.PI * 0.15, Math.PI * 1.45); ctx.stroke();
    const ax = cx + r * 0.5 * Math.cos(-Math.PI * 0.15), ay = cy + r * 0.5 * Math.sin(-Math.PI * 0.15);
    poly(ctx, [[ax - 2.2 * k, ay - 2 * k], [ax + 2.6 * k, ay - 1.4 * k], [ax + 0.4 * k, ay + 2.4 * k]], '#8a3b2a');
    const slop = 6 / World.scale, [camX, camY] = World.camOff;
    World.hits.push({ x: cx - r + camX - slop, y: cy - r + camY - slop, w: 2 * r + slop * 2, h: 2 * r + slop * 2, id: pl.move, rotPlace: true });
    return;
  }
  if (DECOR[pl.kind]) { drawDecorGhost(ctx, pl); return; }
  const b = pl.kind === 'gongso'
    ? { x: pl.x, y: pl.y, w, d, rot, h: 18, style: 'gongso', door: { side, u: 0.5 }, cross: true }
    : { x: pl.x, y: pl.y, w, d, rot, h: 13, style: 'container', door: { side, u: 0.5 }, color: 0 };
  const foot = [iso(b.x, b.y), iso(b.x + w, b.y), iso(b.x + w, b.y + d), iso(b.x, b.y + d)];
  const col = pl.ok ? '#3cbf68' : '#e0473a';
  poly(ctx, foot, pl.ok ? 'rgba(60, 191, 104, .5)' : 'rgba(224, 71, 58, .5)', col);
  // 건물을 따로 그려 초록·빨강으로 물들인 뒤 반투명하게 얹는다
  const off = drawPlacing.off || (drawPlacing.off = document.createElement('canvas'));
  off.width = 200; off.height = 160;
  const o = off.getContext('2d'), [ax, ay] = iso(b.x + w / 2, b.y + d / 2);
  o.save(); o.translate(100 - ax, 110 - ay);
  if (b.style === 'container') drawContainer(o, b); else drawBuilding(o, b);
  o.restore();
  o.globalCompositeOperation = 'source-atop';
  o.fillStyle = pl.ok ? 'rgba(60, 191, 104, .65)' : 'rgba(224, 71, 58, .72)';
  o.fillRect(0, 0, 200, 160);
  ctx.globalAlpha = 0.75;
  ctx.drawImage(off, Math.round(ax - 100), Math.round(ay - 110));
  ctx.globalAlpha = 1;
  // 건물 위 표시
  const [tx, ty] = iso(b.x + w / 2, b.y + d / 2);
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = pl.ok ? '#2f9e55' : '#c0392b';
  ctx.fillText(pl.ok ? '✔' : '✖', tx, ty - b.h - 10);
}

// 화면의 한 점(clientX, clientY)에 무엇이 있나: 말풍선 > 사람 > 건물 > 빈 땅 > 잠긴 마을
function pickAt(clientX, clientY) {
  const c = World.canvas, r = c.getBoundingClientRect();
  const px = (clientX - r.left) / World.scale, py = (clientY - r.top) / World.scale;
  // 나중에 그린 것(위에 있는 것)부터
  const bubble = [...World.hits].reverse().find(h => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h && (!h.poly || inPoly(h.poly, px, py)));
  if (bubble) return bubble.interior ? { interiorRoom: bubble.interior } : bubble.sister ? { sisterTap: true, sisterName: bubble.sisterName } : bubble.obAct ? { obAct: bubble.id } : bubble.massGo ? { massGo: true } : bubble.rotPlace ? { rotPlace: true } : bubble.rotBtn ? { rotBtn: bubble.id } : bubble.up ? { upgrade: bubble.id } : { bubble: bubble.id };
  const sx = px - World.camOff[0], sy = py - World.camOff[1];
  for (const n of World.npcs) {
    if (!npcVisible(n)) continue;
    const [nx, ny] = iso(n.x, n.y);
    if (Math.abs(sx - nx) <= 7 && sy <= ny + 2 && sy >= ny - 30) return { npc: n };
  }
  let best = null;
  for (const b of World.buildings) {
    // 건물 모양(바닥 마름모를 높이만큼 세운 육각형) 안에 있는지
    const A = iso(b.x, b.y), B = iso(b.x + b.w, b.y), C = iso(b.x + b.w, b.y + b.d), D = iso(b.x, b.y + b.d);
    if (sx < D[0] || sx > B[0]) continue;
    const at = (p, q) => p[1] + (q[1] - p[1]) * (sx - p[0]) / (q[0] - p[0] || 1);
    const lower = sx <= C[0] ? at(D, C) : at(C, B), upper = sx <= A[0] ? at(D, A) : at(A, B);
    const top = b.spriteTop ? b.spriteTop[1] : A[1] - (b.h || 14) - 22;
    if (sy > lower || sy < upper - (A[1] - top)) continue;
    const depth = b.x + b.w + b.y + b.d;
    if (!best || depth > best.depth) best = { building: b, depth };
  }
  if (best) return { building: best.building };
  const tx = Math.floor((sx / (TW / 2) + sy / (TH / 2)) / 2), ty = Math.floor((sy / (TH / 2) - sx / (TW / 2)) / 2);
  // 아직 안 산 본당 땅: 누르면 땅 사기
  if (World.overview && World.map === MAPS.solmoe && !tileRegion(tx, ty) && tx >= 0 && ty >= 0 && !lotOwnedAt(tx, ty)) return { lot: lotAt(tx, ty) };
  if (World.overview && World.map.obstacleAt) {
    // 집은 지붕까지, 나무·돌은 바로 위 칸까지 누를 수 있게
    const ob = World.map.obstacleAt(tx, ty) || World.map.obstacleAt(tx + 1, ty + 1);
    if (ob && !regionLocked(World.map.regionAt(ob.x, ob.y))) return { obstacle: ob };
  }
  const pl = World.plots.find(q => tx >= q.x && tx < q.x + 3 && ty >= q.y && ty < q.y + 3);
  if (pl) return { plot: pl };
  const reg = tileRegion(tx, ty);
  if (reg && regionLocked(reg)) return { region: reg };
  return null;
}

// 잠긴 마을인지
function regionLocked(id) { return !!id && !!World.map.regionLocked && World.map.regionLocked(id); }

function tileRegion(x, y) {
  for (const r of World.map.regions || []) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.id;
  return null;
}

// 건물·빈 땅·막힌 칸을 다시 계산한다 (짓기, 마을 열기 뒤에 호출)
function worldRebuild() {
  const map = World.map;
  const all = map.getBuildings ? map.getBuildings() : map.buildings;
  World.buildings = all.filter(b => !regionLocked(b.region));
  World.plots = (map.getPlots ? map.getPlots() : []).filter(pl => !regionLocked(pl.region));
  const blocked = Array.from({ length: map.w }, () => new Array(map.h).fill(false));
  for (const b of World.buildings) {
    for (let x = b.x; x < b.x + b.w; x++) for (let y = b.y; y < b.y + b.d; y++) blocked[x][y] = true;
    b.doorPt = b.door.side === 'S'
      ? [b.x + b.door.u * b.w, b.y + b.d + 0.45]
      : [b.x + b.w + 0.45, b.y + b.door.u * b.d];
  }
  { const TS = map.treeSize || 1, G = map.grid || 1; const blk = (x0, y0, n) => { for (let x = x0; x < x0 + n; x++) for (let y = y0; y < y0 + n; y++) if (blocked[x]) blocked[x][y] = true; };
    const cut = (Game.state.pastor && Game.state.pastor.cleared) || {};
    for (const [x, y] of map.trees) if (!(map.obstacles && cut[`t${x}_${y}`])) blk(x, y, TS);
    for (const [x, y] of map.statues || []) blk(x, y, G); }
  World.lockedTiles = new Set();
  for (const r of map.regions || []) {
    if (!regionLocked(r.id)) continue;
    for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) { blocked[x][y] = true; World.lockedTiles.add(x + ',' + y); }
  }
  World.blocked = blocked;
  World.target = null;
  if (World.onTargetChange) World.onTargetChange(null);
}

function isBlockedAt(x, y) {
  const m = World.map;
  if (x < 0.3 || y < 0.3 || x > m.w - 0.3 || y > m.h - 0.3) return true;
  return World.blocked[Math.floor(x)][Math.floor(y)];
}

function canStand(x, y) {
  const r = BODY_R;
  return !isBlockedAt(x - r, y - r) && !isBlockedAt(x + r, y - r) && !isBlockedAt(x - r, y + r) && !isBlockedAt(x + r, y + r);
}

// 화면 방향 벡터(sx, sy)를 월드 이동 벡터로
function screenToWorldDir(sx, sy) {
  const dx = (sx / (TW / 2) + sy / (TH / 2)) / 2;
  const dy = (sy / (TH / 2) - sx / (TW / 2)) / 2;
  const len = Math.hypot(dx, dy);
  return len ? [dx / len, dy / len] : [0, 0];
}

function dirFromScreen(sx, sy) {
  if (Math.abs(sx) > Math.abs(sy)) return sx > 0 ? 'right' : 'left';
  return sy > 0 ? 'down' : 'up';
}

function moveEntity(e, dx, dy, dist) {
  let moved = false;
  const nx = e.x + dx * dist, ny = e.y + dy * dist;
  if (canStand(nx, e.y)) { e.x = nx; moved = true; }
  if (canStand(e.x, ny)) { e.y = ny; moved = true; }
  return moved;
}

// ---------- 갱신 ----------

function worldUpdate(dt) {
  const p = World.player;
  const k = World.keys;
  if (World.overview) {
    // 방향키로 둘러보기
    let sx = 0, sy = 0;
    if (k.ArrowLeft || k.KeyA) sx -= 1;
    if (k.ArrowRight || k.KeyD) sx += 1;
    if (k.ArrowUp || k.KeyW) sy -= 1;
    if (k.ArrowDown || k.KeyS) sy += 1;
    if (sx || sy) { World.cam[0] += sx * 260 * dt / World.scale; World.cam[1] += sy * 260 * dt / World.scale; clampCam(); }
    for (const n of World.npcs) if (npcVisible(n)) updateNpc(n, dt);
    syncSpecialNpcs();
    return;
  }
  let sx = World.joy.x, sy = World.joy.y;
  if (k.ArrowLeft || k.KeyA) sx -= 1;
  if (k.ArrowRight || k.KeyD) sx += 1;
  if (k.ArrowUp || k.KeyW) sy -= 1;
  if (k.ArrowDown || k.KeyS) sy += 1;
  p.moving = false;
  if (sx || sy) {
    World.auto = null; // 직접 움직이면 자동 이동을 멈춘다
    const [dx, dy] = screenToWorldDir(sx, sy);
    p.dir = dirFromScreen(sx, sy);
    p.moving = moveEntity(p, dx, dy, PLAYER_SPEED * dt);
  } else if (World.auto) autoStep(dt);

  for (const n of World.npcs) updateNpc(n, dt);
  syncSpecialNpcs();
  findTarget();
}

function updateNpc(n, dt) {
  n.moving = false;
  if (World.target && World.target.npc === n) return; // 말 거는 중엔 멈춤
  if (n.wait > 0) { n.wait -= dt; return; }
  if (n.tx === null) {
    for (let i = 0; i < 6; i++) {
      const tx = n.home[0] + (Math.random() * 2 - 1) * n.radius;
      const ty = n.home[1] + (Math.random() * 2 - 1) * n.radius;
      if (canStand(tx, ty)) { n.tx = tx; n.ty = ty; break; }
    }
    if (n.tx === null) { n.wait = 1; return; }
  }
  const dx = n.tx - n.x, dy = n.ty - n.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.05) { n.tx = null; n.wait = 1.5 + Math.random() * 3; return; }
  const step = Math.min(dist, NPC_SPEED * (World.map.grid || 1) * dt);
  const moved = moveEntity(n, dx / dist, dy / dist, step);
  const [sx, sy] = iso(dx, dy);
  n.dir = dirFromScreen(sx, sy);
  n.moving = moved;
  if (!moved) { n.tx = null; n.wait = 1; }
}

// 이번 달 이벤트가 있으면 성당 앞에 "!" 교우가 나타난다
function syncSpecialNpcs() {
  const s = Game.state;
  const hasEvent = (s.phase === 'curate' && s.curate.event && World.mapId === 'parish') || (s.phase === 'pastor' && s.pastor.event && World.mapId === 'solmoe');
  const idx = World.npcs.findIndex(n => n.id === 'eventNpc');
  if (hasEvent && idx < 0) {
    const [ex, ey] = World.map.eventSpot || [10.5, 7.2];
    World.npcs.push({ id: 'eventNpc', name: '찾아온 교우', look: 'p4', home: [ex, ey], radius: 0, x: ex, y: ey, dir: 'down', tx: null, ty: null, wait: 999, menu: 'event', bubble: '!' });
  } else if (!hasEvent && idx >= 0) {
    World.npcs.splice(idx, 1);
  }
}

function findTarget() {
  const p = World.player;
  let best = null, bestD = INTERACT_R;
  for (const n of World.npcs) {
    // "!" 표시가 있는 인물을 먼저 고른다
    const d = Math.hypot(n.x - p.x, n.y - p.y) - (npcBubble(n) ? 0.4 : 0);
    if (d < bestD) { bestD = d; best = { npc: n, label: n.name, menu: n.menu, lines: n.lines }; }
  }
  for (const b of World.buildings) {
    const d = Math.hypot(b.doorPt[0] - p.x, b.doorPt[1] - p.y);
    if (d < bestD) { bestD = d; best = { building: b, label: buildingLabel(b), menu: b.menu }; }
  }
  // 빈 땅: 땅 안에 서 있거나 가까이 있으면
  for (const pl of World.plots) {
    const d = Math.max(0, Math.hypot(pl.cx - p.x, pl.cy - p.y) - 0.9);
    if (d < bestD) { bestD = d; best = { plot: pl, label: pl.gongsoOnly ? '빈 땅 (공소 자리)' : '빈 땅', menu: 'plot' }; }
  }
  const prev = World.target;
  const key = t => t && (t.npc || t.building || t.plot);
  const same = prev && best && key(prev) === key(best) && prev.label === best.label;
  if (!same && (prev || best)) {
    World.target = best;
    if (World.onTargetChange) World.onTargetChange(best);
  }
}

// ---------- 자동 이동 (퀘스트를 누르면 목적지까지 걸어간다) ----------

// 타일 격자에서 너비 우선 탐색. 대각선은 양옆이 모두 비어 있을 때만
function findPath(fx, fy, gx, gy) {
  const m = World.map, B = World.blocked;
  const free = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !B[x][y];
  const sx = Math.floor(fx), sy = Math.floor(fy);
  let tx = Math.floor(gx), ty = Math.floor(gy);
  if (!free(tx, ty)) {
    // 목적지 칸이 막혔으면 가장 가까운 빈 칸
    let best = null;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      if (!free(tx + dx, ty + dy)) continue;
      const d = Math.hypot(tx + dx + 0.5 - gx, ty + dy + 0.5 - gy);
      if (!best || d < best.d) best = { x: tx + dx, y: ty + dy, d };
    }
    if (!best) return null;
    tx = best.x; ty = best.y;
  }
  const prev = new Map(), key = (x, y) => x * 1000 + y;
  const queue = [[sx, sy]];
  prev.set(key(sx, sy), null);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny) || prev.has(key(nx, ny))) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
      prev.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  const path = [];
  for (let c = [tx, ty]; c; c = prev.get(key(c[0], c[1]))) path.unshift([c[0] + 0.5, c[1] + 0.5]);
  path.shift(); // 지금 서 있는 칸
  return path;
}

// goal: [x, y] 또는 그 값을 돌려주는 함수(움직이는 사람), r: 이만큼 가까워지면 도착
function worldWalkTo(goal, r, onArrive) {
  const p = World.player, g = typeof goal === 'function' ? goal() : goal;
  if (Math.hypot(g[0] - p.x, g[1] - p.y) <= r) { World.auto = null; onArrive(); return true; }
  const path = findPath(p.x, p.y, g[0], g[1]);
  if (!path) return false;
  if (canStand(g[0], g[1])) path.push([g[0], g[1]]);
  World.auto = { path, goal, r, onArrive, stuck: 0, retries: 0 };
  return true;
}

function autoStep(dt) {
  const a = World.auto, p = World.player;
  const g = typeof a.goal === 'function' ? a.goal() : a.goal;
  if (Math.hypot(g[0] - p.x, g[1] - p.y) <= a.r) {
    World.auto = null;
    a.onArrive();
    return;
  }
  const wp = a.path[0];
  if (!wp) {
    // 길 끝에 왔는데 아직 멀다 (사람이 움직였다): 다시 길을 찾는다
    if (a.retries++ > 3) { World.auto = null; return; }
    const path = findPath(p.x, p.y, g[0], g[1]);
    if (!path) { World.auto = null; return; }
    a.path = path;
    return;
  }
  const dx = wp[0] - p.x, dy = wp[1] - p.y, d = Math.hypot(dx, dy);
  if (d < 0.12) { a.path.shift(); return; }
  const step = Math.min(d, PLAYER_SPEED * dt);
  const [sx, sy] = iso(dx, dy);
  p.dir = dirFromScreen(sx, sy);
  const bx = p.x, by = p.y;
  p.moving = moveEntity(p, dx / d, dy / d, step);
  if (Math.hypot(p.x - bx, p.y - by) < step * 0.3) {
    if ((a.stuck += dt) > 0.6) World.auto = null; // 막혀서 못 가면 멈춘다
  } else a.stuck = 0;
}

// 대상에게 몸을 돌린다
function buildingLabel(b) {
  if (b.scaffold) return `${b.label} (공사 중)`;
  if (b.rooms) return `${b.label} · ${b.rooms.map(g => g ? UNITS[g.type].name : '빈 방').join(' / ')}`;
  return b.level ? `${b.label} Lv${b.level}` : b.label;
}

function faceEachOther(t) {
  if (!t || !t.npc) return;
  const p = World.player, n = t.npc;
  const [sx, sy] = iso(p.x - n.x, p.y - n.y);
  n.dir = dirFromScreen(sx, sy);
  p.dir = dirFromScreen(-sx, -sy);
}

// ---------- 그리기 ----------

// 건물 밑 그림자 (v0.82): 바닥에 붙어 보이게. 빛이 왼쪽 위라 오른쪽 아래(+x)로 조금 번진다
function drawGroundShadow(ctx, b) {
  const g = (World.map && World.map.grid) || 1, sh = 0.35 * g;
  for (let i = 0; i < 4; i++) {
    const e = (0.1 + i * 0.22) * g;
    const p = [iso(b.x - e + sh, b.y - e), iso(b.x + b.w + e + sh, b.y - e), iso(b.x + b.w + e + sh, b.y + b.d + e), iso(b.x - e + sh, b.y + b.d + e)];
    ctx.fillStyle = `rgba(24,40,14,${0.11 - i * 0.025})`;
    ctx.beginPath(); ctx.moveTo(...p[0]); for (const q of p.slice(1)) ctx.lineTo(...q); ctx.closePath(); ctx.fill();
  }
}

// 바닥 큰 얼룩: 칸마다 한 점 (짙은 풀·마른 풀). 거친 격자 값 잡음을 부드럽게 이어 만든다
function groundTint(m) {
  if (World.tintCanvas && World.tintFor === m) return World.tintCanvas;
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
  const g = c.getContext('2d'), img = g.createImageData(m.w, m.h);
  const h = (x, y, s) => typeof natHash === 'function' ? natHash(x, y, s) : 0.5;
  const vn = (x, y, cell, s) => { const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sm = t => t * t * (3 - 2 * t);
    const a = h(x0, y0, s), b = h(x0 + 1, y0, s), c2 = h(x0, y0 + 1, s), d = h(x0 + 1, y0 + 1, s), u = sm(fx), v = sm(fy);
    return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v; };
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const n = vn(x, y, 9, 31) * 0.65 + vn(x, y, 4, 37) * 0.35, dry = vn(x, y, 13, 41), i = (y * m.w + x) * 4;
    if (dry > 0.66) { img.data[i] = 214; img.data[i + 1] = 196; img.data[i + 2] = 104; img.data[i + 3] = Math.min(90, (dry - 0.66) * 600); }
    else if (n < 0.42) { img.data[i] = 30; img.data[i + 1] = 66; img.data[i + 2] = 22; img.data[i + 3] = Math.min(80, (0.42 - n) * 420); }
    else if (n > 0.62) { img.data[i] = 236; img.data[i + 1] = 240; img.data[i + 2] = 150; img.data[i + 3] = Math.min(60, (n - 0.62) * 300); }
  }
  g.putImageData(img, 0, 0);
  World.tintCanvas = c; World.tintFor = m;
  return c;
}

function worldResize() {
  const c = World.canvas;
  const w = window.innerWidth, h = window.innerHeight;
  // 성전 안 평면도는 고운 그림이라 화면 픽셀 그대로 그린다 (레티나는 곱절)
  World.insideRes = typeof insideView === 'function' && insideView();
  const dpr = window.devicePixelRatio || 1;
  World.scale = World.insideRes ? 1 / dpr : World.overview ? ZOOMS[World.zoomIdx] : (w < 520 ? 2 : 3);
  // 바깥도 화면 픽셀 그대로 그리고(고운 그림이 뭉개지지 않게), 월드 1픽셀 = 캔버스 res픽셀로 키워 그린다
  World.res = World.insideRes ? 1 : World.scale * dpr;
  c.width = Math.ceil(w / World.scale * World.res);
  c.height = Math.ceil(h / World.scale * World.res);
  World.vw = c.width / World.res; World.vh = c.height / World.res;
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  World.ctx.imageSmoothingEnabled = false;
  if (World.overview && World.map) clampCam();
}

// 바닥을 화면 픽셀 512칸 조각으로 한 번씩 그려 담아 두고 붙여 찍는다 (v0.90). 매 장면 지도 전체를 무늬로 칠하던 게 버벅임의 주범이었다
// 길을 놓거나 마을을 열면(groundSig가 바뀌면) 다시 그린다. 확대가 바뀌면 그 확대의 조각을 새로 만든다
const GROUND_CS = 512, GROUND_CHUNKS = new Map();
function groundSig(m) {
  const p = Game.state.pastor, paths = (p && p.paths) ? Object.keys(p.paths) : [];
  return `${m.w}x${m.h}|${paths.length}|${paths.join(';')}|${World.lockedTiles.size}|${World.pathSet.size}`;
}
function renderGroundChunk(m, gtex, dtex, res, i, j) {
  const CS = GROUND_CS, c = document.createElement('canvas'); c.width = c.height = CS;
  const g = c.getContext('2d'), P = 128;
  g.setTransform(res, 0, 0, res, -i * CS, -j * CS);
  g.beginPath(); const c4 = [iso(0, 0), iso(m.w, 0), iso(m.w, m.h), iso(0, m.h)]; g.moveTo(...c4[0]); for (const q of c4.slice(1)) g.lineTo(...q); g.closePath(); g.clip();
  g.transform(TW / 2 / P, TH / 2 / P, -TW / 2 / P, TH / 2 / P, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.fillStyle = g.createPattern(gtex, 'repeat'); g.fillRect(0, 0, m.w * P, m.h * P);
  // 큰 얼룩: 짙은 풀밭·마른 풀밭이 넓게 번지게 (칸마다 한 점인 작은 그림을 부드럽게 늘린다)
  g.drawImage(groundTint(m), 0, 0, m.w * P, m.h * P);
  // 흙길: 놓은 길과 이웃 동네 길
  if (dtex) {
    g.beginPath();
    for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) {
      const k = x + ',' + y;
      if (!World.lockedTiles.has(k) && (World.pathSet.has(k) || (Game.state.pastor && Game.state.pastor.paths && Game.state.pastor.paths[k]))) g.rect(x * P - 2, y * P - 2, P + 4, P + 4);
    }
    g.fillStyle = g.createPattern(dtex, 'repeat'); g.fill();
  }
  return c;
}
function drawGroundChunks(ctx, m, gtex, dtex, camX, camY, res) {
  const sig = groundSig(m) + '|' + res;
  if (World.groundSig !== sig) { World.groundSig = sig; GROUND_CHUNKS.clear(); }
  const CS = GROUND_CS, x0 = Math.floor(-camX * res / CS), x1 = Math.floor((World.vw - camX) * res / CS), y0 = Math.floor(-camY * res / CS), y1 = Math.floor((World.vh - camY) * res / CS);
  ctx.imageSmoothingEnabled = false;
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
    const k = i + ',' + j;
    let c = GROUND_CHUNKS.get(k);
    if (c) GROUND_CHUNKS.delete(k); else c = renderGroundChunk(m, gtex, dtex, res, i, j);
    GROUND_CHUNKS.set(k, c);
    ctx.drawImage(c, i * CS / res, j * CS / res, CS / res, CS / res);
  }
  while (GROUND_CHUNKS.size > 90) GROUND_CHUNKS.delete(GROUND_CHUNKS.keys().next().value); // 오래 안 본 조각부터 버린다
}

function worldDraw() {
  const ctx = World.ctx, c = World.canvas, m = World.map, p = World.player;
  const inside = typeof insideView === 'function' && insideView();
  if (inside !== !!World.insideRes) worldResize();
  if (inside) { ctx.setTransform(1, 0, 0, 1, 0, 0); drawInterior(ctx, c); return; }
  const res = World.res || 1;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = '#5d8a48';
  ctx.fillRect(0, 0, World.vw, World.vh);
  const [cx, cy] = World.overview ? World.cam : iso(p.x, p.y);
  ctx.save();
  const camX = Math.round((World.vw / 2 - cx) * res) / res, camY = Math.round((World.vh / 2 - cy + (World.overview ? 30 : 10)) * res) / res; // 멀리서 보기: 위쪽 막대만큼 아래로
  World.camOff = [camX, camY];
  ctx.translate(camX, camY);
  World.hits = [];

  // 통짜 바닥 그림(assets/sprites/map-ground.png)이 있으면 지도 마름모에 맞춰 한 번에 깔고, 길·안개만 칸으로 덧그린다
  // 바닥 (v0.81): 이어 붙이는 잔디·흙 무늬를 쿼터뷰 바닥에 비스듬히 깐다 (한 칸 = 무늬 128픽셀, 가까이 봐도 또렷)
  const gtex = World.overview && m === MAPS.solmoe && getSprite('ground-grass'), dtex = gtex && getSprite('ground-dirt');
  if (gtex) drawGroundChunks(ctx, m, gtex, dtex, camX, camY, res);
  for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) {
    const k = x + ',' + y;
    const built = World.overview && Game.state.pastor && Game.state.pastor.paths && Game.state.pastor.paths[k];
    const kind = World.lockedTiles.has(k) ? 'fog' : World.pathSet.has(k) || built ? 'path' : 'grass';
    if (gtex && kind !== 'fog') continue;
    drawTile(ctx, x, y, kind);
  }
  for (const pl of World.plots) drawPlot(ctx, pl, World.target && World.target.plot === pl);
  // 아직 안 산 본당 땅은 어둡게 덮고 가운데에 이름과 값을 띄운다
  const lotLabels = [];
  if (World.overview && m === MAPS.solmoe && Game.state.pastor) for (const l of LOTS) {
    if (lotOwnedAt(l.x, l.y)) continue;
    poly(ctx, [iso(l.x, l.y), iso(l.x + l.w, l.y), iso(l.x + l.w, l.y + l.h), iso(l.x, l.y + l.h)], 'rgba(46,38,24,.32)');
    const block = lotBlocker(l.id);
    lotLabels.push([l.x + l.w / 2, l.y + l.h / 2, `🏞️ ${l.name} · ${block && block.startsWith('성당') ? '🔒 ' + block : '💰' + lotCost(l) + ' · 눌러서 땅 사기'}`]);
  }
  for (const r of m.regions || []) {
    if (r.town) { drawFogLabel(ctx, r.x + r.w / 2 + 3 * (m.grid || 1), r.y + 0.6 * (m.grid || 1), '🏘️ 이웃 동네 (면 소재지) · 마을회관을 누르면 종교 현황'); continue; }
    if (!regionLocked(r.id)) continue;
    const v = VILLAGES[r.id];
    drawFogLabel(ctx, r.x + r.w / 2, r.y + r.h / 2, `🔒 ${v ? v.name : ''} · 이장님께 문의`);
  }
  // 지도 가장자리 테두리
  ctx.strokeStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath();
  ctx.moveTo(...iso(0, m.h)); ctx.lineTo(...iso(m.w, m.h)); ctx.lineTo(...iso(m.w, 0));
  ctx.stroke();

  // 상호작용 대상 문 앞 표시
  const t = World.target;
  if (t && t.building) {
    const [dx, dy] = t.building.doorPt;
    const pts = [iso(dx - 0.35, dy - 0.35), iso(dx + 0.35, dy - 0.35), iso(dx + 0.35, dy + 0.35), iso(dx - 0.35, dy + 0.35)];
    poly(ctx, pts, 'rgba(242,193,78,.45)');
  }

  const objs = [];
  for (const b of World.buildings) if (!World.placing || World.placing.move !== b.id) objs.push({ box: [b.x, b.y, b.x + b.w, b.y + b.d], draw: () => {
    if (World.overview && !b.decor) drawGroundShadow(ctx, b);
    drawBuildingAny(ctx, b);
    if (b.rooms && !b.scaffold && !World.overview) drawBadge(ctx, b, b.rooms.map(g => g ? (g.level ? UNITS[g.type].icon : '🔨') : '·').join(' '));
    else if (b.level && !b.scaffold && !World.overview) drawBadge(ctx, b, `Lv${b.level}`);
    if (b.working) drawProgress(ctx, b, jobProgress(b.job));
    // 올릴 수 있으면 ⬆ (누르면 바로 올릴지 묻는다)
    const upg = Game.state.phase === 'pastor' && !b.scaffold && b.menu !== 'house' && typeof upgradeFor === 'function' && upgradeFor(b.id);
    if (upg) {
      const k = Math.max(1, 2.4 / World.scale), slop = 6 / World.scale;
      const r = drawUpBadge(ctx, b, World.frameT, k, upg.waiting);
      World.hits.push({ x: r.x + camX - slop, y: r.y + camY - slop, w: r.w + slop * 2, h: r.h + slop * 2, id: b.id, up: true });
    }
    // 미사 시간이면 성당 위에 종 표시 (누르면 미사로)
    const mc = b.id === 'church' && World.overview && typeof massCall === 'function' && massCall();
    const st0 = stashBubble(b);
    if (mc) {
      // 봉헌 말풍선이 함께 있으면 종은 왼쪽으로 비켜 선다 (둘 다 누를 수 있게)
      const k = Math.max(1, 2.4 / World.scale), slop = 6 / World.scale;
      const r = drawMassBubble(ctx, b, mc, World.frameT, k, st0 ? -36 * k : 0);
      World.hits.push({ x: r.x + camX - slop, y: r.y + camY - slop, w: r.w + slop * 2, h: r.h + slop * 2, id: b.id, massGo: true });
    }
    const st = st0;
    if (st) {
      // 확대가 작아도 화면에서 손가락으로 누르기 좋은 크기로
      const k = Math.max(1, 2.4 / World.scale);
      const r = drawStashBubble(ctx, b, st, st.full, World.frameT, k);
      const slop = 6 / World.scale;
      World.hits.push({ x: r.x + camX - slop, y: r.y + camY - slop, w: r.w + slop * 2, h: r.h + slop * 2, id: b.id });
    }
  } });
  // 화면 밖 자연물·집은 그리지 않는다 (v0.89, 키 큰 나무·집은 위로 넉넉히)
  const offX = -camX - 40, offX2 = World.vw - camX + 40, offY = -camY - 40, offY2 = World.vh - camY + 200;
  if (World.overview && m.obstacles) for (const o of m.obstacles()) {
    if (o.type !== 'tree' && regionLocked(m.regionAt(o.x, o.y))) continue;
    const ox1 = iso(o.x, o.y + o.d)[0], ox2 = iso(o.x + o.w, o.y)[0], oy1 = iso(o.x, o.y)[1], oy2 = iso(o.x + o.w, o.y + o.d)[1];
    if (ox2 < offX || ox1 > offX2 || oy2 < offY || oy1 > offY2) continue;
    objs.push({ box: [o.x + 0.1, o.y + 0.1, o.x + o.w - 0.1, o.y + o.d - 0.1], draw: () => {
      drawObstacle(ctx, o, World.frameT);
      const j = jobFor(o.id);
      if (j) drawProgress(ctx, { x: o.x, y: o.y, w: o.w, d: o.d, h: o.type === 'house' ? 13 : 4, style: 'house' }, jobProgress(j));
    } });
  }
  // 일꾼: 공사 중인 곳마다 한 명이 망치질, 쉬는 일꾼은 사무실 앞에서 기다린다
  if (World.overview && Game.state.pastor) {
    const p = Game.state.pastor;
    let wi = 0; // 봉사자부터 직원 순서대로 일을 맡는다 (모습이 다르다)
    const looks = ['worker', ...crew().map(c => CREW_ROLES[c.role].look)];
    const nextLook = () => looks[wi++] || 'worker';
    p.jobs.forEach(j => {
      let fx, fy, fw, fd;
      const b = World.buildings.find(q => q.id === j.key);
      if (b) [fx, fy, fw, fd] = [b.x, b.y, b.w, b.d];
      else if (j.kind === 'clear' && m.obstacleList) { const o = m.obstacleList().find(q => q.id === j.key); if (o) [fx, fy, fw, fd] = [o.x, o.y, o.w, o.d]; }
      if (fx === undefined) return;
      for (let n = 0; n < (j.workers || 1); n++) {
        const wx = fx + fw + 0.35, wy = fy + fd * 0.55 - n * 0.8 + (n ? 0.4 : 0), look = nextLook();
        objs.push({ box: [wx - 0.2, wy - 0.2, wx + 0.2, wy + 0.2], draw: () => drawWorker(ctx, wx, wy, 'left', World.frameT + fx + n * 0.5, true, look) });
      }
    });
    const office = World.buildings.find(q => q.id === 'office');
    for (let i = 0; i < idleWorkers() && office; i++) {
      const wx = office.x + 0.4 + i * 0.7, wy = office.y + office.d + 0.75, look = nextLook();
      objs.push({ box: [wx - 0.2, wy - 0.2, wx + 0.2, wy + 0.2], draw: () => drawWorker(ctx, wx, wy + Math.sin(World.frameT * 2 + i) * 0.03, 'down', World.frameT, false, look) });
    }
    // 보좌 신부님: 사제관 앞
    const rec = World.buildings.find(q => q.id === 'rectory');
    if (rec) curates().forEach((c, i) => { const at = [rec.x + 0.4 + i * 0.8, rec.y + rec.d + 0.5]; objs.push({ box: [at[0] - 0.2, at[1] - 0.2, at[0] + 0.2, at[1] + 0.2], draw: () => { const [sx, sy] = iso(...at); drawCharacter(ctx, Math.round(sx), Math.round(sy), 'priest', 'down', 0, false); } }); });
    // 수녀님: 활동 범위의 단체가 있는 교리실을 20분마다 옮겨 다니신다. 맡은 단체가 없으면 성당 앞
    sisters().forEach((sis, si) => {
      const ch = World.buildings.find(q => q.id === 'church');
      const rooms = World.buildings.filter(q => q.rooms && !q.scaffold && q.rooms.some(g => g && (sis.scope || []).includes(g.type)));
      const cls = rooms.length ? rooms[Math.floor(Date.now() / 1200000 + si) % rooms.length] : null;
      const at = cls ? [cls.x + cls.w + 0.4 - si * 0.5, cls.y + cls.d + 0.4] : ch ? [ch.x + ch.w / 2 + 1.2 + si * 0.7, ch.y + ch.d + 0.6] : null;
      if (at) objs.push({ box: [at[0] - 0.2, at[1] - 0.2, at[0] + 0.2, at[1] + 0.2], draw: () => {
        const [sx0, sy0] = iso(...at), sx = Math.round(sx0), sy = Math.round(sy0);
        drawCharacter(ctx, sx, sy, 'sister', 'down', 0, false);
        // 이름표 (누르면 활동 범위)
        const k = Math.max(1, 2 / World.scale), label = `👩‍🦳 ${sis.name} 수녀님`;
        ctx.font = `bold ${Math.round(7 * k)}px sans-serif`; ctx.textAlign = 'center';
        const w = Math.ceil(ctx.measureText(label).width) + 8 * k, h = Math.round(11 * k), bx = Math.round(sx - w / 2), by = Math.round(sy - 26 - h);
        ctx.fillStyle = 'rgba(46,58,92,.92)'; ctx.fillRect(bx, by, w, h);
        ctx.fillStyle = '#fff'; ctx.fillText(label, sx, by + h - 3 * k);
        World.hits.push({ x: bx + World.camOff[0] - 3, y: by + World.camOff[1] - 3, w: w + 6, h: h + 30, id: 'sister', sister: true, sisterName: sis.name });
      } });
    });
  }
  if (World.overview && m === MAPS.solmoe && Game.state.pastor && Game.state.pastor.fence) {
    const lv = Game.state.pastor.fence;
    for (const e of fenceEdges()) objs.push({ box: e.ax === e.bx ? [e.ax - 0.02, e.ay, e.ax + 0.02, e.by] : [e.ax, e.ay - 0.02, e.bx, e.ay + 0.02], draw: () => drawFenceEdge(ctx, lv, e) });
  }
  { const TS = m.treeSize || 1, G = m.grid || 1;
    if (!(World.overview && m.obstacles)) m.trees.forEach(([x, y], i) => objs.push({ box: [x + 0.2 * TS, y + 0.2 * TS, x + 0.8 * TS, y + 0.8 * TS], draw: () => drawTree(ctx, x, y, i % 3 === 2 ? 1 : 0, TS) }));
    for (const [x, y] of m.statues || []) objs.push({ box: [x + 0.2 * G, y + 0.2 * G, x + 0.8 * G, y + 0.8 * G], draw: () => drawStatue(ctx, x, y, G) }); }
  const frame = Math.floor(World.frameT * 6);
  for (const n of World.npcs) if (npcVisible(n)) objs.push({ box: [n.x - 0.2, n.y - 0.2, n.x + 0.2, n.y + 0.2], draw: () => {
    const [sx, sy] = iso(n.x, n.y);
    drawCharacter(ctx, sx, sy, n.look, n.dir, frame, n.moving);
    const bubble = npcBubble(n);
    if (bubble) drawBubble(ctx, sx, sy, bubble);
  } });
  if (!World.overview) objs.push({ box: [p.x - 0.2, p.y - 0.2, p.x + 0.2, p.y + 0.2], draw: () => {
    const [sx, sy] = iso(p.x, p.y);
    drawCharacter(ctx, sx, sy, p.look, p.dir, frame, p.moving);
    // 내 캐릭터 표시: 머리 위 작은 화살표
    const bob = Math.round(Math.sin(World.frameT * 4));
    poly(ctx, [[sx - 3, sy - 27 + bob], [sx + 4, sy - 27 + bob], [sx + 0.5, sy - 23 + bob]], '#f2c14e', '#7a5a12');
  } });

  for (const o of depthSort(objs)) o.draw();
  for (const [lx, ly, text] of lotLabels) drawFogLabel(ctx, lx, ly, text);
  // 건물 이름·상태 표는 늘 띄우지 않고, 누른 건물만 잠깐(5초) 보여 준다
  const tag = World.tagFor;
  if (tag && typeof UI !== 'undefined' && UI.modalOpen) tag.until = Math.max(tag.until, performance.now() + 2500); // 메뉴를 보는 동안은 계속, 닫은 뒤 잠깐 더
  if (World.overview && tag && performance.now() < tag.until && World.buildings.includes(tag.b)) {
    const b = tag.b;
    ctx.globalAlpha = Math.min(1, (tag.until - performance.now()) / 400);
    drawNameTag(ctx, b, buildingShortName(b), Math.max(1, 2 / World.scale), roomsLine(b) || religionLine(b));
    ctx.globalAlpha = 1;
  }
  if (World.placing) drawPlacing(ctx, World.placing);
  if (World.pathMode && Game.state.pastor) for (const k of Object.keys(Game.state.pastor.paths || {})) {
    const [x, y] = k.split(',').map(Number);
    poly(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], 'rgba(242,193,78,.25)', '#c79a2b');
  }
  if (World.hint && !(World.obSel && World.hint.at)) drawHintArrow(ctx, World.hint);
  if (World.overview && World.obSel) drawObAction(ctx, camX, camY);
  drawClearFx(ctx);
  // 거둔 뒤 떠오르는 글자
  World.floaters = World.floaters.filter(f => f.t < 1.4);
  for (const f of World.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2b2420';
    ctx.fillText(f.text, f.x + 1, f.y - f.t * 18 + 1);
    ctx.fillStyle = '#f2c14e';
    ctx.fillText(f.text, f.x, f.y - f.t * 18);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// 건물 위 말풍선: 쌓인 봉헌·새 얼굴 (주임 신부 단계)
function stashBubble(b) {
  const s = Game.state;
  if (s.phase !== 'pastor' || b.scaffold) return null;
  const st = s.pastor.stash && s.pastor.stash[b.id];
  if (!st || (st.offering < 1 && st.members < 1)) return null;
  const item = stashList().find(x => x.id === b.id);
  return { offering: st.offering, members: st.members, full: item && item.full };
}

function worldFloat(id, text) {
  const b = (World.buildings || []).find(x => x.id === id);
  if (!b) return;
  const [x, y] = buildingTop(b);
  World.floaters.push({ x, y: y - 14, text, t: 0 });
}

// 머리 위 표시: 이벤트(!)나 다음 과정 안내(!)
function npcBubble(n) {
  if (n.bubble) return n.bubble;
  const s = Game.state;
  if (n.id === 'pastor' && s.phase === 'curate' && s.curate.ready) return '!';
  if (n.village && s.phase === 'pastor' && !villageOpen(n.village) && villageReady(n.village)) return '!';
  if (n.id === 'director' && s.phase === 'seminary') {
    const ch = SEMINARY_CHAPTERS[s.seminary.chapter];
    if (ch.ordination || chapterTasksDone()) return '!';
  }
  return null;
}

// 쿼터뷰 앞뒤 정렬: a가 b의 완전히 뒤(북쪽·서쪽)에 있으면 먼저 그린다
function depthSort(objs) {
  const behind = (a, b) => (a.box[2] <= b.box[0] + 0.001 && a.box[1] < b.box[3]) || (a.box[3] <= b.box[1] + 0.001 && a.box[0] < b.box[2]);
  const n = objs.length;
  const visited = new Array(n).fill(0);
  const out = [];
  const visit = i => {
    if (visited[i]) return;
    visited[i] = 1;
    for (let j = 0; j < n; j++) if (j !== i && behind(objs[j], objs[i])) visit(j);
    out.push(objs[i]);
  };
  const order = objs.map((o, i) => i).sort((a, b) => (objs[a].box[0] + objs[a].box[1]) - (objs[b].box[0] + objs[b].box[1]));
  for (const i of order) visit(i);
  return out;
}

// ---------- 루프와 입력 ----------

function worldLoop(ts) {
  const dt = Math.min(0.05, (ts - World.last) / 1000 || 0);
  World.last = ts;
  if (World.map && Game.state && document.body.classList.contains('in-world')) {
    if (!World.isPaused()) { World.frameT += dt; worldUpdate(dt); for (const f of World.floaters) f.t += dt; }
    worldDraw();
  }
  requestAnimationFrame(worldLoop);
}

function worldInit(onInteract) {
  World.canvas = document.getElementById('world');
  World.ctx = World.canvas.getContext('2d');
  worldResize();
  window.addEventListener('resize', worldResize);

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    World.keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') && !World.overview && !World.isPaused() && document.body.classList.contains('in-world')) {
      e.preventDefault();
      if (World.target) { faceEachOther(World.target); onInteract(World.target); }
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', e => { World.keys[e.code] = false; });
  window.addEventListener('blur', () => { World.keys = {}; });

  // 가상 조이스틱 (터치·마우스)
  const pad = document.getElementById('joystick');
  const knob = pad.querySelector('.knob');
  let active = null;
  const setJoy = (cx, cy) => {
    const r = pad.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const max = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = max * 0.18;
    World.joy = len < dead ? { x: 0, y: 0 } : { x: dx / max, y: dy / max };
  };
  const endJoy = () => { active = null; World.joy = { x: 0, y: 0 }; knob.style.transform = ''; };
  pad.addEventListener('pointerdown', e => {
    active = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch (err) { /* 일부 환경에서 실패해도 조작은 계속 */ }
    setJoy(e.clientX, e.clientY);
  });
  pad.addEventListener('pointermove', e => { if (active === e.pointerId) setJoy(e.clientX, e.clientY); });
  pad.addEventListener('pointerup', endJoy);
  pad.addEventListener('pointercancel', endJoy);

  // 화면 누르기: 멀리서 보기에서는 끌어서 둘러보고(두 손가락이면 확대), 짧게 누르면 연다
  const ptrs = new Map();
  let drag = null, pinch = null;
  World.canvas.addEventListener('pointerdown', e => {
    if (World.isPaused() || !document.body.classList.contains('in-world')) return;
    if (!World.overview) {
      // 캐릭터 모드: 말풍선만 누를 수 있다
      const hit = pickAt(e.clientX, e.clientY);
      if (hit && hit.bubble && World.onCollect) { e.preventDefault(); World.onCollect(hit.bubble); }
      return;
    }
    try { World.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) {
      drag = { x: e.clientX, y: e.clientY, cam: [...World.cam], pan: [...(World.inPan || [0, 0])], moved: 0 };
      // 건물을 꾹 누르고 있으면(0.55초) 옮기기 (v0.90, 예전엔 ↻ 돌리기 표시)
      if (!World.placing && !World.pathMode && !(typeof insideView === 'function' && insideView())) {
        const d0 = drag, cx = e.clientX, cy = e.clientY;
        d0.lp = setTimeout(() => {
          if (drag !== d0 || d0.moved > 6) return;
          const hit = pickAt(cx, cy);
          // v0.90: 꾹 누르면 건물을 들어 올려 옮기기 (그대로 끌면 따라온다)
          if (hit && hit.building && World.onLongPress && World.onLongPress(hit.building.id)) {
            const pl = World.placing, [tx, ty] = tileAt(cx, cy);
            d0.ghost = [tx - pl.x, ty - pl.y];
            d0.longPressed = true;
            if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) { /* 무시 */ }
          }
        }, 550);
      }
      // 짓는 중: 반투명 건물 위를 누르고 끌면 건물이 따라온다
      const pl = World.placing;
      const onRot = pl && (pickAt(e.clientX, e.clientY) || {}).rotPlace;
      if (onRot) drag.rotPlace = true;
      if (pl && !onRot) {
        const [tx, ty] = tileAt(e.clientX, e.clientY), [w, d] = sizeOf(pl.kind, pl.rot);
        if (tx >= pl.x - 0.5 && tx < pl.x + w + 0.5 && ty >= pl.y - 0.5 && ty < pl.y + d + 0.5) drag.ghost = [tx - pl.x, ty - pl.y];
      }
    }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; drag = null; }
  });
  World.canvas.addEventListener('pointermove', e => {
    if (!World.overview || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d / pinch.d > 1.35) { worldZoom(1, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch.d = d; }
      else if (d / pinch.d < 0.74) { worldZoom(-1, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch.d = d; }
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.ghost && World.placing) {
      const [tx, ty] = tileAt(e.clientX, e.clientY);
      const nx = Math.round(tx - drag.ghost[0]), ny = Math.round(ty - drag.ghost[1]);
      if ((nx !== World.placing.x || ny !== World.placing.y) && World.onPlaceMove) World.onPlaceMove(nx, ny);
      return;
    }
    if (drag.moved > 6 && typeof insideView === 'function' && insideView()) { World.inPan = [drag.pan[0] + dx / World.scale, drag.pan[1] + dy / World.scale]; return; }
    if (drag.moved > 6) { World.cam = [drag.cam[0] - dx / World.scale, drag.cam[1] - dy / World.scale]; clampCam(); }
  });
  const endPtr = e => {
    if (!World.overview || !ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (drag && drag.lp) clearTimeout(drag.lp);
    if (drag && drag.longPressed) { drag = null; return; }
    if (drag && drag.moved <= 6 && e.type === 'pointerup' && !World.isPaused()) {
      if (World.pathMode) {
        // 길 놓기: 누른 칸에 길을 놓거나 걷는다
        const [tx, ty] = tileAt(e.clientX, e.clientY);
        if (World.onPathTap) World.onPathTap(Math.floor(tx), Math.floor(ty));
      } else if (World.placing) {
        // 짓는 중: 누른 곳으로 건물을 옮긴다 (옆 ↻를 누르면 돌리기)
        if (drag.rotPlace) { if (typeof rotatePlacing === 'function') rotatePlacing(); }
        else if (!drag.ghost && World.onPlaceMove) {
          const [tx, ty] = tileAt(e.clientX, e.clientY), [w, d] = sizeOf(World.placing.kind, World.placing.rot);
          World.onPlaceMove(Math.round(tx - w / 2), Math.round(ty - d / 2));
        }
      } else {
        const hit = pickAt(e.clientX, e.clientY);
        World.tagFor = hit && hit.building && hit.building.menu ? { b: hit.building, until: performance.now() + 5000 } : null;
        if (World.onTap) World.onTap(hit);
      }
    }
    if (ptrs.size < 2) pinch = null;
    drag = null;
  };
  World.canvas.addEventListener('pointerup', endPtr);
  World.canvas.addEventListener('pointercancel', endPtr);
  World.canvas.addEventListener('wheel', e => {
    if (!World.overview || World.isPaused()) return;
    e.preventDefault();
    World.wheel = (World.wheel || 0) + e.deltaY;
    if (Math.abs(World.wheel) > 60) { worldZoom(World.wheel < 0 ? 1 : -1, e.clientX, e.clientY); World.wheel = 0; }
  }, { passive: false });

  document.getElementById('btn-act').addEventListener('click', () => {
    if (World.target && !World.isPaused()) { faceEachOther(World.target); onInteract(World.target); }
  });

  requestAnimationFrame(worldLoop);
}
