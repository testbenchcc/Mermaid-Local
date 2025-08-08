# svg-interactions.js

Attach rich mouse interactions to static SVG state diagrams (e.g., Mermaid-exported). It wires listeners to nodes, edges, and start/end markers and dispatches simple, consistent custom events you can observe from your app.

File: `svg-interactions.js`
Public API: `window.SVGInteractions = { attachTo(svg, options), autoInit() }`

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
<script src="./svg-interactions.js"></script>
```
The script will:
- Expose `window.SVGInteractions`
- Auto-run `autoInit()` on load
- Install a small inline event log panel (bottom-right) for quick debugging

### As an ES module
The file ships as an IIFE/UMD-lite and attaches to `window`. If you want ESM, you can still `import` it as a side effect:
```js
import './svg-interactions.js';
// then use window.SVGInteractions
```

## Usage examples
### 1) Auto-init with Mermaid diagrams
Ensure your Mermaid-rendered SVG has the `statediagram` class (Mermaid already does this in most themes):
```html
<svg class="statediagram" ...> ... </svg>
```
No code required—interactions are attached automatically on load.

### 2) Manual attach with options
```js
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.querySelector('#my-state-diagram');
  window.SVGInteractions.attachTo(svg, {
    preventContextMenu: true,
    trackMouseMove: false,
    includeKinds: ['node', 'edge']
  });
});
```

### 3) Delegated listeners at the document level
Because events bubble, you can listen at the document or container level:
```js
document.addEventListener('svgitem:contextmenu', (e) => {
  const { kind, id } = e.detail;
  // show custom menu, analytics, etc.
});
```

### 4) Dynamic SVGs (re-rendered or replaced)
If you replace the `<svg>` at runtime (e.g., SPA route change), call `attachTo()` again for the new element:
```js
const container = document.getElementById('diagram');
container.innerHTML = mermaidRenderedSvgString; // your render output
const svg = container.querySelector('svg');
window.SVGInteractions.attachTo(svg);
```

## Accessibility notes
- The library sets `tabindex="0"` on interactive elements that lack it, enabling keyboard focus.
- You can style focus/hover via the built-in helper style or your own CSS (targets `data-svg-kind`).

## Styling hooks
A lightweight style block is injected (once) to make interactions visible while developing. You can override it in your CSS:
```css
[data-svg-kind='node']:focus,
[data-svg-kind='node']:hover { outline: 1px dashed #81b1db; }
[data-svg-kind='edge']:focus,
[data-svg-kind='edge']:hover,
[data-svg-kind='edge'][data-svg-hover='1'] { filter: drop-shadow(0 0 1px #81b1db); }
[data-svg-kind='start']:focus,
[data-svg-kind='start']:hover,
[data-svg-kind='end']:focus,
[data-svg-kind='end']:hover { stroke: #81b1db !important; }
```

Note: When using edge hitboxes, the original edge temporarily receives `data-svg-hover="1"` during pointer hover over the overlay, enabling consistent visual feedback.

## Integration tips
- __Frameworks (React/Vue/Svelte)__: attach listeners in the component mount hook and re-run `attachTo()` after the SVG is inserted into the DOM.
- __Performance__: avoid heavy work in high-frequency events like `svgitem:mousemove` unless necessary.
- __Filtering__: use `includeKinds` to limit which targets get listeners.
- __Right-click__: default behavior prevents the native context menu; set `preventContextMenu: false` to restore it.

## Troubleshooting
- Ensure your SVG structure matches Mermaid’s typical groups/classes listed above. If using a different generator, adjust CSS selectors in `attachTo()` accordingly.
- Verify the SVG is in the DOM before calling `attachTo()`.
- Use the inline event panel to confirm events are firing; check the browser console for the “Inline event panel ready.” message.

## License
Same license as this repository. If unspecified, assume MIT.
