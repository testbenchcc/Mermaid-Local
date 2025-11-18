/*
  Connect Existing Node Modal Controller
  - Opens on 'node-menu:connect-existing'
  - Shows a listbox of existing nodes detected from the current SVG
  - Appends an edge from the context node to the selected node, then render()
*/
(function () {
  'use strict';

  let modal, listbox, submitBtn, cancelBtn, refreshBtn, filterInput;
  let lastContext = null; // { id, element, svg, sourceEvent }

  function $(id) { return document.getElementById(id); }

  function ensureElements() {
    modal = modal || $('connect-existing-modal');
    listbox = listbox || $('connect-existing-list');
    submitBtn = submitBtn || $('connect-existing-submit');
    cancelBtn = cancelBtn || $('connect-existing-cancel');
    refreshBtn = refreshBtn || $('connect-existing-refresh');
    filterInput = filterInput || $('connect-existing-filter');
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function openModal() {
    ensureElements();
    if (!modal) return console.warn('[connect-existing-node] modal element missing');
    // Clear selection and filter
    if (filterInput) filterInput.value = '';
    if (listbox) listbox.selectedIndex = -1;
    rebuildNodeList();

    modal.style.display = 'block';
    // Focus listbox or filter for accessibility
    requestAnimationFrame(() => { try { (filterInput || listbox).focus(); } catch (_) {} });
  }

  function getNodeLabelFromElement(el) {
    if (!el) return '';
    try {
      const labelGroup = el.querySelector('g.label');
      const textNode = (labelGroup && labelGroup.querySelector('text')) || el.querySelector('text');
      let txt = '';
      if (textNode) {
        const tspans = textNode.querySelectorAll('tspan');
        if (tspans && tspans.length) {
          txt = Array.from(tspans).map(t => t.textContent || '').join(' ').trim();
        } else {
          txt = (textNode.textContent || '').trim();
        }
      }
      if (txt) return txt;
    } catch (_) {}
    return '';
  }

  function deriveSourceName(ctx) {
    if (!ctx) return '';
    const byLabel = getNodeLabelFromElement(ctx.element);
    if (byLabel) return byLabel;
    let id = ctx.id || '';
    if (id) {
      id = id.replace(/^(state-|node-|flowchart-)/i, '');
      id = id.replace(/-\d+$/i, '');
      return id;
    }
    return '';
  }

  function collectExistingNodeNames() {
    // Prefer current SVG under #preview
    const svg = (lastContext && lastContext.svg) || document.querySelector('#preview svg, svg.statediagram, svg.mermaid');
    const names = new Set();
    if (svg) {
      const nodes = svg.querySelectorAll('g.nodes > g.node');
      nodes.forEach(n => {
        const label = getNodeLabelFromElement(n);
        if (label) names.add(label);
      });
    }
    // Fallback: try to parse from editor lines (simple heuristic: words around `-->`)
    if (names.size === 0) {
      const editor = $('editor');
      const text = editor ? (editor.textContent || '') : '';
      text.split(/\n+/).forEach(line => {
        const m = line.match(/([^\-]+?)\s*-->/);
        if (m && m[1]) names.add(m[1].trim());
        const m2 = line.match(/-->\s*([^\[][^\s]+)/); // naive target
        if (m2 && m2[1]) names.add(m2[1].trim());
      });
    }
    // Exclude the source node itself
    const src = deriveSourceName(lastContext);
    if (src) names.delete(src);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  function populateList(names) {
    if (!listbox) return;
    listbox.innerHTML = '';
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      listbox.appendChild(opt);
    });
  }

  function rebuildNodeList() {
    const names = collectExistingNodeNames();
    const filter = (filterInput && filterInput.value || '').trim().toLowerCase();
    const filtered = filter ? names.filter(n => n.toLowerCase().includes(filter)) : names;
    populateList(filtered);
  }

  function appendLineToEditor(text) {
    const editor = $('editor');
    if (!editor) return console.warn('[connect-existing-node] editor not found');

    const current = editor.textContent || '';
    const needsNL = current.length > 0 && !current.endsWith('\n');
    const next = needsNL ? current + '\n' + text : current + text;
    editor.textContent = next;
    
    try { editor.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}

    if (typeof window.render === 'function') {
      try { window.render(); } catch (_) {}
    } else if (typeof render === 'function') {
      try { render(); } catch (_) {}
    }
  }

  function onSubmit() {
    if (!listbox) return;
    const value = listbox.value || '';
    const name = value.trim();
    if (!name) {
      if (typeof showAlert === 'function') {
        try { showAlert('Please select a node', 'warning'); } catch (_) {}
      } else {
        try { console.warn('Please select a node'); } catch (_) {}
      }
      try { listbox.focus(); } catch (_) {}
      return;
    }
    const source = deriveSourceName(lastContext) || '';
    const line = `    ${source} --> ${name}`;
    appendLineToEditor(line);
    closeModal();
  }

  function wireModalControls() {
    ensureElements();
    if (!modal) return;
    if (submitBtn) submitBtn.addEventListener('click', onSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (refreshBtn) refreshBtn.addEventListener('click', rebuildNodeList);
    if (filterInput) {
      filterInput.addEventListener('input', rebuildNodeList);
      filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });
    }
    if (listbox) {
      listbox.addEventListener('dblclick', onSubmit);
      listbox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });
    }
    window.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && modal.style.display === 'block') closeModal();
    });
  }

  function onContextMenuConnectExisting(e) {
    lastContext = (e && e.detail) || null;
    openModal();
  }

  function init() {
    wireModalControls();
    document.addEventListener('node-menu:connect-existing', onContextMenuConnectExisting);
    try { console.log('[connect-existing-node] ready'); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
