Flowcharts – Basic Syntax ​
Flowcharts are composed of nodes (geometric shapes) and edges (arrows or lines). The Mermaid code defines how nodes and edges are made and accommodates different arrow types, multi-directional arrows, and any linking to and from subgraphs.

WARNING

If you are using the word “end” in a Flowchart node, capitalize the entire word or any of the letters (e.g., “End” or “END”), or apply this workaround. Typing “end” in all lowercase letters will break the Flowchart.

WARNING

If you are using the letter “o” or “x” as the first letter in a connecting Flowchart node, add a space before the letter or capitalize the letter (e.g., “dev— ops”, “dev—Ops”).

Typing “A—oB” will create a circle edge.

Typing “A—xB” will create a cross edge.

A node (default) ​
---
title: Node
---
flowchart LR
    id
Try in playgroundmermaid

id

Node
INFO

The id is what is displayed in the box.

TIP

Instead of flowchart one can also use graph.

A node with text ​
It is also possible to set text in the box that differs from the id. If this is done several times, it is the last text found for the node that will be used. Also if you define edges for the node later on, you can omit text definitions. The one previously defined will be used when rendering the box.

---
title: Node with text
---
flowchart LR
    id1[This is the text in the box]
Try in playgroundmermaid

This is the text in the box

Node with text
Unicode text ​
Use " to enclose the unicode text.

flowchart LR
    id["This ❤ Unicode"]
Try in playgroundmermaid

This ❤ Unicode

Markdown formatting ​
Use double quotes and backticks “` text `” to enclose the markdown text.

---
config:
  flowchart:
    htmlLabels: false
---
flowchart LR
    markdown["`This **is** _Markdown_`"]
    newLines["`Line1
    Line 2
    Line 3`"]
    markdown --> newLines
Try in playgroundmermaid

This is Markdown

Line1
Line 2
Line 3

Direction ​
This statement declares the direction of the Flowchart.

This declares the flowchart is oriented from top to bottom (TD or TB).

flowchart TD
    Start --> Stop
Try in playgroundmermaid

Start

Stop

This declares the flowchart is oriented from left to right (LR).

flowchart LR
    Start --> Stop
Try in playgroundmermaid

Start

Stop

Possible FlowChart orientations are:

TB – Top to bottom
TD – Top-down/ same as top to bottom
BT – Bottom to top
RL – Right to left
LR – Left to right
Node shapes ​
A node with round edges ​
flowchart LR
    id1(This is the text in the box)
Try in playgroundmermaid

This is the text in the box

A stadium-shaped node ​
flowchart LR
    id1([This is the text in the box])
Try in playgroundmermaid

This is the text in the box

A node in a subroutine shape ​
flowchart LR
    id1[[This is the text in the box]]
Try in playgroundmermaid

This is the text in the box

A node in a cylindrical shape ​
flowchart LR
    id1[(Database)]
Try in playgroundmermaid

Database

A node in the form of a circle ​
flowchart LR
    id1((This is the text in the circle))
Try in playgroundmermaid

This is the text in the circle

A node in an asymmetric shape ​
flowchart LR
    id1>This is the text in the box]
Try in playgroundmermaid

This is the text in the box

Currently only the shape above is possible and not its mirror. This might change with future releases.

A node (rhombus) ​
flowchart LR
    id1{This is the text in the box}
Try in playgroundmermaid

This is the text in the box

A hexagon node ​
flowchart LR
    id1{{This is the text in the box}}
Try in playgroundmermaid

This is the text in the box

Parallelogram ​
flowchart TD
    id1[/This is the text in the box/]
Try in playgroundmermaid

This is the text in the box

Parallelogram alt ​
flowchart TD
    id1[\This is the text in the box\]
Try in playgroundmermaid

This is the text in the box

Trapezoid ​
flowchart TD
    A[/Christmas\]
Try in playgroundmermaid

Christmas

Trapezoid alt ​
flowchart TD
    B[\Go shopping/]
Try in playgroundmermaid

Go shopping

Double circle ​
flowchart TD
    id1(((This is the text in the circle)))
Try in playgroundmermaid

This is the text in the circle

Expanded Node Shapes in Mermaid Flowcharts (v11.3.0+) ​
Mermaid introduces 30 new shapes to enhance the flexibility and precision of flowchart creation. These new shapes provide more options to represent processes, decisions, events, data storage visually, and other elements within your flowcharts, improving clarity and semantic meaning.

New Syntax for Shape Definition

Mermaid now supports a general syntax for defining shape types to accommodate the growing number of shapes. This syntax allows you to assign specific shapes to nodes using a clear and flexible format:


A@{ shape: rect }code
This syntax creates a node A as a rectangle. It renders in the same way as A["A"], or A.

Complete List of New Shapes ​
Below is a comprehensive list of the newly introduced shapes and their corresponding semantic meanings, short names, and aliases:

Semantic Name	Shape Name	Short Name	Description	Alias Supported
Card	Notched Rectangle	notch-rect	Represents a card	card, notched-rectangle
Collate	Hourglass	hourglass	Represents a collate operation	collate, hourglass
Com Link	Lightning Bolt	bolt	Communication link	com-link, lightning-bolt
Comment	Curly Brace	brace	Adds a comment	brace-l, comment
Comment Right	Curly Brace	brace-r	Adds a comment	
Comment with braces on both sides	Curly Braces	braces	Adds a comment	
Data Input/Output	Lean Right	lean-r	Represents input or output	in-out, lean-right
Data Input/Output	Lean Left	lean-l	Represents output or input	lean-left, out-in
Database	Cylinder	cyl	Database storage	cylinder, database, db
Decision	Diamond	diam	Decision-making step	decision, diamond, question
Delay	Half-Rounded Rectangle	delay	Represents a delay	half-rounded-rectangle
Direct Access Storage	Horizontal Cylinder	h-cyl	Direct access storage	das, horizontal-cylinder
Disk Storage	Lined Cylinder	lin-cyl	Disk storage	disk, lined-cylinder
Display	Curved Trapezoid	curv-trap	Represents a display	curved-trapezoid, display
Divided Process	Divided Rectangle	div-rect	Divided process shape	div-proc, divided-process, divided-rectangle
Document	Document	doc	Represents a document	doc, document
Event	Rounded Rectangle	rounded	Represents an event	event
Extract	Triangle	tri	Extraction process	extract, triangle
Fork/Join	Filled Rectangle	fork	Fork or join in process flow	join
Internal Storage	Window Pane	win-pane	Internal storage	internal-storage, window-pane
Junction	Filled Circle	f-circ	Junction point	filled-circle, junction
Lined Document	Lined Document	lin-doc	Lined document	lined-document
Lined/Shaded Process	Lined Rectangle	lin-rect	Lined process shape	lin-proc, lined-process, lined-rectangle, shaded-process
Loop Limit	Trapezoidal Pentagon	notch-pent	Loop limit step	loop-limit, notched-pentagon
Manual File	Flipped Triangle	flip-tri	Manual file operation	flipped-triangle, manual-file
Manual Input	Sloped Rectangle	sl-rect	Manual input step	manual-input, sloped-rectangle
Manual Operation	Trapezoid Base Top	trap-t	Represents a manual task	inv-trapezoid, manual, trapezoid-top
Multi-Document	Stacked Document	docs	Multiple documents	documents, st-doc, stacked-document
Multi-Process	Stacked Rectangle	st-rect	Multiple processes	processes, procs, stacked-rectangle
Odd	Odd	odd	Odd shape	
Paper Tape	Flag	flag	Paper tape	paper-tape
Prepare Conditional	Hexagon	hex	Preparation or condition step	hexagon, prepare
Priority Action	Trapezoid Base Bottom	trap-b	Priority action	priority, trapezoid, trapezoid-bottom
Process	Rectangle	rect	Standard process shape	proc, process, rectangle
Start	Circle	circle	Starting point	circ
Start	Small Circle	sm-circ	Small starting point	small-circle, start
Stop	Double Circle	dbl-circ	Represents a stop point	double-circle
Stop	Framed Circle	fr-circ	Stop point	framed-circle, stop
Stored Data	Bow Tie Rectangle	bow-rect	Stored data	bow-tie-rectangle, stored-data
Subprocess	Framed Rectangle	fr-rect	Subprocess	framed-rectangle, subproc, subprocess, subroutine
Summary	Crossed Circle	cross-circ	Summary	crossed-circle, summary
Tagged Document	Tagged Document	tag-doc	Tagged document	tag-doc, tagged-document
Tagged Process	Tagged Rectangle	tag-rect	Tagged process	tag-proc, tagged-process, tagged-rectangle
Terminal Point	Stadium	stadium	Terminal point	pill, terminal
Text Block	Text Block	text	Text block	
Example Flowchart with New Shapes ​
Here’s an example flowchart that utilizes some of the newly introduced shapes:

flowchart RL
    A@{ shape: manual-file, label: "File Handling"}
    B@{ shape: manual-input, label: "User Input"}
    C@{ shape: docs, label: "Multiple Documents"}
    D@{ shape: procs, label: "Process Automation"}
    E@{ shape: paper-tape, label: "Paper Records"}
Try in playgroundmermaid

File Handling

User Input

Multiple Documents

Process Automation

Paper Records

Process ​
flowchart TD
    A@{ shape: rect, label: "This is a process" }
Try in playgroundmermaid

This is a process

Event ​
flowchart TD
    A@{ shape: rounded, label: "This is an event" }
Try in playgroundmermaid

This is an event

Terminal Point (Stadium) ​
flowchart TD
    A@{ shape: stadium, label: "Terminal point" }
Try in playgroundmermaid

Terminal point

Subprocess ​
flowchart TD
    A@{ shape: subproc, label: "This is a subprocess" }
Try in playgroundmermaid

This is a subprocess

Database (Cylinder) ​
flowchart TD
    A@{ shape: cyl, label: "Database" }
Try in playgroundmermaid

Database

Start (Circle) ​
flowchart TD
    A@{ shape: circle, label: "Start" }
Try in playgroundmermaid

Start

Odd ​
flowchart TD
    A@{ shape: odd, label: "Odd shape" }
Try in playgroundmermaid

Odd shape

Decision (Diamond) ​
flowchart TD
    A@{ shape: diamond, label: "Decision" }
Try in playgroundmermaid

Decision

Prepare Conditional (Hexagon) ​
flowchart TD
    A@{ shape: hex, label: "Prepare conditional" }
Try in playgroundmermaid

Prepare conditional

Data Input/Output (Lean Right) ​
flowchart TD
    A@{ shape: lean-r, label: "Input/Output" }
Try in playgroundmermaid

Input/Output

Data Input/Output (Lean Left) ​
flowchart TD
    A@{ shape: lean-l, label: "Output/Input" }
Try in playgroundmermaid

Output/Input

Priority Action (Trapezoid Base Bottom) ​
flowchart TD
    A@{ shape: trap-b, label: "Priority action" }
Try in playgroundmermaid

Priority action

Manual Operation (Trapezoid Base Top) ​
flowchart TD
    A@{ shape: trap-t, label: "Manual operation" }
Try in playgroundmermaid

Manual operation

Stop (Double Circle) ​
flowchart TD
    A@{ shape: dbl-circ, label: "Stop" }
Try in playgroundmermaid

Stop

Text Block ​
flowchart TD
    A@{ shape: text, label: "This is a text block" }
Try in playgroundmermaid

This is a text block

Card (Notched Rectangle) ​
flowchart TD
    A@{ shape: notch-rect, label: "Card" }
Try in playgroundmermaid

Card

Lined/Shaded Process ​
flowchart TD
    A@{ shape: lin-rect, label: "Lined process" }
Try in playgroundmermaid

Lined process

Start (Small Circle) ​
flowchart TD
    A@{ shape: sm-circ, label: "Small start" }
Try in playgroundmermaid

Stop (Framed Circle) ​
flowchart TD
    A@{ shape: framed-circle, label: "Stop" }
Try in playgroundmermaid

Fork/Join (Long Rectangle) ​
flowchart TD
    A@{ shape: fork, label: "Fork or Join" }
Try in playgroundmermaid

Collate (Hourglass) ​
flowchart TD
    A@{ shape: hourglass, label: "Collate" }
Try in playgroundmermaid

Comment (Curly Brace) ​
flowchart TD
    A@{ shape: comment, label: "Comment" }
Try in playgroundmermaid

Comment

Comment Right (Curly Brace Right) ​
flowchart TD
    A@{ shape: brace-r, label: "Comment" }
Try in playgroundmermaid

Comment

Comment with braces on both sides ​
flowchart TD
    A@{ shape: braces, label: "Comment" }
Try in playgroundmermaid

Comment

Com Link (Lightning Bolt) ​
flowchart TD
    A@{ shape: bolt, label: "Communication link" }
Try in playgroundmermaid

Document ​
flowchart TD
    A@{ shape: doc, label: "Document" }
Try in playgroundmermaid

Document

Delay (Half-Rounded Rectangle) ​
flowchart TD
    A@{ shape: delay, label: "Delay" }
Try in playgroundmermaid

Delay

Direct Access Storage (Horizontal Cylinder) ​
flowchart TD
    A@{ shape: das, label: "Direct access storage" }
Try in playgroundmermaid

Direct access storage

Disk Storage (Lined Cylinder) ​
flowchart TD
    A@{ shape: lin-cyl, label: "Disk storage" }
Try in playgroundmermaid

Disk storage

Display (Curved Trapezoid) ​
flowchart TD
    A@{ shape: curv-trap, label: "Display" }
Try in playgroundmermaid

Display

Divided Process (Divided Rectangle) ​
flowchart TD
    A@{ shape: div-rect, label: "Divided process" }
Try in playgroundmermaid

Divided process

Extract (Small Triangle) ​
flowchart TD
    A@{ shape: tri, label: "Extract" }
Try in playgroundmermaid

Extract

Internal Storage (Window Pane) ​
flowchart TD
    A@{ shape: win-pane, label: "Internal storage" }
Try in playgroundmermaid

Internal storage

Junction (Filled Circle) ​
flowchart TD
    A@{ shape: f-circ, label: "Junction" }
Try in playgroundmermaid

Lined Document ​
flowchart TD
    A@{ shape: lin-doc, label: "Lined document" }
Try in playgroundmermaid

Lined document

Loop Limit (Notched Pentagon) ​
flowchart TD
    A@{ shape: notch-pent, label: "Loop limit" }
Try in playgroundmermaid

Loop limit

Manual File (Flipped Triangle) ​
flowchart TD
    A@{ shape: flip-tri, label: "Manual file" }
Try in playgroundmermaid

Manual file

Manual Input (Sloped Rectangle) ​
flowchart TD
    A@{ shape: sl-rect, label: "Manual input" }
Try in playgroundmermaid

Manual input

Multi-Document (Stacked Document) ​
flowchart TD
    A@{ shape: docs, label: "Multiple documents" }
Try in playgroundmermaid

Multiple documents

Multi-Process (Stacked Rectangle) ​
flowchart TD
    A@{ shape: processes, label: "Multiple processes" }
Try in playgroundmermaid

Multiple processes

Paper Tape (Flag) ​
flowchart TD
    A@{ shape: flag, label: "Paper tape" }
Try in playgroundmermaid

Paper tape

Stored Data (Bow Tie Rectangle) ​
flowchart TD
    A@{ shape: bow-rect, label: "Stored data" }
Try in playgroundmermaid

Stored data

Summary (Crossed Circle) ​
flowchart TD
    A@{ shape: cross-circ, label: "Summary" }
Try in playgroundmermaid

Tagged Document ​
flowchart TD
    A@{ shape: tag-doc, label: "Tagged document" }
Try in playgroundmermaid

Tagged document

Tagged Process (Tagged Rectangle) ​
flowchart TD
    A@{ shape: tag-rect, label: "Tagged process" }
Try in playgroundmermaid

Tagged process

Special shapes in Mermaid Flowcharts (v11.3.0+) ​
Mermaid also introduces 2 special shapes to enhance your flowcharts: icon and image. These shapes allow you to include icons and images directly within your flowcharts, providing more visual context and clarity.

Icon Shape ​
You can use the icon shape to include an icon in your flowchart. To use icons, you need to register the icon pack first. Follow the instructions to add custom icons. The syntax for defining an icon shape is as follows:

flowchart TD
    A@{ icon: "fa:user", form: "square", label: "User Icon", pos: "t", h: 60 }
Try in playgroundmermaid

User Icon

?
Parameters ​
icon: The name of the icon from the registered icon pack.
form: Specifies the background shape of the icon. If not defined there will be no background to icon. Options include:
square
circle
rounded
label: The text label associated with the icon. This can be any string. If not defined, no label will be displayed.
pos: The position of the label. If not defined label will default to bottom of icon. Possible values are:
t
b
h: The height of the icon. If not defined this will default to 48 which is minimum.
Image Shape ​
You can use the image shape to include an image in your flowchart. The syntax for defining an image shape is as follows:


flowchart TD
    A@{ img: "https://picsum.photos/300", label: "Image Label", pos: "t", w: 60, h: 60, constraint: "on" }code
Parameters ​
img: The URL of the image to be displayed.
label: The text label associated with the image. This can be any string. If not defined, no label will be displayed.
pos: The position of the label. If not defined, the label will default to the bottom of the image. Possible values are:
t
b
w: The width of the image. If not defined, this will default to the natural width of the image.
h: The height of the image. If not defined, this will default to the natural height of the image.
constraint: Determines if the image should constrain the node size. This setting also ensures the image maintains its original aspect ratio, adjusting the height (h) accordingly to the width (w). If not defined, this will default to off Possible values are:
on
off
These new shapes provide additional flexibility and visual appeal to your flowcharts, making them more informative and engaging.

Links between nodes ​
Nodes can be connected with links/edges. It is possible to have different types of links or attach a text string to a link.

A link with arrow head ​
flowchart LR
    A-->B
Try in playgroundmermaid

A

B

An open link ​
flowchart LR
    A --- B
Try in playgroundmermaid

A

B

Text on links ​
flowchart LR
    A-- This is the text! ---B
Try in playgroundmermaid

This is the text!

A

B

or

flowchart LR
    A---|This is the text|B
Try in playgroundmermaid

This is the text

A

B

A link with arrow head and text ​
flowchart LR
    A-->|text|B
Try in playgroundmermaid

text

A

B

or

flowchart LR
    A-- text -->B
Try in playgroundmermaid

text

A

B

Dotted link ​
flowchart LR
   A-.->B;
Try in playgroundmermaid

A

B

Dotted link with text ​
flowchart LR
   A-. text .-> B
Try in playgroundmermaid

text

A

B

Thick link ​
flowchart LR
   A ==> B
Try in playgroundmermaid

A

B

Thick link with text ​
flowchart LR
   A == text ==> B
Try in playgroundmermaid

text

A

B

An invisible link ​
This can be a useful tool in some instances where you want to alter the default positioning of a node.

flowchart LR
    A ~~~ B
Try in playgroundmermaid

A

B

Chaining of links ​
It is possible declare many links in the same line as per below:

flowchart LR
   A -- text --> B -- text2 --> C
Try in playgroundmermaid

text

text2

A

B

C

It is also possible to declare multiple nodes links in the same line as per below:

flowchart LR
   a --> b & c--> d
Try in playgroundmermaid

a

b

c

d

You can then describe dependencies in a very expressive way. Like the one-liner below:

flowchart TB
    A & B--> C & D
Try in playgroundmermaid

A

B

C

D

If you describe the same diagram using the basic syntax, it will take four lines. A word of warning, one could go overboard with this making the flowchart harder to read in markdown form. The Swedish word lagom comes to mind. It means, not too much and not too little. This goes for expressive syntaxes as well.

flowchart TB
    A --> C
    A --> D
    B --> C
    B --> D
Try in playgroundmermaid

A

C

D

B

Attaching an ID to Edges ​
Mermaid now supports assigning IDs to edges, similar to how IDs and metadata can be attached to nodes. This feature lays the groundwork for more advanced styling, classes, and animation capabilities on edges.

Syntax:

To give an edge an ID, prepend the edge syntax with the ID followed by an @ character. For example:

flowchart LR
  A e1@--> B
Try in playgroundmermaid

A

B

In this example, e1 is the ID of the edge connecting A to B. You can then use this ID in later definitions or style statements, just like with nodes.

Turning an Animation On ​
Once you have assigned an ID to an edge, you can turn on animations for that edge by defining the edge’s properties:

flowchart LR
  A e1@==> B
  e1@{ animate: true }
Try in playgroundmermaid

A

B

This tells Mermaid that the edge e1 should be animated.

Selecting Type of Animation ​
In the initial version, two animation speeds are supported: fast and slow. Selecting a specific animation type is a shorthand for enabling animation and setting the animation speed in one go.

Examples:

flowchart LR
  A e1@--> B
  e1@{ animation: fast }
Try in playgroundmermaid

A

B

This is equivalent to { animate: true, animation: fast }.

Using classDef Statements for Animations ​
You can also animate edges by assigning a class to them and then defining animation properties in a classDef statement. For example:

flowchart LR
  A e1@--> B
  classDef animate stroke-dasharray: 9,5,stroke-dashoffset: 900,animation: dash 25s linear infinite;
  class e1 animate
Try in playgroundmermaid

A

B

In this snippet:

e1@--> creates an edge with ID e1.
classDef animate defines a class named animate with styling and animation properties.
class e1 animate applies the animate class to the edge e1.
Note on Escaping Commas: When setting the stroke-dasharray property, remember to escape commas as \, since commas are used as delimiters in Mermaid’s style definitions.

New arrow types ​
There are new types of arrows supported:

circle edge
cross edge
Circle edge example ​
flowchart LR
    A --o B
Try in playgroundmermaid

A

B

Cross edge example ​
flowchart LR
    A --x B
Try in playgroundmermaid

A

B

Multi directional arrows ​
There is the possibility to use multidirectional arrows.

flowchart LR
    A o--o B
    B <--> C
    C x--x D
Try in playgroundmermaid

A

B

C

D

Minimum length of a link ​
Each node in the flowchart is ultimately assigned to a rank in the rendered graph, i.e. to a vertical or horizontal level (depending on the flowchart orientation), based on the nodes to which it is linked. By default, links can span any number of ranks, but you can ask for any link to be longer than the others by adding extra dashes in the link definition.

In the following example, two extra dashes are added in the link from node B to node E, so that it spans two more ranks than regular links: