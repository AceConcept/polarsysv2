/**
 * Canvas scaling — keep DESIGN_REM_* in sync with `--canvas-w` / `--canvas-h` in styles.css.
 * Design token: 1rem = 16px at scale 1 → CANVAS_W/H = DESIGN_REM_* × DESIGN_ROOT_PX.
 */

export const DESIGN_ROOT_PX = 16;
export const DESIGN_REM_W = 160;
export const DESIGN_REM_H = 90;

export const CANVAS_W = DESIGN_REM_W * DESIGN_ROOT_PX;
export const CANVAS_H = DESIGN_REM_H * DESIGN_ROOT_PX;

/** Stable viewport for scale math (avoid visualViewport / scrollbar flicker). */
export function getScaleViewportSize() {
  if (typeof window === 'undefined') {
    return { width: CANVAS_W, height: CANVAS_H };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/** Contain scale: fit full CANVAS_W×CANVAS_H design inside the viewport (may letterbox). */
export function getCanvasContainScale(width, height) {
  const sx = width / CANVAS_W;
  const sy = height / CANVAS_H;
  return Math.min(sx, sy);
}
