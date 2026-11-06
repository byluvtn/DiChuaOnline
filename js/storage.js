/** Lưu trữ cục bộ: công đức, cấp, cài đặt. */

const KEY = 'niemphat.v1';

const DEFAULT = {
  merit: 0,
  todayMerit: 0,
  todayDate: '',
  lastSutra: 'dai-bi',
  best: {},
  settings: {
    voice: true,
    auto: false,
    vibe: true,
    bell: true,
    speed: 5,
    quality: 'mid'
  }
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
  data.settings = { ...DEFAULT.settings, ...(data.settings || {}) };
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
    /* chế độ riêng tư: bỏ qua */
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
