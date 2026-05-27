/**
 * Drop into AceConcept/polar-sys as src/parentBridge.js
 * Wire from main.js (see POLAR_SYS_PARENT_SYNC.md).
 */

export const PARENT_STEP_CHANGED = 'atencium-step-changed'
export const PARENT_SET_STEP = 'atencium-set-step'
export const PARENT_REQUEST_STEP = 'atencium-request-step'

const ROUTE_TO_STEP = { anomaly: 1, incident: 2, monitor: 3 }
const STEP_TO_ROUTE = { 1: 'anomaly', 2: 'incident', 3: 'monitor' }

let lastNotifiedRoute = ''

export function notifyParentRoute(view) {
  if (window.parent === window) return
  const route = view in ROUTE_TO_STEP ? view : 'anomaly'
  if (route === lastNotifiedRoute) return
  lastNotifiedRoute = route
  const step = ROUTE_TO_STEP[route]
  window.parent.postMessage(
    { type: PARENT_STEP_CHANGED, step, route, hash: `#/${route}` },
    '*',
  )
}

export function attachParentBridge(getView, navigateToRoute) {
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const data = event.data
    if (!data || typeof data !== 'object') return

    if (data.type === PARENT_SET_STEP) {
      const n = Number(data.step)
      const route =
        typeof data.route === 'string'
          ? data.route
          : STEP_TO_ROUTE[n]
      if (route && route in ROUTE_TO_STEP) {
        navigateToRoute(route)
      }
      return
    }

    if (data.type === PARENT_REQUEST_STEP) {
      notifyParentRoute(getView())
    }
  })
}
