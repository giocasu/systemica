/**
 * TokenEditorModal - Modal to create or edit a custom token.
 * 
 * Features:
 * - Name input
 * - Emoji picker (text input for now, can be enhanced)
 * - Color picker
 * - Set as default option
 */

import { useState, useEffect } from 'react';
import { useTokenStore } from '../store/tokenStore';

interface TokenEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTokenId?: string; // If provided, edit mode
}

// Common emojis for game resources
const SUGGESTED_EMOJIS = [
  '🪙', '💎', '⚔️', '🛡️', '🏹', '🪵', '🪨', '⛏️', 
  '🔥', '💧', '⚡', '🌿', '🍎', '🍖', '🧪', '📜',
  '🎯', '🏆', '⭐', '💰', '🎁', '🔮', '🗝️', '❤️',
];

// Preset colors
const PRESET_COLORS = [
  '#FFD700', // Gold
  '#C0C0C0', // Silver
  '#CD7F32', // Bronze
  '#8B4513', // Wood
  '#808080', // Stone
  '#4169E1', // Royal Blue
  '#9932CC', // Purple
  '#FF69B4', // Pink
];

export function TokenEditorModal({ isOpen, onClose, editTokenId }: TokenEditorModalProps) {
  const { addToken, updateToken, getToken } = useTokenStore();
  
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🪙');
  const [color, setColor] = useState('#FFD700');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load existing token data if editing
  useEffect(() => {
    if (editTokenId) {
      const token = getToken(editTokenId);
      if (token) {
        setName(token.name);
        setEmoji(token.emoji || '●');
        setColor(token.color);
        setIsDefault(token.isDefault || false);
      }
    } else {
      // Reset for new token
      setName('');
      setEmoji('🪙');
      setColor('#FFD700');
      setIsDefault(false);
    }
    setError(null);
  }, [editTokenId, isOpen, getToken]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    
    // Check for duplicate name (case-insensitive)
    const existingTokens = useTokenStore.getState().getAllTokens();
    const duplicate = existingTokens.find(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editTokenId
    );
    if (duplicate) {
      setError(`A token named "${duplicate.name}" already exists`);
      return;
    }
    
    if (editTokenId) {
      // Update existing token
      updateToken(editTokenId, {
        name: trimmedName,
        emoji,
        color,
        isDefault,
      });
    } else {
      // Create new token
      const id = trimmedName.toLowerCase().replace(/\s+/g, '_');
      addToken({
        id,
        name: trimmedName,
        emoji,
        color,
        isDefault,
      });
    }
    
    onClose();
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal token-editor-modal">
        <div className="modal-header">
          <span className="modal-icon">{emoji}</span>
          <h3>{editTokenId ? 'Edit Token' : 'New Token'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Name */}
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Gold, Iron, Health"
                autoFocus
              />
            </div>
            
            {/* Emoji */}
            <div className="form-group">
              <label>Emoji</label>
              <div className="emoji-picker">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(-2) || '●')}
                  className="emoji-input"
                  maxLength={2}
                />
                <div className="emoji-suggestions">
                  {SUGGESTED_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-option ${emoji === em ? 'selected' : ''}`}
                      onClick={() => setEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Color */}
            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="color-text"
                  placeholder="#FFD700"
                />
              </div>
              <div className="color-presets">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-preset ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>
            
            {/* Set as default */}
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Set as default for new Sources
              </label>
            </div>
            
            {/* Error message */}
            {error && <div className="form-error">{error}</div>}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editTokenId ? 'Save' : 'Add Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
