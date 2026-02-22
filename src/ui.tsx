import * as React from 'react';
import { createRoot } from 'react-dom/client';

const { useState, useEffect } = React;

interface Layer {
  id: string;
  name: string;
  type: string;
  depth: number;
  children?: Layer[];
  characters?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  fills?: any[];
}

interface Annotation {
  layerId: string;
  note: string;
}

interface HistoryItem {
  id: string;
  timestamp: Date;
  frameName: string;
  prompt: string;
}

function App() {
  const [layerTree, setLayerTree] = useState<Layer | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set());
  const [isFirstPrompt, setIsFirstPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load history from local storage
    const saved = localStorage.getItem('prompt-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    // Listen for messages from Figma
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === 'layer-tree') {
        setLayerTree(msg.data);
        setAnnotations({});
        setSelectedLayers(new Set());
      }

      if (msg.type === 'error') {
        alert(msg.message);
      }
    };
  }, []);

  const scanSelection = () => {
    parent.postMessage({ pluginMessage: { type: 'scan-selection' } }, '*');
  };

  const toggleLayer = (layerId: string) => {
    const newSelected = new Set(selectedLayers);
    if (newSelected.has(layerId)) {
      newSelected.delete(layerId);
    } else {
      newSelected.add(layerId);
    }
    setSelectedLayers(newSelected);
  };

  const updateAnnotation = (layerId: string, note: string) => {
    setAnnotations({ ...annotations, [layerId]: note });
  };

  const flattenLayers = (layer: Layer, result: Layer[] = []): Layer[] => {
    result.push(layer);
    if (layer.children) {
      layer.children.forEach(child => flattenLayers(child, result));
    }
    return result;
  };

  const generatePrompt = () => {
    if (!layerTree) return;

    setIsLoading(true);

    const layers = flattenLayers(layerTree);
    let prompt = '';

    // First prompt header
    if (isFirstPrompt) {
      prompt += `## Global Styles Setup\n`;
      prompt += `Before building this component, set up the following global styles:\n`;
      prompt += `- Create a consistent color palette based on the colors used below\n`;
      prompt += `- Set up typography scale based on the font sizes mentioned\n`;
      prompt += `- Define spacing tokens for consistent padding/margins\n\n`;
    }

    // Frame info
    prompt += `## Screen: ${layerTree.name}\n`;
    prompt += `Dimensions: ${layerTree.width}x${layerTree.height}px\n\n`;

    // Structure description
    prompt += `## Structure\n`;
    prompt += `This screen contains the following elements:\n\n`;

    layers.forEach(layer => {
      const indent = '  '.repeat(layer.depth);
      let layerDesc = `${indent}- **${layer.name}** (${layer.type})`;

      if (layer.width && layer.height) {
        layerDesc += ` - ${layer.width}x${layer.height}px`;
      }

      if (layer.characters) {
        layerDesc += ` - Text: "${layer.characters}"`;
      }

      if (layer.fills && layer.fills.length > 0) {
        const colors = layer.fills
          .filter(f => f.color)
          .map(f => f.color);
        if (colors.length > 0) {
          layerDesc += ` - Color: ${colors[0]}`;
        }
      }

      prompt += layerDesc + '\n';

      // Add annotation if exists
      if (annotations[layer.id]) {
        prompt += `${indent}  → Note: ${annotations[layer.id]}\n`;
      }
    });

    // Annotated elements section
    const annotatedLayers = Object.entries(annotations).filter(([_, note]) => note.trim());
    if (annotatedLayers.length > 0) {
      prompt += `\n## Special Instructions\n`;
      annotatedLayers.forEach(([layerId, note]) => {
        const layer = layers.find(l => l.id === layerId);
        if (layer) {
          prompt += `- **${layer.name}**: ${note}\n`;
        }
      });
    }

    // Implementation notes
    prompt += `\n## Implementation Notes\n`;
    prompt += `- Use semantic HTML elements where appropriate\n`;
    prompt += `- Ensure responsive behavior\n`;
    prompt += `- Follow accessibility best practices\n`;

    setGeneratedPrompt(prompt);
    setShowModal(true);
    setIsLoading(false);

    // Save to history
    const newHistory: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      frameName: layerTree.name,
      prompt: prompt
    };
    const updatedHistory = [newHistory, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('prompt-history', JSON.stringify(updatedHistory));
  };

  const copyPrompt = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      parent.postMessage({ pluginMessage: { type: 'notify', message: 'Copied to clipboard!' } }, '*');
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setGeneratedPrompt(item.prompt);
    setShowModal(true);
  };

  const renderLayer = (layer: Layer) => {
    const isSelected = selectedLayers.has(layer.id);
    const paddingLeft = layer.depth * 16;

    return (
      <div key={layer.id}>
        <div
          className={`layer-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: paddingLeft + 12 }}
          onClick={() => toggleLayer(layer.id)}
        >
          <span className="layer-type">{layer.type}</span>
          <span className="layer-name">{layer.name}</span>
        </div>
        {isSelected && (
          <div style={{ paddingLeft: paddingLeft + 12, paddingRight: 12, paddingBottom: 8 }}>
            <input
              type="text"
              className="annotation-input"
              placeholder="Add note for this element..."
              value={annotations[layer.id] || ''}
              onChange={(e) => updateAnnotation(layer.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {layer.children?.map(child => renderLayer(child))}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <div className="title">Prompt Generator</div>
        <button className="btn btn-primary" onClick={scanSelection}>
          Scan Selected Frame
        </button>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isFirstPrompt}
            onChange={(e) => setIsFirstPrompt(e.target.checked)}
          />
          First prompt (include global styles setup)
        </label>
      </div>

      <div className="layer-list">
        {layerTree ? (
          renderLayer(layerTree)
        ) : (
          <div className="empty-state">
            Select a frame in Figma and click "Scan Selected Frame"
          </div>
        )}
      </div>

      {layerTree && (
        <button className="btn btn-primary" onClick={generatePrompt} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Prompt'}
        </button>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <div className="history-title">Recent Prompts</div>
          {history.slice(0, 5).map(item => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => loadFromHistory(item)}
            >
              {item.frameName} - {new Date(item.timestamp).toLocaleTimeString()}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Generated Prompt</div>
            <div className="prompt-output">{generatedPrompt}</div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={copyPrompt}>
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);