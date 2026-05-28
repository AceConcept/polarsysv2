import { shell } from '../layout.js';
import { btnIconMarkup } from '../btnIcon.js';
import iconAnomalyDb from '../icons/anomaly/db.svg?raw';
import iconAnomalySort from '../icons/anomaly/Sort.svg?raw';
import iconAnomalyView from '../icons/anomaly/View.svg?raw';

function anomalyDbIconMarkup() {
  const svg = iconAnomalyDb.trim().replace(/\s(width|height)="[^"]*"/g, '');
  return `<span class="btn-icon anomaly-db-icon" aria-hidden="true">${svg}</span>`;
}

function anomalyViewToggleIconMarkup() {
  const svg = iconAnomalyView.trim().replace(/\s(width|height)="[^"]*"/g, '');
  return `<span class="btn-icon anomaly-view-toggle-icon" aria-hidden="true">${svg}</span>`;
}

function anomalySortIconMarkup() {
  const svg = iconAnomalySort.trim().replace(/\s(width|height)="[^"]*"/g, '');
  return `<span class="btn-icon anomaly-sort-icon" aria-hidden="true">${svg}</span>`;
}

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

const RECENCY_ORDER = cards.map((c) => c.id);

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };

function sevClass(s) {
  if (s === 'critical') return 'sev-critical';
  if (s === 'high') return 'sev-high';
  return 'sev-medium';
}

function sevLabel(s) {
  if (s === 'medium') return 'Low';
  if (s === 'high') return 'Medium';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tile layout only — not reused by list view */
function renderGridCardHtml(c) {
  const inner = `
        <div class="anomaly-grid-card__top">
          <span class="anomaly-grid-card__source">
            <span class="btn btn-dark title-chip db-pill" role="presentation">${anomalyDbIconMarkup()}<span class="db-pill-host">${c.host}</span></span>
          </span>
        </div>
        <div class="anomaly-grid-card__body">
          <h3 class="anomaly-grid-card__title">#${c.id} — ${c.title}</h3>
          <p class="anomaly-grid-card__desc">${c.body}</p>
        </div>
        <div class="anomaly-grid-card__foot">
          <div class="anomaly-grid-card__foot-tags">
            <span class="btn btn-dark title-chip card-foot-chip" role="presentation"><span>#${c.id}</span></span>
            <span class="btn btn-dark title-chip card-foot-chip severity ${sevClass(c.severity)}" role="presentation"><span>${sevLabel(c.severity)}</span></span>
          </div>
          <span class="anomaly-grid-card__scan">Last Scan ${c.scan}</span>
        </div>`;
  const threatBar = `<div class="anomaly-grid-item__threat-bar ${sevClass(c.severity)}" aria-hidden="true"></div>`;
  if (c.id === '8846') {
    return `<div class="anomaly-grid-item" data-card-id="${c.id}" data-severity="${c.severity}">
      ${threatBar}
      <div role="button" tabindex="0" class="anomaly-grid-card anomaly-grid-card--incident" data-card-id="${c.id}" aria-label="Open incident: ${c.title}">${inner}</div>
    </div>`;
  }
  return `<div class="anomaly-grid-item" data-card-id="${c.id}" data-severity="${c.severity}">
      ${threatBar}
      <article class="anomaly-grid-card anomaly-grid-card--static" data-card-id="${c.id}">${inner}</article>
    </div>`;
}

/** Row layout only — separate DOM from grid tiles */
function renderListRowHtml(c) {
  const threatBar = `<div class="anomaly-list-item__threat-bar ${sevClass(c.severity)}" aria-hidden="true"></div>`;
  const inner = `
        <div class="anomaly-list-row__main">
          <h3 class="anomaly-list-row__title">#${c.id} — ${c.title}</h3>
          <p class="anomaly-list-row__desc">${c.body}</p>
        </div>
        <div class="anomaly-list-row__aside">
          <span class="anomaly-list-row__scan">Last Scan ${c.scan}</span>
          <div class="anomaly-list-row__tags">
            <span class="btn btn-dark title-chip card-foot-chip" role="presentation"><span>#${c.id}</span></span>
            <span class="btn btn-dark title-chip card-foot-chip severity ${sevClass(c.severity)}" role="presentation"><span class="severity-dot" aria-hidden="true"></span><span>${sevLabel(c.severity)}</span></span>
            <span class="btn btn-dark title-chip db-pill" role="presentation">${anomalyDbIconMarkup()}<span class="db-pill-host">${c.host}</span></span>
          </div>
        </div>`;
  if (c.id === '8846') {
    return `<div class="anomaly-list-item" data-card-id="${c.id}" data-severity="${c.severity}">
      ${threatBar}
      <div role="button" tabindex="0" class="anomaly-list-row anomaly-list-row--incident" aria-label="Open incident: ${c.title}">${inner}</div>
    </div>`;
  }
  return `<div class="anomaly-list-item" data-card-id="${c.id}" data-severity="${c.severity}">
      ${threatBar}
      <article class="anomaly-list-row anomaly-list-row--static">${inner}</article>
    </div>`;
}

function sortAnomalyItems(items, mode) {
  const list = [...items];
  if (mode === 'level') {
    list.sort((a, b) => {
      const ra = SEVERITY_RANK[a.dataset.severity] ?? 99;
      const rb = SEVERITY_RANK[b.dataset.severity] ?? 99;
      if (ra !== rb) return ra - rb;
      return RECENCY_ORDER.indexOf(a.dataset.cardId) - RECENCY_ORDER.indexOf(b.dataset.cardId);
    });
    return list;
  }
  list.sort(
    (a, b) => RECENCY_ORDER.indexOf(a.dataset.cardId) - RECENCY_ORDER.indexOf(b.dataset.cardId),
  );
  return list;
}

function applyAnomalySort(root, mode) {
  const grid = root.querySelector('.anomaly-grid');
  const list = root.querySelector('.anomaly-list');
  for (const container of [grid, list]) {
    if (!container) continue;
    const sorted = sortAnomalyItems(Array.from(container.children), mode);
    for (const el of sorted) container.appendChild(el);
  }
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
          <button type="button" class="btn btn-dark anomaly-view-toggle" data-anomaly-view="list">${anomalyViewToggleIconMarkup()}<span class="anomaly-view-toggle__label">View (Card)</span></button>
          <div class="graph-dropdown-wrap graph-dropdown-wrap--anomaly-sort">
            <button
              type="button"
              class="btn btn-dark graph-dropdown"
              aria-label="Sort anomalies"
              aria-haspopup="menu"
              aria-expanded="false"
            >${anomalySortIconMarkup()}<span data-anomaly-sort-label>Sort (Recency)</span></button>
            <div class="graph-dropdown-menu" role="menu" aria-label="Sort options" hidden>
              <button type="button" class="graph-dropdown-menu-item is-selected" role="menuitemradio" data-anomaly-sort="recency" aria-checked="true">Recency</button>
              <button type="button" class="graph-dropdown-menu-item" role="menuitemradio" data-anomaly-sort="level" aria-checked="false">Level</button>
            </div>
          </div>
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
    const viewToggleLabel = rowViewBtn.querySelector('.anomaly-view-toggle__label');

    const setAnomalyViewToggleLabel = (showList) => {
      if (viewToggleLabel) {
        viewToggleLabel.textContent = showList ? 'View (Row)' : 'View (Card)';
      }
    };

    rowViewBtn.addEventListener('click', () => {
      const showList = panelList.hidden;

      panelGrid.hidden = showList;
      panelList.hidden = !showList;
      panelGrid.setAttribute('aria-hidden', showList ? 'true' : 'false');
      panelList.setAttribute('aria-hidden', showList ? 'false' : 'true');

      setAnomalyViewToggleLabel(showList);
    });
  }

  const sortWrap = root.querySelector('.graph-dropdown-wrap--anomaly-sort');
  const sortBtn = sortWrap?.querySelector('.graph-dropdown');
  const sortMenu = sortWrap?.querySelector('.graph-dropdown-menu');
  const sortLabel = root.querySelector('[data-anomaly-sort-label]');
  const sortItems = sortMenu ? Array.from(sortMenu.querySelectorAll('.graph-dropdown-menu-item')) : [];

  function closeSortMenu() {
    if (!sortBtn || !sortMenu) return;
    sortBtn.setAttribute('aria-expanded', 'false');
    sortMenu.hidden = true;
    sortWrap?.classList.remove('is-open');
  }

  function openSortMenu() {
    if (!sortBtn || !sortMenu) return;
    sortBtn.setAttribute('aria-expanded', 'true');
    sortMenu.hidden = false;
    sortWrap?.classList.add('is-open');
  }

  if (sortBtn && sortMenu) {
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sortMenu.hidden) openSortMenu();
      else closeSortMenu();
    });

    sortMenu.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const item = target.closest('.graph-dropdown-menu-item');
      if (!item) return;

      for (const menuItem of sortItems) {
        menuItem.classList.remove('is-selected');
        menuItem.setAttribute('aria-checked', 'false');
      }
      item.classList.add('is-selected');
      item.setAttribute('aria-checked', 'true');

      const sortKey = item.dataset.anomalySort === 'level' ? 'level' : 'recency';
      if (sortLabel) {
        sortLabel.textContent = sortKey === 'level' ? 'Sort (Level)' : 'Sort (Recency)';
      }
      applyAnomalySort(root, sortKey);
      closeSortMenu();
    });

    document.addEventListener('pointerdown', (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (sortWrap?.contains(target)) return;
      closeSortMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSortMenu();
    });
  }
}
