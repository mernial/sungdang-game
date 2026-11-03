// 성당 키우기: 효과음과 목소리 (v1.06)
// 효과음은 소리 파일 없이 Web Audio로 그 자리에서 만든다 (저작권 걱정 없음, 내려받을 것 없음).
// 퀘스트를 청하는 사람의 말은 기기의 한국어 음성(speechSynthesis)으로, 사람마다 높낮이·빠르기를 달리해 읽는다.
// 설정에서 효과음·목소리를 따로 끌 수 있다 (localStorage 'sungdang-sound' = { sfx, voice })

const Sound = (() => {
  let ac = null, master = null;
  const pref = (() => { try { return Object.assign({ sfx: true, voice: true }, JSON.parse(localStorage.getItem('sungdang-sound') || '{}')); } catch (e) { return { sfx: true, voice: true }; } })();
  const savePref = () => { try { localStorage.setItem('sungdang-sound', JSON.stringify(pref)); } catch (e) { /* 무시 */ } };
  // 브라우저는 사용자가 한 번 눌러야 소리를 낼 수 있다
  const unlock = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); } catch (e) { return; } }
    if (ac.state === 'suspended') ac.resume();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));

  // 음 하나: 주파수, 시작(초 뒤), 길이, 파형, 크기
  function tone(f, at, dur, type = 'sine', vol = 0.3, slide = 0) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  // 잡음 한 토막 (망치·풀숲·종이)
  function noise(at, dur, vol = 0.2, freq = 1200, q = 1) {
    const t = ac.currentTime + at, len = Math.max(1, Math.floor(ac.sampleRate * dur)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q; g.gain.value = vol;
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t);
  }
  // 종: 기본음과 배음이 길게 울린다
  function bell(f, at, vol = 0.25, dur = 2.4) { [1, 2.0, 2.76, 4.07].forEach((k, i) => tone(f * k, at, dur / (1 + i * 0.6), 'sine', vol / (1 + i * 1.4))); }

  const SFX = {
    tap: () => tone(880, 0, 0.05, 'triangle', 0.08),
    open: () => { noise(0, 0.12, 0.06, 2500, 0.8); tone(660, 0.02, 0.08, 'sine', 0.06); },
    page: () => noise(0, 0.07, 0.05, 3200, 1.2),
    coin: () => { tone(1320, 0, 0.12, 'square', 0.06); tone(1760, 0.07, 0.25, 'square', 0.06); tone(2640, 0.12, 0.2, 'sine', 0.05); },
    quest: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, 'sine', 0.13)),
    reward: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.16)); [1047, 1319, 1568].forEach(f => tone(f, 0.3, 0.8, 'sine', 0.1)); },
    build: () => [0, 0.22, 0.44].forEach(t => { noise(t, 0.08, 0.35, 700, 2); tone(180, t, 0.08, 'square', 0.08, 0.6); }),
    done: () => { tone(988, 0, 0.3, 'sine', 0.15); tone(1319, 0.14, 0.6, 'sine', 0.15); },
    clear: () => { noise(0, 0.25, 0.18, 1800, 0.6); noise(0.12, 0.2, 0.12, 900, 0.8); },
    bell: () => { bell(392, 0); bell(392, 1.1, 0.2); bell(330, 2.2, 0.18); },
    bless: () => [1047, 1175, 1319, 1568, 1760].forEach((f, i) => tone(f, i * 0.07, 0.9, 'sine', 0.06)),
    error: () => tone(160, 0, 0.18, 'sawtooth', 0.07, 0.8),
    meet: () => { bell(784, 0, 0.12, 1.0); bell(988, 0.18, 0.1, 1.0); },
  };
  function sfx(name) {
    if (!pref.sfx || !SFX[name]) return;
    unlock(); if (!ac) return;
    try { SFX[name](); } catch (e) { /* 소리는 실패해도 게임은 그대로 */ }
  }
  // 알림 글의 첫 그림 글자로 알맞은 소리를 고른다
  function sfxForText(msg) {
    const m = String(msg);
    if (/^(🏗️|📦|🔨)/.test(m)) return sfx('build');
    if (/^(💰|🧺|🎁)/.test(m) || /봉헌|거두/.test(m.slice(0, 12))) return sfx('coin');
    if (/^(🌿|🪨|🌳)/.test(m) || /치웠/.test(m)) return sfx('clear');
    if (/^(📜)/.test(m)) return sfx('quest');
    if (/^(🙏|🕊️|✝️)/.test(m)) return sfx('bless');
    if (/^(⚠️|❗|🔒)/.test(m) || /모자라|없어요|못 /.test(m)) return sfx('error');
    return sfx('tap');
  }

  // ---------- 목소리 ----------
  // 사람마다: 높낮이(pitch), 빠르기(rate), 음성 고르기(여자 목소리 선호 여부)
  const VOICE = {
    // prefer: 이 이름의 음성이 있으면 먼저 (Apple 기기 한국어 음성), 없으면 남녀로 고른다
    council: { pitch: 0.9, rate: 0.92, female: false, prefer: ['Grandpa', 'Rocko'] },     // 사목회장: 나이 지긋한 남자 어른
    clerk: { pitch: 1.1, rate: 1.05, female: true, prefer: ['유나', 'Yuna', 'Flo'] },      // 사무원: 또랑또랑한 여자
    deanery: { pitch: 1.0, rate: 0.98, female: false, prefer: ['Reed', 'Eddy'] },          // 지구 회의: 중년 신부님
    vicariate: { pitch: 0.9, rate: 0.9, female: false, prefer: ['Eddy', 'Reed'] },         // 대리구: 점잖고 느린 말투
    diocese: { pitch: 1.0, rate: 0.9, female: true, prefer: ['Shelley', 'Sandy', '유나'] }, // 교구 공문: 차분한 낭독
    faithful: { pitch: 1.05, rate: 0.95, female: true, prefer: ['Grandma', 'Sandy'] },     // 교우들: 정겨운 할머니
    priest: { pitch: 0.95, rate: 1.0, female: false, prefer: ['Reed'] },
  };
  let voices = [];
  const loadVoices = () => { try { voices = speechSynthesis.getVoices().filter(v => /^ko/i.test(v.lang)); } catch (e) { voices = []; } };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const FEMALE = /yuna|sora|seoyeon|jiyoung|heami|female|여|유나|나라/i, MALE = /minsu|jian|injoon|hyunsu|male|남|민수|지안/i;
  function pickVoice(female, prefer) {
    if (!voices.length) loadVoices();
    if (!voices.length) return null;
    for (const n of prefer || []) { const v = voices.find(x => x.name.startsWith(n)); if (v) return v; }
    return voices.find(v => (female ? FEMALE : MALE).test(v.name)) || (female ? voices[0] : voices[voices.length - 1]);
  }
  function speak(text, who = 'council') {
    if (!pref.voice || !('speechSynthesis' in window)) return;
    const plain = String(text).replace(/<[^>]+>/g, '').replace(/[“”"]/g, '').trim();
    if (!plain) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain), c = VOICE[who] || VOICE.council, v = pickVoice(c.female, c.prefer);
      u.lang = 'ko-KR'; if (v) u.voice = v; u.pitch = c.pitch; u.rate = c.rate; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* 음성이 없는 기기 */ }
  }
  function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* 무시 */ } }

  return { sfx, sfxForText, speak, hush, pref, savePref };
})();
