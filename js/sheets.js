/**
 * BottomSheet dùng chung (DESIGN.md mục 5 + 9) — Chặng 4.
 * Mở/đóng 260ms cubic-bezier(0.32, 0.72, 0, 1); bấm ra ngoài hoặc nút [data-sheet-close] thì đóng.
 * Trạng thái: class 'hidden' = ẩn hẳn; 'sheet-open' = đang mở; 'sheet-armed' = đã gắn hành vi sheet.
 */

const CLOSE_DURATION = 260;
const closeTimers = new WeakMap();

function handleOverlayClick(event) {
  const overlay = event.currentTarget;

  if (event.target === overlay) {
    closeSheet(overlay);
    return;
  }

  const closeButton = event.target.closest?.('[data-sheet-close]');
  if (closeButton && overlay.contains(closeButton)) {
    closeSheet(overlay);
  }
}

export function initSheet(overlay) {
  if (!overlay || overlay.dataset.sheetInit === '1') return;

  overlay.dataset.sheetInit = '1';
  overlay.classList.add('sheet-armed');

  if (!overlay.classList.contains('hidden')) {
    overlay.classList.add('sheet-open');
  }

  overlay.addEventListener('click', handleOverlayClick);
}

export function openSheet(overlay) {
  if (!overlay) return;

  const pendingTimer = closeTimers.get(overlay);
  if (pendingTimer !== undefined) {
    clearTimeout(pendingTimer);
    closeTimers.delete(overlay);
  }

  overlay.classList.remove('hidden');

  // Ép reflow để trình duyệt kịp ghi nhận trạng thái đóng trước khi mở lại.
  void overlay.offsetWidth;

  overlay.classList.add('sheet-open');
}

export function closeSheet(overlay) {
  if (!overlay) return;

  const pendingTimer = closeTimers.get(overlay);
  if (pendingTimer !== undefined) {
    clearTimeout(pendingTimer);
    closeTimers.delete(overlay);
  }

  overlay.classList.remove('sheet-open');

  const timer = setTimeout(() => {
    closeTimers.delete(overlay);

    if (!overlay.classList.contains('sheet-open')) {
      overlay.classList.add('hidden');
    }
  }, CLOSE_DURATION);

  closeTimers.set(overlay, timer);
}
