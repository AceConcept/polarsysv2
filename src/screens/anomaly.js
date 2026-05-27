import { shell } from '../layout.js';
import { btnIconMarkup } from '../btnIcon.js';

const cards = [
  {
    id: '8846',
    host: 'db-core-02.internal',
    title: 'DNS Loop & Port Scan Correlation',
    body: 'Recursive DNS requests aligned with outbound port scans (TTP:443). Correlation suggests automated reconnaissance.',
    severity: 'critical',
    scan: '3:00 UTC',
  },
  {
    id: '8851',
    host: 'db-replica-east.internal',
    title: 'Replication Delay & Integrity Mismatch',
    body: 'Streaming replication lag reached 14s with hash mismatch on hot row set—possible silent corruption or network partition.',
    severity: 'high',
    scan: '2:47 UTC',
  },
  {
    id: '8855',
    host: 'db-analytics.internal',
    title: 'Excessive Query Execution Time',
    body: 'Average latency exceeded 8.7s on table user_metrics during peak batch window.',
    severity: 'medium',
    scan: '2:12 UTC',
  },
  {
    id: '8850',
    host: 'db-core-02.internal',
    title: 'Unauthorized Query Access',
    body: 'Service account svc_report queried finance_ledger outside approved maintenance window.',
    severity: 'critical',
    scan: '1:58 UTC',
  },
  {
    id: '8842',
    host: 'db-cache.internal',
    title: 'Anomalous Connection Burst',
    body: 'Inbound connection rate from api-core pool spiked 420% vs 7-day baseline.',
    severity: 'high',
    scan: '1:30 UTC',
  },
  {
    id: '8839',
    host: 'db-core-02.internal',
    title: 'TLS Certificate Pin Mismatch',
    body: 'Client handshake observed with unexpected intermediate CA chain on port 5432.',
    severity: 'medium',
    scan: '1:05 UTC',
  },
  {
    id: '8834',
    host: 'db-shard-west.internal',
    title: 'Deadlock Storm on Shard Partition',
    body: 'Repeated deadlocks on orders_shard_03 exceeded threshold—12 cycles in 90s with hot-row contention.',
    severity: 'high',
    scan: '0:42 UTC',
  },
  {
    id: '8831',
    host: 'db-audit.internal',
    title: 'Bulk Export Without RBAC Approval',
    body: 'Unexpected SELECT * on audit_events by role ext_reader—export size 2.1GB with no ticket reference.',
    severity: 'critical',
    scan: '0:28 UTC',
  },
  {
    id: '8827',
    host: 'db-replica-east.internal',
    title: 'WAL Replay Stall Detected',
    body: 'Standby replay paused for 22s during failover probe—possible disk IO saturation on replica volume.',
    severity: 'medium',
    scan: '0:15 UTC',
  },
];

function sevClass(s) {
  if (s === 'critical') return 'sev-critical';
  if (s === 'high') return 'sev-high';
  return 'sev-medium';
}

function sevLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tile layout only — not reused by list view */
function renderGridCardHtml(c) {
  const inner = `
        <div class="anomaly-grid-card__top">
          <span class="anomaly-grid-card__source">
            <span class="btn btn-dark title-chip db-pill" role="presentation">${btnIconMarkup()}<span class="db-pill-host">${c.host}</span></span>
          </span>
        </div>
        <div class="anomaly-grid-card__body">
          <h3 class="anomaly-grid-card__title">#${c.id} — ${c.title}</h3>
          <p class="anomaly-grid-card__desc">${c.body}</p>
        </div>
        <div class="anomaly-grid-card__foot">
          <div class="anomaly-grid-card__foot-tags">
            <span class="btn btn-dark title-chip card-foot-chip" role="presentation">${btnIconMarkup()}<span>#${c.id}</span></span>
            <span class="btn btn-dark title-chip card-foot-chip severity ${sevClass(c.severity)}" role="presentation">${btnIconMarkup()}<span>${sevLabel(c.severity)}</span></span>
          </div>
          <span class="anomaly-grid-card__scan">Last Scan ${c.scan}</span>
        </div>`;
  const threatBar = `<div class="anomaly-grid-item__threat-bar ${sevClass(c.severity)}" aria-hidden="true"></div>`;
  if (c.id === '8846') {
    return `<div class="anomaly-grid-item">
      ${threatBar}
      <div role="button" tabindex="0" class="anomaly-grid-card anomaly-grid-card--incident" data-card-id="${c.id}" aria-label="Open incident: ${c.title}">${inner}</div>
    </div>`;
  }
  return `<div class="anomaly-grid-item">
      ${threatBar}
      <article class="anomaly-grid-card anomaly-grid-card--static" data-card-id="${c.id}">${inner}</article>
    </div>`;
}

/** Row layout only — separate DOM from grid tiles */
function renderListRowHtml(c) {
  const inner = `
        <div class="anomaly-list-row__main">
          <h3 class="anomaly-list-row__title">#${c.id} — ${c.title}</h3>
          <p class="anomaly-list-row__desc">${c.body}</p>
        </div>
        <div class="anomaly-list-row__aside">
          <span class="anomaly-list-row__scan">Last Scan ${c.scan}</span>
          <div class="anomaly-list-row__tags">
            <span class="btn btn-dark title-chip card-foot-chip" role="presentation">${btnIconMarkup()}<span>#${c.id}</span></span>
            <span class="btn btn-dark title-chip card-foot-chip severity ${sevClass(c.severity)}" role="presentation">${btnIconMarkup()}<span class="severity-dot" aria-hidden="true"></span><span>${sevLabel(c.severity)}</span></span>
            <span class="btn btn-dark title-chip db-pill" role="presentation">${btnIconMarkup()}<span class="db-pill-host">${c.host}</span></span>
          </div>
        </div>`;
  if (c.id === '8846') {
    return `<div role="button" tabindex="0" class="anomaly-list-row anomaly-list-row--incident" data-card-id="${c.id}" aria-label="Open incident: ${c.title}">${inner}</div>`;
  }
  return `<article class="anomaly-list-row anomaly-list-row--static" data-card-id="${c.id}">${inner}</article>`;
}

export function renderAnomaly() {
  const gridHtml = cards.map((c) => renderGridCardHtml(c)).join('');
  const listHtml = cards.map((c) => renderListRowHtml(c)).join('');

  const content = `
    <section>
      <div class="page-head page-head-anomaly">
        <div class="page-head-anomaly__row">
          <div class="page-title-lead">
            <div class="page-head-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span data-utc-live>00:00:00 UTC</span>
            </div>
            <div class="page-title-lead__main">
              <h1 class="page-title page-title-anomaly">Anomaly Detection</h1>
              <button type="button" class="btn btn-dark tag" aria-label="Model: Leo 2.0Y">Leo 2.0Y</button>
            </div>
          </div>
          <div class="page-head-anomaly__aside">
            <button type="button" class="btn btn-dark page-title-cta">${btnIconMarkup()}<span>Perform Scan</span></button>
          </div>
        </div>
      </div>
      <div class="search-row">
        <div class="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" placeholder="Databases" autocomplete="off" />
        </div>
        <div class="view-toggles" role="group" aria-label="View controls">
          <button type="button" class="btn btn-dark" data-anomaly-view="list" aria-pressed="false">${btnIconMarkup()}<span>Row View</span></button>
          <button type="button" class="btn btn-dark">${btnIconMarkup()}<span>Filters</span></button>
          <button type="button" class="btn btn-dark">${btnIconMarkup()}<span>Sort</span></button>
        </div>
      </div>
      <div class="anomaly-views">
        <div class="anomaly-view anomaly-view--grid" data-anomaly-view-panel="grid" aria-hidden="false">
          <div class="anomaly-grid">${gridHtml}</div>
        </div>
        <div class="anomaly-view anomaly-view--list" data-anomaly-view-panel="list" aria-hidden="true" hidden>
          <div class="anomaly-list">${listHtml}</div>
        </div>
      </div>
    </section>
  `;

  return shell({
    crumb: { mode: 'standard', trail: 'Anomaly Detection' },
    content,
    activeNav: 'network',
  });
}

export function attachAnomalyHandlers(root) {
  const goIncident = () => {
    window.location.hash = '#/incident';
  };

  root.querySelectorAll('.anomaly-grid-card--incident, .anomaly-list-row--incident').forEach((el) => {
    el.addEventListener('click', goIncident);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goIncident();
      }
    });
  });

  const panelGrid = root.querySelector('[data-anomaly-view-panel="grid"]');
  const panelList = root.querySelector('[data-anomaly-view-panel="list"]');
  const rowViewBtn = root.querySelector('[data-anomaly-view="list"]');

  if (panelGrid && panelList && rowViewBtn) {
    rowViewBtn.addEventListener('click', () => {
      const showList = panelList.hidden;

      panelGrid.hidden = showList;
      panelList.hidden = !showList;
      panelGrid.setAttribute('aria-hidden', showList ? 'true' : 'false');
      panelList.setAttribute('aria-hidden', showList ? 'false' : 'true');

      rowViewBtn.classList.toggle('active', showList);
      rowViewBtn.setAttribute('aria-pressed', showList ? 'true' : 'false');
    });
  }
}
