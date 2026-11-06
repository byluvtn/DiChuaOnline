import { SUTRAS, SUTRA_BY_ID, levelOf, syllables } from './kinh.js';
import { initScene, setAura, teleportTo, setJoystickMove, spawnLantern, LOCATIONS, onZoneChange } from './scene.js';
import * as Audio from './audio.js';
import * as Store from './storage.js';

const $ = (id) => document.getElementById(id);

const el = {
  canvas: $('scene'),
  lines: $('lines'),
  progressBar: $('progressBar'),
  stepInfo: $('stepInfo'),
  sutraInfo: $('currentSutraTitle') || $('sutraInfo'),
  tabs: $('sutraTabs'),
  fish: $('btnFish'),
  meritNum: $('topMerit') || $('meritNum'),
  levelNum: $('topLevelNum') || $('levelNum'),
  playerTitle: $('lblLevel') || $('playerTitle'),
  xpBar: $('xpBar'),
  toast: $('toast'),
  boot: $('bootScreen'),
  btnEnter: $('btnEnter'),
  sheet: $('settingsSheet'),
  chkVoice: $('sndVoice') || $('chkVoice'),
  chkAuto: $('chkAuto'),
  chkVibe: $('chkVibe'),
  rngSpeed: $('rngSpeed'),
  stTotal: $('stTotal'),
  stToday: $('stToday'),
  stLevel: $('stLevel'),
  sndVoice: $('sndVoice'),
  sndVibe: $('sndVibe'),
  sndBell: $('sndBell'),
  sndBgm: $('sndBgm'),
  selQuality: $('selQuality'),
  onlineCount: $('onlineCount'),

  // Các nút & thành phần mới
  userNameLabel: $('topPlayerName') || $('userNameLabel'),
  btnEditName: $('btnEditName'),
  nameModal: $('nameModal'),
  btnCloseName: $('btnCancelName') || $('btnCloseName'),
  btnSaveName: $('btnSaveName'),
  txtNameInput: $('inpPlayerName') || $('txtNameInput'),

  btnToggleBgm: $('btnToggleBgm'),
  btnOpenLantern: $('btnOpenLantern'),
  btnTogglePrayer: $('btnTogglePrayer'),
  prayerSection: $('prayerSection'),

  btnModeVoice: $('btnModeVoice'),
  btnModeSelf: $('btnModeSelf'),

  quickNav: $('quickNav'),
  zonePrompt: $('zonePrompt'),
  zoneTitle: $('promptTitle') || $('zoneTitle'),
  zoneDesc: $('promptDesc') || $('zoneDesc'),
  btnZoneAction: $('promptActionBtn') || $('btnZoneAction'),

  lanternModal: $('lanternModal'),
  btnCloseLantern: $('btnCloseLantern'),
  btnSendWish: $('btnSendWish'),
  txtWishInput: $('inpWishText') || $('txtWishInput'),
  wishList: $('wishesList') || $('wishList'),
  lanternCount: $('lanternCount'),

  joystickZone: $('joystickZone'),
  joystickKnob: $('joystickStick') || $('joystickKnob')
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
  lastLevel: 1,
  currentZoneKey: null
};

/* ================= KHỞI ĐỘNG ================= */

function boot() {
  try {
    if (el.canvas) {
      initScene(el.canvas, state.data.settings.quality);
    }
  } catch (err) {
    console.warn('3D không khả dụng hoặc lỗi khởi tạo:', err);
  }

  buildTabs();
  selectSutra(state.data.lastSutra || 'dai-bi', false);
  state.lastLevel = levelOf(state.data.merit).level;

  renderPlayerInfo();
  renderLevel();
  bindUI();
  setupVirtualJoystick();
  registerSW();
  fakeOnline();

  // Khởi tạo danh sách đèn nguyện ban đầu trên hồ sen
  if (state.data.wishes && state.data.wishes.length > 0) {
    try {
      state.data.wishes.slice(0, 10).forEach((w) => {
        spawnLantern(w.text);
      });
    } catch (e) {
      console.warn('Lỗi tạo đèn:', e);
    }
  }
}

/* ================= RENDER THÔNG TIN NGƯỜI DÙNG ================= */

function renderPlayerInfo() {
  const name = state.data.playerName || 'Quảng Hạnh 55';
  if (el.userNameLabel) el.userNameLabel.textContent = name;
  const lv = levelOf(state.data.merit);
  if (el.playerTitle) el.playerTitle.textContent = `${lv.level}`;
  if (el.levelNum) el.levelNum.textContent = `${lv.level}`;
}

function openNameModal() {
  if (el.txtNameInput) el.txtNameInput.value = state.data.playerName || 'Quảng Hạnh 55';
  el.nameModal?.classList.remove('hidden');
  setTimeout(() => el.txtNameInput?.focus(), 100);
}

function savePlayerName() {
  const val = el.txtNameInput ? el.txtNameInput.value.trim() : '';
  if (val) {
    state.data.playerName = val;
    Store.save(state.data);
    renderPlayerInfo();
    toast(`Pháp danh đổi thành: ${val}`);
  }
  el.nameModal?.classList.add('hidden');
}

/* ================= RENDER CÔNG ĐỨC & CẤP ================= */

function renderLevel() {
  const lv = levelOf(state.data.merit);
  if (el.meritNum) el.meritNum.textContent = fmt(state.data.merit);
  if (el.levelNum) el.levelNum.textContent = lv.level;
  if (el.playerTitle) el.playerTitle.textContent = lv.level;
  if (el.xpBar) el.xpBar.style.width = `${lv.pct}%`;
  if (el.stTotal) el.stTotal.textContent = fmt(state.data.merit);
  if (el.stToday) el.stToday.textContent = fmt(state.data.todayMerit);
  if (el.stLevel) el.stLevel.textContent = lv.level;
  renderPlayerInfo();
}

function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

/* ================= SỰ KIỆN GIAO DIỆN CHÍNH ================= */

function bindUI() {
  // Nút Vào Chùa từ boot screen
  const handleEnter = (e) => {
    e?.preventDefault?.();
    enterTemple();
  };
  el.btnEnter?.addEventListener('click', handleEnter);
  el.btnEnter?.addEventListener('touchend', handleEnter);

  // Đổi Pháp danh
  el.btnEditName?.addEventListener('click', openNameModal);
  el.btnCloseName?.addEventListener('click', () => el.nameModal?.classList.add('hidden'));
  el.btnSaveName?.addEventListener('click', savePlayerName);
  el.txtNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') savePlayerName();
  });

  // Nút BGM nhạc nền thiền
  el.btnToggleBgm?.addEventListener('click', () => {
    const active = Audio.toggleBgm();
    state.data.settings.bgm = active;
    Store.save(state.data);
    updateBgmButton(active);
    if (el.sndBgm) el.sndBgm.checked = active;
    toast(active ? 'Đã bật nhạc nền thiền' : 'Đã tắt nhạc nền thiền');
  });

  // Nút Bật/Tắt Bảng tụng kinh
  el.btnTogglePrayer?.addEventListener('click', () => {
    const isHidden = el.prayerSection?.classList.toggle('hidden');
    el.btnTogglePrayer?.classList.toggle('highlight', !isHidden);
    toast(isHidden ? 'Đã thu gọn bảng tụng kinh' : 'Đã mở bảng tụng kinh');
  });

  // Nút đóng bảng tụng kinh
  $('btnClosePrayer')?.addEventListener('click', () => {
    el.prayerSection?.classList.add('hidden');
    el.btnTogglePrayer?.classList.remove('highlight');
    toast('Đã thu gọn bảng tụng kinh');
  });

  // Chế độ đọc kinh: Lồng tiếng vs Tự đọc
  el.btnModeVoice?.addEventListener('click', () => setVoiceMode('voice'));
  el.btnModeSelf?.addEventListener('click', () => setVoiceMode('self'));

  // Nút Đèn nguyện
  el.btnOpenLantern?.addEventListener('click', openLanternModal);
  el.btnCloseLantern?.addEventListener('click', () => el.lanternModal?.classList.add('hidden'));
  el.btnSendWish?.addEventListener('click', submitWish);
  el.txtWishInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitWish();
  });

  // Tabs của modal đèn nguyện
  document.querySelectorAll('.m-tab, .modal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.m-tab, .modal-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderWishList();
    });
  });

  // Thanh di chuyển nhanh giữa các Thiền viện (QuickNav)
  document.querySelectorAll('.nav-chip, .nav-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.nav-chip, .nav-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const locKey = pill.dataset.loc;
      teleportTo(locKey);
      const locName = LOCATIONS[locKey]?.name || 'khuôn viên chùa';
      toast(`Đã đến: ${locName}`);
    });
  });

  // Lắng nghe sự kiện chuyển vùng
  try {
    onZoneChange((zone) => {
      handleZoneChange(zone?.key, zone);
    });
  } catch (e) {
    console.warn('onZoneChange hook error:', e);
  }
  el.btnZoneAction?.addEventListener('click', handleZoneAction);

  // Mõ gõ
  el.fish?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tapFish();
  });
  el.fish?.addEventListener('click', (e) => {
    if (e.detail === 0) tapFish();
  });

  // Tự động tụng
  el.chkAuto?.addEventListener('change', () => {
    if (el.chkAuto.checked) startAuto();
    else stopAuto();
    state.data.settings.auto = state.auto;
    Store.save(state.data);
  });

  el.chkVoice?.addEventListener('change', () => {
    setVoice(el.chkVoice.checked);
  });

  el.chkVibe?.addEventListener('change', () => {
    setVibe(el.chkVibe.checked);
  });

  el.rngSpeed?.addEventListener('input', () => {
    state.data.settings.speed = Number(el.rngSpeed.value);
    Store.save(state.data);
    if (state.auto) startAuto();
  });

  // Cài đặt
  $('btnSettings')?.addEventListener('click', openSheet);
  $('btnCloseSheet')?.addEventListener('click', closeSheet);
  $('btnCloseSettings')?.addEventListener('click', closeSheet);
  el.sheet?.addEventListener('click', (e) => {
    if (e.target === el.sheet) closeSheet();
  });

  if (el.sndBgm) {
    el.sndBgm.addEventListener('change', () => {
      const active = Audio.toggleBgm(el.sndBgm.checked);
      state.data.settings.bgm = active;
      Store.save(state.data);
      updateBgmButton(active);
    });
  }

  el.sndVoice?.addEventListener('change', () => setVoice(el.sndVoice.checked));
  el.sndVibe?.addEventListener('change', () => setVibe(el.sndVibe.checked));
  el.sndBell?.addEventListener('change', () => {
    state.data.settings.bell = el.sndBell.checked;
    Store.save(state.data);
  });

  el.selQuality?.addEventListener('change', () => {
    state.data.settings.quality = el.selQuality.value;
    Store.save(state.data);
    toast('Tải lại trang để áp dụng chất lượng 3D mới');
  });

  $('btnResetData')?.addEventListener('click', () => {
    if (!confirm('Xoá toàn bộ công đức và đặt lại dữ liệu?')) return;
    state.data = Store.reset();
    state.lastLevel = 1;
    renderLevel();
    closeSheet();
    toast('Đã hoàn lại trạng thái ban đầu');
  });

  // Phím tắt bàn phím
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (document.activeElement && /INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      tapFish();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
  });
}

async function enterTemple() {
  try {
    Audio.unlockAudio();
  } catch (e) {
    console.warn('Unlock audio:', e);
  }

  if (el.boot) {
    el.boot.classList.add('hide');
    setTimeout(() => {
      if (el.boot) el.boot.style.display = 'none';
    }, 650);
  }

  applySettingsToUI();

  // Bật nhạc nền nếu cài đặt mở
  if (state.data.settings.bgm) {
    try {
      Audio.startBgm();
      updateBgmButton(true);
    } catch (e) {
      console.warn('BGM start error:', e);
    }
  }

  setVoiceMode(state.data.settings.voiceMode || (state.data.settings.voice ? 'voice' : 'self'));

  if (state.data.settings.auto) {
    startAuto();
  } else {
    speakCurrent();
  }
}

function updateBgmButton(active) {
  if (!el.btnToggleBgm) return;
  const span = el.btnToggleBgm.querySelector('.btn-text');
  if (active) {
    el.btnToggleBgm.classList.add('active');
    if (span) span.textContent = 'Nhạc thiền (Bật)';
  } else {
    el.btnToggleBgm.classList.remove('active');
    if (span) span.textContent = 'Nhạc thiền';
  }
}

function applySettingsToUI() {
  const s = state.data.settings;
  if (el.chkVoice) el.chkVoice.checked = s.voice;
  if (el.chkAuto) el.chkAuto.checked = s.auto;
  if (el.chkVibe) el.chkVibe.checked = s.vibe;
  if (el.rngSpeed) el.rngSpeed.value = s.speed;
  if (el.sndVoice) el.sndVoice.checked = s.voice;
  if (el.sndVibe) el.sndVibe.checked = s.vibe;
  if (el.sndBell) el.sndBell.checked = s.bell;
  if (el.sndBgm) el.sndBgm.checked = s.bgm;
  if (el.selQuality) el.selQuality.value = s.quality;
  state.auto = s.auto;
  Audio.setSpeechEnabled(s.voice);
}

/* ================= CHẾ ĐỘ: TỰ ĐỌC vs LỒNG TIẾNG ================= */

function setVoiceMode(mode) {
  state.data.settings.voiceMode = mode;
  const isVoice = mode === 'voice';
  state.data.settings.voice = isVoice;
  Audio.setSpeechEnabled(isVoice);

  if (el.btnModeVoice) el.btnModeVoice.classList.toggle('active', isVoice);
  if (el.btnModeSelf) el.btnModeSelf.classList.toggle('active', !isVoice);

  if (el.chkVoice) el.chkVoice.checked = isVoice;
  if (el.sndVoice) el.sndVoice.checked = isVoice;
  Store.save(state.data);

  if (isVoice) {
    toast('Chế độ: Lồng tiếng đọc kinh');
    speakCurrent();
  } else {
    Audio.stopSpeech();
    toast('Chế độ: Tự đọc kinh');
  }
}

function setVoice(on) {
  setVoiceMode(on ? 'voice' : 'self');
}

function setVibe(on) {
  state.data.settings.vibe = on;
  if (el.chkVibe) el.chkVibe.checked = on;
  if (el.sndVibe) el.sndVibe.checked = on;
  Store.save(state.data);
}

/* ================= KHU VỰC THIỀN VIỆN & TƯƠNG TÁC ================= */

function handleZoneChange(key, zone) {
  state.currentZoneKey = key;
  if (!key || !zone) {
    if (el.zonePrompt) el.zonePrompt.classList.add('hidden');
    return;
  }

  if (el.zonePrompt) el.zonePrompt.classList.remove('hidden');
  if (el.zoneTitle) el.zoneTitle.textContent = zone.name;

  if (key === 'mainHall' || key === 'chanhdien') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Điện Phật trang nghiêm, cùng đại chúng quỳ tụng kinh.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Tụng kinh';
  } else if (key === 'quanAm' || key === 'quanam') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Lắng nghe hạnh nguyện từ bi cứu khổ cứu nạn.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Thắp hương';
  } else if (key === 'bellTower' || key === 'thapchuong') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Tiếng chuông thanh tịnh xua tan phiền não.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Thỉnh chuông';
  } else if (key === 'pond' || key === 'hosen') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Hoa sen toả hương ngát, nơi thả hoa đăng cầu bình an.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Thả đèn nguyện';
  } else {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Khuôn viên thanh tịnh bình an.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Lễ Phật';
  }

  // Cập nhật tab active trên quickNav
  document.querySelectorAll('.nav-chip, .nav-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.loc === key);
  });
}

function handleZoneAction() {
  const k = state.currentZoneKey;
  if (k === 'bellTower' || k === 'thapchuong') {
    Audio.ringBell();
    addMerit(5);
    toast('Thỉnh Đại Hồng Chung · Công đức vô lượng');
  } else if (k === 'pond' || k === 'hosen') {
    openLanternModal();
  } else if (k === 'mainHall' || k === 'chanhdien') {
    if (el.prayerSection) el.prayerSection.classList.remove('hidden');
    if (el.btnTogglePrayer) el.btnTogglePrayer.classList.add('highlight');
    tapFish();
    toast('Đang quỳ tụng kinh tại Chánh Điện');
  } else if (k === 'quanAm' || k === 'quanam') {
    Audio.chime();
    addMerit(3);
    setAura(true);
    setTimeout(() => setAura(false), 2000);
    toast('Nam Mô Đại Bi Quán Thế Âm Bồ Tát');
  } else {
    Audio.hitWood(1);
    addMerit(1);
    toast('A Di Đà Phật');
  }
}

/* ================= ĐÈN NGUYỆN (HOA ĐĂNG HỒ SEN) ================= */

function openLanternModal() {
  renderWishList();
  el.lanternModal?.classList.remove('hidden');
}

function renderWishList() {
  const wishes = state.data.wishes || [];
  if (el.lanternCount) el.lanternCount.textContent = `${wishes.length} ngọn đèn đang sáng lung linh`;

  const frag = document.createDocumentFragment();
  wishes.forEach((w) => {
    const item = document.createElement('div');
    item.className = 'wish-item';
    item.innerHTML = `
      <div class="wish-author">
        <span class="author-name">${escapeHtml(w.name || 'Phật tử')}</span>
        <span class="wish-time">${w.time || 'Vừa xong'}</span>
      </div>
      <div class="wish-text">${escapeHtml(w.text)}</div>
    `;
    frag.appendChild(item);
  });

  if (el.wishList) {
    el.wishList.innerHTML = '';
    el.wishList.appendChild(frag);
  }
}

function submitWish() {
  const text = el.txtWishInput?.value.trim();
  if (!text) {
    toast('Vui lòng nhập lời cầu nguyện');
    return;
  }

  const newWish = {
    id: Date.now(),
    name: state.data.playerName || 'Quảng Hạnh 55',
    text: text,
    time: 'Vừa xong'
  };

  if (!state.data.wishes) state.data.wishes = [];
  state.data.wishes.unshift(newWish);
  Store.save(state.data);

  // Thả đèn hoa đăng nổi trên mặt nước 3D hồ sen
  spawnLantern(text);

  // Hiệu ứng công đức & âm thanh
  addMerit(15);
  Audio.chime();
  toast('Đèn nguyện đã thả trên hồ sen · Vạn sự cát tường');

  if (el.txtWishInput) el.txtWishInput.value = '';
  renderWishList();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/* ================= JOYSTICK ẢO (CHO MOBILE) ================= */

function setupVirtualJoystick() {
  const zone = el.joystickZone;
  const knob = el.joystickKnob;
  if (!zone || !knob) return;

  let active = false;
  let originX = 0;
  let originY = 0;
  const maxRadius = 38;

  function onStart(cx, cy) {
    active = true;
    const rect = zone.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
    onMove(cx, cy);
  }

  function onMove(cx, cy) {
    if (!active) return;
    const dx = cx - originX;
    const dy = cy - originY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const capped = Math.min(dist, maxRadius);

    const nx = Math.cos(angle) * capped;
    const ny = Math.sin(angle) * capped;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;

    // Chuẩn hoá vector sang [-1, 1]
    const normX = nx / maxRadius;
    const normY = ny / maxRadius;
    setJoystickMove(normX, normY);
  }

  function onEnd() {
    active = false;
    knob.style.transform = 'translate(0px, 0px)';
    setJoystickMove(0, 0);
  }

  zone.addEventListener('pointerdown', (e) => {
    zone.setPointerCapture(e.pointerId);
    onStart(e.clientX, e.clientY);
  });

  zone.addEventListener('pointermove', (e) => {
    if (active) onMove(e.clientX, e.clientY);
  });

  zone.addEventListener('pointerup', () => onEnd());
  zone.addEventListener('pointercancel', () => onEnd());

  // Chuột thông thường
  zone.addEventListener('mousedown', (e) => {
    onStart(e.clientX, e.clientY);
    const mouseMove = (ev) => onMove(ev.clientX, ev.clientY);
    const mouseUp = () => {
      onEnd();
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
    };
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);
  });
}

/* ================= CHỌN BÀI KINH ================= */

function buildTabs() {
  if (!el.tabs) return;
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

  if (el.tabs) {
    [...el.tabs.children].forEach((t) => t.classList.toggle('on', t.dataset.id === s.id));
    el.tabs.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  if (el.sutraInfo) el.sutraInfo.textContent = s.name;
  renderLines();
  renderProgress();
}

/* ================= HIỂN THỊ CÂU KINH ================= */

function renderLines() {
  if (!el.lines) return;
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
    d2.textContent = 'Hồi hướng công đức · nguyện cầu bình an vạn sự cát tường';
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
  if (!el.progressBar || !el.stepInfo) return;
  const total = state.sutra.lines.length;
  const done = Math.min(state.index, total);
  const pct = state.finished ? 100 : (done / total) * 100;
  el.progressBar.style.width = `${pct}%`;
  el.stepInfo.textContent = `${done} / ${total} câu`;
}

/* ================= NHỊP & GIỌNG ĐỌC ================= */

function lineDuration(text) {
  const sp = state.data.settings.speed; // 1 chậm → 10 nhanh
  const base = 1250 - sp * 95;
  const perSyl = 82 - sp * 3.6;
  return Math.max(620, base + syllables(text) * perSyl);
}

function speechRate() {
  const sp = state.data.settings.speed;
  return 0.55 + sp * 0.085;
}

function speakCurrent() {
  if (state.data.settings.voiceMode === 'self') return; // Chế độ tự đọc không phát TTS
  if (!state.data.settings.voice || state.finished) return;
  Audio.speak(state.sutra.lines[state.index], speechRate());
}

/* ================= GÕ MÕ TỤNG KINH ================= */

function tapFish() {
  if (state.locked) return;
  state.locked = true;
  setTimeout(() => (state.locked = false), 80);

  if (el.fish) {
    el.fish.classList.remove('hit');
    void el.fish.offsetWidth;
    el.fish.classList.add('hit');
  }

  Audio.hitWood(0.85 + Math.random() * 0.15);

  if (state.data.settings.vibe && navigator.vibrate) navigator.vibrate(12);

  addMerit(1);
  advance();

  if (state.auto) {
    if (state.timer) clearTimeout(state.timer);
    scheduleNext();
  }
}

function advance() {
  if (state.finished) {
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

/* ================= TỰ ĐỘNG ================= */

function startAuto() {
  stopAuto();
  if (state.finished) {
    state.finished = false;
    state.index = 0;
    renderLines();
    renderProgress();
  }

  state.auto = true;
  if (el.chkAuto) el.chkAuto.checked = true;
  state.data.settings.auto = true;
  Store.save(state.data);

  speakCurrent();
  scheduleNext();
}

function scheduleNext() {
  if (!state.auto) return;
  const text = state.sutra.lines[Math.min(state.index, state.sutra.lines.length - 1)] || '';
  const isVoice = state.data.settings.voiceMode !== 'self' && state.data.settings.voice;
  const voicePad = isVoice ? 420 : 0;
  const wait = lineDuration(text) + voicePad;

  state.timer = setTimeout(() => {
    if (!state.auto) return;
    tapFish();
    if (state.finished) return;
  }, wait);
}

function stopAuto() {
  state.auto = false;
  if (el.chkAuto) el.chkAuto.checked = false;
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
  Audio.stopSpeech();
}

/* ================= CÔNG ĐỨC ================= */

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

/* ================= TIỆN ÍCH UI ================= */

let toastTimer = null;
function toast(msg) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
}

function openSheet() {
  el.sheet?.classList.remove('hidden');
  renderLevel();
}

function closeSheet() {
  el.sheet?.classList.add('hidden');
}

function fakeOnline() {
  let n = 120 + Math.floor(Math.random() * 30);
  if (el.onlineCount) el.onlineCount.textContent = n;
  setInterval(() => {
    n += Math.random() > 0.5 ? 1 : -1;
    n = Math.max(90, Math.min(220, n));
    if (el.onlineCount) el.onlineCount.textContent = n;
  }, 4800);
}

function registerSW() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  }
}

// Khởi chạy khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
