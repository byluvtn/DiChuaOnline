/**
 * Âm thanh: mõ gỗ (Web Audio tổng hợp), chuông, và đọc kinh
 * bằng Web Speech API (có sẵn Android/iOS, không cần file mp3).
 */

let ctx = null;
let master = null;
let woodBuffer = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Tạo mẫu tiếng mõ: cộng hưởng gỗ ngắn, hơi tối. */
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
    const env = Math.exp(-t * 13);
    // hai tần số cộng hưởng của khối gỗ rỗng
    const body = Math.sin(2 * Math.PI * 320 * t) * 0.6 + Math.sin(2 * Math.PI * 470 * t) * 0.35;
    const click = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5;
    d[i] = (body + click) * env * 0.55;
  }
  return buf;
}

/** Gõ mõ. strength 0..1 */
export function hitWood(strength = 1) {
  const ac = ensureCtx();
  if (!ac) return;
  if (!woodBuffer) woodBuffer = makeWoodBuffer();
  if (!woodBuffer) return;

  const src = ac.createBufferSource();
  src.buffer = woodBuffer;
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.05;

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;

  const gain = ac.createGain();
  gain.gain.value = 0.5 * strength;

  src.connect(filter).connect(gain).connect(master);
  src.start();
}

/** Chuông kết thúc bài: nhiều họa âm, ngân dài. */
export function ringBell() {
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const partials = [
    { f: 392, g: 0.35, d: 4.2 },
    { f: 587, g: 0.22, d: 3.4 },
    { f: 784, g: 0.16, d: 2.8 },
    { f: 1176, g: 0.09, d: 2.0 },
    { f: 1568, g: 0.05, d: 1.4 }
  ];

  for (const p of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = p.f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(p.g * 0.5, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + p.d);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + p.d + 0.05);
  }
}

/** Tiếng "ting" nhỏ khi lên cấp. */
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
    g.gain.linearRampToValueAtTime(0.14, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.9);
    osc.connect(g).connect(master);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 1);
  });
}

/* ---------------- Giọng đọc ---------------- */

let voices = [];
let viVoice = null;
let speechOn = true;
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
 * Đọc một câu kinh. Trả về Promise kết thúc khi đọc xong.
 * rate: 0.6..1.4
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

      // iOS đôi khi không bắn onend -> chốt an toàn
      const guard = setTimeout(finish, 1200 + text.length * 190 / Math.max(0.5, rate));

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
  // iOS cần một lần phát trong gesture
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
