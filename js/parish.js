// 주임 신부 단계 규칙: 본당 자원, 컨테이너 교리실과 단체, 실제 시간 생산, 주일미사·건축헌금, 마을 넓히기
// 처음엔 성당과 사제관뿐. 빈 땅에 컨테이너 교리실(방 2개)을 놓고, 방마다 단체를 하나씩 만든다.

const SUNDAY_HOURS = 6;  // 주일미사 사이 간격 (실제 시간)

function timeScale() { return Game.state.testMode ? 60 : 1; }
// 본당이 굴러가는 빠르기 (v0.92 사용자 요청: 조금 더 빠르게). 봉헌·새 신자·살림·공사 시간에 곱한다. 시계(회의·미사 시각)와 주일 간격은 그대로
const PACE = 1.5;
function paceScale() { return timeScale() * PACE; }

// ---------- 본당 시계 (회의 시간용). 평소엔 실제 시각, 테스트 모드에선 60배 빠르다 ----------

function gameTime() { return Date.now() * timeScale() + (Game.state.clockOffset || 0); }

// 테스트 모드를 켜고 끌 때 시계가 튀지 않게 맞춘다
function setTestMode(on) {
  const s = Game.state, before = gameTime();
  s.testMode = on;
  s.clockOffset = before - Date.now() * timeScale();
}

function clockHour() { const d = new Date(gameTime()); return d.getHours() + d.getMinutes() / 60; }
function clockLabel() { const d = new Date(gameTime()); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function dayKey() { const d = new Date(gameTime()); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

function startPastor(parishId = 'solmoe', carry = null) {
  const s = Game.state, pd = PARISHES[parishId] || PARISHES.solmoe, st0 = pd.start;
  // 이야기로 넘어온 경우 보좌 시절 선택이, 옛 보좌 단계를 거친 경우 평가 등급이 보너스가 된다
  const sb = s.storyBonus || {};
  const gradeBonus = s.evaluation ? GRADE_BONUS[s.evaluation.grade].offering : 20;
  s.phase = 'pastor';
  s.age = Math.max(s.age, 30);
  s.energyMax = 30;
  s.energy = 30;
  s.lastEnergyTs = Date.now();
  s.pastor = {
    name: pd.name,
    parishId,        // v0.32: 지금 본당 (PARISHES)
    gems: 50, convent: 60, // v0.31: 다이아, 수녀원 평판
    levelScale: 2,   // v0.11: 레벨을 잘게 나눈 저장
    res: carry ? { members: st0.members, offering: st0.offering, heart: st0.heart, reputation: st0.reputation } : { members: 120 + (sb.members || 0), offering: 40 + gradeBonus + (sb.offering || 0), heart: 30 + (sb.heart || 0), reputation: 20 },
    fixed: { church: st0.church, rectory: st0.rectory, office: st0.office },
    stash: {},       // 건물에 쌓여 거두기를 기다리는 것 { 건물id: { offering, members } }
    cleared: {},     // 치운 장애물 id → true
    lots: { home: true }, // v0.70: 산 본당 부지 구획 (LOTS)
    mapGrid: MAP_GRID, // v0.80: 지도 칸 (두 배로 나눈 뒤)
    lit: { open: {}, done: {} }, // v0.75: 연 평일 전례, 이번 주 직접 드린 것
    fence: 0,        // v0.70: 울타리 레벨 (FENCE_LEVELS)
    paths: {},       // 신부가 놓은 길 'x,y' → true
    cate: { n: 0, quality: 20, week: 0 },  // 예비자 교리: 예비신자 수, 교리 준비(0~100), 세례식까지 센 주일
    promo: null,     // 교리 홍보 { mult, until(본당 시각), name }
    plans: [],       // 단체 행사 지원 요청 { key, room, type, stage: 'request'|'extra', paid, extra, age }
    weekIncome: 0,   // 이번 주에 거둔 봉헌 (공납금 기준, 건축헌금은 빠짐)
    levyDue: 0,      // 못 낸 교구 공납금
    trust: 50,       // 교구의 신뢰 (공납금을 제때 내면 오른다)
    sites: {},       // 땅 id → { kind: 'container', built, rooms: [단체|null, 단체|null] } 또는 { kind: 'gongso', level }
    jobs: [],        // 진행 중인 공사들 { kind, key, room, type, toLevel, start, until }
    teams: 1,        // 공사 팀 수 = 동시에 할 수 있는 공사 수
    villages: { v1: { open: false, visits: 0 } },
    lastTick: Date.now(),
    lastSunday: 0,
    lastAppeal: -1,  // 건축헌금을 호소한 주
    week: 0,
    prep: 0,
    event: null,
    guide: { council: false, container: false, group: false, sunday: false },  // 첫 걸음 (예전 안내, 기록용)
    tutorial: { step: 0, talked: -1, collected: false, seen: {}, v: 3 },  // 사목회장과의 대화 안내 (TUTORIAL 단계)
    daily: { day: null, attended: {}, allDone: false, committee: false },  // 오늘의 회의
    agenda: [],      // 상임위원회에 올라온 건의사항 { key, room, type, idx, day }
  };
  if (carry) {
    // 다른 본당으로 옮겨 왔을 때: 다이아·수녀원 평판·교구 신뢰·경력은 이어지고, 안내는 건너뛴다
    Object.assign(s.pastor, { gems: carry.gems, convent: carry.convent, trust: carry.trust, career: carry.career, teams: 1 });
    s.pastor.tutorial = { step: TUTORIAL.length, talked: TUTORIAL.length, collected: true, seen: carry.seen || {}, v: 3 };
    s.energy = s.energyMax = Math.max(rectoryEnergy(st0.rectory), carry.energyMax || 30);
    setupPrebuilt(s.pastor, pd);
  }
  installSisterAccessor(s.pastor);
  p_newDay(s.pastor);
  addLog(`${s.pastor.name} 주임 신부로 부임했습니다.`);
}

// 옮겨 간 본당에 이미 있는 것: 치워 둔 땅, 교리실과 단체, 오래 일한 직원
function setupPrebuilt(p, pd) {
  const st = pd.start, map = MAPS.solmoe, ch = map.fixed[0];
  p.cleared = p.cleared || {};
  const G = map.grid || 1;
  if (st.clear) for (const o of map.obstacleList()) if (o.type !== 'house' && !map.regionAt(o.x, o.y) && Math.hypot(o.x - ch.x - 2 * G, o.y - ch.y - 2 * G) < st.clear * G) p.cleared[o.id] = true;
  if (pd.interior) packFloors(p, (st.sites || []).flatMap(spec => spec.groups.map(([type, lv]) => ({ level: spec.level, g: { type, level: lv, vital: 65, slot: UNITS[type].slot } }))));
  else (st.sites || []).forEach((spec, i) => {
    const spot = map.findSpot('container', ch.x + 3 * G, ch.y + 8 * G);
    if (!spot) return;
    const site = { kind: 'container', built: true, level: spec.level, x: spot.x, y: spot.y, rooms: spec.groups.map(([type, lv]) => ({ type, level: lv, vital: 65, slot: UNITS[type].slot })) };
    growRooms(site);
    p.sites['s' + (i + 1)] = site;
  });
  p.crew = (st.crew || []).map((c, i) => {
    const r = CREW_ROLES[c.role], lv = c.level || 1;
    return { name: STAFF_NAMES[(i * 5 + 3) % STAFF_NAMES.length], age: 45, role: c.role, skill: 3, diligence: 3, faith: 3, level: lv, xp: 0, wage: Math.round(r.wage * Math.pow(1 + CREW_XP.raise, lv - 1) * 10) / 10, note: '전임 신부님 때부터 일해 온 직원' };
  });
  p.teams = 1 + p.crew.length;
}

// ---------- 본당 이동 (인사발령) ----------
function parishDef() { const p = Game.state.pastor; return PARISHES[(p && p.parishId) || 'solmoe'] || PARISHES.solmoe; }
function parishShort() { return parishDef().short; }
function parishMod(k) { const v = parishDef().mods[k]; return v === undefined ? (k === 'heart' || k === 'decline' ? 0 : 1) : k === 'decline' && hasPerk('senior3') ? v * 0.5 : v; }
// 지도·이름표의 '솔뫼'를 지금 본당 이름으로
function localize(t) { return String(t).replace(/솔뫼/g, parishShort()); }

// 성적표: 항목마다 0~100점, 무게대로 더해 총점
function reportCard() {
  const p = Game.state.pastor, seats = churchSeats();
  const groupPts = allGroups().reduce((a, x) => a + (x.g.level || 0), 0);
  const val = {
    members: { have: Math.floor(p.res.members), pts: clamp(p.res.members / 1300 * 100, 0, 100), txt: `${Math.floor(p.res.members)}명 (좌석 ${seats})` },
    heart: { pts: p.res.heart, txt: `${Math.round(p.res.heart)}` },
    reputation: { pts: p.res.reputation, txt: `${Math.round(p.res.reputation)}` },
    trust: { pts: (p.trust || 50) - (p.auditCaught || 0) * 10, txt: `${Math.round(p.trust || 50)}${p.auditCaught ? ` (감사 적발 ${p.auditCaught}번)` : ''}` },
    groups: { pts: clamp(groupPts / 80 * 100, 0, 100), txt: `${allGroups().filter(x => x.g.level).length}개 · 레벨 합 ${groupPts}` },
    baptized: { pts: clamp((p.baptizedTotal || 0) / 120 * 100, 0, 100), txt: `${p.baptizedTotal || 0}명` },
  };
  const rows = REPORT_ITEMS.map(it => ({ ...it, ...val[it.id], pts: Math.round(clamp(val[it.id].pts, 0, 100)) }));
  const score = Math.round(rows.reduce((a, r) => a + r.pts * r.w, 0) / rows.reduce((a, r) => a + r.w, 0));
  const g = REPORT_GRADES.find(x => score >= x[0]);
  return { rows, score, grade: g[1], gradeText: g[2] };
}
// 주교님이 제안하시는 행선지: 조건을 채운 곳 중 좋은 순서로 두 곳 (지금 본당은 빼고)
function transferOffers(card) {
  const p = Game.state.pastor, cur = p.parishId || 'solmoe';
  const ok = id => { const n = PARISHES[id].need || {}; return card.score >= (n.score || 0) && (p.trust || 50) >= (n.trust || 0) && p.res.reputation >= (n.rep || 0); };
  return ['city', 'newtown', 'harbor', 'island'].filter(id => id !== cur && ok(id)).slice(0, 2);
}
// 왜 못 가는지 (성적표 화면에 보여 줌)
function transferNeedText(id) {
  const n = PARISHES[id].need || {}, out = [];
  if (n.score) out.push(`성적 ${n.score}점`);
  if (n.trust) out.push(`교구 신뢰 ${n.trust}`);
  if (n.rep) out.push(`평판 ${n.rep}`);
  return out.join(' · ') || '조건 없음';
}
// answered가 false면 아직 주교님 전화에 답하지 않았다 (예전 저장의 p.transfer는 답한 것으로 친다)
function transferReady() { const p = Game.state.pastor; return !!(p && p.transfer && p.transfer.answered !== false && p.week >= p.transfer.due); }
function bishopCallDue() { const p = Game.state.pastor; return !!(p && p.transfer && p.transfer.answered === false && p.week >= (p.transfer.callAt || 0)); }
// 주교님 전화에 답하기: go면 그때부터 notice주일 뒤 발령, 아니면 stayWeeks 늘리고 끝나기 notice주일 전에 다시 전화
function answerBishop(go) {
  const p = Game.state.pastor, t = p.transfer, weeks = t.notice || TRANSFER.weeks;
  if (go) { p.transfer = { ...t, answered: true, due: p.week + weeks }; addLog('📞 주교님께 이동하겠다고 말씀드렸어요.'); return; }
  const due = p.week + TRANSFER.stayWeeks;
  p.transfer = { week: p.week, due, callAt: due - weeks, notice: weeks, answered: false, stayed: (t.stayed || 0) + 1 };
  addLog('📞 주교님께 이 본당에 조금 더 머물고 싶다고 청했어요.');
}
function transferWeeksLeft() { const p = Game.state.pastor; return p.transfer ? Math.max(0, p.transfer.due - p.week) : 0; }
// 성당이 정한 레벨에 이르면 인사발령 예정 공문
function checkTransferNotice(p) {
  if (p.transfer) return null;
  // 첫 본당은 퀘스트를 모두 마치면 (v1.05), 그 뒤 본당은 성당 레벨로
  const first = questRun(p);
  if (first ? !questsAllDone(p) : p.fixed.church < TRANSFER.church) return null;
  const weeks = first ? FIRST_TRANSFER.weeks : TRANSFER.weeks;
  p.transfer = { week: p.week, due: p.week + weeks, callAt: p.week, notice: weeks, answered: false };
  addLog('📞 인사발령 시즌이라 교구장 주교님께서 전화를 주셨어요.');
  return '📞 인사발령 시즌이에요. 교구장 주교님께서 안부 전화를 주셨어요.';
}
function transferNeedLabel() { return questRun(Game.state.pastor) ? `첫 본당 퀘스트 ${questDoneCount()}/${FIRST_QUESTS.length}를 마치면 인사발령` : `성당 Lv${TRANSFER.church}이 되면 인사발령`; }

// ---------- 첫 본당 퀘스트 (v1.05) ----------
// p.quest = { next: 다음에 꺼낼 번호, active: [id], done: {id: true}, nextAt: 다음 퀘스트가 생기는 시각 }
function questRun(p) { p = p || Game.state.pastor; return !!p && !(p.career && p.career.length) && !parishDef().interior; }
function questOn() { const p = Game.state.pastor; return questRun(p) && !(p.tutorial && TUTORIAL[p.tutorial.step] && TUTORIAL[p.tutorial.step].id !== 'grow'); }
function questState() { const p = Game.state.pastor; return p.quest || (p.quest = { next: 0, active: [], done: {}, nextAt: 0 }); }
function questDef(id) { return FIRST_QUESTS.find(q => q.id === id); }
function questProgress(q) { const [have, want] = q.need(); return { have: Math.min(have, want), want, ok: have >= want }; }
function questDoneCount(p) { p = p || Game.state.pastor; return Object.keys((p.quest && p.quest.done) || {}).length; }
function questsAllDone(p) { return questDoneCount(p) >= FIRST_QUESTS.length; }
function questActive() { return questOn() ? questState().active.map(questDef).filter(Boolean) : []; }
function questNextSec() { const q = questState(); return q.next < FIRST_QUESTS.length ? Math.max(0, Math.ceil((q.nextAt - Date.now()) / 1000)) : 0; }
// 걸린 퀘스트가 셋보다 적고 때가 되면 하나 꺼낸다. 걸린 게 하나도 없으면 기다리지 않고 바로
function questTick(now = Date.now()) {
  if (!questOn()) return [];
  const q = questState(), out = [];
  while (q.next < FIRST_QUESTS.length && q.active.length < QUEST_ACTIVE && (now >= q.nextAt || !q.active.length)) {
    const d = FIRST_QUESTS[q.next++];
    if (q.done[d.id]) continue;
    q.active.push(d.id); out.push(d);
    q.nextAt = now + questGapMin(q.next) * 60000 / timeScale();
  }
  return out;
}
function questRewardText(r) { return [r.offering ? `💰${r.offering}` : '', r.gems ? `💎${r.gems}` : '', r.heart ? `❤️+${r.heart}` : ''].filter(Boolean).join(' '); }
function claimQuest(id) {
  const q = questState(), d = questDef(id);
  if (!d || !q.active.includes(id) || !questProgress(d).ok) return null;
  q.active = q.active.filter(x => x !== id); q.done[id] = true;
  const r = d.reward, got = r.offering ? addRes('offering', r.offering) : 0;
  if (r.gems) addGems(r.gems);
  if (r.heart) Game.state.pastor.res.heart = clamp(Game.state.pastor.res.heart + r.heart, 0, 100);
  if (got) Game.state.pastor.weekIncome = (Game.state.pastor.weekIncome || 0) + got;
  addLog(`📜 퀘스트 완료: ${d.name}`);
  questTick();
  return `📜 ${d.name} 완료! ${questRewardText(r)}`;
}
// 1년 더 머무르기: 몇 주일 뒤 다시 평가
function stayLonger() { const p = Game.state.pastor; p.transfer = { week: p.week, due: p.week + TRANSFER.stayWeeks, stayed: (p.transfer && p.transfer.stayed || 0) + 1 }; addLog('📜 주교님께 이 본당에 조금 더 머물겠다고 말씀드렸어요.'); }
// 새 본당으로 옮긴다: 능력치·숨은 수치·나이는 Game.state에 그대로, 다이아·수녀원 평판·교구 신뢰·경력은 가져간다
function moveParish(id) {
  const s = Game.state, p = s.pastor, card = reportCard();
  const career = (p.career || []).concat([{ name: p.name, icon: parishDef().icon, weeks: p.week, score: card.score, grade: card.grade, members: Math.floor(p.res.members) }]);
  const carry = { gems: p.gems || 0, convent: p.convent === undefined ? SISTER.convent : p.convent, trust: p.trust || 50, career, seen: (p.tutorial && p.tutorial.seen) || {}, energyMax: s.energyMax };
  startPastor(id, carry);
  return career[career.length - 1];
}


// ---------- 자원 ----------

function addRes(key, v) {
  const p = Game.state.pastor;
  if (!p) return 0;
  const r = p.res;
  const before = r[key];
  // 마음은 이미 클수록 더 얻기 어렵다
  if (key === 'heart' && v > 0) v *= 1 - before / 110;
  if (key === 'members') r[key] = Math.max(0, Math.min(churchSeats(), before + v));
  else if (key === 'offering') r[key] = v > 0 ? Math.max(before, Math.min(vaultCap(), before + v)) : Math.max(0, before + v);
  else r[key] = clamp(before + v, 0, 100);
  return r[key] - before;
}

// 넘친 봉헌을 사무실이 대신 거두는 비율: 사무실 Lv1 65% ~ Lv5 85%
function autoCollectRate() { return Math.min(0.85, 0.6 + 0.05 * (Game.state.pastor.fixed.office || 1)); }
function vaultCap() { return VAULT[Game.state.pastor.fixed.office || 1]; }

function massCount() { const p = Game.state.pastor; return Math.max(1, (p && p.masses) || 1); }
function churchSeats() { const p = Game.state.pastor; return Math.round(CHURCH_LEVELS[p.fixed.church].seats * (1 + MASSES.seats * (massCount() - 1)) * (p.overflow ? 1.1 : 1)); }
function sundayCost() { return SUNDAY_COST + Math.max(0, MASSES.energy * (massCount() - 1) - (hasPerk('eucharist6') && massCount() > 1 ? 1 : 0)); }
function massCost() { return scaledCost(MASSES.cost) * (massCount() - 1); }
// 미사를 한 대 더: 신자가 좌석의 80%를 넘어야 (빈자리가 많으면 의미가 없다)
function addMassBlocker() {
  const p = Game.state.pastor;
  if (massCount() >= MASS_TIMES.length) return '미사를 더 늘릴 수 없어요';
  if (p.res.members < churchSeats() * MASSES.addAt) return `신자가 좌석의 ${Math.round(MASSES.addAt * 100)}%(${Math.ceil(churchSeats() * MASSES.addAt)}명)를 넘으면 늘릴 수 있어요`;
  return null;
}
function addMass() { const p = Game.state.pastor; if (addMassBlocker()) return null; p.masses = massCount() + 1; addLog(`🕰️ ${MASS_TIMES[p.masses - 1].name}를 새로 만들었어요`); return MASS_TIMES[p.masses - 1]; }
function removeMass() { const p = Game.state.pastor; if (massCount() <= 1) return null; const m = MASS_TIMES[massCount() - 1]; p.masses = massCount() - 1; p.res.members = Math.min(p.res.members, churchSeats()); addLog(`🕰️ ${m.name}를 없앴어요`); return m; }
// 성당이 꽉 차면 교우들이 미사를 늘려 달라고 한다
function massReqText() {
  const p = Game.state.pastor, next = MASS_TIMES[massCount()];
  return `사목회장과 구역장님들이 찾아왔다. "신부님, 주일미사에 자리가 없어서 서서 미사를 드리는 분이 많아요. 어르신들은 그냥 돌아가시기도 해요. <b>${next.name}</b>를 새로 만들어 주시면 좋겠어요." 신자 <b>${Math.floor(p.res.members)}</b>명 / 좌석 <b>${churchSeats()}</b>석.`;
}
function massReqOptions() {
  const p = Game.state.pastor, next = MASS_TIMES[massCount()];
  return [
    { label: `${next.icon} ${next.name}를 새로 만든다`, res: { heart: 2 }, risk: `좌석 +${Math.round(MASSES.seats * 100)}% · 참례율 +${Math.round(MASSES.attend * 100)}% · 대신 주일미사 행동력 +${MASSES.energy}, 미사 경비 💰${scaledCost(MASSES.cost)}/주일`, after: () => { p.masses = massCount() + 1; }, result: '"이제 앉아서 미사 드릴 수 있겠네요!" 교우들이 반가워했다. 주일이 조금 더 바빠졌다.' },
    ...(p.overflow ? [] : [{ label: '교리실에 화면을 달아 미사를 중계한다', cost: 20, risk: '좌석 +10% (한 번만) · 행동력은 그대로', after: () => { p.overflow = true; }, result: '교리실에 화면과 스피커를 달았다. 조금 답답하지만 다들 자리를 찾았다.' }]),
    { label: '지금은 미사를 늘리기 어렵다고 한다', res: { heart: -2, reputation: -1, members: -3 }, result: '"할 수 없지요…" 몇몇 가족은 자리가 넉넉한 이웃 본당으로 옮겨 갔다.' },
  ];
}


function containers() {
  const p = Game.state.pastor;
  return p ? Object.entries(p.sites).filter(([, x]) => x.kind === 'container') : [];
}

function siteUnits(x) { return x.floor ? FLOOR_UNITS : x.floors === 2 ? 2 : 1; }
function roomsFor(level, floors) { return ROOMS_BY_TIER[ROOM_LEVELS[level || 1].tier] * (floors === 2 ? 2 : 1); }
// 교리실이 커지면 방을 늘린다 (단체가 든 방은 그대로)
function growRooms(site) { const n = site.floor ? FLOOR_ROOMS : roomsFor(site.level, site.floors); while (site.rooms.length < n) site.rooms.push(null); }
// 교리실 이름: 성전 안 본당은 'n층 교리실', 그 밖은 '교리실 n' (full이면 '컨테이너 교리실 n')
function siteName(key, full) { const c = Game.state.pastor.sites[key]; return c && c.floor ? `${c.floor}층 교리실` : `${full ? '컨테이너 ' : ''}교리실 ${containerIndex(key)}`; }
// 성전 안 본당: 단체들을 층마다 방 6개씩 채워 넣는다 (부임할 때·예전 저장을 바꿀 때). 옛 자리 → 새 자리 표를 돌려준다
function floorSitesOf(p) { return Object.keys(p.sites).filter(k => p.sites[k].floor).sort((a, b) => p.sites[a].floor - p.sites[b].floor); }
function packFloors(p, list) {
  for (const k of Object.keys(p.sites)) if (p.sites[k].kind === 'container') delete p.sites[k];
  const where = {}, n = Math.min(FLOOR_MAX, Math.max(1, Math.ceil(list.length / FLOOR_ROOMS)));
  for (let f = 1; f <= n; f++) {
    const chunk = list.slice((f - 1) * FLOOR_ROOMS, f * FLOOR_ROOMS);
    const site = { kind: 'container', built: true, floor: f, level: Math.max(1, ...chunk.map(x => x.level || 1)), rooms: [] };
    let j = 1; while (p.sites['s' + j]) j++; // 공소가 쓰는 이름은 비켜서
    const key = 's' + j;
    chunk.forEach((x, i) => { site.rooms[i] = x.g; if (x.from) where[x.from] = [key, i]; });
    growRooms(site);
    p.sites[key] = site;
  }
  return where;
}
function containerCount() { return containers().reduce((n, [, x]) => n + siteUnits(x), 0); }

// 모든 방의 단체 목록 [{ key, room, g }]
function allGroups() {
  const out = [];
  for (const [key, c] of containers()) c.rooms.forEach((g, room) => { if (g) out.push({ key, room, g }); });
  return out;
}

function groupCount() { return allGroups().length; }

// 컨테이너가 다 지어졌고 단체가 없는 방 수
function roomsFree() {
  return containers().reduce((n, [, c]) => n + (c.built ? c.rooms.filter(r => !r).length : 0), 0);
}

// 그 종류 단체의 힘: 레벨 × 활력 (만드는 중인 것은 0). 활력 60이면 거의 레벨 그대로
function vitalMult(g) { return 0.4 + (g.vital === undefined ? 60 : g.vital) / 100; }
function unitLevels(type) { return allGroups().reduce((sum, x) => sum + (x.g.type === type && x.g.level ? effL(x.g.level) * vitalMult(x.g) : 0), 0); }

// 단체 테크 트리: 건물 레벨 조건 [{ label, have, want, ok }]
function unitUnlockNeeds(type) {
  const u = UNIT_UNLOCK[type] || {}, p = Game.state.pastor, names = { church: '성당', office: '사무실', rectory: '사제관' };
  const out = Object.entries(u).map(([k, want]) => { const have = p.fixed[k] || 1; return { label: `${names[k]} Lv${want}`, have, want, ok: have >= want }; });
  const pre = UNIT_PREREQ[type];
  if (pre) out.push({ label: `${UNITS[pre].icon} ${UNITS[pre].name} 먼저`, ok: allGroups().some(x => x.g.type === pre && x.g.level >= 1), prereq: true });
  return out;
}
function unitUnlocked(type) { return unitUnlockNeeds(type).every(n => n.ok); }
function unitLockText(type) { const miss = unitUnlockNeeds(type).filter(n => !n.ok); return miss.length ? `🔒 ${miss.map(n => n.label).join(' · ')} 필요` : ''; }

// 소공동체는 넓어진다: 반 → 구역(Lv4) → 지역(Lv7, 지역장)
// 소공동체: 신자 수에 따라 반·구역·지역이 생긴다 (반장·구역장·지역장)
function smallComStats() {
  const p = Game.state.pastor, L = unitLevels('district');
  if (!L || !p) return { rate: 0, people: 0, ban: 0, gu: 0, ji: 0 };
  const rate = clamp(SMALLCOM.base + SMALLCOM.per * L + (sisterIn('district') ? 0.05 * sisterEffFor('district') : 0) + dirMod('smallCom'), 0, SMALLCOM.max);
  const people = Math.floor(p.res.members * rate);
  const ban = Math.max(1, Math.round(people / SMALLCOM.perBan));
  const gu = ban > SMALLCOM.banPerGu ? Math.ceil(ban / SMALLCOM.banPerGu) : 0;
  const ji = gu > SMALLCOM.guPerJi ? Math.ceil(gu / SMALLCOM.guPerJi) : 0;
  return { rate, people, ban, gu, ji };
}
function districtStage() { const st = smallComStats(); return st.ji ? '지역' : st.gu ? '구역' : '반'; }
function smallComLine() { const st = smallComStats(); return [st.ji ? `지역 ${st.ji}` : '', st.gu ? `구역 ${st.gu}` : '', `반 ${st.ban}`].filter(Boolean).join(' · '); }
// 소공동체 위원장: 구역이 생겨야(반이 10개를 넘어야) 세울 수 있다
function smallComNeeds() {
  const st = smallComStats(), g = allGroups().find(x => x.g.type === 'district');
  return [
    { label: '🏘️ 소공동체 Lv2', ok: !!g && g.g.level >= 2, have: g ? g.g.level : 0 },
    { label: `구역 생기기 (반 ${st.ban}/${SMALLCOM.banPerGu + 1})`, ok: st.gu > 0 },
  ];
}

// 단체 능력이 열렸는지 (그 단체가 그 레벨 이상)
function hasPerk(id) {
  const m = id.match(/^([a-zA-Z]+)(\d+)$/);
  return allGroups().some(x => x.g.type === m[1] && x.g.level >= +m[2]);
}
function unlockedPerks() { return Object.values(UNIT_PERKS).flat().filter(k => hasPerk(k.id)); }

// 회의를 스스로 진행하는 단체: 단체 Lv5(위원장)이거나, 그 분과에 위원장이 선임되어 있으면
function chairLed(g) { return g.level >= CHAIR_LEVEL || !!divisionChairFor(g.type); }

// ---------- 본당 조직: 분과장·위원장 ----------
function chairs() { const p = Game.state.pastor; return p.chairs || (p.chairs = {}); }
function chairsCount() { return Object.keys(chairs()).length; }
function hasChair(id) { return !!chairs()[id]; }
function orgGroups(o) { return (o.groups || []).concat(o.extra || [], ORG.filter(x => (o.chairs || []).includes(x.id)).flatMap(x => orgGroups(x))); }
function divisionChairFor(type) {
  if (!Game.state.pastor) return null;
  return ORG.find(o => hasChair(o.id) && orgGroups(o).includes(type)) || null;
}
// 선임 조건: 속한 단체가 모두 그 레벨 이상(또는 먼저 있어야 할 위원장이 모두 있음)
function orgNeeds(o) {
  if (o.special) return o.special();
  const ch = (o.chairs || []).map(id => { const c = ORG.find(x => x.id === id); return { label: `${c.icon} ${c.name}`, ok: hasChair(id) }; });
  if (!o.groups) return ch;
  return ch.concat(o.groups.map(t => { const g = allGroups().find(x => x.g.type === t); return { label: `${UNITS[t].icon} ${UNITS[t].name} Lv${o.lv}`, ok: !!g && g.g.level >= o.lv, have: g ? g.g.level : 0 }; }));
}
function orgReady(o) { return !hasChair(o.id) && orgNeeds(o).every(n => n.ok); }
function appointChair(id) {
  const o = ORG.find(x => x.id === id);
  if (!o || !orgReady(o) || Game.state.energy < APPOINT_ENERGY) return null;
  spendEnergy(APPOINT_ENERGY);
  chairs()[id] = true;
  addLog(`👔 ${o.name}을 선임했습니다.`);
  return `${o.icon} ${o.name}을 선임했어요! ${o.groups ? '이 분과 단체들은 이제 회의를 스스로 진행해요. ' : ''}덤: ${o.perk}${chairsCount() === COMMITTEE_CHAIRS ? ' · 위원장이 3명이 되어 상임위원회가 열렸어요!' : ''}`;
}
function helpCost() { return hasChair('youngDiv') ? 1 : 2; }

// ---------- 오늘의 회의 · 위원장 · 상임위원회 ----------

function groupId(key, room) { return `${key}:${room}`; }

// 신부가 직접 회의에 들어가야 하는 단체들 (위원장 이전)
const MEET_INVITE_VITAL = 20; // 위원장 회의 초대에 응하면 (안 가도 줄지 않는다)
// 지금 신부님을 초대한 위원장 단체
function meetingInvites() { return allGroups().filter(x => x.g.level >= 1 && chairLed(x.g) && meetingState(x.key, x.room) === 'invite'); }
function pastorMeetings() { return allGroups().filter(x => x.g.level >= 1 && !chairLed(x.g)); }

// 회의 시간: 단체를 만들 때 신부가 정한다 (나중에 바꿀 수 있음). 정하지 않았으면 단체의 기본 시간
function groupSlot(g) { return g.slot || UNITS[g.type].slot; }

function slotOpen(g) {
  const sl = MEETING_SLOTS[groupSlot(g)], h = clockHour();
  return h >= sl.from && h < sl.to;
}

function setGroupSlot(key, room, slot) {
  const g = Game.state.pastor.sites[key].rooms[room];
  if (!g || !MEETING_SLOTS[slot]) return false;
  g.slot = slot;
  addLog(`🕘 ${UNITS[g.type].name} 회의 시간을 ${josa(MEETING_SLOTS[slot].name, '으로', '로')} 정했습니다.`);
  return true;
}

function meetingState(key, room) {
  const g = Game.state.pastor.sites[key].rooms[room];
  if (!g || g.level < 1) return 'none';
  // 위원장이 이끄는 단체도 회의 시간에 신부님을 초대한다 (v0.91): 가면 활력이 오르고, 안 가도 그대로
  if (Game.state.pastor.daily.attended[groupId(key, room)]) return 'done';
  if (chairLed(g)) return slotOpen(g) ? 'invite' : 'chair';
  return slotOpen(g) ? 'open' : 'wait';
}

// 날이 바뀌면: 빠진 회의는 활력이 떨어지고, 위원장 단체는 건의사항을 올린다
const AGENDA_MAX = 4;

// ---------- 지출 장부와 월별 보고서 ----------
// 장부: 단체별 { edu, bus, food, supply, extra, agenda, upkeep } + 본당 { staff, building, levy, baptism }
function ledger() { const p = Game.state.pastor; return p.ledger || (p.ledger = { groups: {}, parish: {} }); }
// 수입 장부 (월별 보고서에 수입으로 보인다)
function bookIncome(type, cat, amount) {
  if (!amount) return;
  const L = ledger(); L.income = L.income || {};
  const k = (type ? type + ':' : '') + cat;
  L.income[k] = (L.income[k] || 0) + amount;
}
function book(type, cat, amount) {
  if (!amount) return;
  const L = ledger();
  if (type) { const g = L.groups[type] || (L.groups[type] = {}); g[cat] = (g[cat] || 0) + amount; }
  else L.parish[cat] = (L.parish[cat] || 0) + amount;
}
const LEDGER_ICON = { autoCollect: '🗂️', choirSnack: '🍪', conductor: '🎼', accompanist: '🎹', flowers: '💐', bouquetWedding: '💒', bouquetBaptism: '💐', schoolPrep: '📚', snack: '🍙', laundry: '🧺', hosts: '🍞', wine: '🍷', holyHour: '🕯️', feastCandle: '🕯️', mass: '🕰️', seminary: '🎓', shuttle: '🚐', edu: '🎓', bus: '🚌', food: '🍱', supply: '📦', extra: '➕', agenda: '📨', upkeep: '👥', staff: '👷', building: '🏠', levy: '🏛️', loan: '🏦', baptism: '🕊️', event: '🎉' };
const LEDGER_NAME = { choirSnack: '성가대 간식비', conductor: '지휘자 봉사비', accompanist: '반주자 지원금', flowers: '꽃 구입비', bouquetWedding: '혼배 꽃다발 판매', bouquetBaptism: '세례식 꽃다발 판매', schoolPrep: '교리 준비비', snack: '간식 재료비', laundry: '제대포·제의 세탁비', hosts: '제병 구입비', wine: '미사주 구입비', holyHour: '성시간 컵초 판매', feastCandle: '대축일 컵초 판매', mass: '미사 경비', seminary: '신학교 지원비', shuttle: '셔틀버스 기름값', edu: '교육·연수비', bus: '버스 대여비', food: '식사·다과비', supply: '재료·물품비', extra: '추가 지원', agenda: '상임위 건의', upkeep: '단체 활동비', staff: '인건비', building: '건물 살림', levy: '교구 공납금', loan: '신협 대출 상환', baptism: '세례식', autoCollect: '사무실이 대신 거둔 봉헌' };
// 활동비를 줄인 단체 (살림 30% 줄지만 매일 활력 −3)
function groupCut(type) { return groupBudget(type) === 'low'; }
// ---------- 단체별 지원 수준 ----------
function groupBudget(type) { const p = Game.state.pastor; return (p.budget && p.budget[type]) || 'normal'; }
function setBudget(type, v) { const p = Game.state.pastor; p.budget = p.budget || {}; if (v === 'normal') delete p.budget[type]; else p.budget[type] = v; }
function budgetUpkeep(type) { return BUDGET[groupBudget(type)].upkeep; }
// ---------- 월별 사목 방향 ----------
function monthIdx() { return Math.floor(Game.state.pastor.week / 4); }
function direction() { const p = Game.state.pastor; return p && p.direction && p.direction.month === monthIdx() ? DIRECTIONS.find(d => d.id === p.direction.id) : null; }
function dirMod(k) { const d = direction(), v = d ? d.mods[k] : undefined; return v === undefined ? (['heart', 'rep', 'attend', 'smallCom', 'vital', 'allVital'].includes(k) ? 0 : 1) : v; }
function setDirection(id) { const p = Game.state.pastor; p.direction = { id, month: monthIdx() }; addLog(`📅 이번 달 사목 방향: ${DIRECTIONS.find(d => d.id === id).name}`); }
function inDirection(type) { const d = direction(); return !!d && (GROUP_FIELD[d.id] || []).includes(type); }
// 지원 차이로 생기는 불만: 많이 받는 단체가 있고 덜 받는 단체가 있을 때
function grumbleRoll(p) {
  if (p.event) return null;
  const gs = allGroups().filter(x => x.g.level >= 1), high = gs.filter(x => groupBudget(x.g.type) === 'high'), rest = gs.filter(x => groupBudget(x.g.type) !== 'high' && !inDirection(x.g.type));
  if (!high.length || !rest.length || Math.random() >= Math.min(GRUMBLE.max, GRUMBLE.base + GRUMBLE.perHigh * high.length)) return null;
  const lows = rest.filter(x => groupBudget(x.g.type) === 'low'), who = (lows.length && Math.random() < 0.6 ? lows : rest)[Math.floor(Math.random() * (lows.length && Math.random() < 0.6 ? lows : rest).length)] || rest[0];
  const vs = high[Math.floor(Math.random() * high.length)];
  p.grumble = { who: who.g.type, vs: vs.g.type };
  p.event = 'budgetGrumble';
  return `😤 ${UNITS[who.g.type].name}에서 "${UNITS[vs.g.type].name}만 지원해 준다"며 불만이 나왔어요.`;
}
function grumbleText() {
  const p = Game.state.pastor, a = p.grumble;
  if (!a) return '';
  const d = direction();
  return `${UNITS[a.who].icon} ${UNITS[a.who].name} 회장이 찾아왔다. "신부님, ${UNITS[a.vs].name}에는 활동비를 넉넉히 주시면서 저희는 ${BUDGET[groupBudget(a.who)].name} 주시니 너무 서운합니다. 저희도 열심히 하는데요."<br><span class="muted">${UNITS[a.vs].name} 지원 ${BUDGET[groupBudget(a.vs)].name} · ${UNITS[a.who].name} 지원 ${BUDGET[groupBudget(a.who)].name}${d ? ` · 이번 달 사목 방향: ${d.icon} ${d.name}${inDirection(a.vs) ? ` (${UNITS[a.vs].name}은 이번 달 중점 분야예요)` : ''}` : ''}</span>`;
}
function grumbleOptions() {
  const p = Game.state.pastor, a = p.grumble;
  if (!a) return [];
  const w = UNITS[a.who].name, v = UNITS[a.vs].name;
  const vital = (type, d) => { for (const { g } of allGroups()) if (g.type === type && g.level) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + d, 0, 100); };
  return [
    { label: `${w} 지원도 넉넉히 늘려 준다`, effect() { setBudget(a.who, 'high'); vital(a.who, 5); addRes('heart', 1); p.grumble = null; this.result = `"감사합니다, 신부님!" ${w}가 신이 났다. 대신 활동비가 더 나가요 (${w} 지원 많이 · 활력 +5 · ❤️+1)`; } },
    { label: `왜 ${v}를 더 지원하는지 차근차근 설명한다`, effect() {
      p.grumble = null;
      const odds = clamp(0.35 + Game.state.stats.rapport * 0.004 + (inDirection(a.vs) ? 0.3 : 0), 0.15, 0.9);
      if (Math.random() < odds) { addRes('heart', 1); this.result = `"그런 뜻이 있으셨군요. 저희 차례도 오겠지요." ${w} 회장이 고개를 끄덕였다 (❤️+1)${inDirection(a.vs) ? ' · 이번 달 사목 방향과 맞아서 설득이 쉬웠어요' : ''}`; }
      else { vital(a.who, -8); addRes('heart', -2); this.result = `"결국 편애하시는 거네요." ${w} 회장은 서운한 얼굴로 돌아갔다 (${w} 활력 −8 · ❤️−2)`; }
    } },
    { label: '지원을 고르게 맞춘다', effect() { setBudget(a.vs, 'normal'); vital(a.vs, -8); vital(a.who, 3); p.grumble = null; this.result = `${v}의 지원을 보통으로 줄였다. ${v}는 아쉬워했지만 ${w}는 마음이 풀렸다 (${v} 활력 −8 · ${w} 활력 +3)`; } },
    { label: '그냥 넘어간다', effect() { vital(a.who, -10); addRes('heart', -1); addRes('reputation', -1); p.grumble = null; this.result = `${w} 회장은 말없이 돌아갔다. "본당이 편애한다"는 말이 돌기 시작했다 (${w} 활력 −10 · ❤️−1 · 🌏−1)`; } },
  ];
}

// 한 달(네 주일)마다 단체들이 보고서를 올린다
function monthlyReport() {
  const p = Game.state.pastor, L = ledger();
  const groups = Object.entries(L.groups).map(([type, c]) => ({ type, cats: c, total: Object.values(c).reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total);
  const parishTotal = Object.values(L.parish).reduce((a, b) => a + b, 0);
  const rep = { label: pastorDateLabel().replace(/ \d주$/, ''), groups, parish: { ...L.parish }, income: { ...(L.income || {}) }, total: groups.reduce((a, g) => a + g.total, 0) + parishTotal, read: false };
  p.reports = [rep, ...(p.reports || [])].slice(0, 3);
  p.ledger = { groups: {}, parish: {} };
  return rep;
}

// ---------- 단체 행사 지원금 ----------
function planDef(pl) { return EVENT_PLANS[pl.defId || pl.type]; }
function mothersFood() { const L = groupTopLevel('mothers'); return L ? Math.min(0.4, 0.1 + 0.05 * effL(L)) : 0; }
function planBase(pl) { return scaledCost(Object.entries(planDef(pl).parts).reduce((a, [k, v]) => a + v * (k === 'food' ? 1 - mothersFood() : k === 'bus' && hasPerk('christopher3') ? 0.7 : 1), 0)); }

// 지출 기준
function policy(id) { const p = Game.state.pastor; p.policy = p.policy || {}; return p.policy[id] || POLICIES.find(x => x.id === id).def; }
function setPolicy(id, v) { const p = Game.state.pastor; p.policy = p.policy || {}; p.policy[id] = v; }
function policyFactor(id) { const pol = POLICIES.find(x => x.id === id), c = pol.choices.find(x => x[0] === policy(id)); return c ? c[2] : 0; }
// 이 행사에서 본당이 내는 몫 (0~1)과 금액, 항목별 내역
function planShare(def) {
  const parts = Object.entries(def.parts), total = parts.reduce((a, [, v]) => a + v, 0);
  return parts.reduce((a, [k, v]) => a + v * policyFactor(k), 0) / total;
}
function planBreakdown(def) {
  return Object.entries(def.parts).map(([k, v]) => `${PART_NAME[k]} ${policyFactor(k) === 1 ? '본당' : policyFactor(k) === 0.5 ? '반반' : '단체'}`).join(' · ');
}
function planGroup(pl) { const st = Game.state.pastor.sites[pl.key]; return st && st.rooms[pl.room]; }

// 하루가 바뀔 때: 오래 답이 없던 요청은 취소, 단체가 새 행사를 계획
function planNewDay(p) {
  const lines = [];
  p.plans = p.plans || [];
  for (const pl of p.plans) pl.age = (pl.age || 0) + 1;
  for (const pl of p.plans.filter(x => x.age >= PLAN.expireDays)) {
    const g = planGroup(pl);
    if (g) g.vital = Math.max(0, (g.vital === undefined ? 60 : g.vital) - 8);
    lines.push(`💸 ${UNITS[pl.type].name}: 지원금 답이 없어 "${planDef(pl).name}"을 취소했어요. 활력이 떨어졌어요.`);
  }
  p.plans = p.plans.filter(x => x.age < PLAN.expireDays);
  for (const { g } of allGroups()) {
    if (!g.level) continue;
    const dv = BUDGET[groupBudget(g.type)].vital + (inDirection(g.type) ? dirMod('vital') : 0) + dirMod('allVital');
    if (dv) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + dv, 0, 100);
  }
  for (const { key, room, g } of allGroups()) {
    if (!g.level || !EVENT_PLANS[g.type] || p.plans.length >= PLAN.max || p.plans.some(x => x.key === key && x.room === room) || Math.random() > PLAN.chance) continue;
    lines.push(autoPlan(p, key, room, g));
  }
  return lines;
}

// 단체가 행사를 계획하면 지출 기준대로 바로 지원한다. 본당이 많이 낼수록 행사가 풍성하고 단체도 힘이 난다
function autoPlan(p, key, room, g) {
  const def = EVENT_PLANS[g.type], name = UNITS[g.type].name, share = planShare(def);
  const pl = { key, room, type: g.type, paid: 0, age: 0 };
  const pay = Math.round(planBase(pl) * share);
  if (pay > 0 && p.res.offering < pay) {
    g.vital = Math.max(0, (g.vital === undefined ? 60 : g.vital) - 8);
    addRes('heart', -1);
    return `💸 살림이 모자라 ${name} "${def.name}" 지원금(💰${pay})을 못 드렸어요. 실망했어요 (활력 −8)`;
  }
  p.res.offering -= pay;
  p.weekSpent = (p.weekSpent || 0) + pay;
  // 장부: 항목별로 본당이 낸 몫
  const totalParts = Object.values(def.parts).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(def.parts)) book(g.type, k, Math.round(planBase(pl) * v / totalParts * policyFactor(k)));
  pl.paid = pay;
  pl.scale = 0.5 + 0.5 * share;
  pl.vital = Math.round(def.vital * share - (1 - share) * 6);
  const head = `💸 ${name} "${def.name}": 기준대로 ${pay ? `💰${pay} 지원` : '지원 없이 자부담'} (${planBreakdown(def)})`;
  // 본당이 조금이라도 냈으면 가끔 돈이 더 필요하다고 다시 청한다
  if (share > 0 && Math.random() < PLAN.extraChance) {
    pl.extra = Math.max(5, Math.round(planBase(pl) * PLAN.extraRate * (hasPerk('golf3') ? 0.5 : 1) / 5) * 5);
    pl.stage = 'extra';
    const ex = policy('extra');
    if (ex === 'ask') { p.plans.push(pl); return `${head} · 준비하다 💰${pl.extra}가 더 필요하다고 다시 청해 왔어요`; }
    p.plans.push(pl);
    const m = answerExtra(p.plans.length - 1, ex === 'accept');
    return `${head} · ${m || '추가 요청을 처리하지 못했어요'}`;
  }
  return `${head} · ${runPlanEvent(pl, pl.scale, pl.vital)}`;
}

// 행사를 치르고 얻는 것 (scale: 잘 치르면 1, 크게 치르면 1.5, 줄이면 0.5)
// ---------- 동원력: 외부 활동에 교우들이 얼마나 나와 주는가 ----------
// 주임 신부와 교우들의 관계(교우들의 마음 + 신부님의 친화력)가 좋아야 사람이 모인다
function mobilization() { const s = Game.state; return clamp(0.1 + s.pastor.res.heart / 100 * 0.55 + s.stats.rapport / 100 * 0.35 + unitLevels('christopher') * 0.04, 0.1, 1); }
// 버스를 타고 나가는 행사(외부 활동)는 동원력만큼 효과가 달라진다 (동원력 75%면 그대로)
function isOuting(def) { return !!(def.parts && def.parts.bus); }
function outingScale() { return clamp(0.25 + mobilization(), 0.35, 1.25); }
function mobilizationLabel() { const m = mobilization(); return m >= 0.75 ? '잘 모여요' : m >= 0.5 ? '그럭저럭' : m >= 0.3 ? '잘 안 모여요' : '거의 안 모여요'; }

function runPlanEvent(pl, scale, vitalDelta) {
  const def = planDef(pl), g = planGroup(pl), got = [];
  if (isOuting(def)) { scale *= outingScale(); got.push(`🚌 동원력 ${Math.round(mobilization() * 100)}% (${mobilizationLabel()})`); }
  for (const [k, v] of Object.entries(def.res)) { const d = addRes(k, v * scale); if (Math.abs(d) >= 0.5) got.push(`${RES_ICON[k]}${fmt(d)}`); }
  if (def.cate) { const d = addCatechumens(Math.round(def.cate * scale)); if (d >= 1) got.push(`📘+${Math.round(d)}`); }
  if (g) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + vitalDelta, 0, 100);
  if (vitalDelta) got.push(`활력 ${fmt(vitalDelta)}`);
  return got.join(' · ');
}

function planBlocker(amount) { return Game.state.pastor.res.offering < amount ? `봉헌금 ${amount}만 원이 필요해요` : ''; }

// 첫 요청에 답하기: full 전액 / half 절반만 / no 거절
function answerPlan(i, mode) {
  const p = Game.state.pastor, pl = p.plans[i];
  if (!pl) return null;
  const def = planDef(pl), name = UNITS[pl.type].name, base = planBase(pl);
  if (mode === 'no') {
    p.plans.splice(i, 1);
    const g = planGroup(pl);
    if (g) g.vital = Math.max(0, (g.vital === undefined ? 60 : g.vital) - 10);
    addRes('heart', -1);
    let extraLose = '';
    for (const [k, v] of Object.entries(def.refuseLose || {})) { const d = addRes(k, v); if (d) extraLose += ` · ${RES_ICON[k]}${fmt(d)}`; }
    return `${name}: "${def.name}" 지원을 거절했어요. 위원들이 서운해해요 (활력 −10, ❤️−1${extraLose})${def.refuseLose ? ' · 새 신자 몇 명이 정을 붙이지 못하고 떠났어요' : ''}`;
  }
  const amount = mode === 'half' ? Math.round(base / 2) : base;
  if (planBlocker(amount)) return null;
  p.res.offering -= amount;
  book(pl.type, 'supply', amount);
  pl.paid = amount;
  if (mode === 'half') { p.plans.splice(i, 1); return `${name}: 지원금을 절반만 드렸어요. "${def.name}"을 조촐하게 치렀어요 · ${runPlanEvent(pl, 0.5, 2)}`; }
  // 전액 지원: 가끔 준비하다 돈이 더 필요하다고 다시 청한다
  if (Math.random() < PLAN.extraChance) { pl.stage = 'extra'; pl.extra = Math.max(5, Math.round(base * PLAN.extraRate * (hasPerk('golf3') ? 0.5 : 1) / 5) * 5); pl.age = 0; return `${name}: 지원금을 드렸어요. 그런데 준비하다 보니 💰${pl.extra}가 더 필요하다고 다시 청해 왔어요`; }
  p.plans.splice(i, 1);
  return `${name}: "${def.name}"을 잘 치렀어요 · ${runPlanEvent(pl, 1, def.vital)}`;
}

// 추가 요청에 답하기: 승낙하면 더 크게, 거절하면 🎲 스스로 메우거나(60%) 행사가 줄어든다(40%)
function answerExtra(i, accept) {
  const p = Game.state.pastor, pl = p.plans[i];
  if (!pl || pl.stage !== 'extra') return null;
  const def = planDef(pl), name = UNITS[pl.type].name;
  if (accept) {
    if (planBlocker(pl.extra)) return null;
    p.res.offering -= pl.extra;
    p.weekSpent = (p.weekSpent || 0) + pl.extra;
    book(pl.type, 'extra', pl.extra);
    p.plans.splice(i, 1);
    return `${name}: 추가 지원을 승낙했어요. "${def.name}"이 기대보다 훨씬 풍성했어요! · ${runPlanEvent(pl, (pl.scale || 1) * 1.5, (pl.vital !== undefined ? pl.vital : def.vital) + 5)}`;
  }
  p.plans.splice(i, 1);
  if (Math.random() < 0.6) return `${name}: 추가 지원을 거절하자 회원들이 바자회로 모자란 돈을 메웠어요. 조금 지쳤지만 행사는 치렀어요 · ${runPlanEvent(pl, pl.scale || 1, -5)}`;
  return `${name}: 추가 지원을 거절해서 "${def.name}"을 줄여서 치렀어요. 실망한 눈치예요 · ${runPlanEvent(pl, (pl.scale || 1) * 0.5, -10)}`;
}

// 성실하지 못하면 신자가 줄어든다 (하루가 바뀔 때)
// 주일미사를 하루 넘게 쉬면 −2%, 활력이 20 아래인 단체마다 −2명, 신자들의 마음이 25 아래면 −1%, 미뤄 둔 건의마다 −1명
function neglectPenalties(p, staleAgendas) {
  const lines = [], lose = (n, why) => { const got = -addRes('members', -n); if (got >= 1) lines.push(`📉 ${why} 신자 ${Math.round(got)}명이 성당을 떠났어요.`); };
  if (p.week > 0 && Date.now() - p.lastSunday > 4 * sundayIntervalMs()) lose(Math.ceil(p.res.members * 0.02), '주일미사가 오래 없어서');
  for (const { g } of allGroups()) if (g.level && (g.vital === undefined ? 60 : g.vital) < 20) lose(2, `${UNITS[g.type].name} 모임이 식어서`);
  if (p.res.heart < 25) lose(Math.ceil(p.res.members * 0.01), '마음이 식은 교우들이 냉담해져서');
  if (staleAgendas) lose(staleAgendas, '건의가 오래 미뤄져 실망한');
  return lines;
}

function p_newDay(p) {
  const d = p.daily;
  const today = dayKey();
  if (d.day === today) return [];
  const lines = [];
  if (d.day !== null) {
    for (const [key, c] of Object.entries(p.sites)) {
      if (c.kind !== 'container') continue;
      c.rooms.forEach((g, room) => {
        if (!g || g.level < 1) return;
        if (g.vital === undefined) g.vital = 60;
        if (!chairLed(g) && !d.attended[groupId(key, room)]) {
          const cu = curateFor(g.type);
          if (cu) {
            // 보좌 신부가 대신 들어가 강복을 준다 (주임 신부보다 조금 덜)
            g.vital = Math.min(100, g.vital + CURATE.vital + (sisterIn(g.type) ? 5 : 0));
            addRes('heart', CURATE.heart);
            lines.push(`✝️ ${cu.name} 보좌 신부님이 ${UNITS[g.type].name} 회의에 들어가 강복을 주셨어요.`);
          } else if (sisterIn(g.type)) {
            g.vital = Math.min(100, g.vital + Math.round(10 * sisterEffFor(g.type)));
            lines.push(`👩‍🦳 수녀님이 신부님 대신 ${UNITS[g.type].name} 회의에 들어가셨어요 (활력만 조금 · 신부님이 오시면 강복과 훈화로 더 좋아요).`);
          } else {
            g.vital = Math.max(0, g.vital - (hasPerk('elders3') ? 10 : 20));
            lines.push(`${UNITS[g.type].icon} ${UNITS[g.type].name} 회의에 신부님이 오지 않아 모임이 조금 식었어요.`);
          }
        }
        if (chairLed(g) && committeeUnlocked() && AGENDAS[g.type] && p.agenda.length < AGENDA_MAX && !p.agenda.some(a => a.key === key && a.room === room) && Math.random() < 0.35) {
          const list = AGENDAS[g.type];
          p.agenda.push({ key, room, type: g.type, idx: Math.floor(Math.random() * list.length), day: today, age: 0 });
          lines.push(`📨 ${UNITS[g.type].name} 위원장이 상임위원회에 건의사항을 올렸어요.`);
        }
      });
    }
    // 오래 미뤄 둔 건의사항은 실망으로 돌아온다
    for (const a of p.agenda) a.age = (a.age || 0) + 1;
    const stale = p.agenda.filter(a => a.age >= 3);
    for (const a of stale) {
      const g = p.sites[a.key] && p.sites[a.key].rooms[a.room];
      if (g) g.vital = Math.max(0, (g.vital || 60) - 10);
      p.res.heart = Math.max(0, p.res.heart - 1);
      lines.push(`😞 ${UNITS[a.type].name}의 건의가 오래 미뤄져 위원들이 실망했어요.`);
    }
    p.agenda = p.agenda.filter(a => a.age < 3);
    lines.push(...planNewDay(p));
    lines.push(...neglectPenalties(p, stale.length));
    for (const { g } of allGroups()) {
      if (!g.level) continue;
      if (g.type === 'school' && unitLevels('parentsK')) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + Math.round(3 * unitLevels('parentsK')));
      if (g.type === 'school2' && unitLevels('parentsY')) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + Math.round(3 * unitLevels('parentsY')) + (hasPerk('parentsY3') ? 2 : 0));
      if (g.type === 'elders' && unitLevels('senior')) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + Math.round(2 * unitLevels('senior')));
      if ((g.type === 'youth' || g.type === 'adults') && hasPerk('soccer3')) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + 3);
    }
    if (hasPerk('eucharist3')) for (const { g } of allGroups()) if (g.type === 'elders' && g.level) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + 3);
    installSisterAccessor(p);
    for (const sis of sisters().slice()) withSister(sis, () => { lines.push(...sisterDaily(p)); const over = sisterOverreachRoll(p); if (over) lines.push(over); });
    if (parishMod('decline') && Math.random() < 0.5) { const d = addRes('members', -parishMod('decline') * 2); if (d <= -1) lines.push(`🚌 젊은 교우 가족이 도시로 이사 갔어요 (신자 ${fmt(d)})`); }
    const tn = checkTransferNotice(p);
    if (tn) lines.push(tn);
    const qt = quitRoll(p);
    if (qt) lines.push(qt);
    const gr = grumbleRoll(p);
    if (gr) lines.push(gr);
    lines.push(...crewDaily());
    if (!p.event && massCount() < MASS_TIMES.length && p.res.members >= churchSeats() * MASSES.full && Math.random() < MASSES.chance) { p.event = 'massReq'; lines.push('🕰️ 주일미사에 자리가 모자라 교우들이 미사를 늘려 달라고 해요.'); }
    if (!p.event && p.fixed.church >= 3 && dirtCount() >= CLEAN.min && Math.random() < CLEAN.chance) { p.event = 'cleanReq'; lines.push('🧹 교우들이 성당 주변이 지저분하다며 신부님을 찾아왔어요.'); }
    if (!p.event && !p.decorWish && Math.random() < CLEAN.decorChance) { const w = decorWishable(); if (w.length) { p.decorReq = w[Math.floor(Math.random() * w.length)]; p.event = 'decorReq'; lines.push(`🌷 교우들이 ${josa(DECOR[p.decorReq].name, '을', '를')} 만들어 달라고 청했어요.`); } }
    // 교구의 외부 행사 동원 요청 (가끔)
    if (!p.event && p.fixed.church >= 2 && Math.random() < DIO_CALL_CHANCE) {
      p.dioCall = Math.floor(Math.random() * DIO_CALLS.length);
      p.event = 'dioCall';
      lines.push(`📨 교구에서 ${DIO_CALLS[p.dioCall].name}에 교우들을 보내 달라는 공문이 왔어요.`);
    }
  }
  // 관리장이 있으면 날마다 잡초·돌·어린나무를 하나씩 치운다
  if (d.day !== null && hasManager() && p.cleared && managerDiligent()) {
    const near = MAPS.solmoe.obstacles().filter(o => o.type !== 'house' && o.type !== 'tree' && !MAPS.solmoe.regionAt(o.x, o.y) && !jobFor(o.id));
    const ch = MAPS.solmoe.fixed[0];
    near.sort((a, b) => Math.hypot(a.x - ch.x, a.y - ch.y) - Math.hypot(b.x - ch.x, b.y - ch.y));
    const mg = crewOf('manager')[0], times = mg && crewLevel(mg) >= 4 ? 2 : 1;
    for (let t = 0; t < times; t++) {
      const left = near.filter(o => !p.cleared[o.id]);
      const pick = left.find(o => o.type === 'weed') || (Math.random() < 0.4 ? left[0] : null);
      if (pick) { finishClear(pick.id); lines.push(`🧰 관리장님이 성당 마당의 ${OBSTACLES[pick.type].name}${pick.type === 'weed' ? '를 뽑았어요' : '을 치웠어요'}.`); }
    }
    // 노련한 관리장(Lv7 이상)은 공사도 거든다
    const job = mg && crewLevel(mg) >= 7 && p.jobs.filter(j => j.kind !== 'clear')[0];
    if (job) { const now = Date.now(); job.until = now + Math.max(0, job.until - now) * 0.85; lines.push(`🧰 노련한 관리장님이 ${jobName(job)} 공사를 거들었어요 (남은 시간 −15%)`); }
  }
  // 시설관리팀: 봉사라서 가끔 나온다. 나오면 마당을 치우거나 공사를 거든다
  if (d.day !== null && unitLevels('facility') > 0 && Math.random() < facilityChance()) {
    const job = p.jobs.filter(j => j.kind !== 'clear').sort((a, b) => b.until - a.until)[0];
    if (job && Math.random() < 0.6) {
      const now = Date.now(), cut = hasPerk('facility3') ? 0.4 : 0.25;
      job.until = now + Math.max(0, job.until - now) * (1 - cut); job.start = Math.min(job.start, now - 1);
      lines.push(`🧰 시설관리팀장님이 봉사를 나와 ${jobName(job)} 공사를 거들었어요 (남은 시간 −${Math.round(cut * 100)}%)`);
    } else {
      const n = cleanUp(hasPerk('facility3') ? 3 : 2, ['weed', 'rock', 'sapling']);
      if (n) lines.push(`🧰 시설관리팀장님이 봉사를 나와 마당의 잡초·돌·나무 ${n}곳을 치웠어요`);
    }
  }
  // 치운 빈터에 가끔 잡초가 다시 자란다
  if (d.day !== null && p.cleared && !hasManager() && Math.random() < 0.5) {
    const cand = MAPS.solmoe.obstacleList().filter(o => o.type === 'weed' && p.cleared[o.id] && !(p.paths && p.paths[o.x + ',' + o.y]));
    const occupied = new Set(placedThings(p).flatMap(st => { const [w, h] = sizeOf(st.kind, st.rot); const a = []; for (let i = st.x; i < st.x + w; i++) for (let j = st.y; j < st.y + h; j++) a.push(i + ',' + j); return a; }));
    const pick = cand.filter(o => !occupied.has(o.x + ',' + o.y));
    if (pick.length) { delete p.cleared[pick[Math.floor(Math.random() * pick.length)].id]; lines.push('🌿 빈터 한쪽에 잡초가 다시 자랐어요.'); }
  }
  p.daily = { day: today, attended: {}, allDone: false, committee: false, acts: {} };
  return lines;
}

function gongsoLevels() {
  const p = Game.state.pastor;
  return p ? Object.values(p.sites).reduce((sum, x) => sum + (x.kind === 'gongso' && x.level ? effL(x.level) : 0), 0) : 0;
}

// 접속하지 않은 시간은 사흘까지만 계산한다. 건물마다 쌓이는 양에 한도가 있어서 그 전에 대개 가득 찬다
function idleCapHours() { return 72; }
// 살림비는 12시간어치까지만 빠진다 (오래 비우면 단체 활동도 멈춘다)
const UPKEEP_MAX_HOURS = 12;

// 같은 일을 하루에 여러 번 하면 행동력이 더 든다 (두 번까지는 그대로, 세 번째부터 +1, +2, +3). 효과는 늘 그대로
const REPEAT_EXTRA = [0, 0, 1, 2, 3];
function actionCount(id) { const d = Game.state.pastor.daily; return (d.acts && d.acts[id]) || 0; }
function repeatExtra(id) { return REPEAT_EXTRA[Math.min(actionCount(id), REPEAT_EXTRA.length - 1)]; }
// 이번에 드는 행동력 (주임 신부만 반복 가산)
function actionCost(a) { const s = Game.state; return a.cost + (s.phase === 'pastor' && s.pastor ? repeatExtra(a.id) : 0); }
function countAction(id) { const d = Game.state.pastor.daily; d.acts = d.acts || {}; d.acts[id] = (d.acts[id] || 0) + 1; }

// 본당 살림: 건물과 단체를 굴리는 데 드는 시간당 비용 (전기·난방·활동비)
const CHURCH_UPKEEP = [0, 0.5, 1, 2, 3, 4, 5.5, 7, 8.5, 10, 12];
const ROOM_UPKEEP = [0, 0.5, 0.75, 1, 1.5, 2, 2.75, 3.5, 4.25, 5, 6];
const groupUpkeep = L => (L ? 0.6 * Math.pow(effL(L), 1.5) : 0);
function parishUpkeep() {
  const p = Game.state.pastor;
  let sum = CHURCH_UPKEEP[p.fixed.church] + (p.fixed.rectory + (p.fixed.office || 0)) * 0.25;
  const parts = { building: sum, groups: 0 };
  for (const site of Object.values(p.sites)) {
    if (site.kind === 'gongso') { parts.building += site.level ? effL(site.level) : 0; continue; }
    if (!site.built) continue;
    parts.building += ROOM_UPKEEP[site.level || 1] * (site.floor ? FLOOR_COST : site.floors === 2 ? MERGE.upkeep : 1);
    for (const g of site.rooms) if (g && g.level) parts.groups += groupUpkeep(g.level) * budgetUpkeep(g.type);
  }
  parts.staff = staffWages();
  if (hasPerk('facility6')) parts.building *= 0.9;
  parts.total = (parts.building + parts.groups + parts.staff) * (hasChair('finance') ? 0.9 : 1) * dirMod('upkeep') * (1 - staffOfficeSave()) * (newbie() ? NEWBIE.upkeep + 0.25 : 1);
  return parts;
}

// 짓거나 올리면 늘어나는 시간당 살림
function upkeepDelta(kind, toLevel) {
  if (kind === 'group') return groupUpkeep(toLevel) - groupUpkeep(toLevel - 1);
  if (kind === 'container') return ROOM_UPKEEP[1] * (insideParish() ? FLOOR_COST : 1);
  if (kind === 'room') return ROOM_UPKEEP[toLevel] - ROOM_UPKEEP[toLevel - 1];
  if (kind === 'church') return CHURCH_UPKEEP[toLevel] - CHURCH_UPKEEP[toLevel - 1];
  if (kind === 'gongso') return effL(toLevel) - (toLevel > 1 ? effL(toLevel - 1) : 0);
  return 0.25;
}

// 상임위·사건의 비용은 본당 살림 규모에 맞춰 커진다 (기준: 시간당 봉헌 6만 원일 때의 값)
function scaledCost(base) {
  const gross = parishRates().gross;
  return Math.max(5, Math.round(base * Math.max(1, gross / 6) / 5) * 5);
}

// 건물마다 시간당 쌓이는 봉헌(💰)과 새 얼굴(👥)
// church: 성당 헌금함 (신자 × 마음, 입소문), 교리실: 방에 든 단체들, 공소
function sourceRates() {
  const s = Game.state, p = s.pastor, r = p.res;
  const sm = spiritMult(), mult = sm * (0.7 + r.heart / 100 * 0.6);
  const full = r.members >= churchSeats();
  const out = {
    // 새 얼굴: 평판, 입소문(신자 × 마음), 그리고 신부의 강론력·친화력
    church: { offering: r.members * (0.02 + r.heart / 100 * 0.07) * sm, members: full ? 0 : (r.reputation * 0.02 + r.members * r.heart / 100 * 0.002 + pastorPull()) * mult, level: p.fixed.church },
  };
  const nb = newbie();
  for (const [key, site] of Object.entries(p.sites)) {
    if (site.kind === 'gongso') {
      if (!site.level) continue;
      const e = effL(site.level);
      out[key] = { offering: 5 * e * sm, members: full ? 0 : 1.5 * e * mult, level: site.level };
      continue;
    }
    if (!site.built) continue;
    let o = 0, m = 0;
    for (const g of site.rooms) {
      if (!g || !g.level) continue;
      const e = effL(g.level) * vitalMult(g);
      o += ({ district: 8, adults: 4, shop: 6, relics: 5, cafe: 7, golf: 5 }[g.type] * e || 0) * (g.type === 'shop' ? shopIncomeMult() : 1) + (g.type === 'district' ? smallComStats().ban * SMALLCOM.banOffering : 0);
      m += { parentsK: hasPerk('parentsK3') ? 0.2 : 0, legio: 1, school: 0.8, school2: 0.6, youth: 0.5, cafe: 0.3, soccer: 0.4 }[g.type] * e || 0;
    }
    if (o || m) out[key] = { offering: o * sm, members: full ? 0 : m * mult, level: site.level || 1 };
  }
  if (hasPerk('legio3') && !full) out.church.members += 0.5 * mult;
  if (hasPerk('school3')) out.church.members *= 1.2;
  if (hasChair('youthDiv')) out.church.members *= 1.1;
  if (hasChair('smallCom')) for (const v of Object.values(out)) v.offering *= 1.05;
  if (hasPerk('district3')) for (const v of Object.values(out)) v.offering *= 1.1;
  if (nb) for (const v of Object.values(out)) { v.offering *= NEWBIE.offering; v.members *= NEWBIE.members; }
  { const fp = firstParish(); if (fp) for (const v of Object.values(out)) { v.offering *= fp.offering; v.members *= fp.members; } }
  // 본당 성격 (도심은 봉헌이 많고, 어촌은 사람이 덜 느는 식)
  const mo = parishMod('offering') * dirMod('offering') * OFFERING_BOOST, mm = parishMod('members') * dirMod('members');
  if (mo !== 1 || mm !== 1) for (const v of Object.values(out)) { v.offering *= mo; v.members *= mm; }
  return out;
}

// 기분 좋은 우연 (확률을 미리 보여 주지 않는다)
const LUCK = { carpenter: 0.1, giftOnCollect: 0.06, volunteerAtMeeting: 0.15 };

// 신부의 강론력과 친화력이 새 신자를 끌어온다 (시간당)
function pastorPull() { const st = Game.state.stats; return (st.homily + st.rapport) * 0.005; }

function stashOf(id) { const p = Game.state.pastor; return p.stash[id] || (p.stash[id] = { offering: 0, members: 0 }); }
function stashCap(rate) { return { offering: rate.offering * stashHours(rate.level), members: rate.members * stashHours(rate.level) }; }

// 거둘 것이 있는 건물들 [{ id, offering, members, full }]
function stashList() {
  const rates = sourceRates();
  return Object.entries(Game.state.pastor.stash).map(([id, st]) => {
    const rt = rates[id], cap = rt ? stashCap(rt) : st;
    const full = rt && ((cap.offering > 0 && st.offering >= cap.offering - 0.01) || (cap.members > 0 && st.members >= cap.members - 0.01));
    return { id, offering: st.offering, members: st.members, full };
  }).filter(x => x.offering >= 1 || x.members >= 1);
}

// 한 건물에 쌓인 것을 거둔다. 금고·좌석이 차면 남은 것은 그대로 둔다
function collectStash(id) {
  const p = Game.state.pastor, st = p.stash[id];
  if (!st) return null;
  const o = Math.floor(st.offering), m = Math.floor(st.members);
  const go = o > 0 ? addRes('offering', o) : 0, gm = m > 0 ? addRes('members', m) : 0;
  st.offering -= go; st.members -= gm;
  p.weekIncome = (p.weekIncome || 0) + go;
  // 가끔 익명의 봉헌 봉투가 함께 들어 있다
  let gift = 0;
  if (go >= 5 && Math.random() < LUCK.giftOnCollect) { gift = addRes('offering', Math.max(10, go * 2)); p.weekIncome += gift; }
  return { offering: Math.round(go), members: Math.round(gm), gift: Math.round(gift), vaultFull: o > 0 && go < o, seatsFull: m > 0 && gm < m };
}

function collectAll() {
  const sum = { offering: 0, members: 0, vaultFull: false, seatsFull: false };
  for (const x of stashList()) {
    const r = collectStash(x.id);
    if (!r) continue;
    sum.offering += r.offering; sum.members += r.members; sum.gift = (sum.gift || 0) + (r.gift || 0);
    sum.vaultFull = sum.vaultFull || r.vaultFull; sum.seatsFull = sum.seatsFull || r.seatsFull;
  }
  return sum;
}

// 시간당 생산량과 마음·평판이 향해 가는 목표값
function parishRates() {
  const s = Game.state, r = s.pastor.res;
  const L = unitLevels, G = gongsoLevels();
  const mult = spiritMult() * (0.7 + r.heart / 100 * 0.6);
  const seats = churchSeats();
  // 건물마다 쌓이는 양을 모두 더한 것 (적응 기간 배율 포함)
  const src = Object.values(sourceRates());
  const members = src.reduce((a, v) => a + v.members, 0);
  const gross = src.reduce((a, v) => a + v.offering, 0);
  const upkeep = parishUpkeep().total;
  return {
    mult, seats, members, gross, upkeep, vault: vaultCap(),
    offering: gross - upkeep,
    heartT: clamp(25 + staffFaithBonus() + parishMod('heart') + dirMod('heart') + decorBonus('heart') - Math.max(0, L('golf') - 3) + unitLevels('eucharist') + smallComStats().gu * SMALLCOM.guHeart + (hasPerk('elders6') ? 5 : 0) + (hasPerk('school6') ? 3 : 0) + (hasChair('youthBoard') ? 3 : 0) + L('flower') * 2 + shopHeart() + L('prayer') * 3 + L('relics') + L('legio') * 3 + L('choir') * 6 + L('elders') * 5 + L('council') * 5 + s.stats.homily * 0.15 + s.stats.rapport * 0.1, 0, 95),
    repT: clamp(15 + dirMod('rep') + decorBonus('rep') + L('senior') * 2 + (hasPerk('server3') ? 3 : 0) + (hasPerk('vincent3') ? 5 : 0) + (hasChair('laity') ? 5 : 0) + L('vincent') * 8 + G * 3 + L('elders') * 2 + L('legio'), 0, 95),
  };
}

function drift(v, target, step) {
  if (Math.abs(target - v) <= step) return target;
  return v + Math.sign(target - v) * step;
}

// 지난 갱신 뒤로 흐른 시간만큼 본당을 굴린다. 끝난 공사와 생산량을 돌려준다.
function tickParish(now = Date.now()) {
  const p = Game.state.pastor;
  const out = { hours: 0, done: [], gained: {} };
  if (!p) return out;
  for (const j of p.jobs.filter(j => now >= j.until)) out.done.push(finishJob(j));
  out.dayLines = p_newDay(p);
  out.dayLines.push(...autoSundays(now));
  out.quests = questTick(now);
  const hours = Math.min(idleCapHours(), Math.max(0, now - p.lastTick) / 3600000 * paceScale());
  p.lastTick = now;
  out.applicants = hiringTick(hours);
  blessTick(now, hours, out.dayLines);
  if (hours <= 0) return out;
  const rt = parishRates();
  const r = p.res;
  const before = { ...r };
  // 봉헌과 새 얼굴은 건물마다 쌓인다 (눌러서 거둔다). 담을 수 있는 양까지만
  const stashBefore = stashList().reduce((a, x) => ({ offering: a.offering + x.offering, members: a.members + x.members }), { offering: 0, members: 0 });
  let overflow = 0;
  for (const [id, rate] of Object.entries(sourceRates())) {
    const st = stashOf(id), cap = stashCap(rate), o0 = st.offering;
    st.offering = Math.min(Math.max(st.offering, cap.offering), st.offering + rate.offering * hours);
    overflow += Math.max(0, rate.offering * hours - (st.offering - o0));
    st.members = Math.min(Math.max(st.members, cap.members), st.members + rate.members * hours);
  }
  // 말풍선이 꽉 차 넘치는 봉헌은 사무실 직원이 대신 거둬 금고에 넣는다 (v0.92, 직접 거두는 것보다 덜). 가만히 있어도 흑자면 돈이 줄지 않게
  if (overflow > 0) {
    // 오래 비우면 살림비처럼 12시간어치까지만 (사무실도 그만큼만 일한다)
    const dep = Math.max(0, Math.min(overflow * Math.min(1, UPKEEP_MAX_HOURS / hours) * autoCollectRate(), vaultCap() - r.offering));
    if (dep > 0) { r.offering += dep; bookIncome(null, 'autoCollect', dep); }
  }
  // 예비신자: 교리반 자리만큼 모인다
  addCatechumens(cateInflow() * hours);
  // 살림비는 금고에서 빠진다
  const upH = Math.min(hours, UPKEEP_MAX_HOURS);
  r.offering -= rt.upkeep * upH;
  { const parts = parishUpkeep(), f = hasChair('finance') ? 0.9 : 1;
    for (const { g } of allGroups()) if (g.level) book(g.type, 'upkeep', groupUpkeep(g.level) * budgetUpkeep(g.type) * f * upH);
    book(null, 'staff', parts.staff * f * upH); book(null, 'building', parts.building * f * upH); }
  // 살림이 바닥나면 단체 활동비가 모자라 활력이 떨어진다
  if (r.offering < 0) {
    const shortH = Math.min(upH, -r.offering / Math.max(0.1, rt.upkeep));
    r.offering = 0;
    for (const { g } of allGroups()) if (g.level) g.vital = Math.max(0, (g.vital === undefined ? 60 : g.vital) - shortH * 3);
    if (shortH >= 0.5) { out.broke = shortH; out.dayLines.push('💸 본당 살림이 바닥나 단체 활동비가 모자랐어요. 단체 활력이 떨어졌어요.'); }
  }
  r.heart = drift(r.heart, rt.heartT, (r.heart > rt.heartT ? (hasPerk('legio6') ? 0.75 : 1.5) : 1) * hours);
  r.reputation = drift(r.reputation, rt.repT, 0.5 * hours);
  for (const k of Object.keys(r)) out.gained[k] = r[k] - before[k];
  const stashAfter = stashList().reduce((a, x) => ({ offering: a.offering + x.offering, members: a.members + x.members }), { offering: 0, members: 0 });
  out.stashed = { offering: stashAfter.offering - stashBefore.offering, members: stashAfter.members - stashBefore.members };
  out.hours = hours;
  return out;
}

// 접속하지 않은 동안의 요약
function pastorIdleSummary(t) {
  if (t.hours < 0.25) return t.dayLines && t.dayLines.length ? ['새 날이 밝았습니다.', ...t.dayLines] : [];
  const g = t.gained;
  const lines = [`접속하지 않은 ${t.hours.toFixed(1)}시간 동안:`];
  const st = t.stashed || { offering: 0, members: 0 };
  if (st.offering >= 1) lines.push(`💰 헌금함과 단체에 봉헌 ${Math.round(st.offering)}만 원이 쌓였어요. 건물 위 말풍선을 눌러 거두세요.`);
  if (st.members >= 1) lines.push(`👥 새 얼굴 ${Math.floor(st.members)}명이 신부님을 기다려요.`);
  if (g.offering <= -1) lines.push(`🧾 본당 살림비로 ${Math.round(-g.offering)}만 원이 나갔어요.`);
  if (stashList().some(x => x.full)) lines.push('⚠️ 가득 차서 더 쌓이지 않는 건물이 있어요.');
  if (unitLevels('legio')) lines.push('📿 레지오 단원들이 냉담 교우 가정을 찾아갔습니다.');
  if (unitLevels('choir')) lines.push('🎼 성가대가 주일미사 성가를 연습했습니다.');
  for (const d of t.done) lines.push(`🏗️ ${d}`);
  for (const d of t.dayLines || []) lines.push(d);
  return lines;
}

// ---------- 짓기·만들기·업그레이드 ----------

// 단체·사제관 레벨 상한 = 성당 레벨 + 1
function maxLevel() { return Game.state.pastor.fixed.church + 1; }

// 청년회가 공사를 거든다
function buildSpeed() { return Math.max(0.6, 1 + 0.15 * unitLevels('youth') + (Game.state.pastor ? staffSkillBonus() : 0)); }

// 공사 종류별 비용 { offering, minutes }
// 적응 기간: 성당 Lv3까지는 공사가 빠르고 싸며, 새 얼굴이 더 많이 찾아온다 (처음 게임에 익숙해지도록)
const NEWBIE = { maxChurch: 3, time: 0.25, cost: 0.55, members: 3, offering: 2.2, upkeep: 0.5 };
// 첫 본당 (v0.92 사용자 요청): 적응 기간이 끝나도 첫 발령까지는 조금 더 빠르게. 게임을 익히는 동안 속도감 있게
const FIRST_PARISH = { time: 0.5, cost: 0.65, offering: 3, members: 3.5 };  // v1.07: 퀘스트를 깨기에 신자·돈이 모자라 더 늘림 (v1.05: 0.8·1.8·2)
function firstParish() { const p = Game.state.pastor; return !!p && !(p.career && p.career.length) && !newbie() ? FIRST_PARISH : null; }
function newbie() { const p = Game.state.pastor; return !!p && !(p.career && p.career.length) && p.fixed.church <= NEWBIE.maxChurch; }

function jobCost(kind, key, type, toLevel) {
  const c = baseJobCost(kind, key, type, toLevel);
  const fp = c && firstParish();
  if (fp) return { offering: Math.max(1, Math.round(c.offering * fp.cost)), minutes: c.minutes * fp.time };
  return c && newbie() ? { offering: Math.max(1, Math.round(c.offering * NEWBIE.cost)), minutes: c.minutes * NEWBIE.time } : c;
}

function baseJobCost(kind, key, type, toLevel) {
  if (kind === 'clear') { const ob = obstacleById(key), o = OBSTACLES[ob.type]; const disc = ob.type === 'house' && !ob.believer && hasPerk('vincent6') ? 0.8 : 1; return { offering: Math.round((ob.cost || o.cost || 0) * disc), minutes: o.min || 0 }; }
  if (kind === 'container') { const c = CONTAINERS[containerCount()]; return c && { offering: c.cost, minutes: c.min }; }
  if (kind === 'room') { const r = ROOM_LEVELS[toLevel], st = Game.state.pastor.sites[key], k = !st ? 1 : st.floor ? FLOOR_COST : st.floors === 2 ? MERGE.roomCost : 1; return { offering: Math.round(r.cost * k), minutes: r.min * k }; }
  if (kind === 'group') { const u = UNITS[type]; return { offering: Math.round(u.cost * Math.pow(1.52, toLevel - 1)), minutes: u.min * Math.pow(1.48, toLevel - 1) }; }
  if (kind === 'gongso') return { offering: Math.round(GONGSO.cost * Math.pow(1.52, toLevel - 1)), minutes: GONGSO.min * Math.pow(1.48, toLevel - 1) };
  if (key === 'church') { const c = CHURCH_LEVELS[toLevel]; return { offering: c.cost, minutes: c.min }; }
  const f = FIXED[key];
  return { offering: Math.round(f.cost(toLevel)), minutes: f.min(toLevel) };
}

function jobMinutes(cost) { return cost.minutes / buildSpeed() * (hasPerk('youth6') ? 0.85 : 1); }

// 성당 증축 조건 목록: 신자 수와 다른 건물들의 레벨
function churchNeeds(toLevel) {
  const c = CHURCH_LEVELS[toLevel];
  const p = Game.state.pastor;
  return Object.entries(c.need).map(([k, want]) => {
    if (k === 'members') return { label: '신자', have: Math.floor(p.res.members), want, ok: p.res.members >= want };
    if (k === 'rectory') return { label: '사제관 레벨', have: p.fixed.rectory, want, ok: p.fixed.rectory >= want };
    if (k === 'groups') { const [cnt, lvl] = want, n = allGroups().filter(x => x.g.level >= lvl).length; return { label: `단체 Lv${lvl} 이상`, have: n, want: cnt, ok: n >= cnt }; }
    if (k === 'office') return { label: '사무실 레벨', have: p.fixed.office || 1, want, ok: (p.fixed.office || 1) >= want };
    if (k === 'gongso') { const n = Object.values(p.sites).filter(x => x.kind === 'gongso' && x.level > 0).length; return { label: '공소', have: n, want, ok: n >= want }; }
    const [count, lvl] = want;
    const n = containers().filter(([, x]) => x.built && (x.level || 1) >= lvl).reduce((a, [, x]) => a + siteUnits(x), 0);
    return { label: lvl > 1 ? `교리실 Lv${lvl} 이상` : '교리실', have: n, want: count, ok: n >= count };
  });
}

function roomLevel(key) { const c = Game.state.pastor.sites[key]; return c && c.built ? (c.level || 1) : 0; }

// 다음 컨테이너 조건
function containerNeed() {
  const c = CONTAINERS[containerCount()];
  return c ? { ...c, ok: Game.state.pastor.res.members >= c.members } : null;
}

// 공사를 시작할 수 없는 이유 (없으면 null)
function jobBlocker(kind, key, type, toLevel) {
  const p = Game.state.pastor;
  if (kind === 'fixed' && key === 'church') {
    const c = CHURCH_LEVELS[toLevel];
    if (!c) return '최고 레벨이에요';
    if (c.locked) return c.locked;
    if (churchNeeds(toLevel).some(n => !n.ok)) return '조건을 먼저 채워야 해요';
    if (p.levyDue > 0) return `교구 공납금 ${Math.ceil(p.levyDue)}만 원을 먼저 내야 증축 허가가 나와요`;
  } else if (kind === 'container') {
    const need = containerNeed();
    if (!need) return insideParish() ? `${FLOOR_MAX}층까지 다 올렸어요` : '더 놓을 수 없어요';
    if (!need.ok) return `신자 ${need.members}명이 되어야 놓을 수 있어요`;
  } else if (kind === 'group' && toLevel === 1) {
    const lock = unitLockText(type);
    if (lock) return lock;
    if (UNITS[type].members > p.res.members) return `신자 ${UNITS[type].members}명부터 만들 수 있어요`;
    if (allGroups().some(x => x.g.type === type)) return '이미 있는 단체예요';
  } else if (kind === 'group') {
    if (toLevel > roomLevel(key)) return `교리실을 Lv${toLevel}로 고쳐야 해요`;
  } else if (kind === 'room' && !ROOM_LEVELS[toLevel]) {
    return '최고 레벨이에요';
  } else if (toLevel > maxLevel()) {
    return `성당 Lv${toLevel - 1} 이상이 필요해요`;
  }
  if (jobFor(key)) return '이 건물은 공사 중이에요';
  const need = jobWorkers(kind, key, toLevel), idle = idleWorkers();
  if (need > idle) return need > p.teams ? `일꾼 ${need}명이 필요해요 (지금 ${p.teams}명) · 일꾼을 더 부르세요` : idle ? `일꾼 ${need}명이 필요해요 (쉬는 일꾼 ${idle}명)` : `일꾼 ${p.teams}명이 모두 일하고 있어요`;
  const cost = jobCost(kind, key, type, toLevel);
  if (cost.offering > vaultCap()) return `금고 한도(${vaultCap()})보다 비싸요 · 본당 사무실을 키우세요`;
  if (p.res.offering < cost.offering) return `봉헌금 ${cost.offering}만 원이 필요해요`;
  return null;
}

// 지을 수 없을 때 모자란 것을 모두 모아 보여 준다 (jobBlocker는 첫 번째 이유만)
// ---------- 물품판매 ----------
function shopState() { const p = Game.state.pastor; if (!p.shop) p.shop = { item: 'farm', markup: 0.3 }; return p.shop; }
function shopMarkup(rate) { return SHOP_MARKUPS.find(m => m.rate === rate) || SHOP_MARKUPS[2]; }
// 수익 배수: 이윤 × 팔리는 양 (이윤이 클수록 덜 팔림). '적당히(30%)' 농산물이면 1배
function shopIncomeMult(item, rate) {
  const st = shopState(); item = SHOP_ITEMS[item || st.item] || SHOP_ITEMS.farm; rate = rate === undefined ? st.markup : rate;
  const feast = item.feast && Game.state.pastor.week !== undefined && liturgyNow().feast ? item.feast : 1;
  return item.demand * feast * rate * (1.15 - rate * 0.6) / 0.291;
}
// 교우 마음 목표에 주는 변화 (물품판매 단체가 있을 때만)
function shopHeart(item, rate) {
  if (!allGroups().some(x => x.g.type === 'shop' && x.g.level >= 1)) return 0;
  const st = shopState(); item = SHOP_ITEMS[item || st.item] || SHOP_ITEMS.farm; rate = rate === undefined ? st.markup : rate;
  const m = shopMarkup(rate).heart;
  return item.heart + (m < 0 ? m * item.sens : m);
}

function jobMissing(kind, key, type, toLevel) {
  const p = Game.state.pastor, out = [];
  if (kind === 'fixed' && key === 'church') {
    for (const n of churchNeeds(toLevel)) if (!n.ok) out.push(`${n.label} ${n.have}/${n.want}`);
    if (p.levyDue > 0) out.push(`밀린 공납금 ${Math.ceil(p.levyDue)}만 원`);
  } else if (kind === 'container') {
    const need = containerNeed();
    if (need && !need.ok) out.push(`👥 신자 ${Math.floor(p.res.members)}/${need.members}`);
  } else if (kind === 'group' && toLevel === 1) {
    for (const n of unitUnlockNeeds(type)) if (!n.ok) out.push(n.prereq ? `🔒 ${n.label}` : `🔒 ${n.label} (지금 Lv${n.have})`);
    if (UNITS[type].members > p.res.members) out.push(`👥 신자 ${Math.floor(p.res.members)}/${UNITS[type].members}`);
  } else if (kind === 'group') {
    if (toLevel > roomLevel(key)) out.push(`🚪 교리실 Lv${roomLevel(key)}/${toLevel}`);
  } else if (kind !== 'room' && kind !== 'clear' && toLevel > maxLevel()) out.push(`⛪ 성당 Lv${p.fixed.church}/${toLevel - 1}`);
  const need = jobWorkers(kind, key, toLevel), idle = idleWorkers();
  if (need > idle) out.push(need > p.teams ? `👷 일꾼 ${p.teams}/${need}명 (더 모셔야 해요)` : `👷 쉬는 일꾼 ${idle}/${need}명`);
  const cost = jobCost(kind, key, type, toLevel);
  if (cost.offering > vaultCap()) out.push(`🏦 금고 한도 ${vaultCap()}/${cost.offering} (사무실 키우기)`);
  else if (p.res.offering < cost.offering) out.push(`💰 봉헌금 ${Math.floor(p.res.offering)}/${cost.offering}`);
  return out;
}
// 화면에 보일 막힘 글: 모자란 것이 있으면 모두, 아니면 jobBlocker 글 그대로
function blockText(kind, key, type, toLevel) {
  const b = jobBlocker(kind, key, type, toLevel);
  if (!b) return null;
  if (/최고 레벨|공사 중|이미 있는|더 놓을 수/.test(b)) return b;
  const miss = jobMissing(kind, key, type, toLevel);
  return miss.length ? `모자라요: ${miss.join(' · ')}` : b;
}

// ---------- 교리실 두 채를 합쳐 2층으로 ----------
// 벽돌 교리실(Lv5) 이상인 두 채를 하나로: 한 채 자리에 방 4개짜리 2층 건물, 다른 자리는 빈터가 된다
// 레벨은 둘 중 낮은 쪽, 살림은 두 채의 80%, 이후 고치기는 1.6배
const MERGE = { minLevel: 5, cost: 1.5, minutes: 1.5, workers: 2, upkeep: 1.6, roomCost: 1.6 };
function mergeCandidates(key) {
  return containers().filter(([k, x]) => k !== key && x.built && x.floors !== 2 && (x.level || 1) >= MERGE.minLevel && !jobFor(k)).map(([k]) => k);
}
function mergeCost(key, from) {
  const p = Game.state.pastor, lv = Math.min(p.sites[key].level || 1, p.sites[from].level || 1), r = ROOM_LEVELS[lv];
  return { offering: Math.round(r.cost * MERGE.cost), minutes: r.min * MERGE.minutes, level: lv };
}
function mergeBlocker(key, from) {
  const p = Game.state.pastor, a = p.sites[key], b = from && p.sites[from], miss = [];
  if (!a || a.floors === 2) return '이미 2층 교리실이에요';
  if ((a.level || 1) < MERGE.minLevel) return `벽돌 교리실(Lv${MERGE.minLevel})부터 2층으로 합칠 수 있어요`;
  if (jobFor(key)) return '이 교리실은 공사 중이에요';
  if (!b) return mergeCandidates(key).length ? null : `함께 합칠 Lv${MERGE.minLevel} 이상 교리실이 하나 더 있어야 해요`;
  const c = mergeCost(key, from);
  if (MERGE.workers > idleWorkers()) miss.push(`👷 쉬는 일꾼 ${idleWorkers()}/${MERGE.workers}명`);
  if (c.offering > vaultCap()) miss.push(`🏦 금고 한도 ${vaultCap()}/${c.offering}`);
  else if (p.res.offering < c.offering) miss.push(`💰 봉헌금 ${Math.floor(p.res.offering)}/${c.offering}`);
  return miss.length ? `모자라요: ${miss.join(' · ')}` : null;
}
function startMerge(key, from) {
  const p = Game.state.pastor;
  if (!from || mergeBlocker(key, from)) return false;
  const c = mergeCost(key, from), now = Date.now();
  p.res.offering -= c.offering;
  book(null, 'building', c.offering);
  p.jobs.push({ kind: 'merge', key, from, toLevel: c.level, workers: MERGE.workers, start: now, until: now + jobMinutes(c) * 60000 / paceScale() });
  addLog(`🏢 ${siteName(key)}번과 ${containerIndex(from)}번을 합쳐 2층으로 올리기 시작`);
  return true;
}
// 공사가 끝나면: 옮겨 갈 교리실의 단체와 쌓인 것을 2층으로 모으고, 그 자리는 빈터가 된다
function finishMerge(j) {
  const p = Game.state.pastor, a = p.sites[j.key], b = p.sites[j.from];
  if (!a || !b) return '교리실 합치기를 마쳤어요';
  const ia = containerIndex(j.key), ib = containerIndex(j.from);
  a.rooms = a.rooms.concat(b.rooms);
  growRooms(a);
  a.floors = 2;
  a.level = j.toLevel;
  const sa = p.stash && p.stash[j.key], sb = p.stash && p.stash[j.from];
  if (sb) { if (sa) { sa.offering += sb.offering; sa.members += sb.members; } else p.stash[j.key] = sb; delete p.stash[j.from]; }
  delete p.sites[j.from];
  return `🏢 교리실 ${ia}번과 ${ib}번이 합쳐져 방 ${a.rooms.length}개짜리 2층 교리실이 되었어요! 한 자리가 빈터로 비었어요.`;
}

function jobName(j) {
  if (j.kind === 'clear') { const ob = obstacleById(j.key), o = OBSTACLES[ob.type]; return ob.type === 'house' ? `${ob.owner} 댁 땅 정리` : `${o.name} ${o.verb}`; }
  if (j.kind === 'container') { const st = Game.state.pastor.sites[j.key]; return st && st.floor ? `${st.floor}층 증축` : `${siteName(j.key, true)}`; }
  if (j.kind === 'room') return `${siteName(j.key)} → Lv${j.toLevel}`;
  if (j.kind === 'merge') return `${siteName(j.key)}·${containerIndex(j.from)} 2층으로 합치기`;
  if (j.kind === 'group') return UNITS[j.type].name;
  if (j.kind === 'gongso') return GONGSO.name;
  return j.key === 'church' ? '성당 증축' : FIXED[j.key].name;
}

// 컨테이너 번호 (놓은 순서)
function containerIndex(key) { return containers().findIndex(([k]) => k === key) + 1; }

// room: 단체를 만들 방 번호 (group일 때)
function startJob(kind, key, type, toLevel, room, slot) {
  const p = Game.state.pastor;
  if (jobBlocker(kind, key, type, toLevel)) return false;
  const cost = jobCost(kind, key, type, toLevel);
  p.res.offering -= cost.offering;
  const now = Date.now();
  if (kind === 'container') {
    const fl = insideParish() ? containers().length + 1 : 0;
    p.sites[key] = fl ? { kind: 'container', built: false, level: 1, floor: fl, rooms: new Array(FLOOR_ROOMS).fill(null) } : { kind: 'container', built: false, level: 1, rooms: new Array(CONTAINER_ROOMS).fill(null) };
    if (p.guide) p.guide.container = true;
  }
  if (kind === 'group' && toLevel === 1) {
    p.sites[key].rooms[room] = { type, level: 0, vital: 60, slot: slot || UNITS[type].slot };
    if (p.guide) p.guide.group = true;
  }
  if (kind === 'group' && toLevel > 1) room = p.sites[key].rooms.findIndex(g => g && g.type === type);
  if (kind === 'gongso') p.sites[key] = p.sites[key] || { kind: 'gongso', level: 0 };
  const job = { kind, key, room, type, toLevel, workers: jobWorkers(kind, key, toLevel), start: now, until: now + jobMinutes(cost) * 60000 / paceScale() };
  // 가끔 솜씨 좋은 교우가 거들어 공사가 절반으로 줄어든다
  if (Math.random() < LUCK.carpenter) {
    job.until = now + (job.until - now) / 2;
    job.lucky = true;
    if (typeof toast === 'function') setTimeout(() => toast('🍀 목수 일을 하던 교우가 거들겠다고 나섰어요! 공사 시간이 절반으로 줄었어요'), 600);
  }
  p.jobs.push(job);
  addLog(`🏗️ ${jobName(job)} ${toLevel <= 1 ? '시작' : `Lv${toLevel} 공사 시작`}`);
  return true;
}

// 레벨을 올리면 무엇이 달라지나: [{ label, now, next }] (지금 → 올린 뒤)
const FIXED_LOOK_NAME = [null, '컨테이너', '조립식 가건물', '번듯한 집', '2층 건물', '벽돌 2층 건물'];
function upgradeCompare(kind, key, type, toLevel) {
  const p = Game.state.pastor, from = toLevel - 1, rows = [];
  // good: 좋아지는 변화인지 (숫자는 커지면 좋음, lowerIsBetter면 작아지면 좋음)
  const row = (label, now, next, lowerIsBetter = false) => {
    if (String(now) === String(next)) return;
    const a = parseFloat(String(now).replace(/[^0-9.\-]/g, '')), b = parseFloat(String(next).replace(/[^0-9.\-]/g, ''));
    const good = isNaN(a) || isNaN(b) ? !lowerIsBetter : (lowerIsBetter ? b < a : b > a);
    rows.push({ label, now, next, good });
  };
  const upk = (a, b) => row('살림 (시간당)', a.toFixed(1), b.toFixed(1), true);
  if (kind === 'fixed' && key === 'church') {
    const a = CHURCH_LEVELS[from], b = CHURCH_LEVELS[toLevel];
    row('👥 좌석 (신자 한도)', a.seats, b.seats);
    row('🏗️ 다른 건물 최고 레벨', `Lv${from + 1}`, `Lv${toLevel + 1}`);
    row('⛪ 모습', a.name, b.name);
    row('🏛️ 공납금 비율', `${Math.round((LEVY_RATE[from] || 0.2) * 100)}%`, `${Math.round((LEVY_RATE[toLevel] || 0.2) * 100)}%`, true);
    row('🤝 교구 지원금 (주일)', DIOCESE_GRANT[from] || 0, DIOCESE_GRANT[toLevel] || 0);
    if (from <= NEWBIE.maxChurch && toLevel > NEWBIE.maxChurch) row('🌱 적응 기간', '있음', '끝남', true);
    upk(CHURCH_UPKEEP[from], CHURCH_UPKEEP[toLevel]);
  } else if (kind === 'fixed' && key === 'rectory') {
    row('⚡ 행동력 최대', rectoryEnergy(from), rectoryEnergy(toLevel));
    row('🏠 모습', FIXED_LOOK_NAME[Math.min(5, Math.ceil(from / 2))], FIXED_LOOK_NAME[Math.min(5, Math.ceil(toLevel / 2))]);
    if (toLevel % 2 === 0) row('🌷 꾸밈', '없음', '화분');
    upk(from * 0.25, toLevel * 0.25);
  } else if (kind === 'fixed' && key === 'office') {
    row('💰 금고 한도', VAULT[from], VAULT[toLevel]);
    row('🏢 모습', FIXED_LOOK_NAME[Math.min(5, Math.ceil(from / 2))], FIXED_LOOK_NAME[Math.min(5, Math.ceil(toLevel / 2))]);
    if (toLevel % 2 === 0) row('🌷 꾸밈', '없음', '화분·간판');
    upk(from * 0.25, toLevel * 0.25);
  } else if (kind === 'room') {
    row('🚪 방의 단체 최고 레벨', `Lv${from}`, `Lv${toLevel}`);
    row('🏫 모습', ROOM_LEVELS[from].name, ROOM_LEVELS[toLevel].name);
    { const st = p.sites[key], fl = st && st.floors; row('🚪 방 수', `${Math.max(st ? st.rooms.length : 0, roomsFor(from, fl))}개`, `${Math.max(st ? st.rooms.length : 0, roomsFor(toLevel, fl))}개`); }
    row('🧺 쌓아 둘 수 있는 시간', `${Math.round(stashHours(from))}시간`, `${Math.round(stashHours(toLevel))}시간`);
    upk(ROOM_UPKEEP[from], ROOM_UPKEEP[toLevel]);
  } else if (kind === 'group') {
    const u = UNITS[type];
    row(`${u.icon} 효과`, u.prod(effL(from)), u.prod(effL(toLevel)));
    if (toLevel === CHAIR_LEVEL) row('👔 회의', '신부님이 직접', '위원장이 이끎');
    for (const k of UNIT_PERKS[type] || []) if (k.lv === toLevel) row('✨ 새 능력', '없음', k.text);
    upk(groupUpkeep(from), groupUpkeep(toLevel));
  } else if (kind === 'gongso') {
    row('✝️ 효과', GONGSO.prod(effL(from)), GONGSO.prod(effL(toLevel)));
    row('🧺 쌓아 둘 수 있는 시간', `${Math.round(stashHours(from))}시간`, `${Math.round(stashHours(toLevel))}시간`);
  }
  // 성당·사무실·사제관을 올리면 새로 열리는 단체
  if (kind === 'fixed') {
    const opened = Object.keys(UNIT_UNLOCK).filter(t => { const u = UNIT_UNLOCK[t]; if (u[key] !== toLevel) return false; return Object.entries(u).every(([k, v]) => (k === key ? toLevel : (p.fixed[k] || 1)) >= v); });
    if (opened.length) rows.push({ label: '🌳 새로 열리는 단체', now: '—', next: opened.map(t => `${UNITS[t].icon}${UNITS[t].name}`).join(', '), good: true });
  }
  return rows;
}

// 큰 공사일수록 일꾼이 여럿 필요하다: 성당 Lv4~6 2명, Lv7~ 3명, 사제관·사무실·교리실 Lv6~ 2명, 땅 산 집 정리 2명
function jobWorkers(kind, key, toLevel) {
  if (kind === 'fixed' && key === 'church') return toLevel >= 7 ? 3 : toLevel >= 4 ? 2 : 1;
  if ((kind === 'fixed' || kind === 'room') && toLevel >= 6) return 2;
  if (kind === 'clear' && obstacleById(key) && obstacleById(key).type === 'house') return 2;
  return 1;
}
function busyWorkers() { return Game.state.pastor.jobs.reduce((a, j) => a + (j.workers || 1), 0); }
function idleWorkers() { const p = Game.state.pastor; return Math.max(0, p.teams - busyWorkers()); }

// 지금 바로 올릴 수 있는 공사 (건물 위 ⬆ 표시). 조건·봉헌금·쉬는 공사 팀이 모두 맞아야 한다
// 막는 이유가 일꾼뿐이면 false (⬆를 회색으로 보여 주고, 누르면 일꾼이 모자라다고 알려 준다)
function blockedNotByWorkers(kind, key, type, toLevel) {
  const b = jobBlocker(kind, key, type, toLevel);
  return !!b && !b.startsWith('일꾼');
}

function upgradeFor(id) {
  const u = upgradeForRaw(id);
  if (!u) return null;
  u.workers = jobWorkers(u.kind, u.key, u.toLevel);
  u.waiting = u.workers > idleWorkers();
  return u;
}

// 이 건물을 지금 왜 못 올리는지 (모자란 것을 모두). 올릴 게 없으면 null (v1.08 사용자 "업그레이드가 안 되면 뭐가 부족한지 알려줘")
function upgradeMissingText(id) {
  const p = Game.state.pastor;
  if (!p) return null;
  if (jobFor(id)) return '이 건물은 공사 중이에요';
  if (id === 'church') return blockText('fixed', 'church', null, p.fixed.church + 1);
  if (FIXED[id]) return blockText('fixed', id, null, p.fixed[id] + 1);
  const site = p.sites[id];
  if (!site || !site.built) return null;
  if (site.kind === 'gongso') return blockText('gongso', id, null, site.level + 1);
  const to = (site.level || 1) + 1;
  return ROOM_LEVELS[to] ? blockText('room', id, null, to) : '최고 레벨이에요';
}
function upgradeForRaw(id) {
  const p = Game.state.pastor;
  if (!p || jobFor(id)) return null;
  if (id === 'church') {
    const to = p.fixed.church + 1;
    if (!CHURCH_LEVELS[to] || blockedNotByWorkers('fixed', 'church', null, to)) return null;
    return { kind: 'fixed', key: 'church', toLevel: to, name: `성당 Lv${to} "${CHURCH_LEVELS[to].name}"`, effect: `좌석 ${CHURCH_LEVELS[to].seats}석 · 다른 건물을 Lv${to + 1}까지 키울 수 있어요` };
  }
  if (FIXED[id]) {
    const to = p.fixed[id] + 1;
    if (blockedNotByWorkers('fixed', id, null, to)) return null;
    return { kind: 'fixed', key: id, toLevel: to, name: `${FIXED[id].name} Lv${to}`, effect: FIXED[id].effect(to) };
  }
  const site = p.sites[id];
  if (!site) return null;
  if (site.kind === 'gongso') {
    const to = site.level + 1;
    if (!site.level || blockedNotByWorkers('gongso', id, null, to)) return null;
    return { kind: 'gongso', key: id, toLevel: to, name: `공소 Lv${to}`, effect: GONGSO.prod(effL(to)) };
  }
  if (!site.built) return null;
  const to = (site.level || 1) + 1;
  if (ROOM_LEVELS[to] && !blockedNotByWorkers('room', id, null, to)) return { kind: 'room', key: id, toLevel: to, name: `${siteName(id)} Lv${to}`, effect: `방의 단체를 Lv${to}까지 키울 수 있어요` };
  for (const g of site.rooms) {
    if (!g || !g.level || blockedNotByWorkers('group', id, g.type, g.level + 1)) continue;
    return { kind: 'group', key: id, type: g.type, toLevel: g.level + 1, name: `${UNITS[g.type].name} Lv${g.level + 1}`, effect: UNITS[g.type].prod(effL(g.level + 1)) };
  }
  return null;
}

// ---------- 빈터 넓히기: 잡초·돌·어린나무 치우기 ----------
function obstacleById(id) { return MAPS.solmoe.obstacleList().find(o => o.id === id); }

function clearBlocker(id) {
  const ob = obstacleById(id), def = OBSTACLES[ob.type], p = Game.state.pastor;
  if (p.cleared[id]) return '이미 치웠어요';
  if (MAPS.solmoe.regionAt(ob.x, ob.y) === 'town') return '이웃 동네 나무라 벨 수 없어요';
  if (MAPS.solmoe.regionAt(ob.x, ob.y) && !villageOpen(MAPS.solmoe.regionAt(ob.x, ob.y))) return '아직 열지 않은 마을이에요';
  if (!lotOwnedAt(ob.x, ob.y)) return `본당 땅이 아니에요 · ${lotAt(ob.x, ob.y).name} 땅을 먼저 사야 해요`;
  if (def.energy) return Game.state.energy < def.energy ? '행동력이 모자라요' : '';
  // 집: 교우는 신자들의 마음이, 비신자는 마을 평판이 있어야 판다
  for (const [k, v] of Object.entries(ob.need || {})) if (p.res[k] < v) return `${ob.owner} 댁이 아직 팔 생각이 없어요 (${k === 'heart' ? '❤️ 마음' : '🌏 평판'} ${v} 이상 필요)`;
  return jobBlocker('clear', id, null, 1) || '';
}

// 치우기: 잡초는 행동력으로 바로, 돌·나무는 공사 팀이 시간을 들여
function clearObstacle(id) {
  const ob = obstacleById(id), def = OBSTACLES[ob.type], p = Game.state.pastor;
  if (clearBlocker(id)) return null;
  if (def.energy) { spendEnergy(def.energy); return finishClear(id); }
  if (!startJob('clear', id, null, 1)) return null;
  return ob.type === 'house' ? `🏡 ${ob.owner} 댁 땅을 사서 정리하기 시작했어요` : `${def.icon} ${def.name} ${def.verb}를 시작했어요`;
}

// 다 치우면 가끔 작은 발견이 있다
// 치운 자리에 띄울 짧은 글 (지도가 가져가서 그 자리 위로 떠오르게 그린다)
const CLEAR_FX = [];
function finishClear(id) {
  const ob = obstacleById(id), def = OBSTACLES[ob.type], p = Game.state.pastor;
  p.cleared[id] = true;
  let msg = `${def.icon} ${def.name}를 치웠어요. 빈터가 넓어졌어요`;
  const fx = [`✨ ${def.name} ${def.verb} 끝!`];
  const r = Math.random();
  if (ob.type === 'house') {
    msg = `🏡 ${ob.owner} 댁 땅을 샀어요. 가족은 마을 아랫집으로 이사했어요. 본당 땅이 넓어졌어요`;
    fx[0] = '🏡 땅이 넓어졌어요!';
    if (ob.believer) { const d = addRes('heart', 2); msg += ` · "성당 일에 보탬이 되니 기뻐요." 마음 ${fmt(d)}`; fx.push(`❤️ ${fmt(d)}`); }
    else { const d = addRes('reputation', 2); msg += ` · 이웃들이 "성당이 값을 잘 쳐줬대" 하고 이야기해요. 평판 ${fmt(d)}`; fx.push(`🌏 ${fmt(d)}`); }
  } else if (ob.type === 'tree') { const d = addRes('offering', scaledCost(18)); msg += ` · 큰 목재를 팔아 💰${fmt(d)}`; fx.push(`💰 ${fmt(d)}`); }
  else if (ob.type === 'sapling') { const d = addRes('offering', scaledCost(8)); msg += ` · 나무를 팔아 💰${fmt(d)}`; fx.push(`💰 ${fmt(d)}`); }
  else if (r < 0.12) { const d = addRes('heart', 2); msg += ` · 🍀 흙 속에서 옛 묵주를 찾았어요! 마음 ${fmt(d)}`; fx.push('🍀 옛 묵주 발견!', `❤️ ${fmt(d)}`); }
  else if (r < 0.25) { const d = addRes('offering', scaledCost(5)); msg += ` · 🍀 누가 떨어뜨린 봉헌 봉투를 찾았어요 💰${fmt(d)}`; fx.push(`🍀 💰 ${fmt(d)}`); }
  if (ob.type !== 'house' && Math.random() < GEMS.obstacle) { const g = addGems(1 + Math.floor(Math.random() * 3)); msg += ` · 💎 반짝이는 다이아 ${g}개를 주웠어요!`; fx.push(`💎 +${g}`); }
  CLEAR_FX.push({ x: ob.x + ob.w / 2, y: ob.y + ob.d / 2, lines: fx });
  addLog(msg);
  return msg;
}

// ---------- 예비자 교리: 문의 → 교리반 → 세례식(입교) ----------
function cateState() { const p = Game.state.pastor; return p.cate || (p.cate = { n: 0, quality: 20, week: 0 }); }
// 교리반 자리: 교리반 단체가 클수록 많이 받는다 (교리반이 없으면 신부님이 몇 명만)
// 주교님 사목방문까지 남은 주일 수 (없으면 null). 0이면 이번 주일
function bishopWeeks() { const p = Game.state.pastor; return p && p.bishop ? Math.max(0, p.bishop.week - p.week) : null; }
// 연말 교구 시상식: 해마다 이웃 본당을 새로 정하고, 성탄 대축일 주일에 등수를 매긴다
function awardYear(w) { return Math.floor((w === undefined ? Game.state.pastor.week : w) / 48) + 1; }
function awardState() {
  const p = Game.state.pastor, y = awardYear();
  if (!p.award || p.award.year !== y) {
    p.award = { year: y, base: { members: Math.floor(p.res.members), baptized: p.baptizedTotal || 0 }, k: AWARDS.neighbors.map(() => AWARDS.cats.map(() => 0.9 + Math.random() * 0.2)) };
  }
  return p.award;
}
// 이웃 본당 값: 우리 성당이 커지면 견주는 이웃도 그만큼 큰 본당
function awardNeighbors() {
  const a = awardState(), L = Game.state.pastor.fixed.church || 1;
  return AWARDS.neighbors.map(([icon, name, f], j) => ({ icon, name, v: AWARDS.cats.map((c, i) => Math.min(c.unit === '명' ? 9999 : 99, Math.round(c.base(L) * f * ((a.k && a.k[j] && a.k[j][i]) || 1)))) }));
}
function awardMine() {
  const p = Game.state.pastor, a = awardState(), gs = allGroups().filter(x => x.g.level);
  const avg = gs.length ? gs.reduce((t, x) => t + (x.g.vital === undefined ? 60 : x.g.vital), 0) / gs.length : 0;
  return [
    Math.max(0, Math.floor(p.res.members) - a.base.members) + Math.max(0, (p.baptizedTotal || 0) - a.base.baptized),
    Math.round(p.res.heart),
    Math.round(avg * Math.min(1.15, 0.85 + gs.length * 0.03)),
    Math.round(attendanceRate() * 100),
  ];
}
// 부문마다 [우리 값, 등수(1~4), 1등 이웃 값]
function awardStanding() {
  const nb = awardNeighbors(), mine = awardMine();
  return AWARDS.cats.map((c, i) => { const others = nb.map(n => n.v[i]); return { cat: c, mine: mine[i], rank: 1 + others.filter(v => v > mine[i]).length, top: Math.max(...others) }; });
}
function awardWeeksLeft() { const w = Game.state.pastor.week % 48; return w <= AWARDS.week ? AWARDS.week - w : 48 - w + AWARDS.week; }
function holdAwards() {
  const p = Game.state.pastor, st = awardStanding(), lines = [`🏆 연말 교구 사목 시상식 (${awardYear()}년째)`];
  let firsts = 0;
  for (const r of st) {
    const pz = AWARDS.prize[r.rank - 1], got = [];
    if (r.rank === 1) firsts++;
    if (pz) { if (pz.gems) got.push(`💎${addGems(pz.gems)}`); if (pz.rep) got.push(`🌏+${fmt(addRes('reputation', pz.rep))}`); if (pz.trust) { p.trust = clamp((p.trust || 50) + pz.trust, 0, 100); got.push(`교구 신뢰 +${pz.trust}`); } }
    lines.push(`${r.cat.icon} ${r.cat.name}: ${['🥇 1등', '🥈 2등', '🥉 3등', '4등'][r.rank - 1]} (${r.mine}${r.cat.unit})${got.length ? ' · ' + got.join(' · ') : ''}`);
  }
  if (firsts >= AWARDS.grand.firsts) {
    const G = AWARDS.grand; addGems(G.gems); addRes('reputation', G.rep); p.trust = clamp((p.trust || 50) + G.trust, 0, 100);
    lines.push(`✨ 올해의 본당 대상! 주교님이 직접 상패를 주셨어요 · 💎${G.gems} · 🌏+${G.rep} · 교구 신뢰 +${G.trust}`);
  }
  const worst = st.filter(r => r.rank === 4);
  if (worst.length) lines.push(`🧑‍⚖️ 주교님: "${worst.map(r => r.cat.name.replace(' 상', '')).join('·')}은 내년에 조금 더 마음을 써 주세요. 신부님의 수고를 압니다."`);
  p.awards = (p.awards || []).concat([{ year: awardYear(), ranks: st.map(r => r.rank), grand: firsts >= AWARDS.grand.firsts }]);
  addLog(`🏆 교구 시상식: 1등 ${firsts}부문`);
  return lines;
}
function cateCapacity() { return CATE.baseCap + Math.round(CATE.capPerLevel * unitLevels('catechumen')) + cateClasses().reduce((a, k) => a + k.cap, 0); }
// 더 연 교리반 (CATE_CLASSES 앞에서부터)
function cateClasses() { return CATE_CLASSES.slice(0, cateState().classes || 0); }
function nextCateClass() { return CATE_CLASSES[cateState().classes || 0] || null; }
function cateClassBlocker() {
  const k = nextCateClass(), p = Game.state.pastor;
  if (!k) return '교리반을 모두 열었어요';
  if (k.church && p.fixed.church < k.church) return `성당 Lv${k.church}부터 열 수 있어요`;
  if (p.res.offering < scaledCost(k.cost)) return `봉헌금 ${scaledCost(k.cost)}만 원이 필요해요`;
  return '';
}
function openCateClass() {
  const k = nextCateClass(), c = cateState(), p = Game.state.pastor;
  if (cateClassBlocker()) return null;
  const cost = scaledCost(k.cost);
  p.res.offering -= cost; book('catechumen', 'edu', cost);
  c.classes = (c.classes || 0) + 1;
  addLog(`📘 예비자 교리 ${k.name}을 새로 열었습니다.`);
  return `${k.icon} ${k.name}을 열었어요 · 교리반 자리 +${k.cap} (지금 ${cateCapacity()}자리)`;
}
function promoMult() {
  const p = Game.state.pastor;
  if (!p.promo || gameTime() > p.promo.until) return 1;
  return 1 + (p.promo.mult - 1) * (1 + 0.2 * unitLevels('mission'));
}
// 시간당 예비신자가 찾아오는 수: 평판(입소문) + 교리반 + 선교분과, 홍보·수녀님이면 더
function cateInflow() {
  const p = Game.state.pastor;
  const base = p.res.reputation * 0.01 + unitLevels('catechumen') * 1.5 * (sisterIn('catechumen') ? 1 + 0.5 * sisterEffFor('catechumen') : 1) + unitLevels('mission') + (hasPerk('mission3') ? 1 : 0);
  return base * promoMult() * (0.7 + p.res.heart / 100 * 0.6) * (newbie() ? NEWBIE.members : firstParish() ? FIRST_PARISH.members : 1) * parishMod('cate') * dirMod('cate') * (hasChair('missionDiv') ? 1.15 : 1);
}
// 세례식에서 끝까지 교리를 마치는 비율
function cateCompletion() {
  const c = cateState();
  return clamp(0.35 + c.quality / 250 + unitLevels('catechumen') * 0.04 + (sisterIn('catechumen') ? 0.15 * sisterEffFor('catechumen') : 0), 0.2, 0.95);
}
function addCatechumens(n) { const c = cateState(), before = c.n; c.n = Math.min(cateCapacity(), c.n + n); return c.n - before; }
function addCateQuality(v) { const c = cateState(), before = c.quality; c.quality = clamp(c.quality + v, 0, 100); return c.quality - before; }
function baptismCost(n) { return scaledCost(CATE.ceremony) + n * CATE.perPerson; }
function weeksToBaptism() { return CATE.baptismEvery - (cateState().week % CATE.baptismEvery); }

// 교리 홍보
function promoBlocker(pr) {
  const p = Game.state.pastor;
  if (p.promo && gameTime() < p.promo.until) return `${p.promo.name} 홍보가 아직 진행 중이에요`;
  if (p.res.offering < scaledCost(pr.cost)) return `봉헌금 ${scaledCost(pr.cost)}만 원이 필요해요`;
  return '';
}
function startPromo(id) {
  const p = Game.state.pastor, pr = PROMOS.find(x => x.id === id);
  if (promoBlocker(pr)) return null;
  p.res.offering -= scaledCost(pr.cost);
  p.promo = { mult: pr.mult, until: gameTime() + pr.days * 86400000, name: pr.name };
  addLog(`📣 ${pr.name}로 교리 홍보를 시작했습니다.`);
  return `${pr.icon} ${pr.name} 홍보를 시작했어요. ${pr.days}일 동안 예비신자가 ${pr.mult}배쯤 찾아와요`;
}

// 주일마다: 교리가 한 주 진행되고, 네 주일마다 세례식
function cateSunday() {
  const c = cateState(), lines = [];
  c.week++;
  // 더 연 교리반의 교재·간식비
  const extra = cateClasses().reduce((a, k) => a + scaledCost(k.week), 0);
  if (extra) { const p = Game.state.pastor, paid = Math.min(extra, Math.max(0, Math.floor(p.res.offering))); p.res.offering -= paid; book('catechumen', 'edu', paid); lines.push(`📘 교리반 ${cateClasses().length + 1}개 교재·간식비 💰${paid}`); }
  if (c.week % CATE.baptismEvery !== 0) return lines;
  const rate = cateCompletion();
  let baptized = Math.floor(c.n * rate * (hasPerk('mission6') ? 1.2 : 1));
  baptized = Math.min(baptized, c.n);
  // 세례식 비용: 예식 준비(초·꽃·제의) + 한 사람마다 예복·선물
  const p = Game.state.pastor;
  if (baptized > 0) {
    const cost = Math.round(baptismCost(baptized) * (hasPerk('mothers3') ? 0.7 : 1)), paid = Math.min(cost, Math.floor(p.res.offering));
    book(null, 'baptism', paid);
    p.res.offering -= paid;
    if (paid < cost) { addRes('heart', -2); lines.push(`🕯️ 세례식 준비비 💰${cost} 중 💰${paid}만 마련해서 조촐하게 치렀어요 (❤️−2)`); }
    else lines.push(`🕯️ 세례식 준비비 💰${cost}가 나갔어요 (초·꽃·예복·선물)`);
  }
  const got = addRes('members', baptized);
  p.baptizedTotal = (p.baptizedTotal || 0) + baptized;
  const bq = baptismBouquet(baptized); if (bq) lines.push(bq);
  c.n -= baptized;
  const dropped = Math.floor(c.n * 0.15);
  c.n -= dropped;
  if (baptized > 0) { addRes('heart', 2); lines.push(`🕊️ 세례식! 예비신자 ${baptized}명이 세례를 받고 입교했어요 (끝까지 마친 비율 ${Math.round(rate * 100)}%)${got < baptized ? ' · 성당 자리가 모자라요' : ''}`); }
  else lines.push('🕊️ 세례식 주일이지만 이번엔 세례 받을 예비신자가 없었어요');
  if (dropped) lines.push(`📘 ${dropped}명은 교리를 그만두었어요`);
  c.quality = Math.round(c.quality * 0.4);
  // 선교분과가 있으면 새 신자들을 위한 성지순례를 준비하며 지원금을 청한다
  const mission = allGroups().find(x => x.g.type === 'mission' && x.g.level);
  p.plans = p.plans || [];
  if (baptized >= 3 && mission && !p.plans.some(x => x.defId === 'newPilgrim')) {
    p.plans.push({ key: mission.key, room: mission.room, type: 'mission', defId: 'newPilgrim', stage: 'request', paid: 0, age: 0 });
    lines.push('🚌 선교분과가 새 신자들을 위한 성지순례를 준비하며 지원금을 청했어요');
  }
  addLog(lines[0]);
  return lines;
}

// ---------- 이웃 동네 종교 현황 ----------
function religionMembers(id) {
  const r = RELIGIONS[id], w = Game.state.pastor ? Game.state.pastor.week : 0;
  return Math.max(10, Math.round(r.base + r.trend * w));
}
// 우리 성당 · 다른 종교 · 종교 없음 (동네 인구는 신자가 많아지면 함께 늘려 잡는다)
function townReligionStats() {
  const ours = Math.floor(Game.state.pastor.res.members);
  const rows = [{ icon: '✝️', name: `${parishShort()} 성당`, kind: '가톨릭', n: ours, ours: true },
    ...Object.entries(RELIGIONS).map(([id, r]) => ({ icon: r.icon, name: r.name, kind: r.kind, n: religionMembers(id) }))];
  const sum = rows.reduce((a, x) => a + x.n, 0), pop = Math.max(TOWN_POP, sum + 200);
  rows.push({ icon: '🙂', name: '종교 없음', kind: '', n: pop - sum });
  return { pop, rows };
}

// ---------- 길 놓기 ----------
const PATH_COST = 1;  // v0.80: 칸이 작아져 한 칸 1만 원
// 길 한 칸을 놓거나 걷는다. 결과 { ok, removed, reason }
function togglePath(x, y) {
  const p = Game.state.pastor, k = x + ',' + y;
  p.paths = p.paths || {};
  if (p.paths[k]) { delete p.paths[k]; return { ok: true, removed: true }; }
  const why = MAPS.solmoe.canPath(x, y);
  if (why) return { ok: false, reason: why };
  if (p.res.offering < PATH_COST) return { ok: false, reason: '봉헌금이 모자라요' };
  p.res.offering -= PATH_COST;
  p.paths[k] = true;
  return { ok: true };
}

// 길 한 칸 옮기기 (v1.08): 새 자리가 길을 놓을 수 있는 곳이어야 한다. 무료
function movePath(fx, fy, tx, ty) {
  const p = Game.state.pastor, ps = p.paths || {};
  if (!ps[fx + ',' + fy]) return '옮길 길이 없어요';
  if (ps[tx + ',' + ty]) return '거기엔 이미 길이 있어요';
  const why = MAPS.solmoe.canPath(tx, ty);
  if (why) return why;
  delete ps[fx + ',' + fy]; ps[tx + ',' + ty] = true;
  return '길을 옮겼어요';
}

// 새 건물을 (x, y)에 놓고 공사를 시작한다 (교리실·공소)
// 성전 안 본당: 교리실은 땅이 아니라 건물 안에 들인다 (자리 없이)
function insideParish() { const p = Game.state.pastor; return !!(p && (PARISHES[p.parishId] || {}).interior); }
function placeSiteInside(kind) {
  const p = Game.state.pastor;
  let n = 1;
  while (p.sites['s' + n]) n++;
  const key = 's' + n;
  if (!startJob(kind, key, null, 1)) return null;
  return key;
}
function placeSite(kind, x, y, rot = 0) {
  const p = Game.state.pastor, map = MAPS.solmoe;
  if (!map.canPlace(kind, x, y, rot).ok) return null;
  let n = 1;
  while (p.sites['s' + n]) n++;
  const key = 's' + n;
  if (!startJob(kind, key, null, 1)) return null;
  p.sites[key].x = x; p.sites[key].y = y;
  if (rot) p.sites[key].rot = rot;
  return key;
}

function finishJob(j) {
  const s = Game.state, p = s.pastor;
  j = j || p.jobs[0];
  let msg;
  setTimeout(() => { if (Game.state && Game.state.pastor === p) checkTransferNotice(p); }, 0);
  if (j.kind !== 'clear') for (const c of crew()) { const up = crewGainXp(c, CREW_XP.job); if (up && typeof toast === 'function') setTimeout(() => toast(up), 900); }
  if (j.kind === 'clear') {
    msg = finishClear(j.key);
  } else if (j.kind === 'merge') {
    msg = finishMerge(j);
  } else if (j.kind === 'container') {
    p.sites[j.key].built = true;
    const st = p.sites[j.key];
    msg = st.floor ? `🏗️ ${st.floor}층 증축이 끝났어요! 교리실 방 ${st.rooms.length}개에 단체를 만들 수 있어요.` : `${siteName(j.key, true)}이 놓였습니다! 방 ${CONTAINER_ROOMS}개에 단체를 만들 수 있어요.`;
  } else if (j.kind === 'room') {
    const st = p.sites[j.key], before = st.rooms.length;
    st.level = j.toLevel;
    growRooms(st);
    const added = st.rooms.length - before;
    msg = (added > 0 ? `🚪 방이 ${added}개 늘어 ${st.rooms.length}개가 되었어요! ` : '') + (ROOM_LEVELS[j.toLevel].tier !== ROOM_LEVELS[j.toLevel - 1].tier ? `${siteName(j.key)}이 ${josa(ROOM_LEVELS[j.toLevel].name, '으로', '로')} 바뀌었습니다!` : `${siteName(j.key)}이 ${josa(`Lv${j.toLevel}`, '이', '가')} 되었습니다.`);
  } else if (j.kind === 'group') {
    p.sites[j.key].rooms[j.room].level = j.toLevel;
    const name = UNITS[j.type].name;
    msg = j.toLevel === 1 ? `${josa(name, '이', '가')} 첫 모임을 가졌습니다!`
      : j.toLevel === CHAIR_LEVEL ? `${name} Lv${j.toLevel}! 이제 위원장이 회의를 이끌고, 건의사항은 상임위원회로 올라와요.`
      : `${name} Lv${j.toLevel}! 모임이 더 활발해졌어요.`;
  } else if (j.kind === 'gongso') {
    p.sites[j.key].level = j.toLevel;
    msg = j.toLevel === 1 ? '윗말 공소가 세워졌습니다!' : `공소 Lv${j.toLevel} 공사를 마쳤습니다!`;
  } else {
    p.fixed[j.key] = j.toLevel;
    if (j.key === 'rectory') s.energyMax = rectoryEnergy(j.toLevel);
    const stage = j.key === 'church' && CHURCH_LEVELS[j.toLevel].tier !== CHURCH_LEVELS[j.toLevel - 1].tier
      ? { 2: '낡은 컨테이너를 걷어 내고 조립식 가건물 성당을 세웠어요!', 3: '드디어 가건물을 헐고 새 성당 건물을 지었어요! 교우들이 눈시울을 붉혔어요.', 4: '새 성당이 더 크고 아름다워졌어요. 스테인드글라스와 오르간이 들어왔어요!', 5: '산골 마을에 빛나는 성당이 우뚝 섰어요!' }[CHURCH_LEVELS[j.toLevel].tier] : '';
    msg = j.key === 'church'
      ? (stage ? `성당 Lv${j.toLevel}! ${stage}` : `성당 증축 완료! Lv${j.toLevel} "${CHURCH_LEVELS[j.toLevel].name}"`)
      : `${FIXED[j.key].name} Lv${j.toLevel} 공사를 마쳤습니다!`;
    // 성당이 커질 때마다 교구에서 축하 다이아 (직원 채용에 쓴다)
    if (j.key === 'church') msg += ` · 💎 교구 축하 다이아 ${addGems(GEMS.churchUp * j.toLevel)}개`;
  }
  p.jobs = p.jobs.filter(x => x !== j);
  addLog(`🏗️ ${msg}`);
  return msg;
}

// 그 땅(또는 고정 건물)에서 진행 중인 공사
function jobFor(key) { const p = Game.state.pastor; return p ? p.jobs.find(j => j.key === key || j.from === key) || null : null; }

function jobLeftSec(j) { return j ? Math.max(0, Math.ceil((j.until - Date.now()) / 1000)) : 0; }

function jobProgress(j) { return j ? clamp((Date.now() - j.start) / (j.until - j.start), 0, 1) : 0; }

// 신부가 공사를 거들면 남은 시간이 30% 줄어든다
function helpJob(j) {
  if (!j || Game.state.energy < helpCost()) return null;
  spendEnergy(helpCost());
  const now = Date.now();
  const cut = hasPerk('youth3') ? 0.45 : 0.3;
  j.until = now + (j.until - now) * (1 - cut);
  j.start = Math.min(j.start, now - 1);
  const r = gain('rapport', 1);
  return `교우들과 함께 땀 흘렸어요. 남은 시간 ${Math.round(cut * 100)}% 단축, 친화력 ${fmt(r)}`;
}

// 남은 공사 시간을 봉헌금으로 당긴다: 남은 시간(분)만큼 + 기본 2만 원. 테스트 모드에서도 원래 시간 기준
// 💎 다이아: 실제 돈으로 사는 재화. 공사를 바로 끝낼 때 쓴다 (남은 시간이 길수록 많이)
// 처음 1시간까지는 3분에 1개꼴, 그 뒤로는 6분에 1개꼴
const GEMS = { start: 50, obstacle: 0.3, churchUp: 5 };
const GEM_PACKS = [
  { gems: 80, won: 1200, name: '한 줌' },
  { gems: 500, won: 6500, name: '주머니', tag: '+8%' },
  { gems: 1200, won: 13000, name: '상자', tag: '+20%' },
  { gems: 2500, won: 25000, name: '궤짝', tag: '+30%' },
  { gems: 6500, won: 59000, name: '보물 창고', tag: '+45%' },
];
function gems() { const p = Game.state.pastor; return p ? Math.floor(p.gems || 0) : 0; }
function addGems(n) { const p = Game.state.pastor; p.gems = Math.max(0, (p.gems || 0) + n); return n; }
// v1.07: 다이아로 봉헌금 사기. 받는 양은 지금 본당 봉헌(시간당)의 몇 시간어치라 본당이 커져도 쓸모가 있다 (최소 금액 보장, 금고 한도까지)
const GOLD_PACKS = [
  { gems: 10, hours: 2, min: 60, name: '봉헌 바구니' },
  { gems: 30, hours: 7, min: 200, name: '봉헌 자루', tag: '+17%' },
  { gems: 80, hours: 20, min: 600, name: '봉헌 궤짝', tag: '+25%' },
];
function goldPackAmount(g) { return Math.round(Math.max(g.min, parishRates().gross * g.hours) / 10) * 10; }
// v1.07: 다이아로 신자 모시기 (성당 자리의 몇 %, 최소 인원 보장, 자리 한도까지)
const MEMBER_PACKS = [
  { gems: 15, frac: 0.05, min: 5, name: '이웃 초대' },
  { gems: 40, frac: 0.15, min: 15, name: '새 얼굴 모임', tag: '+13%' },
  { gems: 100, frac: 0.4, min: 40, name: '선교 주간', tag: '+20%' },
];
function memberPackAmount(g) { return Math.max(g.min, Math.round(churchSeats() * g.frac)); }
function buyMembers(i) {
  const g = MEMBER_PACKS[i], p = Game.state.pastor;
  if (!g || !p) return null;
  if (gems() < g.gems) return { short: true };
  if (churchSeats() - p.res.members < 1) return { full: true };
  const got = addRes('members', memberPackAmount(g));
  addGems(-g.gems); addLog(`💎 다이아 ${g.gems}개로 새 신자 ${Math.round(got)}명`);
  return { got: Math.round(got) };
}
function buyGold(i) {
  const g = GOLD_PACKS[i], p = Game.state.pastor;
  if (!g || !p) return null;
  if (gems() < g.gems) return { short: true };
  const room = vaultCap() - p.res.offering;
  if (room < 1) return { full: true };
  const got = addRes('offering', goldPackAmount(g));
  addGems(-g.gems); addLog(`💎 다이아 ${g.gems}개로 봉헌금 ${Math.round(got)}만 원`);
  return { got: Math.round(got) };
}
function rushCost(j) {
  if (!j) return 0;
  const m = Math.max(0, j.until - Date.now()) / 60000;
  return Math.max(1, Math.ceil(m <= 60 ? 1 + m / 3 : 21 + (m - 60) / 6));
}

function rushJob(j) {
  const p = Game.state.pastor;
  const cost = rushCost(j);
  if (!j || gems() < cost) return null;
  addGems(-cost);
  addLog(`💎 다이아 ${cost}개로 공사를 바로 마침`);
  return finishJob(j);
}

// 공사 팀 늘리기: 성당 레벨이 오르면 팀을 더 꾸릴 수 있다
// 일꾼 = 본당 직원. 필요하면 언제든 봉헌금으로 모신다 (cost: 모실 때 드는 돈, wage: 시간당 인건비). 순서대로
// 성당 레벨 조건은 없다. 대신 비싸고, 모신 뒤에는 인건비가 계속 나간다
// ---------- 본당 직원 ----------
// 봉사자 교우 한 명은 처음부터 무료로 함께하고, 나머지는 사무실에서 공고를 내 뽑는다.
// 관리장: 처음부터 한 명 뽑을 수 있음(마당 정리·셔틀버스). 사무원: 처음 2명, 신자가 늘면 더(CREW.clerkAt).
// 사무원 한 명을 사무장으로 승진시키면 그 자리에 사무원을 또 뽑을 수 있다. 모두 공사를 맡는 일꾼이기도 하다
const CREW_ROLES = {
  manager: { name: '관리장', icon: '🧰', look: 'staff1', gems: 30, wage: 1.5, desc: '성당 건물과 마당을 돌봐요. 날마다 잡초·돌을 치우고 주일 셔틀버스를 몰아요' },
  clerk: { name: '사무원', icon: '🗂️', look: 'staff2', gems: 50, wage: 2.5, desc: '교적과 장부를 맡아요. 성실할수록 살림비를 아껴요' },
  chief: { name: '사무장', icon: '📋', look: 'staff3', gems: 0, wage: 4, desc: '본당 살림을 총괄해요. 공사가 빨라지고 살림비를 더 아껴요' },
};
// 경험치: 날마다 day(+성실 4 이상이면 dayDiligent), 공사가 끝날 때마다 job. 다음 레벨까지 per × 지금 레벨
// 레벨마다 능력이 statPer씩 오르고(최대 maxStat), 인건비도 raise만큼 오른다. 관리장은 Lv4부터 하루 두 곳, Lv7부터 공사도 거든다
const CREW_XP = { day: 10, dayDiligent: 5, job: 4, per: 40, max: 10, statPer: 0.4, maxStat: 8, raise: 0.03 };
// 직원은 💎 다이아로만 채용·승진한다 (인건비는 봉헌금에서 다달이). 공고는 무료
const CREW = { clerks: 2, clerkAt: [600, 1200], promoteGems: 40, chiefWage: 1.6, chiefSpeed: 0.1 };
const VOLUNTEER = { name: '봉사자 교우', icon: '🙋', look: 'worker' };
function crew() { const p = Game.state.pastor; return p.crew || (p.crew = []); }
function crewOf(role) { return crew().filter(c => c.role === role); }
function syncTeams() { const p = Game.state.pastor; p.teams = 1 + crew().length; }
function clerkCap() { const m = Game.state.pastor.res.members; return CREW.clerks + CREW.clerkAt.filter(x => m >= x).length; }
function staffWages() { const p = Game.state.pastor; return crew().reduce((a, c) => a + c.wage, 0) + sisters().length * SISTER.wage + curates().length * CURATE.wage; }
// ---------- 보좌 신부 ----------
function curates() { const p = Game.state.pastor; return p.curates || (p.curates = []); }
// 지금 본당 규모로 모실 수 있는 보좌 신부 수
function curateCap() { const p = Game.state.pastor; return CURATE.at.filter(a => p.fixed.church >= a.church && p.res.members >= a.members).length; }
function curateBlocker() {
  const p = Game.state.pastor, n = curates().length, next = CURATE.at[n];
  if (!next) return `보좌 신부는 ${CURATE.at.length}명까지예요`;
  if (n >= curateCap()) return `성당 Lv${next.church}·신자 ${next.members}명이 되면 ${n ? '한 분 더 ' : ''}청할 수 있어요`;
  if ((p.trust || 50) < CURATE.trust) return `교구 신뢰 ${CURATE.trust} 이상이어야 해요 (지금 ${Math.round(p.trust || 50)})`;
  return null;
}
function requestCurate() {
  const p = Game.state.pastor;
  if (curateBlocker()) return null;
  const used = new Set(curates().map(c => c.name)), name = CURATE_NAMES.find(x => !used.has(x)) || CURATE_NAMES[0];
  const c = { name, scope: [], since: p.week };
  curates().push(c);
  addLog(`✝️ ${name} 보좌 신부님이 부임하셨어요`);
  return c;
}
function sendBackCurate(name) {
  const p = Game.state.pastor, i = curates().findIndex(c => c.name === name);
  if (i < 0) return null;
  curates().splice(i, 1);
  p.trust = Math.max(0, (p.trust || 50) - CURATE.sendBack);
  addLog(`✝️ ${name} 보좌 신부님을 교구로 돌려보냈어요`);
  return `${name} 보좌 신부님이 교구로 돌아가셨어요 (교구 신뢰 −${CURATE.sendBack})`;
}
function curateFor(type) { return curates().find(c => c.scope.includes(type)) || null; }
function toggleCurateScope(name, type) {
  const c = curates().find(x => x.name === name);
  if (!c) return false;
  if (c.scope.includes(type)) { c.scope = c.scope.filter(t => t !== type); return true; }
  if (c.scope.length >= CURATE.scope) return false;
  // 한 단체는 보좌 신부 한 분만
  for (const o of curates()) o.scope = o.scope.filter(t => t !== type);
  c.scope.push(type);
  return true;
}
function crewLevel(c) { return c.level || 1; }
function crewStat(c, k) { return Math.min(CREW_XP.maxStat, c[k] + (crewLevel(c) - 1) * CREW_XP.statPer); }
function crewNeed(c) { return CREW_XP.per * crewLevel(c); }
// 경험치를 얻고, 레벨이 오르면 글을 돌려준다
function crewGainXp(c, n) {
  if (crewLevel(c) >= CREW_XP.max) return null;
  c.xp = (c.xp || 0) + n;
  let up = false;
  while (crewLevel(c) < CREW_XP.max && c.xp >= crewNeed(c)) { c.xp -= crewNeed(c); c.level = crewLevel(c) + 1; c.wage = Math.round(c.wage * (1 + CREW_XP.raise) * 10) / 10; up = true; }
  return up ? `📈 ${CREW_ROLES[c.role].name} ${c.name} 님이 ${josa(`Lv${c.level}`, '이', '가')} 되었어요! 능력이 늘었어요 (인건비 ${c.wage}/시간)` : null;
}
function crewDaily() { return crew().map(c => crewGainXp(c, CREW_XP.day + (c.diligence >= 4 ? CREW_XP.dayDiligent : 0))).filter(Boolean); }
function staffList() { return crew(); }
// 직원 능력: 솜씨는 공사 속도, 신앙은 마음 목표, 사무원·사무장 성실은 살림비
function staffSkillBonus() { return crew().reduce((a, s) => a + (crewStat(s, 'skill') - 3) * 0.04, 0) + (crewOf('chief').length ? CREW.chiefSpeed : 0); }
function staffFaithBonus() { return crew().reduce((a, s) => a + (crewStat(s, 'faith') - 3) * 0.5, 0); }
function staffOfficeSave() { return crew().reduce((a, s) => a + (s.role === 'clerk' ? 1 : s.role === 'chief' ? 2 : 0) * (crewStat(s, 'diligence') - 3) * 0.015, 0); }
function managerDiligent() { const s = crewOf('manager')[0]; return !s || crewStat(s, 'diligence') >= 3 || Math.random() < 0.5; }
// ---------- 채용 공고 ----------
function postBlocker(role) {
  const p = Game.state.pastor;
  if (p.hiring) return '이미 공고를 냈어요';
  if (role === 'manager' && crewOf('manager').length) return '관리장은 한 명이면 돼요';
  if (role === 'clerk' && crewOf('clerk').length >= clerkCap()) { const next = CREW.clerkAt.find(x => p.res.members < x); return `사무원은 지금 ${clerkCap()}명까지예요${next ? ` (신자 ${next}명이 되면 한 명 더)` : ''}${crewOf('chief').length ? '' : ' · 한 명을 사무장으로 승진시키면 자리가 나요'}`; }
  return null;
}
function postJob(role) {
  const p = Game.state.pastor;
  if (postBlocker(role)) return null;
  p.hiring = { role, applicants: [], since: Date.now() };
  addLog(`📢 ${CREW_ROLES[role].name} 채용 공고를 냈어요`);
  return CREW_ROLES[role];
}
function makeApplicant(role) {
  const r = () => 1 + Math.floor(Math.random() * 5), skill = r(), diligence = r(), faith = r();
  const used = new Set([...(Game.state.pastor.hiring.applicants || []), ...crew()].map(a => a.name)), pool = STAFF_NAMES.filter(n => !used.has(n));
  const name = pool.length ? pool[Math.floor(Math.random() * pool.length)] : STAFF_NAMES[Math.floor(Math.random() * STAFF_NAMES.length)];
  // 능력이 좋을수록 급여를 더 바란다 (가끔 착한 지원자도)
  const want = clamp(0.7 + (skill + diligence + faith - 9) * 0.06 + (Math.random() - 0.5) * 0.3, 0.6, 1.5);
  const note = [skill >= 4 ? pickOne(STAFF_NOTES.skill) : skill <= 2 ? pickOne(STAFF_NOTES.lowSkill) : null, diligence >= 4 ? pickOne(STAFF_NOTES.diligent) : diligence <= 2 ? pickOne(STAFF_NOTES.lazy) : null, faith >= 4 ? pickOne(STAFF_NOTES.faith) : faith <= 2 ? pickOne(STAFF_NOTES.noFaith) : null].filter(Boolean);
  return { name, age: 25 + Math.floor(Math.random() * 40), skill, diligence, faith, wage: Math.round(CREW_ROLES[role].wage * want * 10) / 10, note: note.join(' · ') || '무난한 사람이에요' };
}
// 공고를 낸 동안 시간이 흐르면 지원자가 찾아온다
function hiringTick(hours) {
  const p = Game.state.pastor, h = p.hiring;
  if (!h || h.applicants.length >= HIRE.max || hours <= 0) return 0;
  let n = 0;
  for (let t = 0; t < Math.min(hours, 24) && h.applicants.length < HIRE.max; t += 1) if (Math.random() < HIRE.perHour * Math.min(1, hours - t)) { h.applicants.push(makeApplicant(h.role)); n++; }
  return n;
}
function hireBlocker() {
  const p = Game.state.pastor, role = CREW_ROLES[p.hiring.role];
  if (gems() < role.gems) return `💎 다이아 ${role.gems}개가 필요해요 (가진 다이아 ${gems()}개)`;
  return null;
}
function acceptApplicant(i) {
  const p = Game.state.pastor, h = p.hiring, a = h && h.applicants[i];
  if (!a || hireBlocker()) return null;
  const role = CREW_ROLES[h.role];
  addGems(-role.gems);
  crew().push({ ...a, role: h.role, since: p.week });
  syncTeams();
  p.hiring = null;
  addLog(`${role.icon} ${a.name} 님을 ${josa(role.name, '으로', '로')} 채용했어요`);
  return `${role.icon} ${a.name} 님을 ${josa(role.name, '으로', '로')} 채용했어요! 일손이 ${p.teams}명이 되었어요 · 인건비 ${a.wage}/시간`;
}
function rejectApplicant(i) { const p = Game.state.pastor, h = p.hiring; if (!h) return; const a = h.applicants.splice(i, 1)[0]; addLog(`📨 ${a.name} 님은 정중히 돌려보냈어요`); }
function cancelPosting() { Game.state.pastor.hiring = null; }
// 사무원 → 사무장 승진 (한 명만). 인건비가 오른다
function promoteBlocker() {
  const p = Game.state.pastor;
  if (crewOf('chief').length) return '사무장은 이미 있어요';
  if (!crewOf('clerk').length) return '승진시킬 사무원이 없어요';
  if (gems() < CREW.promoteGems) return `💎 다이아 ${CREW.promoteGems}개가 필요해요 (가진 다이아 ${gems()}개)`;
  return null;
}
function promoteClerk(name) {
  const p = Game.state.pastor, c = crewOf('clerk').find(x => x.name === name);
  if (!c || promoteBlocker()) return null;
  addGems(-CREW.promoteGems);
  c.role = 'chief'; c.wage = Math.round(Math.max(c.wage * CREW.chiefWage, CREW_ROLES.chief.wage * 0.8) * 10) / 10;
  addLog(`📋 ${c.name} 님을 사무장으로 승진시켰어요`);
  return `📋 ${c.name} 님이 사무장이 되었어요! 인건비 ${c.wage}/시간 · 이제 사무원을 한 명 더 뽑을 수 있어요`;
}
// 내보내기: 인건비는 줄지만 교우들 마음이 조금 상한다
function dismissCrew(name) {
  const p = Game.state.pastor, i = crew().findIndex(x => x.name === name);
  if (i < 0) return null;
  const c = crew().splice(i, 1)[0];
  syncTeams();
  // 일이 너무 많아진 공사는 일손이 모자라도 그대로 진행
  addRes('heart', -1);
  addLog(`🚪 ${CREW_ROLES[c.role].name} ${c.name} 님과 작별했어요`);
  return `🚪 ${c.name} 님이 본당을 떠났어요 (❤️−1)`;
}

// 수녀님: 수녀원에 파견을 요청해 모신다. 성향(SISTER_TYPES)마다 능력과 월권하는 정도가 다르다
// 수녀원 평판(p.convent): 처음 60. 수녀님을 돌려보내면 떨어지고, 잘 모시면 조금씩 오른다.
// 평판이 높을수록 후보를 여럿 보고 고를 수 있고, 낮으면 파견비가 비싸지다 20 아래면 파견을 거절당한다
const SISTER = { church: 4, cost: 200, wage: 3, convent: 60, sendBack: 15, sendBackEarly: 10, refuse: 20, at: [4, 6, 8] };
// 수녀님은 여러 분(최대 3명) 모신다. 저장은 p.sisters, p.sister는 지금 다루는 수녀님(SIS_CTX, 없으면 첫째)
let SIS_CTX = null;
function sisters() { const p = Game.state && Game.state.pastor; return (p && p.sisters) || []; }
function sisterByName(n) { return sisters().find(s => s.name === n) || null; }
function withSister(s, fn) { const prev = SIS_CTX; SIS_CTX = s; try { return fn(); } finally { SIS_CTX = prev; } }
function installSisterAccessor(p) {
  if (!p) return;
  const d = Object.getOwnPropertyDescriptor(p, 'sister');
  if (d && 'value' in d) { delete p.sister; p.sisters = p.sisters || []; if (d.value) p.sisters.push(d.value); }
  p.sisters = p.sisters || [];
  if (d && d.get) return;
  Object.defineProperty(p, 'sister', { configurable: true, enumerable: false,
    get() { return (SIS_CTX && p.sisters.includes(SIS_CTX) ? SIS_CTX : p.sisters[0]) || null; },
    set(v) { if (v) p.sisters.push(v); else { const cur = SIS_CTX && p.sisters.includes(SIS_CTX) ? SIS_CTX : p.sisters[0]; p.sisters = p.sisters.filter(x => x !== cur); } } });
}
// 성당 레벨에 따라 모실 수 있는 수녀님 수
function sisterCap() { return SISTER.at.filter(c => Game.state.pastor.fixed.church >= c).length; }
function conventRep() { const p = Game.state.pastor; return p.convent === undefined ? SISTER.convent : p.convent; }
function sisterCost() { const c = conventRep(); return Math.round(SISTER.cost * (c < 40 ? 1.5 : c >= 80 ? 0.8 : 1)); }
function sisterBlocker() {
  const p = Game.state.pastor;
  if (sisters().length >= SISTER.at.length) return `수녀님은 ${SISTER.at.length}분까지예요`;
  if (sisters().length >= sisterCap()) return `성당 Lv${SISTER.at[sisters().length]}부터 ${sisters().length ? '한 분 더 ' : ''}모실 수 있어요`;
  if (conventRep() < SISTER.refuse) return `수녀원이 당분간 파견하기 어렵다고 해요 (수녀원 평판 ${SISTER.refuse} 필요)`;
  if (p.res.offering < sisterCost()) return `봉헌금 ${sisterCost()}만 원이 필요해요`;
  return null;
}
// 수녀원이 보내 주는 후보: 평판이 높을수록 여럿 (80↑ 3명, 40↑ 2명, 그 아래 1명)
function sisterCandidates() {
  const c = conventRep(), n = c >= 80 ? 3 : c >= 40 ? 2 : 1;
  const used = new Set(sisters().map(s => s.name)), types = Object.keys(SISTER_TYPES).sort(() => Math.random() - 0.5), names = SISTER_NAMES.filter(x => !used.has(x)).sort(() => Math.random() - 0.5);
  return types.slice(0, n).map((type, i) => ({ type, name: names[i] }));
}
function hireSister(scope, cand) {
  const p = Game.state.pastor;
  if (sisterBlocker()) return false;
  cand = cand || sisterCandidates()[0];
  p.res.offering -= sisterCost();
  installSisterAccessor(p);
  p.sisters.push({ scope: Array.isArray(scope) ? scope : [], influence: 0, type: cand.type, name: cand.name, bond: 60, lean: 1, since: p.week, day: dayKey() });
  addLog(`👩‍🦳 ${cand.name} 수녀님(${SISTER_TYPES[cand.type].name})이 본당에 오셨습니다.`);
  return true;
}
// 관리장: 마당 정리와 주일 셔틀버스
const SHUTTLE = { cost: 8, attend: 0.06 };
// 시설관리팀이 봉사 나오는 날 (하루 확률)
function facilityChance(L) { L = L === undefined ? unitLevels('facility') : L; return clamp(0.15 + 0.07 * L, 0, 0.55); }
function hasManager() { const p = Game.state.pastor; return !!p && crewOf('manager').length > 0; }
function shuttleOn() { const p = Game.state.pastor; return hasManager() && !!p.shuttle; }
function shuttleCost() { return hasPerk('christopher6') ? 0 : scaledCost(SHUTTLE.cost); }
function sisterScope() { const p = Game.state.pastor; return p && p.sister ? (p.sister.scope || []) : []; }
// 그 단체를 맡은 수녀님 (여러 분 가운데)
function sisterFor(type) { return sisters().find(s => (s.scope || []).includes(type)) || null; }
function sisterIn(type) { return !!sisterFor(type); }
function sisterEffFor(type) { const s = sisterFor(type); return s ? withSister(s, sisterEff) : 0; }
// 단체를 많이 맡을수록 한 단체에 쏟는 힘은 옅어진다
function sisterSpread() { return clamp(1.2 - 0.08 * sisterScope().length, 0.6, 1); }
function sisterEff() { return sisterPower() * sisterSpread(); }
function sisterInfluence() { const p = Game.state.pastor; return p && p.sister ? Math.round(p.sister.influence || 0) : 0; }
// 세력이 생겨 불화가 날 하루 확률
function factionChance() { const v = sisterInfluence(); return v > SISTER_SCOPE.riskAt ? clamp((v - SISTER_SCOPE.riskAt) / SISTER_SCOPE.riskDiv, 0, 0.35) : 0; }
function toggleSisterScope(type) { const p = Game.state.pastor; if (!p.sister) return; const s = sisterScope(), me = p.sister; if (!s.includes(type)) for (const o of sisters()) if (o !== me) o.scope = (o.scope || []).filter(t => t !== type); me.scope = s.includes(type) ? s.filter(t => t !== type) : s.concat(type); }
// 날마다: 맡은 단체를 돌보고, 영향력이 쌓이거나 가라앉는다. 영향력이 크면 세력 다툼
function sisterDaily(p) {
  const lines = [], sc = sisterScope(), t = sisterInfo();
  const groups = allGroups().filter(x => x.g.level >= 1 && sc.includes(x.g.type));
  for (const { g } of groups) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + Math.round(SISTER_SCOPE.vital * sisterEff()));
  if (groups.length) lines.push(`👩‍🦳 ${sisterTitle()}이 ${groups.length}개 단체에서 함께하셨어요.`);
  const grow = sc.length * SISTER_SCOPE.inf * (t.inf || 1) - (sc.length <= SISTER_SCOPE.quiet ? SISTER_SCOPE.decay : 0);
  p.sister.influence = clamp((p.sister.influence || 0) + grow, 0, 100);
  if (!p.event && groups.length && Math.random() < factionChance()) {
    const x = groups[Math.floor(Math.random() * groups.length)];
    p.factionAct = { type: x.g.type, sister: p.sister.name };
    p.event = 'sisterFaction';
    lines.push(`⚠️ ${UNITS[x.g.type].name}에서 수녀님을 따르는 교우들이 신부님 결정에 반대하고 나섰어요.`);
  }
  return lines;
}
function factionText() { const a0 = Game.state.pastor.factionAct, sis0 = a0 && sisterByName(a0.sister); return sis0 || (a0 && !a0.sister) ? withSister(sis0 || SIS_CTX, () => factionTextInner()) : ''; }
function factionTextInner() {
  const p = Game.state.pastor, a = p.factionAct;
  if (!a || !p.sister) return '';
  return `${UNITS[a.type].icon} ${UNITS[a.type].name} 임원들이 사제관에 찾아왔다. "신부님, 저희는 ${p.sister.name} 수녀님 말씀대로 하고 싶습니다. 수녀님이 더 잘 아세요." 단체 안에서 수녀님 편과 신부님 편이 갈리기 시작했다.<br><span class="muted">수녀님 영향력 ${sisterInfluence()} · 맡은 단체 ${sisterScope().length}개 · 영향력이 ${SISTER_SCOPE.riskAt}을 넘으면 이런 일이 생겨요</span>`;
}
function wrapSisterOpts(opts, name) { const sis = sisterByName(name); return opts.map(o => ({ ...o, ...(o.effect ? { effect() { const self = this; withSister(sis, () => o.effect.call(self)); } } : {}), ...(o.after ? { after: () => withSister(sis, o.after) } : {}) })); }
function factionOptions() { const a0 = Game.state.pastor.factionAct, sis0 = a0 && sisterByName(a0.sister); return sis0 || (a0 && !a0.sister) ? wrapSisterOpts(withSister(sis0 || SIS_CTX, () => factionOptionsInner()), a0.sister) : []; }
function factionOptionsInner() {
  const p = Game.state.pastor, a = p.factionAct;
  if (!a || !p.sister) return [];
  const u = UNITS[a.type].name, name = p.sister.name;
  const vital = (type, v) => { for (const { g } of allGroups()) if (g.type === type && g.level) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + v, 0, 100); };
  return [
    { label: '수녀님과 이야기해 활동 범위를 줄인다', effect() {
      const sc = sisterScope().filter(t => t !== a.type);
      p.sister.scope = sc.slice(0, Math.ceil(sc.length / 2)); p.sister.influence = Math.max(0, sisterInfluence() - 30); sisterBond(-8); vital(a.type, -5); p.factionAct = null;
      this.result = `"신부님 뜻이 그러시다면요." ${name} 수녀님은 ${u}에서 물러나고 맡은 단체도 줄였다. 서운한 기색이 역력했다 (영향력 −30 · 신뢰 −8 · ${u} 활력 −5)`;
    } },
    { label: `${u} 회의에 직접 들어가 마음을 모은다 ⚡3`, effect() {
      p.factionAct = null;
      if (Game.state.energy < 3) { this.result = '행동력이 모자라 회의에 가지 못했다. 갈등은 그대로 남았다.'; vital(a.type, -5); return; }
      spendEnergy(3);
      const odds = clamp(0.35 + Game.state.stats.rapport * 0.004 + (p.res.heart - 50) * 0.004, 0.15, 0.85);
      if (Math.random() < odds) { p.sister.influence = Math.max(0, sisterInfluence() - 15); addRes('heart', 1); vital(a.type, 5); this.result = `신부님이 임원 한 사람 한 사람의 이야기를 들었다. "결국 다 본당 잘되자는 마음이었네요." ${u}가 다시 하나가 됐다 (영향력 −15 · ❤️+1 · 활력 +5)`; }
      else { vital(a.type, -10); addRes('heart', -2); this.result = `회의는 언성만 높아진 채 끝났다. 몇몇은 "수녀님이 아니면 안 나오겠다"고 했다 (${u} 활력 −10 · ❤️−2)`; }
    } },
    { label: '수녀님 뜻을 따르게 둔다', effect() {
      p.sister.influence = Math.min(100, sisterInfluence() + 10); vital(a.type, 5);
      for (const { g } of allGroups()) if (g.level && g.type !== a.type) g.vital = Math.max(0, (g.vital === undefined ? 60 : g.vital) - 3);
      addRes('heart', -1); sisterBond(5); p.factionAct = null;
      this.result = `${u}는 수녀님을 중심으로 뭉쳤다. 다른 단체들은 "신부님보다 수녀님이 더 힘이 세다"며 수군거렸다 (영향력 +10 · 다른 단체 활력 −3 · ❤️−1)`;
    } },
  ];
}
function sisterInfo() { const p = Game.state.pastor; return p && p.sister ? SISTER_TYPES[p.sister.type] || SISTER_TYPES.gentle : null; }
// 수녀님 일솜씨: 성향의 능력 × 신부님과의 신뢰 (신뢰 60이면 1.05배)
function sisterPower() { const p = Game.state.pastor, t = sisterInfo(); return t ? t.power * (0.75 + (p.sister.bond === undefined ? 60 : p.sister.bond) / 200) : 0; }
function sisterTitle() { const p = Game.state.pastor, t = sisterInfo(); return t ? `${t.icon} ${p.sister.name || ''} 수녀님` : ''; }
// 수녀원으로 돌려보내기: 수녀원 평판이 떨어진다 (온 지 사흘 안이면 더)
function sendBackSister() {
  const p = Game.state.pastor;
  if (!p.sister) return null;
  const early = p.sister.day && (Date.now() - new Date(p.sister.day).getTime()) < 3 * 86400000;
  const loss = SISTER.sendBack + (early ? SISTER.sendBackEarly : 0);
  p.convent = clamp(conventRep() - loss, 0, 100);
  const name = p.sister.name || '', me = p.sister;
  p.sisters = p.sisters.filter(x => x !== me);
  if (p.event === 'sisterOver') { p.event = null; p.sisterAct = null; }
  addLog(`🚪 ${name} 수녀님을 수녀원으로 돌려보냈어요. 수녀원 평판 −${loss}`);
  return loss;
}
function sisterBond(v) { const p = Game.state.pastor; if (p.sister) p.sister.bond = clamp((p.sister.bond === undefined ? 60 : p.sister.bond) + v, 0, 100); }
function sisterLean(k) { const p = Game.state.pastor; if (p.sister) p.sister.lean = clamp((p.sister.lean || 1) * k, 0.3, 2); }

// 수녀님의 월권: 하루에 한 번 성향의 확률로, 단체 하나의 일을 혼자 정해 버린다
// 그대로 두면(묵인) 다음에 더 자주, 바로잡으면 덜 하지만 신뢰가 떨어진다
function sisterOverreachRoll(p) {
  const t = sisterInfo();
  if (!t || p.event) return null;
  if (Math.random() >= t.over * (p.sister.lean || 1)) return null;
  const groups = allGroups().filter(x => x.g.level >= 1 && UNITS[x.g.type]);
  if (!groups.length) return null;
  const x = groups[Math.floor(Math.random() * groups.length)];
  const list = SISTER_OVERREACH[t.kind];
  const idx = Math.floor(Math.random() * list.length);
  p.sisterAct = { sister: p.sister.name, kind: t.kind, idx, type: x.g.type, cost: list[idx].cost ? Math.round(scaledCost(list[idx].cost)) : 0 };
  p.event = 'sisterOver';
  return `👩‍🦳 ${sisterTitle()}이 ${UNITS[x.g.type].name} 일로 신부님을 찾아오셨어요.`;
}
// 월권 사건의 선택지 (PASTOR_EVENTS 'sisterOver'에서 쓴다)
function sisterOverOptions() { const a0 = Game.state.pastor.sisterAct, sis0 = a0 && sisterByName(a0.sister); return sis0 || (a0 && !a0.sister) ? wrapSisterOpts(withSister(sis0 || SIS_CTX, () => sisterOverOptionsInner()), a0.sister) : []; }
function sisterOverOptionsInner() {
  const p = Game.state.pastor, a = p.sisterAct;
  if (!a || !p.sister) return [];
  const o = SISTER_OVERREACH[a.kind][a.idx], u = UNITS[a.type].name, name = p.sister.name;
  const opts = [];
  // 그대로 맡긴다
  if (a.kind === 'cut') opts.push({ label: '수녀님 뜻대로 아끼게 둔다', other: { type: a.type, vital: -10 }, risk: `💰 이번 달 ${u} 살림비 ${a.cost}만 원을 아껴요 · 수녀님이 다음에 더 자주 나서요`, after: () => { addRes('offering', a.cost); sisterBond(8); sisterLean(1.25); }, result: `${name} 수녀님이 흡족해하셨다. ${u}는 조금 위축됐다.` });
  else opts.push({ label: '그대로 맡겨 둔다', res: { ...(a.cost ? { offering: -a.cost } : {}), heart: 2 }, other: { type: a.type, vital: o.vital || 12 }, risk: '수녀님이 다음에 더 자주 혼자 정하실 수 있어요', after: () => { if (a.cost) book(a.type, 'event', a.cost); sisterBond(8); sisterLean(1.25); }, result: `${name} 수녀님이 활짝 웃으셨다. ${u}는 수녀님 덕분에 들떴다.` });
  // 함께 다시 의논한다
  opts.push({ label: '수녀님과 함께 다시 의논한다', energy: 3, ...(a.cost && a.kind !== 'cut' ? { res: { offering: -Math.round(a.cost / 2) } } : {}), other: { type: a.type, vital: a.kind === 'cut' ? -3 : Math.round((o.vital || 12) / 2) }, risk: a.kind === 'cut' ? `💰 ${Math.round(a.cost / 2)}만 원만 아껴요` : null, after: () => { if (a.kind === 'cut') addRes('offering', Math.round(a.cost / 2)); else if (a.cost) book(a.type, 'event', Math.round(a.cost / 2)); sisterBond(3); sisterLean(0.85); }, result: `"신부님 말씀도 맞네요." ${name} 수녀님과 반씩 양보해 정했다.` });
  // 바로잡는다
  opts.push({ label: '월권이라고 분명히 바로잡는다', other: { type: a.type, vital: -5 }, risk: '수녀님과의 신뢰가 크게 떨어져요 (일솜씨도 줄어요) · 대신 한동안 덜 나서세요', after: () => { sisterBond(-15); sisterLean(0.6); }, result: `${name} 수녀님이 굳은 얼굴로 "알겠습니다, 신부님." 하고 물러나셨다. ${u}는 갑자기 바뀐 결정에 어리둥절했다.` });
  return opts;
}
// 교구 행사 동원: 보내야 할 인원 = 신자 수의 일정 비율. 동원력이 높을수록 채울 확률이 높다
const DIO_CALL_CHANCE = 0.08;
function dioCallWant() { const p = Game.state.pastor, c = DIO_CALLS[p.dioCall || 0]; return Math.max(5, Math.round(p.res.members * c.rate)); }
function dioCallOdds(push) { return clamp(mobilization() * (push ? 1.15 : 0.85), 0.05, 0.95); }
function dioCallText() {
  const p = Game.state.pastor, c = DIO_CALLS[p.dioCall || 0];
  return `${c.text} 본당에 배정된 인원은 <b>${dioCallWant()}명</b>이다. 지금 교우들의 동원력은 <b>${Math.round(mobilization() * 100)}%</b> (${mobilizationLabel()})이다. 교우들의 마음과 신부님의 친화력이 높을수록 많이 나와 준다.`;
}
function dioCallOptions() {
  const p = Game.state.pastor, c = DIO_CALLS[p.dioCall || 0], want = dioCallWant();
  return [
    { label: '주일 공지하고 단체장들에게 직접 부탁한다', energy: 3, chance: { p: () => dioCallOdds(true), why: '교우들의 마음과 친화력이 높을수록', win: { res: { reputation: 2, heart: 1 }, trust: 3, result: `${want}명이 넘게 모였다. 교구청에서 "솔뫼 본당 교우들 대단하네요" 하고 칭찬이 왔다.` }, lose: { trust: -2, res: { heart: -1 }, result: `몇 명밖에 모이지 않았다. 교구 담당 신부님이 "다음엔 좀 더 부탁드려요" 하고 전화했다.` } } },
    { label: '공지만 하고 오는 대로 보낸다', chance: { p: () => dioCallOdds(false), why: '교우들의 마음과 친화력이 높을수록', win: { trust: 2, res: { reputation: 1 }, result: '공지만 했는데도 교우들이 알아서 모여 버스 한 대를 채웠다.' }, lose: { trust: -2, result: '빈자리가 많은 버스가 떠났다. 교구 명단에 솔뫼 본당은 몇 줄뿐이었다.' } } },
    { label: '본당 사정이 어렵다고 정중히 사양한다', trust: -1, result: `${c.name}에 이번에는 함께하지 못했다.` },
  ];
}

function sisterOverText() { const a0 = Game.state.pastor.sisterAct, sis0 = a0 && sisterByName(a0.sister); return sis0 || (a0 && !a0.sister) ? withSister(sis0 || SIS_CTX, () => sisterOverTextInner()) : ''; }
function sisterOverTextInner() {
  const p = Game.state.pastor, a = p.sisterAct;
  if (!a || !p.sister) return '';
  const o = SISTER_OVERREACH[a.kind][a.idx];
  return `${sisterTitle()} (${SISTER_TYPES[p.sister.type].name} 성향): ${o.text.replace(/\{u\}/g, UNITS[a.type].name).replace(/\{c\}/g, a.cost)}`;
}

// (시뮬레이션용) 사무원 한 명을 바로 뽑는다
function teamBlocker() { return crewOf('clerk').length >= clerkCap() ? '자리가 없어요' : gems() < CREW_ROLES.clerk.gems ? '다이아가 모자라요' : null; }
function addTeam() {
  const p = Game.state.pastor;
  if (teamBlocker()) return false;
  addGems(-CREW_ROLES.clerk.gems);
  crew().push({ name: STAFF_NAMES[crew().length % STAFF_NAMES.length], role: 'clerk', skill: 3, diligence: 3, faith: 3, wage: CREW_ROLES.clerk.wage, since: p.week });
  syncTeams();
  return true;
}

// 정해진 시간에 단체 회의 참석 (하루 한 번). 공소는 room 없이 언제나
function attendMeeting(key, room) {
  const p = Game.state.pastor, site = p.sites[key];
  const isGongso = site && site.kind === 'gongso';
  if (Game.state.energy < 2) return null;
  if (isGongso) {
    if (site.level < 1) return null;
    spendEnergy(2);
    const msg = GONGSO.meet(effL(site.level));
    addLog(`✝️ 공소 방문: ${msg}`);
    return msg;
  }
  const ms = meetingState(key, room);
  if (ms !== 'open' && ms !== 'invite') return null;
  const g = site.rooms[room], def = UNITS[g.type], invited = ms === 'invite';
  spendEnergy(2);
  p.daily.attended[groupId(key, room)] = true;
  // 주임 신부가 직접 오면 강복과 훈화: 수녀님이 대신 들어갈 때(활력만)보다 혜택이 크다
  g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + (invited ? MEET_INVITE_VITAL : 30) + (sisterIn(g.type) ? 5 : 0));
  const bh = addRes('heart', 1), br = gain('rapport', 0.5);
  let msg = `${invited ? '💌 위원장의 초대로 회의에 들어가 ' : '🙏 '}강복을 주고 훈화를 했어요 · ${def.meet(effL(g.level))}, 마음 ${fmt(bh)}, 친화력 ${fmt(br)}, 활력 ${Math.floor(g.vital)}${sisterIn(g.type) ? ' (수녀님과 함께해 +5)' : ''}`;
  if (Math.random() < LUCK.volunteerAtMeeting) msg += ` · 🍀 회의에서 새 봉사자가 손을 들었어요! 신자 ${fmt(addRes('members', 2))}, 마음 ${fmt(addRes('heart', 1))}`;
  if (!p.daily.allDone && pastorMeetings().every(x => p.daily.attended[groupId(x.key, x.room)])) {
    p.daily.allDone = true;
    const h = addRes('heart', 3);
    msg += ` · 오늘의 회의를 모두 마쳤어요! 마음 ${fmt(h)}`;
  }
  addLog(`${def.icon} ${def.name} 회의: ${msg}`);
  return msg;
}

// 상임위원회: 하루 한 번 회의를 열고, 올라온 건의사항을 처리한다
const COMMITTEE_COST = 3;
function committeeCost() { return hasPerk('council3') ? 2 : COMMITTEE_COST; }

// 상임위원회: 위원장이 일정 수(3명) 이상 세워지면 열린다
function committeeUnlocked() { return Game.state.pastor && chairsCount() >= COMMITTEE_CHAIRS; }

function openCommitteeToday() {
  const s = Game.state, p = s.pastor;
  if (p.daily.committee || s.energy < committeeCost()) return false;
  spendEnergy(committeeCost());
  p.daily.committee = true;
  gain('admin', 1.5);
  return true;
}

// 건의 선택지의 실제 비용과 효과 (봉헌금은 본당 규모에 맞춰 커진다)
function agendaCost(o) { return o.cost ? scaledCost(o.cost) : 0; }
function agendaBlocker(o) {
  if (o.cost && Game.state.pastor.res.offering < agendaCost(o)) return '봉헌금이 모자라요';
  if (o.energy && Game.state.energy < o.energy) return '행동력이 모자라요';
  return '';
}

const RES_ICON = { members: '👥', heart: '❤️', reputation: '🌏', offering: '💰' };
const STAT_NAME = { rapport: '친화력', homily: '강론력', admin: '행정', spirit: '영성', doctrine: '교리' };
function agendaEffectText(o, type) {
  const parts = [];
  for (const [k, v] of Object.entries(o.res || {})) parts.push(`${RES_ICON[k]}${fmt(v)}`);
  if (o.vital) parts.push(`${UNITS[type].name} 활력 ${fmt(o.vital)}`);
  if (o.other) parts.push(`${UNITS[o.other.type].name} 활력 ${fmt(o.other.vital)}`);
  for (const [k, v] of Object.entries(o.stat || {})) parts.push(`${STAT_NAME[k]} ↑`);
  return parts.join(' · ');
}

// 사건·건의 선택지의 얻는 것과 잃는 것 (화면에 보여 줄 HTML)
const HIDDEN_NAME = { holiness: '✝️ 성덕', ambition: '⚠️ 야망' };
function choiceEffectHtml(o, type) {
  const gain = [], loss = [];
  const put = (good, text) => (good ? gain : loss).push(text);
  if (o.cost) loss.push(`💰−${scaledCost(o.cost)}`);
  if (o.energy) loss.push(`⚡−${o.energy}`);
  for (const [k, v] of Object.entries(o.res || {})) put(v > 0, `${RES_ICON[k]}${k === 'offering' && v > 0 ? '+' + scaledCost(v) : fmt(v)}`);
  if (o.vital && type) put(o.vital > 0, `${UNITS[type].name} 활력 ${fmt(o.vital)}`);
  if (o.other) put(o.other.vital > 0, `${UNITS[o.other.type].name} 활력 ${fmt(o.other.vital)}`);
  for (const k of Object.keys(o.stat || {})) gain.push(`${STAT_NAME[k]} ↑`);
  if (o.cate) put(o.cate > 0, `📘 예비신자 ${fmt(o.cate)}`);
  if (o.cateQ) put(o.cateQ > 0, `📖 교리 준비 ${fmt(o.cateQ)}`);
  for (const [k, v] of Object.entries(o.hidden || {})) put(k === 'holiness' ? v > 0 : v < 0, `${HIDDEN_NAME[k]} ${v > 0 ? '↑' : '↓'}`);
  if (o.trust) put(o.trust > 0, `🏛️ 교구 신뢰 ${fmt(o.trust)}`);
  const out = [];
  if (gain.length) out.push(`<span class="gain">얻음 ${gain.join(' · ')}</span>`);
  if (loss.length) out.push(`<span class="loss">잃음 ${loss.join(' · ')}</span>`);
  if (o.risk) out.push(`<span class="loss">⚠️ ${typeof o.risk === 'function' ? o.risk() : o.risk}</span>`);
  if (o.chance) {
    const pw = chanceP(o.chance), pc = v => Math.round(v * 100);
    const part = (x, good) => { const t = choiceEffectHtml({ res: x.res, hidden: x.hidden, trust: x.trust }).replace(/<br>/g, ' '); return t; };
    out.push(`🎲 <b>${pc(pw)}%</b> ${part(o.chance.win)}${o.chance.why ? ` <span class="muted">(${o.chance.why} 확률이 올라가요)</span>` : ''}`);
    out.push(`🎲 <b>${pc(1 - pw)}%</b> ${part(o.chance.lose)}`);
  }
  return out.join('<br>') || '<span class="muted">달라지는 것 없음</span>';
}

function chanceP(c) { return typeof c.p === 'function' ? c.p() : c.p; }

function choiceBlocker(o) {
  if (o.cost && Game.state.pastor.res.offering < scaledCost(o.cost)) return '봉헌금이 모자라요';
  if (o.energy && Game.state.energy < o.energy) return '행동력이 모자라요';
  return '';
}

// 사건 선택지 적용
function applyChoice(o) {
  const p = Game.state.pastor;
  if (o.cost) p.res.offering -= scaledCost(o.cost);
  if (o.energy) spendEnergy(o.energy);
  for (const [k, v] of Object.entries(o.res || {})) addRes(k, k === 'offering' && v > 0 ? scaledCost(v) : v);
  for (const [k, v] of Object.entries(o.hidden || {})) addHidden(k, v);
  for (const [k, v] of Object.entries(o.stat || {})) gain(k, v);
  if (o.trust) p.trust = clamp((p.trust || 50) + o.trust, 0, 100);
  if (o.cate) cateState().n += o.cate; // 늦게 온 사람은 자리가 꽉 차도 받는다
  if (o.cateQ) addCateQuality(o.cateQ);
  if (o.other) for (const { g } of allGroups()) if (g.type === o.other.type && g.level) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + o.other.vital, 0, 100);
  if (o.after) o.after();
  // 운에 따라 갈리는 결과: 결과 글을 돌려준다
  if (o.chance) {
    const out = Math.random() < chanceP(o.chance) ? o.chance.win : o.chance.lose;
    applyChoice({ res: out.res, hidden: out.hidden, trust: out.trust });
    return out.result;
  }
  return o.result;
}

function resolveAgenda(i, optIdx) {
  const p = Game.state.pastor, a = p.agenda[i];
  if (!a || !p.daily.committee) return null;
  const o = AGENDAS[a.type][a.idx].options[optIdx];
  if (agendaBlocker(o)) return null;
  if (o.cost) { p.res.offering -= agendaCost(o); book(a.type, 'agenda', agendaCost(o)); }
  if (o.energy) spendEnergy(o.energy);
  for (const [k, v] of Object.entries(o.res || {})) addRes(k, v);
  for (const [k, v] of Object.entries(o.hidden || {})) addHidden(k, v);
  for (const [k, v] of Object.entries(o.stat || {})) gain(k, v);
  const g = p.sites[a.key] && p.sites[a.key].rooms[a.room];
  if (g && o.vital) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + o.vital * (hasPerk('council6') && o.vital > 0 ? 1.5 : 1), 0, 100);
  if (o.after) o.after();
  if (o.other) for (const { g: og } of allGroups()) if (og.type === o.other.type && og.level) og.vital = clamp((og.vital === undefined ? 60 : og.vital) + o.other.vital, 0, 100);
  p.agenda.splice(i, 1);
  addLog(`📨 상임위 (${UNITS[a.type].name}): ${o.result}`);
  const eff = agendaEffectText(o, a.type);
  return `${o.result}${eff ? ` (${eff})` : ''}`;
}

// ---------- 주일미사·건축헌금 ----------

function sundayIntervalMs() { return SUNDAY_HOURS * 3600000 / timeScale(); }
function sundayReady() { return Date.now() - Game.state.pastor.lastSunday >= sundayIntervalMs() && !isAway(); }

// ---------- 축복 예식 (v0.76) ----------
function blessReqs() { const p = Game.state.pastor; return p.bless || (p.bless = []); }
function blessDayMs() { return sundayIntervalMs() / 7; }
// 시간이 흐르면 축복을 청하는 연락이 온다 (신부님이 본당을 비우면 오지 않는다). 기한이 지나면 사라진다
function blessTick(now, hours, lines) {
  const p = Game.state.pastor, list = blessReqs();
  for (let i = list.length - 1; i >= 0; i--) if (now >= list[i].until) {
    const b = BLESSINGS.find(x => x.id === list[i].kind);
    if (b.urgent) { addRes('heart', -1); lines.push(`🕊️ ${list[i].who}의 병자성사 청을 제때 가지 못했어요 · 마음 −1`); }
    list.splice(i, 1);
  }
  // 안내(튜토리얼)를 마친 뒤부터 (안내 중에는 위쪽에 하나만 보여서 놓치기 쉽다)
  const tutoring = p.tutorial && typeof TUTORIAL !== 'undefined' && p.tutorial.step < TUTORIAL.length;
  if (!p.week || tutoring || isAway(now) || list.length >= BLESS.max || hours <= 0) return;
  const lambda = BLESS.rate * (1 + p.res.members / 400) * hours;
  if (Math.random() >= 1 - Math.exp(-lambda)) return;
  const pool = BLESSINGS.flatMap(b => Array(b.weight).fill(b)), b = pick(pool);
  const req = { kind: b.id, who: pick(b.who), why: pick(b.why), until: now + b.days * blessDayMs() };
  list.push(req);
  lines.push(`${b.icon} ${req.who}에서 ${req.why} ${b.name}를 청했어요`);
}
// 감사 봉헌: 정한 범위에서, 본당 살림이 커지면 함께 커진다
function blessGift(b) { const g = b.gift[0] + Math.random() * (b.gift[1] - b.gift[0]); return g ? Math.round(g * Math.max(1, Math.sqrt(parishRates().gross / 6))) : 0; }
function blessBlocker(i) {
  const r = blessReqs()[i], b = r && BLESSINGS.find(x => x.id === r.kind);
  if (!r) return '이미 끝난 일이에요';
  if (isAway()) return `${awayDef().name} 중이에요`;
  if (Game.state.energy < b.energy) return '행동력이 모자라요';
  return null;
}
function doBlessing(i) {
  if (blessBlocker(i)) return null;
  const list = blessReqs(), r = list[i], b = BLESSINGS.find(x => x.id === r.kind), p = Game.state.pastor;
  spendEnergy(b.energy);
  list.splice(i, 1);
  const parts = [];
  const gift = addRes('offering', blessGift(b) * (1 + Game.state.stats.rapport / 200));
  if (gift >= 1) { parts.push(`감사 봉헌 💰${Math.round(gift)}`); p.weekIncome = (p.weekIncome || 0) + gift; }
  if (b.heart) parts.push(`❤️ ${fmt(addRes('heart', b.heart))}`);
  if (b.rep) parts.push(`🌏 ${fmt(addRes('reputation', b.rep))}`);
  parts.push(`영성 ${fmt(gain('spirit', 1))}`);
  const text = pick(b.done);
  addLog(`${b.icon} ${r.who} ${b.name} · ${parts.join(' · ')}`);
  return { title: `${b.icon} ${b.name}`, text, eff: parts.join(' · ') };
}
function declineBlessing(i) { const r = blessReqs()[i]; if (!r) return; blessReqs().splice(i, 1); addRes('heart', -0.5); }
// 미사 뒤 찾아온 교우 (직접 미사를 드렸을 때만)
function rollAfterMass() { return Math.random() < BLESS.afterMass ? { ...pick(AFTER_MASS), line: null } : null; }
function doAfterMass(a) {
  const s = Game.state;
  if (s.energy < a.energy) return null;
  spendEnergy(a.energy);
  const parts = [`❤️ ${fmt(addRes('heart', a.heart))}`, `친화력 ${fmt(gain('rapport', a.rapport))}`];
  const g = blessGift(a);
  if (g) { const d = addRes('offering', g); if (d >= 1) parts.push(`감사 봉헌 💰${Math.round(d)}`); }
  addLog(`${a.icon} 미사 뒤 ${a.name} · ${parts.join(' · ')}`);
  return parts.join(' · ');
}

// ---------- 한 주 전례·피정·휴가·연수 (v0.75) ----------
function youthMassReady() { return allGroups().some(x => (x.g.type === 'youth' || x.g.type === 'school2') && x.g.level); }
function massTimeName(i) { return i === 1 && youthMassReady() ? '토요일 저녁 7시 30분 중고등부·청년 미사' : MASS_TIMES[i].name; }
function litState() { const p = Game.state.pastor; return p.lit || (p.lit = { open: {}, done: {} }); }
// 오늘이 무슨 요일인지: 지난 주일미사부터 다음 주일까지를 월~토 여섯 날로 나눈다 (주일이 되면 0)
function weekDay(now = Date.now()) {
  const p = Game.state.pastor, f = (now - p.lastSunday) / sundayIntervalMs();
  return f >= 1 ? 0 : Math.min(6, 1 + Math.floor(f * 6));
}
function isFirstWeek() { return Game.state.pastor.week % 4 === 0; }
function litApplies(l) {
  const st = litState();
  if (!st.open[l.id]) return false;
  if (l.first && !isFirstWeek()) return false;
  if (l.group && !allGroups().some(x => x.g.type === l.group && x.g.level)) return false;
  return true;
}
function litDoneKey(l) { return `${Game.state.pastor.week}:${l.id}`; }
function todayLits() { const d = weekDay(); return isAway() ? [] : LITURGIES.filter(l => l.day === d && litApplies(l) && !litState().done[litDoneKey(l)]); }
function litOpenBlocker(id) {
  const l = LITURGIES.find(x => x.id === id), p = Game.state.pastor;
  if (litState().open[id]) return '이미 드리고 있어요';
  if (p.fixed.church < l.church) return `성당 Lv${l.church}부터 열 수 있어요`;
  if (l.need && !litState().open[l.need]) return `${LITURGIES.find(x => x.id === l.need).name}를 먼저 열어야 해요`;
  if (p.res.offering < scaledCost(l.cost)) return `봉헌금 ${scaledCost(l.cost)}만 원이 필요해요`;
  return null;
}
function openLiturgy(id) {
  if (litOpenBlocker(id)) return null;
  const l = LITURGIES.find(x => x.id === id), p = Game.state.pastor, c = scaledCost(l.cost);
  p.res.offering -= c; book(null, 'mass', c);
  litState().open[id] = true;
  const msg = `${l.icon} ${l.name}(${WEEK_DAYS[l.day]} ${l.time})를 새로 열었어요. 주보에 실어 교우들에게 알렸어요`;
  addLog(msg);
  return msg;
}
function closeLiturgy(id) { delete litState().open[id]; }
function bumpVital(type, v) { for (const { g } of allGroups()) if (g.type === type && g.level) g.vital = Math.min(100, (g.vital === undefined ? 60 : g.vital) + v); }
// 전례 하나의 효과. manual: 신부님이 직접 집전 (몇 배)
function litEffect(l, manual) {
  const s = Game.state, p = s.pastor, k = manual ? LIT_MANUAL : 1, parts = [];
  const add = (key, v, label) => { const d = addRes(key, v); if (Math.abs(d) >= 0.05) parts.push(`${label} ${fmt(d)}`); return d; };
  if (l.kind === 'mass') {
    const att = Math.max(3, p.res.members * 0.06);
    add('heart', 0.3 * k, '❤️'); add('members', 0.25 * k, '👥');
    const o = add('offering', att * 0.05 * (manual ? 1.4 : 1), '💰'); p.weekIncome = (p.weekIncome || 0) + o;
    if (manual) parts.push(`영성 ${fmt(gain('spirit', 1))}`);
  } else if (l.kind === 'sick') {
    add('heart', 0.8 * k, '❤️'); bumpVital('elders', 5 * k);
    if (manual) parts.push(`친화력 ${fmt(gain('rapport', 1))}`);
  } else if (l.kind === 'hour') {
    add('heart', 0.3 * k, '❤️'); bumpVital('eucharist', 5 * k); bumpVital('prayer', 4 * k);
    if (manual) parts.push(`영성 ${fmt(gain('spirit', 3))}`);
  } else if (l.kind === 'marian') {
    add('heart', 0.5 * k, '❤️'); bumpVital('legio', 6 * k); bumpVital('mothers', 4 * k);
    if (manual) parts.push(`영성 ${fmt(gain('spirit', 1))}`);
  } else if (l.kind === 'kids') {
    add('members', 0.3 * k, '👥'); bumpVital('school', 6 * k);
    if (manual) parts.push(`친화력 ${fmt(gain('rapport', 1))}`);
  }
  return parts.join(' · ');
}
function litBlocker(id) {
  const l = LITURGIES.find(x => x.id === id);
  if (isAway()) return `${awayDef().name} 중이라 미사가 없어요`;
  if (!todayLits().includes(l)) return '오늘 드리는 전례가 아니에요';
  if (Game.state.energy < l.energy) return '행동력이 모자라요';
  return null;
}
// 그날 직접 집전
function doLiturgy(id) {
  if (litBlocker(id)) return null;
  const l = LITURGIES.find(x => x.id === id);
  spendEnergy(l.energy);
  litState().done[litDoneKey(l)] = 'manual';
  const msg = `${l.icon} ${l.name}를 직접 집전했어요 · ${litEffect(l, true)}`;
  addLog(msg);
  return msg;
}
// 한 주가 끝날 때: 직접 가지 못한 전례는 저절로 드려진 것으로 (신부님이 본당을 비운 주는 미사가 없다)
function settleWeekLiturgy() {
  const p = Game.state.pastor, st = litState();
  let n = 0, skipped = 0;
  for (const l of LITURGIES) {
    if (!litApplies(l) || st.done[litDoneKey(l)]) continue;
    if (p.awayTouched === p.week) { skipped++; continue; }
    litEffect(l, false); n++;
  }
  for (const k of Object.keys(st.done)) if (+k.split(':')[0] < p.week - 1) delete st.done[k];
  const lines = [];
  if (n) lines.push(`🗓️ 이번 주 평일 전례 ${n}번이 정해진 시간에 드려졌어요`);
  if (skipped) lines.push(`🗓️ 신부님이 본당을 비워 평일 전례 ${skipped}번이 없었어요`);
  return lines;
}
// 피정·휴가·연수
function isAway(now = Date.now()) { const p = Game.state.pastor; return !!(p && p.away && now < p.away.until); }
function awayDef() { const p = Game.state.pastor; return AWAY[(p.away || p.awayPlan || {}).kind] || AWAY.retreat; }
function awayDayMs() { return sundayIntervalMs() / 7; }
function awayUsed(kind) { const p = Game.state.pastor, y = calYear(p.week); return ((p.awayYears || {})[`${y}:${kind}`]) || 0; }
function awayPlanBlocker(kind) {
  const p = Game.state.pastor, a = AWAY[kind];
  if (isAway()) return `${awayDef().name} 중이에요`;
  if (p.awayPlan) return `이미 주보에 ${AWAY[p.awayPlan.kind].name}를 공지했어요`;
  if (awayUsed(kind) >= a.perYear) return `올해 ${a.name}는 다 다녀왔어요 (한 해 ${a.perYear}번)`;
  return null;
}
// 주보 공지: 다음 주일미사 뒤에 떠난다
function planAway(kind) {
  if (awayPlanBlocker(kind)) return null;
  const p = Game.state.pastor, a = AWAY[kind];
  p.awayPlan = { kind, week: p.week + 1 };
  const msg = `📰 주보에 공지했어요: 다음 주일미사 뒤 신부님이 ${a.days}일 동안 ${a.name}를 떠나요. 그동안 본당에 미사가 없어요`;
  addLog(msg);
  return msg;
}
function cancelAwayPlan() { const p = Game.state.pastor; if (!p.awayPlan) return null; const a = AWAY[p.awayPlan.kind]; p.awayPlan = null; return `📰 ${a.name} 공지를 거두었어요`; }
function startAway(kind, from = Date.now()) {
  const p = Game.state.pastor, a = AWAY[kind];
  p.away = { kind, from, until: from + a.days * awayDayMs() };
  p.awayTouched = p.week;
  if (a.perYear) { p.awayYears = p.awayYears || {}; const key = `${calYear(p.week)}:${kind}`; p.awayYears[key] = (p.awayYears[key] || 0) + 1; }
  addLog(`${a.icon} 신부님이 ${a.name}를 떠났어요 (${a.days}일). 그동안 본당에 미사가 없어요`);
  return `${a.icon} 신부님이 ${a.name}를 떠났어요 (${a.days}일 · 미사 없음)`;
}
function finishAway() {
  const s = Game.state, p = s.pastor, kind = p.away.kind, a = AWAY[kind];
  p.away = null;
  let eff;
  if (kind === 'retreat') eff = `영성 ${fmt(gain('spirit', 15))} · 강론력 ${fmt(gain('homily', 2))}`;
  else if (kind === 'vacation') eff = `영성 ${fmt(gain('spirit', 6))} · 친화력 ${fmt(gain('rapport', 2))}`;
  else { p.trust = Math.min(100, (p.trust || 50) + 3); eff = `교구 신뢰 +3 · 교리 ${fmt(gain('doctrine', 2))} · 행정 ${fmt(gain('admin', 2))}`; }
  s.energy = Math.max(s.energy, s.energyMax);
  const msg = `${a.icon} ${a.name}를 마치고 본당에 돌아왔어요 · ${eff} · 행동력 가득`;
  addLog(msg);
  return msg;
}
function trainingNow(w) { const m = (Math.floor(w / 4) + 2) % 12 + 1; return TRAININGS.find(t => t.month === m && t.week === w % 4) || null; }
function nextTrainingText() {
  const w0 = Game.state.pastor.week;
  for (let n = 0; n < 52; n++) { const t = trainingNow(w0 + n); if (t) return n ? `${t.name}: ${n}주일 뒤` : `${t.name}: 이번 주`; }
  return '';
}
// 주일이 지나면: 공지한 피정·휴가나 교구 연수가 이번 주라면 떠난다
function awayAfterSunday(from) {
  const p = Game.state.pastor;
  if (isAway(from)) { p.awayTouched = p.week; return null; }
  if (p.awayPlan && p.week >= p.awayPlan.week) { const k = p.awayPlan.kind; p.awayPlan = null; return startAway(k, from); }
  const t = trainingNow(p.week);
  if (t && p.trainedWeek !== p.week) { p.trainedWeek = p.week; return startAway('training', from); }
  return null;
}
// 게임을 꺼 두어도: 주일이 되고 하루가 지나도록 신부님이 오지 않으면 미사는 정해진 시간에 저절로 드려진다
function autoSundays(now) {
  const p = Game.state.pastor, iv = sundayIntervalMs(), lines = [];
  // 첫 주일미사는 신부님이 직접 (안내 단계). 아주 오래 비웠으면 몇 주만 셈하고 나머지는 건너뛴다
  if (!p.week || !p.lastSunday) return lines;
  const maxWeeks = Math.ceil(idleCapHours() * 3600000 / timeScale() / iv);
  if ((now - p.lastSunday) / iv > maxWeeks + 1) p.lastSunday = now - iv * (maxWeeks + 1);
  let n = 0;
  while (now - p.lastSunday >= iv * (1 + SUNDAY_AUTO.grace) && n < maxWeeks + 1) {
    n++;
    const at = p.lastSunday + iv;
    if (isAway(at)) {
      lines.push(...settleWeekLiturgy());
      p.week++; p.lastSunday = at; p.prep = 0;
      lines.push(`${awayDef().icon} 신부님이 ${awayDef().name} 중이라 주일미사가 없었어요`);
      const m = awayAfterSunday(at); if (m) lines.push(m);
      continue;
    }
    const r = doSunday({ auto: true, at });
    lines.push(`⛪ 주일미사가 정해진 시간에 드려졌어요 · 참례 ${r.attendees}명 · 봉헌 💰${r.collection}${r.away ? ` · ${r.away}` : ''}`);
    lines.push(...r.award);
  }
  if (p.away && now >= p.away.until) lines.push(finishAway());
  return lines;
}
function sundayLeftSec() { return Math.max(0, Math.ceil((Game.state.pastor.lastSunday + sundayIntervalMs() - Date.now()) / 1000)); }

// 주일미사 참례율: 등록 신자 중 실제로 미사에 나오는 비율. 강론력·평판·마음, 그리고 지난 강론의 소문에 따라 달라진다
function attendanceRate() {
  const s = Game.state, p = s.pastor, r = p.res;
  return clamp(0.2 + s.stats.homily * 0.003 + r.reputation * 0.003 + r.heart * 0.002 + (p.homilyMood || 0) + unitLevels('altar') * 0.01 + (hasChair('liturgy') ? 0.03 : 0) + (hasChair('smallCom') ? 0.03 : 0) + (hasChair('jebungwa') ? 0.02 : 0) + unitLevels('eucharist') * 0.005 + unitLevels('lector') * 0.005 + unitLevels('christopher') * 0.01 + (shuttleOn() ? SHUTTLE.attend : 0) + Math.min(0.06, decorBonus('attend')) + dirMod('attend') + MASSES.attend * (massCount() - 1) + (Game.state.pastor && Game.state.pastor.week !== undefined ? massBonus().attend : 0), 0.15, 0.95);
}
function expectedAttendance() { return Math.round(Game.state.pastor.res.members * attendanceRate()); }

// 주일 강론에 들어가는 준비: 강론 준비 + 성가대 (성가대 Lv3 능력이면 더)
function sundayPrep() { return Game.state.pastor.prep + unitLevels('choir') * 3 / 8 * (hasPerk('organ3') ? 1.1 : 1) + unitLevels('organ') * 0.25 + (hasPerk('lector6') ? 0.25 : 0) + (hasPerk('choir3') ? 0.75 : 0) + (altarCare() >= 3 ? 0.5 : 0) + (Game.state.pastor.confessPrep || 0); }

// ---------- 조경과 청소 ----------
function decorList() { return Object.values(Game.state.pastor.decor || {}); }
function decorHas(kind) { return decorList().some(d => d.kind === kind); }
// 조경이 주는 마음·평판 목표 (같은 것은 두 번째부터 절반)
function decorBonus(key) {
  const seen = {};
  const f = FENCE_LEVELS[Game.state.pastor.fence || 0];
  return decorList().reduce((a, d) => { const def = DECOR[d.kind], k = seen[d.kind] = (seen[d.kind] || 0) + 1; return a + (def[key] || 0) * (k > 1 ? 0.5 : 1); }, 0) + (f && f[key] || 0);
}
// ---------- 건물 돌리기 (v0.71) ----------
// 놓은 건물(교리실·공소·조경): 다음 방향 중 놓을 수 있는 첫 방향으로. 성당·사제관·사무실은 제자리에서 앞뒤로만(정사각형이면 네 방향)
function rotateThing(id) {
  const p = Game.state.pastor, m = MAPS.solmoe, fixed = m.fixed.find(f => f.id === id);
  if (fixed) {
    p.rot = p.rot || {};
    const cur = p.rot[id] || 0, step = fixed.w === fixed.d ? 1 : 2;
    p.rot[id] = (cur + step) % 4;
    return `↻ ${localize(fixed.label)}의 방향을 돌렸어요`;
  }
  const st = p.sites[id] || (p.decor || {})[id];
  if (!st || st.x === undefined) return null;
  const cur = st.rot || 0;
  for (let k = 1; k < 4; k++) {
    const r = (cur + k) % 4;
    if (m.canPlace(st.kind, st.x, st.y, r, st).ok) { st.rot = r; return '↻ 방향을 돌렸어요'; }
  }
  return '↻ 옆이 막혀서 돌릴 수 없어요. 둘레를 비우거나 다른 자리로 옮겨 보세요';
}
function canRotate(id) {
  const p = Game.state.pastor, m = MAPS.solmoe;
  if (interiorParish()) return false;
  return !!(m.fixed.find(f => f.id === id) || (p.sites[id] && p.sites[id].x !== undefined) || (p.decor && p.decor[id]));
}

// ---------- 본당 부지·울타리 (v0.70) ----------
const ALL_LOTS = Object.fromEntries(LOTS.map(l => [l.id, true]));
// 성전 안 본당(도심)은 바깥이 꾸밈이라 땅을 모두 가진 것으로 친다
function lotsOwned() { const p = Game.state.pastor; return parishDef().interior ? ALL_LOTS : p.lots || (p.lots = { home: true }); }
function lotAt(x, y) { return LOTS.find(l => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h) || null; }
// 이 칸이 본당 땅인지: 마을·이웃 동네는 따로 다루고(null), 본당 부지는 산 구획만
function lotOwnedAt(x, y) { const l = lotAt(x, y); return !l || !!lotsOwned()[l.id]; }
// 땅값은 LOTS에 적힌 고정값 (성당에서 멀수록 비싸다, js/data.js LOTS 위 설명)
function lotCost(l) { return l.cost; }
function lotBlocker(id) {
  const l = LOTS.find(x => x.id === id), p = Game.state.pastor;
  if (lotsOwned()[id]) return '이미 산 땅이에요';
  if (l.village && villageOpen(id)) return '이미 열린 마을이에요';
  if (p.fixed.church < l.church) return `성당 Lv${l.church}부터 살 수 있어요`;
  if (p.res.offering < lotCost(l)) return `봉헌금 ${lotCost(l)}만 원이 필요해요`;
  return null;
}
function buyLot(id) {
  if (lotBlocker(id)) return null;
  const l = LOTS.find(x => x.id === id), p = Game.state.pastor, cost = lotCost(l);
  p.res.offering -= cost; book(null, 'building', cost);
  lotsOwned()[id] = true;
  if (l.village && p.villages[id]) p.villages[id].open = true;
  const msg = `🏞️ ${l.name} 땅을 샀어요 (💰${cost}). 본당 땅이 넓어졌어요${p.fence ? ' · 담장도 새 땅 둘레로 옮겨 세웠어요' : ''}`;
  addLog(msg);
  return msg;
}
// 산 땅의 둘레: 산 칸과 안 산 칸(또는 땅 끝·마을·이웃 동네) 사이 변들. 길이 지나는 곳은 비워 둔다
function fenceEdges() {
  const p = Game.state.pastor, m = MAPS.solmoe, own = new Set();
  for (const l of LOTS) if (lotsOwned()[l.id]) for (let x = l.x; x < l.x + l.w; x++) for (let y = l.y; y < l.y + l.h; y++) own.add(x + ',' + y);
  const path = k => !!(p.paths && p.paths[k]), out = [];
  for (const k of own) {
    const [x, y] = k.split(',').map(Number);
    const side = (nx, ny, e) => { const nk = nx + ',' + ny; if (!own.has(nk) && !path(k) && !path(nk)) out.push(e); };
    side(x, y - 1, { ax: x, ay: y, bx: x + 1, by: y });
    side(x, y + 1, { ax: x, ay: y + 1, bx: x + 1, by: y + 1 });
    side(x - 1, y, { ax: x, ay: y, bx: x, by: y + 1 });
    side(x + 1, y, { ax: x + 1, ay: y, bx: x + 1, by: y + 1 });
  }
  return out;
}
function fenceCost(level) { return Math.round(FENCE_LEVELS[level].per * fenceEdges().length / 10) * 10; }
function fenceBlocker() {
  const p = Game.state.pastor, to = (p.fence || 0) + 1, f = FENCE_LEVELS[to];
  if (!f) return '가장 좋은 담장이에요';
  if (p.fixed.church < f.church) return `성당 Lv${f.church}부터 지을 수 있어요`;
  if (p.res.offering < fenceCost(to)) return `봉헌금 ${fenceCost(to)}만 원이 필요해요`;
  return null;
}
function buildFence() {
  if (fenceBlocker()) return null;
  const p = Game.state.pastor, to = (p.fence || 0) + 1, f = FENCE_LEVELS[to], cost = fenceCost(to);
  p.res.offering -= cost; book(null, 'building', cost);
  p.fence = to;
  const msg = `${f.icon} 본당 땅 둘레에 ${f.name}${josa(f.name, '을', '를').slice(f.name.length)} 세웠어요 (💰${cost})`;
  addLog(msg);
  return msg;
}

// 조경 값: 살림이 커지면 조금씩 오른다 (보통 비용보다 덜)
function decorCost(kind) { return Math.round(DECOR[kind].cost * Math.max(1, Math.sqrt(parishRates().gross / 6)) / 5) * 5; }
function decorBlocker(kind) {
  const p = Game.state.pastor, def = DECOR[kind];
  if (p.fixed.church < def.church) return `성당 Lv${def.church}부터 만들 수 있어요`;
  if (p.res.offering < decorCost(kind)) return `봉헌금 ${decorCost(kind)}만 원이 필요해요`;
  return null;
}
function placeDecor(kind, x, y, rot = 0) {
  const p = Game.state.pastor, def = DECOR[kind];
  if (decorBlocker(kind) || !MAPS.solmoe.canPlace(kind, x, y, rot).ok) return null;
  p.decor = p.decor || {};
  let n = 1; while (p.decor['d' + n]) n++;
  const cost = decorCost(kind);
  p.res.offering -= cost; book(null, 'building', cost);
  p.decor['d' + n] = rot ? { kind, x, y, rot } : { kind, x, y };
  let msg = `${def.icon} ${josa(def.name, '을', '를')} 만들었어요`;
  // 교우들이 바라던 것을 만들어 주면 더 기뻐한다
  if (p.decorWish === kind) { p.decorWish = null; msg += ` · 교우들이 바라던 것이라 무척 기뻐해요 ❤️${fmt(addRes('heart', 4))} · 🌏${fmt(addRes('reputation', 2))}`; }
  addLog(msg);
  return msg;
}
function removeDecor(key) { const p = Game.state.pastor; if (p.decor) delete p.decor[key]; }
// 성당 주변(성당에서 7칸 안)의 잡초·돌·나무 수
function dirtCount() {
  const ch = MAPS.solmoe.fixed[0];
  const G = MAPS.solmoe.grid || 1;
  return MAPS.solmoe.obstacles().filter(o => o.type !== 'house' && o.type !== 'tree' && !MAPS.solmoe.regionAt(o.x, o.y) && Math.hypot(o.x - ch.x - 2 * G, o.y - ch.y - 2 * G) < 8 * G).length;
}
const CLEAN = { min: 8, chance: 0.12, decorChance: 0.06 };
function cleanTargets(n, kinds) {
  const ch = MAPS.solmoe.fixed[0];
  return MAPS.solmoe.obstacles().filter(o => kinds.includes(o.type) && !MAPS.solmoe.regionAt(o.x, o.y) && !jobFor(o.id)).sort((a, b) => Math.hypot(a.x - ch.x, a.y - ch.y) - Math.hypot(b.x - ch.x, b.y - ch.y)).slice(0, n);
}
function cleanUp(n, kinds) { const list = cleanTargets(n, kinds); for (const o of list) finishClear(o.id); return list.length; }
function cleanText() { return `교우 몇 분이 사제관에 찾아왔다. "신부님, 성당 주변이 너무 지저분해요. 잡초가 무릎까지 자라고 돌이 굴러다녀서 어르신들이 넘어지실까 걱정이에요." 성당 둘레에 치워야 할 곳이 <b>${dirtCount()}곳</b> 있다.`; }
function cleanOptions() {
  const out = [
    { label: '주일 미사 뒤 교우들과 대청소를 한다', energy: 4, res: { heart: 3 }, stat: { rapport: 1 }, risk: '잡초 5곳을 바로 치워요', after: () => cleanUp(5, ['weed']), result: '교우들과 땀 흘리며 마당을 치웠다. 끝나고 함께 먹은 국수가 꿀맛이었다.' },
    { label: '청소 업체를 부른다', cost: 30, risk: '잡초·돌·나무 6곳을 바로 치워요', after: () => cleanUp(6, ['weed', 'rock', 'sapling']), result: '업체가 와서 반나절 만에 말끔히 치웠다. 교우들은 "돈이 좀 아깝다"고 수군거렸다.' },
    { label: '지금은 바빠서 나중에 하자고 한다', res: { heart: -2, reputation: -1 }, result: '"성당이 이래서야…" 교우들이 혀를 차며 돌아갔다.' },
  ];
  if (hasManager()) out.splice(1, 0, { label: '관리장님께 부탁한다', cost: 8, res: { heart: 1 }, risk: '잡초·돌 4곳을 바로 치워요', after: () => cleanUp(4, ['weed', 'rock']), result: '관리장님이 예초기를 들고 나섰다. 오후가 되니 마당이 훤해졌다.' });
  return out;
}
// 조경 요청: 아직 없는 것 중 성당 레벨이 맞는 것
function decorWishable() { const p = Game.state.pastor; return Object.keys(DECOR).filter(k => !decorHas(k) && p.fixed.church >= DECOR[k].church && k !== 'flowerbed'); }
function decorReqText() { const def = DECOR[Game.state.pastor.decorReq]; return `${def.icon} 구역장님들이 사제관에 찾아왔다. "신부님, 우리 성당에도 <b>${def.name}</b>${josa(def.name, '이', '가').slice(def.name.length)} 있으면 좋겠어요. ${def.desc}." 비용은 💰${decorCost(Game.state.pastor.decorReq)}쯤 든다.`; }
function decorReqOptions() {
  const p = Game.state.pastor, kind = p.decorReq, def = DECOR[kind];
  return [
    { label: `좋아요, ${josa(def.name, '을', '를')} 만들어 봅시다`, res: { heart: 1 }, risk: '짓기 메뉴의 조경에서 만들면 교우들이 더 기뻐해요 (❤️+4 · 🌏+2)', after: () => { p.decorWish = kind; p.decorReq = null; }, result: `"정말요? 저희도 힘을 보탤게요!" 구역장님들이 들떠서 돌아갔다.` },
    { label: '특별 헌금을 모아 함께 만들자고 한다', res: { heart: 1, offering: Math.round(def.cost * 0.4) }, risk: '봉헌금 일부가 모이고, 만들면 교우들이 더 기뻐해요', after: () => { p.decorWish = kind; p.decorReq = null; }, result: '교우들이 정성을 모았다. 봉헌 바구니가 금세 찼다.' },
    { label: '지금은 형편이 어렵다고 한다', res: { heart: -1 }, after: () => { p.decorReq = null; }, result: '"그럼 나중에라도 꼭이요." 구역장님들이 아쉬워하며 돌아갔다.' },
  ];
}

// ---------- 성소: 신학생과 신학교 지원비 ----------
function seminarians() { const p = Game.state.pastor; return p.seminarians || (p.seminarians = []); }
function seminaryCost() { return Math.round(SEMINARY.cost * (hasPerk('vocation6') ? 0.7 : 1)); }
// 주일마다 신학생이 나올 확률 (성소분과 힘 × 능력)
function vocationChance() {
  const L = unitLevels('vocation');
  if (!L) return 0;
  return clamp(SEMINARY.chance * L * (hasPerk('vocation3') ? 1.5 : 1) * (hasPerk('server6') ? 1.3 : 1) * (1 + (Game.state.pastor.vocBoost || 0) * 0.2), 0, 0.5);
}
function vocationSunday() {
  const p = Game.state.pastor, lines = [], list = seminarians();
  // 지원비: 신학생 한 명마다
  if (list.length) {
    const cost = seminaryCost() * list.length, paid = Math.min(cost, Math.floor(p.res.offering));
    p.res.offering -= paid; book('vocation', 'seminary', paid);
    if (paid < cost) { p.trust = Math.max(0, (p.trust || 50) - 1); lines.push(`🎓 신학교 지원비 💰${cost} 중 💰${paid}만 보냈어요 (교구 신뢰 −1)`); }
    else lines.push(`🎓 신학생 ${list.length}명 신학교 지원비 💰${cost}`);
  }
  // 해마다 한 번: 그만두는 신학생도 있다
  if (p.week % 48 === 47) for (const sm of list.slice()) if (Math.random() < SEMINARY.leave) { list.splice(list.indexOf(sm), 1); addRes('heart', -1); lines.push(`🎓 ${sm.name} 신학생이 오래 고민한 끝에 신학교를 나왔어요. 다른 길에서 하느님을 섬기겠대요 (❤️−1)`); }
  // 사제 서품
  for (const sm of list.filter(x => p.week - x.since >= SEMINARY.weeks)) {
    list.splice(list.indexOf(sm), 1);
    p.priests = (p.priests || 0) + 1;
    addRes('heart', 8); addRes('reputation', 8); addRes('members', 10); p.trust = Math.min(100, (p.trust || 50) + 10);
    lines.push(`✝️ ${sm.name} 신학생이 사제품을 받았어요! 본당에서 첫 미사를 드렸어요 · ❤️+8 · 🌏+8 · 🏛️+10 · 👥+10`);
    addLog(`✝️ 본당 출신 ${sm.name} 신부님 서품`);
  }
  // 새 신학생
  if (Math.random() < vocationChance()) {
    const name = SEMINARY_NAMES[(p.semCount = (p.semCount || 0) + 1) % SEMINARY_NAMES.length];
    list.push({ name, since: p.week });
    addRes('heart', 3); addRes('reputation', 3); p.trust = Math.min(100, (p.trust || 50) + 3);
    lines.push(`🌱 예비신학생 ${name} 군이 신학교에 입학했어요! ❤️+3 · 🌏+3 · 🏛️+3 (이제 주일마다 지원비 💰${seminaryCost()})`);
    addLog(`🌱 ${name} 군 신학교 입학`);
  }
  return lines;
}

// ---------- 봉사자 그만두기 면담 ----------
function quitRoll(p) {
  if (p.event) return null;
  const groups = allGroups().filter(x => x.g.level >= 2);
  if (groups.length < 3 || Math.random() >= QUIT_CHANCE) return null;
  const x = groups[Math.floor(Math.random() * groups.length)];
  p.quitAct = { idx: Math.floor(Math.random() * QUITS.length), type: x.g.type };
  p.event = 'quitTalk';
  return `🚪 ${UNITS[x.g.type].name} 봉사자 한 분이 신부님께 면담을 청했어요.`;
}
const QUIT_CHANCE = 0.07;
function quitText() {
  const p = Game.state.pastor, a = p.quitAct;
  if (!a) return '';
  const q = QUITS[a.idx], hint = Game.state.stats.rapport >= 30 || hasPerk('mothers6') ? `<br><span class="small">💡 ${QUIT_HINT[q.reason]} (친화력이 높아 알아챘어요)</span>` : '<br><span class="muted">무엇이 필요한 분일까요? 말씀을 잘 듣고 골라 보세요. 잘못 고르면 그만두고 소문이 나기도 해요.</span>';
  return `${UNITS[a.type].icon} ${UNITS[a.type].name} 봉사자가 사제관에 찾아왔다. ${q.text}${hint}`;
}
function quitOptions() {
  const p = Game.state.pastor, a = p.quitAct;
  if (!a) return [];
  const q = QUITS[a.idx], u = UNITS[a.type].name;
  const vital = v => { for (const { g } of allGroups()) if (g.type === a.type && g.level) g.vital = clamp((g.vital === undefined ? 60 : g.vital) + v, 0, 100); };
  return QUIT_ANSWERS.map(ans => ({
    label: `${ans.icon} ${ans.label}`,
    effect() {
      p.quitAct = null;
      if (q.good.includes(ans.id)) {
        if (ans.id === 'rest' || ans.id === 'accept') { vital(-5); addRes('heart', 2); gain('rapport', 1); this.result = `"신부님이 알아주시니 마음이 놓여요." 그는 잠시 쉬었다가 꼭 돌아오겠다고 했다. ${u}가 그를 기다리기로 했다 (활력 −5 · ❤️+2)`; }
        else { vital(10); addRes('heart', 1); gain('rapport', 1); this.result = `"그렇게 해 주신다면 계속해 볼게요." 그는 다시 힘을 냈다. ${u}에도 활기가 돌았다 (활력 +10 · ❤️+1)`; }
      } else if (ans.id === q.bad) {
        vital(-20); addRes('heart', -2); addRes('reputation', -3);
        this.result = `${q.badText} (${u} 활력 −20 · ❤️−2 · 🌏−3)`;
      } else if (Math.random() < 0.5) {
        vital(-5); this.result = `그는 잠시 망설이다가 "조금만 더 해 볼게요" 하고 돌아갔다. 마음이 다 풀리지는 않은 것 같다 (활력 −5)`;
      } else {
        vital(-15); addRes('heart', -1); this.result = `"생각해 주셔서 감사해요. 그래도 그만둘게요." 그는 ${u}를 떠났다 (활력 −15 · ❤️−1)`;
      }
    },
  }));
}

// ---------- 고해성사 (주일미사 30분 전) ----------
// 고해소에 사람이 올 확률: 마음이 따뜻할수록 많이
function confessChance() { return clamp(0.45 + Game.state.pastor.res.heart / 250, 0.3, 0.8); }
function rollConfession() { return Math.random() < confessChance() ? CONFESSIONS[Math.floor(Math.random() * CONFESSIONS.length)] : null; }
// 친화력이 높으면 그 사람에게 무엇이 필요한지 알아챈다
function confessHint(c) { return Game.state.stats.rapport >= 30 ? c.hint : null; }
// 마음이 풀릴 확률: 대답이 마음에 맞는 정도(q) + 친화력·영성 조금
function confessOdds(q) { const st = Game.state.stats; return clamp([0.15, 0.5, 0.85][q] + st.rapport * 0.002 + st.spirit * 0.002, 0.05, 0.95); }
const pickOne = list => list[Math.floor(Math.random() * list.length)];
// idx: 그 사람의 대답 번호, 'rush'는 서둘러 마치기
function hearConfession(c, idx) {
  const p = Game.state.pastor;
  addLog('🙏 미사 전 고해성사를 집전했어요 (고해 내용은 비밀이에요)');
  if (idx === 'rush') {
    if (Math.random() < 0.5) { addRes('heart', -1); return { ok: false, text: '짧게 사죄경만 주고 일어섰다. 고해자는 무언가 더 말하고 싶은 얼굴로 고해소를 나갔다.', eff: '❤️ −1' }; }
    return { ok: false, text: '짧게 사죄경을 주고 서둘러 제의방으로 향했다.', eff: '' };
  }
  spendEnergy(1);
  const [q, , react] = c.ans[idx];
  if (Math.random() < confessOdds(q)) {
    const b = c.bonus, eff = [];
    eff.push(`❤️ ${fmt(addRes('heart', 2))}`, `영성 ${fmt(gain('spirit', 1))}`);
    for (const [k, v] of Object.entries(b.res || {})) eff.push(`${RES_ICON[k]} ${fmt(addRes(k, v))}`);
    for (const [k, v] of Object.entries(b.stat || {})) eff.push(`${STAT_NAME[k]} ${fmt(gain(k, v))}`);
    for (const [k, v] of Object.entries(b.hidden || {})) addHidden(k, v);
    const groups = allGroups().filter(x => x.g.level >= 1 && (!b.other || x.g.type === b.other));
    if ((b.vital || b.other) && groups.length) { const x = groups[Math.floor(Math.random() * groups.length)]; x.g.vital = clamp((x.g.vital === undefined ? 60 : x.g.vital) + (b.vital || 6), 0, 100); eff.push(`${UNITS[x.g.type].name} 활력 +${b.vital || 6}`); }
    // 마음이 평화로워진 신부님은 강론도 한결 낫다
    p.confessPrep = 0.5;
    return { ok: true, text: `${react}${q === 0 ? ' 그래도 사죄경을 받고 나서는 마음이 조금 풀린 듯했다.' : ''}<br>🙏 보속: <b>${pickOne(CONFESS_PENANCE)}</b> · 사죄경을 바쳤다.<br>${c.good}`, eff: eff.join(' · ') + ' · 오늘 강론 준비 +0.5' };
  }
  addRes('heart', -1);
  return { ok: false, text: `${react} ${pickOne(CONFESS_FAIL)}`, eff: '❤️ −1' };
}

// ---------- 전례력과 제대 ----------
function liturgyAt(w) {
  const m = (Math.floor(w / 4) + 2) % 12, k = w % 4;
  const L = (id, name, color, flowers, feast = false, extra = {}) => ({ id, name, color, flowers, feast, ...extra });
  if ((m === 10 && k === 3) || (m === 11 && k < 3)) { const n = m === 10 ? 1 : k + 2; return L('advent', `대림 제${n}주일`, n === 3 ? 'rose' : 'violet', 'advent', false, { wreath: n }); }
  if (m === 11 && k === 3) return L('christmas', '주님 성탄 대축일', 'white', 'christmas', true);
  if (m === 0 && k === 0) return L('epiphany', '주님 공현 대축일', 'white', 'christmas', true);
  if (m === 2 && k === 1) return L('laetare', '사순 제4주일 (기뻐하여라 주일)', 'rose', 'rose');
  if (m === 2 && k === 3) return L('palm', '주님 수난 성지 주일', 'red', 'palm');
  if ((m === 1 && k >= 2) || m === 2) return L('lent', '사순 시기', 'violet', 'none');
  if (m === 3 && k === 0) return L('easter', '주님 부활 대축일', 'white', 'lily', true, { paschal: true });
  if (m === 4 && k === 3) return L('pentecost', '성령 강림 대축일', 'red', 'red', true, { paschal: true });
  if (m === 3 || (m === 4 && k < 3)) return L('eastertide', '부활 시기', 'white', 'lily', false, { paschal: true });
  if (m === 5 && k === 0) return L('corpus', '지극히 거룩하신 그리스도의 성체 성혈 대축일', 'white', 'eucharist', true);
  if (m === 7 && k === 2) return L('assumption', '성모 승천 대축일', 'white', 'mary', true);
  if (m === 10 && k === 0) return L('souls', '위령의 날 무렵 (위령 성월)', 'violet', 'mum');
  const season = m >= 2 && m <= 4 ? 'spring' : m <= 7 && m >= 5 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  return L('ordinary', '연중 시기', 'green', season);
}
function liturgyNow() { return liturgyAt(Game.state.pastor.week); }
function groupTopLevel(type) { return allGroups().reduce((mx, x) => x.g.type === type && x.g.level ? Math.max(mx, x.g.level) : mx, 0); }
// 제대회 정성: 단체 레벨 + 수녀님이 전례 준비를 맡으면 +2
// 제대회 살림: 주일마다 지출과 컵초 수입 (제대회가 있을 때)
function altarFinance(attendees, lit) {
  const p = Game.state.pastor, lv = groupTopLevel('altar'), lines = [];
  if (!lv) return lines;
  const n = massCount(), F = ALTAR_FIN;
  const laundry = Math.round((F.laundry + F.laundryPerMass * n) * 10) / 10, hosts = Math.round(attendees * F.hostPer * 10) / 10, wine = Math.round(F.winePerMass * n * 10) / 10;
  const cost = laundry + hosts + wine, paid = Math.min(cost, Math.max(0, p.res.offering));
  p.res.offering -= paid;
  book('altar', 'laundry', laundry); book('altar', 'hosts', hosts); book('altar', 'wine', wine);
  lines.push(`🕯️ 제대회 살림: 세탁비 💰${laundry} · 제병 💰${hosts} · 미사주 💰${wine}`);
  const mult = 1 + 0.1 * lv;
  // 한 달에 한 번 (그 달 첫 주일) 성시간
  if (p.week % 4 === 0) { const g = Math.round(attendees * F.holyHour * mult); if (g > 0) { addRes('offering', g); bookIncome('altar', 'holyHour', g); lines.push(`🕯️ 성시간에 제대회가 컵초를 팔았어요 · 💰+${g}`); } }
  // 부활·성탄 대축일
  if (lit.id === 'easter' || lit.id === 'christmas') { const g = Math.round(attendees * F.feastCandle * mult); addRes('offering', g); bookIncome('altar', 'feastCandle', g); lines.push(`🕯️ ${lit.name}에 제대회 컵초가 불티나게 팔렸어요 · 💰+${g}`); }
  return lines;
}
// 단체 주일 살림 (헌화회·주일학교·자모회)
function groupFinance(attendees, lit) {
  const p = Game.state.pastor, F = GROUP_FIN, lines = [];
  // 단체별 지원 수준(많이 1.5배 · 적게 0.7배)이 주일 살림에도 그대로
  const pay = (type, cat, amt) => { amt = Math.round(amt * budgetUpkeep(type) * (newbie() ? NEWBIE.upkeep : 1) * 10) / 10; if (amt <= 0) return 0; p.res.offering -= Math.min(amt, Math.max(0, p.res.offering)); book(type, cat, amt); return amt; };
  // 성가대: 간식비(미사 수만큼) · 지휘자 봉사비 · 반주자 지원금(반주단이 없으면 성가대가 반주자를 모신다)
  const cl = groupTopLevel('choir');
  if (cl) {
    const a = pay('choir', 'choirSnack', F.choirSnack * massCount() * (1 + 0.05 * cl)), b = pay('choir', 'conductor', F.conductor * (1 + 0.1 * cl));
    const c = groupTopLevel('organ') ? 0 : pay('choir', 'accompanist', F.accompanist * massCount());
    lines.push(`🎼 성가대 간식비 💰${a} · 지휘자 봉사비 💰${b}${c ? ` · 반주자 지원금 💰${c}` : ''}`);
  }
  const ol = groupTopLevel('organ');
  if (ol) { const c = pay('organ', 'accompanist', F.accompanist * massCount() * (1 + 0.1 * ol)); lines.push(`🎹 반주단 반주자 지원금 💰${c}`); }
  // 헌화회: 꽃 구입 (사순엔 꽃을 두지 않는다, 대축일엔 많이)
  const fl = groupTopLevel('flower');
  if (fl && lit.flowers !== 'none') { const c = pay('flower', 'flowers', F.flowers * (1 + 0.1 * fl) * (lit.feast ? F.flowersFeast : 1) * massCount()); lines.push(`💐 헌화회 꽃 구입 💰${c}`); }
  // 혼배미사: 신자가 많을수록 자주. 헌화회가 있으면 꽃다발을 팔아 수익
  if (Math.random() < F.weddingChance + p.res.members * F.weddingPerMember) {
    addRes('heart', 1);
    if (fl) { const g = Math.round(F.bouquetWedding * (1 + 0.1 * fl)); addRes('offering', g); bookIncome('flower', 'bouquetWedding', g); lines.push(`💒 혼배미사가 있었어요 · 헌화회가 부케와 제대 꽃을 맡아 💰+${g}`); }
    else lines.push('💒 혼배미사가 있었어요 (헌화회가 있으면 꽃다발 수익이 생겨요)');
  }
  // 주일학교: 교리 준비비
  for (const t of ['school', 'school2']) { const lv = groupTopLevel(t); if (lv) { const c = pay(t, 'schoolPrep', F.schoolPrep + F.schoolPrepLv * lv); lines.push(`${UNITS[t].icon} ${UNIT_SHORT[t] || UNITS[t].name} 교리 준비비 💰${c}`); } }
  // 자모회: 간식 재료비
  for (const t of ['parentsK', 'parentsY']) { const lv = groupTopLevel(t); if (lv) { const c = pay(t, 'snack', (F.snack + F.snackLv * lv) * (hasPerk(t + '6') ? 0.7 : 1)); lines.push(`${UNITS[t].icon} ${UNITS[t].name} 간식 재료비 💰${c}`); } }
  return lines;
}
// 세례식 꽃다발 (cateSunday에서 부른다)
function baptismBouquet(n) {
  const fl = groupTopLevel('flower');
  if (!fl || n <= 0) return null;
  const g = Math.round(n * GROUP_FIN.bouquetBaptism * (1 + 0.1 * fl));
  addRes('offering', g); bookIncome('flower', 'bouquetBaptism', g);
  return `💐 세례식 꽃다발을 헌화회가 팔았어요 · 💰+${g}`;
}
function altarCare() { return groupTopLevel('altar') + (sisterIn('altar') ? 2 : 0); }
function flowerCare() { return groupTopLevel('flower'); }
// 제대회·헌화회가 주일미사에 주는 것 (doSunday와 미리 보기에서 같이 쓴다)
function massBonus() {
  const lit = liturgyNow(), a = altarCare(), f = flowerCare(), out = { heart: 0, rep: 0, prep: 0, collect: 1, attend: 0, lines: [] };
  if (lit.feast) out.attend += 0.05;
  if (a >= 1) { out.heart += 1; out.lines.push(`🕯️ 제대회가 제대를 정갈하게 차렸어요 · 마음 +1`); }
  if (a >= 3) out.prep += 0.5;
  if (lit.id === 'lent' || lit.id === 'palm') { if (decorHas('stations')) { out.heart += 3; out.attend += 0.02; out.lines.push('✝️ 사순 시기, 교우들이 마당의 십자가의 길을 따라 기도했어요 · 마음 +3'); } }
  if ((Math.floor(Game.state.pastor.week / 4) + 2) % 12 === 4 && decorHas('maryGarden')) { out.heart += 3; out.lines.push('⛰️ 성모 성월, 성모동산 앞에 촛불이 가득했어요 · 마음 +3'); }
  const sv = unitLevels('server');
  if (sv > 0) { out.heart += 1; out.collect *= 1 + 0.02 * sv; out.lines.push(`🙏 성인 복사단이 제대를 섬겼어요 · 마음 +1 · 봉헌 +${Math.round(2 * sv)}%`); }
  if (lit.feast && hasChair('jebungwa')) { out.heart += 2; out.lines.push('🕯️ 제분과위원회가 대축일 전례를 정성껏 준비했어요 · 마음 +2'); }
  if (lit.feast && hasPerk('organ6')) { out.heart += 2; out.lines.push('🎹 반주단의 대축일 오르간 · 마음 +2'); }
  if (a >= 5) { out.collect *= lit.feast ? 1.15 : 1.08; out.lines.push(`⛪ 복사단이 행렬을 이끌어 미사가 장엄했어요 · 봉헌 +${lit.feast ? 15 : 8}%`); }
  if (f >= 1) {
    if (lit.flowers === 'none') { out.heart += 1; out.lines.push('💐 헌화회가 사순 시기에 맞춰 꽃을 덜어 내고 제대를 비워 두었어요 · 마음 +1'); }
    else {
      const big = lit.feast ? (f >= 3 ? 4 : 2) : 0;
      out.heart += 1 + big; if (lit.feast) out.rep += 1;
      out.lines.push(`💐 헌화회가 제대 앞을 꾸몄어요 (${LIT_FLOWER_NAME[lit.flowers]}) · 마음 +${1 + big}${lit.feast ? ' · 평판 +1' : ''}`);
      if (lit.feast && f >= 3) out.attend += 0.02;
    }
  } else if (lit.feast) out.lines.push('🥀 대축일인데 제대 앞에 꽃이 없어 조금 쓸쓸했어요 (헌화회가 있으면 꽃으로 꾸며요)');
  return out;
}

function doSunday(opts = {}) {
  const s = Game.state, p = s.pastor, auto = !!opts.auto, prepared = !auto && p.prep > 0;
  const weekLines = settleWeekLiturgy();
  if (!auto) spendEnergy(sundayCost());
  // 신부님이 직접 오지 않은 주일: 조용히 드려진 미사 (강론 효과 없음, 봉헌 덜)
  const r = auto ? { grade: 'quiet', label: '정해진 시간의 미사', icon: '🕯️' } : judgeHomily(sundayPrep());
  const heartGain = { moved: 5, ok: 2, boring: -2, quiet: 0 }[r.grade];
  const h = addRes('heart', heartGain);
  // 강론이 좋으면 소문을 듣고 새 신자가 찾아온다 (강론력이 높을수록 많이)
  const base = { moved: 3 + s.stats.homily * 0.08, ok: 1 + s.stats.homily * 0.03, boring: 0, quiet: 0.5 + s.stats.homily * 0.01 }[r.grade] * (hasPerk('catechumen6') ? 1.5 : 1) * (hasChair('youthBoard') ? 1.1 : 1);
  const newcomers = addRes('members', Math.round(base + (hasPerk('catechumen3') ? 2 : 0) + (sisterIn('catechumen') ? 2 * sisterEffFor('catechumen') : 0)));
  if (r.grade === 'moved') addRes('reputation', 1);
  // 미사에 나온 사람만 봉헌한다 (참례율 × 신자 수), 한 사람 봉헌은 마음에 따라
  // 주교님 사목방문 주일: 평소 안 나오던 교우들까지 나와 참례·봉헌이 크게 는다
  const bv = !!(p.bishop && p.week >= p.bishop.week), B = BISHOP_VISIT;
  const rate = bv ? Math.min(0.98, attendanceRate() + B.attend) : attendanceRate(), attendees = Math.round(p.res.members * rate);
  p.lastAttendance = attendees;
  const mb = massBonus(), lit = liturgyNow();
  const collectMult = (auto ? SUNDAY_AUTO.collect : 1 + (prepared ? SUNDAY_PREP_BONUS : 0) + (r.grade === 'moved' ? 0.1 : 0)) * (bv ? B.collect : 1);
  const bishopLines = [];
  if (bv) {
    const dt = B.trust + (auto ? B.trustOut : B.trustIn);
    p.trust = clamp((p.trust || 50) + dt, 0, 100);
    bishopLines.push(`🧑‍⚖️ 주교님 사목방문! 주교님이 미사를 주례하시고 견진·강복을 주셨어요 · 참례율 +${Math.round(B.attend * 100)}% · 봉헌 ×${B.collect} · ❤️${fmt(addRes('heart', B.heart))} · 🌏${fmt(addRes('reputation', B.rep))} · 교구 신뢰 ${dt >= 0 ? '+' : ''}${dt}${auto ? ' (신부님이 자리에 없어 주교님이 서운해하셨어요)' : ' (신부님이 직접 맞이했어요)'}`);
    addLog('🧑‍⚖️ 주교님이 사목방문으로 주일미사를 주례하셨습니다.');
    p.bishopLast = p.week; p.bishop = null;
  }
  const collection = addRes('offering', attendees * (0.075 + p.res.heart / 100 * 0.25) * (hasPerk('choir6') ? 1.2 : 1) * mb.collect * collectMult);
  // 중고등부·청년회가 있으면 토요 저녁 미사가 그들의 미사가 되고, 그들이 전례 봉사를 한다
  const youthMass = massCount() >= 2 && youthMassReady();
  if (youthMass) { bumpVital('youth', 6); bumpVital('school2', 6); }
  if (mb.heart) addRes('heart', mb.heart);
  if (mb.rep) addRes('reputation', mb.rep);
  p.confessPrep = 0;
  // 이번 강론의 소문이 다음 주 참례율에 남는다
  p.homilyMood = { moved: 0.05, ok: 0.01, boring: -0.05, quiet: 0 }[r.grade];
  p.weekIncome = (p.weekIncome || 0) + collection;
  const levy = payLevy();
  if (hasPerk('lector3')) addCateQuality(2);
  const altarLines = altarFinance(attendees, lit).concat(groupFinance(attendees, lit));
  if (massCount() > 1) { const c = massCost(), paid = Math.min(c, Math.floor(p.res.offering)); p.res.offering -= paid; book(null, 'mass', paid); }
  if (shuttleOn()) { const c = shuttleCost(), paid = Math.min(c, Math.floor(p.res.offering)); p.res.offering -= paid; book(null, 'shuttle', paid); }
  const cateLines = cateSunday();
  cateLines.push(...vocationSunday());
  if (p.week > 0 && (p.week + 1) % 4 === 0) { monthlyReport(); cateLines.push('📑 이번 달 단체 보고서가 도착했어요. 어디에 돈이 많이 들었는지 살펴보세요'); }
  if (sisters().some(s => (s.bond === undefined ? 60 : s.bond) >= 50)) p.convent = Math.min(100, conventRep() + 1);
  p.prep = 0;
  const awardLines = p.week % 48 === AWARDS.week ? holdAwards() : (awardState(), []);
  p.week++;
  // 교구에서 사목방문 소식이 온다 (몇 주 앞서 주보에 알린다)
  if (!p.bishop && p.week >= BISHOP_VISIT.minWeek && p.week - (p.bishopLast === undefined ? -99 : p.bishopLast) >= BISHOP_VISIT.gap && Math.random() < BISHOP_VISIT.chance) {
    p.bishop = { week: p.week + BISHOP_VISIT.notice };
    bishopLines.push(`📜 교구 소식: 앞으로 ${BISHOP_VISIT.notice + 1}번째 주일에 주교님이 사목방문으로 미사를 주례하러 오세요. 그날은 신부님이 직접 맞이하면 좋아요`);
    addLog('📜 주교님 사목방문 일정이 잡혔습니다.');
  }
  p.lastSunday = auto ? opts.at : Date.now();
  const awayMsg = awayAfterSunday(p.lastSunday);
  if (p.guide) p.guide.sunday = true;
  if (p.week % 48 === 0) s.age++;
  if (p.week % 48 === 40) { if (hasPerk('senior6')) { addRes('reputation', 5); addLog('🎓 노인대학 졸업식'); } if (hasPerk('soccer6')) { addRes('reputation', 5); addLog('⚽ 본당 대항 축구대회 우승'); } }
  const pool = PASTOR_EVENTS.filter(e => !e.manual && (!e.cond || e.cond()));
  if (!PASTOR_EVENTS.some(e => e.manual && e.id === p.event)) p.event = Math.random() < 0.5 ? pick(pool).id : null;
  addLog(auto ? '⛪ 주일미사가 정해진 시간에 드려졌어요' : `⛪ 주일미사 강론: ${r.label}`);
  return { auto, prepared, away: awayMsg, award: awardLines, youthMass, weekLines, collectMult, sermon: r, attendees, rate, collection: Math.round(collection), newcomers: Math.round(newcomers), choir: unitLevels('choir') > 0, lit, altar: altarCare(), flower: flowerCare(), servers: unitLevels('server') > 0, organ: unitLevels('organ') > 0, lector: unitLevels('lector') > 0, shuttle: shuttleOn(), bishop: bv, lines: [`📅 ${lit.name}${massCount() > 1 ? ` · 주일미사 ${massCount()}대` : ''}`, ...bishopLines, ...awardLines, ...(prepared ? [`✍️ 강론을 준비하고 직접 집전해 봉헌이 ${Math.round((collectMult - 1) * 100)}% 더 모였어요`] : []), ...(youthMass ? ['🎸 토요일 저녁 7시 30분 중고등부·청년 미사: 학생과 청년들이 전례 봉사를 했어요'] : []), ...weekLines, ...(awayMsg ? [awayMsg] : []), ...mb.lines, ...altarLines, ...(shuttleOn() ? [`🚐 관리장님이 셔틀버스로 어르신들을 모셔 왔어요 · 참례율 +${Math.round(SHUTTLE.attend * 100)}% · 기름값 💰${shuttleCost()}`] : []), `⛪ 미사 참례 ${attendees}명 / 신자 ${Math.floor(p.res.members)}명 (${Math.round(rate * 100)}%)`, `❤️ 신자들의 마음 ${fmt(h)}`, ...(newcomers >= 1 ? [`👥 강론 소문을 듣고 새 신자 ${Math.round(newcomers)}명이 찾아왔어요`] : []), `💰 주일 봉헌 ${Math.round(collection)}만 원`, ...cateLines, ...levy] };
}

// 교구 공납금: 한 주 동안 거둔 봉헌(헌금함·단체·주일 봉헌)의 일정 비율. 건축헌금은 빠진다.
// 금고가 모자라면 못 낸 만큼 밀리고, 밀린 공납금이 있으면 성당 증축 허가가 나지 않는다
function levyRate() { return Math.max(0, (LEVY_RATE[Game.state.pastor.fixed.church] || 0.2) - (hasPerk('district6') ? 0.02 : 0)); }

// 교구 정기 감사: 해마다 1월 첫 주일. 부풀린 보고서 한 건마다 들킬 확률이 쌓인다
const AUDIT = { chance: 0.5, penalty: 10, gain: 3 };
function auditChance(n) { return 1 - Math.pow(1 - AUDIT.chance, n); }
function isAuditWeek(w) { return (Math.floor(w / 4) + 2) % 12 === 0 && w % 4 === 0; }
function isDecember() { return (Math.floor(Game.state.pastor.week / 4) + 2) % 12 === 11; }

// 달력: 주임 첫 주가 3월 1주. 한 달 4주, 한 해 48주
function calYear(w) { return Math.floor((Math.floor(w / 4) + 2) / 12); }
function isJanuary() { return (Math.floor(Game.state.pastor.week / 4) + 2) % 12 === 0; }
function weeksToJanuary() { const w = Game.state.pastor.week; let n = 0; while ((Math.floor((w + n) / 4) + 2) % 12 !== 0) n++; return n; }
function levyPrepaid() { const p = Game.state.pastor; return p.levyPrepaidYear === calYear(p.week); }

// 한 해 공납금을 한 번에: 최근 네 주 평균 봉헌(없으면 지금 쌓이는 속도)으로 1년치를 셈하고 깎아 준다
function lumpSumQuote() {
  const p = Game.state.pastor, hist = p.incomeHist || [];
  const weekly = Math.max(hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 0, parishRates().gross * SUNDAY_HOURS);
  const full = Math.round(weekly * 48 * levyRate());
  return { full, pay: Math.round(full * (1 - LEVY_LUMP_DISCOUNT)) + Math.ceil(p.levyDue || 0), saved: full - Math.round(full * (1 - LEVY_LUMP_DISCOUNT)) };
}

function lumpSumBlocker() {
  const p = Game.state.pastor;
  if (!isJanuary()) return `1월에만 할 수 있어요 (${weeksToJanuary()}주 뒤)`;
  if (levyPrepaid()) return '올해 공납금은 이미 냈어요';
  const q = lumpSumQuote();
  if (q.pay > vaultCap()) return `금고 한도(${vaultCap()})보다 많아요 · 본당 사무실을 키우세요`;
  if (p.res.offering < q.pay) return `봉헌금 ${q.pay}만 원이 필요해요`;
  return '';
}

function payLumpSum() {
  const p = Game.state.pastor;
  if (lumpSumBlocker()) return null;
  const q = lumpSumQuote();
  p.res.offering -= q.pay;
  p.levyDue = 0;
  p.levyPrepaidYear = calYear(p.week);
  p.trust = Math.min(100, (p.trust || 50) + 3);
  addLog(`🏛️ 올해 교구 공납금 ${q.pay}만 원을 한 번에 냈습니다 (${q.saved}만 원 감면).`);
  return `올해 공납금 ${q.pay}만 원을 한 번에 냈어요. ${q.saved}만 원을 감면받았어요. 올해는 주일마다 공납금을 내지 않아요.`;
}

// 신협 대출: 빌릴 수 있는 금액·막는 까닭·빌리기·주일 상환·한꺼번에 갚기
function loanAmount(pl) { return Math.max(10, Math.floor(vaultCap() * pl.share / 10) * 10); }
function loanBlocker(pl) {
  const p = Game.state.pastor;
  if ((p.fixed.office || 1) < LOAN.office) return `사무실 Lv${LOAN.office}부터 빌릴 수 있어요`;
  if (p.loan) return '빌린 돈을 다 갚아야 또 빌릴 수 있어요';
  if (p.res.offering + loanAmount(pl) > vaultCap()) return `금고에 자리가 모자라요 (남은 자리 ${Math.floor(vaultCap() - p.res.offering)})`;
  return null;
}
function takeLoan(i) {
  const pl = LOAN.plans[i], p = Game.state.pastor;
  if (loanBlocker(pl)) return null;
  const amt = loanAmount(pl), total = Math.ceil(amt * (1 + pl.rate));
  p.res.offering += amt;
  p.loan = { amt, left: total, per: Math.ceil(total / pl.weeks), weeks: pl.weeks, week: p.week };
  addLog(`🏦 수원가톨릭신협에서 ${amt}만 원을 빌렸어요 (${pl.weeks}주 동안 갚기, 모두 ${total}만 원)`);
  return `🏦 신협에서 💰${amt}을 빌렸어요. 주일마다 💰${p.loan.per}씩 ${pl.weeks}주 동안 갚아요`;
}
function repayLoanAll() {
  const p = Game.state.pastor, l = p.loan;
  if (!l || p.res.offering < l.left) return null;
  p.res.offering -= l.left; book(null, 'loan', l.left); p.loan = null;
  addLog('🏦 신협 대출을 다 갚았어요');
  return `🏦 남은 빚 💰${l.left}을 다 갚았어요`;
}
function payLoan() {
  const p = Game.state.pastor, l = p.loan;
  if (!l) return [];
  const due = Math.min(l.left, l.per), paid = Math.min(due, Math.floor(p.res.offering));
  p.res.offering -= paid; book(null, 'loan', paid); l.left -= paid;
  if (l.left <= 0) { p.loan = null; return [`🏦 신협 대출 ${paid}만 원을 갚아 빚을 다 갚았어요`]; }
  if (paid < due) {
    const fee = Math.ceil(l.left * LOAN.late); l.left += fee; addRes('reputation', -LOAN.rep);
    return [`🏦 신협 대출 ${due}만 원 중 ${paid}만 원만 갚았어요. 연체 이자 ${fee}만 원이 붙었어요 (남은 빚 ${l.left}만 원 · 평판 −${LOAN.rep})`];
  }
  return [`🏦 신협 대출 ${paid}만 원을 갚았어요 (남은 빚 ${l.left}만 원)`];
}

function payLevy() {
  const p = Game.state.pastor, lines = [...payLoan()];
  p.incomeHist = [...(p.incomeHist || []), p.weekIncome || 0].slice(-4);
  // 공납금은 주마다 쌓아 두었다가 달마다 한 번(그달 마지막 주일) 낸다 (v0.76)
  if (!levyPrepaid()) p.levyAccrued = (p.levyAccrued || 0) + Math.round((p.weekIncome || 0) * levyRate());
  p.weekIncome = 0;
  const monthEnd = p.week % 4 === 3;
  const due = levyPrepaid() || !monthEnd ? 0 : (p.levyAccrued || 0) + (p.levyDue || 0);
  if (monthEnd) p.levyAccrued = 0;
  if (levyPrepaid() && monthEnd) lines.push('🏛️ 올해 공납금은 1월에 한 번에 냈어요');
  const paid = Math.min(due, Math.floor(p.res.offering));
  book(null, 'levy', paid);
  p.res.offering -= paid;
  p.levyDue = due - paid;
  if (due > 0) {
    if (p.levyDue > 0) {
      p.trust = Math.max(0, (p.trust || 50) - 3);
      lines.push(`🏛️ 교구 공납금 ${due}만 원 중 ${paid}만 원만 냈어요. ${Math.ceil(p.levyDue)}만 원이 밀렸어요 (밀린 공납금이 있으면 성당 증축 허가가 나지 않아요)`);
    } else {
      p.trust = Math.min(100, (p.trust || 50) + 3); // 달마다 한 번이라 예전 한 주 +1의 네 배쯤
      lines.push(`🏛️ 이번 달 교구 공납금 ${paid}만 원을 냈어요 (한 달 봉헌의 ${Math.round(levyRate() * 100)}%). 어려운 본당과 교구 살림에 쓰여요`);
    }
  }
  // 1월 첫 주일: 교구 정기 감사. 부풀린 보고서가 있으면 들킬 수 있다 (한 번 50%, 두 번 75% …)
  if (isAuditWeek(p.week)) {
    if (p.inflated) {
      const chance = auditChance(p.inflated);
      if (Math.random() < chance) {
        const loss = AUDIT.penalty + AUDIT.gain * p.inflated;
        p.trust = Math.max(0, (p.trust || 50) - loss);
        lines.push(`🏛️ 교구 정기 감사에서 보고서의 신자 수가 실제와 다르다는 지적을 받았어요. 교구의 신뢰 −${loss}`);
        p.inflated = 0;
        p.auditCaught = (p.auditCaught || 0) + 1;
      } else lines.push('🏛️ 교구 정기 감사를 무사히 넘겼어요. 그래도 부풀린 기록은 남아 있어요…');
    } else lines.push('🏛️ 교구 정기 감사를 깔끔하게 마쳤어요.');
  }
  // 작은 본당은 교구에서 지원금을 받는다
  const grant = DIOCESE_GRANT[p.fixed.church];
  if (grant) {
    // 밀린 공납금이 있으면 지원금으로 먼저 갚는다
    const toDue = Math.min(grant, p.levyDue);
    p.levyDue -= toDue;
    const g = addRes('offering', grant - toDue);
    lines.push(`🤝 교구 지원금 ${grant}만 원을 받았어요 (작은 본당 지원)${toDue ? ` · ${toDue}만 원은 밀린 공납금으로 냈어요` : ''}`);
    if (g < grant - toDue) lines.push('금고가 가득 차서 지원금 일부를 받지 못했어요');
  }
  return lines;
}

// 건축헌금 호소: 한 주에 한 번. 마음이 클수록 많이 모이지만, 부탁할수록 마음이 조금 줄어든다
function canAppeal() { const p = Game.state.pastor; return p.week > 0 && p.lastAppeal !== p.week; }

function appealAmount() { const r = Game.state.pastor.res; return Math.round(r.members * r.heart / 100 * 0.4 * (hasPerk('golf6') ? 1.3 : 1)); }

function doAppeal() {
  const p = Game.state.pastor;
  if (!canAppeal()) return null;
  p.lastAppeal = p.week;
  const amount = addRes('offering', appealAmount());
  const h = addRes('heart', -4);
  addLog(`📣 건축헌금 호소: ${Math.round(amount)}만 원`);
  return `건축헌금 ${Math.round(amount)}만 원이 모였어요. (마음 ${fmt(h)}: 자주 부탁하면 부담스러워해요)`;
}

// ---------- 마을 넓히기 ----------

function villageNeeds(id) {
  const v = VILLAGES[id], p = Game.state.pastor;
  const out = [];
  if (v.need.church) out.push({ label: '성당 레벨', have: p.fixed.church, want: v.need.church, ok: p.fixed.church >= v.need.church });
  if (v.need.reputation) out.push({ label: '평판', have: Math.floor(p.res.reputation), want: v.need.reputation, ok: p.res.reputation >= v.need.reputation });
  return out;
}

function villageReady(id) { return villageNeeds(id).every(n => n.ok); }

function villageOpen(id) { const p = Game.state.pastor; return !!(p && ((p.villages[id] && p.villages[id].open) || (p.lots && p.lots[id]))); } // v1.08: 땅을 사도 열린다

// 마을 가정 방문. 정해진 횟수를 채우면 마을이 열린다
function visitVillage(id) {
  const p = Game.state.pastor, v = VILLAGES[id], st = p.villages[id];
  if (!villageReady(id) || st.open || Game.state.energy < 2) return null;
  spendEnergy(2);
  st.visits++;
  gain('rapport', 1.5);
  if (st.visits >= v.visits) {
    st.open = true;
    addRes('members', 10);
    addLog(`🗺️ ${v.name} 마을이 본당 관할로 들어왔습니다.`);
    return { opened: true, msg: `${v.name} 마을 사람들이 마음을 열었어요! 신자 +10, 새 땅이 열렸어요.` };
  }
  return { opened: false, msg: `${v.name} 가정 방문 ${st.visits}/${v.visits}. "신부님이 이 산골까지 다 오시고…"` };
}

// ---------- 날짜·글자 ----------

function pastorDateLabel() {
  const w = Game.state.pastor.week;
  const month = Math.floor(w / 4);
  return `주임 ${Math.floor(month / 12) + 1}년차 ${((month + 2) % 12) + 1}월 ${(w % 4) + 1}주`;
}

// 받침에 따라 조사를 고른다 (이/가, 을/를 등)
function josa(word, withFinal, without) {
  const ch = word[word.length - 1], c = ch.charCodeAt(0);
  // 숫자는 읽는 소리로: 영·일·삼·육·칠·팔은 받침이 있고, 일·칠·팔은 ㄹ 받침
  let fin, rieul;
  if (/[0-9]/.test(ch)) { fin = '013678'.includes(ch); rieul = '178'.includes(ch); }
  else if (c >= 0xAC00 && c <= 0xD7A3) { const f = (c - 0xAC00) % 28; fin = f > 0; rieul = f === 8; }
  else return word + without;
  // '으로'는 ㄹ 받침 뒤에서 '로'가 된다 (벽돌로, Lv7로)
  if (withFinal === '으로' && rieul) return word + without;
  return word + (fin ? withFinal : without);
}

function fmtDur(sec) {
  sec = Math.ceil(sec);
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  if (h) return `${h}시간 ${m % 60}분`;
  return `${m}분 ${sec % 60 ? (sec % 60) + '초' : ''}`.trim();
}
