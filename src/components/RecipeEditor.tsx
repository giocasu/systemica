/**
 * RecipeEditor - Editor for Converter multi-token recipes.
 * 
 * Allows defining:
 * - Multiple input token types with amounts
 * - Multiple output token types with amounts
 */

import { useState } from 'react';
import { useTokenStore } from '../store/tokenStore';
import { ConverterRecipe } from '../types';

interface RecipeEditorProps {
  recipe: ConverterRecipe | undefined;
  onChange: (recipe: ConverterRecipe | undefined) => void;
  // Legacy fallback values
  inputRatio: number;
  outputRatio: number;
  onLegacyChange: (field: 'inputRatio' | 'outputRatio', value: number) => void;
}

export function RecipeEditor({ 
  recipe, 
  onChange, 
  inputRatio, 
  outputRatio, 
  onLegacyChange 
}: RecipeEditorProps) {
  const getAllTokens = useTokenStore((state) => state.getAllTokens);
  const getToken = useTokenStore((state) => state.getToken);
  const [useRecipe, setUseRecipe] = useState(!!recipe);
  
  const allTokens = getAllTokens();
  
  // Initialize recipe if switching to recipe mode
  const handleToggleRecipe = (enabled: boolean) => {
    setUseRecipe(enabled);
    if (enabled && !recipe) {
      onChange({
        inputs: [{ tokenId: 'black', amount: 2 }],
        outputs: [{ tokenId: 'black', amount: 1 }],
      });
    } else if (!enabled) {
      onChange(undefined);
    }
  };
  
  const handleAddInput = () => {
    if (!recipe) return;
    onChange({
      ...recipe,
      inputs: [...recipe.inputs, { tokenId: 'black', amount: 1 }],
    });
  };
  
  const handleAddOutput = () => {
    if (!recipe) return;
    onChange({
      ...recipe,
      outputs: [...recipe.outputs, { tokenId: 'black', amount: 1 }],
    });
  };
  
  const handleRemoveInput = (index: number) => {
    if (!recipe || recipe.inputs.length <= 1) return;
    onChange({
      ...recipe,
      inputs: recipe.inputs.filter((_, i) => i !== index),
    });
  };
  
  const handleRemoveOutput = (index: number) => {
    if (!recipe || recipe.outputs.length <= 1) return;
    onChange({
      ...recipe,
      outputs: recipe.outputs.filter((_, i) => i !== index),
    });
  };
  
  const handleInputChange = (index: number, field: 'tokenId' | 'amount', value: string | number) => {
    if (!recipe) return;
    const newInputs = [...recipe.inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    onChange({ ...recipe, inputs: newInputs });
  };
  
  const handleOutputChange = (index: number, field: 'tokenId' | 'amount', value: string | number) => {
    if (!recipe) return;
    const newOutputs = [...recipe.outputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    onChange({ ...recipe, outputs: newOutputs });
  };
  
  return (
    <div className="recipe-editor">
      {/* Toggle between simple ratio and multi-token recipe */}
      <div className="recipe-toggle">
        <button
          type="button"
          className={`mode-btn ${!useRecipe ? 'active' : ''}`}
          onClick={() => handleToggleRecipe(false)}
        >
          📊 Simple Ratio
        </button>
        <button
          type="button"
          className={`mode-btn ${useRecipe ? 'active' : ''}`}
          onClick={() => handleToggleRecipe(true)}
        >
          🧪 Multi-Token Recipe
        </button>
      </div>
      
      {!useRecipe ? (
        /* Simple ratio mode */
        <div className="simple-ratio">
          <div className="ratio-row">
            <label>Input Ratio</label>
            <input
              type="number"
              value={inputRatio}
              min={1}
              step={1}
              onChange={(e) => onLegacyChange('inputRatio', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="ratio-arrow">⬇️</div>
          <div className="ratio-row">
            <label>Output Ratio</label>
            <input
              type="number"
              value={outputRatio}
              min={1}
              step={1}
              onChange={(e) => onLegacyChange('outputRatio', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="ratio-example">
            Example: {inputRatio} input → {outputRatio} output
          </div>
        </div>
      ) : (
        /* Multi-token recipe mode */
        <div className="multi-token-recipe">
          {/* Inputs section */}
          <div className="recipe-section">
            <div className="recipe-section-header">
              <span>INPUTS</span>
            </div>
            {recipe?.inputs.map((input, index) => {
              return (
                <div key={index} className="recipe-item">
                  <select
                    value={input.tokenId}
                    onChange={(e) => handleInputChange(index, 'tokenId', e.target.value)}
                  >
                    {allTokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.emoji} {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={input.amount}
                    min={0.1}
                    step={0.1}
                    onChange={(e) => handleInputChange(index, 'amount', parseFloat(e.target.value) || 1)}
                  />
                  {recipe.inputs.length > 1 && (
                    <button
                      type="button"
                      className="recipe-remove"
                      onClick={() => handleRemoveInput(index)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="recipe-add"
              onClick={handleAddInput}
            >
              + Add input
            </button>
          </div>
          
          {/* Arrow */}
          <div className="recipe-arrow">⬇️</div>
          
          {/* Outputs section */}
          <div className="recipe-section">
            <div className="recipe-section-header">
              <span>OUTPUTS</span>
            </div>
            {recipe?.outputs.map((output, index) => {
              return (
                <div key={index} className="recipe-item">
                  <select
                    value={output.tokenId}
                    onChange={(e) => handleOutputChange(index, 'tokenId', e.target.value)}
                  >
                    {allTokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.emoji} {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={output.amount}
                    min={0.1}
                    step={0.1}
                    onChange={(e) => handleOutputChange(index, 'amount', parseFloat(e.target.value) || 1)}
                  />
                  {recipe.outputs.length > 1 && (
                    <button
                      type="button"
                      className="recipe-remove"
                      onClick={() => handleRemoveOutput(index)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="recipe-add"
              onClick={handleAddOutput}
            >
              + Add output
            </button>
          </div>
          
          {/* Recipe summary */}
          {recipe && (
            <div className="recipe-summary">
              {recipe.inputs.map((i) => {
                const t = getToken(i.tokenId);
                return `${i.amount}${t?.emoji || '●'}`;
              }).join(' + ')}
              {' → '}
              {recipe.outputs.map((o) => {
                const t = getToken(o.tokenId);
                return `${o.amount}${t?.emoji || '●'}`;
              }).join(' + ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
