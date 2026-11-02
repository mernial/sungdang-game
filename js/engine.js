// 게임 상태와 규칙: 저장, 행동력 회복, 방치 수입, 월 진행, 강론 판정

const SAVE_KEY = 'sungdang-save-v1';
const REGEN_SEC = 600;          // 행동력 1 회복에 10분
const IDLE_MAX_HOURS = 12;      // 방치 수입은 최대 12시간분
const CURATE_TERM = 12;         // 보좌 임기 최대 (청년회 Lv3을 이루면 일찍 끝남)
const SUNDAY_COST = 4;          // 한 달 주일미사 4번
const OFFICE_PER_DAY = 3;
const CURATE_GROWTH = 0.35;     // 본당 단계 능력치 성장 배율

const Game = { state: null };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n) { const r = Math.round(n * 10) / 10; return (r >= 0 ? '+' : '') + r; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

function newState(name, baptism) {
  return {
    version: 1,
    phase: 'prologue',
    name, baptism,
    age: 19,
    stats: { homily: 5, doctrine: 5, rapport: 5, admin: 5, spirit: 20 },
    hidden: { holiness: 0, ambition: 0 },
    energy: 10, energyMax: 10,
    lastEnergyTs: Date.now(),
    lastSeen: Date.now(),
    testMode: false,
    seminary: { chapter: 0, progress: {} },
    curate: null,
    parish: null,
    daily: { massDate: null, streak: 0, officeDate: null, officeCount: 0 },
    log: [],
  };
}

function save() {
  if (!Game.state) return;
  Game.state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(Game.state)); } catch (e) { /* 저장 불가 환경 */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
}

function addLog(text) {
  const s = Game.state;
  s.log.unshift({ when: dateLabel(), text });
  if (s.log.length > 80) s.log.length = 80;
}

// ---------- 능력치 ----------

function spiritMult() {
  const v = Game.state.stats.spirit;
  if (v >= 70) return 1.2;
  if (v < 30) return 0.7;
  return 1.0;
}

// 능력치가 높을수록 성장이 느려진다. 실제로 오른 양을 돌려준다.
function gain(stat, base) {
  const s = Game.state;
  const cur = s.stats[stat];
  let g = base;
  if (base > 0) {
    // 신학교는 튜토리얼이라 빠르게, 본당부터는 긴 생애에 맞춰 천천히 자란다
    const growth = s.phase === 'curate' ? PASTOR_TYPES[s.curate.pastorType].growth * CURATE_GROWTH : s.phase === 'pastor' ? CURATE_GROWTH : 1;
    g = Math.max(0.1, base * (1 - cur / 130) * spiritMult() * growth);
  }
  s.stats[stat] = clamp(cur + g, 0, 100);
  return s.stats[stat] - cur;
}

function addHidden(key, v) { Game.state.hidden[key] = Math.max(0, Game.state.hidden[key] + v); }

function addParish(key, v) {
  const p = Game.state.parish;
  if (!p) return 0;
  const before = p[key];
  const limits = { attendance: [5, 90], building: [0, 100], reputation: [0, 100], finance: [-9999, 99999] };
  const [lo, hi] = limits[key] || [0, 99999];
  p[key] = clamp(before + v, lo, hi);
  return p[key] - before;
}

function addGroup(key, v) {
  const g = Game.state.parish?.groups;
  if (!g) return 0;
  const before = g[key];
  // 활성도가 높을수록 더 올리기 어렵다
  const mult = v > 0 ? spiritMult() * (1 - before / 150) : 1;
  g[key] = clamp(before + v * mult, 0, 100);
  return g[key] - before;
}

function addPastor(v) {
  const c = Game.state.curate;
  if (!c) return 0;
  const before = c.relation;
  c.relation = clamp(before + v, 0, 100);
  return c.relation - before;
}

function markMonthly(key) { Game.state.curate.monthly[key] = true; }

function spendEnergy(n) { Game.state.energy = Math.max(0, Game.state.energy - n); }

// ---------- 행동력 회복 ----------

function regenMs() { return REGEN_SEC * 1000 / (Game.state.testMode ? 60 : 1); }

// 신학교에서는 챕터마다 채워 주므로 시간 회복은 본당부터
function regenEnergy() {
  const s = Game.state;
  const now = Date.now();
  if ((s.phase !== 'curate' && s.phase !== 'pastor') || s.energy >= s.energyMax) { s.lastEnergyTs = now; return; }
  const per = regenMs();
  const gained = Math.floor((now - s.lastEnergyTs) / per);
  if (gained > 0) {
    s.energy = Math.min(s.energyMax, s.energy + gained);
    s.lastEnergyTs = s.energy >= s.energyMax ? now : s.lastEnergyTs + gained * per;
  }
}

function secondsToNextEnergy() {
  const s = Game.state;
  if ((s.phase !== 'curate' && s.phase !== 'pastor') || s.energy >= s.energyMax) return null;
  return Math.max(0, Math.ceil((regenMs() - (Date.now() - s.lastEnergyTs)) / 1000));
}

// ---------- 방치 수입 ----------

// 접속하지 않은 동안 본당이 스스로 굴러간 결과. 요약 문장 목록을 돌려준다.
function applyIdle() {
  const s = Game.state;
  if (s.phase !== 'curate') return [];
  const speed = s.testMode ? 60 : 1;
  const hours = Math.min(IDLE_MAX_HOURS, (Date.now() - s.lastSeen) / 3600000 * speed);
  if (hours < 0.25) return [];
  const lines = [];
  const p = s.parish;
  const offering = Math.round(p.members * (p.attendance / 100) * 0.05 * hours);
  if (offering > 0) {
    addParish('finance', offering);
    lines.push(`💰 봉헌금이 ${offering}만 원 들어왔습니다.`);
  }
  if (p.groups.youth >= 40) {
    const y = addGroup('youth', hours * 0.3);
    lines.push(`🎸 청년회가 스스로 모임을 가졌습니다. (청년회 ${fmt(y)})`);
  }
  if (p.groups.school >= 40) {
    const g = addGroup('school', hours * 0.3);
    lines.push(`🧒 주일학교 교사들이 수업을 준비했습니다. (주일학교 ${fmt(g)})`);
  }
  if (p.groups.legio >= 30) {
    addParish('reputation', hours * 0.1);
    lines.push('📿 레지오 단원들이 이웃을 방문했습니다.');
  }
  if (lines.length) lines.unshift(`접속하지 않은 ${hours.toFixed(1)}시간 동안:`);
  return lines;
}

// ---------- 매일 접속 ----------

function canDailyMass() { return Game.state.daily.massDate !== todayStr(); }

function doDailyMass() {
  const s = Game.state;
  const d = s.daily;
  const yesterday = new Date(Date.now() - 86400000);
  const yStr = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  d.streak = d.massDate === yStr ? d.streak + 1 : 1;
  d.massDate = todayStr();
  const sp = gain('spirit', 3);
  const bonus = Math.min(5, 2 + Math.floor(d.streak / 3));
  s.energy = Math.min(s.energyMax + 10, s.energy + bonus);
  const msg = `매일 미사를 봉헌했습니다. 영성 ${fmt(sp)}, 행동력 +${bonus} (연속 ${d.streak}일)`;
  addLog(msg);
  return msg;
}

function officeLeft() {
  const d = Game.state.daily;
  if (d.officeDate !== todayStr()) return OFFICE_PER_DAY;
  return OFFICE_PER_DAY - d.officeCount;
}

function doOffice() {
  const d = Game.state.daily;
  if (d.officeDate !== todayStr()) { d.officeDate = todayStr(); d.officeCount = 0; }
  d.officeCount++;
  const names = ['아침기도', '저녁기도', '끝기도'];
  const sp = gain('spirit', 1.5);
  return `${names[d.officeCount - 1]}를 바쳤습니다. 영성 ${fmt(sp)}`;
}

// ---------- 전례 시기 (실제 날짜) ----------

function easterDate(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function currentSeason(now = new Date()) {
  const y = now.getFullYear();
  const day = 86400000;
  const t = new Date(y, now.getMonth(), now.getDate()).getTime();
  const easter = easterDate(y).getTime();
  const ashWed = easter - 46 * day;
  const pentecost = easter + 49 * day;
  const christmas = new Date(y, 11, 25);
  const adventStart = christmas.getTime() - ((christmas.getDay() || 7) + 21) * day;
  // 주님 세례 축일: 1월 6일 다음 주일 무렵까지 성탄 시기
  const jan6 = new Date(y, 0, 6);
  const baptism = jan6.getTime() + (7 - jan6.getDay()) * day;
  if (t <= baptism) return 'christmas';
  if (t >= ashWed && t < easter - 3 * day) return 'lent';
  if (t >= easter - 3 * day && t <= pentecost) return 'easter';
  if (t >= christmas.getTime()) return 'christmas';
  if (t >= adventStart) return 'advent';
  return 'ordinary';
}

// ---------- 날짜 표시 ----------

function dateLabel() {
  const s = Game.state;
  if (s.phase === 'curate' || s.phase === 'curateEnd') {
    const m = s.phase === 'curateEnd' ? Math.max(0, s.curate.month - 1) : s.curate.month;
    const year = Math.floor(m / 12) + 1;
    const month = ((m + 2) % 12) + 1; // 3월 부임
    return `보좌 ${year}년차 ${month}월`;
  }
  if (s.phase === 'seminary') return SEMINARY_CHAPTERS[s.seminary.chapter].label;
  if (s.phase === 'story') return (STORY[s.story.idx] || STORY[STORY.length - 1]).label;
  if (s.phase === 'pastor') return pastorDateLabel();
  return '예비 신학생';
}

function titleLabel() {
  const s = Game.state;
  switch (s.phase) {
    case 'prologue': return '예비 신학생';
    case 'seminary': return s.seminary.chapter >= 5 ? '부제' : '신학생';
    case 'story': return s.story.idx >= 6 ? '보좌 신부' : s.story.idx >= 5 ? '신부' : s.story.idx >= 4 ? '부제' : '신학생';
    case 'pastor': return '주임 신부';
    default: return '보좌 신부';
  }
}

// ---------- 프롤로그 / 신학교 ----------

function chooseVocation(v) {
  const s = Game.state;
  for (const [k, val] of Object.entries(v.stats)) s.stats[k] += val;
  if (v.hidden) for (const [k, val] of Object.entries(v.hidden)) s.hidden[k] += val;
  s.vocation = v.id;
  startStory();
  addLog(`성소 계기: ${v.title}. 신학교에 입학했습니다.`);
}

// ---------- 신학교·보좌 시절 이야기 ----------

function startStory() {
  const s = Game.state;
  s.phase = 'story';
  s.age = 20;
  s.story = { idx: 0, result: null, quiz: null, pastorType: null };
  s.storyBonus = { offering: 0, members: 0, heart: 0 };
}

function storyScene() { return STORY[Game.state.story.idx]; }

// 장면을 처음 열 때 필요한 준비 (강론 문제, 보좌 시절 주임 신부)
function prepareScene() {
  const st = Game.state.story, sc = storyScene();
  if (sc.quiz && !st.quiz) st.quiz = makeHomilyQuiz();
  if (sc.pastorType && !st.pastorType) st.pastorType = pick(Object.keys(PASTOR_TYPES));
}

function storyChoose(i) {
  const s = Game.state, st = s.story, sc = storyScene();
  if (st.result) return;
  if (sc.quiz) {
    const correct = st.quiz.options[i] === st.quiz.gospel.theme;
    gain('homily', correct ? 7 : 3);
    if (correct) addHidden('holiness', 1);
    st.result = correct
      ? '미사가 끝나고 할머니 한 분이 손을 꼭 잡으셨다. "부제님 강론 듣고 눈물이 났어요."'
      : `떨렸지만 무사히 마쳤다. 나중에 보니 복음의 핵심은 "${st.quiz.gospel.theme}"${josa(st.quiz.gospel.theme, "이었다", "였다").slice(st.quiz.gospel.theme.length)}. 더 깊이 묵상해야겠다.`;
    st.correct = correct;
  } else {
    const c = sc.choices[i];
    c.effect();
    st.result = c.result;
  }
  addLog(`${sc.title}: ${st.result}`);
}

function storyNext() {
  const s = Game.state, st = s.story;
  st.idx++;
  st.result = null;
  st.quiz = null;
  s.age = Math.min(30, 20 + st.idx * 1.5) | 0;
  if (st.idx >= STORY.length) finishStory();
}

function finishStory() {
  const s = Game.state;
  // 7년의 양성과 2년의 보좌 생활
  for (const k of Object.keys(STAT_NAMES)) gain(k, 8);
  s.age = 32;
  s.evaluation = null;
  startPastor();
}

function startChapter(i) {
  const s = Game.state;
  s.seminary.chapter = i;
  s.seminary.progress = {};
  s.seminary.choiceDone = false;
  s.energyMax = 10 + i * 2;
  s.energy = s.energyMax;
  if (i > 0) s.age = 20 + i;
}

function chapterTasksDone() {
  const s = Game.state;
  const ch = SEMINARY_CHAPTERS[s.seminary.chapter];
  return ch.tasks.every(t => (s.seminary.progress[t.action] || 0) >= t.count);
}

function availableActions() {
  const s = Game.state;
  if (s.phase === 'seminary') {
    const unlocked = new Set();
    for (let i = 0; i <= s.seminary.chapter; i++) SEMINARY_CHAPTERS[i].unlock.forEach(a => unlocked.add(a));
    return ACTIONS.filter(a => unlocked.has(a.id) && a.phases.includes('seminary'));
  }
  if (s.phase === 'curate' || s.phase === 'pastor') return ACTIONS.filter(a => a.phases.includes(s.phase));
  return [];
}

// 행동 실행. 결과 문장을 돌려준다.
function runAction(action) {
  const s = Game.state;
  // 주임 신부: 같은 일을 하루에 여러 번 하면 행동력이 더 든다
  const cost = actionCost(action);
  if (s.energy < cost) return null;
  spendEnergy(cost);
  if (s.phase === 'pastor') countAction(action.id);
  let msg = action.run();
  if (cost > action.cost) msg += ` · 오늘 여러 번 해서 행동력 ${cost} 들었어요`;
  if (s.phase === 'seminary') s.seminary.progress[action.id] = (s.seminary.progress[action.id] || 0) + 1;
  addLog(`${action.icon} ${action.name}: ${msg}`);
  return msg;
}

// 강론 준비 미니게임 문제 만들기
function makeHomilyQuiz() {
  const g = pick(GOSPELS);
  const others = GOSPELS.filter(x => x !== g).sort(() => Math.random() - 0.5).slice(0, 2).map(x => x.theme);
  const options = [g.theme, ...others].sort(() => Math.random() - 0.5);
  return { gospel: g, options };
}

function answerHomilyQuiz(quiz, choice) {
  const s = Game.state;
  const action = ACTIONS.find(a => a.id === 'prep');
  spendEnergy(typeof actionCost === 'function' ? actionCost(action) : action.cost);
  if (s.phase === 'pastor') countAction(action.id);
  const correct = choice === quiz.gospel.theme;
  const h = gain('homily', correct ? 2.5 : 1);
  const prepGain = correct ? 2 : 0.5;
  if (s.phase === 'curate') s.curate.monthly.prep = (s.curate.monthly.prep || 0) + prepGain;
  else if (s.phase === 'pastor') s.pastor.prep += prepGain;
  else s.seminary.prep = (s.seminary.prep || 0) + prepGain;
  if (s.phase === 'seminary') s.seminary.progress.prep = (s.seminary.progress.prep || 0) + 1;
  const msg = correct
    ? `복음의 핵심을 잘 짚었습니다! 강론력 ${fmt(h)}, 강론 준비 +${prepGain}`
    : `주제가 복음과 조금 어긋났습니다. (정답: ${quiz.gospel.theme}) 강론력 ${fmt(h)}, 강론 준비 +${prepGain}`;
  addLog(`✍️ 강론 준비 (${quiz.gospel.title}): ${msg}`);
  return { correct, msg };
}

// 강론 판정: 0~100 점수와 결과
// 강론 판정: 점수 = 강론력 × 0.7 + 강론 준비 × 8 + 영성 보너스 + 운(−12~12). 38점 이상 감동, 18점 이상 무난
const HOMILY = { moved: 38, ok: 18, luck: 12 };

// 강론 판정 확률
function homilyOdds(prep) {
  const s = Game.state;
  const base = s.stats.homily * 0.7 + prep * 8 + (spiritMult() - 1) * 30;
  const atLeast = t => clamp((base + HOMILY.luck - t) / (HOMILY.luck * 2), 0, 1);
  const moved = atLeast(HOMILY.moved), ok = atLeast(HOMILY.ok) - moved;
  return { moved, ok, boring: 1 - moved - ok };
}

function judgeHomily(prep) {
  const s = Game.state;
  const spiritBonus = (spiritMult() - 1) * 30;
  const score = s.stats.homily * 0.7 + prep * 8 + spiritBonus + rand(-HOMILY.luck, HOMILY.luck);
  if (score >= HOMILY.moved) return { score, grade: 'moved', label: '감동', icon: '😭' };
  if (score >= HOMILY.ok) return { score, grade: 'ok', label: '무난', icon: '🙂' };
  return { score, grade: 'boring', label: '지루함', icon: '😴' };
}

function finishFirstHomily() {
  const s = Game.state;
  const r = judgeHomily(s.seminary.prep || 0);
  const comments = {
    moved: '미사 후 할머니 한 분이 손을 꼭 잡으셨다. "부제님 강론 듣고 눈물이 났어요."',
    ok: '떨렸지만 무사히 마쳤다. 본당 신부님이 어깨를 두드려 주셨다.',
    boring: '맨 앞줄 아저씨가 꾸벅꾸벅 졸았다. 더 연습해야겠다.',
  };
  if (r.grade === 'moved') addHidden('holiness', 1);
  gain('homily', r.grade === 'moved' ? 3 : 1.5);
  addLog(`첫 강론: ${r.label}`);
  return { ...r, comment: comments[r.grade] };
}

function ordain() {
  const s = Game.state;
  const types = Object.keys(PASTOR_TYPES);
  s.phase = 'curate';
  s.age = 28;
  s.energyMax = 30;
  s.energy = 30;
  s.lastEnergyTs = Date.now();
  s.stats.spirit = clamp(s.stats.spirit + 15, 0, 100); // 서품의 은총
  s.curate = {
    pastorType: pick(types),
    pastorName: pick(PASTOR_NAMES),
    relation: 40,
    month: 0,
    monthly: {},
    pending: [],
    dumpedTasks: 0,
    done: [],
    event: null,
    youthLv: 1,
    ready: false,  // 청년회 Lv3을 이루면 주임 신부님이 발령 소식을 전한다
  };
  s.parish = {
    name: pick(PARISH_NAMES) + ' 본당',
    members: Math.round(rand(1800, 2600)),
    attendance: Math.round(rand(18, 26)),
    finance: Math.round(rand(300, 800)),
    building: Math.round(rand(45, 65)),
    reputation: Math.round(rand(30, 45)),
    groups: { youth: Math.round(rand(8, 18)), school: Math.round(rand(15, 30)), legio: Math.round(rand(30, 45)), choir: Math.round(rand(30, 50)) },
    start: null,
  };
  s.parish.start = { attendance: s.parish.attendance, youth: s.parish.groups.youth, school: s.parish.groups.school };
  if (s.curate.pastorType === 'dumper') s.curate.dumpedTasks = 2;
  addLog(`사제서품. ${s.parish.name} 보좌 신부로 발령받았습니다.`);
}

// ---------- 승인 요청 ----------

function requestState(req) {
  const c = Game.state.curate;
  if (c.done.includes(req.id)) return 'done';
  if (c.pending.includes(req.id)) return 'pending';
  if (req.need && !req.need()) return 'locked';
  return 'open';
}

function submitRequest(req) {
  Game.state.curate.pending.push(req.id);
  addLog(`📨 승인 요청: ${req.name} (예산 ${req.budget}만 원)`);
}

function approvalChance(req) {
  const s = Game.state;
  const t = PASTOR_TYPES[s.curate.pastorType];
  const relBonus = (s.curate.relation - 40) / 100;
  const budgetPenalty = req.budget > s.parish.finance ? 0.4 : req.budget / 2000;
  return clamp(t.approveBase + relBonus - budgetPenalty, 0.05, 0.95);
}

// ---------- 청년회 키우기 (보좌 신부의 맛보기 목표) ----------

const YOUTH_UP_COST = 3;

function youthNextNeed() {
  const next = YOUTH_LEVELS[Game.state.curate.youthLv + 1];
  return next ? next.need : null;
}

function canUpgradeYouth() {
  const s = Game.state, need = youthNextNeed();
  return need !== null && s.parish.groups.youth >= need && s.energy >= YOUTH_UP_COST;
}

function upgradeYouth() {
  const c = Game.state.curate;
  if (!canUpgradeYouth()) return null;
  spendEnergy(YOUTH_UP_COST);
  c.youthLv++;
  gain('admin', 1.5);
  addLog(`🎸 청년회가 Lv${c.youthLv}로 올랐습니다.`);
  if (c.youthLv >= YOUTH_LEVELS.length - 1) {
    c.ready = true;
    return `청년회가 Lv${c.youthLv}로 올랐어요! 주임 신부님이 찾으세요.`;
  }
  return `청년회가 Lv${c.youthLv}로 올랐어요! 임원진이 생기고 모임이 자리를 잡았어요.`;
}

function finishCurate() {
  const s = Game.state;
  s.phase = 'curateEnd';
  s.evaluation = evaluateCurate();
}

// ---------- 월 진행 ----------

function canEndMonth() { return Game.state.energy >= SUNDAY_COST; }

// 한 달을 마무리하고 보고서(문장 목록)를 돌려준다
function endMonth() {
  const s = Game.state;
  const c = s.curate;
  const p = s.parish;
  const report = { sermons: [], lines: [] };
  spendEnergy(SUNDAY_COST);

  // 주일미사 4번 강론 판정. 준비 점수는 첫 두 주에 크게, 이후 절반
  const prep = c.monthly.prep || 0;
  for (let w = 0; w < 4; w++) {
    const r = judgeHomily(w < 2 ? prep : prep / 2);
    report.sermons.push(r);
    if (r.grade === 'moved') { addParish('attendance', 0.08); addParish('reputation', 0.3); }
    if (r.grade === 'ok') addParish('attendance', 0.01);
    if (r.grade === 'boring') addParish('attendance', -0.06);
  }

  // 주임 신부의 승인 결과
  for (const id of c.pending) {
    const req = REQUESTS.find(r => r.id === id);
    if (Math.random() < approvalChance(req)) {
      addParish('finance', -req.budget);
      const eff = req.approve();
      c.done.push(id);
      report.lines.push(`✅ ${req.name} 승인! ${eff}`);
      addLog(`✅ 승인: ${req.name}`);
    } else {
      report.lines.push(`❌ ${req.name} — "${pick(['다음에 다시 이야기하지.', '지금은 예산이 빠듯해.', '조금 더 준비해서 가져와.'])}"`);
      addLog(`❌ 반려: ${req.name}`);
    }
  }
  c.pending = [];

  // 떠넘긴 업무
  if (c.pastorType === 'dumper') {
    if (c.dumpedTasks > 0) {
      addPastor(-3 * c.dumpedTasks);
      report.lines.push(`📂 처리하지 못한 업무 ${c.dumpedTasks}건 때문에 주임 신부님이 언짢아하신다.`);
    }
    c.dumpedTasks = Math.floor(rand(1, 3.99));
  }

  // 돌보지 않은 단체는 조금씩 식는다
  if (!c.monthly.youth) addGroup('youth', -2);
  if (!c.monthly.school) addGroup('school', -1.5);

  // 본당 자연 변화: 살아 있는 단체가 신자들을 성당으로 이끈다
  const groupPull = ((p.groups.youth + p.groups.school) / 2 - 35) * 0.003;
  addParish('attendance', groupPull);
  addParish('building', -0.5);
  addPastor(-1);
  const offering = Math.round(p.members * p.attendance / 100 * 0.4);
  addParish('finance', offering - 120);
  report.lines.push(`💰 이번 달 본당 재정: 봉헌 ${offering}만 원, 지출 120만 원`);

  // 영성 소모와 번아웃
  gain('spirit', -2);
  if (s.stats.spirit < 30 && Math.random() < 0.3) {
    s.energy = 0;
    report.lines.push('😵 몸과 마음이 지쳐 며칠 앓아누웠다. (행동력 0) 기도와 피정으로 영성을 회복하자.');
    addLog('😵 번아웃');
  }

  c.month++;
  c.monthly = {};
  if (c.month % 12 === 0) s.age++;

  if (c.month >= CURATE_TERM) {
    finishCurate();
    return report;
  }

  // 다음 달 이벤트 (60%)
  const pool = EVENTS.filter(e => !e.cond || e.cond());
  c.event = Math.random() < 0.6 ? pick(pool).id : null;
  return report;
}

function evaluateCurate() {
  const s = Game.state;
  const p = s.parish;
  const st = s.stats;
  const avg = (st.homily + st.doctrine + st.rapport + st.admin + st.spirit) / 5;
  const growth = (p.attendance - p.start.attendance) * 3 + (p.groups.youth - p.start.youth) * 0.4 + (p.groups.school - p.start.school) * 0.3;
  // 청년회를 키운 만큼, 그리고 일찍 마칠수록 가산점
  const youthBonus = (s.curate.youthLv - 1) * 15 + (s.curate.youthLv >= 3 ? Math.max(0, CURATE_TERM - s.curate.month) * 2 : 0);
  const score = s.curate.relation * 0.35 + avg * 0.4 + growth + youthBonus;
  let grade, comment;
  if (score >= 90) { grade = 'S'; comment = '"자네 같은 보좌는 처음이었네. 어느 본당에 가도 잘할 걸세."'; }
  else if (score >= 60) { grade = 'A'; comment = '"수고 많았네. 본당이 한결 밝아졌어."'; }
  else if (score >= 35) { grade = 'B'; comment = '"무난하게 잘 해 주었네. 주임이 되면 더 배울 게 많을 거야."'; }
  else { grade = 'C'; comment = '"아직 배울 게 많네. 그래도 첫 본당이니까."'; }
  return { score: Math.round(score), grade, comment };
}
