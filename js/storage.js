/** Lưu trữ cục bộ: công đức, cấp, danh tính pháp danh, cài đặt, lời nguyện. */

const KEY = 'niemphat.v2';

const DEFAULT = {
  playerName: 'Quảng Hạnh 55',
  merit: 10,
  todayMerit: 10,
  todayDate: '',
  lastSutra: 'dai-bi',
  best: {},
  settings: {
    voiceMode: 'voice', // 'voice': lồng tiếng đọc kinh, 'self': tự đọc kinh
    bgm: true,          // Nhạc nền thiền
    bgmVol: 0.5,
    auto: false,
    vibe: true,
    bell: true,
    speed: 5,
    quality: 'mid'
  },
  wishes: [
    { name: 'Phúc Hạnh 33', text: 'Mong nhà mình luôn bình an, gia đạo thuận hòa', time: '2 phút trước', likes: 12 },
    { name: 'Thích Tuệ Nhi', text: 'Cầu cho cha mẹ sống lâu trăm tuổi, thân tâm an lạc', time: '5 phút trước', likes: 9 },
    { name: 'Quỳnh Như', text: 'Cầu cho việc học tập, công việc hanh thông suôn sẻ', time: '12 phút trước', likes: 6 },
    { name: 'Diệu Tâm', text: 'Nguyện cầu quốc thái dân an, phong điều vũ thuận', time: '18 phút trước', likes: 15 },
    { name: 'Quảng Hưng', text: 'Cầu mong tất cả chúng sinh tai qua nạn khỏi, an lành', time: '25 phút trước', likes: 21 }
  ]
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
  data.settings = { ...DEFAULT.settings, ...(data.settings || {}) };
  data.wishes = Array.isArray(data.wishes) && data.wishes.length > 0 ? data.wishes : DEFAULT.wishes;
  data.best = data.best || {};

  const t = todayKey();
  if (data.todayDate !== t) {
    data.todayDate = t;
    data.todayMerit = 0;
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
