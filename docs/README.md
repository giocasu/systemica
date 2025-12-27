# 🎮 Game Economy Simulator - User Manual

A visual game economy simulator inspired by **Machinations**, designed to model and test Producer-Consumer systems in video games.

---

## 📋 Table of Contents

1. [Introduction](#-introduction)
2. [Quick Start](#-quick-start)
3. [Interface](#-interface)
4. [Node Types](#-node-types)
5. [Connections](#-connections)
6. [Simulation](#-simulation)
7. [Advanced Properties](#-advanced-properties)
8. [Pre-built Templates](#-pre-built-templates)
9. [Custom Formulas](#-custom-formulas)
10. [Custom Scripts](#-custom-scripts-advanced)
11. [Save and Export](#-save-and-export)
12. [Keyboard Shortcuts](#-keyboard-shortcuts)
13. [Use Cases](#-use-cases)

---

## 🎯 Introduction

Game Economy Simulator lets you create interactive diagrams that simulate resource flow in game systems. It's ideal for:

- **Game Designers**: Prototype economic mechanics
- **Balancing**: Test system equilibrium
- **Documentation**: Visualize resource flows
- **Education**: Learn game economy design

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <url>
cd prod-cons

# Install dependencies
npm install

# Start development mode
npm run dev
```

### First Diagram in 30 Seconds

1. **Drag** a `Source` node from the palette onto the canvas
2. **Drag** a `Pool` node next to it
3. **Connect**: click on the Source's right handle and drag to the Pool's left handle
4. **Start**: click ▶️ Play
5. Watch the resources flow!

---

## 🖥️ Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  🎮 Game Economy Simulator    [▶️][⏭️][🔄][🏃⎯⎯●⎯⎯] [↩️][↪️]...   │  ← Toolbar
├─────────────────────────────────────────────────────────────────┤
│                                                    ┌──────────┐ │
│                                                    │Properties│ │
│              Main Canvas                           │  Panel   │ │
│              (drag nodes here)                     └──────────┘ │
│                                                    ┌──────────┐ │
│                                                    │  Chart   │ │
│         [Minimap]                                  │          │ │
└─────────────────────────────────────────────────────────────────┤
│  Tick: 42   |   Nodes: 5   |   Edges: 4   |   Running ●        │  ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

### Toolbar

| Control | Description |
|---------|-------------|
| ▶️ Play / ⏸️ Pause | Start/stop automatic simulation |
| ⏭️ Step | Execute a single tick |
| 🔄 Reset | Reset resources to initial values |
| 🏃 Slider | Simulation speed (0.1x - 5x) |
| ↩️ Undo | Undo last action (Ctrl+Z) |
| ↪️ Redo | Redo action (Ctrl+Y) |
| 📋 Copy | Copy selected node (Ctrl+C) |
| 📄 Paste | Paste node (Ctrl+V) |
| 💾 Save | Save project as JSON |
| 📂 Load | Load JSON project |
| 📊 CSV | Export simulation statistics |
| 📋 Templates | Load pre-built scenario |

### Node Palette

Drag nodes from the palette onto the canvas:

| Icon | Type | Function |
|------|------|----------|
| ⬆️ | Source | Produces resources |
| 🔵 | Pool | Accumulates resources |
| ⬇️ | Drain | Consumes resources |
| 🔄 | Converter | Transforms resources |
| 🚪 | Gate | Controls flow |

---

## 🧩 Node Types

### ⬆️ Source

Automatically produces resources each tick.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Resources | Accumulated resources |
| Production Rate | Resources produced per tick |
| Probability | % activation chance per tick (0-100) |
| Use Formula | Use formula instead of fixed rate |

**Use cases:**
- Enemy spawning
- Passive gold generation
- Health/mana regeneration
- Quest rewards

---

### 🔵 Pool

Accumulates resources with optional capacity.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Resources | Current resources |
| Capacity | Maximum (-1 = unlimited) |
| Probability | % outgoing transfer chance |

**Use cases:**
- Player inventory
- Wallet/currency storage
- Health/mana bar
- Resource storage

---

### ⬇️ Drain

Consumes and removes resources from the system.

| Property | Description |
|----------|-------------|
| Label | Node name |
| Resources | Removed resources (counter) |
| Probability | % consumption chance |

**Use cases:**
- Shop purchases
- Damage taken
- Energy cost for actions
- Crafting costs

---

### 🔄 Converter

Transforms input resources into output resources.

| Property | Description |
|----------|-------------|
| Input Ratio | Required resources |
| Output Ratio | Produced resources |
| Resources | Accumulation buffer |

**Logic:** When it accumulates `inputRatio` resources, converts them to `outputRatio` and distributes.

**Example:** Input 3, Output 1 → Every 3 incoming resources produce 1 outgoing resource.

**Use cases:**
- Crafting (3 wood → 1 plank)
- Currency conversion
- Upgrade system
- Item fusion

---

### 🚪 Gate (Conditional)

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

## 🔗 Connections

### Creating a Connection

1. Click on the **right handle** (●) of the source node
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

## ⚡ Simulation

### Tick

The simulation proceeds in discrete **ticks**. Each tick:

1. **Phase 1:** Sources produce resources (if probability check passes)
2. **Phase 2:** Resources flow through connections
3. **Phase 3:** Converters process accumulated resources

### Controls

| Action | Result |
|--------|--------|
| ▶️ Play | Start continuous simulation |
| ⏸️ Pause | Stop simulation |
| ⏭️ Step | Execute single tick (useful for debugging) |
| 🔄 Reset | Reset everything to initial state |

### Speed

Use the **🏃 slider** to adjust speed:
- **0.1x**: Very slow (1 tick every 10 seconds)
- **1x**: Normal (1 tick/second)
- **5x**: Fast (5 ticks/second)

---

## ⚙️ Advanced Properties

### Probability (All nodes)

Every node has a **Probability** value (0-100%):
- Determines activation % per tick
- 100% = always active
- 50% = active roughly half the time
- Useful for simulating random events, drop rates, etc.

### Custom Formulas (Source)

Source nodes can use formulas instead of a fixed rate. See [Custom Formulas](#-custom-formulas).

---

## 📋 Pre-built Templates

Click **📋 Templates** to load ready-made scenarios:

### 🗡️ Loot System
Simulates loot drops from enemies to player inventory.

### ⚡ Energy Regen
Stamina system with time regeneration and action consumption.

### 🔨 Crafting
Material gathering and item crafting system.

### 💰 Economy Loop
Economic cycle: work → earn → spend → shop.

### 🔮 Mana System
Magic system with mana regeneration and spell consumption.

---

## 📐 Custom Formulas

For **Source** nodes, you can use formulas instead of a fixed rate.

### Activation

1. Select a Source node
2. In the properties panel, enable **"Use Formula"**
3. Enter the formula

### Available Variables

| Variable | Description |
|----------|-------------|
| `resources` | Current resources in the node |
| `tick` | Current simulation tick |
| `capacity` | Node capacity |

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
| `sin(x)`, `cos(x)` | Trigonometric | `5 + sin(tick) * 3` |
| `abs(x)` | Absolute value | `abs(resources - 50)` |

### Formula Examples

```javascript
resources * 0.1          // Produce 10% of current resources
10 + tick * 0.5          // Increases linearly over time
min(resources, 5)        // Produce max 5 per tick
max(0, 100 - resources)  // Produce more when low
floor(resources / 10)    // Tiered production
random() * 10            // Random 0-10
5 + sin(tick) * 3        // Cyclic oscillation (2-8)
pow(1.1, tick)           // Exponential growth
```

---

## � Custom Scripts (Advanced)

For complex logic beyond simple formulas, **Source** and **Converter** nodes support JavaScript scripts executed in a secure sandbox (QuickJS WebAssembly).

### Activation

1. Select a Source or Converter node
2. In the properties panel, click the **📜 Script** mode button
3. Enter your JavaScript code
4. The script must return a number

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
| `capacity` | Node capacity (-1 means unlimited) |
| `tick` | Current simulation tick |

### Available Functions

| Function | Description |
|----------|-------------|
| `getNode(id)` | Get another node's data: `{ resources, capacity }` |
| `state` | Persistent object to store values between ticks |
| `min()`, `max()`, `floor()`, `ceil()`, `round()` | Math functions |
| `random()`, `sqrt()`, `pow()`, `sin()`, `cos()`, `abs()` | Math functions |

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
return 3 + Math.round(Math.sin(tick * 0.5) * 2);
```

```javascript
// Conversion with efficiency curve
const efficiency = Math.min(1, input / 10);
return Math.floor(input * efficiency);
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

## �💾 Save and Export

### Save Project

1. Click **💾 Save**
2. Enter a name
3. The `.json` file downloads

### Load Project

1. Click **📂 Load**
2. Select a previously saved `.json` file
3. The diagram is loaded

### Export Statistics CSV

1. Run the simulation for some ticks
2. Click **📊 CSV**
3. Download a CSV file with resource values for each tick

The CSV contains:
- `Tick` column: tick number
- One column per node with resources

Useful for analysis in Excel, Google Sheets, etc.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Delete selected element |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + Shift + Z` | Redo (alternative) |
| `Ctrl + C` | Copy selected node |
| `Ctrl + V` | Paste node |

---

## 🎮 Use Cases

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

## 🛠️ Technologies

| Technology | Use |
|------------|-----|
| React 18 | UI Framework |
| React Flow | Node-based diagrams |
| Zustand | State management |
| Recharts | Real-time charts |
| TypeScript | Type safety |
| Vite | Build tool |

---

## 📚 References

- [Machinations](https://machinations.io/) - Inspiration tool
- [Game Mechanics: Advanced Game Design](https://www.amazon.com/Game-Mechanics-Advanced-Design-Voices/dp/0321820274) - Book by E. Adams and J. Dormans
- [React Flow](https://reactflow.dev/) - Diagram library

---

*Game Economy Simulator v0.8.0 - Built for game designers and developers*
