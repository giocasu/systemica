/**
 * Predefined token types for Systemica.
 * 
 * These are the 5 built-in token colors inspired by Machinations.
 * Users can also create custom tokens with their own emoji, name, and color.
 */

import { TokenDefinition } from '../types';

/**
 * The 5 predefined token types with colors matching the Machinations style.
 * Black is the default token for new Sources.
 */
export const PREDEFINED_TOKENS: TokenDefinition[] = [
  { 
    id: 'black', 
    name: 'Black', 
    color: '#1a1a2e', 
    emoji: '⚫', 
    isCustom: false, 
    isDefault: true 
  },
  { 
    id: 'blue', 
    name: 'Blue', 
    color: '#4361ee', 
    emoji: '🔵', 
    isCustom: false 
  },
  { 
    id: 'green', 
    name: 'Green', 
    color: '#2ec4b6', 
    emoji: '🟢', 
    isCustom: false 
  },
  { 
    id: 'orange', 
    name: 'Orange', 
    color: '#ff9f1c', 
    emoji: '🟠', 
    isCustom: false 
  },
  { 
    id: 'red', 
    name: 'Red', 
    color: '#e94560', 
    emoji: '🔴', 
    isCustom: false 
  },
];

/**
 * Get the default token (used for new Sources).
 */
export function getDefaultPredefinedToken(): TokenDefinition {
  return PREDEFINED_TOKENS.find(t => t.isDefault) ?? PREDEFINED_TOKENS[0];
}

/**
 * Get a predefined token by ID.
 */
export function getPredefinedToken(id: string): TokenDefinition | undefined {
  return PREDEFINED_TOKENS.find(t => t.id === id);
}

/**
 * Check if a token ID is a predefined token.
 */
export function isPredefinedToken(id: string): boolean {
  return PREDEFINED_TOKENS.some(t => t.id === id);
}
