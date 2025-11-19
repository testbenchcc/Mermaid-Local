/*
  Connect Existing Node Modal Controller
  - Opens on 'node-menu:connect-existing'
  - Shows a listbox of existing nodes detected from the current SVG
  - Appends an edge from the context node to the selected node, then render()
*/
(function () {
  'use strict';

  let modal, listbox, submitBtn, cancelBtn, refreshBtn, filterInput, sourceSelect, linkTypeSelect, linkLabelInput, previewEl;
  let lastContext = null; // { id, element, svg, sourceEvent }
  let lastPresetConfig = null;

  function $(id) { return document.getElementById(id); }

  function ensureElements() {
    modal = modal || $('connect-existing-modal');
    listbox = listbox || $('connect-existing-list');
    submitBtn = submitBtn || $('connect-existing-submit');
    cancelBtn = cancelBtn || $('connect-existing-cancel');
    refreshBtn = refreshBtn || $('connect-existing-refresh');
    filterInput = filterInput || $('connect-existing-filter');
    sourceSelect = sourceSelect || $('connect-existing-source');
    linkTypeSelect = linkTypeSelect || $('connect-existing-link-type');
    linkLabelInput = linkLabelInput || $('connect-existing-link-label');
    previewEl = previewEl || $('connect-existing-preview');
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function openModal() {
    ensureElements();
    if (!modal) return console.warn('[connect-existing-node] modal element missing');
    const preset = lastPresetConfig || {};
    // Clear selection and filter
    if (filterInput) filterInput.value = '';
    if (listbox) listbox.selectedIndex = -1;
    rebuildNodeList();

    if (linkTypeSelect) {
      const desiredLinkType = (typeof preset.linkType === 'string' && preset.linkType) ? preset.linkType : (linkTypeSelect.value || '-->');
      linkTypeSelect.value = desiredLinkType;
    }

    if (linkLabelInput) {
      linkLabelInput.value = (typeof preset.linkLabel === 'string' && preset.linkLabel) ? preset.linkLabel : '';
    }

    populateSourceSelect((typeof preset.sourceId === 'string' && preset.sourceId) ? preset.sourceId : null);

    updatePreview();

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

  function collectAllNodeNames() {
    const names = new Set(collectExistingNodeNames());
    const src = deriveSourceName(lastContext);
    if (src) names.add(src);
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

  function buildEdgeLine(source, target, linkType, linkLabel) {
    const src = (source || '').trim();
    const dst = (target || '').trim();
    const text = (linkLabel || '').trim();
    const kind = (linkType || '-->').trim() || '-->';
    if (!src || !dst) return '';

    if (!text) {
      if (kind === '-->') return `${src} --> ${dst}`;
      if (kind === '---') return `${src} --- ${dst}`;
      if (kind === '-.->') return `${src} -.-> ${dst}`;
      if (kind === '==>') return `${src} ==> ${dst}`;
      if (kind === '~~~') return `${src} ~~~ ${dst}`;
      if (kind === '--o') return `${src} --o ${dst}`;
      if (kind === '--x') return `${src} --x ${dst}`;
      return `${src} ${kind} ${dst}`;
    }

    if (kind === '-->') return `${src}-->|${text}|${dst}`;
    if (kind === '---') return `${src}---|${text}|${dst}`;
    if (kind === '-.->') return `${src}-. ${text} .-> ${dst}`;
    if (kind === '==>') return `${src} == ${text} ==> ${dst}`;
    if (kind === '--o') return `${src}-. ${text} .-o ${dst}`;
    if (kind === '--x') return `${src}-. ${text} .-x ${dst}`;

    return buildEdgeLine(src, dst, kind, '');
  }

  function populateSourceSelect(preferredId) {
    ensureElements();
    if (!sourceSelect) return;

    const names = collectAllNodeNames();
    const derived = deriveSourceName(lastContext) || '';
    const seen = new Set();

    sourceSelect.innerHTML = '';

    function addOption(id) {
      const value = (id || '').trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      sourceSelect.appendChild(opt);
    }

    if (derived) addOption(derived);
    names.forEach(addOption);

    if (!sourceSelect.options.length) {
      const opt = document.createElement('option');
      opt.value = derived || '';
      opt.textContent = derived || '(no source detected)';
      sourceSelect.appendChild(opt);
    }

    const desired = (preferredId && preferredId.trim()) || derived;
    if (desired) {
      try { sourceSelect.value = desired; } catch (_) {}
    }
  }

  function getCurrentConfig() {
    ensureElements();
    const explicitSource = (sourceSelect && sourceSelect.value || '').trim();
    const source = explicitSource || deriveSourceName(lastContext) || '';
    const target = (listbox && listbox.value || '').trim();
    const linkType = (linkTypeSelect && linkTypeSelect.value || '-->').trim();
    const linkLabel = (linkLabelInput && linkLabelInput.value || '').trim();
    const edgeLine = buildEdgeLine(source, target, linkType, linkLabel);
    return { source, target, linkType, linkLabel, edgeLine };
  }

  function renderMermaidPreview(container, code) {
    if (!container) return;
    const trimmed = (code || '').trim();
    if (!trimmed) {
      container.innerHTML = '';
      container.classList.remove('mermaid');
      return;
    }
    try {
      if (window.mermaid && typeof window.mermaid.render === 'function') {
        const id = 'modal-mermaid-' + Math.random().toString(36).slice(2);
        const res = window.mermaid.render(id, trimmed);
        if (res && typeof res.then === 'function') {
          res.then((out) => {
            if (!out) return;
            container.innerHTML = out.svg || out;
          }).catch(() => {
            container.textContent = trimmed;
          });
        } else if (typeof res === 'string') {
          container.innerHTML = res;
        } else if (res && typeof res.svg === 'string') {
          container.innerHTML = res.svg;
        } else {
          container.textContent = trimmed;
        }
      } else if (window.mermaid && typeof window.mermaid.init === 'function') {
        container.classList.add('mermaid');
        container.textContent = trimmed;
        window.mermaid.init(undefined, container);
      } else {
        container.textContent = trimmed;
      }
    } catch (_) {
      container.textContent = trimmed;
    }
  }

  function updatePreview() {
    ensureElements();
    if (!previewEl) return;
    const cfg = getCurrentConfig();
    const snippet = cfg.edgeLine ? `    ${cfg.edgeLine}` : '';
    const code = snippet ? `flowchart LR\n${snippet}` : '';
    renderMermaidPreview(previewEl, code);
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
    const cfg = getCurrentConfig();
    const name = cfg.target;
    if (!name) {
      if (typeof showAlert === 'function') {
        try { showAlert('Please select a node', 'warning'); } catch (_) {}
      } else {
        try { console.warn('Please select a node'); } catch (_) {}
      }
      try { listbox.focus(); } catch (_) {}
      return;
    }
    if (cfg.edgeLine) appendLineToEditor(`    ${cfg.edgeLine}`);
    closeModal();
  }

  function wireModalControls() {
    ensureElements();
    if (!modal) return;
    if (submitBtn) submitBtn.addEventListener('click', onSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (refreshBtn) refreshBtn.addEventListener('click', () => { rebuildNodeList(); updatePreview(); });
    if (filterInput) {
      filterInput.addEventListener('input', rebuildNodeList);
      filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });
    }
    if (listbox) {
      listbox.addEventListener('dblclick', onSubmit);
      listbox.addEventListener('change', updatePreview);
      listbox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });
    }
    if (sourceSelect) {
      sourceSelect.addEventListener('change', updatePreview);
    }
    if (linkTypeSelect) {
      linkTypeSelect.addEventListener('change', updatePreview);
    }
    if (linkLabelInput) {
      linkLabelInput.addEventListener('input', updatePreview);
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
    lastPresetConfig = (e && e.detail && e.detail.config) || null;
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
