/**
 * Hệ thống âm thanh Chùa Online:
 * - Mõ gỗ (Web Audio mẫu cộng hưởng)
 * - Đại hồng chung (chuông chùa ngân dài họa âm tự nhiên)
 * - Nhạc nền thiền định Phật giáo (BGM Procedural: Drone 432Hz, Tibetan Singing Bowl, Ngũ cung sáo thiền, Chuông gió)
 * - Lồng tiếng tụng kinh tiếng Việt (Web Speech API) & chế độ tự đọc
 */

let ctx = null;
let master = null;
let bgmGain = null;
let sfxGain = null;
let woodBuffer = null;

// Trạng thái BGM
let bgmPlaying = false;
let bgmTimer = null;
let bgmNodes = [];

export function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 1.0;
    master.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.45;
    bgmGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Tạo mẫu tiếng mõ gỗ ấm áp, vang rỗng đặc trưng */
function makeWoodBuffer() {
  const ac = ensureCtx();
  if (!ac) return null;
  const dur = 0.55;
  const rate = ac.sampleRate;
  const len = Math.floor(rate * dur);
  const buf = ac.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 14);
    const body = Math.sin(2 * Math.PI * 330 * t) * 0.65 + Math.sin(2 * Math.PI * 480 * t) * 0.35;
    const click = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 95) * 0.5;
    d[i] = (body + click) * env * 0.6;
  }
  return buf;
}

/** Gõ mõ */
export function hitWood(strength = 1) {
  const ac = ensureCtx();
  if (!ac) return;
  if (!woodBuffer) woodBuffer = makeWoodBuffer();
  if (!woodBuffer) return;

  const src = ac.createBufferSource();
  src.buffer = woodBuffer;
  src.playbackRate.value = 0.98 + (Math.random() - 0.5) * 0.05;

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2700;

  const gain = ac.createGain();
  gain.gain.value = 0.55 * strength;

  src.connect(filter).connect(gain).connect(sfxGain);
  src.start();
}

/** Đại hồng chung - tiếng chuông chùa ngân nga siêu trầm ấm */
export function ringBell(pitchFactor = 1) {
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Họa âm chuông đồng cổ điển
  const partials = [
    { f: 216 * pitchFactor, g: 0.45, d: 6.5 },
    { f: 432 * pitchFactor, g: 0.32, d: 5.2 },
    { f: 648 * pitchFactor, g: 0.22, d: 4.1 },
    { f: 864 * pitchFactor, g: 0.12, d: 3.2 },
    { f: 1296 * pitchFactor, g: 0.08, d: 2.2 },
    { f: 1728 * pitchFactor, g: 0.04, d: 1.5 }
  ];

  for (const p of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = p.f;

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(p.g * 0.6, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + p.d);

    osc.connect(g).connect(sfxGain);
    osc.start(now);
    osc.stop(now + p.d + 0.1);
  }
}

/** Tiếng khánh nhỏ thanh thoát */
export function chime() {
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;
  [880, 1108, 1318].forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now + i * 0.08);
    g.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 1.2);
    osc.connect(g).connect(sfxGain);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 1.3);
  });
}

/* ========================================================
   HỆ THỐNG NHẠC NỀN THIỀN ĐỊNH PHẬT GIÁO (BGM ZEN SYNTH)
   - Tần số 432Hz chữa lành
   - Dòng chảy Pad êm dịu
   - Thang âm ngũ cung thiền tịnh (Pentatonic)
   - Chuông xoay Tây Tạng định kỳ
   ======================================================== */

// Thang âm thiền D ngũ cung (D4, E4, G4, A4, B4, D5, E5, G5...)
const ZEN_NOTES = [288, 324, 384, 432, 486, 576, 648, 768];

function playZenPluck(freq, timeOffset = 0, vol = 0.1) {
  const ac = ensureCtx();
  if (!ac || !bgmPlaying) return;
  const t = ac.currentTime + timeOffset;

  const osc = ac.createOscillator();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, t);
  filter.frequency.exponentialRampToValueAtTime(300, t + 3.0);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);

  osc.connect(filter).connect(gain).connect(bgmGain);
  osc.start(t);
  osc.stop(t + 3.6);
}

function playSingingBowl() {
  const ac = ensureCtx();
  if (!ac || !bgmPlaying) return;
  const now = ac.currentTime;
  const baseFreq = 216; // 432 / 2

  // Chuông xoay Tây Tạng với nhịp rung phách binaural nhẹ
  [1, 2.76, 5.4, 8.1].forEach((mult, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * mult + (i === 0 ? 0.8 : 0); // tạo tiếng rung ấm

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.08 / (i + 1), now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 10.0);

    osc.connect(g).connect(bgmGain);
    osc.start(now);
    osc.stop(now + 10.2);
  });
}

function startZenDrone() {
  const ac = ensureCtx();
  if (!ac) return;

  // 2 bộ dao động tạo lớp nền pad không gian trầm ấm liên tục
  const freqs = [108, 162]; // Quãng năm sâu lắng
  freqs.forEach((f) => {
    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const g = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.value = f;

    filter.type = 'lowpass';
    filter.frequency.value = 220;

    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ac.currentTime + 3.0);

    osc.connect(filter).connect(g).connect(bgmGain);
    osc.start();

    bgmNodes.push({ osc, gain: g });
  });
}

function scheduleNextZenNote() {
  if (!bgmPlaying) return;
  const delay = 1800 + Math.random() * 2400; // mỗi 1.8s - 4.2s có 1 nốt gảy thanh tịnh
  bgmTimer = setTimeout(() => {
    if (!bgmPlaying) return;

    // Ngẫu nhiên nốt thiền
    const note = ZEN_NOTES[Math.floor(Math.random() * ZEN_NOTES.length)];
    playZenPluck(note, 0, 0.08 + Math.random() * 0.05);

    // 15% xác suất điểm xuyết thêm chuông xoay hoặc 2 nốt hòa âm
    if (Math.random() < 0.22) {
      setTimeout(() => {
        const harmony = ZEN_NOTES[Math.floor(Math.random() * ZEN_NOTES.length)];
        playZenPluck(harmony, 0, 0.06);
      }, 350);
    }

    if (Math.random() < 0.12) {
      playSingingBowl();
    }

    scheduleNextZenNote();
  }, delay);
}

export function startBgm() {
  if (bgmPlaying) return;
  const ac = ensureCtx();
  if (!ac) return;
  bgmPlaying = true;

  startZenDrone();
  playSingingBowl();
  scheduleNextZenNote();
}

export function stopBgm() {
  bgmPlaying = false;
  if (bgmTimer) {
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }
  bgmNodes.forEach(({ osc, gain }) => {
    try {
      if (ctx) {
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); } catch { }
        }, 1300);
      } else {
        osc.stop();
      }
    } catch { }
  });
  bgmNodes = [];
}

export function toggleBgm(force) {
  const shouldPlay = typeof force === 'boolean' ? force : !bgmPlaying;
  if (shouldPlay) startBgm();
  else stopBgm();
  return bgmPlaying;
}

export function isBgmPlaying() {
  return bgmPlaying;
}

export function setBgmVolume(val) {
  if (bgmGain && ctx) {
    bgmGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), ctx.currentTime);
  }
}

export function setSfxVolume(val) {
  if (sfxGain && ctx) {
    sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), ctx.currentTime);
  }
}

/* ========================================================
   GIỌNG ĐỌC KINH & CHẾ ĐỘ TỰ ĐỌC (SPEECH ENGINE)
   ======================================================== */

let voices = [];
let viVoice = null;
let speechOn = true; // true: lồng tiếng, false: tự đọc
let currentUtter = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return;
  viVoice =
    voices.find((v) => /vi[-_]VN/i.test(v.lang)) ||
    voices.find((v) => /^vi/i.test(v.lang)) ||
    voices.find((v) => /vietnam/i.test(v.name)) ||
    null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function setSpeechEnabled(on) {
  speechOn = !!on;
  if (!on) stopSpeech();
}

export function getSpeechEnabled() {
  return speechOn;
}

export function hasSpeech() {
  return 'speechSynthesis' in window;
}

export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtter = null;
}

/**
 * Đọc một câu kinh khi ở chế độ Lồng tiếng
 * Trả về Promise hoàn tất khi đọc xong câu
 */
export function speak(text, rate = 0.9) {
  if (!speechOn || !('speechSynthesis' in window) || !text) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'vi-VN';
      if (viVoice) u.voice = viVoice;
      u.rate = rate;
      u.pitch = 0.95;
      u.volume = 0.95;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        currentUtter = null;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;

      // Fallback bảo vệ trong trường hợp trình duyệt không kích hoạt onend
      const guard = setTimeout(finish, 1200 + (text.length * 200) / Math.max(0.5, rate));

      currentUtter = u;
      window.speechSynthesis.speak(u);
      u.addEventListener?.('end', () => clearTimeout(guard));
    } catch {
      resolve();
    }
  });
}

export function unlockAudio() {
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  // Kích hoạt audio context trên Safari/iOS
  const osc = ac.createOscillator();
  const g = ac.createGain();
  g.gain.value = 0.0001;
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.02);

  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}
