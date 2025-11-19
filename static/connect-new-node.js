/*
  Connect New Node Modal Controller
  - Opens on 'node-menu:connect-new'
  - Prompts for a name and appends a new line to the editor
  - Calls render() after appending
*/
(function () {
  'use strict';

  let modal, input, labelInput, shapeSelect, linkTypeSelect, linkLabelInput, submitBtn, cancelBtn, sourceSelect, previewEl;
  // Remember context from the right-clicked node
  let lastContext = null; // { id, element, svg, sourceEvent }
  // Optional preset configuration from the context menu (shape, link type, etc.)
  let lastPresetConfig = null;

  function $(id) { return document.getElementById(id); }

  function ensureElements() {
    modal = modal || $('connect-new-modal');
    input = input || $('connect-new-name');
    labelInput = labelInput || $('connect-new-label');
    shapeSelect = shapeSelect || $('connect-new-shape');
    linkTypeSelect = linkTypeSelect || $('connect-new-link-type');
    linkLabelInput = linkLabelInput || $('connect-new-link-label');
    sourceSelect = sourceSelect || $('connect-new-source');
    previewEl = previewEl || $('connect-new-preview');
    submitBtn = submitBtn || $('connect-new-submit');
    cancelBtn = cancelBtn || $('connect-new-cancel');
  }

  function openModal(prefill = '') {
    ensureElements();
    if (!modal) return console.warn('[connect-new-node] modal element missing');

    const preset = lastPresetConfig || {};

    if (input) {
      if (typeof prefill === 'string' && prefill) {
        input.value = prefill;
      } else if (typeof preset.targetId === 'string' && preset.targetId) {
        input.value = preset.targetId;
      } else {
        input.value = '';
      }
    }

    if (labelInput) {
      labelInput.value = (typeof preset.targetLabel === 'string' && preset.targetLabel) ? preset.targetLabel : '';
    }

    if (shapeSelect) {
      const desiredShape = (typeof preset.shape === 'string' && preset.shape) ? preset.shape : (shapeSelect.value || '');
      shapeSelect.value = desiredShape;
    }

    if (linkTypeSelect) {
      const desiredLinkType = (typeof preset.linkType === 'string' && preset.linkType) ? preset.linkType : (linkTypeSelect.value || '-->');
      linkTypeSelect.value = desiredLinkType;
    }

    if (linkLabelInput) {
      linkLabelInput.value = (typeof preset.linkLabel === 'string' && preset.linkLabel) ? preset.linkLabel : '';
    }

    // Populate source dropdown using detected nodes, preferring preset.sourceId if provided
    populateSourceSelect((typeof preset.sourceId === 'string' && preset.sourceId) ? preset.sourceId : null);

    updatePreview();

    modal.style.display = 'block';
    // Focus input on next frame for reliability
    requestAnimationFrame(() => { try { input.focus(); } catch (_) {} });
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    lastPresetConfig = null;
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
    // Prefer canonical node id derived from the SVG element id
    const normalized = normalizeNodeId(ctx.id || '');
    if (normalized) return normalized;
    // Last resort: fall back to visible label
    const byLabel = getNodeLabelFromElement(ctx.element);
    if (byLabel) return byLabel;
    return '';
  }

  function normalizeNodeId(rawId) {
    if (!rawId) return '';
    let id = String(rawId);
    const primaryMatch = id.match(/(?:flowchart|state|id|node)[-_]([A-Za-z0-9_-]+)/);
    if (primaryMatch) {
      id = primaryMatch[1];
    } else {
      id = id.replace(/^(state-|node-|flowchart-)/i, '');
    }
    id = id.replace(/-\d+$/i, '');
    return id.trim();
  }

  function collectNodeNames() {
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
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  function buildNodeDefinition(id, label, shape) {
    const cleanId = (id || '').trim();
    const cleanLabel = (label || '').trim();
    const cleanShape = (shape || '').trim();
    if (!cleanId) return '';

    function escapeLabel(text) {
      return String(text).replace(/"/g, '\\"');
    }

    // Map short shape names to classic bracket-based syntax
    // See docs/mermaid-node-shapes-and-links.md (Classic Bracket-Based Shapes)
    const shapeBrackets = {
      // Default rectangle / process
      rect: { open: '["', close: '"]' },
      // Rounded rectangle: id(This is the text in the box)
      rounded: { open: '("', close: '")' },
      // Stadium / pill: id([This is the text in the box])
      stadium: { open: '(["', close: '"])' },
      // Subroutine: id[[This is the text in the box]]
      subproc: { open: '[["', close: '"]]' },
      // Cylinder / database: id[(Database)]
      cyl: { open: '[("', close: '")]' },
      // Circle: id((This is the text in the circle))
      circle: { open: '(("', close: '"))' },
      // Small circle: no direct bracket form; approximate with regular circle
      'sm-circ': { open: '(("', close: '"))' },
      // Double circle: id(((This is the text in the circle)))
      'dbl-circ': { open: '((("', close: '")))' },
      // Diamond / decision: id{This is the text in the box}
      diam: { open: '{"', close: '"}' },
      // Hexagon: id{{This is the text in the box}}
      hex: { open: '{{"', close: '"}}' },
      // Parallelogram: id[/This is the text in the box/]
      'lean-r': { open: '[/"', close: '"/]' },
      // Parallelogram alt: id[\This is the text in the box\]
      'lean-l': { open: '[\\"', close: '"\\]' },
      // Trapezoid: A[/Christmas\]
      'trap-t': { open: '[/"', close: '"\\]' },
      // Trapezoid alt: B[\Go shopping/]
      'trap-b': { open: '[\\"', close: '"/]' },
      // For shapes without explicit classic brackets, fall back to rectangle behavior below
    };

    const brackets = cleanShape && (shapeBrackets[cleanShape] || null);
    const effectiveLabel = cleanLabel || cleanId;

    if (brackets) {
      return `${cleanId}${brackets.open}${escapeLabel(effectiveLabel)}${brackets.close}`;
    }

    // No specific shape mapping: if a label is provided, use a simple rectangle syntax with quotes
    if (cleanLabel) {
      return `${cleanId}["${escapeLabel(cleanLabel)}"]`;
    }

    return cleanId;
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

    // Other link types do not have a standard labeled form; fall back to unlabeled
    return buildEdgeLine(src, dst, kind, '');
  }

  function populateSourceSelect(preferredId) {
    ensureElements();
    if (!sourceSelect) return;

    const names = collectNodeNames();
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
    const nodeId = (input && input.value || '').trim();
    const nodeLabel = (labelInput && labelInput.value || '').trim();
    const shape = (shapeSelect && shapeSelect.value || '').trim();
    const linkType = (linkTypeSelect && linkTypeSelect.value || '-->').trim();
    const linkLabel = (linkLabelInput && linkLabelInput.value || '').trim();
    const explicitSource = (sourceSelect && sourceSelect.value || '').trim();
    const source = explicitSource || deriveSourceName(lastContext) || '';

    const nodeDef = buildNodeDefinition(nodeId, nodeLabel, shape);
    const edgeLine = buildEdgeLine(source, nodeId, linkType, linkLabel);

    return { source, nodeId, nodeLabel, shape, linkType, linkLabel, nodeDef, edgeLine };
  }

  function updatePreview() {
    ensureElements();
    if (!previewEl) return;

    const cfg = getCurrentConfig();
    const lines = [];
    if (cfg.nodeDef) lines.push(`    ${cfg.nodeDef}`);
    if (cfg.edgeLine) lines.push(`    ${cfg.edgeLine}`);

    previewEl.textContent = lines.join('\n');
  }

  function onSubmit() {
    const cfg = getCurrentConfig();
    const name = cfg.nodeId;
    if (!name) {
      if (typeof showAlert === 'function') {
        try { showAlert('Please enter a node name', 'warning'); } catch (_) {}
      } else {
        try { console.warn('Please enter a node name'); } catch (_) {}
      }
      try { input.focus(); } catch (_) {}
      return;
    }
    if (cfg.nodeDef) appendLineToEditor(`    ${cfg.nodeDef}`);
    if (cfg.edgeLine) appendLineToEditor(`    ${cfg.edgeLine}`);
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
      input.addEventListener('input', updatePreview);
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

    if (linkLabelInput) {
      linkLabelInput.addEventListener('input', updatePreview);
    }

    if (sourceSelect) {
      sourceSelect.addEventListener('change', updatePreview);
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
    lastPresetConfig = (e && e.detail && e.detail.config) || null;
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
