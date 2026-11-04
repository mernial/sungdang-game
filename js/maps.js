// 쿼터뷰 지도: 건물, 길, 나무, 인물 배치
// 건물 door.side: 'S' = 화면 왼쪽 아래 면, 'E' = 화면 오른쪽 아래 면. door.u = 그 면에서의 위치(0~1)
// menu: 그 건물/인물에 다가가 상호작용했을 때 열리는 메뉴 (ui.js의 MENUS)

// 지을 수 있는 건물의 바닥 크기 [가로, 세로]
// v0.80: 사람 키(약 1.7m)에 맞춰 본당 지도를 두 배 칸으로 나눴다 (한 칸 ≈ 1.2m). 건물·조경은 예전 크기의 두 배 칸
const MAP_GRID = 2;
const SITE_SIZE = { container: [2 * MAP_GRID, 3 * MAP_GRID], gongso: [2 * MAP_GRID, 2 * MAP_GRID] }; // 교리실은 정문 쪽(왼쪽 아래)이 짧은 벽 (그림에 맞춤)
// 땅을 차지하는 것들: 교리실·공소(sites)와 조경(decor) [{ x, y, kind }]
function placedThings(p) { return [...Object.values(p.sites), ...Object.values(p.decor || {})].filter(st => st.x !== undefined); }
// rot: 건물 방향 0~3 (v0.71). 0 = 정문이 왼쪽 아래, 1 = 오른쪽 아래, 2 = 뒤(오른쪽 위), 3 = 왼쪽 위. 옆으로 돌리면(1·3) 가로세로가 바뀐다
function sizeOf(kind, rot) {
  const f = typeof MAPS !== 'undefined' && MAPS.solmoe && MAPS.solmoe.fixed.find(q => q.id === kind); // 성당·사제관·사무실 (v0.90 옮기기)
  const s = f ? [f.w, f.d] : SITE_SIZE[kind] || (DECOR[kind] ? [DECOR[kind].w, DECOR[kind].d] : [1, 1]); return rot % 2 ? [s[1], s[0]] : s;
}
// 성당·사제관·사무실의 지금 자리: 꾹 눌러 옮긴 자리(p.pos)와 방향(p.rot) (v0.90)
function fixedAt(f) {
  const p = Game.state.pastor, at = (p && p.pos && p.pos[f.id]) || f, rot = (p && p.rot && p.rot[f.id]) || 0;
  return { x: at.x, y: at.y, w: rot % 2 ? f.d : f.w, d: rot % 2 ? f.w : f.d, rot };
}
const DOOR_SIDE = ['S', 'E', 'N', 'W'];
// 문 앞 칸 (방향에 따라)
function doorTile(x, y, w, d, rot) {
  return [[x + Math.floor(w / 2), y + d], [x + w, y + Math.floor(d / 2)], [x + Math.floor(w / 2), y - 1], [x - 1, y + Math.floor(d / 2)]][(rot || 0) % 4];
}

// 빈터를 덮은 장애물: 치워야 그 자리에 지을 수 있다
// weed 잡초 (행동력으로 바로), rock 돌·sapling 어린나무 (봉헌금과 공사 팀, 시간이 걸림)
const OBSTACLES = {
  weed: { name: '잡초', icon: '🌿', verb: '뽑기', energy: 1 },
  rock: { name: '돌', icon: '🪨', verb: '치우기', cost: 12, min: 2 },
  sapling: { name: '어린나무', icon: '🌳', verb: '베기', cost: 18, min: 3 },
  house: { name: '집', icon: '🏡', verb: '사기', min: 6 },
  tree: { name: '큰 나무', icon: '🌲', verb: '베기', cost: 40, min: 8 }, // v0.90: 지도에 처음부터 선 큰 나무도 벨 수 있다
};

const MAPS = {
  seminary: {
    name: '신학교',
    w: 18, h: 15,
    spawn: [8.5, 7.5],
    paths: [[5, 5, 7, 4], [12, 5, 4, 1], [8, 9, 2, 6]],
    buildings: [
      { id: 'chapel', label: '신학교 성당', x: 6, y: 1, w: 5, d: 4, h: 26, style: 'church', door: { side: 'S', u: 0.5 }, menu: 'semChapel' },
      { id: 'lecture', label: '강의동', x: 12, y: 2, w: 4, d: 3, h: 22, style: 'brick', door: { side: 'S', u: 0.5 }, menu: 'semLecture' },
      { id: 'dorm', label: '기숙사', x: 1, y: 7, w: 4, d: 3, h: 20, style: 'house', door: { side: 'E', u: 0.5 }, menu: 'semDorm' },
    ],
    statues: [[12, 7]],
    trees: [[0, 0], [2, 1], [4, 0], [16, 0], [17, 2], [0, 4], [17, 6], [16, 9], [0, 12], [3, 13], [13, 13], [16, 12], [11, 11], [5, 11], [2, 5]],
    npcs: [
      { id: 'director', name: '영성 지도 신부님', look: 'director', home: [10, 7.2], radius: 0.4, menu: 'director' },
      { id: 'michael', name: '동기 정 미카엘', look: 'seminarian', home: [6.5, 8], radius: 1.5, menu: 'classmate' },
      { id: 'sem2', name: '선배 신학생', look: 'seminarian', home: [13.5, 7], radius: 2,
        lines: ['"기도가 막힐 때는 그냥 성당에 앉아만 있어도 돼."', '"시험 기간엔 도서관 자리가 없어. 일찍 가."', '"착의식 날 어머님들이 제일 많이 우셔."'] },
      { id: 'sem3', name: '신학생', look: 'seminarian', home: [9, 11], radius: 2,
        lines: ['"오늘 저녁 메뉴 뭔지 알아?"', '"방학 실습 본당이 어디로 나올지 궁금해."'] },
    ],
  },

  parish: {
    name: '본당',
    w: 19, h: 18,
    spawn: [9, 7.5],
    paths: [[6, 6, 7, 4], [12, 5, 5, 1], [12, 5, 1, 5], [12, 9, 5, 1], [5, 8, 1, 2], [9, 10, 2, 8], [11, 14, 3, 1], [7, 13, 2, 1], [11, 17, 3, 1]],
    buildings: [
      { id: 'church', label: '성당', x: 6, y: 1, w: 6, d: 5, h: 30, style: 'church', door: { side: 'S', u: 0.5 }, menu: 'church' },
      { id: 'rectory', label: '사제관', x: 14, y: 2, w: 3, d: 3, h: 20, style: 'house', door: { side: 'S', u: 0.5 }, menu: 'rectory' },
      { id: 'office', label: '본당 사무실', x: 14, y: 7, w: 3, d: 2, h: 16, style: 'office', door: { side: 'S', u: 0.5 }, menu: 'office' },
      { id: 'edu', label: '교육관', x: 1, y: 8, w: 4, d: 3, h: 22, style: 'brick', door: { side: 'E', u: 0.5 }, menu: 'edu' },
      { id: 'houseA', label: '교우 가정 (요한 씨 댁)', x: 12, y: 12, w: 2, d: 2, h: 14, style: 'cottage', door: { side: 'S', u: 0.5 }, menu: 'house' },
      { id: 'houseB', label: '교우 가정 (마리아 할머니 댁)', x: 5, y: 12, w: 2, d: 2, h: 14, style: 'cottage', door: { side: 'E', u: 0.5 }, menu: 'house' },
      { id: 'houseC', label: '교우 가정 (베드로 할아버지 댁)', x: 12, y: 15, w: 2, d: 2, h: 14, style: 'cottage', door: { side: 'S', u: 0.5 }, menu: 'house' },
    ],
    statues: [[4, 6]],
    trees: [[0, 0], [1, 2], [3, 0], [17, 0], [18, 3], [0, 5], [18, 8], [0, 12], [18, 12], [3, 17], [16, 17], [17, 15], [1, 16], [8, 12], [4, 3], [15, 11], [7, 16]],
    npcs: [
      { id: 'pastor', name: '주임 신부님', look: 'pastor', home: [13.3, 7.2], radius: 1.2, menu: 'pastor' },
      { id: 'grandma', name: '레지오 단원 할머니', look: 'p2', home: [8, 8.5], radius: 1.5,
        lines: ['"신부님, 오늘 강론 잘 들었어요."', '"우리 레지오가 이번 주에 병원 봉사 가요."', '"젊은 신부님이 오시니 성당이 환해졌어."'] },
      { id: 'leader', name: '사목회장', look: 'p1', home: [11, 8], radius: 1.5,
        lines: ['"본당 살림이 빠듯해요, 신부님."', '"주임 신부님 결재가 나야 진행할 수 있어요."', '"이번 바자회는 꼭 성공시켜야죠."'] },
      { id: 'youth1', name: '청년회장', look: 'youth', home: [6.5, 10.5], radius: 1.5,
        lines: ['"신부님, 청년 모임 언제 해요?"', '"요즘 청년들이 성당에 잘 안 나와요."', '"수련회 가고 싶어요!"'] },
      { id: 'kid1', name: '주일학교 아이', look: 'kid', home: [7, 11], radius: 2,
        lines: ['"신부님! 같이 놀아요!"', '"교리 시간에 간식 줘요?"', '"신부님은 왜 맨날 까만 옷 입어요?"'] },
      { id: 'sister', name: '수녀님', look: 'sister', home: [4.5, 11.5], radius: 1,
        lines: ['"주일학교 교사가 조금 부족해요."', '"신부님, 기도 중에 기억할게요."'] },
      { id: 'man1', name: '교우', look: 'p3', home: [10, 13], radius: 2,
        lines: ['"신부님, 안녕하세요!"', '"이번 주는 일이 바빠서 미사를 못 갈 것 같아요…"', '"우리 애가 첫영성체를 해요."'] },
    ],
  },
};

// 솔뫼 본당 (주임 신부): 건물은 저장된 상태에서 만들어진다
// plots: 예전 저장의 건물 자리 (v0.16부터는 빈 칸 아무 데나 놓는다. 옛 건물 위치를 옮길 때만 쓴다)
// regions: 넓혀야 들어갈 수 있는 마을. 잠겨 있으면 안개로 덮이고 막힌다
MAPS.solmoe = {
  name: '솔뫼 본당',
  w: 30, h: 34,             // 아래쪽 y 24~27은 살 수 있는 밭·논(v1.08), y 28~33은 이웃 동네(면 소재지)
  spawn: [9.5, 7.5],
  overview: true,          // 캐릭터 없이 멀리서 바라본다
  viewCenter: [9, 8],      // 처음 바라보는 곳
  viewWidth: 130,          // 처음 화면에 들어오게 할 월드 너비(픽셀, 두 배 칸으로 늘린 뒤 260: 핸드폰 1.5배, 컴퓨터 3배). v0.81: 사람이 크게 보이게 가까이
  eventSpot: [10.5, 6.8],
  paths: [[0, 28, 30, 1], [14, 28, 2, 6]],  // 본당 땅의 길은 신부가 직접 놓는다 (p.paths). 이건 이웃 동네의 길
  fixed: [
    { id: 'church', label: '솔뫼 성당', x: 7, y: 1, w: 4, d: 5, style: 'church', door: { side: 'S', u: 0.5 }, menu: 'church' },
    { id: 'rectory', label: '사제관', x: 15, y: 1, w: 2, d: 2, h: 18, style: 'house', door: { side: 'S', u: 0.5 }, menu: 'rectory' },
    { id: 'office', label: '본당 사무실', x: 18, y: 1, w: 2, d: 3, h: 15, style: 'office', door: { side: 'S', u: 0.5 }, menu: 'office' },
  ],
  houses: [
    { id: 'houseA', label: '교우 가정 (데레사 할머니 댁)', x: 16, y: 18, w: 2, d: 2, h: 13, style: 'cottage', door: { side: 'S', u: 0.5 }, menu: 'house' },
    { id: 'houseB', label: '교우 가정 (요셉 할아버지 댁)', x: 1, y: 18, w: 2, d: 2, h: 13, style: 'cottage', door: { side: 'E', u: 0.5 }, menu: 'house' },
    { id: 'houseC', label: '윗말 가정 (김 씨 댁)', x: 23, y: 2, w: 2, d: 2, h: 13, style: 'cottage', door: { side: 'S', u: 0.5 }, menu: 'house', region: 'v1' },
    { id: 'houseD', label: '윗말 가정 (이장님 댁)', x: 27, y: 15, w: 2, d: 2, h: 13, style: 'cottage', door: { side: 'S', u: 0.5 }, menu: 'house', region: 'v1' },
  ],
  plots: [
    { id: 'p1', x: 1, y: 1 }, { id: 'p2', x: 1, y: 5 }, { id: 'p3', x: 1, y: 11 },
    { id: 'p4', x: 5, y: 11 }, { id: 'p5', x: 12, y: 11 }, { id: 'p6', x: 16, y: 11 }, { id: 'p9', x: 14, y: 6 },
    { id: 'p7', x: 5, y: 16 }, { id: 'p8', x: 12, y: 16 },
    { id: 'v1a', x: 22, y: 6, region: 'v1', gongsoOnly: true },
    { id: 'v1b', x: 24, y: 11, region: 'v1' },
    { id: 'v1c', x: 22, y: 17, region: 'v1' },
  ],
  regions: [{ id: 'v1', x: 21, y: 0, w: 9, h: 24 }, { id: 'town', x: 0, y: 28, w: 30, h: 6, town: true }],
  // 이웃 동네 건물: 마을회관과 집들 (v1.08: 사용자 요청으로 다른 종교 건물은 지도에서 뺐다. 종교 현황은 마을회관에서)
  town: [
    { id: 't_hall', label: '마을회관', x: 17, y: 29, w: 2, d: 3, h: 14, style: 'office', door: { side: 'S', u: 0.5 }, menu: 'townhall' },
    { id: 't_h1', label: '동네 집', x: 8, y: 29, w: 2, d: 2, h: 12, style: 'cottage', door: { side: 'S', u: 0.5 } },
    { id: 't_h2', label: '동네 집', x: 21, y: 31, w: 2, d: 2, h: 12, style: 'house', door: { side: 'S', u: 0.5 } },
    { id: 't_h3', label: '동네 가게', x: 0, y: 29, w: 2, d: 2, h: 12, style: 'brick', door: { side: 'S', u: 0.5 } },
    { id: 't_h4', label: '동네 집', x: 24, y: 29, w: 2, d: 2, h: 12, style: 'cottage', door: { side: 'S', u: 0.5 } },
    { id: 't_h5', label: '동네 집', x: 4, y: 31, w: 2, d: 2, h: 12, style: 'house', door: { side: 'S', u: 0.5 } },
    { id: 't_h6', label: '면사무소', x: 27, y: 30, w: 2, d: 2, h: 14, style: 'office', door: { side: 'S', u: 0.5 } },
  ],
  statues: [[6, 6]],
  trees: [[0, 0], [4, 0], [13, 0], [19, 0], [0, 4], [4, 4], [19, 4], [0, 9], [4, 9], [19, 7], [0, 15], [4, 15], [8, 14], [15, 15], [19, 14], [0, 22], [3, 22], [8, 22], [14, 22], [19, 21], [19, 17],
    [12, 31], [20, 32], [1, 33], [26, 33],
    [21, 0], [26, 0], [29, 0], [21, 3], [29, 3], [25, 8], [29, 8], [21, 13], [28, 11], [21, 21], [25, 21], [29, 21], [26, 18], [29, 13]],
  npcs: [
    { id: 'council', name: '사목회장', look: 'p1', home: [12.5, 7.4], radius: 1.2, menu: 'council' },
    { id: 'grandma', name: '레지오 할머니', look: 'p2', home: [7.5, 8.5], radius: 1.5,
      lines: ['"신부님 오시고 성당이 북적북적해졌어요."', '"우리 같은 늙은이들만 남은 줄 알았는데…"', '"윗말에도 옛날엔 교우가 많았어요."'] },
    { id: 'grandpa', name: '요셉 할아버지', look: 'p5', home: [4.5, 20], radius: 1.5,
      lines: ['"성당 종소리가 다시 들리니 좋구먼."', '"내가 젊었을 땐 저 성당을 손으로 지었지."'] },
    { id: 'kid1', name: '마을 아이', look: 'kid', home: [11, 13.5], radius: 2,
      lines: ['"신부님! 주일학교는 언제 생겨요?"', '"우리 반엔 성당 다니는 애가 나밖에 없어요."'] },
    { id: 'elder', name: '윗말 이장님', look: 'p3', home: [19.6, 9.5], radius: 0, menu: 'village', village: 'v1' },
  ],
  getBuildings() {
    const p = Game.state.pastor;
    const out = [];
    const inside = typeof interiorParish === 'function' && interiorParish();
    for (const f of this.fixed) {
      if (inside && f.id !== 'church') continue;
      const level = p.fixed[f.id], at = fixedAt(f), rot = at.rot;
      const b = { ...f, ...at, level, label: localize(f.label), door: { ...f.door, side: DOOR_SIDE[rot] } };
      if (f.id === 'church') { b.tier = (CHURCH_LEVELS[level] || {}).tier || 1; b.h = b.tier === 1 ? 13 : b.tier === 2 ? 17 : 20 + Math.round(level * 1.5); b.deco = level % 2 === 0 ? 1 : 0; }
      if (f.id === 'rectory' || f.id === 'office') Object.assign(b, fixedLook(f, level));
      b.job = jobFor(f.id);
      b.working = !!b.job;
      out.push(b);
    }
    for (const h of this.houses) out.push({ ...h });
    for (const [key, dc] of Object.entries(p.decor || {})) { const def = DECOR[dc.kind]; const [dw, dd] = sizeOf(dc.kind, dc.rot); out.push({ id: key, decor: dc.kind, rot: dc.rot || 0, label: def.name, x: dc.x, y: dc.y, w: dw, d: dd, h: 6, style: 'house', door: { side: DOOR_SIDE[dc.rot || 0], u: 0.5 }, menu: 'decor', region: this.regionAt(dc.x, dc.y) }); }
    for (const t of this.town) out.push({ ...t, label: localize(t.label), region: 'town' });
    for (const [key, site] of Object.entries(p.sites)) {
      if (site.x === undefined) continue;
      const job = jobFor(key), working = !!job, region = this.regionAt(site.x, site.y), rot = site.rot || 0, [sw, sd] = sizeOf(site.kind, rot), door = { side: DOOR_SIDE[rot], u: 0.5 };
      if (site.kind === 'gongso') {
        out.push({ id: key, plotId: key, label: GONGSO.name, x: site.x, y: site.y, w: sw, d: sd, rot, h: 15 + Math.min(8, (site.level || 1) * 1.5), deco: (site.level || 0) >= 2 ? 1 : 0, bell: (site.level || 0) >= 4, style: 'gongso', door, menu: 'gongso', level: site.level, region, cross: true, working, job, scaffold: site.level === 0 });
        continue;
      }
      // 교리실 레벨이 오르면 지붕이 생기고(조립식), 벽돌 건물이 된다
      const lv = site.level || 1, tier = ROOM_LEVELS[lv].tier;
      const style = tier >= 3 ? (tier >= 4 ? 'school' : 'brick') : 'container';
      out.push({ id: key, plotId: key, level: lv, tier, label: `교리실 ${containerIndex(key)} (${site.floors === 2 ? '2층 ' : ''}${ROOM_LEVELS[lv].name} Lv${lv})`, x: site.x, y: site.y, w: sw, d: sd, rot, h: (tier >= 3 ? 12 + tier * 2 : 13) + (site.floors === 2 ? 11 : 0), floors: site.floors, style, roofed: tier === 2, deco: lv % 2 === 0 ? 1 : 0, door, menu: 'container', region, rooms: site.rooms, working, job, scaffold: !site.built, color: containerIndex(key) % 3 });
    }
    return out;
  },
  getPlots() { return []; },
  // 처음부터 깨끗한 작은 빈터 (첫 교리실 자리)
  starterClear: [13, 6, 5, 4],
  // 땅을 사서 넓힐 수 있는 마을 집 (교우 집은 마음이, 비신자 집은 평판이 있어야 판다)
  landHouses: [
    { id: 'lh1', x: 1, y: 1, owner: '박 씨', believer: false, cost: 160, need: { reputation: 22 } },
    { id: 'lh2', x: 1, y: 13, owner: '최 씨', believer: true, cost: 100, need: { heart: 40 } },
    { id: 'lh3', x: 5, y: 19, owner: '정 씨', believer: false, cost: 220, need: { reputation: 30 } },
    { id: 'lh4', x: 13, y: 19, owner: '한 씨', believer: true, cost: 140, need: { heart: 50 } },
    { id: 'lh5', x: 17, y: 15, owner: '오 씨', believer: false, cost: 280, need: { reputation: 38 } },
  ],
  // 장애물 배치: 정해진 씨앗으로 매번 같은 자리에 (빈 칸의 절반쯤)
  obstacleList() {
    if (this._obs) return this._obs;
    const used = new Set(), road = new Set();
    const mark = (bx, by, bw, bd, set = used) => { for (let i = bx; i < bx + bw; i++) for (let j = by; j < by + bd; j++) set.add(i + ',' + j); };
    const G = this.grid || 1, TS = this.treeSize || 1;
    for (const b of [...this.fixed, ...this.houses]) { mark(b.x, b.y, b.w, b.d); mark(b.x + Math.floor(b.w / 2) - (G - 1), b.y + b.d, G, G); }
    for (const [tx, ty] of this.trees) mark(tx, ty, TS, TS);
    for (const [tx, ty] of this.statues || []) mark(tx, ty, G, G);
    for (const [px, py, pw, ph] of this.paths) mark(px, py, pw, ph, road);
    mark(...this.starterClear);
    for (const h of this.landHouses) mark(h.x, h.y, 2 * G, 2 * G);
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const out = [];
    // 장애물은 G×G 칸 덤불 하나씩 (예전 한 칸 자리와 같은 순서·같은 씨앗이라 치운 기록이 그대로 이어진다)
    const any = (x, y, set) => { for (let i = x; i < x + G; i++) for (let j = y; j < y + G; j++) if (set.has(i + ',' + j)) return true; return false; };
    for (let y = 0; y < this.h; y += G) for (let x = 0; x < this.w; x += G) {
      const r = rnd(), t = rnd();
      if (any(x, y, used) || any(x, y, road) || r > 0.55 || this.regionAt(x, y) === 'town') continue;
      out.push({ id: `o${x}_${y}`, x, y, w: G, d: G, type: t < 0.6 ? 'weed' : t < 0.85 ? 'rock' : 'sapling' });
    }
    for (const h of this.landHouses) out.push({ ...h, w: 2 * G, d: 2 * G, type: 'house' });
    // 큰 나무 (맨 뒤에 붙여 예전 장애물 이름·순서는 그대로)
    this.trees.forEach(([x, y], i) => out.push({ id: `t${x}_${y}`, x, y, w: TS, d: TS, type: 'tree', treeKind: i % 3 === 2 ? 1 : 0 }));
    return (this._obs = out);
  },
  // 아직 남아 있는 장애물 (치운 것, 건물 밑에 깔린 것은 빼고)
  obstacles() {
    const p = Game.state.pastor, under = new Set();
    for (const st of placedThings(p)) { const [w, d] = sizeOf(st.kind, st.rot); for (let i = st.x; i < st.x + w; i++) for (let j = st.y; j < st.y + d; j++) under.add(i + ',' + j); }
    const covered = o => { for (let i = o.x; i < o.x + o.w; i++) for (let j = o.y; j < o.y + o.d; j++) if (under.has(i + ',' + j)) return true; return false; };
    return this.obstacleList().filter(o => !(p.cleared && p.cleared[o.id]) && !covered(o));
  },
  // 길을 놓을 수 있는 칸인지: 건물·나무·장애물·잠긴 마을이 아니어야 한다
  canPath(x, y) {
    const p = Game.state.pastor;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '땅 끝이에요';
    const r = this.regionAt(x, y);
    if (r === 'town') return '이웃 동네라 길을 놓을 수 없어요';
    if (r && !villageOpen(r)) return '아직 열지 않은 마을이에요';
    if (!r && !lotOwnedAt(x, y)) return '본당 땅이 아니에요 · 땅을 먼저 사야 해요';
    for (const b of [...this.fixed.map(fixedAt), ...this.houses]) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) return '건물이 있어요';
    for (const st of placedThings(p)) { const [w, d] = sizeOf(st.kind, st.rot); if (x >= st.x && x < st.x + w && y >= st.y && y < st.y + d) return '건물이 있어요'; }
    { const TS = this.treeSize || 1, G = this.grid || 1; for (const [tx, ty] of this.statues || []) if (x >= tx && x < tx + G && y >= ty && y < ty + G) return '성모상이 있어요'; }
    if (this.obstacleAt(x, y)) return '잡초·돌·나무를 먼저 치워야 해요';
    return '';
  },
  obstacleAt(x, y) { return this.obstacles().find(o => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.d) || null; },
  regionAt(x, y) {
    for (const r of this.regions) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.id;
    return null;
  },
  // 지을 수 있는지: 건물·나무·길·잠긴 마을이 아닌 빈 칸이어야 하고, 문 앞 한 칸이 비어 있어야 한다
  // 교리실은 본당 땅이나 열린 마을에, 공소는 열린 마을에만
  canPlace(kind, x, y, rot = 0, ignore = null) {
    const [w, d] = sizeOf(kind, rot), p = Game.state.pastor;
    const [dx, dy] = doorTile(x, y, w, d, rot);
    if (x < 0 || y < 0 || x + w > this.w || y + d > this.h || (!DECOR[kind] && (dx < 0 || dy < 0 || dx >= this.w || dy >= this.h))) return { ok: false, reason: '땅 끝이라 놓을 수 없어요' };
    const occ = new Set(), road = new Set();
    const mark = (bx, by, bw, bd, set = occ) => { for (let i = bx; i < bx + bw; i++) for (let j = by; j < by + bd; j++) set.add(i + ',' + j); };
    // ignore: 옮기는 중인 것 (교리실·조경은 그 자리 기록, 성당·사제관·사무실은 이름)
    for (const f of this.fixed) if (f.id !== ignore) { const b = fixedAt(f); mark(b.x, b.y, b.w, b.d); }
    for (const b of this.houses) mark(b.x, b.y, b.w, b.d);
    for (const [tx, ty] of this.statues || []) mark(tx, ty, this.grid || 1, this.grid || 1);
    for (const k of Object.keys(p.paths || {})) road.add(k);
    for (const st of placedThings(p)) if (st !== ignore) mark(st.x, st.y, ...sizeOf(st.kind, st.rot));
    const weeds = new Set();
    for (const o of this.obstacles()) for (let i = o.x; i < o.x + o.w; i++) for (let j = o.y; j < o.y + o.d; j++) weeds.add(i + ',' + j);
    const regions = new Set();
    for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) {
      const k = i + ',' + j;
      if (occ.has(k)) return { ok: false, reason: '다른 건물이나 나무와 겹쳐요' };
      if (road.has(k)) return { ok: false, reason: '길 위에는 지을 수 없어요' };
      if (weeds.has(k)) return { ok: false, reason: '잡초·돌·나무를 치우거나 땅을 먼저 사야 해요' };
      const r = this.regionAt(i, j);
      if (r === 'town') return { ok: false, reason: '이웃 동네라 지을 수 없어요' };
      if (r && !villageOpen(r)) return { ok: false, reason: '아직 열지 않은 마을이에요' };
      if (!r && !lotOwnedAt(i, j)) return { ok: false, reason: `본당 땅이 아니에요 · ${lotAt(i, j).name} 땅을 먼저 사야 해요` };
      regions.add(r);
    }
    const door = dx + ',' + dy;
    if (!DECOR[kind] && (occ.has(door) || weeds.has(door))) return { ok: false, reason: '문 앞이 막혀요' };
    if (kind === 'gongso' && (regions.size !== 1 || regions.has(null))) return { ok: false, reason: '공소는 마을 안에 세워요' };
    if (this.fixed.some(f => f.id === kind) && (regions.size !== 1 || !regions.has(null))) return { ok: false, reason: '본당 땅 안에만 옮길 수 있어요' };
    return { ok: true };
  },
  // (nx, ny)에서 가장 가까운 지을 수 있는 자리
  findSpot(kind, nx, ny) {
    let best = null;
    for (let x = 0; x < this.w; x++) for (let y = 0; y < this.h; y++) {
      const d = Math.hypot(x - nx, y - ny);
      if (best && d >= best.d) continue;
      if (this.canPlace(kind, x, y).ok) best = { x, y, d };
    }
    return best;
  },
  regionLocked(id) { return id !== 'town' && !villageOpen(id); },
};

// v0.80: 사람 키(28px ≈ 1.7m)에 맞춰 본당 지도를 두 배 칸으로 (한 칸 ≈ 1.2m). 건물·집·나무·땅도 칸 수로 두 배
(function scaleMap(m, G) {
  m.grid = G; m.treeSize = G; m.w *= G; m.h *= G;
  for (const b of [...m.fixed, ...m.houses, ...m.town]) { b.x *= G; b.y *= G; b.w *= G; b.d *= G; if (b.h) b.h *= G; }
  for (const p of m.plots) { p.x *= G; p.y *= G; }
  for (const r of m.regions) { r.x *= G; r.y *= G; r.w *= G; r.h *= G; }
  m.paths = m.paths.map(a => a.map(v => v * G));
  m.statues = (m.statues || []).map(a => a.map(v => v * G));
  m.trees = m.trees.map(a => a.map(v => v * G));
  m.spawn = m.spawn.map(v => v * G); m.viewCenter = m.viewCenter.map(v => v * G); m.eventSpot = m.eventSpot.map(v => v * G); m.viewWidth *= G;
  for (const n of m.npcs) { n.home = n.home.map(v => v * G); n.radius *= G; }
  for (const h of m.landHouses) { h.x *= G; h.y *= G; }
  m.starterClear = m.starterClear.map(v => v * G);
})(MAPS.solmoe, MAP_GRID);
