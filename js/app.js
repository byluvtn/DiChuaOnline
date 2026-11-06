import { SUTRAS, SUTRA_BY_ID, levelOf, syllables } from './kinh.js';
import { initScene, setAura } from './scene.js';
import * as Audio from './audio.js';
import * as Store from './storage.js';

const $ = (id) => document.getElementById(id);

const el = {
  canvas: $('scene'),
  lines: $('lines'),
  progressBar: $('progressBar'),
  stepInfo: $('stepInfo'),
  sutraInfo: $('sutraInfo'),
  tabs: $('sutraTabs'),
  fish: $('btnFish'),
  meritNum: $('meritNum'),
  levelNum: $('levelNum'),
  xpBar: $('xpBar'),
  toast: $('toast'),
  boot: $('boot'),
  btnEnter: $('btnEnter'),
  sheet: $('sheet'),
  chkVoice: $('chkVoice'),
  chkAuto: $('chkAuto'),
  chkVibe: $('chkVibe'),
  rngSpeed: $('rngSpeed'),
  stTotal: $('stTotal'),
  stToday: $('stToday'),
  stLevel: $('stLevel'),
  sndVoice: $('sndVoice'),
  sndVibe: $('sndVibe'),
  sndBell: $('sndBell'),
  selQuality: $('selQuality'),
  onlineCount: $('onlineCount')
};

const state = {
  data: Store.load(),
  sutra: SUTRAS[0],
  index: 0,
  auto: false,
  timer: null,
  finished: false,
  locked: false,
  session: 0,
  lastLevel: 1
};

/* ================= khởi động ================= */

function boot() {
  try {
    initScene(el.canvas, state.data.settings.quality);
  } catch (err) {
    // WebGL không khả dụng: vẫn cho dùng phần tụng kinh
    console.warn('3D không khả dụng:', err);
  }

  buildTabs();
  selectSutra(state.data.lastSutra || 'dai-bi', false);
  state.lastLevel = levelOf(state.data.merit).level;
  renderLevel();
  bindUI();
  registerSW();
  fakeOnline();
}

function bindUI() {
  el.btnEnter.addEventListener('click', enterTemple);

  // mobile: pointerdown phản hồi tức thì
  el.fish.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tapFish();
  });
  // desktop / trợ năng: bàn phím kích hoạt click với detail = 0
  el.fish.addEventListener('click', (e) => {
    if (e.detail === 0) tapFish();
  });

  el.chkAuto.addEventListener('change', () => {
    if (el.chkAuto.checked) startAuto();
    else stopAuto();
    state.data.settings.auto = state.auto;
    Store.save(state.data);
  });

  el.chkVoice.addEventListener('change', () => {
    setVoice(el.chkVoice.checked);
  });

  el.chkVibe.addEventListener('change', () => {
    setVibe(el.chkVibe.checked);
  });

  el.rngSpeed.addEventListener('input', () => {
    state.data.settings.speed = Number(el.rngSpeed.value);
    Store.save(state.data);
    if (state.auto) startAuto(); // áp dụng nhịp mới
  });

  $('btnSettings').addEventListener('click', openSheet);
  $('btnCloseSheet').addEventListener('click', closeSheet);
  el.sheet.addEventListener('click', (e) => {
    if (e.target === el.sheet) closeSheet();
  });

  el.sndVoice.addEventListener('change', () => setVoice(el.sndVoice.checked));
  el.sndVibe.addEventListener('change', () => setVibe(el.sndVibe.checked));
  el.sndBell.addEventListener('change', () => {
    state.data.settings.bell = el.sndBell.checked;
    Store.save(state.data);
  });

  el.selQuality.addEventListener('change', () => {
    state.data.settings.quality = el.selQuality.value;
    Store.save(state.data);
    toast('Tải lại trang để áp dụng chất lượng 3D');
  });

  $('btnReset').addEventListener('click', () => {
    if (!confirm('Xoá toàn bộ công đức đã tích?')) return;
    state.data = Store.reset();
    state.lastLevel = 1;
    renderLevel();
    closeSheet();
    toast('Đã xoá công đức');
  });

  $('btnBack').addEventListener('click', () => {
    stopAuto();
    if (state.session > 0) {
      toast(`A Di Đà Phật · ${state.session} công đức buổi này`);
    }
    state.session = 0;
  });

  // bàn phím cho desktop
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    if (document.activeElement && /INPUT|SELECT|BUTTON/.test(document.activeElement.tagName)) return;
    e.preventDefault();
    tapFish();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
  });
}

async function enterTemple() {
  Audio.unlockAudio();
  Audio.setSpeechEnabled(state.data.settings.voice);
  el.boot.classList.add('hide');
  setTimeout(() => (el.boot.style.display = 'none'), 650);
  applySettingsToUI();
  if (state.data.settings.auto) startAuto();
  else speakCurrent();
}

function applySettingsToUI() {
  const s = state.data.settings;
  el.chkVoice.checked = s.voice;
  el.chkAuto.checked = s.auto;
  el.chkVibe.checked = s.vibe;
  el.rngSpeed.value = s.speed;
  el.sndVoice.checked = s.voice;
  el.sndVibe.checked = s.vibe;
  el.sndBell.checked = s.bell;
  el.selQuality.value = s.quality;
  state.auto = s.auto;
  Audio.setSpeechEnabled(s.voice);
}

function setVoice(on) {
  state.data.settings.voice = on;
  el.chkVoice.checked = on;
  el.sndVoice.checked = on;
  Audio.setSpeechEnabled(on);
  Store.save(state.data);
  if (!on) Audio.stopSpeech();
}

function setVibe(on) {
  state.data.settings.vibe = on;
  el.chkVibe.checked = on;
  el.sndVibe.checked = on;
  Store.save(state.data);
}

/* ================= tabs ================= */

function buildTabs() {
  el.tabs.innerHTML = '';
  SUTRAS.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.type = 'button';
    b.dataset.id = s.id;
    b.textContent = s.short;
    b.addEventListener('click', () => {
      if (s.id === state.sutra.id && !state.finished) return;
      selectSutra(s.id, true);
    });
    el.tabs.append(b);
  });
}

function selectSutra(id, reset) {
  const s = SUTRA_BY_ID[id] || SUTRAS[0];
  stopAuto();
  state.sutra = s;
  state.finished = false;
  state.data.lastSutra = s.id;
  Store.save(state.data);
  if (reset) state.index = 0;
  state.index = Math.max(0, Math.min(state.index, s.lines.length - 1));

  [...el.tabs.children].forEach((t) => t.classList.toggle('on', t.dataset.id === s.id));
  el.sutraInfo.textContent = s.name;
  el.tabs.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  renderLines();
  renderProgress();
}

/* ================= hiển thị ================= */

function renderLines() {
  const lines = state.sutra.lines;
  const i = state.index;
  const frag = document.createDocumentFragment();

  if (state.finished) {
    const d = document.createElement('div');
    d.className = 'line now';
    d.textContent = 'A Di Đà Phật';
    frag.append(d);

    const d2 = document.createElement('div');
    d2.className = 'line next';
    d2.textContent = 'Hồi hướng công đức · nguyện cầu bình an';
    frag.append(d2);
  } else {
    for (let k = 0; k < 5; k++) {
      const idx = i + k;
      if (idx >= lines.length) break;
      const d = document.createElement('div');
      d.className = k === 0 ? 'line now' : k === 1 ? 'line next' : 'line far';
      d.textContent = lines[idx];
      frag.append(d);
    }
  }

  el.lines.innerHTML = '';
  el.lines.append(frag);
}

function renderProgress() {
  const total = state.sutra.lines.length;
  const done = Math.min(state.index, total);
  const pct = state.finished ? 100 : (done / total) * 100;
  el.progressBar.style.width = `${pct}%`;
  el.stepInfo.textContent = `${done} / ${total}`;
}

function renderLevel() {
  const lv = levelOf(state.data.merit);
  el.meritNum.textContent = fmt(state.data.merit);
  el.levelNum.textContent = lv.level;
  el.xpBar.style.width = `${lv.pct}%`;
  el.stTotal.textContent = fmt(state.data.merit);
  el.stToday.textContent = fmt(state.data.todayMerit);
  el.stLevel.textContent = lv.level;
}

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

/* ================= nhịp ================= */

/** Thời gian (ms) cho một câu: càng nhiều âm tiết càng lâu. */
function lineDuration(text) {
  const sp = state.data.settings.speed; // 1 chậm → 10 nhanh
  const base = 1250 - sp * 95;          // 1155ms → 300ms
  const perSyl = 82 - sp * 3.6;         // 78ms → 46ms mỗi âm tiết
  return Math.max(620, base + syllables(text) * perSyl);
}

function speechRate() {
  const sp = state.data.settings.speed;
  return 0.55 + sp * 0.085; // ~0.64 → 1.4
}

function speakCurrent() {
  if (!state.data.settings.voice || state.finished) return;
  Audio.speak(state.sutra.lines[state.index], speechRate());
}

function tapFish() {
  if (state.locked) return;
  state.locked = true;
  setTimeout(() => (state.locked = false), 80);

  el.fish.classList.remove('hit');
  void el.fish.offsetWidth;
  el.fish.classList.add('hit');

  Audio.hitWood(0.82 + Math.random() * 0.18);

  if (state.data.settings.vibe && navigator.vibrate) navigator.vibrate(12);

  addMerit(1);
  advance();

  // người dùng gõ tay khi đang tự động → đặt lại nhịp
  if (state.auto) {
    if (state.timer) clearTimeout(state.timer);
    scheduleNext();
  }
}

function advance() {
  if (state.finished) {
    // bắt đầu lại bài sau khi đã xong
    state.finished = false;
    state.index = 0;
    renderLines();
    renderProgress();
    speakCurrent();
    return;
  }

  state.index += 1;

  if (state.index >= state.sutra.lines.length) {
    completeSutra();
    return;
  }

  renderLines();
  renderProgress();
  speakCurrent();
}

function completeSutra() {
  const wasAuto = state.auto;
  stopAuto();

  state.finished = true;
  state.index = state.sutra.lines.length;
  renderLines();
  renderProgress();

  const s = state.sutra;
  const bonus = Math.round(s.lines.length * 0.5) + 10;
  addMerit(bonus);

  if (state.data.settings.bell) Audio.ringBell();
  toast(`Trọn bài ${s.name} · +${bonus} công đức`);

  state.data.best[s.id] = (state.data.best[s.id] || 0) + 1;
  Store.save(state.data);

  setAura(true);
  setTimeout(() => {
    setAura(false);
    if (wasAuto) startAuto();
  }, 3200);
}

/* ================= tự động ================= */

function startAuto() {
  stopAuto();
  if (state.finished) {
    state.finished = false;
    state.index = 0;
    renderLines();
    renderProgress();
  }

  state.auto = true;
  el.chkAuto.checked = true;
  state.data.settings.auto = true;
  Store.save(state.data);

  speakCurrent();
  scheduleNext();
}

function scheduleNext() {
  if (!state.auto) return;
  const text = state.sutra.lines[Math.min(state.index, state.sutra.lines.length - 1)] || '';
  const voicePad = state.data.settings.voice ? 420 : 0;
  const wait = lineDuration(text) + voicePad;

  state.timer = setTimeout(() => {
    if (!state.auto) return;
    tapFish(); // tapFish tự gọi scheduleNext khi auto bật
    if (state.finished) return;
  }, wait);
}

function stopAuto() {
  state.auto = false;
  el.chkAuto.checked = false;
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
  Audio.stopSpeech();
}

/* ================= công đức ================= */

function addMerit(n) {
  state.data.merit += n;
  state.data.todayMerit += n;
  state.session += n;

  const lv = levelOf(state.data.merit);
  renderLevel();
  Store.save(state.data);

  if (lv.level > state.lastLevel) {
    state.lastLevel = lv.level;
    Audio.chime();
    toast(`Lên cấp ${lv.level} · ${lv.name}`);
    setAura(true);
    setTimeout(() => setAura(false), 3000);
    if (navigator.vibrate) navigator.vibrate([20, 60, 20, 60, 40]);
  }
}

/* ================= UI phụ ================= */

let toastTimer = null;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
}

function openSheet() {
  el.sheet.classList.remove('hidden');
  renderLevel();
}
function closeSheet() {
  el.sheet.classList.add('hidden');
}

function fakeOnline() {
  let n = 8 + Math.floor(Math.random() * 20);
  el.onlineCount.textContent = n;
  setInterval(() => {
    n += Math.random() > 0.5 ? 1 : -1;
    n = Math.max(3, Math.min(64, n));
    el.onlineCount.textContent = n;
  }, 4200);
}

/* ================= PWA ================= */

function registerSW() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
