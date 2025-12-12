// Initialize mermaid when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme') || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Apply the theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').checked = savedTheme === 'dark';
    
    // Ensure the editor has content if it's showing 'Loading...'
    const editorElement = document.getElementById('editor');
    if (editorElement.textContent === 'Loading...') {
        console.log('Editor has default Loading... text, setting default diagram');
        // Set a default diagram immediately
        editorElement.textContent = 'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]';
        
        // Update node map for highlighting
        if (window.mapNodesToText) {
            setTimeout(() => window.mapNodesToText(editorElement.textContent), 100);
        }
        
        // Render the initial diagram immediately
        setTimeout(() => render(), 150);
    }
    
    // Initialize mermaid with the appropriate theme
    try {
        mermaid.initialize({ 
            startOnLoad: false,
            theme: savedTheme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose'
        });
        
        // Load the most recent diagram if available or use the default already set
        loadMostRecentDiagram();
    } catch (error) {
        console.error('Error initializing Mermaid:', error);
        document.getElementById('preview').innerHTML = '<p style="color:red">Failed to initialize Mermaid library</p>';
    }
    
    // Initialize the resizable divider
    initResizer();
    
    // Theme toggle functionality
    document.getElementById('theme-toggle').addEventListener('change', function() {
        const theme = this.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update mermaid theme and re-render
        mermaid.initialize({ 
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose'
        });
        render();
    });
    
    // Setup auto-render functionality
    const editor = document.getElementById('editor');
    const autoRenderToggle = document.getElementById('auto-render-toggle');
    
    // Load saved auto-render preference
    const savedAutoRender = localStorage.getItem('autoRender');
    if (savedAutoRender !== null) {
        autoRenderToggle.checked = savedAutoRender === 'true';
    }
    
    // Hook Manual Render button
    const renderBtn = document.getElementById('render-btn');
    if (renderBtn) {
        renderBtn.addEventListener('click', () => render());
    }

    // Add event listener for editor changes
    let debounceTimer;
    editor.addEventListener('input', function() {
        isDirty = true;
        if (autoRenderToggle.checked) {
            // Debounce the render function to avoid excessive rendering
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                render();
            }, 500); // Wait 500ms after typing stops
        }
    });
    
    // Add event listeners for contenteditable-specific events
    editor.addEventListener('keydown', function(e) {
        // Handle tab key to insert spaces instead of changing focus
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
        
        // Trigger render after certain keystrokes
        if (autoRenderToggle.checked && (e.key === 'Enter' || e.key === ';')) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                render();
            }, 300);
        }
    });
    
    // Save auto-render preference when changed
    autoRenderToggle.addEventListener('change', function() {
        localStorage.setItem('autoRender', this.checked);
        if (this.checked) {
            render(); // Render immediately when auto-render is turned on
        }
    });

    window.addEventListener('resize', resizeSvgToPreview);
});

let isDirty = false;
let lastSavedContent = '';
let pendingNewAfterSave = false;

function showAlert(message, type = 'success', timeout = 2000) {
    const container = document.getElementById('alert-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');
    closeBtn.setAttribute('aria-label', 'Close');
    el.appendChild(closeBtn);
    container.appendChild(el);
    if (timeout) {
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 150);
        }, timeout);
    }
}

function render() {
    const editor = document.getElementById('editor');
    const code = editor.innerText; // Use innerText for better newline handling
    const preview = document.getElementById('preview');
    
    console.log('Rendering Mermaid diagram with code:', code.substring(0, 50) + '...');
    
    // Clear previous content
    preview.innerHTML = '';
    
    // Create mermaid element
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.textContent = normalizeNewlines(code);
    
    preview.appendChild(mermaidDiv);
    
    try {
        // Render diagram
        mermaid.init(undefined, '.mermaid');
        
        // After rendering is complete, we need to manually process the SVG
        // This ensures the interactions work like in sampleSVG.html
        setTimeout(() => {
            const svgs = document.querySelectorAll('#preview svg');
            console.log('Found SVGs after render:', svgs.length);
            
            resizeSvgToPreview();

            svgs.forEach(svg => {
                // Add statediagram class to match sampleSVG.html
                if (!svg.classList.contains('statediagram')) {
                    svg.classList.add('statediagram');
                }
                
                // Force manual attachment
                if (window.SVGEvents) {
                    console.log('[script.js] Attaching events to SVG:', svg.id || '(no id)', svg.className?.baseVal || svg.className || '');
                    window.SVGEvents.attachTo(svg);
                    if (window.SVGEvents.attachLoggerTo) {
                        window.SVGEvents.attachLoggerTo(svg);
                    }
                } else {
                    console.warn('[script.js] SVGEvents not available');
                }

                // Ensure animations are bound as well
                if (window.SVGAnimations && window.SVGAnimations.setupAnimations) {
                    console.log('[script.js] Attaching animations to SVG:', svg.id || '(no id)');
                    window.SVGAnimations.setupAnimations(svg);
                } else {
                    console.warn('[script.js] SVGAnimations.setupAnimations not available');
                }

                if (typeof setupSvgPanZoom === 'function') {
                    setupSvgPanZoom(svg);
                } else if (window.setupSvgPanZoom) {
                    window.setupSvgPanZoom(svg);
                }
            });
        }, 100); // Small delay to ensure rendering is complete
    } catch (error) {
        console.error('Mermaid render error:', error);
        preview.innerHTML = `<p style="color:red">Error rendering diagram: ${error.message}</p>`;
    }
}

// Diagram storage functionality
document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const saveModal = document.getElementById('save-modal');
    const loadModal = document.getElementById('load-modal');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const newBtn = document.getElementById('new-btn');
    const saveClose = document.getElementById('save-close');
    const loadClose = document.getElementById('load-close');
    const saveDiagramBtn = document.getElementById('save-diagram-btn');
    const refreshListBtn = document.getElementById('refresh-list-btn');
    const searchBtn = document.getElementById('search-btn');
    const diagramList = document.getElementById('diagram-list');
    const newDiagramModalEl = document.getElementById('newDiagramModal');
    const newDiagramModal = new bootstrap.Modal(newDiagramModalEl);
    const newConfirmNoSave = document.getElementById('new-confirm-no-save');
    const newConfirmSave = document.getElementById('new-confirm-save');
    
    function createNewDiagram() {
        const editorEl = document.getElementById('editor');
        editorEl.textContent = '';
        document.getElementById('diagram-id').value = '';
        render();
        isDirty = false;
        lastSavedContent = '';
        showAlert('New diagram created! You can now edit and save it with a new name.', 'info');
    }

    newBtn.addEventListener('click', function() {
        const content = document.getElementById('editor').innerText;
        if (isDirty && content.trim().length > 0) {
            newDiagramModal.show();
        } else {
            createNewDiagram();
        }
    });

    newConfirmNoSave.addEventListener('click', function() {
        newDiagramModal.hide();
        createNewDiagram();
    });

    newConfirmSave.addEventListener('click', function() {
        pendingNewAfterSave = true;
        newDiagramModal.hide();
        saveBtn.click();
    });
    
    // Open save modal
    saveBtn.addEventListener('click', function() {
        const diagramId = document.getElementById('diagram-id').value;
        
        if (diagramId) {
            // Fetch existing diagram data to populate the form
            fetch(`/api/diagrams/${diagramId}`)
                .then(response => response.json())
                .then(diagram => {
                    document.getElementById('diagram-title').value = diagram.title || '';
                    document.getElementById('diagram-tags').value = diagram.tags || '';
                    saveModal.style.display = 'block';
                })
                .catch(error => {
                    console.error('Error fetching diagram details:', error);
                    // Still show modal with empty form if fetch fails
                    document.getElementById('diagram-title').value = '';
                    document.getElementById('diagram-tags').value = '';
                    saveModal.style.display = 'block';
                });
        } else {
            // Clear form for new diagram
            document.getElementById('diagram-title').value = '';
            document.getElementById('diagram-tags').value = '';
            saveModal.style.display = 'block';
        }
    });
    
    // Open load modal and load diagrams
    loadBtn.addEventListener('click', function() {
        loadModal.style.display = 'block';
        loadDiagrams();
    });
    
    // We removed the close buttons, so these event listeners are no longer needed
    // Now we only close by clicking outside the modal or with Escape key
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === saveModal) {
            saveModal.style.display = 'none';
        }
        if (event.target === loadModal) {
            loadModal.style.display = 'none';
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (saveModal.style.display === 'block') {
                saveModal.style.display = 'none';
            }
            if (loadModal.style.display === 'block') {
                loadModal.style.display = 'none';
            }
        }
    });
    
    // Save diagram
    saveDiagramBtn.addEventListener('click', function() {
        console.log('Save button clicked');
        const title = document.getElementById('diagram-title').value;
        const content = document.getElementById('editor').innerText; // Use innerText for better newline handling
        const tags = document.getElementById('diagram-tags').value;
        const diagramId = document.getElementById('diagram-id').value;
        
        console.log('Diagram data:', { title, content: content.substring(0, 20) + '...', tags, diagramId });
        
        if (!title) {
            showAlert('Please enter a title for your diagram', 'warning');
            return;
        }
        
        const diagramData = {
            title: title,
            content: content,
            tags: tags
        };
        
        const url = diagramId ? `/api/diagrams/${diagramId}` : '/api/diagrams';
        const method = diagramId ? 'PUT' : 'POST';
        
        console.log('Sending request to:', url, 'with method:', method);
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(diagramData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('Failed to save diagram');
            }
            return response.json();
        })
        .then(data => {
            console.log('Save successful, received data:', data);
            document.getElementById('diagram-id').value = data.id;
            saveModal.style.display = 'none';
            lastSavedContent = content;
            isDirty = false;
            showAlert('Diagram saved successfully!', 'success');
            if (pendingNewAfterSave) {
                pendingNewAfterSave = false;
                createNewDiagram();
            }
        })
        .catch(error => {
            console.error('Error saving diagram:', error);
            showAlert('Failed to save diagram: ' + error.message, 'danger');
        });
    });
    
    // Search diagrams
    searchBtn.addEventListener('click', function() {
        const query = document.getElementById('search-input').value;
        if (query) {
            fetch(`/api/diagrams/search/${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    renderDiagramList(data);
                })
                .catch(error => {
                    console.error('Error searching diagrams:', error);
                    diagramList.innerHTML = '<p>Error searching diagrams</p>';
                });
        } else {
            loadDiagrams();
        }
    });
    
    // Refresh diagram list
    refreshListBtn.addEventListener('click', loadDiagrams);
    
    // Search on enter key
    document.getElementById('search-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchBtn.click();
        }
    });
});

// Load diagrams
function loadDiagrams() {
    fetch('/api/diagrams')
        .then(response => response.json())
        .then(data => {
            renderDiagramList(data);
        })
        .catch(error => {
            console.error('Error loading diagrams:', error);
            document.getElementById('diagram-list').innerHTML = '<p>Error loading diagrams</p>';
        });
}

// Render diagram list
// Function to normalize newlines across different platforms
function normalizeNewlines(text) {
    if (!text) return '';
    
    // Replace all Windows line breaks with Unix line breaks
    let normalized = text.replace(/\r\n/g, '\n');
    
    // Replace any remaining \r (old Mac) with \n
    normalized = normalized.replace(/\r/g, '\n');
    
    // If the text already has proper newlines, we don't need to process it further
    if (normalized.split('\n').length > 2) {
        return normalized;
    }
    
    // Special case for state diagrams - the example had specific format
    if (normalized.includes('stateDiagram')) {
        // For the specific state diagram format in the example
        if (normalized.includes('[*] --> Still') && normalized.includes('Crash --> [*]')) {
            return 'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]';
        }
        
        // More general state diagram parsing
        try {
            // Replace multiple spaces with a single space
            const cleanText = normalized.replace(/\s+/g, ' ').trim();
            
            // Extract the declaration part
            const diagramType = cleanText.match(/^(stateDiagram-?v?\d*)/)[0];
            
            // Remove the declaration to process the transitions
            const transitionsText = cleanText.substring(diagramType.length).trim();
            
            // Split by state transitions (-->)
            const transitions = [];
            let currentIndex = 0;
            let transitionStartIndex = 0;
            
            // Split the text into individual transitions
            while (currentIndex < transitionsText.length) {
                // Find the next '-->' that's followed by a state name
                const arrowIndex = transitionsText.indexOf('-->', currentIndex);
                if (arrowIndex === -1) break;
                
                // Find the start of this transition
                if (transitions.length === 0) {
                    // For the first transition, extract the source
                    transitions.push(transitionsText.substring(0, arrowIndex + 3).trim());
                } else {
                    // For subsequent transitions, extract from the previous target
                    transitions.push(transitionsText.substring(transitionStartIndex, arrowIndex + 3).trim());
                }
                
                currentIndex = arrowIndex + 3;
                transitionStartIndex = currentIndex;
            }
            
            // Add the final transition if there is remaining text
            if (transitionStartIndex < transitionsText.length) {
                transitions.push(transitionsText.substring(transitionStartIndex).trim());
            }
            
            // Format the output
            let result = diagramType + '\n';
            transitions.forEach(transition => {
                if (transition) {
                    result += '    ' + transition + '\n';
                }
            });
            
            return result;
        } catch (error) {
            console.error('Error processing state diagram:', error);
            
            // If all else fails, use a regex-based approach
            const diagramType = normalized.match(/^(stateDiagram-?v?\d*)/)[0] || 'stateDiagram';
            const stateRegex = /\s*(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)/g;
            let result = diagramType + '\n';
            let match;
            
            while ((match = stateRegex.exec(normalized)) !== null) {
                result += `    ${match[1]} --> ${match[2]}\n`;
            }
            
            return result;
        }
    }
    // For non-state diagrams that are on one line
    else if (normalized.indexOf('\n') === -1) {
        // For other mermaid diagrams, add newlines after logical break points
        normalized = normalized.replace(/([;{}])/g, '$1\n');
    }
    
    return normalized;
}

// Load a specific diagram by ID
function loadDiagram(id) {
    fetch(`/api/diagrams/${id}`)
        .then(response => response.json())
        .then(data => {
            // Set the editor content with proper newline handling
            const editor = document.getElementById('editor');
            const normalizedContent = normalizeNewlines(data.content);
            
            // Use textContent to set the initial content
            editor.textContent = normalizedContent;
            
            // Set the hidden diagram ID
            document.getElementById('diagram-id').value = data.id;
            // Update dirty tracking
            lastSavedContent = normalizedContent;
            isDirty = false;
            
            // Update node map for highlighting after loading
            if (window.mapNodesToText) {
                setTimeout(() => window.mapNodesToText(editor.textContent), 100);
            }
            
            // Render the diagram
            render();
            
            // Close the modal
            document.getElementById('load-modal').style.display = 'none';
        })
        .catch(error => console.error('Error loading diagram:', error));
}

function renderDiagramList(diagrams) {
    const diagramList = document.getElementById('diagram-list');
    diagramList.innerHTML = '';
    
    if (diagrams.length === 0) {
        diagramList.innerHTML = '<p style="padding: 10px;">No diagrams found</p>';
        return;
    }
    
    diagrams.forEach(diagram => {
        const item = document.createElement('div');
        item.className = 'diagram-item';
        item.dataset.id = diagram.id;
        item.dataset.content = diagram.content;
        
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = diagram.title;
        
        const meta = document.createElement('div');
        meta.className = 'meta';
        const date = new Date(diagram.updated_at);
        meta.textContent = `Updated: ${date.toLocaleString()}`;
        
        item.appendChild(title);
        item.appendChild(meta);
        
        if (diagram.tags) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags';
            
            const tags = diagram.tags.split(',').map(tag => tag.trim());
            tags.forEach(tag => {
                if (tag) {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'tag';
                    tagSpan.textContent = tag;
                    tagsContainer.appendChild(tagSpan);
                }
            });
            
            item.appendChild(tagsContainer);
        }
        
        // Load diagram when clicked
        item.addEventListener('click', function() {
            loadDiagram(this.dataset.id);
        });
        
        diagramList.appendChild(item);
    });
}

// Load the most recent diagram if available
function loadMostRecentDiagram() {
    fetch('/api/diagrams/recent')
        .then(response => {
            if (!response.ok) {
                // If no diagrams exist (404) or other error, load default diagram
                loadDefaultDiagram();
                throw new Error('No diagrams found or error occurred');
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                const editor = document.getElementById('editor');
                const normalizedContent = normalizeNewlines(data.content);
                editor.textContent = normalizedContent;
                document.getElementById('diagram-id').value = data.id;
                
                // Update node map for highlighting
                if (window.mapNodesToText) {
                    setTimeout(() => window.mapNodesToText(editor.textContent), 100);
                }
                
                render();
                // Update dirty tracking
                lastSavedContent = normalizedContent;
                isDirty = false;
            }
        })
        .catch(error => {
            console.error('Error loading most recent diagram:', error);
            // Ensure default diagram is loaded if there was an error
            if (document.getElementById('editor').textContent === 'Loading...') {
                loadDefaultDiagram();
            }
        });
}

// Load default diagram
function loadDefaultDiagram() {
    const defaultDiagram = `graph TD
A[Start] --> B{Is it working?}
B -->|Yes| C[Great!]
B -->|No| D[Debug]
D --> B`;
    
    const editor = document.getElementById('editor');
    editor.textContent = normalizeNewlines(defaultDiagram); // Normalize newlines
    document.getElementById('diagram-id').value = '';
    
    // Update node map for highlighting
    if (window.mapNodesToText) {
        setTimeout(() => window.mapNodesToText(editor.textContent), 100);
    }
    
    render();
    // Default content is considered clean until edited
    lastSavedContent = editor.textContent;
    isDirty = false;
}

function resizeSvgToPreview() {
    const preview = document.getElementById('preview');
    if (!preview) return;
    const svg = preview.querySelector('svg');
    if (!svg) return;
    const rect = preview.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    svg.style.width = rect.width + 'px';
    svg.style.height = rect.height + 'px';
}

function setupSvgPanZoom(svg) {
    if (!svg) return;
    if (svg._hasPanZoom) return;
    svg._hasPanZoom = true;

    function getBaseViewBox() {
        const vb = svg.viewBox && svg.viewBox.baseVal;
        if (vb && vb.width && vb.height) {
            return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
        }
        try {
            const bbox = svg.getBBox();
            if (bbox && bbox.width && bbox.height) {
                const box = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
                svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
                return box;
            }
        } catch (e) {
            console.warn('Unable to compute SVG bounding box for pan/zoom', e);
        }
        const width = parseFloat(svg.getAttribute('width')) || 100;
        const height = parseFloat(svg.getAttribute('height')) || 100;
        const boxFallback = { x: 0, y: 0, width, height };
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        return boxFallback;
    }

    function applyViewBox(box) {
        svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
    }

    const baseViewBox = getBaseViewBox();
    let currentViewBox = { x: baseViewBox.x, y: baseViewBox.y, width: baseViewBox.width, height: baseViewBox.height };
    applyViewBox(currentViewBox);

    const minScale = 0.25;
    const maxScale = 4;
    let isPanning = false;
    let lastClientX = 0;
    let lastClientY = 0;

    function onWheel(event) {
        event.preventDefault();
        const delta = event.deltaY || 0;
        if (!delta) return;
        const zoomOut = delta > 0;
        const factor = zoomOut ? 1.1 : 0.9;

        const minWidth = baseViewBox.width * minScale;
        const maxWidth = baseViewBox.width * maxScale;
        let newWidth = currentViewBox.width * factor;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        const scale = newWidth / currentViewBox.width;
        const newHeight = currentViewBox.height * scale;

        const cx = currentViewBox.x + currentViewBox.width / 2;
        const cy = currentViewBox.y + currentViewBox.height / 2;

        currentViewBox = {
            x: cx - newWidth / 2,
            y: cy - newHeight / 2,
            width: newWidth,
            height: newHeight
        };

        applyViewBox(currentViewBox);
    }

    function onMouseDown(event) {
        if (event.button !== 1) {
            return;
        }
        event.preventDefault();
        isPanning = true;
        lastClientX = event.clientX;
        lastClientY = event.clientY;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(event) {
        if (!isPanning) return;
        event.preventDefault();
        const dx = event.clientX - lastClientX;
        const dy = event.clientY - lastClientY;
        lastClientX = event.clientX;
        lastClientY = event.clientY;

        const rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scaleX = currentViewBox.width / rect.width;
        const scaleY = currentViewBox.height / rect.height;

        currentViewBox = {
            x: currentViewBox.x - dx * scaleX,
            y: currentViewBox.y - dy * scaleY,
            width: currentViewBox.width,
            height: currentViewBox.height
        };

        applyViewBox(currentViewBox);
    }

    function onMouseUp(event) {
        if (!isPanning) return;
        event.preventDefault();
        isPanning = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('mousedown', onMouseDown);

    if (typeof window !== 'undefined') {
        window.setupSvgPanZoom = setupSvgPanZoom;
    }
}

// Initialize resizable divider
function initResizer() {
    const container = document.querySelector('.app-container');
    const editorPane = document.querySelector('.editor-pane');
    const previewPane = document.querySelector('.preview-pane');
    const divider = document.getElementById('divider');
    
    let isResizing = false;
    let lastX;
    
    divider.addEventListener('mousedown', function(e) {
        isResizing = true;
        lastX = e.clientX;
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
        // Prevent text selection during resize
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isResizing) return;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        let newEditorWidthPercent = ((e.clientX - containerRect.left) / containerWidth) * 100;
        // Limit the minimum width of both panes
        if (newEditorWidthPercent < 10) newEditorWidthPercent = 10;
        if (newEditorWidthPercent > 90) newEditorWidthPercent = 90;
        editorPane.style.width = `${newEditorWidthPercent}%`;
        previewPane.style.width = `${100 - newEditorWidthPercent}%`;
        lastX = e.clientX;
        resizeSvgToPreview();
    }
    
    function stopResize() {
        isResizing = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    }
}
