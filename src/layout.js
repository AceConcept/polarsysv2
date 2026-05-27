import iconHome from './icons/home.svg?raw';
import iconIncidentReport from './icons/incident-report.svg?raw';
import iconNetworkManager from './icons/network-manager.svg?raw';
import iconAuditNotes from './icons/audit-notes.svg?raw';
import iconCompliance from './icons/compliance.svg?raw';
import iconSettings from './icons/settings.svg?raw';
import iconContactUs from './icons/contact-us.svg?raw';
import iconDocumentation from './icons/documentation.svg?raw';

const navSvg = (svg) => svg.trim();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Shown in the first segment (full product line); incident view truncates in the UI. */
const TOPBAR_ENGINE_LEAD = 'Network Monitoring';

function leadTruncated(lead) {
  const t = String(lead);
  if (t.length <= 10) return t;
  return `${t.slice(0, 10)}...`;
}

/**
 * Breadcrumb: `string` (legacy "A / B") or
 * - `{ mode: 'standard', trail }` — full engine lead + `trail` (e.g. Anomaly Detection, monitor)
 * - `{ mode: 'incident', caseTitle }` — truncated lead (hover) + link to anomaly + case title
 * - `{ mode: 'incidentSubpage', caseTitle, pageTitle }` — incident trail + current subpage
 */
function formatCrumb(crumb) {
  if (crumb && typeof crumb === 'object' && 'mode' in crumb) {
    if (crumb.mode === 'incident') {
      const short = leadTruncated(TOPBAR_ENGINE_LEAD);
      return `
<nav class="topbar-breadcrumb" aria-label="Breadcrumb">
  <ol class="topbar-breadcrumb__list">
    <li class="topbar-breadcrumb__item">
      <span class="crumb-segment crumb-segment--engine crumb-segment--trunc" title="${escapeHtml(
        TOPBAR_ENGINE_LEAD,
      )}">${escapeHtml(short)}</span>
    </li>
    <li class="topbar-breadcrumb__sep" aria-hidden="true">/</li>
    <li class="topbar-breadcrumb__item">
      <a class="crumb-segment crumb-segment--link" href="#/anomaly">Anomaly Detection</a>
    </li>
    <li class="topbar-breadcrumb__sep" aria-hidden="true">/</li>
    <li class="topbar-breadcrumb__item" aria-current="page">
      <span class="crumb-segment">${escapeHtml(String(crumb.caseTitle))}</span>
    </li>
  </ol>
</nav>`.trim();
    }
    if (crumb.mode === 'incidentSubpage') {
      const short = leadTruncated(TOPBAR_ENGINE_LEAD);
      return `
<nav class="topbar-breadcrumb" aria-label="Breadcrumb">
  <ol class="topbar-breadcrumb__list">
    <li class="topbar-breadcrumb__item">
      <span class="crumb-segment crumb-segment--engine crumb-segment--trunc" title="${escapeHtml(
        TOPBAR_ENGINE_LEAD,
      )}">${escapeHtml(short)}</span>
    </li>
    <li class="topbar-breadcrumb__sep" aria-hidden="true">/</li>
    <li class="topbar-breadcrumb__item">
      <a class="crumb-segment crumb-segment--link" href="#/anomaly">Anomaly Detection</a>
    </li>
    <li class="topbar-breadcrumb__sep" aria-hidden="true">/</li>
    <li class="topbar-breadcrumb__item">
      <a class="crumb-segment crumb-segment--link" href="#/incident">${escapeHtml(String(crumb.caseTitle))}</a>
    </li>
    <li class="topbar-breadcrumb__sep" aria-hidden="true">/</li>
    <li class="topbar-breadcrumb__item" aria-current="page">
      <span class="crumb-segment">${escapeHtml(String(crumb.pageTitle))}</span>
    </li>
  </ol>
</nav>`.trim();
    }
    if (crumb.mode === 'standard') {
      return formatStandardBreadcrumb(escapeHtml(TOPBAR_ENGINE_LEAD), escapeHtml(String(crumb.trail || '')));
    }
  }
  const raw = String(crumb);
  const m = raw.match(/^(.+?)\s*\/\s*(.+)$/);
  if (m) {
    return formatStandardBreadcrumb(escapeHtml(m[1].trim()), escapeHtml(m[2].trim()));
  }
  return `<span class="crumb crumb-plain">${escapeHtml(raw)}</span>`;
}

function formatStandardBreadcrumb(leadHtml, trailHtml) {
  return `
<nav class="topbar-breadcrumb" aria-label="Breadcrumb">
  <ol class="topbar-breadcrumb__list">
    <li class="topbar-breadcrumb__item">
      <span class="crumb-segment crumb-segment--engine">${leadHtml}</span>
    </li>
    <li class="topbar-breadcrumb__sep" aria-hidden="true">/</li>
    <li class="topbar-breadcrumb__item" aria-current="page">
      <span class="crumb-segment crumb-segment--current">${trailHtml}</span>
    </li>
  </ol>
</nav>`.trim();
}

export function sidebar(active = 'network') {
  /** Primary + footer sidebar entries (same control semantics everywhere). */
  const sidebarNavButton = (ic, label, key) => {
    const isActive = active === key;
    const activeCls = isActive ? ' active' : '';
    const ariaCur = isActive ? ' aria-current="page"' : '';
    return `<button type="button" class="nav-item${activeCls}"${ariaCur}>${ic}<span class="nav-item-label">${label}</span></button>`;
  };

  /** Only sidebar navigation target: return to Anomaly Detection. Same markup on every page. */
  const networkMonitorLink = (ic, label, key) => {
    const isActive = active === key;
    const activeCls = isActive ? ' active' : '';
    const ariaCur = isActive ? ' aria-current="page"' : '';
    return `<a class="nav-item${activeCls}" href="#/anomaly"${ariaCur}>${ic}<span class="nav-item-label">${label}</span></a>`;
  };

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon" aria-hidden="true"></div>
        <span class="brand-name">administrator</span>
      </div>
      <nav class="nav-primary" aria-label="Primary">
        ${sidebarNavButton(navSvg(iconHome), 'Home', 'home')}
        ${sidebarNavButton(navSvg(iconIncidentReport), 'Incident Reports', 'incidents')}
        ${networkMonitorLink(navSvg(iconNetworkManager), 'Network Monitoring', 'network')}
        ${sidebarNavButton(navSvg(iconAuditNotes), 'Audit Logs', 'audit')}
        ${sidebarNavButton(navSvg(iconCompliance), 'Compliance Dashboard', 'compliance')}
        ${sidebarNavButton(navSvg(iconSettings), 'Settings', 'settings')}
      </nav>
      <div class="sidebar-footer">
        <nav class="nav-footer" aria-label="Secondary">
          ${sidebarNavButton(navSvg(iconContactUs), 'Contact Us', 'contact')}
          ${sidebarNavButton(navSvg(iconDocumentation), 'Documentation', 'docs')}
        </nav>
        <div class="legal">
          <span class="legal-link">Changelog</span>
          <span class="legal-dash" aria-hidden="true"></span>
          <span class="legal-link">Privacy</span>
          <span class="legal-dash" aria-hidden="true"></span>
          <span class="legal-link">Terms</span>
        </div>
      </div>
    </aside>
  `;
}

export function topbar(crumbText) {
  return `
    <header class="topbar">
      <div class="topbar-left">
        <button type="button" class="menu-btn" aria-label="Menu">
          <span class="menu-btn-square" aria-hidden="true"></span>
          <svg class="menu-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        ${formatCrumb(crumbText)}
      </div>
    </header>
  `;
}

export function shell({ crumb, content, activeNav = 'network' }) {
  return `
    <div class="shell">
      ${sidebar(activeNav)}
      <div class="main-col">
        <div class="v2-wrapper">
          ${topbar(crumb)}
          <div class="main-body">
            <div class="content-scroll">${content}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
