/** Session flag: user opened Monitor via db-core link in the incident node popover. */
const MONITOR_ENTRY_KEY = 'polarsys-monitor-entry';

export function grantMonitorEntry() {
  try {
    sessionStorage.setItem(MONITOR_ENTRY_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export function hasMonitorEntry() {
  try {
    return sessionStorage.getItem(MONITOR_ENTRY_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearMonitorEntry() {
  try {
    sessionStorage.removeItem(MONITOR_ENTRY_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function canNavigateToMonitor() {
  return hasMonitorEntry();
}
