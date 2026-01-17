# Roadmap: Sistema Token Tipizzati per Systemica

**Ultimo aggiornamento**: 17 Gennaio 2026

> ✅ **IMPLEMENTAZIONE COMPLETATA** - Tutte le fasi sono state implementate con successo.
> 
> **v0.12.1 Fix**: Risolti bug critici di sincronizzazione typedResources e distribuzione continua.

## Overview

Implementazione di un sistema di risorse tipizzate ispirato a Machinations, con:
- **5 colori predefiniti**: Black (default), Blue, Green, Orange, Red
- **Token custom**: emoji + nome (es. 🪙 Gold, ⚔️ Sword)
- **1 Source = 1 tipo di token**
- **Accesso negli script**: `source1.blue`, `pool1.gold`, etc.

---

## Fase 1: Fondamenta (Token Registry)

| Task | Descrizione | Stato |
|------|-------------|-------|
| 1.1 | Definizione tipi base in `types.ts` | ✅ Completato |
| 1.2 | Token predefiniti in `src/tokens/predefinedTokens.ts` | ✅ Completato |
| 1.3 | Token Store in `src/store/tokenStore.ts` | ✅ Completato |

### 1.1 Definizione Tipi Base
**File**: `src/types.ts`

```typescript
// Token predefiniti con colori
export type PredefinedTokenColor = 'black' | 'blue' | 'green' | 'orange' | 'red';

export interface TokenDefinition {
  id: string;                    // Unique ID (es. "black", "gold", "sword_1")
  name: string;                  // Display name (es. "Black", "Gold", "Sword")
  color: string;                 // Hex color (es. "#000000", "#FFD700")
  emoji?: string;                // Optional emoji (es. "🪙", "⚔️")
  isCustom: boolean;             // false per predefiniti, true per custom
  isDefault?: boolean;           // Se è il token di default per nuovi Source
}

// Risorse tipizzate: mappa tokenId → quantità
export type TypedResources = Record<string, number>;
// Es: { black: 10, gold: 5 }
```

### 1.2 Token Predefiniti
**File**: `src/tokens/predefinedTokens.ts` (nuovo)

```typescript
export const PREDEFINED_TOKENS: TokenDefinition[] = [
  { id: 'black', name: 'Black', color: '#1a1a2e', emoji: '⚫', isCustom: false, isDefault: true },
  { id: 'blue', name: 'Blue', color: '#4361ee', emoji: '🔵', isCustom: false },
  { id: 'green', name: 'Green', color: '#2ec4b6', emoji: '🟢', isCustom: false },
  { id: 'orange', name: 'Orange', color: '#ff9f1c', emoji: '🟠', isCustom: false },
  { id: 'red', name: 'Red', color: '#e94560', emoji: '🔴', isCustom: false },
];
```

### 1.3 Token Store
**File**: `src/store/tokenStore.ts` (nuovo)

| Funzione | Descrizione |
|----------|-------------|
| `tokens` | Lista di tutti i token (predefiniti + custom) |
| `addToken(def)` | Aggiunge token custom |
| `removeToken(id)` | Rimuove token custom |
| `updateToken(id, data)` | Modifica token custom |
| `getToken(id)` | Ottiene definizione token |
| `getDefaultToken()` | Ritorna il token di default |

**Persistenza**: Salvato nel progetto JSON + localStorage

---

## Fase 2: Estensione NodeData

| Task | Descrizione | Stato |
|------|-------------|-------|
| 2.1 | Aggiunta `tokenType`, `typedResources`, `recipe` a NodeData | ✅ Completato |
| 2.2 | Helper di migrazione per retrocompatibilità | ✅ Completato |
| 2.3 | Aggiornamento `nodeDefaults` | ✅ Completato |

### 2.1 Modifiche a types.ts

```typescript
interface NodeData {
  // ...existing...
  
  // TOKEN: Tipo di token prodotto (solo Source)
  tokenType: string;              // ID del token (es. "black", "gold")
  
  // POOL/DRAIN: Risorse multi-token
  typedResources: TypedResources; // { black: 10, blue: 5, gold: 3 }
  
  // CONVERTER: Ricetta multi-token
  recipe?: {
    inputs: Array<{ tokenId: string; amount: number }>;
    outputs: Array<{ tokenId: string; amount: number }>;
  };
}
```

### 2.2 Retrocompatibilità

```typescript
// Migration helper (nel loadProject)
function migrateNodeData(node: Node<NodeData>): Node<NodeData> {
  if (!node.data.tokenType) {
    node.data.tokenType = 'black'; // default
  }
  if (!node.data.typedResources) {
    node.data.typedResources = { black: node.data.resources || 0 };
  }
  return node;
}
```

---

## Fase 3: UI Components

| Task | Descrizione | Stato |
|------|-------------|-------|
| 3.1 | Token Selector per Source | ✅ Completato |
| 3.2 | Token Editor Modal (creazione custom) | ✅ Completato |
| 3.3 | Pool Multi-Token View | ✅ Completato |
| 3.4 | Converter Recipe Editor | ✅ Completato |

### 3.1 Token Selector (Source)
**File**: `src/components/TokenSelector.tsx` (nuovo)

```
┌─────────────────────────────┐
│ Token Type                  │
├─────────────────────────────┤
│ 🔍 Search                   │
├─────────────────────────────┤
│ ⚫ Black          ✓        │
│ 🔵 Blue                     │
│ 🟢 Green                    │
│ 🟠 Orange                   │
│ 🔴 Red                      │
├─────────────────────────────┤
│ ─── Custom ───              │
│ 🪙 Gold                     │
│ ⚔️ Sword                    │
├─────────────────────────────┤
│ ➕ New Token...             │
└─────────────────────────────┘
```

### 3.2 Token Editor Modal
**File**: `src/components/TokenEditorModal.tsx` (nuovo)

```
┌─────────────────────────────────────────────┐
│ ⚫ New Token                           ✕    │
├─────────────────────────────────────────────┤
│                                             │
│ Name                                        │
│ ┌─────────────────────────────────────────┐ │
│ │ Gold                                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Emoji          Color                        │
│ ┌────────┐     ┌──────────────────────────┐ │
│ │ 🪙     │     │ #FFD700             🎨  │ │
│ └────────┘     └──────────────────────────┘ │
│                                             │
│ ☐ Set as default                            │
│                                             │
│        [Cancel]  [Add Token]                │
└─────────────────────────────────────────────┘
```

### 3.3 Pool Multi-Token View
**File**: Modifica `src/nodes/index.tsx`

```
┌─────────────────────────┐
│   Pool 1           🔵   │
├─────────────────────────┤
│ ⚫ 10  🔵 5  🪙 3       │
│ ████████░░ ████░ ██░    │
└─────────────────────────┘
```

### 3.4 Converter Recipe Editor
**File**: `src/components/RecipeEditor.tsx` (nuovo)

```
┌─────────────────────────────────────────────┐
│ Recipe                                      │
├─────────────────────────────────────────────┤
│ INPUTS                                      │
│  🪨 Iron    [2]  ✕                         │
│  🪵 Wood    [3]  ✕                         │
│  ➕ Add input                               │
├─────────────────────────────────────────────┤
│           ⬇️                               │
├─────────────────────────────────────────────┤
│ OUTPUTS                                     │
│  ⚔️ Sword   [1]  ✕                         │
│  ➕ Add output                              │
└─────────────────────────────────────────────┘
```

---

## Fase 4: Logica Simulazione

| Task | Descrizione | Stato |
|------|-------------|-------|
| 4.1 | Edge con Token Filter | ❌ Da fare (Fase 6) |
| 4.2 | Source produce token tipizzato | ✅ Completato |
| 4.3 | Pool accumula multi-token | ✅ Completato |
| 4.4 | Converter con ricette multi-token | ✅ Completato |
| 4.5 | Drain consuma token tipizzato | ✅ Completato |

### 4.1 Edge con Token Filter
**File**: `src/store/simulatorStore.ts`

```typescript
interface EdgeData {
  flowRate: number;
  tokenFilter?: string;  // ID token o undefined per "all"
}
```

### 4.2-4.5 Tick Logic Refactor

| Passo | Descrizione |
|-------|-------------|
| 1 | **Source Production**: Produce token del suo `tokenType` ✅ |
| 2 | **Transfer**: Edge trasferisce solo token matching `tokenFilter` (o tutti se undefined) |
| 3 | **Pool Accumulation**: Accumula in `typedResources[tokenId]` ✅ |
| 4 | **Converter**: Controlla se ha tutti gli input della ricetta, poi converte ✅ |
| 5 | **Drain**: Consuma da `typedResources` ✅ |

---

## Fase 5: Script Context Esteso

| Task | Descrizione | Stato |
|------|-------------|-------|
| 5.1 | Estensione ScriptContext con token | ✅ Completato |
| 5.2 | Funzione `get(nodeId, tokenId)` | ✅ Completato |
| 5.3 | Aggiornamento formulaEvaluator | ✅ Completato |

### 5.1 Nuovo Script Context

```typescript
interface ScriptContext {
  // Existing
  input: number;
  resources: number;
  tick: number;
  state: Record<string, unknown>;
  
  // NEW: Token-aware
  tokenType: string;              // Token type di questo nodo
  tokens: TypedResources;         // Risorse tipizzate di questo nodo
  
  // NEW: Accesso ad altri nodi
  getNode: (idOrLabel: string) => {
    resources: TypedResources;    // { black: 10, gold: 5 }
    tokenType?: string;           // Per Source
    label: string;
  } | null;
  
  // NEW: Shorthand per tipo specifico
  get: (nodeIdOrLabel: string, tokenId: string) => number;
  // get("pool1", "gold") → 10
  // get("source1", "blue") → quantità prodotta
}
```

### 5.2 Esempi Script

```javascript
// Source: produce di più se pool ha poco gold
const poolGold = get("MainPool", "gold");
return poolGold < 10 ? 2 : 1;

// Converter: output bonus se abbiamo iron extra
const iron = get("self", "iron");
return iron > 5 ? 2 : 1; // produce 2 sword invece di 1

// Gate: apri solo se gold > 50
const gold = get("Treasury", "gold");
return gold > 50;
```

---

## Fase 6: Visualizzazione

| Task | Descrizione | Stato |
|------|-------------|-------|
| 6.1 | Chart Multi-Token | ✅ Completato |
| 6.2 | Node badges con token color/emoji | ✅ Completato (Fase 3) |
| 6.3 | StatusBar Multi-Token | ✅ Completato |

### 6.1 Chart Multi-Token
- Linea separata per ogni token type in ogni Pool
- Legenda con colori/emoji
- Opzione per filtrare quali token mostrare

### 6.2 Node Visualization

| Node | Visualizzazione Token |
|------|----------------------|
| **Source** | Badge con emoji/colore del token prodotto |
| **Pool** | Mini-barre colorate per ogni token |
| **Converter** | Icona ricetta (input → output) |
| **Drain** | Lista token consumati |
| **Gate** | Invariato |

### 6.3 Edge Visualization
- Colore edge = colore token (se filtrato)
- Label mostra `flowRate` + emoji token

---

## 📅 Timeline Stimata

| Fase | Durata | Stato |
|------|--------|-------|
| **Fase 1**: Token Registry | 2-3h | ✅ Completato |
| **Fase 2**: NodeData Extension | 1-2h | ✅ Completato |
| **Fase 3**: UI Components | 4-6h | ✅ Completato |
| **Fase 4**: Simulation Logic | 4-6h | ✅ Completato |
| **Fase 5**: Script Context | 2-3h | ✅ Completato |
| **Fase 6**: Visualization | 3-4h | ✅ Completato |
| **Fase 7**: Performance Optimization | 1-2h | ✅ Completato |
| **Testing & Polish** | 2-3h | 🔄 In corso |
| **TOTALE** | ~20-30h | |

---

## 🔄 Ordine di Implementazione

```
1. Token Registry (types + store)
   │
   ├──▶ 2. NodeData Extension + Migration
   │        │
   │        ├──▶ 3a. TokenSelector UI (Source)
   │        │
   │        └──▶ 3b. Simulation Logic (Source → Pool)
   │                  │
   │                  ├──▶ 4. Pool Multi-Token View
   │                  │
   │                  └──▶ 5. Converter + Recipe Editor
   │                            │
   │                            └──▶ 6. Script Context
   │
   └──▶ 7. Chart Multi-Token
```

---

---

## Fase 7: Performance Optimization

| Task | Descrizione | Stato |
|------|-------------|-------|
| 7.1 | Batch Script Execution | ✅ Completato |
| 7.2 | Single Runtime/Context per tick | ✅ Completato |

### 7.1 Batch Script Execution
**File**: `src/utils/scriptRunner.ts`

**Problema**: Ogni script creava un nuovo Runtime + Context QuickJS (~1.3ms overhead ciascuno).

**Soluzione**: `executeBatchScripts()` che:
- Crea un **singolo Runtime + Context** per tutti gli script
- Setup delle funzioni Math **una sola volta**
- Esecuzione sequenziale degli script con variabili aggiornate
- Mantiene **snapshot semantics** (ogni script vede stato frozen a inizio tick)

**Performance**:
| Metrica | Prima (N runtime) | Dopo (1 runtime) |
|---------|-------------------|------------------|
| 10 script | ~13ms | ~2.7ms |
| 100 script | ~130ms | ~27ms |
| Speedup | - | **~5x** |

---

## ✅ Definition of Done

- [x] 5 token predefiniti funzionanti
- [x] Creazione token custom con emoji/nome/colore
- [x] Source produce 1 tipo di token
- [x] Pool accumula multi-token
- [x] Converter con ricette multi-input/output
- [ ] Edge con filtro token
- [x] Script con accesso `get("node", "token")`
- [x] Chart multi-token con toggle Nodes/Tokens
- [x] Retrocompatibilità progetti esistenti
- [ ] Template aggiornati con token
- [ ] Documentazione README aggiornata

---

## Legenda

- ✅ Completato
- 🔄 In corso
- ❌ Da fare
