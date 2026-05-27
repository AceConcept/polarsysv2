# polar-sys → waypoint parent sync

Waypoint already listens for iframe messages and updates the navbar/sidebar when the embed reports a step change. **polar-sys must notify the parent** when its hash route changes (`#/anomaly`, `#/incident`, `#/monitor`).

---

## Message protocol

| Direction | `type` | Payload | Purpose |
|-----------|--------|---------|---------|
| iframe → parent | `atencium-step-changed` | `{ step: 1..3, route?: 'anomaly' \| 'incident' \| 'monitor', hash?: '#/…' }` | User changed view inside polar-sys |
| parent → iframe | `atencium-set-step` | `{ step: 1..3, route?: … }` | Shell forces a view |
| parent → iframe | `atencium-request-step` | none | Shell asks for current view (polled every 400ms) |

Waypoint maps routes:

| Step | polar-sys hash |
|------|----------------|
| 1 | `#/anomaly` |
| 2 | `#/incident` |
| 3 | `#/monitor` |

---

## Changes in [AceConcept/polar-sys](https://github.com/AceConcept/polar-sys)

Copy `integrations/polar-sys/parentBridge.js` → `src/parentBridge.js` in the polar-sys repo.

### Update `src/main.js`

Add import:

```js
import { attachParentBridge, notifyParentRoute } from './parentBridge.js';
```

After `currentView()` is defined, attach the bridge once in `init()`:

```js
attachParentBridge(currentView, (route) => {
  window.location.hash = `#/${route}`;
});
```

At the **end** of `render()` (after handlers attach), notify parent:

```js
notifyParentRoute(view);
```

`render()` already runs on `hashchange`, so in-app navigation (Anomaly card → incident, Host Telemetry → monitor) will sync the waypoint shell automatically.

---

## Deploy

1. Commit and push polar-sys, redeploy [polar-sys.vercel.app](https://polar-sys.vercel.app).
2. Hard-refresh the waypoint app.

## Verify

1. Open waypoint with the embed on step 1 (Anomaly).
2. Inside the iframe, open incident (e.g. Anomaly Detection card) → shell should move to step 2.
3. Click **View Host Telemetry** → shell should move to step 3.
4. Change step in the waypoint navbar → iframe should follow (already wired).

---

## Reference copy in this repo

- `integrations/polar-sys/parentBridge.js` — file to copy into polar-sys
- `src/store/stageEmbedBridge.ts` — parent listener + `flowStepIdFromEmbedMessage`
