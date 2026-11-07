/** Lưu trữ cục bộ: công đức, cấp, danh tính pháp danh, cài đặt, lời nguyện. */

const KEY = 'niemphat.v2';

const DEFAULT = {
  playerName: 'Quảng Hạnh 55',
  avatar: 'chutieu',
  merit: 10,
  todayMerit: 10,
  todayTaps: 0,
  todayDate: '',
  lastSutra: 'dai-bi',
  best: {},
  quests: { date: '', done: [], claimedDate: '', sutras: 0 },
  beads: 0,       // A4: số hạt đã lần trong vòng hiện tại (0–108)
  beadRounds: 0,  // A4: số vòng 108 hạt đã hoàn thành
  offerings: { date: '', count: 0 }, // A5: số lần dâng lễ trong ngày
  fortune: { date: '', id: '' },     // A6: quẻ đã rút trong ngày
  settings: {
    voiceMode: 'voice', // 'voice': lồng tiếng đọc kinh, 'self': tự đọc kinh
    bgm: true,          // Nhạc nền thiền
    bgmVol: 0.5,
    auto: false,
    vibe: true,
    bell: true,
    speed: 5,
    quality: 'mid',
    hideNpc: false,      // A14: ẩn NPC trong chánh điện để giảm lag
    seenHowToPlay: false,// A7: đã xem màn hình cách chơi lần đầu chưa
    collapsePrayer: false // A11: bảng tụng kinh đang ở trạng thái thu gọn
  },
  wishes: [],
  wishesVersion: 1
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function load() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    data = null;
  }
  if (!data || typeof data !== 'object') data = structuredClone(DEFAULT);
  data.playerName = data.playerName || DEFAULT.playerName;
  const avatarAliases = { novice: 'chutieu', male: 'sunam', female: 'sunu' };
  if (Object.hasOwn(avatarAliases, data.avatar)) data.avatar = avatarAliases[data.avatar];
  data.avatar = ['chutieu', 'sunam', 'sunu'].includes(data.avatar) ? data.avatar : 'chutieu';
  data.settings = { ...DEFAULT.settings, ...(data.settings || {}) };
  // Bản cũ có lời nguyện mẫu không có id; bỏ mẫu, giữ lời người dùng đã gửi.
  data.wishes = Array.isArray(data.wishes)
    ? data.wishes.filter((wish) => wish && typeof wish.text === 'string' &&
      (data.wishesVersion === 1 || wish.id != null))
    : [];
  data.wishesVersion = 1;
  data.best = data.best || {};
  data.todayTaps = Number.isFinite(data.todayTaps) ? data.todayTaps : 0;
  data.beads = Number.isFinite(data.beads) ? Math.min(Math.max(data.beads, 0), 108) : 0;
  data.beadRounds = Number.isFinite(data.beadRounds) ? Math.max(data.beadRounds, 0) : 0;
  if (!data.offerings || typeof data.offerings !== 'object') {
    data.offerings = { date: '', count: 0 };
  }
  data.offerings.date = data.offerings.date || '';
  data.offerings.count = Number.isFinite(data.offerings.count) ? Math.max(data.offerings.count, 0) : 0;
  if (!data.fortune || typeof data.fortune !== 'object') {
    data.fortune = { date: '', id: '' };
  }
  data.fortune.date = typeof data.fortune.date === 'string' ? data.fortune.date : '';
  data.fortune.id = typeof data.fortune.id === 'string' ? data.fortune.id : '';
  if (!data.quests || typeof data.quests !== 'object') {
    data.quests = { date: '', done: [], claimedDate: '', sutras: 0 };
  }
  if (!Array.isArray(data.quests.done)) data.quests.done = [];
  data.quests.date = data.quests.date || '';
  data.quests.claimedDate = data.quests.claimedDate || '';
  data.quests.sutras = Number.isFinite(data.quests.sutras) ? data.quests.sutras : 0;

  const t = todayKey();
  if (data.todayDate !== t) {
    data.todayDate = t;
    data.todayMerit = 0;
    data.todayTaps = 0;
  }
  if (data.quests.date !== t) {
    data.quests.date = t;
    data.quests.done = [];
    data.quests.sutras = 0;
  }
  return data;
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* chế độ riêng tư */
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT);
}
