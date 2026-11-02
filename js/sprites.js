// 도트 그래픽: 이미지 파일 없이 코드로 직접 그린다
// 좌표: 월드 타일 (x, y) → 쿼터뷰 화면 픽셀

// v0.82: 바닥 마름모 기울기를 2:1(0.5)에서 0.42로. 받은 3D 건물 그림들이 대부분 이 각도라 바닥과 건물이 맞는다
const TW = 32, TH = 12.2; // v0.84: 받은 3D 건물 그림 바닥 기울기 평균(0.38)에 맞춤

function iso(x, y) { return [(x - y) * TW / 2, (x + y) * TH / 2]; }
function up(p, v) { return [p[0], p[1] - v]; }
function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

function poly(ctx, pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(Math.round(pts[i][0]), Math.round(pts[i][1]));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// ---------- 바닥 ----------

const GROUND = {
  grass: ['#78a85c', '#71a157'],
  path: ['#d9c9a3', '#d2c19a'],
  plaza: ['#c9b8a0', '#c2b098'],
  dirt: ['#bfa274', '#b89b6d'],
  fog: ['#8e9c8b', '#889685'],
};

function drawTile(ctx, x, y, kind) {
  if (kind === 'grass' || kind === 'path') {
    const key = (x * 5 + y * 3) % 3 === 0 && getSprite(`tile-${kind}2`) ? `tile-${kind}2` : `tile-${kind}`, img = getSprite(key);
    if (img) {
      const [sx, sy] = iso(x, y), hd = SPRITE_HD.has(key);
      if (hd) ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, Math.round(sx - TW / 2), Math.round(sy), TW, TH);
      if (hd) ctx.imageSmoothingEnabled = false;
      return;
    }
  }
  const colors = GROUND[kind];
  const c = colors[(x + y) % 2];
  poly(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c);
  // 풀밭에 작은 풀 포인트
  if (kind === 'grass' && (x * 7 + y * 13) % 5 === 0) {
    const [sx, sy] = iso(x + 0.5, y + 0.5);
    ctx.fillStyle = '#5f8f45';
    ctx.fillRect(Math.round(sx) - 2, Math.round(sy), 1, 2);
    ctx.fillRect(Math.round(sx) + 1, Math.round(sy) - 1, 1, 2);
  }
}

// ---------- 건물 ----------

const BUILDING_STYLES = {
  church: { wallL: '#e9dcc0', wallR: '#d4c5a6', roof: '#9c3d2c', roofDark: '#7a2e21', roofH: 16, window: '#4a6fa5', glass: true },
  tower: { wallL: '#efe3c8', wallR: '#d9caab', roof: '#9c3d2c', roofDark: '#7a2e21', roofH: 14, window: '#4a6fa5' },
  house: { wallL: '#f3eee4', wallR: '#ddd6c8', roof: '#4d5866', roofDark: '#3b4450', roofH: 10, window: '#8fb3d1' },
  office: { wallL: '#ece3cf', wallR: '#d6cbb3', roof: '#5f7552', roofDark: '#4b5e40', roofH: 8, window: '#8fb3d1' },
  brick: { wallL: '#c98a5e', wallR: '#b0744c', roof: '#6e3427', roofDark: '#57281e', roofH: 10, window: '#d9e6ef' },
  cottage: { wallL: '#efe2c9', wallR: '#d8c8aa', roof: '#b0623a', roofDark: '#8f4e2e', roofH: 9, window: '#8fb3d1' },
  // 단체 건물
  legio: { wallL: '#f1f0ea', wallR: '#d9d8d0', roof: '#3d5a99', roofDark: '#30487a', roofH: 10, window: '#8fb3d1' },
  choir: { wallL: '#efe6f2', wallR: '#d6cbdb', roof: '#7a4f8f', roofDark: '#613e72', roofH: 11, window: '#d9c36a' },
  elders: { wallL: '#e8dcc4', wallR: '#cfc2a8', roof: '#6b7f4a', roofDark: '#55663a', roofH: 9, window: '#8fb3d1' },
  school: { wallL: '#f3dd8a', wallR: '#dcc574', roof: '#c0533a', roofDark: '#9c4230', roofH: 9, window: '#8fb3d1' },
  youth: { wallL: '#f0e0d0', wallR: '#d8c6b4', roof: '#e07a2f', roofDark: '#b86224', roofH: 9, window: '#8fb3d1' },
  vincent: { wallL: '#eef0e8', wallR: '#d4d8cc', roof: '#2f7a6b', roofDark: '#245f53', roofH: 9, window: '#8fb3d1' },
  council: { wallL: '#e6e3dc', wallR: '#cdc9c0', roof: '#4e4e6e', roofDark: '#3d3d58', roofH: 8, window: '#8fb3d1' },
  gongso: { wallL: '#f4f1ea', wallR: '#dcd8cf', roof: '#9c3d2c', roofDark: '#7a2e21', roofH: 12, window: '#4a6fa5', glass: true },
  prefab: { wallL: '#d3dbe2', wallR: '#b8c3cc', roof: '#5d6b78', roofDark: '#4c5864', roofH: 7, window: '#9fc1de' },
  // 이웃 동네의 다른 종교 공동체
  chapel: { wallL: '#e9e6df', wallR: '#d2cec5', roof: '#3f5f8a', roofDark: '#304a6e', roofH: 12, window: '#9fc1de' },
  temple: { wallL: '#e6d6b8', wallR: '#cdbd9e', roof: '#4b4f55', roofDark: '#3a3d42', roofH: 11, window: '#7a3b2a' },
  wonhall: { wallL: '#f3f1ec', wallR: '#dbd8d0', roof: '#6b7f8f', roofDark: '#566775', roofH: 8, window: '#9fc1de' },
};

// 건물 벽면 위의 점: face 'S'(왼쪽 아래 면) 또는 'E'(오른쪽 아래 면), u는 면을 따라 0~1, v는 높이(px)
function facePt(b, face, u, v) {
  const C = iso(b.x + b.w, b.y + b.d);
  const p = face === 'S' ? lerp(iso(b.x, b.y + b.d), C, u) : lerp(C, iso(b.x + b.w, b.y), u);
  return up(p, v);
}

function faceRect(ctx, b, face, u1, u2, v1, v2, fill) {
  poly(ctx, [facePt(b, face, u1, v1), facePt(b, face, u2, v1), facePt(b, face, u2, v2), facePt(b, face, u1, v2)], fill);
}

function drawBox(ctx, b, st, roofType) {
  const { x, y, w, d, h } = b;
  const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);

  poly(ctx, [D, C, up(C, h), up(D, h)], st.wallL);
  poly(ctx, [C, B, up(B, h), up(C, h)], st.wallR);
  // 벽 아래 띠
  poly(ctx, [D, C, up(C, 2), up(D, 2)], 'rgba(0,0,0,.12)');
  poly(ctx, [C, B, up(B, 2), up(C, 2)], 'rgba(0,0,0,.18)');

  if (roofType === 'pyramid') {
    const apex = up(iso(x + w / 2, y + d / 2), h + st.roofH);
    poly(ctx, [up(D, h), up(C, h), apex], st.roof);
    poly(ctx, [up(C, h), up(B, h), apex], st.roofDark);
    return apex;
  }
  if (roofType === 'flat') {
    poly(ctx, [up(A, h), up(B, h), up(C, h), up(D, h)], st.roof);
    return null;
  }
  // 박공 지붕: 용마루가 x 방향
  const rh = st.roofH;
  const R1 = up(iso(x, y + d / 2), h + rh), R2 = up(iso(x + w, y + d / 2), h + rh);
  poly(ctx, [up(A, h), up(B, h), R2, R1], st.roofDark);
  poly(ctx, [up(D, h), up(C, h), R2, R1], st.roof);
  poly(ctx, [up(C, h), up(B, h), R2], st.wallR);
  // 처마 선
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.moveTo(...up(D, h)); ctx.lineTo(...up(C, h)); ctx.lineTo(...R2);
  ctx.stroke();
  return null;
}

function drawWindows(ctx, b, st, face, skipU) {
  const len = face === 'S' ? b.w : b.d;
  const n = Math.max(1, Math.floor(len));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    if (skipU !== undefined && Math.abs(u - skipU) < 0.6 / len) continue;
    const half = 0.17 / len;
    const v1 = b.h * 0.38, v2 = b.h * (st.glass ? 0.82 : 0.72);
    faceRect(ctx, b, face, u - half, u + half, v1, v2, st.window);
    if (st.glass) {
      faceRect(ctx, b, face, u - half, u + half, v2 - 3, v2, '#c9a227');
      faceRect(ctx, b, face, u - half * 0.2, u + half * 0.2, v1, v2, 'rgba(255,255,255,.35)');
    } else {
      faceRect(ctx, b, face, u - half * 0.15, u + half * 0.15, v1, v2, 'rgba(255,255,255,.6)');
    }
  }
}

function drawDoor(ctx, b, face, u, h = 13) {
  const len = face === 'S' ? b.w : b.d;
  const half = 0.26 / len;
  faceRect(ctx, b, face, u - half, u + half, 0, h, '#5a3a24');
  faceRect(ctx, b, face, u - half * 0.1, u + half * 0.1, 0, h, '#3e281a');
  faceRect(ctx, b, face, u - half - 0.02 / len, u + half + 0.02 / len, h, h + 2, '#3e281a');
}

function drawCross(ctx, p, color = '#d8b14a') {
  const x = Math.round(p[0]), y = Math.round(p[1]);
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 9, 1, 9);
  ctx.fillRect(x - 2, y - 7, 5, 1);
}

// 컨테이너 성당 (성당 Lv1~2): 낡은 컨테이너 두 개를 이어 붙이고 나무 십자가를 세웠다
function drawContainerChurch(ctx, b) {
  drawContainer(ctx, { x: b.x, y: b.y, w: b.w, d: 2, h: 13, color: 0 });
  drawContainer(ctx, { x: b.x, y: b.y + 2, w: b.w, d: b.d - 2, h: 13, color: 2 });
  // 녹슨 자국
  faceRect(ctx, { x: b.x, y: b.y + 2, w: b.w, d: b.d - 2 }, 'S', 0.05, 0.2, 2, 6, 'rgba(120,60,30,.35)');
  faceRect(ctx, { x: b.x, y: b.y + 2, w: b.w, d: b.d - 2 }, 'S', 0.7, 0.85, 8, 12, 'rgba(120,60,30,.3)');
  // 손으로 쓴 간판과 나무 십자가
  const sign = facePt({ x: b.x, y: b.y + 2, w: b.w, d: b.d - 2 }, 'S', 0.5, 15);
  ctx.fillStyle = '#f4ead2'; ctx.fillRect(Math.round(sign[0]) - 12, Math.round(sign[1]) - 4, 24, 6);
  ctx.fillStyle = '#7b2d26'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(typeof parishShort === 'function' && Game.state && Game.state.pastor ? `${parishShort()} 성당` : '솔뫼 성당', Math.round(sign[0]), Math.round(sign[1]) + 1);
  const cp = up(iso(b.x + b.w + 0.4, b.y + b.d - 0.4), 0);
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(Math.round(cp[0]), Math.round(cp[1]) - 26, 2, 26); ctx.fillRect(Math.round(cp[0]) - 4, Math.round(cp[1]) - 20, 10, 2);
}

// 가건물 성당 (성당 Lv3~4): 조립식 패널 건물에 철골 종탑
function drawPrefabChurch(ctx, b) {
  const st = BUILDING_STYLES.prefab;
  drawBox(ctx, b, st, 'gable');
  // 패널 이음새
  for (let i = 1; i < b.w * 2; i++) faceRect(ctx, b, 'S', i / (b.w * 2) - 0.002, i / (b.w * 2) + 0.002, 0, b.h, 'rgba(0,0,0,.12)');
  for (let i = 1; i < b.d * 2; i++) faceRect(ctx, b, 'E', i / (b.d * 2) - 0.003, i / (b.d * 2) + 0.003, 0, b.h, 'rgba(0,0,0,.12)');
  drawWindows(ctx, b, st, 'S', 0.5);
  drawWindows(ctx, b, st, 'E');
  drawDoor(ctx, b, 'S', 0.5, 12);
  // 철골 종탑 (앞쪽 오른편)
  const base = iso(b.x + b.w - 0.3, b.y + b.d + 0.3), bx = Math.round(base[0]), by = Math.round(base[1]);
  ctx.fillStyle = '#6b7380';
  ctx.fillRect(bx - 4, by - 34, 1, 34); ctx.fillRect(bx + 4, by - 34, 1, 34);
  for (let yy = by - 30; yy < by; yy += 8) ctx.fillRect(bx - 4, yy, 9, 1);
  ctx.fillStyle = '#c9a227'; ctx.fillRect(bx - 2, by - 31, 5, 4); // 종
  drawCross(ctx, [bx + 0.5, by - 34]);
}

function drawBuilding(ctx, b) {
  const st = BUILDING_STYLES[b.style];
  if (b.style === 'church' && b.tier === 1) { drawContainerChurch(ctx, b); drawDeco(ctx, b); return; }
  if (b.style === 'church' && b.tier === 2) { drawPrefabChurch(ctx, b); drawDeco(ctx, b); return; }
  if (b.style === 'church') {
    drawBox(ctx, b, st, 'gable');
    drawWindows(ctx, b, st, 'S', 0.5);
    drawWindows(ctx, b, st, 'E');
    // 정면 종탑
    const t = { x: b.x + b.w / 2 - 0.75, y: b.y + b.d - 1.5, w: 1.5, d: 1.5, h: b.h + st.roofH + 8 };
    const ts = BUILDING_STYLES.tower;
    const apex = drawBox(ctx, t, ts, 'pyramid');
    drawDoor(ctx, t, 'S', 0.5, 15);
    faceRect(ctx, t, 'S', 0.3, 0.7, t.h - 14, t.h - 5, '#3b3b46'); // 종 창
    poly(ctx, [facePt(t, 'S', 0.5, t.h - 18), facePt(t, 'S', 0.62, t.h - 21), facePt(t, 'S', 0.5, t.h - 24), facePt(t, 'S', 0.38, t.h - 21)], '#4a6fa5'); // 장미창
    drawCross(ctx, apex);
    drawDeco(ctx, b);
    return;
  }
  drawBox(ctx, b, st, b.roof || 'gable');
  if (b.style === 'temple') {
    // 처마 끝 연등과 붉은 기둥
    const colors = ['#e05a4f', '#f2c14e', '#7fbf6a', '#f08ab0'];
    for (let i = 0; i < 5; i++) { const p = facePt(b, 'S', 0.1 + i * 0.2, b.h - 2); ctx.fillStyle = colors[i % 4]; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]), 3, 3); }
    faceRect(ctx, b, 'S', 0.05, 0.08, 0, b.h, '#8a2f24');
    faceRect(ctx, b, 'S', 0.92, 0.95, 0, b.h, '#8a2f24');
  }
  if (b.style === 'prefab') {
    // 조립식 패널 이음새
    for (let i = 1; i < b.w * 2; i++) faceRect(ctx, b, 'S', i / (b.w * 2) - 0.003, i / (b.w * 2) + 0.003, 0, b.h, 'rgba(0,0,0,.12)');
    for (let i = 1; i < b.d * 2; i++) faceRect(ctx, b, 'E', i / (b.d * 2) - 0.004, i / (b.d * 2) + 0.004, 0, b.h, 'rgba(0,0,0,.12)');
  }
  const doorFace = b.door.side;
  if (b.floors === 2) drawSecondFloor(ctx, b, st);
  drawWindows(ctx, b, st, 'S', doorFace === 'S' ? b.door.u : undefined);
  drawWindows(ctx, b, st, 'E', doorFace === 'E' ? b.door.u : undefined);
  drawDoor(ctx, b, doorFace, b.door.u);
  if (b.cross) drawCross(ctx, up(iso(b.x + b.w / 2, b.y + b.d / 2), b.h + st.roofH + 2));
  if (b.bell) { const p = up(iso(b.x + b.w, b.y + b.d), 0), x = Math.round(p[0]) + 3, y = Math.round(p[1]); ctx.fillStyle = '#6b4a2f'; ctx.fillRect(x, y - 20, 1, 20); ctx.fillRect(x + 6, y - 20, 1, 20); ctx.fillRect(x, y - 21, 7, 2); ctx.fillStyle = '#c9a227'; ctx.fillRect(x + 2, y - 18, 3, 4); }
  drawDeco(ctx, b);
}

// 사제관·사무실 겉모습: Lv1~2 컨테이너 → Lv3~4 조립식 가건물 → Lv5~6 번듯한 집 → Lv7~8 2층 → Lv9~ 벽돌 2층
// 짝수 레벨이 되면 화분·간판 같은 꾸밈이 붙어서, 레벨이 오를 때마다 모습이 달라진다
function fixedLook(f, level) {
  const tier = Math.min(5, Math.ceil(level / 2)), deco = level % 2 === 0 ? 1 : 0;
  if (tier === 1) return { tier, style: 'container', h: 13, color: f.id === 'rectory' ? 1 : 2, oneDoor: true, deco };
  if (tier === 2) return { tier, style: 'prefab', h: 14, deco };
  if (tier === 3) return { tier, h: f.h, deco };
  if (tier === 4) return { tier, h: f.h + 9, floors: 2, deco };
  return { tier, style: 'brick', h: f.h + 11, floors: 2, deco, cross: f.id === 'rectory' };
}

// 꾸밈: 앞쪽 벽 아래 화분 (레벨이 오를 때마다 늘어남), 사무실은 간판
function drawDeco(ctx, b) {
  if (!b.deco) return;
  const colors = ['#e05a4f', '#f2c14e', '#f08ab0', '#ffffff'];
  for (const u of b.w >= 3 ? [0.12, 0.88] : [0.15]) {
    const p = facePt(b, 'S', u, 0), x = Math.round(p[0]), y = Math.round(p[1]);
    ctx.fillStyle = '#9c5a34'; ctx.fillRect(x - 2, y - 3, 5, 3);
    ctx.fillStyle = '#4b7447'; ctx.fillRect(x - 2, y - 5, 5, 2);
    ctx.fillStyle = colors[(x + y) % 4]; ctx.fillRect(x - 1, y - 6, 1, 1); ctx.fillRect(x + 1, y - 6, 1, 1);
  }
  if (b.id === 'office') { const p = facePt(b, 'S', 0.5, b.h - 2); ctx.fillStyle = '#f4ead2'; ctx.fillRect(Math.round(p[0]) - 7, Math.round(p[1]) - 1, 14, 4); ctx.fillStyle = '#5f7552'; ctx.fillRect(Math.round(p[0]) - 5, Math.round(p[1]) + 1, 10, 1); }
}

// 2층 건물: 가운데 띠와 위층 창문
function drawSecondFloor(ctx, b, st) {
  const mid = Math.round(b.h / 2);
  faceRect(ctx, b, 'S', 0, 1, mid, mid + 1, 'rgba(0,0,0,.18)');
  faceRect(ctx, b, 'E', 0, 1, mid, mid + 1, 'rgba(0,0,0,.18)');
  for (const u of [0.2, 0.5, 0.8]) faceRect(ctx, b, 'S', u - 0.07, u + 0.07, mid + 3, mid + 8, st.window);
  for (const u of [0.3, 0.7]) faceRect(ctx, b, 'E', u - 0.08, u + 0.08, mid + 3, mid + 8, st.window);
}

// ---------- 그림 파일(PNG) ----------
// assets/sprites/<이름>.png 가 있으면 그 그림을 쓰고, 없으면 코드로 그린다.
// 그림 크기는 그대로(1픽셀 = 월드 1픽셀) 쓰고, 바닥 마름모의 가운데 아래 꼭짓점에 그림 아래쪽 가운데를 맞춘다.
// 그림 파일을 바꾸면 이 숫자를 올린다 (브라우저가 예전 그림을 기억하지 않게)
const SPRITE_VER = 47;
// 그림마다 잰 바닥 자리 [너비, 높이, 왼쪽 끝, 오른쪽 끝, 앞 꼭짓점 x, y] (tools/sprite-meta.mjs)
let SPRITE_META = {};
if (typeof fetch === 'function' && typeof document !== 'undefined') fetch((typeof SPRITE_BASE !== 'undefined' ? SPRITE_BASE : '') + 'assets/sprites/meta.json?v=' + SPRITE_VER).then(r => r.json()).then(j => { SPRITE_META = j; }).catch(() => {});
const SPRITE_DIR = (typeof SPRITE_BASE !== 'undefined' ? SPRITE_BASE : '') + 'assets/sprites/';
const SPRITE_TARGETS = [
  // 겉모습 단계(tier)마다 그림 하나: 성당·사제관은 두 레벨씩, 교리실은 ROOM_LEVELS의 tier
  ...[1, 2, 3, 4, 5].map(l => ({ key: `church-lv${l}`, name: `성당 Lv${2 * l - 1}~${2 * l}`, w: 4, d: 5, ref: { style: 'church', h: 20 + l * 3 } })),
  ...[1, 2, 3, 4, 5].map(l => ({ key: `rectory-lv${l}`, name: `사제관 Lv${2 * l - 1}~${2 * l}`, w: 2, d: 2, ref: { style: 'house', h: 18 } })),
  ...[1, 2, 3, 4, 5].map(l => ({ key: `classroom-lv${l}`, name: ROOM_TIERS[l], w: 2, d: 3,
    ref: { style: l >= 3 ? (l >= 4 ? 'school' : 'brick') : 'container', roofed: l === 2, h: l >= 3 ? 12 + l * 2 : 13 } })),
  { key: 'gongso', name: '공소', w: 2, d: 2, ref: { style: 'gongso', h: 18, cross: true } },
  ...[1, 2, 3, 4, 5].map(l => ({ key: `office-lv${l}`, name: `본당 사무실 Lv${2 * l - 1}~${2 * l}`, w: 2, d: 3, ref: { style: 'office', h: 15 } })),
  { key: 'town-church', name: '이웃 교회 (개신교)', w: 3, d: 3, ref: { style: 'chapel', h: 20 } },
  { key: 'town-temple', name: '이웃 절 (운곡사)', w: 3, d: 4, ref: { style: 'temple', h: 15 } },
  { key: 'town-won', name: '원불교 교당', w: 2, d: 3, ref: { style: 'wonhall', h: 13 } },
  { key: 'town-hall', name: '마을회관', w: 2, d: 3, ref: { style: 'office', h: 14 } },
  { key: 'town-office', name: '면사무소', w: 2, d: 2, ref: { style: 'office', h: 14 } },
  { key: 'town-shop', name: '동네 가게', w: 2, d: 2, ref: { style: 'brick', h: 12 } },
  { key: 'town-house', name: '동네 집 1', w: 2, d: 2, ref: { style: 'cottage', h: 12 } },
  { key: 'town-house2', name: '동네 집 2', w: 2, d: 2, ref: { style: 'house', h: 12 } },
  { key: 'town-house3', name: '동네 집 3', w: 2, d: 2, ref: { style: 'cottage', h: 12 } },
  { key: 'house-farm', name: '윗말 농가', w: 2, d: 2, ref: { style: 'cottage', h: 13 } },
  { key: 'decor-flowerbed', fit: 0.95, name: '화단', w: 1, d: 1, ref: { statue: true } },
  { key: 'decor-maryGarden', fit: 0.95, name: '성모동산', w: 2, d: 2, ref: { statue: true } },
  { key: 'decor-stations', fit: 1, name: '야외 십자가의 길', w: 4, d: 1, ref: { statue: true } },
  { key: 'obstacle-weed', fit: 0.55, name: '잡초', w: 1, d: 1, ref: { statue: true } },
  { key: 'obstacle-weed2', fit: 0.55, name: '잡초 2', w: 1, d: 1, ref: { statue: true } },
  { key: 'obstacle-rock', fit: 0.6, name: '돌', w: 1, d: 1, ref: { statue: true } },
  { key: 'obstacle-rock2', fit: 0.65, name: '돌 2', w: 1, d: 1, ref: { statue: true } },
  { key: 'obstacle-sapling', fit: 0.6, name: '어린나무', w: 1, d: 1, ref: { tree: 0 } },
  { key: 'landhouse', name: '비신자 집 (땅 사기)', w: 2, d: 2, ref: { style: 'house', h: 13 } },
  { key: 'landhouse-believer', name: '교우 집 (땅 사기)', w: 2, d: 2, ref: { style: 'cottage', h: 13 } },
  { key: 'tile-grass', name: '바닥: 잔디', w: 1, d: 1, ref: { tile: 'grass' }, tile: true },
  { key: 'tile-grass2', name: '바닥: 잔디 2', w: 1, d: 1, ref: { tile: 'grass' }, tile: true },
  { key: 'tile-path', name: '바닥: 길', w: 1, d: 1, ref: { tile: 'path' }, tile: true },
  { key: 'tile-path2', name: '바닥: 길 2', w: 1, d: 1, ref: { tile: 'path' }, tile: true },
  { key: 'house', name: '교우 가정집', w: 2, d: 2, ref: { style: 'cottage', h: 13 } },
  { key: 'scaffold-3x2', name: '공사장 (교리실 자리)', w: 3, d: 2, ref: { scaffold: true } },
  { key: 'scaffold-2x2', name: '공사장 (공소 자리)', w: 2, d: 2, ref: { scaffold: true } },
  { key: 'tree-0', fit: 0.95, name: '활엽수', w: 1, d: 1, ref: { tree: 0 } },
  { key: 'tree-1', fit: 0.8, name: '침엽수', w: 1, d: 1, ref: { tree: 1 } },
  { key: 'statue', fit: 0.8, name: '성모상', w: 1, d: 1, ref: { statue: true } },
];

const SPRITES = {}; // key → Image(불러옴) | false(없음) | 'loading'
function getSprite(key) {
  const s = SPRITES[key];
  if (s === undefined) {
    SPRITES[key] = 'loading';
    const img = new Image();
    // 가벼운 WebP(tools/make-webp.py)를 먼저, 없으면 PNG
    img.onload = () => { SPRITES[key] = img; };
    img.onerror = () => { if (img.src.includes('.webp')) img.src = SPRITE_DIR + key + '.png?v=' + SPRITE_VER; else SPRITES[key] = false; };
    img.src = SPRITE_DIR + key + '.webp?v=' + SPRITE_VER;
    return null;
  }
  return s && s !== 'loading' ? s : null;
}

// 건물에 맞는 그림 이름 후보 (정확한 레벨 → 레벨 없는 이름)
function spriteKeys(b) {
  if (b.scaffold) { const G = (typeof MAP_GRID !== 'undefined' && World.map && World.map.grid) || 1; return [`scaffold-${Math.max(b.w, b.d) / G}x${Math.min(b.w, b.d) / G}`, 'scaffold']; }
  if (b.id === 'church') return [`church-lv${CHURCH_LEVELS[b.level] ? CHURCH_LEVELS[b.level].tier : 1}`, 'church'];
  if (b.id === 'rectory') return [`rectory-lv${Math.ceil(b.level / 2)}`, 'rectory'];
  if (b.id === 'office') return [`office-lv${Math.ceil(b.level / 2)}`, 'office'];
  if (b.rooms) return [`classroom-lv${b.tier}`, 'classroom'];
  if (b.style === 'gongso') return [`gongso-lv${Math.ceil(b.level / 2)}`, 'gongso'];
  // 이웃 동네 건물
  const TOWN = { t_church: 'town-church', t_temple: 'town-temple', t_won: 'town-won', t_hall: 'town-hall', t_h1: 'town-house', t_h2: 'town-house2', t_h3: 'town-shop', t_h4: 'town-house3', t_h5: 'town-house2', t_h6: 'town-office' };
  if (TOWN[b.id]) return [TOWN[b.id]];
  if (b.id === 'houseC' || b.id === 'houseD') return ['house-farm', 'house'];
  if (b.style === 'cottage') return [`house-${b.id}`, 'house'];
  return [];
}

// 바닥 칸 (x,y,w,d) 위에 그림을 놓는다. 그렸으면 그림 꼭대기 좌표를 돌려준다.
// v0.80: 지도를 두 배 칸으로 나눠 건물·조경 그림의 바닥 칸도 두 배 (나무·장애물·성모상·바닥 타일은 따로)
for (const t of SPRITE_TARGETS) if (!t.tile && !/^(obstacle-|tree-|statue$)/.test(t.key)) { t.w *= 2; t.d *= 2; }

// 고운 그림(HD): 픽셀 그림이 아니라 크게 만든 매끈한 그림. 바닥 칸 크기에 맞춰 줄여 부드럽게 그린다
// 지금은 그림 목록(SPRITE_TARGETS)의 그림이 모두 고운 그림이다 (예전 픽셀 그림은 assets/예전 픽셀/에 보관)
const SPRITE_HD = new Set(['map-ground', 'house', ...SPRITE_TARGETS.map(t => t.key)]);
function hdWidth(key) {
  const t = SPRITE_TARGETS.find(s => s.key === key);
  return t ? (t.w + t.d) * TW / 2 * (t.fit || (t.ref.tree !== undefined ? 0.62 : t.ref.statue ? 0.45 : 1)) : TW;
}

// ---------- 자연물(돌·풀·나무) 고운 그림: 칸마다 모습을 달리해 들판처럼 ----------
// 같은 그림도 칸 자리로 정해지는 값에 따라 좌우 뒤집기·크기·색조·칸 안 위치를 바꾸고,
// 잡초는 여러 포기를 모아 심고 돌·나무 밑에는 작은 풀포기를 곁들인다. 밑에는 바닥에 녹아드는 그림자.
function natHash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const NAT_TINTS = {
  plant: [null, ['#2f5a1e', 0.2], ['#c9b24a', 0.16], ['#6f9a2a', 0.14], ['#24442e', 0.16]],
  rock: [null, ['#7a6a55', 0.14], ['#4f6a3a', 0.12], ['#9aa0a8', 0.12]],
};
const NAT_CACHE = {};
function natSprite(key, tint) {
  const img = getSprite(key);
  if (!img || !tint) return img;
  const ck = key + tint[0] + tint[1];
  if (NAT_CACHE[ck]) return NAT_CACHE[ck];
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = tint[1]; g.fillStyle = tint[0]; g.fillRect(0, 0, c.width, c.height);
  return (NAT_CACHE[ck] = c);
}
// 화면 크기로 미리 줄여 둔 자연물 그림 (v0.89). 큰 원본을 매번 곱게 줄여 찍으면 한 번에 0.4ms라 화면이 끊겼다
// px: 화면에 찍힐 너비(캔버스 픽셀). 1.15배 간격으로 묶어 담아 둔다
const NAT_SCALED = {}; let NAT_SCALED_N = 0;
function natScaled(img, ck, px) {
  if (!img || !(px > 0) || px >= img.width * 0.8) return img;
  const step = Math.ceil(Math.log(px) / Math.log(1.15)), w = Math.max(4, Math.ceil(Math.pow(1.15, step)));
  const k = ck + '@' + w;
  if (NAT_SCALED[k]) return NAT_SCALED[k];
  if (++NAT_SCALED_N > 4000) { for (const q in NAT_SCALED) delete NAT_SCALED[q]; NAT_SCALED_N = 1; } // 확대를 여러 번 바꿔 너무 쌓이면 비운다
  // 반씩 줄여 가며 내려가야 곱게 줄어든다
  let src = img;
  while (src.width / 2 > w) {
    const t = document.createElement('canvas'); t.width = Math.ceil(src.width / 2); t.height = Math.ceil(src.height / 2);
    const g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, t.width, t.height); src = t;
  }
  const c = document.createElement('canvas'); c.width = w; c.height = Math.max(4, Math.round(img.height * w / img.width));
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  return (NAT_SCALED[k] = c);
}
// 칸 (x,y)의 한 자리(fx, fy: 칸 안 0~1)에 자연물 하나. size는 그림 기본 너비에 곱하는 값
// 자연물 모양 가짓수 (Blender로 찍은 <이름>, <이름>-v1 …, tools/blender/make-nature.py)
const NAT_VARIANTS = { 'tree-0': 6, 'tree-1': 6, 'obstacle-sapling': 4, 'obstacle-rock': 4, 'obstacle-rock2': 4, 'obstacle-weed': 4, 'obstacle-weed2': 4 };
if (typeof document !== 'undefined') setTimeout(() => { for (const [k, n] of Object.entries(NAT_VARIANTS)) for (let i = 1; i < n; i++) getSprite(`${k}-v${i}`); }, 0);
function drawNatPiece(ctx, key0, fx, fy, size, seed, tints, shadow = 0.22) {
  const r = k => natHash(seed, k, 7);
  const nv = NAT_VARIANTS[key0] || 1, vi = Math.floor(r(5) * nv), vkey = vi ? `${key0}-v${vi}` : key0;
  const key = getSprite(vkey) ? vkey : key0;
  const base = getSprite(key);
  if (!base) return false;
  const tint = tints[Math.floor(r(1) * tints.length)];
  const flip = r(2) < 0.5;
  const iw = hdWidth(key0) * size, ih = base.height * iw / base.width;
  const img = natScaled(natSprite(key, tint), key + (tint ? tint[0] + tint[1] : ''), iw * Math.abs(ctx.getTransform().a));
  const [cx, by] = iso(fx, fy);
  if (shadow) {
    // 가장자리로 갈수록 옅어지는 그림자 (바닥에 녹아들게)
    ctx.save(); ctx.translate(cx, by); ctx.scale(1, 0.38);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, iw * 0.46);
    g.addColorStop(0, `rgba(30,52,14,${shadow})`); g.addColorStop(1, 'rgba(30,52,14,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, iw * 0.46, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (flip) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(img, -iw / 2, by - ih, iw, ih); ctx.restore(); }
  else ctx.drawImage(img, cx - iw / 2, by - ih, iw, ih);
  ctx.imageSmoothingEnabled = false;
  return true;
}
// 작은 풀포기 몇 개 (돌·나무 곁, 잡초 덤불)
function natTufts(x, y, seed, n, size) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = natHash(seed, 40 + i, 3) * Math.PI * 2, d = 0.22 + natHash(seed, 50 + i, 3) * 0.2;
    out.push({ key: natHash(seed, 60 + i, 3) < 0.55 ? 'obstacle-weed' : 'obstacle-weed2', fx: x + 0.5 + Math.cos(a) * d, fy: y + 0.5 + Math.sin(a) * d,
      size: size * (0.8 + natHash(seed, 70 + i, 3) * 0.4), seed: seed * 31 + i, tints: NAT_TINTS.plant, shadow: 0.14 });
  }
  return out;
}
function drawNatGroup(ctx, pieces) {
  pieces.sort((a, b) => a.fx + a.fy - (b.fx + b.fy));
  let any = false;
  for (const p of pieces) any = drawNatPiece(ctx, p.key, p.fx, p.fy, p.size, p.seed, p.tints, p.shadow) || any;
  return any;
}
function drawNature(ctx, kind, x, y, s = 1) {
  // s×s 칸: 나무는 s배 크게, 잡초·돌·어린나무는 칸마다 덤불을 나눠 심는다
  if (s > 1 && !kind.startsWith('tree-')) {
    let any = false;
    for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) if (natHash(x + i, y + j, 77) < 0.6 || (i === 0 && j === 0)) any = drawNature(ctx, kind, x + i, y + j, 1) || any;
    return any;
  }
  if (s > 1) return drawNatGroup(ctx, [{ key: kind, fx: x + s / 2 + (natHash(x, y, 2) - 0.5) * 0.3, fy: y + s * 0.62, size: s * (0.95 + natHash(x, y, 5) * 0.3), seed: Math.floor(natHash(x, y, 1) * 1e6), tints: NAT_TINTS.plant, shadow: 0.26 },
    ...natTufts(x + (s - 1) / 2, y + (s - 1) / 2, Math.floor(natHash(x, y, 1) * 1e6), Math.floor(natHash(x, y, 7) * 4), 0.36)]);
  const seed = Math.floor(natHash(x, y, 1) * 1e6), r = k => natHash(x, y, k);
  const jx = (r(2) - 0.5) * 0.24, jy = (r(3) - 0.5) * 0.24;
  let pieces;
  if (kind === 'weed') {
    // 잡초 덤불: 두세 포기를 모아 심는다
    const n = 2 + (r(4) < 0.5 ? 1 : 0);
    pieces = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n + r(5)) * Math.PI * 2, d = n === 1 ? 0 : 0.16 + r(10 + i) * 0.1;
      pieces.push({ key: r(20 + i) < 0.5 ? 'obstacle-weed' : 'obstacle-weed2', fx: x + 0.5 + jx + Math.cos(a) * d, fy: y + 0.55 + jy + Math.sin(a) * d,
        size: 0.6 + r(30 + i) * 0.25, seed: seed + i, tints: NAT_TINTS.plant });
    }
  } else if (kind === 'rock') {
    pieces = [{ key: r(4) < 0.5 ? 'obstacle-rock' : 'obstacle-rock2', fx: x + 0.5 + jx, fy: y + 0.62 + jy, size: 0.82 + r(5) * 0.3, seed, tints: NAT_TINTS.rock, shadow: 0.28 },
      ...natTufts(x, y, seed, r(6) < 0.6 ? 1 + Math.floor(r(7) * 2) : 0, 0.38)];
  } else if (kind === 'sapling') {
    pieces = [{ key: 'obstacle-sapling', fx: x + 0.5 + jx, fy: y + 0.6 + jy, size: 0.85 + r(5) * 0.3, seed, tints: NAT_TINTS.plant },
      ...natTufts(x, y, seed, 1 + Math.floor(r(7) * 2), 0.36)];
  } else {
    pieces = [{ key: kind, fx: x + 0.5 + jx * 0.6, fy: y + 0.62 + jy * 0.6, size: 0.85 + r(5) * 0.32, seed, tints: NAT_TINTS.plant, shadow: 0.26 },
      ...natTufts(x, y, seed, Math.floor(r(7) * 3), 0.34)];
  }
  return drawNatGroup(ctx, pieces);
}

// rot: 방향별 그림(<이름>@1~3)이 있으면 그것을, 없으면 옆 방향(1·3)은 기본 그림을 좌우로 뒤집어 그린다
// 건물 그림을 바닥 칸에 맞춰 휘어 담아 둔다 (v0.85). 반환: { c: 캔버스, ox·oy: 캔버스 안 앞 꼭짓점 자리 } (월드 단위)
const WARP_S = 4, WARP_CACHE = {};
function warpSprite(img, mt, w, d, key) {
  const ck = `${key}|${w}|${d}|${TH}|${img.width}`;
  if (WARP_CACHE[ck] !== undefined) return WARP_CACHE[ck];
  const [, , lx, rx, bx, mby, sl, sr] = mt;
  const A = Math.max(1, bx - lx), B = Math.max(1, rx - bx), WL = w * TW / 2, WR = d * TW / 2;
  const b = Math.min(A, B) * 0.6; // 배율이 바뀌는 띠 (앞 모서리 양옆)
  // 양 끝이 칸 꼭짓점에 정확히 오도록 pL, pR을 푼다: pL*A + b/4*(pR-pL) = WL, pR*B - b/4*(pR-pL) = WR
  const a11 = A - b / 4, a12 = b / 4, a21 = b / 4, a22 = B - b / 4, det = a11 * a22 - a12 * a21;
  const pL = (WL * a22 - a12 * WR) / det, pR = (a11 * WR - a21 * WL) / det;
  const ky = TH / TW * (WL / A + WR / B) / (sl + sr), q = WL * (TH / TW) / A - ky * sl;
  const pp = (WL + WR) / (A + B);
  if (!(pL > 0 && pR > 0) || pL / pR < 0.55 || pL / pR > 1.8 || ky / pp < 0.75 || ky / pp > 1.35) return (WARP_CACHE[ck] = null);
  const pAt = x => x <= bx - b ? pL : x >= bx + b ? pR : pL + (pR - pL) * (x - (bx - b)) / (2 * b);
  // X(x): 앞 꼭짓점 기준 가로 자리 (pAt을 적분)
  const N = 64, xs = [], X = [];
  for (let i = 0; i <= N; i++) xs.push(lx + (rx - lx) * i / N);
  X.push(-WL);
  for (let i = 1; i <= N; i++) { const xm = (xs[i - 1] + xs[i]) / 2; X.push(X[i - 1] + pAt(xm) * (xs[i] - xs[i - 1])); }
  // 캔버스 크기 (월드 단위 × WARP_S): 가로 = 칸 폭, 세로 = 그림 높이
  const yTop = Math.min(0, q * (0 - bx) - ky * mby, q * (img.width - bx) - ky * mby) - 4;
  const yBot = Math.max(q * (lx - bx) + ky * (img.height - mby), q * (rx - bx) + ky * (img.height - mby), 4) + 4;
  const c = document.createElement('canvas');
  c.width = Math.ceil((WL + WR + 8) * WARP_S); c.height = Math.ceil((yBot - yTop) * WARP_S);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const ox = WL + 4, oy = -yTop;
  for (let i = 0; i < N; i++) {
    const x0 = xs[i], x1 = xs[i + 1], p = (X[i + 1] - X[i]) / (x1 - x0);
    g.save();
    g.setTransform(WARP_S, 0, 0, WARP_S, 0, 0);
    g.beginPath(); g.rect(ox + X[i] - 0.05, 0, X[i + 1] - X[i] + 0.1, c.height / WARP_S); g.clip();
    // 원본 (x, y) → 화면 (ox + X[i] + p*(x - x0), oy + q*(x - bx) + ky*(y - mby))
    g.transform(p, q, 0, ky, ox + X[i] - p * x0, oy - q * bx - ky * mby);
    g.drawImage(img, 0, 0);
    g.restore();
  }
  return (WARP_CACHE[ck] = { c, ox, oy });
}
function drawSpriteAt(ctx, keys, x, y, w, d, rot = 0) {
  for (const k0 of keys) {
    const turned = rot ? getSprite(`${k0}@${rot}`) : null, k = k0, img = turned || getSprite(k);
    if (!img) continue;
    const flip = !turned && rot % 2 === 1;
    if (flip) { const cx0 = (iso(x, y + d)[0] + iso(x + w, y)[0]) / 2; ctx.save(); ctx.translate(cx0 * 2, 0); ctx.scale(-1, 1); const r = drawSpriteAt(ctx, [k], x, y, w, d, 0); ctx.restore(); return r; }
    const cx = Math.round((iso(x, y + d)[0] + iso(x + w, y)[0]) / 2);
    const by = Math.round(iso(x + w, y + d)[1]);
    if (SPRITE_HD.has(k)) {
      let iw = hdWidth(k), ih = img.height * iw / img.width, x0 = cx - iw / 2, y0 = by - ih;
      // 잰 바닥 자리가 있으면: 그림 속 바닥 마름모의 두 변을 칸의 두 변 길이에 맞춰 크기를 정하고,
      // 앞 꼭짓점을 칸의 앞 꼭짓점에 붙인다 (늘이거나 찌그러뜨리지 않는다)
      const mt = SPRITE_META[turned ? `${k0}@${rot}` : k];
      if (mt && mt[0] === img.width && mt[6] && mt[7]) {
        // v0.84: 그림 전체를 하나의 변환으로 (지붕이 꺾이지 않게). 가로 배율은 양쪽 벽 평균, 세로 배율·비스듬히 밀기는
        // 두 바닥 변의 기울기가 칸과 같아지는 값. 앞 모서리는 칸의 앞 꼭짓점에, 세로선은 곧게
        const [, , lx, rx, bx, mby, sl, sr] = mt, [fx, fy] = iso(x + w, y + d);
        const A = Math.max(1, bx - lx), B = Math.max(1, rx - bx), pp = (w * TW / 2 + d * TW / 2) / (A + B);
        const ky = 2 * pp * (TH / TW) / (sl + sr), q = 0;
        // v0.85: 왼쪽 벽·오른쪽 벽을 각각 칸 길이에 정확히 맞춘다. 앞 모서리 둘레에서 배율이 부드럽게 바뀌게(가는 세로 띠로 나눠 그림)
        // 지붕선이 꺾이지 않고 살짝 휘기만 한다. 한 번 만든 그림은 담아 두고 다시 쓴다
        const warped = warpSprite(img, mt, w, d, k0 + (turned ? '@' + rot : ''));
        if (warped) {
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(warped.c, fx - warped.ox, fy - warped.oy, warped.c.width / WARP_S, warped.c.height / WARP_S);
          ctx.imageSmoothingEnabled = false;
          return [cx, fy - warped.oy];
        }
        if (ky / pp > 0.82 && ky / pp < 1.22) {
          ctx.save();
          // 가로 자리는 그림의 왼쪽 끝·오른쪽 끝을 칸의 왼쪽·오른쪽 꼭짓점에 맞춘다 (그림이 한쪽으로 치우쳐 그려져도 지붕 꼭대기가 칸 가운데에)
          const lcx = iso(x, y + d)[0], rcx = iso(x + w, y)[0], ex = (lcx + rcx) / 2 - pp * (lx + rx) / 2;
          ctx.transform(pp, q, 0, ky, ex, fy - q * bx - ky * mby);
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0);
          ctx.restore();
          ctx.imageSmoothingEnabled = false;
          return [cx, fy - ky * mby];
        }
      }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x0, y0, iw, ih);
      ctx.imageSmoothingEnabled = false;
      return [cx, y0];
    }
    ctx.drawImage(img, cx - Math.floor(img.width / 2), by - img.height);
    return [cx, by - img.height];
  }
  return null;
}

// 건물 하나: 그림이 있으면 그림, 없으면 지금까지처럼 코드로
// 조경: 화단·성모상·성모동산·야외 십자가의 길
function drawDecor(ctx, b) {
  const t = b.decor;
  if (drawSpriteAt(ctx, [`decor-${t}`], b.x, b.y, b.w, b.d, b.rot || 0)) return;
  if (t === 'statue') { drawStatue(ctx, b.x, b.y); return; }
  if (t === 'parking') { drawParking(ctx, b); return; }
  if (t === 'flowerbed') {
    const [cx, cy] = iso(b.x + 0.5, b.y + 0.5), x = Math.round(cx), y = Math.round(cy);
    poly(ctx, [[x - 7, y], [x, y - 3.5], [x + 7, y], [x, y + 3.5]], '#8a5a34', '#6b4a2f');
    const cols = ['#e05a4f', '#f2c14e', '#f08ab0', '#ffffff', '#9c6ad1'];
    [[-4, 0], [-1, -2], [2, 0], [5, -1], [0, 2], [-2, 1], [3, 2]].forEach(([dx, dy], i) => { ctx.fillStyle = '#4b7447'; ctx.fillRect(x + dx, y + dy - 2, 1, 2); ctx.fillStyle = cols[i % 5]; ctx.fillRect(x + dx - 1, y + dy - 4, 2, 2); });
    return;
  }
  if (t === 'maryGarden') {
    const A = iso(b.x, b.y), B = iso(b.x + 2, b.y), C = iso(b.x + 2, b.y + 2), Dd = iso(b.x, b.y + 2);
    poly(ctx, [A, B, C, Dd], '#6f9e57', '#4b7447');
    // 돌로 쌓은 작은 동굴
    const [gx0, gy0] = iso(b.x + 1, b.y + 0.7), gx = Math.round(gx0), gy = Math.round(gy0);
    ctx.fillStyle = '#8f8a80'; ctx.beginPath(); ctx.ellipse(gx, gy - 6, 11, 12, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(gx - 11, gy - 6, 22, 6);
    ctx.fillStyle = '#a9a398'; for (const [dx, dy] of [[-8, -10], [-3, -15], [4, -14], [8, -8], [-10, -3], [9, -2]]) ctx.fillRect(gx + dx, gy + dy, 4, 3);
    ctx.fillStyle = '#3d3a35'; ctx.beginPath(); ctx.ellipse(gx, gy - 3, 6, 8, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(gx - 6, gy - 3, 12, 3);
    // 성모님
    ctx.fillStyle = '#e8eef5'; ctx.fillRect(gx - 2, gy - 10, 4, 9); ctx.fillStyle = '#7fa6d1'; ctx.fillRect(gx - 2, gy - 8, 4, 6); ctx.fillStyle = '#f0dcc4'; ctx.fillRect(gx - 1, gy - 12, 3, 3);
    // 앞의 꽃과 초
    const [fx0, fy0] = iso(b.x + 1.2, b.y + 1.4), fx = Math.round(fx0), fy = Math.round(fy0);
    const cols = ['#f2c14e', '#f08ab0', '#ffffff', '#e05a4f'];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(fx - 9 + i * 3, fy - 1 + (i % 2), 2, 2); }
    for (const dx of [-4, 4]) { ctx.fillStyle = '#f4ead2'; ctx.fillRect(fx + dx, fy - 7, 1, 4); ctx.fillStyle = '#f2a33a'; ctx.fillRect(fx + dx, fy - 8, 1, 1); }
    return;
  }
  if (t === 'stations') {
    // 자갈길 위에 십자가 기둥 (14처를 줄여서), 끝에 큰 십자가
    for (let i = 0; i < b.w; i++) poly(ctx, [iso(b.x + i, b.y), iso(b.x + i + 1, b.y), iso(b.x + i + 1, b.y + 1), iso(b.x + i, b.y + 1)], '#cbbd9e', '#b0a283');
    for (let i = 0; i < 7; i++) {
      const [px0, py0] = iso(b.x + 0.3 + i * 0.5, b.y + 0.2), px = Math.round(px0), py = Math.round(py0);
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(px, py - 7, 1, 7); ctx.fillRect(px - 1, py - 6, 3, 1);
    }
    const [ex0, ey0] = iso(b.x + b.w - 0.4, b.y + 0.6), ex = Math.round(ex0), ey = Math.round(ey0);
    ctx.fillStyle = '#5a3d26'; ctx.fillRect(ex, ey - 18, 2, 18); ctx.fillRect(ex - 4, ey - 14, 10, 2);
  }
}

function drawBuildingAny(ctx, b) {
  if (b.decor) { drawDecor(ctx, b); return; }
  const top = drawSpriteAt(ctx, spriteKeys(b), b.x, b.y, b.w, b.d, b.rot || 0);
  b.spriteTop = top;
  if (top) return;
  if (b.scaffold) drawScaffold(ctx, b);
  else if (b.style === 'container') drawContainer(ctx, b);
  else drawBuilding(ctx, b);
}

// ---------- 짓기 관련 ----------

// 빈 땅: 흙 바닥과 작은 팻말
function drawPlot(ctx, pl, highlight) {
  for (let x = pl.x; x < pl.x + 3; x++) for (let y = pl.y; y < pl.y + 3; y++) drawTile(ctx, x, y, 'dirt');
  const edge = [iso(pl.x, pl.y), iso(pl.x + 3, pl.y), iso(pl.x + 3, pl.y + 3), iso(pl.x, pl.y + 3)];
  poly(ctx, edge, highlight ? 'rgba(242,193,78,.35)' : 'rgba(0,0,0,0)', highlight ? '#f2c14e' : 'rgba(90,60,30,.35)');
  const [sx0, sy0] = iso(pl.x + 2.6, pl.y + 2.6);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(sx, sy - 10, 1, 10);
  ctx.fillStyle = pl.gongsoOnly ? '#f4f1ea' : '#d9b77a';
  ctx.fillRect(sx - 5, sy - 14, 11, 6);
  ctx.fillStyle = pl.gongsoOnly ? '#9c3d2c' : '#6b4a2f';
  if (pl.gongsoOnly) { ctx.fillRect(sx, sy - 13, 1, 4); ctx.fillRect(sx - 1, sy - 12, 3, 1); }
  else { ctx.fillRect(sx - 3, sy - 11, 7, 1); }
}

// 컨테이너 교리실: 골판 철판 벽과 평평한 지붕
const CONTAINER_COLORS = [
  { L: '#4f7fa8', R: '#3f6788', roof: '#9fb6c9' },
  { L: '#5f8f5a', R: '#4b7447', roof: '#a9c3a3' },
  { L: '#b5683f', R: '#945432', roof: '#d1ae96' },
];

function drawContainer(ctx, b) {
  const c = CONTAINER_COLORS[b.color || 0];
  const { x, y, w, d, h } = b;
  const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);
  poly(ctx, [D, C, up(C, h), up(D, h)], c.L);
  poly(ctx, [C, B, up(B, h), up(C, h)], c.R);
  poly(ctx, [up(A, h), up(B, h), up(C, h), up(D, h)], c.roof);
  // 골판 무늬
  ctx.strokeStyle = 'rgba(0,0,0,.14)';
  ctx.lineWidth = 1;
  for (let i = 1; i < w * 4; i++) {
    const p = lerp(D, C, i / (w * 4));
    ctx.beginPath(); ctx.moveTo(Math.round(p[0]) + 0.5, Math.round(p[1])); ctx.lineTo(Math.round(p[0]) + 0.5, Math.round(p[1] - h)); ctx.stroke();
  }
  for (let i = 1; i < d * 4; i++) {
    const p = lerp(C, B, i / (d * 4));
    ctx.beginPath(); ctx.moveTo(Math.round(p[0]) + 0.5, Math.round(p[1])); ctx.lineTo(Math.round(p[0]) + 0.5, Math.round(p[1] - h)); ctx.stroke();
  }
  if (b.oneDoor) {
    // 사제관·사무실 컨테이너: 문 하나, 창문 둘
    faceRect(ctx, b, 'S', 0.42, 0.58, 0, 10, '#e9e4d8');
    faceRect(ctx, b, 'S', 0.12, 0.3, 5, 10, '#cfe0ec');
    faceRect(ctx, b, 'S', 0.7, 0.88, 5, 10, '#cfe0ec');
  } else {
    // 방 두 칸: 문 두 개와 창문
    faceRect(ctx, b, 'S', 0.14, 0.3, 0, 10, '#e9e4d8');
    faceRect(ctx, b, 'S', 0.64, 0.8, 0, 10, '#e9e4d8');
    faceRect(ctx, b, 'S', 0.36, 0.56, 5, 10, '#cfe0ec');
    faceRect(ctx, b, 'S', 0.86, 0.96, 5, 10, '#cfe0ec');
    faceRect(ctx, b, 'S', 0.495, 0.505, 0, h, 'rgba(0,0,0,.25)');
  }
  faceRect(ctx, b, 'E', 0.3, 0.7, 5, 10, '#cfe0ec');
  poly(ctx, [D, C, up(C, 2), up(D, 2)], 'rgba(0,0,0,.18)');
  // 조립식 교리실: 컨테이너 위에 얹은 박공 지붕
  if (b.roofed) {
    const rh = 7, o = 0.15;
    const A2 = up(iso(x - o, y - o), h), B2 = up(iso(x + w + o, y - o), h), C2 = up(iso(x + w + o, y + d + o), h), D2 = up(iso(x - o, y + d + o), h);
    const R1 = up(iso(x - o, y + d / 2), h + rh), R2 = up(iso(x + w + o, y + d / 2), h + rh);
    poly(ctx, [A2, B2, R2, R1], '#5d6b78');
    poly(ctx, [D2, C2, R2, R1], '#74838f');
    poly(ctx, [C2, B2, R2], c.R);
  }
  drawDeco(ctx, b);
}

// 잠긴 마을 이름표
function drawFogLabel(ctx, x, y, text) {
  const [sx0, sy0] = iso(x, y);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  // 멀리 볼수록 글자를 키워 화면에서 읽기 좋은 크기로
  const k = typeof World !== 'undefined' && World.scale ? Math.max(1, 1.5 / World.scale) : 1;
  ctx.font = `bold ${8 * k}px sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 10 * k;
  ctx.fillStyle = 'rgba(43,36,32,.75)';
  ctx.fillRect(sx - w / 2, sy - 9 * k, w, 13 * k);
  ctx.fillStyle = '#f6f1e7';
  ctx.textAlign = 'center';
  ctx.fillText(text, sx, sy);
}

// 첫 공사 중: 비계와 자재
function drawScaffold(ctx, b) {
  const { x, y, w, d } = b;
  const h = 12;
  const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);
  poly(ctx, [A, B, C, D], '#a88a5c');
  poly(ctx, [D, C, up(C, 5), up(D, 5)], '#c9a46a');
  poly(ctx, [C, B, up(B, 5), up(C, 5)], '#b08d58');
  ctx.strokeStyle = '#7a5a34';
  ctx.lineWidth = 1;
  for (const p of [A, B, C, D]) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - h - 4); ctx.stroke(); }
  ctx.beginPath();
  ctx.moveTo(...up(D, h)); ctx.lineTo(...up(C, h)); ctx.lineTo(...up(B, h));
  ctx.moveTo(...up(D, 3)); ctx.lineTo(...up(C, h)); ctx.moveTo(...up(C, 3)); ctx.lineTo(...up(B, h));
  ctx.stroke();
}

// 건물 위 레벨 표시
function buildingTop(b) {
  if (b.spriteTop) return [b.spriteTop[0], b.spriteTop[1] - 2];
  const st = BUILDING_STYLES[b.style] || { roofH: 8 };
  const extra = b.style === 'church' ? (b.tier === 1 ? 18 : b.tier === 2 ? 22 : st.roofH + 16) : st.roofH;
  return up(iso(b.x + b.w / 2, b.y + b.d / 2), b.h + extra + 4);
}

function drawBadge(ctx, b, text) {
  const [sx0, sy0] = buildingTop(b);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  ctx.font = 'bold 7px sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 4;
  ctx.fillStyle = 'rgba(43,36,32,.8)';
  ctx.fillRect(sx - Math.floor(w / 2), sy - 7, w, 8);
  ctx.fillStyle = '#f2c14e';
  ctx.textAlign = 'center';
  ctx.fillText(text, sx, sy - 1);
}

// 일꾼: 망치질 (frame 0·1 번갈아)
function drawWorker(ctx, x, y, dir, t, working, look = 'worker') {
  const [sx, sy] = iso(x, y);
  const hit = working && Math.floor(t * 4) % 2 === 0;
  drawCharacter(ctx, sx, sy, look, dir, 0, false);
  if (!working) return;
  // 망치
  const hx = Math.round(sx) + (dir === 'left' ? -6 : 5), hy = Math.round(sy) - (hit ? 9 : 14);
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(hx, hy, 1, 5);
  ctx.fillStyle = '#8a8f98'; ctx.fillRect(hx - 1, hy - 1, 3, 2);
  if (hit) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(hx + (dir === 'left' ? -3 : 3), hy + 5, 2, 1); }
}

// 쌓인 것 아이콘: 건물 위 동그란 💰/👥 아이콘과 숫자. k = 확대가 작아도 화면에서 같은 크기로 보이게 하는 배율
// 그린 자리(월드 픽셀)를 돌려준다
function drawStashBubble(ctx, b, st, full, t, k = 1) {
  const [sx0, sy0] = buildingTop(b);
  const bob = Math.sin(t * 3 + b.x) * 1.5;
  const icon = st.offering >= 1 ? '💰' : '👥';
  const count = st.offering >= 1 ? Math.floor(st.offering) : Math.floor(st.members);
  const r = 13 * k, cx = Math.round(sx0), cy = Math.round(sy0 - 14 * k - r + bob * k);
  const blink = full && Math.floor(t * 3) % 2 === 0;
  // 꼬리
  poly(ctx, [[cx - 3 * k, cy + r - 2 * k], [cx + 3 * k, cy + r - 2 * k], [cx, cy + r + 5 * k]], '#2b2420');
  ctx.fillStyle = '#2b2420';
  ctx.beginPath(); ctx.arc(cx, cy, r + 1.2 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blink ? '#f2c14e' : full ? '#ffe9a6' : '#fffdf6';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(16 * k)}px sans-serif`;
  ctx.fillText(icon, cx, cy + 6 * k);
  // 숫자 띠
  ctx.font = `bold ${Math.round(9 * k)}px sans-serif`;
  const label = String(count) + (st.offering >= 1 && st.members >= 1 ? ` +${Math.floor(st.members)}👥` : '');
  const w = Math.ceil(ctx.measureText(label).width) + 6 * k;
  ctx.fillStyle = '#2f9e55';
  ctx.fillRect(Math.round(cx - w / 2), Math.round(cy + r - 4 * k), Math.round(w), Math.round(11 * k));
  ctx.fillStyle = '#fff';
  ctx.fillText(label, cx, Math.round(cy + r + 4.5 * k));
  return { x: cx - Math.max(r, w / 2) - 2 * k, y: cy - r - 2 * k, w: Math.max(2 * r, w) + 4 * k, h: 2 * r + 14 * k };
}

// 미사 시간 알림: 성당 위에 흔들리는 종 + '주일미사' 띠 (v0.75)
function drawMassBubble(ctx, b, mc, t, k = 1, dx = 0) {
  const [sx1, sy0] = buildingTop(b), sx0 = sx1 + dx;
  const bob = Math.sin(t * 3) * 1.5, swing = Math.sin(t * 6) * 0.25;
  const r = 14 * k, cx = Math.round(sx0), cy = Math.round(sy0 - 16 * k - r + bob * k);
  poly(ctx, [[cx - 3 * k, cy + r - 2 * k], [cx + 3 * k, cy + r - 2 * k], [cx, cy + r + 5 * k]], '#7b2d26');
  ctx.fillStyle = '#7b2d26'; ctx.beginPath(); ctx.arc(cx, cy, r + 1.5 * k, 0, Math.PI * 2); ctx.fill();
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = mc.ready ? `rgb(255, ${Math.round(226 + 20 * pulse)}, ${Math.round(140 + 60 * pulse)})` : '#f3ece0';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(cx, cy - 2 * k); ctx.rotate(swing);
  ctx.textAlign = 'center'; ctx.font = `${Math.round(17 * k)}px sans-serif`; ctx.fillText('🔔', 0, 7 * k);
  ctx.restore();
  ctx.font = `bold ${Math.round(9 * k)}px sans-serif`; ctx.textAlign = 'center';
  const label = `${mc.icon} ${mc.text}`, w = Math.ceil(ctx.measureText(label).width) + 8 * k;
  ctx.fillStyle = '#7b2d26';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - w / 2, cy + r - 3 * k, w, 12 * k, 6 * k) : ctx.rect(cx - w / 2, cy + r - 3 * k, w, 12 * k); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(label, cx, cy + r + 6 * k);
  return { x: cx - Math.max(r, w / 2) - 2 * k, y: cy - r - 2 * k, w: Math.max(2 * r, w) + 4 * k, h: 2 * r + 16 * k };
}

// ---------- 본당 땅 울타리 (v0.70) ----------
// e: 땅 칸 사이의 한 변 {ax, ay, bx, by}. 레벨마다 다른 울타리를 그 변 위에 세운다
function drawFenceEdge(ctx, lv, e) {
  const A = iso(e.ax, e.ay), B = iso(e.bx, e.by), alongX = e.ay === e.by;
  const at = t => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  const up = (p, h) => [p[0], p[1] - h];
  const shade = (c, k) => alongX ? c : k; // 오른쪽 아래를 보는 변은 조금 어둡게
  const face = (h, fill, h0 = 0) => poly(ctx, [up(A, h0), up(B, h0), up(B, h), up(A, h)], fill);
  const line = (p, q, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
  const post = (p, h, w, c, top) => { ctx.fillStyle = c; ctx.fillRect(p[0] - w / 2, p[1] - h, w, h); if (top) { ctx.fillStyle = top; ctx.fillRect(p[0] - w / 2 - 0.3, p[1] - h - 0.8, w + 0.6, 1); } };
  ctx.save();
  if (lv === 1) {
    // 나무 말뚝 + 가로대 두 줄
    for (const h of [2.6, 5]) line(up(A, h), up(B, h), 0.9, shade('#8a5f38', '#6e4a2a'));
    for (const t of [0, 0.5]) post(at(t), 6.5, 1.2, '#6b4a2f');
  } else if (lv === 2) {
    // 하얀 나무 울타리: 촘촘한 살 + 가로대
    for (const h of [2, 4.4]) line(up(A, h), up(B, h), 0.8, shade('#e9e4da', '#cfc8ba'));
    for (let i = 0; i < 6; i++) { const p = at(i / 6 + 1 / 12); ctx.fillStyle = shade('#f7f4ee', '#ddd6c8'); ctx.beginPath(); ctx.moveTo(p[0] - 0.7, p[1]); ctx.lineTo(p[0] - 0.7, p[1] - 5.2); ctx.lineTo(p[0], p[1] - 6.2); ctx.lineTo(p[0] + 0.7, p[1] - 5.2); ctx.lineTo(p[0] + 0.7, p[1]); ctx.fill(); }
  } else if (lv === 3) {
    // 돌담: 낮은 담에 돌 무늬
    face(4.6, shade('#a39d90', '#8c867a'));
    face(5.2, shade('#bdb7aa', '#a8a295'), 4.6);
    for (let i = 0; i < 5; i++) for (let r = 0; r < 2; r++) { const p = at((i + (r ? 0.5 : 0.1)) / 5); ctx.fillStyle = (i + r) % 2 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(p[0] + 1.2, p[1] - 1.3 - r * 2, 1.4, 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (lv === 4) {
    // 벽돌 담장: 붉은 벽에 줄눈, 위에 갓돌, 모서리 기둥
    face(6, shade('#b4553c', '#97452f'));
    for (const h of [1.5, 3, 4.5]) line(up(A, h), up(B, h), 0.35, 'rgba(240,220,190,.55)');
    face(7, shade('#e2d3b6', '#cbbd9f'), 6);
    post(A, 8.2, 2.4, shade('#a24a33', '#8a3d29'), '#e8dabd');
  } else {
    // 철제 울타리: 벽돌 기둥 사이에 검은 철살, 금빛 끝장식
    face(1.6, shade('#b4553c', '#97452f'));
    line(up(A, 6.4), up(B, 6.4), 0.7, '#26262b');
    line(up(A, 2.2), up(B, 2.2), 0.7, '#26262b');
    for (let i = 1; i < 7; i++) { const p = at(i / 7); line(up(p, 1.6), up(p, 7.2), 0.55, '#2b2b31'); ctx.fillStyle = '#e0b84a'; ctx.beginPath(); ctx.moveTo(p[0], p[1] - 8.2); ctx.lineTo(p[0] - 0.6, p[1] - 7.1); ctx.lineTo(p[0] + 0.6, p[1] - 7.1); ctx.fill(); }
    post(A, 9, 2.6, shade('#a24a33', '#8a3d29'), '#e8dabd');
  }
  ctx.restore();
}

// ---------- 주차장 (v0.70): 포장한 바닥에 주차선, 차 두어 대 ----------
function drawParking(ctx, b) {
  if (drawSpriteAt(ctx, ['decor-parking'], b.x, b.y, b.w, b.d, b.rot || 0)) return;
  const q = (x, y) => iso(b.x + x, b.y + y);
  poly(ctx, [q(0, 0), q(b.w, 0), q(b.w, b.d), q(0, b.d)], '#c9c3b6');
  poly(ctx, [q(0.12, 0.12), q(b.w - 0.12, 0.12), q(b.w - 0.12, b.d - 0.12), q(0.12, b.d - 0.12)], '#5b5e64');
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.6;
  for (let i = 1; i < b.w; i++) { const p = q(i, 0.15), r = q(i, 0.85); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(r[0], r[1]); ctx.stroke(); }
  // 차: 칸 자리로 정해지는 색, 두어 칸에만
  const cols = ['#c0392b', '#f2f2f2', '#2c3e50', '#3a7bd5', '#d4a017'];
  for (let i = 0; i < b.w; i++) {
    if (natHash(b.x + i, b.y, 9) < 0.35) continue;
    const c = cols[Math.floor(natHash(b.x, b.y + i, 4) * cols.length)];
    const box = (x0, y0, x1, y1, h0, h1, top, side, front) => {
      const P = (x, y, h) => { const [sx, sy] = q(x, y); return [sx, sy - h]; };
      poly(ctx, [P(x0, y1, h0), P(x1, y1, h0), P(x1, y1, h1), P(x0, y1, h1)], front);
      poly(ctx, [P(x1, y0, h0), P(x1, y1, h0), P(x1, y1, h1), P(x1, y0, h1)], side);
      poly(ctx, [P(x0, y0, h1), P(x1, y0, h1), P(x1, y1, h1), P(x0, y1, h1)], top);
    };
    box(i + 0.2, 0.22, i + 0.8, 0.9, 0.6, 3.4, c, shadeCol(c, -0.25), shadeCol(c, -0.12));
    box(i + 0.28, 0.4, i + 0.72, 0.72, 3.4, 5.6, '#cfe3f2', '#8aa6bb', '#a9c4d8');
  }
}
function shadeCol(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v : 255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---------- 빈터의 장애물 ----------
function drawObstacle(ctx, o, t) {
  if (o.type === 'house') { drawLandHouse(ctx, o); return; }
  if (o.type === 'tree') { drawTree(ctx, o.x, o.y, o.treeKind, o.w); return; }
  // 그림이 있으면 그림 (같은 종류는 위치에 따라 두 가지를 섞는다)
  if (SPRITE_HD.has(`obstacle-${o.type}`) && drawNature(ctx, o.type, o.x, o.y, o.w || 1)) return;
  if (drawSpriteAt(ctx, [`obstacle-${o.type}${(o.x * 3 + o.y) % 2 ? '2' : ''}`, `obstacle-${o.type}`], o.x, o.y, 1, 1)) return;
  const [sx0, sy0] = iso(o.x + 0.5, o.y + 0.5);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  if (o.type === 'weed') {
    const sway = Math.round(Math.sin(t * 2 + o.x * 1.7 + o.y) * 0.8);
    ctx.fillStyle = '#4f7d3a';
    for (const [dx, h] of [[-5, 6], [-2, 9], [1, 7], [4, 8], [6, 5]]) ctx.fillRect(sx + dx + sway, sy - h, 2, h);
    ctx.fillStyle = '#6fa152';
    for (const [dx, h] of [[-3, 5], [2, 6], [5, 4]]) ctx.fillRect(sx + dx + sway, sy - h - 1, 1, h);
    ctx.fillStyle = '#e8d36a';
    ctx.fillRect(sx - 2 + sway, sy - 10, 2, 2);
  } else if (o.type === 'rock') {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    poly(ctx, [[sx - 7, sy], [sx - 5, sy - 6], [sx + 1, sy - 9], [sx + 6, sy - 5], [sx + 7, sy]], '#9a958c');
    poly(ctx, [[sx + 1, sy - 9], [sx + 6, sy - 5], [sx + 7, sy], [sx + 1, sy]], '#7f7a72');
    ctx.fillStyle = '#b8b3a9'; ctx.fillRect(sx - 4, sy - 6, 3, 2);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(sx, sy, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4a2f'; ctx.fillRect(sx - 1, sy - 7, 2, 7);
    ctx.fillStyle = '#4c8045';
    ctx.beginPath(); ctx.arc(sx, sy - 11, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6fab60'; ctx.fillRect(sx - 2, sy - 14, 2, 2);
  }
}

// 땅을 살 수 있는 마을 집 (팻말)
function drawLandHouse(ctx, o) {
  if (drawSpriteAt(ctx, [o.believer ? 'landhouse-believer' : 'landhouse', 'landhouse'], o.x, o.y, 2, 2)) return;
  const b = { x: o.x, y: o.y, w: 2, d: 2, h: 13, style: o.believer ? 'cottage' : 'house', door: { side: 'S', u: 0.5 } };
  drawBuilding(ctx, b);
  const [sx0, sy0] = iso(o.x + 2.3, o.y + 1.2);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(sx, sy - 12, 1, 12);
  ctx.fillStyle = '#f4ead2'; ctx.fillRect(sx - 7, sy - 18, 15, 7);
  ctx.fillStyle = '#7b2d26'; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('매매', sx + 1, sy - 12.5);
}

// 건물 이름표: 건물 앞쪽 바닥 아래. k = 화면에서 같은 크기로 보이게 하는 배율
// sub: 둘째 줄 (교리실 방마다 든 단체)
function drawNameTag(ctx, b, text, k = 1, sub = '') {
  const [x, y0] = iso(b.x + b.w / 2 + 0.5, b.y + b.d + 0.5);
  ctx.font = `bold ${Math.round(8 * k)}px sans-serif`;
  let w = Math.ceil(ctx.measureText(text).width) + 8 * k;
  if (sub) { ctx.font = `${Math.round(7 * k)}px sans-serif`; w = Math.max(w, Math.ceil(ctx.measureText(sub).width) + 8 * k); }
  const h = (sub ? 20 : 11) * k;
  const left = Math.round(x - w / 2), top = Math.round(y0 - 5.5 * k);
  ctx.fillStyle = 'rgba(43, 36, 32, .82)';
  ctx.fillRect(left, top, Math.round(w), Math.round(h));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffdf6';
  ctx.font = `bold ${Math.round(8 * k)}px sans-serif`;
  ctx.fillText(text, Math.round(x), Math.round(top + 8 * k));
  if (sub) {
    ctx.fillStyle = '#f2c14e';
    ctx.font = `${Math.round(7 * k)}px sans-serif`;
    ctx.fillText(sub, Math.round(x), Math.round(top + 17 * k));
  }
}

// 올릴 수 있음 표시: 건물 위 오른쪽의 초록 ⬆. 그린 자리(월드 픽셀)를 돌려준다
// waiting: 일꾼만 모자라면 회색 ⬆와 👷
function drawUpBadge(ctx, b, t, k = 1, waiting = false) {
  const [sx0, sy0] = buildingTop(b);
  const r = 9 * k, cx = Math.round(sx0 + 22 * k), cy = Math.round(sy0 - 6 * k + (waiting ? 0 : Math.sin(t * 4 + b.y) * 1.5 * k));
  ctx.fillStyle = waiting ? '#5f5e5a' : '#1f6b3a';
  ctx.beginPath(); ctx.arc(cx, cy, r + 1.2 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = waiting ? '#b4b2a9' : '#3cbf68';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // 위 화살표
  ctx.fillStyle = '#fff';
  poly(ctx, [[cx, cy - 6 * k], [cx + 5 * k, cy], [cx + 2 * k, cy], [cx + 2 * k, cy + 5 * k], [cx - 2 * k, cy + 5 * k], [cx - 2 * k, cy], [cx - 5 * k, cy]], '#fff');
  if (waiting) { ctx.font = `${Math.round(9 * k)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('👷', cx + r, cy + r); }
  return { x: cx - r - 2 * k, y: cy - r - 2 * k, w: 2 * r + 4 * k, h: 2 * r + 4 * k };
}

// 공사 진행 막대
function drawProgress(ctx, b, t) {
  const [sx0, sy0] = buildingTop(b);
  const sx = Math.round(sx0), sy = Math.round(sy0) + (b.scaffold ? 14 : -10);
  ctx.fillStyle = '#2b2420';
  ctx.fillRect(sx - 12, sy - 3, 24, 4);
  ctx.fillStyle = '#7ec26b';
  ctx.fillRect(sx - 11, sy - 2, Math.round(22 * t), 2);
  ctx.fillStyle = '#f2c14e';
  ctx.font = '7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔨', sx + 17, sy + 1);
}

// ---------- 나무와 소품 ----------

function drawTree(ctx, x, y, kind = 0, s = 1) {
  if (SPRITE_HD.has(`tree-${kind}`) && drawNature(ctx, `tree-${kind}`, x, y, s)) return;
  if (drawSpriteAt(ctx, [`tree-${kind}`], x, y, 1, 1)) return;
  const [sx0, sy0] = iso(x + 0.5, y + 0.5);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(sx, sy, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(sx - 1, sy - 10, 3, 10);
  if (kind === 1) { // 침엽수
    poly(ctx, [[sx - 8, sy - 8], [sx + 9, sy - 8], [sx, sy - 22]], '#3f6e3a');
    poly(ctx, [[sx - 6, sy - 15], [sx + 7, sy - 15], [sx, sy - 28]], '#4c8045');
    return;
  }
  ctx.fillStyle = '#4c8045';
  ctx.beginPath(); ctx.arc(sx, sy - 16, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5c9651';
  ctx.beginPath(); ctx.arc(sx - 2, sy - 18, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6fab60';
  ctx.fillRect(sx - 4, sy - 21, 2, 2);
}

function drawStatue(ctx, x, y, s = 1) {
  const o = (s - 1) / 2; x += o; y += o; // s×s 자리 한가운데에 한 칸 성모상
  if (drawSpriteAt(ctx, ['statue'], x, y, 1, 1)) return;
  const [sx0, sy0] = iso(x + 0.5, y + 0.5);
  const sx = Math.round(sx0), sy = Math.round(sy0);
  poly(ctx, [[sx - 6, sy], [sx, sy - 3], [sx + 6, sy], [sx, sy + 3]], '#9a948a');
  ctx.fillStyle = '#b8b2a6'; ctx.fillRect(sx - 3, sy - 4, 6, 4);
  ctx.fillStyle = '#e8eef5'; ctx.fillRect(sx - 2, sy - 14, 4, 10);
  ctx.fillStyle = '#7fa6d1'; ctx.fillRect(sx - 2, sy - 12, 4, 7);
  ctx.fillStyle = '#f0dcc4'; ctx.fillRect(sx - 1, sy - 16, 3, 3);
}

// ---------- 인물 ----------

const LOOKS = {
  priest: { body: '#1d1d22', collar: true, hair: '#2a2018', skin: '#f0d0b0', robe: true },
  seminarian: { body: '#1d1d22', collar: true, hair: '#2a2018', skin: '#f0d0b0', robe: true },
  pastor: { body: '#1d1d22', collar: true, hair: '#c9c9c9', skin: '#ecc9a6', robe: true },
  director: { body: '#1d1d22', collar: true, hair: '#8a8a8a', skin: '#ecc9a6', robe: true },
  sister: { body: '#2e3a5c', veil: '#2e3a5c', skin: '#f0d0b0', robe: true },
  p1: { body: '#b5523b', hair: '#3a2a20', skin: '#f0d0b0', legs: '#3d4a5c' },
  p2: { body: '#5b7fa6', hair: '#d9d9d9', skin: '#e8c4a0', legs: '#4a4038' },
  p3: { body: '#7a9e5a', hair: '#1f1a17', skin: '#f2d4b4', legs: '#2f3640' },
  p4: { body: '#c9a24a', hair: '#5a3c28', skin: '#efcdab', legs: '#5c4a3a' },
  p5: { body: '#8e5a9b', hair: '#bdbdbd', skin: '#e9c7a3', legs: '#3b3b3b' },
  youth: { body: '#e07a5f', hair: '#2b211c', skin: '#f2d4b4', legs: '#3d5a80' },
  kid: { body: '#f2c14e', hair: '#3a2a20', skin: '#f5dcc0', legs: '#3d5a80', small: true },
  worker: { body: '#e07a2f', hair: '#3a2a20', skin: '#eac39e', legs: '#4a5568', helmet: '#f2c14e' },
  staff1: { body: '#5f8f5a', hair: '#3a2a20', skin: '#e8c4a0', legs: '#4a4038', helmet: '#f2c14e' },
  staff2: { body: '#4f7fa8', hair: '#2b211c', skin: '#f0d0b0', legs: '#3d3d4a', helmet: '#f2c14e' },
  staff3: { body: '#3d3d58', hair: '#8a8a8a', skin: '#ecc9a6', legs: '#2b2b3a', helmet: '#f2c14e' },
};

// (sx, sy)는 발끝 위치. dir: down/up/left/right
// 인물 도트 그림판 (tools/blender/make-people.py → tools/make-people-sheet.py): 줄 = 앞·오른쪽·뒤·왼쪽, 칸 = 서 있기 + 걷기 4
// 그림판 1픽셀 = 월드 0.5픽셀 (도트가 고르게 보이게 부드럽게 늘이지 않는다)
const CHAR_ROWS = { down: 0, right: 1, up: 2, left: 3 };
const CHAR_HEIGHT = 28; // 고운 인물 그림의 키 (월드 픽셀)
function drawCharacter(ctx, sx0, sy0, look, dir, frame, moving) {
  const sheet = getSprite(`char-${LOOKS[look] ? look : 'p1'}`);
  // 작은 미사 장면·얼굴 칸(저해상도 캔버스)에서는 예전 점 그림이 더 또렷하다
  if (sheet && typeof World !== 'undefined' && ctx.canvas === World.canvas) {
    const cw = sheet.width / 5, ch = sheet.height / 4, col = moving ? 1 + (frame % 4) : 0, row = CHAR_ROWS[dir] || 0;
    // 고운(3D) 그림판은 키 28로 부드럽게, 도트 그림판은 1픽셀 = 0.5로 또렷하게
    const hd = ch > 100, h = hd ? CHAR_HEIGHT : ch / 2, w = cw * h / ch;
    ctx.fillStyle = 'rgba(30,40,20,.22)';
    ctx.beginPath(); ctx.ellipse(sx0, sy0, 5.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = hd;
    if (hd) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sheet, col * cw, row * ch, cw, ch, hd ? sx0 - w / 2 : Math.round(sx0 - w / 2), hd ? sy0 - h + 1 : Math.round(sy0 - h + 1), w, h);
    ctx.imageSmoothingEnabled = was;
    return;
  }
  const L = LOOKS[look] || LOOKS.p1;
  const sx = Math.round(sx0), sy = Math.round(sy0);
  const s = L.small ? 3 : 0; // 아이는 키가 작다
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2, 0, 0, Math.PI * 2); ctx.fill();

  const step = moving ? frame % 2 : -1;
  const bob = moving && step === 1 ? -1 : 0;
  const top = sy - 19 + s + bob;

  // 다리
  ctx.fillStyle = L.robe ? '#121216' : L.legs;
  if (L.robe) {
    ctx.fillRect(sx - 3, sy - 2, 2, 2 - (step === 0 ? 1 : 0));
    ctx.fillRect(sx + 1, sy - 2, 2, 2 - (step === 1 ? 1 : 0));
  } else {
    ctx.fillRect(sx - 3, sy - 5, 2, 5 - (step === 0 ? 1 : 0));
    ctx.fillRect(sx + 1, sy - 5, 2, 5 - (step === 1 ? 1 : 0));
  }
  // 몸
  ctx.fillStyle = L.body;
  const bodyBottom = L.robe ? sy - 2 : sy - 5;
  ctx.fillRect(sx - 4, top + 7, 8, bodyBottom - (top + 7));
  if (L.robe) ctx.fillRect(sx - 5, bodyBottom - 3, 10, 3); // 수단 자락
  // 팔
  const swing = moving ? (step === 0 ? 1 : -1) : 0;
  ctx.fillStyle = L.body;
  ctx.fillRect(sx - 5, top + 8 + swing, 1, 6);
  ctx.fillRect(sx + 4, top + 8 - swing, 1, 6);
  ctx.fillStyle = L.skin;
  ctx.fillRect(sx - 5, top + 14 + swing, 1, 1);
  ctx.fillRect(sx + 4, top + 14 - swing, 1, 1);
  // 로만 칼라
  if (L.collar && dir !== 'up') { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, top + 7, 2, 1); }
  // 머리
  ctx.fillStyle = L.skin;
  ctx.fillRect(sx - 3, top, 6, 7);
  if (L.veil) {
    ctx.fillStyle = L.veil;
    ctx.fillRect(sx - 4, top - 1, 8, 3);
    ctx.fillRect(sx - 4, top, 1, 9);
    ctx.fillRect(sx + 3, top, 1, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 3, top + 1, 6, 1);
  } else {
    ctx.fillStyle = L.hair;
    ctx.fillRect(sx - 3, top - 1, 6, 3);
    if (dir === 'up') ctx.fillRect(sx - 3, top, 6, 6);
    if (dir === 'left') ctx.fillRect(sx + 1, top, 2, 4);
    if (dir === 'right') ctx.fillRect(sx - 3, top, 2, 4);
  }
  // 안전모 (일꾼)
  if (L.helmet) {
    ctx.fillStyle = L.helmet;
    ctx.fillRect(sx - 4, top - 2, 8, 3);
    ctx.fillRect(sx - 5, top + 1, 10, 1);
  }
  // 눈
  ctx.fillStyle = '#2a2020';
  if (dir === 'down') { ctx.fillRect(sx - 2, top + 3, 1, 1); ctx.fillRect(sx + 1, top + 3, 1, 1); }
  if (dir === 'left') ctx.fillRect(sx - 2, top + 3, 1, 1);
  if (dir === 'right') ctx.fillRect(sx + 1, top + 3, 1, 1);
}

// 머리 위 말풍선 표시 (!, …)
function drawBubble(ctx, sx0, sy0, text, color = '#f2c14e') {
  const sx = Math.round(sx0), sy = Math.round(sy0) - 23;
  ctx.fillStyle = color;
  ctx.fillRect(sx - 4, sy - 8, 9, 9);
  ctx.fillRect(sx - 1, sy + 1, 3, 2);
  ctx.fillStyle = '#2b2420';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, sx + 1, sy - 1);
}
