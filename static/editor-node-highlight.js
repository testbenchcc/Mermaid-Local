/*
 * Editor Node Highlighting
 * Connects SVG diagram elements to their source code in the editor
 * Highlights the corresponding text in the editor when a node is clicked in the diagram
 */
(function() {
  'use strict';

  // Store node ID to text position mappings
  let nodeToTextMap = new Map();
  
  // Default highlight color (compatible with both light and dark themes)
  const DEFAULT_HIGHLIGHT_COLOR = 'rgba(65, 184, 255, 0.3)';
  
  // Highlight duration in milliseconds
  const HIGHLIGHT_DURATION_MS = 2000;
  
  // Reference to any active highlight timeout
  let highlightTimeout = null;
  
  /**
   * Maps nodes in a Mermaid diagram to their positions in the text
   * @param {string} text The editor text content
   */
  // Export mapNodesToText to make it globally available
  window.mapNodesToText = mapNodesToText;
  
  function mapNodesToText(text) {
    console.log('Mapping nodes to text');
    nodeToTextMap.clear();
    
    // Split the text into lines
    const lines = text.split('\n');
    
    // Try to detect the diagram type
    let diagramType = 'unknown';
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('graph') || line.startsWith('flowchart')) {
        diagramType = 'flowchart';
        break;
      } else if (line.startsWith('stateDiagram') || line.startsWith('stateDiagram-v2')) {
        diagramType = 'state';
        break;
      } else if (line.startsWith('sequenceDiagram')) {
        diagramType = 'sequence';
        break;
      } else if (line.startsWith('classDiagram')) {
        diagramType = 'class';
        break;
      } else if (line.startsWith('erDiagram')) {
        diagramType = 'er';
        break;
      }
    }
    
    console.log('Detected diagram type:', diagramType);
    console.log('Text content length:', text.length);
    
    // Process each line based on diagram type
    lines.forEach((line, lineIndex) => {
      // Skip empty lines and comments
      if (line.trim() === '' || line.trim().startsWith('%%')) return;
      
      if (diagramType === 'flowchart') {
        // Match standalone node definitions in flowcharts
        // e.g. "A[Hard edge]" or "B(Round edge)"
        const nodeMatches = line.matchAll(/\s*([A-Za-z0-9_-]+)(\[|\(|\{|\>|\{\{|\[\[)([^\]\)\}\>]*)\2?\s*$/g);
        for (const match of nodeMatches) {
          const nodeId = match[1].trim();
          const startChar = line.indexOf(match[0]);
          const endChar = startChar + match[0].length;
          
          nodeToTextMap.set(nodeId, {
            start: { line: lineIndex, character: startChar },
            end: { line: lineIndex, character: endChar }
          });
          console.log('Added flowchart node:', nodeId, 'at line', lineIndex);
        }
        
        // Match connections with implicit nodes in flowcharts
        // e.g. "A --> B" defines both A and B if not already defined
        const connMatches = line.matchAll(/\s*([A-Za-z0-9_-]+)\s*(--.*?-->|==.*?==>|-.->|-.->|-.\|>|<-.->|<-.*-\|)\s*([A-Za-z0-9_-]+)/g);
        for (const match of connMatches) {
          const startNode = match[1].trim();
          const endNode = match[3].trim();
          const startChar = line.indexOf(match[0]);
          const endChar = startChar + match[0].length;
          
          if (!nodeToTextMap.has(startNode)) {
            nodeToTextMap.set(startNode, {
              start: { line: lineIndex, character: startChar },
              end: { line: lineIndex, character: startChar + startNode.length }
            });
            console.log('Added flowchart connection source:', startNode, 'at line', lineIndex);
          }
          
          if (!nodeToTextMap.has(endNode)) {
            const endNodeStart = line.indexOf(endNode, startChar);
            nodeToTextMap.set(endNode, {
              start: { line: lineIndex, character: endNodeStart },
              end: { line: lineIndex, character: endNodeStart + endNode.length }
            });
            console.log('Added flowchart connection target:', endNode, 'at line', lineIndex);
          }
        }
      } 
      else if (diagramType === 'state') {
        // Special logging for state diagrams
        console.log('Processing state diagram line:', line);
        
        // Check for transitions which are the most common state diagram patterns
        // e.g. "Still --> Moving" or "[*] --> Still"
        // Using matchAll instead of match to find ALL transitions in a line
        const transitionRegex = /([^\s\[]+|\[\*\])\s*(-->|==>)\s*([^\s\[]+|\[\*\])\b/g;
        const transMatches = Array.from(line.matchAll(transitionRegex));
        
        if (transMatches.length > 0) {
          for (const transMatch of transMatches) {
            const sourceState = transMatch[1].trim();
            const targetState = transMatch[3].trim();
            
            console.log('Found transition:', sourceState, '-->', targetState);
            
            // Map source state if it's not a special marker
            if (sourceState !== '[*]') { 
              const sourceChar = line.indexOf(sourceState, transMatch.index);
              nodeToTextMap.set(sourceState, {
                start: { line: lineIndex, character: sourceChar },
                end: { line: lineIndex, character: sourceChar + sourceState.length }
              });
              console.log('Added state from transition (source):', sourceState, 'at line', lineIndex, 'char', sourceChar);
            }
            
            // Map target state if it's not a special marker
            if (targetState !== '[*]') { 
              const targetChar = line.indexOf(targetState, transMatch.index);
              nodeToTextMap.set(targetState, {
                start: { line: lineIndex, character: targetChar },
                end: { line: lineIndex, character: targetChar + targetState.length }
              });
              console.log('Added state from transition (target):', targetState, 'at line', lineIndex, 'char', targetChar);
            }
          }
        } 
        // Next check for standalone state definitions
        // e.g. "State1: description" or just "State1"
        else {
          const stateRegex = /^\s*([A-Za-z0-9_-]+)(?:\s*:|\s|$)/;
          const stateMatch = line.match(stateRegex);
          
          if (stateMatch && stateMatch[1] !== '[*]') {
            const stateId = stateMatch[1].trim();
            const stateChar = line.indexOf(stateId);
            
            console.log('Found standalone state:', stateId);
            nodeToTextMap.set(stateId, {
              start: { line: lineIndex, character: stateChar },
              end: { line: lineIndex, character: stateChar + stateId.length }
            });
            console.log('Added standalone state:', stateId, 'at line', lineIndex, 'char', stateChar);
          }
        }
      }
    });
    
    // Log the final map
    console.log('Final nodeToTextMap:', Array.from(nodeToTextMap.entries()));
    console.log('Mapped nodes to text positions:', nodeToTextMap.size);
  }
  
  /**
   * Highlights all instances of a node name in the editor
   * @param {Object} position Position object with start and end properties, each with line and character
   * @param {HTMLElement} editor The editor element (contenteditable div)
   */
  function highlightTextInEditor(position, editor) {
    console.log('Highlighting text at position:', position);
    
    // Get all text in the editor
    const allText = editor.textContent;
    
    // Split into lines
    const lines = allText.split('\n');
    
    // Get the node name from the position
    const targetLine = position.start.line;
    const startChar = position.start.character;
    const endChar = position.end.character;
    
    if (!lines[targetLine]) {
      console.error('Target line not found:', targetLine);
      return;
    }
    
    const nodeName = lines[targetLine].substring(startChar, endChar);
    console.log('Node name to highlight:', nodeName);
    
    if (!nodeName) {
      console.error('No node name found at position');
      return;
    }
    
    // Create a temporary DOM element to parse the editor content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.innerHTML;
    
    // Function to escape special regex characters
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    // Create a regex to find all instances of the node name (as a whole word)
    const nodeNameRegex = new RegExp(`(${escapeRegExp(nodeName)})(?=\\s|\\n|$|[,;:.)]|-->|==>)`, 'g');
    
    // Replace all instances with highlighted spans
    tempDiv.innerHTML = tempDiv.innerHTML
      .replace(/<span class="node-highlight">(.*?)<\/span>/g, '$1') // Remove existing highlights
      .replace(nodeNameRegex, '<span class="node-highlight">$1</span>');
    
    // Apply the changes to the editor
    editor.innerHTML = tempDiv.innerHTML;
    
    // Scroll to the first highlighted element
    const firstHighlight = editor.querySelector('.node-highlight');
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * Flash effect for the editor to make changes noticeable
   * @param {HTMLElement} editor - The editor element
   */
  function flashSelection(editor) {
    const originalBackground = editor.style.backgroundColor;
    editor.style.backgroundColor = 'rgba(255, 235, 59, 0.2)';
    setTimeout(() => {
      editor.style.backgroundColor = originalBackground;
    }, 1000);
  }
  
  /**
   * Scroll the editor to make the selected text visible
   * @param {HTMLTextAreaElement} editor - The editor element
   * @param {number} position - The character position to scroll to
   */
  function scrollToPosition(editor, position) {
    // Create a temporary div with the same styling as the textarea
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '0';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = getComputedStyle(editor).width;
    tempDiv.style.height = 'auto';
    tempDiv.style.fontSize = getComputedStyle(editor).fontSize;
    tempDiv.style.fontFamily = getComputedStyle(editor).fontFamily;
    tempDiv.style.lineHeight = getComputedStyle(editor).lineHeight;
    tempDiv.style.whiteSpace = 'pre-wrap';
    
    // Add text up to the position
    tempDiv.textContent = editor.value.substring(0, position);
    document.body.appendChild(tempDiv);
    
    // Get the height up to this point
    const height = tempDiv.offsetHeight;
    document.body.removeChild(tempDiv);
    
    // Scroll to the position, with some padding for visibility
    const lineHeight = parseInt(getComputedStyle(editor).lineHeight);
    editor.scrollTop = Math.max(0, height - editor.clientHeight / 2);
  }
  
  /**
   * Apply visual highlighting styles to the selected text
   * @param {HTMLTextAreaElement} editor - The editor element
   * @param {number} startPos - The start position of the text
   * @param {number} endPos - The end position of the text
   */
  function applyHighlightStyles(editor, startPos, endPos) {
    // We'll keep the selection but add a background color to the textarea
    // Note: textarea doesn't support ::selection styling for specific ranges,
    // so we use a timeout-based approach to clear the highlight after a while
    
    // Back up the current styles
    const currentBg = editor.style.backgroundColor;
    const currentSelection = window.getComputedStyle(editor).getPropertyValue('--selection-bg') || 
                            window.getComputedStyle(document.documentElement).getPropertyValue('--selection-bg') || 
                            DEFAULT_HIGHLIGHT_COLOR;
    
    // Set the highlight color
    document.documentElement.style.setProperty('--selection-bg', DEFAULT_HIGHLIGHT_COLOR);
    
    // Clear any existing timeout
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }
    
    // Set a timeout to clear the highlighting
    highlightTimeout = setTimeout(() => {
      document.documentElement.style.setProperty('--selection-bg', currentSelection);
      editor.setSelectionRange(editor.selectionStart, editor.selectionStart); // Clear selection
    }, HIGHLIGHT_DURATION_MS);
  }
  
  /**
   * Extract node ID from SVG element
   * @param {SVGElement} element - The SVG element that was clicked
   * @returns {string|null} - The extracted node ID or null
   */
  function extractNodeId(element) {
    console.log('Extracting node ID from element:', element);
    console.log('Element ID:', element.getAttribute('id'));
    
    // Attempt to get ID directly
    let id = element.getAttribute('id');
    
    // Special case for Mermaid v9+ flowchart nodes
    if (element.classList && element.classList.contains('node')) {
      // For flowchart nodes, check for label which often contains the node ID
      const labelEl = element.querySelector('.nodeLabel, .label');
      if (labelEl) {
        const labelText = labelEl.textContent.trim();
        console.log('Node label text:', labelText);
        
        // Try to extract the node ID from the first word
        const nodeIdMatch = labelText.match(/^([A-Za-z0-9_-]+)(?:\s|$)/);
        if (nodeIdMatch) {
          console.log('Found node ID from label:', nodeIdMatch[1]);
          return nodeIdMatch[1];
        }
      }
    }
    
    // If no direct ID, look for text content
    if (!id) {
      // Try to find text element within this node
      const textEl = element.querySelector('text');
      if (textEl) {
        const text = textEl.textContent.trim();
        console.log('Text content:', text);
        
        // Extract first word as potential ID
        const match = text.match(/^([A-Za-z0-9_-]+)(?:\s|$)/);
        if (match) {
          id = match[1];
          console.log('Extracted ID from text:', id);
        }
      }
    }
    
    // If we still don't have an ID, look at the shape ID
    if (!id && element.tagName === 'g') {
      // Check for rect, circle, etc. with an ID
      const shape = element.querySelector('rect, circle, ellipse, polygon, path');
      if (shape) {
        id = shape.getAttribute('id');
        console.log('Got ID from shape:', id);
      }
    }
    
    // Process ID if found
    if (id) {
      // Common patterns in Mermaid SVG IDs
      // flowchart-A-17 -> A
      // id-1-33 -> 1
      const idMatch = id.match(/(?:flowchart|state|id|node)[-_]([A-Za-z0-9_-]+)(?:[-_]\d+)?/);
      if (idMatch) {
        const extractedId = idMatch[1];
        console.log('Extracted ID from pattern:', extractedId);
        return extractedId;
      }
      
      // Simple ID
      if (/^[A-Za-z0-9_-]+$/.test(id)) {
        console.log('Using simple ID:', id);
        return id;
      }
    }
    
    // Try a last approach - look for a string that could be a node ID in our map
    const allText = element.textContent.trim();
    const words = allText.split(/\s+/);
    for (const word of words) {
      if (nodeToTextMap.has(word)) {
        console.log('Found matching node ID in text:', word);
        return word;
      }
    }
    
    console.warn('Failed to extract node ID');
    return null;
  }
  
  /**
   * Initialize the node highlight functionality
   */
  function initialize() {
    // Ensure we have the editor
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !preview) {
      console.error('Editor-Node-Highlight: Required elements not found');
      return;
    }
    
    // Force map update when clicking a node to ensure latest mappings
    let lastMapUpdate = 0;
    document.addEventListener('svgitem:click', () => {
      // Only update if it's been more than 2 seconds since last update
      const now = Date.now();
      if (now - lastMapUpdate > 2000) {
        console.log('Force updating node map before processing click');
        mapNodesToText(editor.textContent);
        lastMapUpdate = now;
      }
    }, true); // Use capturing phase to run before node click handler
    
    // Add CSS for selection highlighting
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #editor::selection {
        background-color: var(--selection-bg, ${DEFAULT_HIGHLIGHT_COLOR});
      }
      
      /* Flash animation for the editor when text is selected */
      .flash-selection {
        animation: highlight-flash 1s ease-in-out;
      }
      
      @keyframes highlight-flash {
        0%, 100% { background-color: transparent; }
        25% { background-color: rgba(65, 184, 255, 0.1); }
        50% { background-color: rgba(65, 184, 255, 0.2); }
      }
      
      /* Make text selection more visible */
      textarea#editor {
        caret-color: #4285f4;
      }
      
      /* Override default selection colors for better visibility */
      textarea#editor::selection {
        background-color: rgba(65, 184, 255, 0.4) !important;
        color: inherit;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Process the initial code
    mapNodesToText(editor.textContent);
    
    // When the editor changes, update our node mappings
    editor.addEventListener('input', () => {
      // Debounce this operation for performance
      clearTimeout(editor.mapNodesTimeout);
      editor.mapNodesTimeout = setTimeout(() => {
        mapNodesToText(editor.textContent);
      }, 300);
    });
    
    // Also listen for keydown events since contenteditable might not always trigger input
    editor.addEventListener('keydown', () => {
      clearTimeout(editor.mapNodesTimeout);
      editor.mapNodesTimeout = setTimeout(() => {
        mapNodesToText(editor.textContent);
      }, 500);
    });
    
    // When a node is clicked in any SVG, try to highlight the corresponding text
    document.addEventListener('svgitem:click', (e) => {
      if (e.detail.kind === 'node') {
        const nodeId = extractNodeId(e.detail.element);
        console.log('Node clicked:', nodeId);
        
        if (nodeId && nodeToTextMap.has(nodeId)) {
          const position = nodeToTextMap.get(nodeId);
          console.log('Found position for node', nodeId, ':', position);
          highlightTextInEditor(position, editor);
        } else if (nodeId) {
          console.warn('Node ID found but not in text map:', nodeId);
          // Try remapping nodes before giving up
          console.log('Forcing node map update and trying again...');
          mapNodesToText(editor.textContent);
          
          // For state diagrams, try to strip prefixes like 'state-' that might be in the SVG ID
          if (nodeId.startsWith('state-') || nodeId.includes('-')) {
            // First try just the part after 'state-'
            let simpleId = nodeId.replace(/^state-/, '');
            
            // If there's still a dash (like in 'root_end-5'), take just the first part
            if (simpleId.includes('-')) {
              simpleId = simpleId.split('-')[0];
            }
            
            console.log('Trying simplified state ID:', simpleId);
            if (nodeToTextMap.has(simpleId)) {
              console.log('Found match with simplified ID:', simpleId);
              highlightTextInEditor(nodeToTextMap.get(simpleId), editor);
              return; // We found a match, no need to continue
            }
          }
          
          // Try to find a node ID that's close to this one
          const keys = Array.from(nodeToTextMap.keys());
          const similarKey = keys.find(k => k.toLowerCase().includes(nodeId.toLowerCase()) || 
                                        nodeId.toLowerCase().includes(k.toLowerCase()));
          if (similarKey) {
            console.log('Found similar node ID:', similarKey);
            highlightTextInEditor(nodeToTextMap.get(similarKey), editor);
          }
        }
      }
    });
    
    // Also respond when the diagram is re-rendered
    document.getElementById('render-btn').addEventListener('click', () => {
      console.log('Render button clicked, updating node map');
      setTimeout(() => {
        mapNodesToText(editor.textContent);
        console.log('Node map updated after render button click');
      }, 300);
    });
    
    // Hook into script.js's Mermaid rendering lifecycle
    // We're creating our own hook that will run after Mermaid has rendered
    // and after script.js has attached SVG interactions
    const originalMermaidInit = mermaid.init;
    mermaid.init = function(...args) {
      console.log('Intercepted mermaid.init, will update node map after render');
      const result = originalMermaidInit.apply(this, args);
      
      // After Mermaid has rendered, update our node mappings
      setTimeout(() => {
        console.log('CRITICAL: Updating node map after Mermaid render');
        mapNodesToText(editor.textContent);
        console.log('Node map updated. Current map size:', nodeToTextMap.size);
        console.log('Map entries:', Array.from(nodeToTextMap.entries()));
      }, 150); // Set timeout slightly higher than script.js (100ms)
      
      return result;
    };
    
    // Listen for manual renders via the button click as a fallback
    document.getElementById('render-btn').addEventListener('click', () => {
      setTimeout(() => {
        console.log('Updating node map after manual render button click');
        mapNodesToText(editor.textContent);
      }, 200);
    });
    
    // Initialize with current content
    if (editor.textContent && editor.textContent !== 'Loading...') {
      console.log('Initializing with current content:', editor.textContent.substring(0, 50) + '...');
      mapNodesToText(editor.textContent);
    }
    
    // Set initial editor content if it's still 'Loading...'
    if (editor.textContent === 'Loading...') {
      editor.textContent = 'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]';
      setTimeout(() => mapNodesToText(editor.textContent), 100);
    }
    
    console.log('Editor Node Highlight initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Export API for external use
  window.EditorNodeHighlight = {
    mapNodesToText,
    highlightTextInEditor
  };
  
  // Debug helper: highlight by node ID directly
  window.highlightNodeById = function(nodeId) {
    const editor = document.getElementById('editor');
    if (!editor) return console.warn('Editor not found');
    if (nodeToTextMap.has(nodeId)) {
      highlightTextInEditor(nodeToTextMap.get(nodeId), editor);
    } else {
      console.warn('Node ID not found in map:', nodeId, 'Available keys:', Array.from(nodeToTextMap.keys()));
    }
  };
})();
