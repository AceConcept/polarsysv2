import { shell } from '../layout.js';
import { btnIconMarkup } from '../btnIcon.js';
import iconDropdownArrow from '../icons/incident-page/dropdown-arrow.svg?raw';
import iconIssueArrow from '../icons/monitor-page/issue-arrow.svg?raw';

const CHART_PLOT_WIDTH = 1600;
/** SVG viewBox height for the telemetry chart. */
const CHART_VIEWBOX_HEIGHT = 260;
/** Y-axis tick values (40→20→10→0 top→bottom); HTML labels sit beside the SVG so they are not stretched with the plot. */
const MONITOR_CHART_Y_TICK_VALUES = [40, 20, 10, 0];
/** Horizontal guides + Y labels sit evenly between these % of viewBox height (fills plot row vertically). */
const MONITOR_CHART_Y_AXIS_TOP_PCT = 10;
const MONITOR_CHART_Y_AXIS_BOT_PCT = 90;

/** Even vertical spacing across the chart band (`index` 0 .. `count`-1 maps top→bottom). */
function monitorChartGuideY(viewH, index, count = MONITOR_CHART_Y_TICK_VALUES.length) {
  const top = (MONITOR_CHART_Y_AXIS_TOP_PCT / 100) * viewH;
  const bot = (MONITOR_CHART_Y_AXIS_BOT_PCT / 100) * viewH;
  if (count <= 1) return top;
  return top + (index / (count - 1)) * (bot - top);
}

const CHART_N_Y = MONITOR_CHART_Y_TICK_VALUES.length;
/** SVG y aligned to horizontal grid: tick index 0 = 40 (top) … 3 = 0 (bottom). */
function chartYForTickIndex(tickIndex) {
  return Math.round(monitorChartGuideY(CHART_VIEWBOX_HEIGHT, tickIndex, CHART_N_Y));
}
const CHART_Y_MAX = chartYForTickIndex(0);
const CHART_Y_MID_HIGH = chartYForTickIndex(1); // ~value 20
const CHART_Y_MID_LOW = chartYForTickIndex(2); // ~value 10
const CHART_Y_ZERO = chartYForTickIndex(3); // metric 0 (bottom of plot)

/** Today-only demo shape: baseline at metric 0, hump before noon clip. */
const MONITOR_CHART_TODAY_KNOTS = `0,${CHART_Y_ZERO} 620,${CHART_Y_ZERO} 715,${CHART_Y_MID_HIGH} 755,${CHART_Y_MAX} 785,${CHART_Y_MID_LOW} 800,${CHART_Y_ZERO}`;

/**
 * How far along the x-axis the series ends (demo "now"): noon on a 24h day for Today;
 * other presets use the same relative progress through the range (midpoint of the window).
 */
const CHART_DATA_END_RATIOS = {
  today: 12 / 24,
  '2weeks': 7 / 14,
  '1month': 15 / 30,
  '3months': 45 / 90,
};

function formatMMDD(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/** Seven evenly spaced calendar dates (MM/DD, local) across the last 14 days ending today. */
function monitorChartTwoWeekXLabels() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 13);
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const dayOffset = Math.round((13 * i) / 6);
    const d = new Date(start);
    d.setDate(start.getDate() + dayOffset);
    labels.push(formatMMDD(d));
  }
  return labels;
}

/** Seven evenly spaced calendar dates (MM/DD, local) across ~90 days ending today. */
function monitorChartThreeMonthXLabels() {
  const spanDays = 89; /* inclusive window: start + 89 = today → 90 calendar days */
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - spanDays);
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const dayOffset = Math.round((spanDays * i) / 6);
    const d = new Date(start);
    d.setDate(start.getDate() + dayOffset);
    labels.push(formatMMDD(d));
  }
  return labels;
}

/** Demo knot series per preset — full span 0…CHART_PLOT_WIDTH; clipping + step path applied at render. */
const MONITOR_TIMEFRAME_CHART = {
  today: {
    points: MONITOR_CHART_TODAY_KNOTS,
    xLabels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
  },
  '2weeks': {
    points: `0,${CHART_Y_ZERO} 243,208 486,165 729,152 972,88 1215,118 1600,95`,
  },
  '1month': {
    points: `0,${CHART_Y_ZERO} 266,130 533,175 800,55 1066,140 1333,105 1600,160`,
    xLabels: ['1', '5', '10', '15', '20', '25', '30'],
  },
  '3months': {
    points: `0,${CHART_Y_ZERO} 266,200 533,120 800,100 1066,45 1333,85 1600,70`,
  },
};

function getMonitorChartXLabels(preset) {
  if (preset === '2weeks') return monitorChartTwoWeekXLabels();
  if (preset === '3months') return monitorChartThreeMonthXLabels();
  const cfg = MONITOR_TIMEFRAME_CHART[preset];
  return cfg && Array.isArray(cfg.xLabels) ? cfg.xLabels : [];
}

function parseKnots(pointsStr) {
  return pointsStr
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const [xs, ys] = pair.split(',');
      return { x: Number(xs), y: Number(ys) };
    })
    .sort((a, b) => a.x - b.x);
}

/** Step-after: value held from each knot until the next x; plateau y is the knot at the start of each segment. */
function stepValueAt(sortedKnots, xq) {
  if (sortedKnots.length === 0) return 0;
  let y = sortedKnots[0].y;
  for (const k of sortedKnots) {
    if (k.x <= xq) y = k.y;
    else break;
  }
  return y;
}

/**
 * Drop knots past "now" and cap with a point at endX so the line does not run to the right edge of the chart.
 */
function clipKnotsToEndX(sortedKnots, endX) {
  if (sortedKnots.length === 0) return [];
  const yEnd = stepValueAt(sortedKnots, endX);
  const trimmed = sortedKnots.filter((k) => k.x < endX);
  trimmed.push({ x: endX, y: yEnd });
  return trimmed;
}

/**
 * Step chart (horizontal plateaus, vertical jumps): step-after from sorted knots.
 */
function knotsToStepPolylinePoints(knots) {
  const k = [...knots].sort((a, b) => a.x - b.x);
  if (k.length === 0) return '';
  if (k.length === 1) return `${k[0].x},${k[0].y}`;
  const pts = [`${k[0].x},${k[0].y}`];
  for (let i = 0; i < k.length - 1; i++) {
    pts.push(`${k[i + 1].x},${k[i].y}`);
    if (k[i + 1].y !== k[i].y) {
      pts.push(`${k[i + 1].x},${k[i + 1].y}`);
    }
  }
  return pts.join(' ');
}

function buildMonitorChartPolylinePoints(preset) {
  const cfg = MONITOR_TIMEFRAME_CHART[preset];
  const ratio = CHART_DATA_END_RATIOS[preset] ?? 0.5;
  if (!cfg) return '';
  const endX = CHART_PLOT_WIDTH * ratio;
  const sorted = parseKnots(cfg.points);
  const clipped = clipKnotsToEndX(sorted, endX);
  return knotsToStepPolylinePoints(clipped);
}

export function renderMonitor() {
  const chartPoints = buildMonitorChartPolylinePoints('today');
  const nY = MONITOR_CHART_Y_TICK_VALUES.length;
  const chartYGuidesSvg = MONITOR_CHART_Y_TICK_VALUES.map((_, index) => {
    const y = monitorChartGuideY(CHART_VIEWBOX_HEIGHT, index, nY);
    return `<line class="chart-grid-line chart-grid-line--h" x1="0" y1="${y}" x2="${CHART_PLOT_WIDTH}" y2="${y}" stroke="#252525" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  }).join('');

  const content = `
    <section class="monitor-page">
      <div class="page-head page-head-monitor">
        <div>
          <h1 class="page-title page-title-monitor monitor-title-row">
            <a class="monitor-host-link" href="#/incident">db-core-02.internal</a>
            <span class="btn btn-dark incident-status-btn">${btnIconMarkup()}<span>Database Server</span></span>
          </h1>
          <p class="desc monitor-desc">
            Stores structured information—everything from user credentials and transaction logs to internal audit trails,
            application telemetry, and threat event data gathered by the SOC's tools.
          </p>
        </div>
      </div>

      <div class="controls-bar">
        <div class="monitor-controls-group">
          <div class="monitor-combo monitor-combo--query" aria-label='Query "DoS" OR "Port Scan"'>
            <span class="monitor-combo-label">Query</span>
            <span class="monitor-combo-value">"DoS" OR "Port Scan"</span>
          </div>
          <div class="monitor-combo monitor-combo--severity" aria-label='Severity >= "medium"'>
            <span class="monitor-combo-label">Severity</span>
            <span class="monitor-combo-value">&gt;= "medium"</span>
          </div>
          <div class="control">
            <div class="monitor-timeframe-wrap">
              <button
                type="button"
                class="select-like monitor-timeframe-select"
                aria-label="Time range selector"
                aria-haspopup="menu"
                aria-expanded="false"
              >
                <span class="monitor-timeframe-label">Today</span>
                <span class="monitor-dropdown-caret" aria-hidden="true">${iconDropdownArrow.trim()}</span>
              </button>
              <div class="monitor-timeframe-menu" role="menu" aria-label="Time range options" hidden>
                <button type="button" class="monitor-timeframe-menu-item is-selected" role="menuitemradio" aria-checked="true" data-monitor-timeframe="today">Today</button>
                <button type="button" class="monitor-timeframe-menu-item" role="menuitemradio" aria-checked="false" data-monitor-timeframe="2weeks">2 weeks</button>
                <button type="button" class="monitor-timeframe-menu-item" role="menuitemradio" aria-checked="false" data-monitor-timeframe="1month">1 month</button>
                <button type="button" class="monitor-timeframe-menu-item" role="menuitemradio" aria-checked="false" data-monitor-timeframe="3months">3 months</button>
                <button type="button" class="monitor-timeframe-menu-item" role="menuitemradio" aria-checked="false" data-monitor-timeframe="custom">Custom Range</button>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-dark" aria-label="Filter">${btnIconMarkup()}</button>
        </div>
        <button type="button" class="btn btn-ghost">${btnIconMarkup()}<span>Run Query</span></button>
      </div>

      <div class="monitor-layout">
        <div class="monitor-main">
          <div class="metrics-row">
            ${[
              ['All Issues', '125', ''],
              ['Unauthorized Port Scan', '67', 'selected'],
              ['Recursive DNS Loop', '20', ''],
              ['Failed Logins', '5', ''],
              ['External IP Correlation', '33', ''],
            ]
              .map(
                ([label, val, sel]) =>
                  `<div class="metric-card ${sel}" data-metric="${label}">
                    <div class="label">${label}</div>
                    <div class="value">${val}</div>
                  </div>`,
              )
              .join('')}
          </div>

          <div class="chart-panel">
            <div class="chart-head">
              <div class="chart-legend-chip">
                <span class="chart-legend-dot"></span>
                Unauthorized Port Scan
              </div>
              <span class="chart-clock">00:15 UTC</span>
            </div>
            <div class="chart-big hidden">67</div>
            <div class="chart-svg-wrap">
              <div class="chart-plot-row">
                <div class="chart-y-axis-labels">
                  ${MONITOR_CHART_Y_TICK_VALUES.map((v) => `<span>${v}</span>`).join('')}
                </div>
                <svg
                  class="chart-svg"
                  viewBox="0 0 ${CHART_PLOT_WIDTH} ${CHART_VIEWBOX_HEIGHT}"
                  preserveAspectRatio="none"
                >
                  <g class="chart-grid-lines chart-grid-lines--horizontal" aria-hidden="true">${chartYGuidesSvg}</g>
                  <polyline fill="none" stroke="#3b82f6" stroke-width="0.125rem" points="${chartPoints}" stroke-linejoin="miter" stroke-linecap="square" vector-effect="non-scaling-stroke"/>
                </svg>
              </div>
              <div class="chart-x-axis-labels">
                <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span>
              </div>
            </div>
          </div>
          <div class="chart-foot">
            <span class="chart-foot-host">db-core-02.internal</span>
            <button type="button" class="chart-foot-link">Manage Issues</button>
          </div>

          <div class="monitor-task-table-wrap">
            <div class="monitor-task-table">
              <div class="monitor-task-head">
                <span>TIME (UTC) ↑</span>
                <span>ROOT TASK</span>
                <span>STATUS</span>
                <span>SEVERITY</span>
                <span>AFFECTED HOST</span>
              </div>
              <div class="monitor-task-row">
                <span>11:02:11AM</span>
                <div>
                  <div class="task-name">DAILY_FINANCE_AGGREGATE</div>
                  <div class="task-sub">0 sub tasks</div>
                </div>
                <span class="task-status is-on">ON</span>
                <span class="task-severity"><span class="task-severity-dot"></span>Medium</span>
                <a href="#/incident">web-prod-01</a>
              </div>
              <div class="monitor-task-row">
                <span>11:02:11AM</span>
                <div>
                  <div class="task-name">INVENTORY_SYNC_TASK</div>
                  <div class="task-sub">0 sub tasks</div>
                </div>
                <span class="task-status is-off">OFF</span>
                <span class="task-severity"><span class="task-severity-dot"></span>Low</span>
                <a href="#/incident">web-prod-01</a>
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div class="issue-body issue-panel">
            <div class="issue-panel-title">
              ${iconIssueArrow.trim()}
              Issue Analysis
            </div>
            <div class="monitor-issue-summary">
              <h4>Harden DNS Configuration</h4>
              <div class="sub">Immediate Host Isolation</div>
              <p class="copy monitor-issue-copy">
                Quarantine the compromised host at IP address 172.31.255.2 to immediately prevent any potential lateral
                movement or external data exfiltration.
              </p>
            </div>
            <div class="steps">
              <a class="step" href="#/monitor">
                <div class="step-inner">
                  <div class="step-num-box">
                    <span class="step-num">1</span>
                  </div>
                  <div class="step-content">
                    <div class="step-text">
                      <div class="step-title">Correlate with prior telemetry logs</div>
                      <div class="step-sub">Temporarily segment this endpoint</div>
                    </div>
                    <div class="step-link">
                      <svg class="step-link-icon" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M17.707 7.29163L13.5404 7.29163V9.37496L17.707 9.37496C19.4258 9.37496 20.832 10.7812 20.832 12.5C20.832 14.2187 19.4258 15.625 17.707 15.625H13.5404V17.7083H17.707C20.582 17.7083 22.9154 15.375 22.9154 12.5C22.9154 9.62496 20.582 7.29163 17.707 7.29163ZM11.457 15.625L7.29036 15.625C5.57161 15.625 4.16536 14.2187 4.16536 12.5C4.16536 10.7812 5.57161 9.37496 7.29036 9.37496L11.457 9.37496V7.29163L7.29036 7.29163C4.41536 7.29163 2.08203 9.62496 2.08203 12.5C2.08203 15.375 4.41536 17.7083 7.29036 17.7083H11.457V15.625ZM8.33203 11.4583L16.6654 11.4583V13.5416L8.33203 13.5416V11.4583Z" fill="currentColor"/>
                      </svg>
                      <span class="step-link-text">How to Isolate Host</span>
                    </div>
                  </div>
                </div>
                <span class="step-chev-box" aria-hidden="true">
                  <svg class="step-chev" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M9.67578 8.645L15.0191 14L9.67578 19.355L11.3208 21L18.3208 14L11.3208 7L9.67578 8.645Z" fill="currentColor"/>
                  </svg>
                </span>
              </a>
              <a class="step" href="#/incident">
                <div class="step-inner">
                  <div class="step-num-box">
                    <span class="step-num">2</span>
                  </div>
                  <div class="step-content">
                    <div class="step-text">
                      <div class="step-title">Generate anomaly summary for Case #8846</div>
                      <div class="step-sub">Compile time-series data, node relationships, and AI-detected</div>
                    </div>
                  </div>
                </div>
                <span class="step-chev-box" aria-hidden="true">
                  <svg class="step-chev" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M9.67578 8.645L15.0191 14L9.67578 19.355L11.3208 21L18.3208 14L11.3208 7L9.67578 8.645Z" fill="currentColor"/>
                  </svg>
                </span>
              </a>
              <button type="button" class="step" id="step-sandbox">
                <div class="step-inner">
                  <div class="step-num-box">
                    <span class="step-num">3</span>
                  </div>
                  <div class="step-content">
                    <div class="step-text">
                      <div class="step-title">Initiate traffic replay sandbox</div>
                      <div class="step-sub">Reconstruct the last 60 seconds of packet flow</div>
                    </div>
                  </div>
                </div>
                <span class="step-chev-box" aria-hidden="true">
                  <svg class="step-chev" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M9.67578 8.645L15.0191 14L9.67578 19.355L11.3208 21L18.3208 14L11.3208 7L9.67578 8.645Z" fill="currentColor"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `;

  return shell({
    crumb: {
      mode: 'incidentSubpage',
      caseTitle: '#8846 — DNS Loop & Port Scan Correlation',
      pageTitle: 'Server Telemetry',
    },
    content,
    activeNav: 'network',
  });
}

/**
 * Updates the main telemetry chart polyline + x-axis labels for a timeframe preset.
 * Does nothing for `custom` (Custom Range).
 */
function applyMonitorTimeframeChart(root, preset) {
  if (preset === 'custom' || !MONITOR_TIMEFRAME_CHART[preset]) return;
  const cfg = MONITOR_TIMEFRAME_CHART[preset];
  const poly = root.querySelector('.monitor-page .chart-svg polyline');
  const xAxis = root.querySelector('.monitor-page .chart-x-axis-labels');
  if (poly) poly.setAttribute('points', buildMonitorChartPolylinePoints(preset));
  if (xAxis) {
    const spans = xAxis.querySelectorAll('span');
    getMonitorChartXLabels(preset).forEach((text, i) => {
      if (spans[i]) spans[i].textContent = text;
    });
  }
}

export function attachMonitorHandlers(root) {
  const timeframeWrap = root.querySelector('.monitor-timeframe-wrap');
  const timeframeBtn = root.querySelector('.monitor-timeframe-select');
  const timeframeMenu = root.querySelector('.monitor-timeframe-menu');
  const timeframeLabel = root.querySelector('.monitor-timeframe-label');
  const timeframeItems = timeframeMenu
    ? Array.from(timeframeMenu.querySelectorAll('.monitor-timeframe-menu-item'))
    : [];

  function closeTimeframeMenu() {
    if (!timeframeBtn || !timeframeMenu) return;
    timeframeBtn.setAttribute('aria-expanded', 'false');
    timeframeMenu.hidden = true;
    timeframeWrap?.classList.remove('is-open');
  }

  function openTimeframeMenu() {
    if (!timeframeBtn || !timeframeMenu) return;
    timeframeBtn.setAttribute('aria-expanded', 'true');
    timeframeMenu.hidden = false;
    timeframeWrap?.classList.add('is-open');
  }

  if (timeframeBtn && timeframeMenu) {
    timeframeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (timeframeMenu.hidden) {
        openTimeframeMenu();
        return;
      }
      closeTimeframeMenu();
    });

    timeframeMenu.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const item = target.closest('.monitor-timeframe-menu-item');
      if (!item) return;

      for (const menuItem of timeframeItems) {
        menuItem.classList.remove('is-selected');
        menuItem.setAttribute('aria-checked', 'false');
      }
      item.classList.add('is-selected');
      item.setAttribute('aria-checked', 'true');
      if (timeframeLabel) timeframeLabel.textContent = item.textContent ?? '';
      const preset = item.dataset.monitorTimeframe ?? '';
      applyMonitorTimeframeChart(root, preset);
      closeTimeframeMenu();
    });

    document.addEventListener('pointerdown', (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (timeframeWrap?.contains(target)) return;
      closeTimeframeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTimeframeMenu();
    });
  }

  const sb = root.querySelector('#step-sandbox');
  if (sb) {
    sb.addEventListener('click', () => {
      window.location.hash = '#/incident';
    });
  }

  applyMonitorTimeframeChart(root, 'today');
}
