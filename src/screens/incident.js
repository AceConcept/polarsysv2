import { shell } from '../layout.js';
import { btnIconMarkup } from '../btnIcon.js';
import iconDropdownArrow from '../icons/incident-page/dropdown-arrow.svg?raw';
import iconFilter from '../icons/SearchBarRow/filter-icon.svg?raw';
import tapeRingUrl from '../icons/incident-page/circle_v2.png?url';

const INCIDENT_WARN_ICON_SVG = `<svg class="incident-db-core-pill__warn" xmlns="http://www.w3.org/2000/svg" width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Node size multiplier (satellites, edge dots, center ring).
 * All SVG lengths are viewBox user units (design px); the graph scales once via the
 * rem-sized container + viewBox fit. Satellite label font-size uses rem (18px @ 16px root);
 * other geometry stays in viewBox user units.
 */
const GRAPH_NODE_SCALE = 1;

/** Satellite node radius — viewBox units (= 12px @ scale 1). */
const GRAPH_SATELLITE_R_VB = 12 * GRAPH_NODE_SCALE;
/** Edge marker radius — viewBox units (= 4px @ scale 1). */
const GRAPH_EDGE_MARKER_R_VB = 4 * GRAPH_NODE_SCALE;
/** Center glow halo radius — viewBox units (= 18px @ scale 1). */
const GRAPH_CENTER_GLOW_R_VB = 18 * GRAPH_NODE_SCALE;
/** Satellite hostname labels — 18px @ 16px root (use rem in SVG so type tracks root font). */
const GRAPH_SATELLITE_LABEL_FONT_REM = 18 / 16;
/** Horizontal gap satellite circle → label (viewBox units). */
const GRAPH_SATELLITE_LABEL_GAP_VB = 7 * GRAPH_NODE_SCALE;
/** Edge marker stroke — viewBox units (= 2px @ scale 1). */
const GRAPH_EDGE_MARKER_STROKE_VB = 2 * GRAPH_NODE_SCALE;
/** Rotating ring image square side — viewBox units (= 64px / 4rem @ scale 1). */
const DB_CORE_TAPE_BOX_VB = 64 * GRAPH_NODE_SCALE;
/** Design-time SVG layout units (viewBox space). */
const GRAPH_VIEWBOX_W = 1600;
const GRAPH_VIEWBOX_H = 640;
const GRAPH_CENTER_X = 800;
const GRAPH_CENTER_Y = 320;
const GRAPH_SHIFT_X = -380;
/** Nudge db-core HTML label — viewBox units (= 35px @ scale 1). */
const GRAPH_LABEL_OFFSET_X_VB = 35 * GRAPH_NODE_SCALE;
/** Db-core pill `foreignObject` width — 544px @ 16px root (`34 × 16`). */
const GRAPH_FOREIGN_OBJECT_W_REM = 34;
/** Db-core pill `foreignObject` height — viewBox units (vertical room for pill row). */
const GRAPH_FOREIGN_OBJECT_H_VB = 72 * GRAPH_NODE_SCALE;
const GRAPH_FOREIGN_OBJECT_Y_VB = 45 * GRAPH_NODE_SCALE;
/** Glow blur — viewBox units (= 6px @ scale 1). */
const GRAPH_GLOW_BLUR_STD_VB = 6 * GRAPH_NODE_SCALE;
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

/** Only this host gets the expandable issues panel (extension card). */
const INCIDENT_NODE_POPOVER_EXTENDABLE_HOST = 'db-core-02.internal';

/** Popover body + urgency per graph node (hostname keys match SVG labels). */
const INCIDENT_GRAPH_NODE_POPOVER = {
  'db-core-02.internal': {
    tier: 'critical',
    coreColor: '#ef4444',
    body:
      'Quarantine the compromised host at IP address 172.31.255.2 to immediately prevent any potential lateral movement or external data exfiltration.',
    recommendation: 'highly',
    issues: [
      { count: '125', label: 'All Issues', severity: 'critical' },
      { count: '20', label: 'Unauthorized Port Scans', severity: 'critical' },
      { count: '20', label: 'Recursive DNS Loop', severity: 'standard' },
      { count: '05', label: 'Failed Logins', severity: 'standard' },
      { count: '33', label: 'External IP Correlation', severity: 'standard' },
    ],
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

function nodePopoverIsExtendable(nodeKey, detail) {
  return nodeKey === INCIDENT_NODE_POPOVER_EXTENDABLE_HOST && Boolean(detail.issues?.length);
}

function renderIncidentNodePopoverIssuesHtml(issues) {
  if (!issues?.length) return '';
  const rows = issues
    .map(
      ({ count, label, severity }) => `
          <li class="incident-node-popover__issues-item">
            <button type="button" class="incident-node-popover__issue-row">
              <span class="incident-node-popover__issue-dot incident-node-popover__issue-dot--${severity}" aria-hidden="true"></span>
              <span class="incident-node-popover__issue-count">${count}</span>
              <span class="incident-node-popover__issue-label">${label}</span>
            </button>
          </li>`,
    )
    .join('');

  return `
        <div class="incident-node-popover__issues">
          <ul class="incident-node-popover__issues-list">
            ${rows}
          </ul>
        </div>`;
}

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
            <button
              type="button"
              class="node-guide-row"
              role="menuitem"
              data-incident-node="${host}"
            >
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
  return cx + GRAPH_SATELLITE_R_VB + GRAPH_SATELLITE_LABEL_GAP_VB;
}

export function renderIncident() {
  const dbCoreTapeHalfVb = DB_CORE_TAPE_BOX_VB / 2;
  const dbCoreRedRadiusVb = (DB_CORE_TAPE_BOX_VB * DB_CORE_RED_CIRCUMFERENCE_SCALE) / 2;
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
                <span class="btn btn-dark incident-status-btn">High Risk</span>
                <span class="btn btn-dark incident-status-btn">Under Analysis</span>
              </div>
            </div>
            <div class="incident-telemetry-wrap">
              <button type="button" class="btn btn-dark incident-status-btn">${btnIconMarkup()}<span>View Host Telemetry</span></button>
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
              <button type="button" class="icon-btn" aria-label="Expand">
                <svg class="icon-btn__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
              <button type="button" class="icon-btn" aria-label="Filter graph">
                <span class="icon-btn__svg" aria-hidden="true">${iconFilter.trim()}</span>
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
            class="graph-map-viewport"
            tabindex="0"
            role="application"
            aria-label="Incident network graph: drag to pan"
          >
            <div class="graph-map-stage">
              <div class="graph-map-infinite-bg" aria-hidden="true"></div>
              <div class="graph-map-graph-layer">
          <svg class="graph-svg" viewBox="0 0 ${GRAPH_VIEWBOX_W} ${GRAPH_VIEWBOX_H}" preserveAspectRatio="xMinYMid meet">
            <g class="incident-graph-shift" transform="translate(${GRAPH_SHIFT_X} 0)">
            <defs>
              <linearGradient id="incident-db-core-gradient" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stop-color="#FF0000"/>
                <stop offset="100%" stop-color="#FF6262"/>
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="${GRAPH_GLOW_BLUR_STD_VB}" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <!-- edges (stroke in CSS user units — scales with viewBox) -->
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="560" y2="350"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="760" y2="190"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="1040" y2="320"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="980" y2="90"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="650" y2="520"/>
            <line x1="${GRAPH_CENTER_X}" y1="${GRAPH_CENTER_Y}" x2="1100" y2="610"/>
            <!-- edge markers -->
            <circle cx="680" cy="335" r="${GRAPH_EDGE_MARKER_R_VB}" fill="#3b82f6" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_VB}"/>
            <circle cx="780" cy="255" r="${GRAPH_EDGE_MARKER_R_VB}" fill="#b3c66a" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_VB}"/>
            <circle cx="920" cy="320" r="${GRAPH_EDGE_MARKER_R_VB}" fill="#b3c66a" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_VB}"/>
            <circle cx="890" cy="205" r="${GRAPH_EDGE_MARKER_R_VB}" fill="#9ca3af" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_VB}"/>
            <circle cx="725" cy="420" r="${GRAPH_EDGE_MARKER_R_VB}" fill="#3b82f6" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_VB}"/>
            <circle cx="950" cy="465" r="${GRAPH_EDGE_MARKER_R_VB}" fill="#9ca3af" stroke="#070707" stroke-width="${GRAPH_EDGE_MARKER_STROKE_VB}"/>
            <!-- satellite nodes (click opens detail popover) -->
            <g class="incident-graph-satellite" data-incident-node="web-prod-01" role="button" tabindex="-1" aria-label="Host web-prod-01">
              <circle cx="760" cy="190" r="${GRAPH_SATELLITE_R_VB}" fill="#f97316"/>
              <text x="${satelliteLabelX(760)}" y="190" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_FONT_REM}rem">web-prod-01</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="auth-svc-01" role="button" tabindex="-1" aria-label="Host auth-svc-01">
              <circle cx="560" cy="350" r="${GRAPH_SATELLITE_R_VB}" fill="#3b82f6"/>
              <text x="${satelliteLabelX(560)}" y="350" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_FONT_REM}rem">auth-svc-01</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="logging-collector" role="button" tabindex="-1" aria-label="Host logging-collector">
              <circle cx="650" cy="520" r="${GRAPH_SATELLITE_R_VB}" fill="#3b82f6"/>
              <text x="${satelliteLabelX(650)}" y="520" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_FONT_REM}rem">logging-collector</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="api-core-07" role="button" tabindex="-1" aria-label="Host api-core-07">
              <circle cx="1040" cy="320" r="${GRAPH_SATELLITE_R_VB}" fill="#b3c66a"/>
              <text x="${satelliteLabelX(1040)}" y="320" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_FONT_REM}rem">api-core-07</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="external-node-a" role="button" tabindex="-1" aria-label="Host external-node-a">
              <circle cx="980" cy="90" r="${GRAPH_SATELLITE_R_VB}" fill="#9ca3af"/>
              <text x="${satelliteLabelX(980)}" y="90" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_FONT_REM}rem">external-node-a</text>
            </g>
            <g class="incident-graph-satellite" data-incident-node="external-node-b" role="button" tabindex="-1" aria-label="Host external-node-b">
              <circle cx="1100" cy="610" r="${GRAPH_SATELLITE_R_VB}" fill="#9ca3af"/>
              <text x="${satelliteLabelX(1100)}" y="610" text-anchor="start" dominant-baseline="middle" fill="#fff" font-weight="300" font-family="Inter, sans-serif" font-size="${GRAPH_SATELLITE_LABEL_FONT_REM}rem">external-node-b</text>
            </g>
            <!-- center: origin at db-core node -->
            <g class="incident-graph-db-core-hit" transform="translate(${GRAPH_CENTER_X} ${GRAPH_CENTER_Y})" data-incident-node="db-core-02.internal" role="button" tabindex="-1" aria-label="Host db-core-02.internal">
            <circle cx="0" cy="0" r="${GRAPH_CENTER_GLOW_R_VB}" fill="#030303" opacity="1" filter="url(#glow)"/>
            <circle cx="0" cy="0" r="${dbCoreRedRadiusVb}" fill="url(#incident-db-core-gradient)"/>
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
                x="-${dbCoreTapeHalfVb}"
                y="-${dbCoreTapeHalfVb}"
                width="${DB_CORE_TAPE_BOX_VB}"
                height="${DB_CORE_TAPE_BOX_VB}"
                transform="translate(${DB_CORE_TAPE_IMAGE_NUDGE_X} ${DB_CORE_TAPE_IMAGE_NUDGE_Y})"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
            <g transform="translate(-${GRAPH_LABEL_OFFSET_X_VB} 0)">
              <foreignObject x="0" y="${GRAPH_FOREIGN_OBJECT_Y_VB}" width="${GRAPH_FOREIGN_OBJECT_W_REM}rem" height="${GRAPH_FOREIGN_OBJECT_H_VB}" overflow="visible">
                <div xmlns="http://www.w3.org/1999/xhtml" class="incident-db-core-label-html">
                  <span class="incident-db-core-pill">
                    ${INCIDENT_WARN_ICON_SVG}
                    <span class="incident-db-core-pill__host">db-core-02.internal</span>
                  </span>
                </div>
              </foreignObject>
            </g>
            </g>
            </g>
          </svg>
              </div>
            </div>
              <div
                id="incident-node-popover"
                class="incident-node-popover"
                hidden
                role="dialog"
                aria-modal="true"
                aria-labelledby="incident-node-popover-title"
              >
                <div class="incident-node-popover__cap" aria-hidden="true"></div>
                <div class="incident-node-popover__surface">
                  <button
                    type="button"
                    class="incident-node-popover__toggle"
                    aria-label="Toggle issue details"
                    aria-expanded="false"
                    hidden
                  >${iconDropdownArrow.trim()}</button>
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
                        <button type="button" class="btn btn-dark incident-node-popover__cta">View Host Telemetry</button>
                        <span class="incident-node-popover__rec incident-node-popover__rec--hidden">* Highly Recommended</span>
                      </div>
                    </div>
                  </div>
                  <div class="incident-node-popover__issues-host"></div>
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

function getIncidentPopoverAnchorCircle(hitGroupEl) {
  const directCircles = hitGroupEl.querySelectorAll(':scope > circle');
  if (directCircles.length >= 2) {
    const grad = [...directCircles].find((c) => (c.getAttribute('fill') ?? '').startsWith('url('));
    if (grad) return grad;
    return directCircles[1];
  }
  return hitGroupEl.querySelector(':scope > circle');
}

/** Screen-space rect for the node disc (some browsers report 0×0 from getBBox on scaled SVG circles). */
function getIncidentPopoverAnchorRect(hitGroupEl) {
  const circle = getIncidentPopoverAnchorCircle(hitGroupEl);
  if (circle instanceof SVGCircleElement) {
    const ar = circle.getBoundingClientRect();
    if (ar.width > 0 && ar.height > 0) return ar;

    const svg = circle.ownerSVGElement;
    const ctm = circle.getScreenCTM();
    if (svg && ctm) {
      const pt = svg.createSVGPoint();
      pt.x = circle.cx.baseVal.value;
      pt.y = circle.cy.baseVal.value;
      const center = pt.matrixTransform(ctm);
      const edge = svg.createSVGPoint();
      edge.x = pt.x + circle.r.baseVal.value;
      edge.y = pt.y;
      const edgePt = edge.matrixTransform(ctm);
      const r = Math.hypot(edgePt.x - center.x, edgePt.y - center.y) || 12;
      return new DOMRect(center.x - r, center.y - r, r * 2, r * 2);
    }
  }

  const fallback = circle ?? hitGroupEl;
  return fallback.getBoundingClientRect();
}

function positionIncidentGraphPopover(popover, viewportEl, hitGroupEl) {
  const vp = viewportEl.getBoundingClientRect();
  const ar = getIncidentPopoverAnchorRect(hitGroupEl);
  const gapRem = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.625;
  const margin = gapRem;

  popover.style.visibility = 'hidden';
  popover.style.left = '-10000px';
  popover.style.top = '0';

  const popH = popover.offsetHeight;
  const popW = popover.offsetWidth;

  /** Top-left corner of the popover sits on the anchor node center (card extends down and right). */
  const nodeCenterX = ar.left + ar.width / 2 - vp.left;
  const nodeCenterY = ar.top + ar.height / 2 - vp.top;

  let left = nodeCenterX;
  left = Math.max(margin, Math.min(left, vp.width - margin - popW));

  let top = nodeCenterY;
  top = Math.max(margin, Math.min(top, vp.height - margin - popH));

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.style.transform = '';
  popover.style.visibility = '';
}

function attachIncidentGraphNodePopover(viewport) {
  const svg = viewport.querySelector('.graph-svg');
  const popover = viewport.querySelector('#incident-node-popover');
  if (!(svg instanceof SVGSVGElement) || !popover) return;

  const titleEl = popover.querySelector('.incident-node-popover__title');
  const bodyEl = popover.querySelector('.incident-node-popover__body');
  const recEl = popover.querySelector('.incident-node-popover__rec');
  const toggleEl = popover.querySelector('.incident-node-popover__toggle');
  const issuesHost = popover.querySelector('.incident-node-popover__issues-host');
  if (!(titleEl instanceof HTMLElement) || !(bodyEl instanceof HTMLElement)) return;

  popover.hidden = true;

  let openNodeKey = '';
  /** @type {SVGGElement | null} */
  let lastHitGroup = null;

  function close() {
    openNodeKey = '';
    lastHitGroup = null;
    popover.hidden = true;
    popover.classList.remove('is-issues-expanded', 'incident-node-popover--extendable');
    popover.style.left = '';
    popover.style.top = '';
    popover.style.transform = '';
    popover.style.visibility = '';
    if (issuesHost instanceof HTMLElement) issuesHost.innerHTML = '';
    if (toggleEl instanceof HTMLButtonElement) {
      toggleEl.hidden = true;
      toggleEl.setAttribute('aria-expanded', 'false');
    }
  }

  function reflowPosition() {
    if (popover.hidden || !lastHitGroup) return;
    positionIncidentGraphPopover(popover, viewport, lastHitGroup);
  }

  function canOpenMonitorFromPopover() {
    return openNodeKey === INCIDENT_NODE_POPOVER_EXTENDABLE_HOST;
  }

  function goToMonitorFromPopover() {
    if (!canOpenMonitorFromPopover()) return;
    window.location.hash = '#/monitor';
  }

  function renderPopoverTitle(nodeKey) {
    if (nodeKey === INCIDENT_NODE_POPOVER_EXTENDABLE_HOST) {
      titleEl.innerHTML = `<a href="#/monitor" class="incident-node-popover__title-link">${nodeKey}</a>`;
      return;
    }
    titleEl.textContent = nodeKey;
  }

  function open(hitGroup, nodeKey, detail) {
    openNodeKey = nodeKey;
    lastHitGroup = hitGroup;
    renderPopoverTitle(nodeKey);
    bodyEl.textContent = detail.body;
    popover.classList.toggle('incident-node-popover--critical', detail.tier === 'critical');
    popover.style.setProperty('--popover-node-core', detail.coreColor);
    recEl?.classList.toggle('incident-node-popover__rec--hidden', detail.recommendation !== 'highly');

    const canExtend = nodePopoverIsExtendable(nodeKey, detail);
    popover.classList.toggle('incident-node-popover--extendable', canExtend);
    if (issuesHost instanceof HTMLElement) {
      issuesHost.innerHTML = canExtend ? renderIncidentNodePopoverIssuesHtml(detail.issues) : '';
    }
    popover.classList.remove('is-issues-expanded');
    if (toggleEl instanceof HTMLButtonElement) {
      toggleEl.hidden = !canExtend;
      toggleEl.setAttribute('aria-expanded', 'false');
    }

    popover.hidden = false;
    positionIncidentGraphPopover(popover, viewport, hitGroup);
    requestAnimationFrame(() => reflowPosition());
  }

  popover.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const isMonitorTrigger =
      target.closest('.incident-node-popover__title-link') ||
      target.closest('.incident-node-popover__cta');
    if (!isMonitorTrigger) return;
    e.preventDefault();
    e.stopPropagation();
    goToMonitorFromPopover();
  });

  svg.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    const hit = el?.closest('[data-incident-node]');
    if (!(hit instanceof SVGGElement) || hit.closest('.graph-svg') !== svg) return;
    const nodeKey = hit.getAttribute('data-incident-node');
    if (!nodeKey) return;
    const detail = INCIDENT_GRAPH_NODE_POPOVER[nodeKey];
    if (!detail) return;
    e.stopPropagation();
    if (openNodeKey === nodeKey && !popover.hidden) {
      if (
        nodePopoverIsExtendable(nodeKey, detail) &&
        !popover.classList.contains('is-issues-expanded')
      ) {
        popover.classList.add('is-issues-expanded');
        if (toggleEl instanceof HTMLButtonElement) {
          toggleEl.setAttribute('aria-expanded', 'true');
        }
        requestAnimationFrame(() => reflowPosition());
        return;
      }
      close();
      return;
    }
    open(hit, nodeKey, detail);
  });

  toggleEl?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!popover.classList.contains('incident-node-popover--extendable')) return;
    const expanded = popover.classList.toggle('is-issues-expanded');
    if (toggleEl instanceof HTMLButtonElement) {
      toggleEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
    requestAnimationFrame(() => reflowPosition());
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

  /** Open/toggle popover for a node from non-SVG UI (node guide dropdown). */
  function openByNodeKey(nodeKey) {
    const detail = INCIDENT_GRAPH_NODE_POPOVER[nodeKey];
    if (!detail) return;

    const safeKey = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(nodeKey) : nodeKey;
    const hit = svg.querySelector(`[data-incident-node="${safeKey}"]`);
    if (!(hit instanceof SVGGElement)) return;

    if (openNodeKey === nodeKey && !popover.hidden) {
      if (
        nodePopoverIsExtendable(nodeKey, detail) &&
        !popover.classList.contains('is-issues-expanded')
      ) {
        popover.classList.add('is-issues-expanded');
        if (toggleEl instanceof HTMLButtonElement) {
          toggleEl.setAttribute('aria-expanded', 'true');
        }
        requestAnimationFrame(() => reflowPosition());
        return;
      }
      close();
      return;
    }
    open(hit, nodeKey, detail);
  }

  return { openByNodeKey, reflowPosition };
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
function attachNodeGuidePanel(wrap, { onPickNodeKey } = {}) {
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
    const rowBtn = target.closest('.node-guide-row');
    if (!rowBtn) return;
    const nodeKey = rowBtn.getAttribute('data-incident-node');
    if (nodeKey) onPickNodeKey?.(nodeKey);
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

/** Drag to pan the map; wheel / pinch zoom stays disabled. */
function enableGraphViewportPan(viewport, stage, { onPan } = {}) {
  if (!stage) return;

  viewport.classList.remove('graph-map-viewport--static');
  viewport.classList.add('is-active');

  let panX = 0;
  let panY = 0;
  /** @type {{ pointerId: number; x: number; y: number; originX: number; originY: number } | null} */
  let drag = null;

  const applyTransform = () => {
    stage.style.transform = `translate(${panX}px, ${panY}px)`;
    onPan?.();
  };

  const blockZoom = (e) => {
    e.preventDefault();
  };

  viewport.addEventListener('wheel', blockZoom, { passive: false });
  viewport.addEventListener('gesturestart', blockZoom);
  viewport.addEventListener('gesturechange', blockZoom);
  viewport.addEventListener('gestureend', blockZoom);

  const canStartPan = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.closest('#incident-node-popover')) return false;
    if (target.closest('[data-incident-node]')) return false;
    if (target.closest('.incident-db-core-pill, .incident-db-core-label-html')) return false;
    if (target.closest('button, a, input, select, textarea')) return false;
    return true;
  };

  const updatePanCursor = (target) => {
    viewport.classList.toggle('is-pan-hover', canStartPan(target));
  };

  viewport.addEventListener('pointermove', (e) => {
    if (!drag) updatePanCursor(e.target);
  });

  viewport.addEventListener('pointerleave', () => {
    viewport.classList.remove('is-pan-hover');
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !canStartPan(e.target)) return;
    viewport.classList.remove('is-pan-hover');
    drag = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      originX: panX,
      originY: panY,
    };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('is-panning');
  });

  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag = null;
    viewport.classList.remove('is-panning');
    updatePanCursor(e.target);
    try {
      viewport.releasePointerCapture(e.pointerId);
    } catch {
      /* capture already released */
    }
  };

  viewport.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    panX = drag.originX + (e.clientX - drag.x);
    panY = drag.originY + (e.clientY - drag.y);
    applyTransform();
  });

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
}

export function attachIncidentHandlers(root = document) {
  const widget = root.querySelector('.graph-widget');
  const viewport = root.querySelector('.graph-map-viewport');
  const stage = root.querySelector('.graph-map-stage');
  if (!widget || !viewport) return;

  const nodeGuideWrap = root.querySelector('.graph-dropdown-wrap--node-guide');
  const pop = attachIncidentGraphNodePopover(viewport);
  enableGraphViewportPan(viewport, stage, { onPan: () => pop?.reflowPosition?.() });

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

  attachNodeGuidePanel(nodeGuideWrap, {
    onPickNodeKey: pop?.openByNodeKey,
  });
}
