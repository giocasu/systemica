# Systemica

A visual **game economy simulator** inspired by [Machinations](https://machinations.io/), designed to model and test Producer-Consumer systems in video games.

![Version](https://img.shields.io/badge/version-0.12.0-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

<p align="center">
  <img src="public/logo.svg" alt="Systemica Logo" width="120" />
</p>

## Live Demo

**[Try it now!](https://giocasu.github.io/systemica/)**

## Features

- **Visual Node Editor** - Drag & drop nodes to build economy diagrams
- **Draggable Panels** - Customize your workspace layout
- **5 Node Types** - Source, Pool, Drain, Converter, Gate
- **Token System** - Typed resources with 5 colors + custom tokens (emoji, name, color)
- **Multi-Token Pools** - Pools accumulate different token types with visual breakdown
- **Converter Recipes** - Multi-input/output conversion recipes
- **Real-time Simulation** - Watch resources flow through your system
- **Distribution Modes** - Continuous (divisible) or Discrete (atomic) resource distribution
- **Decimal Values** - Full support for fractional resources (0.1, 0.5, etc.)
- **Custom Formulas** - Use mathematical expressions for dynamic production
- **JavaScript Scripts** - Advanced logic with secure sandboxed execution (QuickJS WASM)
- **Batch Script Execution** - Optimized ~5x faster script processing
- **Probability System** - Simulate random events and drop rates
- **Conditional Gates** - Control flow based on resource thresholds
- **Templates** - 5 pre-built game economy scenarios
- **Charts** - Real-time visualization with Nodes/Tokens toggle view
- **Save/Load** - Export and import projects as JSON
- **Auto-save** - Automatic persistence to browser localStorage
- **Share Links** - Generate unique URLs to share your diagrams
- **CSV Export** - Export simulation data for analysis
- **Undo/Redo** - Full history support (Ctrl+Z/Y)
- **Copy/Paste** - Duplicate nodes easily (Ctrl+C/V)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

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

The app will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Basic Usage

1. **Add Nodes** - Drag nodes from the left palette onto the canvas
2. **Connect Nodes** - Click and drag from the right handle (handle) to another node's left handle
3. **Configure** - Click a node to edit its properties in the right panel
4. **Simulate** - Press Play to start the simulation
5. **Analyze** - Watch the real-time chart and export data as CSV

## Documentation

For complete documentation, see:

- **[English Documentation](docs/README.md)**
- **[Documentazione Italiana](docs/README_IT.md)**

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| React Flow | Node-based diagrams |
| Zustand | State management |
| Recharts | Real-time charts |
| TypeScript | Type safety |
| Vite | Build tool |

## References

- [Machinations](https://machinations.io/) - Original inspiration
- [React Flow](https://reactflow.dev/) - Diagram library

## License

MIT © 2025-2026
