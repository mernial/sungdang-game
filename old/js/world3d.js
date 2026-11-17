// 성당 키우기: 입체 화면 (v1.09 1단계 시험판, 주소 끝에 ?3d=1)
// 사용자 "3D 새 스타일을 지금 게임에 옮겨 줘 · 퀄리티는 올리면서 프레임은 떨어지지 않게".
// 방법: 지금 쿼터뷰(iso)와 똑같은 각도·배율의 직교 카메라로 입체 장면을 그 아래에 그린다.
//   → 말풍선·⬆·짓기 칸·땅 점선·손가락 판정 같은 지금 화면 위 표시는 2D 캔버스에 그대로 남고, 위치가 꼭 맞는다.
//   → 저장·규칙은 하나도 바뀌지 않는다. 땅·건물·나무·돌·잡초·펜스만 입체로 그리고, 아직 모형이 없는 것은 예전 그림으로 그린다.
// 프레임: 장면은 바뀔 때만 다시 짓고(합친 모형·같은 것은 인스턴싱), 그림자는 장면이 바뀔 때만 다시 굽는다.
//   카메라가 그대로면 바람 흔들림만 초당 30번 그린다. 기기가 버거우면 화질 단계를 저절로 낮춘다.
'use strict';
const W3 = (() => {
  const T = window.THREE;
  const off = { active: () => false, covers: () => false, coversOb: () => false, show() {}, fence: false };
  if (!T) return off;
  let on = false;
  try { on = /[?&]3d=1/.test(location.search) || localStorage.getItem('sungdang-3d') === '1'; if (/[?&]3d=0/.test(location.search)) on = false; } catch (e) { /* 무시 */ }
  if (!on) return off;

  // ---------- 작은 도구 (미리 보기 kit.js에서 가져옴) ----------
  const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const h2 = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, o = 3) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; f *= 2; a *= 0.5; } return s / n; };
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function finish(geo, color, fx) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (g.attributes.uv) g.deleteAttribute('uv');
    g.clearGroups();
    const n = g.attributes.position.count, col = new T.Color(color), f3 = fx || [0, 0, 1];
    const c = new Float32Array(n * 3), f = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; f[i * 3] = f3[0]; f[i * 3 + 1] = f3[1]; f[i * 3 + 2] = f3[2]; }
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    g.setAttribute('fx', new T.BufferAttribute(f, 3));
    return g;
  }
  // 모서리가 둥근 상자 (장난감 같은 도톰한 느낌). N=2로 세모 수를 줄였다
  function rbox(w, h, d, r = 0.06) {
    const N = r >= 0.09 ? 3 : 2, g = new T.BoxGeometry(1, 1, 1, N, N, N), pos = g.attributes.position, nor = g.attributes.normal;
    const hs = 0.5 / N, hx = w / 2, hy = h / 2, hz = d / 2;
    r = Math.min(r, hx, hy, hz);
    const n = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), sx = Math.sign(x), sy = Math.sign(y), sz = Math.sign(z);
      n.set(x - sx * hs, y - sy * hs, z - sz * hs).normalize();
      pos.setXYZ(i, sx * (hx - r) + n.x * r, sy * (hy - r) + n.y * r, sz * (hz - r) + n.z * r);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  }
  function prism(w, h, d) {
    const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, steps: 1, curveSegments: 1 });
    g.translate(0, 0, -d / 2); return g;
  }
  function archPlate(w, h, t = 0.08, seg = 8) {
    const s = new T.Shape(), r = w / 2, hh = Math.max(0.01, h - r);
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, hh); s.absarc(0, hh, r, 0, Math.PI, false); s.lineTo(-r, 0);
    const g = new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: seg });
    g.translate(0, 0, -t / 2); return g;
  }
  function lump(r, detail, seed, squash = 1, amp = 0.2) {
    const g = new T.IcosahedronGeometry(1, detail), pos = g.attributes.position, nor = g.attributes.normal, v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const k = 1 + amp * (fbm(v.x * 1.9 + seed * 7.1, v.y * 1.9 + v.z * 1.3 + seed * 3.3, 2) - 0.5) * 2;
      pos.setXYZ(i, v.x * r * k, v.y * r * k * squash, v.z * r * k);
      nor.setXYZ(i, v.x, v.y / squash, v.z);
    }
    g.normalizeNormals(); return g;
  }
  function shadeByHeight(g, lo, hi, y0, y1) {
    const pos = g.attributes.position, col = g.attributes.color, a = new T.Color(lo), b = new T.Color(hi);
    for (let i = 0; i < pos.count; i++) { const t = sm(y0, y1, pos.getY(i)); col.setXYZ(i, mix(a.r, b.r, t), mix(a.g, b.g, t), mix(a.b, b.b, t)); }
    return g;
  }
  function swayByHeight(g, y0, y1, amount = 1) { const pos = g.attributes.position, fx = g.attributes.fx; for (let i = 0; i < pos.count; i++) fx.setY(i, sm(y0, y1, pos.getY(i)) * amount); return g; }
  function mergeGeos(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const p = new Float32Array(n * 3), nn = new Float32Array(n * 3), c = new Float32Array(n * 3), f = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) { const k = g.attributes.position.count * 3; p.set(g.attributes.position.array.subarray(0, k), o); nn.set(g.attributes.normal.array.subarray(0, k), o); c.set(g.attributes.color.array.subarray(0, k), o); f.set(g.attributes.fx.array.subarray(0, k), o); o += k; }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(p, 3)); out.setAttribute('normal', new T.BufferAttribute(nn, 3));
    out.setAttribute('color', new T.BufferAttribute(c, 3)); out.setAttribute('fx', new T.BufferAttribute(f, 3));
    return out;
  }
  const M4 = (x, y, z, o = {}) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(o.rx || 0, o.ry || 0, o.rz || 0)), new T.Vector3(o.sx || 1, o.sy || 1, o.sz || 1));
  class Kit {
    constructor() { this.g = []; }
    add(geo, color, x = 0, y = 0, z = 0, o = {}) {
      const g = finish(geo, color, o.fx);
      if (o.grad) shadeByHeight(g, o.grad[0], o.grad[1], o.grad[2], o.grad[3]);
      g.applyMatrix4(M4(x, y, z, o)); this.g.push(g); return this;
    }
    box(w, h, d, color, x, y, z, o = {}) { return this.add(o.r === 0 ? new T.BoxGeometry(w, h, d) : rbox(w, h, d, o.r || 0.1), color, x, y, z, o); }
    cyl(rt, rb, h, color, x, y, z, o = {}) { return this.add(new T.CylinderGeometry(rt, rb, h, o.seg || 8, 1, !!o.open), color, x, y, z, o); }
    ball(r, color, x, y, z, o = {}) { return this.add(new T.SphereGeometry(r, o.seg || 10, o.rows || 7), color, x, y, z, o); }
    // 양쪽으로 내려오는 지붕: 벽 너비 w(비탈 방향), 높이 h, 길이 d(용마루 방향). axis 'x'면 용마루가 x 방향
    roof(w, h, d, y, color, o = {}) {
      const over = o.over === undefined ? 0.35 : o.over, t = o.thick || 0.22, a = w / 2, th = Math.atan2(h, a), L = Math.hypot(a, h) + over, rows = o.rows || 0, dark = o.dark || color;
      const sub = new Kit();
      for (const s of [1, -1]) {
        const cx = s * Math.cos(th) * (L / 2), cy = h - Math.sin(th) * (L / 2), nx = s * Math.sin(th), ny = Math.cos(th);
        sub.box(L, t, d + over * 2, color, cx + nx * t * 0.5, cy + ny * t * 0.5, 0, { rz: -s * th, r: 0.07 });
        for (let i = 0; i < rows; i++) { // 굵은 기와골 + 처마 끝 흰 막새
          const zz = -(d + over * 2) / 2 + (i + 0.5) * (d + over * 2) / rows;
          sub.add(new T.CylinderGeometry(0.1, 0.1, L, 6), dark, cx + nx * (t + 0.03), cy + ny * (t + 0.03), zz, { rz: -s * (Math.PI / 2 + th) });
          if (o.caps) sub.ball(0.12, o.caps, s * Math.cos(th) * L + nx * (t + 0.03), h - Math.sin(th) * L + ny * (t + 0.03), zz, { seg: 6, rows: 5 });
        }
      }
      sub.box(0.34, 0.2, d + over * 2 + 0.06, dark, 0, h + t * 0.75, 0, { r: 0.08 });
      const g = mergeGeos(sub.g);
      g.applyMatrix4(M4(o.x || 0, y, o.z || 0, { ry: o.axis === 'x' ? Math.PI / 2 : 0 }));
      this.g.push(g); return this;
    }
    gables(w, h, d, y, color, o = {}) {
      const th = o.thick || 0.3;
      for (const s of [1, -1]) {
        const g = finish(prism(w, h, th), color), off = s * (d / 2 - th / 2);
        g.applyMatrix4(M4((o.x || 0) + (o.axis === 'x' ? off : 0), y, (o.z || 0) + (o.axis === 'x' ? 0 : off), { ry: o.axis === 'x' ? Math.PI / 2 : 0 }));
        this.g.push(g);
      }
      return this;
    }
    // 창문: 틀 + 유리(밤에 불빛). face 'z'는 +z를 보는 벽, 'x'는 +x를 보는 벽 (sign -1이면 반대쪽)
    window(wd, ht, x, y, z, o = {}) {
      const face = o.face || 'z', s = o.sign || 1, frame = o.frame || 0x7a5a3c, k = new Kit();
      const ry = face === 'x' ? Math.PI / 2 * s : (s < 0 ? Math.PI : 0);
      if (o.arch) { k.add(archPlate(wd + 0.18, ht + 0.12, 0.1), frame, 0, -ht / 2 - 0.06, 0); k.add(archPlate(wd, ht, 0.14), o.glass || C.glass, 0, -ht / 2, 0.01, { fx: [1, 0, 0] }); }
      else {
        k.box(wd + 0.18, ht + 0.18, 0.1, frame, 0, 0, 0, { r: 0.03 });
        k.box(wd, ht, 0.14, o.glass || C.glass, 0, 0, 0.01, { r: 0, fx: [1, 0, 0] });
        if (o.cross !== false) { k.box(0.05, ht, 0.16, frame, 0, 0, 0.01, { r: 0 }); k.box(wd, 0.05, 0.16, frame, 0, 0, 0.01, { r: 0 }); }
      }
      const g = mergeGeos(k.g); g.applyMatrix4(M4(x, y, z, { ry })); this.g.push(g); return this;
    }
    // 문: face/sign은 창문과 같다
    door(wd, ht, x, y, z, o = {}) {
      const face = o.face || 'z', s = o.sign || 1, k = new Kit(), ry = face === 'x' ? Math.PI / 2 * s : (s < 0 ? Math.PI : 0);
      k.box(wd + 0.14, ht + 0.08, 0.08, o.frame || C.woodD, 0, ht / 2, 0, { r: 0.03 });
      k.box(wd, ht, 0.12, o.color || C.wood, 0, ht / 2, 0.02, { r: 0.04 });
      k.ball(0.05, C.gold, wd * 0.3, ht * 0.48, 0.1, { seg: 6, rows: 4 });
      const g = mergeGeos(k.g); g.applyMatrix4(M4(x, y, z, { ry })); this.g.push(g); return this;
    }
    build(ao = 0.26, aoH = 1.3) {
      const g = mergeGeos(this.g);
      if (ao) { const pos = g.attributes.position, col = g.attributes.color; for (let i = 0; i < pos.count; i++) { const f = 1 - ao * (1 - sm(0, aoH, pos.getY(i))); col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f); } }
      g.computeBoundingBox(); g.computeBoundingSphere();
      return g;
    }
  }

  // ---------- 색 (지금 게임 그림에서 뽑음) ----------
  const C = { // 미리 보기 색 (밝고 진한 장난감 느낌) + 지금 게임에만 있는 색
    orange: 0xe8884a, orangeD: 0xc96a34, blue: 0x5f8fd6, blueD: 0x3f6bb0, navy: 0x4a5596, navyD: 0x363f78,
    cream: 0xf6e7c4, creamD: 0xe3cfa3, white: 0xfbf6ea, wood: 0xb9783f, woodD: 0x8a5530, woodL: 0xd9a566,
    brick: 0xd2694c, brickD: 0xb5543c, brickL: 0xe58a6a, slate: 0x66709a, slateD: 0x4d557c, terra: 0xd0603f, terraD: 0xa8482f,
    stone: 0xc2bcae, stoneD: 0x9d968a, stoneL: 0xddd7c8, glass: 0xa5d3e6, gold: 0xf0c04f, steel: 0x8e9bb0, steelD: 0x66728a,
    skin: 0xf6cfa8, thatch: 0xe3b64e, leaf: 0x6fbf3f, leafD: 0x3f8f35, leafL: 0xa4dc55, pine: 0x3f9060, pineD: 0x2b6c4c, trunk: 0x9a6238,
    green: 0x6fae5a, greenD: 0x4f8a42, rust: 0xa85a32, red: 0xe0574a, redD: 0xb8413a, greenR: 0x5fa65a, greenRD: 0x467f45, yellowR: 0xe3b64e, yellowRD: 0xc99a3a,
    gray: 0x9aa7b8, grayD: 0x7b889b, panel: 0xf3f1ea, panelD: 0xd8d5cb, blueG: 0x8fa3bd,
  };


  // ---------- 모형 (앞 = +z = 문 쪽, 바닥 가운데가 원점, 단위 = 지도 한 칸) ----------
  // 컨테이너: 골판 벽 + 모서리 기둥 + 위 테
  function cont(k, W, D, H, col, x, y, z, o = {}) { // 미리 보기 교리실 컨테이너 모양: 도톰한 몸통 + 골판 + 흰 윗테
    const c = new T.Color(col), dark = c.clone().multiplyScalar(0.78).getHex();
    k.box(W, H, D, col, x, y + H / 2, z, { r: 0.1 });
    const nx = Math.max(2, Math.round(W * 2.6)), nz = Math.max(2, Math.round(D * 2.6));
    for (let i = 1; i < nx; i++) { const xx = x - W / 2 + i * W / nx; for (const s of [1, -1]) k.box(0.08, H - 0.45, 0.1, dark, xx, y + H / 2, z + s * (D / 2 + 0.01), { r: 0 }); }
    for (let i = 1; i < nz; i++) { const zz = z - D / 2 + i * D / nz; for (const s of [1, -1]) k.box(0.1, H - 0.45, 0.08, dark, x + s * (W / 2 + 0.01), y + H / 2, zz, { r: 0 }); }
    k.box(W + 0.2, 0.2, D + 0.2, o.roof || C.white, x, y + H + 0.08, z, { r: 0.06 });
    if (y < 0.5) for (const xx of [-W / 2 + 0.4, W / 2 - 0.4]) k.box(0.45, 0.3, D - 0.2, C.stone, x + xx, 0.15, z, { r: 0.05 });
    if (o.rust) { const r = mulberry32(o.rust); for (let i = 0; i < 5; i++) k.box(0.25 + r() * 0.4, 0.2 + r() * 0.3, 0.04, C.rust, x - W / 2 + 0.3 + r() * (W - 0.6), y + 0.3 + r() * (H - 0.7), z + D / 2 + 0.06, { r: 0 }); }
    return k;
  }
  // 컨테이너 앞문: 흰 문 + 주황 차양 + 나무 디딤판 (미리 보기 교리실)
  function contDoor(k, x, y, z, awning = C.orange) {
    k.box(0.85, 1.6, 0.1, C.white, x, y + 0.8, z + 0.04, { r: 0.04 }).ball(0.05, C.gold, x + 0.25, y + 0.8, z + 0.12, { seg: 6, rows: 4 });
    k.box(1.25, 0.09, 0.65, awning, x, y + 1.85, z + 0.33, { r: 0.03, rx: 0.2 });
    if (y < 0.5) k.box(1.2, 0.14, 0.6, C.woodL, x, 0.12, z + 0.35, { r: 0.04 });
    return k;
  }
  function stairs(k, x, z, y1, len, dir = 1) { // x 쪽 벽에 붙은 바깥 철계단 (z 방향으로 올라감)
    const n = 8;
    for (let i = 0; i < n; i++) k.box(0.55, 0.06, len / n * 0.9, C.steelD, x, (i + 1) * y1 / n, z + dir * (i - n / 2) * len / n, { r: 0 });
    k.box(0.04, 0.04, Math.hypot(len, y1), C.steel, x + 0.27, y1 / 2 + 0.45, z, { rx: dir * Math.atan2(y1, len), r: 0 });
    k.box(0.55, 0.06, 0.6, C.steelD, x, y1, z + dir * (len / 2 + 0.3), { r: 0 });
    return k;
  }
  function crossOn(k, x, y, z, s = 1, col = C.gold) { k.box(0.08 * s, 0.6 * s, 0.08 * s, col, x, y + 0.3 * s, z, { r: 0 }).box(0.34 * s, 0.08 * s, 0.08 * s, col, x, y + 0.42 * s, z, { r: 0 }); return k; }
  function woodCross(k, x, z, h = 2.6) { k.box(0.5, 0.18, 0.5, C.stone, x, 0.09, z, { r: 0.05 }).box(0.16, h, 0.16, C.wood, x, h / 2 + 0.1, z, { r: 0.03 }).box(1.0, 0.15, 0.15, C.wood, x, h * 0.72, z, { r: 0.03 }); return k; }
  function brickSpeckle(k, W, D, H, y0, seed) {
    const r = mulberry32(seed);
    for (let i = 0; i < Math.round((W + D) * H * 2.2); i++) {
      const col = r() < 0.5 ? C.brickL : C.brickD, yy = y0 + 0.2 + r() * (H - 0.4);
      if (r() < 0.5) k.box(0.03, 0.11, 0.32, col, W / 2 + 0.006, yy, -D / 2 + 0.3 + r() * (D - 0.6), { r: 0 });
      else k.box(0.32, 0.11, 0.03, col, -W / 2 + 0.3 + r() * (W - 0.6), yy, D / 2 + 0.006, { r: 0 });
    }
  }
  // 집 한 채: o = { W, D, H(벽), floors, wall, roof, roofD, gable, ridge('x'|'z'), rh(지붕 높이), porch, door, cross, chimney, brick, timber, awning, base }
  function house(k, o) {
    const W = o.W, D = o.D, H = o.H, y0 = o.y0 === undefined ? 0.25 : o.y0, floors = o.floors || 1, ridgeX = o.ridge !== 'z', rh = o.rh || (ridgeX ? D : W) * 0.4;
    k.box(W + 0.4, y0, D + 0.4, o.base || C.stone, 0, y0 / 2, 0, { r: 0.08 });
    k.box(W, H, D, o.wall, 0, y0 + H / 2, 0, { r: 0.14 });
    if (!o.brick && !o.timber && !o.flat && !o.trim && o.posts !== false) for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.2, H, 0.2, C.wood, sx * (W / 2 - 0.04), y0 + H / 2, sz * (D / 2 - 0.04), { r: 0.04 });
    if (o.brick) brickSpeckle(k, W, D, H, y0, o.brick);
    if (o.trim) for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.13, H, 0.13, o.trim, sx * W / 2, y0 + H / 2, sz * D / 2, { r: 0.02 });
    if (o.timber) { // 반목조: 흰 벽에 짙은 기둥·띠
      for (const s of [1, -1]) { k.box(W + 0.02, 0.1, 0.04, o.timber, 0, y0 + H / 2, s * (D / 2 + 0.02), { r: 0 }); k.box(0.04, 0.1, D + 0.02, o.timber, s * (W / 2 + 0.02), y0 + H / 2, 0, { r: 0 }); }
      for (let i = 0; i <= 4; i++) { const xx = -W / 2 + i * W / 4; k.box(0.1, H, 0.04, o.timber, xx, y0 + H / 2, D / 2 + 0.02, { r: 0 }); }
      for (let i = 0; i <= 4; i++) { const zz = -D / 2 + i * D / 4; k.box(0.04, H, 0.1, o.timber, W / 2 + 0.02, y0 + H / 2, zz, { r: 0 }); }
    }
    if (floors === 2 && !o.timber) { k.box(W + 0.04, 0.08, D + 0.04, o.band || (o.brick ? C.stoneL : C.creamD), 0, y0 + H / 2, 0, { r: 0 }); }
    if (o.flat) { k.box(W + 0.12, 0.16, D + 0.12, o.roof, 0, y0 + H + 0.08, 0, { r: 0.03 }).box(W - 0.3, 0.12, D - 0.3, o.roofD || o.roof, 0, y0 + H + 0.2, 0, { r: 0 }); }
    else if (ridgeX) { k.roof(D, rh, W, y0 + H, o.roof, { axis: 'x', rows: Math.round(W * 2), dark: o.roofD, caps: o.caps === false ? null : C.white }); k.gables(D, rh, W, y0 + H, o.gable || o.wall, { axis: 'x' }); }
    else { k.roof(W, rh, D, y0 + H, o.roof, { rows: Math.round(D * 2), dark: o.roofD, caps: o.caps === false ? null : C.white }); k.gables(W, rh, D, y0 + H, o.gable || o.wall, {}); }
    // 문과 창 (층마다)
    const fh = H / floors, dx = o.doorX === undefined ? -W * 0.22 : o.doorX;
    k.door(0.7, Math.min(1.35, fh * 0.78), dx, y0, D / 2 + 0.02, { color: o.doorCol || C.wood });
    for (let f = 0; f < floors; f++) {
      const wy = y0 + fh * f + fh * 0.58, nF = Math.max(1, Math.round(W / 1.6)), nS = Math.max(1, Math.round(D / 1.6));
      for (let i = 0; i < nF; i++) { const xx = -W / 2 + (i + 0.5) * W / nF; if (f === 0 && Math.abs(xx - dx) < 0.7) continue; k.window(0.66, o.arch ? 0.85 : 0.62, xx, wy, D / 2 + 0.04, { frame: o.frame || C.woodD, arch: o.arch }); }
      for (let i = 0; i < nS; i++) { const zz = -D / 2 + (i + 0.5) * D / nS; k.window(0.66, o.arch ? 0.85 : 0.62, W / 2 + 0.04, wy, zz, { face: 'x', frame: o.frame || C.woodD, arch: o.arch }); }
      if (o.box !== false && f === 0 && !o.brick) { const xx = -W / 2 + (nF - 0.5) * W / nF; if (Math.abs(xx - dx) >= 0.7) { k.box(0.8, 0.18, 0.26, C.woodD, xx, wy - 0.45, D / 2 + 0.16, { r: 0.04 }); for (const [ddx, c] of [[-0.25, 0xff7f8f], [0, 0xffd45c], [0.25, 0xff9fc0]]) k.ball(0.11, c, xx + ddx, wy - 0.3, D / 2 + 0.17, { seg: 6, rows: 5 }); } }
    }
    if (o.porch) { // 현관 지붕과 기둥
      const pz = D / 2 + 0.45;
      for (const sx of [-1, 1]) k.box(0.08, 1.35, 0.08, o.porchPost || C.woodD, dx + sx * 0.5, y0 + 0.68, pz + 0.3, { r: 0 });
      k.box(1.3, 0.08, 1.0, o.porchRoof || o.roof, dx, y0 + 1.4, pz, { rx: 0.12, r: 0.02 });
      k.box(1.2, 0.08, 0.8, C.stoneL, dx, y0 * 0.5, pz, { r: 0.02 });
    }
    if (o.awning) k.box(1.0, 0.06, 0.45, o.awning, dx, y0 + 1.42, D / 2 + 0.24, { rx: 0.25, r: 0 });
    if (o.chimney) k.box(0.36, 1.0, 0.36, o.chimney, W * 0.25, y0 + H + rh * 0.6, -D * 0.15, { r: 0.03 }).box(0.44, 0.1, 0.44, C.stoneD, W * 0.25, y0 + H + rh * 0.6 + 0.52, -D * 0.15, { r: 0 });
    if (o.cross) crossOn(k, ridgeX ? W / 2 - 0.05 : 0, y0 + H + rh - 0.05, ridgeX ? 0 : D / 2 - 0.05, 1.1);
    if (o.plant) k.cyl(0.14, 0.11, 0.22, C.terra, dx + 0.62, y0 + 0.11, D / 2 + 0.25, { seg: 7 }).add(lump(0.2, 0, 3, 1, 0.15), C.leaf, dx + 0.62, y0 + 0.38, D / 2 + 0.25, { grad: [C.leafD, C.leafL, -0.2, 0.2] });
    return k;
  }
  // 조립식(가건물): 흰 패널 벽, 줄눈, 낮은 회색 지붕
  function prefab(k, W, D, H, o = {}) {
    house(k, { W, D, H, wall: C.panel, roof: o.roof || C.gray, roofD: C.grayD, ridge: o.ridge || 'z', rh: o.rh, frame: 0x8f99a3, doorCol: o.doorCol || 0xe2b24a, porch: o.porch, y0: 0.18, base: C.stone });
    const n = Math.round(D * 2.2);
    for (let i = 1; i < n; i++) k.box(0.025, H * 0.96, 0.04, C.panelD, W / 2 + 0.012, 0.18 + H / 2, -D / 2 + i * D / n, { r: 0 });
    const m = Math.round(W * 2.2);
    for (let i = 1; i < m; i++) k.box(0.04, H * 0.96, 0.025, C.panelD, -W / 2 + i * W / m, 0.18 + H / 2, D / 2 + 0.012, { r: 0 });
    return k;
  }
  function cupola(k, x, y, z) { k.box(0.6, 0.6, 0.6, C.white, x, y + 0.3, z, { r: 0.03 }).add(new T.ConeGeometry(0.5, 0.5, 4), C.grayD, x, y + 0.85, z, { ry: Math.PI / 4 }); return crossOn(k, x, y + 1.05, z, 0.9); }
  function steelTower(k, x, z, h) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.07, h, 0.07, C.steel, x + sx * 0.35, h / 2, z + sz * 0.35, { r: 0 });
    for (const yy of [h * 0.3, h * 0.6, h * 0.88]) for (const s of [-1, 1]) { k.box(0.74, 0.05, 0.05, C.steelD, x, yy, z + s * 0.35, { r: 0 }); k.box(0.05, 0.05, 0.74, C.steelD, x + s * 0.35, yy, z, { r: 0 }); }
    k.add(new T.ConeGeometry(0.6, 0.5, 4), C.navy, x, h + 0.25, z, { ry: Math.PI / 4 });
    return crossOn(k, x, h + 0.45, z, 1.1);
  }

  const MODELS = {
    // 성당 (단계 1~6, 그림 church-lv1~6과 같은 모습)
    church1: () => pvChurch1(false),
    church2: () => pvChurch1(true),
    church3: () => pvChurch2({}),
    church4: () => pvChurch2({ roof: C.slate, roofD: C.slateD, wall: C.white, D: 9.0, tower: 'wood' }),
    church5: () => pvChurch2({ roof: C.navy, roofD: C.navyD, wall: C.cream, D: 9.6, H: 3.7, tower: 'stone', base: C.brick }),
    church6: () => pvChurch3(),
    // 사제관 (Lv1~2 … Lv9~10)
    rectory1: () => { const k = new Kit(); cont(k, 3.6, 3.4, 2.3, C.green, 0, 0.3, 0); contDoor(k, -0.6, 0.3, 1.7, C.cream); k.window(0.8, 0.7, 0.8, 1.75, 1.74, { frame: C.white }).window(0.8, 0.7, 1.84, 1.75, 0, { face: 'x', frame: C.white }); k.cyl(0.14, 0.11, 0.22, C.terra, -1.25, 0.11, 1.95, { seg: 7 }).add(lump(0.22, 0, 3), C.leaf, -1.25, 0.4, 1.95); crossOn(k, -0.6, 1.5, 1.76, 0.6, C.woodD); return { geo: k.build() }; },
    rectory2: () => { const k = new Kit(); prefab(k, 3.6, 3.4, 2.1, { ridge: 'x', roof: C.navy, rh: 1.1 }); return { geo: k.build() }; },
    rectory3: () => pvRectory(1),
    rectory4: () => pvRectory(2),
    rectory5: () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 3.5, floors: 2, wall: C.brick, brick: 21, roof: C.slate, roofD: C.slateD, porch: true, chimney: C.brickD, frame: C.stoneL, cross: true }); return { geo: k.build() }; },
    // 본당 사무실
    office1: () => { const k = new Kit(); cont(k, 3.6, 5.4, 2.3, C.orange, 0, 0.3, 0, { rust: 9 }); contDoor(k, 0.6, 0.3, 2.7, C.blue); k.window(0.8, 0.7, -0.7, 1.75, 2.74, { frame: C.white }).window(0.8, 0.7, 1.84, 1.75, 1, { face: 'x', frame: C.white }).window(0.8, 0.7, 1.84, 1.75, -1.2, { face: 'x', frame: C.white }); k.box(1.2, 0.36, 0.06, C.cream, -0.7, 2.35, 2.75, { r: 0.03 }); return { geo: k.build() }; },
    office2: () => { const k = new Kit(); prefab(k, 3.6, 5.4, 2.1, { ridge: 'x', roof: 0x7c6a52, rh: 1.1 }); return { geo: k.build() }; },
    office3: () => { const k = new Kit(); house(k, { W: 3.6, D: 5.2, H: 2.0, wall: C.cream, roof: 0x8a4a2c, roofD: 0x6c3820, porch: true, frame: C.woodD, plant: true, ridge: 'z' }); return { geo: k.build() }; },
    office4: () => { const k = new Kit(); house(k, { W: 3.6, D: 5.2, H: 3.4, floors: 2, wall: C.cream, roof: 0x8a4a2c, roofD: 0x6c3820, porch: true, frame: C.woodD, ridge: 'z' }); return { geo: k.build() }; },
    office5: () => { const k = new Kit(); house(k, { W: 3.6, D: 5.2, H: 3.5, floors: 2, wall: C.brick, brick: 31, roof: C.slate, roofD: C.slateD, porch: true, frame: C.stoneL, chimney: C.brickD, ridge: 'z' }); return { geo: k.build() }; },
    // 교리실 (컨테이너 → 2층 컨테이너 → 파란 2층 → 반목조 → 벽돌)
    classroom1: o => { const k = new Kit(), col = [C.blue, C.green, C.orange][o.color || 0]; cont(k, 3.6, 5.6, 2.3, col, 0, 0.3, 0, { rust: 13 }); contDoor(k, -0.7, 0.3, 2.8, o.color === 2 ? C.blue : C.orange).window(0.8, 0.7, 0.85, 1.75, 2.84, { frame: C.white }).window(0.9, 0.7, 1.84, 1.75, 1.3, { face: 'x', frame: C.white }).window(0.9, 0.7, 1.84, 1.75, -1.3, { face: 'x', frame: C.white }); k.box(1.0, 0.32, 0.06, C.cream, 0.85, 2.3, 2.85, { r: 0.03 }); return { geo: k.build() }; },
    classroom2: o => { const k = new Kit(), col = [C.blueG, 0x8fae84, 0xc0906a][o.color || 0]; cont(k, 3.4, 5.4, 2.0, col, 0.1, 0.3, 0, { rust: 17 }); cont(k, 3.4, 5.4, 2.0, col, 0.1, 2.5, 0);
      for (const y of [0.3, 2.5]) { contDoor(k, -0.6, y, 2.7); k.window(0.8, 0.65, 0.9, y + 1.2, 2.74, { frame: C.white }); } for (const y of [1.5, 3.7]) k.window(0.8, 0.65, 1.82, y, 1, { face: 'x', frame: C.white }).window(0.8, 0.65, 1.82, y, -1.2, { face: 'x', frame: C.white });
      stairs(k, -2.05, 0.3, 2.5, 3.2, -1); return { geo: k.build() }; },
    classroom3: o => { const k = new Kit(), col = [C.blueD, 0x4f9a5a, C.terra][o.color || 0]; cont(k, 3.4, 5.4, 2.0, col, 0.1, 0.3, 0); cont(k, 3.4, 5.4, 2.0, col, 0.1, 2.5, 0);
      for (const y of [0.3, 2.5]) { contDoor(k, -0.6, y, 2.7, C.gold); k.window(0.8, 0.65, 0.9, y + 1.2, 2.74, { frame: C.white }); } for (const y of [1.5, 3.7]) k.window(0.8, 0.65, 1.82, y, 1, { face: 'x', frame: C.white }).window(0.8, 0.65, 1.82, y, -1.2, { face: 'x', frame: C.white });
      k.roof(5.6, 0.7, 3.6, 4.7, C.terra, { axis: 'x', rows: 8, dark: C.terraD, caps: C.white });
      stairs(k, -2.05, 0.3, 2.5, 3.2, -1); return { geo: k.build() }; },
    classroom4: () => { const k = new Kit(); house(k, { W: 3.6, D: 5.4, H: 3.5, floors: 2, wall: C.white, timber: 0x7a7a74, roof: C.gray, roofD: C.grayD, ridge: 'z', frame: 0x7a7a74, doorX: -0.7, doorCol: 0x8a5a36 }); return { geo: k.build() }; },
    classroom5: () => { const k = new Kit(); house(k, { W: 3.6, D: 5.4, H: 3.6, floors: 2, wall: C.brick, brick: 41, roof: C.slate, roofD: C.slateD, ridge: 'z', arch: true, frame: C.stoneL, porch: true, porchRoof: C.slate }); return { geo: k.build() }; },
    gongso: () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.white, roof: C.red, roofD: C.redD, cross: true, frame: C.woodD, doorCol: C.white }); return { geo: k.build() }; },
    // 마을 집들
    'town-hall': () => { const k = new Kit(); house(k, { W: 3.6, D: 5.2, H: 2.1, wall: C.cream, roof: C.greenR, roofD: C.greenRD, ridge: 'z', awning: C.greenR, doorCol: C.white }); return { geo: k.build() }; },
    'town-shop': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.cream, roof: C.red, roofD: C.redD, awning: C.red, doorCol: C.white }); return { geo: k.build() }; },
    'town-house': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.cream, roof: C.terra, roofD: C.terraD }); return { geo: k.build() }; },
    'town-house2': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.white, roof: C.slate, roofD: C.slateD }); return { geo: k.build() }; },
    'town-house3': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: 0xf1dcc0, roof: C.navy, roofD: C.navyD, chimney: C.stone }); return { geo: k.build() }; },
    'town-office': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 4.6, floors: 3, wall: 0xeeeeea, flat: true, roof: 0xd8d8d2, roofD: 0xbcbcb6, frame: 0xc9ccd0, doorCol: C.glass, doorX: 0 }); return { geo: k.build() }; },
    'house-farm': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.cream, roof: C.yellowR, roofD: C.yellowRD }); return { geo: k.build() }; },
    house: () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.cream, roof: C.terra, roofD: C.terraD, plant: true }); return { geo: k.build() }; },
    landhouse: () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.white, roof: C.slate, roofD: C.slateD, doorCol: C.wood }); return { geo: k.build() }; },
    'landhouse-believer': () => { const k = new Kit(); house(k, { W: 3.6, D: 3.4, H: 2.0, wall: C.cream, roof: C.terra, roofD: C.terraD, plant: true }); crossOn(k, -0.75, 1.55, 1.73, 0.55, C.woodD); return { geo: k.build() }; },
    // 공사장: 나무 비계·블록·벽돌 더미
    scaffold: o => { const k = new Kit(), W = o.w * 0.92, D = o.d * 0.92;
      k.box(W, 0.06, D, 0xb08a5c, 0, 0.03, 0, { r: 0 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.1, 1.4, 0.1, C.woodL, sx * (W / 2 - 0.1), 0.7, sz * (D / 2 - 0.1), { r: 0 });
      for (const s of [-1, 1]) { k.box(W - 0.1, 0.07, 0.07, C.woodL, 0, 1.2, s * (D / 2 - 0.1), { r: 0 }); k.box(0.07, 0.07, D - 0.1, C.woodL, s * (W / 2 - 0.1), 1.2, 0, { r: 0 }); k.box(W - 0.1, 0.07, 0.07, C.woodL, 0, 0.6, s * (D / 2 - 0.1), { r: 0 }); }
      const r = mulberry32(o.w * 7 + o.d); for (let i = 0; i < 9; i++) k.box(0.4, 0.22, 0.3, i % 3 ? 0xb9b4aa : C.brick, (r() - 0.5) * (W - 1), 0.17 + (i % 2) * 0.22, (r() - 0.5) * (D - 1), { r: 0.02 });
      for (let i = 0; i < 4; i++) k.box(1.6, 0.1, 0.18, C.woodL, W / 2 - 1.1, 0.08 + i * 0.1, D / 2 - 0.5, { r: 0 });
      return { geo: k.build(0.15) }; },
    // 조경
    statue: () => { const k = new Kit(); k.box(0.9, 0.18, 0.9, C.stone, 0, 0.09, 0, { r: 0.04 }).box(0.62, 0.55, 0.62, C.stoneL, 0, 0.45, 0, { r: 0.05 }).box(0.72, 0.1, 0.72, C.stone, 0, 0.77, 0, { r: 0.03 });
      k.add(new T.LatheGeometry([[0.22, 0], [0.17, 0.4], [0.13, 0.75], [0.02, 0.86]].map(p => new T.Vector2(p[0], p[1])), 10), C.white, 0, 0.82, 0);
      k.add(new T.LatheGeometry([[0.24, 0.0], [0.19, 0.4], [0.15, 0.78], [0.02, 0.92]].map(p => new T.Vector2(p[0], p[1])), 10, Math.PI * 0.75, Math.PI * 1.5), 0x4f7fd0, 0, 0.82, 0);
      k.ball(0.1, C.skin, 0, 1.78, 0.01).ball(0.12, C.white, 0, 1.8, -0.03); k.add(new T.TorusGeometry(0.16, 0.015, 5, 16), C.gold, 0, 1.97, 0, { rx: Math.PI / 2 });
      return { geo: k.build(0.15, 0.6) }; },
    flowerbed: () => { const k = new Kit(); k.box(1.7, 0.3, 1.7, C.woodL, 0, 0.15, 0, { r: 0.05 }).box(1.5, 0.08, 1.5, 0x6b4a2f, 0, 0.3, 0, { r: 0 });
      const r = mulberry32(5), cols = [0xff6a7a, 0xffd44a, 0xff9fc8, 0xffffff, 0xc58cff]; for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * 1.2, z = (r() - 0.5) * 1.2; k.add(lump(0.15, 0, i, 0.9), C.leaf, x, 0.42, z, { grad: [C.leafD, C.leafL, -0.15, 0.15] }).ball(0.07, cols[i % 5], x, 0.58, z, { seg: 6, rows: 4 }); }
      return { geo: k.build(0) }; },
    maryGarden: () => { const k = new Kit(), r = mulberry32(9);
      k.add(lump(1.7, 1, 2, 0.18, 0.1), 0x6f9f45, 0, 0.05, 0, { grad: [0x4f7f30, 0x8fbf55, -0.2, 0.3] });
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.05 + 0.9 * i / 10), x = Math.cos(a) * 1.05, y = Math.sin(a) * 1.5; k.add(lump(0.36 + r() * 0.1, 0, i + 4, 0.8, 0.25), i % 2 ? 0x9a948a : 0xb3ada1, x, y + 0.15, -0.4 + r() * 0.15, { grad: [0x7d776e, 0xc9c3b6, -0.3, 0.3] }); }
      for (let i = 0; i < 6; i++) k.add(lump(0.3, 0, i + 20, 0.8, 0.25), 0xa9a297, -1.2 + i * 0.48, 0.2, -0.75);
      k.box(1.5, 1.7, 0.4, 0x3c3a3a, 0, 0.9, -0.55, { r: 0.2 });
      const s = MODELS.statue().geo.clone(); s.applyMatrix4(M4(0, 0.15, -0.15, { sx: 0.7, sy: 0.7, sz: 0.7 })); k.g.push(s);
      const cols = [0xff4a4a, 0xffd44a, 0xffffff, 0xff9fc8]; for (let i = 0; i < 18; i++) { const a = r() * Math.PI, rr = 0.9 + r() * 0.6, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.6 + 0.35; k.add(lump(0.14, 0, i + 40, 0.9), C.leaf, x, 0.22, z).ball(0.07, cols[i % 4], x, 0.36, z, { seg: 6, rows: 4 }); }
      for (const x of [-0.45, 0.45]) k.cyl(0.04, 0.04, 0.22, 0xfff6e0, x, 0.3, 0.3, { seg: 6, fx: [1.2, 0, 0] });
      return { geo: k.build(0.15, 0.8) }; },
    stations: o => { const k = new Kit(), long = o.w >= o.d, L = (long ? o.w : o.d) * 0.95;
      k.box(long ? L : 1.3, 0.08, long ? 1.3 : L, 0xc9bfa8, 0, 0.04, 0, { r: 0.03 });
      const r = mulberry32(3); for (let i = 0; i < 26; i++) { const t = (i / 25 - 0.5) * L; for (const s of [-1, 1]) k.add(lump(0.11, 0, i, 0.6, 0.3), 0x9a948a, long ? t : s * 0.68, 0.08, long ? s * 0.68 : t); }
      for (let i = 0; i < 7; i++) { const t = (i / 6 - 0.5) * (L - 0.6); k.box(0.07, 0.75, 0.07, C.woodD, long ? t : -0.45, 0.45, long ? -0.45 : t, { r: 0 }).box(long ? 0.3 : 0.07, 0.07, long ? 0.07 : 0.3, C.woodD, long ? t : -0.45, 0.65, long ? -0.45 : t, { r: 0 }); }
      woodCross(k, long ? -L / 2 + 0.2 : -0.45, long ? -0.45 : -L / 2 + 0.2, 1.4); return { geo: k.build(0.1) }; },
    parking: o => { const k = new Kit(), W = o.w * 0.96, D = o.d * 0.96;
      k.box(W, 0.06, D, 0x6a6a68, 0, 0.03, 0, { r: 0 });
      const long = W >= D, n = Math.floor((long ? W : D) / 1.5);
      for (let i = 0; i <= n; i++) { const t = -((long ? W : D) / 2) + 0.2 + i * ((long ? W : D) - 0.4) / n; k.box(long ? 0.06 : (W * 0.55), 0.02, long ? D * 0.55 : 0.06, 0xf4f1e8, long ? t : -W * 0.2, 0.07, long ? -D * 0.2 : t, { r: 0 }); }
      k.box(0.07, 1.1, 0.07, 0x5a6270, W / 2 - 0.2, 0.55, D / 2 - 0.2, { r: 0 }).box(0.45, 0.45, 0.05, 0x2f6fd0, W / 2 - 0.2, 1.2, D / 2 - 0.18, { r: 0.02 }).box(0.16, 0.24, 0.06, 0xffffff, W / 2 - 0.2, 1.2, D / 2 - 0.15, { r: 0 });
      return { geo: k.build(0.08) }; },
  };
  // ---------- 미리 보기 성당 (preview/js/models.js M.church1~3) ----------
  function pvChurch1(extra) { // 컨테이너 성당 (extra: 컨테이너를 하나 더 이어 붙임)
    const k = new Kit(), W = 5.4, D = 6.6, H = 2.5, y0 = 0.3;
    k.box(W + 0.6 + (extra ? 2.8 : 0), 0.3, D + 0.6, C.stoneL, extra ? 1.4 : 0, 0.15, 0, { r: 0.1 });
    k.box(W / 2, H, D, C.orange, -W / 4, y0 + H / 2, 0, { r: 0.1 });
    k.box(W / 2, H, D, 0xdf7c3f, W / 4, y0 + H / 2, 0, { r: 0.1 });
    for (let i = 0; i < 13; i++) for (const s of [1, -1]) k.box(0.1, H - 0.5, 0.08, C.orangeD, s * (W / 2 + 0.01), y0 + H / 2, -D / 2 + 0.4 + i * (D - 0.8) / 12, { r: 0 });
    for (const x of [-2.3, -1.9, -1.5, 1.5, 1.9, 2.3]) k.box(0.08, H - 0.5, 0.1, C.orangeD, x, y0 + H / 2, D / 2 + 0.01, { r: 0 });
    k.roof(W, 0.75, D, y0 + H, C.blue, { over: 0.3, rows: 9, dark: C.blueD, thick: 0.18 });
    k.gables(W, 0.75, D, y0 + H, 0xdf7c3f, { thick: 0.2 });
    if (extra) { // 옆에 덧붙인 초록 컨테이너 (평지붕)
      k.box(2.6, H - 0.2, D - 0.8, C.green, W / 2 + 1.35, y0 + (H - 0.2) / 2, -0.4, { r: 0.1 });
      for (let i = 0; i < 10; i++) k.box(0.1, H - 0.7, 0.08, C.greenD, W / 2 + 2.66, y0 + (H - 0.2) / 2, -D / 2 + 0.8 + i * (D - 1.6) / 9, { r: 0 });
      k.box(2.8, 0.16, D - 0.6, C.white, W / 2 + 1.35, y0 + H - 0.12, -0.4, { r: 0.05 });
      k.window(0.9, 0.8, W / 2 + 1.35, y0 + 1.3, D / 2 - 0.36, { frame: C.white }).window(0.9, 0.8, W / 2 + 2.7, y0 + 1.3, -0.4, { face: 'x', frame: C.white });
    }
    const fz = D / 2;
    k.box(3.0, 0.24, 1.7, C.woodL, 0, 0.42, fz + 0.85, { r: 0.06 });
    k.box(2.4, 0.14, 0.4, C.wood, 0, 0.2, fz + 1.85, { r: 0.05 }).box(2.4, 0.14, 0.4, C.woodL, 0, 0.07, fz + 2.2, { r: 0.05 });
    for (const x of [-1.15, 1.15]) k.box(0.2, 2.0, 0.2, C.white, x, 1.5, fz + 1.45, { r: 0.05 });
    k.roof(2.6, 0.7, 1.6, 2.5, 0x9aa7b8, { over: 0.2, z: fz + 0.8, thick: 0.16, dark: 0x7b889b });
    k.gables(2.6, 0.7, 1.6, 2.5, C.white, { z: fz + 0.8, thick: 0.14 });
    k.box(1.1, 1.85, 0.12, C.wood, 0, 1.45, fz + 0.03, { r: 0.05 }).ball(0.06, C.gold, 0.35, 1.4, fz + 0.12, { seg: 6, rows: 4 });
    k.box(0.1, 0.62, 0.1, C.woodD, 0, 3.75, fz + 1.5, { r: 0.02 }).box(0.4, 0.1, 0.1, C.woodD, 0, 3.85, fz + 1.5, { r: 0.02 });
    for (const z of [-2.1, 0, 2.1]) { k.window(0.95, 0.95, -W / 2 - 0.04, y0 + 1.5, z, { face: 'x', sign: -1, frame: C.blueD }); if (!extra) k.window(0.95, 0.95, W / 2 + 0.04, y0 + 1.5, z, { face: 'x', frame: C.blueD }); }
    k.box(0.7, 0.3, 0.7, C.stone, -3.9, 0.15, fz + 0.5, { r: 0.08 }).box(0.24, 3.8, 0.24, C.wood, -3.9, 2.1, fz + 0.5, { r: 0.05 }).box(1.6, 0.24, 0.24, C.wood, -3.9, 3.0, fz + 0.5, { r: 0.05 });
    return { geo: k.build() };
  }
  function pvChurch2(o) { // 조립식 성당 + 종탑 (steel 철골 · wood 흰 나무 · stone 돌)
    const k = new Kit(), W = o.W || 6.2, D = o.D || 8.2, H = o.H || 3.3, y0 = 0.35, fz = D / 2, wall = o.wall || C.cream, roof = o.roof || C.terra, roofD = o.roofD || C.terraD;
    k.box(W + 0.8, 0.35, D + 0.8, C.stoneL, 0, 0.175, 0, { r: 0.1 });
    k.box(W, H, D, wall, 0, y0 + H / 2, 0, { r: 0.12 });
    k.box(W + 0.06, 0.6, D + 0.06, o.base || 0x8fa3bd, 0, y0 + 0.3, 0, { r: 0.08 });
    for (let i = 0; i <= 8; i++) { const z = -D / 2 + 0.1 + i * (D - 0.2) / 8; for (const s of [1, -1]) k.box(0.08, H - 0.7, 0.07, C.creamD, s * (W / 2 + 0.01), y0 + H / 2 + 0.3, z, { r: 0 }); }
    k.roof(W, 2.0, D, y0 + H, roof, { over: 0.4, rows: 11, dark: roofD, caps: C.white });
    k.gables(W, 2.0, D, y0 + H, wall, { thick: 0.3 });
    const nWin = Math.round(D / 2.05);
    for (let i = 0; i < nWin; i++) { const z = -D / 2 + (i + 0.5) * D / nWin; for (const s of [1, -1]) k.window(0.8, 1.6, s * (W / 2 + 0.04), y0 + 2.5, z, { face: 'x', sign: s, arch: true, frame: C.woodD }); }
    k.add(archPlate(1.9, 2.6, 0.16), C.stone, 0, y0, fz + 0.02).add(archPlate(1.55, 2.35, 0.2), C.wood, 0, y0, fz + 0.05).box(0.06, 2.0, 0.22, C.woodD, 0, y0 + 1.0, fz + 0.06, { r: 0 });
    k.cyl(0.62, 0.62, 0.14, C.stone, 0, y0 + H + 0.75, fz + 0.03, { rx: Math.PI / 2, seg: 16 }).cyl(0.48, 0.48, 0.18, C.glass, 0, y0 + H + 0.75, fz + 0.05, { rx: Math.PI / 2, seg: 16, fx: [1, 0, 0] });
    k.box(0.12, 0.9, 0.12, C.gold, 0, y0 + H + 2.75, fz + 0.2, { r: 0.03 }).box(0.56, 0.12, 0.12, C.gold, 0, y0 + H + 2.9, fz + 0.2, { r: 0.03 });
    for (let i = 0; i < 3; i++) k.box(3.0 - i * 0.3, 0.14, 0.42, C.stoneL, 0, 0.3 - i * 0.11 + 0.02, fz + 0.5 + i * 0.4, { r: 0.05 });
    const tx = -W / 2 - 1.3, tz = fz - 0.4, th = 5.6;
    if ((o.tower || 'steel') === 'steel') {
      k.box(1.9, 0.25, 1.9, C.stone, tx, 0.125, tz, { r: 0.06 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.14, th, 0.14, C.steel, tx + sx * 0.7, th / 2 + 0.2, tz + sz * 0.7, { r: 0.03 });
      for (const yy of [1.6, 3.2, 4.6]) { k.box(1.54, 0.1, 0.1, C.steelD, tx, yy, tz + 0.7, { r: 0 }).box(1.54, 0.1, 0.1, C.steelD, tx, yy, tz - 0.7, { r: 0 }).box(0.1, 0.1, 1.54, C.steelD, tx + 0.7, yy, tz, { r: 0 }).box(0.1, 0.1, 1.54, C.steelD, tx - 0.7, yy, tz, { r: 0 }); }
      for (const yy of [0.9, 2.4]) { k.box(2.1, 0.07, 0.07, C.steelD, tx, yy + 0.4, tz + 0.72, { rz: 0.72, r: 0 }).box(2.1, 0.07, 0.07, C.steelD, tx, yy + 0.4, tz + 0.72, { rz: -0.72, r: 0 }).box(0.07, 0.07, 2.1, C.steelD, tx + 0.72, yy + 0.4, tz, { rx: 0.72, r: 0 }).box(0.07, 0.07, 2.1, C.steelD, tx + 0.72, yy + 0.4, tz, { rx: -0.72, r: 0 }); }
      k.add(new T.ConeGeometry(1.35, 1.1, 4), C.blueD, tx, th + 0.75, tz, { ry: Math.PI / 4 });
    } else { // 흰 나무 종탑 / 돌 종탑: 속이 찬 탑 + 종 칸 + 뾰족 지붕
      const col = o.tower === 'stone' ? C.stoneL : C.white, colD = o.tower === 'stone' ? C.stone : C.creamD;
      k.box(1.9, 0.3, 1.9, C.stone, tx, 0.15, tz, { r: 0.06 }).box(1.5, th - 1.6, 1.5, col, tx, (th - 1.6) / 2 + 0.3, tz, { r: 0.1 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.22, 1.5, 0.22, colD, tx + sx * 0.62, th - 0.55, tz + sz * 0.62, { r: 0.04 });
      k.box(1.7, 0.2, 1.7, colD, tx, th + 0.25, tz, { r: 0.05 });
      k.window(0.5, 0.9, tx, th * 0.5, tz + 0.79, { arch: true, frame: colD }).window(0.5, 0.9, tx + 0.79, th * 0.5, tz, { face: 'x', arch: true, frame: colD });
      k.add(new T.ConeGeometry(1.3, 1.6, 4), roof, tx, th + 1.15, tz, { ry: Math.PI / 4 });
    }
    k.box(0.1, 0.7, 0.1, C.gold, tx, th + (o.tower && o.tower !== 'steel' ? 2.2 : 1.6), tz, { r: 0.02 }).box(0.42, 0.1, 0.1, C.gold, tx, th + (o.tower && o.tower !== 'steel' ? 2.32 : 1.72), tz, { r: 0.02 });
    return { geo: k.build() };
  }
  function pvChurch3() { // 벽돌 성당 (종탑·장미창·제의실)
    const k = new Kit(), W = 7.0, D = 10.0, H = 4.4, y0 = 0.5, fz = D / 2;
    k.box(W + 1.0, 0.5, D + 1.0, C.stoneL, 0, 0.25, 0, { r: 0.12 });
    k.box(W, H, D, C.brick, 0, y0 + H / 2, 0, { r: 0.12 });
    const r2 = mulberry32(77);
    for (let i = 0; i < 46; i++) { const col = r2() < 0.5 ? C.brickL : C.brickD, yy = y0 + 0.5 + r2() * (H - 1.0); if (i % 2) k.box(0.05, 0.2, 0.55, col, W / 2 + 0.01, yy, -D / 2 + 0.6 + r2() * (D - 1.2), { r: 0 }); else k.box(0.55, 0.2, 0.05, col, -W / 2 + 0.6 + r2() * (W - 1.2), yy, fz + 0.01, { r: 0 }); }
    k.roof(W, 3.2, D, y0 + H, C.slate, { over: 0.45, rows: 13, dark: C.slateD, caps: C.white, thick: 0.26 });
    k.gables(W, 3.2, D, y0 + H, C.brick, { thick: 0.34 });
    for (let i = 0; i < 5; i++) {
      const z = -D / 2 + 0.7 + i * (D - 1.4) / 4;
      for (const s of [1, -1]) k.box(0.6, 3.5, 0.7, C.brickD, s * (W / 2 + 0.25), y0 + 1.75, z, { r: 0.06 }).box(0.7, 0.22, 0.8, C.stoneL, s * (W / 2 + 0.25), y0 + 3.55, z, { r: 0.06 });
      if (i < 4) { const zz = z + (D - 1.4) / 8; for (const s of [1, -1]) k.window(0.85, 2.3, s * (W / 2 + 0.05), y0 + 3.1, zz, { face: 'x', sign: s, arch: true, frame: C.stoneL, glass: 0xb7d8ee }); }
    }
    k.add(archPlate(2.5, 3.3, 0.2), C.stoneL, 0.9, y0, fz + 0.03).add(archPlate(2.0, 3.0, 0.26), C.wood, 0.9, y0, fz + 0.06).box(0.07, 2.4, 0.28, C.woodD, 0.9, y0 + 1.2, fz + 0.07, { r: 0 });
    k.cyl(1.0, 1.0, 0.18, C.stoneL, 0.9, y0 + H + 0.75, fz + 0.04, { rx: Math.PI / 2, seg: 20 }).cyl(0.8, 0.8, 0.22, 0xb7d8ee, 0.9, y0 + H + 0.75, fz + 0.06, { rx: Math.PI / 2, seg: 20, fx: [1, 0, 0] });
    k.box(1.6, 0.08, 0.26, C.stoneL, 0.9, y0 + H + 0.75, fz + 0.07, { r: 0 }).box(0.08, 1.6, 0.26, C.stoneL, 0.9, y0 + H + 0.75, fz + 0.07, { r: 0 });
    for (let i = 0; i < 3; i++) k.box(3.6 - i * 0.3, 0.17, 0.5, C.stoneL, 0.9, 0.42 - i * 0.16 + 0.02, fz + 0.75 + i * 0.45, { r: 0.05 });
    const tx = -W / 2 + 0.7, tz = fz - 0.7, tw = 2.8, th = 8.6;
    k.box(tw + 0.4, 0.6, tw + 0.4, C.stoneL, tx, 0.3, tz, { r: 0.1 }).box(tw, th, tw, C.brick, tx, 0.5 + th / 2, tz, { r: 0.12 });
    k.box(tw + 0.2, 0.25, tw + 0.2, C.stoneL, tx, 6.3, tz, { r: 0.06 }).box(tw + 0.3, 0.3, tw + 0.3, C.stoneL, tx, 0.5 + th, tz, { r: 0.08 });
    for (const [dx, dz, face, sign] of [[0, 1, 'z', 1], [1, 0, 'x', 1], [0, -1, 'z', -1], [-1, 0, 'x', -1]]) {
      k.window(0.9, 1.7, tx + dx * (tw / 2 + 0.04), 8.35, tz + dz * (tw / 2 + 0.04), { face, sign, arch: true, frame: C.stoneL, glass: 0x3a3340 });
      k.window(0.6, 1.2, tx + dx * (tw / 2 + 0.04), 4.6, tz + dz * (tw / 2 + 0.04), { face, sign, arch: true, frame: C.stoneL, glass: 0xb7d8ee });
    }
    k.add(new T.ConeGeometry(2.25, 3.2, 4), C.slate, tx, 0.5 + th + 1.75, tz, { ry: Math.PI / 4 });
    k.box(0.14, 1.2, 0.14, C.gold, tx, 0.5 + th + 3.9, tz, { r: 0.03 }).box(0.7, 0.14, 0.14, C.gold, tx, 0.5 + th + 4.15, tz, { r: 0.03 });
    k.box(3.0, 2.8, 3.2, C.brick, W / 2 + 1.2, y0 + 1.4, -D / 2 + 2.0, { r: 0.1 });
    k.roof(3.2, 1.3, 3.0, y0 + 2.8, C.slate, { axis: 'x', x: W / 2 + 1.2, z: -D / 2 + 2.0, rows: 5, dark: C.slateD, over: 0.25 });
    k.gables(3.2, 1.3, 3.0, y0 + 2.8, C.brick, { axis: 'x', x: W / 2 + 1.2, z: -D / 2 + 2.0 });
    k.window(0.7, 1.1, W / 2 + 2.74, y0 + 1.6, -D / 2 + 2.0, { face: 'x', frame: C.stoneL });
    return { geo: k.build(0.24, 1.6) };
  }
  function pvRectory(floors) { // 미리 보기 사제관 (크림 벽, 남색 기와, 굴뚝, 꽃 상자)
    const k = new Kit(), W = 4.4, D = 4.0, H = floors === 2 ? 4.2 : 2.5, y0 = 0.35;
    k.box(W + 0.5, 0.35, D + 0.5, C.stone, 0, 0.175, 0, { r: 0.1 });
    k.box(W, H, D, C.cream, 0, y0 + H / 2, 0, { r: 0.14 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.26, H, 0.26, C.wood, sx * (W / 2 - 0.05), y0 + H / 2, sz * (D / 2 - 0.05), { r: 0.05 });
    k.box(W + 0.1, 0.2, D + 0.1, C.wood, 0, y0 + H - 0.05, 0, { r: 0.05 });
    if (floors === 2) k.box(W + 0.1, 0.18, D + 0.1, C.wood, 0, y0 + 2.1, 0, { r: 0.05 });
    k.roof(D, 1.7, W, y0 + H, C.navy, { axis: 'x', over: 0.45, rows: 9, dark: C.navyD, caps: C.white, thick: 0.26 });
    k.gables(D, 1.7, W, y0 + H, C.cream, { axis: 'x' });
    k.add(archPlate(1.05, 1.9, 0.14), C.wood, -0.9, y0, D / 2 + 0.04).ball(0.06, C.gold, -0.6, y0 + 0.95, D / 2 + 0.14, { seg: 6, rows: 4 });
    k.box(1.5, 0.14, 0.7, C.stoneL, -0.9, 0.3, D / 2 + 0.45, { r: 0.05 });
    for (let f = 0; f < floors; f++) {
      const yy = y0 + 1.5 + f * 2.0;
      k.window(0.9, 0.9, 1.0, yy, D / 2 + 0.04, { frame: C.woodD }).window(0.9, 0.9, W / 2 + 0.04, yy, 0, { face: 'x', frame: C.woodD }).window(0.9, 0.9, -W / 2 - 0.04, yy, 0, { face: 'x', sign: -1, frame: C.woodD });
      if (f) k.window(0.9, 0.9, -0.9, yy, D / 2 + 0.04, { frame: C.woodD });
    }
    k.box(1.2, 0.22, 0.3, C.woodD, 1.0, y0 + 0.88, D / 2 + 0.2, { r: 0.05 });
    for (const [dx, c] of [[-0.35, 0xff7f8f], [0, 0xffd45c], [0.35, 0xff9fc0]]) k.ball(0.14, c, 1.0 + dx, y0 + 1.05, D / 2 + 0.22, { seg: 6, rows: 5 });
    k.box(0.6, 1.5, 0.6, C.stone, 1.2, y0 + H + 1.3, -0.9, { r: 0.08 }).box(0.75, 0.16, 0.75, C.stoneD, 1.2, y0 + H + 2.05, -0.9, { r: 0.05 });
    return { geo: k.build() };
  }
  function prefabPorch(k, x, z, roof = 0x9aa7b8, s = 1) {
    k.box(1.8 * s, 0.16, 1.1 * s, C.stoneL, x, 0.08, z + 0.45, { r: 0.03 });
    for (const sx of [-1, 1]) k.box(0.1, 1.5 * s, 0.1, C.white, x + sx * 0.75 * s, 0.75 * s, z + 0.85 * s, { r: 0 });
    k.roof(1.7 * s, 0.5 * s, 1.2 * s, 1.5 * s, roof, { z: z + 0.45, rows: 4, dark: C.grayD, over: 0.1 }); k.gables(1.7 * s, 0.5 * s, 1.2 * s, 1.5 * s, C.white, { z: z + 0.45 });
    k.door(0.7 * s, 1.3 * s, x, 0.12, z + 0.02, { color: 0xe2b24a });
  }
  function brickTower(k, tx, tz, tw, th) { const r = mulberry32(61); for (let i = 0; i < 40; i++) { const col = r() < 0.5 ? C.brickL : C.brickD, yy = 0.5 + r() * (th - 0.8); if (i % 2) k.box(0.03, 0.11, 0.3, col, tx + tw / 2 + 0.006, yy, tz - tw / 2 + 0.25 + r() * (tw - 0.5), { r: 0 }); else k.box(0.3, 0.11, 0.03, col, tx - tw / 2 + 0.25 + r() * (tw - 0.5), yy, tz + tw / 2 + 0.006, { r: 0 }); } }

  // 자연물 (인스턴싱으로 여러 그루를 한 번에)
  const NAT = {
    // low: 먼 산의 나무는 세모를 덜 쓴다
    tree: (seed, low) => { // v1.10 미리 보기 M.tree: 가지 두 개 + 잎 뭉치 일곱 개
      const k = new Kit(), r3 = mulberry32(seed * 31 + 7), th = 1.5 + r3() * 0.5;
      k.cyl(0.16, 0.3, th, C.trunk, 0, th / 2, 0, { seg: low ? 5 : 7, grad: [0x7d4b2a, 0xb07446, 0, th] });
      if (!low) k.cyl(0.07, 0.12, 0.9, C.trunk, 0.3, th + 0.1, 0.05, { seg: 5, rz: -0.7 }).cyl(0.07, 0.12, 0.9, C.trunk, -0.3, th + 0.15, -0.05, { seg: 5, rz: 0.7 });
      const blobs = [[0, th + 1.25, 0, 1.35], [0.95, th + 0.75, 0.2, 0.95], [-0.9, th + 0.8, -0.15, 1.0], [0.1, th + 0.7, 0.9, 0.9], [-0.1, th + 0.85, -0.9, 0.9], [0.5, th + 1.75, -0.3, 0.8], [-0.45, th + 1.7, 0.35, 0.78]];
      (low ? blobs.slice(0, 4) : blobs).forEach(([x, y, z, r], i) => k.add(lump(r * (0.9 + r3() * 0.2) * (low ? 1.15 : 1), low ? 0 : 1, seed + i * 1.7, 0.88, 0.22), C.leaf, x, y, z, { ry: r3() * 6, grad: [C.leafD, C.leafL, -r * 0.8, r * 0.75] }));
      const g = k.build(0); swayByHeight(g, th, th + 3, 1); return g; },
    pine: (seed, low) => { const k = new Kit(), r3 = mulberry32(seed * 17 + 3);
      k.cyl(0.09, 0.15, 0.6, C.trunk, 0, 0.3, 0, { seg: low ? 4 : 5 });
      (low ? [[0.95, 1.3, 1.05], [0.66, 1.2, 1.9], [0.38, 1.0, 2.6]] : [[0.95, 1.1, 0.95], [0.76, 1.0, 1.6], [0.56, 0.95, 2.2], [0.34, 0.8, 2.75]]).forEach(([r, h, y]) => k.add(new T.ConeGeometry(r * (0.95 + r3() * 0.1), h, low ? 6 : 7), C.pine, 0, y, 0, { ry: r3() * 3, grad: [C.pineD, 0x5fae74, -h / 2, h / 2] }));
      const g = k.build(0); swayByHeight(g, 0.6, 3.2, 0.7); return g; },
    weed: seed => { // v1.10 미리 보기 M.weed
      const k = new Kit(), r3 = mulberry32(seed);
      for (let i = 0; i < 8; i++) { const h = 0.5 + r3() * 0.35, a = i / 8 * 6.28; k.add(new T.ConeGeometry(0.085, h, 4, 1, true), 0x7dbb3c, Math.cos(a) * 0.14, h / 2, Math.sin(a) * 0.14, { rz: -Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5, grad: [0x4f8f2f, 0xa6d957, -h / 2, h / 2] }); }
      for (const [x, z] of [[0.05, 0.02], [-0.16, 0.12], [0.18, -0.1]]) k.add(new T.OctahedronGeometry(0.1, 1), 0xffdf4a, x, 0.78, z);
      const g = k.build(0); swayByHeight(g, 0.1, 0.8, 0.5); return g; },
    bush: seed => { const k = new Kit(); [[0, 0.38, 0, 0.5], [0.42, 0.3, 0.12, 0.38], [-0.38, 0.3, -0.1, 0.4]].forEach(([x, y, z, r], i) => k.add(lump(r, 1, seed + i, 0.88, 0.2), C.leaf, x, y, z, { grad: [C.leafD, C.leafL, -r * 0.7, r * 0.7] })); const g = k.build(0); swayByHeight(g, 0.2, 0.9, 0.35); return g; },
    lamp: () => { const k = new Kit(); k.cyl(0.11, 0.14, 0.24, 0x4a4f63, 0, 0.12, 0, { seg: 8 }).cyl(0.05, 0.06, 2.1, 0x4a4f63, 0, 1.2, 0, { seg: 6 });
      k.box(0.34, 0.4, 0.34, 0xffe2a0, 0, 2.42, 0, { r: 0.06, fx: [1.3, 0, 0] }).box(0.46, 0.1, 0.46, 0x3c4154, 0, 2.66, 0, { r: 0.04 }).box(0.4, 0.06, 0.4, 0x3c4154, 0, 2.2, 0, { r: 0.02 }); return k.build(0.15); },
    bench: () => { const k = new Kit(); k.box(1.5, 0.1, 0.45, C.woodL, 0, 0.45, 0, { r: 0.04 }).box(1.5, 0.4, 0.08, C.woodL, 0, 0.82, -0.2, { r: 0.03 }); for (const x of [-0.6, 0.6]) k.box(0.1, 0.45, 0.4, C.woodD, x, 0.22, 0, { r: 0.03 }); return k.build(0.2); },
    board: () => { const k = new Kit(); for (const x of [-0.75, 0.75]) k.box(0.14, 1.8, 0.14, C.wood, x, 0.9, 0, { r: 0.03 }); k.box(1.7, 1.0, 0.1, C.woodL, 0, 1.25, 0, { r: 0.04 }).roof(0.5, 0.25, 1.9, 1.8, C.navy, { axis: 'x', over: 0.1, thick: 0.1, dark: C.navyD });
      for (const [x, y, c] of [[-0.45, 1.35, 0xfff7e0], [0.1, 1.2, 0xffe08a], [0.5, 1.4, 0xcfe6ff]]) k.box(0.4, 0.5, 0.03, c, x, y, 0.06, { r: 0 }); return k.build(0.2); },
    stone: () => { const k = new Kit(); k.box(0.62, 0.36, 0.42, C.stoneL, 0, 0.18, 0, { r: 0.1 }); return k.build(0.1); },
    rock: seed => { const g = finish(lump(0.5, 1, seed, 0.66, 0.24), C.stone), pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, a = new T.Color(0x99928a), b = new T.Color(0xd8d2c4), m = new T.Color(0x8fbf55);
      for (let i = 0; i < pos.count; i++) { const up = nor.getY(i), t = sm(-0.3, 0.9, up), ms = sm(0.8, 0.97, up) * 0.4; col.setXYZ(i, mix(mix(a.r, b.r, t), m.r, ms), mix(mix(a.g, b.g, t), m.g, ms), mix(mix(a.b, b.b, t), m.b, ms)); pos.setY(i, pos.getY(i) + 0.16); }
      g.computeBoundingSphere(); return g; },
    sapling: () => { const k = new Kit(); k.cyl(0.035, 0.05, 1.3, C.trunk, 0, 0.65, 0, { seg: 5 }); k.add(lump(0.28, 1, 4, 0.9), C.leaf, 0.05, 1.4, 0, { grad: [C.leafD, C.leafL, -0.25, 0.25] }).add(lump(0.22, 1, 6, 0.9), C.leaf, -0.14, 1.28, 0.05, { grad: [C.leafD, C.leafL, -0.2, 0.2] });
      const g = k.build(0); swayByHeight(g, 0.4, 1.6, 0.8); return g; },
    tuft: seed => { const k = new Kit(), r3 = mulberry32(seed);
      for (let i = 0; i < 5; i++) { const h = 0.16 + r3() * 0.14; k.add(new T.ConeGeometry(0.03, h, 3, 1, true), 0x8fd04f, (r3() - 0.5) * 0.16, h / 2, (r3() - 0.5) * 0.16, { rz: (r3() - 0.5) * 0.7, rx: (r3() - 0.5) * 0.7, grad: [0x5a9a3a, 0xbde374, -h / 2, h / 2] }); }
      const g = k.build(0); swayByHeight(g, 0.03, 0.3, 0.4); return g; },
    flower: () => { const k = new Kit(); for (const [x, z, h] of [[0, 0, 0.26], [0.13, 0.08, 0.2], [-0.1, 0.11, 0.22]]) k.add(new T.ConeGeometry(0.02, h, 3, 1, true), 0x5fa83f, x, h / 2, z).add(new T.OctahedronGeometry(0.075, 1), 0xffffff, x, h + 0.04, z);
      const g = k.build(0); swayByHeight(g, 0.05, 0.3, 0.4); return g; },
  };
  // 펜스 한 칸 (길이 1, x 방향). 단계 1~4
  const FENCE = {
    1: () => { const k = new Kit(); k.box(0.07, 0.55, 0.07, C.woodD, 0.02, 0.27, 0, { rz: 0.06, r: 0 }); for (const y of [0.22, 0.42]) k.box(1.0, 0.06, 0.04, 0x9a7650, 0.5, y, 0.02, { rz: 0.02, r: 0 }); return k.build(0.2, 0.4); },
    2: () => { const k = new Kit(); for (let i = 0; i < 4; i++) k.box(0.08, 0.5, 0.035, C.white, 0.12 + i * 0.25, 0.25, 0, { r: 0 }).add(new T.ConeGeometry(0.06, 0.08, 4), C.white, 0.12 + i * 0.25, 0.54, 0, { ry: Math.PI / 4 }); for (const y of [0.16, 0.38]) k.box(1.0, 0.05, 0.03, 0xe8e4dc, 0.5, y, -0.03, { r: 0 }); return k.build(0.15, 0.4); },
    3: () => { const k = new Kit(); k.box(1.0, 0.62, 0.16, 0xc9c6bd, 0.5, 0.31, 0, { r: 0 }).box(1.02, 0.07, 0.22, 0xe0ddd4, 0.5, 0.65, 0, { r: 0 }); k.box(0.012, 0.6, 0.17, 0xb2afa6, 0.5, 0.31, 0, { r: 0 }); return k.build(0.15, 0.4); },
    4: () => { const k = new Kit(); k.box(1.0, 0.45, 0.24, C.brick, 0.5, 0.22, 0, { r: 0 }).box(0.92, 0.06, 0.18, 0x5a3b28, 0.5, 0.45, 0, { r: 0 }); const cols = [0xff6a7a, 0xffd44a, 0xff9fc8, 0xffffff]; for (let i = 0; i < 4; i++) k.add(lump(0.11, 0, i, 0.85), C.leaf, 0.14 + i * 0.24, 0.53, 0, { grad: [C.leafD, C.leafL, -0.1, 0.1] }).ball(0.05, cols[i], 0.14 + i * 0.24, 0.62, 0.02, { seg: 5, rows: 4 }); return k.build(0.15, 0.4); },
  };

  // ---------- 장면 ----------
  // 미리 보기와 같은 내려다보는 각도 (0.8 라디안 ≈ 46도). 입체 화면일 때는 바닥 마름모 세로 비율(TH)도 이 각도에 맞춘다
  const EL = 0.8, S = TW / 2 * Math.SQRT2, SINP = Math.sin(EL), COSP = Math.cos(EL), TH3 = TW * SINP;
  const DIR = new T.Vector3(-COSP / Math.SQRT2, -SINP, -COSP / Math.SQRT2), UPV = new T.Vector3(-SINP / Math.SQRT2, COSP, -SINP / Math.SQRT2);
  const U = { uTime: { value: 0 }, uWind: { value: 0.05 }, uSnow: { value: 0 }, uGlow: { value: 0 }, uGlowColor: { value: new T.Color(1.0, 0.72, 0.36) } };
  let renderer = null, scene, camera, sun, hemi, mat, canvas3, vig = null, failed = false;
  const st = { bSig: '', gSig: '', oSig: '', fSig: '', ent: new Map(), ground: null, groundTex: null, nat: [], deco: [], fence: [], obs: new Set(), dirty: true, lastRender: 0, camKey: '', shadowDirty: true, sigAt: 0, builtAt: 0 };
  const geoCache = new Map();

  function makeMat() {
    const m = new T.MeshLambertMaterial({ vertexColors: true }); // v1.10 미리 보기와 같은 재질
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 fx;\nvarying vec3 vFx;\nvarying float vUp;\nuniform float uTime;\nuniform float uWind;')
        .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvec3 wn = objectNormal;\n#ifdef USE_INSTANCING\nwn = mat3(instanceMatrix) * wn;\n#endif\nvUp = normalize(mat3(modelMatrix) * wn).y;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFx = fx;\nif (fx.y > 0.0) {\n#ifdef USE_INSTANCING\nvec4 wp0 = modelMatrix * instanceMatrix * vec4(position, 1.0);\n#else\nvec4 wp0 = modelMatrix * vec4(position, 1.0);\n#endif\nfloat ph = wp0.x * 0.35 + wp0.z * 0.27;\nfloat sw = sin(uTime * 1.5 + ph) * 0.6 + sin(uTime * 2.9 + ph * 1.7) * 0.4;\ntransformed.x += sw * fx.y * uWind;\ntransformed.z += sw * fx.y * uWind * 0.6;\n}');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFx;\nvarying float vUp;\nuniform float uSnow;\nuniform float uGlow;\nuniform vec3 uGlowColor;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 0.99), uSnow * min(vFx.z, 1.0) * smoothstep(0.35, 0.8, vUp));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowColor * (vFx.x * uGlow);');
    };
    return m;
  }

  // 화질 단계: 버거우면 저절로 내려간다 (기기에 기억)
  const TIERS = [{ dpr: 2, shadow: 2048, wind: 30 }, { dpr: 1.5, shadow: 2048, wind: 20 }, { dpr: 1.25, shadow: 1024, wind: 12 }, { dpr: 1, shadow: 1024, wind: 0 }];
  let tier = 0; try { tier = cl(parseInt(localStorage.getItem('sungdang-3d-tier') || '0', 10) || 0, 0, TIERS.length - 1); } catch (e) { /* 무시 */ }
  function setTier(i) {
    tier = cl(i, 0, TIERS.length - 1);
    try { localStorage.setItem('sungdang-3d-tier', String(tier)); } catch (e) { /* 무시 */ }
    if (!renderer) return;
    const t = TIERS[tier];
    if (sun.shadow.mapSize.x !== t.shadow) { sun.shadow.mapSize.set(t.shadow, t.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } st.shadowDirty = true; }
    resize();
  }

  function init() {
    if (renderer || failed) return !!renderer;
    try {
      canvas3 = document.createElement('canvas'); canvas3.id = 'world3d';
      const w = document.getElementById('world'); w.parentNode.insertBefore(canvas3, w);
      vig = document.createElement('div'); vig.id = 'w3vig'; w.parentNode.insertBefore(vig, w.nextSibling);
      const css = document.createElement('style');
      css.textContent = '#world3d{position:fixed;inset:0;width:100%;height:100%;display:none;pointer-events:none;background:linear-gradient(#8fd3f2,#d8f1f4 62%)}#world3d.inside{background:radial-gradient(ellipse at 50% 40%,#5a4636,#2a211b 75%)}#w3vig{position:fixed;inset:0;pointer-events:none;display:none;background:radial-gradient(ellipse 75% 70% at 50% 48%,rgba(0,0,0,0) 55%,rgba(70,50,20,.22) 100%)}body.in-world #w3vig.on{display:block}body.in-world #world3d.on{display:block}#w3fps{position:fixed;left:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);z-index:50;background:rgba(34,26,20,.8);color:#fff;font:11px/1.4 system-ui;padding:4px 8px;border-radius:8px;pointer-events:none}';
      document.head.appendChild(css);
      renderer = new T.WebGLRenderer({ canvas: canvas3, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0); // 하늘은 CSS 빛띠 (미리 보기처럼)
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(40, 1, 1, 420); // v1.10 미리 보기와 같은 원근 카메라
      hemi = new T.HemisphereLight(0xdcefff, 0xb7a26a, 1.9); scene.add(hemi); // 미리 보기 낮 빛
      sun = new T.DirectionalLight(0xfff3dc, 2.35); sun.castShadow = true;
      sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
      scene.add(sun); scene.add(sun.target);
      mat = makeMat();
      window.addEventListener('resize', resize);
      // 폰에서 앱을 내렸다 올리면 그림판(WebGL)을 잃을 수 있다 → 되찾으면 다시 그린다
      canvas3.addEventListener('webglcontextlost', e => e.preventDefault());
      canvas3.addEventListener('webglcontextrestored', () => { st.dirty = true; st.shadowDirty = true; });
      setTier(tier);
      if (/[?&]fps=1/.test(location.search)) { const d = document.createElement('div'); d.id = 'w3fps'; document.body.appendChild(d); }
      return true;
    } catch (e) { console.warn('3D 화면을 열지 못했어요', e); failed = true; return false; }
  }
  function resize() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    st.dirty = true;
  }

  // ---------- 바닥: 지금 게임의 바닥 무늬를 위에서 본 한 장으로 ----------
  const GP = 32; // 한 칸 = 32픽셀
  function groundCanvas(m) {
    // v1.10 사용자 "페이블 미리 보기 그대로": 미리 보기 땅 색(연두 풀밭, 건물 둘레 밝은 마당, 가장자리가 흔들리는 모래빛 길, 건물·나무 밑 옅은 그늘)
    const c = document.createElement('canvas'); c.width = m.w * GP; c.height = m.h * GP;
    const g = c.getContext('2d'), P = 128, K = GP / P;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const pp = Game.state.pastor && Game.state.pastor.paths, isPath = (x, y) => { const k = x + ',' + y; return x >= 0 && y >= 0 && x < m.w && y < m.h && !World.lockedTiles.has(k) && (World.pathSet.has(k) || !!(pp && pp[k])); };
    const isMain = (x, y) => World.pathSet.has(x + ',' + y);
    const blds = World.buildings.filter(b => !b.decor || b.decor === 'statue');
    const rd = (x, z, x0, z0, x1, z1) => { const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); return Math.hypot(dx, dz); };
    const R = 4, W = m.w * R, H = m.h * R, f = document.createElement('canvas'); f.width = W; f.height = H;
    const fg = f.getContext('2d'), img = fg.createImageData(W, H), d = img.data;
    const cA = [155, 210, 79], cB = [127, 192, 67], cD = [90, 165, 63], cY = [169, 216, 88], cP = [233, 207, 150], cR = [214, 200, 170];
    const lerp3 = (o, a, t) => { o[0] += (a[0] - o[0]) * t; o[1] += (a[1] - o[1]) * t; o[2] += (a[2] - o[2]) * t; };
    const col = [0, 0, 0];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / R, z = (py + 0.5) / R, tx = Math.floor(x), tz = Math.floor(z);
      col[0] = cA[0]; col[1] = cA[1]; col[2] = cA[2];
      lerp3(col, cB, fbm(x * 0.25 + 40, z * 0.25 + 17, 2)); lerp3(col, cD, sm(0.45, 0.8, fbm(x * 0.07 + 3, z * 0.07 + 8, 3)) * 0.7);
      // 건물 둘레 마당 (밝은 연두)
      let yd = 99; for (const b of blds) { const q = rd(x, z, b.x, b.y, b.x + b.w, b.y + b.d); if (q < yd) yd = q; }
      lerp3(col, cY, (1 - sm(0.4, 2.6, yd)) * 0.75);
      // 길: 가까운 길 칸까지 거리 (가장자리를 조금 흔든다)
      let pd = 9, md = 9;
      for (let j = tz - 2; j <= tz + 2; j++) for (let i = tx - 2; i <= tx + 2; i++) if (isPath(i, j)) { const q = rd(x, z, i, j, i + 1, j + 1); if (q < pd) pd = q; if (isMain(i, j) && q < md) md = q; }
      const wob = (vnoise(x * 3.2, z * 3.2) - 0.5) * 0.28;
      lerp3(col, cP, 1 - sm(-0.05, 0.22, pd + wob));
      lerp3(col, cR, (1 - sm(-0.05, 0.2, md + wob)) * 0.85);
      const k = (py * W + px) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    fg.putImageData(img, 0, 0);
    g.drawImage(f, 0, 0, c.width, c.height);
    g.setTransform(K, 0, 0, K, 0, 0);
    if (Game.state.pastor) { const fc = farmCanvas(m); if (fc) g.drawImage(fc, 0, 0, m.w * P, m.h * P); }
    // 옅은 그늘: 건물·나무 밑 (미리 보기의 aoSpots)
    const ao = (x, z, r, a) => { const gr = g.createRadialGradient(x * P, z * P, r * P * 0.3, x * P, z * P, r * P); gr.addColorStop(0, `rgba(30,40,10,${a})`); gr.addColorStop(1, 'rgba(30,40,10,0)'); g.fillStyle = gr; g.fillRect((x - r) * P, (z - r) * P, r * 2 * P, r * 2 * P); };
    for (const b of blds) ao(b.x + b.w / 2, b.y + b.d / 2, Math.max(b.w, b.d) / 2 + 1.6, b.decor ? 0.18 : 0.3);
    for (const o of (m.obstacles ? m.obstacles() : [])) if (o.type === 'tree') ao(o.x + o.w / 2, o.y + o.d / 2, 2.2, 0.2);
    // 아직 안 산 땅·잠긴 마을은 조금 어둡게 (2D에서 위에 덮던 것을 바닥에 굽는다 → 나무·건물은 어두워지지 않는다)
    if (Game.state.pastor) {
      g.fillStyle = 'rgba(46,38,24,.2)';
      for (const l of LOTS) if (!l.village && !lotOwnedAt(l.x, l.y)) g.fillRect(l.x * P, l.y * P, l.w * P, l.h * P);
      g.fillStyle = 'rgba(46,38,24,.26)';
      for (const r of m.regions || []) if (regionLocked(r.id)) g.fillRect(r.x * P, r.y * P, r.w * P, r.h * P);
    }
    return c;
  }

  // 디딤돌 길 (예시 그림처럼 밝은 베이지 판석, 둥근 모서리)
  let flagC = null;
  function flagTex() {
    if (flagC) return flagC;
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    g.fillStyle = '#cdbf9f'; g.fillRect(0, 0, S, S);
    const r = mulberry32(77), cols = ['#efe6d2', '#e6dbc3', '#f3ecdc', '#e0d4b9'];
    const stone = (x, y, w, h, col) => { for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.fillStyle = 'rgba(140,120,85,.35)'; g.beginPath(); g.roundRect(x + ox + 1, y + oy + 2, w, h, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(x + ox, y + oy, w, h, 7); g.fill(); } };
    for (let row = 0; row < 4; row++) { let x = row % 2 ? -14 : 0; while (x < S) { const w = 26 + r() * 14; stone(x + 2, row * 32 + 2, w - 4, 28, cols[(r() * 4) | 0]); x += w; } }
    return (flagC = cv);
  }
  function buildGround(m) {
    const c = groundCanvas(m); if (!c) return false;
    if (st.groundTex) st.groundTex.dispose();
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;
    st.groundTex = tex;
    if (!st.ground) {
      const g = new T.PlaneGeometry(m.w, m.h); g.rotateX(-Math.PI / 2); g.translate(m.w / 2, 0, m.h / 2);
      st.ground = new T.Mesh(g, new T.MeshLambertMaterial({ map: tex })); st.ground.receiveShadow = true; scene.add(st.ground);
      buildHills(m);
    } else { st.ground.material.map = tex; st.ground.material.needsUpdate = true; }
    return true;
  }
  // 지도 밖: 본당을 감싸는 산 (뒤쪽은 높게, 화면 앞쪽은 낮게) + 숲
  function hillH(m, x, z) {
    const dx = Math.max(0, -x, x - m.w), dz = Math.max(0, -z, z - m.h), d = Math.hypot(dx, dz);
    if (d <= 0) return -0.03;
    const back = sm(0.15, -0.35, ((x + z) - (m.w + m.h) / 2) / (m.w + m.h)); // 뒤쪽(화면 위)일수록 1
    const n = fbm(x * 0.06, z * 0.06, 4);
    return sm(0, 26, d) * mix(2.2, 15, back) * (0.55 + n * 0.9) + sm(0, 4, d) * 0.4 * n;
  }
  function buildHills(m) {
    const E = 46, W = m.w + E * 2, H = m.h + E * 2, g = new T.PlaneGeometry(W, H, 92, 96); g.rotateX(-Math.PI / 2); g.translate(m.w / 2, 0, m.h / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), a = new T.Color(0x7aa64a), b = new T.Color(0x3f6f3a), c2 = new T.Color(0x93ad5c);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = hillH(m, x, z); pos.setY(i, h);
      const t = sm(0.3, 6, h), n = fbm(x * 0.15 + 9, z * 0.15, 2), cc = a.clone().lerp(b, t).lerp(c2, sm(0.6, 0.85, n) * (1 - t) * 0.6);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    const hills = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true })); hills.receiveShadow = true; scene.add(hills);
    // 산의 숲 (지도 가장자리에서 조금 떨어진 곳부터)
    const r = mulberry32(2026), pines = [], trees = [];
    for (let i = 0; i < 9000 && pines.length + trees.length < 560; i++) {
      const x = -E + r() * W, z = -E + r() * H, dx = Math.max(0, -x, x - m.w), dz = Math.max(0, -z, z - m.h), d = Math.hypot(dx, dz);
      if (d < 1.5 || r() > sm(1.5, 10, d)) continue;
      const h = hillH(m, x, z), s = 0.9 + r() * 0.8;
      (h > 3 || r() < 0.55 ? pines : trees).push([x, h - 0.05, z, s * (h > 3 ? 1.25 : 1)]);
    }
    instanced(NAT.pine(1, true), pines, true, 'hill');
    instanced(NAT.tree(3, true), trees, true, 'hill');
  }
  // 같은 모양 여러 개 (list: [x, y, z, scale, rotY?])
  function instanced(geo, list, cast, tag) {
    if (!list.length) return null;
    const im = new T.InstancedMesh(geo, mat, list.length), d = new T.Object3D(), c = new T.Color();
    list.forEach((it, i) => {
      d.position.set(it[0], it[1], it[2]); d.rotation.set(0, it[4] === undefined ? h2(it[0] * 13 | 0, it[2] * 7 | 0, 3) * 6.28 : it[4], 0); d.scale.setScalar(it[3] || 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      const v = 0.88 + h2(i, 7, 11) * 0.22; c.setRGB(v, 0.94 + h2(i, 9, 3) * 0.12, v * (0.85 + h2(i, 2, 5) * 0.15)); im.setColorAt(i, c);
    });
    im.castShadow = !!cast; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
    if (tag === 'nat') st.nat.push(im); else if (tag === 'deco') st.deco.push(im); else if (tag === 'fence') st.fence.push(im);
    return im;
  }
  function dropList(list) { for (const im of list) { scene.remove(im); im.dispose(); } list.length = 0; }

  // ---------- 건물 ----------
  const CHAR_MODEL = { seminary: { chapel: 'church4', lecture: 'office5', dorm: 'rectory3' }, parish: { church: 'church5', rectory: 'rectory3', office: 'office3', edu: 'classroom5|1' } };
  function modelKey(b) {
    if (!World.overview) { const cm = CHAR_MODEL[World.mapId] || {}; if (cm[b.id]) return cm[b.id]; if (b.style === 'cottage') return 'house'; }
    if (b.scaffold) return `scaffold|${b.w}x${b.d}`;
    if (b.decor) return b.decor === 'statue' || b.decor === 'flowerbed' || b.decor === 'maryGarden' ? b.decor : `${b.decor}|${b.w}x${b.d}`;
    const k = spriteKeys(b)[0] || '';
    if (/^church-lv\d$/.test(k)) return 'church' + k.slice(-1);
    if (/^(rectory|office)-lv\d$/.test(k)) return k.replace('-lv', '');
    if (/^classroom-lv\d$/.test(k)) return `classroom${k.slice(-1)}|${b.color || 0}`;
    if (/^gongso/.test(k)) return 'gongso';
    if (/^house-house/.test(k)) return 'house';
    return MODELS[k] ? k : '';
  }
  function geoFor(key, b) {
    if (geoCache.has(key)) return geoCache.get(key);
    const name = key.split('|')[0], fn = MODELS[name];
    let g = null;
    try { if (fn) g = fn({ w: b.w, d: b.d, color: b.color, rot: b.rot }).geo; } catch (e) { console.warn('모형 실패', key, e); }
    geoCache.set(key, g); return g;
  }
  // 모형을 바닥 칸(w×d, 돌린 뒤)에 맞춰 놓는다. 앞(+z)이 문 쪽: S=+y, E=+x, N=-y, W=-x
  const ROT_Y = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
  function placeMesh(geo, b, fit = 0.97) {
    const mesh = new T.Mesh(geo, mat), bb = geo.boundingBox, side = (b.door && b.door.side) || 'S', ry = ROT_Y[side] || 0, odd = side === 'E' || side === 'W';
    const ex = bb.max.x - bb.min.x, ez = bb.max.z - bb.min.z, fw = odd ? ez : ex, fd = odd ? ex : ez;
    const sx = b.w * fit / fw, sz = b.d * fit / fd, sy = Math.sqrt(sx * sz);
    mesh.scale.set(odd ? sz : sx, sy, odd ? sx : sz);
    mesh.rotation.y = ry;
    const cx = (bb.max.x + bb.min.x) / 2, cz = (bb.max.z + bb.min.z) / 2;
    mesh.position.set(b.x + b.w / 2, 0, b.y + b.d / 2);
    mesh.updateMatrix(); const off = new T.Vector3(-cx, 0, -cz).applyMatrix4(new T.Matrix4().makeRotationY(ry).multiply(new T.Matrix4().makeScale(mesh.scale.x, 1, mesh.scale.z)));
    mesh.position.add(off);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    return mesh;
  }
  // 화면에서 가장 높은 점 (말풍선·⬆ 자리)
  // v1.10: 모형의 가장 높은 곳(3D 점)을 기억해 두고, 화면 자리는 카메라가 움직일 때마다 다시 비춘다
  function topPoint(mesh) {
    const pos = mesh.geometry.attributes.position, v = new T.Vector3(); let best = -Infinity, bx = 0, bz = 0;
    const step = Math.max(1, Math.floor(pos.count / 1500));
    for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrix); if (v.y > best) { best = v.y; bx = v.x; bz = v.z; } }
    const bb = new T.Box3().setFromObject(mesh), c = bb.getCenter(new T.Vector3());
    return [c.x * 0.6 + bx * 0.4, best, c.z * 0.6 + bz * 0.4];
  }
  const screenTop = mesh => { const t = topPoint(mesh); return { p: t, s: [0, 0] }; };
  function topOnScreen(e) { const p = e.top.p; const q = proj(p[0], p[2], p[1] + 0.15); e.top.s[0] = q[0]; e.top.s[1] = q[1]; return e.top.s; }
  function bSigOf(list) { return list.map(b => [b.id, b.x, b.y, b.w, b.d, b.door && b.door.side, modelKey(b)].join(':')).join('|'); }
  function syncBuildings() {
    const sig = bSigOf(World.buildings);
    if (sig !== st.bSig) {
      st.bSig = sig;
      const keep = new Map();
      for (const b of World.buildings) {
        const key = modelKey(b); if (!key) continue;
        const id = b.id + '@' + b.x + ',' + b.y + ':' + (b.door && b.door.side) + ':' + key;
        let e = st.ent.get(id);
        if (!e) { const geo = geoFor(key, b); if (!geo) continue; const flat = /^(scaffold|parking|stations)/.test(key); const mesh = placeMesh(geo, flat ? { ...b, door: { side: 'S' } } : b, b.decor ? 0.95 : 0.97); scene.add(mesh); e = { mesh, top: screenTop(mesh), bid: b.id }; }
        keep.set(id, e);
      }
      for (const [id, e] of st.ent) if (!keep.has(id)) scene.remove(e.mesh);
      st.ent = keep; st.byB = new Map(); for (const e of keep.values()) st.byB.set(e.bid, e);
      if (st.ground) { buildGround(World.map); syncDeco(World.map); } // 마당·그늘이 건물 자리를 따른다
      st.shadowDirty = true; st.dirty = true;
    }
    // 건물 정보(누르기·말풍선 자리)는 건물 목록이 다시 만들어질 때마다 붙여 준다
    for (const b of World.buildings) {
      const e = st.byB && st.byB.get(b.id);
      if (!e) { b._m3 = null; continue; }
      if (b._m3 !== e) { b._m3 = e; b.spriteHit = { three: true }; }
      b.spriteTop = topOnScreen(e);
      const hide = !!(World.placing && World.placing.move === b.id);
      if (e.mesh.visible === hide) { e.mesh.visible = !hide; st.dirty = true; st.shadowDirty = true; }
    }
  }

  // ---------- 나무·돌·잡초·집(땅 사기)·성모상 ----------
  function syncObstacles(m) {
    const p = Game.state.pastor, list = (m.obstacles ? m.obstacles() : []).filter(o => !(o.type !== 'tree' && regionLocked(m.regionAt(o.x, o.y))) && !(o.type !== 'tree' && o.type !== 'house' && p && farmPatchAt(o.x, o.y)));
    const sig = list.map(o => o.id).join(',') + '|' + (m.statues || []).join(';') + '|' + (m.obstacles ? '' : (m.trees || []).length);
    if (sig === st.oSig) return;
    st.oSig = sig; dropList(st.nat);
    for (const e of st.obsHouses || []) scene.remove(e);
    st.obsHouses = []; st.obs = new Set(list.map(o => o.id));
    const tree0 = [], tree1 = [], weeds = [], rocks = [], saps = [], tufts = [];
    if (!m.obstacles) (m.trees || []).forEach(([x, y], i) => (i % 3 === 2 ? tree1 : tree0).push([x + 0.5 + (h2(x, y, 1) - 0.5) * 0.3, 0, y + 0.5 + (h2(x, y, 2) - 0.5) * 0.3, 0.75 + h2(x, y, 3) * 0.25]));
    for (const o of list) {
      const cx = o.x + o.w / 2, cz = o.y + o.d / 2, h = (s) => h2(o.x, o.y, s);
      if (o.type === 'tree') (o.treeKind ? tree1 : tree0).push([cx + (h(1) - 0.5) * 0.4, 0, cz + (h(2) - 0.5) * 0.4, (o.treeKind ? 1.15 : 0.95) * (0.9 + h(3) * 0.25)]);
      else if (o.type === 'weed') for (let i = 0; i < 2; i++) weeds.push([o.x + 0.45 + h(i + 4) * (o.w - 0.9), 0, o.y + 0.45 + h(i + 9) * (o.d - 0.9), 1.1 + h(i) * 0.4]);
      else if (o.type === 'rock') { rocks.push([cx, 0, cz, 1.05 + h(5) * 0.3]); rocks.push([cx + 0.55, 0, cz + 0.5, 0.45]); tufts.push([cx - 0.6, 0, cz + 0.4, 1.4]); }
      else if (o.type === 'sapling') { saps.push([cx, 0, cz, 1 + h(6) * 0.3]); tufts.push([cx + 0.4, 0, cz + 0.3, 1.2]); }
      else if (o.type === 'house') {
        const key = o.believer ? 'landhouse-believer' : 'landhouse', geo = geoFor(key, o);
        if (geo) { const mesh = placeMesh(geo, { ...o, door: { side: 'S' } }); scene.add(mesh); st.obsHouses.push(mesh); }
      }
    }
    for (const [x, y] of m.statues || []) { const G = m.grid || 1, geo = geoFor('statue', {}); if (geo) { const mesh = placeMesh(geo, { x: x + G * 0.2, y: y + G * 0.2, w: G * 0.6, d: G * 0.6, door: { side: 'S' } }, 1); scene.add(mesh); st.obsHouses.push(mesh); } }
    instanced(NAT.tree(1), tree0.filter((_, i) => i % 2 === 0), true, 'nat'); instanced(NAT.tree(2), tree0.filter((_, i) => i % 2 === 1), true, 'nat');
    instanced(NAT.pine(1), tree1, true, 'nat'); instanced(NAT.weed(4), weeds, false, 'nat');
    instanced(NAT.rock(2), rocks, true, 'nat'); instanced(NAT.sapling(), saps, true, 'nat'); instanced(NAT.tuft(9), tufts, false, 'nat');
    syncDeco(m); // 풀포기 자리도 다시
    st.shadowDirty = true; st.dirty = true;
  }
  // 빈 땅의 풀포기·들꽃 (꾸밈, 누를 수 없다): 바닥·건물·장애물이 바뀌면 다시 심는다
  function syncDeco(m) {
    dropList(st.deco);
    const busy = new Set(), mark = (x, y, w, d) => { for (let i = Math.floor(x); i < x + w; i++) for (let j = Math.floor(y); j < y + d; j++) busy.add(i + ',' + j); };
    for (const b of World.buildings) mark(b.x - 0.5, b.y - 0.5, b.w + 1, b.d + 1);
    for (const o of (m.obstacles ? m.obstacles() : [])) mark(o.x, o.y, o.w, o.d);
    const pp = (Game.state.pastor && Game.state.pastor.paths) || {};
    const tufts = [], flowers = [];
    for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) {
      const k = x + ',' + y;
      if (busy.has(k) || World.pathSet.has(k) || pp[k] || (Game.state.pastor && farmPatchAt(x, y))) continue;
      const n = fbm(x * 0.12, y * 0.12, 2), r = h2(x, y, 77);
      if (r < 0.04 + n * 0.08) tufts.push([x + h2(x, y, 1), 0, y + h2(x, y, 2), 0.9 + h2(x, y, 3) * 0.8]);
      if (h2(x, y, 91) < 0.06 + sm(0.5, 0.8, n) * 0.2) flowers.push([x + h2(x, y, 4), 0, y + h2(x, y, 5), 1 + h2(x, y, 6) * 0.6]);
    }
    // v1.10 미리 보기 소품 (누를 수 없고 지나갈 수 있는 꾸밈)
    const free = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !busy.has(x + ',' + y) && !World.pathSet.has(x + ',' + y) && !pp[x + ',' + y] && !(World.blocked && World.blocked[x] && World.blocked[x][y]) && !World.lockedTiles.has(x + ',' + y) && !(Game.state.pastor && farmPatchAt(x, y));
    const isP = (x, y) => World.pathSet.has(x + ',' + y) || !!pp[x + ',' + y], used = new Set(), take = (x, y) => { used.add(x + ',' + y); busy.add(x + ',' + y); };
    const lamps = [], benches = [], boards = [], bushes = [];
    // 가로등: 길 옆 빈 칸, 서로 4칸 넘게 떨어지게
    const pathCells = []; for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) if (isP(x, y)) pathCells.push([x, y]);
    for (const [x, y] of pathCells) { if (lamps.length >= 26) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!free(nx, ny) || isP(nx, ny) || lamps.some(l => Math.hypot(l[0] - nx, l[2] - ny) < 4.5)) continue; lamps.push([nx + 0.5 - dx * 0.25, 0, ny + 0.5 - dy * 0.25, 0.8]); take(nx, ny); break; } }
    // 성당(신학교 성당) 앞: 벤치 둘·게시판 하나
    const ch = World.buildings.find(b => b.id === 'church' || b.id === 'chapel');
    if (ch && ch.doorPt) { const [dx, dz] = ch.doorPt;
      const want = ['b', 'b', 'n', 'b'];
      for (let r = 2; r <= 7 && want.length; r++) for (let a = 0; a < 6.28 && want.length; a += 0.5) { const x = Math.floor(dx + Math.cos(a) * r), y = Math.floor(dz + 1 + Math.abs(Math.sin(a)) * r * 0.8);
        if (!free(x, y) || used.has(x + ',' + y) || [...benches, ...boards].some(q => Math.hypot(q[0] - x - 0.5, q[2] - y - 0.5) < 2.2)) continue;
        const kind = want.shift(); take(x, y); (kind === 'b' ? benches : boards).push([x + 0.5, 0, y + 0.5, kind === 'b' ? 0.75 : 0.7, Math.atan2(dx - x - 0.5, dz - y - 0.5)]); } }
    // 지도 가장자리 나무 (짓는 땅은 비워 둔다)
    const etrees = [];
    for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) { const edge = Math.min(x, y, m.w - 1 - x, m.h - 1 - y); if (edge > 1 || h2(x, y, 41) > 0.32 || !free(x, y) || etrees.some(q => Math.hypot(q[0] - x, q[2] - y) < 2.6)) continue; take(x, y); etrees.push([x + 0.5, 0, y + 0.5, 0.8 + h2(x, y, 42) * 0.3]); }
    instanced(NAT.tree(6), etrees, true, 'deco');
    // 건물 모퉁이 덤불
    for (const b of World.buildings) { if (b.decor || b.scaffold) continue;
      for (const [cx, cy] of [[b.x - 1, b.y + b.d], [b.x + b.w, b.y + b.d], [b.x - 1, b.y - 1], [b.x + b.w, b.y - 1]]) { const x = Math.floor(cx), y = Math.floor(cy); if (h2(x, y, 13) < 0.45 || !free(x, y)) continue; take(x, y); bushes.push([x + 0.5, 0, y + 0.5, 0.8 + h2(x, y, 14) * 0.4]); } }
    instanced(NAT.lamp(), lamps, true, 'deco'); instanced(NAT.bench(), benches, true, 'deco'); instanced(NAT.board(), boards, true, 'deco'); instanced(NAT.bush(5), bushes, true, 'deco');
    st.lamps = lamps;
    instanced(NAT.tuft(11), tufts, false, 'deco');
    const fl = instanced(NAT.flower(), flowers, false, 'deco');
    if (fl) { const c = new T.Color(), fc = [[1, 1, 1], [1, 0.85, 0.35], [1, 0.6, 0.7], [0.8, 0.7, 1], [1, 0.75, 0.45]]; for (let i = 0; i < flowers.length; i++) { const f = fc[i % 5]; c.setRGB(f[0], f[1], f[2]); fl.setColorAt(i, c); } fl.instanceColor.needsUpdate = true; }
  }
  function syncFence(m) {
    const p = Game.state.pastor, lv = (p && p.fence) || 0;
    const edges = lv && typeof fenceEdges === 'function' ? fenceEdges() : [];
    const sig = lv + '|' + edges.length + '|' + st.gSig;
    if (sig === st.fSig) return;
    st.fSig = sig; dropList(st.fence);
    if (!lv || !FENCE[lv]) return;
    const list = edges.map(e => e.ay === e.by ? [e.ax, 0, e.ay, 1, 0] : [e.ax, 0, e.ay + 1, 1, Math.PI / 2]);
    instanced(FENCE[lv](), list, true, 'fence');
    st.shadowDirty = true; st.dirty = true;
  }

  // ---------- 사람: 큰 머리·작은 몸 인형 (미리 보기 M.person) ----------
  const hexN = h => parseInt(String(h || '#888888').slice(1), 16);
  function personGeo(look) {
    const L = typeof look === 'object' ? look : LOOKS[look] || LOOKS.p1, k = new Kit(), body = hexN(L.body), hair = hexN(L.hair || '#3a2a22'), skin = hexN(L.skin || '#f6cfa8'), long = L.robe ? 0.06 : 0;
    k.cyl(0.15, 0.26 + long, 0.6, body, 0, 0.32, 0, { seg: 10 });
    if (!L.robe) for (const x of [-0.08, 0.08]) k.box(0.1, 0.12, 0.13, hexN(L.legs || '#3d4a5c'), x, 0.05, 0.02, { r: 0.03 });
    for (const x of [-0.23, 0.23]) k.box(0.11, 0.32, 0.13, body, x, 0.42, 0, { r: 0.05, rz: x > 0 ? 0.25 : -0.25 }).ball(0.055, skin, x * 1.25, 0.26, 0.02, { seg: 6, rows: 4 });
    k.ball(0.3, skin, 0, 0.9, 0, { seg: 14, rows: 10 });
    if (!L.veil) k.add(new T.SphereGeometry(0.325, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.93, -0.03, { rx: -0.25 });
    for (const x of [-0.11, 0.11]) k.ball(0.036, 0x2a2020, x, 0.9, 0.275, { seg: 6, rows: 4 });
    for (const x of [-0.19, 0.19]) k.ball(0.05, 0xf7a9a0, x, 0.82, 0.24, { seg: 6, rows: 4 });
    if (L.collar) k.box(0.12, 0.06, 0.05, 0xffffff, 0, 0.62, 0.15, { r: 0 });
    if (L.veil) k.add(new T.SphereGeometry(0.35, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), hexN(L.veil), 0, 0.92, -0.05, { rx: -0.35 }).box(0.5, 0.07, 0.1, 0xffffff, 0, 1.03, 0.24, { r: 0.03 });
    if (L.helmet) k.add(new T.SphereGeometry(0.33, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hexN(L.helmet), 0, 0.97, 0, {}).cyl(0.4, 0.4, 0.04, hexN(L.helmet), 0, 0.98, 0.04, { seg: 12 });
    const g = k.build(0.12, 0.3), fx = g.attributes.fx; for (let i = 0; i < fx.count; i++) fx.setZ(i, 0);
    const sc = L.small ? 0.72 : 1; g.scale(sc, sc, sc); g.computeBoundingSphere();
    return g;
  }
  const people = { list: [], pool: new Map(), geos: new Map(), on: false, moving: false };
  let blobGeo = null, blobMat = null;
  const YAW = { down: 0.32, up: 0.32 + Math.PI, right: 0.32 + Math.PI / 2, left: 0.32 - Math.PI / 2 }; // 원근 카메라(az 0.32)에서 화면 아래·위·오른쪽·왼쪽
  function collect(x, y, look, dir, moving, working, yaw) { people.list.push({ x, y, look, dir, moving, working, yaw }); }
  function placePeople(t) {
    const used = new Map(); people.moving = false;
    if (!blobGeo) { blobGeo = new T.CircleGeometry(0.34, 16); blobGeo.rotateX(-Math.PI / 2); blobMat = new T.MeshBasicMaterial({ color: 0x1f2a14, transparent: true, opacity: 0.25, depthWrite: false }); }
    for (const p of people.list) {
      const look = typeof p.look === 'string' && FOLK_LOOK[p.look] ? p.look : LOOKS[p.look] ? p.look : 'p1';
      if (!people.geos.has(look)) people.geos.set(look, personGeo(FOLK_LOOK[look] || look));
      const arr = people.pool.get(look) || []; people.pool.set(look, arr);
      const i = used.get(look) || 0; used.set(look, i + 1);
      let m = arr[i];
      if (!m) { m = new T.Mesh(people.geos.get(look), mat); m.castShadow = false; m.receiveShadow = true; const b = new T.Mesh(blobGeo, blobMat); b.renderOrder = -1; m.add(b); scene.add(m); arr.push(m); }
      const ph = p.x * 1.7 + p.y, bob = p.moving ? Math.abs(Math.sin(t * 9 + ph)) * 0.09 : p.working ? Math.abs(Math.sin(t * 7 + ph)) * 0.05 : Math.sin(t * 2 + ph) * 0.012;
      m.position.set(p.x, bob, p.y); m.children[0].position.y = 0.02 - bob;
      m.rotation.set(p.working ? Math.sin(t * 7 + ph) * 0.18 : 0, p.yaw !== undefined ? p.yaw : YAW[p.dir] || YAW.down, p.moving ? Math.sin(t * 9 + ph) * 0.06 : 0, 'YXZ');
      m.scale.setScalar(1.15); m.visible = true;
      if (p.moving || p.working) people.moving = true;
    }
    for (const [look, arr] of people.pool) for (let i = used.get(look) || 0; i < arr.length; i++) arr[i].visible = false;
    people.on = people.list.length > 0;
    people.list.length = 0;
  }
  // 2D 그림 대신 입체 인형을 세운다 (이 장면을 그리는 동안만)
  let collecting = false;
  const toTile = (sx, sy) => isoInv(sx, sy);
  if (typeof drawCharacter === 'function') {
    const _dc = drawCharacter;
    drawCharacter = function (ctx, sx, sy, look, dir, frame, moving) { // eslint-disable-line no-global-assign
      if (collecting && ctx === World.ctx) { const [x, y] = toTile(sx, sy); collect(x, y, look, dir, moving, false); return; }
      return _dc.apply(this, arguments);
    };
  }
  if (typeof drawWorker === 'function') {
    const _dw = drawWorker;
    drawWorker = function (ctx, x, y, dir, t, working, look = 'worker') { // eslint-disable-line no-global-assign
      if (collecting && ctx === World.ctx) { collect(x, y, look, dir, false, working); return; }
      return _dw.apply(this, arguments);
    };
  }

  // ---------- 짓기·옮기기 미리 보기: 놓을 자리에 반투명 입체 모형 (놓을 수 있으면 초록, 없으면 빨강) ----------
  const ghost = { mesh: null, gk: '', top: null, mats: null };
  function syncGhost() {
    const pl = World.placing;
    if (!pl) { if (ghost.mesh) { scene.remove(ghost.mesh); ghost.mesh = null; ghost.gk = ''; ghost.top = null; st.dirty = true; } return; }
    const [w, d] = sizeOf(pl.kind, pl.rot), side = DOOR_SIDE[pl.rot || 0];
    let bo;
    if (pl.move) { const orig = World.buildings.find(q => q.id === pl.move); if (!orig) return; bo = { ...orig, x: pl.x, y: pl.y, w, d, rot: pl.rot, door: { ...orig.door, side } }; }
    else if (DECOR[pl.kind]) bo = { decor: pl.kind, x: pl.x, y: pl.y, w, d, rot: pl.rot, door: { side } };
    else if (pl.kind === 'gongso') bo = { style: 'gongso', level: 1, x: pl.x, y: pl.y, w, d, door: { side } };
    else bo = { rooms: [], tier: 1, color: 0, x: pl.x, y: pl.y, w, d, door: { side } };
    const key = modelKey(bo), gk = `${key}|${pl.x},${pl.y}|${side}|${pl.ok}`;
    if (gk === ghost.gk) return;
    if (ghost.mesh) scene.remove(ghost.mesh);
    ghost.gk = gk; ghost.mesh = null; st.dirty = true;
    const geo = key && geoFor(key, bo); if (!geo) return;
    if (!ghost.mats) ghost.mats = [true, false].map(ok => new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, color: ok ? 0xb8ffc8 : 0xff9a8a, depthWrite: true }));
    const flat = /^(scaffold|parking|stations)/.test(key);
    const m = placeMesh(geo, flat ? { ...bo, door: { side: 'S' } } : bo, bo.decor ? 0.95 : 0.97);
    m.material = ghost.mats[pl.ok ? 0 : 1]; m.castShadow = false; m.position.y += 0.04; m.updateMatrix();
    scene.add(m); ghost.mesh = m; ghost.top = screenTop(m);
  }

  // ---------- 카메라: 지금 쿼터뷰와 같은 자리·배율 ----------
  const v3 = new T.Vector3(), ray = new T.Raycaster();
  // v1.10 사용자 "미리 보기 게임 그대로": 원근 카메라가 비스듬히(약 46도) 내려다보며, 살짝 돌아 건물 앞면이 보인다
  // 지도 칸 (x, y) = 3D (x, 0, y). 앞(+z = 남쪽 문)이 화면 아래쪽
  const view = { x: 30, z: 30, dist: 46, az: 0.32, el: 0.8, ready: false };
  const DIST = [16, 90];
  let persp = false;
  function placeCamera() {
    const vw = World.vw, vh = World.vh;
    if (!view.ready && World.map && World.overview && !st.inside) { const c = World.map.viewCenter || [World.map.w / 2, World.map.h / 2]; view.x = c[0]; view.z = c[1]; view.ready = true; clampView(); }
    const key = `${view.x.toFixed(3)},${view.z.toFixed(3)},${view.dist.toFixed(3)},${view.az.toFixed(3)},${vw.toFixed(1)},${vh.toFixed(1)}`;
    if (key === st.camKey) return;
    st.camKey = key; st.dirty = true;
    camera.aspect = vw / vh; camera.fov = vw < vh ? 40 : 28;
    const ce = Math.cos(view.el);
    camera.position.set(view.x + Math.sin(view.az) * ce * view.dist, Math.sin(view.el) * view.dist, view.z + Math.cos(view.az) * ce * view.dist);
    camera.lookAt(view.x, 0, view.z); camera.near = 1; camera.far = 420; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  // 바닥 칸 → 화면(월드 픽셀 = 화면 CSS 픽셀 / World.scale)
  const pv = new T.Vector3(), nd = new T.Vector2();
  function proj(x, y, h = 0) { pv.set(x, h, y).project(camera); return [(pv.x * 0.5 + 0.5) * World.vw, (-pv.y * 0.5 + 0.5) * World.vh]; }
  // 화면 → 바닥 칸 (카메라 광선이 땅에 닿는 곳)
  function unproj(sx, sy) {
    ray.setFromCamera(nd.set(sx / World.vw * 2 - 1, -(sy / World.vh) * 2 + 1), camera);
    const o = ray.ray.origin, d = ray.ray.direction, t = d.y < -1e-4 ? -o.y / d.y : 1e4;
    return [o.x + d.x * t, o.z + d.z * t];
  }
  function clampView() { const m = st.inside ? { w: PLAN_W, h: PLAN_D } : World.map; if (!m) return; view.x = cl(view.x, -2, m.w + 2); view.z = cl(view.z, -2, m.h + 4); view.dist = cl(view.dist, DIST[0], DIST[1]); }
  function lookAt(x, y) { view.x = x; view.z = y; clampView(); }
  // 끌어서 둘러보기: 누른 곳의 땅이 손가락을 따라오게
  function drag(d, cx, cy) {
    const r = World.canvas.getBoundingClientRect(), k = 1 / World.scale;
    if (!d.g0) { d.g0 = unproj((d.x - r.left) * k, (d.y - r.top) * k); d.v0 = [view.x, view.z]; }
    const save = [view.x, view.z]; view.x = d.v0[0]; view.z = d.v0[1]; st.camKey = ''; placeCamera();
    const g = unproj((cx - r.left) * k, (cy - r.top) * k);
    view.x = d.v0[0] - (g[0] - d.g0[0]); view.z = d.v0[1] - (g[1] - d.g0[1]); clampView();
    if (!isFinite(view.x) || !isFinite(view.z)) { view.x = save[0]; view.z = save[1]; }
    st.camKey = ''; placeCamera();
  }
  function zoom(step, ax, ay) {
    const r = World.canvas.getBoundingClientRect(), k = 1 / World.scale;
    const sx = ax === undefined ? World.vw / 2 : (ax - r.left) * k, sy = ay === undefined ? World.vh / 2 : (ay - r.top) * k;
    const g0 = unproj(sx, sy);
    view.dist = cl(view.dist * (step > 0 ? 1 / 1.25 : 1.25), DIST[0], DIST[1]); st.camKey = ''; placeCamera();
    const g1 = unproj(sx, sy); view.x += g0[0] - g1[0]; view.z += g0[1] - g1[1]; clampView(); st.camKey = ''; placeCamera();
  }
  // 2D 덧그림(말풍선·점선·짓기 표시)이 그대로 맞도록 iso·isoInv를 카메라로 바꿔 끼운다
  if (typeof iso === 'function') { const _iso = iso; iso = function (x, y) { return persp ? proj(x, y, 0) : _iso(x, y); }; } // eslint-disable-line no-global-assign
  if (typeof isoInv === 'function') { const _inv = isoInv; isoInv = function (sx, sy) { return persp ? unproj(sx, sy) : _inv(sx, sy); }; } // eslint-disable-line no-global-assign
  function placeSun(m) {
    const cx = m.w / 2, cz = m.h / 2, L = new T.Vector3(...TIMES[curTime || 'day'].dir).normalize();
    sun.position.set(cx, 0, cz).addScaledVector(L, 120); sun.target.position.set(cx, 0, cz); sun.target.updateMatrixWorld();
    const sc = sun.shadow.camera, R = Math.max(m.w, m.h) * 0.62 + 6; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 40; sc.far = 220; sc.updateProjectionMatrix();
  }

  // 누른 자리(지도 좌표, iso 픽셀)가 건물 모형에 닿는지
  function hit(b, sx, sy) {
    const e = b._m3; if (!e || !e.mesh.visible) return false;
    ray.setFromCamera(nd.set(sx / World.vw * 2 - 1, -(sy / World.vh) * 2 + 1), camera);
    return ray.intersectObject(e.mesh, false).length > 0;
  }

  // ---------- 신부님 걷기 (v1.10 미리 보기처럼): 끌면 조이스틱, 빈 땅을 누르면 그곳으로, 걷는 동안 화면이 따라간다 ----------
  const walker = { x: 0, z: 0, yaw: 0.32, moving: false, goal: null, onArrive: null, stick: null, placed: false, follow: false };
  let stickEl = null;
  function stickShow(x, y, kx, ky) {
    if (!stickEl) { stickEl = document.createElement('div'); stickEl.id = 'w3stick'; stickEl.innerHTML = '<u></u>'; document.body.appendChild(stickEl);
      const cs = document.createElement('style'); cs.textContent = '#w3stick{position:fixed;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;background:rgba(251,244,226,.35);border:2px solid rgba(59,42,31,.35);pointer-events:none;z-index:40;display:none}#w3stick u{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;border-radius:50%;background:#fbf4e2;border:2px solid #3b2a1f}'; document.head.appendChild(cs); }
    if (x === undefined) { stickEl.style.display = 'none'; return; }
    stickEl.style.display = 'block'; stickEl.style.left = x + 'px'; stickEl.style.top = y + 'px'; stickEl.firstChild.style.transform = `translate(${kx * 28}px,${ky * 28}px)`;
  }
  function placeWalker() {
    if (walker.placed || !World.map) return;
    const ch = World.buildings.find(b => b.id === 'church'), c = ch ? [ch.x + ch.w / 2, ch.y + ch.d + 1.6] : (World.map.viewCenter || [World.map.w / 2, World.map.h / 2]);
    walker.x = c[0]; walker.z = c[1]; walker.placed = true;
    for (let r = 0; r < 6 && !canStand(walker.x, walker.z); r += 0.5) for (let a = 0; a < 6.28; a += 0.5) if (canStand(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r)) { walker.x = c[0] + Math.cos(a) * r; walker.z = c[1] + Math.sin(a) * r; break; }
  }
  // 끌기: 누른 점에서 손가락까지가 조이스틱
  function stick(d, cx, cy) {
    const dx = cx - d.x, dy = cy - d.y, L = Math.hypot(dx, dy) || 1, k = Math.min(1, L / 44);
    walker.stick = { x: dx / L * k, y: dy / L * k }; walker.goal = null; walker.onArrive = null; stickShow(d.x, d.y, walker.stick.x, walker.stick.y);
  }
  function stickEnd() { walker.stick = null; stickShow(); }
  // 어디로 걸어가기 (screen 좌표면 땅을 찾아서)
  function walkTo(x, y, near = 0.3, fn = null) {
    walker.stick = null; walker.onArrive = fn; walker.goal = [x, y, near];
    // 막힌 곳을 돌아가는 길 (게임의 칸 길찾기). 길이 없으면 곧장
    const path = typeof findPath === 'function' ? findPath(walker.x, walker.z, x, y) : null;
    walker.path = path ? path.concat(canStand(x, y) ? [[x, y]] : []) : null;
  }
  function walkToScreen(cx, cy) { const r = World.canvas.getBoundingClientRect(), k = 1 / World.scale, g = unproj((cx - r.left) * k, (cy - r.top) * k); if (isFinite(g[0])) walkTo(g[0], g[1], 0.15); }
  function stepWalker(dx, dz, sp, dt) {
    const L = Math.hypot(dx, dz); if (L < 1e-4) return false;
    const ux = dx / L, uz = dz / L, dist = sp * dt; let moved = false;
    if (canStand(walker.x + ux * dist, walker.z)) { walker.x += ux * dist; moved = true; }
    if (canStand(walker.x, walker.z + uz * dist)) { walker.z += uz * dist; moved = true; }
    if (moved) { const ty = Math.atan2(ux, uz); let dy = ty - walker.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; walker.yaw += dy * Math.min(1, dt * 12); }
    return moved;
  }
  // ---------- 전체보기 (v1.10 사용자 "전체보기 키를 넣어서 누르면 화면을 이동하면서 볼 수 있게") ----------
  // 켜면 멀리서 내려다보고, 끌면 화면이 움직인다. 끄면 신부님 곁으로 돌아온다
  const free = { on: false, back: 46, btn: null };
  function setFree(on) {
    free.on = !!on; stickEnd();
    if (free.on) { free.back = view.dist; view.dist = Math.min(DIST[1], Math.max(view.dist * 1.6, 62)); }
    else { view.dist = free.back; view.x = walker.x; view.z = walker.z + 0.6; }
    clampView(); st.camKey = '';
    if (free.btn) { free.btn.classList.toggle('on', free.on); free.btn.querySelector('b').textContent = free.on ? '신부님께' : '전체보기'; }
    if (typeof Sound !== 'undefined') Sound.sfx('tap');
  }
  function freeButton() {
    if (free.btn) return;
    const b = free.btn = document.createElement('button'); b.id = 'w3free'; b.type = 'button';
    b.innerHTML = '<i></i><b>전체보기</b>'; b.addEventListener('click', e => { e.stopPropagation(); setFree(!free.on); });
    document.body.appendChild(b);
  }

  let walkT = 0;
  function updateWalker() {
    const now = performance.now(), dt = Math.min(0.05, walkT ? (now - walkT) / 1000 : 0); walkT = now;
    if (!World.overview) { // 신학교·보좌 신부: 게임의 내 인물을 따라간다
      const p = World.player; if (!p) return;
      if (!view.ready) { view.x = p.x; view.z = p.y + 0.6; view.ready = true; view.dist = 30; }
      view.x += (p.x - view.x) * Math.min(1, dt * 5); view.z += (p.y + 0.6 - view.z) * Math.min(1, dt * 5); clampView();
      if (free.btn) free.btn.style.display = 'none';
      return;
    }
    if (free.btn) free.btn.style.display = '';
    placeWalker(); walker.moving = false;
    if (World.isPaused && World.isPaused()) return;
    if (walker.stick) { const a = view.az, mx = walker.stick.x, my = walker.stick.y; walker.moving = stepWalker(Math.cos(a) * mx + Math.sin(a) * my, -Math.sin(a) * mx + Math.cos(a) * my, 4.2 * Math.min(1, Math.hypot(mx, my)), dt); }
    else if (walker.goal) {
      const [gx, gz, near] = walker.goal, done = () => { const f = walker.onArrive; walker.goal = null; walker.path = null; walker.onArrive = null; walker.moving = false; if (f) f(); };
      if (Math.hypot(gx - walker.x, gz - walker.z) < near) done();
      else {
        const wp = walker.path && walker.path[0], tx = wp ? wp[0] : gx, tz = wp ? wp[1] : gz;
        if (wp && Math.hypot(tx - walker.x, tz - walker.z) < 0.25) walker.path.shift();
        else if (!(walker.moving = stepWalker(tx - walker.x, tz - walker.z, 4.2, dt))) done();
        if (walker.path && !walker.path.length) walker.path = null;
        if (!walker.path && !wp && !walker.moving) done();
      }
    }
    if (walker.moving && !World.placing && !World.pathMode && !free.on) { view.x += (walker.x - view.x) * Math.min(1, dt * 4); view.z += (walker.z + 0.6 - view.z) * Math.min(1, dt * 4); clampView(); }
  }

  // ---------- 신학교·보좌 신부 지도: 끌면 조이스틱(게임의 World.joy), 누르면 그쪽으로 걸어가 말 걸기·들어가기 ----------
  let charPtr = null;
  function charInteract() { if (typeof findTarget === 'function') findTarget(); const t = World.target; if (t && World.onInteract) { if (typeof faceEachOther === 'function') faceEachOther(t); World.onInteract(t); } }
  function bindCharInput() {
    const c = World.canvas; if (!c || c._w3char) return; c._w3char = true;
    const on = () => persp && !World.overview && !(World.isPaused && World.isPaused());
    c.addEventListener('pointerdown', e => { if (!on()) return; try { c.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } charPtr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), drag: false }; });
    c.addEventListener('pointermove', e => {
      if (!charPtr || e.pointerId !== charPtr.id || !on()) return;
      const dx = e.clientX - charPtr.x, dy = e.clientY - charPtr.y, L = Math.hypot(dx, dy);
      if (!charPtr.drag && L > 12) charPtr.drag = true;
      if (charPtr.drag) { const k = Math.min(1, L / 44); World.joy = { x: dx / L * k, y: dy / L * k }; World.auto = null; stickShow(charPtr.x, charPtr.y, World.joy.x, World.joy.y); }
    });
    const up = e => {
      if (!charPtr || e.pointerId !== charPtr.id) return;
      const d = charPtr; charPtr = null; World.joy = { x: 0, y: 0 }; stickShow();
      if (d.drag || e.type !== 'pointerup' || performance.now() - d.t > 450 || !on()) return;
      const hit = pickAt(e.clientX, e.clientY);
      if (hit && hit.bubble && World.onCollect) return World.onCollect(hit.bubble);
      if (hit && hit.npc) { const n = hit.npc; worldWalkTo(() => [n.x, n.y], INTERACT_R * 0.8, charInteract); return; }
      if (hit && hit.building && hit.building.doorPt) { worldWalkTo(hit.building.doorPt, 0.55, charInteract); return; }
      const r = c.getBoundingClientRect(), g = unproj((e.clientX - r.left) / World.scale, (e.clientY - r.top) / World.scale);
      if (isFinite(g[0])) worldWalkTo([g[0], g[1]], 0.2, () => {});
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }

  // ---------- 성전 안 (v1.10): 지금 도면 그리기(drawPlan)를 그대로 돌리되, 쿼터뷰 도구 대신 입체 도구로 모형을 쌓는다 ----------
  const ZS = 0.95; // 도면의 높이 1 = 바닥 칸 0.95
  function interiorKit(k) {
    const C3 = c => (typeof c === 'string' ? c : '#888888');
    const box = (x, y, w, d, z, h, c, top) => {
      if (w <= 0 || d <= 0 || h <= 0) return;
      const r = Math.min(0.035, w / 3, d / 3, h * ZS / 3);
      k.box(w, h * ZS, d, C3(c), x + w / 2, (z + h / 2) * ZS, y + d / 2, { r: r < 0.01 ? 0 : r });
      if (top && top !== c) k.box(w * 0.98, 0.012, d * 0.98, C3(top), x + w / 2, (z + h) * ZS + 0.006, y + d / 2, { r: 0 });
    };
    const flat = (x, y, w, d, z, c) => { if (w > 0 && d > 0) k.box(w, 0.02, d, C3(c), x + w / 2, z * ZS + 0.01, y + d / 2, { r: 0 }); };
    const face = (side, at, u0, u1, z0, z1, c) => { const L = u1 - u0, H = (z1 - z0) * ZS; if (L <= 0 || H <= 0) return;
      if (side === 'n') k.box(L, H, 0.025, C3(c), u0 + L / 2, z0 * ZS + H / 2, at + 0.0125, { r: 0 }); else k.box(0.025, H, L, C3(c), at + 0.0125, z0 * ZS + H / 2, u0 + L / 2, { r: 0 }); };
    const dot = (x, y, z, r, c) => k.ball(Math.max(0.03, r), C3(c), x, z * ZS, y, { seg: 8, rows: 6 });
    return { S: (x, y, z = 0) => [x, y, z], quad: () => {}, flat, box, face, dot, tw: 1 };
  }
  const NOCTX = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}) });
  function interiorPlanNow() {
    const floors = floorSites(), fl = World.floor && World.floor <= Math.max(1, floors.length) ? World.floor : 1;
    const cur = floors.find(([, x]) => x.floor === fl), site = cur && cur[1], plan = fl === 1 ? INTERIOR_PLANS.ground : INTERIOR_PLANS.upper;
    return { plan, site, sig: [fl, site && site.built, plan.rooms.map(r => roomArt(r, site)).join(',')].join('|') };
  }
  function syncInterior() {
    const { plan, site, sig } = interiorPlanNow();
    if (sig === st.inSig) return;
    st.inSig = sig;
    if (st.inMesh) { scene.remove(st.inMesh); st.inMesh.geometry.dispose(); st.inMesh = null; }
    const k = new Kit();
    try { drawPlan(NOCTX, plan, site, interiorKit(k)); } catch (e) { console.warn('성전 안 모형 실패', e); }
    // 바깥 바닥판
    k.box(PLAN_W + 1.2, 0.3, PLAN_D + 1.2, '#7d705f', PLAN_W / 2, -0.15, PLAN_D / 2, { r: 0.1 });
    const g = k.build(0.18); st.inMesh = new T.Mesh(g, mat); st.inMesh.castShadow = true; st.inMesh.receiveShadow = true; scene.add(st.inMesh);
    st.shadowDirty = true; st.dirty = true;
  }
  function enterInside() {
    if (st.inside) return;
    resetScene(); st.inside = true; st.mapRef = World.map;
    view.x = PLAN_W / 2; view.z = PLAN_D / 2 + 1; view.dist = World.vw < World.vh ? 74 : 44; view.ready = true; if (free.btn) free.btn.style.display = 'none';
    const L = new T.Vector3(-0.35, 0.8, 0.5).normalize(); sun.position.set(PLAN_W / 2, 0, PLAN_D / 2).addScaledVector(L, 80); sun.target.position.set(PLAN_W / 2, 0, PLAN_D / 2); sun.target.updateMatrixWorld();
    const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 20; sc.far = 160; sc.updateProjectionMatrix();
    if (canvas3) canvas3.classList.add('inside');
  }
  // 성전 안 한 장면: 모형을 맞추고 카메라를 놓는다 (2D 덧그림 전). 끝나면 end()
  function frameInside() {
    collecting = false;
    if (!init()) return false;
    timeButton(); enterInside(); applyTime(); syncInterior(); placeCamera(); persp = true;
    collecting = true; people.list.length = 0;
    return true;
  }
  // 도면 칸 (x, y, 높이 z) → 화면 (캔버스 픽셀)
  const projIn = (x, y, z = 0) => proj(x, y, z * ZS);

  // ---------- 시간 (아침·낮·저녁·밤, v1.10 미리 보기): 기기 시계를 따르고, 단추로 직접 고를 수도 있다 ----------
  const TIMES = {
    morning: { name: '아침', dir: [0.55, 0.5, 0.55], sun: 0xffe3bd, si: 2.1, sky: 0xdcefff, gnd: 0xc4a878, hi: 1.75, glow: 0, bg: ['#bfe6f4', '#f8e9c8'] },
    day: { name: '낮', dir: [-0.35, 0.8, 0.5], sun: 0xfff3dc, si: 2.35, sky: 0xdcefff, gnd: 0xb7a26a, hi: 1.9, glow: 0, bg: ['#8fd3f2', '#d8f1f4'] },
    evening: { name: '저녁', dir: [-0.75, 0.3, 0.4], sun: 0xff9a55, si: 2.3, sky: 0xffc9a8, gnd: 0x86708a, hi: 1.25, glow: 0.75, bg: ['#f6a56e', '#f9d7a0'] },
    night: { name: '밤', dir: [-0.3, 0.75, 0.5], sun: 0x86a8ff, si: 0.75, sky: 0x4a62a8, gnd: 0x242a4a, hi: 0.95, glow: 1.25, bg: ['#131c40', '#2a3d78'] },
  };
  const TIME_ORDER = ['auto', 'morning', 'day', 'evening', 'night'];
  let timeMode = 'auto', curTime = null, timeBtn = null, timeAt = 0;
  try { timeMode = localStorage.getItem('sungdang-3d-time') || 'auto'; } catch (e) { /* 무시 */ }
  function clockTime() { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 8 ? 'morning' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 19.5 ? 'evening' : 'night'; }
  function applyTime(force) {
    const want = st.inside ? 'day' : timeMode === 'auto' ? clockTime() : timeMode;
    if (want === curTime && !force) return;
    curTime = want; const t = TIMES[want];
    sun.color.setHex(t.sun); sun.intensity = t.si; hemi.color.setHex(t.sky); hemi.groundColor.setHex(t.gnd); hemi.intensity = t.hi; U.uGlow.value = t.glow; if (st.ground) st.ground.material.emissiveIntensity = t.hi / 1.9 * (want === 'night' ? 0.5 : 1); // 눈 덮인 땅이 밤에 하얗게 뜨지 않게
    if (World.map && !st.inside) placeSun(World.map);
    if (canvas3 && !st.inside) canvas3.style.background = `linear-gradient(${t.bg[0]}, ${t.bg[1]} 62%)`; else if (canvas3) canvas3.style.background = '';
    if (timeBtn) timeBtn.querySelector('b').textContent = timeMode === 'auto' ? `${t.name}·자동` : t.name;
    st.shadowDirty = true; st.dirty = true;
  }
  function timeButton() {
    if (timeBtn) return;
    const b = timeBtn = document.createElement('button'); b.id = 'w3time'; b.type = 'button'; b.innerHTML = '<i></i><b>낮</b>';
    b.addEventListener('click', e => { e.stopPropagation(); timeMode = TIME_ORDER[(TIME_ORDER.indexOf(timeMode) + 1) % TIME_ORDER.length]; try { localStorage.setItem('sungdang-3d-time', timeMode); } catch (err) { /* 무시 */ } applyTime(true); if (typeof Sound !== 'undefined') Sound.sfx('tap'); if (typeof toast === 'function') toast(timeMode === 'auto' ? '🕰️ 기기 시계에 맞춰 아침·낮·저녁·밤이 바뀌어요' : `🕰️ ${TIMES[timeMode].name}으로 고정했어요`); });
    document.body.appendChild(b); applyTime(true);
  }

  // ---------- 전례 시기 (v1.10 미리 보기): 성탄 = 눈·성탄 나무·눈사람, 부활 = 숨은 달걀 다섯 개 찾기 ----------
  let seasonOverride = null;
  const seasonNow = () => seasonOverride || (typeof currentSeason === 'function' ? currentSeason() : 'ordinary');
  const ss = { key: '', group: null, snow: null, eggs: [] };
  function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
  function xmasTree() { const k = new Kit(); k.cyl(0.12, 0.16, 0.5, C.trunk, 0, 0.25, 0, { seg: 6 }); [[0.95, 1.0, 0.9], [0.75, 0.9, 1.55], [0.5, 0.8, 2.1]].forEach(([r, h, y]) => k.add(new T.ConeGeometry(r, h, 8), 0x2f7d4a, 0, y, 0, { grad: [0x245f39, 0x4a9b5e, -h / 2, h / 2] })); const cs = [0xe0403a, 0xf0c04f, 0x5f8fd6, 0xffffff]; for (let i = 0; i < 14; i++) { const a = i * 2.4, y = 0.75 + (i % 7) * 0.22, r = 0.85 - (y - 0.7) * 0.42; k.ball(0.07, cs[i % 4], Math.cos(a) * r, y, Math.sin(a) * r, { seg: 6, rows: 4, fx: [1, 0, 0] }); } k.add(new T.OctahedronGeometry(0.16, 0), 0xf0c04f, 0, 2.6, 0, { fx: [1.5, 0, 0] }); return k.build(0.2); }
  function snowman() { const k = new Kit(); k.ball(0.42, 0xf4f7fb, 0, 0.4, 0, { seg: 12, rows: 9 }).ball(0.3, 0xf4f7fb, 0, 0.98, 0, { seg: 12, rows: 9 }).ball(0.22, 0xf4f7fb, 0, 1.42, 0, { seg: 12, rows: 9 }); k.add(new T.ConeGeometry(0.04, 0.2, 6), 0xf08a2c, 0, 1.42, 0.27, { rx: Math.PI / 2 }); for (const x of [-0.08, 0.08]) k.ball(0.03, 0x222222, x, 1.5, 0.19, { seg: 6, rows: 4 }); k.cyl(0.15, 0.17, 0.22, 0x2a2a30, 0, 1.68, 0, { seg: 10 }).cyl(0.24, 0.24, 0.03, 0x2a2a30, 0, 1.58, 0, { seg: 12 }); k.box(0.62, 0.08, 0.1, 0xc0392b, 0, 1.2, 0.18, { r: 0.03 }); return k.build(0.15); }
  function eggGeo(i) { const cols = [[0xf2a7c0, 0xffffff], [0x8fd0f0, 0xf6e27a], [0xb6e08a, 0xf2a7c0], [0xf6c86a, 0x8fd0f0], [0xc9a7f0, 0xb6e08a]][i % 5], k = new Kit(); k.ball(0.22, cols[0], 0, 0.28, 0, { seg: 12, rows: 9 }); k.cyl(0.215, 0.215, 0.07, cols[1], 0, 0.3, 0, { seg: 14 }); const g = k.build(0.1); g.scale(1, 1.3, 1); return g; }
  function freeSpots(n, seed) { // 건물 가까이의 빈 칸 (걸어갈 수 있는 곳)
    const r = mulberry32(seed), out = [], bl = World.buildings.filter(b => !b.decor && !/^(t_|house)/.test(b.id)); // 우리 본당 건물 둘레만
    for (let i = 0; i < 4000 && out.length < n; i++) { const b = bl[Math.floor(r() * bl.length)]; if (!b) break; const x = b.x - 1.5 + r() * (b.w + 3), z = b.y - 1.5 + r() * (b.d + 3);
      if (!canStand(x, z) || World.pathSet.has(Math.floor(x) + ',' + Math.floor(z)) || out.some(q => Math.hypot(q[0] - x, q[1] - z) < 3)) continue; out.push([x, z]); }
    return out;
  }
  function eggState() { const p = Game.state.pastor; if (!p) return null; const y = new Date().getFullYear(); if (!p.eggs || p.eggs.y !== y) p.eggs = { y, f: [false, false, false, false, false] }; return p.eggs; }
  function syncSeason() {
    const sn = seasonNow(), key = `${sn}|${st.inside}|${World.mapId}|${!!st.ground}`;
    if (key === ss.key) { if (ss.snow) { const a = ss.snow.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - 0.035 * (1.2 + (i % 5) * 0.2); if (y < 0) y = 22; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(U.uTime.value + i) * 0.01); } a.needsUpdate = true; ss.snow.position.set(view.x, 0, view.z); st.dirty = true; } return; }
    ss.key = key; if (ss.group) scene.remove(ss.group); ss.group = new T.Group(); ss.snow = null; ss.eggs = []; scene.add(ss.group);
    U.uSnow.value = 0; if (st.ground) { st.ground.material.emissive.setHex(0x000000); st.ground.material.color.setHex(0xffffff); }
    if (st.inside || !st.ground) return;
    const ch = World.buildings.find(b => b.id === 'church' || b.id === 'chapel') || World.buildings[0];
    if (sn === 'christmas') {
      U.uSnow.value = 1; st.ground.material.color.setHex(0xb8c0c8); st.ground.material.emissive.setHex(0x8e98a4); // 땅도 눈빛
      const N = 600, sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 50; sp[i * 3 + 1] = Math.random() * 22; sp[i * 3 + 2] = (Math.random() - 0.5) * 50; }
      ss.snow = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(sp, 3)), new T.PointsMaterial({ map: dotTex(), size: 0.35, transparent: true, depthWrite: false, opacity: 0.95 }));
      ss.snow.frustumCulled = false; ss.group.add(ss.snow);
      if (ch) { const spots = freeSpots(2, 1225); const t = new T.Mesh(xmasTree(), mat), m2 = new T.Mesh(snowman(), mat);
        [[t, spots[0]], [m2, spots[1]]].forEach(([mm, at]) => { if (!at) return; mm.position.set(at[0], 0, at[1]); mm.castShadow = true; mm.receiveShadow = true; mm.rotation.y = 0.3; ss.group.add(mm); }); }
    }
    if (sn === 'easter' && World.overview && Game.state.pastor) {
      const es = eggState(), spots = freeSpots(5, new Date().getFullYear());
      spots.forEach((at, i) => { if (es.f[i]) return; const m = new T.Mesh(eggGeo(i), mat); m.position.set(at[0], 0, at[1]); m.scale.setScalar(1.7); m.castShadow = true; m.userData.i = i; ss.group.add(m); ss.eggs.push(m); });
    }
    st.shadowDirty = true; st.dirty = true;
  }
  // 부활 달걀 누르기 (화면 좌표). 찾으면 true
  function tapEgg(cx, cy) {
    if (!ss.eggs.length) return false;
    const r = World.canvas.getBoundingClientRect(), k = World.scale;
    for (const m of ss.eggs) { const q = proj(m.position.x, m.position.z, 0.5); if (Math.hypot(q[0] * k + r.left - cx, q[1] * k + r.top - cy) > 34) continue;
      const es = eggState(); es.f[m.userData.i] = true; ss.group.remove(m); ss.eggs = ss.eggs.filter(e => e !== m); st.dirty = true; st.shadowDirty = true;
      walkTo(m.position.x, m.position.z, 0.8);
      const n = es.f.filter(Boolean).length;
      if (typeof Sound !== 'undefined') Sound.sfx(n === 5 ? 'reward' : 'coin');
      if (n === 5) { if (typeof addGems === 'function') addGems(5); if (typeof toast === 'function') toast('🥚 부활 달걀 다섯 개를 모두 찾았어요! 💎5'); }
      else if (typeof toast === 'function') toast(`🥚 부활 달걀을 찾았어요 (${n}/5)`);
      if (typeof save === 'function') save();
      return true; }
    return false;
  }

  // ---------- 교우 부탁 · 교우 수첩 (v1.10 미리 보기): 이름 있는 교우가 마당을 거닐다 가끔 부탁(말풍선)을 한다 ----------
  const FOLK = [
    { id: 'jo', name: '박 요셉', role: '사목회장', ask: '신부님, 마당 가로등이 어두워 저녁 미사 오시는 어르신들이 걱정입니다.' },
    { id: 'ma', name: '김 마리아 할머니', role: '레지오 단원', ask: '다리가 아파 지난 주일에 못 갔어요. 병자 영성체를 부탁드려도 될까요?' },
    { id: 'an', name: '이 안나', role: '주일학교 교사', ask: '아이들 간식비가 조금 모자라요. 이번 달만 도와주실 수 있을까요?' },
    { id: 'pe', name: '최 베드로', role: '청년', ask: '청년회를 다시 모아 보고 싶어요. 첫 모임에 와 주실 수 있나요?' },
    { id: 'da', name: '다니엘', role: '초등부 어린이', ask: '신부님! 저 복사 하고 싶어요. 언제부터 할 수 있어요?' },
    { id: 'fr', name: '한 프란치스코', role: '콩밭 주인', ask: '올해 콩 농사가 잘됐습니다. 감사 미사를 봉헌하고 싶어요.' },
    { id: 'cl', name: '클라라 수녀', role: '본당 수녀', ask: '제대 꽃이 시들었어요. 헌화회와 함께 새로 꽂아도 될까요?' },
  ];
  const FOLK_LOOK = {
    'f-jo': { body: '#5b6f8f', hair: '#d8d8d8' }, 'f-ma': { body: '#9a6fb5', hair: '#e6e6e6' }, 'f-an': { body: '#e58aa0', hair: '#4a3226' }, 'f-pe': { body: '#4fa37a', hair: '#2c2420' },
    'f-da': { body: '#f0b23c', hair: '#3a2a22', small: true }, 'f-fr': { body: '#8a6a4a', hair: '#555555', helmet: '#d9b56a' }, 'f-cl': { body: '#8c95a3', veil: '#8c95a3', robe: true },
  };
  const folk = { list: [], at: 0 };
  // 성당 문 앞 가까운 빈 자리 (부탁하는 교우가 서는 곳)
  function nearDoor() { const ch = World.buildings.find(b => b.id === 'church'); if (!ch || !ch.doorPt) return null; const [dx, dz] = ch.doorPt;
    for (let r = 1.5; r < 6; r += 0.5) for (let a = 0.3; a < 6.6; a += 0.6) { const x = dx + Math.cos(a) * r, z = dz + 1 + Math.abs(Math.sin(a)) * r; if (canStand(x, z)) return [x, z]; } return null; }
  function folkState() { const p = Game.state.pastor; if (!p) return null; if (!p.folk) p.folk = { met: {}, cur: null, next: Date.now() + 60000 }; return p.folk; }
  function syncFolk(dt) {
    const fs = World.overview && !st.inside && st.ground && folkState(); if (!fs) { folk.list = []; return; }
    if (!folk.list.length) { const spots = freeSpots(FOLK.length, 7); folk.list = FOLK.slice(0, 4).map((f, i) => ({ f, x: (spots[i] || [walker.x + i, walker.z])[0], z: (spots[i] || [0, walker.z + 1])[1], goal: null, wait: Math.random() * 3, yaw: 0, moving: false })); }
    const now = Date.now();
    if (!fs.cur && now > fs.next) { fs.cur = FOLK[Math.floor(Math.random() * FOLK.length)].id; }
    // 부탁하는 교우는 늘 마당에 나와 있다
    if (fs.cur && !folk.list.some(q => q.f.id === fs.cur)) { const f = FOLK.find(q => q.id === fs.cur), sp = nearDoor() || [walker.x + 1.5, walker.z]; folk.list.pop(); folk.list.unshift({ f, x: sp[0], z: sp[1], goal: null, wait: 2, yaw: 0, moving: false }); }
    if (fs.cur) { const q = folk.list.find(x => x.f.id === fs.cur); if (q && q.called !== fs.cur) { q.called = fs.cur; const d = nearDoor(); if (d) { q.x = d[0]; q.z = d[1]; q.goal = null; q.wait = 9999; } } } // 부탁하는 교우는 성당 문 앞에서 기다린다
    for (const q of folk.list) {
      q.moving = false;
      if (q.goal) { const dx = q.goal[0] - q.x, dz = q.goal[1] - q.z, L = Math.hypot(dx, dz);
        if (L < 0.3) { q.goal = null; q.wait = 2 + Math.random() * 5; }
        else { const ux = dx / L, uz = dz / L, d = 1.2 * dt; let mv = false; if (canStand(q.x + ux * d, q.z)) { q.x += ux * d; mv = true; } if (canStand(q.x, q.z + uz * d)) { q.z += uz * d; mv = true; } if (!mv) q.goal = null; else { q.moving = true; q.yaw = Math.atan2(ux, uz); } } }
      else { q.wait -= dt; if (q.wait < 0) { const a = Math.random() * 6.28, r = 1 + Math.random() * 3; q.goal = [q.x + Math.cos(a) * r, q.z + Math.sin(a) * r]; } }
      collect(q.x, q.z, 'f-' + q.f.id, 'down', q.moving, false, q.yaw);
      if (q.moving) people.moving = true;
    }
  }
  // 부탁 말풍선 (2D 위에 핀)
  function drawFolkPins() {
    const fs = folkState(); if (!fs || !fs.cur || typeof pvPin !== 'function') return;
    const q = folk.list.find(x => x.f.id === fs.cur); if (!q) return;
    const ctx = World.ctx, res = World.res || 1, k = 1.2, [sx, sy] = proj(q.x, q.z, 1.55), t = performance.now() / 1000, cy = sy - 14 * k + Math.sin(t * 3) * 2;
    ctx.save(); ctx.setTransform(res, 0, 0, res, 0, 0); pvPin(ctx, sx, cy, 9 * k, k, '#fbf4e2', '#d2526a'); ctx.textAlign = 'center'; ctx.font = `${Math.round(9 * k)}px sans-serif`; ctx.fillText('💬', sx, cy + 3.5 * k); ctx.restore();
  }
  function tapFolk(cx, cy) {
    if (!folk.list.length) return false;
    const r = World.canvas.getBoundingClientRect(), k = World.scale, fs = folkState();
    for (const q of folk.list) { const s1 = proj(q.x, q.z, 0.8), s2 = proj(q.x, q.z, 1.9);
      if (Math.hypot(s1[0] * k + r.left - cx, s1[1] * k + r.top - cy) > 30 && Math.hypot(s2[0] * k + r.left - cx, s2[1] * k + r.top - cy) > 30) continue;
      walkTo(q.x, q.z + 0.6, 1.0);
      if (fs.cur === q.f.id) openFolkAsk(q.f); else openFolkHello(q.f);
      return true; }
    return false;
  }
  function openFolkAsk(f) {
    const fs = folkState();
    modal({ title: `${f.name} · ${f.role}`, html: `<p class="serif">"${f.ask}"</p><p class="muted">들어드리면 ⚡1을 쓰고 마음 ❤️+1, 교우 수첩에 이 교우가 적혀요.</p>`, buttons: [
      { label: '들어드리기 ⚡1', onClick: () => {
        if (Game.state.energy < 1) { toast('⚡ 행동력이 모자라요'); return; }
        spendEnergy(1); const p = Game.state.pastor; p.res.heart = clamp(p.res.heart + 1, 0, 100);
        fs.met[f.id] = (fs.met[f.id] || 0) + 1; fs.cur = null; fs.next = Date.now() + 8 * 60000;
        if (typeof Sound !== 'undefined') Sound.sfx('bless'); toast(`🙏 ${f.name}의 부탁을 들어드렸어요 · ❤️+1 · 교우 수첩에 적었어요`); save(); render();
      } },
      { label: '다음에', cls: 'ghost' } ] });
  }
  function openFolkHello(f) { const n = (folkState().met || {})[f.id] || 0; toast(n ? `👋 ${f.name} (${f.role}) · 부탁을 ${n}번 들어드렸어요` : `👋 ${f.name} (${f.role})가 인사해요`); if (typeof Sound !== 'undefined') Sound.sfx('tap'); }
  function openFolkBook() {
    const met = (folkState() || {}).met || {};
    modal({ title: '📖 교우 수첩', html: `<p class="muted">부탁을 들어드린 교우가 적혀요. 숫자였던 신자를 이름과 사연이 있는 사람으로 만나요.</p><div class="folk-book">${FOLK.map(f => `<div class="${met[f.id] ? '' : 'no'}"><i style="background:${(FOLK_LOOK['f-' + f.id] || {}).body}"></i><b>${met[f.id] ? f.name : '아직 못 만남'}</b><small>${met[f.id] ? `${f.role} · ${met[f.id]}번` : ''}</small></div>`).join('')}</div>` });
  }
  let bookBtn = null;
  function bookButton() {
    if (bookBtn) return;
    const b = bookBtn = document.createElement('button'); b.id = 'w3book'; b.type = 'button'; b.innerHTML = '<i></i><b>교우 수첩</b>';
    b.addEventListener('click', e => { e.stopPropagation(); if (typeof Sound !== 'undefined') Sound.sfx('tap'); openFolkBook(); });
    document.body.appendChild(b);
  }

  // ---------- 매 장면 ----------
  // frame(): 장면을 맞추고 카메라를 놓는다 (2D 그리기 전). end(): 2D가 알려 준 사람들을 세우고 그린다 (2D 그리기 뒤)
  let fpsT = 0, fpsN = 0, slowRuns = 0, lastTs = 0, frameMs = 0;
  function resetScene() {
    for (const o of [...scene.children]) if (o !== sun && o !== hemi && o !== sun.target) scene.remove(o);
    if (st.groundTex) st.groundTex.dispose();
    Object.assign(st, { ground: null, groundTex: null, nat: [], deco: [], fence: [], ent: new Map(), byB: new Map(), obsHouses: [], obs: new Set(), bSig: '', gSig: '', oSig: '', fSig: '', camKey: '', dirty: true, shadowDirty: true, mapRef: World.map, inside: false, inSig: "", inMesh: null });
    people.pool.clear(); ss.key = ''; ss.group = null; ss.eggs = []; ss.snow = null; curTime = null; ghost.mesh = null; ghost.gk = ''; view.ready = false; walker.placed = false; free.on = false;
  }
  function frame(camX, camY) {
    collecting = false;
    if (!init()) return;
    if (st.mapRef !== World.map || st.inside) { resetScene(); if (canvas3) canvas3.classList.remove('inside'); }
    const m = World.map, now = performance.now();
    if (!st.ground) { const t0 = performance.now(); placeSun(m); if (!buildGround(m)) return; st.gSig = groundSig(m); syncDeco(m); syncBuildings(); syncObstacles(m); syncFence(m); st.firstMs = performance.now() - t0; }
    freeButton(); timeButton(); bookButton(); bindCharInput(); updateWalker(); placeCamera(); persp = true;
    syncBuildings();
    if (now - st.sigAt > 250) {
      st.sigAt = now;
      syncObstacles(m);
      const gs = groundSig(m);
      if (gs !== st.gSig) { if (buildGround(m)) { st.gSig = gs; syncDeco(m); st.shadowDirty = true; st.dirty = true; } }
      syncFence(m);
    }
    syncGhost(); if (performance.now() - timeAt > 30000) { timeAt = performance.now(); applyTime(); } syncSeason();
    if (ghost.mesh) { const q = proj(ghost.top.p[0], ghost.top.p[2], ghost.top.p[1] + 0.15); ghost.top.s = q; }
    collecting = true; people.list.length = 0;
  }
  function end() {
    if (!collecting || !renderer) return;
    collecting = false;
    const now = performance.now();
    if (lastTs) { const dt = now - lastTs; frameMs = frameMs * 0.95 + dt * 0.05; fpsT += dt; fpsN++; }
    lastTs = now;
    if (fpsT > 2500) {
      const avg = fpsT / fpsN;
      // 숨은 창(초당 몇 장으로 묶인 때)과 장면을 막 다시 지은 직후는 재지 않는다
      if (avg > 24 && avg < 120 && !document.hidden && now - st.builtAt > 3000) { if (++slowRuns >= 2 && tier < TIERS.length - 1) { setTier(tier + 1); slowRuns = 0; } } else slowRuns = 0;
      const d = document.getElementById('w3fps'); if (d) d.textContent = `초당 ${Math.round(1000 / avg)}장 · 화질 ${['높음', '보통', '조금 낮음', '낮음'][tier]} · 세모 ${Math.round(renderer.info.render.triangles / 1000)}천`;
      fpsT = 0; fpsN = 0;
    }
    const hadPeople = people.on;
    { const tn = now; syncFolk(Math.min(0.05, folk.at ? (tn - folk.at) / 1000 : 0)); folk.at = tn; drawFolkPins(); }
    if (walker.placed && World.overview) collect(walker.x, walker.z, 'priest', 'down', walker.moving, false, walker.yaw);
    placePeople(now / 1000);
    if (people.on !== hadPeople) st.dirty = true;
    // 바람·사람 움직임은 초당 wind번(걷는 사람이 있으면 30번 이상), 카메라·장면이 바뀌면 바로
    const wind = Math.max(TIERS[tier].wind, people.moving ? 30 : 0), since = now - st.lastRender;
    if (!st.dirty && !(wind && since > 1000 / wind - 2)) return;
    U.uTime.value = now / 1000;
    if (st.shadowDirty) { renderer.shadowMap.needsUpdate = true; st.shadowDirty = false; st.builtAt = now; }
    renderer.render(scene, camera);
    st.dirty = false; st.lastRender = now;
  }
  function active() {
    if (failed || !World.map || !Game.state) return false;
    if (typeof insideView === 'function' && insideView()) return true; // v1.10 성전 안도 입체로
    const m = World.map;
    return (World.overview && m === MAPS.solmoe && !!Game.state.pastor) || m === MAPS.seminary || m === MAPS.parish; // v1.10 신학교·보좌 신부 시절도 입체로
  }
  function show(yes) { if (!yes) persp = false; if (document.body.classList.contains('w3') !== !!yes) document.body.classList.toggle('w3', !!yes); if (canvas3) { canvas3.classList.toggle('on', !!yes);  if (!yes) lastTs = 0; } }
  const covers = b => !!(b && b._m3 && st.byB && st.byB.get(b.id) === b._m3);
  const coversOb = o => !!st.ground && st.obs.has(o.id);
  // 누르기 판정: 입체 모형이 있으면 모형으로
  const _opaque = typeof spriteOpaqueAt === 'function' ? spriteOpaqueAt : null;
  spriteOpaqueAt = function (b, sx, sy) { if (active() && covers(b)) return hit(b, sx, sy); return _opaque ? _opaque(b, sx, sy) : null; }; // eslint-disable-line no-global-assign
  return { active, frame, end, show, covers, coversOb, get fence() { return !!st.ground; }, setTier, get tier() { return tier; }, TH: 12.2, get ghostTop() { return ghost.top && ghost.top.s; }, get persp() { return persp; }, wants: active, tapEgg, tapFolk, openFolkBook, get folk() { return folk.list; }, setSeason(s) { seasonOverride = s; ss.key = ''; }, frameInside, projIn, get inside() { return st.inside; }, clampView, lookAt, drag, zoom, stick, stickEnd, walkTo, walkToScreen, get walker() { return walker; }, get free() { return free.on; }, setFree, get view() { return view; }, get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; }, get firstMs() { return st.firstMs; } };
})();
