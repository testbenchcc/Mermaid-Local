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
  - The Connect New Node and Connect Existing Node modals support configuring the source node, link type, and link label (plus node ID, label, and shape for new nodes), and show a live Mermaid snippet preview of what will be appended to the editor; the Connect New Node modal uses a two-column layout with configuration fields on the left and the live result on the right, and the custom app modals are sized a bit wider to give more room for these controls and previews.

## Mermaid dependency

- Mermaid is managed via npm (see the `mermaid` dependency in `package.json`).
- After running `npm install`, the `postinstall` hook will execute `npm run build:mermaid` to copy the bundled `mermaid.min.js` from `node_modules` into the `static/` folder.
- The app continues to load `/static/mermaid.min.js` from `templates/index.html`, but that file is now generated from the npm package rather than maintained manually.
