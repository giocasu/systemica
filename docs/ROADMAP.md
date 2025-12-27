# Roadmap - Game Economy Simulator

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
| **Undo/Redo** | Annulla operazioni | ❌ Da fare |
| **Copia/Incolla nodi** | Duplicare nodi | ❌ Da fare |
| **Scenari predefiniti** | Esempi: loot system, energy system | ❌ Da fare |
| **Velocità simulazione** | Slider per tick/secondo | ❌ Da fare |

## 🟢 Priorità Bassa (Nice to have)

| Feature | Descrizione | Stato |
|---------|-------------|-------|
| **Grafici real-time** | Chart delle risorse nel tempo | ❌ Da fare |
| **Gate condizionali** | If/else sul flusso | ❌ Da fare |
| **Formule custom** | Espressioni per production rate | ❌ Da fare |
| **Random/Probability** | Nodi probabilistici | ❌ Da fare |
| **Export statistiche** | CSV/report della simulazione | ❌ Da fare |
| **Minimap** | Vista d'insieme del diagramma | ❌ Da fare |

## 📋 Legenda

- ✅ Completato
- 🔄 In corso
- ❌ Da fare

## 📝 Note di Sviluppo

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
