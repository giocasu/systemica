/**
 * TokenSelector - Dropdown to select a token type for a Source.
 * 
 * Shows:
 * - 5 predefined colors (Black, Blue, Green, Orange, Red)
 * - Custom tokens with emoji + name
 * - Option to create new custom token
 */

import { useState, useRef, useEffect } from 'react';
import { useTokenStore } from '../store/tokenStore';
import { TokenDefinition } from '../types';

interface TokenSelectorProps {
  value: string;
  onChange: (tokenId: string) => void;
  onCreateNew?: () => void;
}

export function TokenSelector({ value, onChange, onCreateNew }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const getAllTokens = useTokenStore((state) => state.getAllTokens);
  const getToken = useTokenStore((state) => state.getToken);
  
  const allTokens = getAllTokens();
  const selectedToken = getToken(value);
  
  // Filter tokens by search
  const filteredTokens = allTokens.filter((token) =>
    token.name.toLowerCase().includes(search.toLowerCase())
  );
  
  // Separate predefined and custom
  const predefinedTokens = filteredTokens.filter((t) => !t.isCustom);
  const customTokens = filteredTokens.filter((t) => t.isCustom);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const handleSelect = (token: TokenDefinition) => {
    onChange(token.id);
    setIsOpen(false);
    setSearch('');
  };
  
  const handleCreateNew = () => {
    setIsOpen(false);
    setSearch('');
    onCreateNew?.();
  };
  
  return (
    <div className="token-selector" ref={dropdownRef}>
      <button
        type="button"
        className="token-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="token-preview">
          <span 
            className="token-color" 
            style={{ backgroundColor: selectedToken?.color || '#1a1a2e' }}
          />
          <span className="token-emoji">{selectedToken?.emoji || '⚫'}</span>
          <span className="token-name">{selectedToken?.name || 'Black'}</span>
        </span>
        <span className="token-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="token-dropdown">
          <input
            type="text"
            className="token-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          
          <div className="token-list">
            {/* Predefined tokens */}
            {predefinedTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                className={`token-option ${token.id === value ? 'selected' : ''}`}
                onClick={() => handleSelect(token)}
              >
                <span 
                  className="token-color" 
                  style={{ backgroundColor: token.color }}
                />
                <span className="token-emoji">{token.emoji}</span>
                <span className="token-name">{token.name}</span>
                {token.id === value && <span className="token-check">✓</span>}
              </button>
            ))}
            
            {/* Custom tokens separator */}
            {customTokens.length > 0 && (
              <div className="token-separator">
                <span>Custom</span>
              </div>
            )}
            
            {/* Custom tokens */}
            {customTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                className={`token-option ${token.id === value ? 'selected' : ''}`}
                onClick={() => handleSelect(token)}
              >
                <span 
                  className="token-color" 
                  style={{ backgroundColor: token.color }}
                />
                <span className="token-emoji">{token.emoji || '●'}</span>
                <span className="token-name">{token.name}</span>
                {token.id === value && <span className="token-check">✓</span>}
              </button>
            ))}
            
            {/* No results */}
            {filteredTokens.length === 0 && (
              <div className="token-empty">No tokens found</div>
            )}
          </div>
          
          {/* Create new token button */}
          {onCreateNew && (
            <button
              type="button"
              className="token-create-new"
              onClick={handleCreateNew}
            >
              <span className="token-plus">+</span>
              <span>New Token...</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
