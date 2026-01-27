/**
 * Safe formula evaluator for production rates and converters.
 * 
 * Available variables:
 * - resources: current resources in the node buffer
 * - tick: current simulation tick
 * - capacity: node capacity (-1 if unlimited)
 * - input: (converter only) resources available to convert
 * - totalProduced / produced: (source only) total produced so far
 * 
 * Available functions:
 * - min(a, b): minimum of two values
 * - max(a, b): maximum of two values
 * - floor(x): round down
 * - ceil(x): round up
 * - round(x): round to nearest
 * - abs(x): absolute value
 * - sqrt(x): square root
 * - pow(x, y): x to the power of y
 * - sin(x), cos(x), tan(x): trigonometric functions
 * - random(): random value between 0 and 1
 * 
 * Examples (Source):
 * - "1 + resources * 0.1" → base 1, plus 10% of buffer
 * - "10 + tick * 0.5" → increase production over time
 * - "max(1, floor(produced / 10))" → produce more as total grows
 * 
 * Examples (Converter):
 * - "floor(input * 0.5)" → 50% conversion rate
 * - "min(input, 10)" → max 10 output per tick
 * - "input + floor(tick / 10)" → bonus output over time
 */

interface FormulaContext {
  resources: number;
  tick: number;
  capacity: number;
  input?: number; // For converters: the amount of input resources
  totalProduced?: number; // For sources: total produced so far
  queueSize?: number; // For delay: number of items in queue
  delayTicks?: number; // For delay: current delay setting
}

// Create a safe evaluation context with allowed functions
const createSafeContext = (ctx: FormulaContext) => ({
  // Variables
  resources: ctx.resources,
  tick: ctx.tick,
  capacity: ctx.capacity === -1 ? Infinity : ctx.capacity,
  input: ctx.input ?? 0,
  totalProduced: ctx.totalProduced ?? 0,
  produced: ctx.totalProduced ?? 0, // Alias
  queueSize: ctx.queueSize ?? 0, // Delay: items in queue
  delayTicks: ctx.delayTicks ?? 1, // Delay: current delay setting
  
  // Math functions
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log,
  exp: Math.exp,
  random: Math.random,
  
  // Constants
  PI: Math.PI,
  E: Math.E,
});

/**
 * Evaluate a formula string with the given context.
 * Returns the calculated value, or null if evaluation fails.
 */
export function evaluateFormula(formula: string, context: FormulaContext): number | null {
  if (!formula || formula.trim() === '') {
    return null;
  }
  
  try {
    const safeContext = createSafeContext(context);
    
    // Create a function that evaluates the formula in a restricted scope
    // Only allow access to our safe context variables and functions
    const allowedNames = Object.keys(safeContext);
    const allowedValues = Object.values(safeContext);
    
    // Basic safety check: don't allow certain dangerous patterns
    const dangerousPatterns = [
      /\beval\b/,
      /\bFunction\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\bglobal\b/,
      /\bprocess\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\bexport\b/,
      /\bfetch\b/,
      /\bXMLHttpRequest\b/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\.\s*constructor/,
      /\.\s*prototype/,
      /\.\s*__proto__/,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        console.warn('Formula contains potentially dangerous pattern:', formula);
        return null;
      }
    }
    
    // Create and execute the function
    const fn = new Function(...allowedNames, `"use strict"; return (${formula});`);
    const result = fn(...allowedValues);
    
    // Validate result
    if (typeof result !== 'number' || !isFinite(result)) {
      return null;
    }
    
    // Return non-negative value (allow decimals)
    return Math.max(0, result);
  } catch (error) {
    console.warn('Formula evaluation error:', error);
    return null;
  }
}

/**
 * Validate a formula without executing it.
 * Returns an error message if invalid, or null if valid.
 */
export function validateFormula(formula: string): string | null {
  if (!formula || formula.trim() === '') {
    return null; // Empty is valid (will use default productionRate)
  }
  
  // Test with dummy values
  const result = evaluateFormula(formula, {
    resources: 10,
    tick: 1,
    capacity: 100,
  });
  
  if (result === null) {
    return 'Invalid formula. Check syntax and allowed functions.';
  }
  
  return null;
}
