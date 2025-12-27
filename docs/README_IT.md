# 🎮 Game Economy Simulator - Manuale d'Uso

Un simulatore visuale di economie di gioco ispirato a **Machinations**, progettato per modellare e testare sistemi Producer-Consumer nei videogiochi.

---

## 📋 Indice

1. [Introduzione](#-introduzione)
2. [Avvio Rapido](#-avvio-rapido)
3. [Interfaccia](#-interfaccia)
4. [Tipi di Nodo](#-tipi-di-nodo)
5. [Connessioni](#-connessioni)
6. [Simulazione](#-simulazione)
7. [Proprietà Avanzate](#-proprietà-avanzate)
8. [Template Predefiniti](#-template-predefiniti)
9. [Formule Custom](#-formule-custom)
10. [Script Personalizzati](#-script-personalizzati-avanzato)
11. [Salvataggio e Export](#-salvataggio-e-export)
12. [Scorciatoie da Tastiera](#-scorciatoie-da-tastiera)
13. [Casi d'Uso](#-casi-duso)

---

## 🎯 Introduzione

Game Economy Simulator ti permette di creare diagrammi interattivi che simulano il flusso di risorse in un sistema di gioco. È ideale per:

- **Game Designer**: Prototipare meccaniche economiche
- **Bilanciamento**: Testare equilibrio del sistema
- **Documentazione**: Visualizzare flussi di risorse
- **Didattica**: Imparare economia dei giochi

---

## 🚀 Avvio Rapido

### Installazione

```bash
# Clona il repository
git clone <url>
cd prod-cons

# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev
```

### Primo Diagramma in 30 Secondi

1. **Trascina** un nodo `Source` dalla palette al canvas
2. **Trascina** un nodo `Pool` accanto ad esso
3. **Connetti**: clicca sul pallino destro del Source e trascina al pallino sinistro del Pool
4. **Avvia**: clicca su ▶️ Play
5. Osserva le risorse fluire!

---

## 🖥️ Interfaccia

```
┌─────────────────────────────────────────────────────────────────┐
│  🎮 Game Economy Simulator    [▶️][⏭️][🔄][🏃⎯⎯●⎯⎯] [↩️][↪️]...   │  ← Toolbar
├─────────────────────────────────────────────────────────────────┤
│                                                    ┌──────────┐ │
│                                                    │Properties│ │
│              Canvas principale                     │  Panel   │ │
│              (trascinare nodi qui)                 └──────────┘ │
│                                                    ┌──────────┐ │
│                                                    │  Chart   │ │
│         [Minimap]                                  │          │ │
└─────────────────────────────────────────────────────────────────┤
│  Tick: 42   |   Nodes: 5   |   Edges: 4   |   Running ●        │  ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

### Toolbar

| Controllo | Descrizione |
|-----------|-------------|
| ▶️ Play / ⏸️ Pause | Avvia/ferma simulazione automatica |
| ⏭️ Step | Esegue un singolo tick |
| 🔄 Reset | Riporta risorse ai valori iniziali |
| 🏃 Slider | Velocità simulazione (0.1x - 5x) |
| ↩️ Undo | Annulla ultima azione (Ctrl+Z) |
| ↪️ Redo | Ripristina azione (Ctrl+Y) |
| 📋 Copy | Copia nodo selezionato (Ctrl+C) |
| 📄 Paste | Incolla nodo (Ctrl+V) |
| 💾 Save | Salva progetto come JSON |
| 📂 Load | Carica progetto JSON |
| 📊 CSV | Esporta statistiche simulazione |
| 📋 Templates | Carica scenario predefinito |

### Palette Nodi

Trascina i nodi dalla palette sul canvas:

| Icona | Tipo | Funzione |
|-------|------|----------|
| ⬆️ | Source | Produce risorse |
| 🔵 | Pool | Accumula risorse |
| ⬇️ | Drain | Consuma risorse |
| 🔄 | Converter | Trasforma risorse |
| 🚪 | Gate | Controlla flusso |

---

## 🧩 Tipi di Nodo

### ⬆️ Source (Sorgente)

Produce risorse automaticamente ad ogni tick.

| Proprietà | Descrizione |
|-----------|-------------|
| Label | Nome del nodo |
| Resources | Risorse accumulate |
| Production Rate | Risorse prodotte per tick |
| Probability | % di attivazione per tick (0-100) |
| Use Formula | Usa formula invece di rate fisso |

**Esempi d'uso:**
- Spawn di nemici
- Generazione passiva di gold
- Rigenerazione vita/mana
- Quest rewards

---

### 🔵 Pool (Accumulo)

Accumula risorse con capacità opzionale.

| Proprietà | Descrizione |
|-----------|-------------|
| Label | Nome del nodo |
| Resources | Risorse attuali |
| Capacity | Massimo (-1 = illimitato) |
| Probability | % di trasferimento in uscita |

**Esempi d'uso:**
- Inventario giocatore
- Wallet/portafoglio
- Barra della vita/mana
- Storage di risorse

---

### ⬇️ Drain (Consumatore)

Consuma e rimuove risorse dal sistema.

| Proprietà | Descrizione |
|-----------|-------------|
| Label | Nome del nodo |
| Resources | Risorse rimosse (contatore) |
| Probability | % di consumo |

**Esempi d'uso:**
- Acquisti nel shop
- Danni subiti
- Consumo energia per azioni
- Costi di crafting

---

### 🔄 Converter (Convertitore)

Trasforma risorse in input in risorse in output.

| Proprietà | Descrizione |
|-----------|-------------|
| Input Ratio | Risorse richieste |
| Output Ratio | Risorse prodotte |
| Resources | Buffer di accumulo |

**Logica:** Quando accumula `inputRatio` risorse, le converte in `outputRatio` e le distribuisce.

**Esempio:** Input 3, Output 1 → Ogni 3 risorse in entrata, produce 1 risorsa in uscita.

**Esempi d'uso:**
- Crafting (3 legno → 1 tavola)
- Conversione valuta
- Upgrade system
- Fusione oggetti

---

### 🚪 Gate (Porta Condizionale)

Trasferisce risorse solo se una condizione è soddisfatta.

| Proprietà | Descrizione |
|-----------|-------------|
| Condition | `always` / `if_above` / `if_below` |
| Threshold | Soglia per la condizione |
| Resources | Risorse accumulate |

**Condizioni:**
- `always`: Sempre aperto (flusso normale)
- `if_above`: Aperto solo se resources > threshold
- `if_below`: Aperto solo se resources < threshold

**Esempi d'uso:**
- Sblocchi a livello di risorse
- Overflow protection
- Conditional triggers
- Gating content

---

## 🔗 Connessioni

### Creare una Connessione

1. Clicca sul **pallino destro** (●) del nodo sorgente
2. Trascina verso il **pallino sinistro** del nodo destinazione
3. Rilascia per creare la connessione

### Proprietà Connessione

Clicca su una connessione per aprire il pannello proprietà:

| Proprietà | Descrizione |
|-----------|-------------|
| Flow Rate | Risorse trasferite per tick |

Il flow rate è visualizzato come etichetta sulla connessione.

### Regole del Flusso

- Le risorse fluiscono **solo se disponibili** nel nodo sorgente
- Le risorse rispettano la **capacità** del nodo destinazione
- I **Drain** accettano sempre le risorse (le eliminano)
- I **Source** producono senza consumare dal proprio pool

---

## ⚡ Simulazione

### Tick

La simulazione procede per **tick** discreti. Ad ogni tick:

1. **Fase 1:** I Source producono risorse (se probability check passa)
2. **Fase 2:** Le risorse fluiscono attraverso le connessioni
3. **Fase 3:** I Converter processano le risorse accumulate

### Controlli

| Azione | Risultato |
|--------|-----------|
| ▶️ Play | Avvia simulazione continua |
| ⏸️ Pause | Ferma simulazione |
| ⏭️ Step | Esegue singolo tick (utile per debug) |
| 🔄 Reset | Riporta tutto allo stato iniziale |

### Velocità

Usa lo **slider 🏃** per regolare la velocità:
- **0.1x**: Molto lento (1 tick ogni 10 secondi)
- **1x**: Normale (1 tick/secondo)
- **5x**: Veloce (5 tick/secondo)

---

## ⚙️ Proprietà Avanzate

### Probability (Tutti i nodi)

Ogni nodo ha un valore **Probability** (0-100%):
- Determina la % di attivazione per tick
- 100% = sempre attivo
- 50% = attivo circa metà delle volte
- Utile per simulare eventi casuali, drop rates, ecc.

### Formule Custom (Source)

I nodi Source possono usare formule invece di un rate fisso. Vedi [Formule Custom](#-formule-custom).

---

## 📋 Template Predefiniti

Clicca su **📋 Templates** per caricare scenari pronti:

### 🗡️ Loot System
Simula drop di loot dai nemici verso l'inventario del giocatore.

### ⚡ Energy Regen
Sistema di stamina con rigenerazione nel tempo e consumo per azioni.

### 🔨 Crafting
Sistema di raccolta materiali e crafting di oggetti.

### 💰 Economy Loop
Ciclo economico: lavoro → guadagno → spesa → shop.

### 🔮 Mana System
Sistema magico con rigenerazione mana e consumo spell.

---

## 📐 Formule Custom

Per i nodi **Source**, puoi usare formule invece di un rate fisso.

### Attivazione

1. Seleziona un nodo Source
2. Nel pannello proprietà, abilita **"Use Formula"**
3. Inserisci la formula

### Variabili Disponibili

| Variabile | Descrizione |
|-----------|-------------|
| `resources` | Risorse attuali nel nodo |
| `tick` | Tick corrente della simulazione |
| `capacity` | Capacità del nodo |

### Funzioni Disponibili

| Funzione | Descrizione | Esempio |
|----------|-------------|---------|
| `min(a, b)` | Minimo | `min(resources, 5)` |
| `max(a, b)` | Massimo | `max(0, 10 - resources)` |
| `floor(x)` | Arrotonda giù | `floor(resources / 2)` |
| `ceil(x)` | Arrotonda su | `ceil(tick * 0.1)` |
| `round(x)` | Arrotonda | `round(resources * 0.3)` |
| `random()` | Casuale 0-1 | `random() * 10` |
| `sqrt(x)` | Radice quadrata | `sqrt(resources)` |
| `pow(x, y)` | Potenza | `pow(2, tick)` |
| `sin(x)`, `cos(x)` | Trigonometriche | `5 + sin(tick) * 3` |
| `abs(x)` | Valore assoluto | `abs(resources - 50)` |

### Esempi di Formule

```javascript
resources * 0.1          // Produce 10% delle risorse attuali
10 + tick * 0.5          // Aumenta linearmente nel tempo
min(resources, 5)        // Produce max 5 per tick
max(0, 100 - resources)  // Produce di più quando basso
floor(resources / 10)    // Produzione a scaglioni
random() * 10            // Casuale 0-10
5 + sin(tick) * 3        // Oscillazione ciclica (2-8)
pow(1.1, tick)           // Crescita esponenziale
```

---

## � Script Personalizzati (Avanzato)

Per logiche complesse oltre le semplici formule, i nodi **Source** e **Converter** supportano script JavaScript eseguiti in una sandbox sicura (QuickJS WebAssembly).

### Attivazione

1. Seleziona un nodo Source o Converter
2. Nel pannello proprietà, clicca il pulsante modalità **📜 Script**
3. Inserisci il tuo codice JavaScript
4. Lo script deve restituire un numero

### Caratteristiche di Sicurezza

- **Esecuzione Sandbox**: Gli script vengono eseguiti in ambiente WebAssembly isolato
- **Limite Memoria**: 1MB per esecuzione script
- **Limite Cicli**: 10.000 operazioni JavaScript per tick
- **Limite Stack**: 50KB massimo stack chiamate
- **Nessun Accesso Esterno**: Non può accedere a API browser, DOM, rete o file system

### Variabili di Contesto Disponibili

| Variabile | Descrizione |
|-----------|-------------|
| `input` | Risorse ricevute (Converter) o risorse attuali (Source) |
| `resources` | Risorse attuali nel nodo |
| `capacity` | Capacità del nodo (-1 significa illimitata) |
| `tick` | Tick corrente della simulazione |

### Funzioni Disponibili

| Funzione | Descrizione |
|----------|-------------|
| `getNode(id)` | Ottiene dati di un altro nodo: `{ resources, capacity }` |
| `state` | Oggetto persistente per salvare valori tra i tick |
| `min()`, `max()`, `floor()`, `ceil()`, `round()` | Funzioni matematiche |
| `random()`, `sqrt()`, `pow()`, `sin()`, `cos()`, `abs()` | Funzioni matematiche |

### Esempi di Script

```javascript
// Produzione adattiva: produce di più quando le risorse sono basse
if (resources < 10) {
  return 5;
} else if (resources < 50) {
  return 2;
} else {
  return 1;
}
```

```javascript
// Produzione ciclica con pattern a onda
return 3 + Math.round(Math.sin(tick * 0.5) * 2);
```

```javascript
// Conversione con curva di efficienza
const efficiency = Math.min(1, input / 10);
return Math.floor(input * efficiency);
```

```javascript
// Logica basata su conteggio con stato persistente
if (state.counter === undefined) {
  state.counter = 0;
}
state.counter++;
return state.counter % 3 === 0 ? 10 : 2; // Burst ogni 3 tick
```

```javascript
// Reagisce allo stato di un altro nodo
const warehouse = getNode('warehouse-123');
if (warehouse && warehouse.resources < 20) {
  return 5; // Produce di più quando il magazzino è scarso
}
return 1;
```

### Script vs Formule

| Caratteristica | Formula | Script |
|----------------|---------|--------|
| Complessità | Espressioni semplici | Logica JavaScript completa |
| Condizionali | No | Sì (`if/else`, `switch`) |
| Loop | No | Sì (`for`, `while`) |
| Stato Persistente | No | Sì (oggetto `state`) |
| Accesso Altri Nodi | No | Sì (`getNode()`) |
| Performance | Più veloce | Leggermente più lento (WASM) |
| Esecuzione | Sincrona | Asincrona (usa valore cache) |

---

## �💾 Salvataggio e Export

### Salvare Progetto

1. Clicca **💾 Save**
2. Inserisci un nome
3. Il file `.json` viene scaricato

### Caricare Progetto

1. Clicca **📂 Load**
2. Seleziona un file `.json` precedentemente salvato
3. Il diagramma viene caricato

### Export Statistiche CSV

1. Esegui la simulazione per alcuni tick
2. Clicca **📊 CSV**
3. Scarica un file CSV con i valori delle risorse per ogni tick

Il CSV contiene:
- Colonna `Tick`: numero del tick
- Una colonna per ogni nodo con le risorse

Utile per analisi in Excel, Google Sheets, ecc.

---

## ⌨️ Scorciatoie da Tastiera

| Tasto | Azione |
|-------|--------|
| `Delete` / `Backspace` | Elimina elemento selezionato |
| `Ctrl + Z` | Undo (annulla) |
| `Ctrl + Y` | Redo (ripristina) |
| `Ctrl + Shift + Z` | Redo (alternativo) |
| `Ctrl + C` | Copia nodo selezionato |
| `Ctrl + V` | Incolla nodo |

---

## 🎮 Casi d'Uso

### 1. Bilanciamento Economia

Simula l'economia del tuo gioco per verificare:
- Il giocatore guadagna troppo/poco?
- C'è inflazione/deflazione di risorse?
- Il pacing è corretto?

### 2. Loot Tables

Modella i drop rates:
- Source con probability per drop rari
- Converter per upgrade tiers

### 3. Energy/Stamina System

Tipico dei mobile games:
- Source per rigenerazione
- Pool per energy cap
- Drain per costo azioni

### 4. Crafting System

- Multiple Pool per materiali
- Converter per ricette
- Gate per sblocchi progressivi

### 5. Combat Damage

- Source per DPS
- Pool per HP
- Gate per armor/resistenze

---

## 🛠️ Tecnologie

| Tecnologia | Uso |
|------------|-----|
| React 18 | UI Framework |
| React Flow | Diagrammi node-based |
| Zustand | State management |
| Recharts | Grafici real-time |
| TypeScript | Type safety |
| Vite | Build tool |

---

## 📚 Riferimenti

- [Machinations](https://machinations.io/) - Tool di ispirazione
- [Game Mechanics: Advanced Game Design](https://www.amazon.com/Game-Mechanics-Advanced-Design-Voices/dp/0321820274) - Libro di E. Adams e J. Dormans
- [React Flow](https://reactflow.dev/) - Libreria per diagrammi

---

*Game Economy Simulator v0.8.0 - Creato per game designers e sviluppatori*
