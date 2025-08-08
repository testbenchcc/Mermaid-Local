/*
  SVG Events for Mermaid-exported state diagrams (and similar static SVGs)
  - Attaches mouse and click interactions to nodes, edges, start/end points
  - Dispatches custom events on both the target element and the parent <svg>
  - No external dependencies
  - ONLY CONTAINS EVENT HANDLING, NO ANIMATIONS (see svg-animations.js for animations)

  Usage:
    // Optionally, just include this file; it auto-initializes for all SVGs with class 'statediagram'
    // Listen for dispatched events (examples):
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('svg.statediagram').forEach(svg => {
        svg.addEventListener('svgitem:click', (e) => {
          // e.detail: { kind, id, element, originalEvent }
          // console.log('[CLICK]', e.detail.kind, e.detail.id);
        });
      });
    });

  Custom events emitted (bubbling):
    - svgitem:mouseenter
    - svgitem:mouseleave
    - svgitem:click      (left click)
    - svgitem:dblclick
    - svgitem:contextmenu (right click)
    - svgitem:mousemove  (high frequency; use sparingly)
*/
(function () {
  'use strict';

  const DEFAULT_OPTIONS = {
    preventContextMenu: true,
    // If true, attaches listeners for mousemove as well
    trackMouseMove: false,
    // Optional filter to limit which kinds get listeners: ['node','edge','start','end']
    includeKinds: null, // null = all kinds
  };

  const CLICK_DELAY_MS = 250;
  const clickTimers = new WeakMap();

  function isIncluded(kind, opts) {
    if (!opts || !opts.includeKinds) return true;
    return opts.includeKinds.includes(kind);
  }

  function dispatch(kind, eventName, targetEl, svgEl, originalEvent) {
    const id = targetEl.getAttribute('id') || targetEl.closest('[id]')?.getAttribute('id') || null;
    const detail = { kind, id, element: targetEl, originalEvent };
    const custom = new CustomEvent(`svgitem:${eventName}`, { detail, bubbles: true });
    // Fire on the concrete element (group/path/circle) and let it bubble to svg and document
    try { console.debug('[SVGEvents] dispatch', { event: `svgitem:${eventName}`, kind, id, target: targetEl }); } catch (_) {}
    targetEl.dispatchEvent(custom);
  }

  // No color utilities here - moved to svg-animations.js

  function addListeners(kind, elements, svgEl, opts) {
    if (!elements || elements.length === 0) return;
    elements.forEach((el) => {
      // Tag element for debugging/selection
      if (!el.dataset.svgKind) el.dataset.svgKind = kind;

      el.addEventListener('mouseenter', (ev) => {
        dispatch(kind, 'mouseenter', el, svgEl, ev);
      });
      el.addEventListener('mouseleave', (ev) => {
        dispatch(kind, 'mouseleave', el, svgEl, ev);
      });
      el.addEventListener('click', (ev) => {
        // Defer click to allow dblclick suppression
        if (clickTimers.has(el)) {
          clearTimeout(clickTimers.get(el));
        }
        const t = setTimeout(() => {
          clickTimers.delete(el);
          dispatch(kind, 'click', el, svgEl, ev);
        }, CLICK_DELAY_MS);
        clickTimers.set(el, t);
      });
      el.addEventListener('dblclick', (ev) => {
        const t = clickTimers.get(el);
        if (t) {
          clearTimeout(t);
          clickTimers.delete(el);
        }
        dispatch(kind, 'dblclick', el, svgEl, ev);
      });
      el.addEventListener('contextmenu', (ev) => {
        if (opts?.preventContextMenu) ev.preventDefault();
        dispatch(kind, 'contextmenu', el, svgEl, ev);
      });
      if (opts?.trackMouseMove) {
        el.addEventListener('mousemove', (ev) => dispatch(kind, 'mousemove', el, svgEl, ev));
      }
      // Make elements focusable by keyboard if they aren't already
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }
    });
  }

  // Create larger, invisible hitboxes for thin edge paths to improve interaction
  function buildEdgeHitboxes(edges, width) {
    const W = Number.isFinite(width) ? width : 12;
    const NS = 'http://www.w3.org/2000/svg';
    const pairs = [];
    edges.forEach((edge) => {
      try {
        // Reuse if already built
        let hb = edge.__edgeHitbox;
        if (!hb) {
          hb = document.createElementNS(NS, 'path');
          hb.classList.add('edge-hitbox');
          // Keep a reference for future checks
          edge.__edgeHitbox = hb;
          // Insert AFTER the edge so the hitbox sits on top for pointer hit-testing
          if (edge.parentNode) {
            if (edge.nextSibling) {
              edge.parentNode.insertBefore(hb, edge.nextSibling);
            } else {
              edge.parentNode.appendChild(hb);
            }
          }
          try { console.debug('[SVGEvents] created edge hitbox for', edge.id || '(no id)'); } catch (_) {}
        }
        // Sync geometry each time we initialize
        hb.setAttribute('d', edge.getAttribute('d') || '');
        hb.setAttribute('fill', 'none');
        // Use a nearly-transparent stroke to ensure hit-testing across browsers
        hb.setAttribute('stroke', 'rgba(0,0,0,0.001)');
        hb.setAttribute('stroke-width', String(W));
        hb.setAttribute('pointer-events', 'stroke');
        hb.dataset.hitboxFor = edge.getAttribute('id') || '';
        pairs.push({ overlay: hb, original: edge });
      } catch (_) {
        // noop
      }
    });
    // Ensure we have CSS for cursor and safety
    const styleId = 'svg-events-hitbox-style';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        .edge-hitbox { cursor: pointer; outline: none; }
        .edge-hitbox:focus { outline: none; }
      `;
      document.head.appendChild(s);
      try { console.debug('[SVGEvents] injected hitbox style'); } catch (_) {}
    }
    return pairs;
  }

  function attachTo(svgEl, options) {
    if (!svgEl || !(svgEl instanceof SVGElement)) return;
    const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});

    // Heuristics for Mermaid export structure (state diagrams and flowcharts):
    // - Nodes: g.nodes > g.node
    // - Edges: g.edgePaths > path (class 'transition' is state-diagram specific)
    // - Start/End: circles with classes .state-start and .state-end inside g.nodes (state only)

    // Ensure pointer events are enabled
    svgEl.style.pointerEvents = svgEl.style.pointerEvents || 'auto';

    const nodeGroups = svgEl.querySelectorAll('g.nodes > g.node');
    const edges = svgEl.querySelectorAll('g.edgePaths > path');
    const startCircles = svgEl.querySelectorAll('g.nodes circle.state-start');
    const endCircles = svgEl.querySelectorAll('g.nodes circle.state-end');

    try {
      console.debug('[SVGEvents] attachTo()', {
        svg: svgEl.id || '(no id)',
        nodes: nodeGroups.length,
        edges: edges.length,
        starts: startCircles.length,
        ends: endCircles.length,
        opts
      });
    } catch (_) {}

    if (isIncluded('node', opts)) addListeners('node', Array.from(nodeGroups), svgEl, opts);
    if (isIncluded('edge', opts)) {
      // Build wide invisible hitboxes for easier interaction with thin paths
      const pairs = buildEdgeHitboxes(Array.from(edges), opts.edgeHitboxWidth || 14);
      // Attach listeners to overlays, but dispatch events as if they target the original edge
      pairs.forEach(({ overlay, original }) => {
        if (!overlay || !original) return;
        // Tag original for debugging/selection
        if (!original.dataset.svgKind) original.dataset.svgKind = 'edge';
        // Basic events routed to original
        overlay.addEventListener('mouseenter', (ev) => {
          original.dataset.svgHover = '1';
          dispatch('edge', 'mouseenter', original, svgEl, ev);
        });
        overlay.addEventListener('mouseleave', (ev) => {
          delete original.dataset.svgHover;
          dispatch('edge', 'mouseleave', original, svgEl, ev);
        });
        overlay.addEventListener('mousedown', (ev) => {
          // Prevent the overlay from taking focus; move it to the original edge
          ev.preventDefault();
          if (!original.hasAttribute('tabindex')) original.setAttribute('tabindex', '0');
          try { original.focus({ preventScroll: true }); } catch (_) { try { original.focus(); } catch (_) {} }
        });
        overlay.addEventListener('click', (ev) => {
          const key = original;
          if (clickTimers.has(key)) {
            clearTimeout(clickTimers.get(key));
          }
          const t = setTimeout(() => {
            clickTimers.delete(key);
            dispatch('edge', 'click', original, svgEl, ev);
          }, CLICK_DELAY_MS);
          clickTimers.set(key, t);
        });
        overlay.addEventListener('dblclick', (ev) => {
          const key = original;
          const t = clickTimers.get(key);
          if (t) {
            clearTimeout(t);
            clickTimers.delete(key);
          }
          dispatch('edge', 'dblclick', original, svgEl, ev);
        });
        overlay.addEventListener('contextmenu', (ev) => {
          if (opts?.preventContextMenu) ev.preventDefault();
          dispatch('edge', 'contextmenu', original, svgEl, ev);
        });
        if (opts?.trackMouseMove) {
          overlay.addEventListener('mousemove', (ev) => dispatch('edge', 'mousemove', original, svgEl, ev));
        }
      });
    }
    if (isIncluded('start', opts)) addListeners('start', Array.from(startCircles), svgEl, opts);
    if (isIncluded('end', opts)) addListeners('end', Array.from(endCircles), svgEl, opts);

    // Visual styles are now in svg-animations.js
  }

  // Auto initialization (can be disabled via options)
  function autoInit() {
    try { console.debug('[SVGEvents] autoInit start'); } catch (_) {}
    // Target all SVGs in preview and with Mermaid-related classes
    const svgs = document.querySelectorAll('#preview svg, svg.statediagram, svg.mermaid');
    try { console.debug('[SVGEvents] found SVGs', svgs.length); } catch (_) {}
    svgs.forEach(svg => {
      try { console.debug('[SVGEvents] auto-attach', svg.id || 'unnamed', svg.className?.baseVal || svg.className || ''); } catch (_) {}
      attachTo(svg);
    });
    
    // Set up a mutation observer to watch for new SVGs being added
    const previewEl = document.getElementById('preview');
    if (previewEl) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check for any new SVG elements
            mutation.addedNodes.forEach(node => {
              if (node.nodeName === 'SVG') {
                try { console.debug('[SVGEvents] observer: direct SVG added'); } catch (_) {}
                attachTo(node);
                attachLoggerTo(node);
              } else if (node.querySelectorAll) {
                // Check for SVGs inside added nodes
                const nestedSvgs = node.querySelectorAll('svg');
                if (nestedSvgs.length > 0) {
                  try { console.debug('[SVGEvents] observer: nested SVGs found', nestedSvgs.length); } catch (_) {}
                  nestedSvgs.forEach(svg => {
                    attachTo(svg);
                    attachLoggerTo(svg);
                  });
                }
              }
            });
          }
        });
      });
      
      // Start observing the preview element for added nodes
      observer.observe(previewEl, { childList: true, subtree: true });
      try { console.debug('[SVGEvents] mutation observer installed on #preview'); } catch (_) {}
    }
  }

  // Inline debug panel utilities
  function getOrCreateLogPanel() {
    let log = document.getElementById('svg-inline-event-panel');
    if (!log) {
      log = document.createElement('div');
      log.id = 'svg-inline-event-panel';
      Object.assign(log.style, {
        position: 'fixed',
        bottom: '8px',
        right: '8px',
        maxHeight: '40vh',
        overflow: 'auto',
        background: '#111',
        color: '#ddd',
        padding: '8px 10px',
        font: '12px/1.3 monospace',
        border: '1px solid #333',
        borderRadius: '6px',
        zIndex: 99999
      });
      document.body.appendChild(log);
    }
    return log;
  }

  function attachLoggerTo(svg) {
    if (!svg) {
      console.warn('attachLoggerTo called with null/undefined SVG');
      return;
    }
    
    console.log('Attaching logger to SVG:', svg.id || 'unnamed', 'classList:', Array.from(svg.classList));
    
    const log = getOrCreateLogPanel();
    // These are the actual events used in the original code
    ['mouseenter','mouseleave','click','dblclick','contextmenu'].forEach(ev => {
      svg.addEventListener(`svgitem:${ev}`, e => {
        // console.log('SVG event captured:', `svgitem:${ev}`, e.detail);
        const { kind, id } = e.detail;
        const line = document.createElement('div');
        line.textContent = `[${ev}] ${kind} ${id || ''}`;
        log.prepend(line);
        
        // Make sure the log panel is visible
        log.style.display = 'block';
      });
    });
  }

  function installInlineEventPanel() {
    const log = getOrCreateLogPanel();
    // Attach logger to existing target SVGs
    document.querySelectorAll('#preview svg, svg.statediagram, svg.mermaid').forEach(attachLoggerTo);
    try { console.log('Inline event panel ready.'); } catch (_) {}
  }

  // Public API
  const API = { attachTo, autoInit, attachLoggerTo };

  // UMD-lite export
  if (typeof window !== 'undefined') {
    window.SVGEvents = API;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        autoInit();
        installInlineEventPanel();
      });
    } else {
      // Document already ready
      autoInit();
      installInlineEventPanel();
    }
  }
})();
