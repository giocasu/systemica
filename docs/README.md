# Game Economy Simulator

Un simulatore visuale di economie di gioco ispirato a **Machinations**, progettato per modellare e testare sistemi Producer-Consumer nei videogiochi.

## 📋 Panoramica

Questo tool permette di creare diagrammi interattivi che simulano il flusso di risorse in un sistema di gioco, utilizzando il pattern **Producer-Consumer**. È ideale per game designer che vogliono prototipare e bilanciare meccaniche economiche.

## 🎮 Casi d'Uso nel Game Development

| Scenario | Descrizione |
|----------|-------------|
| **Economia in-game** | Simulare flussi di valuta, punti esperienza, risorse |
| **Bilanciamento** | Testare se il sistema è bilanciato o porta a inflazione/deflazione |
| **Progression System** | Modellare progressione del giocatore |
| **Loot System** | Simulare drop rates e accumulo di oggetti |
| **Energy Systems** | Modellare sistemi energia/stamina (tipici dei mobile games) |

## 🧩 Tipi di Nodo

### Source (Sorgente) 🟢
Produce risorse automaticamente ad ogni tick.
- **Uso**: Spawn di nemici, generazione passiva di risorse, reward periodici
- **Parametri**: `productionRate` (risorse/tick)

### Pool (Accumulo) 🔵
Accumula risorse con una capacità massima opzionale.
- **Uso**: Inventario, wallet, barra della vita, mana pool
- **Parametri**: `resources` (valore attuale), `capacity` (massimo, -1 = illimitato)

### Drain (Consumatore) 🔴
Consuma/elimina risorse dal sistema.
- **Uso**: Acquisti, costi, danni subiti, consumo energia
- **Parametri**: Riceve risorse e le rimuove dal sistema

### Converter (Convertitore) 🟡
Trasforma risorse di un tipo in un altro.
- **Uso**: Crafting, upgrade, conversione valuta
- **Parametri**: Rapporto di conversione input/output

### Gate (Porta) 🟣
Controlla il flusso condizionalmente.
- **Uso**: Sblocchi, requisiti, condizioni

## 🔗 Connessioni

Le connessioni rappresentano il flusso di risorse tra nodi:
- Ogni connessione ha un **flow rate** (risorse trasferite per tick)
- Il flusso è animato durante la simulazione
- Le risorse fluiscono solo se disponibili nel nodo sorgente

## 🖱️ Controlli

### Creazione
| Azione | Come |
|--------|------|
| Aggiungere nodo | Trascina dalla palette nell'area di lavoro |
| Connettere nodi | Trascina dall'handle (●) destro a quello sinistro |
| Eliminare | Seleziona e premi `Delete` o `Backspace` |

### Navigazione
| Azione | Come |
|--------|------|
| Pan (spostare vista) | Clicca e trascina lo sfondo |
| Zoom | Rotella mouse o pulsanti controlli |
| Selezionare | Click sul nodo |
| Selezione multipla | `Shift` + Click o box selection |

### Simulazione
| Pulsante | Funzione |
|----------|----------|
| ▶️ Play | Avvia simulazione automatica (1 tick/sec) |
| ⏸️ Pause | Mette in pausa |
| ⏭️ Step | Esegue un singolo tick |
| 🔄 Reset | Riporta tutte le risorse ai valori iniziali |

## 🏗️ Architettura

```
src/
├── main.tsx              # Entry point React
├── App.tsx               # Componente principale con React Flow
├── types.ts              # Tipi TypeScript e configurazioni nodi
├── styles.css            # Stili globali
├── store/
│   └── simulatorStore.ts # State management con Zustand
├── nodes/
│   └── index.tsx         # Componenti nodi custom
└── components/
    ├── Toolbar.tsx       # Barra strumenti
    ├── PropertiesPanel.tsx # Pannello proprietà
    └── StatusBar.tsx     # Barra di stato
```

## 🛠️ Tecnologie

| Tecnologia | Uso |
|------------|-----|
| **React** | UI framework |
| **React Flow** | Libreria per diagrammi node-based |
| **Zustand** | State management leggero |
| **TypeScript** | Type safety |
| **Vite** | Build tool e dev server |

## 🚀 Avvio

```bash
# Installa dipendenze
npm install

# Avvia dev server
npm run dev

# Build produzione
npm run build
```

## 📊 Esempio: Sistema Loot

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Monster │────▶│  Loot   │────▶│ Player  │
│ Spawner │     │  Pool   │     │Inventory│
│ (Source)│     │ (Pool)  │     │ (Pool)  │
└─────────┘     └─────────┘     └─────────┘
     │                               │
     │                               ▼
     │                         ┌─────────┐
     └────────────────────────▶│  Shop   │
                               │ (Drain) │
                               └─────────┘
```

## 🔮 Roadmap

- [ ] Salvataggio/caricamento progetti (JSON)
- [ ] Flow rate configurabile sulle connessioni
- [ ] Nodi condizionali (if/else)
- [ ] Grafici real-time delle risorse
- [ ] Scenari predefiniti
- [ ] Export statistiche
- [ ] Formule personalizzate per production rate

## 📚 Riferimenti

- [Machinations](https://machinations.io/) - Tool originale di ispirazione
- [Game Mechanics: Advanced Game Design](https://www.amazon.com/Game-Mechanics-Advanced-Design-Voices/dp/0321820274) - Libro di E. Adams e J. Dormans
- [React Flow](https://reactflow.dev/) - Libreria utilizzata

---

*Creato per game designers e sviluppatori che vogliono prototipare sistemi economici di gioco.*
