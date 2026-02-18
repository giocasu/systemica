/**
 * Secure Script Runner using QuickJS-emscripten
 * 
 * Provides a sandboxed JavaScript execution environment for user scripts.
 * Scripts run in a WebAssembly sandbox with NO access to browser APIs.
 * 
 * Security features:
 * - Complete isolation from DOM/window/document
 * - Memory limits (1MB)
 * - Execution timeout (max cycles)
 * - Stack size limits
 * - Only whitelisted functions available
 */

import { newQuickJSWASMModule, QuickJSWASMModule } from "quickjs-emscripten";
import { TypedResources } from '../types';

// Singleton for the QuickJS module (loads WASM once)
let quickJSModule: QuickJSWASMModule | null = null;
let moduleLoading: Promise<QuickJSWASMModule> | null = null;

/**
 * Get or initialize the QuickJS WASM module
 */
async function getQuickJS(): Promise<QuickJSWASMModule> {
  if (quickJSModule) return quickJSModule;
  
  if (!moduleLoading) {
    moduleLoading = newQuickJSWASMModule().then(module => {
      quickJSModule = module;
      return module;
    });
  }
  
  return moduleLoading;
}

/**
 * Context passed to user scripts
 */
export interface ScriptContext {
  // Current node data
  input: number;          // Resources available (for converters: accumulated input)
  resources: number;      // Current resources in the node (total of all tokens)
  capacity: number;       // Node capacity (-1 = unlimited)
  totalProduced?: number; // (Source only) Total produced so far
  maxProduction?: number; // (Source only) Max total production (-1 = unlimited)
  
  // Token system
  tokenType?: string;     // Token type of this node (Source only)
  tokens: TypedResources; // Typed resources map (e.g., { black: 10, gold: 5 })
  
  // Simulation state
  tick: number;           // Current simulation tick
  
  // Access to other nodes (readonly)
  getNode: (id: string) => { resources: number; capacity: number; tokens: TypedResources; tokenType?: string } | null;
  
  // Shorthand to get a specific token from a node
  get: (nodeId: string, tokenId: string) => number;
  
  // Persistent state for this node (survives between ticks)
  state: Record<string, unknown>;
}

/**
 * Result of script execution
 */
export interface ScriptResult {
  success: boolean;
  value: number;
  error?: string;
  newState?: Record<string, number>;
}

/**
 * Execute a user script in a secure sandbox
 */
export async function executeScript(
  script: string,
  context: ScriptContext
): Promise<ScriptResult> {
  
  if (!script || script.trim() === '') {
    return { success: false, value: 0, error: 'Empty script' };
  }
  
  try {
    const QuickJS = await getQuickJS();
    
    // Create isolated runtime with limits
    const runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(1024 * 1024);      // 1MB max memory
    runtime.setMaxStackSize(1024 * 50);       // 50KB stack
    
    const vm = runtime.newContext();
    
    // Timeout: interrupt after too many cycles
    let cycles = 0;
    const maxCycles = 10000;
    runtime.setInterruptHandler(() => {
      cycles++;
      return cycles > maxCycles;
    });
    
    try {
      // Expose context variables (readonly)
      vm.setProp(vm.global, "input", vm.newNumber(context.input));
      vm.setProp(vm.global, "resources", vm.newNumber(context.resources));
      vm.setProp(vm.global, "capacity", vm.newNumber(context.capacity === -1 ? Infinity : context.capacity));
      vm.setProp(vm.global, "capacityRaw", vm.newNumber(context.capacity));
      vm.setProp(vm.global, "tick", vm.newNumber(context.tick));

      // Token type (for Source nodes)
      if (context.tokenType) {
        vm.setProp(vm.global, "tokenType", vm.newString(context.tokenType));
      }
      
      // Typed resources object
      const tokensObj = vm.newObject();
      for (const [tokenId, amount] of Object.entries(context.tokens ?? {})) {
        vm.setProp(tokensObj, tokenId, vm.newNumber(amount));
      }
      vm.setProp(vm.global, "tokens", tokensObj);
      tokensObj.dispose();

      // Source-related aliases (safe to expose for all nodes)
      vm.setProp(vm.global, "buffer", vm.newNumber(context.resources));
      vm.setProp(vm.global, "bufferCapacity", vm.newNumber(context.capacity === -1 ? Infinity : context.capacity));
      vm.setProp(vm.global, "bufferCapacityRaw", vm.newNumber(context.capacity));
      vm.setProp(vm.global, "totalProduced", vm.newNumber(context.totalProduced ?? 0));
      vm.setProp(vm.global, "produced", vm.newNumber(context.totalProduced ?? 0));
      const maxProd = context.maxProduction ?? -1;
      const maxProdValue = maxProd === -1 ? Infinity : maxProd;
      vm.setProp(vm.global, "maxProduction", vm.newNumber(maxProdValue));
      vm.setProp(vm.global, "maxTotalProduction", vm.newNumber(maxProdValue));
      vm.setProp(vm.global, "maxProductionRaw", vm.newNumber(maxProd));
      vm.setProp(vm.global, "maxTotalProductionRaw", vm.newNumber(maxProd));
      
      // Expose state object (only numeric values)
      const stateObj = vm.newObject();
      for (const [key, value] of Object.entries(context.state)) {
        if (typeof value === 'number') {
          vm.setProp(stateObj, key, vm.newNumber(value));
        }
      }
      vm.setProp(vm.global, "state", stateObj);
      stateObj.dispose();
      
      // log() function for debugging scripts (outputs to browser console)
      const logFn = vm.newFunction("__logRaw", (msgHandle) => {
        const msg = vm.getString(msgHandle);
        console.log('[Script log]', msg);
      });
      vm.setProp(vm.global, "__logRaw", logFn);
      logFn.dispose();
      vm.evalCode(`function log() { var parts = []; for (var i = 0; i < arguments.length; i++) { var v = arguments[i]; parts.push(typeof v === 'object' ? JSON.stringify(v) : String(v)); } __logRaw(parts.join(' ')); }`);
      
      // Expose getNode: use individual host functions to avoid QuickJS handle/object issues
      const gnResFn = vm.newFunction("__gnRes", (idHandle) => {
        const id = vm.getString(idHandle);
        const node = context.getNode(id);
        return vm.newNumber(node ? node.resources : -99999);
      });
      vm.setProp(vm.global, "__gnRes", gnResFn); gnResFn.dispose();
      
      const gnCapFn = vm.newFunction("__gnCap", (idHandle) => {
        const id = vm.getString(idHandle);
        const node = context.getNode(id);
        return vm.newNumber(node ? (node.capacity === -1 ? 1e18 : node.capacity) : 0);
      });
      vm.setProp(vm.global, "__gnCap", gnCapFn); gnCapFn.dispose();
      
      const gnExistsFn = vm.newFunction("__gnExists", (idHandle) => {
        const id = vm.getString(idHandle);
        const node = context.getNode(id);
        return vm.newNumber(node ? 1 : 0);
      });
      vm.setProp(vm.global, "__gnExists", gnExistsFn); gnExistsFn.dispose();
      
      const gnTokensFn = vm.newFunction("__gnTokensJSON", (idHandle) => {
        const id = vm.getString(idHandle);
        const node = context.getNode(id);
        if (!node) return vm.newString("{}");
        return vm.newString(JSON.stringify(node.tokens ?? {}));
      });
      vm.setProp(vm.global, "__gnTokensJSON", gnTokensFn); gnTokensFn.dispose();
      
      const gnTypeFn = vm.newFunction("__gnType", (idHandle) => {
        const id = vm.getString(idHandle);
        const node = context.getNode(id);
        return vm.newString(node?.tokenType ?? "");
      });
      vm.setProp(vm.global, "__gnType", gnTypeFn); gnTypeFn.dispose();
      
      // Define getNode wrapper inside QuickJS
      const wrapResult = vm.evalCode(`
        function getNode(id) {
          if (__gnExists(id) === 0) return null;
          return {
            resources: __gnRes(id),
            capacity: __gnCap(id),
            tokens: JSON.parse(__gnTokensJSON(id)),
            tokenType: __gnType(id) || undefined
          };
        }
      `);
      if (wrapResult.error) {
        const err = vm.getString(wrapResult.error);
        wrapResult.error.dispose();
        console.error('[Script] getNode wrapper error:', err);
      } else {
        wrapResult.value.dispose();
      }
      
      // Expose get function (shorthand for getting specific token)
      const getFn = vm.newFunction("get", (nodeIdHandle, tokenIdHandle) => {
        const nodeId = vm.getString(nodeIdHandle);
        const tokenId = vm.getString(tokenIdHandle);
        const node = context.getNode(nodeId);
        if (!node) return vm.newNumber(0);
        return vm.newNumber((node.tokens ?? {})[tokenId] ?? 0);
      });
      vm.setProp(vm.global, "get", getFn);
      getFn.dispose();
      
      // Expose Math functions
      const mathFunctions = ['min', 'max', 'floor', 'ceil', 'round', 'abs', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'log', 'exp'];
      for (const fnName of mathFunctions) {
        const fn = vm.newFunction(fnName, (...args) => {
          const nums = args.map(a => vm.getNumber(a));
          const mathFn = (Math as unknown as Record<string, (...args: number[]) => number>)[fnName];
          const result = mathFn(...nums);
          return vm.newNumber(result);
        });
        vm.setProp(vm.global, fnName, fn);
        fn.dispose();
      }
      
      // Expose random
      const randomFn = vm.newFunction("random", () => {
        return vm.newNumber(Math.random());
      });
      vm.setProp(vm.global, "random", randomFn);
      randomFn.dispose();
      
      // Expose constants
      vm.setProp(vm.global, "PI", vm.newNumber(Math.PI));
      vm.setProp(vm.global, "E", vm.newNumber(Math.E));
      
      // Wrap user script to return a value
      const wrappedScript = `
        (function() {
          ${script}
        })()
      `;
      
      // Execute script
      const result = vm.evalCode(wrappedScript);
      
      if (result.error) {
        const errorHandle = result.error;
        const errorMessage = vm.getString(errorHandle);
        errorHandle.dispose();
        return { 
          success: false, 
          value: 0, 
          error: cycles > maxCycles ? 'Script timeout (infinite loop?)' : errorMessage 
        };
      }
      
      // Get return value
      const value = vm.getNumber(result.value);
      result.value.dispose();
      
      // Get updated state
      const stateHandle = vm.getProp(vm.global, "state");
      const newState: Record<string, number> = {};
      
      // Read state properties back
      const statePropsHandle = vm.evalCode("Object.keys(state)");
      if (!statePropsHandle.error && statePropsHandle.value) {
        const jsonResult = vm.evalCode("JSON.stringify(Object.keys(state))");
        if (!jsonResult.error && jsonResult.value) {
          const propsArray = vm.getString(jsonResult.value);
          jsonResult.value.dispose();
          const props = JSON.parse(propsArray) as string[];
          for (const prop of props) {
            const propHandle = vm.getProp(stateHandle, prop);
            newState[prop] = vm.getNumber(propHandle);
            propHandle.dispose();
          }
        }
        statePropsHandle.value.dispose();
      }
      stateHandle.dispose();
      
      // Validate result
      if (typeof value !== 'number' || !isFinite(value)) {
        return { success: false, value: 0, error: 'Script must return a number' };
      }
      
      return { 
        success: true, 
        value: Math.max(0, Math.floor(value)),
        newState
      };
      
    } finally {
      vm.dispose();
      runtime.dispose();
    }
    
  } catch (error) {
    return { 
      success: false, 
      value: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate a script without running it in simulation context
 */
export async function validateScript(script: string): Promise<string | null> {
  if (!script || script.trim() === '') {
    return null; // Empty is valid (will use default)
  }
  
  // Test with dummy context
  const result = await executeScript(script, {
    input: 10,
    resources: 10,
    capacity: 100,
    totalProduced: 5,
    maxProduction: 100,
    tick: 1,
    tokenType: 'black',
    tokens: { black: 10 },
    getNode: () => ({ resources: 50, capacity: 100, tokens: { black: 50 } }),
    get: () => 0,
    state: {},
  });
  
  if (!result.success) {
    return result.error || 'Invalid script';
  }
  
  return null;
}

/**
 * Pre-load the QuickJS module (call on app init for faster first script)
 */
export async function preloadScriptRunner(): Promise<void> {
  await getQuickJS();
}

// ============================================================================
// BATCH EXECUTION - Optimized for multiple scripts per tick
// ============================================================================

/**
 * Script entry for batch execution
 */
export interface BatchScriptEntry {
  nodeId: string;
  script: string;
  context: ScriptContext;
}

/**
 * Result of batch script execution
 */
export interface BatchScriptResult {
  nodeId: string;
  result: ScriptResult;
}

/**
 * Execute multiple scripts in a single runtime/context for performance.
 * 
 * IMPORTANT: This maintains snapshot semantics because:
 * 1. All scripts receive the SAME getNode/get functions pointing to frozen snapshot
 * 2. Scripts don't modify nodes directly, only return values
 * 3. Results are collected and applied AFTER all scripts complete
 * 
 * Performance: ~5x faster than individual executeScript() calls
 */
export async function executeBatchScripts(
  entries: BatchScriptEntry[]
): Promise<BatchScriptResult[]> {
  
  if (entries.length === 0) return [];
  
  // For single script, use regular execution (simpler, no overhead benefit)
  if (entries.length === 1) {
    const entry = entries[0];
    const result = await executeScript(entry.script, entry.context);
    return [{ nodeId: entry.nodeId, result }];
  }
  
  const results: BatchScriptResult[] = [];
  
  try {
    const QuickJS = await getQuickJS();
    
    // Create ONE runtime and context for all scripts
    const runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(1024 * 1024 * 4);  // 4MB for batch (shared)
    runtime.setMaxStackSize(1024 * 50);
    
    const vm = runtime.newContext();
    
    try {
      // ========== ONE-TIME SETUP (shared across all scripts) ==========
      
      // Math functions (immutable, shared)
      const mathFunctions = ['min', 'max', 'floor', 'ceil', 'round', 'abs', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'log', 'exp'];
      for (const fnName of mathFunctions) {
        const fn = vm.newFunction(fnName, (...args) => {
          const nums = args.map(a => vm.getNumber(a));
          const mathFn = (Math as unknown as Record<string, (...args: number[]) => number>)[fnName];
          return vm.newNumber(mathFn(...nums));
        });
        vm.setProp(vm.global, fnName, fn);
        fn.dispose();
      }
      
      // Random function
      const randomFn = vm.newFunction("random", () => vm.newNumber(Math.random()));
      vm.setProp(vm.global, "random", randomFn);
      randomFn.dispose();
      
      // Constants
      vm.setProp(vm.global, "PI", vm.newNumber(Math.PI));
      vm.setProp(vm.global, "E", vm.newNumber(Math.E));
      
      // log() function for debugging scripts (outputs to browser console)
      const logFn = vm.newFunction("__logRaw", (msgHandle) => {
        const msg = vm.getString(msgHandle);
        console.log('[Script log]', msg);
      });
      vm.setProp(vm.global, "__logRaw", logFn);
      logFn.dispose();
      vm.evalCode(`function log() { var parts = []; for (var i = 0; i < arguments.length; i++) { var v = arguments[i]; parts.push(typeof v === 'object' ? JSON.stringify(v) : String(v)); } __logRaw(parts.join(' ')); }`);
      
      // ========== EXECUTE EACH SCRIPT SEQUENTIALLY ==========
      
      for (const entry of entries) {
        if (!entry.script || entry.script.trim() === '') {
          results.push({ 
            nodeId: entry.nodeId, 
            result: { success: false, value: 0, error: 'Empty script' } 
          });
          continue;
        }
        
        // Reset cycle counter for each script
        let cycles = 0;
        const maxCycles = 10000;
        runtime.setInterruptHandler(() => {
          cycles++;
          return cycles > maxCycles;
        });
        
        try {
          const ctx = entry.context;
          
          // Update per-script variables (lightweight)
          vm.setProp(vm.global, "input", vm.newNumber(ctx.input));
          vm.setProp(vm.global, "resources", vm.newNumber(ctx.resources));
          vm.setProp(vm.global, "capacity", vm.newNumber(ctx.capacity === -1 ? Infinity : ctx.capacity));
          vm.setProp(vm.global, "capacityRaw", vm.newNumber(ctx.capacity));
          vm.setProp(vm.global, "tick", vm.newNumber(ctx.tick));
          vm.setProp(vm.global, "buffer", vm.newNumber(ctx.resources));
          vm.setProp(vm.global, "bufferCapacity", vm.newNumber(ctx.capacity === -1 ? Infinity : ctx.capacity));
          vm.setProp(vm.global, "bufferCapacityRaw", vm.newNumber(ctx.capacity));
          vm.setProp(vm.global, "totalProduced", vm.newNumber(ctx.totalProduced ?? 0));
          vm.setProp(vm.global, "produced", vm.newNumber(ctx.totalProduced ?? 0));
          
          const maxProd = ctx.maxProduction ?? -1;
          vm.setProp(vm.global, "maxProduction", vm.newNumber(maxProd === -1 ? Infinity : maxProd));
          vm.setProp(vm.global, "maxTotalProduction", vm.newNumber(maxProd === -1 ? Infinity : maxProd));
          vm.setProp(vm.global, "maxProductionRaw", vm.newNumber(maxProd));
          vm.setProp(vm.global, "maxTotalProductionRaw", vm.newNumber(maxProd));
          
          // Token type
          if (ctx.tokenType) {
            vm.setProp(vm.global, "tokenType", vm.newString(ctx.tokenType));
          }
          
          // Tokens object (recreate for each script - different node data)
          const tokensObj = vm.newObject();
          for (const [tokenId, amount] of Object.entries(ctx.tokens ?? {})) {
            vm.setProp(tokensObj, tokenId, vm.newNumber(amount));
          }
          vm.setProp(vm.global, "tokens", tokensObj);
          tokensObj.dispose();
          
          // State object (per-node)
          const stateObj = vm.newObject();
          for (const [key, value] of Object.entries(ctx.state)) {
            if (typeof value === 'number') {
              vm.setProp(stateObj, key, vm.newNumber(value));
            }
          }
          vm.setProp(vm.global, "state", stateObj);
          stateObj.dispose();
          
          // getNode: use individual host functions to avoid QuickJS handle/object issues
          const gnResFn = vm.newFunction("__gnRes", (idHandle) => {
            const id = vm.getString(idHandle);
            const node = ctx.getNode(id);
            return vm.newNumber(node ? node.resources : -99999);
          });
          vm.setProp(vm.global, "__gnRes", gnResFn); gnResFn.dispose();
          
          const gnCapFn = vm.newFunction("__gnCap", (idHandle) => {
            const id = vm.getString(idHandle);
            const node = ctx.getNode(id);
            return vm.newNumber(node ? (node.capacity === -1 ? 1e18 : node.capacity) : 0);
          });
          vm.setProp(vm.global, "__gnCap", gnCapFn); gnCapFn.dispose();
          
          const gnExistsFn = vm.newFunction("__gnExists", (idHandle) => {
            const id = vm.getString(idHandle);
            const node = ctx.getNode(id);
            return vm.newNumber(node ? 1 : 0);
          });
          vm.setProp(vm.global, "__gnExists", gnExistsFn); gnExistsFn.dispose();
          
          const gnTokensFn = vm.newFunction("__gnTokensJSON", (idHandle) => {
            const id = vm.getString(idHandle);
            const node = ctx.getNode(id);
            if (!node) return vm.newString("{}");
            return vm.newString(JSON.stringify(node.tokens ?? {}));
          });
          vm.setProp(vm.global, "__gnTokensJSON", gnTokensFn); gnTokensFn.dispose();
          
          const gnTypeFn = vm.newFunction("__gnType", (idHandle) => {
            const id = vm.getString(idHandle);
            const node = ctx.getNode(id);
            return vm.newString(node?.tokenType ?? "");
          });
          vm.setProp(vm.global, "__gnType", gnTypeFn); gnTypeFn.dispose();
          
          // Define getNode wrapper inside QuickJS
          const wrapResult = vm.evalCode(`
            function getNode(id) {
              if (__gnExists(id) === 0) return null;
              return {
                resources: __gnRes(id),
                capacity: __gnCap(id),
                tokens: JSON.parse(__gnTokensJSON(id)),
                tokenType: __gnType(id) || undefined
              };
            }
          `);
          if (wrapResult.error) {
            const err = vm.getString(wrapResult.error);
            wrapResult.error.dispose();
            console.error(`[Script ${entry.nodeId}] getNode wrapper error:`, err);
          } else {
            wrapResult.value.dispose();
          }
          
          // get function - shorthand using SNAPSHOT
          const getFn = vm.newFunction("get", (nodeIdHandle, tokenIdHandle) => {
            const nodeId = vm.getString(nodeIdHandle);
            const tokenId = vm.getString(tokenIdHandle);
            const node = ctx.getNode(nodeId);  // This uses the SNAPSHOT
            if (!node) return vm.newNumber(0);
            return vm.newNumber((node.tokens ?? {})[tokenId] ?? 0);
          });
          vm.setProp(vm.global, "get", getFn);
          getFn.dispose();
          
          // Execute the script
          const wrappedScript = `(function() { ${entry.script} })()`;
          const evalResult = vm.evalCode(wrappedScript);
          
          if (evalResult.error) {
            const errorMessage = vm.getString(evalResult.error);
            evalResult.error.dispose();
            console.warn(`[Script ${entry.nodeId}] Error:`, errorMessage);
            results.push({
              nodeId: entry.nodeId,
              result: {
                success: false,
                value: 0,
                error: cycles > maxCycles ? 'Script timeout (infinite loop?)' : errorMessage
              }
            });
            continue;
          }
          
          // Get return value
          const value = vm.getNumber(evalResult.value);
          console.log(`[Script ${entry.nodeId}] Result:`, value);
          evalResult.value.dispose();
          
          // Get updated state
          const stateHandle = vm.getProp(vm.global, "state");
          const newState: Record<string, number> = {};
          
          const statePropsHandle = vm.evalCode("JSON.stringify(Object.keys(state))");
          if (!statePropsHandle.error && statePropsHandle.value) {
            const propsArray = vm.getString(statePropsHandle.value);
            statePropsHandle.value.dispose();
            const props = JSON.parse(propsArray) as string[];
            for (const prop of props) {
              const propHandle = vm.getProp(stateHandle, prop);
              newState[prop] = vm.getNumber(propHandle);
              propHandle.dispose();
            }
          }
          stateHandle.dispose();
          
          // Validate and store result
          if (typeof value !== 'number' || !isFinite(value)) {
            results.push({
              nodeId: entry.nodeId,
              result: { success: false, value: 0, error: 'Script must return a number' }
            });
          } else {
            results.push({
              nodeId: entry.nodeId,
              result: {
                success: true,
                value: Math.max(0, Math.floor(value)),
                newState
              }
            });
          }
          
        } catch (scriptError) {
          results.push({
            nodeId: entry.nodeId,
            result: {
              success: false,
              value: 0,
              error: scriptError instanceof Error ? scriptError.message : 'Script execution failed'
            }
          });
        }
      }
      
    } finally {
      vm.dispose();
      runtime.dispose();
    }
    
  } catch (error) {
    // If batch setup fails, return errors for all scripts
    for (const entry of entries) {
      if (!results.find(r => r.nodeId === entry.nodeId)) {
        results.push({
          nodeId: entry.nodeId,
          result: {
            success: false,
            value: 0,
            error: error instanceof Error ? error.message : 'Batch execution failed'
          }
        });
      }
    }
  }
  
  return results;
}
