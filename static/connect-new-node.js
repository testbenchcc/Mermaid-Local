/*
  Connect New Node Modal Controller
  - Opens on 'node-menu:connect-new'
  - Prompts for a name and appends a new line to the editor
  - Calls render() after appending
*/
(function () {
  'use strict';

  let modal, input, submitBtn, cancelBtn;
  // Remember context from the right-clicked node
  let lastContext = null; // { id, element, svg, sourceEvent }

  function $(id) { return document.getElementById(id); }

  function ensureElements() {
    modal = modal || $('connect-new-modal');
    input = input || $('connect-new-name');
    submitBtn = submitBtn || $('connect-new-submit');
    cancelBtn = cancelBtn || $('connect-new-cancel');
  }

  function openModal(prefill = '') {
    ensureElements();
    if (!modal) return console.warn('[connect-new-node] modal element missing');

    if (typeof prefill === 'string' && prefill) input.value = prefill; else input.value = '';

    modal.style.display = 'block';
    // Focus input on next frame for reliability
    requestAnimationFrame(() => { try { input.focus(); } catch (_) {} });
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function appendLineToEditor(text) {
    const editor = $('editor');
    if (!editor) return console.warn('[connect-new-node] editor not found');

    const current = editor.textContent || '';
    const needsNL = current.length > 0 && !current.endsWith('\n');
    const next = needsNL ? current + '\n' + text : current + text;
    editor.textContent = next;
    
    try { editor.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}

    // Re-render immediately for feedback
    if (typeof window.render === 'function') {
      try { window.render(); } catch (_) {}
    } else if (typeof render === 'function') {
      try { render(); } catch (_) {}
    }
  }

  function getNodeLabelFromElement(el) {
    if (!el) return '';
    // Try to find text content within the node group
    try {
      // Common Mermaid structure: g.node > g.label > text > tspan
      const labelGroup = el.querySelector('g.label');
      const textNode = (labelGroup && labelGroup.querySelector('text')) || el.querySelector('text');
      let txt = '';
      if (textNode) {
        // Gather tspans or text content
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
    // Prefer visible label
    const byLabel = getNodeLabelFromElement(ctx.element);
    if (byLabel) return byLabel;
    // Fallback to id, attempt to clean typical prefixes
    let id = ctx.id || '';
    if (id) {
      // Remove common prefixes like 'state-' or 'node-'
      id = id.replace(/^(state-|node-|flowchart-)/i, '');
      // Remove trailing dash-number suffixes (e.g., '-4')
      id = id.replace(/-\d+$/i, '');
      return id;
    }
    return '';
  }

  function onSubmit() {
    const name = (input.value || '').trim();
    if (!name) {
      if (typeof showAlert === 'function') {
        try { showAlert('Please enter a name', 'warning'); } catch (_) {}
      } else {
        try { console.warn('Please enter a name'); } catch (_) {}
      }
      try { input.focus(); } catch (_) {}
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

    // Submit on Enter, close on Escape
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });
    }

    // Dismiss when clicking outside content
    window.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    // Also allow Esc globally
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && modal.style.display === 'block') closeModal();
    });
  }

  function onContextMenuConnectNew(e) {
    // e.detail may include { id, element, svg, sourceEvent }
    lastContext = (e && e.detail) || null;
    openModal('');
  }

  function init() {
    wireModalControls();
    document.addEventListener('node-menu:connect-new', onContextMenuConnectNew);
    try { console.log('[connect-new-node] ready'); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
