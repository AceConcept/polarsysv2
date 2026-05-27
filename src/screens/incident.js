import { shell } from '../layout.js';
import { btnIconMarkup } from '../btnIcon.js';
import iconDropdownArrow from '../icons/incident-page/dropdown-arrow.svg?raw';
import iconFilter from '../icons/SearchBarRow/filter-icon.svg?raw';
import tapeRingUrl from '../icons/incident-page/circle_v2.png?url';

/**
 * Node size multiplier (satellites, edge dots, center ring).
 * Base satellite radius = 12px at scale 1 → rem via ÷16.
 * Tune this to make nodes larger/smaller without moving layout positions.
 */
const GRAPH_NODE_SCALE = 1;

/** Fixed layout scale inside the SVG viewBox (not interactive zoom). */
const GRAPH_LAYOUT_SCALE = 1;

/** Label size (rem) for satellite hostnames (16px @ 16px root). */
const GRAPH_SATELLITE_LABEL_REM = 1;

/** Square side (rem) for the rotating ring image; red node is sized from this. */
const DB_CORE_TAPE_BOX_REM = 4 * GRAPH_NODE_SCALE;
/** Satellite node radius (rem @ 16px root). */
const GRAPH_SATELLITE_R_REM = (12 * GRAPH_NODE_SCALE) / 16;
/** Edge marker radius (rem @ 16px root). */
const GRAPH_EDGE_MARKER_R_REM = (4 * GRAPH_NODE_SCALE) / 16;
/** Center glow halo radius (rem @ 16px root). */
const GRAPH_CENTER_GLOW_R_REM = (18 * GRAPH_NODE_SCALE) / 16;
/** Horizontal gap satellite circle → label (viewBox units, matches rem radii at design scale). */
const GRAPH_SATELLITE_LABEL_GAP_VB = 7 * GRAPH_NODE_SCALE;
/** Edge marker stroke width (rem @ 16px root). */
const GRAPH_EDGE_MARKER_STROKE_REM = (2 * GRAPH_NODE_SCALE) / 16;
/** Vertical nudge for node popover below circle center (~20px @ 16px root, scales with document rem). */
const INCIDENT_NODE_POPOVER_DOWN_REM = 20 / 16;

/** Design-time SVG layout units (viewBox space) — positions only, not CSS px. */
const GRAPH_VIEWBOX_W = 1600;
const GRAPH_VIEWBOX_H = 640;
const GRAPH_CENTER_X = 800;
const GRAPH_CENTER_Y = 320;
const GRAPH_SHIFT_X = -380;
const GRAPH_LABEL_OFFSET_X_REM = (35 * GRAPH_NODE_SCALE) / 16;
const GRAPH_FOREIGN_OBJECT_W_REM = 30;
const GRAPH_FOREIGN_OBJECT_H_REM = 3.5;
/**
 * Red fill: circumference = this × (π × tape box side) — i.e. diameter = scale × tape box.
 * Tune to match the PNG inner opening (smaller = tighter to the ring hole).
 */
const DB_CORE_RED_CIRCUMFERENCE_SCALE = 0.62;

/**
 * Optical centering nudge for the ring PNG (applied before rotation). Same units as SVG lengths
 * (e.g. `0`, `1px`, `0.0625rem`). Adjust if the ring looks off-center while spinning.
 */
const DB_CORE_TAPE_IMAGE_NUDGE_X = '0';
const DB_CORE_TAPE_IMAGE_NUDGE_Y = '0';

/** Popover body + urgency per graph node (hostname keys match SVG labels). */
const INCIDENT_GRAPH_NODE_POPOVER = {
  'db-core-02.internal': {
    tier: 'critical',
    coreColor: '#ef4444',
    body:
      'Quarantine the compromised host at IP address 172.31.255.2 to immediately prevent any potential lateral movement or external data exfiltration.',
    recommendation: 'highly',
  },
  'web-prod-01': {
    tier: 'elevated',
    coreColor: '#f97316',
    body:
      'Isolate HTTP workload traffic for review. Verify upstream API dependencies and rotating credentials on this tier before reconnecting trusted routes.',
    recommendation: '',
  },
  'auth-svc-01': {
    tier: 'standard',
    coreColor: '#3b82f6',
    body:
      'Session and token issuance for this replica set should be validated against baseline policy. Check for dormant admin sessions tied to incident #8846.',
    recommendation: '',
  },
  'logging-collector': {
    tier: 'standard',
    coreColor: '#3b82f6',
    body:
      'Confirm log shipping integrity after the anomaly window; retain forensic streams for fourteen days pending closure.',
    recommendation: '',
  },
  'api-core-07': {
    tier: 'standard',
    coreColor: '#b3c66a',
    body:
      'Review ingress rules and rate limits. Correlation engine flagged unusual fan-out from this service during the port-scan phase.',
    recommendation: '',
  },
  'external-node-a': {
    tier: 'standard',
    coreColor: '#9ca3af',
    body:
      'Externally tagged peer. Treat as untrusted until boundary controls are confirmed; no lateral trust should be assigned by default.',
    recommendation: '',
  },
  'external-node-b': {
    tier: 'standard',
    coreColor: '#9ca3af',
    body:
      'Secondary external path. Compare traffic envelopes with external-node-a to rule out coordinated enumeration.',
    recommendation: '',
  },
};

const NODE_GUIDE_NODES = [
  { host: 'db-core-02.internal', dot: '#ef4444' },
  { host: 'external-node-a', dot: '#ef4444' },
  { host: 'api-core-07', dot: '#b3c66a' },
  { host: 'web-prod-01', dot: '#f97316' },
  { host: 'external-node-b', dot: '#9ca3af' },
  { host: 'logging-collector', dot: '#9ca3af' },
  { host: 'auth-svc-01', dot: '#3b82f6' },
];

function renderNodeGuidePanelHtml() {
  const rows = NODE_GUIDE_NODES.map(
    ({ host, dot }) => `
          <li class="node-guide-panel__item">
            <button type="button" class="node-guide-row" role="menuitem">
              <span class="node-guide-row__dot" style="background-color: ${dot}" aria-hidden="true"></span>
              <span class="node-guide-row__host">${host}</span>
            </button>
          </li>`,
  ).join('');

  return `
        <div class="node-guide-panel" role="menu" aria-label="Node list" hidden>
          <p class="node-guide-panel__title">Node List</p>
          <ul class="node-guide-panel__list">
            ${rows}
          </ul>
        </div>`;
}

function satelliteLabelX(cx) {
  return cx + 12 * GRAPH_NODE_SCALE + GRAPH_SATELLITE_LABEL_GAP_VB;
}

export function renderIncident() {
  const dbCoreTapeHalfRem = DB_CORE_TAPE_BOX_REM / 2;
  const dbCoreRedRadiusRem = (DB_CORE_TAPE_BOX_REM * DB_CORE_RED_CIRCUMFERENCE_SCALE) / 2;
  const content = `
    <section class="incident-page">
      <div class="page-head incident-header">
        <div class="incident-header-body">
          <div class="incident-actions">
            <div class="incident-actions-main">
              <div class="incident-title-wrap">
                <h1 class="page-title incident-title">
                  #8846 — DNS Loop &amp; Port Scan Correlation
                </h1>
              </div>
              <div class="incident-header-tags">
                <span class="btn btn-dark incident-status-btn">${btnIconMarkup()}<span>High Risk</span></span>
                <span class="btn btn-dark incident-status-btn">${btnIconMarkup()}<span>Under Analysis</span></span>
              </div>
            </div>
            <div class="incident-telemetry-wrap">
              <a class="btn btn-dark incident-status-btn" href="#/monitor">${btnIconMarkup()}<span>View Host Telemetry</span></a>
            </div>
          </div>
          <p class="desc incident-desc">
            Correlated recursive DNS loops with unauthorized port scans originating from
            <span class="highlight">db-core-02.internal</span>.
            Patterns match known exfiltration attempts observed in prior case #7319.
          </p>
          <div class="meta-row incident-meta-row">
            <button type="button" class="incident-meta-btn">
              <span class="incident-meta-label">Incident ID: </span><span class="incident-meta-value">#8846</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="incident-meta-btn">
              <span class="incident-meta-label">Detected By: </span><span class="incident-meta-value">Leo2.0Y / Automated Threat Correlation Engine</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="graph-widget">
        <div class="graph-canvas">
          <div class="graph-widget-head">
            <div class="graph-widget-head__icons">
              <button type="button" class="icon-btn" aria-label="Filter graph">
                <span class="icon-btn__svg" aria-hidden="true">${iconFilter.trim()}</span>
              </button>
              <button type="button" class="icon-btn" aria-label="Expand">
                <svg class="icon-btn__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
            <div class="graph-widget-head__center">
              <div class="graph-dropdown-wrap">
                <button
                  type="button"
                  class="graph-dropdown"
                  aria-label="Incident ID (demo control)"
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  <span class="graph-dropdown-label">
                    <span class="graph-dropdown-label-static">Incident ID:</span>
                    <span class="graph-dropdown-label-id" aria-live="polite">#8846</span>
                  </span>
                  <span class="graph-dropdown-caret" aria-hidden="true">${iconDropdownArrow.trim()}</span>
                </button>
                <div class="graph-dropdown-menu" role="menu" aria-label="Incident selector" hidden>
                  <button type="button" class="graph-dropdown-menu-item is-selected" role="menuitemradio" aria-checked="true">Incident ID: #8846</button>
                  <button type="button" class="graph-dropdown-menu-item" role="menuitemradio" aria-checked="false">Incident ID: #7319</button>
                  <button type="button" class="graph-dropdown-menu-item" role="menuitemradio" aria-checked="false">Incident ID: #9021</button>
                  <button type="button" class="graph-dropdown-menu-item" role="menuitemradio" aria-checked="false">Incident ID: #1084</button>
                </div>
              </div>
            </div>
            <div class="graph-widget-head__end">
              <div class="graph-dropdown-wrap graph-dropdown-wrap--node-guide">
                <button
                  type="button"
                  class="graph-dropdown graph-dropdown--node-guide"
                  aria-label="Node guide"
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  <span class="graph-dropdown-label">
                    <span class="graph-dropdown-label-static">Node Guide</span>
                  </span>
                  <span class="graph-dropdown-caret" aria-hidden="true">${iconDropdownArrow.trim()}</span>
                </button>
                ${renderNodeGuidePanelHtml()}
              </div>
            </div>
          </div>
          <div
            class="graph-map-viewport graph-map-viewport--static"
            role="region"
            aria-label="Incident network graph"
          >
            <div class="graph-map-stage">
              <div class="graph-map-infinite-bg" aria-hidden="true"></div>
              <div class="graph-map-graph-layer">
          <svg class="graph-svg" viewBox="0 0 ${GRAPH_VIEWBOX_W} ${GRAPH_VIEWBOX_H}" preserveAspectRatio="xMinYMid meet">
            <g transform="translate(${GRAPH_CENTER_X} ${GRAPH_CENTER_Y}) scale(${GRAPH_LAYOUT_SCALE}) translate(-${GRAPH_CENTER_X} -${GRAPH_CENTER_Y})">
            <g class="incident-graph-shift" transform="translate(${GRAPH_SHIFT_X} 0)">
            <defs>
              <linearGradient id="incident-db-core-gradient" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stop-color="#FF0000"/>
                <stop offset="100%" stop-color="#FF6262"/>
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.375rem" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <!-- edges (stroke width in CSS rem) -->
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="560" y2="350"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="760" y2="190"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="1040" y2="320"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="980" y2="90"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="650" y2="520"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="1100" y2="610"/>
            <!-- edge markers -->
            <circle cx="680" cy="335" r="${GRAPH_EDGE_MARKER_R_REM}rem" fill="#3b82f6" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_REM}rem"/>
            <circle cx="780" cy="255" r="${GRAPH_EDGE_MARKER_R_REM}rem" fill="#b3c66a" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_REM}rem"/>
            <circle cx="920" cy="320" r="${GRAPH_EDGE_MARKER_R_REM}rem" fill="#b3c66a" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_REM}rem"/>
            <circle cx="890" cy="205" r="${GRAPH_EDGE_MARKER_R_REM}rem" fill="#9ca3af" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_REM}rem"/>
            <circle cx="725" cy="420" r="${GRAPH_EDGE_MARKER_R_REM}rem" fill="#3b82f6" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_REM}rem"/>
            <circle cx="950" cy="465" r="${GRAPH_EDGE_MARKER_R_REM}rem" fill="#9ca3af" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_REM}rem"/>
            <!-- satellite nodes (click opens detail popover) -->
            <g class="incident-graph-satellite" data-incident-node="web-prod-01" role="button" tabindex="-1" aria-label="Host web-prod-01">
              <circle cx="760" cy="190" r="${GRAPH_SATELLITE_R_REM}rem" fill="#f97316"/>
              <text x="${satelliteLabelX(760)}" y="190" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_REM}rem">web-prod-01</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="auth-svc-01" role="button" tabindex="-1" aria-label="Host auth-svc-01">
              <circle cx="560" cy="350" r="${GRAPH_SATELLITE_R_REM}rem" fill="#3b82f6"/>
              <text x="${satelliteLabelX(560)}" y="350" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_REM}rem">auth-svc-01</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="logging-collector" role="button" tabindex="-1" aria-label="Host logging-collector">
              <circle cx="650" cy="520" r="${GRAPH_SATELLITE_R_REM}rem" fill="#3b82f6"/>
              <text x="${satelliteLabelX(650)}" y="520" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_REM}rem">logging-collector</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="api-core-07" role="button" tabindex="-1" aria-label="Host api-core-07">
              <circle cx="1040" cy="320" r="${GRAPH_SATELLITE_R_REM}rem" fill="#b3c66a"/>
              <text x="${satelliteLabelX(1040)}" y="320" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_REM}rem">api-core-07</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="external-node-a" role="button" tabindex="-1" aria-label="Host external-node-a">
              <circle cx="980" cy="90" r="${GRAPH_SATELLITE_R_REM}rem" fill="#9ca3af"/>
              <text x="${satelliteLabelX(980)}" y="90" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_REM}rem">external-node-a</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="external-node-b" role="button" tabindex="-1" aria-label="Host external-node-b">
              <circle cx="1100" cy="610" r="${GRAPH_SATELLITE_R_REM}rem" fill="#9ca3af"/>
              <text x="${satelliteLabelX(1100)}" y="610" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_REM}rem">external-node-b</text>
            </g>
            <!-- center: origin at db-core node -->
            <g class="incident-graph-db-core-hit" transform="translate(${GRAPH_CENTER_X} ${GRAPH_CENTER_Y})" data-incident-node="db-core-02.internal" role="button" tabindex="-1" aria-label="Host db-core-02.internal">
            <circle cx="0" cy="0" r="${GRAPH_CENTER_GLOW_R_REM}rem" fill="#030303" opacity="1" filter="url(#glow)"/>
            <circle cx="0" cy="0" r="${dbCoreRedRadiusRem}rem" fill="url(#incident-db-core-gradient)"/>
            <g class="incident-db-core-tape-ring" aria-hidden="true">
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="6s"
                repeatCount="indefinite"
              />
              <image
                href="${tapeRingUrl}"
                x="-${dbCoreTapeHalfRem}rem"
                y="-${dbCoreTapeHalfRem}rem"
                width="${DB_CORE_TAPE_BOX_REM}rem"
                height="${DB_CORE_TAPE_BOX_REM}rem"
                transform="translate(${DB_CORE_TAPE_IMAGE_NUDGE_X} ${DB_CORE_TAPE_IMAGE_NUDGE_Y})"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
            <g transform="translate(-${GRAPH_LABEL_OFFSET_X_REM}rem 0)">
              <foreignObject x="0" y="2.8125rem" width="${GRAPH_FOREIGN_OBJECT_W_REM}rem" height="${GRAPH_FOREIGN_OBJECT_H_REM}rem" overflow="visible">
                <div xmlns="http://www.w3.org/1999/xhtml" class="incident-db-core-label-html">
                  <span class="incident-db-core-pill">db-core-02.internal</span>
                </div>
              </foreignObject>
            </g>
            </g>
            </g>
          </svg>
              </div>
              <div
                id="incident-node-popover"
                class="incident-node-popover"
                hidden
                role="dialog"
                aria-modal="true"
                aria-labelledby="incident-node-popover-title"
              >
                <button type="button" class="incident-node-popover__dismiss" aria-label="Close node details">${iconDropdownArrow.trim()}</button>
                <div class="incident-node-popover__surface">
                  <div class="incident-node-popover__accent" aria-hidden="true"></div>
                  <div class="incident-node-popover__row">
                    <div class="incident-node-popover__icon-wrap" aria-hidden="true">
                      <span class="incident-node-popover__icon-outer"></span>
                      <span class="incident-node-popover__icon-ring"></span>
                      <span class="incident-node-popover__icon-core"></span>
                    </div>
                    <div class="incident-node-popover__text">
                      <h2 id="incident-node-popover-title" class="incident-node-popover__title"></h2>
                      <p class="incident-node-popover__body"></p>
                      <div class="incident-node-popover__footer">
                        <a class="btn btn-dark incident-node-popover__cta" href="#/monitor">${btnIconMarkup()}<span>View Host Telemetry</span></a>
                        <span class="incident-node-popover__rec incident-node-popover__rec--hidden">* Highly Recommended</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  return shell({
    crumb: {
      mode: 'incident',
      caseTitle: '#8846 — DNS Loop & Port Scan Correlation',
    },
    content,
    activeNav: 'network',
  });
}

function getIncidentPopoverAnchor(hitGroupEl) {
  const directCircles = hitGroupEl.querySelectorAll(':scope > circle');
  if (directCircles.length >= 2) {
    const grad = [...directCircles].find((c) => (c.getAttribute('fill') ?? '').startsWith('url('));
    if (grad) return grad;
    return directCircles[1];
  }
  return hitGroupEl.querySelector(':scope > circle') ?? hitGroupEl;
}

function positionIncidentGraphPopover(popover, viewportEl, anchorEl) {
  const vp = viewportEl.getBoundingClientRect();
  const ar = anchorEl.getBoundingClientRect();
  const gapRem = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.625;
  const margin = gapRem;

  popover.hidden = false;
  popover.style.visibility = 'hidden';
  popover.style.transform = '';
  popover.style.left = '0';
  popover.style.top = '0';

  const popH = popover.offsetHeight;
  const popW = popover.offsetWidth;
  popover.style.visibility = '';

  /** Popover left edge flush with anchor circle left (popover extends east; clamp stays on-screen). */
  let left = ar.left - vp.left;
  left = Math.max(margin, Math.min(left, vp.width - margin - popW));

  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const downPx = rootPx * INCIDENT_NODE_POPOVER_DOWN_REM;

  /** Vertical center on the anchor circle, shifted down by ~20px in rem. */
  const centerLine = ar.top + ar.height / 2 - vp.top;
  let top = centerLine + downPx;
  top = Math.max(margin + popH / 2, Math.min(top, vp.height - margin - popH / 2));

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.style.transform = 'translateY(-50%)';
}

function attachIncidentGraphNodePopover(viewport) {
  const svg = viewport.querySelector('.graph-svg');
  const popover = viewport.querySelector('#incident-node-popover');
  if (!(svg instanceof SVGSVGElement) || !popover) return;

  const titleEl = popover.querySelector('.incident-node-popover__title');
  const bodyEl = popover.querySelector('.incident-node-popover__body');
  const recEl = popover.querySelector('.incident-node-popover__rec');
  const dismissEl = popover.querySelector('.incident-node-popover__dismiss');
  if (!(titleEl instanceof HTMLElement) || !(bodyEl instanceof HTMLElement)) return;

  let openNodeKey = '';
  /** @type {SVGGElement | null} */
  let lastHitGroup = null;

  function close() {
    openNodeKey = '';
    lastHitGroup = null;
    popover.hidden = true;
  }

  function reflowPosition() {
    if (popover.hidden || !lastHitGroup) return;
    const anchor = getIncidentPopoverAnchor(lastHitGroup);
    positionIncidentGraphPopover(popover, viewport, anchor);
  }

  function open(hitGroup, nodeKey, detail) {
    openNodeKey = nodeKey;
    lastHitGroup = hitGroup;
    titleEl.textContent = nodeKey;
    bodyEl.textContent = detail.body;
    popover.classList.toggle('incident-node-popover--critical', detail.tier === 'critical');
    popover.style.setProperty('--popover-node-core', detail.coreColor);
    recEl?.classList.toggle('incident-node-popover__rec--hidden', detail.recommendation !== 'highly');

    positionIncidentGraphPopover(popover, viewport, getIncidentPopoverAnchor(hitGroup));
    requestAnimationFrame(() => reflowPosition());
  }

  svg.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el?.closest('[data-incident-node]')) return;
    const hit = el.closest('[data-incident-node]');
    if (!(hit instanceof SVGGElement) || hit.closest('.graph-svg') !== svg) return;
    const nodeKey = hit.getAttribute('data-incident-node');
    if (!nodeKey) return;
    const detail = INCIDENT_GRAPH_NODE_POPOVER[nodeKey];
    if (!detail) return;
    e.stopPropagation();
    if (openNodeKey === nodeKey && !popover.hidden) {
      close();
      return;
    }
    open(hit, nodeKey, detail);
  });

  dismissEl?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    close();
  });

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!(e.target instanceof Node)) return;
      if (popover.hidden) return;
      if (popover.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('[data-incident-node]')) return;
      close();
    },
    true,
  );

  window.addEventListener('resize', reflowPosition);
  window.addEventListener('scroll', reflowPosition, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.hidden) close();
  });
}

function attachGraphDropdown(wrap, { onSelect } = {}) {
  if (!wrap) return;
  const btn = wrap.querySelector('.graph-dropdown');
  const menu = wrap.querySelector('.graph-dropdown-menu');
  const items = menu ? Array.from(menu.querySelectorAll('.graph-dropdown-menu-item')) : [];
  if (!btn || !menu) return;

  function close() {
    btn.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    wrap.classList.remove('is-open');
  }

  function open() {
    btn.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    wrap.classList.add('is-open');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.hidden) open();
    else close();
  });

  menu.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest('.graph-dropdown-menu-item');
    if (!item) return;

    for (const menuItem of items) {
      menuItem.classList.remove('is-selected');
      menuItem.setAttribute('aria-checked', 'false');
    }
    item.classList.add('is-selected');
    item.setAttribute('aria-checked', 'true');
    onSelect?.(item, btn);
    close();
  });

  document.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (wrap.contains(target)) return;
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

/** Node guide: opens a node list panel; picks do not change the trigger label. */
function attachNodeGuidePanel(wrap) {
  if (!wrap) return;
  const btn = wrap.querySelector('.graph-dropdown--node-guide');
  const panel = wrap.querySelector('.node-guide-panel');
  if (!btn || !panel) return;

  function close() {
    btn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    wrap.classList.remove('is-open');
  }

  function open() {
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    wrap.classList.add('is-open');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.hidden) open();
    else close();
  });

  panel.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.closest('.node-guide-row')) return;
    close();
  });

  document.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (wrap.contains(target)) return;
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

/** Pan/zoom is off — keep viewport static and block wheel/gesture scaling on the map. */
function disableGraphViewportPanZoom(viewport, stage) {
  viewport.classList.add('graph-map-viewport--static');
  viewport.classList.remove('is-active', 'is-panning');
  viewport.removeAttribute('tabindex');

  if (stage) {
    stage.style.transform = 'none';
  }

  const blockZoom = (e) => {
    e.preventDefault();
  };

  viewport.addEventListener('wheel', blockZoom, { passive: false });
  viewport.addEventListener('gesturestart', blockZoom);
  viewport.addEventListener('gesturechange', blockZoom);
  viewport.addEventListener('gestureend', blockZoom);
}

export function attachIncidentHandlers(root = document) {
  const widget = root.querySelector('.graph-widget');
  const viewport = root.querySelector('.graph-map-viewport');
  const stage = root.querySelector('.graph-map-stage');
  if (!widget || !viewport) return;

  disableGraphViewportPanZoom(viewport, stage);

  const incidentWrap = root.querySelector(
    '.graph-widget-head .graph-dropdown-wrap:not(.graph-dropdown-wrap--node-guide)',
  );
  attachGraphDropdown(incidentWrap, {
    onSelect: (item, btn) => {
      const idNode = btn.querySelector('.graph-dropdown-label-id');
      if (idNode) {
        const match = (item.textContent ?? '').match(/#\d+/);
        if (match) idNode.textContent = match[0];
      }
    },
  });

  attachNodeGuidePanel(root.querySelector('.graph-dropdown-wrap--node-guide'));
  attachIncidentGraphNodePopover(viewport);
}
