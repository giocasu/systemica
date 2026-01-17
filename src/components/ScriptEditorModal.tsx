/**
 * ScriptEditorModal - Full-screen modal for editing JavaScript scripts
 * with syntax highlighting (basic) and better editing experience.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { validateScript } from '../utils/scriptRunner';

interface ScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  nodeType: 'source' | 'converter';
}

// Basic syntax highlighting via regex
function highlightSyntax(code: string): string {
  return code
    // Keywords
    .replace(
      /\b(return|if|else|for|while|const|let|var|function|true|false|null|undefined)\b/g,
      '<span class="syntax-keyword">$1</span>'
    )
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="syntax-number">$1</span>')
    // Strings
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="syntax-string">$&</span>')
    // Comments
    .replace(/(\/\/.*$)/gm, '<span class="syntax-comment">$1</span>')
    // Functions
    .replace(
      /\b(getNode|get|min|max|floor|ceil|round|abs|sqrt|pow|sin|cos|tan|log|exp|random)\b/g,
      '<span class="syntax-function">$1</span>'
    )
    // Variables
    .replace(
      /\b(input|resources|capacity|tick|buffer|totalProduced|produced|maxProduction|state|tokens|tokenType)\b/g,
      '<span class="syntax-variable">$1</span>'
    );
}

export function ScriptEditorModal({ 
  isOpen, 
  onClose, 
  value, 
  onChange, 
  nodeType 
}: ScriptEditorModalProps) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [validating, setValidating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setLocalValue(value);
    setError(null);
    setIsValid(false);
  }, [value, isOpen]);
  
  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);
  
  const handleValidate = async () => {
    if (!localValue.trim()) return;
    setValidating(true);
    const err = await validateScript(localValue);
    setError(err);
    setIsValid(!err);
    setValidating(false);
  };
  
  const handleSave = () => {
    onChange(localValue);
    onClose();
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Handle Tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
      setLocalValue(newValue);
      
      // Set cursor position after the inserted tab
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };
  
  if (!isOpen) return null;
  
  const placeholder = nodeType === 'converter' 
    ? `// Return a number - how many resources to output
// Example: Convert with diminishing efficiency
const efficiency = min(1, input / 10);
return floor(input * efficiency);`
    : `// Return a number - production rate
// Example: Adaptive production based on tick
if (tick < 10) {
  return 5; // Fast start
} else {
  return 2; // Steady state
}`;
  
  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal script-editor-modal">
        <div className="modal-header">
          <span className="modal-icon">📜</span>
          <h3>Script Editor</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="modal-body script-editor-body">
          <div className="script-editor-container">
            {/* Syntax highlight layer */}
            <div 
              ref={highlightRef}
              className="script-highlight-layer"
              dangerouslySetInnerHTML={{ 
                __html: highlightSyntax(localValue || placeholder)
                  .replace(/\n/g, '<br/>')
                  .replace(/ /g, '&nbsp;')
              }}
              aria-hidden="true"
            />
            {/* Actual textarea */}
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                setError(null);
                setIsValid(false);
              }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={error ? 'error' : isValid ? 'valid' : ''}
              spellCheck={false}
              autoFocus
            />
          </div>
          
          <div className="script-editor-status">
            {error && <span className="script-error">❌ {error}</span>}
            {isValid && <span className="script-valid">✅ Script valid!</span>}
          </div>
          
          <div className="script-editor-help-full">
            <details open>
              <summary>📖 API Reference</summary>
              <div className="script-api-columns">
                <div className="api-column">
                  <strong>Variables:</strong>
                  <ul>
                    <li><code>input</code> - Resources to process</li>
                    <li><code>resources</code> - Current node resources</li>
                    <li><code>capacity</code> - Capacity (Infinity if unlimited)</li>
                    <li><code>capacityRaw</code> - Raw capacity (-1 if unlimited)</li>
                    <li><code>tick</code> - Current simulation tick</li>
                    <li><code>tokenType</code> - Token type ID (e.g., "gold")</li>
                    <li><code>tokens</code> - Typed resources {'{'} gold: 10 {'}'}</li>
                    {nodeType === 'source' && (
                      <>
                        <li><code>buffer</code> - Alias for resources</li>
                        <li><code>bufferCapacity</code> - Alias for capacity</li>
                        <li><code>totalProduced</code> / <code>produced</code></li>
                        <li><code>maxProduction</code> / <code>maxTotalProduction</code></li>
                      </>
                    )}
                  </ul>
                </div>
                <div className="api-column">
                  <strong>Functions:</strong>
                  <ul>
                    <li><code>getNode(id)</code> - Get node data</li>
                    <li><code>get(nodeId, tokenId)</code> - Get token amount</li>
                    <li><code>min, max, floor, ceil, round, abs</code></li>
                    <li><code>sqrt, pow, sin, cos, tan, log, exp</code></li>
                    <li><code>random, PI, E</code></li>
                  </ul>
                  <strong>State (persists):</strong>
                  <ul>
                    <li><code>state.myVar = 5;</code></li>
                    <li><code>state.myVar || 0</code></li>
                  </ul>
                </div>
              </div>
            </details>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-secondary"
            disabled={validating}
            onClick={handleValidate}
          >
            {validating ? '⏳ Validating...' : '✓ Validate'}
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save Script
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
