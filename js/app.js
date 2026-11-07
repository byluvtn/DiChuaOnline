import { SUTRAS, SUTRA_BY_ID, levelOf, syllables } from './kinh.js';
import { initScene, setPlayerAvatar, meditateNearest, createCharacterPreview, setAura, setChantingState, teleportTo, setJoystickMove, spawnLantern, releaseSkyLantern, getSkyLanternStats, LOCATIONS, onZoneChange, setNpcsVisible, captureScene, getMinimapScene, getMinimapFrame } from './scene.js';
import { initMinimap, setMinimapScene, setMinimapEnabled, drawMinimap } from './minimap.js';
// Đặt tên riêng: app.js đã có openSheet()/closeSheet() cho sheet Cài đặt (el.sheet)
import { openSheet as openBottomSheet, closeSheet as closeBottomSheet, initSheet } from './sheets.js';
import { SAMPLE_WISHES, CHAT_MESSAGES } from './mock-data.js';
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
  btnCollapsePrayer: $('btnCollapsePrayer'),

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
  joystickKnob: $('joystickStick') || $('joystickKnob'),

  // A1 — gợi ý công đức còn lại tới cấp kế
  xpNext: $('xpNext'),

  // A2 — bộ đếm tiếng mõ hôm nay
  tapCounter: $('tapCounter'),
  tapCount: $('tapCount'),
  tapGoal: $('tapGoal'),

  // A3 — nhiệm vụ ngày
  questModal: $('questModal'),
  btnOpenQuest: $('btnOpenQuest'),
  btnCloseQuest: $('btnCloseQuest'),
  questList: $('questList'),
  questDate: $('questDate'),
  questClaimArea: $('questClaimArea'),
  btnClaimQuest: $('btnClaimQuest'),

  // A7 — màn hình cách chơi
  btnHowToPlay: $('btnHowToPlay'),
  howToPlayModal: $('howToPlayModal'),
  btnCloseHowToPlay: $('btnCloseHowToPlay'),
  btnHowToPlayDone: $('btnHowToPlayDone'),

  // A14 — ẩn NPC để giảm lag
  chkHideNpc: $('chkHideNpc'),

  // A4 — tràng hạt 108 hạt
  beadModal: $('beadModal'),
  beadTrack: $('beadTrack'),
  beadCount: $('beadCount'),
  beadTotal: $('beadTotal'),
  beadHint: $('beadHint'),
  btnOpenBead: $('btnOpenBead'),
  btnCloseBead: $('btnCloseBead'),
  btnNextBead: $('btnNextBead'),
  btnResetBead: $('btnResetBead'),

  // A5 — dâng lễ tại Chánh Điện
  offeringModal: $('offeringModal'),
  offeringList: $('offeringList'),
  offeringHint: $('offeringHint'),
  offeringCount: $('offeringCount'),
  offeringLimit: $('offeringLimit'),
  btnOpenOffering: $('btnOpenOffering'),
  btnCloseOffering: $('btnCloseOffering'),
  btnSubmitOffering: $('btnSubmitOffering'),
  btnClearOffering: $('btnClearOffering'),

  // A6 — xin xăm
  fortuneModal: $('fortuneModal'),
  fortuneTube: $('fortuneTube'),
  fortuneResult: $('fortuneResult'),
  fortuneNo: $('fortuneNo'),
  fortuneName: $('fortuneName'),
  fortuneLevel: $('fortuneLevel'),
  fortuneText: $('fortuneText'),
  fortuneAdvice: $('fortuneAdvice'),
  fortuneHint: $('fortuneHint'),
  btnOpenFortune: $('btnOpenFortune'),
  btnCloseFortune: $('btnCloseFortune'),
  btnDrawFortune: $('btnDrawFortune'),

  // A8 — chụp ảnh khuôn viên
  shotModal: $('shotModal'),
  shotPreview: $('shotPreview'),
  shotHint: $('shotHint'),
  btnCaptureShot: $('btnCaptureShot'),
  btnCloseShot: $('btnCloseShot'),
  btnTakeShot: $('btnTakeShot'),
  btnShareShot: $('btnShareShot'),

  // A9 — cài vào màn hình chính
  installItem: $('installItem'),
  installHint: $('installHint'),
  btnInstallApp: $('btnInstallApp'),

  // A10 — bản đồ chùa
  mapModal: $('mapModal'),
  mapCanvas: $('mapCanvas'),
  mapLegend: $('mapLegend'),
  btnOpenMap: $('btnOpenMap'),
  btnCloseMap: $('btnCloseMap'),

  // A10b — minimap tròn góc trên trái
  minimapHud: $('minimapHud'),
  minimapCanvas: $('minimapCanvas'),
  minimapLabel: $('minimapLabel'),
  btnMinimap: $('btnMinimap')
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

/* ================= HẰNG SỐ NGÀY & NHIỆM VỤ (A2, A3) ================= */

/** Mục tiêu gõ mõ mỗi ngày. */
const TAP_GOAL = 30;

/** Số hạt trên một vòng tràng. */
const BEAD_TOTAL = 108;

/** Công đức thưởng khi lần trọn một vòng 108 hạt. */
const BEAD_BONUS = 20;

/** A5 — các lễ vật có thể dâng tại Chánh Điện. */
const OFFERINGS = [
  { id: 'flower', label: 'Hoa sen', emoji: '🪷', merit: 6 },
  { id: 'incense', label: 'Nhang trầm', emoji: '🕯️', merit: 5 },
  { id: 'fruit', label: 'Trái ngọt', emoji: '🍊', merit: 4 },
  { id: 'tea', label: 'Trà thơm', emoji: '🍵', merit: 4 },
  { id: 'water', label: 'Nước tịnh', emoji: '💧', merit: 3 }
];

/** A5 — số lần dâng lễ tối đa mỗi ngày. */
const OFFERING_LIMIT = 3;

/** A5 — lễ vật đang được chọn trong phiên mở bảng. */
const offeringPick = new Set();

/** Khoá ngày theo giờ máy, cùng định dạng với storage.js. */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ba nhiệm vụ ngày; tiến độ đọc trực tiếp từ dữ liệu đã lưu. */
const DAILY_QUESTS = [
  {
    id: 'tap',
    name: `Gõ mõ ${TAP_GOAL} tiếng`,
    goal: TAP_GOAL,
    progress: () => state.data.todayTaps || 0
  },
  {
    id: 'sutra',
    name: 'Tụng trọn một bài kinh',
    goal: 1,
    progress: () => state.data.quests.sutras || 0
  },
  {
    id: 'merit',
    name: 'Tích luỹ 100 công đức hôm nay',
    goal: 100,
    progress: () => state.data.todayMerit || 0
  }
];

/* ================= KHỞI ĐỘNG ================= */

function boot() {
  try {
    if (el.canvas) {
      initScene(el.canvas, state.data.settings.quality);
      setPlayerAvatar(state.data.avatar);
    }
  } catch (err) {
    console.warn('3D không khả dụng hoặc lỗi khởi tạo:', err);
  }

  buildTabs();
  selectSutra(state.data.lastSutra || 'dai-bi', false);
  state.lastLevel = levelOf(state.data.merit).level;

  renderPlayerInfo();
  renderLevel();
  renderTapCounter();
  renderQuests();
  renderBeads();
  renderOffering();
  renderFortune();
  bindUI();
  setupVirtualJoystick();
  setupMinimap();
  registerSW();
  renderConnectionStatus();
  renderWishList();
  applySettingsToUI();
  renderInstallUI();

  // A7 — người dùng mới: mở bảng cách chơi một lần
  if (!state.data.settings.seenHowToPlay) {
    setTimeout(() => el.howToPlayModal?.classList.remove('hidden'), 900);
  }

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

  // A1 — còn bao nhiêu công đức nữa tới cấp kế tiếp
  if (el.xpNext) {
    if (lv.next) {
      el.xpNext.textContent =
        `Còn ${fmt(lv.toNext)} công đức nữa tới Cấp ${lv.next.level} · ${lv.next.name}`;
      el.xpNext.classList.remove('maxed');
    } else {
      el.xpNext.textContent = 'Đã đạt cấp cao nhất · Bồ Tát Đạo';
      el.xpNext.classList.add('maxed');
    }
  }

  renderPlayerInfo();
}

/* ================= A2: BỘ ĐẾM TIẾNG MÕ HÔM NAY ================= */

function renderTapCounter() {
  if (!el.tapCount) return;
  const taps = state.data.todayTaps || 0;
  el.tapCount.textContent = fmt(taps);
  if (el.tapGoal) el.tapGoal.textContent = fmt(TAP_GOAL);
  el.tapCounter?.classList.toggle('complete', taps >= TAP_GOAL);
}

/* ================= A3: NHIỆM VỤ NGÀY ================= */

/** Ghi nhận nhiệm vụ vừa xong, thông báo một lần cho mỗi nhiệm vụ. */
function syncQuests() {
  const q = state.data.quests;
  let changed = false;
  DAILY_QUESTS.forEach((quest) => {
    const done = (Number(quest.progress()) || 0) >= quest.goal;
    if (done && !q.done.includes(quest.id)) {
      q.done.push(quest.id);
      changed = true;
      toast(`✅ Hoàn thành nhiệm vụ: ${quest.name}`);
    }
  });
  if (changed) Store.save(state.data);
  return changed;
}

function renderQuests() {
  if (!el.questList) return;
  syncQuests();

  const q = state.data.quests;
  if (el.questDate) {
    el.questDate.textContent = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  el.questList.textContent = '';
  let allDone = true;

  DAILY_QUESTS.forEach((quest) => {
    const cur = Number(quest.progress()) || 0;
    const done = cur >= quest.goal;
    if (!done) allDone = false;

    const item = document.createElement('div');
    item.className = `quest-item${done ? ' done' : ''}`;

    const check = document.createElement('span');
    check.className = 'quest-check';
    check.textContent = done ? '✓' : '○';

    const body = document.createElement('div');
    body.className = 'quest-body';

    const name = document.createElement('div');
    name.className = 'quest-name';
    name.textContent = quest.name;

    const reward = document.createElement('div');
    reward.className = 'quest-reward';
    reward.textContent = done ? 'Hoàn thành' : 'Đang thực hiện';

    body.append(name, reward);

    const prog = document.createElement('span');
    prog.className = 'quest-progress';
    prog.textContent = `${fmt(Math.min(cur, quest.goal))}/${fmt(quest.goal)}`;

    item.append(check, body, prog);
    el.questList.appendChild(item);
  });

  const claimed = q.claimedDate === todayKey();
  if (el.questClaimArea) {
    el.questClaimArea.classList.toggle('hidden', !allDone || claimed);
  }
  if (el.btnClaimQuest) el.btnClaimQuest.disabled = claimed;
}

function openQuestModal() {
  renderQuests();
  el.questModal?.classList.remove('hidden');
}

function closeQuestModal() {
  el.questModal?.classList.add('hidden');
}

function claimQuestReward() {
  const q = state.data.quests;
  const t = todayKey();

  if (q.claimedDate === t) {
    toast('Hôm nay đã nhận thưởng hào quang rồi');
    return;
  }

  const allDone = DAILY_QUESTS.every((quest) => (Number(quest.progress()) || 0) >= quest.goal);
  if (!allDone) {
    toast('Cần hoàn thành tất cả nhiệm vụ trước');
    return;
  }

  q.claimedDate = t;
  Store.save(state.data);

  addMerit(50);
  Audio.chime();
  setAura(true);
  setTimeout(() => setAura(false), 4000);
  if (navigator.vibrate) navigator.vibrate([30, 80, 30, 80, 60]);

  renderQuests();
  toast('Nhận hào quang hôm nay · +50 công đức');
}

/* ================= A4: TRÀNG HẠT 108 HẠT ================= */

/** Dựng danh sách hạt một lần, sau đó chỉ cập nhật trạng thái từng hạt. */
function renderBeads() {
  if (!el.beadTrack) return;

  if (el.beadTrack.children.length !== BEAD_TOTAL) {
    el.beadTrack.textContent = '';
    for (let i = 0; i < BEAD_TOTAL; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'bead-dot';
      dot.dataset.index = String(i);
      dot.setAttribute('aria-label', `Hạt ${i + 1}`);
      el.beadTrack.appendChild(dot);
    }
  }

  const done = Math.min(state.data.beads || 0, BEAD_TOTAL);
  for (let i = 0; i < BEAD_TOTAL; i++) {
    const dot = el.beadTrack.children[i];
    dot.classList.toggle('done', i < done);
    dot.classList.toggle('next', i === done);
    dot.disabled = i > done;
  }

  if (el.beadCount) el.beadCount.textContent = fmt(done);
  if (el.beadTotal) el.beadTotal.textContent = fmt(BEAD_TOTAL);

  if (el.beadHint) {
    const finished = done >= BEAD_TOTAL;
    el.beadHint.textContent = finished
      ? 'Đã đủ 108 hạt · một vòng tràng hoàn mãn'
      : `Hạt kế tiếp: ${done + 1} / ${BEAD_TOTAL} · nhấn hạt sáng để lần`;
    el.beadHint.classList.toggle('complete', finished);
  }
}

/** Lần thêm một hạt: cộng công đức, và thưởng khi tròn vòng 108 hạt. */
function advanceBead() {
  const cur = state.data.beads || 0;
  if (cur >= BEAD_TOTAL) {
    toast('Tràng đã đủ 108 hạt · nhấn "Lần lại từ đầu" để tiếp tục');
    return;
  }

  state.data.beads = cur + 1;
  const complete = state.data.beads >= BEAD_TOTAL;

  // addMerit lưu một lần duy nhất, bao gồm cả số hạt vừa tăng
  addMerit(complete ? BEAD_BONUS : 1);
  renderBeads();

  if (!complete) return;

  state.data.beadRounds = (state.data.beadRounds || 0) + 1;
  Store.save(state.data);

  try { Audio.chime(); } catch (e) { /* audio có thể bị chặn */ }
  try { setAura(true); setTimeout(() => setAura(false), 3000); } catch (e) { /* bỏ qua */ }
  if (navigator.vibrate) navigator.vibrate([25, 60, 25]);

  toast(`Tròn một vòng 108 hạt · +${BEAD_BONUS} công đức (tổng ${state.data.beadRounds} vòng)`);

  // Giữ trạng thái đủ hạt trong giây lát rồi tự quay về đầu tràng
  setTimeout(() => {
    state.data.beads = 0;
    Store.save(state.data);
    renderBeads();
  }, 1100);
}

/** Quay tràng về hạt đầu tiên, không đụng tới số vòng đã hoàn thành. */
function resetBeads() {
  state.data.beads = 0;
  Store.save(state.data);
  renderBeads();
  toast('Đã lần lại tràng hạt từ đầu');
}

/* ================= A5: DÂNG LỄ TẠI CHÁNH ĐIỆN ================= */

/** Vẽ danh sách lễ vật, đồng bộ lựa chọn và hạn mức trong ngày. */
function renderOffering() {
  if (!el.offeringList) return;

  if (el.offeringList.children.length !== OFFERINGS.length) {
    el.offeringList.textContent = '';
    OFFERINGS.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'offering-item';
      btn.dataset.id = item.id;
      btn.setAttribute('aria-pressed', 'false');

      const emoji = document.createElement('span');
      emoji.className = 'offering-emoji';
      emoji.textContent = item.emoji;

      const label = document.createElement('span');
      label.textContent = item.label;

      const merit = document.createElement('span');
      merit.className = 'offering-merit';
      merit.textContent = `+${item.merit} công đức`;

      btn.append(emoji, label, merit);
      el.offeringList.appendChild(btn);
    });
  }

  const today = todayKey();
  if (!state.data.offerings || typeof state.data.offerings !== 'object') {
    state.data.offerings = { date: today, count: 0 };
  }
  if (state.data.offerings.date !== today) {
    state.data.offerings = { date: today, count: 0 };
  }

  Array.from(el.offeringList.children).forEach((btn) => {
    const picked = offeringPick.has(btn.dataset.id);
    btn.classList.toggle('picked', picked);
    btn.setAttribute('aria-pressed', picked ? 'true' : 'false');
  });

  const used = state.data.offerings.count || 0;
  const left = Math.max(OFFERING_LIMIT - used, 0);

  if (el.offeringCount) el.offeringCount.textContent = String(used);
  if (el.offeringLimit) el.offeringLimit.textContent = String(OFFERING_LIMIT);

  if (el.offeringHint) {
    if (left <= 0) {
      el.offeringHint.textContent = 'Hôm nay đã đủ 3 lần dâng lễ · tâm thành vẫn trọn';
    } else if (offeringPick.size === 0) {
      el.offeringHint.textContent = `Chọn lễ vật rồi nhấn Dâng lễ · còn ${left} lần hôm nay`;
    } else {
      el.offeringHint.textContent = `Đã chọn ${offeringPick.size} lễ vật · còn ${left} lần hôm nay`;
    }
  }

  if (el.btnSubmitOffering) el.btnSubmitOffering.disabled = left <= 0;
}

/** Bật/tắt một lễ vật trong danh sách chọn. */
function toggleOffering(id) {
  if (!id) return;
  if (offeringPick.has(id)) offeringPick.delete(id);
  else offeringPick.add(id);
  renderOffering();
}

/** Dâng các lễ vật đã chọn: cộng công đức, tăng hạn mức ngày. */
function submitOffering() {
  const used = state.data.offerings?.count || 0;
  if (used >= OFFERING_LIMIT) {
    toast('Hôm nay đã đủ 3 lần dâng lễ · ngày mai lại thành tâm');
    return;
  }
  if (offeringPick.size === 0) {
    toast('Hãy chọn ít nhất một lễ vật để dâng');
    return;
  }

  let merit = 0;
  const names = [];
  OFFERINGS.forEach((item) => {
    if (offeringPick.has(item.id)) {
      merit += item.merit;
      names.push(item.label);
    }
  });

  state.data.offerings.count = used + 1;
  addMerit(merit);

  offeringPick.clear();
  renderOffering();

  try { Audio.chime(); } catch (e) { /* audio có thể bị chặn */ }
  try { setAura(true); setTimeout(() => setAura(false), 2500); } catch (e) { /* bỏ qua */ }
  if (navigator.vibrate) navigator.vibrate(30);

  toast(`Dâng ${names.join(', ')} · +${merit} công đức`);
  el.offeringModal?.classList.add('hidden');
}

/** Bỏ toàn bộ lựa chọn hiện tại. */
function clearOffering() {
  offeringPick.clear();
  renderOffering();
}

/* ================= A6: XIN XĂM (RÚT QUẺ OFFLINE) ================= */

/** Mười hai quẻ, mỗi ngày rút một quẻ — hoàn toàn cục bộ, không cần mạng. */
const FORTUNES = [
  {
    id: 'sen-nang',
    name: 'Sen Nở Buổi Sớm',
    level: 'Đại cát',
    text: 'Mặt nước còn sương, đoá sen đã hé. Việc đang khó bỗng hanh thông, người đi xa sắp có tin về.',
    advice: 'Giữ tâm sáng, đừng vội khoe thành quả. Công việc nên bắt đầu từ việc nhỏ nhất.'
  },
  {
    id: 'chuong-ngan',
    name: 'Chuông Ngân Cuối Chiều',
    level: 'Cát',
    text: 'Tiếng chuông còn vọng, lòng người lắng lại. Điều phiền não đang tan dần nhưng cần thêm thời gian.',
    advice: 'Đừng quyết việc lớn hôm nay. Nghe nhiều hơn nói, và nên đi ngủ sớm.'
  },
  {
    id: 'tra-am',
    name: 'Ấm Trà Bên Hiên',
    level: 'Bình an',
    text: 'Trà còn ấm, khách chưa tới. Mọi sự đang ở mức vừa phải, không xấu cũng chưa rực rỡ.',
    advice: 'Một ngày bình thường là một ngày tốt. Dành mười phút lặng im cho chính mình.'
  },
  {
    id: 'trang-len',
    name: 'Trăng Lên Đầu Núi',
    level: 'Cát',
    text: 'Trăng chưa tròn nhưng đã đủ sáng soi đường. Việc đang tiến triển chậm mà chắc.',
    advice: 'Kiên nhẫn thêm một nhịp. Thành quả tới gần, chỉ đừng đổi hướng giữa đường.'
  },
  {
    id: 'gio-lang',
    name: 'Gió Lặng Sân Chùa',
    level: 'Bình an',
    text: 'Gió ngừng, lá rụng im. Không có biến động lớn, cũng đừng tự tạo sóng gió.',
    advice: 'Tránh tranh cãi vô ích. Việc gì chưa rõ thì hỏi thẳng, đừng đoán.'
  },
  {
    id: 'nang-u-am',
    name: 'Nắng Ấm Sau Mưa',
    level: 'Cát',
    text: 'Mưa vừa tạnh, đất còn ướt nhưng nắng đã lên. Khó khăn sắp qua, điều tốt đang tới.',
    advice: 'Đừng mang tâm trạng cũ vào việc mới. Dọn lại chỗ làm việc cho sạch sẽ.'
  },
  {
    id: 'den-song',
    name: 'Đèn Sông Trôi Nhẹ',
    level: 'Đại cát',
    text: 'Hoa đăng trôi êm, lời nguyện đã tới bờ. Việc cầu mong có người tiếp sức, không phải đi một mình.',
    advice: 'Hãy nói ra điều mình cần — hôm nay sẽ có người sẵn lòng giúp.'
  },
  {
    id: 'da-phang',
    name: 'Đá Phẳng Lối Mòn',
    level: 'Bình an',
    text: 'Đường mòn đã được lát lại, bước chân không còn vấp. Mọi thứ đang đúng nhịp.',
    advice: 'Giữ nếp sinh hoạt hiện tại. Đừng thay đổi nhiều thứ cùng một lúc.'
  },
  {
    id: 'hoa-rung',
    name: 'Hoa Rụng Trước Sân',
    level: 'Tiểu cát',
    text: 'Hoa nở rồi rụng, chuyện nhỏ đừng nặng lòng. Có chút hao tài hoặc mất thời gian vô ích.',
    advice: 'Kiểm tra lại tiền bạc và giấy tờ. Việc gì mất rồi thì để cho qua.'
  },
  {
    id: 'may-tan',
    name: 'Mây Tan Đỉnh Núi',
    level: 'Cát',
    text: 'Mây mờ tan dần, tầm nhìn rộng mở. Điều bấy lâu chưa hiểu hôm nay bỗng rõ.',
    advice: 'Hôm nay tốt để học điều mới hoặc nhìn lại một quyết định cũ.'
  },
  {
    id: 'gioi-hanh',
    name: 'Giới Hạnh Như Đất',
    level: 'Bình an',
    text: 'Đất dày nâng đỡ vạn vật, không tranh công. Giữ được nếp sống tốt là đã thắng một phần.',
    advice: 'Niệm Phật vài phút, giữ lời hôm nay cho trọn. Đừng hứa thêm điều gì.'
  },
  {
    id: 'thuyen-ve',
    name: 'Thuyền Về Bến Cũ',
    level: 'Đại cát',
    text: 'Thuyền qua bao sóng vẫn về đúng bến. Người xa trở lại, việc dở được làm tiếp.',
    advice: 'Hãy chủ động nhắn cho một người đã lâu không liên lạc.'
  }
];

/** Mã quẻ ổn định theo ngày: cùng một ngày luôn ra cùng một quẻ. */
function fortuneIndexForToday() {
  const key = todayKey();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return hash % FORTUNES.length;
}

/** Hiển thị quẻ của hôm nay nếu đã rút. */
function renderFortune() {
  if (!el.fortuneResult) return;

  const today = todayKey();
  const saved = state.data.fortune;
  const done = saved && saved.date === today && saved.id;
  const fortune = done ? FORTUNES.find((item) => item.id === saved.id) : null;

  if (!fortune) {
    el.fortuneResult.classList.add('hidden');
    if (el.fortuneHint) {
      el.fortuneHint.textContent = 'Nhấn "Rút quẻ" để xin một quẻ cho hôm nay';
    }
    if (el.btnDrawFortune) {
      el.btnDrawFortune.disabled = false;
      el.btnDrawFortune.textContent = 'Rút quẻ';
    }
    return;
  }

  if (el.fortuneNo) el.fortuneNo.textContent = String(FORTUNES.indexOf(fortune) + 1);
  if (el.fortuneName) el.fortuneName.textContent = fortune.name;
  if (el.fortuneLevel) el.fortuneLevel.textContent = fortune.level;
  if (el.fortuneText) el.fortuneText.textContent = fortune.text;
  if (el.fortuneAdvice) el.fortuneAdvice.textContent = fortune.advice;
  el.fortuneResult.classList.remove('hidden');
  if (el.fortuneHint) {
    el.fortuneHint.textContent = 'Hôm nay đã rút quẻ · mai lại xin quẻ mới';
  }
  if (el.btnDrawFortune) {
    el.btnDrawFortune.disabled = true;
    el.btnDrawFortune.textContent = 'Đã rút hôm nay';
  }
}

/** Rút quẻ cho hôm nay, có hiệu ứng lắc ống xăm ngắn. */
function drawFortune() {
  const today = todayKey();
  if (state.data.fortune && state.data.fortune.date === today && state.data.fortune.id) {
    toast('Hôm nay đã rút quẻ rồi · mai lại thành tâm');
    return;
  }

  const fortune = FORTUNES[fortuneIndexForToday()];

  if (el.fortuneResult) el.fortuneResult.classList.add('hidden');
  if (el.fortuneTube) {
    el.fortuneTube.classList.remove('shaking');
    // Buộc trình duyệt tính lại để chạy lại animation
    void el.fortuneTube.offsetWidth;
    el.fortuneTube.classList.add('shaking');
  }
  if (el.btnDrawFortune) el.btnDrawFortune.disabled = true;
  if (el.fortuneHint) el.fortuneHint.textContent = 'Đang lắc ống xăm...';

  try { Audio.hitWood(1); } catch (e) { /* bỏ qua nếu audio bị chặn */ }

  setTimeout(() => {
    state.data.fortune = { date: today, id: fortune.id };
    Store.save(state.data);

    renderFortune();

    try { Audio.chime(); } catch (e) { /* bỏ qua */ }
    try { setAura(true); setTimeout(() => setAura(false), 1800); } catch (e) { /* bỏ qua */ }
    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);

    toast(`Quẻ số ${FORTUNES.indexOf(fortune) + 1} · ${fortune.name}`);
  }, 620);
}

/* ================= A8: CHỤP ẢNH KHUÔN VIÊN ================= */

let shotDataUrl = '';

/** Đưa khung chụp ảnh về trạng thái chưa có ảnh. */
function renderShot() {
  shotDataUrl = '';
  if (el.shotPreview) el.shotPreview.removeAttribute('src');
  if (el.btnShareShot) el.btnShareShot.disabled = true;
  if (el.shotHint) el.shotHint.textContent = 'Nhấn "Chụp" để lưu lại khung cảnh hiện tại';
}

/** Chụp lại khung hình 3D hiện tại và hiển thị bản xem trước. */
function takeShot() {
  let dataUrl = null;
  try {
    dataUrl = captureScene();
  } catch (err) {
    console.warn('Không chụp được khuôn viên:', err);
  }

  if (!dataUrl) {
    if (el.shotHint) {
      el.shotHint.textContent = 'Chưa chụp được khung hình 3D. Hãy đợi khuôn viên tải xong rồi thử lại.';
    }
    return;
  }

  shotDataUrl = dataUrl;
  if (el.shotPreview) el.shotPreview.src = dataUrl;
  if (el.btnShareShot) el.btnShareShot.disabled = false;
  if (el.shotHint) {
    const now = new Date();
    const gio = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    el.shotHint.textContent = `Đã chụp lúc ${gio} · nhấn "Tải ảnh về" để lưu`;
  }

  try { Audio.hitWood(1); } catch (e) { /* bỏ qua nếu audio bị chặn */ }
  if (navigator.vibrate) navigator.vibrate(20);
}

/** Tải ảnh đã chụp xuống thiết bị dưới dạng tệp PNG. */
function downloadShot() {
  if (!shotDataUrl) return;

  try {
    const phan = shotDataUrl.split(',');
    const mime = (phan[0].match(/data:([^;]+)/) || [])[1] || 'image/png';
    const nhiPhan = atob(phan[1] || '');
    const bytes = new Uint8Array(nhiPhan.length);
    for (let i = 0; i < nhiPhan.length; i += 1) bytes[i] = nhiPhan.charCodeAt(i);

    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dau = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const gio = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `chua-vo-luong-${dau}-${gio}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Đã lưu ảnh khuôn viên chùa');
  } catch (err) {
    console.warn('Không tải được ảnh:', err);
    toast('Thiết bị chưa hỗ trợ tải ảnh');
  }
}

/** Mở bảng chụp ảnh và chụp ngay một khung hình. */
function openShotModal() {
  renderShot();
  el.shotModal?.classList.remove('hidden');
  takeShot();
}

/* ================= A9: CÀI VÀO MÀN HÌNH CHÍNH ================= */

/** Sự kiện beforeinstallprompt do trình duyệt phát ra, lưu lại để gọi sau. */
let installPrompt = null;

/** Trả về true nếu chùa đang chạy dưới dạng ứng dụng đã cài. */
function isAppInstalled() {
  if (window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return true;
  return navigator.standalone === true;
}

/** Trả về true nếu là thiết bị iOS (Safari không phát beforeinstallprompt). */
function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Cập nhật dòng "Cài vào màn hình chính" theo khả năng của trình duyệt. */
function renderInstallUI() {
  if (!el.installItem) return;

  // Đã cài rồi thì ẩn hẳn dòng này.
  if (isAppInstalled()) {
    el.installItem.classList.add('hidden');
    return;
  }
  el.installItem.classList.remove('hidden');

  if (installPrompt) {
    // Chrome / Edge / Brave: bấm nút để hiện hộp thoại cài đặt.
    if (el.installHint) el.installHint.textContent = 'Mở nhanh như ứng dụng, dùng được khi mất mạng';
    if (el.btnInstallApp) {
      el.btnInstallApp.classList.remove('hidden');
      el.btnInstallApp.disabled = false;
    }
    return;
  }

  if (isIOSDevice()) {
    // iOS: hướng dẫn thủ công, ẩn nút vì không gọi được.
    if (el.installHint) {
      el.installHint.textContent = 'Nhấn nút Chia sẻ của Safari → "Thêm vào MH chính"';
    }
    el.btnInstallApp?.classList.add('hidden');
    return;
  }

  // Trình duyệt không hỗ trợ: vẫn hiện hướng dẫn chung.
  if (el.installHint) el.installHint.textContent = 'Dùng menu trình duyệt → "Thêm vào màn hình chính"';
  el.btnInstallApp?.classList.add('hidden');
}

/** Gọi hộp thoại cài đặt của trình duyệt. */
async function promptInstall() {
  if (!installPrompt) {
    renderInstallUI();
    return;
  }
  try {
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') {
      toast('Đang cài chùa vào màn hình chính…');
    } else {
      toast('Bạn có thể cài lại bất cứ lúc nào trong Cài đặt');
    }
  } catch (err) {
    console.warn('Không gọi được hộp thoại cài đặt:', err);
    toast('Thiết bị chưa hỗ trợ cài trực tiếp');
  }
  // Mỗi sự kiện chỉ dùng được một lần.
  installPrompt = null;
  renderInstallUI();
}

/* ================= A10: BẢN ĐỒ CHÙA ================= */

/** Biểu tượng hiển thị cho từng địa điểm trên sơ đồ. */
const MAP_ICONS = {
  mainHall: '🏛️',
  meditation: '🧘',
  pond: '🪷',
  entrance: '⛩️',
  garden: '🌿',
  quanAm: '🌸',
  bellTower: '🔔'
};

/** Khung toạ độ bao trọn 7 địa điểm trong LOCATIONS. */
const MAP_BOUNDS = { minX: -28, maxX: 28, minZ: -37, maxZ: 26 };

/** Lề phần trăm để nhãn không bị cắt mép sơ đồ. */
const MAP_INSET = 10;

/** Đổi toạ độ thế giới (x, z) sang vị trí phần trăm trên sơ đồ 2D. */
function mapPercent(x, z) {
  const { minX, maxX, minZ, maxZ } = MAP_BOUNDS;
  const span = 100 - MAP_INSET * 2;
  return {
    left: MAP_INSET + ((x - minX) / (maxX - minX)) * span,
    // z âm là phía Chánh Điện nên đảo trục để Chánh Điện nằm trên cùng.
    top: MAP_INSET + ((maxZ - z) / (maxZ - minZ)) * span
  };
}

/** Vẽ lại sơ đồ và đánh dấu địa điểm đang đứng. */
function renderMap() {
  if (!el.mapCanvas) return;
  el.mapCanvas.replaceChildren();

  Object.entries(LOCATIONS).forEach(([key, loc]) => {
    const { left, top } = mapPercent(loc.x, loc.z);
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'map-node';
    node.dataset.loc = key;
    node.style.left = `${left}%`;
    node.style.top = `${top}%`;
    node.title = loc.desc || loc.name;

    const icon = document.createElement('span');
    icon.textContent = MAP_ICONS[key] || '📍';
    const label = document.createElement('b');
    label.textContent = loc.name;

    node.append(icon, label);
    if (key === state.currentZoneKey) node.classList.add('active');
    node.addEventListener('click', () => goToLocation(key));
    el.mapCanvas.appendChild(node);
  });

  if (el.mapLegend) {
    const here = LOCATIONS[state.currentZoneKey];
    el.mapLegend.textContent = here
      ? `Bạn đang ở: ${here.name}`
      : 'Chạm một địa điểm để được đưa tới đó';
  }
}

/** Đi tới một địa điểm từ bản đồ. */
function goToLocation(key) {
  const loc = LOCATIONS[key];
  if (!loc) return;
  closeMap();
  teleportTo(key);
  state.currentZoneKey = key;
  document.querySelectorAll('.nav-chip, .nav-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.loc === key);
  });
  toast(`Đã đến: ${loc.name}`);
}

function openMap() {
  renderMap();
  el.mapModal?.classList.remove('hidden');
}

function closeMap() {
  el.mapModal?.classList.add('hidden');
}

/* ============ A10b — MINIMAP TRÒN GÓC TRÊN TRÁI ============ */

/** Nhịp vẽ minimap: 12 fps là đủ mượt cho một bản đồ nhỏ, đỡ tốn pin. */
const MINIMAP_FPS = 12;
const MINIMAP_INTERVAL = 1000 / MINIMAP_FPS;

let minimapReady = false;
let minimapLastDraw = 0;
let minimapRaf = 0;
let minimapLabelKey = '';

/** Khởi tạo canvas minimap và nạp hình học tĩnh của khuôn viên một lần. */
function setupMinimap() {
  if (minimapReady || !el.minimapCanvas) return;
  const cssSize = el.minimapCanvas.clientWidth || 112;
  const api = initMinimap(el.minimapCanvas, cssSize);
  if (!api) return;

  let sceneData = null;
  try {
    sceneData = getMinimapScene();
  } catch (e) {
    console.warn('Không lấy được sơ đồ khuôn viên:', e);
  }
  if (!sceneData) return;

  setMinimapScene(sceneData);
  setMinimapEnabled(true);
  minimapReady = true;
  el.minimapHud?.classList.remove('hidden');
  el.minimapHud?.classList.add('ready');

  positionMinimapHud();

  // Vẽ ngay một khung để không thấy ô trống lúc mới vào
  drawMinimapFrame(performance.now());
  minimapRaf = requestAnimationFrame(minimapLoop);
}

/**
 * Đặt HUD minimap ngay dưới #quickNav.
 * #topbar dùng flex-wrap nên chiều cao thay đổi theo bề rộng màn hình —
 * không thể dùng một con số `top` cố định trong CSS.
 */
function positionMinimapHud() {
  const hud = el.minimapHud;
  const host = hud?.parentElement;
  if (!hud || !host || hud.classList.contains('hidden')) return;

  const nav = el.quickNav;
  const navRect = nav?.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  // `top` của phần tử absolute được tính từ padding box của #ui,
  // nên phải trừ đi padding-top (đã bao gồm safe-area) của #ui.
  const padTop = parseFloat(getComputedStyle(host).paddingTop) || 0;

  let base;
  if (navRect && navRect.height > 0) {
    base = navRect.bottom - hostRect.top - padTop;
  } else {
    base = (host.querySelector('#topbar')?.getBoundingClientRect().height || 60) + 30;
  }
  hud.style.top = `${Math.round(Math.max(base + 6, 60))}px`;
}

/** Vòng lặp riêng của minimap — tách khỏi vòng render 3D để không phụ thuộc scene. */
function minimapLoop(now) {
  minimapRaf = requestAnimationFrame(minimapLoop);
  if (document.hidden) return;
  if (now - minimapLastDraw < MINIMAP_INTERVAL) return;
  drawMinimapFrame(now);
}

/** Lấy vị trí người chơi + đại chúng rồi vẽ lại bản đồ nhỏ. */
function drawMinimapFrame(now) {
  if (!minimapReady) return;
  minimapLastDraw = now;

  let frame = null;
  try {
    frame = getMinimapFrame();
  } catch (e) {
    return;
  }
  if (!frame) return;

  drawMinimap(frame.player, frame.actors);
  syncMinimapLabel();
}

/** Đổi nhãn dưới minimap theo khu vực đang đứng. */
function syncMinimapLabel() {
  const key = state.currentZoneKey || 'entrance';
  if (key === minimapLabelKey) return;
  minimapLabelKey = key;
  const loc = LOCATIONS[key];
  if (el.minimapLabel) el.minimapLabel.textContent = loc ? loc.name : 'Sân Chùa';
}

/** Tạm dừng vòng vẽ khi tab bị ẩn để tiết kiệm pin. */
function pauseMinimap() {
  if (minimapRaf) cancelAnimationFrame(minimapRaf);
  minimapRaf = 0;
}

function resumeMinimap() {
  if (!minimapReady || minimapRaf) return;
  minimapLastDraw = 0;
  minimapRaf = requestAnimationFrame(minimapLoop);
}

/* ============ A11 — THU GỌN BẢNG TỤNG / PHÓNG TO CÁC BẢNG ============ */

/** Thu gọn hoặc mở rộng phần thân bảng tụng, giữ lại thanh tiêu đề. */
function applyPrayerCollapsed(collapsed, opts = {}) {
  const box = el.prayerSection;
  if (!box) return;
  const isCollapsed = !!collapsed;
  box.classList.toggle('collapsed', isCollapsed);
  if (el.btnCollapsePrayer) {
    el.btnCollapsePrayer.setAttribute('aria-expanded', String(!isCollapsed));
    el.btnCollapsePrayer.title = isCollapsed ? 'Mở rộng bảng tụng' : 'Thu gọn bảng tụng';
  }
  if (!opts.silent) {
    toast(isCollapsed ? 'Đã thu gọn bảng tụng kinh' : 'Đã mở rộng bảng tụng kinh');
  }
}

/** Bật/tắt phóng to cho một thẻ bảng. */
function toggleModalZoom(card) {
  if (!card) return;
  const zoomed = card.classList.toggle('is-zoomed');
  const btn = card.querySelector('.btn-zoom-modal');
  if (btn) {
    btn.title = zoomed ? 'Thu nhỏ bảng' : 'Phóng to bảng';
    btn.setAttribute('aria-pressed', String(zoomed));
    btn.setAttribute('aria-label', zoomed ? 'Thu nhỏ bảng' : 'Phóng to bảng');
  }
}

const ZOOMABLE_CARDS = [
  '.lantern-card', '.quest-card', '.howtoplay-card', '.bead-card',
  '.offering-card', '.fortune-card', '.shot-card', '.map-card'
].join(', ');

/** Gắn nút ⤢ vào thanh tiêu đề của mọi bảng có thể phóng to. */
function setupModalZoomButtons() {
  document.querySelectorAll('.card-header').forEach((header) => {
    if (header.querySelector('.btn-zoom-modal')) return;
    const card = header.closest(ZOOMABLE_CARDS);
    if (!card) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-zoom-modal';
    btn.textContent = '⤢';
    btn.title = 'Phóng to bảng';
    btn.setAttribute('aria-label', 'Phóng to bảng');
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModalZoom(card);
    });

    const closeBtn = header.querySelector('.btn-close-modal');
    if (closeBtn && closeBtn.parentElement === header) {
      let actions = header.querySelector('.modal-head-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'modal-head-actions';
        header.appendChild(actions);
      }
      actions.appendChild(btn);
      actions.appendChild(closeBtn);
    } else if (closeBtn) {
      closeBtn.parentNode.insertBefore(btn, closeBtn);
    } else {
      header.appendChild(btn);
    }
  });
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

  // Các nút HUD dùng lại luồng thao tác đang có.
  $('btnDockName')?.addEventListener('click', openNameModal);
  $('btnDockSettings')?.addEventListener('click', openSheet);
  let disposePreview = null;
  const closePreview = () => {
    $('characterModal')?.classList.add('hidden');
    disposePreview?.();
    disposePreview = null;
  };
  $('btnCharacter')?.addEventListener('click', () => {
    $('characterModal')?.classList.remove('hidden');
    if (!disposePreview) {
      try { disposePreview = createCharacterPreview($('characterPreview'), state.data.avatar); }
      catch (error) { toast('Thiết bị chưa hỗ trợ xem nhân vật 3D'); console.warn(error); }
    }
  });
  const avatarLabels = { chutieu: 'Chú tiểu · Áo cam', sunam: 'Sư nam · Áo nâu · Nón trúc', sunu: 'Sư nữ · Áo lam · Khăn xám' };
  const renderAvatarSelection = () => {
    document.querySelectorAll('[data-avatar]').forEach(button => {
      const active = button.dataset.avatar === state.data.avatar;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('characterLabel').textContent = avatarLabels[state.data.avatar];
  };
  renderAvatarSelection();
  document.querySelectorAll('[data-avatar]').forEach(button => {
    button.addEventListener('click', () => {
      state.data.avatar = button.dataset.avatar;
      Store.save(state.data);
      setPlayerAvatar(state.data.avatar);
      renderAvatarSelection();
      disposePreview?.(); disposePreview = null;
      try { disposePreview = createCharacterPreview($('characterPreview'), state.data.avatar); }
      catch (error) { console.warn(error); toast('Không thể mở xem trước 3D'); }
    });
  });
  $('btnMeditate')?.addEventListener('click', () => {
    meditateNearest(); toast('Đang đến đệm thiền gần nhất · Di chuyển để đứng dậy');
  });
  $('btnCloseCharacter')?.addEventListener('click', closePreview);
  $('characterModal')?.addEventListener('click', (event) => {
    if (event.target === $('characterModal')) closePreview();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePreview();
      closeBottomSheet(el.lanternModal);
      closeBottomSheet($('chatSheet'));
      el.prayerSection?.classList.add('hidden');
      el.questModal?.classList.add('hidden');
      el.howToPlayModal?.classList.add('hidden');
      el.beadModal?.classList.add('hidden');
      el.offeringModal?.classList.add('hidden');
      el.fortuneModal?.classList.add('hidden');
      el.shotModal?.classList.add('hidden');
      el.mapModal?.classList.add('hidden');
    }
  });
  document.querySelectorAll('[data-devotion]').forEach((button) => {
    button.addEventListener('click', () => {
      switch (button.dataset.devotion) {
        case 'pray':
          teleportTo('mainHall');
          setAura(1);
          Audio.chime();
          toast('Chắp tay hướng Phật · Nguyện thân tâm an lạc');
          break;
        case 'sutra': el.btnTogglePrayer?.click(); break;
        case 'fish': tapFish(); break;
        case 'bell': teleportTo('bellTower'); Audio.ringBell(); break;
        case 'lantern': openLanternModal(); break;
        case 'quanAm': teleportTo('quanAm'); Audio.chime(); break;
      }
    });
  });

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

  // A11 — Thu gọn / mở rộng phần thân bảng tụng (giữ thanh tiêu đề)
  el.btnCollapsePrayer?.addEventListener('click', (e) => {
    e.stopPropagation();
    const box = el.prayerSection;
    if (!box) return;
    if (box.classList.contains('hidden')) {
      box.classList.remove('hidden');
      el.btnTogglePrayer?.classList.add('highlight');
    }
    const next = !box.classList.contains('collapsed');
    applyPrayerCollapsed(next);
    state.data.settings.collapsePrayer = next;
    Store.save(state.data);
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
  el.btnCloseLantern?.addEventListener('click', () => closeBottomSheet(el.lanternModal));
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
    onZoneChange(handleZoneChange);
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
  ($('btnCloseSettings') || $('btnCloseSheet'))?.addEventListener('click', closeSheet);
  $('btnCloseSettings')?.addEventListener('click', closeSheet);
  el.sheet?.addEventListener('click', (e) => {
    if (e.target === el.sheet) closeSheet();
  });

  // A9 — cài vào màn hình chính
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    renderInstallUI();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    renderInstallUI();
    toast('Đã cài chùa vào màn hình chính');
  });
  el.btnInstallApp?.addEventListener('click', promptInstall);

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
    renderWishList();
    toast('Đã hoàn lại trạng thái ban đầu');
  });

  // A3 — Bảng nhiệm vụ ngày
  el.btnOpenQuest?.addEventListener('click', openQuestModal);
  el.btnCloseQuest?.addEventListener('click', closeQuestModal);
  el.btnClaimQuest?.addEventListener('click', claimQuestReward);
  el.questModal?.addEventListener('click', (e) => {
    if (e.target === el.questModal) closeQuestModal();
  });

  // A7 — Màn hình cách chơi
  const closeHowToPlay = () => {
    el.howToPlayModal?.classList.add('hidden');
    if (!state.data.settings.seenHowToPlay) {
      state.data.settings.seenHowToPlay = true;
      Store.save(state.data);
    }
  };
  el.btnHowToPlay?.addEventListener('click', () => el.howToPlayModal?.classList.remove('hidden'));
  el.btnCloseHowToPlay?.addEventListener('click', closeHowToPlay);
  el.btnHowToPlayDone?.addEventListener('click', closeHowToPlay);
  el.howToPlayModal?.addEventListener('click', (e) => {
    if (e.target === el.howToPlayModal) closeHowToPlay();
  });

  // A14 — Ẩn NPC để giảm lag trên máy yếu
  el.chkHideNpc?.addEventListener('change', () => {
    const hide = !!el.chkHideNpc.checked;
    state.data.settings.hideNpc = hide;
    Store.save(state.data);
    setNpcsVisible(!hide);
    toast(hide ? 'Đã ẩn khách viếng thăm · giảm lag' : 'Đã hiện lại khách viếng thăm');
  });

  // A4 — Tràng hạt 108 hạt
  el.btnOpenBead?.addEventListener('click', () => {
    renderBeads();
    el.beadModal?.classList.remove('hidden');
  });
  el.btnCloseBead?.addEventListener('click', () => {
    el.beadModal?.classList.add('hidden');
  });
  el.beadModal?.addEventListener('click', (e) => {
    if (e.target === el.beadModal) el.beadModal.classList.add('hidden');
  });
  el.btnNextBead?.addEventListener('click', advanceBead);
  el.btnResetBead?.addEventListener('click', resetBeads);

  // Nhấn trực tiếp lên hạt đang sáng cũng lần được một hạt
  el.beadTrack?.addEventListener('click', (e) => {
    const dot = e.target.closest('.bead-dot');
    if (!dot || dot.disabled) return;
    advanceBead();
  });

  // A5 — Dâng lễ tại Chánh Điện
  el.btnOpenOffering?.addEventListener('click', () => {
    renderOffering();
    el.offeringModal?.classList.remove('hidden');
  });
  el.btnCloseOffering?.addEventListener('click', () => {
    el.offeringModal?.classList.add('hidden');
  });
  el.offeringModal?.addEventListener('click', (e) => {
    if (e.target === el.offeringModal) el.offeringModal.classList.add('hidden');
  });
  el.btnSubmitOffering?.addEventListener('click', submitOffering);
  el.btnClearOffering?.addEventListener('click', clearOffering);

  // Nhấn vào lễ vật để chọn / bỏ chọn
  el.offeringList?.addEventListener('click', (e) => {
    const item = e.target.closest('.offering-item');
    if (!item || !item.dataset.id) return;
    toggleOffering(item.dataset.id);
  });

  // A6 — Xin xăm (rút quẻ offline)
  el.btnOpenFortune?.addEventListener('click', () => {
    renderFortune();
    el.fortuneModal?.classList.remove('hidden');
  });
  el.btnCloseFortune?.addEventListener('click', () => {
    el.fortuneModal?.classList.add('hidden');
  });
  el.fortuneModal?.addEventListener('click', (e) => {
    if (e.target === el.fortuneModal) el.fortuneModal.classList.add('hidden');
  });
  el.btnDrawFortune?.addEventListener('click', drawFortune);

  // A8 — Chụp ảnh khuôn viên
  el.btnCaptureShot?.addEventListener('click', openShotModal);
  el.btnCloseShot?.addEventListener('click', () => {
    el.shotModal?.classList.add('hidden');
  });
  el.shotModal?.addEventListener('click', (e) => {
    if (e.target === el.shotModal) el.shotModal.classList.add('hidden');
  });
  el.btnTakeShot?.addEventListener('click', takeShot);
  el.btnShareShot?.addEventListener('click', downloadShot);

  // A10 — Bản đồ chùa
  el.btnOpenMap?.addEventListener('click', openMap);
  el.btnCloseMap?.addEventListener('click', closeMap);
  el.mapModal?.addEventListener('click', (e) => {
    if (e.target === el.mapModal) closeMap();
  });

  // A10b — bấm vòng minimap để mở bản đồ lớn
  el.btnMinimap?.addEventListener('click', openMap);

  // A10b — #topbar/#quickNav đổi chiều cao khi đổi bề rộng hoặc xoay máy,
  // nên phải đo lại vị trí HUD minimap thay vì dựa vào `top` cố định.
  let minimapRepositionPending = false;
  const scheduleMinimapReposition = () => {
    if (minimapRepositionPending) return;
    minimapRepositionPending = true;
    requestAnimationFrame(() => {
      minimapRepositionPending = false;
      positionMinimapHud();
    });
  };
  window.addEventListener('resize', scheduleMinimapReposition);
  window.addEventListener('orientationchange', scheduleMinimapReposition);
  if (el.quickNav && typeof ResizeObserver === 'function') {
    new ResizeObserver(scheduleMinimapReposition).observe(el.quickNav);
  }

  // A11 — Gắn nút phóng to ⤢ cho tất cả các bảng
  setupModalZoomButtons();

  // Phím tắt bàn phím
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (document.activeElement && /INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      tapFish();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAuto();
      pauseMinimap();
    } else {
      resumeMinimap();
    }
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
  if (el.chkHideNpc) el.chkHideNpc.checked = !!s.hideNpc;
  state.auto = s.auto;
  Audio.setSpeechEnabled(s.voice);
  // A14 — áp dụng ẩn NPC ngay khi khởi động
  try { setNpcsVisible(!s.hideNpc); } catch (e) { console.warn(e); }
  // A11 — khôi phục trạng thái thu gọn bảng tụng
  applyPrayerCollapsed(!!s.collapsePrayer, { silent: true });
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
    if (el.zoneDesc) el.zoneDesc.textContent = 'Điện Phật trang nghiêm, thành tâm dâng lễ vật lên Tam Bảo.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Dâng lễ';
  } else if (key === 'quanAm' || key === 'quanam') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Lắng nghe hạnh nguyện từ bi cứu khổ cứu nạn.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Thắp hương';
  } else if (key === 'bellTower' || key === 'thapchuong') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Tiếng chuông thanh tịnh xua tan phiền não.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Thỉnh chuông';
  } else if (key === 'pond' || key === 'hosen') {
    if (el.zoneDesc) el.zoneDesc.textContent = 'Hoa sen toả hương ngát, nơi thả hoa đăng cầu bình an.';
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Thả đèn nguyện';
  } else if (key === 'meditation' || key === 'garden') {
    if (el.zoneDesc) el.zoneDesc.textContent = zone.desc;
    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Ngồi thiền';
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
  if (k === 'meditation' || k === 'garden') {
    meditateNearest();
    toast('Đang đến đệm thiền · Dùng phím di chuyển để đứng dậy');
  } else if (k === 'bellTower' || k === 'thapchuong') {
    Audio.ringBell();
    addMerit(5);
    toast('Thỉnh Đại Hồng Chung · Công đức vô lượng');
  } else if (k === 'pond' || k === 'hosen') {
    openLanternModal();
  } else if (k === 'mainHall' || k === 'chanhdien') {
    if (el.prayerSection) el.prayerSection.classList.remove('hidden');
    if (el.btnTogglePrayer) el.btnTogglePrayer.classList.add('highlight');
    Audio.chime();
    renderOffering();
    el.offeringModal?.classList.remove('hidden');
    toast('Đang quỳ tại Chánh Điện · Chọn lễ vật dâng lên Tam Bảo');
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
  renderSampleWishes();
  openBottomSheet(el.lanternModal);
}

function renderWishList() {
  const wishes = state.data.wishes || [];
  if (el.lanternCount) el.lanternCount.textContent = `${wishes.length} lời nguyện · lưu trên thiết bị này`;

  const frag = document.createDocumentFragment();
  wishes.forEach((w) => {
    const item = document.createElement('div');
    item.className = 'wish-item';
    const author = document.createElement('div');
    author.className = 'wish-author';
    const name = document.createElement('span');
    name.className = 'author-name';
    name.textContent = w.name || 'Phật tử';
    const time = document.createElement('span');
    time.className = 'wish-time';
    time.textContent = w.time || 'Đã lưu';
    author.append(name, time);
    const text = document.createElement('div');
    text.className = 'wish-text';
    text.textContent = w.text;
    item.append(author, text);
    frag.appendChild(item);
  });

  if (wishes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-wishes';
    empty.textContent = '🪷 Chưa có lời nguyện trên thiết bị này. Gửi một lời chúc bình an để thắp sáng hồ sen.';
    frag.appendChild(empty);
  }
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

  // Chặng 4 (Prompt 4): đóng sheet và thả một chiếc đèn bay LÊN trong scene.
  // Đèn hoa đăng trên hồ sen (spawnLantern) vẫn được dựng lại từ lời nguyện đã lưu khi mở app.
  releaseSkyLantern(text);
  closeBottomSheet(el.lanternModal);

  // Hiệu ứng công đức & âm thanh
  addMerit(15);
  Audio.chime();
  toast('Đã thả đèn và lưu trên máy · Chưa gửi tới cộng đồng');

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
  zone.addEventListener('lostpointercapture', () => onEnd());
  window.addEventListener('blur', onEnd);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onEnd();
  });

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

  // A2 — đếm tiếng mõ trong ngày (tăng trước để addMerit lưu một lần duy nhất)
  state.data.todayTaps = (state.data.todayTaps || 0) + 1;
  renderTapCounter();

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
  // A3 — ghi nhận nhiệm vụ "tụng trọn một bài kinh"
  state.data.quests.sutras = (state.data.quests.sutras || 0) + 1;
  Store.save(state.data);
  renderQuests();

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

  // A3 — cập nhật tiến độ nhiệm vụ; chỉ vẽ lại danh sách khi bảng đang mở
  syncQuests();
  if (el.questModal && !el.questModal.classList.contains('hidden')) renderQuests();

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

function renderConnectionStatus() {
  if (el.onlineCount) el.onlineCount.textContent = '—';
  const label = $('onlineStatus');
  if (label) label.textContent = 'Chưa kết nối dữ liệu online';
  el.onlineCount?.parentElement?.setAttribute('title',
    'Chưa có API được xác minh từ chuaonline.org. Không sử dụng số người online giả lập.');
}

function registerSW() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // Chỉ tải lại khi nâng cấp worker đang điều khiển trang, không lặp ở lần cài đầu.
    const wasControlled = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (wasControlled && !reloading) {
        reloading = true;
        location.reload();
      }
    });
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Không thể cập nhật chế độ offline', error));
  }
}

// Khởi chạy khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}


// ===== STAGE 1: BottomNav + Thêm sheet =====
(() => {
  const byId = (id) => document.getElementById(id);
  const nav = byId('bottomNav');
  const sheet = byId('moreSheet');
  const go = {
    yard: () => document.querySelector('.nav-chip[data-loc="entrance"]')?.click(),
    meditate: () => byId('btnMeditate')?.click(),
    lephat: () => document.querySelector('[data-devotion="pray"]')?.click(),
    kinh: () => openKinhScreen(),
    profile: () => byId('btnCharacter')?.click(),
  };
  nav?.querySelectorAll('button[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      go[btn.dataset.nav]?.();
      if (btn.dataset.nav !== 'lephat') {
        nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      }
    });
  });
  byId('btnMore')?.addEventListener('click', () => sheet?.classList.remove('hidden'));
  byId('btnCloseMore')?.addEventListener('click', () => sheet?.classList.add('hidden'));
  sheet?.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.classList.add('hidden');
  });
})();

// ===== STAGE 4: Đèn nguyện cộng đồng + Chat rút gọn (DESIGN.md mục 7.3, 7.4) =====
const likedWishes = new Set();

function renderSampleWishes() {
  const list = document.getElementById('sampleWishList');
  if (!list) return;

  list.textContent = '';

  SAMPLE_WISHES.forEach((wish) => {
    const item = document.createElement('div');
    item.className = 'wish-item';

    const author = document.createElement('div');
    author.className = 'wish-author';

    const name = document.createElement('span');
    name.className = 'author-name';
    name.textContent = wish.name;

    const time = document.createElement('span');
    time.className = 'wish-time';
    time.textContent = wish.time;

    author.appendChild(name);
    author.appendChild(time);

    const text = document.createElement('div');
    text.className = 'wish-text';
    text.textContent = wish.text;

    const footer = document.createElement('div');
    footer.className = 'wish-footer';

    const spacer = document.createElement('span');

    const likeBtn = document.createElement('button');
    likeBtn.type = 'button';
    likeBtn.className = 'wish-likes';
    likeBtn.setAttribute('aria-pressed', 'false');
    likeBtn.setAttribute('aria-label', `Đồng cảm với điều nguyện của ${wish.name}`);
    likeBtn.textContent = `♡ ${wish.hearts}`;

    let displayCount = wish.hearts;
    likeBtn.addEventListener('click', () => {
      const liked = likedWishes.has(wish.id);
      if (liked) {
        likedWishes.delete(wish.id);
        displayCount -= 1;
        likeBtn.textContent = `♡ ${displayCount}`;
        likeBtn.classList.remove('liked');
        likeBtn.setAttribute('aria-pressed', 'false');
      } else {
        likedWishes.add(wish.id);
        displayCount += 1;
        likeBtn.textContent = `♥ ${displayCount}`;
        likeBtn.classList.add('liked');
        likeBtn.setAttribute('aria-pressed', 'true');
      }
    });

    footer.appendChild(spacer);
    footer.appendChild(likeBtn);

    item.appendChild(author);
    item.appendChild(text);
    item.appendChild(footer);

    list.appendChild(item);
  });
}

/* ===== Trò chuyện cộng đồng ===== */

const chatState = { messages: [...CHAT_MESSAGES] };

function chatLineText(m) {
  const span = document.createElement('span');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'chat-line-name';
  nameSpan.textContent = `${m.name}: `;
  span.appendChild(nameSpan);
  span.appendChild(document.createTextNode(m.text));
  return span;
}

function renderChatLine() {
  const items = document.querySelectorAll('#chatLine .chat-line-item');
  const recent = chatState.messages.slice(-2).reverse(); // mới nhất đứng đầu
  items.forEach((el, index) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    const message = recent[index];
    if (message) el.appendChild(chatLineText(message));
  });
}

function renderChatList() {
  const list = document.getElementById('chatList');
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);
  chatState.messages.forEach((message) => {
    const row = document.createElement('div');
    row.className = 'chat-msg';

    const name = document.createElement('span');
    name.className = 'chat-name';
    name.textContent = message.name;

    const time = document.createElement('span');
    time.className = 'chat-time';
    time.textContent = message.time;

    row.appendChild(name);
    row.appendChild(document.createTextNode(message.text));
    row.appendChild(time);
    list.appendChild(row);
  });
  list.scrollTop = list.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('inpChatText');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const playerName =
    (typeof state !== 'undefined' && state.data && state.data.playerName) || 'Quảng Hạnh 55';

  chatState.messages.push({ name: playerName, text, time: 'Vừa xong' });
  input.value = '';
  renderChatList();
  renderChatLine();
  input.focus();
}

function initChat() {
  const sheet = document.getElementById('chatSheet');
  const line = document.getElementById('chatLine');
  const sendBtn = document.getElementById('btnSendChat');
  const input = document.getElementById('inpChatText');

  if (sheet) initSheet(sheet);
  if (line && sheet) line.addEventListener('click', () => openBottomSheet(sheet));
  if (sendBtn) sendBtn.addEventListener('click', sendChat);
  if (input) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendChat();
      }
    });
  }

  renderChatLine();
  renderChatList();
}

// Gắn hành vi BottomSheet dùng chung + khởi tạo chat (module deferred: DOM đã sẵn)
(() => {
  initSheet(el.lanternModal);
  renderSampleWishes();
  initChat();
})();

// ===== STAGE 5: Màn Tụng Kinh + player bottom sheet (DESIGN.md mục 3, 5, 7) =====
// Tái sử dụng bộ máy tụng hiện hữu (selectSutra/startAuto/stopAuto) và
// setChantingState của scene.js — không tạo hệ tụng song song.
const KINH_CATALOG = [
  { id: 'dai-bi', duration: '05:30', chanters: 1284 },
  { id: 'a-di-da', duration: '02:30', chanters: 867 },
  { id: 'pho-mon', duration: '02:40', chanters: 942 },
  { id: 'bat-nha', duration: '03:00', chanters: 1156 }
];

const kinhPlayer = {
  playing: false,
  elapsedBefore: 0,
  startedAt: 0,
  tick: null,
  lastIndex: -1,
  lastFinished: false
};

function fmtKinhTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function kinhElapsedSeconds() {
  return kinhPlayer.elapsedBefore + (kinhPlayer.playing && kinhPlayer.startedAt
    ? (Date.now() - kinhPlayer.startedAt) / 1000
    : 0);
}

function renderKinhList() {
  const list = document.getElementById('kinhList');
  if (!list) return;
  list.textContent = '';

  KINH_CATALOG.forEach((entry) => {
    const sutra = SUTRA_BY_ID[entry.id];
    if (!sutra) return;

    const card = document.createElement('article');
    card.className = 'kinh-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Mở máy tụng ${sutra.name}`);

    const main = document.createElement('div');
    main.className = 'kinh-card-main';

    const title = document.createElement('h3');
    title.textContent = sutra.name;

    const sub = document.createElement('p');
    sub.className = 'kinh-card-sub';
    sub.textContent = sutra.subtitle;

    const meta = document.createElement('div');
    meta.className = 'kinh-card-meta';

    const duration = document.createElement('span');
    duration.textContent = `⏱ ${entry.duration}`;

    const chanters = document.createElement('span');
    chanters.textContent = `👥 ${fmt(entry.chanters)} người đang tụng`;

    meta.append(duration, chanters);
    main.append(title, sub, meta);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'kinh-card-action' + (state.sutra.id === entry.id ? ' active' : '');
    action.textContent = 'Tụng';
    action.setAttribute('aria-label', `Tụng ${sutra.name}`);
    action.addEventListener('click', (event) => {
      event.stopPropagation();
      openKinhPlayer(entry.id);
    });

    card.append(main, action);
    card.addEventListener('click', () => openKinhPlayer(entry.id));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openKinhPlayer(entry.id);
      }
    });

    list.appendChild(card);
  });
}

function openKinhScreen() {
  const screen = document.getElementById('kinhScreen');
  if (!screen) return;
  el.prayerSection?.classList.add('hidden');
  el.btnTogglePrayer?.classList.remove('highlight');
  renderKinhList();
  screen.classList.remove('hidden');
  screen.scrollTop = 0;
}

function closeKinhScreen() {
  document.getElementById('kinhScreen')?.classList.add('hidden');
}

function renderKinhPlayerText() {
  const box = document.getElementById('kinhPlayerText');
  const title = document.getElementById('kinhPlayerTitle');
  const sub = document.getElementById('kinhPlayerSub');
  if (!box || !state.sutra) return;

  if (title) title.textContent = state.sutra.name;
  if (sub) sub.textContent = state.sutra.intro || state.sutra.subtitle || '';

  box.textContent = '';
  state.sutra.lines.forEach((line, idx) => {
    const p = document.createElement('p');
    p.className = 'kinh-line' + (!state.finished && idx === state.index ? ' now' : '');
    p.textContent = line;
    box.appendChild(p);
  });

  if (state.finished) {
    const done = document.createElement('p');
    done.className = 'kinh-line now';
    done.textContent = 'A Di Đà Phật · Hồi hướng công đức';
    box.appendChild(done);
  }

  kinhPlayer.lastIndex = state.index;
  kinhPlayer.lastFinished = state.finished;

  requestAnimationFrame(() => {
    const active = box.querySelector('.kinh-line.now');
    if (active) {
      box.scrollTo({
        top: Math.max(0, active.offsetTop - box.clientHeight / 2 + active.clientHeight / 2),
        behavior: 'smooth'
      });
    }
  });
}

function syncKinhPlayer() {
  const timer = document.getElementById('kinhTimer');
  if (timer) {
    timer.textContent = `⏱ ${fmtKinhTime(kinhElapsedSeconds())}`;
    timer.classList.toggle('highlight', kinhPlayer.playing);
  }

  const sheet = document.getElementById('kinhPlayerSheet');
  if (!sheet || sheet.classList.contains('hidden')) return;
  if (kinhPlayer.lastIndex !== state.index || kinhPlayer.lastFinished !== state.finished) {
    renderKinhPlayerText();
  }
}

function updateKinhPlayButton() {
  const btn = document.getElementById('btnKinhPlay');
  if (!btn) return;
  btn.textContent = kinhPlayer.playing ? '⏸' : '▶';
  btn.setAttribute('aria-pressed', String(kinhPlayer.playing));
}

function stopKinhTicker(keepElapsed = true) {
  if (kinhPlayer.tick) clearInterval(kinhPlayer.tick);
  kinhPlayer.tick = null;
  if (keepElapsed && kinhPlayer.startedAt) {
    kinhPlayer.elapsedBefore += (Date.now() - kinhPlayer.startedAt) / 1000;
  }
  kinhPlayer.startedAt = 0;
  syncKinhPlayer();
}

function startKinhTicker() {
  stopKinhTicker(false);
  kinhPlayer.startedAt = Date.now();
  kinhPlayer.tick = setInterval(syncKinhPlayer, 250);
  syncKinhPlayer();
}

function pauseKinh() {
  const wasPlaying = kinhPlayer.playing || state.auto;
  if (state.auto) stopAuto();
  kinhPlayer.playing = false;
  try { setChantingState(false); } catch (e) { /* scene chưa sẵn sàng */ }
  stopKinhTicker(true);
  updateKinhPlayButton();
  return wasPlaying;
}

function toggleKinhPlay() {
  if (kinhPlayer.playing || state.auto) {
    pauseKinh();
    return;
  }

  if (state.finished) {
    state.finished = false;
    state.index = 0;
    kinhPlayer.elapsedBefore = 0;
    renderLines();
    renderProgress();
  }

  startAuto();
  kinhPlayer.playing = true;
  try { setChantingState(true); } catch (e) { /* scene chưa sẵn sàng */ }
  startKinhTicker();
  updateKinhPlayButton();
  renderKinhPlayerText();
}

function openKinhPlayer(id) {
  const sheet = document.getElementById('kinhPlayerSheet');
  if (!sheet || !SUTRA_BY_ID[id]) return;

  if (kinhPlayer.playing || state.auto) pauseKinh();
  if (state.sutra.id !== id || state.finished) selectSutra(id, true);

  kinhPlayer.elapsedBefore = 0;
  kinhPlayer.startedAt = 0;
  kinhPlayer.lastIndex = -1;
  updateKinhPlayButton();
  renderKinhPlayerText();
  syncKinhPlayer();
  initSheet(sheet);
  openBottomSheet(sheet);
}

(() => {
  const sheet = document.getElementById('kinhPlayerSheet');
  const playBtn = document.getElementById('btnKinhPlay');
  if (sheet) initSheet(sheet);
  playBtn?.addEventListener('click', toggleKinhPlay);

  sheet?.addEventListener('click', (event) => {
    if (event.target === sheet || event.target.closest?.('[data-sheet-close]')) {
      pauseKinh();
    }
  });

  document.querySelectorAll('#bottomNav button[data-nav]').forEach((btn) => {
    if (btn.dataset.nav !== 'kinh') {
      btn.addEventListener('click', closeKinhScreen);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeKinhScreen();
      if (sheet && !sheet.classList.contains('hidden')) pauseKinh();
    }
  });

  renderKinhList();
  updateKinhPlayButton();
  syncKinhPlayer();
})();
