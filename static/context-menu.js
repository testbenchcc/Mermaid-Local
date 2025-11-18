/*
  Node context menu for Mermaid diagrams
  - Listens to svgitem:contextmenu events from svg-events.js for kind === 'node'
  - Shows a lightweight, theme-aware context menu next to cursor
  - Items: Connect new node, Connect to existing node
  - Emits custom events for future handling:
      - node-menu:connect-new
      - node-menu:connect-existing
*/
(function () {
  'use strict';

  // Inject minimal styles (theme-aware via [data-theme])
  function ensureStyles() {
    const id = 'node-context-menu-style';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      .node-context-menu { 
        position: fixed; 
        min-width: 180px; 
        background: var(--menu-bg, #fff); 
        color: var(--menu-fg, #222); 
        border: 1px solid var(--menu-border, #ccc); 
        border-radius: 6px; 
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        padding: 6px 0; 
        z-index: 100000; 
        user-select: none; 
        font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .node-context-menu.hidden { display: none; }
      .node-context-menu .item { 
        padding: 8px 12px; 
        cursor: pointer; 
        white-space: nowrap; 
      }
      .node-context-menu .item:hover { 
        background: var(--menu-hover, #f2f2f2); 
      }

      /* Dark theme adjustments */
      [data-theme="dark"] .node-context-menu {
        --menu-bg: #1f1f1f; 
        --menu-fg: #e6e6e6; 
        --menu-border: #333; 
        --menu-hover: #2a2a2a;
      }
    `;
    document.head.appendChild(s);
  }

  function createMenu() {
    ensureStyles();
    const el = document.createElement('div');
    el.className = 'node-context-menu hidden';

    const mkItem = (label, action) => {
      const d = document.createElement('div');
      d.className = 'item';
      d.textContent = label;
      d.addEventListener('click', action);
      return d;
    };

    el.appendChild(mkItem('Connect new node', () => onChoose('connect-new', null)));
    el.appendChild(mkItem('Connect to existing node', () => onChoose('connect-existing', null)));
    el.appendChild(mkItem('Connect existing as: Process (rect)', () => onChoose('connect-existing', {
      shape: 'rect',
      label: 'Process',
      linkType: 'arrow'
    })));
    el.appendChild(mkItem('Connect existing as: Database (cyl)', () => onChoose('connect-existing', {
      shape: 'cyl',
      label: 'Database',
      linkType: 'arrow'
    })));
    el.appendChild(mkItem('Connect existing as: Document (docs)', () => onChoose('connect-existing', {
      shape: 'docs',
      label: 'Document',
      linkType: 'arrow'
    })));
    el.appendChild(mkItem('Connect existing as: Decision (diamond)', () => onChoose('connect-existing', {
      shape: 'diamond',
      label: 'Decision',
      linkType: 'arrow'
    })));

    document.body.appendChild(el);
    return el;
  }

  let menuEl = null;
  let currentContext = null; // { id, element, svg, sourceEvent }

  function hideMenu() {
    if (!menuEl) return;
    menuEl.classList.add('hidden');
    currentContext = null;
  }

  function onChoose(kind, config) {
    try {
      console.log('[node-context-menu] choose', kind, currentContext);
    } catch (_) {}
    if (currentContext && currentContext.element) {
      const ev = new CustomEvent(`node-menu:${kind}`, {
        bubbles: true,
        detail: {
          id: currentContext.id || null,
          element: currentContext.element,
          svg: currentContext.svg || null,
          sourceEvent: currentContext.sourceEvent || null,
          config: config || null,
        },
      });
      currentContext.element.dispatchEvent(ev);
    }
    hideMenu();
  }

  function positionWithinViewport(x, y) {
    // Keep the menu within viewport bounds
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = menuEl.getBoundingClientRect();
    const pad = 6;
    let nx = x;
    let ny = y;
    if (nx + rect.width + pad > vw) nx = Math.max(pad, vw - rect.width - pad);
    if (ny + rect.height + pad > vh) ny = Math.max(pad, vh - rect.height - pad);
    menuEl.style.left = `${nx}px`;
    menuEl.style.top = `${ny}px`;
  }

  function showMenuAt(x, y, ctx) {
    if (!menuEl) menuEl = createMenu();
    currentContext = ctx;
    menuEl.classList.remove('hidden');
    // Position after visible to have accurate rect for overflow checks
    requestAnimationFrame(() => positionWithinViewport(x, y));
  }

  function onSvgContextMenu(e) {
    const { kind, id, element, originalEvent } = e.detail || {};
    if (kind !== 'node') return; // Only for nodes

    // If the browser context menu slipped through, prevent it
    if (originalEvent && typeof originalEvent.preventDefault === 'function') {
      originalEvent.preventDefault();
    }

    const x = (originalEvent?.clientX) ?? (e.clientX) ?? 0;
    const y = (originalEvent?.clientY) ?? (e.clientY) ?? 0;

    const svg = (element && element.ownerSVGElement) || element?.closest?.('svg') || null;
    showMenuAt(x, y, { id, element, svg, sourceEvent: originalEvent || e });
  }

  function installGlobalDismiss() {
    // Dismiss on click elsewhere
    document.addEventListener('click', (ev) => {
      if (!menuEl || menuEl.classList.contains('hidden')) return;
      if (ev.target === menuEl || menuEl.contains(ev.target)) return;
      hideMenu();
    });
    // Dismiss on Escape or on scroll/resizing
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hideMenu(); });
    window.addEventListener('scroll', hideMenu, true);
    window.addEventListener('resize', hideMenu);
    // Also hide when editor rerenders diagram
    document.addEventListener('svgitem:click', hideMenu, true);
  }

  function init() {
    if (typeof window === 'undefined') return;
    installGlobalDismiss();
    document.addEventListener('svgitem:contextmenu', onSvgContextMenu);
    try { console.log('[node-context-menu] ready'); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
