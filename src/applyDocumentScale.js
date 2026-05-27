import { CANVAS_H, CANVAS_W, DESIGN_ROOT_PX } from './canvasScale.js';

const SCALE_ATTR = 'data-polar-scale';
const SCALED_CLASS = 'polar-document-scaled';

/**
 * Document-level rem scaling: html font-size = DESIGN_ROOT_PX × scale.
 * Body is sized to the viewport so the shell fills the window.
 */
export function applyDocumentScale(scale, viewport) {
  if (typeof document === 'undefined') return;

  const rootPx = DESIGN_ROOT_PX * scale;
  const contentH = CANVAS_H * scale;

  const html = document.documentElement;
  html.style.fontSize = `${rootPx}px`;
  html.style.scrollbarGutter = 'stable';
  html.setAttribute(SCALE_ATTR, String(scale));
  html.classList.add(SCALED_CLASS);

  const body = document.body;
  body.style.width = `${viewport.width}px`;
  body.style.minWidth = `${viewport.width}px`;
  body.style.height = `${Math.max(contentH, viewport.height)}px`;
  body.style.minHeight = `${viewport.height}px`;
  body.style.margin = '0';
  body.style.overflowX = 'auto';
  body.style.overflowY = 'auto';
}

export function resetDocumentScale() {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  html.style.fontSize = '';
  html.style.scrollbarGutter = '';
  html.removeAttribute(SCALE_ATTR);
  html.classList.remove(SCALED_CLASS);

  const body = document.body;
  body.style.width = '';
  body.style.minWidth = '';
  body.style.height = '';
  body.style.minHeight = '';
  body.style.margin = '';
  body.style.overflowX = '';
  body.style.overflowY = '';
}
