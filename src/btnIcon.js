import iconGrain from './icons/button-icons/grain.svg?raw';

/** Grain icon markup for `.btn` controls (22px @ 16px root via `.btn-icon` CSS). */
export function btnIconMarkup() {
  return `<span class="btn-icon" aria-hidden="true">${iconGrain.trim()}</span>`;
}
