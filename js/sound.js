// 성당 키우기: 효과음과 목소리 (v1.06 · 목소리 v1.08)
// 효과음은 소리 파일 없이 Web Audio로 그 자리에서 만든다 (저작권 걱정 없음, 내려받을 것 없음).
// 사람의 말은 미리 녹음한 목소리 파일로 (v1.08, 아래 '목소리').
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

  // ---------- 목소리 (v1.08) ----------
  // 정해진 대사는 Supertonic 3(무료 기기 안 TTS)으로 사람마다 다른 목소리로 미리 녹음해 두었다 (tools/make-voice.py).
  // assets/voice/<해시>.mp3, 해시 = FNV-1a("얼굴|글"). 녹음이 없는 말(숫자가 바뀌는 말 등)은 기계음 대신 읽지 않는다.
  let voiceIdx = null, cur = null;
  fetch('assets/voice/index.json?v=2').then(r => r.json()).then(a => { voiceIdx = new Set(a); }).catch(() => { voiceIdx = new Set(); });
  const plainOf = t => String(t).replace(/<[^>]+>/g, '').replace(/[“”"]/g, '').trim();
  function voiceKey(face, text) {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(`${face}|${plainOf(text)}`)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function speak(text, face = 'council') {
    if (!pref.voice || !voiceIdx) return;
    const k = voiceKey(face, text);
    if (!voiceIdx.has(k)) return;
    hush();
    try { cur = new Audio(`assets/voice/${k}.mp3`); cur.volume = 0.95; const pr = cur.play(); if (pr) pr.catch(() => {}); } catch (e) { /* 소리를 못 내는 기기 */ }
  }
  function hush() { if (cur) { try { cur.pause(); } catch (e) { /* 무시 */ } cur = null; } }

  return { sfx, sfxForText, speak, hush, pref, savePref };
})();
