import React from 'react';
import { Search, BrainCircuit, Share2, Loader2, FileJson, Layout, Download, Image as ImageIcon } from 'lucide-react';
import { GenerationStatus, GraphData } from '../types';

interface ControlPanelProps {
  onGenerate: (topic: string) => void;
  status: GenerationStatus;
  graphData: GraphData | null;
  activeView: 'graph' | 'json';
  setActiveView: (view: 'graph' | 'json') => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onGenerate, 
  status, 
  graphData, 
  activeView, 
  setActiveView 
}) => {
  const [input, setInput] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGenerate(input.trim());
    }
  };

  const handleDownload = (format: 'png' | 'svg') => {
    const svg = document.getElementById('graph-svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);

    // Ensure namespaces exist
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const preamble = '<?xml version="1.0" standalone="no"?>\r\n';

    if (format === 'svg') {
        // Add background color for standalone SVG visibility if desired, 
        // but typically SVGs are transparent. We'll leave it standard.
        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(preamble + source);
        const link = document.createElement("a");
        link.href = url;
        link.download = `semantic-graph-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        const image = new Image();
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(preamble + source);
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const bbox = svg.getBoundingClientRect();
            // High res export
            const scale = 2;
            canvas.width = bbox.width * scale;
            canvas.height = bbox.height * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(scale, scale);
                // Fill background for PNG as the graph is designed for dark mode
                ctx.fillStyle = '#09090b'; // zinc-950
                ctx.fillRect(0, 0, bbox.width, bbox.height);
                ctx.drawImage(image, 0, 0);
                
                const pngUrl = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = pngUrl;
                link.download = `semantic-graph-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };
    }
  };

  const isGenerating = status.step !== 'idle' && status.step !== 'complete' && status.step !== 'error';

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-full max-w-md p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2 mb-2">
          <BrainCircuit className="text-blue-500" />
          Semantic Graph
        </h1>
        <p className="text-zinc-400 text-sm">
          Generate deep hierarchical concept maps grounded in live data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Research Topic
          </label>
          <div className="relative">
            <input
              type="text"
              id="topic"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 pl-10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              placeholder="e.g. Quantum Computing, Coffee History..."
            />
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
          </div>
        </div>

        {/* Quick Examples */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Quick Start Examples</span>
          <div className="flex flex-wrap gap-2">
            {['Life', 'Computing', 'Literary Genres'].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setInput(example);
                  onGenerate(example);
                }}
                disabled={isGenerating}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-full border border-zinc-700 transition-colors disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {status.step === 'searching' ? 'Searching...' : 
               status.step === 'thinking' ? 'Deep Thinking...' : 'Processing...'}
            </>
          ) : (
            <>
              Generate Hierarchy
            </>
          )}
        </button>
      </form>

      {/* Progress / Status Area */}
      {status.step !== 'idle' && (
        <div className="mb-6 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
           <div className="flex flex-col gap-3">
              <StepIndicator 
                label="Grounding (Flash 2.5 + Search)" 
                active={status.step === 'searching'} 
                completed={['thinking', 'rendering', 'complete'].includes(status.step)}
                error={status.step === 'error' && !status.message?.includes('Thinking')}
              />
              <StepIndicator 
                label="Structuring (Pro 3.0 + Thinking)" 
                active={status.step === 'thinking'} 
                completed={['rendering', 'complete'].includes(status.step)}
                error={status.step === 'error'}
              />
              <StepIndicator 
                label="Visualization" 
                active={status.step === 'rendering'} 
                completed={status.step === 'complete'}
              />
           </div>
           {status.message && (
             <div className="mt-3 text-xs text-zinc-500 font-mono border-t border-zinc-800 pt-2">
               {status.message}
             </div>
           )}
        </div>
      )}

      {/* Output Toggle */}
      {graphData && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-2 mb-4 bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveView('graph')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'graph' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layout className="w-4 h-4" /> Graph
            </button>
            <button
              onClick={() => setActiveView('json')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'json' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileJson className="w-4 h-4" /> JSON
            </button>
          </div>

          {activeView === 'graph' && (
            <div className="mb-4 grid grid-cols-2 gap-2">
               <button 
                  onClick={() => handleDownload('png')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
               >
                 <ImageIcon className="w-4 h-4" /> Export PNG
               </button>
               <button 
                  onClick={() => handleDownload('svg')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
               >
                 <Download className="w-4 h-4" /> Export SVG
               </button>
            </div>
          )}

          {activeView === 'json' && (
             <div className="flex-1 overflow-auto bg-zinc-950 rounded-lg p-4 border border-zinc-800 font-mono text-xs text-green-400">
                <pre>{JSON.stringify(graphData, null, 2)}</pre>
             </div>
          )}
           {activeView === 'graph' && (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm bg-zinc-950 rounded-lg border border-zinc-800 border-dashed">
                <Share2 className="w-8 h-8 mb-2 opacity-50" />
                <p>Interactive Graph is Active</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const StepIndicator: React.FC<{ label: string; active: boolean; completed: boolean; error?: boolean }> = ({ label, active, completed, error }) => (
  <div className="flex items-center gap-3">
    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
      error ? 'bg-red-500' :
      completed ? 'bg-emerald-500' :
      active ? 'bg-blue-500 animate-pulse' : 
      'bg-zinc-700'
    }`} />
    <span className={`text-sm ${
      active || completed ? 'text-zinc-200' : 'text-zinc-500'
    }`}>
      {label}
    </span>
  </div>
);

export default ControlPanel;