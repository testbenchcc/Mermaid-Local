/*
  SVG Animations for Mermaid diagrams
  - Provides visual effects that respond to svg-events.js events
  - Implements hover animations, color shifts, and other visual feedback
  - Consumes events from svg-events.js

  Usage:
    // Include after svg-events.js in your HTML
    // <script src="/static/svg-events.js"></script>
    // <script src="/static/svg-animations.js"></script>
*/
(function () {
  'use strict';

  const DEFAULT_OPTIONS = {
    // Apply a complementary hue shift on hover to make items visibly "show"
    hoverHueShift: true,
  };

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

  // Set up event listeners for animations
  function setupAnimations(svgEl, options) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    
    if (!svgEl) return;
    
    // Add hover animation event handlers
    if (opts.hoverHueShift) {
      svgEl.addEventListener('svgitem:mouseenter', (e) => {
        applyHueShiftHover(e.detail.element);
      });
      
      svgEl.addEventListener('svgitem:mouseleave', (e) => {
        revertHueShiftHover(e.detail.element);
      });
    }

    // Provide a simple visual hover outline for debugging (non-destructive)
    const hoverStyleId = 'svg-animations-hover-style';
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

  // Auto initialization
  function autoInit() {
    const initFunction = () => {
      // Check if SVGEvents is available
      if (!window.SVGEvents) {
        console.warn('SVGAnimations: SVGEvents not found! Waiting 100ms to retry...');
        setTimeout(initFunction, 100);
        return;
      }
      
      console.log('SVGAnimations: SVGEvents system detected, initializing animations');
      
      // Target all SVGs in preview and with Mermaid-related classes
      const svgs = document.querySelectorAll('#preview svg, svg.statediagram, svg.mermaid');
      console.log('SVGAnimations found:', svgs.length, 'SVGs');
      svgs.forEach(svg => {
        console.log('Attaching animations to SVG:', svg.id || 'unnamed');
        setupAnimations(svg);
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
                  console.log('MutationObserver: New SVG detected, attaching animations');
                  setupAnimations(node);
                } else if (node.querySelectorAll) {
                  // Check for SVGs inside added nodes
                  const nestedSvgs = node.querySelectorAll('svg');
                  if (nestedSvgs.length) {
                    console.log(`MutationObserver: Found ${nestedSvgs.length} SVGs inside new node`);
                    nestedSvgs.forEach(svg => setupAnimations(svg));
                  }
                }
              });
            }
          });
        });
        observer.observe(previewEl, { childList: true, subtree: true });
      }
    };
    
    // Either run immediately or wait for DOM to be ready
    if (document.readyState !== 'loading') {
      initFunction();
    } else {
      document.addEventListener('DOMContentLoaded', initFunction);
    }
  }

  // Public API
  const API = { setupAnimations, autoInit };

  // UMD-lite export
  if (typeof module === 'object' && module.exports) {
    // Node / CommonJS
    module.exports = API;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(function() { return API; });
  } else {
    // Browser globals (window)
    window.SVGAnimations = API;
  }

  // Auto-initialize when this script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoInit();
    });
  } else {
    // Document already ready
    autoInit();
  }
})();
