# Roadmap - Systemica

Ultimo aggiornamento: 27 Dicembre 2025

## 🔴 Priorità Alta (Core Features)

| Feature | Descrizione | Stato |
|---------|-------------|-------|
| **Salvataggio/Caricamento** | Export/import JSON del diagramma | ✅ Completato |
| **Flow rate sulle connessioni** | Configurare quante risorse fluiscono per edge | ✅ Completato |
| **Delete con tastiera** | Backspace/Delete per rimuovere nodi/edges | ✅ Completato |
| **Converter funzionante** | Logica di conversione input→output | ✅ Completato |

## 🟡 Priorità Media (Usabilità)

| Feature | Descrizione | Stato |
|---------|-------------|-------|
| **Edge labels** | Mostrare flow rate sulle connessioni | ✅ Completato |
| **Undo/Redo** | Annulla operazioni | ✅ Completato |
| **Copia/Incolla nodi** | Duplicare nodi | ✅ Completato |
| **Scenari predefiniti** | Esempi: loot system, energy system | ✅ Completato |
| **Velocità simulazione** | Slider per tick/secondo | ✅ Completato |

## 🟢 Priorità Bassa (Nice to have)

| Feature | Descrizione | Stato |
|---------|-------------|-------|
| **Grafici real-time** | Chart delle risorse nel tempo | ✅ Completato |
| **Minimap** | Vista d'insieme del diagramma | ✅ Completato |
| **Gate condizionali** | If/else sul flusso | ✅ Completato |
| **Random/Probability** | Nodi probabilistici | ✅ Completato |
| **Export statistiche** | CSV/report della simulazione | ✅ Completato |
| **Formule custom** | Espressioni per production rate | ✅ Completato |

## 📋 Legenda

- ✅ Completato
- 🔄 In corso
- ❌ Da fare

---

## 🚀 Future Features

### UI Enhancements
- 🎯 **NodeToolbar**: Quick actions (delete, duplicate, lock) on selected nodes using ReactFlow's NodeToolbar component
  - Reference: https://reactflow.dev/examples/nodes/node-toolbar
- 🔧 **Fully Draggable Panels**: Make all panels (palette, properties, charts) freely draggable and resizable
- 📱 **Responsive Layout**: Better support for smaller screens and mobile devices

### Architecture
- 🏗️ **"Everything is a Script" (Hybrid)**: Allow any node property to be either a simple value OR a JavaScript formula/script
  - Maintain backward compatibility with simple values
  - Scripts have access to full context (neighbors, global state, time)
  - Progressive complexity: users can start simple and add scripts when needed

### Simulation
- 📊 **Advanced Analytics**: More chart types, statistics, and export options
- 🔄 **Batch Simulation**: Run multiple simulations with varying parameters
- 📈 **Monte Carlo Mode**: Statistical analysis across many runs

---

## 📝 Note di Sviluppo

### v0.11.0 (27/12/2025)
- ✅ **Distribution Mode** per Source: Continuous (divisibile) vs Discrete (round-robin atomico)
- ✅ **Limite produzione Source**: `maxProduction` per limitare produzione totale
- ✅ **Contatore totalProduced**: Traccia quante risorse ha prodotto un Source
- ✅ **Supporto decimali completo**: Tutti i valori (rate, ratio, threshold, flow) supportano decimali
- ✅ **Formula con decimali**: Rimosso Math.floor() - ora `0.1` produce 0.1/tick
- ✅ **Nuove variabili formula**: `totalProduced` / `produced` disponibili per Source
- ✅ **Fix distribuzione risorse**: Corretto bug dove 1 Source → N Pool creava N risorse invece di 1
- ✅ Pool inizia con 0 risorse di default (era 10)
- ✅ Rimosso messaggio "Start simulation" dal chart vuoto

### v0.10.0 (27/12/2025)
- ✅ Auto-save to localStorage (debounced, every 2 seconds)
- ✅ Shareable links with URL compression (LZ-string)
- ✅ Validation buttons for formulas and scripts
- ✅ Node palette as fixed side panel
- ✅ Draggable properties and chart panels
- ✅ New project button with confirmation

### v0.9.0 (27/12/2025)
- ✅ JavaScript script support with QuickJS-emscripten (WASM sandbox)
- ✅ Secure sandboxed execution (no access to DOM, network, filesystem)
- ✅ Script context: `value`, `tick`, `total_produced`, `total_consumed`, `Math`
- ✅ Toggle between formula mode and script mode
- ✅ Script validation with error feedback

### v0.8.0 (27/12/2025)
- ✅ Formule custom per production rate
- ✅ Variabili: resources, tick, capacity
- ✅ Funzioni: min, max, floor, ceil, round, random, sin, cos, pow, sqrt
- ✅ Validazione formule in tempo reale
- ✅ Help contestuale per sintassi
- ✅ Mostrato tipo nodo nel pannello proprietà

### v0.7.0 (27/12/2025)
- ✅ Gate condizionali (always/if_above/if_below + threshold)
- ✅ Probability su tutti i nodi (0-100%)
- ✅ Export statistiche in CSV
- ✅ Visualizzazione condizione sui nodi Gate

### v0.6.0 (27/12/2025)
- ✅ Grafici real-time con Recharts
- ✅ Tracking delle risorse nel tempo (ultimi 100 tick)
- ✅ Minimap per navigazione del diagramma
- ✅ Colori distinti per tipo di nodo nella minimap

### v0.5.0 (27/12/2025)
- ✅ Template predefiniti per scenari comuni di game economy
- ✅ 5 template: Loot System, Energy Regen, Crafting, Economy Loop, Mana System
- ✅ Dropdown menu nella toolbar per selezionare template
- ✅ Conferma prima di sostituire diagramma esistente

### v0.4.0 (27/12/2025)
- ✅ Undo/Redo con history (Ctrl+Z / Ctrl+Y)
- ✅ Copy/Paste nodi (Ctrl+C / Ctrl+V)
- ✅ Velocità simulazione regolabile (0.1x - 5x)
- ✅ Slider nella toolbar per regolare tick/secondo
- ✅ Pulsanti ↩️↪️📋📄 nella toolbar

### v0.3.0 (27/12/2025)
- ✅ Converter funzionante con input/output ratio configurabile
- ✅ Logica di conversione: accumula input, converte quando raggiunge inputRatio
- ✅ Pannello proprietà mostra ratio per converter

### v0.2.0 (27/12/2025)
- ✅ Salvataggio progetti (💾 Save) - esporta JSON
- ✅ Caricamento progetti (📂 Load) - importa JSON
- ✅ Flow rate configurabile sulle connessioni
- ✅ Label visibili sulle connessioni con flow rate
- ✅ Pannello proprietà per le connessioni (click su edge)
- ✅ Delete con tastiera (Backspace/Delete) per nodi e connessioni

### v0.1.0 
- Setup iniziale con React Flow
- Nodi base: Source, Pool, Drain, Converter, Gate
- Drag & drop dalla palette
- Simulazione base con tick
- Pannello proprietà
