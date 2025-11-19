# Current issues
- [x] When `Connect New Node` creates a syntax error once the new node is added. The code currently inserts `    flowchart-REPO --> Test Node` when it should insert `    REPO --> Test Node`
- [x] Remove the `Save As` button from the template.
- [x] When a node is clicked in the right panel, sometimes when I click a node, it it highlighted in red in the left panel. I like this, but it only works with some notes, not all. For example, in the chart below, clicking on `Stop`, `Manual`, `DEMAND?`, `INTERVAL`, `SUPPLYING`, `TRANSFER`, `RECIRCULATE`, and `STANDBY` all selected the correct items. When `Auto`, `ANY SD ALARM?`, and `ANY SOURCE?` are clicked, nothing is highlighted.
```mermaid
flowchart LR
  %% Primary engine modes
  STOP([Stop])
  MAN([Manual])
  AUTO([Auto])
  SOURCE{ANY SOURCE?}

  DEMAND{DEMAND?}
  FILL{FILL REQUEST?}
  TRANSFER
  ANYSD{ANY SD ALARM?}
  INTERVAL{INTERVAL}


  subgraph "ENGINE STATES"
    TRANSFER
    RECIRCULATE
    SUPPLYING
    STANDBY
  end


  %% Allowed transitions (per your rundown)
  STOP --> MAN
  MAN -. RUN / Maint .-> MAN
  MAN --> AUTO
  AUTO -- CONFIRM --> MAN
  AUTO -- CONFIRM --> STOP

  %% Forbidden transitions (shown as comments for clarity)
  %% STOP -x-> AUTO   // not allowed
  %% MAN  -x-> STOP   // not allowed per spec you gave


  AUTO --> ANYSD -- FALSE --> SOURCE
  SOURCE -- TRUE --> DEMAND
  SOURCE -- FALSE --> STANDBY

  DEMAND -- TRUE --> SUPPLYING
  DEMAND -- FALSE --> FILL
  FILL -- TRUE --> TRANSFER
  FILL -- FALSE --> INTERVAL


  ANYSD -- TRUE --> STOP


  INTERVAL -- TRUE --> RECIRCULATE
  INTERVAL -- FALSE --> STANDBY  
  RECIRCULATE -- DURATION --> RECIRCULATE
```
- [x] When `Connect to Existing Node` is selected from the right click menu, not all of the nodes are listed in the modal.
- [x] There is still an issue with selecting a node and highlighting in the left panel. Here is the console output when I click a node that does not highight the left panel node words red.
```console
editor-node-highlight.js?v=20250807-3:407 Force updating node map before processing click
editor-node-highlight.js?v=20250807-3:29 Mapping nodes to text
editor-node-highlight.js?v=20250807-3:58 Detected diagram type: flowchart
editor-node-highlight.js?v=20250807-3:59 Text content length: 666
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: REPO at line 1
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 17
editor-node-highlight.js?v=20250807-3:96 Added flowchart connection source: SYSTEM at line 17
editor-node-highlight.js?v=20250807-3:105 Added flowchart connection target: FOLDER at line 17
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 18
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 19
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 26
editor-node-highlight.js?v=20250807-3:96 Added flowchart connection source: FS at line 26
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 27
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 29
editor-node-highlight.js?v=20250807-3:96 Added flowchart connection source: ENG at line 29
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 30
editor-node-highlight.js?v=20250807-3:169 Final nodeToTextMap: (6) [Array(2), Array(2), Array(2), Array(2), Array(2), Array(2)]
editor-node-highlight.js?v=20250807-3:170 Mapped nodes to text positions: 6
editor-node-highlight.js?v=20250807-3:313 Extracting node ID from element: <g class=​"node default flowchart-label" id=​"flowchart-FS-588" transform=​"translate(78.4140625, 65.25)​" data-svg-kind=​"node" tabindex=​"0">​…​</g>​
editor-node-highlight.js?v=20250807-3:326 Element/shape ID: flowchart-FS-588
editor-node-highlight.js?v=20250807-3:334 Extracted ID from pattern (primary): FS-588
editor-node-highlight.js?v=20250807-3:468 Node clicked: FS-588
editor-node-highlight.js?v=20250807-3:475 Node ID found but not in text map: FS-588
(anonymous) @ editor-node-highlight.js?v=20250807-3:475
dispatch @ svg-events.js?v=20250807-3:53
(anonymous) @ svg-events.js?v=20250807-3:77
setTimeout
(anonymous) @ svg-events.js?v=20250807-3:75
editor-node-highlight.js?v=20250807-3:477 Forcing node map update and trying again...
editor-node-highlight.js?v=20250807-3:29 Mapping nodes to text
editor-node-highlight.js?v=20250807-3:58 Detected diagram type: flowchart
editor-node-highlight.js?v=20250807-3:59 Text content length: 666
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: REPO at line 1
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 17
editor-node-highlight.js?v=20250807-3:96 Added flowchart connection source: SYSTEM at line 17
editor-node-highlight.js?v=20250807-3:105 Added flowchart connection target: FOLDER at line 17
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 18
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 19
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 26
editor-node-highlight.js?v=20250807-3:96 Added flowchart connection source: FS at line 26
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 27
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 29
editor-node-highlight.js?v=20250807-3:96 Added flowchart connection source: ENG at line 29
editor-node-highlight.js?v=20250807-3:79 Added flowchart node: -- at line 30
editor-node-highlight.js?v=20250807-3:169 Final nodeToTextMap: (6) [Array(2), Array(2), Array(2), Array(2), Array(2), Array(2)]
editor-node-highlight.js?v=20250807-3:170 Mapped nodes to text positions: 6
editor-node-highlight.js?v=20250807-3:490 Trying simplified state ID: FS
editor-node-highlight.js?v=20250807-3:492 Found match with simplified ID: FS
editor-node-highlight.js?v=20250807-3:179 Highlighting text at position: {start: {…}, end: {…}}
editor-node-highlight.js?v=20250807-3:198 Node name to highlight:   

```
I clicked FS or `Field Service` expecting FS to be highlighted in the left panel. Several others are having the same issue. The simplified ID that is found is correct.

# Improvements
- [] Expand the functionality of the right click menu. Add more node shapes and associate them with names related to PLC programs. For example, in my current flowchar. I represent files, folder, databases, repositories, system states, systems, computers, scripts, programs, and departemnts. I would like a shape associated with each of these as well as an extra generic option. Add all of these to the menu, make it a sub-menu please.
- [x] Currently, the chart or graph is scaled by the size of the window panel.I would like to be able to zoom in and out, as well as move the chart around when click dragging. 
- [x] Display the git tag/release name in the title bar to the right of `Local Mermaid Studio`. I would like it to look like `Local Mermaid Studio build 22` where the `build 22` portion is subscript.
  - Implemented via the `version` variable in `main.py`; the Jinja2 template now renders `build <tag>` as a subscript when a build tag is provided.
- [x] Extend Connect New Node / Connect Existing Node modals to configure source node, link type, labels, and (for new nodes) shape, with a live Mermaid snippet preview.
