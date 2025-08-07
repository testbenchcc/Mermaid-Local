// Initialize mermaid when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme') || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Apply the theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').checked = savedTheme === 'dark';
    
    // Initialize mermaid with the appropriate theme
    try {
        mermaid.initialize({ 
            startOnLoad: false,
            theme: savedTheme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose'
        });
        
        // Load the most recent diagram if available
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
    
    // Add event listener for editor changes
    let debounceTimer;
    editor.addEventListener('input', function() {
        if (autoRenderToggle.checked) {
            // Debounce the render function to avoid excessive rendering
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                render();
            }, 500); // Wait 500ms after typing stops
        }
    });
    
    // Save auto-render preference when changed
    autoRenderToggle.addEventListener('change', function() {
        localStorage.setItem('autoRender', this.checked);
        if (this.checked) {
            render(); // Render immediately when auto-render is turned on
        }
    });
});

function render() {
    const code = document.getElementById('editor').value;
    const preview = document.getElementById('preview');
    
    // Clear previous content
    preview.innerHTML = '';
    
    // Create mermaid element
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.textContent = code;
    
    preview.appendChild(mermaidDiv);
    
    try {
        // Render diagram
        mermaid.init(undefined, '.mermaid');
    } catch (error) {
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
    
    // New diagram button - clear editor and reset diagram ID
    newBtn.addEventListener('click', function() {
        document.getElementById('editor').value = '';
        document.getElementById('diagram-id').value = '';
        render();
        alert('New diagram created! You can now edit and save it with a new name.');
    });
    
    // Open save modal
    saveBtn.addEventListener('click', function() {
        const diagramId = document.getElementById('diagram-id').value;
        if (diagramId) {
            document.getElementById('diagram-title').value = '';
            document.getElementById('diagram-tags').value = '';
        } else {
            // Clear form for new diagram
            document.getElementById('diagram-title').value = '';
            document.getElementById('diagram-tags').value = '';
        }
        saveModal.style.display = 'block';
    });
    
    // Open load modal and load diagrams
    loadBtn.addEventListener('click', function() {
        loadModal.style.display = 'block';
        loadDiagrams();
    });
    
    // Close modals
    saveClose.addEventListener('click', function() {
        saveModal.style.display = 'none';
    });
    
    loadClose.addEventListener('click', function() {
        loadModal.style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === saveModal) {
            saveModal.style.display = 'none';
        }
        if (event.target === loadModal) {
            loadModal.style.display = 'none';
        }
    });
    
    // Save diagram
    saveDiagramBtn.addEventListener('click', function() {
        console.log('Save button clicked');
        const title = document.getElementById('diagram-title').value;
        const content = document.getElementById('editor').value;
        const tags = document.getElementById('diagram-tags').value;
        const diagramId = document.getElementById('diagram-id').value;
        
        console.log('Diagram data:', { title, content: content.substring(0, 20) + '...', tags, diagramId });
        
        if (!title) {
            alert('Please enter a title for your diagram');
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
            alert('Diagram saved successfully!');
        })
        .catch(error => {
            console.error('Error saving diagram:', error);
            alert('Failed to save diagram: ' + error.message);
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
            document.getElementById('editor').value = this.dataset.content;
            document.getElementById('diagram-id').value = this.dataset.id;
            render();
            document.getElementById('load-modal').style.display = 'none';
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
                document.getElementById('editor').value = data.content;
                document.getElementById('diagram-id').value = data.id;
                render();
            }
        })
        .catch(error => {
            console.error('Error loading most recent diagram:', error);
            // Ensure default diagram is loaded if there was an error
            if (document.getElementById('editor').value === 'Loading...') {
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
    
    document.getElementById('editor').value = defaultDiagram;
    document.getElementById('diagram-id').value = '';
    render();
}

// Initialize resizable divider
function initResizer() {
    const container = document.querySelector('.container');
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
        const deltaX = e.clientX - lastX;
        
        // Calculate new width as a percentage of the container
        const editorWidth = editorPane.getBoundingClientRect().width;
        const containerWidth = containerRect.width;
        const newEditorWidthPercent = ((editorWidth + deltaX) / containerWidth) * 100;
        
        // Limit the minimum width of both panes
        if (newEditorWidthPercent > 10 && newEditorWidthPercent < 90) {
            editorPane.style.width = `${newEditorWidthPercent}%`;
            previewPane.style.width = `${100 - newEditorWidthPercent}%`;
            lastX = e.clientX;
        }
    }
    
    function stopResize() {
        isResizing = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    }
}
