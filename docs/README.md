# Systemica - User Manual

A visual game economy simulator inspired by **Machinations**, designed to model and test Producer-Consumer systems in video games.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Interface](#interface)
4. [Node Types](#node-types)
5. [Token System](#token-system)
6. [Connections](#connections)
7. [Simulation](#simulation)
8. [Advanced Properties](#advanced-properties)
9. [Pre-built Templates](#pre-built-templates)
10. [Custom Formulas](#custom-formulas)
11. [Custom Scripts](#custom-scripts-advanced)
12. [Save and Export](#save-and-export)
13. [Auto-save and Sharing](#auto-save-and-sharing)
14. [Keyboard Shortcuts](#keyboard-shortcuts)
15. [Use Cases](#use-cases)

---

## Introduction

Systemica lets you create interactive diagrams that simulate resource flow in game systems. It's ideal for:

- **Game Designers**: Prototype economic mechanics
- **Balancing**: Test system equilibrium
- **Documentation**: Visualize resource flows
- **Education**: Learn game economy design

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/giocasu/systemica.git
cd systemica

# Install dependencies
npm install

# Start development server
npm run dev
```

### First Diagram in 30 Seconds

1. **Drag** a `Source` node from the palette onto the canvas
2. **Drag** a `Pool` node next to it
3. **Connect**: click on the Source's right handle and drag to the Pool's left handle
4. **Start**: click  Play
5. Watch the resources flow!

---

## Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Systemica                [][][🔄][⎯⎯⎯⎯] [][]...   │  ← Toolbar
├─────────────────────────────────────────────────────────────────┤
│                                                    ┌──────────┐ │
│                                                    │Properties│ │
│              Main Canvas                           │  Panel   │ │
│              (drag nodes here)                     └──────────┘ │
│                                                    ┌──────────┐ │
│                                                    │  Chart   │ │
│         [Minimap]                                  │          │ │
└─────────────────────────────────────────────────────────────────┤
│  Tick: 42   |   Nodes: 5   |   Edges: 4   |   Running         │  ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

### Toolbar

| Control | Description |
|---------|-------------|
|  Play /  Pause | Start/stop automatic simulation |
|  Step | Execute a single tick |
| Reset | Reset resources to initial values |
|  Slider | Simulation speed (0.1x - 5x) |
|  Undo | Undo last action (Ctrl+Z) |
|  Redo | Redo action (Ctrl+Y) |
| Copy | Copy selected node(s) (Ctrl+C) |
|  Paste | Paste node (Ctrl+V) |
| Save | Save project as JSON |
|  Load | Load JSON project |
|  CSV | Export simulation statistics |
| Templates | Load pre-built scenario |
| Share | Copy shareable link to clipboard |
|  Clear | Clear canvas (keeps undo history) |

### Node Palette

Drag nodes from the palette onto the canvas:
On touch devices: long-press a node, then drag onto the canvas.

| Icon | Type | Function |
|------|------|----------|
| | Source | Produces resources |
| | Pool | Accumulates resources |
| | Drain | Consumes resources |
| | Converter | Transforms resources |
| | Gate | Controls flow |
| | Trader | Cross-exchanges resources |
| | Delay | Delays resource transfer |

---

## Node Types

### Source

Produces resources automatically each tick or manually on click.

| Property | Description |
|----------|-------------|
| Label | Node name |
| **Token Type** | Type of token produced (Black, Blue, Green, Orange, Red, or custom) |
| Buffer | Current resources in buffer (used in formulas) |
| Buffer Capacity | Maximum buffer size kept in the buffer (-1 = unlimited) |
| Max Total Production | Total resources this source can ever produce (-1 = infinite) |
| Production Rate | Resources produced per tick (supports decimals: 0.1, 0.5, etc.) |
| Distribution Mode | **Continuous** (split equally) or **Discrete** (round-robin) |
| Activation Mode | **Auto** (per tick) or **Manual** (click to produce) |
| Probability | % activation chance per tick (0-100) |
| Processing Mode | Fixed rate, Formula, or Script |

Note: Manual sources only produce while the simulation is running (Play).

**Distribution Modes:**
- **Continuous**: Divisible resources (water, gold, energy). 1/tick → 2 outputs = 0.5 each
- **Discrete**: Atomic resources (items, cards). 1/tick → 2 outputs = alternating 1,0,1,0...

**Use cases:**
- Enemy spawning
- Passive gold generation
- Health/mana regeneration
- Quest rewards
- Limited item drops (use Max Total Production)

**Note on Buffer Capacity:**
- Buffer capacity limits how much remains stored in the Source after transfers.
- Production can still flow out in the same tick; if outputs are blocked and the buffer is full, any excess is discarded (and not counted in `totalProduced`).

---

### Pool

Accumulates resources with optional capacity. Supports **multi-token storage**.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Resources | Total resources (sum of all token types) |
| Token Breakdown | Visual breakdown of each token type stored |
| Capacity | Maximum (-1 = unlimited) |
| Probability | % outgoing transfer chance |

**Multi-Token Display:**
- Shows total resources prominently
- Displays breakdown of token types with colored indicators
- Hover to see detailed token amounts

**Use cases:**
- Player inventory
- Wallet/currency storage
- Health/mana bar
- Resource storage

---

### Drain

Consumes and removes resources from the system.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Resources | Removed resources (counter, increases when draining) |
| Probability | % consumption chance |

**Use cases:**
- Shop purchases
- Damage taken
- Energy cost for actions
- Crafting costs

---

### Converter

Transforms input resources into output resources. Supports **multi-token recipes**.

| Property | Description |
|----------|-------------|
| Input Ratio | Required resources (simple mode) |
| Output Ratio | Produced resources (simple mode) |
| Recipe | Multi-token input/output definition (advanced mode) |
| Resources | Accumulation buffer |

**Simple Mode:** When it accumulates `inputRatio` resources, converts them to `outputRatio` and distributes.

**Recipe Mode:** Define complex conversions with multiple token types:
- **Inputs**: List of token types and amounts required
- **Outputs**: List of token types and amounts produced

**Example (Simple):** Input 3, Output 1 → Every 3 incoming resources produce 1 outgoing resource.

**Example (Recipe):** 
- Input: 2  Green + 1 Blue
- Output: 1  Orange

**Use cases:**
- Crafting (3 wood → 1 plank)
- Currency conversion
- Upgrade system
- Item fusion

---

### Gate (Conditional)

Transfers resources only when a condition is met.

| Property | Description |
|----------|-------------|
| Condition | `always` / `if_above` / `if_below` |
| Threshold | Threshold for condition |
| Resources | Accumulated resources |

**Conditions:**
- `always`: Always open (normal flow)
- `if_above`: Open only if resources > threshold
- `if_below`: Open only if resources < threshold

**Use cases:**
- Resource level unlocks
- Overflow protection
- Conditional triggers
- Content gating

---

### Trader (Cross-Exchange)

Exchanges resources between two separate flows. Takes input from two different sources (A and B) and outputs them swapped.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Rate A→B | Conversion rate from input A to output B |
| Rate B→A | Conversion rate from input B to output A |
| Input A | Resources accumulated from top input |
| Input B | Resources accumulated from bottom input |

**How it works:**
- Has two input handles (top and bottom) and two output handles
- Resources entering from input A are sent to output B
- Resources entering from input B are sent to output A
- Conversion rates can be 1:1 or asymmetric (e.g., 2 gold → 1 gem)

**Use cases:**
- Currency exchange (dollars ↔ euros)
- Trading systems (items ↔ gold)
- Resource swapping
- Cross-economy bridges

---

### Delay

Delays resource transfer by a specified number of ticks. Inspired by Machinations delay nodes.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Delay Ticks | Number of ticks before resources are released |
| Mode | **Delay** (parallel) or **Queue** (one at a time) |
| Processing Mode | Fixed value, Formula, or Script |

**Modes:**
- **Delay Mode (D)**: All incoming resources are delayed in parallel. Multiple resources can be "in flight" simultaneously.
- **Queue Mode (Q)**: Resources are processed one at a time. A new resource cannot enter until the previous one exits.

**Dynamic Delay:**
- Use **Formula** mode with variables: `queueSize`, `delayTicks`, `tick`
- Use **Script** mode for complex logic

**Visual indicators:**
- Slots show resources in transit
- Badge shows D (delay) or Q (queue) mode
- Timer shows ticks remaining

**Use cases:**
- Cooldown timers
- Production delays (order → delivery)
- Respawn timers
- Crafting time
- Queue systems (one at a time processing)

---

## Token System

Systemica supports **typed resources** (tokens) inspired by Machinations. Instead of generic resources, you can create distinct token types with colors and icons.

### Predefined Tokens

| Token | Color | Emoji |
|-------|-------|-------|
| Black (default) | #1a1a2e |  |
| Blue | #4361ee | |
| Green | #2ec4b6 |  |
| Orange | #ff9f1c |  |
| Red | #e94560 |  |

### Custom Tokens

Create your own tokens with:
- **Emoji**: Visual identifier (e.g., 🪙, ⚔️, 💎)
- **Name**: Display name (e.g., "Gold", "Sword", "Gem")
- **Color**: Hex color for charts and visualization

### How Tokens Work

1. **Source**: Each Source produces exactly **one token type**
   - Select token type in properties panel
   - Badge shows current token on the node

2. **Pool**: Accumulates **multiple token types**
   - Total shown prominently
   - Breakdown visible below total
   - Each token tracked separately

3. **Converter**: Transforms tokens using **recipes**
   - Define which tokens are consumed (inputs)
   - Define which tokens are produced (outputs)
   - Conversion happens when all inputs are available

4. **Drain**: Consumes all token types
   - Tracks total consumed per token type

### Token Visualization

- **Resource Chart**: Toggle between "Nodes" and "Tokens" view
  - Nodes view: One line per node (traditional)
  - Tokens view: One line per token type (aggregated)
- **Status Bar**: Shows top 3 token types with totals
- **Node Badges**: Source nodes show token indicator

### Script Access

Access token data in scripts:

```javascript
// Current node's token type
tokenType           // e.g., "gold"

// Current node's typed resources
tokens              // e.g., { gold: 10, black: 5 }
tokens.gold         // 10

// Get another node's token amount
get("pool1", "gold")  // Get gold from pool1
get("pool1", "blue")  // Get blue from pool1

// Get another node's full data
const node = getNode("pool1");
node.resources      // Total resources
node.tokens         // { gold: 10, blue: 5 }
node.tokenType      // Token type (for sources)
```

---

## Connections

### Creating a Connection

1. Click on the **right handle** () of the source node
2. Drag to the **left handle** of the destination node
3. Release to create the connection

### Connection Properties

Click on a connection to open the properties panel:

| Property | Description |
|----------|-------------|
| Flow Rate | Resources transferred per tick |

The flow rate is displayed as a label on the connection.

### Flow Rules

- Resources only flow **if available** in the source node
- Resources respect the **capacity** of the destination node
- **Drains** always accept resources (they remove them)
- **Sources** produce without consuming from their own pool

---

## Simulation

### Tick

The simulation proceeds in discrete **ticks**. Each tick:

1. **Phase 1:** Sources produce resources (if probability check passes)
2. **Phase 2:** Resources flow through connections (based on the **start-of-tick snapshot**)
3. **Phase 3:** Converters process accumulated resources (from the **start-of-tick snapshot**)
4. **Phase 4:** Gates evaluate conditions and transfer resources
5. **Phase 5:** Delay nodes process queues and release resources

Notes:
- Resources received during a tick become available for processing/forwarding on the **next tick** (so chains take multiple ticks).
- Sources can produce and send in the same tick; buffer capacity only limits what remains stored after sending.
- Delay nodes hold resources for the specified number of ticks before releasing them.

### Controls

| Action | Result |
|--------|--------|
|  Play | Start continuous simulation |
|  Pause | Stop simulation |
|  Step | Execute single tick (useful for debugging) |
| Reset | Reset everything to initial state |

### Speed

Use the ** slider** to adjust speed:
- **0.1x**: Very slow (1 tick every 10 seconds)
- **1x**: Normal (1 tick/second)
- **5x**: Fast (5 ticks/second)

---

## Advanced Properties

### Probability (All nodes)

Every node has a **Probability** value (0-100%):
- Determines activation % per tick
- 100% = always active
- 50% = active roughly half the time
- Useful for simulating random events, drop rates, etc.

### Custom Formulas (Source)

Source nodes can use formulas instead of a fixed rate. See [Custom Formulas](#custom-formulas).

---

## Pre-built Templates

Click **Templates** to load ready-made scenarios:

### Starter
Minimal setup: Source → Pool → Drain.

### Loot System
Simulates loot drops from enemies to player inventory.

### Energy Regen
Stamina system with time regeneration and action consumption.

### Crafting
Material gathering and item crafting system.

### Economy Loop
Economic cycle: work → earn → spend → shop.

### Mana System
Magic system with mana regeneration and spell consumption.

---

## Custom Formulas

For **Source** and **Converter** nodes, you can use formulas instead of fixed rates.

### Activation

1. Select a Source or Converter node
2. In the properties panel, click **"Formula"** mode
3. Enter the formula

### Available Variables

| Variable | Description |
|----------|-------------|
| `resources` | Current resources in the node buffer |
| `tick` | Current simulation tick |
| `capacity` | Node capacity |
| `totalProduced` | (Source only) Total resources produced so far |
| `produced` | Alias for `totalProduced` |
| `input` | (Converter only) Resources available to convert |

### Available Functions

| Function | Description | Example |
|----------|-------------|---------|
| `min(a, b)` | Minimum | `min(resources, 5)` |
| `max(a, b)` | Maximum | `max(0, 10 - resources)` |
| `floor(x)` | Round down | `floor(resources / 2)` |
| `ceil(x)` | Round up | `ceil(tick * 0.1)` |
| `round(x)` | Round | `round(resources * 0.3)` |
| `random()` | Random 0-1 | `random() * 10` |
| `sqrt(x)` | Square root | `sqrt(resources)` |
| `pow(x, y)` | Power | `pow(2, tick)` |
| `sin(x)`, `cos(x)`, `tan(x)` | Trigonometric | `5 + sin(tick) * 3` |
| `log(x)` | Natural log | `log(resources + 1)` |
| `exp(x)` | Exponential | `exp(tick * 0.01)` |
| `abs(x)` | Absolute value | `abs(resources - 50)` |

### Formula Examples

```javascript
// Decimals are fully supported!
0.1                      // Produce 0.1 per tick
1 + resources * 0.1      // Base 1, plus 10% of buffer
10 + tick * 0.5          // Increases linearly over time
min(resources, 5)        // Produce max 5 per tick
max(1, floor(produced / 10))  // +1 every 10 produced
random() * 10            // Random 0-10
5 + sin(tick) * 3        // Cyclic oscillation (2-8)
pow(1.1, tick)           // Exponential growth
```

---

## Custom Scripts (Advanced)

For complex logic beyond simple formulas, **Source** and **Converter** nodes support JavaScript scripts executed in a secure sandbox (QuickJS WebAssembly).

### Activation

1. Select a Source or Converter node
2. In the properties panel, click the **Script** mode button
3. Enter your JavaScript code
4. The script must return a number

Notes:
- Returned values are clamped to `>= 0` and rounded down to an integer.
- Use standalone math helpers like `min()`/`sin()` (there is no `Math` object in the sandbox).
- Scripts are evaluated asynchronously and cached; the simulator uses the last computed value (Play/Step pre-computes once to avoid a "0" first tick).

### Security Features

- **Sandboxed Execution**: Scripts run in isolated WebAssembly environment
- **Memory Limit**: 1MB per script execution
- **Cycle Limit**: 10,000 JavaScript operations per tick
- **Stack Limit**: 50KB maximum call stack
- **No External Access**: Cannot access browser APIs, DOM, network, or file system

### Available Context Variables

| Variable | Description |
|----------|-------------|
| `input` | Resources received (Converters) or current resources (Sources) |
| `resources` | Current resources in the node |
| `capacity` | Node capacity (Infinity if unlimited) |
| `capacityRaw` | Raw capacity (-1 if unlimited) |
| `tick` | Current simulation tick |
| `buffer` | (Source only) Alias for `resources` |
| `bufferCapacity` | (Source only) Alias for `capacity` |
| `bufferCapacityRaw` | (Source only) Alias for `capacityRaw` |
| `totalProduced` / `produced` | (Source only) Total produced so far |
| `maxProduction` / `maxTotalProduction` | (Source only) Max total production (Infinity if unlimited) |
| `maxProductionRaw` / `maxTotalProductionRaw` | (Source only) Raw max production (-1 if unlimited) |
| **`tokenType`** | Token type ID of the node (e.g., "gold", "blue") |
| **`tokens`** | Object with typed resources: `{ gold: 10, blue: 5 }` |

### Available Functions

| Function | Description |
|----------|-------------|
| `getNode(id)` | Get another node's data: `{ resources, capacity, tokens, tokenType }` |
| **`get(nodeId, tokenId)`** | Get specific token amount from a node |
| `state` | Persistent object to store values between ticks |
| `min()`, `max()`, `floor()`, `ceil()`, `round()` | Math functions |
| `random()`, `sqrt()`, `pow()`, `sin()`, `cos()`, `tan()`, `log()`, `exp()`, `abs()` | Math functions |
| `PI`, `E` | Constants |

### Script Examples

```javascript
// Adaptive production: produce more when resources are low
if (resources < 10) {
  return 5;
} else if (resources < 50) {
  return 2;
} else {
  return 1;
}
```

```javascript
// Cyclic production with wave pattern
return 3 + round(sin(tick * 0.5) * 2);
```

```javascript
// Conversion with efficiency curve
const efficiency = min(1, input / 10);
return floor(input * efficiency);
```

```javascript
// Count-based logic with persistent state
if (state.counter === undefined) {
  state.counter = 0;
}
state.counter++;
return state.counter % 3 === 0 ? 10 : 2; // Burst every 3 ticks
```

```javascript
// React to another node's state
const warehouse = getNode('warehouse-123');
if (warehouse && warehouse.resources < 20) {
  return 5; // Produce more when warehouse is low
}
return 1;
```

```javascript
// Token-aware production: check gold in another pool
const goldAmount = get('gold-pool', 'gold');
if (goldAmount < 10) {
  return 3; // Produce more when gold is low
}
return 1;
```

```javascript
// Multi-token logic: balance production based on ratios
const myGold = tokens.gold || 0;
const myBlue = tokens.blue || 0;
// Produce more if gold/blue ratio is unbalanced
if (myGold > myBlue * 2) {
  return 1; // Slow down
}
return 5; // Speed up
```

### Scripts vs Formulas

| Feature | Formula | Script |
|---------|---------|--------|
| Complexity | Simple expressions | Full JavaScript logic |
| Conditionals | No | Yes (`if/else`, `switch`) |
| Loops | No | Yes (`for`, `while`) |
| Persistent State | No | Yes (`state` object) |
| Other Node Access | No | Yes (`getNode()`) |
| Performance | Faster | Slightly slower (WASM) |
| Execution | Synchronous | Async (uses cached value) |

---

## �Save and Export

### Save Project

1. Click **Save**
2. Enter a name
3. The `.json` file downloads

### Load Project

1. Click ** Load**
2. Select a previously saved `.json` file
3. The diagram is loaded

### Export Statistics CSV

1. Run the simulation for some ticks
2. Click ** CSV**
3. Download a CSV file with resource values for each tick

The CSV contains:
- `Tick` column: tick number
- One column per node with resources

Useful for analysis in Excel, Google Sheets, etc.

---

## Auto-save and Sharing

### Auto-save

Your work is **automatically saved** to browser localStorage:

- Every change is saved after 500ms
- On page refresh, your diagram is restored automatically
- No need to manually save for temporary work

### Share Link

Generate a unique URL to share your diagram:

1. Create your diagram
2. Click **Share** (top-left corner of canvas)
3. The link is copied to your clipboard
4. Send the link to anyone!

Whoever opens the link will see your exact diagram.

**Technical notes:**
- The canvas state is compressed (gzip) and encoded in the URL
- Works best for small to medium diagrams
- For large projects, use **Save** to download a JSON file

### Validation Buttons

Both **Formula** and **Script** modes include a **✓ Validate** button:

- Click to check syntax before running
-  Green = valid
-  Red = error with message

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Delete selected element |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + Shift + Z` | Redo (alternative) |
| `Ctrl + C` | Copy selected node(s) |
| `Ctrl + V` | Paste node |

Selection:
- `Shift + Click` adds/removes nodes from the selection
- `Shift + Drag` box-selects multiple nodes

---

## Theme System

Systemica supports multiple visual themes to customize the appearance of the editor.

### Available Themes

| Theme | Description |
|-------|-------------|
| **Default** | Dark mode with colored nodes |
| **Blueprint** | Technical wireframe aesthetic, blue grid background |
| **Soft Minimal** | Light, warm tones with pastel colors |

### Switching Themes

Click the theme button in the toolbar to cycle through available themes.

### Creating Custom Themes

Themes are defined in CSS files under `src/themes/`. To create a new theme:

1. Create a new CSS file (e.g., `my-theme.css`)
2. Define your theme using `[data-theme="my-theme"]` selector
3. Override the CSS variables from `_base.css`
4. Import your theme in `index.css`
5. Add the theme to the store's theme list

See `src/themes/THEME_GUIDELINES.md` for detailed instructions.

---

## Use Cases

### 1. Economy Balancing

Simulate your game's economy to verify:
- Is the player earning too much/too little?
- Is there resource inflation/deflation?
- Is the pacing correct?

### 2. Loot Tables

Model drop rates:
- Source with probability for rare drops
- Converter for tier upgrades

### 3. Energy/Stamina System

Typical for mobile games:
- Source for regeneration
- Pool for energy cap
- Drain for action cost

### 4. Crafting System

- Multiple Pools for materials
- Converter for recipes
- Gate for progressive unlocks

### 5. Combat Damage

- Source for DPS
- Pool for HP
- Gate for armor/resistances

---

## Technologies

| Technology | Use |
|------------|-----|
| React 18 | UI Framework |
| React Flow | Node-based diagrams |
| Zustand | State management |
| Recharts | Real-time charts |
| TypeScript | Type safety |
| Vite | Build tool |

---

## References

- [Machinations](https://machinations.io/) - Inspiration tool
- [React Flow](https://reactflow.dev/) - Diagram library
