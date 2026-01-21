# Systemica Theme Guidelines

This guide explains how to create custom themes for Systemica.

## Quick Start

1. Create a new CSS file in `src/themes/` (e.g., `my-theme.css`)
2. Add your theme import to `src/themes/index.css`
3. Register your theme in `src/store/themeStore.ts`
4. Add a theme button in `src/components/ThemeSelector.tsx`

## Theme Structure

### 1. CSS Variables

Every theme should override the CSS variables defined in `_base.css`:

```css
[data-theme="my-theme"] {
  /* Color palette */
  --bg-primary: #...;      /* Main background */
  --bg-secondary: #...;    /* Panels, cards */
  --bg-tertiary: #...;     /* Buttons, inputs */
  --text-primary: #...;    /* Main text */
  --text-secondary: #...;  /* Muted text */
  --accent: #...;          /* Primary accent */
  --accent-hover: #...;    /* Accent hover state */
  
  /* Node styling */
  --node-border-radius: 8px;
  --node-border-width: 2px;
  --node-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --node-padding: 12px 16px;
  
  /* Node type colors */
  --node-source-color: #...;
  --node-pool-color: #...;
  --node-drain-color: #...;
  --node-converter-color: #...;
  --node-gate-color: #...;
  --node-trader-color: #...;
  
  /* Trader cross lines */
  --trader-line-a: #...;   /* Input A -> Output B */
  --trader-line-b: #...;   /* Input B -> Output A */
  
  /* Typography */
  --font-family: 'Your Font', sans-serif;
}
```

### 2. Background Styling

```css
[data-theme="my-theme"] body,
[data-theme="my-theme"] .flow-wrapper {
  background: var(--bg-primary);
  /* Optional: add patterns, gradients, etc. */
}
```

### 3. Node Shapes

Each node type can have a unique shape. Use CSS techniques like:
- `border-radius` for rounded shapes
- `clip-path` for complex polygons
- `::before` and `::after` pseudo-elements for decorations

```css
/* Example: Source as a hexagon */
[data-theme="my-theme"] .node-source {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}
```

**Node classes:**
- `.node-source` - Resource generators
- `.node-pool` - Resource storage
- `.node-drain` - Resource consumers
- `.node-converter` - Resource transformers
- `.node-gate` - Conditional flow control
- `.node-trader` - Cross-exchange between two inputs/outputs

### 4. Active States

When a node is processing, it gets an active class:

```css
[data-theme="my-theme"] .source-active { /* ... */ }
[data-theme="my-theme"] .pool-active { /* ... */ }
[data-theme="my-theme"] .drain-active { /* ... */ }
[data-theme="my-theme"] .converter-active { /* ... */ }
[data-theme="my-theme"] .trader-active { /* ... */ }
```

### 5. Handles and Edges

```css
[data-theme="my-theme"] .react-flow__handle {
  background: var(--bg-secondary);
  border: 2px solid var(--accent);
  width: 10px;
  height: 10px;
}

[data-theme="my-theme"] .react-flow__edge-path {
  stroke: var(--accent);
  stroke-width: 2;
}
```

### 6. Trader Cross Lines

The Trader node has SVG lines showing the cross-exchange:

```css
[data-theme="my-theme"] .trader-cross-lines {
  opacity: 0.8;
}

[data-theme="my-theme"] .trader-line-a {
  stroke: var(--trader-line-a);
  stroke-width: 2;
}

[data-theme="my-theme"] .trader-line-b {
  stroke: var(--trader-line-b);
  stroke-width: 2;
}

[data-theme="my-theme"] .trader-handle-a {
  background: var(--trader-line-a) !important;
  border-color: var(--trader-line-a) !important;
}

[data-theme="my-theme"] .trader-handle-b {
  background: var(--trader-line-b) !important;
  border-color: var(--trader-line-b) !important;
}
```

### 7. UI Components

Style the panels, toolbar, and status bar:

```css
[data-theme="my-theme"] .toolbar { /* ... */ }
[data-theme="my-theme"] .draggable-panel { /* ... */ }
[data-theme="my-theme"] .status-bar { /* ... */ }
[data-theme="my-theme"] .node-palette-content { /* ... */ }
[data-theme="my-theme"] .palette-item-vertical { /* ... */ }
```

## Registering Your Theme

### 1. Add to themeStore.ts

```typescript
export type ThemeName = 'default' | 'blueprint' | 'soft-minimal' | 'my-theme';

export const themeInfo: Record<ThemeName, { name: string; description: string }> = {
  // ... existing themes
  'my-theme': {
    name: 'My Theme',
    description: 'A custom theme description'
  },
};
```

### 2. Add to ThemeSelector.tsx

Add your theme icon style to `styles.css`:

```css
.theme-icon-my-theme {
  background: linear-gradient(135deg, #... 0%, #... 100%);
  border: 2px solid #...;
}
```

## Best Practices

1. **Contrast** - Ensure text is readable against backgrounds
2. **Consistency** - Use CSS variables throughout
3. **Accessibility** - Test with different color blindness modes
4. **Performance** - Avoid heavy animations or complex filters
5. **Node visibility** - Active states should be clearly visible
6. **Handle clarity** - Input/output handles should be distinct

## Example Themes

Look at the existing themes for inspiration:
- `blueprint.css` - Technical, geometric, minimal
- `soft-minimal.css` - Warm, rounded, modern

## Testing

1. Run `npm run dev`
2. Open the Theme panel
3. Switch between themes to verify all elements are styled
4. Test with simulation running to check active states
5. Create nodes of each type to verify shapes
