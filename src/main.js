import './styles.css';
import { renderAnomaly, attachAnomalyHandlers } from './screens/anomaly.js';
import { renderMonitor, attachMonitorHandlers } from './screens/monitor.js';
import { renderIncident, attachIncidentHandlers } from './screens/incident.js';
import { mountUtcClock, clearUtcClock } from './utc-clock.js';
import { attachParentBridge, notifyParentRoute } from './parentBridge.js';
import { getCanvasContainScale, getScaleViewportSize } from './canvasScale.js';
import { applyDocumentScale, resetDocumentScale } from './applyDocumentScale.js';
import { canNavigateToMonitor, clearMonitorEntry } from './monitorNav.js';

function currentView() {
  const m = window.location.hash.match(/#\/([\w-]+)/);
  const v = m ? m[1] : 'anomaly';
  if (v === 'monitor' && !canNavigateToMonitor()) return 'incident';
  if (v === 'monitor' || v === 'incident') return v;
  return 'anomaly';
}

function navigateToRoute(route) {
  if (route === 'monitor' && !canNavigateToMonitor()) {
    window.location.hash = '#/incident';
    return;
  }
  window.location.hash = `#/${route}`;
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  clearUtcClock();

  const view = currentView();
  if (view !== 'monitor') {
    clearMonitorEntry();
  }

  let html = '';

  if (view === 'monitor') {
    html = renderMonitor();
  } else if (view === 'incident') {
    html = renderIncident();
  } else {
    html = renderAnomaly();
  }

  app.innerHTML = html;

  const root = app;
  if (view === 'anomaly') attachAnomalyHandlers(root);
  if (view === 'monitor') attachMonitorHandlers(root);
  if (view === 'incident') attachIncidentHandlers(root);

  mountUtcClock(root);

  notifyParentRoute(view);
}

function updateDocumentScale() {
  const viewport = getScaleViewportSize();
  if (viewport.width <= 0 || viewport.height <= 0) return;
  const scale = getCanvasContainScale(viewport.width, viewport.height);
  applyDocumentScale(scale, viewport);
}

function init() {
  if (!window.location.hash) {
    window.location.hash = '#/anomaly';
  }

  attachParentBridge(currentView, navigateToRoute);

  render();
  updateDocumentScale();

  window.addEventListener('resize', updateDocumentScale);
  window.addEventListener('hashchange', render);
  window.addEventListener('beforeunload', resetDocumentScale);
}

init();
