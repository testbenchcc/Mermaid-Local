/*
  SVG Interactions for Mermaid-exported state diagrams (and similar static SVGs)
  - Attaches mouse and click interactions to nodes, edges, start/end points
  - Dispatches custom events on both the target element and the parent <svg>
  - No external dependencies

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
    // Apply a complementary hue shift on hover to make items visibly "show"
    hoverHueShift: true,
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
    targetEl.dispatchEvent(custom);
  }

  // --- Color utilities (see hueShift.md reference) ---
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    hex = String(hex).trim();
    if (!hex.startsWith('#')) return null;
    hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const int = parseInt(hex, 16);
    if (Number.isNaN(int) || hex.length !== 6) return null;
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  }

  function parseCssColorToHsl(css) {
    if (!css || css === 'none' || css === 'transparent') return null;
    css = String(css).trim();
    // hex
    if (css.startsWith('#')) {
      const rgb = hexToRgb(css);
      if (!rgb) return null;
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    }
    // rgb/rgba
    const m = css.match(/^rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(s => s.trim());
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      if ([r,g,b].some(v => Number.isNaN(v))) return null;
      return rgbToHsl(r, g, b);
    }
    // hsl already
    const mh = css.match(/^hsl[a]?\(([^)]+)\)/i);
    if (mh) {
      const parts = mh[1].split(',').map(s => s.trim());
      const h = parseFloat(parts[0]);
      const s = parseFloat(parts[1]);
      const l = parseFloat(parts[2]);
      if ([h,s,l].some(v => Number.isNaN(v))) return null;
      return { h, s, l };
    }
    return null;
  }

  function hslToCss(h, s, l) {
    return `hsl(${Math.round(h)}, ${clamp01(s/100)*100}%, ${clamp01(l/100)*100}%)`;
  }

  function complementaryFromCss(css) {
    const hsl = parseCssColorToHsl(css);
    if (!hsl) return null;
    const compHue = (hsl.h + 180) % 360;
    return hslToCss(compHue, hsl.s, hsl.l);
  }

  // Collect SVG drawable elements under a container
  const DRAW_TAGS = ['path','rect','circle','ellipse','polygon','polyline','line','text'];
  function collectDrawable(el) {
    const out = [];
    if (el && DRAW_TAGS.includes(el.tagName?.toLowerCase())) out.push(el);
    if (el && el.querySelectorAll) {
      el.querySelectorAll(DRAW_TAGS.join(',')).forEach(n => out.push(n));
    }
    return out;
  }

  function applyHueShiftHover(container) {
    const nodes = collectDrawable(container);
    nodes.forEach(n => {
      const cs = getComputedStyle(n);
      // Fill
      if (!n.dataset.huePrevFill) {
        const fill = cs.fill;
        const comp = complementaryFromCss(fill);
        if (comp) {
          n.dataset.huePrevFill = n.getAttribute('fill') || '';
          n.style.fill = comp;
        }
      }
      // Stroke
      if (!n.dataset.huePrevStroke) {
        const stroke = cs.stroke;
        const compS = complementaryFromCss(stroke);
        if (compS) {
          n.dataset.huePrevStroke = n.getAttribute('stroke') || '';
          n.style.stroke = compS;
        }
      }
    });
  }

  function revertHueShiftHover(container) {
    const nodes = collectDrawable(container);
    nodes.forEach(n => {
      if (n.dataset.huePrevFill !== undefined) {
        if (n.dataset.huePrevFill === '') {
          n.style.removeProperty('fill');
        } else {
          n.style.fill = n.dataset.huePrevFill;
        }
        delete n.dataset.huePrevFill;
      }
      if (n.dataset.huePrevStroke !== undefined) {
        if (n.dataset.huePrevStroke === '') {
          n.style.removeProperty('stroke');
        } else {
          n.style.stroke = n.dataset.huePrevStroke;
        }
        delete n.dataset.huePrevStroke;
      }
    });
  }

  function addListeners(kind, elements, svgEl, opts) {
    if (!elements || elements.length === 0) return;
    elements.forEach((el) => {
      // Tag element for debugging/selection
      if (!el.dataset.svgKind) el.dataset.svgKind = kind;

      el.addEventListener('mouseenter', (ev) => {
        if (opts?.hoverHueShift) applyHueShiftHover(el);
        dispatch(kind, 'mouseenter', el, svgEl, ev);
      });
      el.addEventListener('mouseleave', (ev) => {
        if (opts?.hoverHueShift) revertHueShiftHover(el);
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
    const styleId = 'svg-interactions-hitbox-style';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        .edge-hitbox { cursor: pointer; outline: none; }
        .edge-hitbox:focus { outline: none; }
      `;
      document.head.appendChild(s);
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
          if (opts?.hoverHueShift) applyHueShiftHover(original);
          dispatch('edge', 'mouseenter', original, svgEl, ev);
        });
        overlay.addEventListener('mouseleave', (ev) => {
          delete original.dataset.svgHover;
          if (opts?.hoverHueShift) revertHueShiftHover(original);
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

    // Provide a simple visual hover outline for debugging (non-destructive)
    const hoverStyleId = 'svg-interactions-hover-style';
    if (!document.getElementById(hoverStyleId)) {
      const s = document.createElement('style');
      s.id = hoverStyleId;
      s.textContent = `
        [data-svg-kind='node']:focus, [data-svg-kind='node']:hover { outline: 1px dashed #81b1db; outline-offset: 2px; }
        [data-svg-kind='edge']:focus, [data-svg-kind='edge']:hover, [data-svg-kind='edge'][data-svg-hover='1'] { filter: drop-shadow(0 0 1px #81b1db); }
        [data-svg-kind='start']:focus, [data-svg-kind='start']:hover,
        [data-svg-kind='end']:focus, [data-svg-kind='end']:hover { stroke: #81b1db !important; }
      `;
      document.head.appendChild(s);
    }
  }

  // Auto initialization (can be disabled via options)
  function autoInit() {
    // Target all SVGs in preview and with Mermaid-related classes
    const svgs = document.querySelectorAll('#preview svg, svg.statediagram, svg.mermaid');
    console.log('SVGInteractions autoInit found:', svgs.length, 'SVGs');
    svgs.forEach(svg => {
      console.log('Auto-attaching to SVG:', svg.id || 'unnamed');
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
                console.log('MutationObserver: New SVG detected, attaching interactions');
                attachTo(node);
                attachLoggerTo(node);
              } else if (node.querySelectorAll) {
                // Check for SVGs inside added nodes
                const nestedSvgs = node.querySelectorAll('svg');
                if (nestedSvgs.length > 0) {
                  console.log('MutationObserver: Found', nestedSvgs.length, 'nested SVGs');
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
      console.log('SVG interaction mutation observer installed on #preview');
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
    window.SVGInteractions = API;
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
