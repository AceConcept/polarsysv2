let intervalId = null;

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatUtcClock(date = new Date()) {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} UTC`;
}

export function clearUtcClock() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

/** Call after DOM for `root` is ready; finds `[data-utc-live]` and updates every second. */
export function mountUtcClock(root) {
  clearUtcClock();
  const el = root.querySelector('[data-utc-live]');
  if (!el) return;

  const tick = () => {
    el.textContent = formatUtcClock();
  };
  tick();
  intervalId = window.setInterval(tick, 1000);
}
