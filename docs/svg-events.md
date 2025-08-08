# svg-events.js

Attach rich mouse interactions to static SVG state diagrams (e.g., Mermaid-exported). It wires listeners to nodes, edges, and start/end markers and dispatches simple, consistent custom events you can observe from your app.

File: `svg-events.js`
Public API: `window.SVGEvents = { attachTo(svg, options), autoInit() }`

## Features
- __Zero dependencies__
- __Auto-init__ on `DOMContentLoaded` for all `svg.statediagram`
- __Custom events__ (bubbling): `svgitem:mouseenter`, `svgitem:mouseleave`, `svgitem:click`, `svgitem:dblclick`, `svgitem:contextmenu`, `svgitem:mousemove`
- __Heuristics__ tuned for Mermaid state diagrams
- __Keyboard focusable__ targets (adds `tabindex="0"` when missing)
- __Optional inline debug panel__ to visualize events

## How it works
The script scans a target `<svg>` for typical Mermaid groupings and attaches listeners:
- Nodes: `g.nodes > g.node`
- Edges: `g.edgePaths > path.transition`
- Start/End: `g.nodes circle.state-start` and `g.nodes circle.state-end`

Each target is tagged with `data-svg-kind` set to one of `node | edge | start | end` and made focusable if no `tabindex` exists.

On interaction it dispatches a bubbling `CustomEvent` named `svgitem:<event>` from the concrete SVG element. The event `.detail` is:
```ts
interface SvgItemDetail {
  kind: 'node' | 'edge' | 'start' | 'end';
  id: string | null;           // from @id on the element or nearest ancestor with id
  element: Element;            // the concrete SVG element
  originalEvent: Event;        // the native mouse event
}
```
 
For thin edge paths, the library builds an invisible, wider overlay "hitbox" path (class: `edge-hitbox`) positioned directly above each edge to improve pointer targeting. Listeners are attached to the overlay, but events are dispatched as if they originated from the original edge element. You can control the overlay width via `edgeHitboxWidth` in `options`.

## Public API
### `attachTo(svgEl: SVGElement, options?: Options)`
Attach interactions to a single `<svg>`.

### `autoInit()`
Auto-attaches to all `svg.statediagram` on the page. Called automatically on load.

### Options
```ts
interface Options {
  preventContextMenu?: boolean; // default: true
  trackMouseMove?: boolean;     // default: false (adds svgitem:mousemove when true)
  includeKinds?: Array<'node' | 'edge' | 'start' | 'end'> | null; // default: null = all
  edgeHitboxWidth?: number;     // default: 14 (px) - width of invisible edge overlay for easier hit-testing
}
```

## Events
The following custom events bubble from the interacted element up through the `<svg>` and `document`:
- `svgitem:mouseenter`
- `svgitem:mouseleave`
- `svgitem:click`
- `svgitem:dblclick`
- `svgitem:contextmenu`
- `svgitem:mousemove` (enable with `trackMouseMove: true`)

Example listener:
```js
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.querySelector('svg.statediagram');
  if (!svg) return;

  svg.addEventListener('svgitem:click', (e) => {
    const { kind, id, element, originalEvent } = e.detail;
    console.log('[CLICK]', kind, id, element, originalEvent);
  });
});
```

## Installation
### As a plain script (UMD-lite)
```html
<script src="./svg-events.js"></script>
```
The script will:
- Expose `window.SVGEvents`
- Auto-run `autoInit()` on load
- Install a small inline event log panel (bottom-right) for quick debugging

### As an ES module
The file ships as an IIFE/UMD-lite and attaches to `window`. If you want ESM, you can still `import` it as a side effect:
```js
import './svg-events.js';
// then use window.SVGEvents
```

## Usage examples
### 1) Auto-init with Mermaid diagrams
Ensure your Mermaid-rendered SVG has the `statediagram` class (Mermaid already does this in most themes):
```html
<svg class="statediagram" ...> ... </svg>
```
No code required—events are attached automatically on load.

### 2) Manual attach with options
```js
document.addEventListener('DOMContentLoaded', () => {
  // Find an SVG to attach to (not auto-detected)
  const svg = document.querySelector('svg#my-custom-diagram');
  if (!svg) return;
  
  // Attach with options
  window.SVGEvents.attachTo(svg, {
    preventContextMenu: false, // allow native context menu
    trackMouseMove: true,      // enable mousemove events
    includeKinds: ['node']     // only attach to nodes (not edges/start/end)
  });
});
```

## Notes
- The library is designed to work with Mermaid's state and flowchart diagrams.
- It attaches both mouse and keyboard interaction handlers.
- The library sets `tabindex="0"` on interactive elements that lack it, enabling keyboard focus.
- Visual effects are provided by the companion `svg-animations.js` library which listens to events from this library.

## See also
- `svg-animations.js` - Provides visual effects and animations based on events from this library
