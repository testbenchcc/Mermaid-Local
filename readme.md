# Mermaid-Local

A local Mermaid diagram editor with interactive node context menus and helpers for building state and flow diagrams.

## Files
- `todo.md`: Current issues and improvements backlog.
- `roadmap.md`: High-level goals and future work (stub, to be expanded).

## Usage
Open the main HTML file for this project in a browser (for example via a simple static file server) to interactively edit and render Mermaid diagrams.
The toolbar provides New, Save, Load, and a Dark Mode toggle; there is no separate "Save As" button.

## Development Notes
- Frontend JavaScript lives under `static/`.
- Issues and ideas are tracked in `todo.md`.
- The preview pane supports basic mouse wheel zoom and middle-button drag panning for large diagrams.
- Node connection tools derive human-friendly node names from SVG nodes, stripping common Mermaid id prefixes like `state-`, `node-`, and `flowchart-` when generating edges.
- Node click highlighting maps Mermaid SVG IDs (for example `flowchart-AUTO-1`) back to the textual node IDs in your diagrams so flowchart nodes like `Auto`, `ANY SD ALARM?`, and `ANY SOURCE?` correctly highlight their source lines in the editor.
- The Connect Existing Node modal lists nodes by their Mermaid IDs (for example `REPO`, `SYSTEM`) derived from SVG element IDs, and always writes edges using these IDs; it only falls back to visible labels when an ID cannot be normalized.
- The Connect New Node and Connect Existing Node modals support configuring the source node, link type, and link label (plus node ID, label, and shape for new nodes), and show a live Mermaid snippet preview of what will be appended to the editor; both modals now use a two-column layout that separates configuration controls from the node list and/or live preview, and the custom app modals are sized a bit wider to give more room for these controls and previews.
 - When the FastAPI app is started with a `BUILD_TAG` or `APP_VERSION` environment variable, the page header shows the build as a subscript to the right of `Local Mermaid Studio` (for example, `Local Mermaid Studio` with `build v1.2.3` rendered as subscript).
