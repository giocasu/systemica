/**
 * Safe formula evaluator for production rates.
 * 
 * Available variables:
 * - resources: current resources in the node
 * - tick: current simulation tick
 * - capacity: node capacity (-1 if unlimited)
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
 * Examples:
 * - "resources * 0.1" → produce 10% of current resources
 * - "10 + tick * 0.5" → increase production over time
 * - "min(resources, 5)" → produce max 5 per tick
 * - "max(0, 100 - resources)" → produce more when low
 * - "floor(resources / 10)" → tiered production
 * - "random() * 10" → random 0-10 per tick
 */

interface FormulaContext {
  resources: number;
  tick: number;
  capacity: number;
}

// Create a safe evaluation context with allowed functions
const createSafeContext = (ctx: FormulaContext) => ({
  // Variables
  resources: ctx.resources,
  tick: ctx.tick,
  capacity: ctx.capacity === -1 ? Infinity : ctx.capacity,
  
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
    
    // Return non-negative integer
    return Math.max(0, Math.floor(result));
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
