import { useState, useRef, useEffect } from 'react';
import { templates } from '../templates';
import { useSimulatorStore } from '../store/simulatorStore';

export function TemplateDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { loadTemplate, nodes } = useSimulatorStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    // Warn if there are existing nodes
    if (nodes.length > 0) {
      const confirm = window.confirm(
        'Loading a template will replace your current diagram. Continue?'
      );
      if (!confirm) return;
    }
    
    loadTemplate(templateId);
    setIsOpen(false);
  };

  return (
    <div className="template-dropdown" ref={dropdownRef}>
      <button 
        className="template-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        📋 Templates {isOpen ? '▲' : '▼'}
      </button>
      
      {isOpen && (
        <div className="template-menu">
          {templates.map((template) => (
            <div
              key={template.id}
              className="template-item"
              onClick={() => handleSelectTemplate(template.id)}
            >
              <span className="template-icon">{template.icon}</span>
              <div className="template-info">
                <span className="template-name">{template.name}</span>
                <span className="template-desc">{template.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
