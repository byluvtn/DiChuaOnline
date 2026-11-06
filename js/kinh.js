/**
 * Dữ liệu kinh – chú.
 * Mỗi bài: id, name, short, intro, tint (màu ánh sáng), lines[]
 */

const DAI_BI = [
  'Nam mô hắc ra đát na đa ra dạ da',
  'Nam mô a rị da',
  'Bà lô yết đế thước bát ra da',
  'Bồ đề tát đỏa bà da',
  'Ma ha tát đỏa bà da',
  'Ma ha ca lô ni ca da',
  'Án',
  'Tát bàn ra phạt duệ',
  'Số đát na đát tỏa',
  'Nam mô tát lợi phạt đát tha toa đà phạt đà',
  'Nam mô tát bà đát tha nga đa ra dạ',
  'Bồ đà tát đỏa bà da',
  'Nam mô bà lô yết đế',
  'Thước bát ra da',
  'Bồ đề tát đỏa bà da',
  'Ma ha tát đỏa bà da',
  'Ma ha ca lô ni ca da',
  'Nam mô hắc ra đát na đa ra dạ da',
  'Nam mô a rị da',
  'Bà lô yết đế',
  'Thước bát ra da',
  'Bồ đề tát đỏa bà da',
  'Ma ha tát đỏa bà da',
  'Ma ha ca lô ni ca da',
  'Án tát bàn ra phạt duệ',
  'Số đát na đát tỏa',
  'Nam mô tát lợi phạt đát tha toa đà phạt đà',
  'Nam mô tát bà đát tha nga đa ra dạ',
  'Bồ đà tát đỏa bà da',
  'Nam mô bà lô yết đế',
  'Thước bát ra da',
  'Bồ đề tát đỏa bà da',
  'Ma ha tát đỏa bà da',
  'Ma ha ca lô ni ca da',
  'Án tát bà bà đế',
  'Số đà tát đỏa',
  'Mẫu đà ca duệ',
  'Tát bà tăng na tam ma hạ',
  'Phạt sa tô đà',
  'Tát bà tát đỏa',
  'Tỳ bà xá na',
  'Tát bà tư đà',
  'Du già thước bát ra',
  'Tỳ sa na',
  'Tát bà bà ha na',
  'Tát bà tát đa na ma bà già',
  'Ma phạt đạt đỏa',
  'Bà bà xá na',
  'Bồ đà la xà na',
  'Mẫu đà tà ni',
  'Tát bà đế lệ',
  'Na na thất lợi',
  'Tát bà diệc ma bà già',
  'Tát bà tác đà',
  'Na ma bà già',
  'Ma phạt đạt đỏa',
  'Tát bà tát đa',
  'Na ma bà già',
  'Na ma tát bà',
  'Ma phạt đạt đỏa',
  'Tắc bà hắc',
  'Tô đát nô',
  'Tu đà bà',
  'Tô đà nô',
  'Na ma tát bà đế lợi',
  'Hắc ra tô đà',
  'Na ma tát bà',
  'Ma ha la đà',
  'Tát bà riệt đà',
  'Tát bà bà sa',
  'Ma ha bà đà',
  'Bà bà thả ma',
  'Tát bà bà đà',
  'Bà bà tất đà',
  'Tô na tát đỏa',
  'Na ma tát bà',
  'Tát bà bát đà đỏa',
  'Tát bà tô đà',
  'Sát bà tu na',
  'Tỳ sa bà lợi',
  'Tát bà tô bà ha',
  'Án tất đà na',
  'Ma ha bát đà da',
  'Bà lô yết đế'
];

const BAT_NHA = [
  'Quán Tự Tại Bồ Tát',
  'Hành thâm Bát Nhã Ba La Mật Đa thời',
  'Chiếu kiến ngũ uẩn giai không',
  'Độ nhất thiết khổ ách',
  'Xá Lợi Tử',
  'Sắc bất dị không, không bất dị sắc',
  'Sắc tức thị không, không tức thị sắc',
  'Thọ tưởng hành thức, diệc phục như thị',
  'Xá Lợi Tử',
  'Thị chư pháp không tướng',
  'Bất sanh bất diệt',
  'Bất cấu bất tịnh',
  'Bất tăng bất giảm',
  'Thị cố không trung vô sắc',
  'Vô thọ tưởng hành thức',
  'Vô nhãn nhĩ tỷ thiệt thân ý',
  'Vô sắc thanh hương vị xúc pháp',
  'Vô nhãn giới nãi chí vô ý thức giới',
  'Vô vô minh diệc vô vô minh tận',
  'Nãi chí vô lão tử diệc vô lão tử tận',
  'Vô khổ tập diệt đạo',
  'Vô trí diệc vô đắc',
  'Dĩ vô sở đắc cố',
  'Bồ Đề Tát Đỏa y Bát Nhã Ba La Mật Đa cố',
  'Tâm vô quái ngại',
  'Vô quái ngại cố vô hữu khủng bố',
  'Viễn ly điên đảo mộng tưởng',
  'Cứu cánh Niết Bàn',
  'Tam thế chư Phật',
  'Y Bát Nhã Ba La Mật Đa cố',
  'Đắc A Nậu Đa La Tam Miệu Tam Bồ Đề',
  'Cố tri Bát Nhã Ba La Mật Đa',
  'Thị đại thần chú',
  'Thị đại minh chú',
  'Thị vô thượng chú',
  'Thị vô đẳng đẳng chú',
  'Năng trừ nhất thiết khổ',
  'Chân thật bất hư',
  'Cố thuyết Bát Nhã Ba La Mật Đa chú',
  'Tức thuyết chú viết',
  'Yết đế yết đế',
  'Ba La yết đế',
  'Ba La Tăng yết đế',
  'Bồ Đề tát bà ha'
];

const VANG_SANH = [
  'Nam mô a di đa bà dạ',
  'Đa tha dà đa dạ',
  'Đa địa dạ tha',
  'A di rị đô bà tỳ',
  'A di rị đa tất đam bà tỳ',
  'A di rị đa tỳ ca lan đế',
  'A di rị đa tỳ ca lan đa',
  'Già di nị già già na',
  'Chỉ đa ca lệ ta bà ha'
];

const HOI_HUONG = [
  'Nguyện tiêu tam chướng trừ phiền não',
  'Nguyện đắc trí tuệ chân minh liễu',
  'Phổ nguyện tội chướng tất tiêu trừ',
  'Thệ độ chúng sanh thành Phật đạo',
  'Nguyện sanh Tây Phương Tịnh Độ trung',
  'Chín phẩm hoa sen là cha mẹ',
  'Hoa nở thấy Phật ngộ Vô Sanh',
  'Bồ Tát bất thoái độ chúng sanh'
];

const NIEM_PHAT = new Array(12).fill('Nam mô A Di Đà Phật');

export const SUTRAS = [
  {
    id: 'dai-bi',
    name: 'Chú Đại Bi',
    short: 'Đại Bi',
    subtitle: 'Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni',
    intro: 'Khởi lòng từ bi, tâm an tịnh rồi mới tụng.',
    tint: 0xffc46a,
    lines: DAI_BI
  },
  {
    id: 'niem-phat',
    name: 'Niệm Phật',
    short: 'Niệm Phật',
    subtitle: 'Nhất tâm xưng niệm, tự tánh Di Đà',
    intro: 'Thở đều, niệm từng tiếng rõ ràng nơi tâm.',
    tint: 0xffd79a,
    lines: NIEM_PHAT
  },
  {
    id: 'bat-nha',
    name: 'Bát Nhã Tâm Kinh',
    short: 'Tâm Kinh',
    subtitle: 'Chiếu kiến ngũ uẩn giai không',
    intro: 'Tụng chậm, quán chiếu từng câu.',
    tint: 0xb8d4ff,
    lines: BAT_NHA
  },
  {
    id: 'vang-sanh',
    name: 'Chú Vãng Sanh',
    short: 'Vãng Sanh',
    subtitle: 'Bạt độ chúng sanh về cõi Tịnh Độ',
    intro: 'Hồi hướng công đức cho người đã khuất.',
    tint: 0xa8e6c0,
    lines: VANG_SANH
  },
  {
    id: 'hoi-huong',
    name: 'Kệ Hồi Hướng',
    short: 'Hồi Hướng',
    subtitle: 'Nguyện đem công đức này hồi hướng khắp mười phương',
    intro: 'Kết thúc buổi lễ, hồi hướng công đức.',
    tint: 0xe0b8ff,
    lines: HOI_HUONG
  }
];

export const SUTRA_BY_ID = Object.fromEntries(SUTRAS.map((s) => [s.id, s]));

/** Số âm tiết của một câu – dùng để tính nhịp đọc. */
export function syllables(text) {
  return Math.max(2, text.split(/\s+/).filter(Boolean).length);
}

export const LEVELS = [
  { level: 1, name: 'Khách Hành Hương', need: 0 },
  { level: 2, name: 'Người Niệm Phật', need: 120 },
  { level: 3, name: 'Huệ Hoan San', need: 320 },
  { level: 4, name: 'Tôn Luân Thực', need: 700 },
  { level: 5, name: 'Bích Tỳ Khiết', need: 1300 },
  { level: 6, name: 'Lão Hành Khiết', need: 2200 },
  { level: 7, name: 'Trưởng Lão Tịnh Tu', need: 3600 },
  { level: 8, name: 'A La Hán', need: 5600 },
  { level: 9, name: 'Bồ Tát Đạo', need: 8400 }
];

/** Trả về {level, name, cur, need, pct, next} cho tổng công đức. */
export function levelOf(merit) {
  let i = 0;
  while (i + 1 < LEVELS.length && merit >= LEVELS[i + 1].need) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  const base = cur.need;
  const top = next ? next.need : cur.need + 4000;
  const pct = Math.max(0, Math.min(100, ((merit - base) / (top - base)) * 100));
  return { level: cur.level, name: cur.name, pct, next, toNext: next ? Math.max(0, next.need - merit) : 0 };
}
