// 성전 내부 보기: 시골 본당을 벗어난 본당(도심·신도시)은 성당 건물 하나 안에 성전·제의실·집무실·카페·사무실·교리실이
// 들어 있다. 기본 화면은 성당 도면(INTERIOR_PLANS)을 쿼터뷰로 세워 코드로 그린 단면도: 뒤쪽 벽은 높게, 앞쪽은 낮게 잘라 안이 보인다.
// 1층과 위층은 같은 건물이라 벽 줄(4칸 간격)·복도·계단 자리가 겹친다. 위층에서 성전·로비 자리는 지붕만 보인다.
// 교리실은 층마다 방 6개로 정해져 있고, 방에 든 단체에 따라 가구가 바뀐다(아이들 방·음악실·기도방…). 모자라면 '증축'으로 2층·3층.
// '밖으로 나가기'를 누르면 바깥 전경(조경)으로. 방을 누르면 그 메뉴가 열리고, 💰/👥 말풍선과 ⬆ 표시도 그대로 쓴다.

function interiorParish() { const p = Game.state && Game.state.pastor; return !!(p && Game.state.phase === 'pastor' && (PARISHES[p.parishId] || {}).interior); }
function insideView() { return interiorParish() && World.view !== 'outside' && World.map === MAPS.solmoe; }

// ---------- 도면 ----------
// 칸 단위 평면도. x는 오른쪽 아래, y는 왼쪽 아래로 뻗는다(쿼터뷰). 뒤쪽 바깥벽은 y=0·x=0 쪽.
// 모든 실은 복도로 이어진다: 성전 옆을 세로로 지나는 큰 복도(x 10~12)에 가로 복도 두 줄(y 4~6, 11~13)이 붙고,
// 로비(현관)도 큰 복도와 이어진다. 동쪽 실들은 4칸 간격 벽(x 12·16·20·24)으로 위아래 층이 같다.
// rect: [x, y, 가로, 세로], doors: 문 자리 [변(n/s/w/e), 변 시작에서 몇 칸째, 폭], slot: 교리실 방 번호
const INTERIOR_PLANS = {
  ground: {
    rooms: [
      { id: 'sanctuary', kind: 'sanctuary', rect: [0, 0, 10, 13], doors: [['s', 4, 2], ['e', 1, 1], ['e', 6, 2]] },
      { id: 'spine', kind: 'hall', rect: [10, 0, 2, 18] },
      { id: 'sacristy', kind: 'sacristy', rect: [12, 0, 4, 4], doors: [['w', 1, 1], ['s', 2, 1]] },
      { id: 'rectory', kind: 'rectory', rect: [16, 0, 4, 4], doors: [['s', 1, 1]] },
      { id: 'cafe', kind: 'cafe', rect: [20, 0, 8, 4], doors: [['s', 3, 2]] },
      { id: 'hall1', kind: 'hall', rect: [12, 4, 16, 2] },
      { slot: 0, kind: 'class', rect: [12, 6, 4, 5], doors: [['n', 1, 1]] },
      { slot: 1, kind: 'class', rect: [16, 6, 4, 5], doors: [['n', 1, 1]] },
      { slot: 2, kind: 'class', rect: [20, 6, 4, 5], doors: [['n', 1, 1]] },
      { slot: 3, kind: 'class', rect: [24, 6, 4, 5], doors: [['n', 1, 1]] },
      { id: 'hall2', kind: 'hall', rect: [12, 11, 16, 2] },
      { id: 'restroom', kind: 'restroom', rect: [0, 13, 4, 5], doors: [['e', 2, 1]] },
      { id: 'lobby', kind: 'lobby', rect: [4, 13, 6, 5], doors: [['s', 2, 2], ['e', 1, 2]] },
      { id: 'office', kind: 'office', rect: [12, 13, 4, 5], doors: [['n', 1, 1], ['w', 2, 1]] },
      { slot: 4, kind: 'class', rect: [16, 13, 4, 5], doors: [['n', 1, 1]] },
      { slot: 5, kind: 'class', rect: [20, 13, 4, 5], doors: [['n', 1, 1]] },
      { id: 'stairs', kind: 'stairs', rect: [24, 13, 4, 5], doors: [['n', 1, 2]] },
    ],
  },
  upper: {
    roofs: [[0, 0, 10, 13, 0.6], [0, 13, 10, 5, 0]], // 성전은 높은 천장, 로비·화장실은 낮은 지붕
    rooms: [
      { id: 'spine', kind: 'hall', rect: [10, 0, 2, 18] },
      { slot: 0, kind: 'class', rect: [12, 0, 4, 4], doors: [['s', 1, 1], ['w', 1, 1]] },
      { slot: 1, kind: 'class', rect: [16, 0, 4, 4], doors: [['s', 1, 1]] },
      { id: 'library', kind: 'library', rect: [20, 0, 8, 4], doors: [['s', 3, 2]] },
      { id: 'hall1', kind: 'hall', rect: [12, 4, 16, 2] },
      { slot: 2, kind: 'class', rect: [12, 6, 4, 5], doors: [['n', 1, 1]] },
      { slot: 3, kind: 'class', rect: [16, 6, 4, 5], doors: [['n', 1, 1]] },
      { slot: 4, kind: 'class', rect: [20, 6, 4, 5], doors: [['n', 1, 1]] },
      { slot: 5, kind: 'class', rect: [24, 6, 4, 5], doors: [['n', 1, 1]] },
      { id: 'hall2', kind: 'hall', rect: [12, 11, 16, 2] },
      { id: 'auditorium', kind: 'auditorium', rect: [12, 13, 8, 5], doors: [['n', 3, 2], ['w', 2, 1]] },
      { id: 'restroom', kind: 'restroom', rect: [20, 13, 4, 5], doors: [['n', 1, 1]] },
      { id: 'stairs', kind: 'stairs', rect: [24, 13, 4, 5], doors: [['n', 1, 2]] },
    ],
  },
};
const PLAN_W = 28, PLAN_D = 18, WALL_OUT = 2.3, WALL_IN = 0.62, WALL_CUT = 0.38;
// 단체마다 어울리는 교리실 가구
const ROOM_ART_OF = {
  school: 'kids', school2: 'kids', parentsK: 'kids', parentsY: 'kids',
  choir: 'music', organ: 'music',
  legio: 'prayer', prayer: 'prayer', eucharist: 'prayer', altar: 'prayer',
  catechumen: 'adult', district: 'adult', mission: 'adult', newPilgrim: 'adult', lector: 'adult', mothers: 'adult', elders: 'adult', senior: 'adult', bible: 'adult',
};
// 사용자가 보낸 성당 그림의 느낌: 따뜻한 크림색 벽, 나무 테두리, 붉은 카펫, 스테인드글라스, 노란 불빛
const IC = {
  wall: '#f3dcae', trim: '#9a5a2a', trimTop: '#7a4220', base: '#a39684',
  tile: '#ecd0a0', tile2: '#e2c28e', wood: '#c88b52', wood2: '#bd7e46', concrete: '#bdb7ad', concrete2: '#b0a99e',
  carpet: '#b5303a', gold: '#d9a441', cloth: '#f7f1e3', pew: '#8e5a2c', red: '#a8323c', green: '#4c8a4e', leaf: '#5aa04f',
  glass: ['#4a7fc1', '#d0473c', '#e5b744', '#4f9a5a', '#7e5bb0'], roof: '#8b3b2b', roof2: '#7a3326',
};

function floorSites() { return containers().filter(([, x]) => x.floor).sort((a, b) => a[1].floor - b[1].floor); }
// 방 하나의 가구 종류
function roomArt(r, site) {
  if (r.kind !== 'class') return r.kind;
  if (!site || !site.built) return 'build';
  const g = site.rooms[r.slot];
  return g ? (ROOM_ART_OF[g.type] || 'desks') : 'empty';
}

// ---------- 쿼터뷰 그리기 도구 ----------
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function isoKit(ctx, ox, oy, tw) {
  const hw = tw / 2, hh = tw / 4, zh = tw * 0.62, lw = Math.max(1, tw / 40);
  const S = (x, y, z = 0) => [ox + (x - y) * hw, oy + (x + y) * hh - z * zh];
  const quad = (pts, fill, line) => { polyPath(ctx, pts); ctx.fillStyle = fill; ctx.fill(); if (line !== false) { ctx.strokeStyle = 'rgba(70,35,12,.45)'; ctx.lineWidth = lw; ctx.stroke(); } };
  const flat = (x, y, w, d, z, fill, line) => quad([S(x, y, z), S(x + w, y, z), S(x + w, y + d, z), S(x, y + d, z)], fill, line);
  const box = (x, y, w, d, z, h, c, top) => {
    quad([S(x, y + d, z), S(x + w, y + d, z), S(x + w, y + d, z + h), S(x, y + d, z + h)], shadeHex(c, -0.14));
    quad([S(x + w, y, z), S(x + w, y + d, z), S(x + w, y + d, z + h), S(x + w, y, z + h)], shadeHex(c, -0.28));
    flat(x, y, w, d, z + h, top || c);
  };
  // 벽 앞면에 붙는 네모 (side 'n': y가 고정된 벽, u는 x 방향 / side 'w': x가 고정된 벽, u는 y 방향)
  const face = (side, at, u0, u1, z0, z1, fill, line) => {
    const P = (uu, z) => (side === 'n' ? S(uu, at, z) : S(at, uu, z));
    quad([P(u0, z0), P(u1, z0), P(u1, z1), P(u0, z1)], fill, line);
  };
  const dot = (x, y, z, r, fill) => { const [sx, sy] = S(x, y, z); ctx.beginPath(); ctx.arc(sx, sy, r * tw, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  return { S, quad, flat, box, face, dot, tw };
}

// ---------- 화면 ----------
function drawInterior(ctx, c) {
  const p = Game.state.pastor, u = 1 / World.scale; // 화면 픽셀이 곱절인 기기(레티나)는 글자도 곱절로
  const floors = floorSites();
  if (!World.floor || World.floor > Math.max(1, floors.length)) World.floor = 1;
  ctx.imageSmoothingEnabled = true;
  World.hits = []; World.camOff = [0, 0];
  const top = 70 * u, bottom = 104 * u, pad = 8 * u, th = 24 * u;
  // 도면 자리 (가운데 맞춤). 그 아래에 층 이름 줄과 층 고르기 줄
  const aw = c.width - pad * 2, ah = c.height - top - bottom - th * 2 - 16 * u;
  const tw0 = Math.min(aw / ((PLAN_W + PLAN_D) / 2), ah / ((PLAN_W + PLAN_D) / 4 + WALL_OUT * 0.62));
  const W0 = (PLAN_W + PLAN_D) / 2 * tw0, H0 = ((PLAN_W + PLAN_D) / 4 + WALL_OUT * 0.62) * tw0;
  const bx = (c.width - W0) / 2, by = top + (ah - H0) / 2;
  // 확대(＋/－·휠·두 손가락)와 끌어서 옮기기: 도면만 커지고 아래 줄들은 그대로
  const z = World.inZoom || 1, tw = tw0 * z, W = W0 * z, H = H0 * z;
  World.inCenter = [c.width / 2, top + ah / 2];
  const pan = World.inPan = z === 1 ? [0, 0] : [clamp((World.inPan || [0, 0])[0], -W / 2, W / 2), clamp((World.inPan || [0, 0])[1], -H / 2, H / 2)];
  const zx = World.inCenter[0] - W / 2 + pan[0], zy = World.inCenter[1] - H / 2 + pan[1];
  const ox = zx + PLAN_D * tw / 2, oy = zy + WALL_OUT * 0.62 * tw;
  const cur = floors.find(([, s]) => s.floor === World.floor);
  const site = cur && cur[1], plan = World.floor === 1 ? INTERIOR_PLANS.ground : INTERIOR_PLANS.upper;
  // 도면 그림은 바뀔 때만 새로 그려 둔다
  const m = tw, sig = [Math.round(tw * 100), World.floor, site && site.built, plan.rooms.map(r => roomArt(r, site)).join(',')].join('|');
  if (!World.interiorCache || World.interiorCache.sig !== sig) {
    const off = (World.interiorCache && World.interiorCache.cv) || document.createElement('canvas');
    off.width = Math.ceil(W + m * 2); off.height = Math.ceil(H + m * 2);
    const o = off.getContext('2d');
    o.clearRect(0, 0, off.width, off.height);
    drawPlan(o, plan, site, isoKit(o, m + PLAN_D * tw / 2, m + WALL_OUT * 0.62 * tw, tw));
    World.interiorCache = { sig, cv: off };
  }
  ctx.fillStyle = '#3a3029'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(World.interiorCache.cv, zx - m, zy - m);
  // 방 누르기·이름표
  const K = isoKit(ctx, ox, oy, tw);
  for (const r of plan.rooms) {
    const [x, y, w, d] = r.rect, pts = [K.S(x, y), K.S(x + w, y), K.S(x + w, y + d), K.S(x, y + d)];
    const at = K.S(x + w / 2, y + d / 2, 0.15);
    if (r.kind === 'class') {
      if (!site) continue;
      const x0 = { g: site.built ? site.rooms[r.slot] : null, room: r.slot };
      pushPoly(pts, classRoom(cur[0], site, x0));
      drawTag(ctx, at, classLabel(site, x0), u, !x0.g);
      continue;
    }
    const fixed = {
      sanctuary: [`⛪ 성전 · Lv${p.fixed.church}`, 'church'], sacristy: ['제의실'], rectory: [`집무실·사제관 Lv${p.fixed.rectory}`, 'rectory'],
      cafe: [allGroups().some(q => q.g.type === 'cafe') ? '☕ 성당 카페' : '카페 (아직 문 닫음)'], restroom: ['화장실'], lobby: ['로비'],
      office: [`본당 사무실 Lv${p.fixed.office}`, 'office'], library: ['성경 도서실'], auditorium: ['강당'],
      stairs: [World.floor === 1 ? '계단' : `계단 · ${World.floor - 1}층으로`],
    }[r.kind];
    if (!fixed) continue;
    pushPoly(pts, { kind: r.kind });
    drawTag(ctx, at, fixed[0], u, false);
    if (fixed[1]) drawStashUp(ctx, { id: fixed[1] }, at[0], at[1] - 17 * u, u, 'center');
  }
  // 층 고르기 줄 (도면 아래 왼쪽): [1층] [2층] [3층] [＋ 증축]
  const tabs = floors.map(([key, s]) => ({ label: `${s.floor}층${s.built ? '' : ' 🏗️'}`, floor: s.floor, key }));
  if (floors.length < FLOOR_MAX && !floors.some(([, s]) => !s.built)) tabs.push({ label: `＋ ${floors.length + 1}층 증축`, add: true });
  if (!floors.length) tabs.unshift({ label: '1층', floor: 1 });
  ctx.font = `bold ${11 * u}px sans-serif`; ctx.textBaseline = 'middle';
  let tx = bx;
  const ty = by + H0 + th + 14 * u;
  for (const t of tabs) {
    const tw2 = ctx.measureText(t.label).width + 16 * u, on = t.floor === World.floor;
    ctx.fillStyle = t.add ? '#3cbf68' : on ? '#fffdf6' : 'rgba(255,253,246,.35)';
    roundRect(ctx, tx, ty, tw2, th, 6 * u); ctx.fill();
    ctx.fillStyle = t.add ? '#fff' : '#2b2420'; ctx.textAlign = 'center'; ctx.fillText(t.label, tx + tw2 / 2, ty + th / 2 + u);
    World.hits.push({ x: tx, y: ty, w: tw2, h: th, interior: t.add ? { kind: 'addFloor' } : { kind: 'floorTab', floor: t.floor } });
    tx += tw2 + 6 * u;
  }
  // 지금 층 교리실: 이름(누르면 교리실 창) · 거둘 것 · ⬆
  if (cur) {
    const [key, s] = cur, lab = `🏢 ${s.floor}층 교리실 Lv${s.level || 1} · 빈 방 ${s.built ? s.rooms.filter(r => !r).length : '-'}`;
    const lw = ctx.measureText(lab).width + 14 * u, lx = bx, ly = ty - th - 6 * u;
    ctx.fillStyle = 'rgba(30,24,20,.8)'; roundRect(ctx, lx, ly, lw, th, 6 * u); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(lab, lx + lw / 2, ly + th / 2 + u);
    World.hits.push({ x: lx, y: ly, w: lw, h: th, interior: { kind: 'floorMenu', key } });
    drawStashUp(ctx, { id: key }, lx + lw + 4 * u, ly + th / 2, u, 'right');
  }
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = false;
}

// 도면 한 층을 그린다: 바닥 → (벽·장식·가구를 앞뒤 순서대로) → 불빛
function drawPlan(ctx, plan, site, K) {
  const items = [], lamps = [];
  const add = (key, f) => items.push({ key, f });
  const box = (x, y, w, d, z, h, col, topc) => add(x + w / 2 + y + d / 2 + z * 0.01, () => K.box(x, y, w, d, z, h, col, topc));
  // 지붕 (위층에서 성전·로비 자리)
  for (const [x, y, w, d, z] of plan.roofs || []) {
    K.box(x, y, w, d, -0.25, 0.25 + z, IC.base);
    for (let i = 0; i < w; i++) K.flat(x + i, y, 1, d, z, i % 2 ? IC.roof : IC.roof2);
  }
  // 건물 바닥판(테두리 돌)과 방 바닥
  for (const r of plan.rooms) { const [x, y, w, d] = r.rect; K.box(x, y, w, d, -0.25, 0.25, IC.base); }
  for (const r of plan.rooms) drawFloor(K, r, roomArt(r, site));
  // 벽: 한 칸에 한 토막. 북·서쪽이 바깥이면 높은 벽, 복도와 실 사이는 복도가 보이게 낮은 벽(문틀이 보임), 방 앞쪽은 더 낮게 잘린 벽
  const seg = {};
  const own = (x, y) => plan.rooms.find(r => x >= r.rect[0] && x < r.rect[0] + r.rect[2] && y >= r.rect[1] && y < r.rect[1] + r.rect[3]);
  const mark = (k, door) => { if (door) seg[k] = 'door'; else if (!seg[k]) seg[k] = 'wall'; };
  for (const r of plan.rooms) {
    const [x0, y0, w, d] = r.rect, doors = r.doors || [];
    const isDoor = (side, i) => doors.some(([s, o, n]) => s === side && i >= o && i < o + n);
    for (let i = 0; i < w; i++) { mark(`h${x0 + i},${y0}`, isDoor('n', i)); mark(`h${x0 + i},${y0 + d}`, isDoor('s', i)); }
    for (let i = 0; i < d; i++) { mark(`v${x0},${y0 + i}`, isDoor('w', i)); mark(`v${x0 + w},${y0 + i}`, isDoor('e', i)); }
  }
  const tall = [];
  for (const [k, v] of Object.entries(seg)) {
    const hz = k[0] === 'h', [a, b] = k.slice(1).split(',').map(Number);
    const back = hz ? own(a, b - 1) : own(a - 1, b), front = own(a, b); // back: 북·서쪽 방, front: 남·동쪽 방
    const h = !back ? (front ? WALL_OUT : WALL_CUT) : back.kind === 'hall' && front ? WALL_IN : WALL_CUT;
    const side = hz ? 'n' : 'w', key = hz ? a + 0.5 + b : a + b + 0.5, t = 0.16;
    if (back && front && back.kind === 'hall' && front.kind === 'hall') continue; // 복도끼리는 트여 있다
    if (v === 'door') {
      if (front && !back && h < 1) continue; // 앞쪽 정문 자리는 비워 둔다
      add(key + 0.03, () => {
        if (hz) K.flat(a, b - 0.08, 1, 0.16, 0, IC.wood2, false); else K.flat(a - 0.08, b, 0.16, 1, 0, IC.wood2, false);
        if (h > 1) { // 높은 벽의 문: 양쪽 문틀과 위 인방
          const lz = Math.min(1.05, h - 0.2);
          if (hz) { K.box(a, b - t / 2, 0.1, t, 0, h, IC.trim); K.box(a + 0.9, b - t / 2, 0.1, t, 0, h, IC.trim); K.box(a, b - t / 2, 1, t, lz, h - lz, IC.wall, IC.trimTop); }
          else { K.box(a - t / 2, b, t, 0.1, 0, h, IC.trim); K.box(a - t / 2, b + 0.9, t, 0.1, 0, h, IC.trim); K.box(a - t / 2, b, t, 1, lz, h - lz, IC.wall, IC.trimTop); }
        } else { // 낮은 벽의 문: 문설주 두 개
          if (hz) { K.box(a, b - t / 2, 0.1, t, 0, h + 0.15, IC.trim); K.box(a + 0.9, b - t / 2, 0.1, t, 0, h + 0.15, IC.trim); }
          else { K.box(a - t / 2, b, t, 0.1, 0, h + 0.15, IC.trim); K.box(a - t / 2, b + 0.9, t, 0.1, 0, h + 0.15, IC.trim); }
        }
      });
      continue;
    }
    add(key + 0.03, () => {
      if (hz) K.box(a, b - t / 2, 1, t, 0, h, IC.wall, IC.trimTop); else K.box(a - t / 2, b, t, 1, 0, h, IC.wall, IC.trimTop);
      if (h > 1) { // 벽 아래 나무판과 기둥
        const at = hz ? b + t / 2 : a + t / 2, u0 = hz ? a : b;
        K.face(side, at, u0, u0 + 1, 0, 0.32, IC.trim, false);
        K.face(side, at, u0 + 0.92, u0 + 1, 0, h, IC.trim, false);
      }
    });
    if (h > 1 && front) tall.push({ side, key, at: hz ? b + t / 2 : a + t / 2, u: hz ? a : b, h, room: front, outer: !back });
  }
  // 높은 벽 장식: 방마다 가운데 칸에 정해진 것(십자가·칠판…), 나머지 칸은 창문·벽등을 번갈아
  for (const s of tall) add(s.key + 0.04, () => drawWallDecor(K, s, roomArt(s.room, site), lamps));
  for (const r of plan.rooms) drawFurniture(K, r, roomArt(r, site), box, add, lamps);
  items.sort((a, b) => a.key - b.key).forEach(it => it.f());
  // 따뜻한 불빛
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy, rad] of lamps) {
    const R = rad * K.tw, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    g.addColorStop(0, 'rgba(255,200,110,.3)'); g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
  }
  ctx.restore();
}

function drawFloor(K, r, art) {
  const [x0, y0, w, d] = r.rect;
  const stone = ['hall', 'lobby', 'restroom', 'sacristy', 'stairs'].includes(art), bare = art === 'empty' || art === 'build';
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    const odd = (i + j) % 2;
    K.flat(x0 + i, y0 + j, 1, 1, 0, bare ? (odd ? IC.concrete : IC.concrete2) : stone ? (odd ? IC.tile : IC.tile2) : (i % 2 ? IC.wood : IC.wood2), false);
  }
  const rug = (x, y, ww, dd, col) => { K.flat(x, y, ww, dd, 0.01, IC.gold, false); K.flat(x + 0.08, y + 0.08, ww - 0.16, dd - 0.16, 0.012, col, false); };
  if (art === 'hall') (w > d ? rug(x0, y0 + 0.55, w, 0.9, IC.carpet) : rug(x0 + 0.55, y0, 0.9, d, IC.carpet));
  if (art === 'sanctuary') rug(x0 + 4.25, y0 + 2.6, 1.5, d - 2.6, IC.carpet);
  if (art === 'lobby') rug(x0 + 1.5, y0 + 1.5, 3, 2.4, IC.carpet);
  if (art === 'kids') { const cs = ['#e25b5b', '#f2c94c', '#6fcf97', '#56a0e0']; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) K.flat(x0 + 0.6 + i * (w - 1.2) / 3, y0 + 1.2 + j * (d - 2) / 3, (w - 1.2) / 3, (d - 2) / 3, 0.01, cs[(i + j * 2) % 4], false); }
  if (art === 'music' || art === 'prayer') rug(x0 + 0.6, y0 + 1.3, w - 1.2, d - 2, IC.red);
  if (art === 'cafe' || art === 'library') rug(x0 + 3.2, y0 + 1.6, 3.2, 1.8, '#c46a3a');
  if (art === 'auditorium') rug(x0 + 3.4, y0 + 1.8, 1.2, d - 2, IC.carpet);
}

function drawWallDecor(K, s, art, lamps) {
  const u0 = s.u, z = s.h, F = (a0, a1, z0, z1, col, line) => K.face(s.side, s.at + 0.005, u0 + a0, u0 + a1, z0, z1, col, line);
  const [x0, y0, w, d] = s.room.rect, idx = Math.round(s.side === 'n' ? u0 - x0 : u0 - y0), len = s.side === 'n' ? w : d;
  const mid = Math.floor((len - 1) / 2), P = zz => (s.side === 'n' ? [u0 + 0.5, s.at, zz] : [s.at, u0 + 0.5, zz]);
  const lamp = () => { F(0.44, 0.56, z * 0.6, z * 0.72, IC.gold); lamps.push([...K.S(...P(z * 0.76)), 1.1]); K.dot(...P(z * 0.76), 0.05, '#ffe9a8'); };
  const win = () => {
    F(0.22, 0.78, z * 0.38, z * 0.9, IC.trim);
    for (let i = 0; i < 3; i++) F(0.27 + i * 0.155, 0.27 + (i + 1) * 0.155 - 0.02, z * 0.42, z * 0.86, IC.glass[(idx + i + Math.round(s.at)) % IC.glass.length], false);
    F(0.27, 0.73, z * 0.62, z * 0.66, IC.gold, false);
  };
  const cross = big => { const k = big ? 1.5 : 1, zc = z * 0.64; F(0.46, 0.54, zc - 0.28 * k, zc + 0.22 * k, '#6b3a1c'); F(0.36, 0.64, zc + 0.02 * k, zc + 0.1 * k, '#6b3a1c'); if (big) F(0.47, 0.53, zc - 0.2, zc + 0.08, '#e8c9a0', false); };
  const board = col => { F(0.08, 0.92, z * 0.42, z * 0.82, IC.trim); F(0.13, 0.87, z * 0.46, z * 0.78, col, false); };
  const frame = col => { F(0.3, 0.7, z * 0.45, z * 0.8, IC.gold); F(0.34, 0.66, z * 0.49, z * 0.76, col, false); };
  const center = {
    sanctuary: () => (s.side === 'n' ? cross(true) : win()), desks: () => board('#2f5d46'), kids: () => board('#2f5d46'),
    adult: () => (s.side === 'n' ? cross() : frame('#5872a8')), prayer: () => cross(), music: () => frame('#d9c38a'), cafe: () => board('#2b2b2b'),
    rectory: () => cross(), office: () => frame('#f2f0e6'), lobby: () => frame('#f2f0e6'), hall: () => frame('#5872a8'), sacristy: () => cross(),
    stairs: () => win(), library: () => cross(), auditorium: () => cross(true),
  }[art] || (() => {});
  const bare = art === 'empty' || art === 'build' || art === 'restroom';
  if (idx === mid && art !== 'hall') return center();
  if (s.outer) return idx % 2 ? lamp() : bare ? null : win();
  if (!bare && idx % 2 === 0) lamp();
}

// 방 안 가구. box(x, y, 가로, 세로, 높이 시작, 높이, 색, 윗면 색)는 앞뒤 순서대로 그려진다
function drawFurniture(K, r, art, box, add, lamps) {
  const [x0, y0, w, d] = r.rect;
  const plant = (x, y) => { box(x - 0.15, y - 0.15, 0.3, 0.3, 0, 0.22, '#9a5a2a'); add(x + y + 0.05, () => { K.dot(x, y, 0.42, 0.16, IC.leaf); K.dot(x - 0.06, y + 0.04, 0.5, 0.11, '#6fbf5e'); K.dot(x + 0.05, y - 0.03, 0.55, 0.05, '#fff7d6'); }); };
  const chair = (x, y, col) => { box(x, y, 0.32, 0.32, 0.18, 0.06, col || IC.red); box(x, y, 0.32, 0.06, 0.24, 0.32, IC.pew); };
  const table = (x, y, ww, dd, col) => { for (const [a, b] of [[0, 0], [ww - 0.08, 0], [0, dd - 0.08], [ww - 0.08, dd - 0.08]]) box(x + a, y + b, 0.08, 0.08, 0, 0.42, '#5a3a1a'); box(x, y, ww, dd, 0.42, 0.07, col || '#a8692f'); };
  const candle = (x, y, z) => { box(x, y, 0.06, 0.06, z, 0.18, IC.cloth); add(x + y + 0.2, () => K.dot(x + 0.03, y + 0.03, z + 0.24, 0.025, '#ffd36b')); lamps.push([...K.S(x, y, z + 0.25), 0.5]); };
  const books = ['#4a7fc1', '#c0443a', '#4f9a5a'];
  const shelf = (x, y, ww) => { box(x, y, ww, 0.35, 0, 1.1, '#7a4a22'); add(x + ww / 2 + y + 0.3, () => { for (let i = 0; i < 3; i++) K.face('n', y + 0.36, x + 0.1, x + ww - 0.1, 0.2 + i * 0.32, 0.36 + i * 0.32, books[i], false); }); };
  const statue = (x, y) => { box(x, y, 0.45, 0.45, 0, 0.3, '#d8d0c4'); box(x + 0.08, y + 0.08, 0.3, 0.3, 0.3, 0.55, '#f4f0ea', '#5c86c6'); };
  if (art === 'sanctuary') {
    box(x0 + 0.4, y0 + 0.3, w - 0.8, 2.2, 0, 0.18, '#d8c3a0', '#e8d6b6'); // 제단
    box(x0 + 3.6, y0 + 1.0, 2.8, 0.9, 0.18, 0.52, IC.cloth, '#fffaf0'); box(x0 + 3.6, y0 + 1.75, 2.8, 0.15, 0.18, 0.4, IC.gold); // 제대
    box(x0 + 4.75, y0 + 0.35, 0.5, 0.4, 0.18, 0.55, IC.gold); // 감실
    add(x0 + y0 + 5.9, () => K.dot(x0 + 5.6, y0 + 0.5, 1.05, 0.035, '#e0403a'));
    candle(x0 + 3.8, y0 + 1.25, 0.7); candle(x0 + 6.1, y0 + 1.25, 0.7);
    box(x0 + 7.3, y0 + 1.4, 0.6, 0.5, 0.18, 0.75, '#8a5a2c'); // 독서대
    chair(x0 + 1.4, y0 + 0.8, IC.red); chair(x0 + 2.0, y0 + 0.8, IC.red); // 주례석
    statue(x0 + 8.6, y0 + 0.45);
    plant(x0 + 0.9, y0 + 2.2); plant(x0 + 9.0, y0 + 2.2);
    for (let row = 0; row < 8; row++) {
      const y = y0 + 3.4 + row * 1.15;
      for (const a of [0.7, 5.95]) { box(x0 + a, y, 3.3, 0.42, 0.12, 0.2, IC.pew, '#a86b36'); box(x0 + a, y + 0.38, 3.3, 0.1, 0.12, 0.62, IC.pew); }
    }
  } else if (art === 'sacristy') {
    box(x0 + 0.2, y0 + 0.2, 3.0, 0.55, 0, 1.25, '#7a4a22');
    add(x0 + y0 + 1.9, () => { for (let i = 0; i < 5; i++) K.face('n', y0 + 0.76, x0 + 0.35 + i * 0.56, x0 + 0.72 + i * 0.56, 0.3, 1.1, ['#f4f0e6', '#4c8a4e', '#a8323c', '#7e5bb0', '#f4f0e6'][i], false); });
    table(x0 + 0.8, y0 + 1.8, 1.8, 0.8); box(x0 + 1.1, y0 + 2.0, 0.5, 0.35, 0.49, 0.06, IC.cloth);
  } else if (art === 'rectory') {
    box(x0 + w - 1.8, y0 + 0.3, 1.5, 2.2, 0, 0.32, '#7a4a22'); box(x0 + w - 1.75, y0 + 0.85, 1.4, 1.6, 0.32, 0.12, IC.green); box(x0 + w - 1.7, y0 + 0.35, 1.3, 0.45, 0.32, 0.14, IC.cloth);
    table(x0 + 0.4, y0 + 1.3, 1.3, 0.7); box(x0 + 0.55, y0 + 1.4, 0.3, 0.25, 0.49, 0.06, IC.cloth);
    add(x0 + y0 + 2.3, () => K.dot(x0 + 1.45, y0 + 1.5, 0.75, 0.08, '#56b06a')); lamps.push([...K.S(x0 + 1.45, y0 + 1.5, 0.8), 0.6]);
    chair(x0 + 0.9, y0 + 2.2); shelf(x0 + 0.2, y0 + 0.15, 1.5);
  } else if (art === 'cafe') {
    box(x0 + 0.3, y0 + 0.3, 3.0, 0.75, 0, 0.62, '#8a5a2c', '#c08a52'); box(x0 + 0.6, y0 + 0.4, 0.45, 0.4, 0.62, 0.38, '#5a5a5e'); box(x0 + 2.2, y0 + 0.45, 0.6, 0.4, 0.62, 0.22, '#f1e6d0', '#f0a050');
    for (const [a, b] of [[4.2, 1.5], [6.2, 1.3], [5.3, 2.7]]) { table(x0 + a, y0 + b, 0.7, 0.7, '#b07a40'); chair(x0 + a - 0.38, y0 + b + 0.2, '#9a5a2a'); chair(x0 + a + 0.76, y0 + b + 0.2, '#9a5a2a'); }
    plant(x0 + 7.5, y0 + 0.6); plant(x0 + 3.7, y0 + 0.6);
  } else if (art === 'library') {
    shelf(x0 + 0.3, y0 + 0.15, 2.4); shelf(x0 + 3.0, y0 + 0.15, 2.0); shelf(x0 + 5.3, y0 + 0.15, 2.4);
    table(x0 + 2.4, y0 + 1.7, 3.2, 1.0, '#9a5a2a');
    for (let i = 0; i < 4; i++) { chair(x0 + 2.6 + i * 0.8, y0 + 1.25, IC.green); chair(x0 + 2.6 + i * 0.8, y0 + 2.85, IC.green); }
    plant(x0 + 0.6, y0 + 3.4); plant(x0 + 7.4, y0 + 3.4);
  } else if (art === 'auditorium') {
    box(x0 + 0.5, y0 + 0.3, w - 1, 1.2, 0, 0.3, '#8a5a2c', '#b98a52'); box(x0 + 3.6, y0 + 0.5, 0.8, 0.5, 0.3, 0.6, '#7a4a22'); // 무대·강대
    for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) if (j !== 3) chair(x0 + 0.7 + j * 0.95, y0 + 2.0 + i * 0.9, IC.red);
  } else if (art === 'office') {
    table(x0 + 0.6, y0 + 1.0, 1.6, 0.8); box(x0 + 1.1, y0 + 1.15, 0.5, 0.12, 0.49, 0.38, '#3d4a5c', '#2d3440'); chair(x0 + 1.2, y0 + 2.05);
    box(x0 + 2.8, y0 + 0.2, 0.9, 0.5, 0, 1.0, '#8a8f98'); shelf(x0 + 0.2, y0 + 0.15, 0.8);
    box(x0 + 0.6, y0 + 3.4, 2.4, 0.7, 0, 0.3, '#7a4a22', '#b9a27a'); plant(x0 + 3.5, y0 + 4.4);
  } else if (art === 'lobby') {
    box(x0 + 0.5, y0 + 0.3, 0.6, 0.6, 0, 0.55, '#cfc6b8', '#9fc8e6'); // 성수대
    statue(x0 + 2.75, y0 + 0.3); candle(x0 + 2.5, y0 + 0.85, 0); candle(x0 + 3.45, y0 + 0.85, 0);
    box(x0 + 4.4, y0 + 0.3, 1.2, 0.35, 0, 0.4, IC.pew); plant(x0 + 5.6, y0 + 4.5); plant(x0 + 0.4, y0 + 4.5);
  } else if (art === 'restroom') {
    for (let i = 0; i < 3; i++) box(x0 + 0.3 + i * 1.1, y0 + 0.25, 0.9, 0.5, 0, 0.5, '#e6e6e6', '#cfe3ef');
    for (let i = 0; i < 3; i++) box(x0 + 0.3, y0 + 1.6 + i * 1.1, 0.08, 1.0, 0, 1.0, '#bfb7ab');
    plant(x0 + w - 0.5, y0 + d - 0.5);
  } else if (art === 'stairs') {
    const n = 7, step = (d - 1.6) / n;
    for (let i = 0; i < n; i++) box(x0 + 0.6, y0 + d - 0.6 - (i + 1) * step, w - 1.2, step, 0, 0.14 * (i + 1), '#c9a27a', IC.carpet);
    box(x0 + 0.45, y0 + 1, 0.12, d - 1.6, 0, 1.15, IC.trim); box(x0 + w - 0.57, y0 + 1, 0.12, d - 1.6, 0, 1.15, IC.trim);
  } else if (art === 'desks') {
    box(x0 + 0.9, y0 + 0.35, w - 1.8, 0.1, 0.35, 0.75, '#2f5d46', IC.trim); box(x0 + 1.0, y0 + 0.35, 0.06, 0.06, 0, 0.35, IC.trim); box(x0 + w - 1.06, y0 + 0.35, 0.06, 0.06, 0, 0.35, IC.trim); // 세우는 칠판
    const cols = Math.max(2, Math.floor((w - 1) / 1.2)), rows = Math.max(2, Math.floor((d - 1.8) / 1.1));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const x = x0 + 0.7 + i * (w - 1.2) / cols, y = y0 + 1.3 + j * (d - 1.9) / rows; table(x, y, 0.75, 0.45, '#c08a52'); chair(x + 0.2, y + 0.55, '#5a7a9a'); }
  } else if (art === 'adult') {
    const tl = w - 1.6, td = Math.min(1.1, d - 2.6);
    table(x0 + 0.8, y0 + 1.5, tl, td, '#9a5a2a');
    for (let i = 0; i < Math.floor(tl / 0.7); i++) { chair(x0 + 0.95 + i * 0.7, y0 + 1.05, IC.red); chair(x0 + 0.95 + i * 0.7, y0 + 1.65 + td, IC.red); add(x0 + y0 + 3, () => K.flat(x0 + 1.0 + i * 0.7, y0 + 1.65, 0.35, 0.25, 0.5, '#fbf6ea')); }
    plant(x0 + 0.5, y0 + 0.6); box(x0 + w - 1.1, y0 + 0.3, 0.7, 0.35, 0, 0.9, '#7a4a22'); // 책장
  } else if (art === 'kids') {
    const cx = x0 + w / 2, cy = y0 + d / 2 + 0.2;
    box(x0 + 1.9, y0 + 0.35, w - 2.8, 0.1, 0.3, 0.6, '#2f5d46', '#e8b24a');
    table(cx - 0.55, cy - 0.55, 1.1, 1.1, '#e8b24a');
    const cs = ['#e25b5b', '#56a0e0', '#6fcf97', '#f2c94c', '#b07ad8', '#f29a4a'];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; chair(cx - 0.16 + Math.cos(a) * 0.9, cy - 0.16 + Math.sin(a) * 0.9, cs[i]); }
    box(x0 + 0.3, y0 + 0.25, 1.4, 0.4, 0, 0.55, '#c0443a', '#e8c070'); box(x0 + w - 1.0, y0 + 0.3, 0.6, 0.5, 0, 0.4, '#56a0e0');
  } else if (art === 'music') {
    box(x0 + 0.3, y0 + 0.3, 1.6, 0.6, 0, 0.85, '#6b3a1c', '#8a4f28'); box(x0 + 0.35, y0 + 0.85, 1.5, 0.2, 0.55, 0.06, '#f4f0e6'); box(x0 + 0.8, y0 + 1.2, 0.6, 0.3, 0, 0.35, IC.red);
    const rows = d >= 5 ? 2 : 1;
    for (let i = 0; i < rows; i++) for (let j = 0; j < Math.floor((w - 1.2) / 0.9); j++) { const x = x0 + 0.8 + j * 0.9, y = y0 + 2.1 + i * 1.2; chair(x, y, IC.red); box(x + 0.1, y - 0.35, 0.05, 0.05, 0, 0.7, '#333'); box(x - 0.02, y - 0.38, 0.32, 0.06, 0.7, 0.24, '#2b2b2b', '#f4f0e6'); }
  } else if (art === 'prayer') {
    box(x0 + w / 2 - 0.8, y0 + 0.4, 1.6, 0.6, 0, 0.55, IC.cloth, '#fffaf0'); candle(x0 + w / 2 - 0.6, y0 + 0.55, 0.55); candle(x0 + w / 2 + 0.5, y0 + 0.55, 0.55);
    statue(x0 + 0.35, y0 + 0.35);
    const rows = d >= 5 ? 2 : 1;
    for (let i = 0; i < rows; i++) for (let j = 0; j < 2; j++) { const x = x0 + 0.5 + j * (w - 1) / 2, y = y0 + 1.8 + i * 1.3; box(x, y, (w - 1) / 2 - 0.3, 0.35, 0.05, 0.22, IC.pew, IC.red); box(x, y + 0.32, (w - 1) / 2 - 0.3, 0.1, 0, 0.6, IC.pew); }
  } else if (art === 'build') {
    for (let i = 0; i < 3; i++) box(x0 + 0.5 + i * 0.25, y0 + d - 1.4, 0.18, 1.0, 0, 0.12 + i * 0.12, '#c99a5a');
    box(x0 + w - 1.4, y0 + 0.4, 0.1, 0.1, 0, 1.5, '#8a8a8a'); box(x0 + w - 0.6, y0 + 0.4, 0.1, 0.1, 0, 1.5, '#8a8a8a'); box(x0 + w - 1.4, y0 + 0.4, 0.9, 0.1, 1.0, 0.08, '#c99a5a');
    box(x0 + 1.2, y0 + 1.2, 0.35, 0.35, 0, 0.35, '#c0443a', '#e0e0e0'); box(x0 + 1.7, y0 + 1.3, 0.3, 0.3, 0, 0.3, '#e0e0e0'); box(x0 + w - 1.2, y0 + d - 1.0, 0.5, 0.35, 0, 0.3, '#3a6ac0');
  } else if (art === 'empty') {
    for (const [a, b] of [[w - 0.8, 0.6], [w - 1.5, 1.0]]) { box(x0 + a, y0 + b, 0.05, 0.05, 0, 0.7, '#555'); box(x0 + a - 0.12, y0 + b - 0.1, 0.3, 0.2, 0.7, 0.2, '#e0a030', '#ffe08a'); lamps.push([...K.S(x0 + a, y0 + b, 0.8), 0.9]); }
  } else if (art === 'hall') {
    if (w > d) for (let i = 2; i < w - 1; i += 4) plant(x0 + i + 0.5, y0 + 0.3);
    else for (let j = 3; j < d - 1; j += 5) plant(x0 + 1.75, y0 + j + 0.5);
  }
}

function classRoom(key, site, x) { return site.built ? { kind: 'class', key, room: x.room, g: x.g } : { kind: 'building', key }; }
function classLabel(site, x) {
  if (!site.built) return `🏗️ ${site.floor}층 공사 중`;
  return x.g ? `${UNITS[x.g.type].icon} ${UNIT_SHORT[x.g.type] || UNITS[x.g.type].name}${x.g.level ? ` Lv${x.g.level}` : ' (준비 중)'}` : '＋ 빈 교리실';
}
function polyPath(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
function pushPoly(pts, r) {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys);
  World.hits.push({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, poly: pts, interior: r });
}
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawTag(ctx, [x, y], text, u, dim) {
  ctx.font = `bold ${10 * u}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 10 * u, h = 15 * u;
  ctx.fillStyle = dim ? 'rgba(255,253,246,.88)' : 'rgba(30,24,20,.78)'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 4 * u); ctx.fill();
  ctx.fillStyle = dim ? '#2b2420' : '#fff'; ctx.fillText(text, x, y + u);
  ctx.textBaseline = 'alphabetic';
}
// 거두기 말풍선과 ⬆ (align: 'center'면 x 가운데, 'left'면 x에서 왼쪽으로, 'right'면 x에서 오른쪽으로)
function drawStashUp(ctx, b, x, y, u, align) {
  const st = stashBubble(b), upg = upgradeFor(b.id);
  ctx.font = `bold ${10 * u}px sans-serif`; ctx.textBaseline = 'middle';
  const t = st ? `${st.offering >= 1 ? `💰${Math.floor(st.offering)}` : ''}${st.members >= 1 ? ` 👥${Math.floor(st.members)}` : ''}`.trim() : '';
  const bw = t ? ctx.measureText(t).width + 10 * u : 0, uw = upg ? 16 * u : 0, gap = t && upg ? 4 * u : 0, total = bw + gap + uw;
  let x0 = align === 'left' ? x - total : align === 'right' ? x : x - total / 2;
  const h = 15 * u;
  if (t) {
    ctx.fillStyle = st.full ? '#c0392b' : '#fffdf6'; roundRect(ctx, x0, y - h / 2, bw, h, 4 * u); ctx.fill();
    ctx.fillStyle = st.full ? '#fff' : '#2b2420'; ctx.textAlign = 'center'; ctx.fillText(t, x0 + bw / 2, y + u);
    World.hits.push({ x: x0, y: y - h / 2, w: bw, h, id: b.id });
    x0 += bw + gap;
  }
  if (upg) {
    ctx.fillStyle = upg.waiting ? '#8a8a84' : '#3cbf68'; ctx.beginPath(); ctx.arc(x0 + uw / 2, y, 7 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('↑', x0 + uw / 2, y + u);
    World.hits.push({ x: x0, y: y - 8 * u, w: uw, h: 16 * u, id: b.id, up: true });
  }
  ctx.textBaseline = 'alphabetic';
}
