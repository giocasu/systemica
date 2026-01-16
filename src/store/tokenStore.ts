/**
 * Token Store - Manages token definitions (predefined + custom).
 * 
 * Tokens are resource types that can flow through the system.
 * - 5 predefined colors: Black, Blue, Green, Orange, Red
 * - Custom tokens: user-defined with emoji, name, and color
 * 
 * Persistence: Custom tokens are saved with the project JSON.
 */

import { create } from 'zustand';
import { TokenDefinition } from '../types';
import { PREDEFINED_TOKENS, getDefaultPredefinedToken } from '../tokens/predefinedTokens';

interface TokenState {
  // Custom tokens defined by the user
  customTokens: TokenDefinition[];
  
  // Actions
  addToken: (token: Omit<TokenDefinition, 'isCustom'>) => void;
  removeToken: (id: string) => void;
  updateToken: (id: string, data: Partial<Omit<TokenDefinition, 'id' | 'isCustom'>>) => void;
  setDefaultToken: (id: string) => void;
  loadCustomTokens: (tokens: TokenDefinition[]) => void;
  clearCustomTokens: () => void;
  
  // Getters
  getAllTokens: () => TokenDefinition[];
  getToken: (id: string) => TokenDefinition | undefined;
  getDefaultToken: () => TokenDefinition;
}

let tokenIdCounter = 1;

export const useTokenStore = create<TokenState>((set, get) => ({
  customTokens: [],

  addToken: (token) => {
    const id = token.id || `custom_${tokenIdCounter++}`;
    const newToken: TokenDefinition = {
      ...token,
      id,
      isCustom: true,
    };
    
    set((state) => ({
      customTokens: [...state.customTokens, newToken],
    }));
  },

  removeToken: (id) => {
    // Can only remove custom tokens
    set((state) => ({
      customTokens: state.customTokens.filter((t) => t.id !== id),
    }));
  },

  updateToken: (id, data) => {
    set((state) => ({
      customTokens: state.customTokens.map((t) =>
        t.id === id ? { ...t, ...data } : t
      ),
    }));
  },

  setDefaultToken: (id) => {
    // Only one token can be default at a time
    // First, remove default from predefined tokens (handled in getter)
    // Then set the new default
    set((state) => ({
      customTokens: state.customTokens.map((t) => ({
        ...t,
        isDefault: t.id === id,
      })),
    }));
  },

  loadCustomTokens: (tokens) => {
    // Ensure all loaded tokens are marked as custom
    const customTokens = tokens.map((t) => ({
      ...t,
      isCustom: true,
    }));
    
    // Update counter to avoid ID collisions
    for (const token of customTokens) {
      if (token.id.startsWith('custom_')) {
        const num = parseInt(token.id.replace('custom_', ''), 10);
        if (!isNaN(num) && num >= tokenIdCounter) {
          tokenIdCounter = num + 1;
        }
      }
    }
    
    set({ customTokens });
  },

  clearCustomTokens: () => {
    set({ customTokens: [] });
  },

  getAllTokens: () => {
    const { customTokens } = get();
    
    // Check if any custom token is set as default
    const hasCustomDefault = customTokens.some((t) => t.isDefault);
    
    // If a custom token is default, remove default from predefined tokens
    const predefined = hasCustomDefault
      ? PREDEFINED_TOKENS.map((t) => ({ ...t, isDefault: false }))
      : PREDEFINED_TOKENS;
    
    return [...predefined, ...customTokens];
  },

  getToken: (id) => {
    const { customTokens } = get();
    
    // Check predefined first
    const predefined = PREDEFINED_TOKENS.find((t) => t.id === id);
    if (predefined) return predefined;
    
    // Then check custom
    return customTokens.find((t) => t.id === id);
  },

  getDefaultToken: () => {
    const { customTokens } = get();
    
    // Check if any custom token is default
    const customDefault = customTokens.find((t) => t.isDefault);
    if (customDefault) return customDefault;
    
    // Otherwise return predefined default
    return getDefaultPredefinedToken();
  },
}));

/**
 * Export custom tokens for saving to project JSON.
 */
export function exportCustomTokens(): TokenDefinition[] {
  return useTokenStore.getState().customTokens;
}

/**
 * Import custom tokens from project JSON.
 */
export function importCustomTokens(tokens: TokenDefinition[]): void {
  useTokenStore.getState().loadCustomTokens(tokens);
}
