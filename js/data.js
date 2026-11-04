// 게임 데이터: 용어, 성소 계기, 신학교 챕터, 행동, 승인 요청, 이벤트, 복음 주제
// 효과 함수 안의 gain/addParish/addHidden/addPastor 등은 engine.js에 정의되어 있다.

const STAT_NAMES = {
  homily: '강론력',
  doctrine: '교리·신학',
  rapport: '친화력',
  admin: '행정',
  spirit: '영성',
};

const STAT_ICONS = { homily: '🗣️', doctrine: '📖', rapport: '🤝', admin: '🗂️', spirit: '🕯️' };

// 교회 용어 설명 (일반인도 이해할 수 있게)
const GLOSSARY = {
  '예비 신학생': '신학교 입학을 준비하며 성소(사제가 되라는 부르심)를 식별하는 학생이에요.',
  '신학교': '가톨릭 사제가 되기 위해 공부하고 기도하며 공동체 생활을 하는 학교예요.',
  '성소': '하느님께서 특별한 삶(사제, 수도자 등)으로 부르시는 것을 말해요.',
  '성무일도': '하루의 정해진 시간마다 시편과 성경으로 바치는 교회의 공적인 기도예요. 사제는 매일 바쳐요.',
  '착의식': '신학생이 처음으로 수단(사제들이 입는 검은 긴 옷)을 입는 예식이에요.',
  '독서직': '미사 중 성경을 봉독하고 신자들의 신앙 교육을 돕는 직무예요.',
  '시종직': '제단에서 사제를 돕고 성체를 나누는 일을 돕는 직무예요.',
  '부제품': '사제가 되기 전 단계로, 부제가 되어 강론과 세례, 혼인 주례 등을 할 수 있어요.',
  '사제서품': '주교가 안수하여 사제로 세우는 예식이에요.',
  '보좌 신부': '본당에서 주임 신부를 도와 일하는 신부예요. 보통 청년·주일학교를 맡아요.',
  '주임 신부': '본당을 책임지는 신부예요. 재정, 인사, 공사 등 본당 운영 전체를 결정해요.',
  '본당': '일정 지역의 신자들이 모이는 기본 공동체이자 그 성당이에요.',
  '강론': '미사 중 성경 말씀을 풀어 신자들에게 전하는 말씀이에요. 다른 종교의 설교와 비슷해요.',
  '사목회': '본당 신자 대표들이 모여 주임 신부와 함께 본당 운영을 의논하는 모임이에요.',
  '병자성사': '병들거나 나이 든 신자에게 기름을 바르고 기도하는 성사예요.',
  '교무금': '신자들이 본당 운영을 위해 매달 정기적으로 내는 헌금이에요.',
  '전례 시기': '교회의 1년 달력이에요. 대림·성탄·사순·부활·연중 시기로 나뉘어요.',
  '피정': '일상을 떠나 조용한 곳에서 기도하며 영적으로 쉬고 돌아보는 시간이에요.',
  '첫 미사': '새 사제가 서품 후 처음으로 집전하는 미사예요.',
  '공소': '신부가 상주하지 않는 작은 신자 공동체예요. 공소 회장이 기도 모임을 이끌고, 신부는 가끔 찾아가 미사를 드려요.',
  '레지오 마리애': '성모님을 본받아 기도하고 이웃을 찾아가 돕는 신자 단체예요.',
  '빈첸시오회': '가난하고 어려운 이웃을 돕는 신자 봉사 단체예요.',
  '예비신자': '세례를 받기 위해 교리를 배우는 사람이에요. 보통 6개월쯤 배우고 세례를 받아요.',
  '분가': '본당이 커지면 일부 지역을 떼어 새 본당을 세우는 일이에요.',
  '사목평의회': '본당의 여러 단체 대표가 모여 주임 신부와 함께 본당 일을 의논하는 모임이에요.',
  '구역·반': '본당 신자들을 사는 동네별로 묶은 작은 모임이에요. 소식을 나누고 서로 돌봐요.',
};

// 성소 계기 (프롤로그)
const VOCATIONS = [
  {
    id: 'pastor',
    icon: '⛪',
    title: '본당 신부님을 보며',
    desc: '어릴 적 우리 본당 신부님은 늘 웃으며 사람들을 맞아 주셨다. 나도 그런 사람이 되고 싶었다.',
    stats: { rapport: 18, homily: 8 },
  },
  {
    id: 'altar',
    icon: '🕯️',
    title: '복사 활동을 하며',
    desc: '제대 곁에서 미사를 도우며, 그 고요한 순간에 마음이 끌렸다.',
    stats: { spirit: 18, homily: 6 },
  },
  {
    id: 'books',
    icon: '📚',
    title: '책과 공부를 통해',
    desc: '교부들의 글과 신학 책을 읽으며, 이 진리를 평생 탐구하고 전하고 싶어졌다.',
    stats: { doctrine: 18, admin: 6 },
  },
  {
    id: 'trial',
    icon: '🌱',
    title: '어려운 시기에 신앙을 만나',
    desc: '가장 힘들 때 나를 붙잡아 준 것은 성당 공동체였다. 이제 내가 누군가를 붙잡아 주고 싶다.',
    stats: { rapport: 8, spirit: 10 },
    hidden: { holiness: 8 },
  },
];

// 신학교 챕터 (튜토리얼)
const SEMINARY_CHAPTERS = [
  {
    title: '입학',
    label: '신학교 1학년',
    story: [
      '봄, 신학교 정문을 들어선다. 새벽 기상과 아침기도, 미사, 수업으로 이어지는 하루가 시작된다.',
      '사제의 삶은 기도에서 시작된다. 먼저 <b>영성</b>을 길러 보자.',
    ],
    unlock: ['pray'],
    tasks: [{ action: 'pray', count: 2 }],
    tip: '🕯️ <b>영성</b>은 모든 행동의 효율을 정해요. 70 이상이면 모든 성장이 1.2배, 30 미만이면 0.7배가 되고 번아웃 위험이 생겨요.',
    choice: {
      text: '첫 학기 말, 영성 지도 신부님이 묻는다. "신학교 생활에서 가장 힘든 것이 무엇인가?"',
      options: [
        { label: '새벽 기상이요', result: '"몸은 곧 익숙해진다네. 마음이 먼저 깨어 있게."', effect: () => gain('spirit', 3) },
        { label: '가족이 그립습니다', result: '"그리움을 아는 사람이 신자들의 외로움도 안다네."', effect: () => gain('rapport', 3) },
        { label: '공부가 어렵습니다', result: '"모르는 것을 아는 것이 공부의 시작이지."', effect: () => gain('doctrine', 3) },
      ],
    },
  },
  {
    title: '학부 과정',
    label: '신학교 2학년',
    story: [
      '철학과 신학 수업이 본격적으로 시작된다. 교리를 깊이 알아야 신자들에게 바르게 전할 수 있다.',
    ],
    unlock: ['study'],
    tasks: [{ action: 'study', count: 2 }, { action: 'pray', count: 1 }],
    tip: '⚡ 행동마다 <b>행동력</b>이 들어요. 본당에 가면 행동력은 실제 시간 10분마다 1씩 차올라요. 신학교에서는 과정이 바뀔 때마다 가득 채워져요.',
    choice: {
      text: '기말시험 전날 밤, 동기 정 미카엘이 공부를 도와 달라고 찾아왔다.',
      options: [
        { label: '함께 밤새 공부한다', result: '둘 다 시험을 무사히 마쳤다. 미카엘이 고마워한다.', effect: () => { gain('rapport', 3); gain('doctrine', 1); } },
        { label: '내 공부에 집중한다', result: '시험은 잘 봤지만, 미카엘의 얼굴이 어두웠다.', effect: () => { gain('doctrine', 4); addHidden('ambition', 2); } },
      ],
    },
  },
  {
    title: '착의식',
    label: '신학교 3학년',
    story: [
      '처음으로 수단을 입는 날. 거울 앞에 선 모습이 낯설다. 이 옷의 무게만큼 사람들 곁에 서야 한다.',
      '동기들, 선배들과의 관계도 사제 생활의 큰 힘이 된다.',
    ],
    unlock: ['talk'],
    tasks: [{ action: 'talk', count: 2 }],
    tip: '🤝 <b>친화력</b>은 신자들과의 관계, 갈등 해결, 나중에 동료 사제들의 인정을 받는 데 쓰여요.',
    choice: {
      text: '착의식에 오신 어머니가 수단 입은 모습을 보고 눈물을 흘리신다.',
      options: [
        { label: '꼭 안아 드린다', result: '"잘 커 줘서 고맙다." 어머니의 기도가 큰 힘이 된다.', effect: () => { gain('spirit', 3); addHidden('holiness', 2); } },
        { label: '웃으며 사진을 찍는다', result: '오래 간직할 사진이 생겼다.', effect: () => gain('rapport', 3) },
      ],
    },
  },
  {
    title: '방학 본당 실습',
    label: '신학교 4학년',
    story: [
      '방학 동안 한 본당에 가서 실습을 한다. 주일학교 아이들 교리를 맡게 되었다.',
      '본당은 책에서 배운 것과 많이 다르다. 사람을 만나는 일이 곧 사목이다.',
    ],
    unlock: ['catechism'],
    tasks: [{ action: 'catechism', count: 2 }, { action: 'talk', count: 1 }],
    tip: '📋 본당에서는 행동마다 본당 지표(참례율, 단체 활성도 등)도 함께 움직여요.',
    choice: {
      text: '교리 시간에 한 아이가 묻는다. "신부님(?)은 왜 결혼 안 해요?"',
      options: [
        { label: '진지하게 설명한다', result: '아이가 고개를 끄덕인다. 생각보다 어려운 질문이었다.', effect: () => gain('doctrine', 3) },
        { label: '"하느님이랑 약속했거든!"', result: '아이들이 까르르 웃는다. 금세 친해졌다.', effect: () => gain('rapport', 3) },
      ],
    },
  },
  {
    title: '독서직·시종직',
    label: '신학교 5~6학년',
    story: [
      '독서직과 시종직을 받고, 제대 가까이에서 전례를 돕는다.',
      '곧 강론을 하게 된다. 말씀을 전하는 연습을 시작하자.',
    ],
    unlock: ['practice'],
    tasks: [{ action: 'practice', count: 2 }, { action: 'study', count: 1 }],
    tip: '🗣️ <b>강론력</b>은 주일미사 강론 판정에 쓰여요. 감동적인 강론은 미사 참례율과 평판을 올려요.',
    choice: {
      text: '강론 연습 시간, 교수 신부님이 내 원고에 빨간 펜을 잔뜩 그었다.',
      options: [
        { label: '처음부터 다시 쓴다', result: '세 번을 고쳐 쓰고 나서야 칭찬을 들었다.', effect: () => gain('homily', 4) },
        { label: '왜 고쳐야 하는지 여쭙는다', result: '"신자들이 듣는 말로 쓰게." 한 문장이 오래 남았다.', effect: () => { gain('homily', 2); gain('doctrine', 2); } },
      ],
    },
  },
  {
    title: '부제품',
    label: '신학교 7학년',
    story: [
      '부제품을 받았다. 이제 미사에서 직접 강론을 할 수 있다.',
      '실습 본당에서 첫 강론을 하게 되었다. 이번 주 복음에 맞는 주제를 골라 강론을 준비하자.',
    ],
    unlock: ['prep'],
    tasks: [{ action: 'prep', count: 1 }],
    tip: '✍️ <b>강론 준비</b>에서는 복음에 맞는 주제를 고르면 준비 점수가 크게 올라요. 준비 점수는 그달 주일미사 강론 판정에 더해져요.',
    firstHomily: true,
  },
  {
    title: '사제서품',
    label: '서품',
    story: [
      '주교님의 안수로 사제가 되었다. 엎드려 성인 호칭 기도를 듣는 동안, 지나온 모든 시간이 스쳐 간다.',
      '첫 미사를 마치고, 교구장 주교님의 발령장이 도착했다.',
    ],
    unlock: [],
    tasks: [],
    ordination: true,
  },
];

// 행동 목록. phases: 쓸 수 있는 단계
const ACTIONS = [
  {
    id: 'pray', icon: '🙏', name: '기도', cost: 1, phases: ['seminary', 'curate', 'pastor'],
    desc: '성체 앞에서 조용히 기도한다.',
    run: () => `영성 ${fmt(gain('spirit', 3))}`,
  },
  {
    id: 'study', icon: '📖', name: '공부', cost: 3, phases: ['seminary', 'curate', 'pastor'],
    desc: '신학 책과 교회 문헌을 읽는다.',
    run: () => `교리·신학 ${fmt(gain('doctrine', 4))}`,
  },
  {
    id: 'talk', icon: '☕', name: '동기들과 대화', cost: 2, phases: ['seminary'],
    desc: '동기, 선배들과 이야기를 나눈다.',
    run: () => `친화력 ${fmt(gain('rapport', 3))}`,
  },
  {
    id: 'catechism', icon: '🧒', name: '주일학교 교리', cost: 2, phases: ['seminary', 'curate'],
    desc: '주일학교 아이들에게 교리를 가르친다.',
    run: () => {
      const g = gain('doctrine', 1.5);
      const r = gain('rapport', 1.5);
      let msg = `교리·신학 ${fmt(g)}, 친화력 ${fmt(r)}`;
      if (Game.state.phase === 'curate') {
        msg += `, 주일학교 ${fmt(addGroup('school', 2.5))}`;
        markMonthly('school');
      }
      return msg;
    },
  },
  {
    id: 'practice', icon: '🗣️', name: '강론 연습', cost: 2, phases: ['seminary', 'curate', 'pastor'],
    desc: '빈 성당에서 소리 내어 강론을 연습한다.',
    run: () => `강론력 ${fmt(gain('homily', 3))}`,
  },
  {
    id: 'prep', icon: '✍️', name: '강론 준비', cost: 3, phases: ['seminary', 'curate', 'pastor'],
    desc: '이번 주 복음을 묵상하고 강론 원고를 쓴다. (주제 고르기)',
    minigame: 'homily',
  },
  {
    id: 'visit', icon: '🏠', name: '가정 방문', cost: 2, phases: ['curate'],
    desc: '신자 가정을 찾아가 축복하고 이야기를 듣는다.',
    run: () => {
      const r = gain('rapport', 2.5);
      const a = addParish('attendance', 0.1);
      return `친화력 ${fmt(r)}, 참례율 ${fmt(a)}%p`;
    },
  },
  {
    id: 'sick', icon: '🤲', name: '병자 방문', cost: 2, phases: ['curate'],
    desc: '아픈 신자를 찾아가 병자성사를 드린다.',
    run: () => {
      addHidden('holiness', 2);
      const s = gain('spirit', 1);
      const p = addParish('reputation', 1);
      return `영성 ${fmt(s)}, 평판 ${fmt(p)} (마음이 따뜻해진다)`;
    },
  },
  {
    id: 'youth', icon: '🎸', name: '청년회 모임', cost: 2, phases: ['curate'],
    desc: '청년들과 모임을 하고 고민을 듣는다.',
    run: () => {
      markMonthly('youth');
      const y = addGroup('youth', 3);
      const r = gain('rapport', 1.5);
      return `청년회 ${fmt(y)}, 친화력 ${fmt(r)}`;
    },
  },
  {
    id: 'pastorMeal', icon: '🍚', name: '주임 신부와 식사', cost: 2, phases: ['curate'],
    desc: '주임 신부님과 식사하며 본당 이야기를 나눈다.',
    run: () => `주임 신부 관계 ${fmt(addPastor(4))}`,
  },
  {
    id: 'office', icon: '🗂️', name: '사무 처리', cost: 3, phases: ['curate'],
    desc: '사무실 서류와 교적 정리를 돕는다.',
    run: () => {
      const a = gain('admin', 3.5);
      const s = Game.state;
      let msg = `행정 ${fmt(a)}`;
      if (s.curate.dumpedTasks > 0) {
        s.curate.dumpedTasks--;
        msg += ` (떠맡은 업무 1건 처리, 남은 업무 ${s.curate.dumpedTasks}건)`;
      }
      return msg;
    },
  },
  {
    id: 'retreat', icon: '⛰️', name: '하루 피정', cost: 6, phases: ['curate', 'pastor'],
    desc: '하루 동안 조용한 피정의 집에서 기도한다.',
    run: () => `영성 ${fmt(gain('spirit', 12))}`,
  },
  // ---- 주임 신부 단계 ----
  {
    id: 'pCate', icon: '📖', name: '교리 준비', cost: 3, phases: ['pastor'],
    desc: '예비신자 교리를 정성껏 준비한다. 세례식 때 더 많은 사람이 끝까지 교리를 마친다.',
    run: () => {
      const q = addCateQuality(CATE.prepGain + Game.state.stats.doctrine * 0.08);
      const d = gain('doctrine', 1.5);
      return `교리 준비 ${fmt(q)} (지금 ${Math.round(Game.state.pastor.cate.quality)}), 교리 ${fmt(d)}`;
    },
  },
  {
    id: 'pVisit', icon: '🏠', name: '가정 방문', cost: 2, phases: ['pastor'],
    desc: '교우 가정을 찾아가 축복하고 이야기를 듣는다. 신자들의 마음이 열린다.',
    run: () => {
      const r = gain('rapport', 2.5);
      const m = addRes('members', 1);
      const h = addRes('heart', 1.5);
      return `친화력 ${fmt(r)}, 신자 ${fmt(m)}, 마음 ${fmt(h)}`;
    },
  },
  {
    id: 'pSick', icon: '🤲', name: '병자 방문', cost: 2, phases: ['pastor'],
    desc: '아픈 교우를 찾아가 병자성사를 드린다.',
    run: () => {
      addHidden('holiness', 2);
      const sp = gain('spirit', 1);
      const rp = addRes('reputation', 1.5);
      return `영성 ${fmt(sp)}, 평판 ${fmt(rp)} (마음이 따뜻해진다)`;
    },
  },
  {
    id: 'pOffice', icon: '🗂️', name: '사무 처리', cost: 3, phases: ['pastor'],
    desc: '교적과 장부를 정리한다. 밀린 교무금이 정리되어 봉헌이 조금 들어온다.',
    run: () => {
      const a = gain('admin', 3.5);
      const o = addRes('offering', 8 + Game.state.stats.admin * 0.3);
      return `행정 ${fmt(a)}, 봉헌 ${fmt(o)}만 원`;
    },
  },
];

// 보좌 신부에게 잠긴 주임 신부 권한
const LOCKED_ACTIONS = [
  { icon: '💰', name: '재정 결재', reason: '주임 신부 권한 · 승인 요청으로 대신해요' },
  { icon: '🏗️', name: '공사·보수 발주', reason: '주임 신부 권한 · 건의만 할 수 있어요' },
  { icon: '👔', name: '직원 채용', reason: '주임 신부 권한' },
  { icon: '🏛️', name: '사목회 구성', reason: '주임 신부 권한' },
];

// 주임 신부에게 올리는 승인 요청
const REQUESTS = [
  {
    id: 'youthRetreat', icon: '🏕️', name: '청년 여름 수련회', budget: 80,
    desc: '청년 15명과 1박 2일 수련회를 다녀온다.',
    need: () => Game.state.parish.groups.youth >= 20,
    needText: '청년회 활성도 20 이상',
    approve: () => `청년회 ${fmt(addGroup('youth', 15))}, 친화력 ${fmt(gain('rapport', 3))}`,
  },
  {
    id: 'books', icon: '📚', name: '주일학교 교재 구입', budget: 20,
    desc: '낡은 주일학교 교재를 새로 바꾼다.',
    approve: () => `주일학교 ${fmt(addGroup('school', 10))}`,
  },
  {
    id: 'repair', icon: '🔧', name: '교육관 누수 보수 건의', budget: 300,
    desc: '비가 오면 교육관 천장에서 물이 샌다.',
    approve: () => `건물 상태 ${fmt(addParish('building', 12))}`,
  },
  {
    id: 'youthMass', icon: '🎶', name: '청년 미사 신설', budget: 10,
    desc: '주일 저녁에 청년들을 위한 미사를 만든다.',
    need: () => Game.state.parish.groups.youth >= 40,
    needText: '청년회 활성도 40 이상',
    approve: () => `청년회 ${fmt(addGroup('youth', 10))}, 참례율 ${fmt(addParish('attendance', 0.8))}%p`,
  },
  {
    id: 'bazaar', icon: '🧺', name: '본당 바자회', budget: 30,
    desc: '바자회를 열어 이웃 돕기 기금을 마련한다.',
    approve: () => `평판 ${fmt(addParish('reputation', 5))}, 재정 ${fmt(addParish('finance', 150))}만 원`,
  },
];

// 주임 신부 성격
const PASTOR_TYPES = {
  kind: { label: '자상한 형', desc: '승인을 잘 해 주고, 곁에서 잘 가르쳐 준다.', approveBase: 0.7, growth: 1.1 },
  strict: { label: '엄격한 형', desc: '승인은 까다롭지만, 좋은 평가를 받으면 큰 힘이 된다.', approveBase: 0.35, growth: 1.0 },
  laissez: { label: '방임형', desc: '자유롭게 두지만, 도와주지도 않는다.', approveBase: 0.6, growth: 0.95 },
  dumper: { label: '일 떠넘기는 형', desc: '사무 업무를 자주 떠넘긴다. 대신 행정 경험은 많이 쌓인다.', approveBase: 0.5, growth: 1.0 },
};

const PASTOR_NAMES = ['김 베드로', '박 요셉', '이 바오로', '최 안드레아', '윤 프란치스코', '강 토마스'];
const PARISH_NAMES = ['늘봄동', '솔빛동', '새터', '한빛동', '고운뜰'];

// 강론 준비 미니게임: 복음과 알맞은 주제
const GOSPELS = [
  { title: '되찾은 아들의 비유', ref: '루카 15장', theme: '하느님의 끝없는 자비' },
  { title: '착한 사마리아인의 비유', ref: '루카 10장', theme: '누군가의 이웃이 되어 주는 사랑' },
  { title: '겨자씨의 비유', ref: '마태 13장', theme: '작은 믿음이 크게 자라남' },
  { title: '오천 명을 먹이신 기적', ref: '요한 6장', theme: '작은 나눔이 이루는 풍요' },
  { title: '열 처녀의 비유', ref: '마태 25장', theme: '깨어 준비하는 삶' },
  { title: '마르타와 마리아', ref: '루카 10장', theme: '바쁨 속에서 먼저 말씀을 듣기' },
  { title: '탈렌트의 비유', ref: '마태 25장', theme: '받은 재능을 키우는 책임' },
  { title: '엠마오로 가는 제자들', ref: '루카 24장', theme: '말씀과 빵 나눔에서 만나는 주님' },
  { title: '부자 청년', ref: '마르 10장', theme: '재물보다 주님을 따르는 자유' },
  { title: '풍랑을 가라앉히심', ref: '마르 4장', theme: '두려움 속에서도 믿음을' },
  { title: '세리 자캐오', ref: '루카 19장', theme: '회개와 새로운 시작' },
  { title: '잃은 양의 비유', ref: '루카 15장', theme: '한 사람도 포기하지 않는 사랑' },
];

// 매달 일어날 수 있는 이벤트 (보좌 신부)
const EVENTS = [
  {
    id: 'nightCall', title: '새벽의 전화',
    text: '새벽 2시, 전화가 울린다. "신부님, 어머니가 위독하세요. 병자성사를 부탁드립니다."',
    options: [
      { label: '바로 달려간다', result: '임종 직전에 병자성사를 드렸다. 가족들이 손을 꼭 잡고 고마워했다.', effect: () => { addHidden('holiness', 3); addParish('reputation', 2); spendEnergy(2); } },
      { label: '주임 신부님께 연락한다', result: '주임 신부님이 다녀오셨다. "이런 건 보좌가 먼저 움직여야지."', effect: () => addPastor(-4) },
    ],
  },
  {
    id: 'youthWorry', title: '청년의 고민',
    text: '청년회 막내가 면담을 청한다. "신부님, 요즘 성당에 나와야 할 이유를 모르겠어요."',
    cond: () => Game.state.parish.groups.youth >= 15,
    options: [
      { label: '오래 이야기를 들어 준다', result: '두 시간 동안 이야기했다. 다음 주, 그가 미사에 나왔다.', effect: () => { gain('rapport', 3); addGroup('youth', 4); } },
      { label: '좋은 책을 추천한다', result: '"읽어 볼게요." 반응은 미지근했다.', effect: () => gain('doctrine', 1) },
    ],
  },
  {
    id: 'funeral', title: '장례 미사',
    text: '오랫동안 성당을 지켜 온 할아버지 신자가 선종하셨다. 장례 미사 강론을 맡게 되었다.',
    options: [
      { label: '고인의 삶을 찾아 듣고 준비한다', result: '유가족이 강론을 들으며 많이 울었다. "아버지를 잘 아시는 것 같았어요."', effect: () => { spendEnergy(2); gain('homily', 2); addParish('attendance', 0.5); } },
      { label: '평소 원고로 준비한다', result: '무난하게 마쳤다.', effect: () => gain('homily', 0.5) },
    ],
  },
  {
    id: 'massTime', title: '사목회장의 불만',
    text: '사목회장이 찾아와 말한다. "보좌 신부님, 청년들 기타 소리가 너무 커서 어르신들이 불편해하세요."',
    cond: () => Game.state.parish.groups.youth >= 10,
    options: [
      { label: '청년들과 조율하겠다고 약속한다', result: '청년들이 조금 서운해했지만, 어르신들은 고마워했다.', effect: () => { addGroup('youth', -3); addParish('reputation', 1); gain('rapport', 1); } },
      { label: '청년들 편을 든다', result: '청년들은 신났지만, 사목회장이 주임 신부님께 이야기를 꺼냈다.', effect: () => { addGroup('youth', 4); addPastor(-3); } },
    ],
  },
  {
    id: 'teacherShort', title: '주일학교 교사 부족',
    text: '주일학교 교사 두 명이 이사를 가게 되었다. 다음 달부터 반을 맡을 사람이 없다.',
    options: [
      { label: '청년회에서 교사를 모집한다', result: '청년 둘이 손을 들었다. 교사 교육이 필요하다.', cond: () => Game.state.parish.groups.youth >= 25, effect: () => { addGroup('school', 4); addGroup('youth', 2); } },
      { label: '당분간 직접 맡는다', result: '한동안 바쁘겠지만 아이들과 더 가까워졌다.', effect: () => { spendEnergy(3); addGroup('school', 3); gain('rapport', 1); } },
    ],
  },
  {
    id: 'pastorSick', title: '주임 신부님의 몸살',
    text: '주임 신부님이 심한 몸살에 걸리셨다. 이번 주 모든 미사를 혼자 맡게 되었다.',
    options: [
      { label: '기꺼이 맡는다', result: '바쁜 한 주였지만 많이 배웠다. 신부님이 고마워하신다.', effect: () => { spendEnergy(3); gain('homily', 3); addPastor(5); } },
    ],
  },
  {
    id: 'leak', title: '비 오는 날',
    text: '장맛비에 교육관 천장에서 물이 떨어진다. 주일학교 교실이 젖었다.',
    options: [
      { label: '양동이를 놓고 청소한다', result: '급한 불은 껐다. 제대로 고치려면 주임 신부님 결정이 필요하다.', effect: () => { addParish('building', -3); gain('admin', 1); } },
    ],
  },
  {
    id: 'classmate', title: '동기 신부의 전화',
    text: '신학교 동기 정 미카엘 신부에게서 전화가 왔다. "요즘 어때? 나는 주임 신부님이랑 좀 힘들어."',
    options: [
      { label: '서로 고민을 나눈다', result: '한 시간 넘게 통화했다. 혼자가 아니라는 게 힘이 된다.', effect: () => { gain('spirit', 3); gain('rapport', 1); } },
    ],
  },
  {
    id: 'homeless', title: '사제관 문 앞의 손님',
    text: '저녁 무렵, 행색이 초라한 분이 사제관 초인종을 누른다. "밥 한 끼만 얻어먹을 수 있을까요?"',
    options: [
      { label: '함께 식사한다', result: '라면 두 그릇을 끓여 마주 앉았다. 그분이 처음으로 웃었다.', effect: () => { addHidden('holiness', 4); spendEnergy(1); } },
      { label: '근처 무료급식소를 안내한다', result: '그분은 고개를 숙이고 돌아섰다.', effect: () => {} },
    ],
  },
  {
    id: 'inflate', title: '보고서 숫자',
    text: '교구에 제출할 청년회 활동 보고서를 쓰다가, 참석 인원을 조금 늘려 적으면 좋아 보이겠다는 생각이 든다.',
    options: [
      { label: '있는 그대로 적는다', result: '숫자는 작았지만 마음은 편했다.', effect: () => addHidden('holiness', 2) },
      { label: '조금 늘려 적는다', result: '보고서가 그럴듯해 보인다. 마음 한구석이 찜찜하다.', effect: () => { addHidden('ambition', 4); gain('admin', 1); } },
    ],
  },
  {
    id: 'curiaPriest', title: '교구청 신부님',
    text: '교구 행사에서 교구청의 높은 신부님을 만났다. 동기들은 그분께 인사드리려고 줄을 섰다.',
    options: [
      { label: '나도 가서 눈도장을 찍는다', result: '"아, 그 본당 보좌 신부군." 이름을 기억해 주셨다.', effect: () => addHidden('ambition', 3) },
      { label: '혼자 온 어르신 신자 곁에 앉는다', result: '어르신이 손주 이야기를 한참 하셨다.', effect: () => { addHidden('holiness', 2); gain('rapport', 1); } },
    ],
  },
  {
    id: 'wedding', title: '혼인 상담',
    text: '청년회 출신 커플이 혼인 교리를 받으러 왔다. "신부님이 주례해 주시면 좋겠어요!"',
    cond: () => Game.state.parish.groups.youth >= 30,
    options: [
      { label: '정성껏 혼인 교리를 해 준다', result: '두 사람이 행복하게 웃는다. 혼배 미사가 기다려진다.', effect: () => { spendEnergy(2); gain('rapport', 2); addParish('reputation', 2); } },
    ],
  },
];

// 전례 시기별 표시 정보
const SEASONS = {
  advent: { name: '대림 시기', color: '#6b3fa0', note: '성탄을 기다리며 준비하는 시기' },
  christmas: { name: '성탄 시기', color: '#c9a227', note: '주님의 탄생을 기뻐하는 시기' },
  lent: { name: '사순 시기', color: '#6b3fa0', note: '회개하며 부활을 준비하는 40일' },
  easter: { name: '부활 시기', color: '#c9a227', note: '주님의 부활을 기뻐하는 50일' },
  ordinary: { name: '연중 시기', color: '#3f7a4a', note: '일상 속에서 주님을 따르는 시기' },
};

// ---------- 주임 신부 단계 (솔뫼 본당) ----------

// 보좌 신부 단계의 청년회 레벨 (활성도 조건)
const YOUTH_LEVELS = [null, { need: 0 }, { need: 30 }, { need: 50 }];

// 보좌 평가 → 첫 본당 시작 보너스
const GRADE_BONUS = {
  S: { offering: 60 },
  A: { offering: 40 },
  B: { offering: 20 },
  C: { offering: 10 },
};

// 본당 자원
// heart(신자들의 마음): 봉헌과 건축헌금, 새 신자 유입을 크게 좌우한다
const RES_INFO = {
  members: { icon: '👥', name: '신자' },
  offering: { icon: '💰', name: '봉헌금' },
  heart: { icon: '❤️', name: '신자들의 마음' },
  reputation: { icon: '🌏', name: '평판' },
};

// 컨테이너 교리실. n번째 컨테이너를 놓는 비용과 조건 (방 2개씩)
const CONTAINERS = [
  { cost: 40, min: 3, members: 0 },
  { cost: 120, min: 8, members: 150 },
  { cost: 300, min: 20, members: 220 },
  { cost: 550, min: 40, members: 320 },
  { cost: 900, min: 60, members: 450 },
  { cost: 1400, min: 90, members: 600 },
  { cost: 2000, min: 120, members: 800 },
  { cost: 2800, min: 150, members: 1000 },
  { cost: 3800, min: 180, members: 1200 },
];
const CONTAINER_ROOMS = 2;
// 성전 안 본당(도심·신도시): 교리실은 성당 건물 안 층마다 정해져 있다. 한 층에 방 6개, 모자라면 2층·3층으로 증축
// 한 층은 교리실 3동만큼 친다(성당 증축 조건·다음 증축 값). 3층까지 (CONTAINERS 0·3·6번째 값)
const FLOOR_ROOMS = 6, FLOOR_UNITS = 3, FLOOR_MAX = 3, FLOOR_COST = 2;
// 교리실 겉모습 단계(tier)마다 방 수: 컨테이너·조립식 2 → 벽돌 3 → 교육관 4 → 새 교육관 5 (2층은 두 배)
const ROOMS_BY_TIER = [0, 2, 2, 3, 4, 5];

// 레벨은 잘게 나눈다 (v0.11): 두 레벨이 옛 한 레벨만큼. 효과는 effL(L) = (L+1)/2 로 계산한다 (Lv1 1, Lv3 2, Lv5 3 …)
function effL(L) { return (L + 1) / 2; }
function r1(v) { return Math.round(v * 10) / 10; }

// 교리실 레벨: 방에 든 단체는 교리실 레벨까지만 키울 수 있다. 교리실 레벨 상한 = 성당 레벨 + 1
// tier: 겉모습 (1 컨테이너, 2 조립식, 3 벽돌, 4 교육관, 5 새 교육관)
const ROOM_TIERS = [null, '컨테이너 교리실', '조립식 교리실', '벽돌 교리실', '교육관', '새 교육관'];
const ROOM_LEVELS = [
  null,
  { tier: 1 },
  { tier: 1, cost: 40, min: 3 },
  { tier: 2, cost: 80, min: 6 },
  { tier: 2, cost: 150, min: 12 },
  { tier: 3, cost: 250, min: 20 },
  { tier: 3, cost: 420, min: 35 },
  { tier: 4, cost: 700, min: 60 },
  { tier: 4, cost: 1100, min: 90 },
  { tier: 5, cost: 1600, min: 120 },
  { tier: 5, cost: 2300, min: 160 },
].map(r => r && { ...r, name: ROOM_TIERS[r.tier] });

// 단체 회의 시간 (본당 시계 기준). 테스트 모드에서는 시계도 60배 빨리 간다
const MEETING_SLOTS = {
  morning: { name: '오전', from: 6, to: 12 },
  afternoon: { name: '오후', from: 12, to: 18 },
  evening: { name: '저녁', from: 18, to: 24 },
};

// 이 레벨부터 위원장이 회의를 이끌고, 건의사항을 상임위원회에 올린다
const CHAIR_LEVEL = 5;

// 단체 (컨테이너 교리실의 방 하나를 쓴다)
// members: 단체를 만들 수 있는 신자 수, cost: 만들기 봉헌금(만 원), min: 만들기 시간(분)
// meet(L): 단체 모임에 참석했을 때 효과
const UNITS = {
  district: {
    slot: 'evening', icon: '🏘️', name: '소공동체', members: 0, cost: 15, min: 2,
    desc: '동네별 작은 신앙 공동체. 참여하는 신자 약 20명이 한 반이 되고, 반이 10개를 넘으면 구역, 구역이 5개를 넘으면 지역으로 넓어져요. 반장·구역장·지역장이 생기고 교무금이 잘 걷혀요.', prod: L => `봉헌금 +${r1(8 * L)}/시간 · 반마다 더`,
    meet: L => `봉헌금 ${fmt(addRes('offering', 8 * L))}만 원, 마음 ${fmt(addRes('heart', 1))}`,
  },
  senior: {
    slot: 'morning', icon: '🎓', name: '노인대학', members: 300, cost: 40, min: 6,
    desc: '어르신들이 매주 모여 노래·체조·교양 강좌를 들어요. 마을 어르신들도 찾아와 평판이 오르고, 어르신 모임이 활기를 띠어요.', prod: L => `평판 목표 +${r1(2 * L)} · 어르신 모임 활력 매일 +${Math.round(2 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 1))}, 평판 ${fmt(addRes('reputation', 1))}`,
  },
  christopher: {
    slot: 'morning', icon: '🚗', name: '크리스토폴 사도회', members: 260, cost: 35, min: 5,
    desc: '차량 봉사 모임. 주일마다 거동이 불편한 교우들을 태워 오고, 외부 행사 때 차를 내줘요.', prod: L => `미사 참례율 +${r1(1 * L)}% · 동원력 +${Math.round(4 * L)}%`,
    meet: L => `친화력 ${fmt(gain('rapport', 1))}`,
  },
  soccer: {
    slot: 'evening', icon: '⚽', name: '축구선교회', members: 320, cost: 30, min: 4,
    desc: '형제들이 주말마다 공을 차며 어울려요. 친구를 데려와 새 얼굴이 늘고, 냉담하던 형제들이 돌아와요.', prod: L => `신자 +${r1(0.4 * L)}/시간`,
    meet: L => `신자 ${fmt(addRes('members', 1))}, 친화력 ${fmt(gain('rapport', 1))}`,
  },
  golf: {
    slot: 'afternoon', icon: '⛳', name: '골프선교회', members: 450, cost: 45, min: 6,
    desc: '형편이 넉넉한 교우들의 친목 모임. 본당 행사 때 후원금을 내지만, 너무 커지면 위화감에 마음이 조금 식어요.', prod: L => `봉헌금 +${r1(5 * L)}/시간`,
    meet: L => `봉헌금 ${fmt(addRes('offering', 5 * L))}만 원`,
  },
  parentsK: {
    slot: 'morning', icon: '🍙', name: '초등부 자모회', members: 200, cost: 20, min: 3,
    desc: '초등부 아이들 어머니들의 모임. 주일마다 아이들 간식을 만들어 줘요(간식 재료비). 아이들이 주일학교를 즐거워해 초등부 활력이 날마다 올라요.', prod: L => `초등부 활력 매일 +${Math.round(3 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 1))}`,
  },
  parentsY: {
    slot: 'morning', icon: '🥪', name: '중고등부 자모회', members: 260, cost: 25, min: 3,
    desc: '중고등부 학생들 어머니들의 모임. 주일마다 간식을 챙겨 줘요(간식 재료비). 학생들이 성당에 오래 머물러 중고등부 활력이 날마다 올라요.', prod: L => `중고등부 활력 매일 +${Math.round(3 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 1))}`,
  },
  mothers: {
    slot: 'morning', icon: '🌹', name: '성모회', members: 140, cost: 25, min: 3,
    desc: '본당 자매들의 모임. 본당 행사 때 음식을 맡아 식사·다과비가 줄고, 교우들 마음을 살뜰히 챙겨요.', prod: L => `행사 식사·다과비 −${Math.round(Math.min(40, 10 + 5 * L))}%`,
    meet: L => `마음 ${fmt(addRes('heart', 2))}`,
  },
  facility: {
    slot: 'evening', icon: '🧰', name: '시설관리팀', members: 160, cost: 25, min: 3,
    desc: '손재주 있는 교우들의 봉사 모임. 봉사라서 늘 하지는 않지만, 가끔 팀장님이 마당의 잡초·돌·나무를 치우고 공사를 거들어 완공을 앞당겨요.', prod: L => `봉사 나오는 날 하루 ${Math.round(facilityChance(L) * 100)}%`,
    meet: L => `친화력 ${fmt(gain('rapport', 1))}`,
  },
  legio: {
    slot: 'morning', icon: '📿', name: '레지오 마리애', members: 0, cost: 20, min: 3,
    desc: '기도하고 이웃을 찾아가는 단체. 냉담 교우가 성당으로 돌아와요.', prod: L => `신자 +${r1(L)}/시간, 마음 +${r1(3 * L)}, 평판 +${r1(L)}`,
    meet: L => `신자 ${fmt(addRes('members', L))}, 마음 ${fmt(addRes('heart', 1))}`,
  },
  elders: {
    slot: 'morning', icon: '👵', name: '어르신 모임', members: 140, cost: 30, min: 4,
    desc: '산골 본당의 기둥인 어르신들이 서로 돌봐요.', prod: L => `마음 +${r1(5 * L)}, 평판 +${r1(2 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 2 + L))}, 친화력 ${fmt(gain('rapport', 1))}`,
  },
  catechumen: {
    slot: 'evening', icon: '📘', name: '예비신자 교리반', members: 160, cost: 40, min: 5,
    desc: '세례를 준비하는 사람들이 교리를 배워요. 반이 커질수록 예비신자를 더 받고, 세례식 때 더 많이 세례를 받아요.', prod: L => `예비신자 +${r1(1.5 * L)}/시간, 교리반 자리 +${Math.round(10 * L)}`,
    meet: L => `신자 ${fmt(addRes('members', 1.5 * L))}, 교리 ${fmt(gain('doctrine', 1.5))}`,
  },
  choir: {
    slot: 'afternoon', icon: '🎼', name: '성가대', members: 180, cost: 40, min: 5,
    desc: '주일마다 간식비·지휘자 봉사비·반주자 지원금(반주단이 없을 때)이 나가요. 아름다운 성가가 미사를 살려요. 주일 강론 판정에도 도움이 돼요.', prod: L => `마음 +${r1(6 * L)}, 강론 판정 +${r1(3 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 2 + L))}`,
  },
  school: {
    slot: 'afternoon', icon: '🧒', name: '초등부 주일학교', members: 250, cost: 60, min: 8,
    desc: '아이들이 신앙을 배우고, 부모들도 성당에 나와요.', prod: L => `신자 +${r1(0.8 * L)}/시간`,
    meet: L => `신자 ${fmt(addRes('members', L))}, 마음 ${fmt(addRes('heart', 1))}`,
  },
  youth: {
    slot: 'evening', icon: '🎸', name: '청년회', members: 300, cost: 60, min: 8,
    desc: '청년들이 공사와 행사에 손을 보태요.', prod: L => `공사 속도 +${r1(15 * L)}%, 신자 +${r1(0.5 * L)}/시간`,
    meet: L => `신자 ${fmt(addRes('members', L))}, 친화력 ${fmt(gain('rapport', 1))}`,
  },
  vincent: {
    slot: 'afternoon', icon: '🍞', name: '빈첸시오회', members: 350, cost: 60, min: 8,
    desc: '어려운 이웃을 도와 마을의 신뢰를 얻어요.', prod: L => `평판 +${r1(8 * L)}`,
    meet: L => { addHidden('holiness', 1); return `평판 ${fmt(addRes('reputation', 2 + L))}`; },
  },
  organ: {
    slot: 'evening', icon: '🎹', name: '반주단', members: 160, cost: 30, min: 4,
    desc: '주일마다 반주자 지원금이 나가요. 성가대와 함께 미사 반주를 맡아요. 성가가 살아나 강론 준비가 더해지고 교우들 마음이 따뜻해져요.', prod: L => `강론 준비 +${r1(0.25 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 1))}`,
  },
  lector: {
    slot: 'evening', icon: '📖', name: '전례해설단', members: 180, cost: 30, min: 4,
    desc: '미사 해설과 독서를 맡아요. 전례가 매끄러워져 미사 참례율이 오르고 교우들이 말씀을 더 잘 알아들어요.', prod: L => `미사 참례율 +${r1(0.5 * L)}%`,
    meet: L => `마음 ${fmt(addRes('heart', 1))}, 교리 ${fmt(gain('doctrine', 1))}`,
  },
  server: {
    slot: 'morning', icon: '🙏', name: '성인 복사단', members: 220, cost: 35, min: 5,
    desc: '어른 복사들이 주일미사와 장례·혼배 미사를 섬겨요. 미사에 복사가 서고, 봉헌이 조금 늘어요.', prod: L => `주일 봉헌 +${r1(2 * L)}%`,
    meet: L => `영성 ${fmt(gain('spirit', 1))}, 평판 ${fmt(addRes('reputation', 1))}`,
  },
  eucharist: {
    slot: 'morning', icon: '✨', name: '성체분배회', members: 260, cost: 35, min: 5,
    desc: '미사 때 성체 분배를 돕고, 아파서 성당에 못 오시는 분들께 봉성체를 모셔 가요. 미사가 매끄러워지고 어르신들 마음이 따뜻해져요.', prod: L => `미사 참례율 +${r1(0.5 * L)}% · 마음 목표 +${r1(1 * L)}`,
    meet: L => `영성 ${fmt(gain('spirit', 1))}, 마음 ${fmt(addRes('heart', 1))}`,
  },
  vocation: {
    slot: 'afternoon', icon: '🌱', name: '성소분과', members: 350, cost: 60, min: 8,
    desc: '예비신학생 모임을 이끌어 사제 성소를 키워요. 신학생이 나오면 교구의 큰 기쁨이지만, 신학교 지원비가 주일마다 나가요.', prod: L => `예비신학생 ${Math.round(2 + 2 * L)}명`,
    meet: L => `영성 ${fmt(gain('spirit', 1))}, 마음 ${fmt(addRes('heart', 1))}`,
  },
  altar: {
    slot: 'morning', icon: '🕯️', name: '제대회', members: 150, cost: 25, min: 3,
    desc: '제대와 제의를 돌봐요. 주일마다 세탁비·제병·미사주가 들고, 한 달에 한 번 성시간과 부활·성탄에 컵초를 팔아 수입이 생겨요. 주일미사 제대에 흰 제대보(마음 +1), Lv3부터 전례색 앞가림천과 강론 준비 +0.5, Lv5부터 복사단 행렬(봉헌 +8%, 대축일 +15%). 참례율도 올라요.', prod: L => `미사 참례율 +${r1(1 * L)}%`,
    meet: L => `마음 ${fmt(addRes('heart', 1))}, 영성 ${fmt(gain('spirit', 1))}`,
  },
  flower: {
    slot: 'afternoon', icon: '💐', name: '헌화회', members: 180, cost: 25, min: 3,
    desc: '전례 시기에 맞는 꽃으로 제대 앞을 꾸며요. 주일마다 꽃 구입비가 들고, 세례식·혼배미사 꽃다발을 팔아 수익이 생겨요. 주일 마음 +1, 대축일엔 마음이 더 오르고 평판 +1 (Lv3부터 더 풍성하게). 사순 시기에는 꽃을 비워요.', prod: L => `마음 목표 +${r1(2 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 2))}`,
  },
  school2: {
    slot: 'afternoon', icon: '🧑‍🎓', name: '중고등부 주일학교', members: 300, cost: 60, min: 8,
    desc: '청소년들이 신앙을 이어 가요. 친구를 데려와요.', prod: L => `신자 +${r1(0.6 * L)}/시간`,
    meet: L => `신자 ${fmt(addRes('members', L))}, 친화력 ${fmt(gain('rapport', 1))}`,
  },
  adults: {
    slot: 'evening', icon: '🧑‍💼', name: '청장년회', members: 350, cost: 60, min: 8,
    desc: '일하는 세대가 본당의 허리가 돼요. 봉헌과 봉사가 늘어요.', prod: L => `봉헌금 +${r1(4 * L)}/시간`,
    meet: L => `봉헌금 ${fmt(addRes('offering', 4 * L))}만 원, 마음 ${fmt(addRes('heart', 1))}`,
  },
  shop: {
    slot: 'afternoon', icon: '🛒', name: '물품판매', members: 250, cost: 50, min: 6,
    desc: '무엇을 팔지, 원가에 얼마를 붙일지 정해요. 많이 붙이면 이익이 크지만 교우들 마음을 잃어요. (본당 수익)', prod: L => `수익 +${r1(6 * L * shopIncomeMult())}/시간`,
    meet: L => `수익 ${fmt(addRes('offering', 6 * L * shopIncomeMult()))}만 원`,
  },
  relics: {
    slot: 'morning', icon: '📿', name: '성물방', members: 400, cost: 80, min: 10,
    desc: '묵주와 성물을 팔아요. 교우들의 신심도 깊어져요. (본당 수익)', prod: L => `수익 +${r1(5 * L)}/시간, 마음 +${r1(L)}`,
    meet: L => `수익 ${fmt(addRes('offering', 5 * L))}만 원, 마음 ${fmt(addRes('heart', 1))}`,
  },
  cafe: {
    slot: 'afternoon', icon: '☕', name: '성당 카페', members: 500, cost: 100, min: 12,
    desc: '미사 뒤 교우와 이웃이 차 한잔 나누는 곳. 수익도 나고 이웃도 찾아와요. (본당 수익)', prod: L => `수익 +${r1(7 * L)}/시간, 새 얼굴 +${r1(0.3 * L)}`,
    meet: L => `수익 ${fmt(addRes('offering', 7 * L))}만 원, 평판 ${fmt(addRes('reputation', 1))}`,
  },
  prayer: {
    slot: 'evening', icon: '🔥', name: '성령기도회', members: 260, cost: 40, min: 5,
    desc: '함께 찬양하고 기도해요. 본당에 뜨거운 신심이 돌아요.', prod: L => `마음 목표 +${r1(3 * L)}`,
    meet: L => `마음 ${fmt(addRes('heart', 2))}, 영성 ${fmt(gain('spirit', 1.5))}`,
  },
  mission: {
    slot: 'evening', icon: '📣', name: '선교분과', members: 220, cost: 50, min: 6,
    desc: '이웃에게 성당을 알리고 교리를 받고 싶은 사람들을 이어 줘요. 홍보의 효과도 커져요.', prod: L => `예비신자 +${r1(1 * L)}/시간, 홍보 효과 +${Math.round(20 * L)}%`,
    meet: L => `예비신자 ${fmt(addCatechumens(L))}명, 친화력 ${fmt(gain('rapport', 1))}`,
  },
};

// 이웃 동네(면 소재지)의 종교 공동체. 서로 존중하는 이웃으로 그린다
// base: 처음 신자 수, trend: 한 주(주일)마다 늘거나 주는 수
const TOWN_POP = 2600;
const RELIGIONS = {
  protestant: { name: '솔뫼교회', kind: '개신교', icon: '⛪', base: 240, trend: 0.3, line: '주일 아침마다 찬송가 소리가 들려요. 목사님과는 마을 행사에서 자주 인사를 나눠요.' },
  buddhist: { name: '운곡사', kind: '불교', icon: '🪷', base: 310, trend: -0.2, line: '초파일이면 마을 길에 연등이 걸려요. 스님이 가끔 산나물을 나눠 주세요.' },
  won: { name: '원불교 솔뫼교당', kind: '원불교', icon: '⭕', base: 55, trend: 0.05, line: '작지만 정갈한 교당이에요. 교무님이 마을 어르신 반찬 나눔을 하세요.' },
};

// 단체 행사와 지원금: 단체가 행사를 계획하면 본당에 지원금을 청한다. 준비하다 돈이 더 필요하다고 다시 청하기도 한다
// cost: 기준 지원금(본당 규모에 맞춰 커짐), res: 행사가 잘 끝나면 얻는 것, cate: 예비신자, vital: 그 단체 활력
const EVENT_PLANS = {
  district: { name: '구역 반장 연수', icon: '🏘️', parts: { edu: 15, food: 5 }, res: { heart: 2, members: 2 }, vital: 8 },
  legio: { name: '레지오 피정', icon: '📿', parts: { edu: 10, bus: 10, food: 5 }, res: { heart: 3, reputation: 1 }, vital: 8 },
  elders: { name: '어르신 효도잔치', icon: '👵', parts: { food: 20, bus: 10 }, res: { heart: 4, reputation: 2 }, vital: 8 },
  catechumen: { name: '예비신자 성지 순례', icon: '📘', parts: { bus: 15, food: 10 }, res: { heart: 1 }, cate: 3, vital: 8 },
  choir: { name: '성가대 정기 연주회', icon: '🎼', parts: { edu: 15, food: 20 }, res: { reputation: 3, heart: 3 }, vital: 8 },
  school: { name: '주일학교 여름 캠프', icon: '🧒', parts: { bus: 15, food: 15, edu: 10 }, res: { members: 4, heart: 2 }, vital: 10 },
  youth: { name: '청년 수련회', icon: '🎸', parts: { bus: 15, food: 10, edu: 10 }, res: { members: 3, heart: 2 }, vital: 10 },
  vincent: { name: '이웃 김장 나눔', icon: '🍞', parts: { supply: 35 }, res: { reputation: 5 }, vital: 8 },
  mission: { name: '전도 축제', icon: '📣', parts: { food: 20, edu: 15 }, res: { reputation: 2 }, cate: 5, vital: 8 },
  eucharist: { name: '봉성체 봉사자 피정', icon: '✨', parts: { edu: 15, food: 5 }, res: { heart: 3 }, vital: 8 },
  senior: { name: '노인대학 봄 소풍', icon: '🎓', parts: { bus: 15, food: 15 }, res: { heart: 3, reputation: 2 }, vital: 8 },
  christopher: { name: '차량 봉사자 안전 연수', icon: '🚗', parts: { edu: 10, food: 5 }, res: { heart: 1 }, vital: 8 },
  soccer: { name: '본당 대항 축구대회', icon: '⚽', parts: { bus: 10, food: 10, supply: 10 }, res: { members: 3, reputation: 2 }, vital: 10 },
  golf: { name: '자선 골프대회', icon: '⛳', parts: { supply: 10 }, res: { offering: 25, reputation: 1 }, vital: 8 },
  parentsK: { name: '초등부 가족 소풍', icon: '🍙', parts: { bus: 10, food: 15 }, res: { heart: 2, members: 2 }, vital: 8 },
  parentsY: { name: '중고등부 자모 피정', icon: '🥪', parts: { edu: 10, food: 10 }, res: { heart: 2 }, vital: 8 },
  mothers: { name: '성모회 성지 순례', icon: '🌹', parts: { bus: 15, food: 5 }, res: { heart: 3 }, vital: 8 },
  facility: { name: '시설관리팀 봉사자의 날', icon: '🧰', parts: { food: 15 }, res: { heart: 1 }, vital: 10 },
  altar: { name: '제대 봉사자 피정', icon: '🕯️', parts: { edu: 15, bus: 5 }, res: { heart: 2 }, vital: 8 },
  organ: { name: '오르간 연수', icon: '🎹', parts: { edu: 20 }, res: { heart: 2 }, vital: 8 },
  lector: { name: '전례 해설 연수', icon: '📖', parts: { edu: 15, food: 5 }, res: { heart: 2 }, vital: 8 },
  server: { name: '성인 복사단 성지 순례', icon: '🙏', parts: { bus: 15, food: 10 }, res: { heart: 2, reputation: 1 }, vital: 8 },
  vocation: { name: '예비신학생 신학교 방문', icon: '🌱', parts: { bus: 15, food: 10 }, res: { heart: 3 }, vital: 10 },
  flower: { name: '부활 꽃꽂이', icon: '💐', parts: { supply: 25 }, res: { heart: 3 }, vital: 8 },
  school2: { name: '중고등부 캠프', icon: '🧑‍🎓', parts: { bus: 15, food: 15, edu: 10 }, res: { members: 3, heart: 2 }, vital: 10 },
  adults: { name: '청장년 체육대회', icon: '🧑‍💼', parts: { food: 20, supply: 15 }, res: { heart: 3, members: 2 }, vital: 8 },
  shop: { name: '본당 바자회', icon: '🛒', parts: { supply: 25 }, res: { reputation: 2, offering: 20 }, vital: 8 },
  relics: { name: '성물 축복식', icon: '📿', parts: { supply: 20 }, res: { heart: 2, offering: 15 }, vital: 8 },
  cafe: { name: '카페 작은 음악회', icon: '☕', parts: { food: 15, supply: 15 }, res: { reputation: 3 }, cate: 2, vital: 8 },
  // 세례식 뒤 선교분과가 준비하는 새 신자 행사 (거절하면 새 신자 일부가 정을 붙이지 못하고 떠난다)
  newPilgrim: { name: '새 신자 성지순례', icon: '🚌', parts: { bus: 15, food: 10 }, res: { heart: 3, members: 2 }, vital: 8, refuseLose: { members: -3 } },
  prayer: { name: '성령 세미나', icon: '🔥', parts: { edu: 20, food: 10 }, res: { heart: 4 }, vital: 8 },
};
const PLAN = { chance: 0.25, max: 3, extraChance: 0.4, extraRate: 0.5, expireDays: 3 };

// 본당 지출 기준: 주임 신부가 정해 두면 단체 행사 지원금이 이 기준대로 나간다
// 행사 비용은 교육·연수비, 버스 대여비, 식사·다과비, 재료·물품비로 나뉜다 (EVENT_PLANS.parts)
const POLICIES = [
  { id: 'edu', icon: '🎓', name: '교육·연수비', choices: [['full', '전액 지원', 1], ['half', '반액 지원', 0.5], ['none', '지원 안 함', 0]], def: 'half' },
  { id: 'bus', icon: '🚌', name: '버스 대여비', choices: [['full', '본당이 지원', 1], ['none', '단체가 알아서', 0]], def: 'none' },
  { id: 'food', icon: '🍱', name: '식사·다과비', choices: [['full', '전액 지원', 1], ['half', '반액 지원', 0.5], ['none', '지원 안 함', 0]], def: 'half' },
  { id: 'supply', icon: '📦', name: '재료·물품비', choices: [['full', '전액 지원', 1], ['half', '반액 지원', 0.5], ['none', '지원 안 함', 0]], def: 'full' },
  { id: 'extra', icon: '➕', name: '추가 지원 요청', choices: [['ask', '그때그때 묻기', null], ['accept', '늘 승낙', 1], ['refuse', '늘 거절', 0]], def: 'ask' },
];
const PART_NAME = { edu: '교육·연수비', bus: '버스 대여비', food: '식사·다과비', supply: '재료·물품비' };

// 예비자 교리: 문의한 사람(예비신자)이 교리반에 모이고, 네 주일마다 세례식에서 입교한다
const CATE = { baseCap: 5, capPerLevel: 10, baptismEvery: 4, prepGain: 12, ceremony: 10, perPerson: 2 };
// 주교님 사목방문 (v0.91): 가끔 교구에서 미리 알려 오고, 그 주일에 주교님이 미사를 주례하신다. 교우들이 많이 나와 봉헌이 는다
// minWeek: 부임 몇 주 뒤부터, gap: 다녀가신 뒤 최소 몇 주, chance: 주일마다 소식이 올 확률, notice: 몇 주 전에 알리나
const BISHOP_VISIT = { minWeek: 6, gap: 16, chance: 0.18, notice: 2, attend: 0.2, collect: 1.4, heart: 4, rep: 2, trust: 3, trustIn: 3, trustOut: -3 };
// 연말 교구 사목 시상식 (v0.93 사용자 요청): 해마다 성탄 대축일 주일, 가상의 이웃 본당 셋과 부문별로 견준다
// 이웃 본당의 수치는 지금 우리 성당 레벨에 맞춰 정해진다 (f: 이웃마다 저력, 해마다 부문별로 조금씩 흔들림)
const AWARDS = {
  week: 39,                       // 1년 48주일 중 성탄 대축일 주일
  neighbors: [['🌳', '은행나무 본당', 1.25], ['🪨', '반석 본당', 1.0], ['💧', '샘골 본당', 0.8]],
  cats: [
    { id: 'newcomers', icon: '🌱', name: '새 신자 상', unit: '명', base: L => 30 + 24 * L, hint: '올해 늘어난 신자와 세례자' },
    { id: 'heart', icon: '❤️', name: '따뜻한 공동체 상', unit: '', base: L => Math.min(80, 50 + 3.5 * L), hint: '교우들의 마음' },
    { id: 'vital', icon: '🙌', name: '살아 있는 단체 상', unit: '', base: L => Math.min(90, 45 + 2.5 * L), hint: '단체 활력 평균, 단체가 많을수록 조금 더' },
    { id: 'attend', icon: '⛪', name: '주일 성수 상', unit: '%', base: L => Math.min(75, 35 + 4 * L), hint: '주일미사 참례율' },
  ],
  prize: [{ gems: 10, rep: 2, trust: 2 }, { gems: 5, rep: 1, trust: 0 }, { gems: 2, rep: 0, trust: 0 }, null],
  grand: { firsts: 3, gems: 20, trust: 3, rep: 3 },  // 1등을 세 부문 이상 받으면 '올해의 본당'
};
// 교리반을 더 연다 (v0.91): 자리가 꽉 차면 반을 늘린다. cost는 여는 비용, week는 주일마다 교재·간식비 (본당 규모에 맞춰 커짐)
const CATE_CLASSES = [
  { name: '평일 오전반', icon: '☀️', cap: 10, cost: 25, week: 2, who: '낮에 시간이 되는 어르신·주부들' },
  { name: '직장인 저녁반', icon: '🌙', cap: 15, cost: 50, week: 3, who: '퇴근 뒤 오는 직장인들' },
  { name: '주말 집중반', icon: '📅', cap: 20, cost: 90, week: 4, who: '주말에만 시간이 되는 사람들', church: 4 },
];
// 교리 홍보: 일정 기간 예비신자가 찾아오는 속도를 키운다 (cost는 본당 규모에 맞춰 커짐)
const PROMOS = [
  { id: 'flyer', icon: '📄', name: '전단지', cost: 15, mult: 1.3, days: 2 },
  { id: 'banner', icon: '🎌', name: '현수막', cost: 40, mult: 1.6, days: 3 },
  { id: 'news', icon: '📻', name: '마을 소식지·방송', cost: 80, mult: 2, days: 4 },
];

// 단체 테크 트리: 성당·사무실·사제관 레벨이 맞아야 단체를 만들 수 있다 (신자 수 조건과 함께)
// 분과(위원회)마다 아래 단체부터 위 단체로 차례로 열린다
const UNIT_UNLOCK = {
  district: { church: 1 },
  mothers: { church: 2 },
  parentsK: { church: 3, office: 2 },
  parentsY: { church: 4, rectory: 3 },
  senior: { church: 3, rectory: 2 },
  christopher: { church: 3, office: 2 },
  soccer: { church: 4 },
  golf: { church: 6, office: 5 },
  facility: { church: 2, office: 2 },
  legio: { church: 1 },
  elders: { church: 2 },
  choir: { church: 2 },
  catechumen: { church: 2, rectory: 2 },
  altar: { church: 3, rectory: 2 },
  organ: { church: 3 },
  lector: { church: 3, office: 2 },
  server: { church: 4, rectory: 3 },
  eucharist: { church: 4, rectory: 3 },
  vocation: { church: 5, rectory: 4 },
  flower: { church: 3 },
  school: { church: 3, office: 2 },
  mission: { church: 3, office: 2 },
  shop: { church: 4, office: 3 },
  youth: { church: 5, rectory: 3 },
  prayer: { church: 4, rectory: 3 },
  vincent: { church: 5, office: 3 },
  school2: { church: 4, rectory: 3 },
  adults: { church: 5, office: 4 },
  relics: { church: 6, office: 5 },
  cafe: { church: 7, office: 6 },
};
// 트리 화면의 묶음 (조직도의 분과 + 그 밖의 단체)
const TECH_GROUPS = [
  { name: '🏘️ 소공동체', units: ['district'] },
  { name: '🤝 평단협', units: ['legio', 'elders', 'mothers', 'senior', 'christopher', 'soccer', 'prayer', 'vincent', 'golf'] },
  { name: '🧰 본당 직속', units: ['facility'] },
  { name: '🎼 전례분과 (제분과위원회)', units: ['choir', 'organ', 'lector'] },
  { name: '🕯️ 제분과위원회', units: ['altar', 'flower', 'server', 'eucharist'] },
  { name: '🌱 성소분과', units: ['vocation'] },
  { name: '📣 선교분과', units: ['catechumen', 'mission'] },
  { name: '🧒 청소년·청년', units: ['school', 'parentsK', 'school2', 'parentsY', 'youth', 'adults'] },
  { name: '💰 재정 (본당 수익)', units: ['shop', 'relics', 'cafe'] },
];

// 본당 조직: 분과(또는 위원회)마다 속한 단체들이 활성화(Lv2 이상)되면 위원장을 뽑을 수 있다
// 위원장이 있는 분과의 단체는 회의를 스스로 진행한다. 위원장이 3명 이상이면 상임위원회가 열린다
// groups: 속한 단체(lv: 필요한 레벨), chairs: 먼저 있어야 할 위원장, perk: 위원장을 뽑으면 생기는 덤
const ORG = [
  { id: 'liturgy', name: '전례분과장', icon: '🎼', groups: ['choir', 'lector', 'organ'], lv: 2, perk: '미사 참례율 +3%' },
  { id: 'missionDiv', name: '선교분과장', icon: '📣', groups: ['mission', 'catechumen'], lv: 2, perk: '예비신자가 15% 더 찾아와요' },
  { id: 'jebungwa', name: '제분과위원장', icon: '🕯️', chairs: ['liturgy'], groups: ['altar', 'flower', 'server', 'eucharist'], lv: 2, perk: '미사 참례율 +2%, 대축일 마음 +2', note: '전례분과장을 먼저 세우고, 제분과위원회 소속 단체(제대회·헌화회·성인 복사단·성체분배회)가 Lv2가 되면 세울 수 있어요' },
  { id: 'youthDiv', name: '청소년 분과장', icon: '🧒', groups: ['school', 'school2'], lv: 2, perk: '새 얼굴 +10%' },
  { id: 'youngDiv', name: '청년 분과장', icon: '🎸', groups: ['youth', 'adults'], lv: 2, perk: '공사 거들기 행동력 2 → 1' },
  { id: 'youthBoard', name: '청소년위원장', icon: '🎓', chairs: ['youthDiv', 'youngDiv'], extra: ['parentsK', 'parentsY'], perk: '마음 목표 +3, 새 신자 +10%' },
  { id: 'finance', name: '재정위원장', icon: '💰', groups: ['shop', 'relics', 'cafe'], lv: 2, perk: '살림비 −10%' },
  { id: 'smallCom', name: '소공동체 위원장', icon: '🏘️', groups: ['district'], lv: 2, special: () => smallComNeeds(), perk: '봉헌 5% 더, 미사 참례율 +3%', note: '소공동체가 반 → 구역(Lv4) → 지역(Lv7)으로 넓어져 지역장이 생기면' },
  { id: 'laity', name: '평단협 위원장', icon: '🤝', groups: ['legio', 'vincent', 'elders', 'prayer'], extra: ['mothers', 'senior', 'christopher', 'soccer', 'golf'], lv: 2, perk: '평판 목표 +5' },
];
const COMMITTEE_CHAIRS = 3;
const APPOINT_ENERGY = 3;

// 지도 이름표에 쓰는 단체 짧은 이름
const UNIT_SHORT = { parentsK: '초등부 자모회', parentsY: '중고등부 자모회', senior: '노인대학', christopher: '크리스토폴', soccer: '축구선교회', golf: '골프선교회', eucharist: '성체분배회', mothers: '성모회', facility: '시설관리팀', organ: '반주단', lector: '해설단', server: '성인 복사단', vocation: '성소분과', altar: '제대회', flower: '헌화회', school2: '중고등부', adults: '청장년회', shop: '물품판매', relics: '성물방', cafe: '카페', prayer: '성령기도회', mission: '선교분과', district: '소공동체', legio: '레지오', elders: '어르신', catechumen: '교리반', choir: '성가대', school: '초등부', youth: '청년회', vincent: '빈첸시오' };

// 단체 능력: 단체가 그 레벨에 오르면 본당 전체에 생기는 특별한 힘
const UNIT_PERKS = {
  parentsK: [{ lv: 3, id: 'parentsK3', text: '첫영성체 준비를 도와 초등부 새 얼굴 +' }, { lv: 6, id: 'parentsK6', text: '간식 재료비 −30% (바자회 수익으로)' }],
  parentsY: [{ lv: 3, id: 'parentsY3', text: '견진 준비를 도와 중고등부 활력이 덜 식어요' }, { lv: 6, id: 'parentsY6', text: '간식 재료비 −30% (바자회 수익으로)' }],
  senior: [{ lv: 3, id: 'senior3', text: '어르신 교우 선종이 줄어 신자가 덜 떠나요' }, { lv: 6, id: 'senior6', text: '노인대학 졸업식: 해마다 평판 +5' }],
  christopher: [{ lv: 3, id: 'christopher3', text: '버스 행사 버스 대여비 −30% (사도회 차량)' }, { lv: 6, id: 'christopher6', text: '셔틀버스 기름값이 들지 않아요' }],
  soccer: [{ lv: 3, id: 'soccer3', text: '청년회·청장년회 활력 매일 +3' }, { lv: 6, id: 'soccer6', text: '본당 대항 축구대회 우승! 해마다 평판 +5' }],
  golf: [{ lv: 3, id: 'golf3', text: '행사 추가 지원 요청을 골프선교회가 절반 후원' }, { lv: 6, id: 'golf6', text: '건축헌금 호소 때 더 많이 모여요 (+30%)' }],
  eucharist: [{ lv: 3, id: 'eucharist3', text: '첫 금요일 봉성체: 어르신 모임 활력이 매일 +3' }, { lv: 6, id: 'eucharist6', text: '미사가 여러 대여도 주일 행동력 −1' }],
  mothers: [{ lv: 3, id: 'mothers3', text: '세례식 예복·선물을 성모회가 마련해 세례식 비용 −30%' }, { lv: 6, id: 'mothers6', text: '봉사자 면담에서 친화력 없이도 힌트가 보여요' }],
  facility: [{ lv: 3, id: 'facility3', text: '봉사 나오면 공사를 더 많이 거들어요 (40%)' }, { lv: 6, id: 'facility6', text: '건물 살림비 −10%' }],
  organ: [{ lv: 3, id: 'organ3', text: '성가대 효과가 10% 더' }, { lv: 6, id: 'organ6', text: '대축일 미사 마음 +2' }],
  lector: [{ lv: 3, id: 'lector3', text: '예비신자 교리 준비가 주일마다 +2' }, { lv: 6, id: 'lector6', text: '강론 감동 확률이 조금 올라요' }],
  server: [{ lv: 3, id: 'server3', text: '장례·혼배 미사로 평판 목표 +3' }, { lv: 6, id: 'server6', text: '복사 중에서 예비신학생이 나와요 (성소분과 신학생 확률 ↑)' }],
  vocation: [{ lv: 3, id: 'vocation3', text: '신학생이 나올 확률 1.5배' }, { lv: 6, id: 'vocation6', text: '신학교 지원비 −30% (교구 장학금)' }],
  district: [{ lv: 3, id: 'district3', text: '봉헌이 10% 더 쌓여요 (교무금이 잘 걷혀요)' }, { lv: 6, id: 'district6', text: '교구 공납금 비율 −2%p (장부가 깔끔해져요)' }],
  legio: [{ lv: 3, id: 'legio3', text: '냉담 교우가 돌아와 새 얼굴 +0.5/시간' }, { lv: 6, id: 'legio6', text: '신자들의 마음이 떨어지는 속도가 절반' }],
  elders: [{ lv: 3, id: 'elders3', text: '신부님이 회의에 못 가도 활력이 절반만 줄어요' }, { lv: 6, id: 'elders6', text: '신자들의 마음 목표 +5' }],
  catechumen: [{ lv: 3, id: 'catechumen3', text: '주일마다 세례 준비자 중 새 신자 +2' }, { lv: 6, id: 'catechumen6', text: '주일 강론 뒤 찾아오는 새 신자 1.5배' }],
  choir: [{ lv: 3, id: 'choir3', text: '성가가 받쳐 주어 강론 감동 확률이 올라가요' }, { lv: 6, id: 'choir6', text: '주일 봉헌 20% 더' }],
  school: [{ lv: 3, id: 'school3', text: '아이 따라 부모가 와서 성당 새 얼굴 20% 더' }, { lv: 6, id: 'school6', text: '신자들의 마음 목표 +3' }],
  youth: [{ lv: 3, id: 'youth3', text: '공사 거들기가 30% → 45% 단축' }, { lv: 6, id: 'youth6', text: '모든 공사 시간 15% 단축' }],
  vincent: [{ lv: 3, id: 'vincent3', text: '마을 평판 목표 +5' }, { lv: 6, id: 'vincent6', text: '비신자 댁 땅값 20% 할인 (이웃의 신뢰)' }],
  mission: [{ lv: 3, id: 'mission3', text: '교우가 이웃을 데려와 예비신자 +1/시간' }, { lv: 6, id: 'mission6', text: '세례식마다 입교자 20% 더' }],
};

// 공소 (윗말의 공소 자리에 세우는 건물)
const GONGSO = {
  icon: '✝️', name: '공소', cost: 120, min: 10,
  desc: '마을 신자들의 작은 공동체. 공소 회장이 기도 모임을 이끌어요.', prod: L => `신자 +${r1(1.5 * L)}/시간, 봉헌금 +${r1(5 * L)}/시간, 평판 +${r1(3 * L)}`,
  meet: L => `신자 ${fmt(addRes('members', 1.5 * L))}, 영성 ${fmt(gain('spirit', 2))}`,
};

// 성당 레벨 = 본당 규모. need: 증축 조건 (rooms: [교리실 수, 그 레벨 이상], gongso: 공소 수)
// tier: 겉모습 단계. 그림은 churchStage로 (v0.92: 컨테이너 2동 → 3동 → 4동 → 가건물 → 큰 가건물 → 벽돌, church-lv1~6)
function churchStage(level) { return [1, 1, 2, 3, 4, 4, 5, 5, 6, 6, 6][level] || 1; }
const CHURCH_LEVELS = [
  null,
  { name: '컨테이너 성당', seats: 250, tier: 1 },
  { name: '컨테이너 성당', seats: 375, tier: 1, cost: 70, min: 10, need: { members: 120, rectory: 2, rooms: [1, 1] } },
  { name: '컨테이너 성당', seats: 500, tier: 2, cost: 150, min: 20, need: { members: 200, rectory: 3, rooms: [2, 1], groups: [1, 2] } },
  { name: '가건물 성당', seats: 675, tier: 2, cost: 250, min: 35, need: { members: 300, rectory: 3, office: 2, rooms: [2, 2], groups: [2, 2] } },
  { name: '큰 가건물 성당', seats: 850, tier: 3, cost: 400, min: 60, need: { members: 400, rectory: 3, office: 3, rooms: [2, 3], groups: [2, 3] } },
  { name: '큰 가건물 성당', seats: 1025, tier: 3, cost: 600, min: 100, need: { members: 550, rectory: 4, office: 4, rooms: [3, 4], groups: [3, 4] } },
  { name: '벽돌 성당', seats: 1200, tier: 4, cost: 900, min: 180, need: { members: 700, rectory: 5, office: 5, rooms: [3, 5], groups: [4, 5], gongso: 1 } },
  { name: '벽돌 성당', seats: 1500, tier: 4, cost: 1300, min: 240, need: { members: 1000, rectory: 6, office: 6, rooms: [4, 6], groups: [5, 6], gongso: 1 } },
  { name: '빛나는 본당', seats: 1800, tier: 5, cost: 1900, min: 320, need: { members: 1300, rectory: 7, office: 7, rooms: [4, 7], groups: [6, 7], gongso: 1 } },
  { name: '이웃을 낳는 본당', seats: 2400, tier: 5, locked: '분가와 지구장 단계는 다음 버전에서 열려요', need: { members: 1700 } },
];

// 사제관·본당 사무실. 레벨은 성당 레벨 + 1까지
const FIXED = {
  rectory: { icon: '🏠', name: '사제관', effect: L => `행동력 최대 ${rectoryEnergy(L)}`, cost: L => 27 * Math.pow(1.48, L - 2), min: L => 2.7 * Math.pow(1.58, L - 2) },
  office: { icon: '🗂️', name: '본당 사무실', effect: L => `금고 한도 ${VAULT[L]}만 원`, cost: L => 35 * Math.pow(1.5, L - 2), min: L => 3 * Math.pow(1.55, L - 2) },
};
function rectoryEnergy(L) { return 30 + Math.round(2.5 * (L - 1)); }

// 금고(본당 사무실 레벨별): 봉헌금은 이만큼까지만 가질 수 있다
// v1.08 사용자 "사무실 골드 수용량을 더 늘려, 업그레이드하려는데 금고가 작아 돈이 모자라": 약 두 배로
const VAULT = [0, 500, 1000, 2000, 3000, 4500, 6000, 8000, 11000, 15000, 20000, 26000];

// 건물에 쌓이는 양: 그 건물 생산의 몇 시간어치까지 (v1.05: Lv1 3시간 → Lv10 10시간. 자주 들러 거두도록, 대신 봉헌은 더 많이)
function stashHours(L) { return 3 + 7 * (Math.min(L, 10) - 1) / 9; }
// v1.05 사용자 요청: 자주 들러 할 일이 많아진 만큼 봉헌이 더 걷힌다 (모든 본당)
const OFFERING_BOOST = 2; // v1.07: 1.5 → 2

// 교구 공납금: 한 주 동안 거둔 봉헌의 일정 비율을 주일마다 교구에 낸다. 큰 본당일수록 비율이 높다
const LEVY_RATE = [0, 0.08, 0.08, 0.10, 0.10, 0.12, 0.13, 0.15, 0.16, 0.18, 0.20];
// 연초(1월)에 한 해 공납금을 한 번에 내면 깎아 준다
const LEVY_LUMP_DISCOUNT = 0.1;
// 수원가톨릭신협 대출 (v1.08 사용자 "사무실에서 수원가톨릭 신협을 통해서 돈을 대출하는 시스템"):
// 사무실 Lv2부터, 금고 한도의 몇 할을 빌려 이자를 붙여 주일마다 나눠 갚는다. 한 번에 한 건만.
// 못 갚은 주는 남은 빚에 연체 이자가 붙고 평판이 조금 깎인다. 언제든 남은 빚을 한꺼번에 갚을 수 있다
const LOAN = { office: 2, plans: [{ share: 0.3, weeks: 4, rate: 0.04 }, { share: 0.6, weeks: 8, rate: 0.08 }, { share: 0.9, weeks: 12, rate: 0.12 }], late: 0.03, rep: 1 };
// 작은 본당은 교구 지원금을 받는다 (성당 Lv3까지, 주일마다)
const DIOCESE_GRANT = [0, 25, 20, 12];

// 위원장이 상임위원회에 올리는 건의사항 (단체 종류별)
// 상임위원회 건의사항: 단체가 Lv5가 되어 위원장이 생기면 올라온다.
// 선택지마다 얻는 것과 잃는 것이 다르다. cost는 기준 봉헌금(본당 규모에 맞춰 커짐), energy는 행동력
// res: 본당 자원, vital: 이 단체 활력, other: 다른 단체 활력, stat: 신부 능력치, hidden: 숨은 수치
const AGENDAS = {
  parentsK: [
    { text: '초등부 자모회가 여름 성경학교 간식을 넉넉히 준비하고 싶어 합니다.', options: [
      { label: '재료비를 지원한다', cost: 15, res: { heart: 2 }, vital: 8, result: '아이들이 간식 시간을 손꼽아 기다렸다.' },
      { label: '자모회 회비로 하자고 한다', vital: -3, result: '어머니들이 조금씩 더 냈다.' },
      { label: '간식은 간단히 하자고 한다', vital: -5, result: '아이들 표정이 시무룩했다.' },
    ] },
  ],
  parentsY: [
    { text: '중고등부 자모회가 시험 기간 학생들 야식을 준비하고 싶어 합니다.', options: [
      { label: '지원한다', cost: 15, res: { heart: 2, members: 1 }, vital: 8, result: '학생들이 친구를 데리고 성당 공부방에 왔다.' },
      { label: '자모회가 알아서 하자고 한다', vital: -3, result: '어머니들이 십시일반 준비했다.' },
      { label: '시험 기간엔 쉬자고 한다', vital: -5, result: '공부방이 썰렁했다.' },
    ] },
  ],
  senior: [
    { text: '노인대학이 봄 소풍을 가고 싶어 합니다.', options: [
      { label: '버스와 도시락을 지원한다', cost: 30, res: { heart: 3, reputation: 2 }, vital: 10, result: '어르신들이 소풍 내내 노래를 부르셨다.' },
      { label: '성당 마당에서 하자고 한다', cost: 8, vital: 3, result: '마당 소풍도 나름 즐거웠다.' },
      { label: '올해는 쉬자고 한다', vital: -6, res: { heart: -1 }, result: '어르신들이 서운해하셨다.' },
    ] },
  ],
  christopher: [
    { text: '크리스토폴 사도회가 차량 보험료 지원을 청합니다.', options: [
      { label: '보험료를 지원한다', cost: 20, vital: 10, result: '봉사자들이 마음 놓고 운전대를 잡았다.' },
      { label: '반만 지원한다', cost: 10, vital: 4, result: '봉사자들이 나머지를 나눠 냈다.' },
      { label: '각자 부담하자고 한다', vital: -8, result: '봉사 차량이 두 대 줄었다.' },
    ] },
  ],
  soccer: [
    { text: '축구선교회가 새 유니폼을 맞추고 싶어 합니다.', options: [
      { label: '유니폼을 맞춰 준다', cost: 20, res: { members: 2 }, vital: 8, result: '새 유니폼을 입은 형제들이 친구를 더 데려왔다.' },
      { label: '회비로 하자고 한다', vital: -2, result: '형제들이 회비를 걷었다.' },
      { label: '지금 것을 입자고 한다', vital: -5, result: '바랜 유니폼에 형제들이 웃으며 투덜댔다.' },
    ] },
  ],
  golf: [
    { text: '골프선교회가 본당 후원 골프대회를 열겠다고 합니다. 일부 교우는 "성당이 골프냐"며 불편해합니다.', options: [
      { label: '열게 한다', res: { offering: 30, heart: -2 }, vital: 10, result: '후원금이 넉넉히 모였다. 몇몇 교우는 눈살을 찌푸렸다.' },
      { label: '조촐한 자선 행사로 바꾸자고 한다', res: { offering: 10, heart: 1 }, vital: 3, result: '모두가 함께하는 자선 걷기 대회가 열렸다.' },
      { label: '본당 이름은 쓰지 말라고 한다', vital: -6, result: '골프선교회가 서운해했다.' },
    ] },
  ],
  eucharist: [
    { text: '성체분배회가 봉성체 갈 때 쓸 차량 기름값을 지원받고 싶어 합니다.', options: [
      { label: '기름값을 지원한다', cost: 15, res: { heart: 3 }, vital: 8, result: '봉성체를 받은 어르신이 눈물을 흘리며 고마워했다.' },
      { label: '신부님이 함께 다닌다', energy: 2, res: { heart: 2 }, vital: 6, result: '신부님과 함께 온 봉성체에 어르신들이 반가워했다.' },
      { label: '각자 알아서 다니자고 한다', vital: -5, result: '봉성체를 기다리던 몇 분이 이번 달은 거르셨다.' },
    ] },
  ],
  mothers: [
    { text: '성모회가 어르신들께 반찬 나눔을 하고 싶어 합니다.', options: [
      { label: '재료비를 지원한다', cost: 20, res: { heart: 3, reputation: 1 }, vital: 8, result: '반찬통을 받아 든 어르신들이 활짝 웃으셨다.' },
      { label: '성모회 회비로 하자고 한다', vital: -3, res: { heart: 1 }, result: '자매들이 조금 서운해하면서도 정성껏 준비했다.' },
      { label: '다음에 하자고 한다', vital: -5, result: '자매들이 아쉬워했다.' },
    ] },
  ],
  facility: [
    { text: '시설관리팀이 낡은 공구를 새로 사고 싶어 합니다.', options: [
      { label: '공구를 사 준다', cost: 25, vital: 10, result: '새 공구에 팀원들이 신이 났다. 다음 봉사가 기다려진다.' },
      { label: '빌려 쓰자고 한다', vital: -2, result: '옆 본당에서 공구를 빌려 왔다.' },
      { label: '지금 것으로 버틴다', vital: -5, result: '녹슨 망치를 든 팀장님이 한숨을 쉬었다.' },
    ] },
  ],
  organ: [
    { text: '반주단이 낡은 전자 오르간을 바꾸고 싶어 합니다.', options: [
      { label: '새 오르간을 들인다', cost: 40, res: { heart: 3 }, vital: 10, result: '맑은 오르간 소리에 성가가 살아났다.' },
      { label: '수리해서 쓰자고 한다', cost: 10, vital: 3, result: '조율을 마치니 그럭저럭 쓸 만하다.' },
      { label: '지금 것으로 버틴다', vital: -5, res: { heart: -1 }, result: '음이 하나씩 빠지는 오르간에 반주자가 한숨을 쉰다.' },
    ] },
  ],
  lector: [
    { text: '전례해설단이 독서자 교육을 따로 열고 싶어 합니다.', options: [
      { label: '강사를 모셔 교육한다', cost: 15, stat: { doctrine: 1 }, vital: 8, result: '또박또박한 독서에 교우들이 귀를 기울였다.' },
      { label: '신부님이 직접 가르친다', energy: 2, vital: 6, result: '신부님 교육에 해설단이 감동했다.' },
      { label: '지금도 충분하다고 한다', vital: -4, result: '해설단은 조금 서운해했다.' },
    ] },
  ],
  server: [
    { text: '성인 복사단이 복사복을 새로 맞추고 싶어 합니다.', options: [
      { label: '새로 맞춰 준다', cost: 25, res: { reputation: 2 }, vital: 8, result: '단정한 복사복에 미사가 한결 장엄해졌다.' },
      { label: '각자 마련하자고 한다', vital: -3, res: { heart: 1 }, result: '복사들이 자비로 맞췄다. 조금 부담스러워한다.' },
      { label: '다음 해로 미룬다', vital: -5, result: '해진 소매가 눈에 띈다.' },
    ] },
  ],
  vocation: [
    { text: '성소분과가 예비신학생 여름 캠프를 열고 싶어 합니다.', options: [
      { label: '캠프를 지원한다', cost: 35, res: { heart: 3 }, vital: 10, after: () => { Game.state.pastor.vocBoost = (Game.state.pastor.vocBoost || 0) + 1; }, result: '아이들이 "신부님처럼 되고 싶어요" 하고 말했다.' },
      { label: '본당에서 하루만 하자고 한다', cost: 10, vital: 4, result: '작지만 알찬 하루였다.' },
      { label: '올해는 쉬자고 한다', vital: -6, result: '예비신학생 몇이 모임에 나오지 않았다.' },
    ] },
  ],
  district: [
    { text: '구역장들이 반모임 자료가 낡았다며 새 묵상 자료를 만들고 싶다고 합니다.', options: [
      { label: '자료 제작비를 지원한다', cost: 25, res: { heart: 3 }, vital: 10, result: '새 자료로 반모임이 한결 풍성해졌다.' },
      { label: '신부님이 직접 묵상 글을 써 준다', energy: 4, res: { heart: 2 }, vital: 6, stat: { doctrine: 1.5 }, result: '신부님 글이라며 반원들이 돌려 읽었다.' },
      { label: '지난 자료를 다시 쓰자고 한다', vital: -6, result: '"알겠습니다, 신부님." 조금 아쉬운 눈치다.' },
    ] },
    { text: '산 너머 사는 교우 집이 멀어 반모임에 못 온다고 합니다. 반을 하나 더 나누자는 건의입니다.', options: [
      { label: '반을 나누고 새 반장 교육비를 댄다', cost: 20, res: { members: 6 }, vital: 6, result: '새 반장이 세워졌다. 멀리 사는 교우들이 반가워했다.' },
      { label: '한 달에 한 번 신부님이 그 동네로 간다', energy: 4, res: { members: 3, heart: 2 }, stat: { rapport: 1.5 }, result: '신부님이 오시는 날이면 그 집 마루가 꽉 찼다.' },
      { label: '지금대로 하자고 한다', vital: 2, res: { members: -2 }, result: '반모임은 단단하지만, 먼 데 교우들은 발걸음이 뜸해졌다.' },
    ] },
  ],
  legio: [
    { text: '레지오 단원들이 병원 방문 활동을 시작하고 싶어 합니다. 교통비 지원을 청합니다.', options: [
      { label: '교통비를 지원한다', cost: 20, res: { reputation: 4 }, vital: 8, hidden: { holiness: 1 }, result: '단원들이 매주 병원을 찾았다. 환자 가족들이 성당 이야기를 묻기 시작했다.' },
      { label: '신부님 차로 함께 다닌다', energy: 4, res: { reputation: 3 }, vital: 5, hidden: { holiness: 2 }, result: '병실마다 신부님이 오셨다며 반겼다.' },
      { label: '각자 부담하자고 한다', vital: -5, result: '몇몇 단원만 다녀왔다.' },
    ] },
    { text: '단원이 줄어 쁘레시디움 하나를 합치자는 의견과, 새 단원을 모집하자는 의견이 갈립니다.', options: [
      { label: '모집 광고와 입단 피정을 연다', cost: 20, res: { members: 4 }, vital: 6, result: '세 분이 새로 입단했다.' },
      { label: '두 쁘레시디움을 합친다', vital: 4, other: { type: 'elders', vital: -4 }, result: '모임은 단단해졌다. 다만 어르신 단원들이 정든 모임을 잃어 서운해했다.' },
      { label: '그대로 두고 지켜본다', vital: -4, result: '의견이 갈린 채로 한 달이 지났다.' },
    ] },
  ],
  elders: [
    { text: '어르신들이 봄 성지순례를 가고 싶어 하십니다. 버스 대절비가 필요합니다.', options: [
      { label: '본당에서 버스비를 낸다', cost: 35, res: { heart: 5 }, vital: 10, result: '어르신들이 소풍 가는 아이들처럼 즐거워하셨다.' },
      { label: '청년회 차로 가까운 성지에 다녀온다', energy: 3, res: { heart: 3 }, vital: 5, other: { type: 'youth', vital: -4 }, result: '"그래도 바람 쐬니 좋네." 운전한 청년들은 녹초가 됐다.' },
      { label: '올해는 성당에서 십자가의 길로 대신한다', vital: -5, result: '어르신들이 고개를 끄덕이셨지만 아쉬움이 남았다.' },
    ] },
    { text: '거동이 불편한 어르신들이 모임에 못 오신다며 차량 봉사를 부탁합니다.', options: [
      { label: '승합차 기름값을 본당이 댄다', cost: 20, res: { heart: 3 }, vital: 8, result: '매주 승합차가 마을을 돌았다.' },
      { label: '청년들에게 차량 봉사를 부탁한다', vital: 6, res: { heart: 2 }, other: { type: 'youth', vital: -6 }, result: '청년들이 순번을 짜서 모시기로 했다. 다만 청년회 모임이 조금 비었다.' },
      { label: '당분간 어렵다고 한다', vital: -6, result: '몇몇 어르신의 빈자리가 쓸쓸하다.' },
    ] },
  ],
  catechumen: [
    { text: '예비신자 중 직장인이 많아 평일 저녁반을 하나 더 열어 달라고 합니다.', options: [
      { label: '저녁반을 연다 (교리교사 수고비)', cost: 25, res: { members: 6 }, vital: 6, result: '퇴근길 예비신자들이 하나둘 모였다.' },
      { label: '신부님이 저녁반을 직접 맡는다', energy: 4, res: { members: 4, heart: 1 }, stat: { doctrine: 1 }, result: '"신부님한테 직접 배워요." 소문이 났다.' },
      { label: '주일반만 운영한다', vital: -5, res: { members: -2 }, result: '두 사람이 교리를 그만두었다.' },
    ] },
  ],
  choir: [
    { text: '성가대가 낡은 반주기를 바꾸고 싶어 합니다.', options: [
      { label: '새 반주기를 산다', cost: 45, res: { heart: 4 }, vital: 10, result: '주일미사 성가가 몰라보게 좋아졌다.' },
      { label: '수리해서 더 쓰자고 한다', cost: 10, vital: 3, result: '소리는 조금 나아졌다.' },
      { label: '반주기 없이 무반주 성가를 해 보자고 한다', energy: 2, vital: -3, res: { heart: 1 }, result: '처음엔 어색했지만 몇몇 교우는 오히려 좋다고 했다.' },
    ] },
    { text: '성탄 음악회를 열어 마을 주민들을 초대하자는 건의입니다.', options: [
      { label: '음악회를 크게 연다 (다과·현수막)', cost: 30, res: { reputation: 6, heart: 2 }, vital: 6, result: '마을 사람들이 성당 마당을 가득 채웠다.' },
      { label: '성당 안에서 조촐하게 연다', energy: 3, res: { reputation: 3 }, vital: 4, result: '작지만 따뜻한 음악회였다.' },
      { label: '올해는 미루자고 한다', vital: -6, result: '단원들이 준비하던 악보를 접었다.' },
    ] },
  ],
  school: [
    { text: '주일학교 교사들이 여름 신앙학교 캠프를 열고 싶어 합니다.', options: [
      { label: '1박 2일 캠프 비용을 지원한다', cost: 45, res: { members: 5, heart: 2 }, vital: 10, result: '아이들이 까맣게 그을려 돌아왔다. 부모들도 성당에 자주 나온다.' },
      { label: '성당 마당에서 하루, 신부님도 함께한다', energy: 4, res: { members: 2, heart: 2 }, vital: 5, stat: { rapport: 1 }, result: '짧았지만 아이들은 신부님과 물총 싸움을 했다고 자랑했다.' },
      { label: '교사들이 지쳐 보이니 올해는 쉬게 한다', vital: -2, other: { type: 'catechumen', vital: 3 }, result: '교사들이 숨을 돌렸다. 남는 교사 둘이 예비신자 교리를 거들었다.' },
    ] },
  ],
  youth: [
    { text: '청년회가 성당 마당 정리와 화단 가꾸기를 맡겠다고 합니다. 연장 구입비를 청합니다.', options: [
      { label: '연장과 꽃모종을 사 준다', cost: 20, res: { heart: 3 }, vital: 8, result: '성당 마당이 깔끔해졌다. 어르신들이 청년들을 칭찬했다.' },
      { label: '신부님도 장갑 끼고 함께한다', energy: 3, res: { heart: 2 }, vital: 6, stat: { rapport: 1 }, result: '삽 두 자루로 버텼지만 다들 웃으며 일했다.' },
      { label: '그 시간에 공사를 거들어 달라고 한다', vital: -4, result: '청년들이 공사장으로 갔다. 화단은 내년으로 미뤘다.' },
    ] },
  ],
  vincent: [
    { text: '빈첸시오회가 혼자 사는 어르신 댁 연탄 나눔을 하고 싶어 합니다.', options: [
      { label: '연탄값을 본당이 보탠다', cost: 35, res: { reputation: 6 }, vital: 8, hidden: { holiness: 2 }, result: '마을 골목마다 연탄이 쌓였다. 면사무소에서 감사 전화가 왔다.' },
      { label: '주일 2차 헌금을 걷는다', res: { reputation: 4, heart: -2 }, vital: 6, hidden: { holiness: 1 }, result: '연탄은 넉넉했지만, 헌금이 잦다는 볼멘소리도 들렸다.' },
      { label: '회원들 회비로 하자고 한다', vital: -4, res: { reputation: 1 }, result: '조금만 나눌 수 있었다.' },
    ] },
  ],
  altar: [
    { text: '제대회가 낡은 제대포와 제의를 새로 장만하고 싶어 합니다.', options: [
      { label: '새로 장만해 준다', cost: 30, res: { heart: 3 }, vital: 8, result: '정갈한 제대에 교우들이 감탄했다.' },
      { label: '수선해서 더 쓰자고 한다', cost: 8, vital: 2, result: '꼼꼼히 기워 깨끗해졌다.' },
      { label: '지금 것으로 버틴다', vital: -5, res: { heart: -1 }, result: '해진 제의가 눈에 밟힌다.' },
    ] },
  ],
  flower: [
    { text: '헌화회가 성탄 꽃꽂이를 크게 하고 싶다고 합니다.', options: [
      { label: '꽃값을 넉넉히 지원한다', cost: 30, res: { heart: 4 }, vital: 8, result: '성당 가득 꽃향기가 났다.' },
      { label: '마당 꽃으로 하자고 한다', energy: 2, res: { heart: 2 }, vital: 3, result: '소박하지만 정성스러웠다.' },
      { label: '올해는 조촐하게', vital: -5, result: '회원들이 아쉬워했다.' },
    ] },
  ],
  school2: [
    { text: '중고등부 교사들이 학생들과 봉사 캠프를 가고 싶어 합니다.', options: [
      { label: '캠프 비용을 지원한다', cost: 35, res: { members: 4, heart: 2 }, vital: 8, result: '아이들이 친구들을 데려오기 시작했다.' },
      { label: '본당 안에서 봉사하자고 한다', energy: 3, res: { members: 2 }, vital: 4, result: '성당 대청소가 축제처럼 됐다.' },
      { label: '시험 기간이니 미루자고 한다', vital: -5, other: { type: 'school', vital: 2 }, result: '학생들은 공부에 집중했다.' },
    ] },
  ],
  adults: [
    { text: '청장년회가 본당 체육대회를 열자고 합니다.', options: [
      { label: '체육대회 비용을 지원한다', cost: 35, res: { heart: 4, members: 2 }, vital: 8, result: '온 본당이 운동장에 모였다.' },
      { label: '회비로 하되 신부님이 참석한다', energy: 3, res: { heart: 2 }, vital: 5, stat: { rapport: 1 }, result: '신부님 달리기에 다들 웃었다.' },
      { label: '바쁜 철이니 쉬자고 한다', vital: -5, result: '회원들이 아쉬워했다.' },
    ] },
  ],
  shop: [
    { text: '물품판매에서 마을 농산물을 직거래로 팔자고 합니다. 진열대가 필요합니다.', options: [
      { label: '진열대를 사 준다', cost: 25, res: { reputation: 2 }, vital: 8, after: () => addRes('offering', scaledCost(15)), result: '농산물이 잘 팔려 수익이 났다.' },
      { label: '헌 책상으로 대신한다', vital: 3, result: '그럭저럭 팔렸다.' },
      { label: '본당이 장사하는 건 조심스럽다', vital: -6, res: { heart: 1 }, result: '어르신 몇 분은 잘했다고 하셨다.' },
    ] },
  ],
  relics: [
    { text: '성물방에서 비싼 성물을 들여오자는 의견과 값싼 묵주를 많이 들이자는 의견이 갈립니다.', options: [
      { label: '좋은 성물을 들인다', cost: 40, res: { heart: 2 }, vital: 6, after: () => addRes('offering', scaledCost(25)), result: '순례객들이 좋은 성물을 사 갔다.' },
      { label: '값싼 묵주를 많이 들인다', cost: 15, res: { members: 1 }, vital: 4, after: () => addRes('offering', scaledCost(10)), result: '아이들도 묵주를 하나씩 샀다.' },
      { label: '지금대로 둔다', vital: -3, result: '진열대가 조금 썰렁하다.' },
    ] },
  ],
  cafe: [
    { text: '성당 카페에서 주중에도 문을 열어 마을 사람들에게 열자고 합니다.', options: [
      { label: '주중 운영을 허락하고 지원한다', cost: 30, res: { reputation: 4 }, vital: 8, after: () => addCatechumens(2), result: '이웃들이 차를 마시러 왔다가 교리를 물었다.' },
      { label: '주일에만 연다', vital: 2, result: '주일 아침이 북적였다.' },
      { label: '봉사자 부담이 크니 쉬자', vital: -6, res: { heart: 1 }, result: '봉사자들은 한숨 돌렸다.' },
    ] },
  ],
  prayer: [
    { text: '성령기도회가 밤샘 기도회를 열자고 합니다. 이웃 소음 걱정도 있습니다.', options: [
      { label: '열되 방음 커튼을 단다', cost: 25, res: { heart: 4 }, vital: 8, result: '뜨거운 찬양이 새벽까지 이어졌다.' },
      { label: '저녁까지만 하자고 한다', res: { heart: 2 }, vital: 3, result: '아쉽지만 다들 은혜로웠다.' },
      { label: '마을에 폐가 될까 미룬다', vital: -5, res: { reputation: 1 }, result: '이웃은 조용했지만 회원들은 서운했다.' },
    ] },
  ],
  mission: [
    { text: '선교분과가 마을 장터에 성당 안내 부스를 내고 싶어 합니다.', options: [
      { label: '부스 비용을 지원한다', cost: 25, res: { reputation: 3 }, vital: 8, after: () => addCatechumens(4), result: '장터 사람들이 성당 안내지를 받아 갔다. 교리를 묻는 사람이 생겼다.' },
      { label: '신부님도 부스에 나간다', energy: 3, res: { reputation: 2 }, vital: 6, stat: { rapport: 1 }, after: () => addCatechumens(3), result: '"신부님이 직접 나오셨네!" 사람들이 반가워했다.' },
      { label: '이번엔 안내지만 돌린다', vital: -3, after: () => addCatechumens(1), result: '안내지 몇 장이 돌았다.' },
    ] },
  ],
};

// ---------- 사목회장과 함께하는 첫 운영 안내 ----------
// 단계마다 사목회장(c)과 주임 신부(p)가 주고받는 대화. 신부의 말은 대답 버튼으로 나온다
// 대화가 끝나고 신부가 그 일을 하면(done) 다음 단계로 넘어간다
// goal: 할 일 목록에 보이는 한 줄, go: 할 일을 누르면 갈 곳, mark: 반짝일 아래 버튼
// map: 지도에서 화살표로 가리킬 곳, opts: 창이 열리면 눌러야 할 선택지(글자 일부, 먼저 보이는 것)
const COUNCIL_NAME = '사목회장 박 요셉';
const TUTORIAL = [
  {
    id: 'welcome', goal: '🔨 짓기로 컨테이너 교리실 놓기', go: 'plot', mark: 'build', opts: ['교리실'],
    talk: [
      ['c', '신부님, 먼 길 오시느라 고생 많으셨습니다. 저는 이 본당 사목회장 박 요셉입니다.'],
      ['p', '반갑습니다, 요셉 형제님. 앞으로 잘 부탁드립니다.'],
      ['c', '보시다시피 솔뫼는 작은 산골 본당이에요. 교우는 120명 남짓이고, 대부분 일흔이 넘으셨지요.'],
      ['p', '성당 말고는 건물이 거의 없네요. 단체들은 어디서 모이나요?'],
      ['c', '그게 걱정입니다. 모일 곳이 없어서 단체가 다 흩어졌어요. 우선 교우들이 모일 교리실이 있어야겠습니다.'],
      ['c', '다만 성당 땅이 오래 버려져서 잡초랑 돌투성이예요. 지금은 성당 앞 작은 빈터에만 지을 수 있습니다.'],
      ['c', '아래 <b>짓기</b>를 눌러 빈터에 컨테이너를 하나 놓아 보시지요. 초록색으로 보이는 자리에 놓으시면 됩니다.'],
      ['p', '좋아요, 바로 놓아 볼게요.'],
    ],
    done: () => containerCount() > 0,
  },
  {
    id: 'building', goal: '🏗️ 교리실 공사 기다리기 (공사 중인 건물을 누르면 거들 수 있어요)', go: 'firstContainer', map: 'firstContainer', opts: ['공사 거들기'],
    talk: [
      ['c', '좋습니다! 교우들이 벌써 컨테이너를 내리고 있네요.'],
      ['p', '금방 끝나나요?'],
      ['c', '공사는 시간이 좀 걸려요. 공사 중인 건물을 누르시면 신부님이 직접 거들거나, 💎 다이아로 바로 끝낼 수도 있습니다.'],
      ['p', '그럼 저도 가서 손을 보태야겠네요.'],
    ],
    done: () => containers().some(([, c]) => c.built),
  },
  {
    id: 'group', goal: '🚪 교리실을 눌러 단체 만들기 (소공동체나 레지오)', go: 'freeRoom', map: 'freeRoom', opts: ['빈 방', '구역·반', '추천'],
    talk: [
      ['c', '교리실이 다 됐습니다. 방이 두 칸이라 단체 둘이 모일 수 있어요.'],
      ['p', '어떤 단체부터 꾸리면 좋을까요?'],
      ['c', '처음엔 <b>소공동체</b>를 추천드려요. 동네마다 반으로 모이니 교무금이 잘 걷혀서 봉헌이 늘어납니다.'],
      ['c', '<b>레지오</b>도 좋아요. 성당에 안 나오시는 분들을 찾아가서 모셔 오거든요.'],
      ['p', '알겠습니다. 교리실에 가서 단체를 만들어 볼게요.'],
    ],
    done: () => allGroups().length > 0,
  },
  {
    id: 'clear', goal: '🌿 잡초를 눌러 뽑기 (빈터 넓히기)', go: null, map: 'weed', opts: ['잡초 뽑기'],
    talk: [
      ['c', '교리실이 하나 생기니 금방 또 자리가 모자라겠어요. 빈터를 넓혀 두시지요.'],
      ['p', '잡초랑 돌은 어떻게 치우나요?'],
      ['c', '<b>잡초</b>는 신부님이 직접 뽑으시면 바로 치워져요. <b>돌</b>과 <b>어린나무</b>는 일꾼이 들어내야 하고 봉헌금이 조금 듭니다.'],
      ['c', '성당 옆 마을 집들도 땅을 사서 넓힐 수 있어요. 교우 댁은 교우들 마음이, 비신자 댁은 마을 평판이 좋아야 팔겠다고 하실 거예요.'],
      ['p', '우선 잡초부터 뽑아 볼게요.'],
    ],
    done: () => Object.keys(Game.state.pastor.cleared || {}).length >= 1,
  },
  {
    id: 'collect', goal: '🧺 건물 위 말풍선을 눌러 봉헌 거두기', go: null, map: 'bubble', opts: ['거두기'],
    talk: [
      ['c', '단체가 생기니 성당에 활기가 도네요. 단체마다 정해진 <b>회의 시간</b>이 있어요.'],
      ['p', '회의에 제가 꼭 가야 하나요?'],
      ['c', '신부님이 들르시면 다들 힘이 나서 더 열심히 합니다. 안 오시면 조금 서운해하고요.'],
      ['c', '그리고 헌금함이나 단체에 봉헌이 쌓이면 건물 위에 💰 말풍선이 떠요. 눌러서 거두시면 됩니다. 오래 두면 가득 차서 더 쌓이지 않아요.'],
      ['p', '틈틈이 들러서 거둘게요.'],
    ],
    done: () => !!(Game.state.pastor.tutorial && Game.state.pastor.tutorial.collected),
  },
  {
    id: 'sunday', goal: '⛪ 주일미사 드리기 (아래 주일미사)', go: 'church', mark: 'church', opts: ['주일미사 봉헌'],
    talk: [
      ['c', '이제 주일이 다가옵니다. 교우들이 새 신부님 강론을 많이 기다리고 있어요.'],
      ['p', '조금 떨리네요. 무엇을 준비하면 좋을까요?'],
      ['c', '강론이 좋으면 <b>신자들의 마음</b>이 열리고, 마음이 열려야 봉헌도 늘고 새 신자도 찾아옵니다. 성당에서 강론 준비를 하시면 더 좋고요.'],
      ['p', '정성껏 준비해서 미사를 드리겠습니다.'],
    ],
    done: () => Game.state.pastor.week > 0,
  },
  {
    id: 'rectory', goal: '🏠 사제관을 눌러 Lv2로 고치기', go: 'rectory', map: 'rectory', opts: ['사제관 고치기'],
    talk: [
      ['c', '은혜로운 미사였습니다, 신부님. 교우들 얼굴이 환해졌어요.'],
      ['p', '다들 따뜻하게 맞아 주셔서 감사했어요. 이제 무엇부터 손볼까요?'],
      ['c', '성당을 넓히려면 교구에서 정한 조건이 있어요. 먼저 <b>사제관</b>부터 고치셔야 합니다. 사제관이 좋아지면 신부님도 더 오래 일하실 수 있고요.'],
      ['p', '사제관부터 손보겠습니다.'],
    ],
    done: () => Game.state.pastor.fixed.rectory >= 2,
  },
  {
    id: 'church2', goal: '⛪ 성당을 눌러 Lv2로 증축하기', go: 'church', mark: 'church', opts: ['성당 증축', '증축 시작'],
    talk: [
      ['c', '사제관이 말끔해졌네요! 이제 <b>성당 증축</b>을 해 볼 수 있어요.'],
      ['p', '조건은 다 채웠나요?'],
      ['c', '신자 수와 사제관, 교리실이 조건이에요. 성당을 누르시면 무엇이 모자란지 알려 줍니다. 신자는 강론을 잘하실수록, 신부님 강론력과 친화력이 높을수록 더 많이 찾아와요.'],
      ['p', '좋아요, 증축해 봅시다.'],
    ],
    done: () => Game.state.pastor.fixed.church >= 2,
  },
  {
    id: 'grow', goal: null, go: null,
    talk: [
      ['c', '신부님, 성당이 한결 넓어졌어요! 교우들이 정말 기뻐합니다.'],
      ['p', '다 같이 애쓴 덕분이에요. 그런데 주일 봉헌 일부가 교구로 나가던데요?'],
      ['c', '네, <b>교구 공납금</b>입니다. 교구 살림과 어려운 본당을 돕는 데 쓰이지요. 우리처럼 작은 본당은 거꾸로 교구 지원금을 받고요.'],
      ['p', '그렇군요. 앞으로 본당을 어떻게 키워 가면 될까요?'],
      ['c', '앞으로도 성당을 넓히려면 <b>사제관, 사무실, 교리실</b>을 함께 키워야 합니다. 사무실 금고가 커야 큰 공사비도 모아 둘 수 있어요.'],
      ['c', '처음 얼마 동안은 교우들이 열심히 거들어 줘서 공사가 빠르고 쌉니다. 그동안 기틀을 잘 잡아 두세요.'],
      ['p', '고맙습니다, 형제님. 모르는 게 있으면 또 여쭤볼게요.'],
      ['c', '언제든지요. 아래 <b>본당 현황</b>에서 저를 찾으시면 됩니다. 잘 부탁드립니다, 신부님!'],
    ],
    done: () => true,
  },
];

// 운영 중 처음 생긴 일에 사목회장이 한마디 (한 번씩만)
const COUNCIL_TIPS = [
  { id: 'vaultFull', when: () => Game.state.pastor.res.offering >= vaultCap(), talk: [
    ['c', '신부님, 사무실 금고가 꽉 찼어요. 이 이상은 봉헌을 받아 둘 곳이 없습니다.'],
    ['p', '아까운걸요. 어떻게 하면 좋을까요?'],
    ['c', '사무실을 키우시거나, 공사에 먼저 쓰시지요.'],
    ['p', '알겠습니다.'],
  ] },
  { id: 'committee', when: () => committeeUnlocked(), talk: [
    ['c', '신부님, 이제 위원장이 여럿 세워져서 <b>상임위원회</b>를 열 수 있어요! 위원장들이 단체 회의를 이끌고, 각 단체의 어려움과 건의는 상임위로 올라옵니다.'],
    ['p', '이제 모든 회의에 일일이 가지 않아도 되겠네요.'],
    ['c', '네. 대신 건의가 올라오면 저를 찾아 주세요. 하루 한 번 상임위를 열 수 있어요.'],
    ['p', '꼭 챙기겠습니다.'],
  ] },
  { id: 'newbieEnd', when: () => Game.state.pastor.fixed.church > NEWBIE.maxChurch, talk: [
    ['c', '신부님, 본당이 제법 자리를 잡았네요! 이제 교우들 일손이 처음만큼 넉넉하지는 않아서, 공사가 예전처럼 빠르진 않을 거예요.'],
    ['p', '그동안 다들 고생 많으셨어요.'],
    ['c', '본당이 커진 만큼 할 수 있는 일도 많아졌습니다. 천천히 함께 가시지요.'],
    ['p', '네, 함께 가요.'],
  ] },
  { id: 'staff', when: () => Game.state.pastor.fixed.church >= 3 && Game.state.pastor.teams === 1, talk: [
    ['c', '신부님, 본당이 커지니 봉사자 교우 한 분으로는 공사 일손이 모자라요. 곧 성당 증축에는 일꾼이 둘은 있어야 할 거예요.'],
    ['p', '일꾼을 더 구할 수 있을까요?'],
    ['c', '사무실에서 채용 공고를 내시면 <b>관리장</b>님이나 <b>사무원</b>을 모실 수 있어요. 채용에는 💎 다이아가 들고, 모신 뒤에는 인건비가 봉헌금에서 나갑니다. 나중엔 사무원, 사무장도 모실 수 있고요.'],
    ['p', '살림을 보면서 모셔야겠네요.'],
  ] },
  { id: 'sister', when: () => Game.state.pastor.fixed.church >= SISTER.church && !sisters().length, talk: [
    ['c', '신부님, 이제 본당 규모면 수녀회에 <b>수녀님</b> 파견을 요청해 볼 만해요.'],
    ['p', '수녀님이 오시면 어떤 일을 맡아 주실까요?'],
    ['c', '신부님이 못 가시는 <b>단체 회의</b>를 대신 맡아 주시거나, <b>예비자 교리</b>를 맡아 주실 수 있어요. 생활비는 본당이 드려야 하고요. 위쪽 👷에서 요청하실 수 있습니다.'],
    ['p', '좋아요, 생각해 볼게요.'],
  ] },
  { id: 'cate', when: () => Game.state.pastor.cate && Game.state.pastor.cate.n >= 3, talk: [
    ['c', '신부님, 교리를 받고 싶다는 분들이 찾아오기 시작했어요! 예비신자가 벌써 몇 분 되세요.'],
    ['p', '반가운 일이네요. 어떻게 도와드리면 될까요?'],
    ['c', '네 주일마다 <b>세례식</b>이 있어요. 신부님이 <b>교리 준비</b>를 잘 하실수록 끝까지 마치는 분이 많아요. <b>교리반</b> 단체를 키우면 더 많이 받을 수 있고, <b>선교분과</b>나 <b>홍보</b>로 찾아오는 분을 늘릴 수도 있어요.'],
    ['p', '위쪽 📘를 누르면 볼 수 있겠군요. 정성껏 준비할게요.'],
  ] },
  { id: 'org', when: () => ORG.some(orgReady), talk: [
    ['c', '신부님, 한 분과의 단체들이 모두 자리를 잡았어요. 이제 그 분과를 이끌 <b>위원장</b>을 세울 수 있습니다!'],
    ['p', '위원장이 생기면 무엇이 달라지나요?'],
    ['c', '그 분과 단체들은 신부님이 일일이 가시지 않아도 <b>스스로 회의</b>를 해요. 위원장이 <b>세 분</b> 이상이 되면 <b>상임위원회</b>가 열려서, 신부님은 상임위에서 안건만 정하시면 됩니다.'],
    ['p', '조직도에서 선임하면 되겠군요.'],
  ] },
  { id: 'policy', when: () => allGroups().filter(x => x.g.level).length >= 2, talk: [
    ['c', '신부님, 단체들이 행사를 하면 지원금을 청해 옵니다. 그때마다 정하시기보다 <b>지출 기준</b>을 정해 두시면 편해요.'],
    ['p', '어떤 기준을 정하면 되나요?'],
    ['c', '교육·연수비는 전액인지 반액인지, 버스 대여비는 본당이 낼지 단체가 알아서 할지, 식사비와 재료비는 어떻게 할지요. 본당이 많이 낼수록 행사는 풍성하지만 살림이 빠듯해집니다.'],
    ['p', '사무실이나 본당 현황에서 정해 둘게요.'],
  ] },
  { id: 'plan', when: () => (Game.state.pastor.plans || []).length > 0, talk: [
    ['c', '신부님, 행사를 준비하던 단체에서 돈이 더 필요하다고 <b>추가 지원</b>을 청해 왔어요.'],
    ['p', '들어주면 어떻게 되고, 거절하면 어떻게 되나요?'],
    ['c', '들어주시면 행사가 훨씬 풍성해지고, 거절하시면 회원들이 알아서 메우거나 행사를 줄이게 돼요. 지출 기준에서 "늘 승낙"이나 "늘 거절"로 정해 두실 수도 있어요.'],
    ['p', '살림을 보면서 잘 판단해 볼게요.'],
  ] },
  { id: 'levyDue', when: () => Game.state.pastor.levyDue > 0, talk: [
    ['c', '신부님, 이번 주 교구 공납금을 다 못 냈어요. 밀린 공납금이 있으면 교구에서 증축 허가가 안 나옵니다.'],
    ['p', '이런, 살림을 좀 더 챙겨야겠네요.'],
    ['c', '사무실에서 언제든 갚으실 수 있어요.'],
    ['p', '곧 정리할게요.'],
  ] },
];

// 넓힐 수 있는 마을
const VILLAGES = {
  v1: { name: '윗말', elder: '윗말 이장님', visits: 3, need: { church: 3, reputation: 22 } },
};

// 주일미사 뒤에 생길 수 있는 이벤트 (주임 신부)
// 선택지는 얻는 것·잃는 것을 미리 보여 준다: cost(봉헌금, 본당 규모만큼 커짐), energy(행동력), res(자원, offering은 본당 규모만큼),
// hidden(숨은 수치: holiness 성덕, ambition 야망), stat(능력치), trust(교구의 신뢰), risk(나중에 생길 수 있는 일), after(그 밖의 일)
// chance: 운에 따라 갈리는 결과 { p: 확률(숫자나 함수), win: {res…, result}, lose: {res…, result} }. 확률은 미리 보여 준다
// ---------- 축복 예식 (v0.76) ----------
// 교우들이 축복을 청한다. 다녀오면 가족이 감사 봉헌을 해 본당 운영비가 된다 (값은 살림에 따라 오름)
const BLESSINGS = [
  { id: 'car', name: '차량 축복', icon: '🚗', energy: 2, gift: [8, 18], heart: 1, days: 2, weight: 3,
    who: ['베드로 형제', '안나 자매', '요셉 형제', '마르타 자매', '바오로 형제'], why: ['새 차를 샀다며', '아들이 첫 차를 장만했다며', '택시 일을 새로 시작한다며', '트럭을 바꿨다며'],
    done: ['성수를 뿌리고 안전한 길을 위해 기도했다. 운전대에 작은 묵주를 걸어 주었다.', '가족이 모두 나와 함께 기도했다. "이제 마음 놓고 다니겠어요."'] },
  { id: 'shop', name: '상가 축복', icon: '🏪', energy: 3, gift: [15, 35], rep: 1, heart: 0.5, days: 2, weight: 2,
    who: ['미카엘 형제네', '데레사 자매네', '프란치스코 형제네', '루치아 자매네'], why: ['읍내에 식당을 열었다며', '빵집 문을 연다며', '작은 꽃집을 차렸다며', '철물점을 넓혔다며'],
    done: ['가게 구석구석에 성수를 뿌리고 정직하게 일하는 손을 축복했다. 이웃 상인들도 구경을 나왔다.', '문 위에 십자가를 걸고 함께 주님의 기도를 바쳤다. 첫 손님이 들어왔다.'] },
  { id: 'anoint', name: '병자성사', icon: '🕊️', energy: 2, gift: [5, 14], heart: 2, days: 1, weight: 2, urgent: true,
    who: ['요셉 할아버지 댁', '마리아 할머니 댁', '안드레아 형제 댁', '모니카 자매 댁'], why: ['편찮으신 어르신이 위중하시다며', '수술을 앞두고 있다며', '오래 앓아 누워 계시다며'],
    done: ['성유를 바르고 기도하자 환자의 얼굴이 한결 편안해졌다. 가족들이 손을 꼭 잡았다.', '고해성사와 병자 영성체를 함께 드렸다. "신부님이 오시니 이제 두렵지 않아요."'] },
];
const BLESS = { rate: 0.05, max: 3, afterMass: 0.55 };  // 한 시간에 요청이 올 확률(신자가 많을수록 더), 쌓이는 최대, 미사 뒤 찾아올 확률
// 미사 뒤 찾아오는 교우: 안수 또는 성물 축복
const AFTER_MASS = [
  { id: 'hands', name: '안수', icon: '🙌', energy: 1, heart: 1, rapport: 1, gift: [0, 0],
    text: ['한 자매가 다가와 "신부님, 시험을 앞둔 딸에게 안수해 주세요" 하고 고개를 숙였다.', '한 형제가 "요즘 마음이 너무 무거워요. 안수 한 번 해 주시겠어요?" 하고 청했다.', '할머니가 손주를 데려와 "우리 강아지 머리에 손 한번 얹어 주세요" 하신다.'],
    done: '머리에 손을 얹고 조용히 기도해 주었다. 고개를 든 얼굴이 밝아졌다.' },
  { id: 'items', name: '성물 축복', icon: '📿', energy: 1, heart: 0.5, rapport: 0.5, gift: [3, 8],
    text: ['한 형제가 새로 산 묵주와 십자고상을 내밀며 축복해 달라고 했다.', '첫영성체를 앞둔 아이가 엄마와 함께 새 묵주를 들고 왔다.', '자매 셋이 성모상과 성물을 한 아름 안고 기다리고 있었다.'],
    done: '성수를 뿌리고 축복 기도를 바쳤다. 고맙다며 감사 봉헌을 하고 갔다.' },
];

const PASTOR_EVENTS = [
  {
    id: 'snow', title: '눈 쌓인 길',
    text: '밤새 눈이 내려 산길이 막혔다. 혼자 사시는 데레사 할머니가 미사에 못 오셨다고 한다.',
    options: [
      { label: '눈길을 걸어 성체를 모셔 간다', energy: 3, res: { heart: 3 }, hidden: { holiness: 3 }, result: '할머니가 눈물을 글썽이며 성체를 모셨다. "신부님, 이 먼 데까지…"' },
      { label: '날이 풀리면 찾아뵙는다', res: { heart: -1 }, result: '며칠 뒤 찾아뵈었다. 할머니는 반가워하셨지만 조금 서운해 보였다.' },
    ],
  },
  {
    id: 'roof', title: '성당 지붕',
    text: '성당 지붕 기와 몇 장이 깨져 비가 샌다.',
    options: [
      { label: '업자를 불러 바로 고친다', cost: 30, res: { heart: 2 }, result: '하루 만에 말끔해졌다. 교우들이 안심했다.' },
      { label: '교우들과 함께 직접 고친다', energy: 4, stat: { rapport: 1.5 }, chance: { p: 0.8,
        win: { res: { heart: 3 }, result: '사다리를 붙잡아 주던 교우들과 한결 가까워졌다. 지붕도 말끔하다.' },
        lose: { res: { heart: 1 }, result: '함께 땀은 흘렸지만, 다음 비에 또 조금 샜다. 그래도 다들 웃었다.' } } },
      { label: '양동이로 버틴다', res: { heart: -3 }, result: '미사 중에 똑똑 물 떨어지는 소리가 신경 쓰인다.' },
    ],
  },
  {
    id: 'returner', title: '돌아온 교우',
    text: '20년 동안 성당에 나오지 않던 마을 이장님 부부가 미사에 나왔다. "아내가 아프고 나서 생각이 많아졌습니다."',
    options: [
      { label: '미사 뒤 따로 만나 이야기를 듣는다', energy: 2, stat: { rapport: 1 }, chance: { p: () => clamp(0.5 + Game.state.stats.rapport / 200, 0.5, 0.95), why: '친화력이 높을수록',
        win: { res: { members: 4, reputation: 2 }, result: '두 분이 다음 주에도 오겠다고 했다. 이웃 몇 집에도 소식이 퍼졌다.' },
        lose: { res: { members: 1 }, result: '"조금 더 생각해 보겠습니다." 그래도 문은 열어 두고 가셨다.' } } },
      { label: '반갑게 인사만 한다', res: { members: 2 }, result: '이장님이 고개를 숙여 인사했다.' },
    ],
  },
  {
    id: 'festival', title: '마을 축제',
    text: '면사무소에서 가을 마을 축제에 성당도 참여해 달라는 연락이 왔다.',
    options: [
      { label: '교우들과 부스를 연다', energy: 3, chance: { p: 0.75,
        win: { res: { reputation: 5, heart: 2 }, result: '어르신들이 만든 식혜가 금세 동났다. 비신자 주민들과도 인사를 나눴다.' },
        lose: { res: { reputation: 1 }, result: '하필 비가 와서 사람이 적었다. 그래도 면장님이 고맙다고 했다.' } } },
      { label: '이번엔 정중히 사양한다', res: { reputation: -1 }, result: '면장님이 아쉬워했다.' },
    ],
  },
  {
    id: 'crowded', title: '비좁은 교리실',
    text: '교리실이 모자라 두 단체가 같은 시간에 방을 쓰겠다며 언성이 높아졌다.',
    cond: () => roomsFree() === 0 && groupCount() >= 3,
    options: [
      { label: '두 단체 대표를 불러 시간표를 함께 짠다', energy: 3, res: { heart: 3 }, stat: { rapport: 2 }, result: '서로 한발씩 물러섰다. "신부님이 중간에서 고생하시네요."' },
      { label: '사제관 거실을 내어 준다', energy: 1, res: { heart: 2 }, result: '신부님 거실이 북적북적해졌다. 교우들이 고마워했다.' },
    ],
  },
  {
    id: 'bazaar', title: '사목회장의 제안',
    text: '"신부님, 이번에 바자회를 한번 열어 보면 어떨까요? 성당 살림에 보탬이 될 거예요."',
    options: [
      { label: '함께 준비한다', res: { heart: -2 }, chance: { p: 0.7,
        win: { res: { offering: 40, reputation: 2 }, result: '바자회가 성황이었다. 다만 준비하느라 다들 조금 지쳤다.' },
        lose: { res: { offering: 15 }, result: '오후에 소나기가 쏟아져 일찍 접었다. 그래도 조금은 모였다.' } } },
      { label: '아직은 이르다고 말한다', result: '"그럼 내년에 꼭 해요, 신부님."' },
    ],
  },
  {
    id: 'baptism', title: '첫 세례식',
    text: '예비신자 교리반에서 처음으로 세례 받을 사람들이 나왔다. 성당이 축하 분위기로 들떠 있다.',
    cond: () => unitLevels('catechumen') > 0,
    options: [
      { label: '정성껏 세례식을 준비한다', energy: 2, res: { members: 5, heart: 5 }, result: '새 신자들의 대부모가 되어 준 교우들이 더 기뻐했다.' },
      { label: '조촐하게 치른다', res: { members: 3 }, result: '조용하지만 뜻깊은 세례식이었다.' },
    ],
  },
  {
    id: 'lateComer', title: '늦게 찾아온 사람',
    text: '세례를 받고 싶다며 한 가족이 찾아왔다. 그런데 이번 교리반은 이미 몇 주째 진행 중이다. 선교분과장이 난색을 표한다. "신부님, 지금 들어오시면 진도를 따라오기 어렵고, 다른 분들도 처음부터 다시 해야 할지 몰라요."',
    cond: () => cateState().n >= 3 && cateState().week % CATE.baptismEvery !== 0,
    options: [
      { label: '받아 준다', cate: 3, cateQ: -15, other: { type: 'mission', vital: -8 }, risk: '교리반 진도가 흐트러져 다음 세례식에서 끝까지 마치는 사람이 줄 수 있어요', result: '가족이 눈물을 글썽이며 고마워했다. 교리반은 처음 몇 과를 다시 짚느라 분주해졌다.' },
      { label: '신부님이 따로 개인 교리를 해 준다', energy: 4, cate: 3, cateQ: -5, stat: { doctrine: 1 }, result: '저녁마다 사제관에서 따로 교리를 했다. 가족은 금세 진도를 따라잡았다.' },
      { label: '다음 교리반까지 기다려 달라고 한다', res: { members: -2, reputation: -2 }, other: { type: 'mission', vital: 3 }, result: '"그럼 다른 성당을 알아볼게요." 가족은 서운한 얼굴로 돌아갔다. 선교분과는 한숨 돌렸다.' },
    ],
  },
  {
    // 수녀님의 월권 (하루 넘어갈 때 sisterOverreachRoll이 띄운다)
    id: 'sisterOver', title: '수녀님이 먼저 정해 버리셨어요', manual: true,
    get text() { return sisterOverText(); },
    get options() { return sisterOverOptions(); },
  },
  {
    id: 'budgetGrumble', title: '왜 저희만 덜 주시나요', manual: true,
    get text() { return grumbleText(); },
    get options() { return grumbleOptions(); },
  },
  {
    id: 'sisterFaction', title: '수녀님을 따르는 사람들', manual: true,
    get text() { return factionText(); },
    get options() { return factionOptions(); },
  },
  {
    id: 'massReq', title: '미사를 늘려 주세요', manual: true,
    get text() { return massReqText(); },
    get options() { return massReqOptions(); },
  },
  {
    id: 'cleanReq', title: '성당 주변이 너무 지저분해요', manual: true,
    get text() { return cleanText(); },
    get options() { return cleanOptions(); },
  },
  {
    id: 'decorReq', title: '교우들의 부탁', manual: true,
    get text() { return decorReqText(); },
    get options() { return decorReqOptions(); },
  },
  {
    // 봉사자 그만두기 면담 (하루 넘어갈 때 가끔)
    id: 'quitTalk', title: '그만두겠다는 봉사자', manual: true,
    get text() { return quitText(); },
    get options() { return quitOptions(); },
  },
  {
    // 교구 외부 행사 동원 요청 (하루 넘어갈 때 가끔)
    id: 'dioCall', title: '교구 행사 동원 요청', manual: true,
    get text() { return dioCallText(); },
    get options() { return dioCallOptions(); },
  },
  {
    id: 'report', title: '교구 보고서',
    text: '교구에 낼 본당 현황 보고서를 쓰다가, 신자 수를 조금 늘려 적으면 본당이 더 좋아 보이겠다는 생각이 든다.',
    options: [
      { label: '있는 그대로 적는다', hidden: { holiness: 2 }, trust: 1, result: '숫자는 작았지만 마음은 편했다.' },
      { label: '조금 늘려 적는다', hidden: { ambition: 4 }, trust: 3, risk: () => `1월 정기 감사에서 들킬 확률 ${Math.round(auditChance((Game.state.pastor.inflated || 0) + 1) * 100)}% (늘려 적을수록 높아져요) · 들키면 교구 신뢰 −${AUDIT.penalty + AUDIT.gain * ((Game.state.pastor.inflated || 0) + 1)}`, after: () => { const p = Game.state.pastor; p.inflated = (p.inflated || 0) + 1; }, result: '보고서가 그럴듯해 보인다. 마음 한구석이 찜찜하다.' },
    ],
  },
];

// ---------- 신학교·보좌 시절 이야기 (프롤로그 다음, 솔뫼 본당 전까지) ----------
// 장면마다 짧은 글과 선택 하나. 선택은 능력치·숨은 수치·첫 본당 보너스에 반영된다
// quiz: 강론 주제 고르기 / pastorType: 보좌 시절 주임 신부 성격을 정한다
const STORY = [
  {
    label: '신학교 1학년', title: '첫날 밤', img: 'night', art: '🌙',
    text: ['새벽 5시 반 기상, 아침기도, 미사, 수업. 낯선 하루가 끝나고 기숙사 불이 꺼졌다.', '잠이 오지 않는다. 정말 이 길이 맞을까?'],
    choices: [
      { label: '성당에 내려가 조용히 앉아 있는다', result: '감실 앞 작은 불빛을 오래 바라봤다. 마음이 조금 가라앉았다.', effect: () => { gain('spirit', 6); addHidden('holiness', 1); } },
      { label: '옆방 동기 정 미카엘의 문을 두드린다', result: '"나도 잠이 안 와." 둘은 새벽까지 이야기를 나눴다. 평생 친구가 생겼다.', effect: () => gain('rapport', 6) },
      { label: '스탠드를 켜고 교리서를 편다', result: '모르는 말투성이였지만, 한 줄 한 줄이 새로웠다.', effect: () => gain('doctrine', 6) },
    ],
  },
  {
    label: '신학교 3학년', title: '착의식', img: 'cassock', art: '🧥',
    text: ['처음으로 수단을 입는 날. 거울 속 모습이 낯설다.', '예식이 끝나자 어머니가 다가와 말없이 눈물을 흘리신다.'],
    choices: [
      { label: '꼭 안아 드린다', result: '"잘 커 줘서 고맙다." 그 말이 오래 마음에 남았다.', effect: () => { gain('spirit', 4); addHidden('holiness', 2); } },
      { label: '웃으며 함께 사진을 찍는다', result: '사제관 책상 위에 둘 사진이 생겼다.', effect: () => gain('rapport', 5) },
    ],
  },
  {
    label: '신학교 4학년', title: '방학 본당 실습', img: 'kids', art: '🧒',
    text: ['방학 동안 시골 본당에서 주일학교 교리를 맡았다.', '한 아이가 손을 번쩍 든다. "선생님은 왜 결혼 안 해요?"'],
    choices: [
      { label: '진지하게 설명해 준다', result: '아이가 고개를 끄덕였다. 생각보다 어려운 질문이었다.', effect: () => gain('doctrine', 5) },
      { label: '"하느님이랑 약속했거든!"', result: '아이들이 까르르 웃었다. 그날부터 아이들이 졸졸 따라다녔다.', effect: () => gain('rapport', 5) },
    ],
  },
  {
    label: '신학교 6학년', title: '시험 전날', img: 'exam', art: '📚',
    text: ['기말시험 전날 밤, 정 미카엘이 노트를 들고 찾아왔다.', '"이번에 떨어지면 유급이야… 좀 도와줄 수 있어?"'],
    choices: [
      { label: '함께 밤을 새운다', result: '둘 다 무사히 시험을 마쳤다. 미카엘은 그 밤을 평생 잊지 않겠다고 했다.', effect: () => { gain('rapport', 4); gain('doctrine', 2); addHidden('holiness', 1); } },
      { label: '내 공부부터 하고 내일 아침에 봐 준다', result: '시험은 잘 봤다. 미카엘의 얼굴은 조금 어두웠다.', effect: () => { gain('doctrine', 6); addHidden('ambition', 2); } },
    ],
  },
  {
    label: '부제', title: '첫 강론', img: 'homily', art: '🎤', quiz: true,
    text: ['부제품을 받고, 실습 본당에서 처음으로 강론대에 서게 되었다.', '이번 주 복음에 맞는 주제를 골라 강론을 준비하자.'],
  },
  {
    label: '사제서품', title: '엎드린 시간', img: 'ordination', art: '✝️',
    text: ['주교님 앞에 엎드려 성인 호칭 기도를 듣는다. 지나온 모든 얼굴이 스쳐 간다.', '안수를 받고 일어서는 순간, 나는 사제가 되었다.'],
    choices: [
      { label: '첫 미사를 봉헌한다', result: '첫 강복을 받으려는 사람들 사이로 어머니와 미카엘 신부가 보였다.', effect: () => gain('spirit', 10) },
    ],
  },
  {
    label: '보좌 신부 2년', title: '첫 본당에서', img: 'curate', art: '⛪', pastorType: true,
    text: ['첫 발령지는 도시의 큰 본당. 주임 신부님 아래에서 청년회와 주일학교를 맡았다.'],
    choices: [
      { label: '청년들과 밤늦게까지 함께한다', result: '청년회가 다시 살아났다. 그 청년들 몇이 "신부님 따라가겠다"며 솔뫼 근처로 이사를 왔다.', effect: () => { gain('rapport', 5); Game.state.storyBonus.members += 15; } },
      { label: '어르신들 댁을 빠짐없이 찾아다닌다', result: '"젊은 신부님이 이렇게 와 주시고…" 어르신들 기도 속에 늘 내 이름이 있었다.', effect: () => { gain('rapport', 3); addHidden('holiness', 2); Game.state.storyBonus.heart += 10; } },
      { label: '사무실에서 본당 살림을 배운다', result: '교적, 장부, 공사 견적서. 본당이 어떻게 굴러가는지 알게 되었다.', effect: () => { gain('admin', 8); Game.state.storyBonus.offering += 60; } },
    ],
  },
];

// 보좌 시절 주임 신부 성격에 따른 한마디
const STORY_PASTOR_LINES = {
  kind: '자상한 주임 신부님은 늘 "자네 생각은 어떤가?" 하고 먼저 물어 주셨다.',
  strict: '엄격한 주임 신부님 밑에서 강론 원고를 열 번도 넘게 고쳐 썼다.',
  laissez: '주임 신부님은 거의 간섭하지 않으셨다. 무엇이든 스스로 부딪혀 배웠다.',
  dumper: '주임 신부님은 사무 일을 자주 맡기셨다. 덕분에 서류 보는 눈이 생겼다.',
};

// ---------- 수녀님 ----------
// over: 하루에 월권할 확률, power: 맡은 일 효과 배수, kind: 월권하는 방식 (SISTER_OVERREACH)
const SISTER_TYPES = {
  gentle: { name: '온유한', icon: '🌷', over: 0.03, inf: 0.6, power: 1.0, kind: 'small', desc: '조용히 맡은 일을 하세요. 월권은 거의 없지만 일솜씨는 보통이에요' },
  zeal: { name: '열정적인', icon: '🔥', over: 0.10, inf: 1.0, power: 1.3, kind: 'event', desc: '일을 잘 해내세요. 좋은 일이다 싶으면 행사를 먼저 잡아 버리세요' },
  strict: { name: '원칙적인', icon: '📏', over: 0.07, inf: 0.8, power: 1.15, kind: 'cut', desc: '규칙과 살림에 엄격하세요. 단체 지출을 마음대로 줄이곤 하세요' },
  bold: { name: '독단적인', icon: '⚡', over: 0.18, inf: 1.4, power: 1.5, kind: 'decide', desc: '일솜씨는 가장 뛰어나세요. 대신 단체 일을 혼자 정해 버릴 때가 많아요' },
};
const SISTER_NAMES = ['마리아', '데레사', '아녜스', '루치아', '클라라', '체칠리아', '모니카', '베로니카', '안나', '스콜라스티카', '엘리사벳', '젬마'];
// 맡길 수 있는 일
const SISTER_TASKS = {
  meetings: { icon: '🗓️', name: '회의', sub: '신부님이 못 간 단체 회의를 대신 맡아 활력을 지켜요' },
  catechism: { icon: '📘', name: '예비자 교리', sub: '교리반 새 신자가 늘고, 주일마다 새 신자가 찾아와요' },
  youth: { icon: '🧒', name: '주일학교 지도', sub: '초등부·중고등부·청년회 활력을 날마다 올려 줘요' },
  sacristy: { icon: '🕯️', name: '전례 준비', sub: '제의방을 맡아 제대 차림이 좋아지고, 주일미사 마음이 더 올라요' },
};
// 월권 장면: {u}는 단체 이름, {c}는 드는 돈. vital은 맡겨 둘 때 단체 활력
const SISTER_OVERREACH = {
  small: [
    { text: '"신부님, {u}에 성경 필사 모임을 하나 만들었어요. 미리 말씀 못 드려 죄송해요." 이미 첫 모임까지 마치셨다.', cost: 0, vital: 8 },
    { text: '"{u} 회합 시간을 저녁으로 옮기면 좋을 것 같아서 공지해 두었어요." 교우들은 벌써 바뀐 시간을 알고 있다.', cost: 0, vital: 6 },
  ],
  event: [
    { text: '"신부님! {u} 피정을 다음 주로 잡아 두었어요. 버스도 벌써 예약했어요." 비용은 {c}만 원이다.', cost: 30, vital: 15 },
    { text: '"{u} 아이들이랑 바자회를 열기로 했어요. 물품 살 돈 {c}만 원만 내 주세요." 전단까지 이미 붙어 있다.', cost: 20, vital: 12 },
  ],
  cut: [
    { text: '"{u} 간식비가 너무 많이 나가서 이번 달은 끊었어요. 교회 돈은 아껴야지요." {u} 교우들 표정이 어둡다. 아끼는 돈은 {c}만 원쯤이다.', cost: 15 },
    { text: '"{u} 행사비 청구서를 돌려보냈어요. 영수증이 엉망이라서요." {u} 회장이 서운해하며 사제관 앞을 서성인다. 아끼는 돈은 {c}만 원쯤이다.', cost: 20 },
  ],
  decide: [
    { text: '"{u} 회장을 바꿨어요. 지금 회장님은 너무 느려서요. 새 회장님이 일을 잘하실 거예요." 이미 교우들에게 발표까지 하셨다.', cost: 0, vital: 15 },
    { text: '"{u} 올해 활동 계획을 제가 다 짜 두었어요. 연수비 {c}만 원이 들어요." 계획표가 벌써 게시판에 붙어 있다.', cost: 25, vital: 18 },
  ],
};

// ---------- 전례력 (주일미사 제대 색과 꽃) ----------
// 달력은 한 달 4주. color: 전례색, flowers: 헌화회 꽃 (none이면 사순처럼 꽃을 두지 않는다), feast: 대축일
const LIT_COLOR = { green: '#3f7d4a', violet: '#6a3d8f', white: '#f4efe2', red: '#b8322a', rose: '#e08aa8', gold: '#d8b14a' };
const LIT_FLOWERS = {
  spring: ['#f2c14e', '#f08ab0', '#ffffff'], summer: ['#e05a4f', '#ffffff', '#9c6ad1'], autumn: ['#f2a33a', '#e0b84f', '#c0533a'], winter: ['#ffffff', '#c0392b', '#9fc1de'],
  advent: ['#3f7d4a'], christmas: ['#c0392b', '#ffffff', '#c0392b'], lily: ['#ffffff', '#ffffff', '#f2c14e'], red: ['#c0392b', '#e05a4f', '#f08a3a'],
  mary: ['#ffffff', '#9fc1de', '#ffffff'], mum: ['#ffffff', '#f4efe2'], rose: ['#f08ab0', '#ffffff'], palm: ['#5f8f5a'], eucharist: ['#ffffff', '#f2c14e'],
};
// 헌화회 꽃 이름 (자막·결과에 쓰는 말)
const LIT_FLOWER_NAME = { spring: '봄꽃', summer: '여름꽃', autumn: '국화와 가을꽃', winter: '겨울 꽃', advent: '푸른 상록수', christmas: '포인세티아', lily: '부활 백합', red: '붉은 꽃', mary: '백합과 푸른 꽃', mum: '흰 국화', rose: '분홍 장미', palm: '성지 가지', eucharist: '흰 꽃과 금빛 꽃' };

// 고해성사: 미사 30분 전 고해소. 고해자마다 대답이 따로 있다
// ans: [q, 신부님 말, 듣고 난 반응] — q 2 마음에 꼭 맞음(85%) · 1 괜찮음(50%) · 0 맞지 않음(15%)
// hint: 친화력 30 이상이면 보이는 귀띔, bonus: 마음이 풀렸을 때 따라오는 좋은 일, good: 그 뒤 이야기
const CONFESS_OPEN = ['고해소 칸막이 너머로 조심스러운 숨소리가 들린다.', '작은 종이 울리고, 누군가 무릎을 꿇는 소리가 났다.', '한참 망설이던 발소리가 고해소 앞에서 멈췄다.', '창살 너머로 떨리는 목소리가 들려온다.', '"신부님, 고해성사 보러 왔습니다." 낮은 목소리였다.'];
const CONFESS_QUIET = ['미사 30분 전, 고해소가 조용해요. 성무일도를 펴고 잠시 기도했어요', '고해소에 앉아 기다렸지만 오늘은 아무도 오지 않았어요. 묵주기도 한 단을 바쳤어요', '창밖으로 교우들이 들어오는 소리만 들려요. 오늘 강론을 한 번 더 떠올려 봤어요', '고해소가 비었어요. 지난주 고해한 교우들을 위해 짧게 기도했어요'];
const CONFESS_PENANCE = ['주님의 기도 세 번', '오늘 하루 누군가에게 먼저 고맙다고 말하기', '이번 주 성경 한 장 천천히 읽기', '성모송 다섯 번', '십자가의 길 한 처 묵상하기', '부모님께 안부 전화 한 통', '미사 뒤 감실 앞에서 5분 머물기', '이번 주 한 끼를 줄여 그 돈을 이웃에게'];
const CONFESS_FAIL = ['고해자는 고개를 숙인 채 조용히 나갔다. 마음이 다 풀리지는 않은 것 같다.', '"…네, 알겠습니다." 대답은 했지만 목소리에 힘이 없었다.', '고해자는 무언가 더 말하려다 그만두고 일어섰다.', '사죄경을 받고도 고해자의 어깨는 여전히 무거워 보였다.'];
const CONFESSIONS = [
  { who: '오랜만에 온 교우', look: 'p3', text: '"신부님, 10년 만에 성당에 왔습니다. 무슨 말부터 해야 할지 모르겠어요…"', hint: '돌아온 것만으로도 큰 용기예요. 다그치면 다시 멀어질 것 같아요', bonus: { res: { members: 3 } }, good: '그는 가족과 함께 다시 미사에 나오기로 했다.', ans: [
    [2, '"돌아오신 것만으로 충분합니다. 탕자의 아버지처럼 하느님은 기다리고 계셨어요."', '창살 너머에서 오래 참았던 울음이 터졌다.'],
    [1, '"기억나는 것부터 천천히 말씀하세요. 시간은 충분합니다."', '그는 한참 머뭇거리다 하나씩 털어놓았다.'],
    [0, '"10년이면 미사 빠진 것만 해도 큰 죄입니다. 다 말씀하셔야 해요."', '긴 침묵이 흘렀다.'] ] },
  { who: '지친 봉사자', look: 'p2', text: '"봉사를 하는데 자꾸 사람들이 미워요. 이런 마음으로 계속해도 될까요…"', hint: '판단보다 들어 주기를 바라는 것 같아요', bonus: { vital: 10 }, good: '다음 날 그는 다시 웃으며 단체 모임에 나왔다.', ans: [
    [2, '"그렇게 고백하시는 마음이 벌써 사랑이에요. 미운 마음까지 주님께 맡겨 보세요."', '"그래도 되는 거군요." 목소리가 한결 가벼워졌다.'],
    [1, '"잠시 쉬셔도 괜찮습니다. 봉사는 경쟁이 아니에요."', '그는 고개를 끄덕였다.'],
    [0, '"봉사하는 사람이 남을 미워하면 안 되지요."', '그는 더 작아진 목소리로 "네…" 하고 말했다.'] ] },
  { who: '고등학생', look: 'youth', text: '"성적 때문에 부모님께 거짓말을 했어요. 성적표를 고쳐서 보여 드렸어요."', hint: '스스로 바로잡을 길을 알려 주기를 바라는 것 같아요', bonus: { res: { members: 1 }, stat: { rapport: 1 } }, good: '학생은 부모님께 먼저 말씀드리겠다며 친구를 데리고 주일학교에 왔다.', ans: [
    [2, '"용기 내서 왔구나. 오늘 저녁 부모님께 먼저 말씀드려 보자. 생각보다 너를 더 사랑하실 거야."', '"…해 볼게요." 작지만 단단한 대답이었다.'],
    [1, '"성적보다 네가 더 소중하단다. 너무 자신을 몰아붙이지 마."', '학생이 코를 훌쩍였다.'],
    [0, '"거짓말은 큰 죄야. 다시는 그러면 안 된다."', '학생은 대답 없이 고개만 숙였다.'] ] },
  { who: '아내를 먼저 보낸 어르신', look: 'p5', text: '"집사람을 보내고 나니 하느님이 원망스럽습니다. 그래도 미사에는 나와야 할 것 같아서…"', hint: '원망을 꾸짖기보다 슬픔을 함께해 주기를 바라세요', bonus: { res: { heart: 3, reputation: 1 } }, good: '어르신은 한결 가벼운 걸음으로 맨 앞자리에 앉으셨다.', ans: [
    [2, '"원망하셔도 괜찮습니다. 예수님도 라자로의 무덤 앞에서 우셨어요. 하느님은 그 원망까지 받아 주세요."', '어르신의 흐느낌이 오래 이어졌다.'],
    [1, '"자매님은 지금 하느님 곁에서 평안하실 거예요."', '"그렇겠지요…" 어르신이 길게 숨을 내쉬었다.'],
    [0, '"하느님을 원망하는 것은 신앙이 약해서입니다."', '어르신은 더 아무 말도 하지 않으셨다.'] ] },
  { who: '가게를 하는 가장', look: 'p1', text: '"장사가 너무 어려워 거래처를 속였습니다. 다시는 안 그래야 하는데…"', hint: '갚을 길을 함께 생각해 주기를 바라는 것 같아요', bonus: { res: { heart: 2 }, hidden: { holiness: 1 } }, good: '그는 거래처에 사과하고 갚을 길을 찾겠다고 다짐했다.', ans: [
    [2, '"속인 만큼 조금씩이라도 돌려드릴 방법을 찾아봅시다. 어려우면 빈첸시오회에도 도움을 청하세요."', '"정말 그래도 될까요?" 그의 목소리에 희망이 섞였다.'],
    [1, '"힘든 사정은 하느님도 아십니다. 다시는 그러지 않겠다는 마음이면 됩니다."', '그는 조용히 감사하다고 했다.'],
    [0, '"사기는 큰 죄입니다. 보속으로 전부 갚으셔야 합니다."', '그는 막막한 듯 한숨을 쉬었다.'] ] },
  { who: '남편과 다툰 자매', look: 'p4', text: '"남편과 크게 싸우고 모진 말을 했어요. 제가 왜 그랬는지…"', hint: '먼저 마음을 털어놓을 시간이 필요해 보여요', bonus: { res: { heart: 2 } }, good: '그날 미사에는 부부가 나란히 앉아 있었다.', ans: [
    [2, '"얼마나 속상하셨으면 그러셨을까요. 그 마음부터 주님께 내려놓고, 오늘 저녁 따뜻한 한마디를 먼저 건네 보세요."', '"네, 그럴게요." 목소리가 떨렸다.'],
    [1, '"부부 싸움은 칼로 물 베기라잖아요."', '자매가 작게 웃었다.'],
    [0, '"아내는 남편에게 순종해야 합니다."', '창살 너머가 싸늘해졌다.'] ] },
  { who: '첫영성체를 앞둔 아이', look: 'kid', text: '"동생 과자를 몰래 먹었어요… 하느님이 화나셨을까요?"', hint: '겁을 주지 말고 따뜻하게 안아 주세요', bonus: { res: { heart: 2 }, other: 'school' }, good: '아이는 활짝 웃으며 주일학교 친구들에게 달려갔다.', ans: [
    [2, '"하느님은 화내지 않으셔. 솔직히 말해 줘서 정말 기뻐하실 거야. 오늘 동생한테 과자 하나 나눠 줄까?"', '"네!" 아이 목소리가 고해소를 울렸다.'],
    [1, '"다음부터는 동생한테 물어보고 먹자."', '아이가 고개를 끄덕였다.'],
    [0, '"남의 것을 훔치면 지옥에 간단다."', '아이가 울음을 터뜨렸다.'] ] },
  { who: '이사 온 교우', look: 'p2', text: '"이사 와서 아직 아는 사람이 없어요. 성당이 낯설어서 마음이 자꾸 무너져요."', hint: '사람들과 이어 주면 좋겠어요', bonus: { res: { members: 1 }, other: 'district' }, good: '소공동체 반장님이 그를 반 모임에 데려가셨다.', ans: [
    [2, '"외로우셨겠어요. 이번 주 반 모임에 꼭 나와 보세요. 반장님께 제가 미리 말씀드릴게요."', '"정말요?" 반가움이 묻어났다.'],
    [1, '"하느님은 어디서나 함께 계십니다."', '"네…" 그는 조용히 대답했다.'],
    [0, '"외로움은 기도가 부족해서 오는 거예요."', '그는 대답이 없었다.'] ] },
  { who: '술을 끊지 못하는 형제', look: 'p1', text: '"또 술을 마셨습니다. 아내와 약속했는데… 이번이 몇 번째인지 모르겠어요."', hint: '혼자 이기기 어려운 일이에요. 도움을 받을 길이 필요해요', bonus: { res: { heart: 2 }, hidden: { holiness: 1 } }, good: '그는 단주 모임에 나가 보겠다고 했다.', ans: [
    [2, '"혼자 싸우지 마세요. 단주 모임에 함께 가 볼 형제를 소개해 드릴게요. 넘어져도 다시 일어나는 게 신앙입니다."', '"…도와주시겠어요?" 그가 처음으로 고개를 들었다.'],
    [1, '"오늘부터 하루씩만 버텨 봅시다. 하루씩이요."', '그는 깊게 숨을 들이쉬었다.'],
    [0, '"의지가 약해서 그렇습니다. 굳게 마음먹으세요."', '그는 씁쓸하게 웃었다.'] ] },
  { who: '휴대폰만 보는 청년', look: 'youth', text: '"기도를 안 한 지 오래예요. 잠들기 전까지 휴대폰만 봐요. 하느님이 멀게 느껴져요."', hint: '작게 시작할 방법을 알려 주면 좋겠어요', bonus: { res: { members: 1 }, other: 'youth' }, good: '그는 다음 주 청년회 기도 모임에 나왔다.', ans: [
    [2, '"자기 전 휴대폰을 내려놓고 딱 1분만 하느님께 오늘 하루를 말해 보세요. 그거면 충분해요."', '"1분이면… 할 수 있을 것 같아요."'],
    [1, '"청년회 모임에 한번 나와 보세요."', '"생각해 볼게요."'],
    [0, '"휴대폰을 버리세요. 그게 다 유혹입니다."', '청년은 한숨을 쉬었다.'] ] },
  { who: '시어머니를 모시는 며느리', look: 'p4', text: '"치매에 걸리신 시어머니를 모시는데, 어제는 저도 모르게 소리를 질렀어요."', hint: '지친 사람이에요. 짐을 나눌 길이 필요해요', bonus: { res: { heart: 3 }, other: 'elders' }, good: '어르신 모임에서 돌봄 봉사자를 연결해 주었다.', ans: [
    [2, '"얼마나 지치셨을까요. 자매님도 돌봄을 받으셔야 해요. 어르신 모임에 일주일에 한 번이라도 도움을 청해 봅시다."', '"그래도 되는 건지 몰랐어요…" 자매가 울먹였다.'],
    [1, '"소리 지른 일은 시어머님께 한 번 손을 잡아 드리는 걸로 풀어 보세요."', '자매가 고개를 끄덕였다.'],
    [0, '"효도는 자식의 의무입니다."', '자매는 더 지친 얼굴로 나갔다.'] ] },
  { who: '험담을 한 구역장', look: 'p2', text: '"반 모임에서 한 자매님 험담을 했어요. 그 말이 그분 귀에 들어간 것 같아요."', hint: '바로잡을 용기를 북돋아 주면 좋겠어요', bonus: { res: { heart: 2 }, other: 'district' }, good: '구역장님은 그 자매님을 찾아가 먼저 사과했다.', ans: [
    [2, '"말은 쏟은 물 같지만, 사과는 다시 담는 그릇이 됩니다. 이번 주 안에 그분을 찾아가 보세요."', '"어렵지만… 가 볼게요."'],
    [1, '"앞으로 말을 조심하시면 됩니다."', '"네, 그럴게요."'],
    [0, '"구역장이 그러시면 안 되지요."', '구역장님 목소리가 굳었다.'] ] },
  { who: '아이를 잃은 엄마', look: 'p4', text: '"…아이를 먼저 보냈어요. 하느님께 따지고 싶은데, 그러면 안 되는 거죠?"', hint: '말보다 곁에 있어 주는 것이 필요해요', bonus: { res: { heart: 4, reputation: 1 } }, good: '그 뒤로 그는 주일마다 성모상 앞에 꽃을 놓고 갔다.', ans: [
    [2, '"따지셔도 됩니다. 욥도 그랬고, 시편도 그렇게 울부짖어요. 저도 함께 기도하겠습니다."', '오래도록 흐느낌만 들렸다. 그리고 "고맙습니다"라는 작은 말이 들렸다.'],
    [1, '"아이는 지금 하느님 품에 있어요."', '"…그렇게 믿을게요."'],
    [0, '"하느님의 뜻에는 다 이유가 있습니다."', '그는 말없이 일어섰다.'] ] },
  { who: '미사에 자주 빠진 교우', look: 'p3', text: '"주일에 일이 많아서 미사에 자주 빠졌어요. 핑계라는 건 알지만…"', hint: '다시 나올 수 있는 길을 열어 주면 좋겠어요', bonus: { res: { members: 1 }, other: 'district' }, good: '그는 토요 특전미사에 나오기 시작했다.', ans: [
    [2, '"토요일 저녁 미사도 있어요. 형편에 맞는 시간을 함께 찾아봅시다."', '"그런 방법이 있었네요!"'],
    [1, '"하느님은 기다려 주십니다. 다음 주일엔 꼭 뵈어요."', '"노력해 볼게요."'],
    [0, '"주일미사를 빠지면 대죄입니다."', '그는 쓴웃음을 지었다.'] ] },
  { who: '돈 문제로 형제와 다툰 교우', look: 'p1', text: '"부모님 유산 때문에 형과 원수가 됐어요. 형 얼굴만 떠올려도 화가 나요."', hint: '화해의 첫걸음을 아주 작게 제안해 주세요', bonus: { res: { heart: 2 }, hidden: { holiness: 1 } }, good: '설에 두 형제가 함께 미사에 왔다는 소식이 들렸다.', ans: [
    [2, '"당장 화해하지 않아도 됩니다. 오늘은 형님을 위해 성모송 한 번만 바쳐 보세요. 그게 시작이에요."', '"…한 번이요. 해 볼게요."'],
    [1, '"돈보다 형제가 소중하지 않겠습니까?"', '"머리로는 알지요…"'],
    [0, '"형님께 다 양보하세요. 그게 신앙인입니다."', '그는 억울한 듯 숨을 몰아쉬었다.'] ] },
  { who: '취업이 안 되는 청년', look: 'youth', text: '"서른 번 넘게 떨어졌어요. 기도해도 소용없는 것 같아서 화가 나요."', hint: '실패한 사람 취급하지 말고 존중해 주세요', bonus: { res: { members: 1 }, other: 'adults' }, good: '청장년회의 한 형제가 그에게 일자리를 소개해 주었다.', ans: [
    [2, '"서른 번 넘게 다시 일어난 그 힘이 은총이에요. 청장년회에 같은 길을 걸은 형제들이 있어요. 만나 보실래요?"', '"…그런 분들이 있어요?"'],
    [1, '"하느님의 때가 있습니다. 조금만 더 힘내세요."', '"네…"'],
    [0, '"기도가 부족해서 그래요. 더 열심히 기도하세요."', '청년이 주먹을 꽉 쥐었다.'] ] },
  { who: '병원에서 온 간호사', look: 'p4', text: '"야간 근무 끝나고 왔어요. 환자에게 짜증을 냈어요. 너무 피곤해서…"', hint: '먼저 그 수고를 알아주세요', bonus: { res: { heart: 2 }, stat: { rapport: 1 } }, good: '그는 다음 날 그 환자에게 따뜻한 차를 건넸다고 했다.', ans: [
    [2, '"밤새 아픈 이들 곁을 지키셨네요. 그 자체가 기도예요. 오늘은 푹 쉬시는 것이 보속입니다."', '"쉬는 게 보속이라니…" 지친 웃음소리가 들렸다.'],
    [1, '"다음에 그 환자분께 한마디 다정하게 건네 보세요."', '"네, 그럴게요."'],
    [0, '"아픈 사람에게 짜증을 내면 안 됩니다."', '그는 지친 얼굴로 고개를 떨궜다.'] ] },
  { who: '이웃을 미워하는 어르신', look: 'p5', text: '"윗집이 밤마다 쿵쿵거려서 미워 죽겠어요. 엘리베이터에서 마주치면 인사도 안 해요."', hint: '작은 실천을 웃으며 권해 보세요', bonus: { res: { heart: 1, reputation: 1 } }, good: '어르신은 윗집 아이에게 사탕을 건넸고, 쿵쿵 소리가 조금 줄었다고 했다.', ans: [
    [2, '"이번엔 먼저 인사해 보시면 어떨까요? 윗집 아이 이름이라도 물어보시고요."', '"허허, 신부님도 참." 어르신이 웃으셨다.'],
    [1, '"관리사무소에 한번 말씀해 보세요."', '"그것도 해 봤지요."'],
    [0, '"원수를 사랑하라고 하셨잖아요."', '"원수까지는 아니고요!" 어르신이 버럭하셨다.'] ] },
  { who: '신앙이 흔들리는 대학생', look: 'youth', text: '"수업에서 과학을 배우다 보니 하느님이 정말 계신지 모르겠어요. 이런 의심도 죄인가요?"', hint: '의심을 꾸짖지 말고 함께 생각해 주세요', bonus: { stat: { doctrine: 1 }, other: 'youth' }, good: '그는 청년회 신앙 공부 모임을 찾아왔다.', ans: [
    [2, '"의심은 죄가 아니에요. 토마스 사도도 의심했지요. 궁금한 걸 들고 언제든 사제관에 와요. 같이 공부합시다."', '"정말 그래도 돼요?" 반가운 목소리였다.'],
    [1, '"신앙과 과학은 서로 다투지 않아요."', '"그래도 잘 모르겠어요."'],
    [0, '"의심하지 말고 그냥 믿으세요."', '대학생은 실망한 듯 조용해졌다.'] ] },
  { who: '첫 고해를 하는 새 영세자', look: 'p3', text: '"세례받고 첫 고해예요. 너무 떨려서 무슨 말을 할지 다 잊어버렸어요."', hint: '편하게 해 주는 것이 먼저예요', bonus: { res: { heart: 2 }, other: 'catechumen' }, good: '새 영세자는 그 뒤로 매달 고해성사를 보러 왔다.', ans: [
    [2, '"괜찮아요, 천천히 하세요. 생각나는 것 하나만 말해도 됩니다. 오늘 오신 게 제일 큰 일이에요."', '떨리던 목소리가 조금씩 차분해졌다.'],
    [1, '"교리 시간에 배운 순서대로 해 볼까요?"', '그는 열심히 기억을 더듬었다.'],
    [0, '"성찰을 제대로 해 오셔야지요."', '새 영세자는 얼굴이 빨개졌다.'] ] },
];
// 교구 외부 행사: rate는 신자 수 대비 보내야 할 인원
const DIO_CALLS = [
  { name: '교구 청년대회', rate: 0.04, text: '교구청에서 공문이 왔다. 다음 달 교구 청년대회에 본당 청년들을 보내 달라고 한다.' },
  { name: '생명 수호 미사', rate: 0.06, text: '교구에서 생명 수호를 위한 미사와 행진을 연다며 교우들의 참여를 부탁해 왔다.' },
  { name: '교구 성지 도보 순례', rate: 0.05, text: '교구 성지 도보 순례에 본당별로 교우들을 모아 달라는 연락이 왔다.' },
  { name: '교구 설정 기념 미사', rate: 0.08, text: '교구 설정 기념 미사가 주교좌성당에서 열린다. 본당마다 버스를 대절해 와 달라고 한다.' },
  { name: '이웃 본당 재해 복구 봉사', rate: 0.03, text: '이웃 본당 마을에 큰비가 내려 피해가 컸다. 교구가 본당마다 봉사자를 보내 달라고 한다.' },
];

// 물품판매: 무엇을 팔지와 원가에 얼마를 붙일지 (주임 신부가 정한다)
// demand: 잘 팔리는 정도, heart: 그 물품이 교우들 마음에 주는 것, sens: 비싸게 팔 때 마음을 잃는 정도
const SHOP_ITEMS = {
  farm: { icon: '🥬', name: '교우 농가 농산물', demand: 1.0, heart: 1, sens: 1, desc: '교우 농가를 돕는 직거래예요. 교우들이 좋아해요' },
  missal: { icon: '📖', name: '매일미사 책·성경', demand: 0.85, heart: 1, sens: 1.3, desc: '신앙생활에 꼭 필요해 꾸준히 팔려요. 비싸면 눈총을 받아요' },
  candle: { icon: '🕯️', name: '봉헌초', demand: 0.9, feast: 1.6, heart: 0, sens: 1, desc: '대축일에는 훨씬 많이 팔려요' },
  food: { icon: '🍡', name: '떡·과일 먹거리', demand: 1.25, heart: 0, sens: 0.8, desc: '많이 팔리지만 남는 건 적어요. 조금 비싸도 덜 서운해해요' },
  goods: { icon: '🧴', name: '생활용품', demand: 1.1, heart: -1, sens: 1.5, desc: '마트와 비교돼서, 비싸게 팔면 마음을 크게 잃어요' },
};
// 원가에 붙이는 이윤: 많이 붙일수록 덜 팔리고 마음을 잃는다 (heart: 교우 마음 목표 변화)
const SHOP_MARKUPS = [
  { rate: 0.1, name: '원가에 가깝게', heart: 3 },
  { rate: 0.2, name: '조금만', heart: 1 },
  { rate: 0.3, name: '적당히', heart: 0 },
  { rate: 0.5, name: '넉넉히', heart: -4 },
  { rate: 0.8, name: '많이', heart: -9 },
];

// ---------- 본당 이동 (인사발령) ----------
// 성당이 TRANSFER.church 레벨이 되면 인사발령 예정 공문 → TRANSFER.weeks 주일 뒤 성적표와 행선지
// start: 부임할 때 자원과 건물 레벨, mods: 그 본당의 성격 (members·offering·cate 배수, heart 마음 목표 ±, decline 날마다 줄어드는 신자)
// need: 주교님이 제안해 주시는 조건 (성적 score, 교구 신뢰 trust, 평판 rep)
const TRANSFER = { church: 9, weeks: 4, stayWeeks: 12 };
// 인사발령 시즌 주교님 전화 (v1.08 사용자 "조금 더 머물기를 주교님 전화로, 주임 신부가 청하는 형태로"):
// 임기가 차면 주교님이 안부 전화를 하시고, 신부가 '이동'과 '조금 더 머물기' 중에 말씀드린다. 머물면 stayWeeks 뒤 다시 전화
const BISHOP_CALL = {
  first: '신부님, 잘 지내시지요? 첫 본당 주임 임기가 다 찼네요. 지내 보니 어떠세요? 이제 옮길 때가 되었는데, 이삿짐 쌀 준비는 잘 하고 계신가요?',
  other: '신부님, 잘 지내시지요? 이 본당에서도 임기가 다 찼네요. 지내 보니 어떠세요? 이제 옮길 때가 되었는데, 이삿짐 쌀 준비는 잘 하고 계신가요?',
  again: '신부님, 조금 더 머물며 애쓰신 시간도 다 되었네요. 신자분들과 짓고 싶다던 건물은 잘 지으셨나요? 이제는 옮길 준비를 하셔야겠지요?',
  replyGo: '좋은 경험이었습니다. 주교님 뜻에 따르겠습니다.',
  replyStay: '주교님, 조금 더 이 본당에 머물고 싶습니다. 신자분들과 번듯한 건물을 짓고 가고 싶습니다.',
  go: '그래요, 수고 많으셨어요. 새 본당에서도 지금처럼 해 주세요. 성적표를 보고 갈 곳을 정해 공문을 보내 드릴게요.',
  stay: '신자분들과 함께 짓고 가고 싶다니 반가운 말이네요. 그럼 조금 더 머무르세요. 교구에서도 기도하겠습니다.',
};

// ---------- 첫 본당 퀘스트 (v1.05 사용자 요청) ----------
// 튜토리얼이 끝나면 첫 발령까지 퀘스트가 이어진다. 건물·시설·주변 정리·땅 넓히기·울타리까지.
// 한 번에 셋까지 걸려 있고, 처음엔 5분, 뒤로 갈수록 10분마다 새 퀘스트가 생긴다 (걸린 게 없으면 바로).
// 모두 마치면 인사발령 예정 공문 → FIRST_TRANSFER.weeks 주일 뒤 발령 (첫 본당은 1~2일 안에 발령이 나도록)
// need: () => [지금, 목표]  · reward: { offering, gems, heart }  · go: 바로 가기 (b:건물, plot, build, lots, fence, decor, path, cate, hire, elder, clear)
const FIRST_TRANSFER = { weeks: 2 };
const QUEST_ACTIVE = 3;
function questGapMin(i) { return i < 15 ? 5 : 10; }
const _qn = {
  cleared: () => Object.keys(Game.state.pastor.cleared || {}).length,
  paths: () => Object.keys(Game.state.pastor.paths || {}).length,
  decor: k => Object.values(Game.state.pastor.decor || {}).filter(d => d.kind === k).length,
  lots: () => Object.values(lotsOwned()).filter(Boolean).length,
  groupsAt: L => allGroups().filter(x => (x.g.level || 0) >= L).length,
  fixed: k => Game.state.pastor.fixed[k] || 1,
};
const FIRST_QUESTS = [
  // 1장: 마당 정리 (5분 간격)
  { id: 'clear3', icon: '🌿', name: '마당의 잡초와 돌 치우기', desc: '잡초·돌·나무를 눌러 치워요', need: () => [_qn.cleared(), 3], reward: { offering: 60 }, go: 'clear' },
  { id: 'path5', icon: '🛤️', name: '성당 앞에 길 깔기', desc: '짓기 → 길로 땅을 눌러 길을 놓아요', need: () => [_qn.paths(), 5], reward: { offering: 40 }, go: 'path' },
  { id: 'flower1', icon: '🌷', name: '화단 하나 가꾸기', desc: '짓기 → 조경 → 화단', need: () => [_qn.decor('flowerbed'), 1], reward: { offering: 50, heart: 1 }, go: 'decor' },
  { id: 'room2', icon: '📦', name: '교리실 하나 더 놓기', desc: '짓기 → 교리실', need: () => [containerCount(), 2], reward: { offering: 80 }, go: 'build' },
  { id: 'group2', icon: '🙌', name: '단체 둘 모으기', desc: '교리실 빈 방을 눌러 단체를 만들어요', need: () => [allGroups().length, 2], reward: { offering: 60, heart: 1 }, go: 'groups' },
  { id: 'office2', icon: '🗂️', name: '사무실 손보기 (Lv2)', desc: '사무실을 눌러 고쳐요 · 금고가 커져요', need: () => [_qn.fixed('office'), 2], reward: { offering: 80 }, go: 'b:office' },
  { id: 'fence1', icon: '🪵', name: '본당 땅에 펜스 세우기', desc: '짓기 → 담장 · 낡은 나무 펜스로 본당 경계가 생겨요', need: () => [Game.state.pastor.fence || 0, 1], reward: { offering: 80, heart: 1 }, go: 'fence' },
  { id: 'clear8', icon: '🪨', name: '묵은 땅 더 치우기', desc: '잡초·돌·나무를 8곳까지', need: () => [_qn.cleared(), 8], reward: { offering: 80 }, go: 'clear' },
  { id: 'lot2', icon: '🏞️', name: '첫 땅 넓히기', desc: '짓기 → 땅 넓히기 (서쪽 텃밭이나 앞 공터)', need: () => [_qn.lots(), 2], reward: { offering: 100, gems: 3 }, go: 'lots' },
  { id: 'church3', icon: '⛪', name: '성당 Lv3 증축', desc: '성당을 눌러 증축해요', need: () => [Game.state.pastor.fixed.church, 3], reward: { offering: 120, gems: 3 }, go: 'b:church' },
  { id: 'rectory3', icon: '🏠', name: '사제관 Lv3', desc: '사제관을 눌러 고쳐요 · 행동력이 늘어요', need: () => [_qn.fixed('rectory'), 3], reward: { offering: 100 }, go: 'b:rectory' },
  { id: 'statue', icon: '🙏', name: '마당에 성모상 모시기', desc: '짓기 → 조경 → 성모상', need: () => [_qn.decor('statue'), 1], reward: { offering: 80, heart: 2 }, go: 'decor' },
  { id: 'lit1', icon: '🕯️', name: '평일미사 열기', desc: '성당을 눌러 평일 전례를 하나 열어요', need: () => [Object.keys(litState().open).length, 1], reward: { offering: 80, heart: 1 }, go: 'b:church' },
  { id: 'grp2lv2', icon: '📈', name: '단체 키우기', desc: '단체 둘을 Lv2로', need: () => [_qn.groupsAt(2), 2], reward: { offering: 100 }, go: 'groups' },
  { id: 'lot3', icon: '🏞️', name: '땅 한 곳 더 넓히기', desc: '짓기 → 땅 넓히기', need: () => [_qn.lots(), 3], reward: { offering: 140, gems: 3 }, go: 'lots' },
  // 2장: 본당 가꾸기 (10분 간격)
  { id: 'path15', icon: '🛤️', name: '건물마다 길 잇기', desc: '길을 15칸까지', need: () => [_qn.paths(), 15], reward: { offering: 80 }, go: 'path' },
  { id: 'clear15', icon: '🌳', name: '새 땅 정리하기', desc: '잡초·돌·나무를 15곳까지', need: () => [_qn.cleared(), 15], reward: { offering: 120 }, go: 'clear' },
  { id: 'room3', icon: '📦', name: '교리실 셋', desc: '짓기 → 교리실', need: () => [containerCount(), 3], reward: { offering: 140 }, go: 'build' },
  { id: 'fence2', icon: '🤍', name: '새 하얀 펜스로 바꾸기', desc: '짓기 → 담장 Lv2 (성당 Lv3부터)', need: () => [Game.state.pastor.fence || 0, 2], reward: { offering: 140, heart: 1 }, go: 'fence' },
  { id: 'flower3', icon: '🌷', name: '꽃길 만들기', desc: '화단을 3개까지', need: () => [_qn.decor('flowerbed'), 3], reward: { offering: 80, heart: 1 }, go: 'decor' },
  { id: 'office3', icon: '🗂️', name: '사무실 Lv3', desc: '사무실을 눌러 고쳐요', need: () => [_qn.fixed('office'), 3], reward: { offering: 140 }, go: 'b:office' },
  { id: 'church4', icon: '⛪', name: '가건물 성당으로 (Lv4)', desc: '성당을 눌러 증축해요', need: () => [Game.state.pastor.fixed.church, 4], reward: { offering: 200, gems: 5 }, go: 'b:church' },
  { id: 'mem300', icon: '👥', name: '신자 300명', desc: '주일미사·단체·거두기로 새 얼굴이 와요', need: () => [Math.floor(Game.state.pastor.res.members), 300], reward: { offering: 120, heart: 1 }, go: 'b:church' },
  { id: 'parking', icon: '🅿️', name: '주차장 만들기', desc: '짓기 → 조경 → 주차장 · 먼 마을 교우도 와요', need: () => [_qn.decor('parking'), 1], reward: { offering: 120 }, go: 'decor' },
  { id: 'cate1', icon: '📘', name: '예비신자 교리반 열기', desc: '위쪽 📘을 눌러 교리반을 열어요', need: () => [cateState().classes || 0, 1], reward: { offering: 100, heart: 1 }, go: 'cate' },
  { id: 'crew1', icon: '👷', name: '일꾼 한 사람 더 쓰기', desc: '사무실 → 직원 채용', need: () => [crew().length, 1], reward: { offering: 120 }, go: 'b:office' },
  { id: 'maryGarden', icon: '⛰️', name: '성모동산 꾸미기', desc: '짓기 → 조경 → 성모동산', need: () => [_qn.decor('maryGarden'), 1], reward: { offering: 160, heart: 2 }, go: 'decor' },
  { id: 'grp2lv3', icon: '📈', name: '단체를 Lv3로', desc: '단체 둘을 Lv3로', need: () => [_qn.groupsAt(3), 2], reward: { offering: 160 }, go: 'groups' },
  { id: 'village', icon: '🗺️', name: '윗말 길 열기', desc: '길 끝의 이장님을 찾아가요', need: () => [villageOpen('v1') ? 1 : 0, 1], reward: { offering: 160, gems: 5 }, go: 'elder' },
  { id: 'lot4', icon: '🏞️', name: '서남쪽 언덕까지 넓히기', desc: '짓기 → 땅 넓히기 (성당 Lv4부터)', need: () => [_qn.lots(), 4], reward: { offering: 200, gems: 3 }, go: 'lots' },
  { id: 'clear25', icon: '🌳', name: '본당 둘레 말끔히', desc: '잡초·돌·나무를 25곳까지', need: () => [_qn.cleared(), 25], reward: { offering: 160 }, go: 'clear' },
  { id: 'stations', icon: '✝️', name: '야외 십자가의 길', desc: '짓기 → 조경 → 십자가의 길 (성당 Lv4부터)', need: () => [_qn.decor('stations'), 1], reward: { offering: 160, heart: 2 }, go: 'decor' },
  { id: 'church5', icon: '⛪', name: '큰 가건물 성당 (Lv5)', desc: '성당을 눌러 증축해요', need: () => [Game.state.pastor.fixed.church, 5], reward: { offering: 300, gems: 5 }, go: 'b:church' },
  { id: 'fence3', icon: '🧱', name: '시멘트 담벼락 쌓기', desc: '짓기 → 담장 Lv3 (성당 Lv5부터)', need: () => [Game.state.pastor.fence || 0, 3], reward: { offering: 200, heart: 2 }, go: 'fence' },
  { id: 'path30', icon: '🛤️', name: '본당 구석구석 길', desc: '길을 30칸까지', need: () => [_qn.paths(), 30], reward: { offering: 120 }, go: 'path' },
  { id: 'mem500', icon: '👥', name: '신자 500명', desc: '좌석이 모자라면 미사를 늘려요', need: () => [Math.floor(Game.state.pastor.res.members), 500], reward: { offering: 200, heart: 1 }, go: 'b:church' },
  { id: 'bapt20', icon: '🕊️', name: '세례자 20명', desc: '교리반을 마친 예비신자가 주일에 세례를 받아요', need: () => [Game.state.pastor.baptizedTotal || 0, 20], reward: { offering: 240, gems: 5 }, go: 'cate' },
];
const PARISHES = {
  solmoe: { name: '솔뫼 본당', short: '솔뫼', icon: '⛰️', kind: '산골 본당', place: '솔뫼 면',
    desc: '작은 산골 본당. 교우는 대부분 어르신이에요.',
    start: { members: 120, offering: 40, heart: 30, reputation: 20, church: 1, rectory: 1, office: 1 }, mods: {} },
  city: { name: '한빛동 본당', short: '한빛', icon: '🏙️', kind: '도심 큰 본당', place: '한빛동', interior: true,
    desc: '도심 한가운데의 큰 본당. 새 성당과 벽돌 교리실, 단체 여덟 곳, 관리장·사무원이 이미 있어요. 봉헌이 많고 사람도 빨리 늘지만, 다들 바빠서 마음을 얻기 어려워요.',
    start: { members: 650, offering: 400, heart: 30, reputation: 40, church: 5, rectory: 5, office: 5, clear: 12,
      sites: [{ level: 5, groups: [['district', 5], ['legio', 4], ['choir', 4]] }, { level: 5, groups: [['catechumen', 4], ['mission', 3], ['altar', 3]] }, { level: 4, groups: [['school', 4], ['elders', 4]] }],
      crew: [{ role: 'manager', level: 3 }, { role: 'clerk', level: 4 }] }, mods: { members: 1.2, offering: 1.3, heart: -5 },
    need: { score: 70, trust: 60 } },
  newtown: { name: '새솔 신도시 본당', short: '새솔', icon: '🏗️', kind: '신도시 개척 본당', place: '새솔 신도시', interior: true,
    desc: '아파트가 막 들어선 신도시. 컨테이너 성당에서 다시 시작하지만 젊은 가정이 많아 사람이 빨리 늘고 예비신자도 많아요.',
    start: { members: 80, offering: 120, heart: 35, reputation: 15, church: 1, rectory: 2, office: 2, clear: 6, sites: [{ level: 2, groups: [['district', 2]] }], crew: [] }, mods: { members: 1.6, cate: 1.5 },
    need: { score: 55, rep: 50 } },
  harbor: { name: '갯마을 본당', short: '갯마을', icon: '⚓', kind: '바닷가 어촌 본당', place: '갯마을',
    desc: '바닷가 어촌의 오래된 본당. 어르신들의 마음은 따뜻하지만 젊은이들이 도시로 떠나 신자가 조금씩 줄어요.',
    start: { members: 260, offering: 80, heart: 50, reputation: 25, church: 3, rectory: 3, office: 2, clear: 8, sites: [{ level: 3, groups: [['elders', 3], ['legio', 3]] }, { level: 2, groups: [['district', 2], ['altar', 2]] }], crew: [{ role: 'manager', level: 2 }] }, mods: { members: 0.7, heart: 5, decline: 0.5 },
    need: { score: 35 } },
  island: { name: '푸른섬 본당', short: '푸른섬', icon: '🏝️', kind: '섬 본당', place: '푸른섬',
    desc: '배를 타고 들어가는 섬 본당. 봉헌은 적지만 교우들이 서로 가족 같아요. 공소를 살리는 것이 큰일이에요.',
    start: { members: 150, offering: 40, heart: 45, reputation: 20, church: 2, rectory: 2, office: 1, clear: 5, sites: [{ level: 2, groups: [['elders', 2], ['district', 2]] }], crew: [] }, mods: { members: 0.8, offering: 0.8, heart: 5 },
    need: {} },
};
// 성적표 항목: 0~100점으로 바꿔서 무게대로 더한다
const REPORT_ITEMS = [
  { id: 'members', icon: '👥', name: '신자 수', w: 25 },
  { id: 'heart', icon: '❤️', name: '교우들의 마음', w: 20 },
  { id: 'reputation', icon: '🌏', name: '평판', w: 15 },
  { id: 'trust', icon: '🏛️', name: '교구 신뢰', w: 15 },
  { id: 'groups', icon: '👥', name: '단체', w: 15 },
  { id: 'baptized', icon: '🕊️', name: '세례자', w: 10 },
];
const REPORT_GRADES = [[85, 'S', '훌륭해요'], [70, 'A', '잘했어요'], [55, 'B', '괜찮아요'], [35, 'C', '아쉬워요'], [0, 'D', '많이 부족해요']];

// ---------- 성소: 예비신학생 → 신학생 → 사제 서품 ----------
// 주일마다 성소분과 레벨만큼의 확률로 신학생이 나온다. 신학생 한 명마다 주일마다 신학교 지원비.
// 신학교 과정은 실제로는 7년 남짓이지만 게임에서는 weeks(=2년)로 줄였다. 해마다 leave 확률로 그만두기도 한다
const SEMINARY = { chance: 0.008, cost: 12, weeks: 96, leave: 0.08 };
const SEMINARY_NAMES = ['김 미카엘', '이 요셉', '박 안드레아', '최 프란치스코', '정 바오로', '강 다니엘', '조 요한', '윤 토마스', '장 베드로', '한 라파엘'];

// ---------- 봉사자 그만두기 면담 ----------
// reason마다 맞는 응답(good)이 있다. 잘못 고르면 그만두고, 소문이 나서 평판을 잃기도 한다
const QUIT_ANSWERS = [
  { id: 'rest', icon: '🛌', label: '"그동안 정말 수고 많으셨어요. 한동안 쉬셔도 괜찮아요."' },
  { id: 'fix', icon: '🛠️', label: '"제가 그 문제를 바로 살펴보고 바로잡겠습니다."' },
  { id: 'share', icon: '🤝', label: '"일을 나눌 사람을 함께 찾아봐요. 혼자 다 하지 않으셔도 돼요."' },
  { id: 'persuade', icon: '🙏', label: '"하느님 일인데 조금만 더 참아 주세요."' },
  { id: 'accept', icon: '👋', label: '"알겠습니다. 그동안 고마웠어요."' },
];
const QUITS = [
  { reason: 'tired', text: '"신부님, 몇 년째 혼자 다 하다 보니 너무 지쳤어요. 이제 그만두고 싶어요."', good: ['share', 'rest'], bad: 'persuade', badText: '"결국 신부님도 제 사정은 모르시네요." 그는 서운해하며 단체를 떠났고, 동네에 그 이야기가 돌았다.' },
  { reason: 'conflict', text: '"단체 안에서 저를 두고 뒷말이 너무 많아요. 더는 못 견디겠어요."', good: ['fix'], bad: 'accept', badText: '"아무도 제 편을 들어 주지 않네요." 그는 성당에도 발길을 끊었다. 교우들 사이에 말이 많아졌다.' },
  { reason: 'family', text: '"집안에 아픈 사람이 생겨서요… 봉사를 계속하기가 어려울 것 같아요."', good: ['rest', 'accept'], bad: 'persuade', badText: '"가족이 아픈데 참으라니요." 그는 크게 상처받았다. 그 말이 마을에 퍼졌다.' },
  { reason: 'hurt', text: '"지난번 회의 때 신부님이 하신 말씀에 상처를 받았어요. 저는 필요 없는 사람 같아요."', good: ['fix', 'share'], bad: 'accept', badText: '"역시 저는 필요 없었던 거죠." 그는 눈물을 보이며 떠났다. 단체 사람들도 신부님을 다시 보게 됐다.' },
  { reason: 'money', text: '"행사 때마다 제 돈이 너무 많이 들어가요. 솔직히 부담스러워서 그만두려고요."', good: ['fix'], bad: 'persuade', badText: '"돈 얘기는 들은 척도 안 하시네요." 그는 단체를 떠났고, 성당이 봉사자 돈을 쓴다는 말이 돌았다.' },
  { reason: 'burnout', text: '"요즘 기도도 안 되고 마음이 메말랐어요. 봉사가 그냥 일처럼 느껴져요."', good: ['rest', 'share'], bad: 'accept', badText: '그는 조용히 단체를 떠났다. 몇 주 뒤에는 주일미사에서도 보이지 않았다.' },
];
const QUIT_HINT = { tired: '혼자 짐을 너무 많이 진 것 같아요', conflict: '사람 사이의 문제를 바로잡아 주기를 바라는 것 같아요', family: '지금은 가족 곁에 있어야 하는 것 같아요', hurt: '마음을 알아주고 바로잡아 주기를 바라는 것 같아요', money: '돈 문제를 풀어 주기를 바라는 것 같아요', burnout: '쉼과 짐 나누기가 필요해 보여요' };

// ---------- 조경 (성당 마당 꾸미기) ----------
// heart: 마음 목표 +, rep: 평판 목표 +, church: 만들 수 있는 성당 레벨, lent/may: 그 시기 주일에 더 오르는 마음
// ---------- 본당 부지 (v0.70): 처음엔 성당 둘레 땅만, 나머지는 사서 넓힌다 ----------
// 본당 땅(마을·이웃 동네 밖)을 구획으로 나눈다. 산 구획 안에서만 짓고, 치우고, 길을 놓는다.
// 땅값은 고정 (v1.08 사용자 "고정값으로, 성당 근처는 싸고 멀어질수록 비싸게"): 성당 앞마당 한가운데에서 그 땅 한가운데까지 거리 d칸으로
// 약 4×d² (50 단위로 다듬음) · 앞 콩밭 8.5칸 300 … 마을 동쪽 장터 28.6칸 3300
const LOTS = [  // farm: 이 땅에 군데군데 있는 마을 사람의 밭(field)·논(paddy) (v1.08 사용자 "땅을 살 때 군데군데 땅이 밭인 걸로")
  { id: 'home', name: '성당 앞마당', x: 6, y: 0, w: 15, h: 10, cost: 0, church: 1, desc: '성당·사제관·사무실이 선 본당 땅' },
  { id: 'west', name: '서쪽 텃밭', farm: 'field', x: 0, y: 0, w: 6, h: 10, cost: 450, church: 2, desc: '성당 서쪽 박 씨네 텃밭. 박 씨 댁이 붙어 있어요' },
  { id: 'south', name: '앞 콩밭', farm: 'field', x: 6, y: 10, w: 15, h: 7, cost: 300, church: 2, desc: '성당 앞 너른 콩밭. 사면 교리실을 여럿 놓을 수 있어요' },
  { id: 'southwest', name: '언덕배기 고추밭', farm: 'field', x: 0, y: 10, w: 6, h: 7, cost: 750, church: 4, desc: '나지막한 언덕의 고추밭. 최 씨 댁이 있어요' },
  { id: 'far', name: '아랫마을 논', farm: 'paddy', x: 0, y: 17, w: 21, h: 7, cost: 1000, church: 6, desc: '이웃 동네와 맞닿은 넓은 논. 교우 가정 두 집이 있어요' },
  { id: 'field2', name: '신작로 옆 배추밭', farm: 'field', x: 0, y: 24, w: 10, h: 4, cost: 2100, church: 7, desc: '면 소재지로 가는 길가 배추밭. 사면 본당이 길까지 닿아요' },
  { id: 'paddy2', name: '큰 논', farm: 'paddy', x: 10, y: 24, w: 20, h: 4, cost: 2000, church: 8, desc: '마을에서 제일 넓은 논. 다 사면 본당 땅이 면 소재지 앞까지 이어져요' },
  // v1.08 사용자 "윗말도 다른 곳처럼 구매할 수 있게": 윗말 마을 전체. 사면 마을이 열린다 (이장님 방문 세 번으로도 열린다). 공소는 여기에만
  { id: 'v1', name: '윗말', village: true, x: 21, y: 0, w: 9, h: 24, cost: 800, church: 3, desc: '성당 동쪽 윗마을. 사면 마을이 열려 교우 가정을 찾아가고, 교리실과 공소를 세울 수 있어요' },
  // v1.08 사용자 "동네에 메인 길도 만들고 거기도 구매 가능하게": 큰길(y28~29) 아래 동네 땅. 집·마을회관·면사무소는 그대로 남는다
  { id: 'town_w', name: '마을 서쪽 집터', x: 0, y: 30, w: 14, h: 4, cost: 3100, church: 9, desc: '큰길 서쪽 동네 빈 집터. 가게와 이웃집 사이 빈 땅이 본당 땅이 돼요' },
  { id: 'town_e', name: '마을 동쪽 장터', x: 16, y: 30, w: 14, h: 4, cost: 3300, church: 10, desc: '큰길 동쪽 장터 자리. 마을회관·면사무소 옆 빈 땅이 본당 땅이 돼요' },
];
// v0.80: 지도를 두 배 칸으로 나눴다 (maps.js MAP_GRID)
for (const l of LOTS) { l.x *= 2; l.y *= 2; l.w *= 2; l.h *= 2; }
// 울타리: 산 땅 둘레에 두른다. 레벨이 오를수록 좋은 울타리로 바뀌고, 둘레가 길수록 비싸다
// per: 담 한 칸 값(고정, v1.08 사용자 "나무펜스 가격이 왜 이렇게 비싸" — 살림 규모에 따라 오르던 것을 땅값처럼 고정)
const FENCE_LEVELS = [  // v1.07: 사용자 "낡은 펜스 → 새 펜스 → 시멘트 담벼락 → 벽돌 화단" (그림 assets/sprites/fence-lv1~4, tools/blender/make-fence.py)
  null,
  { name: '낡은 나무 펜스', icon: '🪵', per: 2, church: 1, heart: 1, rep: 0, desc: '얻어 온 판자로 세운 비뚤비뚤한 펜스. 그래도 어디까지가 성당인지는 알 수 있어요' },
  { name: '새 하얀 펜스', icon: '🤍', per: 5, church: 3, heart: 2, rep: 1, desc: '하얗게 칠한 새 나무 펜스. 마당이 단정해 보여요' },
  { name: '시멘트 담벼락', icon: '🧱', per: 10, church: 5, heart: 3, rep: 2, desc: '시멘트 블록을 쌓고 갓돌을 얹은 튼튼한 담' },
  { name: '벽돌 화단 담', icon: '🌷', per: 18, church: 7, heart: 4, rep: 3, desc: '붉은 벽돌로 쌓은 화단 담. 꽃이 피어 지나는 사람도 웃어요' },
];

const DECOR = {
  flowerbed: { name: '화단', icon: '🌷', w: 1, d: 1, cost: 15, heart: 1, church: 1, desc: '성당 길가에 꽃을 심어요' },
  statue: { name: '성모상', icon: '🙏', w: 1, d: 1, cost: 60, heart: 2, rep: 1, church: 2, desc: '마당 한쪽에 성모님을 모셔요. 오가는 교우들이 기도하고 가요' },
  maryGarden: { name: '성모동산', icon: '⛰️', w: 2, d: 2, cost: 200, heart: 4, rep: 2, church: 3, may: 3, desc: '돌로 쌓은 작은 동굴에 성모님을 모신 동산. 5월 성모 성월에는 교우들이 더 모여요' },
  stations: { name: '야외 십자가의 길', icon: '✝️', w: 4, d: 1, cost: 250, heart: 3, rep: 1, church: 4, lent: 3, desc: '14처 십자가를 마당에 세워요. 사순 시기에는 교우들이 십자가의 길 기도를 바쳐요' },
  parking: { name: '주차장', icon: '🅿️', w: 3, d: 2, cost: 180, heart: 1, rep: 1, attend: 0.03, church: 3, desc: '차를 댈 곳이 생기면 먼 마을 교우들도 주일미사에 와요 (참례율 +3%)' },
};
// v0.80: 조경도 두 배 칸 (성모상은 한 칸 그대로)
for (const [k, d] of Object.entries(DECOR)) if (k !== 'statue') { d.w *= 2; d.d *= 2; }


// ---------- 주일미사 시간 (성당이 꽉 차면 늘린다) ----------
// 미사가 한 대 늘 때마다 좌석(신자 한도) +25%, 참례율 +3%, 주일 행동력 +2, 미사 경비
// ---------- 한 주 전례 (v0.75) ----------
// 한 주(주일미사 사이)를 월~토 여섯 날로 나눈다. 처음엔 주일미사 한 대뿐이고, 주임 신부가 평일 전례를 하나씩 연다.
// 열어 둔 전례는 그날이 오면 저절로 드려진다(게임을 꺼 두어도). 그날 직접 가면 효과가 커진다.
const WEEK_DAYS = ['주일', '월', '화', '수', '목', '금', '토'];
const LITURGIES = [
  { id: 'mon', day: 1, time: '오전 10시', name: '월요일 평일미사', icon: '⛪', kind: 'mass', church: 1, cost: 20, energy: 1 },
  { id: 'wed', day: 3, time: '오전 10시', name: '수요일 평일미사', icon: '⛪', kind: 'mass', church: 2, cost: 30, energy: 1 },
  { id: 'fri', day: 5, time: '오전 10시', name: '금요일 평일미사', icon: '⛪', kind: 'mass', church: 2, cost: 30, energy: 1 },
  { id: 'sick', day: 4, time: '오전', name: '목요일 환자 영성체', icon: '🤲', kind: 'sick', church: 2, cost: 25, energy: 2 },
  { id: 'tue', day: 2, time: '저녁 7시 30분', name: '화요일 저녁 미사', icon: '🌙', kind: 'mass', church: 3, cost: 40, energy: 1 },
  { id: 'thu', day: 4, time: '저녁 7시 30분', name: '목요일 저녁 미사', icon: '🌙', kind: 'mass', church: 3, cost: 40, energy: 1 },
  { id: 'hour', day: 4, time: '저녁 미사 뒤', name: '목요일 성시간', icon: '🕯️', kind: 'hour', church: 3, cost: 30, energy: 1, need: 'thu' },
  { id: 'kids', day: 6, time: '오후 5시', name: '토요일 초등부 주일학교 미사', icon: '🧒', kind: 'kids', church: 3, cost: 40, energy: 1, group: 'school' },
  { id: 'marian', day: 6, time: '오전 10시', name: '첫토요일 성모신심미사', icon: '💙', kind: 'marian', church: 4, cost: 50, energy: 1, first: true },
];
// 직접 가면 몇 배 (자동은 1배). 강론을 준비하고 주일미사에 가면 봉헌이 더 는다
const LIT_MANUAL = 2.2;
const SUNDAY_AUTO = { collect: 0.7, grace: 1 / 7 };   // 신부님 없이 저절로 드린 주일미사: 봉헌 70% · 주일이 되고 하루 지나면 저절로
const SUNDAY_PREP_BONUS = 0.15;                        // 강론을 준비하고 직접 드리면 봉헌 +15%
// 피정·휴가(사무실에서 주보로 공지)와 교구 연수: 신부님이 본당을 비우면 미사가 없다
const AWAY = {
  retreat: { name: '피정', icon: '⛰️', days: 5, perYear: 2, desc: '피정의 집에서 닷새 동안 침묵 속에 기도해요' },
  vacation: { name: '휴가', icon: '🏖️', days: 15, perYear: 1, desc: '보름 동안 쉬며 몸과 마음을 돌봐요' },
  training: { name: '교구 연수', icon: '🎓', days: 3, desc: '교구 사제들이 모여 사흘 동안 공부하고 나눠요' },
};
// 교구 연수: 상반기 4월 2주, 하반기 10월 2주 (달 1~12, 주 0~3)
const TRAININGS = [{ month: 4, week: 1, name: '상반기 교구 연수' }, { month: 10, week: 1, name: '하반기 교구 연수' }];

const MASS_TIMES = [
  { name: '주일 오전 10시 교중미사', icon: '⛪' },
  { name: '토요일 저녁 7시 30분 주일미사', icon: '🌆' },
  { name: '주일 오후 청년 미사', icon: '🎸' },
  { name: '주일 새벽 6시 미사', icon: '🌅' },
];
const MASSES = { seats: 0.25, attend: 0.03, energy: 2, cost: 5, full: 0.92, chance: 0.25, addAt: 0.8 };

// 소공동체 짜임: 참여 신자 SMALLCOM.perBan명이 한 반, 반이 banPerGu개를 넘으면 구역(구역 하나에 반 약 10개), 구역이 guPerJi개를 넘으면 지역
// 참여율 = base + 소공동체 힘(레벨×활력)마다 per (최대 max)
const SMALLCOM = { perBan: 20, banPerGu: 10, guPerJi: 5, base: 0.25, per: 0.08, max: 0.9, banOffering: 0.25, guHeart: 0.5 };

// 단체를 만들려면 먼저 있어야 하는 단체 (초등부 → 중고등부 → 청년회 → 청장년회)
const UNIT_PREREQ = { school2: 'school', youth: 'school2', adults: 'youth', parentsK: 'school', parentsY: 'school2' };

// 수녀님 활동 범위: 들어가는 단체가 많을수록 단체마다 효과는 옅어지고(spread), 영향력이 쌓인다
// 영향력이 riskAt을 넘으면 수녀님을 따르는 세력이 생겨 신부님과 단체 사이에 불화가 날 수 있다
const SISTER_SCOPE = { inf: 1.5, decay: 3, quiet: 2, riskAt: 50, riskDiv: 150, vital: 4 };

// 제대회 살림: 주일마다 세탁비(제대포·제의, 미사 수만큼)·제병(참례자 수만큼)·미사주(미사 수만큼)
// 수입: 한 달에 한 번 성시간 컵초 판매, 부활·성탄(대축일)에 컵초 판매 — 참례자 × 단가 × (1 + 제대회 레벨 10%)
const ALTAR_FIN = { laundry: 1, laundryPerMass: 0.4, hostPer: 0.008, winePerMass: 0.6, holyHour: 0.03, feastCandle: 0.09 };

// 단체 주일 살림: 헌화회 꽃 구입(대축일 3배, 사순엔 없음) · 세례식·혼배 꽃다발 수입
// 주일학교 교리 준비비(교재·활동지) · 자모회 간식 재료비
const GROUP_FIN = { choirSnack: 1.2, conductor: 3, accompanist: 2, flowers: 2, flowersFeast: 3, bouquetBaptism: 1.5, bouquetWedding: 12, weddingChance: 0.12, weddingPerMember: 0.0001, schoolPrep: 1.5, schoolPrepLv: 0.4, snack: 2, snackLv: 0.5 };

// ---------- 월별 사목 방향 ----------
// 한 달(네 주일)마다 하나를 고른다. mods: cate·members·offering·upkeep 배수, heart·rep 목표 ±, attend 참례율 ±, smallCom 참여율 ±, vital 그 분야 단체 활력 매일 ±, allVital 모든 단체
const GROUP_FIELD = {
  mission: ['mission', 'catechumen'],
  liturgy: ['choir', 'organ', 'lector', 'altar', 'flower', 'server', 'eucharist'],
  charity: ['vincent', 'elders', 'senior', 'christopher', 'mothers'],
  youth: ['school', 'school2', 'youth', 'adults', 'parentsK', 'parentsY', 'soccer'],
  community: ['district', 'legio', 'prayer'],
  finance: ['shop', 'relics', 'cafe', 'golf'],
};
const DIRECTIONS = [
  { id: 'mission', icon: '🕊️', name: '복음 선포의 달', good: '예비신자 +30% · 새 얼굴 +10% · 선교·교리반 활력 매일 +2', bad: '살림비 +5% (홍보·행사)', mods: { cate: 1.3, members: 1.1, upkeep: 1.05, vital: 2 } },
  { id: 'liturgy', icon: '🙏', name: '기도와 전례의 달', good: '마음 목표 +5 · 참례율 +3% · 전례 단체 활력 매일 +2', bad: '평판 목표 −3 (본당 안에만 머물러요)', mods: { heart: 5, attend: 0.03, rep: -3, vital: 2 } },
  { id: 'charity', icon: '🤝', name: '이웃 사랑의 달', good: '평판 목표 +6 · 빈첸시오·어르신·봉사 단체 활력 매일 +2', bad: '봉헌 −5% (나눔에 써요)', mods: { rep: 6, offering: 0.95, vital: 2 } },
  { id: 'youth', icon: '🧒', name: '다음 세대의 달', good: '주일학교·청년 단체 활력 매일 +3 · 새 얼굴 +5%', bad: '마음 목표 −2 (어르신들이 서운해해요)', mods: { members: 1.05, heart: -2, vital: 3 } },
  { id: 'community', icon: '🏘️', name: '공동체의 달', good: '소공동체 참여율 +10% · 마음 목표 +3 · 소공동체·레지오 활력 매일 +2', bad: '예비신자 −10%', mods: { smallCom: 0.1, heart: 3, cate: 0.9, vital: 2 } },
  { id: 'finance', icon: '💰', name: '살림 정비의 달', good: '살림비 −10% · 봉헌 +5%', bad: '마음 목표 −4 · 모든 단체 활력 매일 −1', mods: { upkeep: 0.9, offering: 1.05, heart: -4, allVital: -1 } },
];
// 단체별 지원 수준: 활동비 배수와 매일 활력
const BUDGET = {
  low: { name: '적게', upkeep: 0.7, vital: -3 },
  normal: { name: '보통', upkeep: 1, vital: 0 },
  high: { name: '많이', upkeep: 1.5, vital: 3 },
};
const GRUMBLE = { base: 0.05, perHigh: 0.03, max: 0.2 };

// ---------- 직원 채용: 사무실에서 공고 → 지원자(최대 3명) → 능력을 보고 승낙·거절 ----------
// 능력 1~5: 솜씨(공사 속도), 성실(관리장은 마당 정리, 사무직은 살림비 절약), 신앙(교우 마음). 요구 급여는 기본 인건비의 배수
const HIRE = { postCost: 5, perHour: 0.3, max: 3 };
const STAFF_NAMES = ['김 요셉', '이 마리아', '박 베드로', '최 안나', '정 미카엘', '강 루치아', '조 안드레아', '윤 젬마', '장 바오로', '임 세실리아', '한 토마스', '오 엘리사벳', '서 야고보', '신 모니카'];
const STAFF_NOTES = {
  skill: ['손재주가 뛰어나요', '목수 일을 오래 했어요', '전기·배관도 고칠 줄 알아요'],
  lowSkill: ['경험이 거의 없어요', '일을 배우는 중이에요'],
  diligent: ['아침 일찍 나와요', '맡은 일은 끝까지 해요'],
  lazy: ['가끔 늦는다는 말이 있어요', '전 직장에서 자주 쉬었대요'],
  faith: ['새벽 미사에 빠지지 않아요', '레지오 단원이에요'],
  noFaith: ['세례받은 지 얼마 안 됐어요', '성당에 잘 나오지 않았대요'],
};

// ---------- 보좌 신부 ----------
// 큰 본당이 되면 교구에 보좌 신부를 청할 수 있다(최대 3명). 임금은 없고 생활비(wage/시간)만 나간다.
// 보좌 신부마다 맡을 단체를 scope개까지 고르면, 주임 신부가 못 간 그 단체 회의에 대신 들어가 강복을 준다
const CURATE = { at: [{ church: 6, members: 900 }, { church: 7, members: 1400 }, { church: 9, members: 2000 }], trust: 50, wage: 2, scope: 4, vital: 25, heart: 0.5, sendBack: 3 };
const CURATE_NAMES = ['김 다니엘', '이 스테파노', '박 미카엘', '최 라파엘', '정 바오로', '윤 요한'];

// ---------- 퀘스트를 청하는 사람 (v1.06 사용자 요청) ----------
// 사목회장·사무원·지구 회의·대리구 회의·수원교구·교우들이 청하는 식으로. img는 assets/story/의 그림
const QUEST_WHO = {
  council: { name: '사목회장 박 요셉', img: 'req-council' },
  clerk: { name: '사무원 김 마르타', img: 'req-clerk' },
  deanery: { name: '지구 회의', img: 'req-deanery' },
  vicariate: { name: '대리구 회의', img: 'req-vicariate' },
  diocese: { name: '수원교구', img: 'req-diocese' },
  faithful: { name: '교우들', img: 'req-faithful' },
};
// 퀘스트 id → [청하는 사람, 청하는 말]
const QUEST_FROM = {
  clear3: ['council', '신부님, 마당이 잡초랑 돌투성이라 교우들이 걷다 넘어지세요. 몇 군데만이라도 치워 주시겠어요?'],
  path5: ['faithful', '비만 오면 성당 앞이 진흙탕이에요. 어르신들 걸으시게 길을 좀 깔아 주세요.'],
  flower1: ['faithful', '성당 앞에 꽃 한 포기라도 있으면 좋겠어요. 저희가 물은 줄게요!'],
  room2: ['council', '레지오랑 구역 모임이 한 방을 나눠 써요. 교리실이 하나 더 있어야겠습니다.'],
  group2: ['council', '흩어졌던 교우들이 다시 모이고 싶어 해요. 단체를 하나 더 꾸려 보시지요.'],
  office2: ['clerk', '신부님, 금고가 작아서 봉헌금 둘 데가 없어요. 사무실을 좀 손봐 주세요.'],
  fence1: ['council', '어디까지가 성당 땅인지 마을 분들이 헷갈려하세요. 판자라도 얻어다 펜스를 세워 경계를 지읍시다.'],
  clear8: ['faithful', '성당 뒤쪽은 아직 풀숲이에요. 아이들이 뛰어놀 수 있게 더 치워 주세요.'],
  lot2: ['council', '옆 텃밭 주인이 땅을 내놓았답니다. 본당 땅을 넓힐 좋은 기회예요.'],
  church3: ['deanery', '솔뫼 본당 교우가 늘었다고 들었습니다. 지구에서도 성당 증축을 응원합니다.'],
  rectory3: ['clerk', '사제관 지붕이 새요, 신부님. 이번엔 꼭 고치셔야 해요.'],
  statue: ['faithful', '마당에 성모님을 모시면 오가며 기도할 수 있을 텐데요.'],
  lit1: ['faithful', '주일에만 미사가 있으니 평일에도 성당에 오고 싶어요. 평일미사를 열어 주세요.'],
  grp2lv2: ['council', '단체들이 자리를 잡았어요. 이제 더 키워 볼 때입니다.'],
  lot3: ['council', '교리실 놓을 자리가 모자라요. 땅을 한 곳 더 사 두시지요.'],
  path15: ['clerk', '교리실이랑 사무실 사이가 멀어서 서류 들고 다니기 힘들어요. 길을 이어 주세요.'],
  clear15: ['faithful', '새로 산 땅에 돌이 많아요. 저희도 거들 테니 함께 치워요.'],
  room3: ['council', '주일학교 아이들 모일 방이 없어요. 교리실을 하나 더 놓아야겠어요.'],
  fence2: ['faithful', '펜스가 너무 낡아서 쓰러질 것 같아요. 하얗게 칠한 새 펜스면 성당이 환해 보일 거예요.'],
  flower3: ['faithful', '꽃이 피니 참 좋네요. 성당 가는 길을 꽃길로 만들어 봐요.'],
  office3: ['clerk', '교적과 장부가 산더미예요. 사무실을 넓혀야 일을 할 수 있어요.'],
  church4: ['vicariate', '대리구에서 알립니다. 솔뫼 본당은 가건물 성당으로 증축할 때가 되었습니다.'],
  mem300: ['deanery', '지구 회의에서 선교 목표를 정했습니다. 본당마다 교우 300명을 함께 이룹시다.'],
  parking: ['faithful', '윗마을에서 차로 오는데 댈 곳이 없어요. 주차장이 있으면 더 자주 올게요.'],
  cate1: ['vicariate', '대리구 선교 주간입니다. 본당마다 예비신자 교리반을 열어 주십시오.'],
  crew1: ['clerk', '혼자서는 공사 관리까지 못 해요. 일꾼을 한 분 더 모셔 주세요.'],
  maryGarden: ['faithful', '5월 성모 성월에 모일 성모동산이 있었으면 해요.'],
  grp2lv3: ['council', '단체장들이 더 큰 활동을 해 보고 싶대요. 힘을 실어 주세요.'],
  village: ['faithful', '윗말 교우들은 길이 막혀 성당에 못 와요. 이장님께 말씀 좀 해 주세요.'],
  lot4: ['council', '서남쪽 언덕 최 씨 댁이 땅을 팔겠답니다. 본당이 크려면 꼭 필요한 땅이에요.'],
  clear25: ['deanery', '다음 달 지구 성지순례 때 솔뫼에 들르기로 했습니다. 성당 둘레를 단정히 해 주세요.'],
  stations: ['faithful', '사순 시기에 십자가의 길 기도를 마당에서 바치고 싶어요.'],
  church5: ['vicariate', '대리구에서 알립니다. 솔뫼 본당의 큰 가건물 성당 증축을 승인합니다.'],
  fence3: ['council', '펜스로는 바람도 못 막아요. 시멘트 블록으로 튼튼한 담을 쌓읍시다. 형제님들이 일손을 보태 주신대요.'],
  path30: ['faithful', '성당 구석구석 길이 이어지면 어르신들이 안심하고 다니실 거예요.'],
  mem500: ['diocese', '수원교구 공문: 솔뫼 본당의 성장을 눈여겨보고 있습니다. 교우 500명에 이르기를 바랍니다.'],
  bapt20: ['diocese', '수원교구 공문: 올해 새 영세자 20명을 목표로, 본당의 선교에 힘써 주십시오.'],
};
