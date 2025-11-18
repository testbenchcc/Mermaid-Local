/*
  Connect Existing Node Modal Controller
  - Opens on 'node-menu:connect-existing'
  - Shows a listbox of existing nodes detected from the current SVG
  - Appends an edge from the context node to the selected node, then render()
*/
(function () {
  'use strict';

  let modal, listbox, submitBtn, cancelBtn, refreshBtn, filterInput;
  let nameInput, labelInput, shapeSelect, linkTypeSelect, linkTextInput, previewEl;
  let lastContext = null; // { id, element, svg, sourceEvent }

  function $(id) { return document.getElementById(id); }

  function ensureElements() {
    modal = modal || $('connect-existing-modal');
    listbox = listbox || $('connect-existing-list');
    submitBtn = submitBtn || $('connect-existing-submit');
    cancelBtn = cancelBtn || $('connect-existing-cancel');
    refreshBtn = refreshBtn || $('connect-existing-refresh');
    filterInput = filterInput || $('connect-existing-filter');
    nameInput = nameInput || $('connect-existing-name');
    labelInput = labelInput || $('connect-existing-label');
    shapeSelect = shapeSelect || $('connect-existing-shape');
    linkTypeSelect = linkTypeSelect || $('connect-existing-link-type');
    linkTextInput = linkTextInput || $('connect-existing-link-text');
    previewEl = previewEl || $('connect-existing-preview');
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function openModal(preset) {
    ensureElements();
    if (!modal) return console.warn('[connect-existing-node] modal element missing');
    // Clear selection and filter
    if (filterInput) filterInput.value = '';
    if (listbox) listbox.selectedIndex = -1;

    if (nameInput) nameInput.value = (preset && preset.targetId) || '';
    if (labelInput) labelInput.value = (preset && preset.label) || '';
    if (shapeSelect) shapeSelect.value = (preset && preset.shape) || '';
    if (linkTypeSelect) linkTypeSelect.value = (preset && preset.linkType) || 'arrow';
    if (linkTextInput) linkTextInput.value = (preset && preset.linkText) || '';

    rebuildNodeList();

    modal.style.display = 'block';
    // Focus listbox, filter, or name input for accessibility and update preview
    requestAnimationFrame(() => {
      try {
        if (previewEl) updatePreview();
        (filterInput || listbox || nameInput).focus();
      } catch (_) {}
    });
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
      if (!txt && labelGroup) {
        const fo = labelGroup.querySelector('foreignObject');
        if (fo) {
          txt = (fo.textContent || '').trim();
        }
      }
      if (!txt) {
        const spanLabel = el.querySelector('.nodeLabel');
        if (spanLabel) {
          txt = (spanLabel.textContent || '').trim();
        }
      }
      if (txt) return txt;
    } catch (_) {}
    return '';
  }

  function normalizeNodeId(rawId) {
    if (!rawId) return '';
    let id = String(rawId);
    // Prefer common Mermaid id patterns like flowchart-REPO-186 -> REPO
    const primaryMatch = id.match(/(?:flowchart|state|id|node)[-_]([A-Za-z0-9_-]+)/);
    if (primaryMatch) {
      id = primaryMatch[1];
    } else {
      // Fallback: strip generic prefixes like 'state-', 'node-', 'flowchart-'
      id = id.replace(/^(state-|node-|flowchart-)/i, '');
    }
    // In all cases, strip trailing dash-number suffixes (e.g., '-11')
    id = id.replace(/-\d+$/i, '');
    return id.trim();
  }

  function deriveSourceName(ctx) {
    if (!ctx) return '';
    // Always prefer the canonical node id derived from the SVG element id
    const normalized = normalizeNodeId(ctx.id || '');
    if (normalized) return normalized;
    // Last resort: fall back to whatever label we can detect
    const byLabel = getNodeLabelFromElement(ctx.element);
    return byLabel || '';
  }

  function collectExistingNodeNames() {
    // Prefer current SVG under #preview
    const svg = (lastContext && lastContext.svg) || document.querySelector('#preview svg, svg.statediagram, svg.mermaid');
    const names = new Set();
    if (svg) {
      const nodes = svg.querySelectorAll('g.nodes > g.node');
      nodes.forEach(n => {
        const rawId = n.getAttribute('id') || '';
        const normalized = normalizeNodeId(rawId);
        if (normalized) names.add(normalized);
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

    const target = getTargetId();
    if (listbox && target) {
      Array.from(listbox.options).forEach((opt, idx) => {
        if ((opt.value || '').trim() === target) {
          listbox.selectedIndex = idx;
        }
      });
    }
    updatePreview();
  }

  function getTargetId() {
    if (nameInput && typeof nameInput.value === 'string') {
      const v = nameInput.value.trim();
      if (v) return v;
    }
    if (listbox && typeof listbox.value === 'string') {
      const v = listbox.value.trim();
      if (v) return v;
    }
    return '';
  }

  function buildNodeDefinitionLine(targetId, label, shape) {
    if (!targetId) return '';
    const props = [];
    if (shape) props.push(`shape: ${shape}`);
    if (label) {
      const safeLabel = String(label).replace(/"/g, '\\"');
      props.push(`label: "${safeLabel}"`);
    }
    if (!props.length) return '';
    return `    ${targetId}@{ ${props.join(', ')} }`;
  }

  function buildLinkLine(source, targetId, linkType, linkText) {
    if (!source || !targetId) return '';
    const text = (linkText || '').trim();
    switch (linkType) {
      case 'open':
        if (text) return `    ${source}---|${text}|${targetId}`;
        return `    ${source} --- ${targetId}`;
      case 'dotted':
        if (text) return `    ${source} -. ${text} .-> ${targetId}`;
        return `    ${source} -.-> ${targetId}`;
      case 'thick':
        if (text) return `    ${source} == ${text} ==> ${targetId}`;
        return `    ${source} ==> ${targetId}`;
      case 'invisible':
        if (text) return `    ${source} ~~~ ${targetId} %% ${text}`;
        return `    ${source} ~~~ ${targetId}`;
      case 'arrow':
      default:
        if (text) return `    ${source} -- ${text} --> ${targetId}`;
        return `    ${source} --> ${targetId}`;
    }
  }

  function buildSnippet() {
    const source = deriveSourceName(lastContext) || '';
    const targetId = getTargetId();
    const label = (labelInput && labelInput.value || '').trim();
    const shape = (shapeSelect && shapeSelect.value || '').trim();
    const linkType = (linkTypeSelect && linkTypeSelect.value) || 'arrow';
    const linkText = (linkTextInput && linkTextInput.value) || '';

    const lines = [];
    const nodeLine = buildNodeDefinitionLine(targetId, label, shape);
    if (nodeLine) lines.push(nodeLine);
    const linkLine = buildLinkLine(source, targetId, linkType, linkText);
    if (linkLine) lines.push(linkLine);
    return lines.join('\n');
  }

  function updatePreview() {
    if (!previewEl) return;
    const snippet = buildSnippet();
    previewEl.textContent = snippet || '';
  }

  function appendSnippetToEditor(text) {
    const editor = $('editor');
    if (!editor) return console.warn('[connect-existing-node] editor not found');

    const current = editor.textContent || '';
    const needsNL = current.length > 0 && !current.endsWith('\n');
    const prefix = needsNL ? current + '\n' : current;
    const next = prefix + text;
    editor.textContent = next;
    
    try { editor.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}

    if (typeof window.render === 'function') {
      try { window.render(); } catch (_) {}
    } else if (typeof render === 'function') {
      try { render(); } catch (_) {}
    }
  }

  function onSubmit() {
    const targetId = getTargetId();
    if (!targetId) {
      if (typeof showAlert === 'function') {
        try { showAlert('Please select or enter a node name', 'warning'); } catch (_) {}
      } else {
        try { console.warn('Please select or enter a node name'); } catch (_) {}
      }
      try {
        if (nameInput && typeof nameInput.focus === 'function') {
          nameInput.focus();
        } else if (listbox && typeof listbox.focus === 'function') {
          listbox.focus();
        }
      } catch (_) {}
      return;
    }

    const snippet = buildSnippet();
    if (!snippet) {
      if (typeof showAlert === 'function') {
        try { showAlert('Cannot build connection – missing source node or configuration', 'warning'); } catch (_) {}
      } else {
        try { console.warn('Cannot build connection – missing source node or configuration'); } catch (_) {}
      }
      return;
    }

    appendSnippetToEditor(snippet);
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
      listbox.addEventListener('change', () => {
        if (nameInput) nameInput.value = listbox.value || '';
        updatePreview();
      });
      listbox.addEventListener('dblclick', onSubmit);
      listbox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });
    }
    if (nameInput) {
      nameInput.addEventListener('input', updatePreview);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
      });
    }
    if (labelInput) {
      labelInput.addEventListener('input', updatePreview);
    }
    if (shapeSelect) {
      shapeSelect.addEventListener('change', updatePreview);
    }
    if (linkTypeSelect) {
      linkTypeSelect.addEventListener('change', updatePreview);
    }
    if (linkTextInput) {
      linkTextInput.addEventListener('input', updatePreview);
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
    const preset = (e && e.detail && e.detail.config) || null;
    openModal(preset);
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
