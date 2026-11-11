// 화면(HUD·메뉴·모달)과 입력 처리. 월드 그리기는 world.js

const UI = { modalQueue: [], modalOpen: false };
const $app = document.getElementById('app');
const $hud = document.getElementById('hud');

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// 교회 용어에 설명 툴팁을 붙인다
function term(word, shown) {
  if (!GLOSSARY[word]) return esc(shown || word);
  return `<span class="term" data-term="${esc(word)}">${esc(shown || word)}</span>`;
}

// 문장 속 용어에 자동으로 툴팁을 붙인다
function glossarize(text) {
  let out = text;
  for (const word of Object.keys(GLOSSARY).sort((a, b) => b.length - a.length)) {
    if (out.includes(word) && !out.includes(`data-term="${word}"`)) out = out.replace(word, term(word));
  }
  return out;
}

function toast(msg, silent) {
  if (!silent && typeof Sound !== 'undefined') Sound.sfxForText(msg);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- 모달 ----------

// ---------- 대화 얼굴 (v1.08) ----------
// 사람이 말하는 창은 게임 화면을 그대로 둔 채, 왼쪽 아래에 말하는 사람 얼굴이 떠오르고 글은 아래 상자에 나온다.
// 얼굴 그림: assets/story/face-<이름>.webp (tools/comfy-face.py)
const FACE_IMG = n => `assets/story/face-${n}.webp?v=2`;
// 말하는 사람 글(이름·별명)로 얼굴을 고른다
function faceFor(who) {
  const w = String(who || '');
  if (/수녀/.test(w)) return 'sister';
  if (/사목회장/.test(w)) return 'council';
  if (/사무원|사무장/.test(w)) return 'clerk';
  if (/주교/.test(w)) return 'diocese';
  if (/할머니|어머님|권사|노부인|할매/.test(w)) return 'faithful';
  if (/할아버지|어르신|노인|이장|회장님|영감/.test(w)) return 'grandpa';
  if (/엄마|어머니|아내|부인|며느리|딸/.test(w)) return 'woman';
  if (/청년|학생|젊은|아이|소년|소녀|대학|군인|신학생/.test(w)) return 'youth';
  if (/자매|엄마|어머니|아내|부인|여|며느리|딸|교사/.test(w)) return 'woman';
  if (/신부/.test(w)) return 'deanery';
  return 'man';
}
// 단체가 청할 때: 단체 성격에 맞는 얼굴
function faceForUnit(type) {
  const u = String(type || '');
  if (/^(youth|soccer|server|school2|organ)$/.test(u)) return 'youth';
  if (/^(parentsK|parentsY|mothers|legio|catechumen|choir|school|altar|flower|cafe|prayer|shop)$/.test(u)) return 'woman';
  if (/^(senior|elders|relics)$/.test(u)) return 'faithful';
  if (/^(district|christopher|golf|facility|vincent|eucharist)$/.test(u)) return 'grandpa';
  if (/^vocation$/.test(u)) return 'sister';
  return 'man';
}

// opts: { title, html, options: [{label, sub, disabled, onClick}], buttons: [{label, cls, onClick}],
//         face: 얼굴 이름(있으면 대화 모양 창: 게임 화면 위 얼굴 + 아래 글 상자), who: 이름표(없으면 title), bg: 게임 화면 대신 깔 장면 그림 }
function modal(opts) {
  UI.modalQueue.push(opts);
  if (!UI.modalOpen) nextModal();
}

function nextModal() {
  const root = document.getElementById('modal-root');
  const opts = UI.modalQueue.shift();
  if (!opts) { UI.modalOpen = false; root.innerHTML = ''; return; }
  UI.modalOpen = true; UI.modalAt = Date.now();
  World.keys = {};
  if (typeof Sound !== 'undefined') Sound.sfx('open');
  const buttons = [...(opts.buttons || (opts.options ? [{ label: '닫기', cls: 'ghost' }] : [{ label: '확인' }]))];
  if (UI.rotFor && !opts.noRotate) { const id = UI.rotFor; UI.rotFor = null; buttons.unshift({ label: '↻ 돌리기', cls: 'ghost', onClick: () => { const m = rotateThing(id); if (m) toast(m); } }); }
  // 바탕을 누르거나 ✕로 닫을 수 있는 창: 할 일 없이 닫기만 하는 단추가 있을 때 (꼭 골라야 하는 창은 닫히지 않는다)
  const dismiss = buttons.find(b => !b.onClick);
  // 건물을 눌러 연 창: 위쪽에 그 건물 그림을 크게
  const head = UI.headFor; UI.headFor = null;
  const hero = head ? buildingHeroHtml(head) : '';
  // tile: true인 선택지(그 건물에서 하는 일)는 위쪽에 큰 칸으로, 나머지는 아래 목록으로
  const all = (opts.options || []).map((o, i) => ({ o, i }));
  const tiles = all.filter(x => x.o.tile), rows = all.filter(x => !x.o.tile);
  // 바깥 화면에서는 큰 칸과 목록을 한 격자의 가로 박스로 모은다
  const compact = document.body.classList.contains('overview');
  const tileHtml = ({ o, i }, n) => {
    const m = o.label.match(/^(\S+)\s+([\s\S]*)$/) || [null, '•', o.label];
    return `<button class="opt tile" data-opt="${i}" ${o.disabled ? 'aria-disabled="true"' : ''} title="${(o.sub || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">
      <span class="num">${n}</span><span class="t-icon">${m[1]}</span><span class="t-label">${m[2]}</span>${o.tileSub ? `<span class="sub">${o.tileSub}</span>` : ''}</button>`;
  };
  const say = !!opts.face;
  if (say && typeof Sound !== 'undefined' && !opts.silent) { const q = (String(opts.html || '').match(/class="serif[^"]*">([\s\S]*?)<\/p>/) || [])[1]; if (q) setTimeout(() => Sound.speak(q, opts.face), 350); }
  root.innerHTML = `
    <div class="modal-bg${say ? ' say-bg' : ''}"${say && opts.bg ? ` style="background:linear-gradient(180deg, rgba(20,12,8,0) 40%, rgba(20,12,8,.45) 100%), #2b2018 url('${STORY_IMG(opts.bg)}') center / cover no-repeat"` : ''}>${say ? `<div class="say-face${opts.faceCls ? ' ' + opts.faceCls : ''}"><img src="${FACE_IMG(opts.face)}" alt=""></div>` : ''}<div class="modal${hero ? ' has-hero' : ''}${say ? ' say' : ''}">
      ${dismiss ? '<button class="m-close" data-close="1" aria-label="닫기">✕</button>' : ''}
      ${say && (opts.who || opts.title) ? `<div class="say-name">${opts.who || opts.title}</div>` : ''}
      <div class="m-head">${hero}<div class="m-titles">
        ${opts.title && !(say && !opts.who) ? `<h2>${opts.title}</h2>` : ''}
        <div class="m-desc">${opts.html || ''}</div>
      </div></div>
      ${tiles.length && !compact ? `<div class="tiles">${tiles.map((x, k) => tileHtml(x, k + 1)).join('')}</div>` : ''}
      ${rows.length || (compact && tiles.length) ? `<div class="buttons opt-rows">
        ${compact ? tiles.map(({ o, i }) => { const m = o.label.match(/^(\S+)\s+([\s\S]*)$/) || [null, '•', o.label]; return `
          <button class="opt box" data-opt="${i}" ${o.disabled ? 'aria-disabled="true"' : ''} title="${(o.sub || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">
            <span class="o-label"><span class="o-icon">${m[1]}</span>${m[2]}</span>${o.tileSub ? `<span class="sub">${o.tileSub}</span>` : ''}
          </button>`; }).join('') : ''}
        ${rows.map(({ o, i }, k) => `
          <button class="opt" data-opt="${i}" ${o.disabled ? 'aria-disabled="true"' : ''} title="${(o.sub || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">
            <span class="o-label"><span class="num">${tiles.length + k + 1}</span>${o.label}</span>${o.sub ? `<span class="sub">${o.sub}</span>` : ''}
          </button>`).join('')}
      </div>` : ''}
      <div class="buttons btn-row">
        ${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-btn="${i}">${b.label}</button>`).join('')}
      </div>
    </div></div>`;
  // 잠긴 선택지(v1.07): 눌러도 닫지 않고 왜 안 되는지 알려 준다 (예전엔 눌러도 아무 일이 없어 고장처럼 보였다)
  root.querySelectorAll('[data-opt]').forEach(el => el.onclick = () => { const o = opts.options[+el.dataset.opt]; if (o.disabled) { lockedTap(o); return; } closeModalThen(o.onClick); });
  markHintOption(root);
  root.querySelectorAll('[data-btn]').forEach(el => el.onclick = () => closeModalThen(buttons[+el.dataset.btn].onClick));
  if (dismiss) {
    root.querySelector('[data-close]').onclick = () => closeModalThen(null);
    root.querySelector('.modal-bg').addEventListener('click', e => { if (e.target.classList.contains('modal-bg')) closeModalThen(null); });
  }
}

// 잠긴 선택지를 눌렀을 때: 까닭(why → 설명 → 작은 글)과, 행동력 때문이면 다음 회복까지 남은 시간
function lockedTap(o) {
  const strip = t => String(t || '').replace(/<[^>]+>/g, '').trim();
  // 설명 속 굵은 글(<b>막힌 까닭</b>)이 있으면 그것만 (v1.08: 비교·비용 글 끝에 묻혀 안 보이던 것)
  const bold = (String(o.sub || '').match(/<b>([\s\S]*?)<\/b>/) || [])[1];
  let why = strip(o.why) || strip(bold) || strip(o.sub) || strip(o.tileSub) || '지금은 할 수 없어요';
  const cost = (String(o.label).match(/⚡(\d+)/) || [])[1];
  if (/행동력/.test(why) || (cost && Game.state.energy < +cost)) {
    const sec = secondsToNextEnergy();
    why = `⚡ 행동력이 모자라요 (지금 ${Math.floor(Game.state.energy)}${cost ? ` / 필요 ${cost}` : ''})${sec !== null ? ` · ${fmtDur(sec)} 뒤 1 차요` : ''}`;
  }
  Sound.sfx('error'); toast(`🔒 ${why}`);
}

// 건물 창 머리: 지금 방향의 건물 그림을 작은 마당 위에 세워 보여 준다
function buildingHeroHtml(b) {
  if (typeof spriteKeys !== 'function') return '';
  const keys = b.decor ? [`decor-${b.decor}`] : spriteKeys(b), rot = b.rot || 0;
  for (const k of keys) {
    const turned = rot ? getSprite(`${k}@${rot}`) : null, img = turned || getSprite(k);
    if (!img || !img.src) continue;
    const flip = !turned && rot % 2 === 1;
    const lv = b.level ? `<span class="m-lv">Lv${b.level}</span>` : '';
    return `<div class="m-hero"><div class="m-ground"></div><img src="${img.src}" alt=""${flip ? ' class="flip"' : ''}>${lv}</div>`;
  }
  return '';
}

// 모달 키보드 조작: 숫자키로 선택지, Esc로 닫기 (스페이스로 연 직후 오작동을 막으려고 자동 포커스는 하지 않는다)
document.addEventListener('click', e => {
  const b = e.target.closest('#modal-root [data-bud]');
  if (!b) return;
  const [type, v] = b.dataset.bud.split(':');
  setBudget(type, v);
  save();
  for (const x of document.querySelectorAll(`#modal-root [data-bud^="${type}:"]`)) x.classList.toggle('on', x === b);
  const n = document.getElementById('bud-sum'); if (n) n.innerHTML = budgetSummary();
});
document.addEventListener('click', e => {
  const b = e.target.closest('#modal-root [data-pol]');
  if (!b) return;
  const [id, v] = b.dataset.pol.split(':');
  setPolicy(id, v);
  save();
  for (const x of document.querySelectorAll(`#modal-root [data-pol^="${id}:"]`)) x.classList.toggle('on', x === b);
});

document.addEventListener('keydown', e => {
  if (!UI.modalOpen) return;
  const root = document.getElementById('modal-root');
  if (/^Digit[1-9]$/.test(e.code)) {
    const opt = root.querySelectorAll('.opt')[+e.code.slice(5) - 1];
    if (opt) opt.click();
  } else if (e.code === 'Escape') {
    const btns = root.querySelectorAll('[data-btn]');
    if (btns.length) btns[btns.length - 1].click();
  } else if (e.code === 'Enter' && !root.querySelector('.opt')) {
    const btn = root.querySelector('[data-btn]');
    if (btn) { e.preventDefault(); btn.click(); }
  }
});

function closeModalThen(fn) {
  if (document.querySelector('#modal-root .say-bg') && typeof Sound !== 'undefined') Sound.hush();
  if (fn) fn();
  save();
  render();
  nextModal();
}

// ---------- 공통 조각 ----------

function statBars() {
  const s = Game.state;
  return Object.keys(STAT_NAMES).map(k => `
    <div class="stat-row">
      <span>${STAT_ICONS[k]}</span><span>${STAT_NAMES[k]}</span>
      <div class="bar stat"><span style="width:${s.stats[k]}%"></span></div>
      <span class="v">${Math.floor(s.stats[k])}</span>
    </div>`).join('');
}

function energyHtml() {
  const s = Game.state;
  const pct = Math.min(100, s.energy / s.energyMax * 100);
  const next = secondsToNextEnergy();
  if (World.overview) {
    const t = next !== null ? `<small> ${Math.floor(next / 60)}:${String(next % 60).padStart(2, '0')}</small>` : '';
    return `<span id="energy" class="chip" title="행동력 · 다음 +1까지">⚡ ${s.energy}<small>/${s.energyMax}</small>${t}</span>`;
  }
  let right;
  if (s.phase === 'seminary') right = '과정마다 가득';
  else if (next !== null) right = `+1까지 ${Math.floor(next / 60)}:${String(next % 60).padStart(2, '0')}`;
  else right = '가득';
  return `
    <div class="energy" id="energy">
      <div class="energy-row"><b>⚡ ${s.energy}/${s.energyMax}</b><span>${right}</span></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
    </div>`;
}

// ---------- 각 장소·인물에서 할 수 있는 일 ----------

// 장소(메뉴)별 행동 id. 신학교 과제 안내에도 쓴다
const MENU_ACTIONS = {
  semChapel: ['pray', 'practice', 'prep'],
  semLecture: ['study', 'catechism'],
  semDorm: ['talk'],
  classmate: ['talk'],
  church: ['pray', 'prep', 'practice', 'pCate', 'retreat'],
  rectory: ['study', 'pOffice'],
  pRectory: ['prep', 'practice', 'pCate', 'study'],  // v0.75: 주임 신부는 강론·교리 준비를 사제관에서
  pChurch: ['pray'],
  office: ['office', 'pOffice'],
  edu: ['catechism', 'youth'],
  house: ['visit', 'sick', 'pVisit', 'pSick'],
  pastor: ['pastorMeal'],
};

// 행동이 있는 장소 이름 (과제 안내용)
function whereIs(actionId) {
  const map = MAPS[World.mapId];
  if (!map) return '';
  for (const b of map.buildings) if ((MENU_ACTIONS[b.menu] || []).includes(actionId)) return b.label;
  for (const n of map.npcs) if ((MENU_ACTIONS[n.menu] || []).includes(actionId)) return n.name;
  return '';
}

function actionOptions(menuId) {
  const s = Game.state;
  const avail = new Set(availableActions().map(a => a.id));
  return (MENU_ACTIONS[menuId] || []).filter(id => avail.has(id)).map(id => {
    const a = ACTIONS.find(x => x.id === id);
    const cost = actionCost(a), extra = cost - a.cost;
    return {
      tile: World.overview,
      tileSub: extra ? `오늘 ${actionCount(a.id)}번 · ⚡+${extra}` : '',
      label: `${a.icon} ${a.name} <span class="cost">⚡${cost}</span>`,
      sub: extra ? `오늘 ${actionCount(a.id)}번 했어요 · 이번엔 행동력 ${cost} (여러 번 하면 더 들어요)` : a.desc,
      disabled: s.energy < cost,
      onClick: () => doAction(a),
    };
  });
}

function lockedOption(name, reason) {
  return { label: `🔒 ${name}`, sub: reason, disabled: true };
}

function doAction(a) {
  if (Game.state.energy < actionCost(a)) return;
  if (a.minigame === 'homily') { openHomilyQuiz(); return; }
  const msg = runAction(a);
  if (msg) toast(`${a.icon} ${msg}`);
}

function chatModal(t) {
  const s = Game.state;
  const line = pick(t.lines);
  // 한 달에 한 번, 처음 인사하면 친화력이 조금 오른다
  if (s.phase === 'curate' && !s.curate.monthly['chat_' + t.npc.id]) {
    s.curate.monthly['chat_' + t.npc.id] = true;
    gain('rapport', 0.6);
  }
  modal({ face: t.npc && /sister|수녀/.test(t.npc.id + t.label) ? 'sister' : faceFor(t.label), who: t.label, html: `<p class="serif">${line}</p>`, buttons: [{ label: '닫기', cls: 'ghost' }] });
}

const MENUS = {
  semChapel: t => {
    const ch = SEMINARY_CHAPTERS[Game.state.seminary.chapter];
    if (ch.ordination) {
      modal({ title: '⛪ ' + t.label, html: '<p>오늘은 사제서품식이 열리는 날이다. 제대 앞에 부모님과 동기들이 모여 있다.</p>', options: [{ label: '✝️ 사제서품 받기', onClick: onOrdain }] });
      return;
    }
    modal({ title: '⛪ ' + t.label, options: [...dailyMassOption(), ...actionOptions('semChapel')] });
  },
  semLecture: t => modal({ title: '🏫 ' + t.label, options: actionOptions('semLecture') }),
  semDorm: t => modal({
    title: '🛏️ ' + t.label,
    options: [...actionOptions('semDorm'), {
      label: '😴 쉬기', sub: '행동력을 가득 채운다', disabled: Game.state.energy >= Game.state.energyMax,
      onClick: () => { Game.state.energy = Game.state.energyMax; toast('😴 푹 쉬었어요. 행동력이 가득 찼어요.'); },
    }],
  }),
  classmate: t => modal({ face: 'youth', who: t.label, title: t.label, html: `<p class="serif">${pick(['"같이 커피 한잔할래?"', '"요즘 기도 잘 돼?"', '"우리 서품 때까지 같이 가자."'])}</p>`, options: actionOptions('classmate') }),
  director: () => {
    const s = Game.state;
    const ch = SEMINARY_CHAPTERS[s.seminary.chapter];
    if (ch.ordination) { modal({ face: 'mentor', title: '영성 지도 신부님', html: '<p class="serif">"드디어 오늘이군. 성당으로 가게. 모두가 기다리고 있네."</p>' }); return; }
    if (!chapterTasksDone()) {
      const left = ch.tasks.filter(x => (s.seminary.progress[x.action] || 0) < x.count)
        .map(x => { const a = ACTIONS.find(y => y.id === x.action); return `${a.icon} ${a.name} (${whereIs(x.action)})`; });
      modal({ face: 'mentor', title: '영성 지도 신부님', html: `<p class="serif">"서두르지 말게. 아직 할 일이 남았네."</p><p class="small">${left.join('<br>')}</p>` });
      return;
    }
    modal({
      face: 'mentor', title: '영성 지도 신부님',
      html: `<p class="serif">"${ch.firstHomily ? '준비가 되었나? 이제 강론대에 설 시간이네.' : '이번 과정을 잘 마쳤군.'}"</p>`,
      options: [{ label: ch.firstHomily ? '🎤 첫 강론 하러 가기' : '➡️ 다음 과정으로', onClick: onNextChapter }],
    });
  },

  church: t => {
    if (Game.state.phase === 'pastor') { pastorChurchMenu(t); return; }
    const can = canEndMonth();
    modal({
      title: '⛪ ' + t.label,
      options: [
        ...dailyMassOption(),
        ...actionOptions('church'),
        { label: `⛪ 주일미사 집전하고 다음 달로 <span class="cost">⚡${SUNDAY_COST}</span>`, sub: can ? '이번 달을 마무리해요. 강론 판정이 4번 있어요.' : `행동력 ${SUNDAY_COST}이 필요해요`, disabled: !can, onClick: onEndMonth },
      ],
    });
  },
  rectory: t => {
    const left = officeLeft();
    modal({
      title: '🏠 ' + t.label,
      options: [
        { label: `📿 ${term('성무일도')} (${OFFICE_PER_DAY - left}/${OFFICE_PER_DAY})`, sub: '하루 세 번, 행동력 없이 영성을 회복해요', disabled: left <= 0, onClick: () => toast(`📿 ${doOffice()}`) },
        ...(Game.state.phase === 'pastor' ? [{ tile: true, label: '🙏 축복 요청', tileSub: blessReqs().length ? `${blessReqs().length}건 기다려요` : '없어요', onClick: () => setTimeout(openBlessings, 0) }] : []),
        ...actionOptions(Game.state.phase === 'pastor' ? 'pRectory' : 'rectory'),
        ...(Game.state.phase === 'pastor' ? curateOptions() : []),
        ...(Game.state.phase === 'pastor' && jobFor('rectory') ? jobOptions(jobFor('rectory')) : fixedUpgradeOption('rectory')),
      ],
    });
  },
  office: t => {
    if (Game.state.phase === 'pastor') { openOfficeMenu(t); return; }
    officeCurateMenu(t);
  },
  _officeCurate: t => modal({
    title: '🗂️ ' + t.label,
    options: [...actionOptions('office'), lockedOption('재정 결재', '주임 신부 권한 · 주임 신부님께 승인 요청을 올려요'), lockedOption('직원 채용', '주임 신부 권한')],
  }),
  edu: t => {
    const s = Game.state, c = s.curate;
    const need = youthNextNeed();
    const youthOpt = need === null
      ? { label: `🎸 청년회 Lv${c.youthLv} (최고)`, sub: '주임 신부님께 가 보세요', disabled: true }
      : {
        label: `🎸 청년회 키우기 Lv${c.youthLv} → Lv${c.youthLv + 1} <span class="cost">⚡${YOUTH_UP_COST}</span>`,
        sub: s.parish.groups.youth >= need ? '임원을 세우고 모임 체계를 갖춰요' : `청년회 활성도 ${Math.floor(s.parish.groups.youth)}/${need} · 청년회 모임과 승인 요청으로 올려요`,
        disabled: !canUpgradeYouth(),
        onClick: () => { const m = upgradeYouth(); if (m) toast(`🎸 ${m}`); },
      };
    modal({ title: '🏫 ' + t.label, options: [youthOpt, ...actionOptions('edu'), lockedOption('새 단체 세우기', '주임 신부가 되면 열려요'), lockedOption('사목회 구성', '주임 신부 권한')] });
  },
  house: t => modal({ title: '🏡 ' + t.label, options: actionOptions('house') }),
  pastor: () => {
    const c = Game.state.curate;
    const type = PASTOR_TYPES[c.pastorType];
    modal({
      face: 'pastor', title: `👴 ${c.pastorName} 신부님`,
      html: `<p class="muted">${type.label} · 관계 ${Math.floor(c.relation)}</p>${c.pastorType === 'dumper' && c.dumpedTasks > 0 ? `<p class="serif">"아, 보좌 신부. 사무실에 서류 ${c.dumpedTasks}건 좀 봐 주게."</p>` : ''}`,
      options: [
        ...(c.ready ? [{ label: '📜 발령 소식 듣기', sub: '청년회를 잘 키웠어요. 신부님이 하실 말씀이 있대요', onClick: onCurateDone }] : []),
        ...actionOptions('pastor'),
        { label: '📨 승인 요청하기', sub: '예산이 드는 일은 주임 신부님 결재가 필요해요', onClick: () => setTimeout(openRequests, 0) },
        lockedOption('공사·보수 발주', '주임 신부 권한 · 건의만 할 수 있어요'),
      ],
    });
  },
  event: () => openEvent(),

  // ---- 주임 신부 (솔뫼 본당) ----
  plot: t => openBuildMenu(t.plot),
  religion: t => openReligion(t.building.religion),
  townhall: () => openTownReligions(),
  container: t => openContainerMenu(t.building.plotId),
  decor: t => openDecorInfo(t.building),
  gongso: t => openGongsoMenu(t.building.plotId),
  council: () => openCouncilMenu(),
  village: t => openVillage(t.npc.village),
};

// ---------- 주임 신부 메뉴 ----------

function costText(c, up) {
  return `💰${c.offering} · ⏱️${fmtDur(jobMinutes(c) * 60 / paceScale())}${up ? ` · 살림 +${up.toFixed(1)}/시간` : ''}`;
}

function needLine(n) { return `<div class="q-item ${n.ok ? 'done' : ''}">${n.ok ? '✅' : '⬜'} ${n.label} ${n.have}/${n.want}</div>`; }

function officeCurateMenu(t) { MENUS._officeCurate(t); }

// ---------- 거두기 ----------

function collectText(r) {
  const parts = [];
  if (r.offering) parts.push(`💰 봉헌 ${r.offering}만 원`);
  if (r.members) parts.push(`👥 새 얼굴 ${r.members}명을 맞이했어요`);
  if (r.gift) parts.push(`🍀 헌금함에 익명의 봉투가 있었어요! 💰+${r.gift}`);
  if (r.vaultFull) parts.push('금고가 가득 찼어요 · 본당 사무실을 키우세요');
  if (r.seatsFull) parts.push('성당 자리가 꽉 찼어요');
  return parts.join(' · ');
}

// 건물 메뉴 맨 위의 "거두기"
function stashOption(id) {
  const st = Game.state.pastor.stash[id];
  if (!st || (st.offering < 1 && st.members < 1)) return [];
  const bits = [st.offering >= 1 ? `💰${Math.floor(st.offering)}` : '', st.members >= 1 ? `👥${Math.floor(st.members)}` : ''].filter(Boolean).join(' ');
  return [{ tile: World.overview, label: `🧺 거두기 <span class="cost">${bits}</span>`, sub: '쌓인 봉헌과 새 얼굴', onClick: () => doCollect(id) }];
}

function doCollect(id) {
  const r = id ? collectStash(id) : collectAll();
  if (!r) return;
  const msg = collectText(r);
  if (msg) toast(`🧺 ${msg}`);
  if ((r.offering || r.members) && Game.state.pastor.tutorial) Game.state.pastor.tutorial.collected = true;
  if (id && (r.offering || r.members)) worldFloat(id, [r.offering ? `+${r.offering}💰` : '', r.members ? `+${r.members}👥` : ''].filter(Boolean).join(' '));
  save();
  refreshPastorHud();
}

function refreshPastorHud() {
  const res = document.getElementById('res'), q = document.getElementById('quest');
  if (res) res.outerHTML = resStripHtml();
  if (q) q.outerHTML = pastorQuestHtml();
}

// 본당 사무실: 금고와 교구 공납금
// 직원 채용: 공고 내기 / 지원자 만나기
function hiringOption() {
  const p = Game.state.pastor;
  if (p.hiring) { const n = p.hiring.applicants.length; return { label: `📨 ${CREW_ROLES[p.hiring.role].name} 지원자 ${n}명`, sub: n ? '눌러서 지원자를 만나 보세요' : '공고를 냈어요. 지원자가 오면 알려 드려요', disabled: !n, onClick: () => setTimeout(openApplicants, 0) }; }
  return { label: '📢 직원 채용 공고', sub: `관리장 ${crewOf('manager').length}/1 · 사무원 ${crewOf('clerk').length}/${clerkCap()} · 사무장 ${crewOf('chief').length}/1 · 채용은 💎 다이아로`, onClick: () => setTimeout(openHireMenu, 0) };
}
function openHireMenu() {
  const opt = role => { const r = CREW_ROLES[role], block = postBlocker(role); return { tile: true, label: `${r.icon} ${r.name}`, tileSub: block ? `🔒 ${block.split(' (')[0]}` : `채용 💎${r.gems}`, sub: `${r.desc} · 채용 💎${r.gems}, 인건비 기본 ${r.wage}/시간 (봉헌금에서 다달이)${block ? ` · <b>${block}</b>` : ''}`, disabled: !!block,
    onClick: () => { const x = postJob(role); if (x) { toast(`📢 ${x.name} 채용 공고를 냈어요. 지원자가 오면 알려 드려요`); save(); } } }; };
  modal({
    title: '📢 직원 채용 공고',
    html: `<p class="small">공고는 무료예요. 지원자가 찾아오면(최대 ${HIRE.max}명) 능력과 바라는 인건비를 보고 <b>💎 다이아</b>로 채용해요. 직원은 공사도 함께 맡아요. 인건비는 봉헌금에서 다달이 나가요. 가진 다이아 ${gems()}개 · <span class="muted">다이아는 상점이나 잡초·돌을 치우다 얻어요</span></p>
      <p class="muted">사무원은 처음 ${CREW.clerks}명까지, 신자 ${CREW.clerkAt.join('명·')}명이 되면 한 명씩 더 · 사무원 한 명을 사무장으로 승진시키면 그 자리에 또 뽑을 수 있어요</p>`,
    options: [opt('manager'), opt('clerk')],
  });
}
function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function openApplicants() {
  const p = Game.state.pastor, h = p.hiring;
  if (!h) return;
  const role = CREW_ROLES[h.role];
  modal({
    title: `📨 ${role.icon} ${role.name} 지원자`,
    html: `<p class="small">능력을 보고 승낙하거나 거절하세요. 솜씨는 공사 속도, 성실은 ${h.role === 'manager' ? '마당 정리를 빼먹지 않는지' : '살림비 절약'}, 신앙은 교우들 마음에 영향을 줘요. 거절한 사람은 돌아오지 않아요.</p>
      ${h.applicants.map(a => `<div class="applicant"><b>${a.name}</b> <span class="muted">${a.age}세</span><div class="small">🔨 솜씨 ${stars(a.skill)} · 📋 성실 ${stars(a.diligence)} · 🙏 신앙 ${stars(a.faith)}</div><div class="small">💸 바라는 인건비 <b>${a.wage}/시간</b> (한 달 약 💰${Math.round(a.wage * SUNDAY_HOURS * 4)}) · <span class="muted">${a.note}</span></div></div>`).join('')}
      ${h.applicants.length < HIRE.max ? `<p class="muted">더 기다리면 지원자가 올 수도 있어요 (최대 ${HIRE.max}명)</p>` : ''}`,
    options: [
      ...h.applicants.map((a, i) => { const block = hireBlocker(); return { label: `✅ ${a.name} 님 채용 <span class="cost">💎${role.gems} · ${a.wage}/시간</span>`, sub: block ? `${block} · 눌러서 다이아 상점` : '',  onClick: () => { if (block) { setTimeout(openGemShop, 0); return; } const m = acceptApplicant(i); if (m) { toast(m); save(); syncWorldLayout(); } } }; }),
      ...h.applicants.map((a, i) => ({ label: `✋ ${a.name} 님 거절`, onClick: () => { rejectApplicant(i); save(); setTimeout(openApplicants, 0); } })),
      { label: '🗑️ 공고 내리기', sub: '언제든 다시 낼 수 있어요', onClick: () => { cancelPosting(); save(); toast('공고를 내렸어요'); } },
    ],
  });
}
// 직원 한 사람: 승진(사무원) · 내보내기
function openCrewMember(name) {
  const c = crew().find(x => x.name === name);
  if (!c) return;
  const r = CREW_ROLES[c.role], pb = promoteBlocker();
  modal({
    title: `${r.icon} ${r.name} ${c.name}`,
    html: `<p class="small"><b>Lv${crewLevel(c)}</b> · 경험 ${Math.floor(c.xp || 0)}/${crewNeed(c)}${crewLevel(c) >= CREW_XP.max ? ' (최고 레벨)' : ''}</p><p class="small">🔨 솜씨 ${r1(crewStat(c, 'skill'))} · 📋 성실 ${r1(crewStat(c, 'diligence'))} · 🙏 신앙 ${r1(crewStat(c, 'faith'))} <span class="muted">(처음 ${c.skill}·${c.diligence}·${c.faith}, 레벨마다 +${CREW_XP.statPer})</span></p>${c.role === 'manager' ? `<p class="muted">관리장 Lv4: 하루 두 곳 정리 · Lv7: 공사도 거들어요</p>` : ''}<p class="muted">인건비 ${c.wage}/시간 (레벨이 오를 때마다 조금씩 올라요) · ${c.note || ''}</p><p class="muted">경험치는 날마다(성실하면 더), 공사를 마칠 때마다 쌓여요.</p>`,
    options: [
      ...(c.role === 'clerk' ? [{ label: `📋 사무장으로 승진 <span class="cost">💎${CREW.promoteGems}</span>`, sub: pb || `인건비가 ${Math.round(Math.max(c.wage * CREW.chiefWage, CREW_ROLES.chief.wage * 0.8) * 10) / 10}/시간으로 오르고, 공사가 빨라지며 살림비를 더 아껴요 · 사무원 자리가 하나 비어요`, disabled: !!pb, onClick: () => { const m = promoteClerk(c.name); if (m) { toast(m); save(); } } }] : []),
      { label: '🚪 내보내기', sub: '인건비가 줄지만 교우들 마음이 조금 상해요 (❤️−1)', onClick: () => { const m = dismissCrew(c.name); if (m) { toast(m); save(); syncWorldLayout(); } } },
    ],
  });
}

// 성당 위 '미사 시간' 표시를 누르면: 주일이면 주일미사로, 평일이면 오늘 전례를 직접 집전
function massCall() {
  if (Game.state.phase !== 'pastor' || interiorParish() || isAway()) return null;
  if (sundayReady()) return { icon: '⛪', text: '주일미사', ready: Game.state.energy >= sundayCost() };
  const tl = todayLits();
  return tl.length ? { icon: tl[0].icon, text: tl[0].kind === 'mass' ? '평일미사' : tl[0].name.replace(/^\S+요일 /, ''), ready: Game.state.energy >= tl[0].energy } : null;
}
function goToMass() {
  if (sundayReady()) { if (Game.state.energy < sundayCost()) { toast(`행동력 ${sundayCost()}이 필요해요`); return; } onSunday(); return; }
  const l = todayLits()[0];
  if (!l) return;
  const m = doLiturgy(l.id);
  toast(m || litBlocker(l.id) || '지금은 드릴 수 없어요');
  if (m) { save(); render(); if (l.kind === 'mass') setTimeout(afterMassVisitor, 300); }
}
// 미사를 마치고 나오는데 교우가 다가온다: 안수 또는 성물 축복
function afterMassVisitor() {
  const a = rollAfterMass();
  if (!a) return;
  modal({
    title: `${a.icon} 미사 뒤 · ${a.name}`,
    html: `<p class="serif">${pick(a.text)}</p>`,
    options: [
      { label: `${a.icon} ${a.name}를 해 드린다 <span class="cost">⚡${a.energy}</span>`, sub: Game.state.energy < a.energy ? '행동력이 모자라요' : a.gift[1] ? '마음과 친화력이 오르고, 감사 봉헌을 하고 가요' : '마음과 친화력이 올라요', disabled: Game.state.energy < a.energy,
        onClick: () => { const m = doAfterMass(a); if (m) setTimeout(() => modal({ title: `${a.icon} ${a.name}`, html: `<p class="serif">${a.done}</p><p class="small">${m}</p>` }), 0); } },
      { label: '🙏 다음에 오시라고 한다', sub: '행동력은 들지 않아요', onClick: () => {} },
    ],
  });
}
// 축복 예식 요청 목록
function openBlessings() {
  const list = blessReqs();
  modal({
    title: '🙏 축복 예식 요청',
    html: list.length ? '<p class="small">교우들이 축복을 청했어요. 다녀오면 가족이 감사 봉헌을 해요. 기한이 지나면 이웃 본당 신부님께 부탁해요(병자성사는 늦으면 마음이 줄어요).</p>' : '<p class="small">지금은 들어온 요청이 없어요. 신자가 많아질수록 자주 들어와요.</p>',
    options: list.map((r, i) => { const b = BLESSINGS.find(x => x.id === r.kind), blk = blessBlocker(i), left = Math.max(0, Math.ceil((r.until - Date.now()) / 1000)); return {
      label: `${b.icon} ${b.name} · ${r.who} <span class="cost">⚡${b.energy}</span>`, sub: blk || `${r.why} · ${fmtDur(left)} 안에${b.urgent ? ' (급해요)' : ''}`, disabled: !!blk,
      onClick: () => { const m = doBlessing(i); if (m) setTimeout(() => modal({ title: m.title, html: `<p class="serif">${m.text}</p><p class="small">${m.eff}</p>` }), 0); } }; }),
  });
}

// 주보: 피정·휴가 공지, 교구 연수 일정 (v0.75)
// 주보: 연말 교구 시상식까지 남은 주일과 지금 등수
function awardBulletinHtml() {
  const st = awardStanding(), w = awardWeeksLeft(), last = (Game.state.pastor.awards || []).slice(-1)[0];
  const medal = r => ['🥇', '🥈', '🥉', '4등'][r - 1];
  return `<p class="small">🏆 <b>연말 교구 사목 시상식</b>: ${w === 0 ? '이번 주일(성탄 대축일)' : `앞으로 ${w + 1}번째 주일(성탄 대축일)`}. 이웃 본당 ${AWARDS.neighbors.map(n => n[0] + n[1]).join(' · ')}과 견줘요. 1등 💎${AWARDS.prize[0].gems}·평판·교구 신뢰, 세 부문 1등이면 올해의 본당 대상.</p>
    <div class="small">${st.map(r => `<div>${r.cat.icon} ${r.cat.name} <b>${medal(r.rank)}</b> · 우리 ${r.mine}${r.cat.unit} / 1등 이웃 ${r.top}${r.cat.unit} <span class="muted">(${r.cat.hint})</span></div>`).join('')}</div>
    ${last ? `<p class="muted">지난 시상식(${last.year}년째): ${last.ranks.map((r, i) => AWARDS.cats[i].icon + medal(r)).join(' ')}${last.grand ? ' · ✨ 올해의 본당' : ''}</p>` : ''}`;
}
function openBulletin() {
  const p = Game.state.pastor, plan = p.awayPlan;
  modal({
    title: '📰 주보',
    html: `<p class="small">${isAway() ? `${awayDef().icon} 지금 신부님은 <b>${awayDef().name}</b> 중이에요 (본당에 미사가 없어요)` : plan ? `📌 다음 주일미사 뒤 <b>${AWAY[plan.kind].name}</b>(${AWAY[plan.kind].days}일)를 떠난다고 공지했어요` : '피정과 휴가는 주보로 미리 알리고 다음 주일미사 뒤에 떠나요. 신부님이 없는 동안 본당에 미사가 없어요.'}</p>
      ${bishopWeeks() !== null ? `<p class="small">🧑‍⚖️ <b>주교님 사목방문</b>: ${bishopWeeks() === 0 ? '이번 주일' : `앞으로 ${bishopWeeks() + 1}번째 주일`}에 오셔서 미사를 주례하세요. 교우들이 많이 나와 봉헌이 늘어요. 신부님이 직접 맞이하면 교구 신뢰가 더 올라요.</p>` : ''}
      ${awardBulletinHtml()}
      <p class="muted">🎓 ${nextTrainingText()} · 상반기(4월)·하반기(10월) 교구 연수는 사흘 동안 저절로 다녀와요</p>`,
    options: [
      ...['retreat', 'vacation'].map(k => { const a = AWAY[k], b = awayPlanBlocker(k); return { tile: true, label: `${a.icon} ${a.name} 공지`, tileSub: `${a.days}일 · 올해 ${awayUsed(k)}/${a.perYear}`, sub: b || a.desc, disabled: !!b, onClick: () => { const m = planAway(k); if (m) { toast(m); save(); } } }; }),
      ...(plan ? [{ label: `↩️ ${AWAY[plan.kind].name} 공지 거두기`, onClick: () => { const m = cancelAwayPlan(); if (m) toast(m); } }] : []),
    ],
  });
}

// 수원가톨릭신협 대출: 금고 한도의 몇 할을 빌려 주일마다 나눠 갚는다
function openLoanMenu() {
  const p = Game.state.pastor, l = p.loan;
  modal({
    title: '🏦 수원가톨릭신협 대출',
    html: `<p class="small">본당 살림이 급할 때 신협에서 돈을 빌려요. 빌린 돈에 이자를 붙여 <b>주일마다 나눠</b> 금고에서 갚아요. 금고가 모자라 못 갚은 주는 남은 빚에 연체 이자 ${Math.round(LOAN.late * 100)}%가 붙고 평판이 조금 깎여요.</p>
      ${l ? `<p class="small">📒 빌린 돈 ${l.amt}만 원 · <b>남은 빚 ${l.left}만 원</b> · 주일마다 ${Math.min(l.per, l.left)}만 원씩</p>` : '<p class="muted">한 번에 한 건만 빌릴 수 있어요. 빌린 돈도 금고 한도 안에서만 들어와요.</p>'}`,
    options: [
      ...(l ? [{ label: `💸 남은 빚 한꺼번에 갚기 <span class="cost">💰${l.left}</span>`, sub: p.res.offering < l.left ? `봉헌금 ${l.left}만 원이 필요해요` : '이자가 더 붙지 않아요', disabled: p.res.offering < l.left, onClick: () => { const m = repayLoanAll(); if (m) { toast(m); save(); } } }] : []),
      ...LOAN.plans.map((pl, i) => { const b = loanBlocker(pl), amt = loanAmount(pl), total = Math.ceil(amt * (1 + pl.rate)); return {
        tile: true, label: `🏦 💰${amt} 빌리기`, tileSub: b && !l ? `🔒 ${b.split(' (')[0]}` : `${pl.weeks}주 · 이자 ${Math.round(pl.rate * 100)}%`,
        sub: b || `주일마다 💰${Math.ceil(total / pl.weeks)}씩 ${pl.weeks}주 · 모두 💰${total}`, disabled: !!b,
        onClick: () => { const m = takeLoan(i); if (m) { toast(m); save(); } } }; }),
    ],
  });
}
function openOfficeMenu(t) {
  const s = Game.state, p = s.pastor;
  const est = Math.round((p.weekIncome || 0) * levyRate());
  const cj = jobFor('office');
  modal({
    title: `🗂️ ${t.label} Lv${p.fixed.office}`,
    _bulletin: true,
    html: `<div class="stat-row"><span>💰</span><span>금고</span><div class="bar good"><span style="width:${Math.min(100, p.res.offering / vaultCap() * 100)}%"></span></div><span class="v">${Math.floor(p.res.offering)}/${vaultCap()}</span></div>
      <p class="small">🏛️ <b>교구 공납금</b> · 달마다 한 번(그달 마지막 주일) 한 달 동안 거둔 봉헌의 <b>${Math.round(levyRate() * 100)}%</b>를 교구에 내요. 교구 살림과 어려운 본당 지원에 쓰여요. 건축헌금은 빠져요.</p>
      <p class="muted">이번 달 쌓인 공납금 ${Math.round(p.levyAccrued || 0)}만 원 + 이번 주 약 ${est}만 원 → ${3 - p.week % 4 ? `${3 - p.week % 4}주일 뒤` : '이번 주일'}에 내요${p.levyDue > 0 ? ` · <b>밀린 공납금 ${Math.ceil(p.levyDue)}만 원</b>` : ''}${DIOCESE_GRANT[p.fixed.church] ? ` · 작은 본당이라 주일마다 지원금 ${DIOCESE_GRANT[p.fixed.church]}만 원을 받아요` : ''}</p>
      <p class="muted">교구의 신뢰 ${Math.round(p.trust || 50)} · 공납금을 제때 내면 올라요</p>
      <p class="small">📜 <b>연초 일시불</b> · 1월에 한 해 공납금을 한 번에 내면 ${Math.round(LEVY_LUMP_DISCOUNT * 100)}%를 깎아 줘요. ${levyPrepaid() ? '<b>올해는 이미 냈어요.</b>' : isJanuary() ? '<b>지금이 1월이에요!</b>' : `다음 1월까지 ${weeksToJanuary()}주`}</p>`,
    options: [
      { tile: true, label: '📰 주보', tileSub: isAway() ? `${awayDef().name} 중` : p.awayPlan ? `${AWAY[p.awayPlan.kind].name} 공지됨` : '피정·휴가 공지', onClick: () => setTimeout(openBulletin, 0) },
      ...(isJanuary() && !levyPrepaid() ? [(() => {
        const q = lumpSumQuote(), block = lumpSumBlocker();
        return {
          label: `📜 올해 공납금 한 번에 내기 <span class="cost">💰${q.pay}</span>`,
          sub: block || `1년치 ${q.full}만 원에서 ${q.saved}만 원 감면${p.levyDue > 0 ? ` · 밀린 ${Math.ceil(p.levyDue)}만 원 포함` : ''} · 최근 봉헌으로 셈해요`,
          disabled: !!block, onClick: () => { const m = payLumpSum(); if (m) toast(`📜 ${m}`); },
        };
      })()] : []),
      ...(p.levyDue > 0 ? [{
        label: `🏛️ 밀린 공납금 내기 <span class="cost">💰${Math.min(Math.ceil(p.levyDue), Math.floor(p.res.offering))}</span>`,
        sub: '다 내야 성당 증축 허가가 나와요', disabled: p.res.offering < 1,
        onClick: () => { const paid = Math.min(p.levyDue, Math.floor(p.res.offering)); p.res.offering -= paid; p.levyDue -= paid; if (p.levyDue <= 0) { p.levyDue = 0; p.trust = Math.min(100, (p.trust || 50) + 1); } toast(`🏛️ 공납금 ${Math.round(paid)}만 원을 냈어요`); },
      }] : []),
      { tile: true, label: '🏦 신협 대출', tileSub: p.loan ? `남은 빚 💰${p.loan.left}` : (p.fixed.office || 1) < LOAN.office ? `🔒 사무실 Lv${LOAN.office}` : '수원가톨릭신협', onClick: () => setTimeout(openLoanMenu, 0) },
      { tile: true, label: '📅 사목 방향', tileSub: direction() ? `${direction().icon} ${direction().name}` : '이번 달 정하기', onClick: () => setTimeout(openDirectionModal, 0) },
      { tile: true, label: '💼 지출 기준', tileSub: '행사 지원금', onClick: () => setTimeout(openPolicyModal, 0) },
      { tile: true, label: '💰 단체별 지원', tileSub: '활동비 많이·보통·적게', onClick: () => setTimeout(openBudgetModal, 0) },
      { tile: true, label: '📑 월별 보고서', tileSub: (p.reports || []).length ? p.reports[0].label : '아직 없음', onClick: () => setTimeout(() => openReportModal(0), 0) },
      hiringOption(),
      ...actionOptions('office'),
      ...(cj ? jobOptions(cj) : fixedUpgradeOption('office')),
    ],
  });
}

// 주일미사 시간표: 늘리면 좌석·참례율이 오르고, 주일 행동력과 미사 경비가 든다
function openMassTimes() {
  const p = Game.state.pastor, n = massCount(), block = addMassBlocker(), next = MASS_TIMES[n];
  modal({
    title: '🕰️ 미사 시간표',
    html: `<div class="lit-week">${[1, 2, 3, 4, 5, 6, 0].map(d => { const items = d === 0 ? MASS_TIMES.slice(0, n).map((m, i) => `${m.icon} ${massTimeName(i)}`) : LITURGIES.filter(l => l.day === d && litState().open[l.id]).map(l => `${l.icon} ${l.time} ${l.name.replace(/^\S+요일 /, '')}`); if (d === 6 && n >= 2) items.push(`🌆 ${massTimeName(1)}`); return `<div class="lit-day${d === weekDay() ? ' today' : ''}"><b>${WEEK_DAYS[d]}</b>${items.length ? items.map(t => `<span>${t}</span>`).join('') : '<span class="muted">—</span>'}</div>`; }).join('')}</div>
      <p class="muted">신자 ${Math.floor(p.res.members)}명 / 좌석 ${churchSeats()}석 · 주일미사 행동력 ⚡${sundayCost()}${n > 1 ? ` · 미사 경비 💰${massCost()}/주일` : ''}${p.overflow ? ' · 교리실 중계 화면 (+10%)' : ''}</p>`,
    options: [
      ...LITURGIES.filter(l => !litState().open[l.id]).map(l => { const b = litOpenBlocker(l.id); return { label: `${l.icon} ${l.name} 열기 · 💰${scaledCost(l.cost)}`, sub: b || `${WEEK_DAYS[l.day]} ${l.time} · 정해진 시간에 저절로 드려지고, 직접 가면 효과 ${LIT_MANUAL}배${l.group ? ' · 초등부 주일학교가 있어야 해요' : ''}`, disabled: !!b, onClick: () => { const m = openLiturgy(l.id); if (m) { toast(m); save(); } } }; }),
      ...(next ? [{ label: `${next.icon} ${massTimeName(n)} 새로 만들기`, sub: block || `좌석 +${Math.round(MASSES.seats * 100)}% · 참례율 +${Math.round(MASSES.attend * 100)}% · 주일미사 행동력 +${MASSES.energy} · 미사 경비 +💰${scaledCost(MASSES.cost)}/주일`, disabled: !!block,
        onClick: () => { const m = addMass(); if (m) { toast(`🕰️ ${m.name}를 새로 만들었어요`); save(); } } }] : []),
      ...(n > 1 ? [{ label: `✂️ ${MASS_TIMES[n - 1].name} 없애기`, sub: '행동력과 경비가 줄지만 좌석이 줄어요 (넘치는 신자는 떠나요)', onClick: () => { const m = removeMass(); if (m) { toast(`🕰️ ${m.name}를 없앴어요`); save(); } } }] : []),
    ],
  });
}

function pastorChurchMenu(t) {
  const s = Game.state, p = s.pastor;
  const ready = sundayReady();
  const canSunday = ready && s.energy >= sundayCost();
  modal({
    title: `⛪ ${t.label} · Lv${p.fixed.church} ${CHURCH_LEVELS[p.fixed.church].name}`,
    options: [
      ...stashOption('church'),
      { tile: true, label: '📘 예비자 교리', tileSub: `예비신자 ${Math.floor(cateState().n)}명`, onClick: () => setTimeout(openCateMenu, 0) },
      { tile: true, label: '🕰️ 미사 시간표', tileSub: `주일 ${massCount()}대 · 평일 ${Object.keys(litState().open).length}`, onClick: () => setTimeout(openMassTimes, 0) },
      ...todayLits().map(l => { const b = litBlocker(l.id); return { label: `${l.icon} 오늘 ${l.time} ${l.name} <span class="cost">⚡${l.energy}</span>`, sub: b || `직접 집전하면 효과 ${LIT_MANUAL}배 · 안 가도 정해진 시간에 드려져요`, disabled: !!b, onClick: () => { const m = doLiturgy(l.id); if (m) toast(m); } }; }),
      {
        label: `⛪ 주일미사 봉헌 <span class="cost">⚡${sundayCost()}</span>`,
        sub: isAway() ? `${awayDef().name} 중이라 미사가 없어요` : (ready ? (canSunday ? `예상 참례 약 ${expectedAttendance()}명 · ${p.prep > 0 ? `✍️ 강론 준비됨: 봉헌 +${Math.round(SUNDAY_PREP_BONUS * 100)}%` : '사제관에서 강론을 준비하고 오면 봉헌이 더 모여요'}` : `행동력 ${sundayCost()}이 필요해요`) : `다음 주일까지 ${fmtDur(sundayLeftSec())} · 직접 오지 않으면 정해진 시간에 드려져요 (봉헌 ${Math.round(SUNDAY_AUTO.collect * 100)}%)`) + '<br>' + homilyOddsHtml(),
        disabled: !canSunday, onClick: onSunday,
      },
      {
        label: `📣 건축헌금 호소 <span class="cost">약 ${appealAmount()}만 원</span>`,
        sub: canAppeal() ? '한 주에 한 번 · 마음이 클수록 많이 모여요. 대신 마음이 조금 줄어요' : (p.week ? '이번 주에는 이미 부탁했어요' : '첫 주일미사를 드린 뒤에 할 수 있어요'),
        disabled: !canAppeal(), onClick: () => toast(`📣 ${doAppeal()}`),
      },
      ...actionOptions('pChurch'),
      ...(jobFor('church') ? jobOptions(jobFor('church')) : [{
        label: `🏗️ 성당 증축 → Lv${p.fixed.church + 1}`, sub: '조건과 비용 보기',
        disabled: !CHURCH_LEVELS[p.fixed.church + 1], onClick: () => setTimeout(openChurchUpgrade, 0),
      }]),
      teamOption(),
    ],
  });
}

// 일꾼 더 모시기 = 사무실 채용 공고
function teamOption() { return hiringOption(); }

// 보좌 신부: 청하기 / 맡을 단체 정하기 / 돌려보내기
function curateOptions() {
  const p = Game.state.pastor, out = curates().map(c => ({ label: `✝️ ${c.name} 보좌 신부님 · 맡은 단체 ${c.scope.length}/${CURATE.scope}`, sub: `생활비 ${CURATE.wage}/시간 · 신부님이 못 간 회의에 대신 들어가 강복을 줘요 · 눌러서 맡을 단체 정하기`, onClick: () => setTimeout(() => openCurateScope(c.name), 0) }));
  if (curates().length < CURATE.at.length) {
    const block = curateBlocker();
    out.push({ label: `✝️ 보좌 신부 청하기 <span class="cost">생활비 ${CURATE.wage}/시간</span>`, sub: block || `교구에 보좌 신부를 청해요. 임금은 없고 생활비만 나가요 (${curates().length}/${curateCap()}명)`, disabled: !!block,
      onClick: () => { const c = requestCurate(); if (c) { toast(`✝️ ${c.name} 보좌 신부님이 부임하셨어요. 맡을 단체를 정해 주세요`); save(); setTimeout(() => openCurateScope(c.name), 0); } } });
  }
  return out;
}
function openCurateScope(name) {
  const c = curates().find(x => x.name === name);
  if (!c) return;
  const groups = allGroups().filter(x => x.g.level >= 1 && !chairLed(x.g));
  modal({
    title: `✝️ ${c.name} 보좌 신부님이 맡을 단체`,
    html: `<p class="small">고른 단체는 주임 신부님이 회의에 못 가시면 보좌 신부님이 대신 들어가 강복을 줘요 (활력 +${CURATE.vital}, 마음 +${CURATE.heart}). 주임 신부님이 직접 가시는 것보다는 조금 덜해요. 한 분이 ${CURATE.scope}곳까지 맡고, 한 단체는 한 분만 맡아요. 위원장이 이끄는 단체는 스스로 회의해서 뺐어요.</p>`,
    options: [
      ...groups.map(({ g }) => { const u = UNITS[g.type], on = c.scope.includes(g.type), other = !on && curateFor(g.type); return {
        label: `${on ? '✅' : '⬜'} ${u.icon} ${u.name}`, sub: on ? '맡는 중' : other ? `${other.name} 신부님이 맡는 중 · 누르면 이 신부님께 옮겨요` : c.scope.length >= CURATE.scope ? `이미 ${CURATE.scope}곳을 맡았어요` : '누르면 맡겨요',
        onClick: () => { if (!toggleCurateScope(c.name, g.type)) toast(`한 분이 ${CURATE.scope}곳까지 맡을 수 있어요`); save(); setTimeout(() => openCurateScope(c.name), 0); } }; }),
      { label: '🚪 교구로 돌려보내기', sub: `생활비는 줄지만 교구 신뢰 −${CURATE.sendBack}`, onClick: () => { const m = sendBackCurate(c.name); if (m) { toast(m); save(); } } },
    ],
    buttons: [{ label: '다 됐어요' }],
  });
}

// 수녀님 모시기 / 맡길 일 바꾸기
function sisterOptions() {
  const p = Game.state.pastor, cv = conventRep(), out = [];
  for (const sis of sisters()) withSister(sis, () => {
    const t = sisterInfo(), bond = Math.round(sis.bond === undefined ? 60 : sis.bond), inf = sisterInfluence();
    out.push({ label: `${sisterTitle()} · 활동 범위 ${sisterScope().length}개 단체`, sub: `${t.name} 성향 · 신뢰 ${bond} · 영향력 ${inf}${inf > SISTER_SCOPE.riskAt ? ' ⚠️ 세력이 생길 수 있어요' : ''} · 눌러서 활동 범위 정하기·돌려보내기`, onClick: () => setTimeout(() => openSisterScope(sis.name), 0) });
  });
  if (sisters().length < SISTER.at.length) {
    const block = sisterBlocker();
    out.push({ label: `👩‍🦳 수녀님 ${sisters().length ? '한 분 더 ' : ''}모시기 <span class="cost">💰${sisterCost()} · 생활비 ${SISTER.wage}/시간</span>`, sub: block || `수녀원에 파견을 요청해요 (${sisters().length}/${sisterCap()}분) · ⛪ 수녀원 평판 ${Math.round(cv)} (높을수록 후보를 여럿 보고 골라요)`, disabled: !!block,
      onClick: () => setTimeout(() => chooseSister(c => { if (hireSister([], c)) { toast(`👩‍🦳 ${c.name} 수녀님이 본당에 오셨어요. 활동 범위를 정해 주세요`); setTimeout(() => openSisterScope(c.name), 0); } }), 0) });
  }
  return out;
}

function confirmSendBack(name) {
  const p = Game.state.pastor, sis = sisterByName(name);
  if (!sis) return;
  SIS_CTX = sis;
  modal({
    title: `🚪 ${p.sister.name} 수녀님을 돌려보낼까요?`,
    html: `<p class="small">수녀원 원장 수녀님께 연락해 다른 수녀님을 보내 달라고 청해요. 수녀원은 서운해할 거예요.</p>
      <p class="muted">⛪ 수녀원 평판 ${Math.round(conventRep())} → 떨어져요. 40 아래면 파견비가 비싸지고, ${SISTER.refuse} 아래면 한동안 파견을 거절당해요. 평판은 수녀님과 신뢰가 좋을 때 주일마다 조금씩 회복돼요.</p>`,
    options: [{ label: '🚪 돌려보내기', sub: '지금 바로 수녀원으로 돌아가세요', onClick: () => { const loss = withSister(sis, sendBackSister); if (loss) toast(`🚪 수녀님이 수녀원으로 돌아가셨어요 · 수녀원 평판 −${loss}`); } }],
    buttons: [{ label: '그만두기', cls: 'ghost' }],
  });
}

// 수녀원이 보낸 후보 중에서 고르기 (평판에 따라 1~3명)
function chooseSister(done) {
  const list = sisterCandidates();
  modal({
    title: '⛪ 수녀원에서 보내 줄 수녀님',
    html: `<p class="small">${list.length > 1 ? '원장 수녀님이 후보를 보내 주셨어요. 성향을 보고 골라 주세요.' : '수녀원 평판이 낮아서 한 분만 보내 주신대요.'}</p>`,
    options: list.map(c => { const t = SISTER_TYPES[c.type]; return { tile: true, label: `${t.icon} ${c.name} 수녀님`, tileSub: `${t.name} · 일솜씨 ${t.power}배`, sub: `${t.desc} · 월권 확률 하루 ${Math.round(t.over * 100)}%`, onClick: () => done(c) }; }),
  });
}

// 수녀님 활동 범위: 들어갈 단체를 고른다 (눌러서 넣고 빼기)
function openSisterScope(name) {
  const p = Game.state.pastor, sis = name ? sisterByName(name) : sisters()[0];
  if (!sis) return;
  SIS_CTX = sis;
  const sc = sisterScope(), inf = sisterInfluence(), t = sisterInfo();
  const groups = allGroups().filter(x => x.g.level >= 1);
  const grow = sc.length * SISTER_SCOPE.inf * (t.inf || 1) - (sc.length <= SISTER_SCOPE.quiet ? SISTER_SCOPE.decay : 0);
  const special = { catechumen: '교리반 새 신자 +50%·주일 새 신자', district: '소공동체 참여율 +5%', altar: '제대 차림 +2단계' };
  modal({
    title: `👩‍🦳 ${p.sister.name} 수녀님 활동 범위`,
    html: `<p class="small">수녀님이 들어갈 단체를 골라 주세요. 함께하는 단체는 날마다 활력이 오르고, 신부님이 회의에 못 가도 수녀님이 대신 들어가세요. 단체를 많이 맡길수록 한 단체에 쏟는 힘은 옅어지고(지금 ${Math.round(sisterSpread() * 100)}%), <b>영향력</b>이 쌓여요.</p>
      <div class="rh-vital"><span>영향력</span><div class="bar ${inf > SISTER_SCOPE.riskAt ? '' : 'good'}"><span style="width:${inf}%"></span></div><b>${inf}</b></div>
      <p class="muted">하루 ${grow >= 0 ? '+' : ''}${r1(grow)} (${t.name} 성향) · 영향력이 ${SISTER_SCOPE.riskAt}을 넘으면 수녀님을 따르는 세력이 생겨 신부님과 단체 사이에 불화가 날 수 있어요${factionChance() ? ` (지금 하루 ${Math.round(factionChance() * 100)}%)` : ''}. 맡은 단체가 ${SISTER_SCOPE.quiet}개 이하면 영향력이 가라앉아요.</p>`,
    options: [...groups.map(({ g }) => { const on = sc.includes(g.type), u = UNITS[g.type]; return {
      label: `${on ? '✅' : '⬜'} ${u.icon} ${u.name}`, sub: !on && sisterFor(g.type) ? `${sisterFor(g.type).name} 수녀님이 맡는 중 · 누르면 이 수녀님께 옮겨요` : on ? `함께하는 중 · 활력 매일 +${Math.round(SISTER_SCOPE.vital * sisterEff())}${special[g.type] ? ' · ' + special[g.type] : ''}` : `넣으면 ${special[g.type] || '활력이 매일 오르고 회의를 대신 맡아요'}`,
      onClick: () => { withSister(sis, () => toggleSisterScope(g.type)); save(); setTimeout(() => openSisterScope(sis.name), 0); } }; }),
      { label: '🚪 수녀원으로 돌려보내기', sub: `다른 수녀님을 새로 요청할 수 있어요 · ⛪ 수녀원 평판 −${SISTER.sendBack}`, onClick: () => setTimeout(() => confirmSendBack(sis.name), 0) }],
    buttons: [{ label: '다 됐어요', onClick: () => { SIS_CTX = null; } }],
  });
}

function chooseSisterTask(done) {
  modal({
    title: '👩‍🦳 수녀님께 맡길 일',
    options: Object.entries(SISTER_TASKS).map(([k, t]) => ({ tile: true, label: `${t.icon} ${t.name}`, tileSub: t.sub, sub: t.sub, onClick: () => done(k) })),
  });
}

function openChurchUpgrade() {
  const p = Game.state.pastor;
  const to = p.fixed.church + 1;
  const c = CHURCH_LEVELS[to];
  if (!c) return;
  const block = blockText('fixed', 'church', null, to);
  modal({
    title: `🏗️ 성당 증축 → Lv${to} "${c.name}"`,
    html: `${compareHtml('fixed', 'church', null, to)}
      <div class="quest" style="position:static;margin:8px 0">${churchNeeds(to).map(needLine).join('')}</div>
      ${c.locked ? `<p class="muted">🔒 ${c.locked}</p>` : `<p class="small">비용: ${costText(jobCost('fixed', 'church', null, to), upkeepDelta('church', to))}</p>`}`,
    options: c.locked ? [] : [{
      label: '🏗️ 증축 시작', sub: block || '교우들과 함께 공사를 시작해요', disabled: !!block,
      onClick: () => { if (startJob('fixed', 'church', null, to)) toast('🏗️ 성당 증축을 시작했어요'); },
    }],
    buttons: [{ label: '닫기', cls: 'ghost' }],
  });
}

function fixedUpgradeOption(key) {
  const s = Game.state;
  if (s.phase !== 'pastor') return [];
  const L = s.pastor.fixed[key], f = FIXED[key];
  const block = blockText('fixed', key, null, L + 1);
  return [{
    label: `🏗️ ${f.name} 고치기 Lv${L} → Lv${L + 1}`,
    sub: `${compareLine('fixed', key, null, L + 1)} · ${costText(jobCost('fixed', key, null, L + 1))}${block ? ` · <b>${block}</b>` : ''}`,
    disabled: !!block,
    onClick: () => { if (startJob('fixed', key, null, L + 1)) toast(`🏗️ ${f.name} 공사를 시작했어요`); },
  }];
}

// 빈 땅: 컨테이너 교리실 놓기 (공소 자리면 공소)
function openBuildMenu(plot) {
  const p = Game.state.pastor;
  if (plot.gongsoOnly) {
    const block = Game.state.pastor.fixed.church < 5 ? '성당 Lv5부터 세울 수 있어요' : blockText('gongso', plot.id, null, 1);
    modal({
      title: '🌾 빈 땅 (공소 자리)',
      html: `<p class="small">${glossarize(GONGSO.desc)}</p><p class="muted">${GONGSO.prod(effL(1))}</p>`,
      options: [{
        label: `✝️ 공소 세우기 <span class="cost">${costText(jobCost('gongso', plot.id, null, 1))}</span>`,
        sub: block || '윗말 교우들이 가까이에서 기도할 곳이 생겨요', disabled: !!block,
        onClick: () => { if (startJob('gongso', plot.id, null, 1)) toast('🏗️ 공소를 세우기 시작했어요'); },
      }],
    });
    return;
  }
  const need = containerNeed();
  const n = containers().length + 1;
  const block = blockText('container', plot.id, null, 1);
  modal({
    title: '🌾 빈 땅',
    html: `<p class="small">컨테이너를 놓아 <b>교리실</b>을 만들 수 있어요. 교리실 하나에는 방이 ${CONTAINER_ROOMS}개라 <b>단체 ${CONTAINER_ROOMS}개</b>가 (벽돌 건물이 되면 3개, 교육관 4개, 새 교육관 5개) 모일 수 있어요.</p>
      ${need && need.members ? `<div class="quest" style="position:static;margin:8px 0">${needLine({ label: `${n}번째 컨테이너: 신자`, have: Math.floor(p.res.members), want: need.members, ok: need.ok })}</div>` : ''}
      <p class="muted">봉헌금 ${Math.floor(p.res.offering)}만 원 · 빈 방 ${roomsFree()}개 · 👷 일꾼 ${idleWorkers()}/${p.teams}명 쉬는 중</p>`,
    options: need ? [{
      label: `📦 컨테이너 교리실 ${n} 놓기 <span class="cost">${costText(jobCost('container', plot.id, null, 1), upkeepDelta('container', 1))}</span>`,
      sub: block || '방 2개짜리 교리실이 생겨요', disabled: !!block,
      onClick: () => { if (startJob('container', plot.id, null, 1)) toast(`📦 ${josa('컨테이너 ' + siteName(plot.id), '을', '를')} 놓기 시작했어요`); },
    }] : [lockedOption('컨테이너', '더 놓을 수 없어요')],
  });
}

// 공사 중인 건물에서: 거들기(행동력) · 바로 완성(봉헌금)
function jobOptions(j) {
  if (!j) return [];
  const s = Game.state, cost = rushCost(j), short = gems() < cost;
  return [
    { label: `🔨 공사 거들기 <span class="cost">⚡${helpCost()}</span>`, sub: s.energy < helpCost() ? `⚡ 행동력이 모자라요 (지금 ${Math.floor(s.energy)} / 필요 ${helpCost()})` : `남은 시간 ${fmtDur(jobLeftSec(j))} → ${hasPerk('youth3') ? 45 : 30}% 단축`, disabled: s.energy < helpCost(), onClick: () => toast(helpJob(j)) },
    {
      label: `💎 바로 완성 <span class="cost">💎${cost}</span>`, sub: short ? `다이아가 모자라요 (가진 다이아 ${gems()}개) · 눌러서 다이아 상점` : `기다리지 않고 지금 끝내요. 남은 시간이 길수록 다이아가 더 들어요 · 가진 다이아 ${gems()}개`,
      onClick: () => { if (short) { setTimeout(openGemShop, 0); return; } const m = rushJob(j); if (m) toast(`💎 ${m}`); },
    },
  ];
}

// 컨테이너 교리실: 방 목록
function openContainerMenu(key) {
  const p = Game.state.pastor, c = p.sites[key];
  const title = c.floor ? `🏢 ${siteName(key)}` : `📦 ${siteName(key, true)}`;
  if (!c.built) {
    modal({ title: `${title} (공사 중)`, html: `<p class="small">${c.floor ? '성당 건물 위에 새 층을 올리고 교리실 벽을 세우고 있어요.' : '교우들이 컨테이너를 내려놓고 전기와 난방을 연결하고 있어요.'} 남은 시간 ${fmtDur(jobLeftSec(jobFor(key)))}</p>`, options: jobOptions(jobFor(key)) });
    return;
  }
  const lv = c.level || 1, to = lv + 1;
  const cj = jobFor(key), upWorking = cj && cj.kind === 'room';
  const upBlock = blockText('room', key, null, to);
  const upgrade = !ROOM_LEVELS[to] ? [] : upWorking ? jobOptions(cj) : [{
    label: `🏗️ ${ROOM_LEVELS[to].tier !== ROOM_LEVELS[lv].tier ? josa(ROOM_LEVELS[to].name, '으로', '로') : josa(`Lv${to}`, '으로', '로')} 고치기 <span class="cost">${costText(jobCost('room', key, null, to), upkeepDelta('room', to))}</span>`,
    sub: `${compareLine('room', key, null, to)}${upBlock ? ` · <b>${upBlock}</b>` : ''}`,
    disabled: !!upBlock, onClick: () => { if (startJob('room', key, null, to)) toast(`🏗️ ${siteName(key)} 공사를 시작했어요`); },
  }];
  modal({
    title: `🏫 ${siteName(key)} · ${ROOM_LEVELS[lv].name} Lv${lv}`,
    html: `<p class="muted">방을 골라 단체를 만들거나 회의에 들어가요. 이 교리실의 단체는 Lv${lv}까지 키울 수 있어요.${upWorking ? ` <b>🏗️ Lv${to} 공사 중 · ${fmtDur(jobLeftSec(cj))}</b>` : ''}</p>`,
    options: [...stashOption(key), ...c.rooms.map((g, room) => {
      if (!g) return { label: `🚪 방 ${room + 1} · 빈 방`, sub: '새 단체 만들기', onClick: () => setTimeout(() => openNewGroupMenu(key, room), 0) };
      const def = UNITS[g.type];
      if (g.level === 0) return { label: `🔨 방 ${room + 1} · ${def.name} (준비 중)`, sub: `첫 모임까지 ${fmtDur(jobLeftSec(cj))}`, onClick: () => setTimeout(() => openRoomMenu(key, room), 0) };
      return { label: `${def.icon} 방 ${room + 1} · ${def.name} Lv${g.level}`, sub: `${meetingText(key, room)} · ${def.prod(effL(g.level))}`, onClick: () => setTimeout(() => openRoomMenu(key, room), 0) };
    }), ...upgrade, ...mergeOption(key)],
  });
}

// 교리실 두 채를 합쳐 2층으로
function mergeOption(key) {
  const p = Game.state.pastor, c = p.sites[key];
  if (c.floor || c.floors === 2 || !c.built || (c.level || 1) < MERGE.minLevel - 1) return [];
  const block = mergeBlocker(key);
  return [{ label: '🏢 다른 교리실과 합쳐 2층으로 올리기', sub: block || `방 4개짜리 2층 건물이 되고 한 자리가 빈터로 비어요 · 살림 −20%`, disabled: !!block, onClick: () => setTimeout(() => openMergeMenu(key), 0) }];
}
function openMergeMenu(key) {
  const p = Game.state.pastor, list = mergeCandidates(key);
  const groupsOf = k => p.sites[k].rooms.filter(Boolean).map(g => UNITS[g.type].icon + (UNIT_SHORT[g.type] || UNITS[g.type].name)).join(' ') || '빈 방';
  modal({
    title: `🏢 ${siteName(key)}번과 합칠 교리실`,
    html: `<p class="small">고른 교리실의 단체들이 <b>${siteName(key)}</b>의 2층으로 옮겨 오고, 고른 교리실 자리는 빈터가 돼요.</p>
      <p class="muted">합친 건물의 레벨은 둘 중 낮은 쪽 · 살림은 두 채의 80% · 앞으로 고치는 비용은 1.6배 · 👷 일꾼 ${MERGE.workers}명</p>`,
    options: list.map(k => { const cost = mergeCost(key, k), block = mergeBlocker(key, k); return {
      label: `🏫 ${siteName(k)} · Lv${p.sites[k].level} <span class="cost">💰${cost.offering} · ⏱️${fmtDur(jobMinutes(cost) * 60 / paceScale())}</span>`,
      sub: `${groupsOf(k)} → 2층으로 · 합친 뒤 Lv${cost.level}${block ? ` · <b>${block}</b>` : ''}`, disabled: !!block,
      onClick: () => { if (startMerge(key, k)) { toast(`🏢 교리실 두 채를 합쳐 2층으로 올리기 시작했어요`); save(); syncWorldLayout(); } } }; }),
  });
}

function openNewGroupMenu(key, room) {
  const p = Game.state.pastor;
  const have = new Set(allGroups().map(x => x.g.type));
  // 만들 수 있는 것 먼저, 그다음 신자만 모자란 것, 건물 레벨이 모자란 것은 뒤로
  const types = Object.keys(UNITS).filter(k => !have.has(k)).sort((a, b) => {
    const rank = k => (unitUnlocked(k) ? (UNITS[k].members <= p.res.members ? 0 : 1) : 2);
    return rank(a) - rank(b) || ((UNIT_UNLOCK[a] || {}).church || 1) - ((UNIT_UNLOCK[b] || {}).church || 1);
  });
  modal({
    title: `🚪 ${siteName(key)} · 방 ${room + 1}`,
    html: `<p class="muted">어떤 단체를 만들까요? 성당·사무실·사제관이 커지고 신자가 늘면 더 많은 단체가 열려요. (지금 신자 ${Math.floor(p.res.members)}명)</p>`,
    options: [
      ...types.map(k => {
        const u = UNITS[k];
        const block = blockText('group', key, k, 1);
        return {
          label: `${u.icon} ${glossarize(u.name)} <span class="cost">${costText(jobCost('group', key, k, 1), upkeepDelta('group', 1))}</span>`,
          sub: `${u.desc} (${u.prod(effL(1))})${block ? ` · <b>${block}</b>` : ''}`,
          disabled: !!block,
          onClick: () => setTimeout(() => chooseSlot(k, slot => { if (startJob('group', key, k, 1, room, slot)) toast(`${u.icon} ${josa(u.name, '을', '를')} 모으기 시작했어요 · 회의는 ${MEETING_SLOTS[slot].name}`); }), 0),
        };
      }),
      { label: '🌳 단체 테크 트리 보기', sub: '어떤 단체가 언제 열리는지', onClick: () => setTimeout(openTechTree, 0) },
    ],
  });
}

// 단체 테크 트리: 분과(위원회)마다 단체가 열리는 조건과 지금 상태
function openTechTree() {
  const p = Game.state.pastor, have = new Map(allGroups().map(x => [x.g.type, x.g]));
  const node = k => {
    const u = UNITS[k], g = have.get(k), needs = unitUnlockNeeds(k), open = needs.every(n => n.ok), memOk = u.members <= p.res.members;
    const st = g ? 'have' : open && memOk ? 'open' : open ? 'mem' : 'lock';
    const label = g ? `✅ Lv${g.level}` : st === 'open' ? '🔓 만들 수 있어요' : st === 'mem' ? `👥 신자 ${u.members}명` : '🔒';
    return `<div class="tt-node ${st}"><div class="tt-icon">${u.icon}</div><div class="tt-name">${u.name}</div><div class="tt-st">${label}</div>
      ${g ? '' : `<div class="tt-need">${needs.map(n => `<span class="${n.ok ? 'ok' : ''}">${n.label}</span>`).join(' ')}${u.members ? ` <span class="${memOk ? 'ok' : ''}">신자 ${u.members}</span>` : ''}</div>`}</div>`;
  };
  modal({
    title: '🌳 단체 테크 트리',
    html: `<p class="small">성당·사무실·사제관 레벨이 오르면 단체가 차례로 열려요. 분과의 단체가 모두 자리를 잡으면 조직도에서 위원장을 세울 수 있어요.</p>
      <p class="muted">지금: 성당 Lv${p.fixed.church} · 사무실 Lv${p.fixed.office || 1} · 사제관 Lv${p.fixed.rectory} · 신자 ${Math.floor(p.res.members)}명</p>
      ${TECH_GROUPS.map(tg => `<div class="tt-group"><div class="tt-gname">${tg.name}</div><div class="tt-row">${tg.units.map((k, i) => `${i ? '<span class="tt-arrow">→</span>' : ''}${node(k)}`).join('')}</div></div>`).join('')}`,
    options: [{ label: '🏛️ 조직도 보기', onClick: () => setTimeout(openOrgModal, 0) }],
  });
}

function openRoomMenu(key, room) {
  const s = Game.state, p = s.pastor, g = p.sites[key].rooms[room];
  const def = UNITS[g.type];
  const cj = jobFor(key), working = cj && cj.kind === 'group' && cj.room === room;
  if (g.level === 0) {
    modal({ title: `🔨 ${def.name} (준비 중)`, html: `<p class="small">사람들에게 연락을 돌리고 첫 모임을 준비하고 있어요. 남은 시간 ${fmtDur(jobLeftSec(cj))}</p>`, options: jobOptions(cj) });
    return;
  }
  const to = g.level + 1;
  const block = blockText('group', key, g.type, to);
  const st = meetingState(key, room), sl = MEETING_SLOTS[groupSlot(g)], vital = Math.floor(g.vital === undefined ? 60 : g.vital);
  const div = divisionChairFor(g.type);
  const status = { chair: ['👔', `${div ? div.name : '위원장'}이 회의를 이끌어요 · ${sl.name} ${sl.from}~${sl.to}시에 신부님을 초대해요`, 'chair'], invite: ['💌', `${div ? div.name : '위원장'}이 지금 회의에 신부님을 초대했어요 · ${sl.name} ${sl.from}~${sl.to}시`, 'open'], done: ['✅', '오늘 회의에 참석했어요', 'done'], open: ['🔔', `지금 회의 중 · ${sl.name} ${sl.from}~${sl.to}시`, 'open'], wait: ['🕘', `회의는 ${sl.name} ${sl.from}~${sl.to}시`, 'wait'] }[st];
  const perks = (UNIT_PERKS[g.type] || []).map(k => `<span class="perk-chip ${g.level >= k.lv ? 'on' : ''}" title="${k.text}">${g.level >= k.lv ? '✨' : '🔒'} Lv${k.lv} ${k.text}</span>`).join('');
  const meet = meetingOption(key, room);
  modal({
    title: '',
    html: `<div class="room-head">
        <div class="rh-icon">${def.icon}</div>
        <div class="rh-body">
          <div class="rh-name">${def.name}${g.type === 'district' ? ` · ${districtStage()}` : ''} <span class="rh-lv">Lv${g.level}</span></div>
          <div class="rh-vital"><span>활력</span><div class="bar good"><span style="width:${vital}%"></span></div><b>${vital}</b></div>
          <div class="rh-status ${status[2]}">${status[0]} ${status[1]}</div>
        </div>
      </div>
      <p class="small rh-prod">📈 ${def.prod(effL(g.level))}</p>${g.type === 'district' ? smallComHtml() : ''}
      <div class="perk-row">${perks}</div>`,
    options: [
      { ...meet, tile: true, label: st === 'done' ? '✅ 참석함' : st === 'invite' || st === 'chair' ? '💌 초대받은 회의' : '🙌 회의 참석', tileSub: st === 'open' ? (Game.state.energy < 2 ? '행동력이 모자라요' : '⚡2 · 강복·훈화 · 활력 +30') : st === 'invite' ? (Game.state.energy < 2 ? '행동력이 모자라요' : `⚡2 · 활력 +${MEET_INVITE_VITAL} · 안 가도 그대로`) : st === 'done' ? '내일 또 와요' : st === 'chair' ? `${sl.name}에 초대해요` : `${sl.name}에 열려요` },
      ...((p.plans || []).some(x => x.key === key && x.room === room) ? [{ tile: true, label: '💸 행사 지원 요청', tileSub: EVENT_PLANS[g.type].name, onClick: () => setTimeout(() => openPlanModal(p.plans.findIndex(x => x.key === key && x.room === room)), 0) }] : []),
      ...(g.type === 'catechumen' ? [{ tile: true, label: '📘 예비자 교리', tileSub: `예비신자 ${Math.floor(cateState().n)}명`, onClick: () => setTimeout(openCateMenu, 0) }] : []),
      ...(g.type === 'shop' ? [{ tile: true, label: `${SHOP_ITEMS[shopState().item].icon} 판매 물품·이윤`, tileSub: `${SHOP_ITEMS[shopState().item].name} · 이윤 ${Math.round(shopState().markup * 100)}%`, onClick: () => setTimeout(() => openShopMenu(effL(g.level) * vitalMult(g)), 0) }] : []),
      ...(chairLed(g) ? [] : [{
        tile: true, label: '🕘 시간 바꾸기', tileSub: `지금 ${sl.name}`, sub: '단체 사람들과 상의해서 다른 시간으로 옮겨요',
        onClick: () => setTimeout(() => chooseSlot(g.type, slot => { setGroupSlot(key, room, slot); toast(`🕘 ${def.name} 회의를 ${josa(MEETING_SLOTS[slot].name, '으로', '로')} 옮겼어요`); }, groupSlot(g)), 0),
      }]),
      ...(working ? jobOptions(cj).map(o => ({ ...o, tile: true })) : [{
        tile: true, label: `⬆️ Lv${to}로 키우기`, tileSub: block ? `🔒 ${block}` : `💰${jobCost('group', key, g.type, to).offering} · ⏱️${fmtDur(jobMinutes(jobCost('group', key, g.type, to)) * 60 / paceScale())}`,
        sub: compareLine('group', key, g.type, to).replace(/<[^>]+>/g, ''),
        disabled: !!block,
        onClick: () => { if (startJob('group', key, g.type, to)) toast(`${def.icon} ${def.name} Lv${to} 준비를 시작했어요`); },
      }]),
    ],
  });
}

// 회의 시간 고르기: 신부가 매일 들를 수 있는 시간으로
function chooseSlot(type, done, current) {
  const u = UNITS[type];
  modal({
    title: `🕘 ${u.icon} ${u.name} 회의 시간`,
    html: `<p class="small">하루 한 번, 이 시간에 교리실에 가서 회의에 참석해요. 내가 게임에 자주 들어오는 시간으로 정하세요.</p><p class="muted">지금 본당 시각 ${clockLabel()} · 나중에 바꿀 수 있어요</p>`,
    options: Object.entries(MEETING_SLOTS).map(([id, sl]) => ({
      tile: true, tileSub: `${sl.from}~${sl.to}시${id === current ? ' · 지금' : ''}`,
      label: `${{ morning: '🌅', afternoon: '☀️', evening: '🌙' }[id]} ${sl.name}${id === u.slot && !current ? ' <span class="cost">추천</span>' : ''}`,
      disabled: id === current,
      onClick: () => done(id),
    })),
    buttons: [{ label: '취소', cls: 'ghost' }],
  });
}

// 단체 능력 목록: 열린 것 ✨, 아직인 것 🔒
function perksHtml(g) {
  const list = UNIT_PERKS[g.type] || [];
  return `<div class="perks"><b>단체 능력</b>${list.map(k => `<div class="${g.level >= k.lv ? 'on' : 'off'}">${g.level >= k.lv ? '✨' : '🔒'} Lv${k.lv} · ${k.text}</div>`).join('')}</div>`;
}

// 회의 상태 한 줄
function meetingText(key, room) {
  const g = Game.state.pastor.sites[key].rooms[room];
  const sl = MEETING_SLOTS[groupSlot(g)];
  return {
    chair: `👔 위원장이 회의를 이끌어요 (${sl.name}에 초대)`,
    invite: `💌 위원장이 지금 회의에 초대했어요 (${sl.name} ${sl.from}~${sl.to}시)`,
    done: '✅ 오늘 회의 참석함',
    open: `🔔 지금 회의 중! (${sl.name} ${sl.from}~${sl.to}시)`,
    wait: `🕘 회의: ${sl.name} ${sl.from}~${sl.to}시`,
  }[meetingState(key, room)] || '';
}

function meetingOption(key, room) {
  const s = Game.state, g = s.pastor.sites[key].rooms[room], def = UNITS[g.type];
  const st = meetingState(key, room);
  if (st === 'chair') return { label: '👔 위원장이 회의를 이끌어요', sub: `${meetingText(key, room)} · 어려움과 건의사항은 상임위원회(사목회장)로 올라와요`, disabled: true };
  return {
    label: `${st === 'invite' ? '💌 초대받은 회의 가기' : '🙌 회의 참석'} <span class="cost">⚡2</span>`,
    sub: st === 'open' ? '지금 회의 중이에요. 함께하면 활력과 효과가 올라요' : st === 'invite' ? `위원장이 신부님을 초대했어요. 가면 활력 +${MEET_INVITE_VITAL}, 안 가도 그대로예요` : meetingText(key, room),
    disabled: (st !== 'open' && st !== 'invite') || s.energy < 2,
    onClick: () => { const m = attendMeeting(key, room); if (m) toast(`${def.icon} ${m}`); },
  };
}

function openCouncilMenu() {
  const p = Game.state.pastor, open = committeeUnlocked(), ready = ORG.filter(orgReady).length;
  modal({
    face: 'council', who: COUNCIL_NAME, title: '🧑‍💼 사목회장',
    html: `<p class="serif">"${open ? `신부님, 위원장들이 올린 건의가 ${p.agenda.length}건 있어요.` : ready ? '신부님, 위원장으로 모실 만한 분이 있어요! 조직도를 한번 보시지요.' : '신부님, 본당 일을 함께 꾸릴 분과와 위원장을 세워 가시지요.'}"</p>`,
    options: [
      { tile: true, label: '🏛️ 조직도', tileSub: `위원장 ${chairsCount()}명${ready ? ` · 선임 가능 ${ready}` : ''}`, onClick: () => setTimeout(openOrgModal, 0) },
      { tile: true, label: '🌳 테크 트리', tileSub: '단체가 열리는 조건', onClick: () => setTimeout(openTechTree, 0) },
      { tile: true, label: '📊 현황과 목표', onClick: () => setTimeout(openCouncil, 0) },
      // v1.08 사용자 "전체 교구 본당 보기란은 만들되 비활성화": 수원교구 다른 본당을 큰 지도로 보는 칸 (아직 준비 중)
      { tile: true, label: '🗺️ 전체 교구 본당 보기', tileSub: '준비 중', sub: '수원교구의 다른 본당들을 큰 지도로 둘러보는 곳이에요 · 아직 준비 중이에요', disabled: true },
      { tile: true, label: '📜 본당 성적표', tileSub: p.transfer ? (bishopCallDue() ? '📞 주교님 전화' : transferReady() ? '인사발령 공문이 왔어요' : `발령까지 ${transferWeeksLeft()}주일`) : transferNeedLabel(), onClick: () => setTimeout(openTransferModal, 0) },
      { tile: true, label: '📅 사목 방향', tileSub: direction() ? `${direction().icon} ${direction().name}` : '이번 달 정하기', onClick: () => setTimeout(openDirectionModal, 0) },
      { tile: true, label: '💼 지출 기준', tileSub: '행사 지원금', onClick: () => setTimeout(openPolicyModal, 0) },
      { tile: true, label: '💰 단체별 지원', tileSub: '활동비 많이·보통·적게', onClick: () => setTimeout(openBudgetModal, 0) },
      { tile: true, label: '📑 월별 보고서', tileSub: (p.reports || []).length ? p.reports[0].label : '아직 없음', onClick: () => setTimeout(() => openReportModal(0), 0) },
      { tile: true, label: '📨 상임위원회', tileSub: open ? (p.agenda.length ? `건의 ${p.agenda.length}건` : '건의 없음') : `🔒 위원장 ${COMMITTEE_CHAIRS}명부터 (${chairsCount()}/${COMMITTEE_CHAIRS})`, disabled: !open, sub: open ? (p.daily.committee ? '오늘 회의를 열었어요' : `하루 한 번 · ⚡${committeeCost()}`) : '', onClick: () => setTimeout(openCommittee, 0) },
    ],
  });
}

// 조직도: 분과(위원회)마다 속한 단체와 위원장 선임
// 소공동체 짜임: 위원장 → 지역장 → 구역장 → 반장
function smallComHtml() {
  const st = smallComStats();
  const box = (icon, name, n, on, sub) => `<div class="sc-box ${on ? 'on' : 'off'}"><div class="sc-n">${icon} ${n}</div><div class="sc-name">${name}</div>${sub ? `<div class="sc-sub">${sub}</div>` : ''}</div>`;
  return `<div class="sc-tree">
      ${box('🏘️', '소공동체 위원장', hasChair('smallCom') ? '1명' : '없음', hasChair('smallCom'), hasChair('smallCom') ? '선임됨' : st.gu ? '조직도에서 선임' : '구역이 생기면')}
      <span class="sc-arrow">▼</span>
      ${box('🗺️', '지역장', `${st.ji}명`, st.ji > 0, st.ji ? `지역 ${st.ji}개` : `구역 ${SMALLCOM.guPerJi + 1}개부터`)}
      <span class="sc-arrow">▼</span>
      ${box('📍', '구역장', `${st.gu}명`, st.gu > 0, st.gu ? `구역 ${st.gu}개 · 마음 목표 +${r1(st.gu * SMALLCOM.guHeart)}` : `반 ${SMALLCOM.banPerGu + 1}개부터`)}
      <span class="sc-arrow">▼</span>
      ${box('🏠', '반장', `${st.ban}명`, true, `반 ${st.ban}개 · 교무금 +${r1(st.ban * SMALLCOM.banOffering)}/시간`)}
    </div>
    <p class="muted">신자 ${Math.floor(Game.state.pastor.res.members)}명 중 ${st.people}명이 소공동체에 참여해요 (참여율 ${Math.round(st.rate * 100)}% · 소공동체 레벨과 활력이 높을수록 많이) · 한 반에 약 ${SMALLCOM.perBan}명</p>`;
}

// 본당 조직도: 주임 신부 → 사목회장·상임위 → 위원장 → 분과장 → 단체 (아직 없는 자리는 흐리게)
function openOrgModal() {
  const p = Game.state.pastor, have = new Map(allGroups().map(x => [x.g.type, x.g]));
  const node = (icon, name, sub, st, extra = '') => `<div class="on ${st}">${extra}<div class="on-ic">${icon}</div><div class="on-name">${name}</div>${sub ? `<div class="on-sub">${sub}</div>` : ''}</div>`;
  const groupNode = t => { const g = have.get(t), u = UNITS[t]; return node(u.icon, UNIT_SHORT[t] || u.name, g ? (g.level ? `Lv${g.level}${t === 'district' ? ` · ${smallComLine()}` : chairLed(g) ? ' · 스스로 회의' : ''}` : '준비 중') : unitUnlocked(t) ? '만들 수 있어요' : '🔒', g && g.level ? 'on-have' : 'on-off'); };
  const chairNode = o => {
    const done = hasChair(o.id), ready = orgReady(o), needs = orgNeeds(o), okN = needs.filter(n => n.ok).length;
    return node(o.icon, o.name, done ? '✅ 선임됨' : ready ? '👔 선임할 수 있어요' : `${okN}/${needs.length} 준비`, done ? 'on-chair' : ready ? 'on-ready' : 'on-off', '');
  };
  const branch = (o, inner) => `<div class="ot-col">${chairNode(o)}<div class="ot-kids">${inner}</div></div>`;
  const kids = list => list.map(t => `<div class="ot-kid">${groupNode(t)}</div>`).join('');
  const cols = ORG.filter(o => !ORG.some(x => (x.chairs || []).includes(o.id))).map(o => o.chairs
    ? branch(o, o.chairs.map(id => { const c = ORG.find(x => x.id === id); return `<div class="ot-kid ot-sub">${chairNode(c)}<div class="ot-kids">${kids(c.groups.concat(c.extra || []))}</div></div>`; }).join('') + kids((o.groups || []).concat(o.extra || [])))
    : branch(o, kids(o.groups.concat(o.extra || []))));
  // 위원회에 속하지 않은 단체: 본당 직속
  const inOrg = new Set(ORG.flatMap(o => (o.groups || []).concat(o.extra || [])));
  const direct = Object.keys(UNITS).filter(t => !inOrg.has(t) && UNIT_UNLOCK[t] !== undefined);
  cols.push(`<div class="ot-col">${node('⛪', '본당 직속', '신부님이 직접', 'on-chair on-plain')}<div class="ot-kids">${kids(direct)}</div></div>`);
  const open = committeeUnlocked();
  modal({
    title: '🏛️ 본당 조직도',
    html: `<p class="small">분과의 단체들이 자리를 잡으면 위원장을 세울 수 있어요. 위원장이 있는 분과의 단체는 <b>신부님이 가지 않아도</b> 스스로 회의를 해요. 위원장이 <b>${COMMITTEE_CHAIRS}명</b>이 되면 상임위원회가 열려요. 흐린 칸은 아직 없는 자리예요.</p>
      <div class="org-tree">
        <div class="ot-top">${node('✝️', `${esc(Game.state.name)} 주임 신부`, p.name, 'on-boss')}</div>
        <div class="ot-mid">${node('🧑‍💼', '사목회장', '박 요셉', 'on-chair')}${node('📨', '상임위원회', open ? `✅ 위원장 ${chairsCount()}명` : `🔒 위원장 ${chairsCount()}/${COMMITTEE_CHAIRS}`, open ? 'on-chair' : 'on-off')}</div>
        <div class="ot-cols">${cols.join('')}</div>
      </div>
      <p class="muted">← 옆으로 밀어서 모두 보기 · 위원장 덤: ${ORG.map(o => `${o.icon} ${o.perk}`).join(' · ')}</p>`,
    options: ORG.filter(orgReady).map(o => ({ tile: true, label: `👔 ${o.name} 선임`, tileSub: `⚡${APPOINT_ENERGY} · 임명장 수여`, disabled: Game.state.energy < APPOINT_ENERGY, onClick: () => { const m = appointChair(o.id); if (m) { toast(m); save(); setTimeout(openOrgModal, 0); } } })),
  });
}

function openCommittee() {
  const s = Game.state, p = s.pastor;
  if (!p.daily.committee) {
    modal({
      title: '📨 상임위원회',
      html: `<p class="small">위원장급 단체 대표들이 모여 각 단체의 어려움과 건의사항을 올려요. 오늘 회의를 열면 건의사항을 처리할 수 있어요.</p>
        <p class="muted">올라온 건의 ${p.agenda.length}건 · 사흘 넘게 미루면 위원들이 실망해요</p>`,
      options: [{
        label: `🗓️ 오늘 상임위 열기 <span class="cost">⚡${committeeCost()}</span>`, sub: p.agenda.length ? '건의사항을 하나씩 들어요' : '올라온 건의가 없어도 위원들과 인사를 나눠요',
        disabled: s.energy < committeeCost(), onClick: () => { if (openCommitteeToday()) setTimeout(openCommittee, 0); },
      }],
    });
    return;
  }
  if (!p.agenda.length) { modal({ face: 'council', who: COUNCIL_NAME, title: '📨 상임위원회', html: '<p class="serif">"오늘은 올라온 건의가 없습니다, 신부님. 다들 잘 지내고 있어요."</p>' }); return; }
  const a = p.agenda[0], item = AGENDAS[a.type][a.idx];
  modal({
    face: faceForUnit(a.type), who: `${UNITS[a.type].icon} ${UNITS[a.type].name} 위원장`, title: '📨 상임위원회 건의',
    html: `<p class="serif">"${item.text}"</p><p class="muted">남은 건의 ${p.agenda.length}건${a.age ? ` · ${a.age}일째 기다리는 중` : ''}</p>`,
    options: item.options.map((o, i) => ({
      label: `${o.label}${o.cost ? ` <span class="cost">💰${agendaCost(o)}</span>` : ''}${o.energy ? ` <span class="cost">⚡${o.energy}</span>` : ''}`,
      disabled: !!agendaBlocker(o),
      sub: (agendaBlocker(o) ? `<b>${agendaBlocker(o)}</b><br>` : '') + choiceEffectHtml({ ...o, cost: undefined, energy: undefined }, a.type),
      onClick: () => { const m = resolveAgenda(0, i); if (m) { toast(`📨 ${m}`); if (p.agenda.length) setTimeout(openCommittee, 0); } },
    })),
    buttons: [{ label: '다음에', cls: 'ghost' }],
  });
}

function openGongsoMenu(key) {
  const s = Game.state, p = s.pastor, site = p.sites[key];
  const cj = jobFor(key), working = !!cj;
  if (site.level === 0) {
    modal({ title: '🏗️ 공소 (공사 중)', html: `<p class="small">윗말 교우들이 벽돌을 나르고 있어요. 남은 시간 ${fmtDur(jobLeftSec(cj))}</p>`, options: jobOptions(cj) });
    return;
  }
  const to = site.level + 1;
  const block = blockText('gongso', key, null, to);
  modal({
    title: `✝️ 윗말 공소 Lv${site.level}`,
    html: `<p class="small">${glossarize(GONGSO.desc)}</p><p class="muted">지금: ${GONGSO.prod(effL(site.level))}</p>`,
    options: [
      ...stashOption(key),
      { label: `🙏 공소 방문 미사 <span class="cost">⚡2</span>`, sub: '공소 교우들과 함께 미사를 드려요', disabled: s.energy < 2, onClick: () => { const m = attendMeeting(key); if (m) toast(`✝️ ${m}`); } },
      ...(working ? jobOptions(cj) : [{
        label: `⬆️ 공소 넓히기 → Lv${to} <span class="cost">${costText(jobCost('gongso', key, null, to))}</span>`,
        sub: `${compareLine('gongso', key, null, to)}${block ? ` · <b>${block}</b>` : ''}`, disabled: !!block,
        onClick: () => { if (startJob('gongso', key, null, to)) toast(`✝️ 공소 Lv${to} 공사를 시작했어요`); },
      }]),
    ],
  });
}

function pastorStatusHtml() {
  const p = Game.state.pastor, rt = parishRates(), r = p.res;
  const arrow = (v, t) => t > v + 0.5 ? '↗' : t < v - 0.5 ? '↘' : '';
  return `
    <div class="stat-row"><span>⛪</span><span>미사 참례율</span><span class="muted small">${Game.state.pastor.lastAttendance ? `지난 주일 ${Game.state.pastor.lastAttendance}명 · ` : ''}강론력·평판·마음이 높을수록</span><span class="v">${Math.round(attendanceRate() * 100)}%</span></div>
    <div class="stat-row"><span>👥</span><span>신자</span><span class="muted small">좌석 ${rt.seats}석 · +${rt.members.toFixed(1)}/시간</span><span class="v">${Math.floor(r.members)}</span></div>
    <div class="stat-row"><span>💰</span><span>봉헌금</span><span class="muted small">쌓임 +${rt.gross.toFixed(1)}/시간 · 살림 −${rt.upkeep.toFixed(1)}/시간 (인건비 ${staffWages().toFixed(1)}) · 공납금 ${Math.round(levyRate() * 100)}%</span><span class="v">${Math.floor(r.offering)}/${rt.vault}</span></div>
    <div class="stat-row"><span>❤️</span><span>마음</span><div class="bar good"><span style="width:${r.heart}%"></span></div><span class="v">${Math.floor(r.heart)}${arrow(r.heart, rt.heartT)}</span></div>
    <div class="stat-row"><span>🌏</span><span>평판</span><div class="bar good"><span style="width:${r.reputation}%"></span></div><span class="v">${Math.floor(r.reputation)}${arrow(r.reputation, rt.repT)}</span></div>
    <p class="small">🏘️ 이웃 동네 종교 현황은 지도 아래 <b>마을회관</b>을 누르면 볼 수 있어요.</p>
    ${unlockedPerks().length ? `<div class="perks"><b>✨ 열린 단체 능력 ${unlockedPerks().length}개</b>${unlockedPerks().map(k => `<div class="on">${k.text}</div>`).join('')}</div>` : ''}
    <div class="stat-row"><span>📦</span><span>교리실</span><span class="muted small">빈 방 ${roomsFree()}개</span><span class="v">${containerCount()}동</span></div>
    <p class="muted">신자들의 마음이 클수록 봉헌금·건축헌금이 많이 들어오고 새 신자도 잘 와요. 봉헌과 새 얼굴은 헌금함과 단체 건물에 쌓여요. 말풍선을 눌러 거두세요. 말풍선이 가득 차면 넘치는 봉헌은 사무실 직원이 일부(사무실 Lv1 65% ~ Lv5 85%)만 대신 거둬 금고에 넣어요. 봉헌금은 금고(본당 사무실) 한도까지만 가질 수 있어요. 건물과 단체가 늘수록 살림(전기·난방·활동비)도 늘고, 주일마다 교구 공납금을 내요. 봉헌금이 바닥나면 단체 활력이 떨어져요. 마음은 강론, 가정 방문, 단체 모임으로 얻어요. 새 신자는 평판과 입소문, 그리고 신부님의 강론력·친화력이 높을수록 많이 찾아와요. 화살표는 지금 단체들이 이끄는 방향이에요.</p>`;
}

function openCouncil() {
  const p = Game.state.pastor;
  if (p.guide) p.guide.council = true;
  const to = p.fixed.church + 1;
  const c = CHURCH_LEVELS[to];
  const need = containerNeed();
  const goal = (c ? `<h3>다음 목표: 성당 Lv${to} "${c.name}"</h3>${churchNeeds(to).map(needLine).join('')}${c.locked ? `<p class="muted">🔒 ${c.locked}</p>` : ''}` : '')
    + (need ? `<h3>다음 컨테이너 (${containerCount() + 1}번째)</h3>${needLine({ label: '신자', have: Math.floor(p.res.members), want: need.members, ok: need.ok })}<div class="q-item muted">💰 ${need.cost}만 원</div>` : '');
  const tips = [];
  if (!containerCount()) tips.push('"신부님, 단체가 모일 곳이 없어요. 빈 땅에 컨테이너라도 하나 놓으면 교리실로 쓸 수 있을 거예요."');
  else if (!groupCount()) tips.push('"교리실이 생겼으니 구역·반이나 레지오부터 꾸려 보시지요."');
  if (roomsFree() === 0 && containerCount()) tips.push('"교리실 방이 꽉 찼어요. 신자가 더 늘면 컨테이너를 하나 더 놓아야겠어요."');
  if (p.res.heart < 40) tips.push('"교우들 마음을 얻으셔야 봉헌도 늘어요. 강론 준비하시고 집집마다 찾아가 주세요."');
  if (p.res.offering < 50 && p.week > 0 && canAppeal()) tips.push('"공사비가 모자라면 주일에 건축헌금을 한번 부탁해 보세요. 너무 자주는 말고요."');
  if (p.fixed.church >= 3 && !villageOpen('v1')) tips.push('"윗말 이장님이 신부님을 한번 뵙고 싶어 하세요."');
  if (pastorMeetings().some(x => !p.daily.attended[groupId(x.key, x.room)])) tips.push('"단체마다 회의 시간이 정해져 있어요. 신부님이 오시면 다들 힘이 납니다."');
  if (c && churchNeeds(to).some(n => !n.ok && n.label !== '신자')) tips.push('"성당을 넓히려면 사제관과 교리실부터 손봐야 한대요. 교구에서 그렇게 정했답니다."');
  modal({
    title: `🧑‍💼 사목회장 · ${p.name} 현황`,
    html: `${tips.length ? `<p class="serif">${tips[0]}</p>` : ''}${pastorStatusHtml()}${goal}`,
    buttons: [{ label: '닫기' }],
  });
}

function openVillage(id) {
  const v = VILLAGES[id], st = Game.state.pastor.villages[id];
  if (st.open) {
    modal({ face: faceFor(v.elder) === 'man' ? 'grandpa' : faceFor(v.elder), title: v.elder, html: `<p class="serif">"신부님 덕분에 ${v.name}에도 다시 기도 소리가 나요. 공소가 생기면 좋겠어요."</p>` });
    return;
  }
  const needs = villageNeeds(id);
  const ready = needs.every(n => n.ok);
  modal({
    title: `🗺️ ${v.elder}`,
    html: `<p class="serif">${ready ? `"신부님, 우리 ${v.name}에도 옛날엔 교우가 많았지요. 집집마다 한번 들러 주시면 다들 반가워할 거예요."` : `"${v.name}은 산 너머라 성당이 멀어요. 본당이 좀 더 커지면 그때 와 주세요."`}</p>
      ${needs.map(n => `<div class="q-item ${n.ok ? 'done' : ''}">${n.ok ? '✅' : '⬜'} ${n.label} ${n.have}/${n.want}</div>`).join('')}
      <p class="muted">${v.name}을 열면 새 땅과 공소 자리가 생겨요.</p>`,
    options: [{
      label: `🏠 ${v.name} 가정 방문 (${st.visits}/${v.visits}) <span class="cost">⚡2</span>`,
      sub: ready ? '마을 사람들의 마음을 열어요' : '조건을 먼저 채워야 해요',
      disabled: !ready || Game.state.energy < 2,
      onClick: () => { const r = visitVillage(id); if (r) { toast(`🗺️ ${r.msg}`); if (r.opened) worldRebuild(); } },
    }],
  });
}

function onSunday() {
  const s = Game.state;
  if (!sundayReady() || s.energy < sundayCost()) return;
  // 미사 30분 전: 고해소에 앉는다. 사람이 올 때도, 안 올 때도 있다
  const c = rollConfession();
  if (!c) { toast(`🙏 ${pickOne(CONFESS_QUIET)}`); startMass(); return; }
  openConfession(c);
}

function openConfession(c) {
  const hint = confessHint(c);
  // v1.08: 고해소 그림 위, 창살 너머 어두운 얼굴 + 아래 글 상자
  modal({
    face: faceFor(c.who), faceCls: 'grille', bg: 'confess', who: `🙏 고해소 · ${c.who}`,
    html: `<p class="serif">${c.text}</p><p class="muted">${pickOne(CONFESS_OPEN)}</p>
      ${hint ? `<p class="small">💡 ${hint} <span class="muted">(친화력이 높아 알아챘어요)</span></p>` : '<p class="muted">무엇이 필요한 분일까요? 말씀을 잘 듣고 골라 보세요. 친화력이 30을 넘으면 알아챌 수 있어요.</p>'}
      <p class="muted">고해 내용은 고해 비밀이라 어디에도 남지 않아요.</p>`,
    // 대답 순서는 매번 섞는다 (맨 끝은 늘 '서둘러 마치기')
    options: [...c.ans.map((a, i) => ({ i, text: a[1], energy: 1 })).sort(() => Math.random() - 0.5), { i: 'rush', text: '⏱️ 미사 시간이 급해 사죄경만 하고 마친다', energy: 0 }].map(a => ({
      label: `${a.text}${a.energy ? ` <span class="cost">⚡${a.energy}</span>` : ''}`,
      sub: a.i === 'rush' ? '행동력은 들지 않지만 마음을 얻기 어려워요' : '',
      disabled: Game.state.energy < a.energy + sundayCost(),
      onClick: () => {
        const r = hearConfession(c, a.i);
        setTimeout(() => modal({ title: r.ok ? '🕊️ 마음에 평화가' : '🙏 고해를 마쳤어요', html: `<p class="serif">${r.text}</p>${r.eff ? `<p class="small">${r.eff}</p>` : ''}`, buttons: [{ label: '⛪ 미사 드리러 가기', onClick: () => setTimeout(startMass, 0) }] }), 0);
      },
    })),
    buttons: [{ label: '고해 없이 바로 미사', cls: 'ghost', onClick: () => setTimeout(startMass, 0) }],
  });
}

function startMass() {
  const s = Game.state;
  if (!sundayReady() || s.energy < sundayCost()) return;
  const r = doSunday();
  playMassScene(r, () => modal({
    title: '⛪ 주일미사를 봉헌했어요',
    html: massResultHtml(r),
    buttons: [{ label: '확인', onClick: () => { setTimeout(afterMassVisitor, 0); if (s.pastor.event) toast('❗ 성당 앞에 누군가 찾아왔어요'); } }],
  }));
}

// 주일미사 결과: 강론 배지 + 큰 숫자 네 칸 + 나머지 소식은 부드러운 줄로
function massResultHtml(r) {
  const p = Game.state.pastor, g = r.sermon.grade;
  const heart = r.lines.find(l => l.startsWith('❤️')) || '';
  const hv = (heart.match(/[+−-][\d.]+/) || ['0'])[0];
  const skip = l => /^(⛪ 미사 참례|❤️ 신자들의 마음|💰 주일 봉헌|👥 강론 소문)/.test(l);
  const stat = (icon, v, label, cls = '') => `<div class="mr-stat ${cls}"><span class="mr-i">${icon}</span><b>${v}</b><span>${label}</span></div>`;
  return `<div class="mr-sermon g-${g}"><span class="mr-face">${r.sermon.icon}</span><div><small>${term('강론')}</small><b>${r.sermon.label}</b></div>${r.prepared ? '<em>✍️ 준비한 강론</em>' : ''}</div>
    <div class="mr-stats">
      ${stat('⛪', r.attendees, `참례 (${Math.round(r.rate * 100)}%)`)}
      ${stat('💰', r.collection, '주일 봉헌', 'gold')}
      ${stat('❤️', hv, '마음', hv.startsWith('-') || hv.startsWith('−') ? 'down' : 'up')}
      ${stat('👥', `+${r.newcomers}`, '새 신자')}
    </div>
    <div class="mr-lines">${r.lines.filter(l => !skip(l)).map(l => `<div>${l}</div>`).join('')}</div>
    <p class="muted">다음 주일미사까지 ${fmtDur(sundayLeftSec())} · 사제관에서 강론을 준비하고 오면 감동할 확률과 봉헌이 올라가요</p>`;
}

// ---------- 주일미사 연출 (약 7초, 건너뛸 수 있음) ----------
// 성당 안: 제대와 스테인드글라스, 장의자에 앉은 교우들(참례율만큼), 입당 → 강론 → 봉헌 → 파견
// 성당 겉모습 단계(tier 1~5)에 따라 성당 안도 바뀐다: 장의자 줄 수, 창문, 빨간 카펫, 샹들리에, 오르간, 아치
const MASS_TIERS = [null,
  { rows: 3, windows: 2, glass: false, carpet: false, lamp: false, organ: false, arch: false, metal: true, chairs: true, wall: '#a9bccb', floor: '#a9a59c', name: '컨테이너 성당' },
  { rows: 4, windows: 4, glass: false, carpet: false, lamp: false, organ: false, arch: false, panel: true, wall: '#e3e9ee', floor: '#c3b9a8', name: '가건물 성당' },
  { rows: 5, windows: 4, glass: true, carpet: true, lamp: true, organ: false, arch: false, wall: '#f2ead9', floor: '#cbbba3', name: '새 성당' },
  { rows: 5, windows: 6, glass: true, carpet: true, lamp: true, organ: true, arch: false, wall: '#f5efe2', floor: '#cfc0a8', name: '살아 있는 성당' },
  { rows: 6, windows: 6, glass: true, carpet: true, lamp: true, organ: true, arch: true, wall: '#f7f3ea', floor: '#d6c8b1', name: '빛나는 성당' },
];

// 그린 미사 장면 (v1.06): 성당 단계마다 바탕 + 단체가 있으면 겹치는 조각 (tools/comfy-mass.py와 같은 자리)
const MASS_IMG_W = 1216, MASS_IMG_H = 832;
let MASS_META = null; // 조각 자리 (그림 좌표 0~1): tools/comfy-mass.py가 적은 assets/story/mass-meta.json
function loadMassLayers(tier, info) {
  const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const meta = MASS_META ? Promise.resolve(MASS_META) : fetch('assets/story/mass-meta.json?v=1').then(r => r.json()).then(m => (MASS_META = m)).catch(() => ({}));
  // 제대회 → 깔끔한 제대, 헌화회 → 제대 꽃, 복사단(또는 제대회 Lv5) → 복사, 성가대 → 성가대원
  const want = ['altar', 'flower', 'servers', 'choir'].filter(k => k === 'altar' ? (info.altar || 0) >= 1 : k === 'flower' ? (info.flower || 0) >= 1 : k === 'servers' ? ((info.altar || 0) >= 5 || info.servers) : !!info.choir);
  return meta.then(m => Promise.all([load(STORY_IMG(`mass-t${tier}`)), ...want.map(k => m[`t${tier}-${k}`] ? load(STORY_IMG(`mass-t${tier}-${k}`)) : null)])
    .then(([base, ...parts]) => base ? { base, parts: parts.map((img, i) => img && { img, box: m[`t${tier}-${want[i]}`] }).filter(Boolean) } : null));
}

function playMassScene(info, onDone) {
  const tierNo = (CHURCH_LEVELS[Game.state.pastor.fixed.church] || {}).tier || 1;
  let started = false;
  const go = painted => { if (started) return; started = true; playMassSceneInner(info, onDone, painted); };
  Sound.sfx('bell');
  loadMassLayers(tierNo, info).then(go);
  setTimeout(() => go(null), 2500);
}

function playMassSceneInner(info, onDone, painted) {
  const W = 240, H = 150;
  const tier = MASS_TIERS[(CHURCH_LEVELS[Game.state.pastor.fixed.church] || {}).tier || 1];
  const rowGap = tier.rows >= 6 ? 10 : tier.rows <= 3 ? 15 : 12, SEATS = tier.rows * 12;
  const el = document.createElement('div');
  el.id = 'mass';
  el.innerHTML = `<canvas width="${W}" height="${H}"></canvas><div class="mass-cap"></div><button class="mass-skip">건너뛰기 ▸▸</button>`;
  document.body.appendChild(el);
  UI.talking = { scene: true }; // 연출 중에는 지도를 누를 수 없게
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), cap = el.querySelector('.mass-cap');
  // 미사 장면 그림(assets/sprites/mass-scene.png, 신부님과 교우들이 있는 성전 정면)이 있으면 그 그림을 배경으로 쓰고,
  // 코드로 그린 성당·교우·신부님 대신 그 위에 반응(하트·봉헌·빛)만 얹는다. 그림이 고우니 캔버스를 4배로
  const massBg = painted || getSprite('mass-scene');
  if (massBg) { cv.width = W * 4; cv.height = H * 4; ctx.scale(4, 4); el.classList.add('painted'); }
  // 그린 장면은 가로세로 비가 달라 위아래를 조금 잘라 꽉 채운다. 그림 좌표(0~1) → 화면 좌표
  const srcH = MASS_IMG_W * H / W, srcY = (MASS_IMG_H - srcH) / 2;
  const toY = yn => (yn * MASS_IMG_H - srcY) / srcH * H;
  const drawPainted = t => {
    const z = 1 + 0.035 * Math.min(1, t / 7.4); // 천천히 다가간다
    ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.45);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(painted.base, 0, srcY, MASS_IMG_W, srcH, 0, 0, W, H);
    for (const p of painted.parts) ctx.drawImage(p.img, p.box[0] * W, toY(p.box[1]), (p.box[2] - p.box[0]) * W, toY(p.box[3]) - toY(p.box[1]));
    ctx.restore(); ctx.imageSmoothingEnabled = false;
  };
  ctx.imageSmoothingEnabled = false;
  const filled = Math.max(3, Math.min(SEATS, Math.round(SEATS * info.rate)));
  const looks = ['p1', 'p2', 'p3', 'p4', 'p5', 'kid', 'youth'];
  // 자리 배치: 왼쪽·오른쪽 장의자 5줄 × 6명, 앞줄부터 채운다 (조금 섞어서)
  const seats = [];
  for (let row = 0; row < tier.rows; row++) for (let side = 0; side < 2; side++) for (let i = 0; i < 6; i++) seats.push({ x: (side ? 140 : 26) + i * 13, y: 90 + row * rowGap, look: looks[(row * 7 + side * 3 + i * 5) % looks.length], seed: (row * 13 + i * 7 + side) % 10 });
  seats.sort((a, b) => a.y - b.y || (a.seed - b.seed));
  const people = seats.slice(0, filled);
  const grade = info.sermon.grade;
  const lit = info.lit || liturgyNow(), altar = info.altar || 0, flower = info.flower || 0, servers = altar >= 5 || info.servers;
  const T = { enter: 1.8, walk: 2.8, homily: 5.0, offer: 6.2, end: 7.4 };
  let t0 = null, done = false;

  function finish() {
    if (done) return;
    done = true;
    el.remove();
    UI.talking = null;
    onDone();
  }
  el.querySelector('.mass-skip').onclick = finish;

  function drawRoom(t) {
    // 벽과 바닥
    ctx.fillStyle = tier.wall; ctx.fillRect(0, 0, W, 78);
    ctx.fillStyle = tier.floor; ctx.fillRect(0, 78, W, H - 78);
    ctx.fillStyle = tier.carpet ? '#9c3d2c' : '#d8c7a8'; ctx.fillRect(110, 66, 20, H - 66); // 가운데 통로 (카펫)
    if (tier.carpet) { ctx.fillStyle = '#c9a227'; ctx.fillRect(110, 66, 1, H - 66); ctx.fillRect(129, 66, 1, H - 66); }
    ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, 0, 14, 78); ctx.fillRect(W - 14, 0, 14, 78);
    // 컨테이너 성당: 골판 철판 벽과 형광등 / 가건물: 패널 이음새
    if (tier.metal) { ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 4; x < W; x += 6) ctx.fillRect(x, 0, 1, 78); ctx.fillStyle = '#f4f8fb'; ctx.fillRect(60, 4, 30, 2); ctx.fillRect(150, 4, 30, 2); }
    if (tier.panel) { ctx.fillStyle = 'rgba(0,0,0,.07)'; for (let x = 20; x < W; x += 24) ctx.fillRect(x, 0, 1, 78); }
    // 아치 (가장 큰 성당)
    if (tier.arch) {
      ctx.strokeStyle = '#d9cdb4'; ctx.lineWidth = 2;
      for (const ax of [40, 80, 160, 200]) { ctx.beginPath(); ctx.moveTo(ax - 16, 78); ctx.lineTo(ax - 16, 20); ctx.quadraticCurveTo(ax, 2, ax + 16, 20); ctx.lineTo(ax + 16, 78); ctx.stroke(); }
    }
    // 창문: 작은 성당은 맑은 유리, 커지면 스테인드글라스 (빛이 살짝 일렁임)
    const panes = ['#4a6fa5', '#c9a227', '#9c3d2c', '#5f8f5a'];
    const xs = { 2: [40, 186], 4: [24, 58, 168, 202], 6: [20, 46, 72, 154, 180, 206] }[tier.windows];
    xs.forEach((x, i) => {
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 1, 14, 14, 40);
      for (let j = 0; j < 4; j++) { ctx.fillStyle = tier.glass ? panes[(i + j) % 4] : '#bcd6e8'; ctx.fillRect(x + (j % 2) * 6, 15 + Math.floor(j / 2) * 19, 6, 19); }
      ctx.fillStyle = `rgba(255,240,180,${0.12 + 0.06 * Math.sin(t * 2 + i)})`; ctx.fillRect(x - 6, 54, 24, 40);
    });
    // 오르간 파이프 (왼쪽 앞)
    if (tier.organ) for (let i = 0; i < 6; i++) { ctx.fillStyle = '#c9b48a'; ctx.fillRect(16 + i * 4, 40 - (i % 3) * 6, 3, 30 + (i % 3) * 6); ctx.fillStyle = '#6b4a2f'; ctx.fillRect(14, 70, 28, 6); }
    // 반주단: 오르간(작은 성당은 전자 오르간) 앞에 반주자
    if (info.organ) { if (!tier.organ) { ctx.fillStyle = '#2b2420'; ctx.fillRect(16, 66, 22, 5); ctx.fillStyle = '#f4f1ea'; ctx.fillRect(17, 66, 20, 2); } drawCharacter(ctx, 27, 80, 'p4', 'up', Math.floor(t * 4), false); if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#7a4f8f'; ctx.font = '8px sans-serif'; ctx.fillText('♫', 34, 58 - (t * 5 % 8)); } }
    // 전례해설단: 왼쪽 독서대
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(76, 60, 8, 2); ctx.fillRect(79, 62, 2, 12);
    if (info.lector) drawCharacter(ctx, 80, 74, 'p3', 'down', 0, false);
    // 샹들리에
    if (tier.lamp) for (const lx of [70, 170]) {
      ctx.fillStyle = '#8a7a5a'; ctx.fillRect(lx, 0, 1, 8);
      ctx.fillStyle = '#c9a227'; ctx.fillRect(lx - 6, 8, 13, 2);
      ctx.fillStyle = Math.sin(t * 7 + lx) > 0 ? '#ffe9a6' : '#f2c14e'; for (const dx of [-6, 0, 6]) ctx.fillRect(lx + dx, 6, 1, 2);
    }
    // 제대와 십자가, 촛불 (작은 성당은 나무 제대)
    // 제대회가 없으면 맨 나무 제대, 있으면 흰 제대보, Lv3부터 전례색 앞가림천, Lv5부터 촛대가 늘고 복사단이 선다
    const lc = LIT_COLOR[lit.color] || LIT_COLOR.green;
    if (tier.metal) {
      ctx.fillStyle = '#9a7a52'; ctx.fillRect(100, 58, 40, 2); ctx.fillRect(102, 60, 2, 8); ctx.fillRect(136, 60, 2, 8);
      ctx.fillStyle = altar >= 1 ? '#ffffff' : '#b0916a'; ctx.fillRect(100, 55, 40, 3);
      if (altar >= 3) { ctx.fillStyle = lc; ctx.fillRect(104, 58, 32, 7); ctx.fillStyle = '#d8b14a'; ctx.fillRect(119, 59, 2, 5); ctx.fillRect(117, 60, 6, 1); }
    } else {
      ctx.fillStyle = tier.carpet ? '#b89c6a' : '#9a7a52'; ctx.fillRect(80, 62, 80, 8);
      ctx.fillStyle = altar >= 1 ? '#ffffff' : '#a8875e'; ctx.fillRect(90, 56, 60, 8);
      if (altar >= 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(88, 56, 2, 6); ctx.fillRect(150, 56, 2, 6); } // 늘어진 제대보
      if (altar >= 3) { ctx.fillStyle = lc; ctx.fillRect(96, 58, 48, 6); ctx.fillStyle = '#d8b14a'; ctx.fillRect(96, 58, 48, 1); ctx.fillRect(119, 59, 2, 4); ctx.fillRect(117, 60, 6, 1); }
    }
    if (tier.glass && altar >= 1) { ctx.fillStyle = '#c9a227'; ctx.fillRect(90, 56, 60, 1); }
    ctx.fillStyle = tier.arch ? '#e2c25a' : '#c9a227'; ctx.fillRect(119, 20, 3, 30); ctx.fillRect(112, 27, 17, 3);
    const candles = altar >= 5 ? [88, 95, 102, 137, 144, 151] : altar >= 1 && tier.lamp ? [92, 100, 139, 147] : altar >= 1 ? [95, 100, 139, 144] : [95, 144];
    for (const cx of candles) {
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(cx, 48, 2, 8);
      ctx.fillStyle = Math.sin(t * 9 + cx) > 0 ? '#f2c14e' : '#f08a3a'; ctx.fillRect(cx, 46, 2, 2);
    }
    // 대림환: 대림 주일마다 초가 하나씩 더 켜진다 (셋째 주는 분홍 초)
    if (lit.wreath) {
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(68, 66, 2, 12); ctx.fillStyle = '#3f7d4a'; ctx.fillRect(60, 63, 18, 4); ctx.fillStyle = '#2f5f3a'; ctx.fillRect(62, 65, 14, 2);
      for (let i = 0; i < 4; i++) {
        const cx = 62 + i * 4; ctx.fillStyle = i === 2 ? '#e08aa8' : '#6a3d8f'; ctx.fillRect(cx, 57, 2, 6);
        if (i < lit.wreath) { ctx.fillStyle = Math.sin(t * 9 + i) > 0 ? '#f2c14e' : '#f08a3a'; ctx.fillRect(cx, 55, 2, 2); }
      }
    }
    // 부활초: 부활 시기에는 제대 오른쪽에 큰 초
    if (lit.paschal) { ctx.fillStyle = '#d8b14a'; ctx.fillRect(166, 66, 6, 3); ctx.fillStyle = '#fbf6ea'; ctx.fillRect(168, 42, 3, 24); ctx.fillStyle = '#c0392b'; ctx.fillRect(168, 50, 3, 1); ctx.fillRect(169, 48, 1, 5); ctx.fillStyle = Math.sin(t * 8) > 0 ? '#f2c14e' : '#f08a3a'; ctx.fillRect(168, 39, 3, 3); }
    // 헌화회 꽃: 전례 시기에 맞는 꽃이 제대 앞에 (사순 시기에는 두지 않는다)
    if (flower >= 1 && lit.flowers !== 'none') drawAltarFlowers(t);
    // 장의자 (컨테이너 성당은 접이식 의자)
    ctx.fillStyle = tier.chairs ? '#6b7380' : tier.carpet ? '#7a4a2a' : '#8a5a34';
    for (let row = 0; row < tier.rows; row++) {
      if (tier.chairs) { for (let i = 0; i < 6; i++) { ctx.fillRect(22 + i * 13, 96 + row * rowGap, 8, 2); ctx.fillRect(136 + i * 13, 96 + row * rowGap, 8, 2); } }
      else { ctx.fillRect(18, 96 + row * rowGap, 86, 3); ctx.fillRect(134, 96 + row * rowGap, 86, 3); }
    }
  }

  function drawAltarFlowers(t) {
    const pal = LIT_FLOWERS[lit.flowers] || LIT_FLOWERS.spring;
    const spots = flower >= 5 || (lit.feast && flower >= 3) ? [84, 96, 144, 156, 72, 168] : flower >= 3 ? [86, 98, 142, 154] : [92, 148];
    spots.forEach((x, i) => {
      const big = lit.feast ? 1 : 0, y = 76;
      if (lit.flowers === 'palm') { ctx.fillStyle = '#5f8f5a'; for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 2, y - 10 + Math.abs(k) * 2, 1, 10 - Math.abs(k) * 2); ctx.fillStyle = '#8a6a44'; ctx.fillRect(x - 2, y - 1, 5, 2); return; }
      // 꽃병
      ctx.fillStyle = lit.feast ? '#d8b14a' : '#e8e2d4'; ctx.fillRect(x - 2, y - 4, 5, 5);
      ctx.fillStyle = '#4b7447'; ctx.fillRect(x, y - 9 - big * 2, 1, 6 + big * 2); ctx.fillRect(x - 2, y - 8, 1, 4); ctx.fillRect(x + 2, y - 8, 1, 4);
      // 꽃송이 (살랑살랑)
      const sway = Math.round(Math.sin(t * 1.5 + i) * 0.6);
      const pts = big ? [[-3, -10], [0, -12], [3, -10], [-2, -13], [2, -13], [0, -9]] : [[-2, -9], [0, -11], [2, -9]];
      pts.forEach(([dx, dy], k) => {
        ctx.fillStyle = pal[(i + k) % pal.length]; ctx.fillRect(x + dx + sway, y + dy, 2, 2);
        if (lit.flowers === 'lily' || lit.flowers === 'mary') { ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + dx + sway, y + dy + 1, 1, 1); }
      });
    });
  }

  // 복사단 (제대회 Lv5): 신부님 앞에서 십자가와 초를 들고 들어와 제대 양옆에 선다
  function drawServers(t, py) {
    if (!servers) return;
    const walking = t < T.walk;
    const sy = walking ? Math.max(72, py - 10) : 72;
    for (const sx of walking ? [114, 126] : [100, 140]) {
      drawCharacter(ctx, sx, sy, 'kid', 'up', Math.floor(t * 6), walking && sy > 72);
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(sx + 2, sy - 16, 1, 5); ctx.fillStyle = Math.sin(t * 9 + sx) > 0 ? '#f2c14e' : '#f08a3a'; ctx.fillRect(sx + 2, sy - 17, 1, 1);
    }
    // 대축일에는 향 연기
    if (lit.feast && !walking) for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i * 0.25) % 1; ctx.fillStyle = `rgba(240,240,240,${0.5 - k * 0.5})`; ctx.fillRect(106 + Math.round(Math.sin(t * 2 + i) * 2), 60 - k * 30, 3, 3); }
  }

  function frame(ts) {
    if (done) return;
    if (t0 === null) t0 = ts;
    const t = (ts - t0) / 1000;
    if (painted) { drawPainted(t); ctx.fillStyle = `rgba(255,240,200,${0.04 + 0.03 * Math.sin(t * 2)})`; ctx.fillRect(0, 0, W, H); }
    else if (massBg) { ctx.imageSmoothingEnabled = true; ctx.drawImage(massBg, 0, 0, W, H); ctx.imageSmoothingEnabled = false; ctx.fillStyle = `rgba(255,240,200,${0.05 + 0.04 * Math.sin(t * 2)})`; ctx.fillRect(0, 0, W, H); }
    else drawRoom(t);
    // 교우들: 입당하는 동안 앞줄부터 하나씩 앉는다
    const shown = t < T.enter ? Math.floor(people.length * t / T.enter) : people.length;
    if (!massBg) people.slice(0, shown).forEach(pp => drawCharacter(ctx, pp.x, pp.y, pp.look, 'up', 0, false));
    // 성가대 (있으면 오른쪽 앞)
    if (info.choir && !massBg) for (let i = 0; i < 4; i++) {
      drawCharacter(ctx, 176 + i * 9, 76, 'p2', 'left', 0, false);
      if (t < T.walk && Math.floor(t * 3 + i) % 2 === 0) { ctx.fillStyle = '#7a4f8f'; ctx.font = '8px sans-serif'; ctx.fillText('♪', 178 + i * 9, 50 - (t * 6 % 8)); }
    }
    // 신부님: 통로를 따라 제대로 걸어간다
    let px = 120, py = 70, dir = 'down', moving = false;
    if (t < T.walk) { const k = Math.max(0, (t - T.enter * 0.4) / (T.walk - T.enter * 0.4)); py = 148 - (148 - 70) * Math.min(1, k); dir = 'up'; moving = k < 1; }
    if (!massBg) { drawServers(t, py);
    drawCharacter(ctx, px, py, 'priest', dir, Math.floor(t * 6), moving); }
    // 신부님 제의 색 (영대): 전례색
    if (!massBg) { ctx.fillStyle = LIT_COLOR[lit.color] || LIT_COLOR.green; ctx.fillRect(px - 1, py - 11, 3, 6); }
    // 종소리
    if (t < T.enter) { ctx.fillStyle = '#7b2d26'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.floor(t * 2) % 2 ? '땡—' : '땡', 120, 12); }
    // 강론: 말풍선, 그리고 교우들의 반응
    if (t >= T.walk && t < T.homily) {
      ctx.fillStyle = '#fffdf6'; ctx.fillRect(128, 30, 26, 12); ctx.fillStyle = '#2b2420'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('·'.repeat(1 + Math.floor(t * 3) % 3), 141, 39);
      const k = (t - T.walk) / (T.homily - T.walk);
      people.forEach((pp, i) => {
        if ((i * 37) % 5 > 2 || k < 0.3) return;
        const rise = ((t * 14 + i * 5) % 18);
        ctx.font = '8px sans-serif';
        if (grade === 'moved') { ctx.fillStyle = '#e05a4f'; ctx.fillText('♥', pp.x, pp.y - 22 - rise); }
        else if (grade === 'ok') { if (i % 3 === 0) { ctx.fillStyle = '#2f8a4c'; ctx.fillText('•', pp.x, pp.y - 24); } }
        else { ctx.fillStyle = '#6b5d50'; ctx.fillText('z', pp.x + 3, pp.y - 22 - rise / 2); }
      });
    }
    // 봉헌: 바구니가 앞줄을 지나가고 동전이 떠오른다
    if (t >= T.homily && t < T.offer) {
      const k = (t - T.homily) / (T.offer - T.homily), bx = 20 + k * 200, by = 104;
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(Math.round(bx) - 5, by, 10, 5);
      ctx.fillStyle = '#c9a227'; ctx.font = '8px sans-serif';
      for (let i = 0; i < 3; i++) ctx.fillText('●', bx - 10 * i, by - 4 - ((t * 20 + i * 6) % 14));
    }
    // 파견
    if (t >= T.offer) { ctx.fillStyle = `rgba(255,248,220,${Math.min(0.5, (t - T.offer) * 0.6)})`; ctx.fillRect(0, 0, W, H); }
    // 자막
    const pc = Math.round(info.rate * 100);
    cap.innerHTML = t < T.walk ? `${lit.feast ? '✨' : '⛪'} <b>${lit.name}</b> · ${tier.name} · 오늘 <b>${info.attendees}명</b>이 왔어요 (${pc}%)`
      : t < T.homily ? `✝️ 강론 · ${t < T.walk + 0.8 ? '…' : `${info.sermon.icon} <b>${info.sermon.label}</b>`}`
      : t < T.offer ? `💰 봉헌 · <b>${info.collection}만 원</b>`
      : `🙏 "미사가 끝났습니다. 가서 복음을 전합시다."${info.newcomers ? ` · 새 신자 ${info.newcomers}명` : ''}`;
    if (t >= T.end) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// 강론 판정 확률 미리 보기 (강론 준비·강론력·영성에 따라)
function homilyOddsHtml() {
  const p = Game.state.pastor, o = homilyOdds(sundayPrep()), pc = v => Math.round(v * 100);
  return `<span class="gain">😭 감동 ${pc(o.moved)}%</span> · 🙂 무난 ${pc(o.ok)}% · <span class="loss">😴 지루 ${pc(o.boring)}%</span>${p.prep ? '' : ' · 강론 준비를 하면 감동 확률이 올라가요'}`;
}

function dailyMassOption() {
  if (!canDailyMass()) return [];
  return [{ label: '⛪ 매일 미사 봉헌', sub: '하루 한 번 · 영성과 행동력 보너스', onClick: () => toast(doDailyMass()) }];
}

function onInteract(t) {
  if (UI.modalOpen || !t) return;
  // 돌릴 수 있는 건물이면 처음 뜨는 메뉴 창에 ↻ 돌리기 단추를 붙인다
  UI.rotFor = null; // v0.77: 돌리기는 건물을 꾹 누르면 옆에 뜨는 ↻로
  UI.headFor = t.building && World.overview ? t.building : null; // 처음 뜨는 창 위에 건물 그림
  if (t.menu && MENUS[t.menu]) MENUS[t.menu](t);
  else if (t.lines) chatModal(t);
  UI.rotFor = null; UI.headFor = null;
}

// ---------- HUD ----------

function hudHtml() {
  const s = Game.state;
  if (s.phase === 'pastor' && World.overview) return pastorHudHtml();
  const season = SEASONS[currentSeason()];
  let info = '';
  if (s.phase === 'seminary') info = questHtml();
  else if (s.phase === 'pastor') info = pastorHudHtml();
  else {
    const c = s.curate;
    const ev = c.event ? '<div class="q-item">❗ 성당 앞에 누군가 찾아왔어요</div>' : '';
    const dump = c.pastorType === 'dumper' && c.dumpedTasks > 0 ? `<div class="q-item">📂 떠맡은 사무 ${c.dumpedTasks}건 (본당 사무실)</div>` : '';
    const need = youthNextNeed();
    const goal = c.ready
      ? '<div class="q-item hl">❗ 주임 신부님께 가 보세요</div>'
      : `<div class="q-item">🎸 청년회 Lv${c.youthLv} → Lv${c.youthLv + 1}: 활성도 ${Math.floor(s.parish.groups.youth)}/${need} <span class="muted">· 교육관</span></div>`;
    info = `<div class="quest"><div class="q-title">${s.parish.name} · 목표: 청년회 Lv3 (남은 임기 ${CURATE_TERM - c.month}개월)</div>${goal}${ev}${dump}<div class="q-item muted">⛪ 한 달을 마치려면 성당에서 주일미사</div></div>`;
  }
  return `
    <div class="hud-top">
      <div class="hud-card">
        <div class="hud-row">
          <div><b>${esc(s.baptism)} ${esc(s.name)}</b> <span class="muted">${term(titleLabel())} · ${s.age}세</span></div>
          <span class="season" style="background:${season.color}" title="${season.note}">${season.name}</span>
        </div>
        <div class="muted small">${dateLabel()}</div>
        ${energyHtml()}
      </div>
      <div class="hud-btns">
        <button class="icon-btn" data-act="notebook" aria-label="수첩">📋</button>
        <button class="icon-btn" data-act="settings" aria-label="설정">⚙️</button>
      </div>
    </div>
    ${info}`;
}

function resStripHtml() {
  const r = Game.state.pastor.res;
  // 멀리서 보기: 위쪽은 한 줄 (성당 레벨 · 신자 · 봉헌 · 마음 · 행동력 · 수첩 · 설정)
  if (World.overview) {
    const p = Game.state.pastor, season = SEASONS[currentSeason()];
    return `<div class="topbar" id="res">
      <button class="chip lv" data-bar="status" title="${esc(p.name)} · ${pastorDateLabel()} · ${season.name}">⛪ Lv${p.fixed.church}</button>
      <span class="chip" title="신자 / 좌석">👥 ${Math.floor(r.members)}<small>/${churchSeats()}</small></span>
      <span class="chip ${r.offering >= vaultCap() ? 'warn' : ''}" title="봉헌금 / 금고 한도 (만 원)">💰 ${Math.floor(r.offering)}<small>/${vaultCap()}</small></span>
      <span class="chip ${r.heart < 30 ? 'warn' : ''}" title="신자들의 마음">❤️ ${Math.floor(r.heart)}</span>
      ${energyHtml()}
      <button class="chip worker" data-bar="cate" title="예비신자 / 교리반 자리">📘 ${Math.floor(cateState().n)}</button>
      <button class="chip worker ${idleWorkers() ? 'idle' : ''}" data-bar="workers" title="일꾼 (쉬는 사람 / 전체)">👷 ${idleWorkers()}<small>/${p.teams}</small></button>
      <button class="chip gem" data-bar="gems" title="다이아 (공사 바로 완성)">💎 ${gems()}</button>
      <span class="tb-btns"><button class="icon-btn" data-act="notebook" aria-label="수첩">📋</button><button class="icon-btn" data-act="settings" aria-label="설정">⚙️</button></span>
    </div>`;
  }
  return `<div class="res-strip" id="res">
    <span title="신자 / 좌석">👥 ${Math.floor(r.members)}<small>/${churchSeats()}</small></span>
    <span title="봉헌금 / 금고 한도 (만 원)" class="${r.offering >= vaultCap() ? 'warn' : ''}">💰 ${Math.floor(r.offering)}<small>/${vaultCap()}</small></span>
    <span title="신자들의 마음" class="${r.heart < 30 ? 'warn' : ''}">❤️ ${Math.floor(r.heart)}</span>
    <span title="평판">🌏 ${Math.floor(r.reputation)}</span>
    ${insideParish() ? `<span title="교리실 층 · 빈 방">🏢 ${containers().length}층<small> 빈 방 ${roomsFree()}</small></span>` : `<span title="컨테이너 교리실 · 빈 방">📦 ${containerCount()}<small> 빈 방 ${roomsFree()}</small></span>`}
  </div>`;
}

// 진행 중인 공사들
// ---------- 퀘스트를 누르면 그곳까지 걸어가서 열기 ----------
// spec: 'b:건물id' | 'room:교리실id:방' | 'npc:사람id' | 'plot'
const go = spec => ` data-goto="${spec}"`;

function questGoto(spec) {
  if (UI.modalOpen || !World.player) return;
  if (World.overview) { overviewGoto(spec); return; }
  const [kind, id, room] = spec.split(':');
  const p = World.player;
  let goal, r = 0.35, act;
  if (kind === 'b' || kind === 'room') {
    const b = World.buildings.find(x => x.id === id);
    if (!b) return;
    goal = b.doorPt;
    act = kind === 'room' ? () => openRoomMenu(id, +room) : () => onInteract({ building: b, label: buildingLabel(b), menu: b.menu });
  } else if (kind === 'npc') {
    const n = World.npcs.find(x => x.id === id);
    if (!n) return;
    goal = () => [n.x, n.y]; r = 0.9;
    act = () => { const t = { npc: n, label: n.name, menu: n.menu, lines: n.lines }; faceEachOther(t); onInteract(t); };
  } else if (kind === 'plot') {
    const pl = World.plots.filter(x => !x.gongsoOnly).sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y))[0];
    if (!pl) { toast('지을 수 있는 빈 땅이 없어요'); return; }
    goal = [pl.cx, pl.cy]; r = 0.6;
    act = () => onInteract({ plot: pl, label: '빈 땅', menu: 'plot' });
  }
  if (!worldWalkTo(goal, r, act)) toast('그곳까지 가는 길을 찾지 못했어요');
}

// 멀리서 보기: 걸어가지 않고 그곳을 화면 가운데로 옮겨 바로 연다
function overviewGoto(spec) {
  const [kind, id, room] = spec.split(':');
  if (kind === 'npc' && id === 'council') { openCouncilMenu(); return; }
  if (kind === 'groups') { openGroupsMenu(); return; }
  if (kind === 'b' || kind === 'room') {
    const b = World.buildings.find(x => x.id === id);
    if (!b) return;
    centerOn(b.x + b.w / 2, b.y + b.d / 2);
    if (kind === 'room') openRoomMenu(id, +room); else onInteract({ building: b, label: b.label, menu: b.menu });
  } else if (kind === 'npc') {
    const n = World.npcs.find(x => x.id === id);
    if (!n) return;
    centerOn(n.x, n.y);
    onInteract({ npc: n, label: n.name, menu: n.menu, lines: n.lines });
  } else if (kind === 'plot') openFreePlot();
}

// 짓기: 무엇을 지을지 고르고 → 반투명 건물을 놓을 자리에 옮긴다
function openFreePlot() { openBuildCatalog(); }

function openBuildCatalog() {
  const p = Game.state.pastor, need = containerNeed(), n = containerCount() + 1;
  const cBlock = !need ? '더 놓을 수 없어요' : blockText('container', 'new', null, 1);
  const gBlock = p.fixed.church < 5 ? '성당 Lv5부터 세울 수 있어요' : !Object.keys(VILLAGES).some(villageOpen) ? '마을을 먼저 열어야 해요' : blockText('gongso', 'new', null, 1);
  modal({
    title: '🔨 짓기',
    html: `<p class="muted">봉헌금 ${Math.floor(p.res.offering)}만 원 · 빈 방 ${roomsFree()}개 · 👷 일꾼 ${idleWorkers()}/${p.teams}명 쉬는 중</p>`,
    options: [
      {
        tile: true, tileSub: cBlock ? `🔒 ${cBlock}` : `💰${need ? jobCost('container', 'new', null, 1).offering : ''}`,
        label: insideParish() ? `🏗️ ${containers().length + 1}층 증축` : `📦 교리실 ${containers().length + 1}`,
        sub: cBlock || (insideParish() ? `성당 건물에 한 층을 올려 교리실 방 ${FLOOR_ROOMS}개를 더 들여요` : `방 ${CONTAINER_ROOMS}개 · 단체 ${CONTAINER_ROOMS}개가 모일 수 있어요`) + (need && need.members ? ` · 신자 ${need.members}명 이상` : ''),
        disabled: !!cBlock, onClick: () => (insideParish() ? setTimeout(openAddFloor, 0) : startPlacing('container')),
      },
      {
        tile: true, tileSub: `💰${PATH_COST} / 칸`,
        label: '🛤️ 길',
        sub: '땅을 눌러 길을 놓고, 놓은 길을 누르면 걷어요',
        onClick: () => startPathMode(),
      },
      ...(insideParish() ? [] : [{
        tile: true, tileSub: (() => { const n = LOTS.filter(l => !lotsOwned()[l.id]).length; return n ? `살 수 있는 땅 ${n}곳` : '모두 샀어요'; })(), label: '🏞️ 땅 넓히기',
        sub: '본당 땅을 사서 넓혀요. 산 땅에만 교리실·조경·길을 놓을 수 있어요',
        onClick: () => setTimeout(openLotList, 0),
      }, {
        tile: true, tileSub: (() => { const b = fenceBlocker(), to = (p.fence || 0) + 1; return FENCE_LEVELS[to] ? (b && !b.startsWith('봉헌금') ? `🔒 ${b}` : `💰${fenceCost(to)}`) : '가장 좋은 담장'; })(),
        label: `${p.fence ? FENCE_LEVELS[p.fence].icon : '🪵'} 담장${p.fence ? ` Lv${p.fence}` : ''}`,
        sub: '산 땅 둘레에 담장을 세워요. 레벨이 오를수록 좋은 담장이 되고 마음·평판이 올라요',
        onClick: () => setTimeout(openFenceMenu, 0),
      }]),
      {
        tile: true, tileSub: '화단·성모상·주차장 등', label: '🌷 조경',
        sub: '성당 마당을 꾸며요. 교우들의 마음과 평판이 올라요',
        onClick: () => setTimeout(openDecorMenu, 0),
      },
      {
        tile: true, tileSub: gBlock ? `🔒 ${gBlock}` : `💰${jobCost('gongso', 'new', null, 1).offering}`,
        label: `✝️ 공소`,
        sub: gBlock || '열린 마을 안에 세워요 · 마을 교우들의 기도 공동체',
        disabled: !!gBlock, onClick: () => startPlacing('gongso'),
      },
    ],
  });
}

const PLACE_NAME = { container: '컨테이너 교리실', gongso: '공소' };

// ---------- 본당 부지·담장 (v0.70) ----------
function openLotMenu(id) {
  const l = LOTS.find(x => x.id === id), block = lotBlocker(id), own = lotsOwned()[id];
  modal({
    title: `🏞️ ${l.name}`,
    html: `${own ? '' : `<p class="small"><b>${block && block.startsWith('성당') ? `🔒 아직 살 수 없는 땅이에요 · ${block}` : block ? `🏞️ 살 수 있는 땅이에요 · ${block}` : `✅ 지금 살 수 있는 땅이에요 · 💰${lotCost(l)}`}</b></p>`}<p class="small">${l.desc}</p><p class="muted">${l.w}×${l.h}칸 · ${own ? '본당 땅이에요' : `사면 이 땅에 교리실·조경·길을 놓고, 잡초·돌·나무를 치울 수 있어요${lotsOwned().home && Game.state.pastor.fence ? ' · 담장도 새 땅 둘레로 넓혀 둘러요' : ''}`}</p>`,
    options: own ? [] : [{ label: `🏞️ 땅 사기 · 💰${lotCost(l)}`, sub: block || '바로 본당 땅이 돼요', disabled: !!block,
      onClick: () => { const m = buyLot(id); if (m) { toast(m); save(); syncWorldLayout(); } } }],
    buttons: [{ label: '닫기', cls: 'ghost' }],
  });
}
function openLotList() {
  modal({
    title: '🏞️ 땅 넓히기',
    html: '<p class="small">처음엔 성당 둘레 땅만 본당 땅이에요. 땅을 사서 넓히면 그 땅에 교리실을 짓고 마당을 꾸밀 수 있어요. 지도에서 어두운 땅을 눌러도 돼요.</p>',
    options: LOTS.filter(l => l.cost).map(l => { const own = lotsOwned()[l.id], block = own ? null : lotBlocker(l.id); return {
      tile: true, label: `🏞️ ${l.name}`, tileSub: own ? '✅ 산 땅' : block && block.startsWith('성당') ? `🔒 ${block}` : `💰${lotCost(l)}`,
      sub: `${l.desc} · ${l.w}×${l.h}칸`, disabled: own || !!block, onClick: () => { const m = buyLot(l.id); if (m) toast(m); } }; }),
  });
}
function openFenceMenu() {
  const p = Game.state.pastor, cur = FENCE_LEVELS[p.fence || 0], to = (p.fence || 0) + 1, next = FENCE_LEVELS[to], block = fenceBlocker();
  modal({
    title: `${cur ? cur.icon : '🪵'} 담장${cur ? ` · ${cur.name}` : ''}`,
    html: `<p class="small">산 본당 땅 둘레(${fenceEdges().length}칸)에 담장을 세워요. 땅을 더 사면 담장도 새 둘레로 옮겨 세워요. 길이 지나는 곳은 문처럼 비워 둬요.</p>
      <p class="muted">${FENCE_LEVELS.slice(1).map((f, i) => `${i + 1 === (p.fence || 0) ? '<b>' : ''}Lv${i + 1} ${f.icon} ${f.name} (성당 Lv${f.church})${i + 1 === (p.fence || 0) ? '</b>' : ''}`).join(' → ')}</p>`,
    options: next ? [{ label: `${next.icon} ${p.fence ? '바꾸기' : '세우기'}: ${next.name} · 💰${fenceCost(to)}`, sub: block || `${next.desc} · ❤️ 목표 +${next.heart}${next.rep ? ` · 🌏 목표 +${next.rep}` : ''}`, disabled: !!block,
      onClick: () => { const m = buildFence(); if (m) { toast(m); save(); syncWorldLayout(); } } }] : [],
    buttons: [{ label: '닫기', cls: 'ghost' }],
  });
}

// 조경 고르기
function openDecorMenu() {
  const p = Game.state.pastor;
  modal({
    title: '🌷 조경',
    html: `<p class="small">마당을 꾸미면 교우들의 마음과 평판이 올라요. 같은 것을 또 만들면 효과는 절반이에요.</p>${p.decorWish ? `<p class="small">💌 교우들이 바라는 것: <b>${DECOR[p.decorWish].icon} ${DECOR[p.decorWish].name}</b> (만들면 더 기뻐해요)</p>` : ''}`,
    options: Object.entries(DECOR).map(([k, d]) => { const block = decorBlocker(k); return {
      tile: true, label: `${d.icon} ${d.name}`, tileSub: block ? `🔒 ${block}` : `💰${decorCost(k)}${p.decorWish === k ? ' · 💌' : ''}`,
      sub: `${d.desc} · ❤️ 목표 +${d.heart}${d.rep ? ` · 🌏 목표 +${d.rep}` : ''} · ${d.w}×${d.d}칸`, disabled: !!block,
      onClick: () => setTimeout(() => startPlacing(k), 0) }; }),
  });
}

function openDecorInfo(b) {
  const p = Game.state.pastor, dc = p.decor && p.decor[b.id], def = dc && DECOR[dc.kind];
  if (!def) return;
  modal({
    title: `${def.icon} ${def.name}`,
    html: `<p class="small">${def.desc}</p><p class="muted">❤️ 마음 목표 +${def.heart}${def.rep ? ` · 🌏 평판 목표 +${def.rep}` : ''}${def.lent ? ' · 사순 시기 주일 마음 +3' : ''}${def.may ? ' · 5월 성모 성월 주일 마음 +3' : ''}</p>`,
    options: [{ label: '🧹 걷어 내기', sub: '자리를 비워요. 들인 돈은 돌아오지 않아요', onClick: () => { removeDecor(b.id); save(); syncWorldLayout(); toast(`${def.icon} ${josa(def.name, '을', '를')} 걷어 냈어요`); } }],
  });
}

// 길 놓기 모드
function startPathMode() { World.pathMode = true; World.placing = null; render(); toast('🛤️ 땅을 누르면 길이 놓이고, 놓은 길을 다시 누르면 걷어요'); }
function endPathMode() { World.pathMode = false; save(); render(); }
function onPathTap(x, y) {
  const r = togglePath(x, y);
  if (!r.ok) toast(`🛤️ ${r.reason}`);
  else { // v1.08: 놓았는지 걷었는지, 길 퀘스트가 얼마나 찼는지 바로 알려 준다
    const n = Object.keys(Game.state.pastor.paths || {}).length, q = ['path5', 'path15', 'path30'].map(questDef).find(d => d && questState().active.includes(d.id));
    toast(r.removed ? `🛤️ 길을 걷었어요 · 놓은 길 ${n}칸` : `🛤️ 길을 놓았어요 · ${q ? `${q.name} ${Math.min(n, questProgress(q).want)}/${questProgress(q).want}` : `놓은 길 ${n}칸`}`);
    refreshPastorHud();
  }
  const n = document.getElementById('path-info');
  if (n) n.outerHTML = pathInfoHtml();
}
// 꾹 눌러 든 길 칸을 다른 칸으로 옮긴다 (돈은 들지 않는다)
function onPathMove([fx, fy], [tx, ty]) {
  if (fx === tx && fy === ty) return;
  const m = movePath(fx, fy, tx, ty);
  toast(`🛤️ ${m}`); save();
}
function pathInfoHtml() {
  const n = Object.keys(Game.state.pastor.paths || {}).length;
  return `<div class="place-info" id="path-info"><b>🛤️ 길 놓기</b> <span class="muted">한 칸 💰${PATH_COST} · 놓은 길 ${n}칸</span><br><span class="ok">땅을 누르면 길, 길을 누르면 걷기</span></div>`;
}

function startPlacing(kind) {
  if (kind === 'container' && interiorParish()) {
    const n = containers().length + 1, key = placeSiteInside('container');
    toast(key ? `🏗️ 성당 건물 ${n}층 증축을 시작했어요` : (blockText('container', 'new', null, 1) || '지을 수 없어요'));
    if (key) World.floor = n;
    if (key) { save(); render(); }
    return;
  }
  const map = MAPS.solmoe;
  const [ctx, cty] = tileAt(window.innerWidth / 2, window.innerHeight / 2);
  const near = kind === 'gongso' ? (() => { const r = map.regions.find(q => villageOpen(q.id)); return r ? [r.x + r.w / 2, r.y + r.h / 2] : [ctx, cty]; })() : [ctx, cty];
  const spot = map.findSpot(kind, near[0], near[1]);
  if (!spot) { toast('지을 빈터가 없어요. 잡초·돌·나무를 치우거나 마을 집 땅을 사서 넓혀 보세요'); return; }
  World.placing = { kind, x: spot.x, y: spot.y, rot: 0, ok: true, reason: '' };
  centerOn(spot.x + 1, spot.y + 1);
  render();
}

// 지은 건물 옮기기 (v0.90): 꾹 누르면 그 건물을 들어 올려 자리·방향을 고르고, ✔를 누르면 옮긴다 (무료)
function moveTarget(id) {
  const p = Game.state.pastor;
  if (!p || interiorParish()) return null;
  if (MAPS.solmoe.fixed.some(f => f.id === id)) return { kind: id, ignore: id };
  const st = (p.sites[id] && p.sites[id].x !== undefined && p.sites[id]) || (p.decor && p.decor[id]);
  return st ? { kind: st.kind, ignore: st } : null;
}
function startMoving(id) {
  const t = moveTarget(id), b = World.buildings.find(q => q.id === id);
  if (!t || !b) return false;
  World.rotSel = null; World.tagFor = null;
  World.placing = { move: id, kind: t.kind, x: b.x, y: b.y, rot: b.rot || 0, ok: true, reason: '' };
  render();
  return true;
}
function movePlacing(x, y) {
  const pl = World.placing;
  if (!pl) return;
  const r = MAPS.solmoe.canPlace(pl.kind, x, y, pl.rot || 0, pl.move ? moveTarget(pl.move).ignore : null);
  Object.assign(pl, { x, y, ok: r.ok, reason: r.reason || '' });
  const bar = document.getElementById('place-info');
  if (bar) bar.outerHTML = placeInfoHtml();
  const ok = document.querySelector('[data-bar="placeOk"]');
  if (ok) { ok.disabled = !pl.ok; ok.classList.toggle('pulse', pl.ok && !!tutorialStep() && tutorialStep().id === 'welcome'); }
}

function placeInfoHtml() {
  const pl = World.placing;
  const rotBtn = '<button class="rot-btn" data-rot="1" title="방향 돌리기 (R)">↻ 돌리기</button>';
  if (pl.move) { const b = World.buildings.find(q => q.id === pl.move); return `<div class="place-info" id="place-info">${rotBtn}<b>🚚 ${b ? buildingShortName(b) : ''} 옮기기</b> <span class="muted">끌어서 자리 · 무료</span><br><span class="${pl.ok ? 'ok' : 'no'}">${pl.ok ? '✔ 여기로 옮길 수 있어요' : `✖ ${pl.reason}`}</span></div>`; }
  if (DECOR[pl.kind]) return `<div class="place-info" id="place-info">${rotBtn}<b>${DECOR[pl.kind].icon} ${DECOR[pl.kind].name}</b> <span class="muted">💰${decorCost(pl.kind)} · 바로</span><br><span class="${pl.ok ? 'ok' : 'no'}">${pl.ok ? '여기에 놓을 수 있어요' : pl.reason}</span></div>`;
  const c = jobCost(pl.kind, 'new', null, 1);
  return `<div class="place-info" id="place-info">${rotBtn}<b>${PLACE_NAME[pl.kind]}</b> <span class="muted">💰${c.offering} · ⏱️${fmtDur(jobMinutes(c) * 60 / paceScale())}</span><br><span class="${pl.ok ? 'ok' : 'no'}">${pl.ok ? '✔ 여기에 지을 수 있어요' : `✖ ${pl.reason}`}</span></div>`;
}

// 놓는 중 방향 돌리기: 단추나 R 키
function rotatePlacing() {
  const pl = World.placing;
  if (!pl) return;
  pl.rot = ((pl.rot || 0) + 1) % 4;
  movePlacing(pl.x, pl.y);
}
document.addEventListener('click', e => { if (e.target.closest('#place-info [data-rot]')) { e.stopPropagation(); rotatePlacing(); } });
document.addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') && World.placing && !UI.modalOpen) rotatePlacing(); });

function finishPlacing(confirm) {
  const pl = World.placing;
  if (!pl) return;
  if (confirm) {
    if (!pl.ok) return;
    if (pl.move) {
      const p = Game.state.pastor, t = moveTarget(pl.move);
      if (t && typeof t.ignore === 'string') { (p.pos = p.pos || {})[pl.move] = { x: pl.x, y: pl.y }; (p.rot = p.rot || {})[pl.move] = pl.rot || 0; }
      else if (t) Object.assign(t.ignore, { x: pl.x, y: pl.y, rot: pl.rot || 0 });
      toast('🚚 건물을 옮겼어요'); save(); World.placing = null; syncWorldLayout(); render(); return;
    }
    if (DECOR[pl.kind]) {
      const m = placeDecor(pl.kind, pl.x, pl.y, pl.rot || 0);
      if (!m) { toast(decorBlocker(pl.kind) || '놓을 수 없어요'); return; }
      toast(m); save(); World.placing = null; syncWorldLayout(); render(); return;
    }
    const key = placeSite(pl.kind, pl.x, pl.y, pl.rot || 0);
    if (!key) { toast(blockText(pl.kind, 'new', null, 1) || '지을 수 없어요'); return; }
    // v1.08: 시작 알림과 다 지은 알림의 교리실 번호가 달랐다(2층 교리실을 두 채로 세던 것) → 실제 이름으로, 조사도 맞게
    toast(pl.kind === 'gongso' ? '🏗️ 공소를 세우기 시작했어요' : `📦 ${josa('컨테이너 ' + siteName(key), '을', '를')} 놓기 시작했어요`);
    save();
  }
  World.placing = null;
  syncWorldLayout();
  render();
}

// 지금 → 올린 뒤 비교 (표 / 한 줄)
function compareHtml(kind, key, type, toLevel) {
  const rows = upgradeCompare(kind, key, type, toLevel);
  if (!rows.length) return '';
  return `<table class="cmp"><tr><th></th><th>지금 Lv${toLevel - 1}</th><th></th><th>올린 뒤 Lv${toLevel}</th></tr>${rows.map(r => `<tr><td>${r.label}</td><td>${r.now}</td><td>→</td><td class="${r.good ? 'up' : 'down'}">${r.next}</td></tr>`).join('')}</table>`;
}
function compareLine(kind, key, type, toLevel) {
  return upgradeCompare(kind, key, type, toLevel).filter(r => !r.label.startsWith('살림')).map(r => `${r.label} ${r.now} → <b>${r.next}</b>`).join(' · ');
}

// 잡초·돌·나무·마을 집을 눌렀을 때
function openObstacleMenu(o) {
  const def = OBSTACLES[o.type], j = jobFor(o.id), block = clearBlocker(o.id);
  if (j) { modal({ title: `${def.icon} ${jobName(j)} 중`, html: `<p class="small">남은 시간 ${fmtDur(jobLeftSec(j))}</p>`, options: jobOptions(j) }); return; }
  const isHouse = o.type === 'house';
  const cost = def.energy ? `⚡${def.energy} · 바로` : costText(jobCost('clear', o.id, null, 1));
  const title = isHouse ? `🏡 ${o.owner} 댁 (${o.believer ? '교우' : '비신자'})` : `${def.icon} ${def.name}`;
  const text = isHouse
    ? `<p class="small">${o.believer ? '오래된 교우 가정이에요. 성당 일에 보탬이 된다면 집을 팔고 아랫마을로 옮길 수도 있대요.' : '성당 옆에 사는 비신자 가정이에요. 값을 잘 쳐주고 마을 평판이 좋으면 팔겠다고 해요.'}</p><p class="muted">땅을 사면 2×2 빈터가 생겨요 · ${o.believer ? '❤️ 마음' : '🌏 평판'} ${Object.values(o.need)[0]} 이상</p>`
    : `<p class="small">${o.type === 'weed' ? '잡초가 무성해요. 신부님이 직접 뽑으면 바로 치울 수 있어요.' : o.type === 'rock' ? '큰 돌이 박혀 있어요. 일꾼이 들어내야 해요.' : o.type === 'tree' ? '오래된 큰 나무예요. 일꾼이 오래 베어야 하지만, 목재를 제값에 팔 수 있어요.' : '어린나무가 자라 있어요. 일꾼이 베면 목재를 팔 수 있어요.'}</p><p class="muted">치우면 그 자리에 건물을 지을 수 있어요</p>`;
  modal({
    title, html: text,
    options: [{ tile: true, label: `${def.icon} ${isHouse ? '땅 사기' : def.name + ' ' + def.verb}`, tileSub: block ? `🔒 ${block}` : cost, sub: block, disabled: !!block,
      onClick: () => { const m = clearObstacle(o.id); if (m) { toast(m); save(); } } }],
  });
}

// 장애물 위에 뜨는 버튼 글: 할 수 있으면 비용, 공사 중이면 남은 시간, 막히면 이유
function obActionInfo(o) {
  const p = Game.state.pastor;
  if (!p || (p.cleared && p.cleared[o.id])) return null;
  const def = OBSTACLES[o.type], j = jobFor(o.id);
  if (j) return { ok: true, label: `⏳ ${fmtDur(jobLeftSec(j))} · 💎${rushCost(j)} 바로` };
  const block = clearBlocker(o.id);
  if (block) return { ok: false, label: `🔒 ${block.length > 18 ? block.slice(0, 18) + '…' : block}` };
  const c = def.energy ? `⚡${def.energy}` : `💰${jobCost('clear', o.id, null, 1).offering} · 👷`;
  return { ok: true, label: `${def.icon} ${def.verb} ${c}` };
}
function doObAction(id) {
  const o = obstacleById(id), j = jobFor(id);
  if (!o) return;
  // v1.08 사용자 "나무 벨 때 바로 완료를 다이아로 쓰려고 했더니 안 돼": 버튼에 '💎N 바로'라고 적혀 있으니 누르면 바로 끝낸다
  // (예전엔 창을 한 번 더 띄웠고, 폰에서는 그 창이 뜨자마자 같은 누름이 '닫기'를 눌러 버렸다)
  if (j) {
    World.obSel = null;
    if (gems() < rushCost(j)) { toast(`💎 다이아가 모자라요 (필요 ${rushCost(j)} · 가진 ${gems()})`); setTimeout(openGemShop, 0); return; }
    const m = rushJob(j);
    if (m) { toast(`💎 ${m}`); save(); syncWorldLayout && syncWorldLayout(); refreshPastorHud(); }
    return;
  }
  const block = clearBlocker(id);
  if (block) { toast(block); return; }
  const m = clearObstacle(id);
  World.obSel = null;
  if (!m) return;
  // 바로 끝난 일(잡초)은 지도 위로 결과가 떠오른다. 일꾼이 하는 일은 짧게 알린다
  if (!jobFor(id)) { save(); syncWorldLayout && syncWorldLayout(); refreshPastorHud(); }
  else { toast(m); save(); }
}

// 건물 위 ⬆를 눌렀을 때: 바로 올릴지 묻는다
function openUpgradeConfirm(id) {
  const u = upgradeFor(id);
  if (!u) { const m = upgradeMissingText(id); Sound.sfx('error'); toast(`🔒 ${m || '지금은 올릴 수 없어요'}`); return; }
  if (u.waiting) {
    const p = Game.state.pastor;
    modal({
      title: `👷 ${u.name}: 일꾼이 모자라요`,
      html: `${compareHtml(u.kind, u.key, u.type, u.toLevel)}<p class="small">이 공사에는 일꾼 <b>${u.workers}명</b>이 필요해요. 지금 쉬는 일꾼은 ${idleWorkers()}명이에요 (전체 ${p.teams}명).</p><p class="muted">하던 공사를 끝내거나(바로 완성), 일꾼을 더 부르세요.</p>`,
      options: [...p.jobs.map(j => ({ label: `💎 ${jobName(j)} 바로 완성 <span class="cost">💎${rushCost(j)}</span>`, sub: `${fmtDur(jobLeftSec(j))} 남음 · 일꾼 ${j.workers || 1}명이 풀려나요${gems() < rushCost(j) ? ' · 다이아가 모자라요 (눌러서 상점)' : ''}`, onClick: () => { if (gems() < rushCost(j)) { setTimeout(openGemShop, 0); return; } const m = rushJob(j); if (m) toast(`💎 ${m}`); } })), teamOption()],
      buttons: [{ label: '닫기', cls: 'ghost' }],
    });
    return;
  }
  const c = jobCost(u.kind, u.key, u.type, u.toLevel);
  const up = u.kind === 'fixed' && u.key === 'church' ? upkeepDelta('church', u.toLevel) : u.kind === 'fixed' ? upkeepDelta('fixed', u.toLevel) : upkeepDelta(u.kind, u.toLevel);
  modal({
    title: `⬆️ ${u.name}${(b => josa(b, '으로', '로').slice(b.length))(u.name.replace(/["”]$/, ''))} 올릴까요?`,
    html: `${compareHtml(u.kind, u.key, u.type, u.toLevel)}<p class="muted">${costText(c, up)} · 👷 일꾼 ${u.workers}명 · 봉헌금 ${Math.floor(Game.state.pastor.res.offering)}만 원</p>`,
    options: [{ tile: true, label: '⬆️ 올리기', tileSub: `💰${c.offering}`, onClick: () => { if (startJob(u.kind, u.key, u.type, u.toLevel)) { toast(`🏗️ ${u.name} 공사를 시작했어요`); save(); syncWorldLayout(); } } }],
    buttons: [{ label: '아니요', cls: 'ghost' }],
  });
}

// 멀리서 보기에서 화면을 눌렀을 때
// 성전 안의 방을 눌렀을 때
// 성전 안 본당: 성당 건물에 한 층 올리기
function openAddFloor() {
  const n = containers().length + 1, block = blockText('container', 'new', null, 1), cost = jobCost('container', 'new', null, 1);
  modal({
    title: `🏗️ ${n}층 증축`,
    html: `<p class="small">성당 건물 위에 한 층을 올려 <b>교리실 방 ${FLOOR_ROOMS}개</b>를 더 들여요. 한 층은 교리실 ${FLOOR_UNITS}동만큼 쳐서 성당 증축 조건에도 들어가요. ${FLOOR_MAX}층까지 올릴 수 있어요.</p>`,
    options: [{ label: `🏗️ ${n}층 올리기 ${cost ? `<span class="cost">${costText(cost, upkeepDelta('container', 1))}</span>` : ''}`, sub: block || '', disabled: !!block, onClick: () => startPlacing('container') }],
  });
}
function openInteriorRoom(r) {
  const fake = (id, label, menu) => ({ building: World.buildings.find(b => b.id === id) || { id, label, menu }, label, menu });
  if (r.kind === 'sanctuary') return onInteract(fake('church', '성전', 'church'));
  if (r.kind === 'office') return onInteract(fake('office', '본당 사무실', 'office'));
  if (r.kind === 'rectory') return onInteract(fake('rectory', '집무실·사제관', 'rectory'));
  if (r.kind === 'sacristy') return onInteract(fake('church', '성전', 'church'));
  if (r.kind === 'building' || r.kind === 'floorMenu') return openContainerMenu(r.key);
  if (r.kind === 'class') return r.g ? openRoomMenu(r.key, r.room) : openNewGroupMenu(r.key, r.room);
  if (r.kind === 'cafe') { const x = allGroups().find(q => q.g.type === 'cafe'); return x ? openRoomMenu(x.key, x.room) : toast('☕ 빈 교리실에 성당 카페 단체를 만들면 카페 문을 열어요'); }
  if (r.kind === 'floorTab') { World.floor = r.floor; render(); return; }
  if (r.kind === 'stairs') { if (World.floor > 1) World.floor--; else if (floorSites().length > 1) World.floor = 2; else return openAddFloor(); render(); return; }
  if (r.kind === 'library') return toast('📚 성경 도서실이에요. 교우들이 성경과 신앙 서적을 빌려 가요');
  if (r.kind === 'auditorium') return toast('🎤 강당이에요. 본당 행사와 교육이 여기서 열려요');
  if (r.kind === 'addFloor') return openAddFloor();
  if (r.kind === 'lobby') return toast('🚪 로비예요. 성모상 앞에서 교우들이 인사를 나눠요');
  if (r.kind === 'restroom') return toast('🚻 화장실이에요. 시설관리팀이 깨끗하게 관리해요');
}

function onWorldTap(hit) {
  if (UI.modalOpen || UI.talking) return;
  // 장애물 위 버튼을 누르면 바로 치운다. 다른 곳을 누르면 버튼은 사라진다
  if (hit && hit.rotBtn) { const m = rotateThing(hit.rotBtn); if (m) { toast(m); save(); } return; }
  World.rotSel = null; // 다른 곳을 누르면 ↻ 표시는 사라진다
  if (hit && hit.obAct) { doObAction(hit.obAct); return; }
  if (hit && hit.sisterTap) { World.obSel = null; openSisterScope(hit.sisterName); return; }
  if (hit && hit.interiorRoom) { openInteriorRoom(hit.interiorRoom); return; }
  if (!hit || !hit.obstacle || hit.obstacle.type === 'house') World.obSel = null;
  if (!hit) return;
  if (hit.lot) { const b = lotBlocker(hit.lot.id); toast(b && b.startsWith('성당') ? `🔒 ${hit.lot.name} · ${b}` : `🏞️ ${hit.lot.name} · 살 수 있는 땅이에요 (💰${lotCost(hit.lot)})`); openLotMenu(hit.lot.id); return; }
  if (hit.massGo) { goToMass(); return; }
  if (hit.meetGo) { openRoomMenu(hit.meetGo[0], hit.meetGo[1]); return; }
  if (hit.obstacle && hit.obstacle.type !== 'house') { World.obSel = World.obSel && World.obSel.id === hit.obstacle.id ? null : { id: hit.obstacle.id }; return; }
  if (hit.obstacle) openObstacleMenu(hit.obstacle);
  else if (hit.upgrade) openUpgradeConfirm(hit.upgrade);
  else if (hit.bubble) doCollect(hit.bubble);
  else if (hit.npc) onInteract({ npc: hit.npc, label: hit.npc.name, menu: hit.npc.menu, lines: hit.npc.lines });
  else if (hit.building) onInteract({ building: hit.building, label: hit.building.label, menu: hit.building.menu });
  else if (hit.plot) onInteract({ plot: hit.plot, label: hit.plot.gongsoOnly ? '빈 땅 (공소 자리)' : '빈 땅', menu: 'plot' });
  else if (hit.region && LOTS.some(l => l.id === hit.region)) openLotMenu(hit.region); // v1.08: 잠긴 마을도 땅처럼 사서 연다
  else if (hit.region && VILLAGES[hit.region]) openVillage(hit.region);
}

// 일꾼: 누가 무엇을 하고 있는지, 더 부르기
function openWorkerMenu() {
  const p = Game.state.pastor, idle = idleWorkers();
  modal({
    title: `👷 본당 일손 ${p.teams}명`,
    html: `<p class="small">봉사자 교우와 본당 직원(관리장·사무원·사무장)이 짓기·키우기·치우기를 맡아요. 한 사람이 한 번에 한 가지 일을 하고, 큰 공사는 여럿이 필요해요. 직원은 사무실에서 공고를 내 뽑고, 뽑은 뒤에는 인건비가 다달이 나가요.</p>
      <div class="perks"><div class="on">✅ ${VOLUNTEER.icon} ${VOLUNTEER.name} · 무료</div>${crew().map(c => `<div class="on">✅ ${CREW_ROLES[c.role].icon} ${CREW_ROLES[c.role].name} ${c.name} <b>Lv${crewLevel(c)}</b> · 🔨${r1(crewStat(c, 'skill'))} 📋${r1(crewStat(c, 'diligence'))} 🙏${r1(crewStat(c, 'faith'))} · ${c.wage}/시간</div>`).join('')}${curates().map(c => `<div class="on">✅ ✝️ ${c.name} 보좌 신부 · 생활비 ${CURATE.wage}/시간</div>`).join('')}${sisters().map(sis => `<div class="on">✅ 👩‍🦳 ${sis.name} 수녀님 · 생활비 ${SISTER.wage}/시간</div>`).join('')}</div>
      <p class="muted">${idle ? `쉬는 일꾼 ${idle}명 · 사무실 앞에서 기다리고 있어요` : '모든 일꾼이 일하고 있어요'}</p><p class="small">💸 본당 고정 지출(인건비·생활비) <b>${staffWages().toFixed(1)}/시간</b> · 한 달 약 <b>💰${Math.round(staffWages() * SUNDAY_HOURS * 4)}</b></p>`,
    options: [
      ...p.jobs.map(j => ({ label: `🔨 ${jobName(j)}${j.kind !== 'room' && j.kind !== 'clear' && j.toLevel > 1 ? ` Lv${j.toLevel}` : ''} <span class="cost">👷${j.workers || 1}</span>`, sub: `${fmtDur(jobLeftSec(j))} 남음 · 눌러서 거들기나 바로 완성`, onClick: () => setTimeout(() => modal({ title: `🔨 ${jobName(j)}`, html: `<p class="small">남은 시간 ${fmtDur(jobLeftSec(j))}</p>`, options: jobOptions(j) }), 0) })),
      ...(idle ? [{ label: '🔨 일 맡기기 (짓기)', sub: '새 건물을 짓거나 잡초·돌을 치워요', onClick: () => setTimeout(openBuildCatalog, 0) }] : []),
      ...crew().map(c => ({ label: `${CREW_ROLES[c.role].icon} ${CREW_ROLES[c.role].name} ${c.name} · Lv${crewLevel(c)}`, sub: `경험 ${Math.floor(c.xp || 0)}/${crewNeed(c)} · 🔨${r1(crewStat(c, 'skill'))} 📋${r1(crewStat(c, 'diligence'))} 🙏${r1(crewStat(c, 'faith'))} · ${c.wage}/시간 · 눌러서 ${c.role === 'clerk' ? '승진·' : ''}내보내기`, onClick: () => setTimeout(() => openCrewMember(c.name), 0) })),
      teamOption(),
      ...(hasManager() ? [{ label: `🚐 주일 셔틀버스 ${p.shuttle ? '운행 중' : '쉬는 중'} <span class="cost">기름값 💰${shuttleCost()}/주일</span>`, sub: p.shuttle ? `관리장님이 주일마다 어르신들을 모셔 와요 (참례율 +${Math.round(SHUTTLE.attend * 100)}%) · 눌러서 멈추기` : `관리장님이 주일마다 교우들을 데리러 가요 · 미사 참례율 +${Math.round(SHUTTLE.attend * 100)}% · 눌러서 운행하기`,
        onClick: () => { p.shuttle = !p.shuttle; toast(p.shuttle ? '🚐 주일 셔틀버스를 운행해요' : '🚐 셔틀버스를 멈췄어요'); } }] : []),
      ...curateOptions(),
      ...sisterOptions(),
    ],
  });
}

// 월별 보고서: 단체별·항목별로 어디에 돈이 많이 들었는지, 그리고 앞으로 줄일 지출 고르기
// 보고서의 단체 수입 (제대회 컵초 판매 등)
function incomeRowsHtml(rep) {
  const rows = Object.entries(rep.income || {}).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  const total = rows.reduce((a, [, v]) => a + v, 0);
  return `<p class="small" style="margin-top:8px"><b>단체 수입</b> 💰${Math.round(total)}</p><table class="town-rel">${rows.map(([k, v]) => { const [type, cat] = k.includes(':') ? k.split(':') : [null, k]; return `<tr><td>${type ? `${UNITS[type].icon} ${UNIT_SHORT[type] || UNITS[type].name} · ` : ''}${LEDGER_ICON[cat] || ''} ${LEDGER_NAME[cat] || cat}</td><td class="n gain">+💰${Math.round(v)}</td></tr>`; }).join('')}</table>`;
}

function openReportModal(idx = 0) {
  const p = Game.state.pastor, rep = (p.reports || [])[idx];
  if (!rep) { modal({ title: '📑 월별 보고서', html: '<p class="small">아직 보고서가 없어요. 네 주일마다 단체들이 보고서를 올려요.</p>' }); return; }
  rep.read = true;
  // 항목별 합계 (단체 지출 + 본당 지출)
  const cats = {};
  for (const g of rep.groups) for (const [k, v] of Object.entries(g.cats)) cats[k] = (cats[k] || 0) + v;
  for (const [k, v] of Object.entries(rep.parish)) cats[k] = (cats[k] || 0) + v;
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...catRows.map(x => x[1]));
  const top = catRows[0];
  const groupRows = rep.groups.slice(0, 8).map(g => `<tr><td>${UNITS[g.type].icon} ${UNITS[g.type].name}${groupCut(g.type) ? ' <span class="muted">✂️</span>' : ''}</td><td class="muted small">${Object.entries(g.cats).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${LEDGER_NAME[k]} ${Math.round(v)}`).join(' · ')}</td><td class="n">💰${Math.round(g.total)}</td></tr>`).join('');
  // 줄일 수 있는 것: 지출 기준을 한 단계 낮추기, 많이 쓴 단체 활동비 줄이기
  const cutOpts = [];
  for (const pol of POLICIES.filter(x => x.id !== 'extra')) {
    const i = pol.choices.findIndex(c => c[0] === policy(pol.id));
    if (i < pol.choices.length - 1 && (cats[pol.id] || 0) > 0) {
      const next = pol.choices[i + 1];
      cutOpts.push({ label: `${pol.icon} ${pol.name} 줄이기 <span class="cost">${pol.choices[i][1]} → ${next[1]}</span>`, sub: `지난달 💰${Math.round(cats[pol.id])} · 줄이면 행사가 작아지고 단체가 서운해해요`, onClick: () => { setPolicy(pol.id, next[0]); toast(`💼 ${pol.name}: 앞으로 ${next[1]}`); save(); setTimeout(() => openReportModal(idx), 0); } });
    }
  }
  if (policy('extra') !== 'refuse' && (cats.extra || 0) > 0) cutOpts.push({ label: '➕ 추가 지원 요청은 늘 거절', sub: `지난달 💰${Math.round(cats.extra)}`, onClick: () => { setPolicy('extra', 'refuse'); toast('💼 추가 지원 요청: 앞으로 늘 거절'); save(); setTimeout(() => openReportModal(idx), 0); } });
  for (const g of rep.groups.filter(x => (x.cats.upkeep || 0) > 0).slice(0, 3)) {
    const cut = groupCut(g.type);
    cutOpts.push({ label: `${cut ? '↩️' : '✂️'} ${UNITS[g.type].name} 활동비 ${cut ? '되돌리기' : '30% 줄이기'}`, sub: cut ? '활동비를 원래대로 드려요 (활력이 더 이상 줄지 않아요)' : `지난달 활동비 💰${Math.round(g.cats.upkeep)} · 대신 매일 활력 −3`, onClick: () => { setBudget(g.type, cut ? 'normal' : 'low'); toast(`${UNITS[g.type].icon} ${UNITS[g.type].name} 활동비 ${cut ? '원래대로' : '30% 줄임'}`); save(); setTimeout(() => openReportModal(idx), 0); } });
  }
  modal({
    title: `📑 ${rep.label} 보고서`,
    html: `<p class="small">이번 달 지출 합계 <b>💰${Math.round(rep.total)}</b>${top ? ` · 가장 많이 든 곳: <b>${LEDGER_NAME[top[0]]}</b>` : ''}</p>
      <table class="town-rel rep-cats">${catRows.map(([k, v], i) => `<tr class="${i === 0 ? 'lead' : ''}"><td>${LEDGER_ICON[k] || '•'} ${LEDGER_NAME[k]}</td><td class="bar"><span style="width:${Math.max(2, v / max * 100)}%"></span></td><td class="n">💰${Math.round(v)} <span class="muted">${Math.round(v / Math.max(1, rep.total) * 100)}%</span></td></tr>`).join('')}</table>
      ${groupRows ? `<p class="small" style="margin-top:8px"><b>단체별 지출</b></p><table class="town-rel">${groupRows}</table>` : ''}
      ${incomeRowsHtml(rep)}
      <p class="small" style="margin-top:8px"><b>앞으로 줄일 지출을 골라 주세요</b></p>`,
    options: [...cutOpts, { label: '💼 지출 기준 전체 보기', onClick: () => setTimeout(openPolicyModal, 0) }, ...(p.reports[idx + 1] ? [{ label: `📑 지난 보고서 (${p.reports[idx + 1].label})`, onClick: () => setTimeout(() => openReportModal(idx + 1), 0) }] : [])],
  });
}

// 본당 지출 기준: 항목마다 본당이 얼마나 낼지 정해 둔다
// 월별 사목 방향
function openDirectionModal() {
  const cur = direction();
  modal({
    title: '📅 이번 달 사목 방향',
    html: `<p class="small">한 달(네 주일) 동안 본당이 무엇에 힘을 쏟을지 정해요. 얻는 것이 있으면 잃는 것도 있어요. 중점 분야 단체는 지원 차이에 불평하지 않아요.</p>${cur ? `<p class="small">이번 달: <b>${cur.icon} ${cur.name}</b> · 다음 달에 다시 정할 수 있어요</p>` : '<p class="small">아직 이번 달 방향을 정하지 않았어요.</p>'}`,
    options: DIRECTIONS.map(d => ({ tile: true, label: `${d.icon} ${d.name}`, tileSub: cur && cur.id === d.id ? '✅ 이번 달' : `＋${d.good.split(' · ')[0]}<br>−${d.bad.split(' (')[0].split(' · ')[0]}`, sub: `<span class="gain">${d.good}</span><br><span class="loss">${d.bad}</span>`, disabled: !!cur,
      onClick: () => { setDirection(d.id); save(); toast(`📅 이번 달은 ${d.icon} ${d.name}`); } })),
  });
}

// 단체별 지원 수준
function budgetSummary() {
  const gs = allGroups().filter(x => x.g.level >= 1), n = k => gs.filter(x => groupBudget(x.g.type) === k).length;
  return `많이 ${n('high')} · 보통 ${n('normal')} · 적게 ${n('low')} · 단체 활동비 합계 ${parishUpkeep().groups.toFixed(1)}/시간${n('high') && (n('normal') + n('low')) ? ' · ⚠️ 지원 차이로 불만이 나올 수 있어요' : ''}`;
}
function openBudgetModal() {
  const gs = allGroups().filter(x => x.g.level >= 1);
  const rows = gs.map(({ g }) => { const u = UNITS[g.type], b = groupBudget(g.type); return `<div class="pol-row"><div class="pol-name">${u.icon} ${UNIT_SHORT[g.type] || u.name} <span class="muted">Lv${g.level}${inDirection(g.type) ? ' · 중점' : ''}</span></div><div class="pol-choices">${Object.entries(BUDGET).map(([k, x]) => `<button class="pol-btn ${b === k ? 'on' : ''}" data-bud="${g.type}:${k}">${x.name}</button>`).join('')}</div></div>`; }).join('');
  modal({
    title: '💼 단체별 지원',
    html: `<p class="small">단체마다 활동비를 얼마나 줄지 정해요. <b>많이</b>: 활동비 1.5배, 활력 매일 +3 · <b>적게</b>: 활동비 0.7배, 활력 매일 −3. 어디는 많이 주고 어디는 적게 주면 덜 받는 단체에서 불만이 나와요 (이번 달 중점 분야는 빼고).</p>
      ${rows || '<p class="muted">아직 단체가 없어요.</p>'}
      <p class="muted" id="bud-sum">${budgetSummary()}</p>`,
    buttons: [{ label: '닫기' }],
  });
}

function openPolicyModal() {
  const avg = Object.values(EVENT_PLANS).reduce((a, d) => a + planShare(d), 0) / Object.keys(EVENT_PLANS).length;
  const rows = POLICIES.map(pol => `<div class="pol-row"><div class="pol-name">${pol.icon} ${pol.name}</div><div class="pol-choices">${pol.choices.map(([v, label]) => `<button class="pol-btn ${policy(pol.id) === v ? 'on' : ''}" data-pol="${pol.id}:${v}">${label}</button>`).join('')}</div></div>`).join('');
  modal({
    title: '💼 본당 지출 기준',
    html: `<p class="small">단체가 행사를 하면 이 기준대로 지원금이 나가요. 본당이 많이 낼수록 행사가 풍성해지고 단체 활력이 오르지만 살림이 빠듯해져요. 단체에 맡기면 돈은 아끼지만 행사가 작아지고 서운해해요.</p>
      ${rows}
      <p class="muted">지금 기준이면 행사 비용의 평균 <b>${Math.round(avg * 100)}%</b>를 본당이 내요${Game.state.pastor.weekSpent ? ` · 이번 주 행사 지원 💰${Game.state.pastor.weekSpent}` : ''}</p>`,
    buttons: [{ label: '닫기' }],
  });
}

// 단체 행사 지원 요청: 첫 요청(전액·절반·거절), 추가 요청(승낙·거절)
function planRewardText(pl, scale, vital) {
  const def = planDef(pl), parts = Object.entries(def.res).map(([k, v]) => `${RES_ICON[k]}+${r1(v * scale)}`);
  if (def.cate) parts.push(`📘+${Math.round(def.cate * scale)}`);
  if (vital) parts.push(`활력 ${fmt(vital)}`);
  return parts.join(' · ');
}

function openPlanModal(i = 0) {
  const p = Game.state.pastor, pl = p.plans[i];
  if (!pl) return;
  const def = planDef(pl), u = UNITS[pl.type], base = planBase(pl);
  const head = `<div class="room-head"><div class="rh-icon">${def.icon}</div><div class="rh-body">
      <div class="rh-name">${def.name}</div>
      <div class="small">${u.icon} ${u.name}${pl.age ? ` · ${pl.age}일째 기다리는 중` : ''}${isOuting(def) ? ` · 🚌 외부 활동 · 동원력 ${Math.round(mobilization() * 100)}% (${mobilizationLabel()}) → 효과 ×${outingScale().toFixed(2)}` : ''}</div>
      <div class="rh-status ${pl.stage === 'extra' ? 'open' : 'wait'}">${pl.stage === 'extra' ? `💸 추가 지원 요청 💰${pl.extra}` : `💸 지원 요청 💰${base}`}</div>
    </div></div>`;
  const next = () => { if (p.plans.length) setTimeout(() => openPlanModal(0), 0); };
  if (pl.stage === 'extra') {
    modal({
      face: faceForUnit(pl.type), who: `${u.icon} ${u.name}`,
      html: `${head}<p class="serif">"신부님, 준비하다 보니 생각보다 돈이 더 들었어요. 💰${pl.extra}만 조금 더 도와주실 수 있을까요?"</p><p class="muted">이미 💰${pl.paid}를 드렸어요 · 봉헌금 ${Math.floor(p.res.offering)}만 원</p>`,
      options: [
        { label: `🤝 승낙하기 <span class="cost">💰${pl.extra}</span>`, sub: planBlocker(pl.extra) || `<span class="gain">얻음 ${planRewardText(pl, 1.5, def.vital + 5)}</span> · 기대보다 훨씬 풍성한 행사`, disabled: !!planBlocker(pl.extra), onClick: () => { const m = answerExtra(i, true); if (m) { toast(`💸 ${m}`); next(); } } },
        { label: '✋ 거절하기', sub: `🎲 <b>60%</b> 회원들이 바자회로 메움: <span class="gain">${planRewardText(pl, 1, 0)}</span> · <span class="loss">활력 −5</span><br>🎲 <b>40%</b> 행사를 줄임: <span class="gain">${planRewardText(pl, 0.5, 0)}</span> · <span class="loss">활력 −10</span>`, onClick: () => { const m = answerExtra(i, false); if (m) { toast(`💸 ${m}`); next(); } } },
      ],
      buttons: [{ label: '나중에', cls: 'ghost' }],
    });
    return;
  }
  const half = Math.round(base / 2);
  modal({
    face: faceForUnit(pl.type), who: `${u.icon} ${u.name}`,
    html: `${head}<p class="serif">"신부님, ${u.name}에서 ${def.name}을 하려고 해요. 지원금 💰${base}을 부탁드려요."</p><p class="muted">봉헌금 ${Math.floor(p.res.offering)}만 원 · 사흘 동안 답이 없으면 행사가 취소돼요${p.plans.length > 1 ? ` · 남은 요청 ${p.plans.length}건` : ''}</p>`,
    options: [
      { label: `💰 전액 지원 <span class="cost">💰${base}</span>`, sub: planBlocker(base) || `<span class="gain">얻음 ${planRewardText(pl, 1, def.vital)}</span><br>⚠️ 준비하다 돈이 더 필요하다고 다시 청할 수도 있어요 (${Math.round(PLAN.extraChance * 100)}%)`, disabled: !!planBlocker(base), onClick: () => { const m = answerPlan(i, 'full'); if (m) { toast(`💸 ${m}`); next(); } } },
      { label: `💵 절반만 지원 <span class="cost">💰${half}</span>`, sub: planBlocker(half) || `<span class="gain">얻음 ${planRewardText(pl, 0.5, 2)}</span> · 조촐하게 치러요`, disabled: !!planBlocker(half), onClick: () => { const m = answerPlan(i, 'half'); if (m) { toast(`💸 ${m}`); next(); } } },
      { label: '✋ 거절하기', sub: `<span class="loss">잃음 ${u.name} 활력 −10 · ❤️−1</span>`, onClick: () => { const m = answerPlan(i, 'no'); if (m) { toast(`💸 ${m}`); next(); } } },
    ],
    buttons: [{ label: '나중에', cls: 'ghost' }],
  });
}

// 예비자 교리: 예비신자, 교리반 자리, 교리 준비, 다음 세례식, 홍보
function openCateMenu() {
  const c = cateState(), cap = cateCapacity(), prep = ACTIONS.find(a => a.id === 'pCate'), cost = actionCost(prep);
  const p = Game.state.pastor, promo = p.promo && gameTime() < p.promo.until ? p.promo : null;
  modal({
    title: '📘 예비자 교리',
    html: `<div class="room-head"><div class="rh-icon">🕊️</div><div class="rh-body">
        <div class="rh-name">예비신자 ${Math.floor(c.n)}명 <span class="rh-lv">자리 ${cap}</span></div>
        <div class="rh-vital"><span>교리 준비</span><div class="bar good"><span style="width:${c.quality}%"></span></div><b>${Math.round(c.quality)}</b></div>
        <div class="rh-status ${weeksToBaptism() === 1 ? 'open' : 'wait'}">🕊️ 세례식까지 주일 ${weeksToBaptism()}번 · 끝까지 마칠 비율 ${Math.round(cateCompletion() * 100)}% · 준비비 약 💰${baptismCost(Math.floor(c.n * cateCompletion()))}</div>
      </div></div>
      <p class="small rh-prod">📈 예비신자가 시간당 약 ${cateInflow().toFixed(1)}명 찾아와요${promo ? ` (📣 ${promo.name} 홍보 중)` : ''}${c.n >= cap ? ' · <b>교리반 자리가 꽉 찼어요</b> (아래에서 반을 더 열거나 교리반 단체를 키우세요)' : ''}</p>
      <p class="small">🏫 지금 여는 반: 신부님 반${cateClasses().map(k => ` · ${k.icon} ${k.name}`).join('')}</p>
      <p class="muted">교리반 단체가 클수록 자리가 늘고, 선교분과와 홍보는 찾아오는 사람을, 교리 준비와 수녀님은 끝까지 마치는 사람을 늘려요.</p>`,
    options: [
      { tile: true, label: `📖 교리 준비 <span class="cost">⚡${cost}</span>`, tileSub: `준비 +${CATE.prepGain}`, disabled: Game.state.energy < cost, onClick: () => { const m = runAction(prep); if (m) toast(`📖 ${m}`); } },
      ...(nextCateClass() ? [(() => { const k = nextCateClass(), b = cateClassBlocker(); return { tile: true, label: `🏫 ${k.name} 열기${c.n >= cap ? ' ⭐' : ''}`, tileSub: b ? `🔒 ${b}` : `💰${scaledCost(k.cost)} · 자리 +${k.cap} · 주일마다 💰${scaledCost(k.week)}`, sub: b || k.who, disabled: !!b, onClick: () => { const m = openCateClass(); if (m) { toast(m); save(); setTimeout(openCateMenu, 0); } } }; })()] : []),
      ...PROMOS.map(pr => { const b = promoBlocker(pr); return { tile: true, label: `${pr.icon} ${pr.name}`, tileSub: b ? `🔒 ${b}` : `💰${scaledCost(pr.cost)} · ${pr.days}일 ×${pr.mult}`, sub: b, disabled: !!b, onClick: () => { const m = startPromo(pr.id); if (m) toast(`📣 ${m}`); } }; }),
    ],
  });
}

// 이웃 동네의 다른 종교 공동체
function openReligion(id) {
  const r = RELIGIONS[id];
  modal({
    title: `${r.icon} ${r.name}`,
    html: `<p class="small">${r.kind} 공동체 · 신자 <b>${religionMembers(id)}명</b></p><p class="small">${r.line}</p>`,
    options: [{ label: '🏘️ 동네 종교 현황 보기', onClick: () => setTimeout(openTownReligions, 0) }],
  });
}

// 마을회관: 동네 사람들이 어떤 종교를 갖고 있는지
function openTownReligions() {
  const { pop, rows } = townReligionStats(), max = Math.max(...rows.map(x => x.n));
  modal({
    title: `🏘️ ${parishDef().place} 종교 현황`,
    html: `<p class="muted">면 인구 약 ${pop.toLocaleString()}명 · 마을회관 게시판</p>
      <table class="town-rel">${rows.map(x => `<tr class="${x.ours ? 'ours' : ''}"><td>${x.icon} ${localize(x.name)}${x.kind ? ` <span class="muted">${x.kind}</span>` : ''}</td><td class="bar"><span style="width:${Math.max(2, x.n / max * 100)}%"></span></td><td class="n">${x.n.toLocaleString()}명<br><span class="muted">${Math.round(x.n / pop * 100)}%</span></td></tr>`).join('')}</table>
      <p class="small">서로 다른 길을 걷지만 한 동네 이웃이에요. 새 신자는 대개 아직 종교가 없는 이웃 가운데서 찾아와요.</p>`,
  });
}

// 아래 버튼: 단체 목록 (교리실과 방별로 정리)
function openGroupsMenu() {
  const cs = containers().filter(([, c]) => c.built);
  if (!cs.length) { modal({ title: '👥 단체', html: '<p class="small">아직 교리실이 없어요. 교리실을 지으면 방마다 단체를 만들 수 있어요.</p>', options: [{ label: '🔨 교리실 짓기', onClick: () => setTimeout(openFreePlot, 0) }] }); return; }
  const rows = [];
  const table = cs.map(([key, c]) => {
    const cells = c.rooms.map((g, room) => {
      if (!g) return `<td class="empty">🚪 빈 방</td>`;
      const def = UNITS[g.type], perks = (UNIT_PERKS[g.type] || []).filter(k => g.level >= k.lv).length;
      return `<td><b>${def.icon} ${def.name}</b><br><span class="muted">${g.level ? `Lv${g.level} · ${chairLed(g) ? '👔 위원장' : MEETING_SLOTS[groupSlot(g)].name + ' 회의'}${perks ? ` · ✨${perks}` : ''}` : '준비 중'}</span></td>`;
    }).join('');
    return `<tr><th>🏫 ${siteName(key)}<br><span class="muted">Lv${c.level || 1}</span></th>${cells}</tr>`;
  }).join('');
  for (const [key, c] of cs) c.rooms.forEach((g, room) => rows.push(g
    ? { label: `${UNITS[g.type].icon} ${UNITS[g.type].name} ${g.level ? `Lv${g.level}` : '(준비 중)'}`, sub: `${siteName(key)} · 방 ${room + 1}${g.level ? ` · ${meetingText(key, room)}` : ''}`, onClick: () => setTimeout(() => overviewGoto(`room:${key}:${room}`), 0) }
    : { label: `🚪 ${siteName(key)} · 방 ${room + 1} — 빈 방`, sub: '눌러서 새 단체 만들기', onClick: () => setTimeout(() => { centerOn(c.x + 1.5, c.y + 1); openNewGroupMenu(key, room); }, 0) }));
  modal({
    title: `👥 단체 ${allGroups().length}개 · 교리실 ${cs.length}동`,
    html: `<table class="rooms-table">${table}</table>`,
    options: [{ tile: true, label: '🌳 테크 트리', tileSub: '단체가 열리는 조건', onClick: () => setTimeout(openTechTree, 0) }, ...rows],
  });
}

function bottomBarHtml() {
  if (!World.overview) return '';
  if (World.pathMode) return `<nav class="bottom-bar place-bar">${pathInfoHtml()}<button data-bar="pathDone" class="ok"><span>✔</span>다 했어요</button></nav>`;
  if (World.placing) return `<nav class="bottom-bar place-bar">
      <button data-bar="placeCancel"><span>✕</span>취소</button>
      ${placeInfoHtml()}
      <button data-bar="placeOk" class="ok ${tutorialStep() && tutorialStep().id === 'welcome' && World.placing.ok ? 'pulse' : ''}" ${World.placing.ok ? '' : 'disabled'}><span>✔</span>${World.placing.move ? '여기로 옮기기' : '여기에 짓기'}</button>
    </nav>`;
  return `${interiorParish() ? `<button class="view-btn" data-bar="toggleView">${World.view === 'outside' ? '⛪ 성당 안으로' : '🚪 밖으로 나가기'}</button>` : ''}<div class="zoom-btns"><button class="icon-btn" data-bar="zoomIn" aria-label="가까이">＋</button><button class="icon-btn" data-bar="zoomOut" aria-label="멀리">－</button></div>
    <nav class="bottom-bar">
      <button data-bar="status"><span>🧑‍💼</span>본당 현황</button>
      <button data-bar="build" class="${barMark('build')}"><span>🔨</span>짓기</button>
      <button data-bar="church" class="${sundayReady() ? 'hl' : ''} ${barMark('church')}"><span>⛪</span>주일미사</button>
      <button data-bar="groups"><span>👥</span>단체</button>
      <button data-bar="office"><span>🗂️</span>사무실</button>
    </nav>`;
}

// 안내 중인 단계가 가리키는 아래 버튼은 반짝인다
function barMark(name) { const st = Game.state.pastor && tutorialStep(); return st && st.mark === name && !st.done() ? 'pulse' : ''; }

function onBarButton(act) {
  if (UI.modalOpen || UI.talking) return;
  if (act === 'pathDone') { endPathMode(); return; }
  if (act === 'placeOk') { finishPlacing(true); return; }
  if (act === 'placeCancel') { finishPlacing(false); return; }
  if (act === 'toggleView') { World.view = World.view === 'outside' ? 'inside' : 'outside'; World.obSel = null; render(); toast(World.view === 'outside' ? '🚪 성당 밖 전경이에요. 조경을 꾸미고 땅을 정리할 수 있어요' : '⛪ 성전 안이에요. 방을 눌러 보세요'); return; }
  if (act === 'zoomIn') worldZoom(1);
  else if (act === 'zoomOut') worldZoom(-1);
  else if (act === 'status') openCouncilMenu();
  else if (act === 'build') openFreePlot();
  else if (act === 'church' || act === 'office') overviewGoto(`b:${act}`);
  else if (act === 'groups') openGroupsMenu();
  else if (act === 'workers') openWorkerMenu();
  else if (act === 'cate') openCateMenu();
  else if (act === 'gems') openGemShop();
}

// 빈 방이 있는 교리실, 없으면 빈 땅
function freeRoomGoto() {
  const c = containers().find(([, x]) => x.built && x.rooms.some(g => !g));
  return c ? go(`b:${c[0]}`) : go('plot');
}

// 성당 다음 레벨에서 아직 못 채운 조건이 있는 건물
function churchGoalGoto(to) {
  const p = Game.state.pastor, unmet = churchNeeds(to).filter(n => !n.ok).map(n => n.label);
  if (unmet.includes('사제관 레벨')) return go('b:rectory');
  if (unmet.includes('사무실 레벨') || Game.state.pastor.levyDue > 0) return go('b:office');
  if (unmet.some(l => l.startsWith('단체'))) return go('groups');
  if (unmet.some(l => l.startsWith('교리실'))) {
    const low = containers().filter(([, x]) => x.built).sort((a, b) => (a[1].level || 1) - (b[1].level || 1))[0];
    return low ? go(`b:${low[0]}`) : go('plot');
  }
  if (unmet.includes('공소')) {
    const gk = Object.keys(p.sites).find(k => p.sites[k].kind === 'gongso');
    return go(gk ? `b:${gk}` : villageOpen('v1') ? 'plot' : 'npc:elder');
  }
  return go('b:church');
}

// 적응 기간 안내
function newbieLine() {
  const fp = firstParish();
  if (fp) return `<div class="q-item muted">🌱 첫 본당 (첫 발령까지) · 공사 ${Math.round(10 / fp.time) / 10}배 빠르게 · 비용 ${Math.round((1 - fp.cost) * 100)}% 할인 · 봉헌 ${fp.offering}배 · 새 얼굴 ${fp.members}배</div>`;
  if (!newbie()) return '';
  return `<div class="q-item muted">🌱 적응 기간 (성당 Lv${NEWBIE.maxChurch}까지) · 공사 ${Math.round(1 / NEWBIE.time)}배 빠르게 · 비용 ${Math.round((1 - NEWBIE.cost) * 100)}% 할인 · 새 얼굴 ${NEWBIE.members}배</div>`;
}

// 거둘 것: 누르면 한 번에 모두 거둔다
function collectLine() {
  const list = stashList();
  if (!list.length) return '';
  const o = Math.floor(list.reduce((a, x) => a + x.offering, 0)), m = Math.floor(list.reduce((a, x) => a + x.members, 0));
  const full = list.some(x => x.full);
  return `<div class="q-item hl" data-collect="1">🧺 거둘 것 ${[o ? `💰${o}` : '', m ? `👥${m}` : ''].filter(Boolean).join(' ')}${full ? ` · 가득 찬 곳은 사무실이 ${Math.round(autoCollectRate() * 100)}%만 대신 거둬요` : ''} · 모두 거두기</div>`;
}

function jobsLines() {
  return Game.state.pastor.jobs.map(j => `<div class="q-item"${go(`b:${j.key}`)}>🔨 ${jobName(j)}${j.kind !== 'room' && j.toLevel > 1 ? ` Lv${j.toLevel}` : ''} · ${fmtDur(jobLeftSec(j))} 남음</div>`).join('');
}

// 오늘의 회의: 단체마다 회의 시간과 참석 여부
function meetingsLine() {
  const ms = pastorMeetings();
  if (!ms.length) return '';
  const parts = ms.map(({ key, room, g }) => {
    const st = meetingState(key, room), sl = MEETING_SLOTS[groupSlot(g)];
    return `<span class="${st === 'open' ? 'mt-open' : st === 'done' ? 'mt-done' : ''}"${go(`room:${key}:${room}`)}>${UNITS[g.type].icon}${st === 'done' ? '✅' : st === 'open' ? '🔔지금' : sl.name}</span>`;
  }).join(' ');
  return `<div class="q-item">📅 오늘의 회의 <span class="muted">(본당 시각 ${clockLabel()})</span> ${parts}</div>`;
}

function pastorQuestHtml() {
  const s = Game.state, p = s.pastor;
  const items = [];
  // 튜토리얼 동안에는 지금 할 일 하나만 순서대로 보여 준다
  const tut = p.tutorial && TUTORIAL[p.tutorial.step];
  if (tut) {
    const st = tutorialStep(), n = p.tutorial.step + 1, total = TUTORIAL.length;
    return `<div class="quest tut" id="quest"><div class="q-title">🧑‍💼 사목회장의 안내 ${Math.min(n, total)}/${total}</div>${tut.goal ? `<div class="q-item hl"${st ? tutorialGo(st.go) : ''}>${tut.goal}</div>` : '<div class="q-item muted">사목회장과 이야기 중…</div>'}</div>`;
  }
  if (World.overview) return questPillsHtml();
  items.push(collectLine());
  items.push(newbieLine());
  items.push(meetingsLine());
  if (isDecember()) items.push(`<div class="q-item ${p.inflated ? 'hl' : 'muted'}">🏛️ 다음 달(1월) 첫 주일에 교구 정기 감사가 있어요</div>`);
  if (isJanuary() && !levyPrepaid()) items.push(`<div class="q-item hl"${go('b:office')}>📜 1월이에요 · 올해 공납금을 한 번에 내면 ${Math.round(LEVY_LUMP_DISCOUNT * 100)}% 감면 · 본당 사무실</div>`);
  if (Game.state.pastor.levyDue > 0) items.push(`<div class="q-item hl"${go('b:office')}>🏛️ 밀린 교구 공납금 ${Math.ceil(Game.state.pastor.levyDue)}만 원 · 본당 사무실</div>`);
  if (committeeUnlocked()) items.push(`<div class="q-item ${p.agenda.length && !p.daily.committee ? 'hl' : ''}"${go('npc:council')}>📨 상임위 건의 ${p.agenda.length}건${p.daily.committee ? ' · 오늘 회의 열림' : ''} · 사목회장</div>`);
  items.push(jobsLines());
  // 쉬는 공사 팀: 빈 땅이 있으면 빈 땅, 없으면 성당 다음 레벨에 필요한 건물
  const cn = containerNeed();
  const idleGo = cn && cn.ok && roomsFree() === 0 ? go('plot') : churchGoalGoto(Math.min(p.fixed.church + 1, CHURCH_LEVELS.length - 1));
  if (idleWorkers()) items.push(`<div class="q-item hl"${idleGo}>👷 쉬는 일꾼 ${idleWorkers()}명 · 짓기나 건물 키우기</div>`);
  items.push(sundayReady() ? `<div class="q-item hl"${go('b:church')}>⛪ 주일미사를 드릴 수 있어요 · 성당</div>` : `<div class="q-item muted">⛪ 다음 주일까지 ${fmtDur(sundayLeftSec())}</div>`);
  if (p.event) items.push(`<div class="q-item hl"${go('npc:eventNpc')}>❗ ${p.event === 'sisterOver' ? '수녀님이 찾아오셨어요' : p.event === 'dioCall' ? '교구 공문이 왔어요' : p.event === 'quitTalk' ? '봉사자가 면담을 청했어요' : p.event === 'budgetGrumble' ? '단체가 지원이 적다고 서운해해요' : p.event === 'sisterFaction' ? '수녀님을 따르는 교우들이 찾아왔어요' : p.event === 'massReq' ? '교우들이 미사를 늘려 달래요' : p.event === 'cleanReq' ? '교우들이 청소를 청했어요' : p.event === 'decorReq' ? '교우들이 부탁하러 왔어요' : '성당 앞에 누군가 찾아왔어요'}</div>`);
  const need = containerNeed();
  if (roomsFree() === 0 && need) items.push(`<div class="q-item ${need.ok ? 'hl' : ''}"${go('plot')}>📦 교리실이 꽉 찼어요 · 짓기 · 다음 컨테이너: 신자 ${Math.floor(p.res.members)}/${need.members}, 💰${need.cost}</div>`);
  const to = p.fixed.church + 1;
  if (CHURCH_LEVELS[to]) {
    const needs = churchNeeds(to);
    items.push(`<div class="q-item"${CHURCH_LEVELS[to].locked ? '' : churchGoalGoto(to)}>🎯 성당 Lv${to}: ${needs.map(n => `${n.ok ? '✅' : ''}${n.label} ${n.have}/${n.want}`).join(' · ')}</div>`);
  }
  if (p.fixed.church >= 3 && !villageOpen('v1')) items.push(`<div class="q-item ${villageReady('v1') ? 'hl' : ''}"${go('npc:elder')}>🗺️ 윗말 넓히기 · 길 끝의 이장님</div>`);
  return wrapQuest(`${p.name} · Lv${p.fixed.church} ${CHURCH_LEVELS[p.fixed.church].name}`, items.join(''));
}

// ---------- 할 일 알약 (멀리서 보기) ----------
// 긴 글 대신 짧은 알약 버튼 몇 개만. 누르면 그곳으로 간다
// { icon, text, attr(누르면 할 일), hl(급함), pri(높을수록 앞) }
function questTasks() {
  const p = Game.state.pastor, out = [];
  const list = stashList();
  if (list.length) {
    const o = Math.floor(list.reduce((a, x) => a + x.offering, 0)), m = Math.floor(list.reduce((a, x) => a + x.members, 0));
    out.push({ icon: '🧺', text: `거두기 ${o ? `💰${o}` : ''}${m ? ` 👥${m}` : ''}`, attr: ' data-collect="1"', hl: true, pri: list.some(x => x.full) ? 9 : 6 });
  }
  if (p.event) out.push({ icon: '❗', text: p.event === 'sisterOver' ? '수녀님 월권' : p.event === 'dioCall' ? '교구 공문' : p.event === 'quitTalk' ? '봉사자 면담' : p.event === 'budgetGrumble' ? '지원 불만' : p.event === 'sisterFaction' ? '수녀님 세력' : p.event === 'massReq' ? '미사 늘려 달래요' : p.event === 'cleanReq' ? '청소 요청' : p.event === 'decorReq' ? '교우들의 부탁' : '찾아온 교우', attr: go('npc:eventNpc'), hl: true, pri: 9 });
  const open = pastorMeetings().filter(x => meetingState(x.key, x.room) === 'open');
  if (open.length) out.push({ icon: '🔔', text: `회의 ${open.length}곳 지금`, attr: go(`room:${open[0].key}:${open[0].room}`), hl: true, pri: 8 });
  const inv = meetingInvites();
  if (inv.length) out.push({ icon: '💌', text: `회의 초대 ${inv.length}곳`, attr: go(`room:${inv[0].key}:${inv[0].room}`), hl: false, pri: 5 });
  if (sundayReady()) out.push({ icon: '⛪', text: p.week > 0 && Date.now() - p.lastSunday > 3 * sundayIntervalMs() ? '주일미사 · 오래 쉬면 신자가 떠나요' : '주일미사', attr: go('b:church'), hl: true, pri: 7 });
  const cold = allGroups().filter(x => x.g.level && (x.g.vital === undefined ? 60 : x.g.vital) < 25);
  if (cold.length) out.push({ icon: '🥶', text: `식어 가는 단체 ${cold.length}곳`, attr: go(`room:${cold[0].key}:${cold[0].room}`), hl: true, pri: 6 });
  if (p.res.heart < 30) out.push({ icon: '💔', text: '마음이 식어 가요', attr: go('b:church'), hl: true, pri: 5 });
  if (committeeUnlocked() && p.agenda.length && !p.daily.committee) out.push({ icon: '📨', text: `건의 ${p.agenda.length}건`, attr: go('npc:council'), hl: true, pri: 6 });
  if (p.levyDue > 0) out.push({ icon: '🏛️', text: `밀린 공납금 ${Math.ceil(p.levyDue)}`, attr: go('b:office'), hl: true, pri: 6 });
  if (isJanuary() && !levyPrepaid()) out.push({ icon: '📜', text: '공납금 한 번에 (1월)', attr: go('b:office'), hl: true, pri: 5 });
  if (isDecember()) out.push({ icon: '🏛️', text: '다음 달 교구 감사', attr: '', hl: !!p.inflated, pri: 2 });
  const cn = containerNeed();
  const idleGo = cn && cn.ok && roomsFree() === 0 ? go('plot') : churchGoalGoto(Math.min(p.fixed.church + 1, CHURCH_LEVELS.length - 1));
  if (idleWorkers()) out.push({ icon: '👷', text: `쉬는 일꾼 ${idleWorkers()}`, attr: idleGo, hl: true, pri: 5 });
  if (roomsFree() === 0 && cn && cn.ok) out.push({ icon: '📦', text: '교리실 더 짓기', attr: go('plot'), hl: false, pri: 3 });
  if (p.fixed.church >= 3 && !villageOpen('v1') && villageReady('v1')) out.push({ icon: '🗺️', text: '윗말 넓히기', attr: go('npc:elder'), hl: true, pri: 4 });
  if ((p.reports || []).some(r => !r.read)) out.push({ icon: '📑', text: '이번 달 단체 보고서', attr: ' data-report="1"', hl: true, pri: 6 });
  if (p.hiring && p.hiring.applicants.length) out.push({ icon: '📨', text: `지원자 ${p.hiring.applicants.length}명`, attr: ' data-hire="1"', hl: true, pri: 8 });
  if (sisters().some(sis => !(sis.scope || []).length)) out.push({ icon: '👩‍🦳', text: '수녀님 활동 범위 정하기', attr: ' data-sister="1"', hl: true, pri: 7 });
  if (p.week > 0 && !direction()) out.push({ icon: '📅', text: '이번 달 사목 방향', attr: ' data-direction="1"', hl: true, pri: 7 });
  if (isAway()) out.push({ icon: awayDef().icon, text: `${awayDef().name} 중 · ${fmtDur(Math.ceil((p.away.until - Date.now()) / 1000))} 뒤 돌아와요`, attr: go('b:office'), pri: 9 });
  else { const tl = todayLits(); if (tl.length) out.push({ icon: '🗓️', text: `${WEEK_DAYS[weekDay()]}요일 · ${tl[0].time} ${tl[0].name.replace(/^\S+요일 /, '')}${tl.length > 1 ? ` 외 ${tl.length - 1}` : ''}`, attr: go('b:church'), hl: true, pri: 7 }); }
  if (p.transfer) out.push(bishopCallDue() ? { icon: '📞', text: '주교님 전화', attr: ' data-transfer="1"', hl: true, pri: 10 } : transferReady() ? { icon: '📜', text: '인사발령 공문', attr: ' data-transfer="1"', hl: true, pri: 10 } : { icon: '📜', text: `인사발령까지 ${transferWeeksLeft()}주일`, attr: ' data-transfer="1"', pri: 4 });
  const readyOrg = ORG.filter(orgReady);
  if (readyOrg.length) out.push({ icon: '👔', text: `${readyOrg[0].name} 선임 가능`, attr: ' data-org="1"', hl: true, pri: 7 });
  if ((p.plans || []).length) out.push({ icon: '💸', text: `행사 지원 요청 ${p.plans.length}건`, attr: ' data-plan="1"', hl: true, pri: p.plans.some(x => x.age >= 2) ? 8 : 6 });
  const cs = cateState();
  if (weeksToBaptism() === 1 && cs.n >= 1) out.push({ icon: '🕊️', text: `다음 주일 세례식 · 예비신자 ${Math.floor(cs.n)}`, attr: ' data-bar="cate"', hl: cs.quality < 50, pri: 4 });
  if (cs.n >= cateCapacity()) out.push({ icon: '📘', text: '교리반이 꽉 찼어요', attr: ' data-bar="cate"', hl: false, pri: 3 });
  if (p.jobs.length) out.push({ icon: '🔨', text: `공사 ${p.jobs.length} · ${fmtDur(Math.min(...p.jobs.map(jobLeftSec)))}`, attr: ' data-bar="workers"', hl: false, pri: 1 });
  if (!sundayReady()) out.push({ icon: '⛪', text: `주일까지 ${fmtDur(sundayLeftSec())}`, attr: go('b:church'), hl: false, pri: 0 });
  return out.sort((a, b) => b.pri - a.pri);
}

const PILL_MAX = 4;
function questPillsHtml() {
  const p = Game.state.pastor, tasks = questTasks(), fold = hudFolded(), shown = tasks.slice(0, fold ? 2 : PILL_MAX), more = tasks.length - shown.length;
  const pill = t => `<button class="pill ${t.hl ? 'hl' : ''}"${t.attr}><span>${t.icon}</span>${t.text}</button>`;
  // 목표: 성당 다음 레벨 조건 중 채운 수를 막대로
  const to = p.fixed.church + 1, c = CHURCH_LEVELS[to];
  let goal = '';
  if (questOn() || blessReqs().length) goal = questCardHtml();
  if (!questOn() && c && !c.locked) {
    const needs = churchNeeds(to), ok = needs.filter(n => n.ok).length;
    goal += `<button class="pill goal ${ok === needs.length ? 'hl' : ''}" data-qgoal="1"><span>🎯</span>성당 Lv${to} <span class="gbar"><span style="width:${ok / needs.length * 100}%"></span></span> ${ok}/${needs.length}</button>`;
  }
  const foldBtn = window.innerWidth < 520 ? `<button class="pill more" data-hudfold="1">${fold ? '▾ 모두 보기' : '▴ 접기'}</button>` : '';
  return `<div class="quest-pills" id="quest">${goal}${shown.map(pill).join('')}${more > 0 && !fold ? `<button class="pill more" data-qmore="1">+${more}</button>` : ''}${foldBtn}</div>`;
}

// 목표 창: 성당 다음 레벨 조건 하나하나와 바로 가기
function openGoalModal() {
  const p = Game.state.pastor, to = p.fixed.church + 1, c = CHURCH_LEVELS[to];
  if (!c) return;
  const needs = churchNeeds(to);
  modal({
    title: `🎯 성당 Lv${to} "${c.name}"`,
    html: `${needs.map(needLine).join('')}${newbie() ? `<p class="muted" style="margin-top:8px">🌱 적응 기간 (성당 Lv${NEWBIE.maxChurch}까지): 공사 ${Math.round(1 / NEWBIE.time)}배 빠르게 · 비용 ${Math.round((1 - NEWBIE.cost) * 100)}% 할인 · 새 얼굴 ${NEWBIE.members}배</p>` : ''}`,
    options: needs.every(n => n.ok)
      ? [{ tile: true, label: '⛪ 증축하러 가기', onClick: () => setTimeout(() => overviewGoto('b:church'), 0) }]
      : [{ tile: true, label: '➡️ 모자란 곳으로', onClick: () => setTimeout(() => { const g = churchGoalGoto(to).match(/data-goto="([^"]+)"/); if (g) questGoto(g[1]); }, 0) }],
  });
}

// ---------- 첫 본당 퀘스트 (v1.05) ----------
function questGo(spec) {
  setTimeout(() => {
    if (spec === 'clear') { toast('🌿 본당 땅의 잡초·돌·나무를 눌러 치워요 (산 땅에서만)'); return; }
    if (spec === 'build') { openBuildCatalog(); return; }
    if (spec === 'lots') { openLotList(); return; }
    if (spec === 'fence') { openFenceMenu(); return; }
    if (spec === 'decor') { openDecorMenu(); return; }
    if (spec === 'path') { startPathMode(); return; }
    if (spec === 'cate') { openCateMenu(); return; }
    if (spec === 'elder') { questGoto('npc:elder'); return; }
    questGoto(spec);
  }, 0);
}
function onQuestTap(id) {
  const d = questDef(id);
  if (!d) return;
  if (questProgress(d).ok) { const m = claimQuest(id); if (m) { save(); refreshPastorHud(); showQuestDone(d); } return; }
  questGo(d.go);
}
const rewardChips = r => [r.offering ? `<span class="rw gold">💰 ${r.offering}</span>` : '', r.gems ? `<span class="rw gem">💎 ${r.gems}</span>` : '', r.heart ? `<span class="rw heart">❤️ +${r.heart}</span>` : ''].join('');
// 왼쪽 퀘스트 카드: 걸린 퀘스트 수만 머리에, 아래로 퀘스트 이름 (다 채우면 [받기])
// 폰(좁은 화면)에서는 왼쪽 위 퀘스트·할 일 목록이 지도를 반쯤 가렸다 (v1.08) → 기본으로 접어 두고, 받을 퀘스트와 할 일 두 개만.
// '모두 보기'를 누르면 펼친다 (localStorage 'sungdang-hud-fold')
UI.hudFold = (() => { try { return localStorage.getItem('sungdang-hud-fold') !== '0'; } catch (e) { return true; } })();
function hudFolded() { return UI.hudFold && window.innerWidth < 520; }
function questCardHtml() {
  const act = questActive(), fold = hudFolded();
  const rows = act.filter(d => !fold || questProgress(d).ok).map(d => { const pr = questProgress(d), ok = pr.ok; return `<button class="qc-row${ok ? ' ok' : ''}" data-quest="${d.id}"><span class="qc-ic">${ok ? '🎁' : d.icon}</span><span class="qc-tx">${d.name}${!ok && pr.want > 1 ? `<small>${Math.min(pr.have, pr.want)}/${pr.want}</small>` : ''}</span>${ok ? '<span class="qc-get">받기</span>' : '<span class="qc-go">›</span>'}</button>`; }).join('');
  const bl = (fold ? [] : blessReqs()).map((r, i) => { const b = BLESSINGS.find(x => x.id === r.kind); return `<button class="qc-row bless" data-bless-i="${i}"><span class="qc-ic">${b.icon}</span><span class="qc-tx">${b.name}<small>${esc(r.who)}${b.urgent ? ' · 급해요' : ''}</small></span><span class="qc-go">›</span></button>`; }).join('');
  return `<div class="qcard"><button class="qc-head" data-qlist="1"><span class="qc-scroll">📜</span>퀘스트<span class="qc-n">${act.length + blessReqs().length}</span></button>${rows}${bl}${rows || bl || fold ? '' : `<div class="qc-wait">새 퀘스트를 기다리는 중…</div>`}</div>`;
}
function openQuestModal() {
  const act = questActive(), wait = questNextSec(), p = Game.state.pastor;
  const card = d => { const pr = questProgress(d); return `<button class="qm-card${pr.ok ? ' ok' : ''}" data-qrow="${d.id}">
      <span class="qm-ic">${d.icon}</span>
      <span class="qm-body"><b>${d.name}</b>${QUEST_FROM[d.id] ? `<em class="qm-from">${QUEST_WHO[QUEST_FROM[d.id][0]].name}의 부탁</em>` : ''}<small>${d.desc}</small>
        <span class="qm-bar"><i style="width:${pr.have / pr.want * 100}%"></i></span>
        <span class="qm-rw">${rewardChips(d.reward)}</span></span>
      <span class="qm-act">${pr.ok ? '받기' : '가기'}</span></button>`; };
  modal({
    title: `📜 퀘스트 <span class="qc-n">${act.length}</span>`,
    html: `<div class="qm-list">${act.map(card).join('') || '<p class="muted">지금은 걸린 퀘스트가 없어요.</p>'}</div>
      <p class="qm-foot">${bishopCallDue() ? "📞 주교님께서 전화하셨어요" : p.transfer ? `📜 인사발령까지 ${transferWeeksLeft()}주일` : questState().next < FIRST_QUESTS.length ? `⏳ 다음 퀘스트 ${wait ? fmtDur(wait) + ' 뒤' : '곧'}` : '📜 남은 퀘스트를 마치면 인사발령 공문이 와요'}</p>`,
    buttons: [{ label: '닫기', cls: 'ghost' }],
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('#modal-root [data-qrow]');
  if (b) closeModalThen(() => onQuestTap(b.dataset.qrow));
});
// 새 퀘스트: 청한 사람의 얼굴이 게임 화면 위에 떠오르고, 아래 글 상자에 청하는 말 (v1.08)
function showQuestRequest(d) {
  const f = QUEST_FROM[d.id], key = f ? f[0] : 'council', who = QUEST_WHO[key];
  Sound.sfx('quest');
  modal({
    face: key, who: who.name, silent: true,
    html: `<p class="serif">“${f ? f[1] : d.desc}”</p>
      <div class="qr-q"><span class="qc-ic">${d.icon}</span><b>${d.name}</b></div>
      <div class="qd-rw">${rewardChips(d.reward)}</div>`,
    buttons: [{ label: '나중에', cls: 'ghost' }, { label: '해 볼게요', onClick: () => setTimeout(() => onQuestTap(d.id), 0) }],
  });
  setTimeout(() => Sound.speak(f ? f[1] : d.desc, f ? f[0] : 'council'), 600);
}
const BLESS_IMG = { car: 'bless-car', shop: 'bless-shop', anoint: 'bless-anoint', hands: 'bless-hands', items: 'bless-items' };
// 축복 요청: 그 장면 그림 위에 사연, 아래에 다녀올지 고른다
function openBlessScene(i) {
  const r = blessReqs()[i];
  if (!r) return;
  const b = BLESSINGS.find(x => x.id === r.kind), blk = blessBlocker(i), left = Math.max(0, Math.ceil((r.until - Date.now()) / 1000));
  Sound.sfx('bless'); setTimeout(() => Sound.speak(r.why, faceFor(r.who)), 500);
  // v1.08: 청하는 사람 얼굴 + 아래 글 상자 (다녀온 뒤 장면은 그림 그대로)
  modal({ face: faceFor(r.who), who: `${b.icon} ${esc(r.who)}`, silent: true,
    html: `<p class="serif">${r.why}</p><p class="muted">${b.name} 요청 · ${fmtDur(left)} 안에${b.urgent ? ' · 급해요' : ''} · 다녀오면 가족이 감사 봉헌을 해요</p>`,
    options: [
      { label: `가서 축복한다 ⚡${b.energy}`, sub: blk || '', disabled: !!blk, onClick: () => { const m = doBlessing(i); if (m) setTimeout(() => vnOverlay([{ img: BLESS_IMG[r.kind] || 'bless-items', chap: `${b.icon} ${b.name}`, title: m.title, lines: [m.text, `<span class="vn-who">${m.eff}</span>`], btn: '돌아온다 ▸' }]), 0); } },
      { label: '나중에 가 보겠다', sub: '기한 안에만 가면 돼요' },
    ], buttons: [] });
}

// 퀘스트 완료 창: 가운데에 보상과 함께 톡 떠오른다
function showQuestDone(d) {
  const el = document.createElement('div');
  el.className = 'qdone-bg';
  Sound.sfx('reward');
  el.innerHTML = `<div class="qdone"><div class="qd-ribbon">퀘스트 완료</div><div class="qd-ic">${d.icon}</div><h3>${d.name}</h3><div class="qd-rw">${rewardChips(d.reward)}</div><button class="qd-btn">좋아요</button></div>`;
  el.onclick = e => { if (e.target === el || e.target.closest('.qd-btn')) el.remove(); };
  document.body.appendChild(el);
}

// +N: 할 일 전부
function openTaskList() {
  const tasks = questTasks();
  modal({
    title: '📋 할 일',
    options: tasks.map(t => ({ label: `${t.icon} ${t.text}`, onClick: () => setTimeout(() => {
      const m = t.attr.match(/data-goto="([^"]+)"/);
      const qm = t.attr.match(/data-quest="([^"]+)"/); if (qm) onQuestTap(qm[1]); else if (m) questGoto(m[1]); else if (t.attr.includes('data-collect')) doCollect(null); else if (t.attr.includes('workers')) openWorkerMenu(); else if (t.attr.includes('data-plan')) openPlanModal(0); else if (t.attr.includes('data-org')) openOrgModal(); else if (t.attr.includes('data-report')) openReportModal(0); else if (t.attr.includes('data-transfer')) openTransferModal(); else if (t.attr.includes('data-bless')) openBlessings(); else if (t.attr.includes('data-direction')) openDirectionModal(); else if (t.attr.includes('data-sister')) openSisterScope((sisters().find(sis => !(sis.scope || []).length) || {}).name); else if (t.attr.includes('data-hire')) openApplicants(); else if (t.attr.includes('cate')) openCateMenu();
    }, 0) })),
  });
}

// 할 일 묶음 (캐릭터 모드)
UI.questOpen = (() => { try { return localStorage.getItem('sungdang-quest-open') === '1'; } catch (e) { return false; } })();
function wrapQuest(title, body) {
  if (!World.overview) return `<div class="quest" id="quest"><div class="q-title">${title}</div>${body}</div>`;
  const rows = body.match(/<div class="q-item[^>]*>[\s\S]*?<\/div>/g) || [];
  const todo = rows.filter(r => !/class="q-item[^"]*(done|muted)/.test(r));
  if (UI.questOpen) {
    // 펼치면 묶어서 보여 준다: 지금 할 일 / 진행 중인 공사 / 목표 / 알림
    const text = r => r.replace(/<[^>]+>/g, '');
    const groups = { now: [], work: [], goal: [], info: [] };
    for (const r of rows) {
      const t = text(r).trim();
      if (t.startsWith('🔨')) groups.work.push(r);
      else if (t.startsWith('🎯') || t.startsWith('🗺️')) groups.goal.push(r);
      else if (/class="q-item[^"]*hl/.test(r) || t.startsWith('📅')) groups.now.push(r);
      else groups.info.push(r);
    }
    const sec = (name, list) => list.length ? `<div class="q-sec">${name}</div>${list.join('')}` : '';
    return `<div class="quest open" id="quest"><div class="q-title q-head" data-qtoggle="1">${title} <span class="q-fold">접기 ▴</span></div>
      ${sec('⭐ 지금 할 일', groups.now)}${sec('🔨 진행 중', groups.work)}${sec('🎯 목표', groups.goal)}${sec('ℹ️ 알림', groups.info)}</div>`;
  }
  const top = rows.find(r => /class="q-item[^"]*hl/.test(r)) || todo[0] || '';
  return `<div class="quest compact" id="quest"><div class="q-head" data-qtoggle="1">📋 할 일 ${todo.length} <span class="q-fold">펼치기 ▾</span></div>${top}</div>`;
}

function pastorHudHtml() { return resStripHtml() + pastorQuestHtml() + bottomBarHtml(); }


function questHtml() {
  const s = Game.state;
  const ch = SEMINARY_CHAPTERS[s.seminary.chapter];
  const items = ch.tasks.map(t => {
    const a = ACTIONS.find(x => x.id === t.action);
    const n = Math.min(t.count, s.seminary.progress[t.action] || 0);
    const ok = n >= t.count;
    return `<div class="q-item ${ok ? 'done' : ''}">${ok ? '✅' : '⬜'} ${a.icon} ${a.name} ${n}/${t.count} <span class="muted">· ${whereIs(t.action)}</span></div>`;
  }).join('');
  let next = '';
  if (ch.ordination) next = '<div class="q-item hl">✝️ 신학교 성당으로 가서 사제서품 받기</div>';
  else if (chapterTasksDone()) next = `<div class="q-item hl">❗ 영성 지도 신부님께 가기</div>`;
  return `<div class="quest"><div class="q-title">${ch.label} · ${esc(ch.title)}</div>${items}${next}</div>`;
}

function updatePrompt(t) {
  const el = document.getElementById('prompt');
  const btn = document.getElementById('btn-act');
  if (!t) { el.hidden = true; btn.classList.remove('ready'); btn.textContent = '…'; return; }
  const verb = t.npc ? '대화' : t.plot ? '살펴보기' : '들어가기';
  el.innerHTML = `<b>${esc(t.label)}</b> <span class="key">스페이스</span> ${verb}`;
  el.hidden = false;
  btn.classList.add('ready');
  btn.textContent = t.npc ? '💬' : t.plot ? '🔨' : '🚪';
}

// ---------- 화면: 타이틀 / 프롤로그 / 보좌 임기 끝 ----------

// ---------- 이야기 화면 (v1.06): 그림이 화면 가득 장면을 보여 주고, 아래 대화창에 글이 한 줄씩, 선택은 아래에 ----------
const STORY_IMG = n => `assets/story/${n}.webp?v=3`;
function vnHtml({ img, chap, dots, title, lines, foot, body, who }) {
  return `<div class="vn" style="background-image:url('${STORY_IMG(img)}')">
    <div class="vn-shade"></div>
    ${chap || dots ? `<div class="vn-top">${chap ? `<span class="vn-chap">${chap}</span>` : ''}${dots || ''}</div>` : ''}
    <div class="vn-box">
      ${who ? `<div class="vn-name">${who}</div>` : ''}
      ${title ? `<div class="vn-title">${title}</div>` : ''}
      ${lines ? `<div class="vn-lines">${lines}</div>` : ''}
      ${body || ''}
      ${foot ? `<div class="vn-foot">${foot}</div>` : ''}
    </div></div>`;
}
// 한 줄씩: 대화창을 누르면 다음 줄, 다 보이면 선택지
UI.vn = { key: '', n: 1 };
function vnLines(key, list) {
  if (UI.vn.key !== key) UI.vn = { key, n: 1 };
  const n = Math.min(UI.vn.n, list.length);
  return { html: list.slice(0, n).map((t, i) => `<p class="${i === n - 1 ? 'vn-new' : ''}">${t}</p>`).join(''), more: n < list.length };
}
document.addEventListener('click', e => {
  if (!e.target.closest('#app .vn-box') || e.target.closest('button, input')) return;
  const box = document.querySelector('#app .vn-box');
  if (box && box.dataset.more === '1') { Sound.sfx('page'); UI.vn.n++; render(); }
});

function renderTitle() {
  $app.innerHTML = vnHtml({ img: 'title', body: `
    <div class="vn-logo"><div class="vn-cross">✝</div><h1>성당 키우기</h1><p>예비 신학생에서 시작하는 한 사제의 일생</p></div>
    <div class="vn-form">
      <label>이름<input id="in-name" maxlength="8" placeholder="예: 김민준"></label>
      <label>세례명<input id="in-baptism" maxlength="10" placeholder="예: 안드레아"></label>
    </div>
    <button class="vn-btn main" data-act="start">이야기 시작하기</button>` });
  document.querySelector('#app .vn').classList.add('vn-title-screen');
}

// 부르심 고르기: 그림을 가리지 않게 아래에 작은 칸 넷. 칸을 누르면 그 사연이 대화창에 뜨고 [이 길로]
UI.vocPick = null;
function renderPrologue() {
  const L = vnLines('prologue', [`고등학교 3학년 겨울. 친구들이 대학 원서를 쓰는 동안, 나는 ${term('신학교')} 입학 원서를 앞에 두고 있다.`, '창밖에 눈이 내린다. 무엇이 나를 이 길로 이끌었을까?']);
  const pick = VOCATIONS.find(v => v.id === UI.vocPick);
  const tiles = `<div class="voc-tiles">${VOCATIONS.map(v => `<button class="voc-tile${v.id === UI.vocPick ? ' on' : ''}" data-voc-pick="${v.id}"><span class="vt-ic">${v.icon}</span><span class="vt-tx">${v.title}</span></button>`).join('')}</div>`;
  const lines = pick ? `<p class="vn-new">${pick.desc}</p><p class="voc-stat">${Object.entries(pick.stats).map(([k, n]) => `${STAT_NAMES[k]} +${n}`).join(' · ')}</p>` : L.html;
  $app.innerHTML = vnHtml({ img: 'prologue', chap: '부르심', title: pick ? `${pick.icon} ${pick.title}` : '겨울밤', lines,
    body: L.more ? '' : tiles + (pick ? `<button class="vn-btn main" data-vocation="${pick.id}">이 길로 신학교에 간다 ▸</button>` : '<p class="voc-hint">무엇이 나를 이끌었는지 골라 보세요</p>'),
    foot: L.more ? '<span class="vn-tap">눌러서 계속 ▾</span>' : '' });
  document.querySelector('#app .vn').classList.add('vn-compact');
  if (L.more) document.querySelector('#app .vn-box').dataset.more = '1';
}
document.addEventListener('click', e => {
  const t = e.target.closest('#app [data-voc-pick]');
  if (t) { UI.vocPick = t.dataset.vocPick; render(); }
});

function renderStory() {
  const s = Game.state, st = s.story;
  prepareScene();
  const sc = storyScene();
  const dots = `<span class="vn-dots">${STORY.map((_, i) => `<i class="${i < st.idx ? 'past' : i === st.idx ? 'now' : ''}"></i>`).join('')}</span>`;
  const text = sc.text.map(glossarize).concat(sc.pastorType ? [STORY_PASTOR_LINES[st.pastorType]] : []);
  const L = vnLines(`story${st.idx}`, text);
  let body = '', foot = '';
  if (st.result) {
    const last = st.idx === STORY.length - 1;
    body = `<div class="vn-result">${glossarize(st.result)}</div><button class="vn-btn main" data-act="storyNext">${last ? '📜 발령장 받기' : '다음 이야기'} ▸</button>`;
  } else if (L.more) foot = '<span class="vn-tap">눌러서 계속 ▾</span>';
  else if (sc.quiz) body = `<p class="vn-ask">이번 주 복음은 <b>${st.quiz.gospel.title}</b> (${st.quiz.gospel.ref}). 어떤 주제로 강론할까?</p><div class="vn-choices">${st.quiz.options.map((o, i) => `<button class="vn-choice" data-story-choice="${i}"><span class="vc-tx"><b>${esc(o)}</b></span></button>`).join('')}</div>`;
  else body = `<div class="vn-choices">${sc.choices.map((c, i) => `<button class="vn-choice" data-story-choice="${i}"><span class="vc-tx"><b>${c.label}</b></span></button>`).join('')}</div>`;
  $app.innerHTML = vnHtml({ img: sc.img || 'title', chap: sc.label, dots, title: glossarize(sc.title), lines: st.result ? '' : L.html, body, foot: foot || `<span class="vn-who">${esc(s.baptism)} ${esc(s.name)} · ${s.age}세</span>` });
  document.querySelector('#app .vn').classList.add('vn-compact');
  if (L.more && !st.result) document.querySelector('#app .vn-box').dataset.more = '1';
}

// 겹쳐 띄우는 그림 장면 (발령장·대화·요청·축복 등)
// scenes = [{ img, chap, title, who, lines: [], btn, choices: [{ label, sub, onClick }] }], 마지막 단추를 누르면 onDone
function vnOverlay(scenes, onDone) {
  let i = 0, n = 1;
  const el = document.createElement('div');
  el.className = 'vn-overlay';
  document.body.appendChild(el);
  const prevTalk = UI.talking;
  UI.talking = { scene: true };
  const close = fn => { el.remove(); UI.talking = prevTalk && prevTalk.scene ? null : prevTalk; if (fn) fn(); if (onDone) onDone(); save(); render(); };
  const draw = () => {
    const sc = scenes[i], lines = sc.lines || [], more = n < lines.length;
    const ch = !more && sc.choices ? `<div class="vn-choices">${sc.choices.map((c, k) => `<button class="vn-choice" data-vn-choice="${k}" ${c.disabled ? 'disabled' : ''}><span class="vc-tx"><b>${c.label}</b>${c.sub ? `<small>${c.sub}</small>` : ''}</span></button>`).join('')}</div>` : '';
    el.innerHTML = vnHtml({ img: sc.img, chap: sc.chap, title: sc.title, who: sc.who,
      lines: lines.slice(0, n).map((t, k) => `<p class="${k === n - 1 ? 'vn-new' : ''}">${t}</p>`).join(''),
      body: more ? '' : ch || `<button class="vn-btn main" data-vn-next="1">${sc.btn || '다음 ▸'}</button>`, foot: more ? '<span class="vn-tap">눌러서 계속 ▾</span>' : '' });
  };
  el.onclick = e => {
    const c = e.target.closest('[data-vn-choice]');
    if (c) { close(scenes[i].choices[+c.dataset.vnChoice].onClick); return; }
    if (e.target.closest('[data-vn-next]')) { if (++i >= scenes.length) { close(null); return; } n = 1; draw(); return; }
    if (e.target.closest('.vn-box') && n < (scenes[i].lines || []).length) { Sound.sfx('page'); n++; draw(); }
  };
  draw();
}

function renderCurateEnd() {
  const s = Game.state;
  const e = s.evaluation;
  const p = s.parish;
  $app.innerHTML = `
    <div class="card" style="text-align:center">
      <div class="chapter-label">보좌 신부 ${s.curate.month || 1}개월 · 청년회 Lv${s.curate.youthLv}</div>
      <h2>${s.curate.pastorName} 신부님의 평가서</h2>
      <div class="grade">${e.grade}</div>
      <p class="serif">${e.comment}</p>
    </div>
    <div class="card small">
      <p>🙏 미사 참례율 ${p.start.attendance}% → ${p.attendance.toFixed(1)}%</p>
      <p>🎸 청년회 활성도 ${p.start.youth} → ${Math.floor(p.groups.youth)} (Lv${s.curate.youthLv})</p>
      <p>🧒 주일학교 ${p.start.school} → ${Math.floor(p.groups.school)}</p>
      <p>❤️ 주임 신부와의 관계 ${Math.floor(s.curate.relation)}</p>
    </div>
    <div class="card">${statBars()}</div>
    <div class="card">
      <h3>📜 발령장</h3>
      <p class="serif" style="text-align:center">${esc(s.baptism)} ${esc(s.name)} 신부를<br><b>솔뫼 본당 ${term('주임 신부')}</b>로 임명합니다.</p>
      <p class="small">산골 마을의 작은 성당이에요. 신자 120명, 평균 나이 72세. 이제 내 본당을 키워 갈 차례예요.</p>
      <p class="muted">평가 보너스: 봉헌금 +${GRADE_BONUS[e.grade].offering}만 원</p>
    </div>
    <button class="btn block" data-act="toPastor">솔뫼 본당으로 부임 →</button>
    <button class="btn block ghost" data-act="reset" style="margin-top:8px">처음부터 다시 하기</button>`;
}

// ---------- 그리기 ----------

function render() {
  const s = Game.state;
  const inWorld = s && (s.phase === 'seminary' || s.phase === 'curate' || s.phase === 'pastor');
  document.body.classList.toggle('in-world', !!inWorld);
  if (inWorld) {
    const mapId = { seminary: 'seminary', curate: 'parish', pastor: 'solmoe' }[s.phase];
    if (World.mapId !== mapId) { worldLoad(mapId); updatePrompt(null); World.layoutKey = layoutKey(); }
    else syncWorldLayout();
    document.body.classList.toggle('overview', World.overview);
    $hud.innerHTML = hudHtml();
    return;
  }
  World.mapId = null;
  if (!s) renderTitle();
  else if (s.phase === 'prologue') renderPrologue();
  else if (s.phase === 'story') renderStory();
  else renderCurateEnd();
  window.scrollTo(0, 0);
}

// 짓기·마을 열기로 지도가 바뀌었으면 다시 계산
function layoutKey() {
  const p = Game.state && Game.state.pastor;
  if (!p || Game.state.phase !== 'pastor') return '';
  return JSON.stringify([p.sites, p.decor || {}, p.fixed, p.pos || {}, p.rot || {}, p.jobs.map(j => [j.key, j.toLevel]), Object.keys(p.villages).filter(villageOpen)]);
}

function syncWorldLayout() {
  const k = layoutKey();
  if (k !== World.layoutKey) { World.layoutKey = k; worldRebuild(); }
}

// ---------- 수첩 (본당·나·기록) ----------

function openNotebook() {
  const s = Game.state;
  let html = `<h3>나의 능력치</h3>${statBars()}<p class="muted">영성 효과: 모든 성장 ×${spiritMult()} ${spiritMult() < 1 ? '⚠️ 번아웃 위험' : ''} · 매일 미사 연속 ${s.daily.streak}일</p>`;
  if (s.phase === 'pastor') {
    const p = s.pastor;
    const groups = allGroups().filter(x => x.g.level > 0);
    html += `<h3 style="margin-top:16px">⛪ ${p.name} · 성당 Lv${p.fixed.church}</h3>${pastorStatusHtml()}
      <h3>단체</h3>${groups.length ? groups.map(({ key, g }) => `<div class="small">${UNITS[g.type].icon} ${UNITS[g.type].name} Lv${g.level} <span class="muted">(${siteName(key)})</span> — ${UNITS[g.type].prod(g.level)}</div>`).join('') : '<p class="muted">아직 단체가 없어요. 빈 땅에 컨테이너 교리실을 놓고 방에 단체를 만들어 보세요.</p>'}
      ${gongsoLevels() ? `<div class="small">✝️ 윗말 공소 Lv${gongsoLevels()}</div>` : ''}
      <p class="muted">접속하지 않는 동안에도 최대 ${idleCapHours()}시간까지 단체가 일해요 (사제관 레벨로 늘어남).</p>`;
  }
  if (s.phase === 'curate') {
    const p = s.parish;
    const groupNames = { youth: '🎸 청년회', school: '🧒 주일학교', legio: '📿 레지오', choir: '🎼 성가대' };
    const bar = v => `<div class="bar good"><span style="width:${v}%"></span></div>`;
    html += `
      <h3 style="margin-top:16px">⛪ ${p.name}</h3>
      <div class="stat-row"><span>👥</span><span>신자 수</span><span></span><span class="v">${p.members}</span></div>
      <div class="stat-row"><span>🙏</span><span>참례율</span>${bar(p.attendance)}<span class="v">${p.attendance.toFixed(1)}%</span></div>
      <div class="stat-row"><span>🏛️</span><span>건물 상태</span>${bar(p.building)}<span class="v">${Math.floor(p.building)}</span></div>
      <div class="stat-row"><span>🌏</span><span>지역 평판</span>${bar(p.reputation)}<span class="v">${Math.floor(p.reputation)}</span></div>
      <div class="stat-row"><span>💰</span><span>재정</span><span></span><span class="v">${Math.round(p.finance)}만</span></div>
      ${Object.entries(p.groups).map(([k, v]) => `<div class="stat-row"><span></span><span>${groupNames[k]}</span>${bar(v)}<span class="v">${Math.floor(v)}</span></div>`).join('')}
      <p class="muted">청년회·주일학교는 한 달 돌보지 않으면 식어요. 40이 넘으면 접속하지 않는 동안에도 스스로 활동해요.</p>`;
  }
  html += `<h3 style="margin-top:16px">📖 기록</h3><ul class="log">${s.log.slice(0, 20).map(l => `<li><div class="when">${l.when}</div>${l.text}</li>`).join('')}</ul>`;
  modal({ title: '📋 수첩', html, buttons: [{ label: '닫기' }] });
}

// ---------- 이벤트·미니게임·승인 요청 ----------

function openEvent() {
  const s = Game.state;
  const c = s.phase === 'pastor' ? s.pastor : s.curate;
  const ev = (s.phase === 'pastor' ? PASTOR_EVENTS : EVENTS).find(e => e.id === c.event);
  if (!ev) return;
  const options = ev.options.filter(o => !o.cond || o.cond());
  modal({
    title: `❗ ${ev.title}`,
    html: `<p>${glossarize(ev.text)}</p>`,
    options: options.map(o => ({
      label: typeof o.label === 'function' ? o.label() : o.label,
      sub: o.effect ? '' : (choiceBlocker(o) ? `<b>${choiceBlocker(o)}</b><br>` : '') + choiceEffectHtml(o),
      disabled: !o.effect && !!choiceBlocker(o),
      onClick: () => {
        const result = o.effect ? (o.effect(), o.result) : applyChoice(o);
        c.event = null;
        addLog(`📌 ${ev.title}: ${result}`);
        modal({ html: `<p>${result}</p>` });
      },
    })),
    buttons: [{ label: '나중에', cls: 'ghost' }],
  });
}

function openHomilyQuiz() {
  const quiz = makeHomilyQuiz();
  modal({
    title: '✍️ 강론 준비',
    html: `<p>이번 주 복음은 <b>${quiz.gospel.title}</b> (${quiz.gospel.ref})입니다.</p><p>어떤 주제로 강론할까요?</p>`,
    options: quiz.options.map(o => ({
      label: o,
      onClick: () => {
        const r = answerHomilyQuiz(quiz, o);
        modal({ title: r.correct ? '👍 좋은 준비!' : '🤔 아쉬워요', html: `<p>${r.msg}</p>` });
      },
    })),
    buttons: [{ label: '취소', cls: 'ghost' }],
  });
}

function openRequests() {
  const tags = { pending: '답변 대기 중', done: '완료' };
  modal({
    title: '📨 승인 요청',
    html: `<p class="muted">${term('보좌 신부')}는 예산을 직접 쓸 수 없어요. 결과는 달이 바뀔 때 나와요. 관계가 좋을수록 승인이 잘 나요.</p>`,
    options: REQUESTS.map(r => {
      const st = requestState(r);
      return {
        label: `${r.icon} ${r.name} <span class="cost">${r.budget}만 원</span>`,
        sub: st === 'open' ? r.desc : st === 'locked' ? `조건: ${r.needText}` : tags[st],
        disabled: st !== 'open',
        onClick: () => { submitRequest(r); toast(`📨 "${r.name}" 요청을 올렸어요. 다음 달에 답이 와요.`); },
      };
    }),
  });
}

function onEndMonth() {
  if (!canEndMonth()) return;
  const s = Game.state;
  const report = endMonth();
  const sermons = report.sermons.map((r, i) => `<div>${i + 1}주<b>${r.icon}</b>${r.label}</div>`).join('');
  modal({
    title: '📅 한 달을 마치며',
    html: `
      <h3>주일미사 ${term('강론')}</h3>
      <div class="sermons">${sermons}</div>
      <ul>${report.lines.map(l => `<li class="small">${l}</li>`).join('')}</ul>`,
    buttons: [{
      label: s.phase === 'curateEnd' ? '임기를 마치며 →' : '다음 달 시작',
      onClick: () => { if (s.phase === 'curate' && s.curate.event) toast('❗ 성당 앞에 누군가 찾아왔어요'); },
    }],
  });
}

function openSettings() {
  const s = Game.state;
  modal({
    title: '⚙️ 설정',
    html: `
      <div class="settings-row"><div><b>테스트 모드</b><div class="muted">행동력 회복과 방치 시간이 60배 빨라져요</div></div>
        <button class="btn small ${s.testMode ? '' : 'ghost'}" id="tm">${s.testMode ? '켜짐' : '꺼짐'}</button></div>
      ${s.testMode ? `<div class="settings-row"><div><b>행동력 가득 채우기</b><div class="muted">테스트용</div></div><button class="btn small ghost" id="fill">채우기</button></div>` : ''}
      <div class="settings-row"><div><b>효과음</b><div class="muted">누르기·거두기·공사·종소리 같은 소리</div></div><button class="btn small ${Sound.pref.sfx ? '' : 'ghost'}" id="snd">${Sound.pref.sfx ? '켜짐' : '꺼짐'}</button></div>
      <div class="settings-row"><div><b>목소리</b><div class="muted">인물마다 다른 목소리로 말을 읽어 줘요 · 목소리는 AI(Supertonic 3)로 만든 음성이에요</div></div><button class="btn small ${Sound.pref.voice ? '' : 'ghost'}" id="vc">${Sound.pref.voice ? '켜짐' : '꺼짐'}</button></div>
      <div class="settings-row"><div><b>조작법</b><div class="muted">방향키·WASD 이동 · 스페이스/E 상호작용 · 폰은 왼쪽 아래 조이스틱</div></div></div>
      <div class="settings-row"><div><b>처음부터 다시</b><div class="muted">저장된 진행이 지워져요</div></div><button class="btn small ghost" id="rs">초기화</button></div>`,
    buttons: [{ label: '닫기' }],
  });
  document.getElementById('tm').onclick = () => {
    regenEnergy();
    if (s.pastor) tickParish();
    setTestMode(!s.testMode);
    s.lastEnergyTs = Date.now();
    closeModalThen();
    openSettings();
  };
  const fill = document.getElementById('fill');
  if (fill) fill.onclick = () => { s.energy = s.energyMax; closeModalThen(); toast('행동력을 채웠어요'); };
  document.getElementById('rs').onclick = () => { closeModalThen(); confirmReset(); };
  document.getElementById('snd').onclick = () => { Sound.pref.sfx = !Sound.pref.sfx; Sound.savePref(); closeModalThen(); openSettings(); };
  document.getElementById('vc').onclick = () => { Sound.pref.voice = !Sound.pref.voice; Sound.savePref(); if (!Sound.pref.voice) Sound.hush(); else Sound.speak(QUEST_FROM[Object.keys(QUEST_FROM)[0]][1], QUEST_FROM[Object.keys(QUEST_FROM)[0]][0]); closeModalThen(); openSettings(); };
}

function confirmReset() {
  modal({
    title: '처음부터 다시 할까요?',
    html: '<p>지금까지의 진행이 모두 지워져요.</p>',
    buttons: [
      { label: '지우고 다시 시작', onClick: () => { clearSave(); Game.state = null; } },
      { label: '취소', cls: 'ghost' },
    ],
  });
}

// ---------- 신학교 진행 ----------

function showChapterStory() {
  const s = Game.state;
  const ch = SEMINARY_CHAPTERS[s.seminary.chapter];
  s.seminary.storyShown = s.seminary.chapter;
  modal({
    title: `<span class="chapter-label">${ch.label}</span><br>${glossarize(ch.title)}`,
    html: `${ch.story.map(p => `<p>${glossarize(p)}</p>`).join('')}${ch.tip ? `<div class="tip">${ch.tip}</div>` : ''}`,
    buttons: [{ label: '시작하기' }],
  });
}

function onNextChapter() {
  const s = Game.state;
  const i = s.seminary.chapter;
  const ch = SEMINARY_CHAPTERS[i];
  if (!chapterTasksDone()) return;
  const advance = () => {
    startChapter(i + 1);
    addLog(`${SEMINARY_CHAPTERS[i + 1].label}: ${SEMINARY_CHAPTERS[i + 1].title}`);
    showChapterStory();
  };

  if (ch.firstHomily) {
    const r = finishFirstHomily();
    modal({
      title: `🎤 첫 강론 — ${r.icon} ${r.label}`,
      html: `<p>${r.comment}</p><p class="muted">본당에 가면 매달 주일미사 4번마다 이렇게 강론 판정을 받아요.</p>`,
      buttons: [{ label: '서품을 향해 →', onClick: advance }],
    });
    return;
  }
  if (ch.choice) {
    modal({
      title: ch.title,
      html: `<p>${ch.choice.text}</p>`,
      options: ch.choice.options.map(o => ({
        label: typeof o.label === 'function' ? o.label() : o.label,
        onClick: () => {
          o.effect();
          addLog(`${ch.title}: ${o.result}`);
          modal({ html: `<p>${o.result}</p>`, buttons: [{ label: '다음 과정으로 →', onClick: advance }] });
        },
      })),
      buttons: [],
    });
    return;
  }
  advance();
}

function onCurateDone() {
  const c = Game.state.curate;
  modal({
    face: 'pastor', title: `👴 ${c.pastorName} 신부님`,
    html: '<p class="serif">"청년회가 이렇게 자리를 잡다니, 수고 많았네. 오늘 교구청에서 연락이 왔어. 자네가 이제 본당 하나를 맡게 되었네."</p>',
    buttons: [{ label: '평가서 받기 →', onClick: () => finishCurate() }],
  });
}

function onToPastor() {
  startPastor();
  save(); render();
  showPastorIntro();
}

// ---------- 사목회장과의 대화 (첫 운영 안내) ----------
// v1.08: 게임 화면 위 왼쪽 아래에 사목회장 얼굴, 아래 글 상자에 말과 신부(나)의 대답 버튼

function portraitCanvas(look) {
  const c = document.createElement('canvas');
  // 머리와 상반신만 크게
  c.width = 18; c.height = 20; c.className = 'portrait';
  drawCharacter(c.getContext('2d'), 9, 29, look, 'down', 0, false);
  return c;
}

// 사목회장과의 대화 배경 그림 (v1.06): 마당에서, 살림 이야기는 사무실에서
const TALK_IMG = { vaultFull: 'talk-office', levyDue: 'talk-office', staff: 'talk-office', plan: 'talk-office', policy: 'talk-office', committee: 'talk-office' };
function startTalk(talk, onDone, img) {
  UI.talking = { talk, i: 0, onDone };
  World.keys = {};
  let el = document.getElementById('talk');
  if (!el) {
    el = document.createElement('div');
    el.id = 'talk';
    el.innerHTML = `<div class="say-face"><img src="${FACE_IMG('council')}" alt=""></div>
      <div class="modal say talk-say"><div class="say-name">${COUNCIL_NAME}</div>
        <p class="serif txt"></p>
        <div class="talk-replies"><button class="talk-reply"></button></div>
        <button class="talk-skip">안내 건너뛰기</button></div>`;
    document.body.appendChild(el);
    el.querySelector('.talk-reply').onclick = talkNext;
    el.querySelector('.talk-skip').onclick = () => { const p = Game.state.pastor; if (p.tutorial) p.tutorial.step = TUTORIAL.length; endTalk(); toast('안내를 건너뛰었어요. 아래 본당 현황에서 언제든 사목회장을 찾을 수 있어요.'); };
  }
  // v1.08: 배경 그림 대신 게임 화면 그대로, 사목회장 얼굴이 떠오른다 (img는 예전 배경 그림 이름 · 이제 쓰지 않음)
  const face = el.querySelector('.say-face img'); face.style.animation = 'none'; void face.offsetWidth; face.style.animation = '';
  el.hidden = false;
  showTalk();
}

function showTalk() {
  const t = UI.talking, el = document.getElementById('talk');
  let cur = t.talk[t.i];
  if (cur && cur[0] === 'p') { el.querySelector('.txt').innerHTML = '…'; }
  else if (cur) { el.querySelector('.txt').innerHTML = cur[1]; Sound.speak(cur[1], 'council'); }
  const next = cur && cur[0] === 'c' ? t.talk[t.i + 1] : cur;
  const reply = el.querySelector('.talk-reply');
  if (next && next[0] === 'p') { reply.innerHTML = next[1]; reply.classList.remove('plain'); }
  else { reply.innerHTML = t.i + 1 < t.talk.length ? '다음 ▸' : '네'; reply.classList.add('plain'); }
  el.querySelector('.talk-skip').hidden = !(Game.state.pastor.tutorial && Game.state.pastor.tutorial.step < TUTORIAL.length);
}

function talkNext() {
  const t = UI.talking;
  if (!t) return;
  const cur = t.talk[t.i];
  // 사목회장 말 다음이 신부의 대답이면 대답까지 함께 넘긴다
  t.i += cur && cur[0] === 'c' && t.talk[t.i + 1] && t.talk[t.i + 1][0] === 'p' ? 2 : 1;
  if (t.i >= t.talk.length) { const done = t.onDone; endTalk(); if (done) done(); return; }
  showTalk();
}

function endTalk() {
  Sound.hush();
  UI.talking = null;
  const el = document.getElementById('talk');
  if (el) el.hidden = true;
  save();
  refreshPastorHud();
  if (World.overview) $hud.innerHTML = hudHtml();
}

// 안내 진행: 1초마다, 그리고 창이 닫힐 때 확인한다
function tutorialTick() {
  const s = Game.state;
  if (!s || s.phase !== 'pastor' || !World.overview || UI.modalOpen || UI.talking || World.placing || World.pathMode) return;
  const p = s.pastor, t = p.tutorial;
  if (!t) return;
  const step = TUTORIAL[t.step];
  if (step) {
    if (t.talked !== t.step) { startTalk(step.talk, () => { t.talked = t.step; if (step.done()) tutorialTick(); }, TALK_IMG[step.id]); return; }
    if (step.done()) { t.step++; tutorialTick(); }
    return;
  }
  const tip = COUNCIL_TIPS.find(x => !t.seen[x.id] && x.when());
  if (tip) { t.seen[tip.id] = true; startTalk(tip.talk, null, TALK_IMG[tip.id]); }
}

// 안내 중: 창 안에서 눌러야 할 선택지에 "여기를 누르세요"
function markHintOption(root) {
  const st = Game.state && Game.state.phase === 'pastor' && tutorialStep();
  if (!st || !st.opts || st.done()) return;
  const opts = [...root.querySelectorAll('.opt:not([aria-disabled])')];
  for (const word of st.opts) {
    const el = opts.find(o => o.textContent.includes(word));
    if (el) { el.classList.add('hint'); el.insertAdjacentHTML('beforeend', '<span class="hint-tag">👆 여기를 누르세요</span>'); return; }
  }
}

// 안내 중: 지도에서 가리킬 건물 (화살표)
function tutorialMapHint() {
  const st = tutorialStep();
  if (!st || !st.map || st.done() || World.placing) return null;
  const p = Game.state.pastor;
  if (st.map === 'firstContainer') { const c = containers()[0]; return c && { id: c[0], text: '눌러서 공사 거들기' }; }
  if (st.map === 'freeRoom') { const c = containers().find(([, x]) => x.built && x.rooms.some(g => !g)); return c && { id: c[0], text: '교리실을 누르세요' }; }
  if (st.map === 'rectory') return { id: 'rectory', text: '사제관을 누르세요' };
  if (st.map === 'weed') {
    const ch = MAPS.solmoe.fixed[0], w = MAPS.solmoe.obstacles().filter(o => o.type === 'weed' && !MAPS.solmoe.regionAt(o.x, o.y)).sort((a, b) => Math.hypot(a.x - ch.x, a.y - ch.y - 6) - Math.hypot(b.x - ch.x, b.y - ch.y - 6))[0];
    return w && { at: [w.x + 0.5, w.y + 0.5], text: '잡초를 누르세요' };
  }
  if (st.map === 'bubble') { const x = stashList()[0]; return x && { id: x.id, text: '말풍선을 누르세요', bubble: true }; }
  return null;
}

function tutorialStep() { const t = Game.state.pastor.tutorial; return t && t.talked === t.step ? TUTORIAL[t.step] : null; }

function tutorialGo(spec) {
  if (spec === 'plot') return go('plot');
  if (spec === 'church') return go('b:church');
  if (spec === 'rectory') return go('b:rectory');
  if (spec === 'freeRoom') return freeRoomGoto();
  if (spec === 'firstContainer') { const c = containers()[0]; return c ? go(`b:${c[0]}`) : ''; }
  return '';
}

function showPastorIntro() {
  const s = Game.state;
  // 발령장을 닫으면 사목회장이 맞이하러 나온다 (tutorialTick)
  vnOverlay([
    { img: 'decree', chap: '수원교구', title: '📜 발령장', lines: [`<span class="vn-decree">${esc(s.baptism)} ${esc(s.name)} 신부를<br><b>솔뫼 본당 ${term('주임 신부')}</b>로 임명합니다.</span>`, '보좌 신부 2년을 마친 봄, 교구청에서 봉투 하나가 왔다.'], btn: '봉투를 접는다 ▸' },
    { img: 'solmoe', chap: '솔뫼 본당', title: '산골 마을의 작은 성당', lines: ['버스가 하루 네 번 다니는 산골 마을. 녹슨 컨테이너 몇 개가 성당의 전부다.', '마당 입구에서 노부부가 손을 흔든다. "신부님, 오셨어요!"'], btn: '솔뫼로 출발 ▸' },
  ], () => setTimeout(tutorialTick, 300));
}

function onOrdain() {
  ordain();
  const s = Game.state;
  const t = PASTOR_TYPES[s.curate.pastorType];
  modal({
    title: '📜 발령장',
    html: `
      <p class="serif" style="text-align:center;font-size:17px">${esc(s.baptism)} ${esc(s.name)} 신부를<br><b>${s.parish.name} ${term('보좌 신부')}</b>로 임명합니다.</p>
      <div class="tip">
        <p>👴 ${term('주임 신부')}: <b>${s.curate.pastorName} 신부</b> (${t.label})<br><span class="muted">${t.desc}</span></p>
        <p>⏳ 임기: ${CURATE_TERM}개월 · 행동력 최대 ${s.energyMax}</p>
        <p style="margin:0">이제부터 행동력은 <b>실제 시간 10분마다 1씩</b> 차올라요. 접속하지 않는 동안에도 본당은 굴러갑니다. 성당에서 <b>매일 미사</b>, 사제관에서 <b>성무일도</b>를 잊지 마세요!</p>
      </div>`,
    buttons: [{ label: '본당으로 출발 →' }],
  });
}

// ---------- 입력 처리 (HTML 버튼) ----------

document.addEventListener('click', e => {
  const termEl = e.target.closest('.term');
  const pop = document.getElementById('term-pop');
  if (termEl) {
    e.stopPropagation();
    const w = termEl.dataset.term;
    pop.innerHTML = `<b>${esc(w)}</b> — ${esc(GLOSSARY[w] || '')}`;
    pop.hidden = false;
    clearTimeout(pop.timer);
    pop.timer = setTimeout(() => { pop.hidden = true; }, 5000);
    return;
  }
  pop.hidden = true;

  const el = e.target.closest('[data-act],[data-vocation],[data-story-choice]');
  if (!el || (UI.modalOpen && !el.closest('.modal'))) return;
  el.blur(); // 스페이스가 HUD 버튼을 다시 누르지 않게

  if (el.dataset.vocation) {
    chooseVocation(VOCATIONS.find(v => v.id === el.dataset.vocation));
    save(); render();
    return;
  }
  if (el.dataset.storyChoice !== undefined) {
    storyChoose(+el.dataset.storyChoice);
    save(); render();
    return;
  }

  switch (el.dataset.act) {
    case 'start': {
      const name = document.getElementById('in-name').value.trim() || '김민준';
      const baptism = document.getElementById('in-baptism').value.trim() || '안드레아';
      Game.state = newState(name, baptism);
      save(); render();
      break;
    }
    case 'settings': openSettings(); break;
    case 'notebook': openNotebook(); break;
    case 'reset': confirmReset(); break;
    case 'toPastor': onToPastor(); break;
    case 'storyNext':
      storyNext();
      save(); render();
      if (Game.state.phase === 'pastor') showPastorIntro();
      break;
  }
});

// ---------- 시작 ----------

// 이전 버전 저장 데이터를 지금 구조에 맞춘다
function migrateSave(s) {
  // v0.80: 지도를 두 배 칸으로. 놓은 건물·조경 자리, 길, 치운 장애물 기록을 새 칸으로 옮긴다
  if (s.pastor && s.pastor.sites && s.pastor.mapGrid !== MAP_GRID) {
    const p = s.pastor, G = MAP_GRID;
    for (const st of [...Object.values(p.sites || {}), ...Object.values(p.decor || {})]) if (st.x !== undefined) { st.x *= G; st.y *= G; }
    const paths = {};
    for (const k of Object.keys(p.paths || {})) { const [x, y] = k.split(',').map(Number); for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) paths[`${x * G + i},${y * G + j}`] = true; }
    p.paths = paths;
    const re = id => { const m = /^o(\d+)_(\d+)$/.exec(id); return m ? `o${m[1] * G}_${m[2] * G}` : id; };
    const cl = {}; for (const k of Object.keys(p.cleared || {})) cl[re(k)] = true; p.cleared = cl;
    for (const j of p.jobs || []) if (j.kind === 'clear') j.key = re(j.key);
    p.mapGrid = G;
  }
  // v0.70: 본당 부지. 예전 저장은 이미 무언가를 지었거나 치웠거나 길을 놓은 구획을 산 것으로 친다
  if (s.pastor && !s.pastor.lots) {
    const p = s.pastor, own = { home: true }, mark = (x, y) => { const l = LOTS.find(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (l) own[l.id] = true; };
    for (const st of [...Object.values(p.sites || {}), ...Object.values(p.decor || {})]) if (st.x !== undefined) mark(st.x, st.y);
    for (const id of Object.keys(p.cleared || {})) { const m = id.match(/^o(\d+)_(\d+)$/); if (m) mark(+m[1], +m[2]); else { const h = (MAPS.solmoe.landHouses || []).find(q => q.id === id); if (h) mark(h.x, h.y); } }
    for (const k of Object.keys(p.paths || {})) mark(...k.split(',').map(Number));
    p.lots = own;
    p.fence = Math.min(p.fence || 0, FENCE_LEVELS.length - 1); // v1.07: 담장 5단계 → 4단계
  }
  // v0.54: 수녀님 여러 분 (sister → sisters)
  if (s.pastor) installSisterAccessor(s.pastor);
  // v0.62: 성전 안 본당은 교리실이 층으로 (한 층에 방 6개). 짓던 교리실·고치던 공사는 끝난 것으로 치고, 단체를 층에 채워 넣는다
  if (s.pastor && s.pastor.sites && (PARISHES[s.pastor.parishId] || {}).interior && Object.values(s.pastor.sites).some(x => x.kind === 'container' && !x.floor)) {
    const p = s.pastor, list = [];
    p.jobs = (p.jobs || []).filter(j => {
      const st = p.sites[j.key];
      if (j.kind === 'container' && st) { st.built = true; return false; }
      if ((j.kind === 'room' || j.kind === 'merge') && st) { st.level = Math.max(st.level || 1, j.toLevel || 1); return false; }
      return true;
    });
    const stash = { offering: 0, members: 0 };
    for (const [key, st] of Object.entries(p.sites)) if (st.kind === 'container') {
      (st.rooms || []).forEach((g, room) => { if (g) list.push({ level: st.level || 1, g, from: `${key}:${room}` }); });
      const sh = p.stash && p.stash[key]; if (sh) { stash.offering += sh.offering || 0; stash.members += sh.members || 0; delete p.stash[key]; }
    }
    const where = packFloors(p, list);
    const first = floorSitesOf(p)[0]; if (p.stash && first) p.stash[first] = stash;
    for (const j of p.jobs) if (j.kind === 'group' && where[`${j.key}:${j.room}`]) [j.key, j.room] = where[`${j.key}:${j.room}`];
    p.agenda = (p.agenda || []).filter(a => where[`${a.key}:${a.room}`]).map(a => { const [key, room] = where[`${a.key}:${a.room}`]; return { ...a, key, room }; });
  }
  // v0.39: 사목평의회 단체를 없앰 (방을 비우고 건의도 지운다)
  if (s.pastor && s.pastor.sites) {
    for (const site of Object.values(s.pastor.sites)) if (site.rooms) site.rooms = site.rooms.map(g => (g && g.type === 'council' ? null : g));
    if (s.pastor.agenda) s.pastor.agenda = s.pastor.agenda.filter(a => a.type !== 'council');
    if (s.pastor.plans) s.pastor.plans = s.pastor.plans.filter(a => a.type !== 'council');
    if (s.pastor.jobs) s.pastor.jobs = s.pastor.jobs.filter(j => !(j.kind === 'group' && j.type === 'council'));
  }
  // v0.31: 수녀님 성향·이름·신뢰, 수녀원 평판
  // v0.50: 직원 레벨·경험치
  if (s.pastor && s.pastor.crew) for (const c of s.pastor.crew) { if (!c.level) c.level = 1; if (c.xp === undefined) c.xp = 0; }
  // v0.48: 일꾼 사다리(TEAMS) → 본당 직원(crew: 관리장·사무원·사무장)
  if (s.pastor && s.phase === 'pastor' && !s.pastor.crew) {
    const roles = [null, null, 'manager', 'clerk', 'chief'], base = { manager: 1.5, clerk: 2.5, chief: 4 }, names = ['김 요셉', '이 마리아', '박 베드로'];
    s.pastor.crew = [];
    for (let i = 2; i <= (s.pastor.teams || 1); i++) { const st = s.pastor.staff && s.pastor.staff[i], role = roles[i]; if (role) s.pastor.crew.push(st ? { ...st, role } : { name: names[i - 2], age: 40, skill: 3, diligence: 3, faith: 3, wage: base[role], note: '오래 함께한 직원', role }); }
    delete s.pastor.staff;
    if (s.pastor.hiring && typeof s.pastor.hiring.role === 'number') s.pastor.hiring = null;
    s.pastor.teams = 1 + s.pastor.crew.length;
  }
  // v0.46: 벽돌 교리실부터 방이 늘어난다
  if (s.pastor && s.pastor.sites) for (const site of Object.values(s.pastor.sites)) if (site.kind === 'container' && site.rooms && site.built) { const n = ROOMS_BY_TIER[ROOM_LEVELS[site.level || 1].tier] * (site.floors === 2 ? 2 : 1); while (site.rooms.length < n) site.rooms.push(null); }
  // v0.44: 활동비 줄이기(cuts) → 단체별 지원 '적게'
  if (s.pastor && s.pastor.cuts) { s.pastor.budget = s.pastor.budget || {}; for (const k of Object.keys(s.pastor.cuts)) s.pastor.budget[k] = 'low'; delete s.pastor.cuts; }
  // v0.40: 수녀님 맡을 일(task) → 활동 범위(scope)
  if (s.pastor && s.pastor.sister && !s.pastor.sister.scope) {
    const map = { catechism: ['catechumen'], youth: ['school', 'school2', 'youth'], sacristy: ['altar'], meetings: [] };
    s.pastor.sister.scope = map[s.pastor.sister.task] || [];
    s.pastor.sister.influence = 0;
    delete s.pastor.sister.task;
  }
  if (s.pastor && s.pastor.sister && !s.pastor.sister.type) Object.assign(s.pastor.sister, { type: 'gentle', name: SISTER_NAMES[0], bond: 60, lean: 1 });
  if (s.pastor && s.pastor.convent === undefined) s.pastor.convent = SISTER.convent;
  if (s.pastor && s.pastor.gems === undefined) s.pastor.gems = GEMS.start;
  // v0.5: 본당 구조가 컨테이너 교리실로 바뀜. 예전 솔뫼 본당은 능력치를 두고 새로 부임한다
  if (s.phase === 'pastor' && s.pastor && !s.pastor.sites) startPastorFor(s);
  if (s.curate && s.curate.youthLv === undefined) { s.curate.youthLv = 1; s.curate.ready = false; }
  // v0.4: 신학교 지도가 이야기로 바뀜. 지나온 과정만큼 이야기에서 이어 간다
  if (s.phase === 'seminary') {
    const idx = [0, 0, 1, 2, 3, 4, 5][s.seminary.chapter] || 0;
    s.phase = 'story';
    s.story = { idx, result: null, quiz: null, pastorType: null };
    s.storyBonus = { offering: 0, members: 0, heart: 0 };
  }
  if (s.pastor && s.pastor.sites && !s.pastor.jobs) {
    s.pastor.jobs = s.pastor.job ? [s.pastor.job] : [];
    s.pastor.teams = 1;
    delete s.pastor.job;
  }
  if (s.pastor && s.pastor.sites && !s.pastor.daily) {
    s.pastor.daily = { day: null, attended: {}, allDone: false, committee: false };
    s.pastor.agenda = [];
  }
  if (s.pastor && !s.pastor.guide) s.pastor.guide = { council: true, container: true, group: true, sunday: true };
  // 예전 선택지가 없는 능력치(theology)를 올려 NaN이 된 저장 고치기
  if (s.stats) { for (const k of Object.keys(s.stats)) if (typeof s.stats[k] !== 'number' || isNaN(s.stats[k])) s.stats[k] = 20; delete s.stats.theology; }
  // v0.17: 사목회장과의 대화 안내. 이미 한 일은 건너뛰고, 아직 안 한 단계의 대화부터
  if (s.pastor && s.pastor.sites && !s.pastor.tutorial) {
    const g = s.pastor.guide;
    const finished = g && g.council && g.container && g.group && g.sunday;
    s.pastor.tutorial = { step: finished ? TUTORIAL.length : 0, talked: -1, collected: false, seen: {} };
    if (!finished) { const prev = Game.state; Game.state = s; while (s.pastor.tutorial.step < TUTORIAL.length - 1 && TUTORIAL[s.pastor.tutorial.step].done()) s.pastor.tutorial.step++; Game.state = prev; }
  }
  // v0.18: 안내 단계가 늘었다. 아직 안 끝난 첫 단계부터 다시 이어 간다
  if (s.pastor && s.pastor.sites && !s.pastor.cleared) s.pastor.cleared = {};
  if (s.pastor && s.pastor.sites && !s.pastor.paths) s.pastor.paths = {};
  if (s.pastor && s.pastor.tutorial && s.pastor.tutorial.v !== 3 && s.pastor.tutorial.step < TUTORIAL.length) {
    const t = s.pastor.tutorial, prev = Game.state;
    Game.state = s;
    let i = 0;
    while (i < TUTORIAL.length - 1 && TUTORIAL[i].done()) i++;
    Game.state = prev;
    if (i !== t.step) { t.step = i; t.talked = -1; }
    t.v = 3;
  }
  // v0.16: 건물을 빈 칸 아무 데나 놓는다. 옛 자리(plot)의 좌표를 건물에 옮겨 적는다
  if (s.pastor && s.pastor.sites) {
    for (const [key, site] of Object.entries(s.pastor.sites)) {
      if (site.x !== undefined) continue;
      const pl = MAPS.solmoe.plots.find(q => q.id === key);
      if (pl) { site.x = pl.x; site.y = pl.y; }
    }
  }
  // v0.13: 거두기와 금고, 교구 공납금
  if (s.pastor && s.pastor.sites && !s.pastor.stash) {
    const p = s.pastor;
    p.stash = {}; p.weekIncome = 0; p.levyDue = 0; p.trust = 50;
    if (!p.fixed.office) {
      // 지금 가진 봉헌금이 들어가는 크기의 금고로 시작 (성당 레벨 + 1까지)
      let L = 1;
      while (L < p.fixed.church + 1 && VAULT[L] < p.res.offering) L++;
      p.fixed.office = L;
    }
  }
  // v0.11: 레벨을 잘게 나눴다. 옛 레벨 L은 새 레벨 2L−1
  if (s.pastor && s.pastor.sites && !s.pastor.levelScale) {
    const p = s.pastor, up = L => (L > 0 ? 2 * L - 1 : L);
    p.fixed.church = up(p.fixed.church);
    p.fixed.rectory = up(p.fixed.rectory);
    for (const site of Object.values(p.sites)) {
      if (site.kind === 'gongso') { site.level = up(site.level); continue; }
      if (site.level) site.level = up(site.level);
      for (const g of site.rooms) if (g && g.level) g.level = up(g.level);
    }
    for (const j of p.jobs) if (j.toLevel > 1) j.toLevel = up(j.toLevel);
    s.energyMax = rectoryEnergy(p.fixed.rectory);
    p.levelScale = 2;
  }
}

function startPastorFor(s) {
  const keep = Game.state;
  Game.state = s;
  startPastor();
  Game.state = keep;
}

function boot() {
  World.isPaused = () => UI.modalOpen || !!UI.talking;
  World.onTargetChange = updatePrompt;
  worldInit(onInteract);
  World.onCollect = id => { if (!UI.modalOpen) doCollect(id); };
  World.onTap = onWorldTap;
  World.onPlaceMove = movePlacing;
  World.onLongPress = startMoving;
  World.onPathTap = onPathTap;
  World.onPathMove = onPathMove;
  document.addEventListener('click', e => {
    const el = e.target.closest('#hud [data-goto]');
    if (el) { e.stopPropagation(); questGoto(el.dataset.goto); return; }
    if (e.target.closest('#hud [data-hudfold]')) {
      UI.hudFold = !UI.hudFold;
      try { localStorage.setItem('sungdang-hud-fold', UI.hudFold ? '1' : '0'); } catch (err) { /* 무시 */ }
      refreshPastorHud();
      return;
    }
    if (e.target.closest('#hud [data-qtoggle]')) {
      UI.questOpen = !UI.questOpen;
      try { localStorage.setItem('sungdang-quest-open', UI.questOpen ? '1' : '0'); } catch (err) { /* 무시 */ }
      refreshPastorHud();
      return;
    }
    const bar = e.target.closest('#hud [data-bar]');
    if (bar) { onBarButton(bar.dataset.bar); return; }
    if (e.target.closest('#hud [data-collect]') && !UI.modalOpen) doCollect(null);
    if (e.target.closest('#hud [data-qgoal]') && !UI.modalOpen) openGoalModal();
    { const qe = e.target.closest('#hud [data-quest]'); if (qe && !UI.modalOpen) onQuestTap(qe.dataset.quest); }
    { const be = e.target.closest('#hud [data-bless-i]'); if (be && !UI.modalOpen) openBlessScene(+be.dataset.blessI); }
    if (e.target.closest('#hud [data-qlist]') && !UI.modalOpen) openQuestModal();
    if (e.target.closest('#hud [data-qmore]') && !UI.modalOpen) openTaskList();
    if (e.target.closest('#hud [data-plan]') && !UI.modalOpen) openPlanModal(0);
    if (e.target.closest('#hud [data-org]') && !UI.modalOpen) openOrgModal();
    if (e.target.closest('#hud [data-report]') && !UI.modalOpen) openReportModal(0);
    if (e.target.closest('#hud [data-transfer]') && !UI.modalOpen) openTransferModal();
    if (e.target.closest('#hud [data-bless]') && !UI.modalOpen) openBlessings();
    if (e.target.closest('#hud [data-direction]') && !UI.modalOpen) openDirectionModal();
    if (e.target.closest('#hud [data-sister]') && !UI.modalOpen) openSisterScope((sisters().find(sis => !(sis.scope || []).length) || {}).name);
    if (e.target.closest('#hud [data-hire]') && !UI.modalOpen) openApplicants();
  });

  Game.state = loadSave();
  if (Game.state) {
    migrateSave(Game.state);
    regenEnergy();
    const idle = Game.state.phase === 'pastor' ? pastorIdleSummary(tickParish()) : applyIdle();
    save();
    if (idle.length) modal({ title: '🌙 그동안 본당에서는', html: `<ul>${idle.map(l => `<li class="small">${l}</li>`).join('')}</ul>` });

  }
  render();

  setInterval(() => {
    const s = Game.state;
    if (!s || (s.phase !== 'curate' && s.phase !== 'pastor')) return;
    const before = s.energy;
    regenEnergy();
    if (s.energy !== before) save();
    const el = document.getElementById('energy');
    if (el) el.outerHTML = energyHtml();
    if (s.phase === 'pastor') {
      const t = tickParish();
      for (const d of t.done) { Sound.sfx('done'); toast(`🏗️ ${d}`, true); }
      if (t.quests && t.quests.length) { showQuestRequest(t.quests[t.quests.length - 1]); save(); }
      if (bishopCallDue() && !UI.modalOpen && !(s.pastor.transfer.rang === s.pastor.week)) { s.pastor.transfer.rang = s.pastor.week; Sound.sfx('open'); openBishopCall(); }
      if (t.weeds) { syncWorldLayout(); save(); }
      if (t.applicants) { toast(`📨 채용 공고를 보고 지원자 ${t.applicants}명이 찾아왔어요! 사무실에서 만나 보세요`); save(); }
      if (t.dayLines && t.dayLines.length) toast(`🌅 새 날이 밝았어요. ${t.dayLines[0]}`);
      if (t.done.length || (t.dayLines && t.dayLines.length)) { save(); syncWorldLayout(); }
      const res = document.getElementById('res');
      if (res) res.outerHTML = resStripHtml();
      const q = document.getElementById('quest');
      if (q) q.outerHTML = pastorQuestHtml();
      for (const b of document.querySelectorAll('#hud .bottom-bar:not(.place-bar) [data-bar]')) b.classList.toggle('pulse', barMark(b.dataset.bar) === 'pulse');
      World.hint = tutorialMapHint();
      tutorialTick();
    }
  }, 1000);
  // 주기적으로 저장 (생산량이 쌓이므로)
  setInterval(() => { if (Game.state && Game.state.phase === 'pastor') save(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}

// 새 버전 알림 (v1.08 사용자 "업데이트가 저절로"): 공개 주소의 index.html을 가끔 다시 읽어 js 꼬리표(v=)가 지금보다 크면
// 위쪽에 "새 버전" 띠를 띄운다. 누르면 저장하고 새로 고친다 (게임을 켜 둔 채 두어도 알 수 있게)
const APP_V = +((document.querySelector('script[src*="js/ui.js"]') || {}).src || '').replace(/.*[?&]v=(\d+).*/, '$1') || 0;
async function checkUpdate() {
  if (!APP_V || location.protocol === 'file:' || document.getElementById('update-bar')) return;
  try {
    const t = await (await fetch(`index.html?u=${Date.now()}`, { cache: 'no-store' })).text();
    const v = +((t.match(/js\/ui\.js\?v=(\d+)/) || [])[1] || 0);
    if (v > APP_V) {
      const bar = document.createElement('button');
      bar.id = 'update-bar'; bar.type = 'button';
      bar.innerHTML = '✨ 새 버전이 나왔어요 · <b>눌러서 새로 고치기</b>';
      bar.onclick = () => { try { save(); } catch (e) { /* 무시 */ } location.reload(); };
      document.body.appendChild(bar);
    }
  } catch (e) { /* 인터넷이 없으면 다음에 */ }
}
setTimeout(checkUpdate, 15000);
setInterval(checkUpdate, 3 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });

boot();


// ---------- 되살린 화면: 본당 성적표·인사발령, 다이아 상점, 물품판매 ----------
// (예전에 실수로 지워져 버튼을 누르면 오류가 났다. v0.70에서 다시 넣음)
function reportCardHtml(card) {
  return `<div class="report-card"><div class="rc-grade g${card.grade}">${card.grade}</div><div><b>${card.score}점</b> · ${card.gradeText}<div class="muted">${Game.state.pastor.week}주일 동안의 사목</div></div></div>
    <table class="rc-table">${card.rows.map(r => `<tr><td>${r.icon} ${r.name}</td><td class="bar"><span style="width:${r.pts}%"></span></td><td class="v">${r.pts}</td><td class="muted small">${r.txt}</td></tr>`).join('')}</table>`;
}

function careerHtml() {
  const c = Game.state.pastor.career || [];
  return c.length ? `<h3>📜 지난 본당</h3>${dioceseMapSvg()}${c.map(x => `<div class="q-item">${x.icon} ${x.name} · ${x.weeks}주일 · 신자 ${x.members}명 · <b>${x.grade}</b> (${x.score}점)</div>`).join('')}` : '';
}
// v1.10 교구 지도 (미리 보기): 거쳐 간 본당과 지금 본당을 길로 잇는다. 발령받을 때마다 더 큰 동네로
function dioceseMapSvg() {
  const p = Game.state.pastor, c = p.career || [], cur = PARISHES[p.parishId] || {};
  const stops = [...c.map(x => ({ icon: x.icon, name: x.name, sub: `${x.grade} · 신자 ${x.members}`, past: true })), { icon: cur.icon || '⛪', name: cur.name || '지금 본당', sub: '지금 사목 중', past: false }].slice(-5);
  const n = stops.length, X = i => 40 + i * (260 / Math.max(1, n - 1)), Y = i => 120 - i * (60 / Math.max(1, n - 1)) + (i % 2 ? 18 : 0);
  const path = stops.map((_, i) => `${i ? 'L' : 'M'}${X(i).toFixed(0)} ${Y(i).toFixed(0)}`).join(' ');
  return `<svg class="diocese-map" viewBox="0 0 340 180" role="img" aria-label="교구 지도: 거쳐 간 본당과 지금 본당">
    <rect x="0" y="0" width="340" height="180" rx="14" fill="#cfe6a8"/><path d="M0 140 Q60 100 110 130 T230 110 T340 80 V180 H0Z" fill="#b9d98e"/>
    <path d="M14 40 l20 -28 20 28z M44 46 l16 -22 16 22z M292 34 l18 -24 18 24z" fill="#7fae6a"/>
    <path d="${path}" fill="none" stroke="#e9cf96" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    ${stops.map((st, i) => `<g><circle cx="${X(i).toFixed(0)}" cy="${Y(i).toFixed(0)}" r="${st.past ? 13 : 16}" fill="${st.past ? '#fbf4e2' : '#ffe08a'}" stroke="${st.past ? '#4f8f45' : '#7c3527'}" stroke-width="3"/><text x="${X(i).toFixed(0)}" y="${(Y(i) + 5).toFixed(0)}" font-size="13" text-anchor="middle">${st.icon}</text><text x="${X(i).toFixed(0)}" y="${(Y(i) + 30).toFixed(0)}" font-size="10.5" font-weight="700" text-anchor="middle" fill="#3b2a1f">${st.name.replace(/ 본당$/, '')}</text><text x="${X(i).toFixed(0)}" y="${(Y(i) + 43).toFixed(0)}" font-size="9.5" text-anchor="middle" fill="${st.past ? '#4f8f45' : '#7c3527'}">${st.sub}</text></g>`).join('')}
  </svg>`;
}

function parishCardSub(id) {
  const d = PARISHES[id], st = d.start;
  return `${d.desc}<br>👥 ${st.members}명 · 💰${st.offering} · ❤️${st.heart} · ⛪ 성당 Lv${st.church}에서 시작`;
}

// 인사발령 시즌 주교님 전화: 안부를 물으시면 신부가 이동이나 조금 더 머물기를 청한다
function openBishopCall() {
  const p = Game.state.pastor, t = p.transfer, weeks = t.notice || TRANSFER.weeks;
  const ask = t.stayed ? BISHOP_CALL.again : questRun(p) ? BISHOP_CALL.first : BISHOP_CALL.other;
  const reply = (go) => setTimeout(() => {
    answerBishop(go); save(); render();
    modal({ face: 'diocese', who: '교구장 주교님 · 📞 전화', title: '📞 주교님 전화', html: `<p class="serif">"${go ? BISHOP_CALL.go : BISHOP_CALL.stay}"</p>
      <p class="muted">${go ? `${weeks}주일 뒤 인사발령 공문이 와요. 그동안 본당을 잘 정리하고 성적을 올려 보세요.` : `임기가 ${TRANSFER.stayWeeks}주일 늘었어요. 끝나기 ${weeks}주일 전에 주교님께서 다시 전화하세요.`}</p>` });
  }, 0);
  modal({
    face: 'diocese', who: '교구장 주교님 · 📞 전화', title: '📞 주교님 전화',
    html: `<p class="serif">"${ask}"</p><p class="muted">주교님께 말씀드려요</p>`,
    options: [
      { label: `🙏 "${BISHOP_CALL.replyGo}"`, sub: `이동해요 · ${weeks}주일 뒤 성적표를 보고 다음 본당이 정해져요`, onClick: () => reply(true) },
      { label: `⛪ "${BISHOP_CALL.replyStay}"`, sub: `임기가 ${TRANSFER.stayWeeks}주일 늘어요 · 그동안 짓고 키워 성적을 올리면 더 좋은 곳을 제안받아요`, onClick: () => reply(false) },
    ],
    buttons: [],
  });
}
function openTransferModal() {
  const p = Game.state.pastor, card = reportCard();
  if (bishopCallDue()) { openBishopCall(); return; }
  if (!transferReady()) {
    modal({
      title: '📜 본당 성적표',
      html: `${reportCardHtml(card)}
        <p class="small">${p.transfer ? `인사발령까지 <b>${transferWeeksLeft()}주일</b> 남았어요. 그동안 성적을 더 올려 보세요.` : (questRun() ? `첫 본당 퀘스트 <b>${FIRST_QUESTS.length}개</b>를 모두 마치면 교구에서 인사발령 공문이 와요 (지금 ${questDoneCount()}개).` : `성당이 <b>Lv${TRANSFER.church}</b>까지 자라면 교구에서 인사발령 공문이 와요.`) + ' 그때 이 성적표로 다음 본당이 정해져요.'}</p>
        <p class="muted">더 좋은 본당일수록 조건이 높아요: ${['city', 'newtown', 'harbor'].map(id => `${PARISHES[id].icon} ${PARISHES[id].kind} (${transferNeedText(id)})`).join(' · ')} · 🏝️ 섬 본당은 언제나</p>${careerHtml()}`,
    });
    return;
  }
  const offers = transferOffers(card);
  modal({
    face: 'diocese', who: '교구장 주교님', title: '📜 인사발령',
    html: `<p class="serif">"${p.name}에서 수고 많으셨습니다. 신부님의 사목을 살펴보고 다음 본당을 생각해 보았어요."</p>${reportCardHtml(card)}
      <p class="small">주교님이 제안하신 본당 가운데 원하시는 곳을 말씀드리세요.</p>`,
    options: [
      ...offers.map(id => ({ tile: true, label: `${PARISHES[id].icon} ${PARISHES[id].name}`, tileSub: PARISHES[id].kind, sub: parishCardSub(id), onClick: () => setTimeout(() => confirmTransfer(id), 0) })),
    ],
    buttons: [{ label: '나중에 정하기', cls: 'ghost' }],
  });
}

function confirmTransfer(id) {
  const d = PARISHES[id], p = Game.state.pastor;
  modal({
    title: `${d.icon} ${d.name}(으)로 갈까요?`,
    html: `<p class="small">${d.desc}</p>
      <p class="small">✅ 그대로 이어져요: 사제 능력치, 교구 신뢰, 수녀원 평판, 💎 다이아 ${p.gems || 0}개, 지난 본당 기록</p>
      <p class="small">🔄 새로 시작해요: 건물(성당 Lv${d.start.church}부터), 교리실과 단체, 일꾼, 수녀님, 봉헌금</p>
      <p class="muted">${p.name} 교우들과는 작별이에요. 되돌릴 수 없어요.</p>`,
    options: [{ label: `🚚 ${d.name}(으)로 부임하기`, onClick: () => setTimeout(() => doTransfer(id), 0) }],
    buttons: [{ label: '다시 생각하기', cls: 'ghost' }],
  });
}

function doTransfer(id) {
  const s = Game.state, from = s.pastor.name;
  const rec = moveParish(id);
  save();
  worldRebuild();
  refreshPastorHud();
  const d = PARISHES[id];
  modal({
    title: '✝️ 임명장',
    html: `<p class="serif" style="text-align:center;font-size:17px">${esc(s.baptism)} ${esc(s.name)} 신부를<br><b>${d.name} ${term('주임 신부')}</b>로 임명합니다.</p>
      <p class="small" style="text-align:center">${from} 교우들이 눈물로 배웅했어요 · 성적 <b>${rec.grade}</b> (${rec.score}점)</p>
      <p class="muted" style="text-align:center">${d.desc}</p>`,
    buttons: [{ label: `${d.short}(으)로 출발 →` }],
  });
}

function openGemShop() {
  const fmtWon = n => n.toLocaleString('ko-KR');
  modal({
    title: `💎 다이아 상점 · 가진 다이아 ${gems()}개`,
    html: `<div class="shop-hero" style="background-image:url(${STORY_IMG('shop-gems')})"><span>💎 다이아 상점</span></div><p class="small">다이아로 공사를 기다리지 않고 바로 끝낼 수 있어요. 남은 1시간은 다이아 약 21개예요.</p>
      <p class="muted">빈터의 잡초·돌·나무를 치우다 보면 가끔 다이아를 주워요.</p>
      <p class="muted">⚠️ 시험판이라 실제 결제는 아직 연결되어 있지 않아요. 앱으로 출시할 때 구글 플레이·앱스토어 결제와 연결해요. 지금은 눌러도 돈이 나가지 않고 시험용 다이아를 받아요.</p>`,
    options: GEM_PACKS.map(g => ({ tile: true, label: `💎 ${fmtWon(g.gems)}개`, tileSub: `₩${fmtWon(g.won)}${g.tag ? ` · ${g.tag}` : ''}`, sub: `${g.name} · ₩${fmtWon(g.won)} (시험판: 무료로 받기)`,
      onClick: () => { addGems(g.gems); addLog(`💎 시험용 다이아 ${g.gems}개를 받았어요`); toast(`💎 다이아 ${fmtWon(g.gems)}개를 받았어요 (시험판 · 결제 없음)`); } })),
    buttons: [{ label: '💰👥 다이아로 봉헌금·신자 사기', onClick: () => setTimeout(openGoldShop, 0) }, { label: '닫기' }],
  });
}

// v1.07: 다이아 → 봉헌금
function openGoldShop() {
  const p = Game.state.pastor, room = Math.max(0, Math.floor(vaultCap() - p.res.offering)), seatRoom = Math.max(0, Math.floor(churchSeats() - p.res.members));
  modal({
    title: `💎 다이아로 사기 · 가진 다이아 ${gems()}개`,
    html: `<div class="shop-duo"><div class="shop-hero" style="background-image:url(${STORY_IMG('shop-gold')})"><span>💰 봉헌금</span></div><div class="shop-hero" style="background-image:url(${STORY_IMG('shop-members')})"><span>👥 새 신자</span></div></div><p class="small">다이아로 봉헌금을 채우거나 새 신자를 모셔요. 본당이 클수록 받는 양도 늘어요.</p>
      <p class="muted">금고: 💰 ${Math.floor(p.res.offering)} / ${vaultCap()} (남은 자리 ${room}만 원) · 신자: 👥 ${Math.floor(p.res.members)} / ${churchSeats()} (남은 자리 ${seatRoom}명). 넘는 몫은 못 받아요 · 사무실을 올리면 금고가, 성당을 올리면 자리가 커져요</p>`,
    options: [...GOLD_PACKS.map((g, i) => { const amt = goldPackAmount(g), short = gems() < g.gems;
      return { tile: true, label: `💰 ${amt.toLocaleString('ko-KR')}만 원`, tileSub: `💎${g.gems}${g.tag ? ` · ${g.tag}` : ''}`,
        sub: `${g.name} · 봉헌 약 ${g.hours}시간어치${amt > room ? ` · 금고에 ${room}만 원만 들어가요` : ''}${short ? ' · 다이아가 모자라요 (눌러서 상점)' : ''}`,
        onClick: () => { const r = buyGold(i); if (!r) return;
          if (r.short) { Sound.sfx('error'); setTimeout(openGemShop, 0); return; }
          if (r.full) { toast('🔒 금고가 가득 찼어요. 먼저 봉헌금을 쓰거나 사무실을 올려요'); return; }
          Sound.sfx('coin'); toast(`💰 다이아 ${g.gems}개로 봉헌금 ${r.got}만 원을 채웠어요`, true); save(); } }; }),
      ...MEMBER_PACKS.map((g, i) => { const amt = memberPackAmount(g), short = gems() < g.gems;
        return { tile: true, label: `👥 신자 ${amt}명`, tileSub: `💎${g.gems}${g.tag ? ` · ${g.tag}` : ''}`,
          sub: `${g.name}${amt > seatRoom ? ` · 자리가 ${seatRoom}명뿐이에요` : ''}${short ? ' · 다이아가 모자라요 (눌러서 상점)' : ''}`,
          onClick: () => { const r = buyMembers(i); if (!r) return;
            if (r.short) { Sound.sfx('error'); setTimeout(openGemShop, 0); return; }
            if (r.full) { toast('🔒 성당 자리가 가득 찼어요. 성당을 올리면 자리가 늘어요'); return; }
            Sound.sfx('meet'); toast(`👥 다이아 ${g.gems}개로 새 신자 ${r.got}명을 모셨어요`, true); save(); } }; })],
    buttons: [{ label: '💎 다이아 상점', onClick: () => setTimeout(openGemShop, 0) }, { label: '닫기' }],
  });
}

function openShopMenu(e) {
  const st = shopState(), per = (item, rate) => r1(6 * e * shopIncomeMult(item, rate));
  const heartTxt = v => v > 0 ? `<span class="gain">❤️ 마음 +${v}</span>` : v < 0 ? `<span class="loss">❤️ 마음 ${Math.round(v * 10) / 10}</span>` : '❤️ 그대로';
  modal({
    title: '🛒 물품판매 · 무엇을 팔까요?',
    html: `<p class="small">지금: ${SHOP_ITEMS[st.item].icon} <b>${SHOP_ITEMS[st.item].name}</b> · 원가에 <b>${Math.round(st.markup * 100)}%</b> 붙여 팔아요 → 💰${per()}/시간 · ${heartTxt(shopHeart())}</p>`,
    options: Object.entries(SHOP_ITEMS).map(([k, it]) => ({ tile: true, label: `${it.icon} ${it.name}`, tileSub: `💰${per(k)}/시간${k === st.item ? ' · 지금' : ''}`, sub: it.desc,
      onClick: () => setTimeout(() => chooseMarkup(k), 0) })),
  });
  function chooseMarkup(k) {
    const it = SHOP_ITEMS[k];
    modal({
      title: `${it.icon} ${it.name} · 원가에 얼마를 붙일까요?`,
      html: `<p class="small">많이 붙일수록 남는 돈은 많지만 덜 팔리고, 교우들이 "성당이 장사한다"며 마음을 잃어요. 조금 붙이면 마음은 얻지만 이익이 줄어요.</p>`,
      options: SHOP_MARKUPS.map(m => ({ tile: true, label: `${Math.round(m.rate * 100)}% ${m.name}`, tileSub: `💰${per(k, m.rate)}/시간`, sub: `💰${per(k, m.rate)}만 원/시간 · ${heartTxt(shopHeart(k, m.rate))} (마음 목표)`,
        onClick: () => { st.item = k; st.markup = m.rate; addLog(`🛒 물품판매: ${it.name}, 원가에 ${Math.round(m.rate * 100)}% 붙여 팔기`); toast(`🛒 ${it.name}을(를) 원가에 ${Math.round(m.rate * 100)}% 붙여 팔아요`); } })),
    });
  }
}

// 단추를 누를 때 살짝 딸깍 (v1.06)
document.addEventListener('pointerdown', e => { if (e.target.closest('button:not(:disabled), .opt, [data-goto]')) Sound.sfx('tap'); }, true);
// v1.08 사용자 "사무실을 누르는데 사목 방향이 떠", "건물 위 화살표가 안 눌려": 지도를 손가락으로 누르면(pointerup) 창이 뜨고,
// 브라우저가 곧이어 같은 자리에 보내는 click이 새 창의 단추(사목 방향·닫기 등)를 눌러 버렸다 → 창이 뜬 직후(0.35초)의 click은 버린다
document.addEventListener('click', e => { if (UI.modalAt && Date.now() - UI.modalAt < 350 && e.target.closest('#modal-root')) { e.stopPropagation(); e.preventDefault(); } }, true);
